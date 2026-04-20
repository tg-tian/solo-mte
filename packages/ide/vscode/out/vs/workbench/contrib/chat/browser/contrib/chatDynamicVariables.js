/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatDynamicVariableModel_1;
import { coalesce } from '../../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, dispose, isDisposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
export const dynamicVariableDecorationType = 'chat-dynamic-variable';
let ChatDynamicVariableModel = class ChatDynamicVariableModel extends Disposable {
    static { ChatDynamicVariableModel_1 = this; }
    static { this.ID = 'chatDynamicVariableModel'; }
    get variables() {
        return [...this._variables];
    }
    get id() {
        return ChatDynamicVariableModel_1.ID;
    }
    constructor(widget, labelService) {
        super();
        this.widget = widget;
        this.labelService = labelService;
        this._variables = [];
        this.decorationData = [];
        this._register(widget.inputEditor.onDidChangeModelContent(e => {
            const removed = [];
            let didChange = false;
            // Don't mutate entries in _variables, since they will be returned from the getter
            this._variables = coalesce(this._variables.map((ref, idx) => {
                const model = widget.inputEditor.getModel();
                if (!model) {
                    removed.push(ref);
                    return null;
                }
                const data = this.decorationData[idx];
                const newRange = model.getDecorationRange(data.id);
                if (!newRange) {
                    // gone
                    removed.push(ref);
                    return null;
                }
                const newText = model.getValueInRange(newRange);
                if (newText !== data.text) {
                    this.widget.inputEditor.executeEdits(this.id, [{
                            range: newRange,
                            text: '',
                        }]);
                    this.widget.refreshParsedInput();
                    removed.push(ref);
                    return null;
                }
                if (newRange.equalsRange(ref.range)) {
                    // all good
                    return ref;
                }
                didChange = true;
                return { ...ref, range: newRange };
            }));
            // cleanup disposable variables
            dispose(removed.filter(isDisposable));
            if (didChange || removed.length > 0) {
                this.widget.refreshParsedInput();
            }
            this.updateDecorations();
        }));
    }
    getInputState(contrib) {
        contrib[ChatDynamicVariableModel_1.ID] = this.variables;
    }
    setInputState(contrib) {
        let s = contrib[ChatDynamicVariableModel_1.ID];
        if (!Array.isArray(s)) {
            s = [];
        }
        this.disposeVariables();
        this._variables = [];
        for (const variable of s) {
            if (!isDynamicVariable(variable)) {
                continue;
            }
            this.addReference(variable);
        }
    }
    addReference(ref) {
        this._variables.push(ref);
        this.updateDecorations();
        this.widget.refreshParsedInput();
    }
    updateDecorations() {
        const decorationIds = this.widget.inputEditor.setDecorationsByType('chat', dynamicVariableDecorationType, this._variables.map((r) => ({
            range: r.range,
            hoverMessage: this.getHoverForReference(r)
        })));
        this.decorationData = [];
        for (let i = 0; i < decorationIds.length; i++) {
            this.decorationData.push({
                id: decorationIds[i],
                text: this.widget.inputEditor.getModel().getValueInRange(this._variables[i].range)
            });
        }
    }
    getHoverForReference(ref) {
        const value = ref.data;
        if (URI.isUri(value)) {
            return new MarkdownString(this.labelService.getUriLabel(value, { relative: true }));
        }
        else if (isLocation(value)) {
            const prefix = ref.fullName ? ` ${ref.fullName}` : '';
            const rangeString = `#${value.range.startLineNumber}-${value.range.endLineNumber}`;
            return new MarkdownString(prefix + this.labelService.getUriLabel(value.uri, { relative: true }) + rangeString);
        }
        else {
            return undefined;
        }
    }
    /**
     * Dispose all existing variables.
     */
    disposeVariables() {
        for (const variable of this._variables) {
            if (isDisposable(variable)) {
                variable.dispose();
            }
        }
    }
    dispose() {
        this.disposeVariables();
        super.dispose();
    }
};
ChatDynamicVariableModel = ChatDynamicVariableModel_1 = __decorate([
    __param(1, ILabelService)
], ChatDynamicVariableModel);
export { ChatDynamicVariableModel };
/**
 * Loose check to filter objects that are obviously missing data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDynamicVariable(obj) {
    return obj &&
        typeof obj.id === 'string' &&
        Range.isIRange(obj.range) &&
        'data' in obj;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAddDynamicVariableContext(context) {
    return 'widget' in context &&
        'range' in context &&
        'variableData' in context;
}
export class AddDynamicVariableAction extends Action2 {
    static { this.ID = 'workbench.action.chat.addDynamicVariable'; }
    constructor() {
        super({
            id: AddDynamicVariableAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!isAddDynamicVariableContext(context)) {
            return;
        }
        let range = context.range;
        const variableData = context.variableData;
        const doCleanup = () => {
            // Failed, remove the dangling variable prefix
            context.widget.inputEditor.executeEdits('chatInsertDynamicVariableWithArguments', [{ range: context.range, text: `` }]);
        };
        // If this completion item has no command, return it directly
        if (context.command) {
            // Invoke the command on this completion item along with its args and return the result
            const commandService = accessor.get(ICommandService);
            const selection = await commandService.executeCommand(context.command.id, ...(context.command.arguments ?? []));
            if (!selection) {
                doCleanup();
                return;
            }
            // Compute new range and variableData
            const insertText = ':' + selection;
            const insertRange = new Range(range.startLineNumber, range.endColumn, range.endLineNumber, range.endColumn + insertText.length);
            range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + insertText.length);
            const editor = context.widget.inputEditor;
            const success = editor.executeEdits('chatInsertDynamicVariableWithArguments', [{ range: insertRange, text: insertText + ' ' }]);
            if (!success) {
                doCleanup();
                return;
            }
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: context.id,
            range: range,
            isFile: true,
            data: variableData
        });
    }
}
registerAction2(AddDynamicVariableAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdER5bmFtaWNWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvY2hhdER5bmFtaWNWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFXLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUs5RSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyx1QkFBdUIsQ0FBQztBQUk5RCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7O2FBQ2hDLE9BQUUsR0FBRywwQkFBMEIsQUFBN0IsQ0FBOEI7SUFJdkQsSUFBSSxTQUFTO1FBQ1osT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDTCxPQUFPLDBCQUF3QixDQUFDLEVBQUUsQ0FBQztJQUNwQyxDQUFD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
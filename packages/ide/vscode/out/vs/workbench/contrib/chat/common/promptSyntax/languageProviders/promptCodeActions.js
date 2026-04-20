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
import { Range } from '../../../../../../editor/common/core/range.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { PromptHeaderAttributes } from '../promptFileParser.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
import { LEGACY_MODE_FILE_EXTENSION } from '../config/promptFileLocations.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { isGithubTarget, MARKERS_OWNER_ID } from './promptValidator.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { CodeActionKind } from '../../../../../../editor/contrib/codeAction/common/types.js';
let PromptCodeActionProvider = class PromptCodeActionProvider {
    constructor(promptsService, languageModelToolsService, fileService, markerService) {
        this.promptsService = promptsService;
        this.languageModelToolsService = languageModelToolsService;
        this.fileService = fileService;
        this.markerService = markerService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptCodeActionProvider';
    }
    async provideCodeActions(model, range, context, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType || promptType === PromptsType.instructions) {
            // if the model is not a prompt, we don't provide any code actions
            return undefined;
        }
        const result = [];
        const promptAST = this.promptsService.getParsedPromptFile(model);
        switch (promptType) {
            case PromptsType.agent:
                this.getUpdateToolsCodeActions(promptAST, promptType, model, range, result);
                await this.getMigrateModeFileCodeActions(model, result);
                break;
            case PromptsType.prompt:
                this.getUpdateModeCodeActions(promptAST, model, range, result);
                this.getUpdateToolsCodeActions(promptAST, promptType, model, range, result);
                break;
        }
        if (result.length === 0) {
            return undefined;
        }
        return {
            actions: result,
            dispose: () => { }
        };
    }
    getMarkers(model, range) {
        const markers = this.markerService.read({ resource: model.uri, owner: MARKERS_OWNER_ID });
        return markers.filter(marker => range.containsRange(marker));
    }
    createCodeAction(model, range, title, edits) {
        return {
            title,
            edit: { edits },
            ranges: [range],
            diagnostics: this.getMarkers(model, range),
            kind: CodeActionKind.QuickFix.value
        };
    }
    getUpdateModeCodeActions(promptFile, model, range, result) {
        const modeAttr = promptFile.header?.getAttribute(PromptHeaderAttributes.mode);
        if (!modeAttr?.range.containsRange(range)) {
            return;
        }
        const keyRange = new Range(modeAttr.range.startLineNumber, modeAttr.range.startColumn, modeAttr.range.startLineNumber, modeAttr.range.startColumn + modeAttr.key.length);
        result.push(this.createCodeAction(model, keyRange, localize('renameToAgent', "Rename to 'agent'"), [asWorkspaceTextEdit(model, { range: keyRange, text: 'agent' })]));
    }
    async getMigrateModeFileCodeActions(model, result) {
        if (model.uri.path.endsWith(LEGACY_MODE_FILE_EXTENSION)) {
            const location = this.promptsService.getAgentFileURIFromModeFile(model.uri);
            if (location && await this.fileService.canMove(model.uri, location)) {
                const edit = { oldResource: model.uri, newResource: location, options: { overwrite: false, copy: false } };
                result.push(this.createCodeAction(model, new Range(1, 1, 1, 4), localize('migrateToAgent', "Migrate to custom agent file"), [edit]));
            }
        }
    }
    getUpdateToolsCodeActions(promptFile, promptType, model, range, result) {
        const toolsAttr = promptFile.header?.getAttribute(PromptHeaderAttributes.tools);
        if (toolsAttr?.value.type !== 'array' || !toolsAttr.value.range.containsRange(range)) {
            return;
        }
        if (isGithubTarget(promptType, promptFile.header?.target)) {
            // GitHub Copilot custom agents use a fixed set of tool names that are not deprecated
            return;
        }
        const values = toolsAttr.value.items;
        const deprecatedNames = new Lazy(() => this.languageModelToolsService.getDeprecatedFullReferenceNames());
        const edits = [];
        for (const item of values) {
            if (item.type !== 'string') {
                continue;
            }
            const newNames = deprecatedNames.value.get(item.value);
            if (newNames && newNames.size > 0) {
                const quote = model.getValueInRange(new Range(item.range.startLineNumber, item.range.startColumn, item.range.endLineNumber, item.range.startColumn + 1));
                if (newNames.size === 1) {
                    const newName = Array.from(newNames)[0];
                    const text = (quote === `'` || quote === '"') ? (quote + newName + quote) : newName;
                    const edit = { range: item.range, text };
                    edits.push(edit);
                    if (item.range.containsRange(range)) {
                        result.push(this.createCodeAction(model, item.range, localize('updateToolName', "Update to '{0}'", newName), [asWorkspaceTextEdit(model, edit)]));
                    }
                }
                else {
                    // Multiple new names - expand to include all of them
                    const newNamesArray = Array.from(newNames).sort((a, b) => a.localeCompare(b));
                    const separator = model.getValueInRange(new Range(item.range.startLineNumber, item.range.endColumn, item.range.endLineNumber, item.range.endColumn + 2));
                    const useCommaSpace = separator.includes(',');
                    const delimiterText = useCommaSpace ? ', ' : ',';
                    const newNamesText = newNamesArray.map(name => (quote === `'` || quote === '"') ? (quote + name + quote) : name).join(delimiterText);
                    const edit = { range: item.range, text: newNamesText };
                    edits.push(edit);
                    if (item.range.containsRange(range)) {
                        result.push(this.createCodeAction(model, item.range, localize('expandToolNames', "Expand to {0} tools", newNames.size), [asWorkspaceTextEdit(model, edit)]));
                    }
                }
            }
        }
        if (edits.length && result.length === 0 || edits.length > 1) {
            result.push(this.createCodeAction(model, toolsAttr.value.range, localize('updateAllToolNames', "Update all tool names"), edits.map(edit => asWorkspaceTextEdit(model, edit))));
        }
    }
};
PromptCodeActionProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelToolsService),
    __param(2, IFileService),
    __param(3, IMarkerService)
], PromptCodeActionProvider);
export { PromptCodeActionProvider };
function asWorkspaceTextEdit(model, textEdit) {
    return {
        versionId: model.getVersionId(),
        resource: model.uri,
        textEdit
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29kZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb21wdENvZGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUd0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQW9CLHNCQUFzQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFbEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDeEUsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUV0RixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF3QjtJQU1wQyxZQUNrQixjQUFnRCxFQUNyQyx5QkFBc0UsRUFDcEYsV0FBMEMsRUFDeEMsYUFBOEM7UUFINUIsbUJBQWMsR0FBZCxjQUFj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
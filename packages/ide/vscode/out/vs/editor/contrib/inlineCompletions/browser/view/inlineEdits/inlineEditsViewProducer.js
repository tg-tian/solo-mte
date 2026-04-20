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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { derived } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { Range } from '../../../../../common/core/range.js';
import { TextReplacement, TextEdit } from '../../../../../common/core/edits/textEdit.js';
import { TextModelText } from '../../../../../common/model/textModelText.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
import { ModelPerInlineEdit } from './inlineEditsModel.js';
import { InlineEditsView } from './inlineEditsView.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineSuggestionGutterMenuData, SimpleInlineSuggestModel } from './components/gutterIndicatorView.js';
let InlineEditsViewAndDiffProducer = class InlineEditsViewAndDiffProducer extends Disposable {
    constructor(_editor, _model, _showCollapsed, instantiationService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._showCollapsed = _showCollapsed;
        this._inlineEdit = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            if (!textModel) {
                return undefined;
            }
            const state = model.inlineEditState.read(reader);
            if (!state) {
                return undefined;
            }
            const action = state.inlineSuggestion.action;
            const text = new TextModelText(textModel);
            let diffEdits;
            if (action?.kind === 'edit') {
                const editOffset = action.stringEdit;
                const edits = editOffset.replacements.map(e => {
                    const innerEditRange = Range.fromPositions(textModel.getPositionAt(e.replaceRange.start), textModel.getPositionAt(e.replaceRange.endExclusive));
                    return new TextReplacement(innerEditRange, e.newText);
                });
                diffEdits = new TextEdit(edits);
            }
            else {
                diffEdits = undefined;
            }
            return new InlineEditWithChanges(text, action, diffEdits, model.primaryPosition.read(undefined), model.allPositions.read(undefined), state.inlineSuggestion.source.inlineSuggestions.commands ?? [], state.inlineSuggestion);
        });
        this._inlineEditModel = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const edit = this._inlineEdit.read(reader);
            if (!edit) {
                return undefined;
            }
            const tabAction = derived(this, reader => {
                /** @description tabAction */
                if (this._editorObs.isFocused.read(reader)) {
                    if (model.tabShouldJumpToInlineEdit.read(reader)) {
                        return InlineEditTabAction.Jump;
                    }
                    if (model.tabShouldAcceptInlineEdit.read(reader)) {
                        return InlineEditTabAction.Accept;
                    }
                }
                return InlineEditTabAction.Inactive;
            });
            return new ModelPerInlineEdit(model, edit, tabAction);
        });
        this._editorObs = observableCodeEditor(this._editor);
        this.view = this._register(instantiationService.createInstance(InlineEditsView, this._editor, this._inlineEditModel, this._model.map(model => model ? SimpleInlineSuggestModel.fromInlineCompletionModel(model) : undefined), this._inlineEdit.map(e => e ? InlineSuggestionGutterMenuData.fromInlineSuggestion(e.inlineCompletion) : undefined), this._showCollapsed));
    }
};
InlineEditsViewAndDiffProducer = __decorate([
    __param(3, IInstantiationService)
], InlineEditsViewAndDiffProducer);
export { InlineEditsViewAndDiffProducer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3UHJvZHVjZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld1Byb2R1Y2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sNkNBQTZDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDcEUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLHdCQUF3QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFeEcsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBK0Q3RCxZQUNrQixPQUFvQixFQUNwQixNQUF1RCxFQUN2RCxjQUFvQyxFQUM5QixvQkFB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
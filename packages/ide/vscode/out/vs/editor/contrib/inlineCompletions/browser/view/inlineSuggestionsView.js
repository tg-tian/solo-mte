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
import { createStyleSheetFromObservable } from '../../../../../base/browser/domStylesheets.js';
import { createHotClass } from '../../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived, mapObservableArrayCached, derivedDisposable, derivedObservableWithCache, constObservable, observableValue } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { LineRange } from '../../../../common/core/ranges/lineRange.js';
import { InlineCompletionsHintsWidget } from '../hintsWidget/inlineCompletionsHintsWidget.js';
import { convertItemsToStableObservables } from '../utils.js';
import { GhostTextView, GhostTextWidgetWarning } from './ghostText/ghostTextView.js';
import { InlineEditsGutterIndicator, InlineEditsGutterIndicatorData, InlineSuggestionGutterMenuData, SimpleInlineSuggestModel } from './inlineEdits/components/gutterIndicatorView.js';
import { InlineEditsOnboardingExperience } from './inlineEdits/inlineEditsNewUsers.js';
import { InlineCompletionViewKind, InlineEditTabAction } from './inlineEdits/inlineEditsViewInterface.js';
import { InlineEditsViewAndDiffProducer } from './inlineEdits/inlineEditsViewProducer.js';
let InlineSuggestionsView = class InlineSuggestionsView extends Disposable {
    static { this.hot = createHotClass(this); }
    constructor(_editor, _model, _focusIsInMenu, _instantiationService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._focusIsInMenu = _focusIsInMenu;
        this._instantiationService = _instantiationService;
        this._ghostTexts = derived(this, (reader) => {
            const model = this._model.read(reader);
            return model?.ghostTexts.read(reader) ?? [];
        });
        this._inlineEdit = derived(this, reader => this._model.read(reader)?.inlineEditState.read(reader)?.inlineSuggestion);
        this._everHadInlineEdit = derivedObservableWithCache(this, (reader, last) => last || !!this._inlineEdit.read(reader)
            || !!this._model.read(reader)?.inlineCompletionState.read(reader)?.inlineSuggestion?.showInlineEditMenu);
        // To break a cyclic dependency
        this._indicatorIsHoverVisible = observableValue(this, undefined);
        this._showInlineEditCollapsed = derived(this, reader => {
            const s = this._model.read(reader)?.showCollapsed.read(reader) ?? false;
            return s && !this._indicatorIsHoverVisible.read(reader)?.read(reader);
        });
        this._inlineEditWidget = derivedDisposable(reader => {
            if (!this._everHadInlineEdit.read(reader)) {
                return undefined;
            }
            return this._instantiationService.createInstance(InlineEditsViewAndDiffProducer, this._editor, this._model, this._showInlineEditCollapsed);
        });
        this._gutterIndicatorState = derived(reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const state = model.state.read(reader);
            if (state?.kind === 'ghostText' && state.inlineSuggestion?.showInlineEditMenu) {
                return {
                    displayRange: LineRange.ofLength(state.primaryGhostText.lineNumber, 1),
                    tabAction: derived(this, reader => this._editorObs.isFocused.read(reader) ? InlineEditTabAction.Accept : InlineEditTabAction.Inactive),
                    gutterIndicatorOffset: constObservable(getGhostTextTopOffset(state.inlineSuggestion, this._editor)),
                    inlineSuggestion: state.inlineSuggestion,
                    model,
                };
            }
            else if (state?.kind === 'inlineEdit') {
                const inlineEditWidget = this._inlineEditWidget.read(reader)?.view;
                if (!inlineEditWidget) {
                    return undefined;
                }
                const displayRange = inlineEditWidget.displayRange.read(reader);
                if (!displayRange) {
                    return undefined;
                }
                return {
                    displayRange,
                    tabAction: derived(reader => {
                        if (this._editorObs.isFocused.read(reader)) {
                            if (model.tabShouldJumpToInlineEdit.read(reader)) {
                                return InlineEditTabAction.Jump;
                            }
                            if (model.tabShouldAcceptInlineEdit.read(reader)) {
                                return InlineEditTabAction.Accept;
                            }
                        }
                        return InlineEditTabAction.Inactive;
                    }),
                    gutterIndicatorOffset: inlineEditWidget.gutterIndicatorOffset,
                    inlineSuggestion: state.inlineSuggestion,
                    model,
                };
            }
            else {
                return undefined;
            }
        });
        this._stablizedGhostTexts = convertItemsToStableObservables(this._ghostTexts, this._store);
        this._editorObs = observableCodeEditor(this._editor);
        this._ghostTextWidgets = mapObservableArrayCached(this, this._stablizedGhostTexts, (ghostText, store) => store.add(this._createGhostText(ghostText))).recomputeInitiallyAndOnChange(this._store);
        this._inlineEditWidget.recomputeInitiallyAndOnChange(this._store);
        this._fontFamily = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(val => val.fontFamily);
        this._register(createStyleSheetFromObservable(derived(reader => {
            const fontFamily = this._fontFamily.read(reader);
            return `
.monaco-editor .ghost-text-decoration,
.monaco-editor .ghost-text-decoration-preview,
.monaco-editor .ghost-text {
	font-family: ${fontFamily};
}`;
        })));
        this._register(new InlineCompletionsHintsWidget(this._editor, this._model, this._instantiationService));
        this._indicator = this._register(this._instantiationService.createInstance(InlineEditsGutterIndicator, this._editorObs, derived(reader => {
            const s = this._gutterIndicatorState.read(reader);
            if (!s) {
                return undefined;
            }
            return new InlineEditsGutterIndicatorData(InlineSuggestionGutterMenuData.fromInlineSuggestion(s.inlineSuggestion), s.displayRange, SimpleInlineSuggestModel.fromInlineCompletionModel(s.model), s.inlineSuggestion.action?.kind === 'edit' ? s.inlineSuggestion.action.alternativeAction : undefined);
        }), this._gutterIndicatorState.map((s, reader) => s?.tabAction.read(reader) ?? InlineEditTabAction.Inactive), this._gutterIndicatorState.map((s, reader) => s?.gutterIndicatorOffset.read(reader) ?? 0), this._inlineEditWidget.map((w, reader) => w?.view.inlineEditsIsHovered.read(reader) ?? false), this._focusIsInMenu));
        this._indicatorIsHoverVisible.set(this._indicator.isHoverVisible, undefined);
        derived(reader => {
            const w = this._inlineEditWidget.read(reader);
            if (!w) {
                return undefined;
            }
            return reader.store.add(this._instantiationService.createInstance(InlineEditsOnboardingExperience, w._inlineEditModel, constObservable(this._indicator), w.view._inlineCollapsedView));
        }).recomputeInitiallyAndOnChange(this._store);
    }
    _createGhostText(ghostText) {
        return this._instantiationService.createInstance(GhostTextView, this._editor, derived(reader => {
            const model = this._model.read(reader);
            const inlineCompletion = model?.inlineCompletionState.read(reader)?.inlineSuggestion;
            if (!model || !inlineCompletion) {
                // editor.suggest.preview: true causes situations where we have ghost text, but no suggest preview.
                return {
                    ghostText: ghostText.read(reader),
                    handleInlineCompletionShown: () => { },
                    warning: undefined,
                };
            }
            return {
                ghostText: ghostText.read(reader),
                handleInlineCompletionShown: (viewData) => model.handleInlineSuggestionShown(inlineCompletion, InlineCompletionViewKind.GhostText, viewData, Date.now()),
                warning: GhostTextWidgetWarning.from(model?.warning.read(reader)),
            };
        }), {
            useSyntaxHighlighting: this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(v => v.syntaxHighlightingEnabled),
        });
    }
    shouldShowHoverAtViewZone(viewZoneId) {
        return this._ghostTextWidgets.get()[0]?.ownsViewZone(viewZoneId) ?? false;
    }
};
InlineSuggestionsView = __decorate([
    __param(3, IInstantiationService)
], InlineSuggestionsView);
export { InlineSuggestionsView };
function getGhostTextTopOffset(inlineCompletion, editor) {
    const replacement = inlineCompletion.getSingleTextEdit();
    const textModel = editor.getModel();
    if (!textModel) {
        return 0;
    }
    const EOL = textModel.getEOL();
    if (replacement.range.isEmpty() && replacement.text.startsWith(EOL)) {
        const lineHeight = editor.getLineHeightForPosition(replacement.range.getStartPosition());
        return countPrefixRepeats(replacement.text, EOL) * lineHeight;
    }
    return 0;
}
function countPrefixRepeats(str, prefix) {
    if (!prefix.length) {
        return 0;
    }
    let count = 0;
    let i = 0;
    while (str.startsWith(prefix, i)) {
        count++;
        i += prefix.length;
    }
    return count;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lU3VnZ2VzdGlvbnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVTdWdnZXN0aW9uc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFvQyxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaE4sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBSTlGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLHNCQUFzQixFQUF3QixNQUFNLDhCQUE4QixDQUFDO0FBQzNHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSw4QkFBOEIsRUFBRSw4QkFBOEIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3ZMLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxtQkFB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
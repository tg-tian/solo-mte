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
var InlineEditsView_1;
import { $ } from '../../../../../../base/browser/dom.js';
import { equals } from '../../../../../../base/common/equals.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedOpts, mapObservableArrayCached, observableValue } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { TextReplacement } from '../../../../../common/core/edits/textEdit.js';
import { Range } from '../../../../../common/core/range.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
import { StringText } from '../../../../../common/core/text/abstractText.js';
import { TextLength } from '../../../../../common/core/text/textLength.js';
import { lineRangeMappingFromRangeMappings, RangeMapping } from '../../../../../common/diff/rangeMapping.js';
import { TextModel } from '../../../../../common/model/textModel.js';
import { InlineCompletionViewData, InlineCompletionViewKind, InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditsCollapsedView } from './inlineEditsViews/inlineEditsCollapsedView.js';
import { InlineEditsCustomView } from './inlineEditsViews/inlineEditsCustomView.js';
import { InlineEditsDeletionView } from './inlineEditsViews/inlineEditsDeletionView.js';
import { InlineEditsInsertionView } from './inlineEditsViews/inlineEditsInsertionView.js';
import { InlineEditsLineReplacementView } from './inlineEditsViews/inlineEditsLineReplacementView.js';
import { InlineEditsLongDistanceHint } from './inlineEditsViews/longDistanceHint/inlineEditsLongDistanceHint.js';
import { InlineEditsSideBySideView } from './inlineEditsViews/inlineEditsSideBySideView.js';
import { InlineEditsWordReplacementView, WordReplacementsViewData } from './inlineEditsViews/inlineEditsWordReplacementView.js';
import { OriginalEditorInlineDiffView } from './inlineEditsViews/originalEditorInlineDiffView.js';
import { applyEditToModifiedRangeMappings, createReindentEdit } from './utils/utils.js';
import './view.css';
import { JumpToView } from './inlineEditsViews/jumpToView.js';
import { StringEdit } from '../../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../../common/core/ranges/offsetRange.js';
import { getPositionOffsetTransformerFromTextModel } from '../../../../../common/core/text/getPositionOffsetTransformerFromTextModel.js';
let InlineEditsView = InlineEditsView_1 = class InlineEditsView extends Disposable {
    constructor(_editor, _model, _simpleModel, _inlineSuggestInfo, _showCollapsed, _instantiationService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._simpleModel = _simpleModel;
        this._inlineSuggestInfo = _inlineSuggestInfo;
        this._showCollapsed = _showCollapsed;
        this._instantiationService = _instantiationService;
        this._tabAction = derived(reader => this._model.read(reader)?.tabAction.read(reader) ?? InlineEditTabAction.Inactive);
        this.displayRange = derived(this, reader => {
            const state = this._uiState.read(reader);
            if (!state) {
                return undefined;
            }
            if (state.state?.kind === 'custom') {
                const range = state.state.displayLocation?.range;
                if (!range) {
                    throw new BugIndicatingError('custom view should have a range');
                }
                return new LineRange(range.startLineNumber, range.endLineNumber);
            }
            if (state.state?.kind === 'insertionMultiLine') {
                return this._insertion.originalLines.read(reader);
            }
            return state.edit.displayRange;
        });
        this._currentInlineEditCache = undefined;
        this._uiState = derived(this, reader => {
            const model = this._model.read(reader);
            const textModel = this._editorObs.model.read(reader);
            if (!model || !textModel || !this._constructorDone.read(reader)) {
                return undefined;
            }
            const inlineEdit = model.inlineEdit;
            let diff;
            let mappings;
            let newText = undefined;
            if (inlineEdit.edit) {
                mappings = RangeMapping.fromEdit(inlineEdit.edit);
                newText = new StringText(inlineEdit.edit.apply(inlineEdit.originalText));
                diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, newText);
            }
            else {
                mappings = [];
                diff = [];
                newText = inlineEdit.originalText;
            }
            let state = this._determineRenderState(model, reader, diff, newText);
            if (!state) {
                onUnexpectedError(new Error(`unable to determine view: tried to render ${this._previousView?.view}`));
                return undefined;
            }
            const longDistanceHint = this._getLongDistanceHintState(model, reader);
            if (longDistanceHint && longDistanceHint.isVisible) {
                state.viewData.setLongDistanceViewData(longDistanceHint.lineNumber, inlineEdit.lineEdit.lineRange.startLineNumber);
            }
            if (state.kind === InlineCompletionViewKind.SideBySide) {
                const indentationAdjustmentEdit = createReindentEdit(newText.getValue(), inlineEdit.modifiedLineRange, textModel.getOptions().tabSize);
                newText = new StringText(indentationAdjustmentEdit.applyToString(newText.getValue()));
                mappings = applyEditToModifiedRangeMappings(mappings, indentationAdjustmentEdit);
                diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, newText);
            }
            this._previewTextModel.setLanguage(textModel.getLanguageId());
            const previousNewText = this._previewTextModel.getValue();
            if (previousNewText !== newText.getValue()) {
                this._previewTextModel.setEOL(textModel.getEndOfLineSequence());
                const updateOldValueEdit = StringEdit.replace(new OffsetRange(0, previousNewText.length), newText.getValue());
                const updateOldValueEditSmall = updateOldValueEdit.removeCommonSuffixPrefix(previousNewText);
                const textEdit = getPositionOffsetTransformerFromTextModel(this._previewTextModel).getTextEdit(updateOldValueEditSmall);
                this._previewTextModel.edit(textEdit);
            }
            if (this._showCollapsed.read(reader)) {
                state = { kind: InlineCompletionViewKind.Collapsed, viewData: state.viewData };
            }
            model.handleInlineEditShownNextFrame(state.kind, state.viewData);
            const nextCursorPosition = inlineEdit.action?.kind === 'jumpTo' ? inlineEdit.action.position : null;
            return {
                state,
                diff,
                edit: inlineEdit,
                newText: newText.getValue(),
                newTextLineCount: inlineEdit.modifiedLineRange.length,
                isInDiffEditor: model.isInDiffEditor,
                longDistanceHint,
                nextCursorPosition: nextCursorPosition,
            };
        });
        this.inlineEditsIsHovered = derived(this, reader => {
            return this._sideBySide.isHovered.read(reader)
                || this._wordReplacementViews.read(reader).some(v => v.isHovered.read(reader))
                || this._deletion.isHovered.read(reader)
                || this._inlineDiffView.isHovered.read(reader)
                || this._lineReplacementView.isHovered.read(reader)
                || this._insertion.isHovered.read(reader)
                || this._customView.isHovered.read(reader)
                || this._longDistanceHint.map((v, r) => v?.isHovered.read(r) ?? false).read(reader);
        });
        this.gutterIndicatorOffset = derived(this, reader => {
            // TODO: have a better way to tell the gutter indicator view where the edit is inside a viewzone
            if (this._uiState.read(reader)?.state?.kind === 'insertionMultiLine') {
                return this._insertion.startLineOffset.read(reader);
            }
            return 0;
        });
        this._editorObs = observableCodeEditor(this._editor);
        this._constructorDone = observableValue(this, false);
        this._previewTextModel = this._register(this._instantiationService.createInstance(TextModel, '', this._editor.getModel().getLanguageId(), { ...TextModel.DEFAULT_CREATION_OPTIONS, bracketPairColorizationOptions: { enabled: true, independentColorPoolPerBracketType: false } }, null));
        this._sideBySide = this._register(this._instantiationService.createInstance(InlineEditsSideBySideView, this._editor, this._model.map(m => m?.inlineEdit), this._previewTextModel, this._uiState.map(s => s && s.state?.kind === InlineCompletionViewKind.SideBySide ? ({
            newTextLineCount: s.newTextLineCount,
            isInDiffEditor: s.isInDiffEditor,
        }) : undefined), this._tabAction));
        this._deletion = this._register(this._instantiationService.createInstance(InlineEditsDeletionView, this._editor, this._model.map(m => m?.inlineEdit), this._uiState.map(s => s && s.state?.kind === InlineCompletionViewKind.Deletion ? ({
            originalRange: s.state.originalRange,
            deletions: s.state.deletions,
            inDiffEditor: s.isInDiffEditor,
        }) : undefined), this._tabAction));
        this._insertion = this._register(this._instantiationService.createInstance(InlineEditsInsertionView, this._editor, this._uiState.map(s => s && s.state?.kind === InlineCompletionViewKind.InsertionMultiLine ? ({
            lineNumber: s.state.lineNumber,
            startColumn: s.state.column,
            text: s.state.text,
            inDiffEditor: s.isInDiffEditor,
        }) : undefined), this._tabAction));
        this._inlineCollapsedView = this._register(this._instantiationService.createInstance(InlineEditsCollapsedView, this._editor, this._model.map((m, reader) => this._uiState.read(reader)?.state?.kind === InlineCompletionViewKind.Collapsed ? m?.inlineEdit : undefined)));
        this._customView = this._register(this._instantiationService.createInstance(InlineEditsCustomView, this._editor, this._model.map((m, reader) => this._uiState.read(reader)?.state?.kind === InlineCompletionViewKind.Custom ? m?.displayLocation : undefined), this._tabAction));
        this._showLongDistanceHint = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(this, s => s.edits.showLongDistanceHint);
        this._longDistanceHint = derived(this, reader => {
            if (!this._showLongDistanceHint.read(reader)) {
                return undefined;
            }
            return reader.store.add(this._instantiationService.createInstance(InlineEditsLongDistanceHint, this._editor, this._uiState.map((s, reader) => s?.longDistanceHint ? ({
                hint: s.longDistanceHint,
                newTextLineCount: s.newTextLineCount,
                edit: s.edit,
                diff: s.diff,
                model: this._simpleModel.read(reader),
                inlineSuggestInfo: this._inlineSuggestInfo.read(reader),
                nextCursorPosition: s.nextCursorPosition,
            }) : undefined), this._previewTextModel, this._tabAction));
        }).recomputeInitiallyAndOnChange(this._store);
        this._inlineDiffViewState = derived(this, reader => {
            const e = this._uiState.read(reader);
            if (!e || !e.state) {
                return undefined;
            }
            if (e.state.kind === 'wordReplacements' || e.state.kind === 'insertionMultiLine' || e.state.kind === 'collapsed' || e.state.kind === 'custom' || e.state.kind === 'jumpTo') {
                return undefined;
            }
            return {
                modifiedText: new StringText(e.newText),
                diff: e.diff,
                mode: e.state.kind,
                modifiedCodeEditor: this._sideBySide.previewEditor,
                isInDiffEditor: e.isInDiffEditor,
            };
        });
        this._inlineDiffView = this._register(new OriginalEditorInlineDiffView(this._editor, this._inlineDiffViewState, this._previewTextModel));
        this._jumpToView = this._register(this._instantiationService.createInstance(JumpToView, this._editorObs, { style: 'label' }, derived(reader => {
            const s = this._uiState.read(reader);
            if (s?.state?.kind === InlineCompletionViewKind.JumpTo) {
                return { jumpToPosition: s.state.position };
            }
            return undefined;
        })));
        const wordReplacements = derivedOpts({
            equalsFn: equals.arrayC(equals.thisC())
        }, reader => {
            const s = this._uiState.read(reader);
            return s?.state?.kind === InlineCompletionViewKind.WordReplacements ? s.state.replacements.map(replacement => new WordReplacementsViewData(replacement, s.state?.alternativeAction)) : [];
        });
        this._wordReplacementViews = mapObservableArrayCached(this, wordReplacements, (viewData, store) => {
            return store.add(this._instantiationService.createInstance(InlineEditsWordReplacementView, this._editorObs, viewData, this._tabAction));
        });
        this._lineReplacementView = this._register(this._instantiationService.createInstance(InlineEditsLineReplacementView, this._editorObs, this._uiState.map(s => s?.state?.kind === InlineCompletionViewKind.LineReplacement ? ({
            originalRange: s.state.originalRange,
            modifiedRange: s.state.modifiedRange,
            modifiedLines: s.state.modifiedLines,
            replacements: s.state.replacements,
        }) : undefined), this._uiState.map(s => s?.isInDiffEditor ?? false), this._tabAction));
        this._useCodeShifting = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.edits.allowCodeShifting);
        this._renderSideBySide = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.edits.renderSideBySide);
        this._register(autorun((reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return;
            }
            reader.store.add(Event.any(this._sideBySide.onDidClick, this._lineReplacementView.onDidClick, this._insertion.onDidClick, ...this._wordReplacementViews.read(reader).map(w => w.onDidClick), this._inlineDiffView.onDidClick, this._customView.onDidClick)(clickEvent => {
                if (this._viewHasBeenShownLongerThan(350)) {
                    clickEvent.event.preventDefault();
                    model.accept(clickEvent.alternativeAction);
                }
            }));
        }));
        this._wordReplacementViews.recomputeInitiallyAndOnChange(this._store);
        const minEditorScrollHeight = derived(this, reader => {
            return Math.max(...this._wordReplacementViews.read(reader).map(v => v.minEditorScrollHeight.read(reader)), this._lineReplacementView.minEditorScrollHeight.read(reader), this._customView.minEditorScrollHeight.read(reader));
        }).recomputeInitiallyAndOnChange(this._store);
        let viewZoneId;
        this._register(autorun(reader => {
            const minScrollHeight = minEditorScrollHeight.read(reader);
            const textModel = this._editorObs.model.read(reader);
            if (!textModel) {
                return;
            }
            this._editor.changeViewZones(accessor => {
                const scrollHeight = this._editor.getScrollHeight();
                const viewZoneHeight = minScrollHeight - scrollHeight + 1 /* Add 1px so there is a small gap */;
                if (viewZoneHeight !== 0 && viewZoneId !== undefined) {
                    accessor.removeZone(viewZoneId);
                    viewZoneId = undefined;
                }
                if (viewZoneHeight <= 0) {
                    return;
                }
                viewZoneId = accessor.addZone({
                    afterLineNumber: textModel.getLineCount(),
                    heightInPx: viewZoneHeight,
                    domNode: $('div.minScrollHeightViewZone'),
                });
            });
        }));
        this._constructorDone.set(true, undefined); // TODO: remove and use correct initialization order
    }
    _getLongDistanceHintState(model, reader) {
        if (model.inlineEdit.inlineCompletion.identity.jumpedTo.read(reader)) {
            return undefined;
        }
        if (model.inlineEdit.action === undefined) {
            return undefined;
        }
        if (this._currentInlineEditCache?.inlineSuggestionIdentity !== model.inlineEdit.inlineCompletion.identity) {
            this._currentInlineEditCache = {
                inlineSuggestionIdentity: model.inlineEdit.inlineCompletion.identity,
                firstCursorLineNumber: model.inlineEdit.cursorPosition.lineNumber,
            };
        }
        return {
            lineNumber: this._currentInlineEditCache.firstCursorLineNumber,
            isVisible: !model.inViewPort.read(reader),
        };
    }
    _getCacheId(model) {
        return model.inlineEdit.inlineCompletion.identity.id;
    }
    _determineView(model, reader, diff, newText) {
        // Check if we can use the previous view if it is the same InlineCompletion as previously shown
        const inlineEdit = model.inlineEdit;
        const canUseCache = this._previousView?.id === this._getCacheId(model);
        const reconsiderViewEditorWidthChange = this._previousView?.editorWidth !== this._editorObs.layoutInfoWidth.read(reader) &&
            (this._previousView?.view === InlineCompletionViewKind.SideBySide ||
                this._previousView?.view === InlineCompletionViewKind.LineReplacement);
        if (canUseCache && !reconsiderViewEditorWidthChange) {
            return this._previousView.view;
        }
        const action = model.inlineEdit.inlineCompletion.action;
        if (action?.kind === 'edit' && action.alternativeAction) {
            return InlineCompletionViewKind.WordReplacements;
        }
        const uri = action?.kind === 'edit' ? action.uri : undefined;
        if (uri !== undefined) {
            return InlineCompletionViewKind.Custom;
        }
        if (model.displayLocation && !model.inlineEdit.inlineCompletion.identity.jumpedTo.read(reader)) {
            return InlineCompletionViewKind.Custom;
        }
        // Determine the view based on the edit / diff
        const numOriginalLines = inlineEdit.originalLineRange.length;
        const numModifiedLines = inlineEdit.modifiedLineRange.length;
        const inner = diff.flatMap(d => d.innerChanges ?? []);
        const isSingleInnerEdit = inner.length === 1;
        if (!model.isInDiffEditor) {
            if (isSingleInnerEdit
                && this._useCodeShifting.read(reader) !== 'never'
                && isSingleLineInsertion(diff)) {
                if (isSingleLineInsertionAfterPosition(diff, inlineEdit.cursorPosition)) {
                    return InlineCompletionViewKind.InsertionInline;
                }
                // If we have a single line insertion before the cursor position, we do not want to move the cursor by inserting
                // the suggestion inline. Use a line replacement view instead. Do not use word replacement view.
                return InlineCompletionViewKind.LineReplacement;
            }
            if (isDeletion(inner, inlineEdit, newText)) {
                return InlineCompletionViewKind.Deletion;
            }
            if (isSingleMultiLineInsertion(diff) && this._useCodeShifting.read(reader) === 'always') {
                return InlineCompletionViewKind.InsertionMultiLine;
            }
            const allInnerChangesNotTooLong = inner.every(m => TextLength.ofRange(m.originalRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH && TextLength.ofRange(m.modifiedRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH);
            if (allInnerChangesNotTooLong && isSingleInnerEdit && numOriginalLines === 1 && numModifiedLines === 1) {
                // Do not show indentation changes with word replacement view
                const modifiedText = inner.map(m => newText.getValueOfRange(m.modifiedRange));
                const originalText = inner.map(m => model.inlineEdit.originalText.getValueOfRange(m.originalRange));
                if (!modifiedText.some(v => v.includes('\t')) && !originalText.some(v => v.includes('\t'))) {
                    // Make sure there is no insertion, even if we grow them
                    if (!inner.some(m => m.originalRange.isEmpty()) ||
                        !growEditsUntilWhitespace(inner.map(m => new TextReplacement(m.originalRange, '')), inlineEdit.originalText).some(e => e.range.isEmpty() && TextLength.ofRange(e.range).columnCount < InlineEditsWordReplacementView.MAX_LENGTH)) {
                        return InlineCompletionViewKind.WordReplacements;
                    }
                }
            }
        }
        if (numOriginalLines > 0 && numModifiedLines > 0) {
            if (numOriginalLines === 1 && numModifiedLines === 1 && !model.isInDiffEditor /* prefer side by side in diff editor */) {
                return InlineCompletionViewKind.LineReplacement;
            }
            if (this._renderSideBySide.read(reader) !== 'never' && InlineEditsSideBySideView.fitsInsideViewport(this._editor, this._previewTextModel, inlineEdit, reader)) {
                return InlineCompletionViewKind.SideBySide;
            }
            return InlineCompletionViewKind.LineReplacement;
        }
        if (model.isInDiffEditor) {
            if (isDeletion(inner, inlineEdit, newText)) {
                return InlineCompletionViewKind.Deletion;
            }
            if (isSingleMultiLineInsertion(diff) && this._useCodeShifting.read(reader) === 'always') {
                return InlineCompletionViewKind.InsertionMultiLine;
            }
        }
        return InlineCompletionViewKind.SideBySide;
    }
    _determineRenderState(model, reader, diff, newText) {
        if (model.inlineEdit.action?.kind === 'jumpTo') {
            return {
                kind: InlineCompletionViewKind.JumpTo,
                position: model.inlineEdit.action.position,
                viewData: emptyViewData,
            };
        }
        const inlineEdit = model.inlineEdit;
        let view = this._determineView(model, reader, diff, newText);
        if (this._willRenderAboveCursor(reader, inlineEdit, view)) {
            switch (view) {
                case InlineCompletionViewKind.LineReplacement:
                case InlineCompletionViewKind.WordReplacements:
                    view = InlineCompletionViewKind.SideBySide;
                    break;
            }
        }
        this._previousView = { id: this._getCacheId(model), view, editorWidth: this._editor.getLayoutInfo().width, timestamp: Date.now() };
        const inner = diff.flatMap(d => d.innerChanges ?? []);
        const textModel = this._editor.getModel();
        const stringChanges = inner.map(m => ({
            originalRange: m.originalRange,
            modifiedRange: m.modifiedRange,
            original: textModel.getValueInRange(m.originalRange),
            modified: newText.getValueOfRange(m.modifiedRange)
        }));
        const viewData = getViewData(inlineEdit, stringChanges, textModel);
        switch (view) {
            case InlineCompletionViewKind.InsertionInline: return { kind: InlineCompletionViewKind.InsertionInline, viewData };
            case InlineCompletionViewKind.SideBySide: return { kind: InlineCompletionViewKind.SideBySide, viewData };
            case InlineCompletionViewKind.Collapsed: return { kind: InlineCompletionViewKind.Collapsed, viewData };
            case InlineCompletionViewKind.Custom: return { kind: InlineCompletionViewKind.Custom, displayLocation: model.displayLocation, viewData };
        }
        if (view === InlineCompletionViewKind.Deletion) {
            return {
                kind: InlineCompletionViewKind.Deletion,
                originalRange: inlineEdit.originalLineRange,
                deletions: inner.map(m => m.originalRange),
                viewData,
            };
        }
        if (view === InlineCompletionViewKind.InsertionMultiLine) {
            const change = inner[0];
            return {
                kind: InlineCompletionViewKind.InsertionMultiLine,
                lineNumber: change.originalRange.startLineNumber,
                column: change.originalRange.startColumn,
                text: newText.getValueOfRange(change.modifiedRange),
                viewData,
            };
        }
        const replacements = stringChanges.map(m => new TextReplacement(m.originalRange, m.modified));
        if (replacements.length === 0) {
            return undefined;
        }
        if (view === InlineCompletionViewKind.WordReplacements) {
            let grownEdits = growEditsToEntireWord(replacements, inlineEdit.originalText);
            if (grownEdits.some(e => e.range.isEmpty())) {
                grownEdits = growEditsUntilWhitespace(replacements, inlineEdit.originalText);
            }
            return {
                kind: InlineCompletionViewKind.WordReplacements,
                replacements: grownEdits,
                alternativeAction: model.inlineEdit.action?.alternativeAction,
                viewData,
            };
        }
        if (view === InlineCompletionViewKind.LineReplacement) {
            return {
                kind: InlineCompletionViewKind.LineReplacement,
                originalRange: inlineEdit.originalLineRange,
                modifiedRange: inlineEdit.modifiedLineRange,
                modifiedLines: inlineEdit.modifiedLineRange.mapToLineArray(line => newText.getLineAt(line)),
                replacements: inner.map(m => ({ originalRange: m.originalRange, modifiedRange: m.modifiedRange })),
                viewData,
            };
        }
        return undefined;
    }
    _willRenderAboveCursor(reader, inlineEdit, view) {
        const useCodeShifting = this._useCodeShifting.read(reader);
        if (useCodeShifting === 'always') {
            return false;
        }
        for (const cursorPosition of inlineEdit.multiCursorPositions) {
            if (view === InlineCompletionViewKind.WordReplacements &&
                cursorPosition.lineNumber === inlineEdit.originalLineRange.startLineNumber + 1) {
                return true;
            }
            if (view === InlineCompletionViewKind.LineReplacement &&
                cursorPosition.lineNumber >= inlineEdit.originalLineRange.endLineNumberExclusive &&
                cursorPosition.lineNumber < inlineEdit.modifiedLineRange.endLineNumberExclusive + inlineEdit.modifiedLineRange.length) {
                return true;
            }
        }
        return false;
    }
    _viewHasBeenShownLongerThan(durationMs) {
        const viewCreationTime = this._previousView?.timestamp;
        if (!viewCreationTime) {
            throw new BugIndicatingError('viewHasBeenShownLongThan called before a view has been shown');
        }
        const currentTime = Date.now();
        return (currentTime - viewCreationTime) >= durationMs;
    }
};
InlineEditsView = InlineEditsView_1 = __decorate([
    __param(5, IInstantiationService)
], InlineEditsView);
export { InlineEditsView };
const emptyViewData = new InlineCompletionViewData(-1, -1, -1, -1, -1, -1, -1, true);
function getViewData(inlineEdit, stringChanges, textModel) {
    if (!inlineEdit.edit) {
        return emptyViewData;
    }
    const cursorPosition = inlineEdit.cursorPosition;
    const startsWithEOL = stringChanges.length === 0 ? false : stringChanges[0].modified.startsWith(textModel.getEOL());
    const viewData = new InlineCompletionViewData(inlineEdit.edit.replacements.length === 0 ? 0 : inlineEdit.edit.replacements[0].range.getStartPosition().column - cursorPosition.column, inlineEdit.lineEdit.lineRange.startLineNumber - cursorPosition.lineNumber + (startsWithEOL && inlineEdit.lineEdit.lineRange.startLineNumber >= cursorPosition.lineNumber ? 1 : 0), inlineEdit.lineEdit.lineRange.length, inlineEdit.lineEdit.newLines.length, stringChanges.reduce((acc, r) => acc + r.original.length, 0), stringChanges.reduce((acc, r) => acc + r.modified.length, 0), stringChanges.length, stringChanges.every(r => r.original === stringChanges[0].original && r.modified === stringChanges[0].modified));
    return viewData;
}
function isSingleLineInsertion(diff) {
    return diff.every(m => m.innerChanges.every(r => isWordInsertion(r)));
    function isWordInsertion(r) {
        if (!r.originalRange.isEmpty()) {
            return false;
        }
        const isInsertionWithinLine = r.modifiedRange.startLineNumber === r.modifiedRange.endLineNumber;
        if (!isInsertionWithinLine) {
            return false;
        }
        return true;
    }
}
function isSingleLineInsertionAfterPosition(diff, position) {
    if (!position) {
        return false;
    }
    if (!isSingleLineInsertion(diff)) {
        return false;
    }
    const pos = position;
    return diff.every(m => m.innerChanges.every(r => isStableWordInsertion(r)));
    function isStableWordInsertion(r) {
        const insertPosition = r.originalRange.getStartPosition();
        if (pos.isBeforeOrEqual(insertPosition)) {
            return true;
        }
        if (insertPosition.lineNumber < pos.lineNumber) {
            return true;
        }
        return false;
    }
}
function isSingleMultiLineInsertion(diff) {
    const inner = diff.flatMap(d => d.innerChanges ?? []);
    if (inner.length !== 1) {
        return false;
    }
    const change = inner[0];
    if (!change.originalRange.isEmpty()) {
        return false;
    }
    if (change.modifiedRange.startLineNumber === change.modifiedRange.endLineNumber) {
        return false;
    }
    return true;
}
function isDeletion(inner, inlineEdit, newText) {
    const innerValues = inner.map(m => ({ original: inlineEdit.originalText.getValueOfRange(m.originalRange), modified: newText.getValueOfRange(m.modifiedRange) }));
    return innerValues.every(({ original, modified }) => modified.trim() === '' && original.length > 0 && (original.length > modified.length || original.trim() !== ''));
}
function growEditsToEntireWord(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => /^[a-zA-Z]$/.test(char));
}
function growEditsUntilWhitespace(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => !(/^\s$/.test(char)));
}
function _growEdits(replacements, originalText, fn) {
    const result = [];
    replacements.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
    for (const edit of replacements) {
        let startIndex = edit.range.startColumn - 1;
        let endIndex = edit.range.endColumn - 2;
        let prefix = '';
        let suffix = '';
        const startLineContent = originalText.getLineAt(edit.range.startLineNumber);
        const endLineContent = originalText.getLineAt(edit.range.endLineNumber);
        if (isIncluded(startLineContent[startIndex])) {
            // grow to the left
            while (isIncluded(startLineContent[startIndex - 1])) {
                prefix = startLineContent[startIndex - 1] + prefix;
                startIndex--;
            }
        }
        if (isIncluded(endLineContent[endIndex]) || endIndex < startIndex) {
            // grow to the right
            while (isIncluded(endLineContent[endIndex + 1])) {
                suffix += endLineContent[endIndex + 1];
                endIndex++;
            }
        }
        // create new edit and merge together if they are touching
        let newEdit = new TextReplacement(new Range(edit.range.startLineNumber, startIndex + 1, edit.range.endLineNumber, endIndex + 2), prefix + edit.text + suffix);
        if (result.length > 0 && Range.areIntersectingOrTouching(result[result.length - 1].range, newEdit.range)) {
            newEdit = TextReplacement.joinReplacements([result.pop(), newEdit], originalText);
        }
        result.push(newEdit);
    }
    function isIncluded(c) {
        if (c === undefined) {
            return false;
        }
        return fn(c);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQXdCLHdCQUF3QixFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBd0Isb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU1RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzRSxPQUFPLEVBQWdCLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQTRCLGlDQUFpQyxFQUFFLFlBQVksRUFBRSxNQUFN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
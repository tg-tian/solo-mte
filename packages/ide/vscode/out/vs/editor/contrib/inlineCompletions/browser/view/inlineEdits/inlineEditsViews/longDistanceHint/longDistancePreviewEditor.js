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
import { n } from '../../../../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../../../base/common/numbers.js';
import { derived, constObservable, autorun, observableValue } from '../../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../../../browser/observableCodeEditor.js';
import { EmbeddedCodeEditorWidget } from '../../../../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../../../../common/core/position.js';
import { Range } from '../../../../../../../common/core/range.js';
import { LineRange } from '../../../../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../../../../common/core/ranges/offsetRange.js';
import { ModelDecorationOptions } from '../../../../../../../common/model/textModel.js';
import { InlineCompletionContextKeys } from '../../../../controller/inlineCompletionContextKeys.js';
import { InlineEditsGutterIndicator, InlineEditsGutterIndicatorData } from '../../components/gutterIndicatorView.js';
import { classNames, maxContentWidthInRange } from '../../utils/utils.js';
import { JumpToView } from '../jumpToView.js';
let LongDistancePreviewEditor = class LongDistancePreviewEditor extends Disposable {
    constructor(_previewTextModel, _properties, _parentEditor, _tabAction, _instantiationService) {
        super();
        this._previewTextModel = _previewTextModel;
        this._properties = _properties;
        this._parentEditor = _parentEditor;
        this._tabAction = _tabAction;
        this._instantiationService = _instantiationService;
        this._previewRef = n.ref();
        this.element = n.div({ class: 'preview', style: { /*pointerEvents: 'none'*/}, ref: this._previewRef });
        this._state = derived(this, reader => {
            const props = this._properties.read(reader);
            if (!props) {
                return undefined;
            }
            let mode;
            let visibleRange;
            if (props.nextCursorPosition !== null) {
                mode = 'original';
                visibleRange = LineRange.ofLength(props.nextCursorPosition.lineNumber, 1);
            }
            else {
                if (props.diff[0].innerChanges?.every(c => c.modifiedRange.isEmpty())) {
                    mode = 'original';
                    visibleRange = LineRange.ofLength(props.diff[0].original.startLineNumber, 1);
                }
                else {
                    mode = 'modified';
                    visibleRange = LineRange.ofLength(props.diff[0].modified.startLineNumber, 1);
                }
            }
            const textModel = mode === 'original' ? this._parentEditorObs.model.read(reader) : this._previewTextModel;
            return {
                mode,
                visibleLineRange: visibleRange,
                textModel,
                diff: props.diff,
            };
        });
        this.updatePreviewEditorEffect = derived(this, reader => {
            // this._widgetContent.readEffect(reader);
            this._previewEditorObs.model.read(reader); // update when the model is set
            const range = this._state.read(reader)?.visibleLineRange;
            if (!range) {
                return;
            }
            const hiddenAreas = [];
            if (range.startLineNumber > 1) {
                hiddenAreas.push(new Range(1, 1, range.startLineNumber - 1, 1));
            }
            if (range.endLineNumberExclusive < this._previewTextModel.getLineCount() + 1) {
                hiddenAreas.push(new Range(range.endLineNumberExclusive, 1, this._previewTextModel.getLineCount() + 1, 1));
            }
            this.previewEditor.setHiddenAreas(hiddenAreas, undefined, true);
        });
        this.horizontalContentRangeInPreviewEditorToShow = derived(this, reader => {
            return this._getHorizontalContentRangeInPreviewEditorToShow(this.previewEditor, reader);
        });
        this.contentHeight = derived(this, (reader) => {
            const viewState = this._state.read(reader);
            if (!viewState) {
                return constObservable(null);
            }
            const previewEditorHeight = this._previewEditorObs.observeLineHeightForLine(viewState.visibleLineRange.startLineNumber);
            return previewEditorHeight;
        }).flatten();
        this._editorDecorations = derived(this, reader => {
            const state = this._state.read(reader);
            if (!state) {
                return undefined;
            }
            const diff = {
                mode: 'insertionInline',
                diff: state.diff,
            };
            const originalDecorations = [];
            const modifiedDecorations = [];
            const diffWholeLineDeleteDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-delete',
                description: 'char-delete',
                isWholeLine: false,
                zIndex: 1, // be on top of diff background decoration
            });
            const diffWholeLineAddDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert',
                description: 'char-insert',
                isWholeLine: true,
            });
            const diffAddDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert',
                description: 'char-insert',
                shouldFillLineOnLineBreak: true,
            });
            const hideEmptyInnerDecorations = true; // diff.mode === 'lineReplacement';
            for (const m of diff.diff) {
                if (m.modified.isEmpty || m.original.isEmpty) {
                    if (!m.original.isEmpty) {
                        originalDecorations.push({ range: m.original.toInclusiveRange(), options: diffWholeLineDeleteDecoration });
                    }
                    if (!m.modified.isEmpty) {
                        modifiedDecorations.push({ range: m.modified.toInclusiveRange(), options: diffWholeLineAddDecoration });
                    }
                }
                else {
                    for (const i of m.innerChanges || []) {
                        // Don't show empty markers outside the line range
                        if (m.original.contains(i.originalRange.startLineNumber) && !(hideEmptyInnerDecorations && i.originalRange.isEmpty())) {
                            originalDecorations.push({
                                range: i.originalRange,
                                options: {
                                    description: 'char-delete',
                                    shouldFillLineOnLineBreak: false,
                                    className: classNames('inlineCompletions-char-delete', 
                                    // i.originalRange.isSingleLine() && diff.mode === 'insertionInline' && 'single-line-inline',
                                    i.originalRange.isEmpty() && 'empty'),
                                    zIndex: 1
                                }
                            });
                        }
                        if (m.modified.contains(i.modifiedRange.startLineNumber)) {
                            modifiedDecorations.push({
                                range: i.modifiedRange,
                                options: diffAddDecoration
                            });
                        }
                    }
                }
            }
            return { originalDecorations, modifiedDecorations };
        });
        this.previewEditor = this._register(this._createPreviewEditor());
        this._parentEditorObs = observableCodeEditor(this._parentEditor);
        this._register(autorun(reader => {
            const tm = this._state.read(reader)?.textModel || null;
            if (tm) {
                // Avoid transitions from tm -> null -> tm, where tm -> tm would be a no-op.
                this.previewEditor.setModel(tm);
            }
        }));
        this._previewEditorObs = observableCodeEditor(this.previewEditor);
        this._register(this._previewEditorObs.setDecorations(derived(reader => {
            const state = this._state.read(reader);
            const decorations = this._editorDecorations.read(reader);
            return (state?.mode === 'original' ? decorations?.originalDecorations : decorations?.modifiedDecorations) ?? [];
        })));
        const showJumpToDecoration = false;
        if (showJumpToDecoration) {
            this._register(this._instantiationService.createInstance(JumpToView, this._previewEditorObs, { style: 'cursor' }, derived(reader => {
                const p = this._properties.read(reader);
                if (!p || !p.nextCursorPosition) {
                    return undefined;
                }
                return {
                    jumpToPosition: p.nextCursorPosition,
                };
            })));
        }
        // Mirror the cursor position. Allows the gutter arrow to point in the correct direction.
        this._register(autorun((reader) => {
            if (!this._properties.read(reader)) {
                return;
            }
            const cursorPosition = this._parentEditorObs.cursorPosition.read(reader);
            if (cursorPosition) {
                this.previewEditor.setPosition(this._previewTextModel.validatePosition(cursorPosition), 'longDistanceHintPreview');
            }
        }));
        this._register(autorun(reader => {
            const state = this._state.read(reader);
            if (!state) {
                return;
            }
            // Ensure there is enough space to the left of the line number for the gutter indicator to fits.
            const lineNumberDigets = state.visibleLineRange.startLineNumber.toString().length;
            this.previewEditor.updateOptions({ lineNumbersMinChars: lineNumberDigets + 1 });
        }));
        this._register(this._instantiationService.createInstance(InlineEditsGutterIndicator, this._previewEditorObs, derived(reader => {
            const state = this._state.read(reader);
            if (!state) {
                return undefined;
            }
            const props = this._properties.read(reader);
            if (!props) {
                return undefined;
            }
            return new InlineEditsGutterIndicatorData(props.inlineSuggestInfo, LineRange.ofLength(state.visibleLineRange.startLineNumber, 1), props.model, undefined);
        }), this._tabAction, constObservable(0), constObservable(false), observableValue(this, false)));
        this.updatePreviewEditorEffect.recomputeInitiallyAndOnChange(this._store);
    }
    _createPreviewEditor() {
        return this._instantiationService.createInstance(EmbeddedCodeEditorWidget, this._previewRef.element, {
            glyphMargin: false,
            lineNumbers: 'on',
            minimap: { enabled: false },
            guides: {
                indentation: false,
                bracketPairs: false,
                bracketPairsHorizontal: false,
                highlightActiveIndentation: false,
            },
            editContext: false, // is a bit faster
            rulers: [],
            padding: { top: 0, bottom: 0 },
            //folding: false,
            selectOnLineNumbers: false,
            selectionHighlight: false,
            columnSelection: false,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            //lineDecorationsWidth: 0,
            //lineNumbersMinChars: 0,
            revealHorizontalRightPadding: 0,
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: false },
            scrollBeyondLastLine: false,
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                handleMouseWheel: false,
            },
            readOnly: true,
            wordWrap: 'off',
            wordWrapOverride1: 'off',
            wordWrapOverride2: 'off',
        }, {
            contextKeyValues: {
                [InlineCompletionContextKeys.inInlineEditsPreviewEditor.key]: true,
            },
            contributions: [],
        }, this._parentEditor);
    }
    _getHorizontalContentRangeInPreviewEditorToShow(editor, reader) {
        const state = this._state.read(reader);
        if (!state) {
            return undefined;
        }
        const diff = state.diff;
        const jumpToPos = this._properties.read(reader)?.nextCursorPosition;
        const visibleRange = state.visibleLineRange;
        const l = this._previewEditorObs.layoutInfo.read(reader);
        const trueContentWidth = maxContentWidthInRange(this._previewEditorObs, visibleRange, reader);
        let firstCharacterChange;
        if (jumpToPos) {
            firstCharacterChange = Range.fromPositions(jumpToPos);
        }
        else if (diff[0].innerChanges) {
            firstCharacterChange = state.mode === 'modified' ? diff[0].innerChanges[0].modifiedRange : diff[0].innerChanges[0].originalRange;
        }
        else {
            return undefined;
        }
        // find the horizontal range we want to show.
        const preferredRange = growUntilVariableBoundaries(editor.getModel(), firstCharacterChange, 5);
        const leftOffset = this._previewEditorObs.getLeftOfPosition(preferredRange.getStartPosition(), reader);
        const rightOffset = this._previewEditorObs.getLeftOfPosition(preferredRange.getEndPosition(), reader);
        const left = clamp(leftOffset, 0, trueContentWidth);
        const right = clamp(rightOffset, left, trueContentWidth);
        const indentCol = editor.getModel().getLineFirstNonWhitespaceColumn(preferredRange.startLineNumber);
        const indentationEnd = this._previewEditorObs.getLeftOfPosition(new Position(preferredRange.startLineNumber, indentCol), reader);
        const preferredRangeToReveal = new OffsetRange(left, right);
        return {
            indentationEnd,
            preferredRangeToReveal,
            maxEditorWidth: trueContentWidth + l.contentLeft,
            contentWidth: trueContentWidth,
            nonContentWidth: l.contentLeft, // Width of area that is not content
        };
    }
    layout(dimension, desiredPreviewEditorScrollLeft) {
        this.previewEditor.layout(dimension);
        this._previewEditorObs.editor.setScrollLeft(desiredPreviewEditorScrollLeft);
    }
};
LongDistancePreviewEditor = __decorate([
    __param(4, IInstantiationService)
], LongDistancePreviewEditor);
export { LongDistancePreviewEditor };
/*
 * Grows the range on each ends until it includes a none-variable-name character
 * or the next character would be a whitespace character
 * or the maxGrow limit is reached
 */
function growUntilVariableBoundaries(textModel, range, maxGrow) {
    const startPosition = range.getStartPosition();
    const endPosition = range.getEndPosition();
    const line = textModel.getLineContent(startPosition.lineNumber);
    function isVariableNameCharacter(col) {
        const char = line.charAt(col - 1);
        return (/[a-zA-Z0-9_]/).test(char);
    }
    function isWhitespace(col) {
        const char = line.charAt(col - 1);
        return char === ' ' || char === '\t';
    }
    let startColumn = startPosition.column;
    while (startColumn > 1 && isVariableNameCharacter(startColumn) && !isWhitespace(startColumn - 1) && startPosition.column - startColumn < maxGrow) {
        startColumn--;
    }
    let endColumn = endPosition.column - 1;
    while (endColumn <= line.length && isVariableNameCharacter(endColumn) && !isWhitespace(endColumn + 1) && endColumn - endPosition.column < maxGrow) {
        endColumn++;
    }
    return new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endColumn + 1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9uZ0Rpc3RhbmNlUHJldmlld0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9sb25nRGlzdGFuY2VIaW50L2xvbmdEaXN0YW5jZVByZXZpZXdFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkUsT0FBTyxFQUFlLE9BQU8sRUFBRSxlQUFlLEVBQVcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzdJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBRS9HLE9BQU8sRUFBd0Isb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNsSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUV0SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHckYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDcEcsT0FBTyxF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
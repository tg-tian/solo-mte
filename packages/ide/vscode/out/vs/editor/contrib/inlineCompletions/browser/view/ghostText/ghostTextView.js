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
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, derivedOpts, observableSignalFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import * as strings from '../../../../../../base/common/strings.js';
import { applyFontInfo } from '../../../../../browser/config/domFontInfo.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { EditorFontLigatures } from '../../../../../common/config/editorOptions.js';
import { StringEdit, StringReplacement } from '../../../../../common/core/edits/stringEdit.js';
import { Position } from '../../../../../common/core/position.js';
import { Range } from '../../../../../common/core/range.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { ILanguageService } from '../../../../../common/languages/language.js';
import { InjectedTextCursorStops } from '../../../../../common/model.js';
import { LineTokens } from '../../../../../common/tokens/lineTokens.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { GhostTextReplacement } from '../../model/ghostText.js';
import { RangeSingleLine } from '../../../../../common/core/ranges/rangeSingleLine.js';
import { ColumnRange } from '../../../../../common/core/ranges/columnRange.js';
import { addDisposableListener, getWindow, isHTMLElement, n } from '../../../../../../base/browser/dom.js';
import './ghostTextView.css';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { CodeEditorWidget } from '../../../../../browser/widget/codeEditor/codeEditorWidget.js';
import { TokenWithTextArray } from '../../../../../common/tokens/tokenWithTextArray.js';
import { InlineCompletionViewData } from '../inlineEdits/inlineEditsViewInterface.js';
import { equals, sum } from '../../../../../../base/common/arrays.js';
import { equalsIfDefinedC, thisEqualsC } from '../../../../../../base/common/equals.js';
export class GhostTextWidgetWarning {
    static from(warning) {
        if (!warning) {
            return undefined;
        }
        return new GhostTextWidgetWarning(warning.icon);
    }
    constructor(icon = Codicon.warning) {
        this.icon = icon;
    }
}
const USE_SQUIGGLES_FOR_WARNING = true;
const GHOST_TEXT_CLASS_NAME = 'ghost-text';
let GhostTextView = class GhostTextView extends Disposable {
    constructor(_editor, _data, options, _languageService) {
        super();
        this._editor = _editor;
        this._data = _data;
        this._languageService = _languageService;
        this._isDisposed = observableValue(this, false);
        this._warningState = derived(reader => {
            const model = this._data.read(reader);
            const warning = model?.warning;
            if (!model || !warning) {
                return undefined;
            }
            const gt = model.ghostText;
            return { lineNumber: gt.lineNumber, position: new Position(gt.lineNumber, gt.parts[0].column), icon: warning.icon };
        });
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._extraClassNames = derived(this, reader => {
            const extraClasses = this._extraClasses.slice();
            if (this._useSyntaxHighlighting.read(reader)) {
                extraClasses.push('syntax-highlighted');
            }
            if (USE_SQUIGGLES_FOR_WARNING && this._warningState.read(reader)) {
                extraClasses.push('warning');
            }
            const extraClassNames = extraClasses.map(c => ` ${c}`).join('');
            return extraClassNames;
        });
        this._state = derived(this, reader => {
            if (this._isDisposed.read(reader)) {
                return undefined;
            }
            const props = this._data.read(reader);
            if (!props) {
                return undefined;
            }
            const textModel = this._editorObs.model.read(reader);
            if (!textModel) {
                return undefined;
            }
            const ghostText = props.ghostText;
            const replacedRange = ghostText instanceof GhostTextReplacement ? ghostText.columnRange : undefined;
            const syntaxHighlightingEnabled = this._useSyntaxHighlighting.read(reader);
            const extraClassNames = this._extraClassNames.read(reader);
            const { inlineTexts, additionalLines, hiddenRange, additionalLinesOriginalSuffix } = computeGhostTextViewData(ghostText, textModel, GHOST_TEXT_CLASS_NAME + extraClassNames);
            const currentLine = textModel.getLineContent(ghostText.lineNumber);
            const edit = new StringEdit(inlineTexts.map(t => StringReplacement.insert(t.column - 1, t.text)));
            const tokens = syntaxHighlightingEnabled ? textModel.tokenization.tokenizeLinesAt(ghostText.lineNumber, [edit.apply(currentLine), ...additionalLines.map(l => l.content)]) : undefined;
            const newRanges = edit.getNewRanges();
            const inlineTextsWithTokens = inlineTexts.map((t, idx) => ({ ...t, tokens: tokens?.[0]?.getTokensInRange(newRanges[idx]) }));
            const tokenizedAdditionalLines = additionalLines.map((l, idx) => {
                let content = tokens?.[idx + 1] ?? LineTokens.createEmpty(l.content, this._languageService.languageIdCodec);
                if (idx === additionalLines.length - 1 && additionalLinesOriginalSuffix) {
                    const t = TokenWithTextArray.fromLineTokens(textModel.tokenization.getLineTokens(additionalLinesOriginalSuffix.lineNumber));
                    const existingContent = t.slice(additionalLinesOriginalSuffix.columnRange.toZeroBasedOffsetRange());
                    content = TokenWithTextArray.fromLineTokens(content).append(existingContent).toLineTokens(content.languageIdCodec);
                }
                return new LineData(content, l.decorations);
            });
            const cursorColumn = this._editor.getSelection()?.getStartPosition().column;
            const disjointInlineTexts = inlineTextsWithTokens.filter(inline => inline.text !== '');
            const hasInsertionOnCurrentLine = disjointInlineTexts.length !== 0;
            const telemetryViewData = new InlineCompletionViewData((hasInsertionOnCurrentLine ? disjointInlineTexts[0].column : 1) - cursorColumn, hasInsertionOnCurrentLine ? 0 : (additionalLines.findIndex(line => line.content !== '') + 1), hasInsertionOnCurrentLine ? 1 : 0, additionalLines.length + (hasInsertionOnCurrentLine ? 1 : 0), 0, sum(disjointInlineTexts.map(inline => inline.text.length)) + sum(tokenizedAdditionalLines.map(line => line.content.getTextLength())), disjointInlineTexts.length + (additionalLines.length > 0 ? 1 : 0), disjointInlineTexts.length > 1 && tokenizedAdditionalLines.length === 0 ? disjointInlineTexts.every(inline => inline.text === disjointInlineTexts[0].text) : undefined);
            return {
                replacedRange,
                inlineTexts: inlineTextsWithTokens,
                additionalLines: tokenizedAdditionalLines,
                hiddenRange,
                lineNumber: ghostText.lineNumber,
                additionalReservedLineCount: this._minReservedLineCount.read(reader),
                targetTextModel: textModel,
                syntaxHighlightingEnabled,
                telemetryViewData,
                handleInlineCompletionShown: props.handleInlineCompletionShown,
            };
        });
        this._decorations = derived(this, reader => {
            const uiState = this._state.read(reader);
            if (!uiState) {
                return [];
            }
            const decorations = [];
            const extraClassNames = this._extraClassNames.read(reader);
            if (uiState.replacedRange) {
                decorations.push({
                    range: uiState.replacedRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'inline-completion-text-to-replace' + extraClassNames, description: 'GhostTextReplacement' }
                });
            }
            if (uiState.hiddenRange) {
                decorations.push({
                    range: uiState.hiddenRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'ghost-text-hidden', description: 'ghost-text-hidden', }
                });
            }
            for (const p of uiState.inlineTexts) {
                decorations.push({
                    range: Range.fromPositions(new Position(uiState.lineNumber, p.column)),
                    options: {
                        description: 'ghost-text-decoration',
                        after: {
                            content: p.text,
                            tokens: p.tokens,
                            inlineClassName: (p.preview ? 'ghost-text-decoration-preview' : 'ghost-text-decoration')
                                + (this._isClickable ? ' clickable' : '')
                                + extraClassNames
                                + p.lineDecorations.map(d => ' ' + d.className).join(' '), // TODO: take the ranges into account for line decorations
                            cursorStops: InjectedTextCursorStops.Left,
                            attachedData: new GhostTextAttachedData(this),
                        },
                        showIfCollapsed: true,
                    }
                });
            }
            return decorations;
        });
        this.isHovered = derived(this, reader => {
            if (this._isDisposed.read(reader)) {
                return false;
            }
            return this._isInlineTextHovered.read(reader) || this._additionalLinesWidget.isHovered.read(reader);
        });
        this.height = derived(this, reader => {
            const lineHeight = this._editorObs.getOption(75 /* EditorOption.lineHeight */).read(reader);
            return lineHeight + (this._additionalLinesWidget.viewZoneHeight.read(reader) ?? 0);
        });
        this._extraClasses = options.extraClasses ?? [];
        this._isClickable = options.isClickable ?? false;
        this._shouldKeepCursorStable = options.shouldKeepCursorStable ?? false;
        this._minReservedLineCount = options.minReservedLineCount ?? constObservable(0);
        this._useSyntaxHighlighting = options.useSyntaxHighlighting ?? constObservable(true);
        this._editorObs = observableCodeEditor(this._editor);
        this._additionalLinesWidget = this._register(new AdditionalLinesWidget(this._editor, derivedOpts({ owner: this, equalsFn: equalsIfDefinedC(thisEqualsC()) }, reader => {
            /** @description lines */
            const uiState = this._state.read(reader);
            return uiState ? new AdditionalLinesData(uiState.lineNumber, uiState.additionalLines, uiState.additionalReservedLineCount) : undefined;
        }), this._shouldKeepCursorStable, this._isClickable));
        this._isInlineTextHovered = this._editorObs.isTargetHovered(p => p.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            p.target.detail.injectedText?.options.attachedData instanceof GhostTextAttachedData &&
            p.target.detail.injectedText.options.attachedData.owner === this, this._store);
        this._register(toDisposable(() => { this._isDisposed.set(true, undefined); }));
        this._register(this._editorObs.setDecorations(this._decorations));
        if (this._isClickable) {
            this._register(this._additionalLinesWidget.onDidClick((e) => this._onDidClick.fire(e)));
            this._register(this._editor.onMouseUp(e => {
                if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                    return;
                }
                const a = e.target.detail.injectedText?.options.attachedData;
                if (a instanceof GhostTextAttachedData && a.owner === this) {
                    this._onDidClick.fire(e.event);
                }
            }));
        }
        this._register(autorun(reader => {
            const state = this._state.read(reader);
            state?.handleInlineCompletionShown(state.telemetryViewData);
        }));
        this._register(autorunWithStore((reader, store) => {
            if (USE_SQUIGGLES_FOR_WARNING) {
                return;
            }
            const state = this._warningState.read(reader);
            if (!state) {
                return;
            }
            const lineHeight = this._editorObs.getOption(75 /* EditorOption.lineHeight */);
            store.add(this._editorObs.createContentWidget({
                position: constObservable({
                    position: new Position(state.lineNumber, Number.MAX_SAFE_INTEGER),
                    preference: [0 /* ContentWidgetPositionPreference.EXACT */],
                    positionAffinity: 1 /* PositionAffinity.Right */,
                }),
                allowEditorOverflow: false,
                domNode: n.div({
                    class: 'ghost-text-view-warning-widget',
                    style: {
                        width: lineHeight,
                        height: lineHeight,
                        marginLeft: 4,
                        color: 'orange',
                    },
                    ref: (dom) => {
                        // eslint-disable-next-line local/code-no-any-casts
                        dom.ghostTextViewWarningWidgetData = { range: Range.fromPositions(state.position) };
                    }
                }, [
                    n.div({
                        class: 'ghost-text-view-warning-widget-icon',
                        style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignContent: 'center',
                            alignItems: 'center',
                        }
                    }, [renderIcon(state.icon)])
                ]).keepUpdated(store).element,
            }));
        }));
    }
    static getWarningWidgetContext(domNode) {
        // eslint-disable-next-line local/code-no-any-casts
        const data = domNode.ghostTextViewWarningWidgetData;
        if (data) {
            return data;
        }
        else if (domNode.parentElement) {
            return this.getWarningWidgetContext(domNode.parentElement);
        }
        return undefined;
    }
    ownsViewZone(viewZoneId) {
        return this._additionalLinesWidget.viewZoneId === viewZoneId;
    }
};
GhostTextView = __decorate([
    __param(3, ILanguageService)
], GhostTextView);
export { GhostTextView };
class GhostTextAttachedData {
    constructor(owner) {
        this.owner = owner;
    }
}
function computeGhostTextViewData(ghostText, textModel, ghostTextClassName) {
    const inlineTexts = [];
    const additionalLines = [];
    function addToAdditionalLines(ghLines, className) {
        if (additionalLines.length > 0) {
            const lastLine = additionalLines[additionalLines.length - 1];
            if (className) {
                lastLine.decorations.push(new LineDecoration(lastLine.content.length + 1, lastLine.content.length + 1 + ghLines[0].line.length, className, 0 /* InlineDecorationType.Regular */));
            }
            lastLine.content += ghLines[0].line;
            ghLines = ghLines.slice(1);
        }
        for (const ghLine of ghLines) {
            additionalLines.push({
                content: ghLine.line,
                decorations: className ? [new LineDecoration(1, ghLine.line.length + 1, className, 0 /* InlineDecorationType.Regular */), ...ghLine.lineDecorations] : [...ghLine.lineDecorations]
            });
        }
    }
    const textBufferLine = textModel.getLineContent(ghostText.lineNumber);
    let hiddenTextStartColumn = undefined;
    let lastIdx = 0;
    for (const part of ghostText.parts) {
        let ghLines = part.lines;
        if (hiddenTextStartColumn === undefined) {
            inlineTexts.push({ column: part.column, text: ghLines[0].line, preview: part.preview, lineDecorations: ghLines[0].lineDecorations });
            ghLines = ghLines.slice(1);
        }
        else {
            addToAdditionalLines([{ line: textBufferLine.substring(lastIdx, part.column - 1), lineDecorations: [] }], undefined);
        }
        if (ghLines.length > 0) {
            addToAdditionalLines(ghLines, ghostTextClassName);
            if (hiddenTextStartColumn === undefined && part.column <= textBufferLine.length) {
                hiddenTextStartColumn = part.column;
            }
        }
        lastIdx = part.column - 1;
    }
    let additionalLinesOriginalSuffix = undefined;
    if (hiddenTextStartColumn !== undefined) {
        additionalLinesOriginalSuffix = new RangeSingleLine(ghostText.lineNumber, new ColumnRange(lastIdx + 1, textBufferLine.length + 1));
    }
    const hiddenRange = hiddenTextStartColumn !== undefined ? new ColumnRange(hiddenTextStartColumn, textBufferLine.length + 1) : undefined;
    return {
        inlineTexts,
        additionalLines,
        hiddenRange,
        additionalLinesOriginalSuffix,
    };
}
class AdditionalLinesData {
    constructor(lineNumber, additionalLines, minReservedLineCount) {
        this.lineNumber = lineNumber;
        this.additionalLines = additionalLines;
        this.minReservedLineCount = minReservedLineCount;
    }
    equals(other) {
        if (this.lineNumber !== other.lineNumber) {
            return false;
        }
        if (this.minReservedLineCount !== other.minReservedLineCount) {
            return false;
        }
        return equals(this.additionalLines, other.additionalLines, thisEqualsC());
    }
}
export class AdditionalLinesWidget extends Disposable {
    get viewZoneId() { return this._viewZoneInfo?.viewZoneId; }
    get viewZoneHeight() { return this._viewZoneHeight; }
    constructor(_editor, _lines, _shouldKeepCursorStable, _isClickable) {
        super();
        this._editor = _editor;
        this._lines = _lines;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._viewZoneHeight = observableValue('viewZoneHeight', undefined);
        this.editorOptionsChanged = observableSignalFromEvent('editorOptionChanged', Event.filter(this._editor.onDidChangeConfiguration, e => e.hasChanged(40 /* EditorOption.disableMonospaceOptimizations */)
            || e.hasChanged(133 /* EditorOption.stopRenderingLineAfter */)
            || e.hasChanged(113 /* EditorOption.renderWhitespace */)
            || e.hasChanged(108 /* EditorOption.renderControlCharacters */)
            || e.hasChanged(60 /* EditorOption.fontLigatures */)
            || e.hasChanged(59 /* EditorOption.fontInfo */)
            || e.hasChanged(75 /* EditorOption.lineHeight */)));
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._viewZoneListener = this._register(new MutableDisposable());
        this.isHovered = observableCodeEditor(this._editor).isTargetHovered(p => isTargetGhostText(p.target.element), this._store);
        this.hasBeenAccepted = false;
        if (this._editor instanceof CodeEditorWidget && this._shouldKeepCursorStable) {
            this._register(this._editor.onBeforeExecuteEdit(e => this.hasBeenAccepted = e.source === 'inlineSuggestion.accept'));
        }
        this._register(autorun(reader => {
            /** @description update view zone */
            const lines = this._lines.read(reader);
            this.editorOptionsChanged.read(reader);
            if (lines) {
                this.hasBeenAccepted = false;
                this.updateLines(lines.lineNumber, lines.additionalLines, lines.minReservedLineCount);
            }
            else {
                this.clear();
            }
        }));
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    clear() {
        this._viewZoneListener.clear();
        this._editor.changeViewZones((changeAccessor) => {
            this.removeActiveViewZone(changeAccessor);
        });
    }
    updateLines(lineNumber, additionalLines, minReservedLineCount) {
        const textModel = this._editor.getModel();
        if (!textModel) {
            return;
        }
        const { tabSize } = textModel.getOptions();
        observableCodeEditor(this._editor).transaction(_ => {
            this._editor.changeViewZones((changeAccessor) => {
                const store = new DisposableStore();
                this.removeActiveViewZone(changeAccessor);
                const heightInLines = Math.max(additionalLines.length, minReservedLineCount);
                if (heightInLines > 0) {
                    const domNode = document.createElement('div');
                    renderLines(domNode, tabSize, additionalLines, this._editor.getOptions(), this._isClickable);
                    if (this._isClickable) {
                        store.add(addDisposableListener(domNode, 'mousedown', (e) => {
                            e.preventDefault(); // This prevents that the editor loses focus
                        }));
                        store.add(addDisposableListener(domNode, 'click', (e) => {
                            if (isTargetGhostText(e.target)) {
                                this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e));
                            }
                        }));
                    }
                    this.addViewZone(changeAccessor, lineNumber, heightInLines, domNode);
                }
                this._viewZoneListener.value = store;
            });
        });
    }
    addViewZone(changeAccessor, afterLineNumber, heightInLines, domNode) {
        const id = changeAccessor.addZone({
            afterLineNumber: afterLineNumber,
            heightInLines: heightInLines,
            domNode,
            afterColumnAffinity: 1 /* PositionAffinity.Right */,
            onComputedHeight: (height) => {
                this._viewZoneHeight.set(height, undefined); // TODO: can a transaction be used to avoid flickering?
            }
        });
        this.keepCursorStable(afterLineNumber, heightInLines);
        this._viewZoneInfo = { viewZoneId: id, heightInLines, lineNumber: afterLineNumber };
    }
    removeActiveViewZone(changeAccessor) {
        if (this._viewZoneInfo) {
            changeAccessor.removeZone(this._viewZoneInfo.viewZoneId);
            if (!this.hasBeenAccepted) {
                this.keepCursorStable(this._viewZoneInfo.lineNumber, -this._viewZoneInfo.heightInLines);
            }
            this._viewZoneInfo = undefined;
            this._viewZoneHeight.set(undefined, undefined);
        }
    }
    keepCursorStable(lineNumber, heightInLines) {
        if (!this._shouldKeepCursorStable) {
            return;
        }
        const cursorLineNumber = this._editor.getSelection()?.getStartPosition()?.lineNumber;
        if (cursorLineNumber !== undefined && lineNumber < cursorLineNumber) {
            this._editor.setScrollTop(this._editor.getScrollTop() + heightInLines * this._editor.getOption(75 /* EditorOption.lineHeight */));
        }
    }
}
function isTargetGhostText(target) {
    return isHTMLElement(target) && target.classList.contains(GHOST_TEXT_CLASS_NAME);
}
export class LineData {
    constructor(content, // Must not contain a linebreak!
    decorations) {
        this.content = content;
        this.decorations = decorations;
    }
    equals(other) {
        if (!this.content.equals(other.content)) {
            return false;
        }
        return LineDecoration.equalsArr(this.decorations, other.decorations);
    }
}
function renderLines(domNode, tabSize, lines, opts, isClickable) {
    const disableMonospaceOptimizations = opts.get(40 /* EditorOption.disableMonospaceOptimizations */);
    const stopRenderingLineAfter = opts.get(133 /* EditorOption.stopRenderingLineAfter */);
    // To avoid visual confusion, we don't want to render visible whitespace
    const renderWhitespace = 'none';
    const renderControlCharacters = opts.get(108 /* EditorOption.renderControlCharacters */);
    const fontLigatures = opts.get(60 /* EditorOption.fontLigatures */);
    const fontInfo = opts.get(59 /* EditorOption.fontInfo */);
    const lineHeight = opts.get(75 /* EditorOption.lineHeight */);
    let classNames = 'suggest-preview-text';
    if (isClickable) {
        classNames += ' clickable';
    }
    const sb = new StringBuilder(10000);
    sb.appendString(`<div class="${classNames}">`);
    for (let i = 0, len = lines.length; i < len; i++) {
        const lineData = lines[i];
        const lineTokens = lineData.content;
        sb.appendString('<div class="view-line');
        sb.appendString('" style="top:');
        sb.appendString(String(i * lineHeight));
        sb.appendString('px;width:1000000px;">');
        const line = lineTokens.getLineContent();
        const isBasicASCII = strings.isBasicASCII(line);
        const containsRTL = strings.containsRTL(line);
        renderViewLine(new RenderLineInput((fontInfo.isMonospace && !disableMonospaceOptimizations), fontInfo.canUseHalfwidthRightwardsArrow, line, false, isBasicASCII, containsRTL, 0, lineTokens, lineData.decorations.slice(), tabSize, 0, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures !== EditorFontLigatures.OFF, null, null, 0), sb);
        sb.appendString('</div>');
    }
    sb.appendString('</div>');
    applyFontInfo(domNode, fontInfo);
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
}
export const ttPolicy = createTrustedTypesPolicy('editorGhostText', { createHTML: value => value });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2hvc3RUZXh0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvZ2hvc3RUZXh0L2dob3N0VGV4dFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFILE9BQU8sRUFBZSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEwsT0FBTyxLQUFLLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUF3QyxNQUFNLCtDQUErQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFx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
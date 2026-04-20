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
import { $, ModifierKeyEmitter, n } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { KeybindingLabel, unthemedKeybindingLabelOptions } from '../../../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, observableFromEvent, observableFromPromise, observableValue } from '../../../../../../../base/common/observable.js';
import { OS } from '../../../../../../../base/common/platform.js';
import { localize } from '../../../../../../../nls.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { editorBackground, editorHoverForeground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { contrastBorder } from '../../../../../../../platform/theme/common/colors/baseColors.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { Point } from '../../../../../../common/core/2d/point.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { StringReplacement } from '../../../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../../../common/core/ranges/offsetRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens, TokenArray } from '../../../../../../common/tokens/lineTokens.js';
import { inlineSuggestCommitAlternativeActionId } from '../../../controller/commandIds.js';
import { InlineEditClickEvent } from '../inlineEditsViewInterface.js';
import { getModifiedBorderColor, getOriginalBorderColor, INLINE_EDITS_BORDER_RADIUS, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorPrimaryBorder, inlineEditIndicatorPrimaryForeground, modifiedChangedTextOverlayColor, observeColor, originalChangedTextOverlayColor } from '../theme.js';
import { getEditorValidOverlayRect, mapOutFalsy, rectToProps } from '../utils/utils.js';
export class WordReplacementsViewData {
    constructor(edit, alternativeAction) {
        this.edit = edit;
        this.alternativeAction = alternativeAction;
    }
    equals(other) {
        return this.edit.equals(other.edit) && this.alternativeAction === other.alternativeAction;
    }
}
const BORDER_WIDTH = 1;
const DOM_ID_OVERLAY = 'word-replacement-view-overlay';
const DOM_ID_WIDGET = 'word-replacement-view-widget';
const DOM_ID_REPLACEMENT = 'word-replacement-view-replacement';
const DOM_ID_RENAME = 'word-replacement-view-rename';
let InlineEditsWordReplacementView = class InlineEditsWordReplacementView extends Disposable {
    static { this.MAX_LENGTH = 100; }
    constructor(_editor, _viewData, _tabAction, _languageService, _themeService, _keybindingService, _hoverService) {
        super();
        this._editor = _editor;
        this._viewData = _viewData;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._start = this._editor.observePosition(constObservable(this._viewData.edit.range.getStartPosition()), this._store);
        this._end = this._editor.observePosition(constObservable(this._viewData.edit.range.getEndPosition()), this._store);
        this._line = document.createElement('div');
        this._primaryElement = observableValue(this, null);
        this._secondaryElement = observableValue(this, null);
        this.isHovered = this._primaryElement.map((e, reader) => e?.didMouseMoveDuringHover.read(reader) ?? false);
        this._renderTextEffect = derived(this, _reader => {
            const tm = this._editor.model.get();
            const origLine = tm.getLineContent(this._viewData.edit.range.startLineNumber);
            const edit = StringReplacement.replace(new OffsetRange(this._viewData.edit.range.startColumn - 1, this._viewData.edit.range.endColumn - 1), this._viewData.edit.text);
            const lineToTokenize = edit.replace(origLine);
            const t = tm.tokenization.tokenizeLinesAt(this._viewData.edit.range.startLineNumber, [lineToTokenize])?.[0];
            let tokens;
            if (t) {
                tokens = TokenArray.fromLineTokens(t).slice(edit.getRangeAfterReplace()).toLineTokens(this._viewData.edit.text, this._languageService.languageIdCodec);
            }
            else {
                tokens = LineTokens.createEmpty(this._viewData.edit.text, this._languageService.languageIdCodec);
            }
            const res = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor.editor).withSetWidth(false).withScrollBeyondLastColumn(0), [], this._line, true);
            this._line.style.width = `${res.minWidthInPx}px`;
        });
        const modifiedLineHeight = this._editor.observeLineHeightForPosition(this._viewData.edit.range.getStartPosition());
        const altCount = observableFromPromise(this._viewData.alternativeAction?.count ?? new Promise(resolve => resolve(undefined))).map(c => c.value);
        const altModifierActive = observableFromEvent(this, ModifierKeyEmitter.getInstance().event, () => ModifierKeyEmitter.getInstance().keyStatus.shiftKey);
        this._layout = derived(this, reader => {
            this._renderTextEffect.read(reader);
            const widgetStart = this._start.read(reader);
            const widgetEnd = this._end.read(reader);
            // TODO@hediet better about widgetStart and widgetEnd in a single transaction!
            if (!widgetStart || !widgetEnd || widgetStart.x > widgetEnd.x || widgetStart.y > widgetEnd.y) {
                return undefined;
            }
            const lineHeight = modifiedLineHeight.read(reader);
            const scrollLeft = this._editor.scrollLeft.read(reader);
            const w = this._editor.getOption(59 /* EditorOption.fontInfo */).read(reader).typicalHalfwidthCharacterWidth;
            const modifiedLeftOffset = 3 * w;
            const modifiedTopOffset = 4;
            const modifiedOffset = new Point(modifiedLeftOffset, modifiedTopOffset);
            let alternativeAction = undefined;
            if (this._viewData.alternativeAction) {
                const label = this._viewData.alternativeAction.label;
                const count = altCount.read(reader);
                const active = altModifierActive.read(reader);
                const occurrencesLabel = count !== undefined ? count === 1 ?
                    localize('labelOccurence', "{0} 1 occurrence", label) :
                    localize('labelOccurences', "{0} {1} occurrences", label, count)
                    : label;
                const keybindingTooltip = localize('shiftToSeeOccurences', "{0} show occurrences", '[shift]');
                alternativeAction = {
                    label: count !== undefined ? (active ? occurrencesLabel : label) : label,
                    tooltip: occurrencesLabel ? `${occurrencesLabel}\n${keybindingTooltip}` : undefined,
                    icon: undefined, //this._viewData.alternativeAction.icon, Do not render icon fo the moment
                    count,
                    keybinding: this._keybindingService.lookupKeybinding(inlineSuggestCommitAlternativeActionId),
                    active: altModifierActive,
                };
            }
            const originalLine = Rect.fromPoints(widgetStart, widgetEnd).withHeight(lineHeight).translateX(-scrollLeft);
            const codeLine = Rect.fromPointSize(originalLine.getLeftBottom().add(modifiedOffset), new Point(this._viewData.edit.text.length * w, originalLine.height));
            const modifiedLine = codeLine.withWidth(codeLine.width + (alternativeAction ? alternativeAction.label.length * w + 8 + 4 + 12 : 0));
            const lowerBackground = modifiedLine.withLeft(originalLine.left);
            // debugView(debugLogRects({ lowerBackground }, this._editor.editor.getContainerDomNode()), reader);
            return {
                alternativeAction,
                originalLine,
                codeLine,
                modifiedLine,
                lowerBackground,
                lineHeight,
            };
        });
        this.minEditorScrollHeight = derived(this, reader => {
            const layout = mapOutFalsy(this._layout).read(reader);
            if (!layout) {
                return 0;
            }
            return layout.read(reader).modifiedLine.bottom + BORDER_WIDTH + this._editor.editor.getScrollTop();
        });
        this._root = n.div({
            class: 'word-replacement',
        }, [
            derived(this, reader => {
                const layout = mapOutFalsy(this._layout).read(reader);
                if (!layout) {
                    return [];
                }
                const originalBorderColor = getOriginalBorderColor(this._tabAction).map(c => asCssVariable(c)).read(reader);
                const modifiedBorderColor = getModifiedBorderColor(this._tabAction).map(c => asCssVariable(c)).read(reader);
                this._line.style.lineHeight = `${layout.read(reader).modifiedLine.height + 2 * BORDER_WIDTH}px`;
                const secondaryElementHovered = constObservable(false); //this._secondaryElement.map((e, r) => e?.isHovered.read(r) ?? false);
                const alternativeAction = layout.map(l => l.alternativeAction);
                const alternativeActionActive = derived(reader => (alternativeAction.read(reader)?.active.read(reader) ?? false) || secondaryElementHovered.read(reader));
                const isHighContrast = observableFromEvent(this._themeService.onDidColorThemeChange, () => {
                    const theme = this._themeService.getColorTheme();
                    return theme.type === 'hcDark' || theme.type === 'hcLight';
                }).read(reader);
                const hcBorderColor = isHighContrast ? observeColor(contrastBorder, this._themeService).read(reader) : null;
                const primaryActiveStyles = {
                    borderColor: hcBorderColor ? hcBorderColor.toString() : modifiedBorderColor,
                    backgroundColor: asCssVariable(modifiedChangedTextOverlayColor),
                    color: '',
                    opacity: '1',
                };
                const secondaryActiveStyles = {
                    borderColor: hcBorderColor ? hcBorderColor.toString() : asCssVariable(inlineEditIndicatorPrimaryBorder),
                    backgroundColor: asCssVariable(inlineEditIndicatorPrimaryBackground),
                    color: asCssVariable(inlineEditIndicatorPrimaryForeground),
                    opacity: '1',
                };
                const passiveStyles = {
                    borderColor: hcBorderColor ? hcBorderColor.toString() : observeColor(editorHoverForeground, this._themeService).map(c => c.transparent(0.2).toString()).read(reader),
                    backgroundColor: asCssVariable(editorBackground),
                    color: '',
                    opacity: '0.7',
                };
                const primaryActionStyles = derived(this, r => alternativeActionActive.read(r) ? primaryActiveStyles : primaryActiveStyles);
                const secondaryActionStyles = derived(this, r => alternativeActionActive.read(r) ? secondaryActiveStyles : passiveStyles);
                // TODO@benibenj clicking the arrow does not accept suggestion anymore
                return [
                    n.div({
                        id: DOM_ID_OVERLAY,
                        style: {
                            position: 'absolute',
                            ...rectToProps((r) => getEditorValidOverlayRect(this._editor).read(r)),
                            overflow: 'hidden',
                            pointerEvents: 'none',
                        }
                    }, [
                        n.div({
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).lowerBackground.withMargin(BORDER_WIDTH, 2 * BORDER_WIDTH, BORDER_WIDTH, 0)),
                                background: asCssVariable(editorBackground),
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                            },
                            onmousedown: (e) => this._mouseDown(e),
                        }),
                        n.div({
                            id: DOM_ID_WIDGET,
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).modifiedLine.withMargin(BORDER_WIDTH, 2 * BORDER_WIDTH)),
                                width: undefined,
                                pointerEvents: 'auto',
                                boxSizing: 'border-box',
                                borderRadius: `${INLINE_EDITS_BORDER_RADIUS}px`,
                                background: asCssVariable(editorBackground),
                                display: 'flex',
                                justifyContent: 'left',
                                outline: `2px solid ${asCssVariable(editorBackground)}`,
                            },
                            onmousedown: (e) => this._mouseDown(e),
                        }, [
                            n.div({
                                id: DOM_ID_REPLACEMENT,
                                style: {
                                    fontFamily: this._editor.getOption(58 /* EditorOption.fontFamily */),
                                    fontSize: this._editor.getOption(61 /* EditorOption.fontSize */),
                                    fontWeight: this._editor.getOption(62 /* EditorOption.fontWeight */),
                                    width: rectToProps(reader => layout.read(reader).codeLine.withMargin(BORDER_WIDTH, 2 * BORDER_WIDTH)).width,
                                    borderRadius: `${INLINE_EDITS_BORDER_RADIUS}px`,
                                    border: primaryActionStyles.map(s => `${BORDER_WIDTH}px solid ${s.borderColor}`),
                                    boxSizing: 'border-box',
                                    padding: `${BORDER_WIDTH}px`,
                                    opacity: primaryActionStyles.map(s => s.opacity),
                                    background: primaryActionStyles.map(s => s.backgroundColor),
                                    display: 'flex',
                                    justifyContent: 'left',
                                    alignItems: 'center',
                                    pointerEvents: 'auto',
                                    cursor: 'pointer',
                                },
                                obsRef: (elem) => {
                                    this._primaryElement.set(elem, undefined);
                                }
                            }, [this._line]),
                            derived(this, reader => {
                                const altAction = alternativeAction.read(reader);
                                if (!altAction) {
                                    return undefined;
                                }
                                const keybinding = document.createElement('div');
                                const keybindingLabel = reader.store.add(new KeybindingLabel(keybinding, OS, { ...unthemedKeybindingLabelOptions, disableTitle: true }));
                                keybindingLabel.set(altAction.keybinding);
                                return n.div({
                                    id: DOM_ID_RENAME,
                                    style: {
                                        position: 'relative',
                                        borderRadius: `${INLINE_EDITS_BORDER_RADIUS}px`,
                                        borderTop: `${BORDER_WIDTH}px solid`,
                                        borderRight: `${BORDER_WIDTH}px solid`,
                                        borderBottom: `${BORDER_WIDTH}px solid`,
                                        borderLeft: `${BORDER_WIDTH}px solid`,
                                        borderColor: secondaryActionStyles.map(s => s.borderColor),
                                        opacity: secondaryActionStyles.map(s => s.opacity),
                                        color: secondaryActionStyles.map(s => s.color),
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: '0 4px 0 1px',
                                        marginLeft: '4px',
                                        background: secondaryActionStyles.map(s => s.backgroundColor),
                                        cursor: 'pointer',
                                        textWrap: 'nowrap',
                                    },
                                    class: 'inline-edit-alternative-action-label',
                                    obsRef: (elem) => {
                                        this._secondaryElement.set(elem, undefined);
                                    },
                                    ref: (elem) => {
                                        if (altAction.tooltip) {
                                            reader.store.add(this._hoverService.setupDelayedHoverAtMouse(elem, { content: altAction.tooltip, appearance: { compact: true } }));
                                        }
                                    }
                                }, [
                                    keybinding,
                                    $('div.inline-edit-alternative-action-label-separator'),
                                    altAction.icon ? renderIcon(altAction.icon) : undefined,
                                    altAction.label,
                                ]);
                            })
                        ]),
                        n.div({
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).originalLine.withMargin(BORDER_WIDTH)),
                                boxSizing: 'border-box',
                                borderRadius: `${INLINE_EDITS_BORDER_RADIUS}px`,
                                border: `${BORDER_WIDTH}px solid ${originalBorderColor}`,
                                background: asCssVariable(originalChangedTextOverlayColor),
                                pointerEvents: 'none',
                            }
                        }, []),
                        n.svg({
                            width: 11,
                            height: 14,
                            viewBox: '0 0 11 14',
                            fill: 'none',
                            style: {
                                position: 'absolute',
                                left: layout.map(l => l.modifiedLine.left - 16),
                                top: layout.map(l => l.modifiedLine.top + Math.round((l.lineHeight - 14 - 5) / 2)),
                                pointerEvents: 'none',
                            },
                            onmousedown: (e) => this._mouseDown(e),
                        }, [
                            n.svgElem('path', {
                                d: 'M1 0C1 2.98966 1 5.92087 1 8.49952C1 9.60409 1.89543 10.5 3 10.5H10.5',
                                stroke: asCssVariable(editorHoverForeground),
                            }),
                            n.svgElem('path', {
                                d: 'M6 7.5L9.99999 10.49998L6 13.5',
                                stroke: asCssVariable(editorHoverForeground),
                            })
                        ]),
                    ])
                ];
            })
        ]).keepUpdated(this._store);
        this._register(this._editor.createOverlayWidget({
            domNode: this._root.element,
            minContentWidthInPx: constObservable(0),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
    _mouseDown(e) {
        const target_id = traverseParentsUntilId(e.target, new Set([DOM_ID_WIDGET, DOM_ID_REPLACEMENT, DOM_ID_RENAME, DOM_ID_OVERLAY]));
        if (!target_id) {
            return;
        }
        e.preventDefault(); // This prevents that the editor loses focus
        this._onDidClick.fire(InlineEditClickEvent.create(e, target_id === DOM_ID_RENAME));
    }
};
InlineEditsWordReplacementView = __decorate([
    __param(3, ILanguageService),
    __param(4, IThemeService),
    __param(5, IKeybindingService),
    __param(6, IHoverService)
], InlineEditsWordReplacementView);
export { InlineEditsWordReplacementView };
function traverseParentsUntilId(element, ids) {
    let current = element;
    while (current) {
        if (ids.has(current.id)) {
            return current.id;
        }
        current = current.parentElement;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNXb3JkUmVwbGFjZW1lbnRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2lubGluZUVkaXRzV29yZFJlcGxhY2VtZW50Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLENBQUMsRUFBMkIsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRTFJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEssT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDdEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ2pHLE9B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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../../base/browser/dom.js';
import { Event } from '../../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, debouncedObservable2, derived, derivedDisposable, observableFromEvent } from '../../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../../common/core/2d/rect.js';
import { Position } from '../../../../../../../common/core/position.js';
import { InlineEditTabAction } from '../../inlineEditsViewInterface.js';
import { getContentSizeOfLines, rectToProps } from '../../utils/utils.js';
import { OffsetRange } from '../../../../../../../common/core/ranges/offsetRange.js';
import { LineRange } from '../../../../../../../common/core/ranges/lineRange.js';
import { HideUnchangedRegionsFeature } from '../../../../../../../browser/widget/diffEditor/features/hideUnchangedRegionsFeature.js';
import { Codicon } from '../../../../../../../../base/common/codicons.js';
import { renderIcon } from '../../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { SymbolKinds } from '../../../../../../../common/languages.js';
import { debugLogHorizontalOffsetRanges, debugLogRects, debugView } from '../debugVisualization.js';
import { distributeFlexBoxLayout } from '../../utils/flexBoxLayout.js';
import { Point } from '../../../../../../../common/core/2d/point.js';
import { IThemeService } from '../../../../../../../../platform/theme/common/themeService.js';
import { IKeybindingService } from '../../../../../../../../platform/keybinding/common/keybinding.js';
import { getEditorBlendedColor, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorSuccessfulBackground, observeColor } from '../../theme.js';
import { asCssVariable, descriptionForeground, editorBackground, editorWidgetBackground } from '../../../../../../../../platform/theme/common/colorRegistry.js';
import { editorWidgetBorder } from '../../../../../../../../platform/theme/common/colors/editorColors.js';
import { LongDistancePreviewEditor } from './longDistancePreviewEditor.js';
import { jumpToNextInlineEditId } from '../../../../controller/commandIds.js';
import { splitIntoContinuousLineRanges, WidgetPlacementContext } from './longDistnaceWidgetPlacement.js';
const BORDER_RADIUS = 6;
const MAX_WIDGET_WIDTH = { EMPTY_SPACE: 425, OVERLAY: 375 };
const MIN_WIDGET_WIDTH = 250;
const DEFAULT_WIDGET_LAYOUT_CONSTANTS = {
    previewEditorMargin: 2,
    widgetPadding: 2,
    widgetBorder: 1,
    lowerBarHeight: 20,
    minWidgetWidth: MIN_WIDGET_WIDTH,
};
let InlineEditsLongDistanceHint = class InlineEditsLongDistanceHint extends Disposable {
    constructor(_editor, _viewState, _previewTextModel, _tabAction, _instantiationService, _themeService, _keybindingService) {
        super();
        this._editor = _editor;
        this._viewState = _viewState;
        this._previewTextModel = _previewTextModel;
        this._tabAction = _tabAction;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this._keybindingService = _keybindingService;
        this.onDidClick = Event.None;
        this._viewWithElement = undefined;
        this._hintTextPosition = derived(this, (reader) => {
            const viewState = this._viewState.read(reader);
            return viewState ? new Position(viewState.hint.lineNumber, Number.MAX_SAFE_INTEGER) : null;
        });
        this._lineSizesAroundHintPosition = derived(this, (reader) => {
            const viewState = this._viewState.read(reader);
            const p = this._hintTextPosition.read(reader);
            if (!viewState || !p) {
                return [];
            }
            const model = this._editorObs.model.read(reader);
            if (!model) {
                return [];
            }
            const range = LineRange.ofLength(p.lineNumber, 1).addMargin(5, 5).intersect(LineRange.ofLength(1, model.getLineCount()));
            if (!range) {
                return [];
            }
            const sizes = getContentSizeOfLines(this._editorObs, range, reader);
            const top = this._editorObs.observeTopForLineNumber(range.startLineNumber).read(reader);
            return splitIntoContinuousLineRanges(range, sizes, top, this._editorObs, reader);
        });
        this._isVisibleDelayed = debouncedObservable2(derived(this, reader => this._viewState.read(reader)?.hint.isVisible), (lastValue, newValue) => lastValue === true && newValue === false ? 200 : 0);
        this._previewEditorLayoutInfo = derived(this, (reader) => {
            const viewState = this._viewState.read(reader);
            if (!viewState || !this._isVisibleDelayed.read(reader)) {
                return undefined;
            }
            const continousLineRanges = this._lineSizesAroundHintPosition.read(reader);
            if (continousLineRanges.length === 0) {
                return undefined;
            }
            const editorScrollTop = this._editorObs.scrollTop.read(reader);
            const editorScrollLeft = this._editorObs.scrollLeft.read(reader);
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const previewContentHeight = this._previewEditor.contentHeight.read(reader);
            const previewEditorContentLayout = this._previewEditor.horizontalContentRangeInPreviewEditorToShow.read(reader);
            if (!previewContentHeight || !previewEditorContentLayout) {
                return undefined;
            }
            // const debugRects = stackSizesDown(new Point(editorLayout.contentLeft, lineSizes.top - scrollTop), lineSizes.sizes);
            const editorTrueContentWidth = editorLayout.contentWidth - editorLayout.verticalScrollbarWidth;
            const editorTrueContentRight = editorLayout.contentLeft + editorTrueContentWidth;
            // drawEditorWidths(this._editor, reader);
            const c = this._editorObs.cursorLineNumber.read(reader);
            if (!c) {
                return undefined;
            }
            const layoutConstants = DEFAULT_WIDGET_LAYOUT_CONSTANTS;
            const extraGutterMarginToAvoidScrollBar = 2;
            const previewEditorHeight = previewContentHeight + extraGutterMarginToAvoidScrollBar;
            // Try to find widget placement in available empty space
            let possibleWidgetOutline;
            let lastPlacementContext;
            const endOfLinePadding = (lineNumber) => lineNumber === viewState.hint.lineNumber ? 40 : 20;
            for (const continousLineRange of continousLineRanges) {
                const placementContext = new WidgetPlacementContext(continousLineRange, editorTrueContentWidth, endOfLinePadding);
                lastPlacementContext = placementContext;
                const showRects = false;
                if (showRects) {
                    const rects2 = stackSizesDown(new Point(editorTrueContentRight, continousLineRange.top - editorScrollTop), placementContext.availableSpaceSizes, 'right');
                    debugView(debugLogRects({ ...rects2 }, this._editor.getDomNode()), reader);
                }
                possibleWidgetOutline = placementContext.tryFindWidgetOutline(viewState.hint.lineNumber, previewEditorHeight, editorTrueContentRight, layoutConstants);
                if (possibleWidgetOutline) {
                    break;
                }
            }
            // Fallback to overlay position if no empty space was found
            let position = 'empty-space';
            if (!possibleWidgetOutline) {
                position = 'overlay';
                const maxAvailableWidth = Math.min(editorLayout.width - editorLayout.contentLeft, MAX_WIDGET_WIDTH.OVERLAY);
                // Create a fallback placement context for computing overlay vertical position
                const fallbackPlacementContext = lastPlacementContext ?? new WidgetPlacementContext(continousLineRanges[0], editorTrueContentWidth, endOfLinePadding);
                possibleWidgetOutline = {
                    horizontalWidgetRange: OffsetRange.ofStartAndLength(editorTrueContentRight - maxAvailableWidth, maxAvailableWidth),
                    verticalWidgetRange: fallbackPlacementContext.getWidgetVerticalOutline(viewState.hint.lineNumber + 2, previewEditorHeight, layoutConstants).delta(10),
                };
            }
            if (!possibleWidgetOutline) {
                return undefined;
            }
            const rectAvailableSpace = Rect.fromRanges(possibleWidgetOutline.horizontalWidgetRange, possibleWidgetOutline.verticalWidgetRange).translateX(-editorScrollLeft).translateY(-editorScrollTop);
            const showAvailableSpace = false;
            if (showAvailableSpace) {
                debugView(debugLogRects({ rectAvailableSpace }, this._editor.getDomNode()), reader);
            }
            const { previewEditorMargin, widgetPadding, widgetBorder, lowerBarHeight } = layoutConstants;
            const maxWidgetWidth = Math.min(position === 'overlay' ? MAX_WIDGET_WIDTH.OVERLAY : MAX_WIDGET_WIDTH.EMPTY_SPACE, previewEditorContentLayout.maxEditorWidth + previewEditorMargin + widgetPadding);
            const layout = distributeFlexBoxLayout(rectAvailableSpace.width, {
                spaceBefore: { min: 0, max: 10, priority: 1 },
                content: { min: 50, rules: [{ max: 150, priority: 2 }, { max: maxWidgetWidth, priority: 1 }] },
                spaceAfter: { min: 10 },
            });
            if (!layout) {
                return null;
            }
            const ranges = lengthsToOffsetRanges([layout.spaceBefore, layout.content, layout.spaceAfter], rectAvailableSpace.left);
            const spaceBeforeRect = rectAvailableSpace.withHorizontalRange(ranges[0]);
            const widgetRect = rectAvailableSpace.withHorizontalRange(ranges[1]);
            const spaceAfterRect = rectAvailableSpace.withHorizontalRange(ranges[2]);
            const showRects2 = false;
            if (showRects2) {
                debugView(debugLogRects({ spaceBeforeRect, widgetRect, spaceAfterRect }, this._editor.getDomNode()), reader);
            }
            const previewEditorRect = widgetRect.withMargin(-widgetPadding - widgetBorder - previewEditorMargin).withMargin(0, 0, -lowerBarHeight, 0);
            const showEditorRect = false;
            if (showEditorRect) {
                debugView(debugLogRects({ previewEditorRect }, this._editor.getDomNode()), reader);
            }
            const previewEditorContentWidth = previewEditorRect.width - previewEditorContentLayout.nonContentWidth;
            const maxPrefferedRangeLength = previewEditorContentWidth * 0.8;
            const preferredRangeToReveal = previewEditorContentLayout.preferredRangeToReveal.intersect(OffsetRange.ofStartAndLength(previewEditorContentLayout.preferredRangeToReveal.start, maxPrefferedRangeLength)) ?? previewEditorContentLayout.preferredRangeToReveal;
            const desiredPreviewEditorScrollLeft = scrollToReveal(previewEditorContentLayout.indentationEnd, previewEditorContentWidth, preferredRangeToReveal);
            return {
                codeEditorSize: previewEditorRect.getSize(),
                codeScrollLeft: editorScrollLeft,
                contentLeft: editorLayout.contentLeft,
                widgetRect,
                previewEditorMargin,
                widgetPadding,
                widgetBorder,
                lowerBarHeight,
                desiredPreviewEditorScrollLeft: desiredPreviewEditorScrollLeft.newScrollPosition,
            };
        });
        this._view = n.div({
            class: 'inline-edits-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                display: derived(this, reader => !!this._previewEditorLayoutInfo.read(reader) ? 'block' : 'none'),
            },
        }, [
            derived(this, _reader => [this._widgetContent]),
        ]);
        this._widgetContent = derived(this, reader => // TODO@hediet: remove when n.div lazily creates previewEditor.element node
         n.div({
            class: 'inline-edits-long-distance-hint-widget',
            style: {
                position: 'absolute',
                overflow: 'hidden',
                cursor: 'pointer',
                background: asCssVariable(editorWidgetBackground),
                padding: this._previewEditorLayoutInfo.map(i => i?.widgetPadding),
                boxSizing: 'border-box',
                borderRadius: BORDER_RADIUS,
                border: derived(reader => `${this._previewEditorLayoutInfo.read(reader)?.widgetBorder}px solid ${this._styles.read(reader).border}`),
                display: 'flex',
                flexDirection: 'column',
                opacity: derived(reader => this._viewState.read(reader)?.hint.isVisible ? '1' : '0'),
                transition: 'opacity 200ms ease-in-out',
                ...rectToProps(reader => this._previewEditorLayoutInfo.read(reader)?.widgetRect)
            },
            onmousedown: e => {
                e.preventDefault(); // This prevents that the editor loses focus
            },
            onclick: () => {
                this._viewState.read(undefined)?.model.jump();
            }
        }, [
            n.div({
                class: ['editorContainer'],
                style: {
                    overflow: 'hidden',
                    padding: this._previewEditorLayoutInfo.map(i => i?.previewEditorMargin),
                    background: asCssVariable(editorBackground),
                    pointerEvents: 'none',
                },
            }, [
                derived(this, r => this._previewEditor.element), // --
            ]),
            n.div({ class: 'bar', style: { color: asCssVariable(descriptionForeground), pointerEvents: 'none', margin: '0 4px', height: this._previewEditorLayoutInfo.map(i => i?.lowerBarHeight), display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                derived(this, reader => {
                    const children = [];
                    const viewState = this._viewState.read(reader);
                    if (!viewState) {
                        return children;
                    }
                    // Outline Element
                    const source = this._originalOutlineSource.read(reader);
                    const originalTargetLineNumber = this._originalTargetLineNumber.read(reader);
                    const outlineItems = source?.getAt(originalTargetLineNumber, reader).slice(0, 1) ?? [];
                    const outlineElements = [];
                    if (outlineItems.length > 0) {
                        for (let i = 0; i < outlineItems.length; i++) {
                            const item = outlineItems[i];
                            const icon = SymbolKinds.toIcon(item.kind);
                            outlineElements.push(n.div({
                                class: 'breadcrumb-item',
                                style: { display: 'flex', alignItems: 'center', flex: '1 1 auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                            }, [
                                renderIcon(icon),
                                '\u00a0',
                                item.name,
                                ...(i === outlineItems.length - 1
                                    ? []
                                    : [renderIcon(Codicon.chevronRight)])
                            ]));
                        }
                    }
                    children.push(n.div({ class: 'outline-elements', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, outlineElements));
                    // Show Edit Direction
                    const arrowIcon = viewState.hint.lineNumber < originalTargetLineNumber ? Codicon.arrowDown : Codicon.arrowUp;
                    const keybinding = this._keybindingService.lookupKeybinding(jumpToNextInlineEditId);
                    let label = 'Go to suggestion';
                    if (keybinding && keybinding.getLabel() === 'Tab') {
                        label = 'Tab to jump';
                    }
                    children.push(n.div({
                        class: 'go-to-label',
                        style: { position: 'relative', display: 'flex', alignItems: 'center', flex: '0 0 auto', paddingLeft: '6px' },
                    }, [
                        label,
                        '\u00a0',
                        renderIcon(arrowIcon),
                    ]));
                    return children;
                })
            ]),
        ]));
        // Drives breadcrumbs and symbol icon
        this._originalTargetLineNumber = derived(this, (reader) => {
            const viewState = this._viewState.read(reader);
            if (!viewState) {
                return -1;
            }
            if (viewState.edit.action?.kind === 'jumpTo') {
                return viewState.edit.action.position.lineNumber;
            }
            return viewState.diff[0]?.original.startLineNumber ?? -1;
        });
        this._originalOutlineSource = derivedDisposable(this, (reader) => {
            const m = this._editorObs.model.read(reader);
            const factory = HideUnchangedRegionsFeature._breadcrumbsSourceFactory.read(reader);
            return (!m || !factory) ? undefined : factory(m, this._instantiationService);
        });
        this._styles = derived(reader => {
            const v = this._tabAction.read(reader);
            // Check theme type by observing a color - this ensures we react to theme changes
            const widgetBorderColor = observeColor(editorWidgetBorder, this._themeService).read(reader);
            const isHighContrast = observableFromEvent(this._themeService.onDidColorThemeChange, () => {
                const theme = this._themeService.getColorTheme();
                return theme.type === 'hcDark' || theme.type === 'hcLight';
            }).read(reader);
            let borderColor;
            if (isHighContrast) {
                // Use editorWidgetBorder in high contrast mode for better visibility
                borderColor = widgetBorderColor;
            }
            else {
                let border;
                switch (v) {
                    case InlineEditTabAction.Inactive:
                        border = inlineEditIndicatorSecondaryBackground;
                        break;
                    case InlineEditTabAction.Jump:
                        border = inlineEditIndicatorPrimaryBackground;
                        break;
                    case InlineEditTabAction.Accept:
                        border = inlineEditIndicatorSuccessfulBackground;
                        break;
                }
                borderColor = getEditorBlendedColor(border, this._themeService).read(reader);
            }
            return {
                border: borderColor.toString(),
                background: asCssVariable(editorBackground)
            };
        });
        this._editorObs = observableCodeEditor(this._editor);
        this._previewEditor = this._register(this._instantiationService.createInstance(LongDistancePreviewEditor, this._previewTextModel, derived(reader => {
            const viewState = this._viewState.read(reader);
            if (!viewState) {
                return undefined;
            }
            return {
                diff: viewState.diff,
                model: viewState.model,
                inlineSuggestInfo: viewState.inlineSuggestInfo,
                nextCursorPosition: viewState.nextCursorPosition,
            };
        }), this._editor, this._tabAction));
        this._viewWithElement = this._view.keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._viewWithElement.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._widgetContent.get().keepUpdated(this._store);
        this._register(autorun(reader => {
            const layoutInfo = this._previewEditorLayoutInfo.read(reader);
            if (!layoutInfo) {
                return;
            }
            this._previewEditor.layout(layoutInfo.codeEditorSize.toDimension(), layoutInfo.desiredPreviewEditorScrollLeft);
        }));
        this._isVisibleDelayed.recomputeInitiallyAndOnChange(this._store);
    }
    get isHovered() { return this._widgetContent.get().didMouseMoveDuringHover; }
};
InlineEditsLongDistanceHint = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IKeybindingService)
], InlineEditsLongDistanceHint);
export { InlineEditsLongDistanceHint };
function lengthsToOffsetRanges(lengths, initialOffset = 0) {
    const result = [];
    let offset = initialOffset;
    for (const length of lengths) {
        result.push(new OffsetRange(offset, offset + length));
        offset += length;
    }
    return result;
}
function stackSizesDown(at, sizes, alignment = 'left') {
    const rects = [];
    let offset = 0;
    for (const s of sizes) {
        rects.push(Rect.fromLeftTopWidthHeight(at.x + (alignment === 'left' ? 0 : -s.width), at.y + offset, s.width, s.height));
        offset += s.height;
    }
    return rects;
}
export function drawEditorWidths(e, reader) {
    const layoutInfo = e.getLayoutInfo();
    const contentLeft = new OffsetRange(0, layoutInfo.contentLeft);
    const trueContent = OffsetRange.ofStartAndLength(layoutInfo.contentLeft, layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth);
    const minimap = OffsetRange.ofStartAndLength(trueContent.endExclusive, layoutInfo.minimap.minimapWidth);
    const verticalScrollbar = OffsetRange.ofStartAndLength(minimap.endExclusive, layoutInfo.verticalScrollbarWidth);
    const r = new OffsetRange(0, 200);
    debugView(debugLogHorizontalOffsetRanges({
        contentLeft: Rect.fromRanges(contentLeft, r),
        trueContent: Rect.fromRanges(trueContent, r),
        minimap: Rect.fromRanges(minimap, r),
        verticalScrollbar: Rect.fromRanges(verticalScrollbar, r),
    }, e.getDomNode()), reader);
}
/**
 * Changes the scroll position as little as possible just to reveal the given range in the window.
*/
export function scrollToReveal(currentScrollPosition, windowWidth, contentRangeToReveal) {
    const visibleRange = new OffsetRange(currentScrollPosition, currentScrollPosition + windowWidth);
    if (visibleRange.containsRange(contentRangeToReveal)) {
        return { newScrollPosition: currentScrollPosition };
    }
    if (contentRangeToReveal.length > windowWidth) {
        return { newScrollPosition: contentRangeToReveal.start };
    }
    if (contentRangeToReveal.endExclusive > visibleRange.endExclusive) {
        return { newScrollPosition: contentRangeToReveal.endExclusive - windowWidth };
    }
    if (contentRangeToReveal.start < visibleRange.start) {
        return { newScrollPosition: contentRangeToReveal.start };
    }
    return { newScrollPosition: currentScrollPosition };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNMb25nRGlzdGFuY2VIaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2xvbmdEaXN0YW5jZUhpbnQvaW5saW5lRWRpdHNMb25nRGlzdGFuY2VIaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBYSxDQUFDLEVBQXlDLE1BQU0sNkNBQTZDLENBQUM7QUFDbEgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM5RSxPQUFPLEVBQXdCLE9BQU8sRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUwsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFFL0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV4RSxPQUFPLEVBQW9CLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDakYsT0FBTyxFQUFF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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
/**
 * This view part is responsible for rendering the content widgets, which are
 * used for rendering elements that are associated to an editor position,
 * such as suggestions or the parameter hints.
 */
export class ViewContentWidgets extends ViewPart {
    constructor(context, viewDomNode) {
        super(context);
        this._viewDomNode = viewDomNode;
        this._widgets = {};
        this.domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.domNode, 1 /* PartFingerprint.ContentWidgets */);
        this.domNode.setClassName('contentWidgets');
        this.domNode.setPosition('absolute');
        this.domNode.setTop(0);
        this.overflowingContentWidgetsDomNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.overflowingContentWidgetsDomNode, 2 /* PartFingerprint.OverflowingContentWidgets */);
        this.overflowingContentWidgetsDomNode.setClassName('overflowingContentWidgets');
    }
    dispose() {
        super.dispose();
        this._widgets = {};
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].onConfigurationChanged(e);
        }
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLineMappingChanged(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesChanged(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesDeleted(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesInserted(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // ---- end view event handlers
    _updateAnchorsViewPositions() {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].updateAnchorViewPosition();
        }
    }
    addWidget(_widget) {
        const myWidget = new Widget(this._context, this._viewDomNode, _widget);
        this._widgets[myWidget.id] = myWidget;
        if (myWidget.allowEditorOverflow) {
            this.overflowingContentWidgetsDomNode.appendChild(myWidget.domNode);
        }
        else {
            this.domNode.appendChild(myWidget.domNode);
        }
        this.setShouldRender();
    }
    setWidgetPosition(widget, primaryAnchor, secondaryAnchor, preference, affinity) {
        const myWidget = this._widgets[widget.getId()];
        myWidget.setPosition(primaryAnchor, secondaryAnchor, preference, affinity);
        if (!myWidget.useDisplayNone) {
            this.setShouldRender();
        }
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets.hasOwnProperty(widgetId)) {
            const myWidget = this._widgets[widgetId];
            delete this._widgets[widgetId];
            const domNode = myWidget.domNode.domNode;
            domNode.remove();
            domNode.removeAttribute('monaco-visible-content-widget');
            this.setShouldRender();
        }
    }
    shouldSuppressMouseDownOnWidget(widgetId) {
        if (this._widgets.hasOwnProperty(widgetId)) {
            return this._widgets[widgetId].suppressMouseDown;
        }
        return false;
    }
    onBeforeRender(viewportData) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].onBeforeRender(viewportData);
        }
    }
    prepareRender(ctx) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].prepareRender(ctx);
        }
    }
    render(ctx) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].render(ctx);
        }
    }
}
class Widget {
    constructor(context, viewDomNode, actual) {
        this._primaryAnchor = new PositionPair(null, null);
        this._secondaryAnchor = new PositionPair(null, null);
        this._context = context;
        this._viewDomNode = viewDomNode;
        this._actual = actual;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(165 /* EditorOption.layoutInfo */);
        const allowOverflow = options.get(4 /* EditorOption.allowOverflow */);
        this.domNode = createFastDomNode(this._actual.getDomNode());
        this.id = this._actual.getId();
        this.allowEditorOverflow = (this._actual.allowEditorOverflow || false) && allowOverflow;
        this.suppressMouseDown = this._actual.suppressMouseDown || false;
        this.useDisplayNone = this._actual.useDisplayNone || false;
        this._fixedOverflowWidgets = options.get(51 /* EditorOption.fixedOverflowWidgets */);
        this._contentWidth = layoutInfo.contentWidth;
        this._contentLeft = layoutInfo.contentLeft;
        this._affinity = null;
        this._preference = [];
        this._cachedDomNodeOffsetWidth = -1;
        this._cachedDomNodeOffsetHeight = -1;
        this._maxWidth = this._getMaxWidth();
        this._isVisible = false;
        this._renderData = null;
        this.domNode.setPosition((this._fixedOverflowWidgets && this.allowEditorOverflow) ? 'fixed' : 'absolute');
        this.domNode.setDisplay('none');
        this.domNode.setVisibility('hidden');
        this.domNode.setAttribute('widgetId', this.id);
        this.domNode.setMaxWidth(this._maxWidth);
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        if (e.hasChanged(165 /* EditorOption.layoutInfo */)) {
            const layoutInfo = options.get(165 /* EditorOption.layoutInfo */);
            this._contentLeft = layoutInfo.contentLeft;
            this._contentWidth = layoutInfo.contentWidth;
            this._maxWidth = this._getMaxWidth();
        }
    }
    updateAnchorViewPosition() {
        this._setPosition(this._affinity, this._primaryAnchor.modelPosition, this._secondaryAnchor.modelPosition);
    }
    _setPosition(affinity, primaryAnchor, secondaryAnchor) {
        this._affinity = affinity;
        this._primaryAnchor = getValidPositionPair(primaryAnchor, this._context.viewModel, this._affinity);
        this._secondaryAnchor = getValidPositionPair(secondaryAnchor, this._context.viewModel, this._affinity);
        function getValidPositionPair(position, viewModel, affinity) {
            if (!position) {
                return new PositionPair(null, null);
            }
            // Do not trust that widgets give a valid position
            const validModelPosition = viewModel.model.validatePosition(position);
            if (viewModel.coordinatesConverter.modelPositionIsVisible(validModelPosition)) {
                const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(validModelPosition, affinity ?? undefined);
                return new PositionPair(position, viewPosition);
            }
            return new PositionPair(position, null);
        }
    }
    _getMaxWidth() {
        const elDocument = this.domNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        return (this.allowEditorOverflow
            ? elWindow?.innerWidth || elDocument.documentElement.offsetWidth || elDocument.body.offsetWidth
            : this._contentWidth);
    }
    setPosition(primaryAnchor, secondaryAnchor, preference, affinity) {
        this._setPosition(affinity, primaryAnchor, secondaryAnchor);
        this._preference = preference;
        if (!this.useDisplayNone && this._primaryAnchor.viewPosition && this._preference && this._preference.length > 0) {
            // this content widget would like to be visible if possible
            // we change it from `display:none` to `display:block` even if it
            // might be outside the viewport such that we can measure its size
            // in `prepareRender`
            this.domNode.setDisplay('block');
        }
        else {
            this.domNode.setDisplay('none');
        }
        this._cachedDomNodeOffsetWidth = -1;
        this._cachedDomNodeOffsetHeight = -1;
    }
    _layoutBoxInViewport(anchor, width, height, ctx) {
        // Our visible box is split horizontally by the current line => 2 boxes
        // a) the box above the line
        const aboveLineTop = anchor.top;
        const heightAvailableAboveLine = aboveLineTop;
        // b) the box under the line
        const underLineTop = anchor.top + anchor.height;
        const heightAvailableUnderLine = ctx.viewportHeight - underLineTop;
        const aboveTop = aboveLineTop - height;
        const fitsAbove = (heightAvailableAboveLine >= height);
        const belowTop = underLineTop;
        const fitsBelow = (heightAvailableUnderLine >= height);
        // And its left
        let left = anchor.left;
        if (left + width > ctx.scrollLeft + ctx.viewportWidth) {
            left = ctx.scrollLeft + ctx.viewportWidth - width;
        }
        if (left < ctx.scrollLeft) {
            left = ctx.scrollLeft;
        }
        return { fitsAbove, aboveTop, fitsBelow, belowTop, left };
    }
    _layoutHorizontalSegmentInPage(windowSize, domNodePosition, left, width) {
        // Leave some clearance to the left/right
        const LEFT_PADDING = 15;
        const RIGHT_PADDING = 15;
        // Initially, the limits are defined as the dom node limits
        const MIN_LIMIT = Math.max(LEFT_PADDING, domNodePosition.left - width);
        const MAX_LIMIT = Math.min(domNodePosition.left + domNodePosition.width + width, windowSize.width - RIGHT_PADDING);
        const elDocument = this._viewDomNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        let absoluteLeft = domNodePosition.left + left - (elWindow?.scrollX ?? 0);
        if (absoluteLeft + width > MAX_LIMIT) {
            const delta = absoluteLeft - (MAX_LIMIT - width);
            absoluteLeft -= delta;
            left -= delta;
        }
        if (absoluteLeft < MIN_LIMIT) {
            const delta = absoluteLeft - MIN_LIMIT;
            absoluteLeft -= delta;
            left -= delta;
        }
        return [left, absoluteLeft];
    }
    _layoutBoxInPage(anchor, width, height, ctx) {
        const aboveTop = anchor.top - height;
        const belowTop = anchor.top + anchor.height;
        const domNodePosition = dom.getDomNodePagePosition(this._viewDomNode.domNode);
        const elDocument = this._viewDomNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        const absoluteAboveTop = domNodePosition.top + aboveTop - (elWindow?.scrollY ?? 0);
        const absoluteBelowTop = domNodePosition.top + belowTop - (elWindow?.scrollY ?? 0);
        const windowSize = dom.getClientArea(elDocument.body);
        const [left, absoluteAboveLeft] = this._layoutHorizontalSegmentInPage(windowSize, domNodePosition, anchor.left - ctx.scrollLeft + this._contentLeft, width);
        // Leave some clearance to the top/bottom
        const TOP_PADDING = 22;
        const BOTTOM_PADDING = 22;
        const fitsAbove = (absoluteAboveTop >= TOP_PADDING);
        const fitsBelow = (absoluteBelowTop + height <= windowSize.height - BOTTOM_PADDING);
        if (this._fixedOverflowWidgets) {
            return {
                fitsAbove,
                aboveTop: Math.max(absoluteAboveTop, TOP_PADDING),
                fitsBelow,
                belowTop: absoluteBelowTop,
                left: absoluteAboveLeft
            };
        }
        return { fitsAbove, aboveTop, fitsBelow, belowTop, left };
    }
    _prepareRenderWidgetAtExactPositionOverflowing(topLeft) {
        return new Coordinate(topLeft.top, topLeft.left + this._contentLeft);
    }
    /**
     * Compute the coordinates above and below the primary and secondary anchors.
     * The content widget *must* touch the primary anchor.
     * The content widget should touch if possible the secondary anchor.
     */
    _getAnchorsCoordinates(ctx) {
        const primary = getCoordinates(this._primaryAnchor.viewPosition, this._affinity);
        const secondaryViewPosition = (this._secondaryAnchor.viewPosition?.lineNumber === this._primaryAnchor.viewPosition?.lineNumber ? this._secondaryAnchor.viewPosition : null);
        const secondary = getCoordinates(secondaryViewPosition, this._affinity);
        return { primary, secondary };
        function getCoordinates(position, affinity) {
            if (!position) {
                return null;
            }
            const horizontalPosition = ctx.visibleRangeForPosition(position);
            if (!horizontalPosition) {
                return null;
            }
            // Left-align widgets that should appear :before content
            const left = (position.column === 1 && affinity === 3 /* PositionAffinity.LeftOfInjectedText */ ? 0 : horizontalPosition.left);
            const top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.scrollTop;
            const lineHeight = ctx.getLineHeightForLineNumber(position.lineNumber);
            return new AnchorCoordinate(top, left, lineHeight);
        }
    }
    _reduceAnchorCoordinates(primary, secondary, width) {
        if (!secondary) {
            return primary;
        }
        const fontInfo = this._context.configuration.options.get(59 /* EditorOption.fontInfo */);
        let left = secondary.left;
        if (left < primary.left) {
            left = Math.max(left, primary.left - width + fontInfo.typicalFullwidthCharacterWidth);
        }
        else {
            left = Math.min(left, primary.left + width - fontInfo.typicalFullwidthCharacterWidth);
        }
        return new AnchorCoordinate(primary.top, left, primary.height);
    }
    _prepareRenderWidget(ctx) {
        if (!this._preference || this._preference.length === 0) {
            return null;
        }
        const { primary, secondary } = this._getAnchorsCoordinates(ctx);
        if (!primary) {
            return {
                kind: 'offViewport',
                preserveFocus: this.domNode.domNode.contains(this.domNode.domNode.ownerDocument.activeElement)
            };
            // return null;
        }
        if (this._cachedDomNodeOffsetWidth === -1 || this._cachedDomNodeOffsetHeight === -1) {
            let preferredDimensions = null;
            if (typeof this._actual.beforeRender === 'function') {
                preferredDimensions = safeInvoke(this._actual.beforeRender, this._actual);
            }
            if (preferredDimensions) {
                this._cachedDomNodeOffsetWidth = preferredDimensions.width;
                this._cachedDomNodeOffsetHeight = preferredDimensions.height;
            }
            else {
                const domNode = this.domNode.domNode;
                const clientRect = domNode.getBoundingClientRect();
                this._cachedDomNodeOffsetWidth = Math.round(clientRect.width);
                this._cachedDomNodeOffsetHeight = Math.round(clientRect.height);
            }
        }
        const anchor = this._reduceAnchorCoordinates(primary, secondary, this._cachedDomNodeOffsetWidth);
        let placement;
        if (this.allowEditorOverflow) {
            placement = this._layoutBoxInPage(anchor, this._cachedDomNodeOffsetWidth, this._cachedDomNodeOffsetHeight, ctx);
        }
        else {
            placement = this._layoutBoxInViewport(anchor, this._cachedDomNodeOffsetWidth, this._cachedDomNodeOffsetHeight, ctx);
        }
        // Do two passes, first for perfect fit, second picks first option
        for (let pass = 1; pass <= 2; pass++) {
            for (const pref of this._preference) {
                // placement
                if (pref === 1 /* ContentWidgetPositionPreference.ABOVE */) {
                    if (!placement) {
                        // Widget outside of viewport
                        return null;
                    }
                    if (pass === 2 || placement.fitsAbove) {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(placement.aboveTop, placement.left),
                            position: 1 /* ContentWidgetPositionPreference.ABOVE */
                        };
                    }
                }
                else if (pref === 2 /* ContentWidgetPositionPreference.BELOW */) {
                    if (!placement) {
                        // Widget outside of viewport
                        return null;
                    }
                    if (pass === 2 || placement.fitsBelow) {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(placement.belowTop, placement.left),
                            position: 2 /* ContentWidgetPositionPreference.BELOW */
                        };
                    }
                }
                else {
                    if (this.allowEditorOverflow) {
                        return {
                            kind: 'inViewport',
                            coordinate: this._prepareRenderWidgetAtExactPositionOverflowing(new Coordinate(anchor.top, anchor.left)),
                            position: 0 /* ContentWidgetPositionPreference.EXACT */
                        };
                    }
                    else {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(anchor.top, anchor.left),
                            position: 0 /* ContentWidgetPositionPreference.EXACT */
                        };
                    }
                }
            }
        }
        return null;
    }
    /**
     * On this first pass, we ensure that the content widget (if it is in the viewport) has the max width set correctly.
     */
    onBeforeRender(viewportData) {
        if (!this._primaryAnchor.viewPosition || !this._preference) {
            return;
        }
        if (this._primaryAnchor.viewPosition.lineNumber < viewportData.startLineNumber || this._primaryAnchor.viewPosition.lineNumber > viewportData.endLineNumber) {
            // Outside of viewport
            return;
        }
        this.domNode.setMaxWidth(this._maxWidth);
    }
    prepareRender(ctx) {
        this._renderData = this._prepareRenderWidget(ctx);
    }
    render(ctx) {
        if (!this._renderData || this._renderData.kind === 'offViewport') {
            // This widget should be invisible
            if (this._isVisible) {
                this.domNode.removeAttribute('monaco-visible-content-widget');
                this._isVisible = false;
                if (this._renderData?.kind === 'offViewport' && this._renderData.preserveFocus) {
                    // widget wants to be shown, but it is outside of the viewport and it
                    // has focus which we need to preserve
                    this.domNode.setTop(-1000);
                }
                else {
                    this.domNode.setVisibility('hidden');
                }
            }
            if (typeof this._actual.afterRender === 'function') {
                safeInvoke(this._actual.afterRender, this._actual, null, null);
            }
            return;
        }
        // This widget should be visible
        if (this.allowEditorOverflow) {
            this.domNode.setTop(this._renderData.coordinate.top);
            this.domNode.setLeft(this._renderData.coordinate.left);
        }
        else {
            this.domNode.setTop(this._renderData.coordinate.top + ctx.scrollTop - ctx.bigNumbersDelta);
            this.domNode.setLeft(this._renderData.coordinate.left);
        }
        if (!this._isVisible) {
            this.domNode.setVisibility('inherit');
            this.domNode.setAttribute('monaco-visible-content-widget', 'true');
            this._isVisible = true;
        }
        if (typeof this._actual.afterRender === 'function') {
            safeInvoke(this._actual.afterRender, this._actual, this._renderData.position, this._renderData.coordinate);
        }
    }
}
class PositionPair {
    constructor(modelPosition, viewPosition) {
        this.modelPosition = modelPosition;
        this.viewPosition = viewPosition;
    }
}
class Coordinate {
    constructor(top, left) {
        this.top = top;
        this.left = left;
        this._coordinateBrand = undefined;
    }
}
class AnchorCoordinate {
    constructor(top, left, height) {
        this.top = top;
        this.left = left;
        this.height = height;
        this._anchorCoordinateBrand = undefined;
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeInvoke(fn, thisArg, ...args) {
    try {
        return fn.call(thisArg, ...args);
    }
    catch {
        // ignore
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudFdpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2NvbnRlbnRXaWRnZXRzL2NvbnRlbnRXaWRnZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFekYsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQVdyRjs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFFBQVE7SUFRL0MsWUFBWSxPQUFvQixFQUFFLFdBQXFDO1FBQ3RFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBRW5CLElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyx5Q0FBaUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXZCLElBQUksQ0FBQyxnQ0FBZ0MsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDekYsZ0JBQWdC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
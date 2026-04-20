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
import * as dom from '../../base/browser/dom.js';
import { createFastDomNode } from '../../base/browser/fastDomNode.js';
import { inputLatency } from '../../base/browser/performance.js';
import { BugIndicatingError, onUnexpectedError } from '../../base/common/errors.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { PointerHandlerLastRenderData } from './controller/mouseTarget.js';
import { PointerHandler } from './controller/pointerHandler.js';
import { RenderingContext } from './view/renderingContext.js';
import { ViewController } from './view/viewController.js';
import { ContentViewOverlays, MarginViewOverlays } from './view/viewOverlays.js';
import { PartFingerprints } from './view/viewPart.js';
import { ViewUserInputEvents } from './view/viewUserInputEvents.js';
import { BlockDecorations } from './viewParts/blockDecorations/blockDecorations.js';
import { ViewContentWidgets } from './viewParts/contentWidgets/contentWidgets.js';
import { CurrentLineHighlightOverlay, CurrentLineMarginHighlightOverlay } from './viewParts/currentLineHighlight/currentLineHighlight.js';
import { DecorationsOverlay } from './viewParts/decorations/decorations.js';
import { EditorScrollbar } from './viewParts/editorScrollbar/editorScrollbar.js';
import { GlyphMarginWidgets } from './viewParts/glyphMargin/glyphMargin.js';
import { IndentGuidesOverlay } from './viewParts/indentGuides/indentGuides.js';
import { LineNumbersOverlay } from './viewParts/lineNumbers/lineNumbers.js';
import { ViewLines } from './viewParts/viewLines/viewLines.js';
import { LinesDecorationsOverlay } from './viewParts/linesDecorations/linesDecorations.js';
import { Margin } from './viewParts/margin/margin.js';
import { MarginViewLineDecorationsOverlay } from './viewParts/marginDecorations/marginDecorations.js';
import { Minimap } from './viewParts/minimap/minimap.js';
import { ViewOverlayWidgets } from './viewParts/overlayWidgets/overlayWidgets.js';
import { DecorationsOverviewRuler } from './viewParts/overviewRuler/decorationsOverviewRuler.js';
import { OverviewRuler } from './viewParts/overviewRuler/overviewRuler.js';
import { Rulers } from './viewParts/rulers/rulers.js';
import { ScrollDecorationViewPart } from './viewParts/scrollDecoration/scrollDecoration.js';
import { SelectionsOverlay } from './viewParts/selections/selections.js';
import { ViewCursors } from './viewParts/viewCursors/viewCursors.js';
import { ViewZones } from './viewParts/viewZones/viewZones.js';
import { WhitespaceOverlay } from './viewParts/whitespace/whitespace.js';
import { Position } from '../common/core/position.js';
import { Range } from '../common/core/range.js';
import { Selection } from '../common/core/selection.js';
import { GlyphMarginLane } from '../common/model.js';
import { ViewEventHandler } from '../common/viewEventHandler.js';
import { ViewportData } from '../common/viewLayout/viewLinesViewportData.js';
import { ViewContext } from '../common/viewModel/viewContext.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { getThemeTypeSelector } from '../../platform/theme/common/themeService.js';
import { ViewGpuContext } from './gpu/viewGpuContext.js';
import { ViewLinesGpu } from './viewParts/viewLinesGpu/viewLinesGpu.js';
import { TextAreaEditContext } from './controller/editContext/textArea/textAreaEditContext.js';
import { NativeEditContext } from './controller/editContext/native/nativeEditContext.js';
import { RulersGpu } from './viewParts/rulersGpu/rulersGpu.js';
import { GpuMarkOverlay } from './viewParts/gpuMark/gpuMark.js';
import { Emitter } from '../../base/common/event.js';
let View = class View extends ViewEventHandler {
    constructor(editorContainer, ownerID, commandDelegate, configuration, colorTheme, model, userInputEvents, overflowWidgetsDomNode, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        // Actual mutable state
        this._shouldRecomputeGlyphMarginLanes = false;
        this._ownerID = ownerID;
        this._widgetFocusTracker = this._register(new CodeEditorWidgetFocusTracker(editorContainer, overflowWidgetsDomNode));
        this._register(this._widgetFocusTracker.onChange(() => {
            this._context.viewModel.setHasWidgetFocus(this._widgetFocusTracker.hasFocus());
        }));
        this._selections = [new Selection(1, 1, 1, 1)];
        this._renderAnimationFrame = null;
        this._overflowGuardContainer = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._overflowGuardContainer, 3 /* PartFingerprint.OverflowGuard */);
        this._overflowGuardContainer.setClassName('overflow-guard');
        this._viewController = new ViewController(configuration, model, userInputEvents, commandDelegate);
        // The view context is passed on to most classes (basically to reduce param. counts in ctors)
        this._context = new ViewContext(configuration, colorTheme, model);
        // Ensure the view is the first event handler in order to update the layout
        this._context.addEventHandler(this);
        this._viewParts = [];
        // Keyboard handler
        this._editContextEnabled = this._context.configuration.options.get(170 /* EditorOption.effectiveEditContext */);
        this._accessibilitySupport = this._context.configuration.options.get(2 /* EditorOption.accessibilitySupport */);
        this._editContext = this._instantiateEditContext();
        this._viewParts.push(this._editContext);
        // These two dom nodes must be constructed up front, since references are needed in the layout provider (scrolling & co.)
        this._linesContent = createFastDomNode(document.createElement('div'));
        this._linesContent.setClassName('lines-content' + ' monaco-editor-background');
        this._linesContent.setPosition('absolute');
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName(this._getEditorClassName());
        // Set role 'code' for better screen reader support https://github.com/microsoft/vscode/issues/93438
        this.domNode.setAttribute('role', 'code');
        if (this._context.configuration.options.get(46 /* EditorOption.experimentalGpuAcceleration */) === 'on') {
            this._viewGpuContext = this._instantiationService.createInstance(ViewGpuContext, this._context);
        }
        this._scrollbar = new EditorScrollbar(this._context, this._linesContent, this.domNode, this._overflowGuardContainer);
        this._viewParts.push(this._scrollbar);
        // View Lines
        this._viewLines = new ViewLines(this._context, this._viewGpuContext, this._linesContent);
        if (this._viewGpuContext) {
            this._viewLinesGpu = this._instantiationService.createInstance(ViewLinesGpu, this._context, this._viewGpuContext);
        }
        // View Zones
        this._viewZones = new ViewZones(this._context);
        this._viewParts.push(this._viewZones);
        // Decorations overview ruler
        const decorationsOverviewRuler = new DecorationsOverviewRuler(this._context);
        this._viewParts.push(decorationsOverviewRuler);
        const scrollDecoration = new ScrollDecorationViewPart(this._context);
        this._viewParts.push(scrollDecoration);
        const contentViewOverlays = new ContentViewOverlays(this._context);
        this._viewParts.push(contentViewOverlays);
        contentViewOverlays.addDynamicOverlay(new CurrentLineHighlightOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new SelectionsOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new IndentGuidesOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new DecorationsOverlay(this._context));
        contentViewOverlays.addDynamicOverlay(new WhitespaceOverlay(this._context));
        const marginViewOverlays = new MarginViewOverlays(this._context);
        this._viewParts.push(marginViewOverlays);
        marginViewOverlays.addDynamicOverlay(new CurrentLineMarginHighlightOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new MarginViewLineDecorationsOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new LinesDecorationsOverlay(this._context));
        marginViewOverlays.addDynamicOverlay(new LineNumbersOverlay(this._context));
        if (this._viewGpuContext) {
            marginViewOverlays.addDynamicOverlay(new GpuMarkOverlay(this._context, this._viewGpuContext));
        }
        // Glyph margin widgets
        this._glyphMarginWidgets = new GlyphMarginWidgets(this._context);
        this._viewParts.push(this._glyphMarginWidgets);
        const margin = new Margin(this._context);
        margin.getDomNode().appendChild(this._viewZones.marginDomNode);
        margin.getDomNode().appendChild(marginViewOverlays.getDomNode());
        margin.getDomNode().appendChild(this._glyphMarginWidgets.domNode);
        this._viewParts.push(margin);
        // Content widgets
        this._contentWidgets = new ViewContentWidgets(this._context, this.domNode);
        this._viewParts.push(this._contentWidgets);
        this._viewCursors = new ViewCursors(this._context);
        this._viewParts.push(this._viewCursors);
        // Overlay widgets
        this._overlayWidgets = new ViewOverlayWidgets(this._context, this.domNode);
        this._viewParts.push(this._overlayWidgets);
        const rulers = this._viewGpuContext
            ? new RulersGpu(this._context, this._viewGpuContext)
            : new Rulers(this._context);
        this._viewParts.push(rulers);
        const blockOutline = new BlockDecorations(this._context);
        this._viewParts.push(blockOutline);
        const minimap = new Minimap(this._context);
        this._viewParts.push(minimap);
        // -------------- Wire dom nodes up
        if (decorationsOverviewRuler) {
            const overviewRulerData = this._scrollbar.getOverviewRulerLayoutInfo();
            overviewRulerData.parent.insertBefore(decorationsOverviewRuler.getDomNode(), overviewRulerData.insertBefore);
        }
        this._linesContent.appendChild(contentViewOverlays.getDomNode());
        if ('domNode' in rulers) {
            this._linesContent.appendChild(rulers.domNode);
        }
        this._linesContent.appendChild(this._viewZones.domNode);
        this._linesContent.appendChild(this._viewLines.getDomNode());
        this._linesContent.appendChild(this._contentWidgets.domNode);
        this._linesContent.appendChild(this._viewCursors.getDomNode());
        this._overflowGuardContainer.appendChild(margin.getDomNode());
        this._overflowGuardContainer.appendChild(this._scrollbar.getDomNode());
        if (this._viewGpuContext) {
            this._overflowGuardContainer.appendChild(this._viewGpuContext.canvas);
        }
        this._overflowGuardContainer.appendChild(scrollDecoration.getDomNode());
        this._overflowGuardContainer.appendChild(this._overlayWidgets.getDomNode());
        this._overflowGuardContainer.appendChild(minimap.getDomNode());
        this._overflowGuardContainer.appendChild(blockOutline.domNode);
        this.domNode.appendChild(this._overflowGuardContainer);
        if (overflowWidgetsDomNode) {
            overflowWidgetsDomNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode.domNode);
            overflowWidgetsDomNode.appendChild(this._overlayWidgets.overflowingOverlayWidgetsDomNode.domNode);
        }
        else {
            this.domNode.appendChild(this._contentWidgets.overflowingContentWidgetsDomNode);
            this.domNode.appendChild(this._overlayWidgets.overflowingOverlayWidgetsDomNode);
        }
        this._applyLayout();
        // Pointer handler
        this._pointerHandler = this._register(new PointerHandler(this._context, this._viewController, this._createPointerHandlerHelper()));
    }
    _instantiateEditContext() {
        const usingExperimentalEditContext = this._context.configuration.options.get(170 /* EditorOption.effectiveEditContext */);
        if (usingExperimentalEditContext) {
            return this._instantiationService.createInstance(NativeEditContext, this._ownerID, this._context, this._overflowGuardContainer, this._viewController, this._createTextAreaHandlerHelper());
        }
        else {
            return this._instantiationService.createInstance(TextAreaEditContext, this._ownerID, this._context, this._overflowGuardContainer, this._viewController, this._createTextAreaHandlerHelper());
        }
    }
    _updateEditContext() {
        const editContextEnabled = this._context.configuration.options.get(170 /* EditorOption.effectiveEditContext */);
        const accessibilitySupport = this._context.configuration.options.get(2 /* EditorOption.accessibilitySupport */);
        if (this._editContextEnabled === editContextEnabled && this._accessibilitySupport === accessibilitySupport) {
            return;
        }
        this._editContextEnabled = editContextEnabled;
        this._accessibilitySupport = accessibilitySupport;
        const isEditContextFocused = this._editContext.isFocused();
        const indexOfEditContext = this._viewParts.indexOf(this._editContext);
        this._editContext.dispose();
        this._editContext = this._instantiateEditContext();
        if (isEditContextFocused) {
            this._editContext.focus();
        }
        if (indexOfEditContext !== -1) {
            this._viewParts.splice(indexOfEditContext, 1, this._editContext);
        }
    }
    _computeGlyphMarginLanes() {
        const model = this._context.viewModel.model;
        const laneModel = this._context.viewModel.glyphLanes;
        let glyphs = [];
        let maxLineNumber = 0;
        // Add all margin decorations
        glyphs = glyphs.concat(model.getAllMarginDecorations().map((decoration) => {
            const lane = decoration.options.glyphMargin?.position ?? GlyphMarginLane.Center;
            maxLineNumber = Math.max(maxLineNumber, decoration.range.endLineNumber);
            return { range: decoration.range, lane, persist: decoration.options.glyphMargin?.persistLane };
        }));
        // Add all glyph margin widgets
        glyphs = glyphs.concat(this._glyphMarginWidgets.getWidgets().map((widget) => {
            const range = model.validateRange(widget.preference.range);
            maxLineNumber = Math.max(maxLineNumber, range.endLineNumber);
            return { range, lane: widget.preference.lane };
        }));
        // Sorted by their start position
        glyphs.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
        laneModel.reset(maxLineNumber);
        for (const glyph of glyphs) {
            laneModel.push(glyph.lane, glyph.range, glyph.persist);
        }
        return laneModel;
    }
    _createPointerHandlerHelper() {
        return {
            viewDomNode: this.domNode.domNode,
            linesContentDomNode: this._linesContent.domNode,
            viewLinesDomNode: this._viewLines.getDomNode().domNode,
            viewLinesGpu: this._viewLinesGpu,
            focusTextArea: () => {
                this.focus();
            },
            dispatchTextAreaEvent: (event) => {
                this._editContext.domNode.domNode.dispatchEvent(event);
            },
            getLastRenderData: () => {
                const lastViewCursorsRenderData = this._viewCursors.getLastRenderData() || [];
                const lastTextareaPosition = this._editContext.getLastRenderData();
                return new PointerHandlerLastRenderData(lastViewCursorsRenderData, lastTextareaPosition);
            },
            renderNow: () => {
                this.render(true, false);
            },
            shouldSuppressMouseDownOnViewZone: (viewZoneId) => {
                return this._viewZones.shouldSuppressMouseDownOnViewZone(viewZoneId);
            },
            shouldSuppressMouseDownOnWidget: (widgetId) => {
                return this._contentWidgets.shouldSuppressMouseDownOnWidget(widgetId);
            },
            getPositionFromDOMInfo: (spanNode, offset) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.getPositionFromDOMInfo(spanNode, offset);
            },
            visibleRangeForPosition: (lineNumber, column) => {
                this._flushAccumulatedAndRenderNow();
                const position = new Position(lineNumber, column);
                return this._viewLines.visibleRangeForPosition(position) ?? this._viewLinesGpu?.visibleRangeForPosition(position) ?? null;
            },
            getLineWidth: (lineNumber) => {
                this._flushAccumulatedAndRenderNow();
                if (this._viewLinesGpu) {
                    const result = this._viewLinesGpu.getLineWidth(lineNumber);
                    if (result !== undefined) {
                        return result;
                    }
                }
                return this._viewLines.getLineWidth(lineNumber);
            }
        };
    }
    _createTextAreaHandlerHelper() {
        return {
            visibleRangeForPosition: (position) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.visibleRangeForPosition(position);
            },
            linesVisibleRangesForRange: (range, includeNewLines) => {
                this._flushAccumulatedAndRenderNow();
                return this._viewLines.linesVisibleRangesForRange(range, includeNewLines);
            }
        };
    }
    _applyLayout() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(165 /* EditorOption.layoutInfo */);
        this.domNode.setWidth(layoutInfo.width);
        this.domNode.setHeight(layoutInfo.height);
        this._overflowGuardContainer.setWidth(layoutInfo.width);
        this._overflowGuardContainer.setHeight(layoutInfo.height);
        // https://stackoverflow.com/questions/38905916/content-in-google-chrome-larger-than-16777216-px-not-being-rendered
        this._linesContent.setWidth(16777216);
        this._linesContent.setHeight(16777216);
    }
    _getEditorClassName() {
        const focused = this._editContext.isFocused() ? ' focused' : '';
        return this._context.configuration.options.get(162 /* EditorOption.editorClassName */) + ' ' + getThemeTypeSelector(this._context.theme.type) + focused;
    }
    // --- begin event handlers
    handleEvents(events) {
        super.handleEvents(events);
        this._scheduleRender();
    }
    onConfigurationChanged(e) {
        this.domNode.setClassName(this._getEditorClassName());
        this._updateEditContext();
        this._applyLayout();
        return false;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        return false;
    }
    onDecorationsChanged(e) {
        if (e.affectsGlyphMargin) {
            this._shouldRecomputeGlyphMarginLanes = true;
        }
        return false;
    }
    onFocusChanged(e) {
        this.domNode.setClassName(this._getEditorClassName());
        return false;
    }
    onThemeChanged(e) {
        this._context.theme.update(e.theme);
        this.domNode.setClassName(this._getEditorClassName());
        return false;
    }
    // --- end event handlers
    dispose() {
        if (this._renderAnimationFrame !== null) {
            this._renderAnimationFrame.dispose();
            this._renderAnimationFrame = null;
        }
        this._contentWidgets.overflowingContentWidgetsDomNode.domNode.remove();
        this._overlayWidgets.overflowingOverlayWidgetsDomNode.domNode.remove();
        this._context.removeEventHandler(this);
        this._viewGpuContext?.dispose();
        this._viewLines.dispose();
        this._viewLinesGpu?.dispose();
        // Destroy view parts
        for (const viewPart of this._viewParts) {
            viewPart.dispose();
        }
        super.dispose();
    }
    _scheduleRender() {
        if (this._store.isDisposed) {
            throw new BugIndicatingError();
        }
        if (this._renderAnimationFrame === null) {
            // TODO: workaround fix for https://github.com/microsoft/vscode/issues/229825
            if (this._editContext instanceof NativeEditContext) {
                this._editContext.setEditContextOnDomNode();
            }
            const rendering = this._createCoordinatedRendering();
            this._renderAnimationFrame = EditorRenderingCoordinator.INSTANCE.scheduleCoordinatedRendering({
                window: dom.getWindow(this.domNode?.domNode),
                prepareRenderText: () => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    try {
                        return rendering.prepareRenderText();
                    }
                    finally {
                        this._renderAnimationFrame = null;
                    }
                },
                renderText: () => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.renderText();
                },
                prepareRender: (viewParts, ctx) => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.prepareRender(viewParts, ctx);
                },
                render: (viewParts, ctx) => {
                    if (this._store.isDisposed) {
                        throw new BugIndicatingError();
                    }
                    return rendering.render(viewParts, ctx);
                }
            });
        }
    }
    _flushAccumulatedAndRenderNow() {
        const rendering = this._createCoordinatedRendering();
        safeInvokeNoArg(() => rendering.prepareRenderText());
        const data = safeInvokeNoArg(() => rendering.renderText());
        if (data) {
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.prepareRender(viewParts, ctx));
            safeInvokeNoArg(() => rendering.render(viewParts, ctx));
        }
    }
    _getViewPartsToRender() {
        const result = [];
        let resultLen = 0;
        for (const viewPart of this._viewParts) {
            if (viewPart.shouldRender()) {
                result[resultLen++] = viewPart;
            }
        }
        return result;
    }
    _createCoordinatedRendering() {
        return {
            prepareRenderText: () => {
                if (this._shouldRecomputeGlyphMarginLanes) {
                    this._shouldRecomputeGlyphMarginLanes = false;
                    const model = this._computeGlyphMarginLanes();
                    this._context.configuration.setGlyphMarginDecorationLaneCount(model.requiredLanes);
                }
                inputLatency.onRenderStart();
            },
            renderText: () => {
                if (!this.domNode.domNode.isConnected) {
                    return null;
                }
                let viewPartsToRender = this._getViewPartsToRender();
                if (!this._viewLines.shouldRender() && viewPartsToRender.length === 0) {
                    // Nothing to render
                    return null;
                }
                const partialViewportData = this._context.viewLayout.getLinesViewportData();
                this._context.viewModel.setViewport(partialViewportData.startLineNumber, partialViewportData.endLineNumber, partialViewportData.centeredLineNumber);
                const viewportData = new ViewportData(this._selections, partialViewportData, this._context.viewLayout.getWhitespaceViewportData(), this._context.viewModel);
                if (this._contentWidgets.shouldRender()) {
                    // Give the content widgets a chance to set their max width before a possible synchronous layout
                    this._contentWidgets.onBeforeRender(viewportData);
                }
                if (this._viewLines.shouldRender()) {
                    this._viewLines.renderText(viewportData);
                    this._viewLines.onDidRender();
                    // Rendering of viewLines might cause scroll events to occur, so collect view parts to render again
                    viewPartsToRender = this._getViewPartsToRender();
                }
                if (this._viewLinesGpu?.shouldRender()) {
                    this._viewLinesGpu.renderText(viewportData);
                    this._viewLinesGpu.onDidRender();
                }
                return [viewPartsToRender, new RenderingContext(this._context.viewLayout, viewportData, this._viewLines, this._viewLinesGpu)];
            },
            prepareRender: (viewPartsToRender, ctx) => {
                for (const viewPart of viewPartsToRender) {
                    viewPart.prepareRender(ctx);
                }
            },
            render: (viewPartsToRender, ctx) => {
                for (const viewPart of viewPartsToRender) {
                    viewPart.render(ctx);
                    viewPart.onDidRender();
                }
            }
        };
    }
    // --- BEGIN CodeEditor helpers
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._scrollbar.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this._scrollbar.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    restoreState(scrollPosition) {
        this._context.viewModel.viewLayout.setScrollPosition({
            scrollTop: scrollPosition.scrollTop,
            scrollLeft: scrollPosition.scrollLeft
        }, 1 /* ScrollType.Immediate */);
        this._context.viewModel.visibleLinesStabilized();
    }
    getOffsetForColumn(modelLineNumber, modelColumn) {
        const modelPosition = this._context.viewModel.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        this._flushAccumulatedAndRenderNow();
        const visibleRange = this._viewLines.visibleRangeForPosition(new Position(viewPosition.lineNumber, viewPosition.column));
        if (!visibleRange) {
            return -1;
        }
        return visibleRange.left;
    }
    getLineWidth(modelLineNumber) {
        const model = this._context.viewModel.model;
        const viewLine = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelLineNumber, model.getLineMaxColumn(modelLineNumber))).lineNumber;
        this._flushAccumulatedAndRenderNow();
        const width = this._viewLines.getLineWidth(viewLine);
        return width;
    }
    getTargetAtClientPoint(clientX, clientY) {
        const mouseTarget = this._pointerHandler.getTargetAtClientPoint(clientX, clientY);
        if (!mouseTarget) {
            return null;
        }
        return ViewUserInputEvents.convertViewToModelMouseTarget(mouseTarget, this._context.viewModel.coordinatesConverter);
    }
    createOverviewRuler(cssClassName) {
        return new OverviewRuler(this._context, cssClassName);
    }
    change(callback) {
        this._viewZones.changeViewZones(callback);
        this._scheduleRender();
    }
    render(now, everything) {
        if (everything) {
            // Force everything to render...
            this._viewLines.forceShouldRender();
            for (const viewPart of this._viewParts) {
                viewPart.forceShouldRender();
            }
        }
        if (now) {
            this._flushAccumulatedAndRenderNow();
        }
        else {
            this._scheduleRender();
        }
    }
    writeScreenReaderContent(reason) {
        this._editContext.writeScreenReaderContent(reason);
    }
    focus() {
        this._editContext.focus();
    }
    isFocused() {
        return this._editContext.isFocused();
    }
    isWidgetFocused() {
        return this._widgetFocusTracker.hasFocus();
    }
    refreshFocusState() {
        this._editContext.refreshFocusState();
        this._widgetFocusTracker.refreshState();
    }
    setAriaOptions(options) {
        this._editContext.setAriaOptions(options);
    }
    addContentWidget(widgetData) {
        this._contentWidgets.addWidget(widgetData.widget);
        this.layoutContentWidget(widgetData);
        this._scheduleRender();
    }
    layoutContentWidget(widgetData) {
        this._contentWidgets.setWidgetPosition(widgetData.widget, widgetData.position?.position ?? null, widgetData.position?.secondaryPosition ?? null, widgetData.position?.preference ?? null, widgetData.position?.positionAffinity ?? null);
        if (this._contentWidgets.shouldRender()) {
            this._scheduleRender();
        }
    }
    removeContentWidget(widgetData) {
        this._contentWidgets.removeWidget(widgetData.widget);
        this._scheduleRender();
    }
    addOverlayWidget(widgetData) {
        this._overlayWidgets.addWidget(widgetData.widget);
        this.layoutOverlayWidget(widgetData);
        this._scheduleRender();
    }
    layoutOverlayWidget(widgetData) {
        const shouldRender = this._overlayWidgets.setWidgetPosition(widgetData.widget, widgetData.position);
        if (shouldRender) {
            this._scheduleRender();
        }
    }
    removeOverlayWidget(widgetData) {
        this._overlayWidgets.removeWidget(widgetData.widget);
        this._scheduleRender();
    }
    addGlyphMarginWidget(widgetData) {
        this._glyphMarginWidgets.addWidget(widgetData.widget);
        this._shouldRecomputeGlyphMarginLanes = true;
        this._scheduleRender();
    }
    layoutGlyphMarginWidget(widgetData) {
        const newPreference = widgetData.position;
        const shouldRender = this._glyphMarginWidgets.setWidgetPosition(widgetData.widget, newPreference);
        if (shouldRender) {
            this._shouldRecomputeGlyphMarginLanes = true;
            this._scheduleRender();
        }
    }
    removeGlyphMarginWidget(widgetData) {
        this._glyphMarginWidgets.removeWidget(widgetData.widget);
        this._shouldRecomputeGlyphMarginLanes = true;
        this._scheduleRender();
    }
};
View = __decorate([
    __param(8, IInstantiationService)
], View);
export { View };
function safeInvokeNoArg(func) {
    try {
        return func();
    }
    catch (e) {
        onUnexpectedError(e);
        return null;
    }
}
class EditorRenderingCoordinator {
    static { this.INSTANCE = new EditorRenderingCoordinator(); }
    constructor() {
        this._coordinatedRenderings = [];
        this._animationFrameRunners = new Map();
    }
    scheduleCoordinatedRendering(rendering) {
        this._coordinatedRenderings.push(rendering);
        this._scheduleRender(rendering.window);
        return {
            dispose: () => {
                const renderingIndex = this._coordinatedRenderings.indexOf(rendering);
                if (renderingIndex === -1) {
                    return;
                }
                this._coordinatedRenderings.splice(renderingIndex, 1);
                if (this._coordinatedRenderings.length === 0) {
                    // There are no more renderings to coordinate => cancel animation frames
                    for (const [_, disposable] of this._animationFrameRunners) {
                        disposable.dispose();
                    }
                    this._animationFrameRunners.clear();
                }
            }
        };
    }
    _scheduleRender(window) {
        if (!this._animationFrameRunners.has(window)) {
            const runner = () => {
                this._animationFrameRunners.delete(window);
                this._onRenderScheduled();
            };
            this._animationFrameRunners.set(window, dom.runAtThisOrScheduleAtNextAnimationFrame(window, runner, 100));
        }
    }
    _onRenderScheduled() {
        const coordinatedRenderings = this._coordinatedRenderings.slice(0);
        this._coordinatedRenderings = [];
        for (const rendering of coordinatedRenderings) {
            safeInvokeNoArg(() => rendering.prepareRenderText());
        }
        const datas = [];
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            datas[i] = safeInvokeNoArg(() => rendering.renderText());
        }
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            const data = datas[i];
            if (!data) {
                continue;
            }
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.prepareRender(viewParts, ctx));
        }
        for (let i = 0, len = coordinatedRenderings.length; i < len; i++) {
            const rendering = coordinatedRenderings[i];
            const data = datas[i];
            if (!data) {
                continue;
            }
            const [viewParts, ctx] = data;
            safeInvokeNoArg(() => rendering.render(viewParts, ctx));
        }
    }
}
class CodeEditorWidgetFocusTracker extends Disposable {
    constructor(domElement, overflowWidgetsDomNode) {
        super();
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._hadFocus = undefined;
        this._hasDomElementFocus = false;
        this._domFocusTracker = this._register(dom.trackFocus(domElement));
        this._overflowWidgetsDomNodeHasFocus = false;
        this._register(this._domFocusTracker.onDidFocus(() => {
            this._hasDomElementFocus = true;
            this._update();
        }));
        this._register(this._domFocusTracker.onDidBlur(() => {
            this._hasDomElementFocus = false;
            this._update();
        }));
        if (overflowWidgetsDomNode) {
            this._overflowWidgetsDomNode = this._register(dom.trackFocus(overflowWidgetsDomNode));
            this._register(this._overflowWidgetsDomNode.onDidFocus(() => {
                this._overflowWidgetsDomNodeHasFocus = true;
                this._update();
            }));
            this._register(this._overflowWidgetsDomNode.onDidBlur(() => {
                this._overflowWidgetsDomNodeHasFocus = false;
                this._update();
            }));
        }
    }
    _update() {
        const focused = this._hasDomElementFocus || this._overflowWidgetsDomNodeHasFocus;
        if (this._hadFocus !== focused) {
            this._hadFocus = focused;
            this._onChange.fire(undefined);
        }
    }
    hasFocus() {
        return this._hadFocus ?? false;
    }
    refreshState() {
        this._domFocusTracker.refreshState();
        this._overflowWidgetsDomNode?.refreshState?.();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUM7QUFDakQsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFaEUsT0FBTyxFQUFxQixnQkFBZ0IsRUFBOEIsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RyxPQUFPLEVBQW9CLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2pGLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQVksTUFBTSxvQkFBb0IsQ0FBQztBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFB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
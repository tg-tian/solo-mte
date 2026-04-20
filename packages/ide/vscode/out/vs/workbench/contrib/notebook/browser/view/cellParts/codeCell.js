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
// allow-any-unicode-comment-file
import { localize } from '../../../../../../nls.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { raceCancellation } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import * as strings from '../../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { tokenizeToStringSync } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import { CodeActionController } from '../../../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { CellFocusMode, EXPAND_CELL_INPUT_COMMAND_ID } from '../../notebookBrowser.js';
import { outputDisplayLimit } from '../../viewModel/codeCellViewModel.js';
import { collapsedCellTTPolicy } from '../notebookRenderingCommon.js';
import { CellEditorOptions } from './cellEditorOptions.js';
import { CellOutputContainer } from './cellOutput.js';
import { CollapsedCodeCellExecutionIcon } from './codeCellExecutionIcon.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
let CodeCell = class CodeCell extends Disposable {
    constructor(notebookEditor, viewCell, templateData, editorPool, instantiationService, keybindingService, languageService, configurationService, notebookExecutionStateService, notebookLogService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.templateData = templateData;
        this.editorPool = editorPool;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.languageService = languageService;
        this.configurationService = configurationService;
        this._isDisposed = false;
        this._useNewApproachForEditorLayout = true;
        this._pointerDownInEditor = false;
        this._pointerDraggingInEditor = false;
        const cellIndex = this.notebookEditor.getCellIndex(this.viewCell);
        const debugPrefix = `[Cell ${cellIndex}]`;
        const debug = this._debug = (output) => {
            notebookLogService.debug('CellLayout', `${debugPrefix} ${output}`);
        };
        this._cellEditorOptions = this._register(new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(viewCell.language), this.notebookEditor.notebookOptions, this.configurationService));
        this._outputContainerRenderer = this.instantiationService.createInstance(CellOutputContainer, notebookEditor, viewCell, templateData, { limit: outputDisplayLimit });
        this.cellParts = this._register(templateData.cellParts.concatContentPart([this._cellEditorOptions, this._outputContainerRenderer], DOM.getWindow(notebookEditor.getDomNode())));
        const initialEditorDimension = { height: this.calculateInitEditorHeight(), width: this.viewCell.layoutInfo.editorWidth };
        this._cellLayout = new CodeCellLayout(this._useNewApproachForEditorLayout, notebookEditor, viewCell, templateData, { debug }, initialEditorDimension);
        this.initializeEditor(initialEditorDimension);
        this._renderedInputCollapseState = false; // editor is always expanded initially
        this.registerNotebookEditorListeners();
        this.registerViewCellLayoutChange();
        this.registerCellEditorEventListeners();
        this.registerMouseListener();
        this._register(Event.any(this.viewCell.onDidStartExecution, this.viewCell.onDidStopExecution)((e) => {
            this.cellParts.updateForExecutionState(this.viewCell, e);
        }));
        this._register(this.viewCell.onDidChangeState(e => {
            this.cellParts.updateState(this.viewCell, e);
            if (e.outputIsHoveredChanged) {
                this.updateForOutputHover();
            }
            if (e.outputIsFocusedChanged) {
                this.updateForOutputFocus();
            }
            if (e.metadataChanged || e.internalMetadataChanged) {
                this.updateEditorOptions();
            }
            if (e.inputCollapsedChanged || e.outputCollapsedChanged) {
                this.viewCell.pauseLayout();
                const updated = this.updateForCollapseState();
                this.viewCell.resumeLayout();
                if (updated) {
                    this.relayoutCell();
                }
            }
            if (e.focusModeChanged) {
                this.updateEditorForFocusModeChange(true);
            }
        }));
        this.updateEditorOptions();
        this.updateEditorForFocusModeChange(false);
        this.updateForOutputHover();
        this.updateForOutputFocus();
        this.cellParts.scheduleRenderCell(this.viewCell);
        this._register(toDisposable(() => {
            this.cellParts.unrenderCell(this.viewCell);
        }));
        // Render Outputs
        this.viewCell.editorHeight = initialEditorDimension.height;
        this._outputContainerRenderer.render();
        this._renderedOutputCollapseState = false; // the output is always rendered initially
        // Need to do this after the intial renderOutput
        this.initialViewUpdateExpanded();
        this._register(this.viewCell.onLayoutInfoRead(() => {
            this.cellParts.prepareLayout();
        }));
        const executionItemElement = DOM.append(this.templateData.cellInputCollapsedContainer, DOM.$('.collapsed-execution-icon'));
        this._register(toDisposable(() => {
            executionItemElement.remove();
        }));
        this._collapsedExecutionIcon = this._register(this.instantiationService.createInstance(CollapsedCodeCellExecutionIcon, this.notebookEditor, this.viewCell, executionItemElement));
        this.updateForCollapseState();
        this._register(Event.runAndSubscribe(viewCell.onDidChangeOutputs, this.updateForOutputs.bind(this)));
        this._register(Event.runAndSubscribe(viewCell.onDidChangeLayout, this.updateForLayout.bind(this)));
        this._cellEditorOptions.setLineNumbers(this.viewCell.lineNumbers);
        templateData.editor.updateOptions(this._cellEditorOptions.getUpdatedValue(this.viewCell.internalMetadata, this.viewCell.uri));
    }
    updateCodeCellOptions(templateData) {
        templateData.editor.updateOptions(this._cellEditorOptions.getUpdatedValue(this.viewCell.internalMetadata, this.viewCell.uri));
        const cts = new CancellationTokenSource();
        this._register({ dispose() { cts.dispose(true); } });
        raceCancellation(this.viewCell.resolveTextModel(), cts.token).then(model => {
            if (this._isDisposed) {
                return;
            }
            if (model) {
                model.updateOptions({
                    indentSize: this._cellEditorOptions.indentSize,
                    tabSize: this._cellEditorOptions.tabSize,
                    insertSpaces: this._cellEditorOptions.insertSpaces,
                });
            }
        });
    }
    updateForLayout() {
        this._pendingLayout?.dispose();
        this._pendingLayout = DOM.modify(DOM.getWindow(this.notebookEditor.getDomNode()), () => {
            this.cellParts.updateInternalLayoutNow(this.viewCell);
        });
    }
    updateForOutputHover() {
        this.templateData.container.classList.toggle('cell-output-hover', this.viewCell.outputIsHovered);
    }
    updateForOutputFocus() {
        this.templateData.container.classList.toggle('cell-output-focus', this.viewCell.outputIsFocused);
    }
    calculateInitEditorHeight() {
        const lineNum = this.viewCell.lineCount;
        const lineHeight = this.viewCell.layoutInfo.fontInfo?.lineHeight || 17;
        const editorPadding = this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri);
        const editorHeight = this.viewCell.layoutInfo.editorHeight === 0
            ? lineNum * lineHeight + editorPadding.top + editorPadding.bottom
            : this.viewCell.layoutInfo.editorHeight;
        return editorHeight;
    }
    initializeEditor(dimension) {
        this._debug(`Initialize Editor ${dimension.height} x ${dimension.width}, Scroll Top = ${this.notebookEditor.scrollTop}`);
        this._cellLayout.layoutEditor('init');
        this.layoutEditor(dimension);
        const cts = new CancellationTokenSource();
        this._register({ dispose() { cts.dispose(true); } });
        raceCancellation(this.viewCell.resolveTextModel(), cts.token).then(model => {
            if (this._isDisposed || model?.isDisposed()) {
                return;
            }
            if (model && this.templateData.editor) {
                this._reigsterModelListeners(model);
                // set model can trigger view update, which can lead to dispose of this cell
                this.templateData.editor.setModel(model);
                if (this._isDisposed) {
                    return;
                }
                model.updateOptions({
                    indentSize: this._cellEditorOptions.indentSize,
                    tabSize: this._cellEditorOptions.tabSize,
                    insertSpaces: this._cellEditorOptions.insertSpaces,
                });
                this.viewCell.attachTextEditor(this.templateData.editor, this.viewCell.layoutInfo.estimatedHasHorizontalScrolling);
                const focusEditorIfNeeded = () => {
                    if (this.notebookEditor.getActiveCell() === this.viewCell &&
                        this.viewCell.focusMode === CellFocusMode.Editor &&
                        (this.notebookEditor.hasEditorFocus() || this.notebookEditor.getDomNode().ownerDocument.activeElement === this.notebookEditor.getDomNode().ownerDocument.body)) // Don't steal focus from other workbench parts, but if body has focus, we can take it
                     {
                        this.templateData.editor.focus();
                    }
                };
                focusEditorIfNeeded();
                const realContentHeight = this.templateData.editor.getContentHeight();
                if (realContentHeight !== dimension.height) {
                    this.onCellEditorHeightChange('onDidResolveTextModel');
                }
                if (this._isDisposed) {
                    return;
                }
                focusEditorIfNeeded();
            }
            this._register(this._cellEditorOptions.onDidChange(() => this.updateCodeCellOptions(this.templateData)));
        });
    }
    updateForOutputs() {
        DOM.setVisibility(this.viewCell.outputsViewModels.length > 0, this.templateData.focusSinkElement);
    }
    updateEditorOptions() {
        const editor = this.templateData.editor;
        if (!editor) {
            return;
        }
        const isReadonly = this.notebookEditor.isReadOnly;
        const padding = this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri);
        const options = editor.getOptions();
        if (options.get(104 /* EditorOption.readOnly */) !== isReadonly || options.get(96 /* EditorOption.padding */) !== padding) {
            editor.updateOptions({
                readOnly: this.notebookEditor.isReadOnly, padding: this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri)
            });
        }
    }
    registerNotebookEditorListeners() {
        this._register(this.notebookEditor.onDidScroll(() => {
            this.adjustEditorPosition();
            this._cellLayout.layoutEditor('nbDidScroll');
        }));
        this._register(this.notebookEditor.onDidChangeLayout(() => {
            this.adjustEditorPosition();
            this.onCellWidthChange('nbLayoutChange');
        }));
    }
    adjustEditorPosition() {
        if (this._useNewApproachForEditorLayout) {
            return;
        }
        const extraOffset = -6 /** distance to the top of the cell editor, which is 6px under the focus indicator */ - 1 /** border */;
        const min = 0;
        const scrollTop = this.notebookEditor.scrollTop;
        const elementTop = this.notebookEditor.getAbsoluteTopOfElement(this.viewCell);
        const diff = scrollTop - elementTop + extraOffset;
        const notebookEditorLayout = this.notebookEditor.getLayoutInfo();
        // we should stop adjusting the top when users are viewing the bottom of the cell editor
        const editorMaxHeight = notebookEditorLayout.height
            - notebookEditorLayout.stickyHeight
            - 26 /** notebook toolbar */;
        const maxTop = this.viewCell.layoutInfo.editorHeight
            // + this.viewCell.layoutInfo.statusBarHeight
            - editorMaxHeight;
        const top = maxTop > 20 ?
            clamp(min, diff, maxTop) :
            min;
        this.templateData.editorPart.style.top = `${top}px`;
        // scroll the editor with top
        this.templateData.editor.setScrollTop(top);
    }
    registerViewCellLayoutChange() {
        this._register(this.viewCell.onDidChangeLayout((e) => {
            if (e.outerWidth !== undefined) {
                const layoutInfo = this.templateData.editor.getLayoutInfo();
                if (layoutInfo.width !== this.viewCell.layoutInfo.editorWidth) {
                    this.onCellWidthChange('viewCellLayoutChange');
                    this.adjustEditorPosition();
                }
            }
        }));
    }
    registerCellEditorEventListeners() {
        this._register(this.templateData.editor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged) {
                if (this.viewCell.layoutInfo.editorHeight !== e.contentHeight) {
                    this.onCellEditorHeightChange(`onDidContentSizeChange`);
                    this.adjustEditorPosition();
                }
            }
        }));
        if (this._useNewApproachForEditorLayout) {
            this._register(this.templateData.editor.onDidScrollChange(e => {
                // Option 4: Gate scroll-driven reactions during active drag-selection
                if (this._pointerDownInEditor || this._pointerDraggingInEditor) {
                    return;
                }
                if (this._cellLayout.editorVisibility === 'Invisible' || !this.templateData.editor.hasTextFocus()) {
                    return;
                }
                if (this._cellLayout._lastChangedEditorScrolltop === e.scrollTop || this._cellLayout.isUpdatingLayout) {
                    return;
                }
                const scrollTop = this.notebookEditor.scrollTop;
                const diff = e.scrollTop - (this._cellLayout._lastChangedEditorScrolltop ?? 0);
                if (this._cellLayout.editorVisibility === 'Full (Small Viewport)' && typeof this._cellLayout._lastChangedEditorScrolltop === 'number') {
                    this._debug(`Scroll Change (1) = ${e.scrollTop} changed by ${diff} (notebook scrollTop: ${scrollTop}, setEditorScrollTop: ${e.scrollTop})`);
                    // this.templateData.editor.setScrollTop(e.scrollTop);
                }
                else if (this._cellLayout.editorVisibility === 'Bottom Clipped' && typeof this._cellLayout._lastChangedEditorScrolltop === 'number') {
                    this._debug(`Scroll Change (2) = ${e.scrollTop} changed by ${diff} (notebook scrollTop: ${scrollTop}, setNotebookScrollTop: ${scrollTop + e.scrollTop})`);
                    this.notebookEditor.setScrollTop(scrollTop + e.scrollTop);
                }
                else if (this._cellLayout.editorVisibility === 'Top Clipped' && typeof this._cellLayout._lastChangedEditorScrolltop === 'number') {
                    const newScrollTop = scrollTop + diff - 1;
                    this._debug(`Scroll Change (3) = ${e.scrollTop} changed by ${diff} (notebook scrollTop: ${scrollTop}, setNotebookScrollTop?: ${newScrollTop})`);
                    if (scrollTop !== newScrollTop) {
                        this.notebookEditor.setScrollTop(newScrollTop);
                    }
                }
                else {
                    this._debug(`Scroll Change (4) = ${e.scrollTop} changed by ${diff} (notebook scrollTop: ${scrollTop})`);
                    this._cellLayout._lastChangedEditorScrolltop = undefined;
                }
            }));
        }
        this._register(this.templateData.editor.onDidChangeCursorSelection((e) => {
            if (
            // do not reveal the cell into view if this selection change was caused by restoring editors
            e.source === 'restoreState' || e.oldModelVersionId === 0
                // nor if the text editor is not actually focused (e.g. inline chat is focused and modifying the cell content)
                || !this.templateData.editor.hasTextFocus()) {
                return;
            }
            // Option 3: Avoid relayouts during active pointer drag to prevent stuck selection mode
            if ((this._pointerDownInEditor || this._pointerDraggingInEditor) && this._useNewApproachForEditorLayout) {
                return;
            }
            const selections = this.templateData.editor.getSelections();
            if (selections?.length) {
                const contentHeight = this.templateData.editor.getContentHeight();
                const layoutContentHeight = this.viewCell.layoutInfo.editorHeight;
                if (contentHeight !== layoutContentHeight) {
                    if (!this._useNewApproachForEditorLayout) {
                        this._debug(`onDidChangeCursorSelection`);
                        this.onCellEditorHeightChange('onDidChangeCursorSelection');
                    }
                    if (this._isDisposed) {
                        return;
                    }
                }
                const lastSelection = selections[selections.length - 1];
                this.notebookEditor.revealRangeInViewAsync(this.viewCell, lastSelection);
            }
        }));
        this._register(this.templateData.editor.onDidBlurEditorWidget(() => {
            CodeActionController.get(this.templateData.editor)?.hideLightBulbWidget();
        }));
    }
    _reigsterModelListeners(model) {
        this._register(model.onDidChangeTokens(() => {
            if (this.viewCell.isInputCollapsed && this._inputCollapseElement) {
                // flush the collapsed input with the latest tokens
                const content = this._getRichTextFromLineTokens(model);
                this._inputCollapseElement.innerHTML = (collapsedCellTTPolicy?.createHTML(content) ?? content);
                this._attachInputExpandButton(this._inputCollapseElement);
            }
        }));
    }
    registerMouseListener() {
        // Pointer-state handling in notebook cell editors has a couple of easy-to-regress edge cases:
        // 1) Holding the left mouse button while wheel/trackpad scrolling should scroll as usual.
        //    We therefore only treat the interaction as an "active drag selection" after actual pointer movement.
        // 2) "Stuck selection mode" can occur if we miss the corresponding mouseup (e.g. releasing outside the window,
        //    focus loss, or ESC cancelling Monaco selection/drag). When this happens, leaving any of our drag/pointer
        //    flags set will incorrectly gate scroll/layout syncing and make the editor feel stuck.
        //    To avoid that, we reset state on multiple cancellation paths and also self-heal on mousemove.
        const resetPointerState = () => {
            this._pointerDownInEditor = false;
            this._pointerDraggingInEditor = false;
            this._cellLayout.setPointerDown(false);
        };
        this._register(this.templateData.editor.onMouseDown(e => {
            // prevent default on right mouse click, otherwise it will trigger unexpected focus changes
            // the catch is, it means we don't allow customization of right button mouse down handlers other than the built in ones.
            if (e.event.rightButton) {
                e.event.preventDefault();
            }
            if (this._useNewApproachForEditorLayout) {
                // Track pointer-down and pointer-drag separately.
                // Holding the left button while wheel/trackpad scrolling should behave like normal scrolling.
                if (e.event.leftButton) {
                    this._pointerDownInEditor = true;
                    this._pointerDraggingInEditor = false;
                    this._cellLayout.setPointerDown(false);
                }
            }
        }));
        if (this._useNewApproachForEditorLayout) {
            this._register(this.templateData.editor.onMouseMove(e => {
                if (!this._pointerDownInEditor) {
                    return;
                }
                // Self-heal: if we missed a mouseup (e.g. focus loss), clear the drag state as soon as we can observe it.
                if (!e.event.leftButton) {
                    resetPointerState();
                    return;
                }
                if (!this._pointerDraggingInEditor) {
                    // Only consider it a drag-selection once the pointer actually moves with the left button down.
                    this._pointerDraggingInEditor = true;
                    this._cellLayout.setPointerDown(true);
                }
            }));
        }
        if (this._useNewApproachForEditorLayout) {
            // Ensure we reset pointer-down even if mouseup lands outside the editor
            const win = DOM.getWindow(this.notebookEditor.getDomNode());
            this._register(DOM.addDisposableListener(win, 'mouseup', resetPointerState));
            this._register(DOM.addDisposableListener(win, 'pointerup', resetPointerState));
            this._register(DOM.addDisposableListener(win, 'pointercancel', resetPointerState));
            this._register(DOM.addDisposableListener(win, 'blur', resetPointerState));
            this._register(DOM.addDisposableListener(win, 'keydown', e => {
                if (e.key === 'Escape' && (this._pointerDownInEditor || this._pointerDraggingInEditor)) {
                    resetPointerState();
                }
            }));
        }
    }
    shouldPreserveEditor() {
        // The DOM focus needs to be adjusted:
        // when a cell editor should be focused
        // the document active element is inside the notebook editor or the document body (cell editor being disposed previously)
        return this.notebookEditor.getActiveCell() === this.viewCell
            && this.viewCell.focusMode === CellFocusMode.Editor
            && (this.notebookEditor.hasEditorFocus() || this.notebookEditor.getDomNode().ownerDocument.activeElement === this.notebookEditor.getDomNode().ownerDocument.body);
    }
    updateEditorForFocusModeChange(sync) {
        if (this.shouldPreserveEditor()) {
            if (sync) {
                this.templateData.editor.focus();
            }
            else {
                this._register(DOM.runAtThisOrScheduleAtNextAnimationFrame(DOM.getWindow(this.templateData.container), () => {
                    this.templateData.editor.focus();
                }));
            }
        }
        this.templateData.container.classList.toggle('cell-editor-focus', this.viewCell.focusMode === CellFocusMode.Editor);
        this.templateData.container.classList.toggle('cell-output-focus', this.viewCell.focusMode === CellFocusMode.Output);
    }
    updateForCollapseState() {
        if (this.viewCell.isOutputCollapsed === this._renderedOutputCollapseState &&
            this.viewCell.isInputCollapsed === this._renderedInputCollapseState) {
            return false;
        }
        this.viewCell.layoutChange({ editorHeight: true });
        if (this.viewCell.isInputCollapsed) {
            this._collapseInput();
        }
        else {
            this._showInput();
        }
        if (this.viewCell.isOutputCollapsed) {
            this._collapseOutput();
        }
        else {
            this._showOutput(false);
        }
        this.relayoutCell();
        this._renderedOutputCollapseState = this.viewCell.isOutputCollapsed;
        this._renderedInputCollapseState = this.viewCell.isInputCollapsed;
        return true;
    }
    _collapseInput() {
        // hide the editor and execution label, keep the run button
        DOM.hide(this.templateData.editorPart);
        this.templateData.container.classList.toggle('input-collapsed', true);
        // remove input preview
        this._removeInputCollapsePreview();
        this._collapsedExecutionIcon.setVisibility(true);
        // update preview
        const richEditorText = this.templateData.editor.hasModel() ? this._getRichTextFromLineTokens(this.templateData.editor.getModel()) : this._getRichText(this.viewCell.textBuffer, this.viewCell.language);
        const element = DOM.$('div.cell-collapse-preview');
        element.innerHTML = (collapsedCellTTPolicy?.createHTML(richEditorText) ?? richEditorText);
        this._inputCollapseElement = element;
        this.templateData.cellInputCollapsedContainer.appendChild(element);
        this._attachInputExpandButton(element);
        DOM.show(this.templateData.cellInputCollapsedContainer);
    }
    _attachInputExpandButton(element) {
        const expandIcon = DOM.$('span.expandInputIcon');
        const keybinding = this.keybindingService.lookupKeybinding(EXPAND_CELL_INPUT_COMMAND_ID);
        if (keybinding) {
            element.title = localize('cellExpandInputButtonLabelWithDoubleClick', "Double-click to expand cell input ({0})", keybinding.getLabel());
            expandIcon.title = localize('cellExpandInputButtonLabel', "Expand Cell Input ({0})", keybinding.getLabel());
        }
        expandIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.more));
        element.appendChild(expandIcon);
    }
    _showInput() {
        this._collapsedExecutionIcon.setVisibility(false);
        DOM.show(this.templateData.editorPart);
        DOM.hide(this.templateData.cellInputCollapsedContainer);
    }
    _getRichText(buffer, language) {
        return tokenizeToStringSync(this.languageService, buffer.getLineContent(1), language);
    }
    _getRichTextFromLineTokens(model) {
        let result = `<div class="monaco-tokenized-source">`;
        const firstLineTokens = model.tokenization.getLineTokens(1);
        const viewLineTokens = firstLineTokens.inflate();
        const line = model.getLineContent(1);
        let startOffset = 0;
        for (let j = 0, lenJ = viewLineTokens.getCount(); j < lenJ; j++) {
            const type = viewLineTokens.getClassName(j);
            const endIndex = viewLineTokens.getEndOffset(j);
            result += `<span class="${type}">${strings.escape(line.substring(startOffset, endIndex))}</span>`;
            startOffset = endIndex;
        }
        result += `</div>`;
        return result;
    }
    _removeInputCollapsePreview() {
        const children = this.templateData.cellInputCollapsedContainer.children;
        const elements = [];
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains('cell-collapse-preview')) {
                elements.push(children[i]);
            }
        }
        elements.forEach(element => {
            element.remove();
        });
    }
    _updateOutputInnerContainer(hide) {
        const children = this.templateData.outputContainer.domNode.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains('output-inner-container')) {
                DOM.setVisibility(!hide, children[i]);
            }
        }
    }
    _collapseOutput() {
        this.templateData.container.classList.toggle('output-collapsed', true);
        DOM.show(this.templateData.cellOutputCollapsedContainer);
        this._updateOutputInnerContainer(true);
        this._outputContainerRenderer.viewUpdateHideOuputs();
    }
    _showOutput(initRendering) {
        this.templateData.container.classList.toggle('output-collapsed', false);
        DOM.hide(this.templateData.cellOutputCollapsedContainer);
        this._updateOutputInnerContainer(false);
        this._outputContainerRenderer.viewUpdateShowOutputs(initRendering);
    }
    initialViewUpdateExpanded() {
        this.templateData.container.classList.toggle('input-collapsed', false);
        DOM.show(this.templateData.editorPart);
        DOM.hide(this.templateData.cellInputCollapsedContainer);
        this.templateData.container.classList.toggle('output-collapsed', false);
        this._showOutput(true);
    }
    layoutEditor(dimension) {
        if (this._useNewApproachForEditorLayout) {
            return;
        }
        const editorLayout = this.notebookEditor.getLayoutInfo();
        const maxHeight = Math.min(editorLayout.height
            - editorLayout.stickyHeight
            - 26 /** notebook toolbar */, dimension.height);
        this._debug(`Layout Editor: Width = ${dimension.width}, Height = ${maxHeight} (Requested: ${dimension.height}, Editor Layout Height: ${editorLayout.height}, Sticky: ${editorLayout.stickyHeight})`);
        this.templateData.editor.layout({
            width: dimension.width,
            height: maxHeight
        }, true);
    }
    onCellWidthChange(dbgReasonForChange) {
        this._debug(`Cell Editor Width Change, ${dbgReasonForChange}, Content Height = ${this.templateData.editor.getContentHeight()}`);
        const height = this.templateData.editor.getContentHeight();
        if (this.templateData.editor.hasModel()) {
            this._debug(`**** Updating Cell Editor Height (1), ContentHeight: ${height}, CodeCellLayoutInfo.EditorWidth ${this.viewCell.layoutInfo.editorWidth}, EditorLayoutInfo ${this.templateData.editor.getLayoutInfo().height} ****`);
            this.viewCell.editorHeight = height;
            this.relayoutCell();
            this.layoutEditor({
                width: this.viewCell.layoutInfo.editorWidth,
                height
            });
        }
        else {
            this._debug(`Cell Editor Width Change without model, return (1), ContentHeight: ${height}, CodeCellLayoutInfo.EditorWidth ${this.viewCell.layoutInfo.editorWidth}, EditorLayoutInfo ${this.templateData.editor.getLayoutInfo().height}`);
        }
        this._cellLayout.layoutEditor(dbgReasonForChange);
    }
    onCellEditorHeightChange(dbgReasonForChange) {
        const height = this.templateData.editor.getContentHeight();
        if (!this.templateData.editor.hasModel()) {
            this._debug(`Cell Editor Height Change without model, return (2), ContentHeight: ${height}, CodeCellLayoutInfo.EditorWidth ${this.viewCell.layoutInfo.editorWidth}, EditorLayoutInfo ${this.templateData.editor.getLayoutInfo()}`);
        }
        this._debug(`Cell Editor Height Change (${dbgReasonForChange}): ${height}`);
        this._debug(`**** Updating Cell Editor Height (2), ContentHeight: ${height}, CodeCellLayoutInfo.EditorWidth ${this.viewCell.layoutInfo.editorWidth}, EditorLayoutInfo ${this.templateData.editor.getLayoutInfo().height} ****`);
        const viewLayout = this.templateData.editor.getLayoutInfo();
        this.viewCell.editorHeight = height;
        this.relayoutCell();
        this.layoutEditor({
            width: viewLayout.width,
            height
        });
        this._cellLayout.layoutEditor(dbgReasonForChange);
    }
    relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
    }
    dispose() {
        this._isDisposed = true;
        // move focus back to the cell list otherwise the focus goes to body
        if (this.shouldPreserveEditor()) {
            // now the focus is on the monaco editor for the cell but detached from the rows.
            this.editorPool.preserveFocusedEditor(this.viewCell);
        }
        this.viewCell.detachTextEditor();
        this._removeInputCollapsePreview();
        this._outputContainerRenderer.dispose();
        this._pendingLayout?.dispose();
        super.dispose();
    }
};
CodeCell = __decorate([
    __param(4, IInstantiationService),
    __param(5, IKeybindingService),
    __param(6, ILanguageService),
    __param(7, IConfigurationService),
    __param(8, INotebookExecutionStateService),
    __param(9, INotebookLoggingService)
], CodeCell);
export { CodeCell };
export class CodeCellLayout {
    get editorVisibility() {
        return this._editorVisibility;
    }
    get isUpdatingLayout() {
        return this._isUpdatingLayout;
    }
    constructor(_enabled, notebookEditor, viewCell, templateData, _logService, _initialEditorDimension) {
        this._enabled = _enabled;
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.templateData = templateData;
        this._logService = _logService;
        this._initialEditorDimension = _initialEditorDimension;
        this._initialized = false;
        this._pointerDown = false;
    }
    setPointerDown(isDown) {
        this._pointerDown = isDown;
    }
    /**
     * Dynamically lays out the code cell's Monaco editor to simulate a "sticky" run/exec area while
     * constraining the visible editor height to the notebook viewport. It adjusts two things:
     *  - The absolute `top` offset of the editor part inside the cell (so the run / execution order
     *    area remains visible for a limited vertical travel band ~45px).
     *  - The editor's layout height plus the editor's internal scroll position (`editorScrollTop`) to
     *    crop content when the cell is partially visible (top or bottom clipped) or when content is
     *    taller than the viewport.
     *
     * ---------------------------------------------------------------------------
     * SECTION 1. OVERALL NOTEBOOK VIEW (EACH CELL HAS AN 18px GAP ABOVE IT)
     * Legend:
     *   GAP (between cells & before first cell) ............. 18px
     *   CELL PADDING (top & bottom inside cell) ............. 6px
     *   STATUS BAR HEIGHT (typical) ......................... 22px
     *   LINE HEIGHT (logic clamp) ........................... 21px
     *   BORDER/OUTLINE HEIGHT (visual conceal adjustment) ... 1px
     *   EDITOR_HEIGHT (example visible editor) .............. 200px (capped by viewport)
     *   EDITOR_CONTENT_HEIGHT (example full content) ........ 380px (e.g. 50 lines)
     *   extraOffset = -(CELL_PADDING + BORDER_HEIGHT) ....... -7
     *
     *   (The list ensures the editor's laid out height never exceeds viewport height.)
     *
     *   ┌────────────────────────────── Notebook Viewport (scrolling container) ────────────────────────────┐
     *   │ (scrollTop)                                                                                       │
     *   │                                                                                                   │
     *   │  18px GAP (top spacing before first cell)                                                         │
     *   │  ▼                                                                                                │
     *   │  ┌──────── Cell A Outer Container ────────────────────────────────────────────────────────────┐   │
     *   │  │ ▲ 6px top padding                                                                          │   │
     *   │  │ │                                                                                          │   │
     *   │  │ │  ┌─ Execution Order / Run Column (~45px vertical travel band)─┐  ┌─ Editor Part ───────┐ │   │
     *   │  │ │  │ (Run button, execution # label)                            │  │ Visible Lines ...   │ │   │
     *   │  │ │  │                                                            │  │                     │ │   │
     *   │  │ │  │                                                            │  │ EDITOR_HEIGHT=200px │ │   │
     *   │  │ │  │                                                            │  │ (Content=380px)     │ │   │
     *   │  │ │  └────────────────────────────────────────────────────────────┘  └─────────────────────┘ │   │
     *   │  │ │                                                                                          │   │
     *   │  │ │  ┌─ Status Bar (22px) ─────────────────────────────────────────────────────────────────┐ │   │
     *   │  │ │  │ language | indent | selection info | kernel/status bits ...                         │ │   │
     *   │  │ │  └─────────────────────────────────────────────────────────────────────────────────────┘ │   │
     *   │  │ │                                                                                          │   │
     *   │  │ ▼ 6px bottom padding                                                                       │   │
     *   │  └────────────────────────────────────────────────────────────────────────────────────────────┘   │
     *   │  18px GAP                                                                                         │
     *   │  ┌──────── Cell B Outer Container ────────────────────────────────────────────────────────────┐   │
     *   │  │ (same structure as Cell A)                                                                 │   │
     *   │  └────────────────────────────────────────────────────────────────────────────────────────────┘   │
     *   │                                                                                                   │
     *   │ (scrollBottom)                                                                                    │
     *   └───────────────────────────────────────────────────────────────────────────────────────────────────┘
     *
     * SECTION 2. SINGLE CELL STRUCTURE (VERTICAL LAYERS)
     *
     *   Inter-Cell GAP (18px)
     *   ┌─────────────────────────────── Cell Wrapper (<li>) ──────────────────────────────┐
     *   │ ┌──────────────────────────── .cell-inner-container ───────────────────────────┐ │
     *   │ │ 6px top padding                                                              │ │
     *   │ │                                                                              │ │
     *   │ │ ┌─ Left Gutter (Run / Exec / Focus Border) ─┬──────── Editor Part ─────────┐ │ │
     *   │ │ │  Sticky vertical travel (~45px allowance) │  (Monaco surface)            │ │ │
     *   │ │ │                                         │  Visible height 200px          │ │ │
     *   │ │ │                                         │  Content height 380px          │ │ │
     *   │ │ └─────────────────────────────────────────┴────────────────────────────────┘ │ │
     *   │ │                                                                              │ │
     *   │ │ ┌─ Status Bar (22px) ──────────────────────────────────────────────────────┐ │ │
     *   │ │ │ language | indent | selection | kernel | state                           │ │ │
     *   │ │ └──────────────────────────────────────────────────────────────────────────┘ │ │
     *   │ │ 6px bottom padding                                                           │ │
     *   │ └──────────────────────────────────────────────────────────────────────────────┘ │
     *   │ (Outputs region begins at outputContainerOffset below input area)                │
     *   └──────────────────────────────────────────────────────────────────────────────────┘
     */
    layoutEditor(reason) {
        if (!this._enabled) {
            return;
        }
        const element = this.templateData.editorPart;
        if (this.viewCell.isInputCollapsed) {
            element.style.top = '';
            return;
        }
        const LINE_HEIGHT = this.notebookEditor.getLayoutInfo().fontInfo.lineHeight; // 21;
        const CELL_TOP_MARGIN = this.viewCell.layoutInfo.topMargin;
        const CELL_OUTLINE_WIDTH = this.viewCell.layoutInfo.outlineWidth; // 1 extra px for border (we don't want to be able to see the cell border when scrolling up);
        const STATUSBAR_HEIGHT = this.viewCell.layoutInfo.statusBarHeight;
        const editor = this.templateData.editor;
        const editorLayout = this.templateData.editor.getLayoutInfo();
        // If we've already initialized once, we should use the viewCell layout info for editor width.
        // E.g. when resizing VS Code window or notebook editor (horizontal space changes).
        const editorWidth = this._initialized && (reason === 'nbLayoutChange' || reason === 'viewCellLayoutChange') ? this.viewCell.layoutInfo.editorWidth : editorLayout.width;
        const editorHeight = this.viewCell.layoutInfo.editorHeight;
        const scrollTop = this.notebookEditor.scrollTop;
        const elementTop = this.notebookEditor.getAbsoluteTopOfElement(this.viewCell);
        const elementBottom = this.notebookEditor.getAbsoluteBottomOfElement(this.viewCell);
        const elementHeight = this.notebookEditor.getHeightOfElement(this.viewCell);
        const gotContentHeight = editor.getContentHeight();
        const editorContentHeight = Math.max((gotContentHeight === -1 ? editor.getLayoutInfo().height : gotContentHeight), gotContentHeight === -1 ? this._initialEditorDimension.height : gotContentHeight); // || this.calculatedEditorHeight || 0;
        const editorBottom = elementTop + this.viewCell.layoutInfo.outputContainerOffset;
        const scrollBottom = this.notebookEditor.scrollBottom;
        // When loading, scrollBottom -scrollTop === 0;
        const viewportHeight = scrollBottom - scrollTop === 0 ? this.notebookEditor.getLayoutInfo().height : scrollBottom - scrollTop;
        const outputContainerOffset = this.viewCell.layoutInfo.outputContainerOffset;
        const scrollDirection = typeof this._previousScrollBottom === 'number' ? (scrollBottom < this._previousScrollBottom ? 'up' : 'down') : 'down';
        this._previousScrollBottom = scrollBottom;
        let top = Math.max(0, scrollTop - elementTop - CELL_TOP_MARGIN - CELL_OUTLINE_WIDTH);
        const possibleEditorHeight = editorHeight - top;
        if (possibleEditorHeight < LINE_HEIGHT) {
            top = top - (LINE_HEIGHT - possibleEditorHeight) - CELL_OUTLINE_WIDTH;
        }
        let height = editorContentHeight;
        let editorScrollTop = 0;
        if (scrollTop <= (elementTop + CELL_TOP_MARGIN)) {
            const minimumEditorHeight = LINE_HEIGHT + this.notebookEditor.notebookOptions.getLayoutConfiguration().editorTopPadding;
            if (scrollBottom >= editorBottom) {
                height = clamp(editorContentHeight, minimumEditorHeight, editorContentHeight);
                this._editorVisibility = 'Full';
            }
            else {
                height = clamp(scrollBottom - (elementTop + CELL_TOP_MARGIN) - STATUSBAR_HEIGHT, minimumEditorHeight, editorContentHeight) + (2 * CELL_OUTLINE_WIDTH); // We don't want bottom border to be visible.;
                this._editorVisibility = 'Bottom Clipped';
                editorScrollTop = 0;
            }
        }
        else {
            if (viewportHeight <= editorContentHeight && scrollBottom <= editorBottom) {
                const minimumEditorHeight = LINE_HEIGHT + this.notebookEditor.notebookOptions.getLayoutConfiguration().editorTopPadding;
                height = clamp(viewportHeight - STATUSBAR_HEIGHT, minimumEditorHeight, editorContentHeight - STATUSBAR_HEIGHT) + (2 * CELL_OUTLINE_WIDTH); // We don't want bottom border to be visible.
                this._editorVisibility = 'Full (Small Viewport)';
                editorScrollTop = top;
            }
            else {
                const minimumEditorHeight = LINE_HEIGHT;
                height = clamp(editorContentHeight - (scrollTop - (elementTop + CELL_TOP_MARGIN)), minimumEditorHeight, editorContentHeight);
                // Check if the cell is visible.
                if (scrollTop > editorBottom) {
                    this._editorVisibility = 'Invisible';
                }
                else {
                    this._editorVisibility = 'Top Clipped';
                }
                editorScrollTop = editorContentHeight - height;
            }
        }
        this._logService.debug(`${reason} (${this._editorVisibility})`);
        this._logService.debug(`=> Editor Top = ${top}px (editHeight = ${editorHeight}, editContentHeight: ${editorContentHeight})`);
        this._logService.debug(`=> eleTop = ${elementTop}, eleBottom = ${elementBottom}, eleHeight = ${elementHeight}`);
        this._logService.debug(`=> scrollTop = ${scrollTop}, top = ${top}`);
        this._logService.debug(`=> cellTopMargin = ${CELL_TOP_MARGIN}, cellBottomMargin = ${this.viewCell.layoutInfo.topMargin}, cellOutline = ${CELL_OUTLINE_WIDTH}`);
        this._logService.debug(`=> scrollBottom: ${scrollBottom}, editBottom: ${editorBottom}, viewport: ${viewportHeight}, scroll: ${scrollDirection}, contOffset: ${outputContainerOffset})`);
        this._logService.debug(`=> Editor Height = ${height}px, Width: ${editorWidth}px, Initial Width: ${this._initialEditorDimension.width}, EditorScrollTop = ${editorScrollTop}px, StatusbarHeight = ${STATUSBAR_HEIGHT}, lineHeight = ${this.notebookEditor.getLayoutInfo().fontInfo.lineHeight}`);
        try {
            this._isUpdatingLayout = true;
            element.style.top = `${top}px`;
            editor.layout({
                width: this._initialized ? editorWidth : this._initialEditorDimension.width,
                height
            }, true);
            // Option 3: Avoid programmatic scrollTop changes while user is actively dragging selection
            if (!this._pointerDown && editorScrollTop >= 0) {
                this._lastChangedEditorScrolltop = editorScrollTop;
                editor.setScrollTop(editorScrollTop);
            }
        }
        finally {
            this._initialized = true;
            this._isUpdatingLayout = false;
            this._logService.debug('Updated Editor Layout');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jb2RlQ2VsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxpQ0FBaUM7QUFFakMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUd2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV4RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUs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
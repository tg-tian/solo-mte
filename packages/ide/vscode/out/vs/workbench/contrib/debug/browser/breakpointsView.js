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
var BreakpointsFolderRenderer_1, BreakpointsRenderer_1, FunctionBreakpointsRenderer_1, DataBreakpointsRenderer_1, InstructionBreakpointsRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { Gesture } from '../../../../base/browser/touch.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Action } from '../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../nls.js';
import { getActionBarActions, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleObjectTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { BREAKPOINTS_VIEW_ID, BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_HAS_MODES, CONTEXT_BREAKPOINT_INPUT_FOCUSED, CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES, CONTEXT_BREAKPOINT_ITEM_TYPE, CONTEXT_BREAKPOINT_SUPPORTS_CONDITION, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_IN_DEBUG_MODE, CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, DEBUG_SCHEME, DebuggerString, IDebugService } from '../common/debug.js';
import { Breakpoint, DataBreakpoint, ExceptionBreakpoint, FunctionBreakpoint, InstructionBreakpoint } from '../common/debugModel.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import * as icons from './debugIcons.js';
import { equals } from '../../../../base/common/arrays.js';
const $ = dom.$;
function createCheckbox(disposables) {
    const checkbox = $('input');
    checkbox.type = 'checkbox';
    checkbox.tabIndex = -1;
    disposables.add(Gesture.ignoreTarget(checkbox));
    return checkbox;
}
const MAX_VISIBLE_BREAKPOINTS = 9;
export function getExpandedBodySize(model, sessionId, countLimit) {
    const length = model.getBreakpoints().length + model.getExceptionBreakpointsForSession(sessionId).length + model.getFunctionBreakpoints().length + model.getDataBreakpoints().length + model.getInstructionBreakpoints().length;
    return Math.min(countLimit, length) * 22;
}
/**
 * Represents a file node in the breakpoints tree that groups breakpoints by file.
 */
export class BreakpointsFolderItem {
    constructor(uri, breakpoints) {
        this.uri = uri;
        this.breakpoints = breakpoints;
    }
    getId() {
        return this.uri.toString();
    }
    get enabled() {
        return this.breakpoints.every(bp => bp.enabled);
    }
    get indeterminate() {
        const enabledCount = this.breakpoints.filter(bp => bp.enabled).length;
        return enabledCount > 0 && enabledCount < this.breakpoints.length;
    }
}
function getModeKindForBreakpoint(breakpoint) {
    const kind = breakpoint instanceof Breakpoint ? 'source' : breakpoint instanceof InstructionBreakpoint ? 'instruction' : 'exception';
    return kind;
}
let BreakpointsView = class BreakpointsView extends ViewPane {
    getPresentation() {
        return this.configurationService.getValue('debug.breakpointsView.presentation');
    }
    constructor(options, contextMenuService, debugService, keybindingService, instantiationService, themeService, editorService, contextViewService, configurationService, viewDescriptorService, contextKeyService, openerService, labelService, menuService, hoverService, languageService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.editorService = editorService;
        this.contextViewService = contextViewService;
        this.labelService = labelService;
        this.languageService = languageService;
        this.needsRefresh = false;
        this.needsStateChange = false;
        this.ignoreLayout = false;
        this.collapsedState = new Set();
        this.menu = menuService.createMenu(MenuId.DebugBreakpointsContext, contextKeyService);
        this._register(this.menu);
        this.breakpointItemType = CONTEXT_BREAKPOINT_ITEM_TYPE.bindTo(contextKeyService);
        this.breakpointIsDataBytes = CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES.bindTo(contextKeyService);
        this.breakpointHasMultipleModes = CONTEXT_BREAKPOINT_HAS_MODES.bindTo(contextKeyService);
        this.breakpointSupportsCondition = CONTEXT_BREAKPOINT_SUPPORTS_CONDITION.bindTo(contextKeyService);
        this.breakpointInputFocused = CONTEXT_BREAKPOINT_INPUT_FOCUSED.bindTo(contextKeyService);
        this._register(this.debugService.getModel().onDidChangeBreakpoints(() => this.onBreakpointsChange()));
        this._register(this.debugService.getViewModel().onDidFocusSession(() => this.onBreakpointsChange()));
        this._register(this.debugService.onDidChangeState(() => this.onStateChange()));
        this.hintDelayer = this._register(new RunOnceScheduler(() => this.updateBreakpointsHint(true), 4000));
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-breakpoints');
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleObjectTree), 'BreakpointsView', container, new BreakpointsDelegate(this), [
            this.instantiationService.createInstance(BreakpointsFolderRenderer),
            this.instantiationService.createInstance(BreakpointsRenderer, this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType),
            new ExceptionBreakpointsRenderer(this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType, this.debugService, this.hoverService),
            new ExceptionBreakpointInputRenderer(this, this.debugService, this.contextViewService),
            this.instantiationService.createInstance(FunctionBreakpointsRenderer, this.menu, this.breakpointSupportsCondition, this.breakpointItemType),
            new FunctionBreakpointInputRenderer(this, this.debugService, this.contextViewService, this.hoverService, this.labelService),
            this.instantiationService.createInstance(DataBreakpointsRenderer, this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType, this.breakpointIsDataBytes),
            new DataBreakpointInputRenderer(this, this.debugService, this.contextViewService, this.hoverService, this.labelService),
            this.instantiationService.createInstance(InstructionBreakpointsRenderer),
        ], {
            compressionEnabled: this.getPresentation() === 'tree',
            hideTwistiesOfChildlessElements: true,
            identityProvider: {
                getId: (element) => element.getId()
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (element) => {
                    if (element instanceof BreakpointsFolderItem) {
                        return resources.basenameOrAuthority(element.uri);
                    }
                    if (element instanceof Breakpoint) {
                        return `${resources.basenameOrAuthority(element.uri)}:${element.lineNumber}`;
                    }
                    if (element instanceof FunctionBreakpoint) {
                        return element.name;
                    }
                    if (element instanceof DataBreakpoint) {
                        return element.description;
                    }
                    if (element instanceof ExceptionBreakpoint) {
                        return element.label || element.filter;
                    }
                    if (element instanceof InstructionBreakpoint) {
                        return `0x${element.address.toString(16)}`;
                    }
                    return '';
                },
                getCompressedNodeKeyboardNavigationLabel: (elements) => {
                    return elements.map(e => {
                        if (e instanceof BreakpointsFolderItem) {
                            return resources.basenameOrAuthority(e.uri);
                        }
                        return '';
                    }).join('/');
                }
            },
            accessibilityProvider: new BreakpointsAccessibilityProvider(this.debugService, this.labelService),
            multipleSelectionSupport: false,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        this._register(this.tree);
        CONTEXT_BREAKPOINTS_FOCUSED.bindTo(this.tree.contextKeyService);
        this._register(this.tree.onContextMenu(this.onTreeContextMenu, this));
        this._register(this.tree.onMouseMiddleClick(async ({ element }) => {
            if (element instanceof Breakpoint) {
                await this.debugService.removeBreakpoints(element.getId());
            }
            else if (element instanceof FunctionBreakpoint) {
                await this.debugService.removeFunctionBreakpoints(element.getId());
            }
            else if (element instanceof DataBreakpoint) {
                await this.debugService.removeDataBreakpoints(element.getId());
            }
            else if (element instanceof InstructionBreakpoint) {
                await this.debugService.removeInstructionBreakpoints(element.instructionReference, element.offset);
            }
            else if (element instanceof BreakpointsFolderItem) {
                await this.debugService.removeBreakpoints(element.breakpoints.map(bp => bp.getId()));
            }
        }));
        this._register(this.tree.onDidOpen(async (e) => {
            const element = e.element;
            if (!element) {
                return;
            }
            if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.button === 1) { // middle click
                return;
            }
            if (element instanceof Breakpoint) {
                openBreakpointSource(element, e.sideBySide, e.editorOptions.preserveFocus || false, e.editorOptions.pinned || !e.editorOptions.preserveFocus, this.debugService, this.editorService);
            }
            if (element instanceof InstructionBreakpoint) {
                const disassemblyView = await this.editorService.openEditor(DisassemblyViewInput.instance);
                // Focus on double click
                disassemblyView.goToInstructionAndOffset(element.instructionReference, element.offset, dom.isMouseEvent(e.browserEvent) && e.browserEvent.detail === 2);
            }
            if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.detail === 2 && element instanceof FunctionBreakpoint && element !== this.inputBoxData?.breakpoint) {
                // double click
                this.renderInputBox({ breakpoint: element, type: 'name' });
            }
        }));
        // Track collapsed state and update size (items are collapsed by default)
        this._register(this.tree.onDidChangeCollapseState(e => {
            const element = e.node.element;
            if (element instanceof BreakpointsFolderItem) {
                if (e.node.collapsed) {
                    this.collapsedState.add(element.getId());
                }
                else {
                    this.collapsedState.delete(element.getId());
                }
                this.updateSize();
            }
        }));
        // React to configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.breakpointsView.presentation')) {
                const presentation = this.getPresentation();
                this.tree.updateOptions({ compressionEnabled: presentation === 'tree' });
                this.onBreakpointsChange();
            }
        }));
        this.setTreeInput();
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible) {
                if (this.needsRefresh) {
                    this.onBreakpointsChange();
                }
                if (this.needsStateChange) {
                    this.onStateChange();
                }
            }
        }));
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        this._register(containerModel.onDidChangeAllViewDescriptors(() => {
            this.updateSize();
        }));
    }
    renderHeaderTitle(container, title) {
        super.renderHeaderTitle(container, title);
        const iconLabelContainer = dom.append(container, $('span.breakpoint-warning'));
        this.hintContainer = this._register(new IconLabel(iconLabelContainer, {
            supportIcons: true, hoverDelegate: {
                showHover: (options, focus) => this.hoverService.showInstantHover({ content: options.content, target: this.hintContainer.element }, focus),
                delay: this.configurationService.getValue('workbench.hover.delay')
            }
        }));
        dom.hide(this.hintContainer.element);
    }
    focus() {
        super.focus();
        this.tree?.domFocus();
    }
    renderInputBox(data) {
        this._inputBoxData = data;
        this.onBreakpointsChange();
        this._inputBoxData = undefined;
    }
    get inputBoxData() {
        return this._inputBoxData;
    }
    layoutBody(height, width) {
        if (this.ignoreLayout) {
            return;
        }
        super.layoutBody(height, width);
        this.tree?.layout(height, width);
        try {
            this.ignoreLayout = true;
            this.updateSize();
        }
        finally {
            this.ignoreLayout = false;
        }
    }
    onTreeContextMenu(e) {
        const element = e.element;
        if (element instanceof BreakpointsFolderItem) {
            // For folder items, show file-level context menu
            this.breakpointItemType.set('breakpointFolder');
            const { secondary } = getContextMenuActions(this.menu.getActions({ arg: element, shouldForwardArgs: false }), 'inline');
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => secondary,
                getActionsContext: () => element
            });
            return;
        }
        const type = element instanceof Breakpoint ? 'breakpoint' : element instanceof ExceptionBreakpoint ? 'exceptionBreakpoint' :
            element instanceof FunctionBreakpoint ? 'functionBreakpoint' : element instanceof DataBreakpoint ? 'dataBreakpoint' :
                element instanceof InstructionBreakpoint ? 'instructionBreakpoint' : undefined;
        this.breakpointItemType.set(type);
        const session = this.debugService.getViewModel().focusedSession;
        const conditionSupported = element instanceof ExceptionBreakpoint ? element.supportsCondition : (!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointSupportsCondition.set(conditionSupported);
        this.breakpointIsDataBytes.set(element instanceof DataBreakpoint && element.src.type === 1 /* DataBreakpointSetType.Address */);
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes(getModeKindForBreakpoint(element)).length > 1);
        const { secondary } = getContextMenuActions(this.menu.getActions({ arg: e.element, shouldForwardArgs: false }), 'inline');
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => secondary,
            getActionsContext: () => element
        });
    }
    updateSize() {
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        // Calculate visible row count from tree's content height
        // Each row is 22px high
        const rowHeight = 22;
        this.minimumBodySize = this.orientation === 0 /* Orientation.VERTICAL */ ? Math.min(MAX_VISIBLE_BREAKPOINTS * rowHeight, this.tree.contentHeight) : 170;
        this.maximumBodySize = this.orientation === 0 /* Orientation.VERTICAL */ && containerModel.visibleViewDescriptors.length > 1 ? this.tree.contentHeight : Number.POSITIVE_INFINITY;
    }
    updateBreakpointsHint(delayed = false) {
        if (!this.hintContainer) {
            return;
        }
        const currentType = this.debugService.getViewModel().focusedSession?.configuration.type;
        const dbg = currentType ? this.debugService.getAdapterManager().getDebugger(currentType) : undefined;
        const message = dbg?.strings?.[DebuggerString.UnverifiedBreakpoints];
        const debuggerHasUnverifiedBps = message && this.debugService.getModel().getBreakpoints().filter(bp => {
            if (bp.verified || !bp.enabled) {
                return false;
            }
            const langId = this.languageService.guessLanguageIdByFilepathOrFirstLine(bp.uri);
            return langId && dbg.interestedInLanguage(langId);
        });
        if (message && debuggerHasUnverifiedBps?.length && this.debugService.getModel().areBreakpointsActivated()) {
            if (delayed) {
                const mdown = new MarkdownString(undefined, { isTrusted: true }).appendMarkdown(message);
                this.hintContainer.setLabel('$(warning)', undefined, { title: { markdown: mdown, markdownNotSupportedFallback: message } });
                dom.show(this.hintContainer.element);
            }
            else {
                this.hintDelayer.schedule();
            }
        }
        else {
            dom.hide(this.hintContainer.element);
        }
    }
    onBreakpointsChange() {
        if (this.isBodyVisible()) {
            if (this.tree) {
                this.setTreeInput();
                this.needsRefresh = false;
            }
            this.updateBreakpointsHint();
            this.updateSize();
        }
        else {
            this.needsRefresh = true;
        }
    }
    onStateChange() {
        if (this.isBodyVisible()) {
            this.needsStateChange = false;
            const thread = this.debugService.getViewModel().focusedThread;
            let found = false;
            if (thread && thread.stoppedDetails && thread.stoppedDetails.hitBreakpointIds && thread.stoppedDetails.hitBreakpointIds.length > 0) {
                const hitBreakpointIds = thread.stoppedDetails.hitBreakpointIds;
                const elements = this.flatElements;
                const hitElement = elements.find(e => {
                    const id = e.getIdFromAdapter(thread.session.getId());
                    return typeof id === 'number' && hitBreakpointIds.indexOf(id) !== -1;
                });
                if (hitElement) {
                    this.tree.setFocus([hitElement]);
                    this.tree.setSelection([hitElement]);
                    found = true;
                    this.autoFocusedElement = hitElement;
                }
            }
            if (!found) {
                // Deselect breakpoint in breakpoint view when no longer stopped on it #125528
                const focus = this.tree.getFocus();
                const selection = this.tree.getSelection();
                if (this.autoFocusedElement && equals(focus, selection) && selection.includes(this.autoFocusedElement)) {
                    this.tree.setFocus([]);
                    this.tree.setSelection([]);
                }
                this.autoFocusedElement = undefined;
            }
            this.updateBreakpointsHint();
        }
        else {
            this.needsStateChange = true;
        }
    }
    setTreeInput() {
        const treeInput = this.getTreeElements();
        this.tree.setChildren(null, treeInput);
    }
    getTreeElements() {
        const model = this.debugService.getModel();
        const sessionId = this.debugService.getViewModel().focusedSession?.getId();
        const showAsTree = this.getPresentation() === 'tree';
        const result = [];
        // Exception breakpoints at the top (root level)
        for (const exBp of model.getExceptionBreakpointsForSession(sessionId)) {
            result.push({ element: exBp, incompressible: true });
        }
        // Function breakpoints (root level)
        for (const funcBp of model.getFunctionBreakpoints()) {
            result.push({ element: funcBp, incompressible: true });
        }
        // Data breakpoints (root level)
        for (const dataBp of model.getDataBreakpoints()) {
            result.push({ element: dataBp, incompressible: true });
        }
        // Source breakpoints - group by file if showAsTree is enabled
        const sourceBreakpoints = model.getBreakpoints();
        if (showAsTree && sourceBreakpoints.length > 0) {
            // Group breakpoints by URI
            const breakpointsByUri = new Map();
            for (const bp of sourceBreakpoints) {
                const key = bp.uri.toString();
                if (!breakpointsByUri.has(key)) {
                    breakpointsByUri.set(key, []);
                }
                breakpointsByUri.get(key).push(bp);
            }
            // Create folder items for each file
            for (const [uriStr, breakpoints] of breakpointsByUri) {
                const uri = URI.parse(uriStr);
                const folderItem = new BreakpointsFolderItem(uri, breakpoints);
                // Sort breakpoints by line number
                breakpoints.sort((a, b) => a.lineNumber - b.lineNumber);
                const children = breakpoints.map(bp => ({
                    element: bp,
                    incompressible: false
                }));
                result.push({
                    element: folderItem,
                    incompressible: false,
                    collapsed: this.collapsedState.has(folderItem.getId()) || !this.collapsedState.has(`_init_${folderItem.getId()}`),
                    children
                });
                // Mark as initialized (will be collapsed by default on first render)
                if (!this.collapsedState.has(`_init_${folderItem.getId()}`)) {
                    this.collapsedState.add(`_init_${folderItem.getId()}`);
                    this.collapsedState.add(folderItem.getId());
                }
            }
        }
        else {
            // Flat mode - just add all source breakpoints
            for (const bp of sourceBreakpoints) {
                result.push({ element: bp, incompressible: true });
            }
        }
        // Instruction breakpoints (root level)
        for (const instrBp of model.getInstructionBreakpoints()) {
            result.push({ element: instrBp, incompressible: true });
        }
        return result;
    }
    get flatElements() {
        const model = this.debugService.getModel();
        const sessionId = this.debugService.getViewModel().focusedSession?.getId();
        const elements = model.getExceptionBreakpointsForSession(sessionId).concat(model.getFunctionBreakpoints()).concat(model.getDataBreakpoints()).concat(model.getBreakpoints()).concat(model.getInstructionBreakpoints());
        return elements;
    }
};
BreakpointsView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IEditorService),
    __param(7, IContextViewService),
    __param(8, IConfigurationService),
    __param(9, IViewDescriptorService),
    __param(10, IContextKeyService),
    __param(11, IOpenerService),
    __param(12, ILabelService),
    __param(13, IMenuService),
    __param(14, IHoverService),
    __param(15, ILanguageService)
], BreakpointsView);
export { BreakpointsView };
class BreakpointsDelegate {
    constructor(view) {
        this.view = view;
        // noop
    }
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof BreakpointsFolderItem) {
            return BreakpointsFolderRenderer.ID;
        }
        if (element instanceof Breakpoint) {
            return BreakpointsRenderer.ID;
        }
        if (element instanceof FunctionBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (!element.name || (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId())) {
                return FunctionBreakpointInputRenderer.ID;
            }
            return FunctionBreakpointsRenderer.ID;
        }
        if (element instanceof ExceptionBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId()) {
                return ExceptionBreakpointInputRenderer.ID;
            }
            return ExceptionBreakpointsRenderer.ID;
        }
        if (element instanceof DataBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId()) {
                return DataBreakpointInputRenderer.ID;
            }
            return DataBreakpointsRenderer.ID;
        }
        if (element instanceof InstructionBreakpoint) {
            return InstructionBreakpointsRenderer.ID;
        }
        return '';
    }
}
const breakpointIdToActionBarDomeNode = new Map();
let BreakpointsFolderRenderer = class BreakpointsFolderRenderer {
    static { BreakpointsFolderRenderer_1 = this; }
    static { this.ID = 'breakpointFolder'; }
    constructor(debugService, labelService, hoverService) {
        this.debugService = debugService;
        this.labelService = labelService;
        this.hoverService = hoverService;
    }
    get templateId() {
        return BreakpointsFolderRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.container = container;
        container.classList.add('breakpoint', 'breakpoint-folder');
        data.templateDisposables.add(toDisposable(() => {
            container.classList.remove('breakpoint', 'breakpoint-folder');
        }));
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            const enabled = data.checkbox.checked;
            for (const bp of data.context.breakpoints) {
                this.debugService.enableOrDisableBreakpoints(enabled, bp);
            }
        }));
        dom.append(data.container, data.checkbox);
        data.name = dom.append(data.container, $('span.name'));
        dom.append(data.container, $('span.file-path'));
        data.actionBar = new ActionBar(data.container);
        data.templateDisposables.add(data.actionBar);
        return data;
    }
    renderElement(node, _index, data) {
        const folderItem = node.element;
        data.context = folderItem;
        data.name.textContent = this.labelService.getUriBasenameLabel(folderItem.uri);
        data.container.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        const fullPath = this.labelService.getUriLabel(folderItem.uri, { relative: true });
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.container, fullPath));
        // Set checkbox state
        if (folderItem.indeterminate) {
            data.checkbox.checked = false;
            data.checkbox.indeterminate = true;
        }
        else {
            data.checkbox.indeterminate = false;
            data.checkbox.checked = folderItem.enabled;
        }
        // Add remove action
        data.actionBar.clear();
        const removeAction = data.elementDisposables.add(new Action('debug.removeBreakpointsInFile', localize('removeBreakpointsInFile', "Remove Breakpoints in File"), ThemeIcon.asClassName(Codicon.close), true, async () => {
            for (const bp of folderItem.breakpoints) {
                await this.debugService.removeBreakpoints(bp.getId());
            }
        }));
        data.actionBar.push(removeAction, { icon: true, label: false });
    }
    renderCompressedElements(node, _index, data) {
        const elements = node.element.elements;
        const folderItem = elements[elements.length - 1];
        data.context = folderItem;
        // For compressed nodes, show the combined path
        const names = elements.map(e => resources.basenameOrAuthority(e.uri));
        data.name.textContent = names.join('/');
        const fullPath = this.labelService.getUriLabel(folderItem.uri, { relative: true });
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.container, fullPath));
        // Set checkbox state
        if (folderItem.indeterminate) {
            data.checkbox.checked = false;
            data.checkbox.indeterminate = true;
        }
        else {
            data.checkbox.indeterminate = false;
            data.checkbox.checked = folderItem.enabled;
        }
        // Add remove action
        data.actionBar.clear();
        const removeAction = data.elementDisposables.add(new Action('debug.removeBreakpointsInFile', localize('removeBreakpointsInFile', "Remove Breakpoints in File"), ThemeIcon.asClassName(Codicon.close), true, async () => {
            for (const bp of folderItem.breakpoints) {
                await this.debugService.removeBreakpoints(bp.getId());
            }
        }));
        data.actionBar.push(removeAction, { icon: true, label: false });
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
BreakpointsFolderRenderer = BreakpointsFolderRenderer_1 = __decorate([
    __param(0, IDebugService),
    __param(1, ILabelService),
    __param(2, IHoverService)
], BreakpointsFolderRenderer);
let BreakpointsRenderer = class BreakpointsRenderer {
    static { BreakpointsRenderer_1 = this; }
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, debugService, hoverService, labelService, textModelService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.textModelService = textModelService;
        // noop
    }
    static { this.ID = 'breakpoints'; }
    get templateId() {
        return BreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = container;
        container.classList.add('breakpoint');
        data.templateDisposables.add(toDisposable(() => {
            container.classList.remove('breakpoint');
        }));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.filePath = dom.append(data.breakpoint, $('span.file-path'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(node, index, data) {
        const breakpoint = node.element;
        data.context = breakpoint;
        if (node.depth > 1) {
            this.renderBreakpointLineLabel(breakpoint, data);
        }
        else {
            this.renderBreakpointFileLabel(breakpoint, data);
        }
        this.renderBreakpointCommon(breakpoint, data);
    }
    renderCompressedElements(node, index, data) {
        const breakpoint = node.element.elements[node.element.elements.length - 1];
        data.context = breakpoint;
        this.renderBreakpointFileLabel(breakpoint, data);
        this.renderBreakpointCommon(breakpoint, data);
    }
    renderBreakpointCommon(breakpoint, data) {
        data.breakpoint.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        let badgeContent = breakpoint.lineNumber.toString();
        if (breakpoint.column) {
            badgeContent += `:${breakpoint.column}`;
        }
        if (breakpoint.modeLabel) {
            badgeContent = `${breakpoint.modeLabel}: ${badgeContent}`;
        }
        data.badge.textContent = badgeContent;
        data.checkbox.checked = breakpoint.enabled;
        const { message, icon } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), breakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, breakpoint.message || message || ''));
        const debugActive = this.debugService.state === 3 /* State.Running */ || this.debugService.state === 2 /* State.Stopped */;
        if (debugActive && !breakpoint.verified) {
            data.breakpoint.classList.add('disabled');
        }
        const session = this.debugService.getViewModel().focusedSession;
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointItemType.set('breakpoint');
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('source').length > 1);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: breakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(breakpoint.getId(), data.actionBar.domNode);
    }
    renderBreakpointFileLabel(breakpoint, data) {
        data.name.textContent = resources.basenameOrAuthority(breakpoint.uri);
        data.filePath.textContent = this.labelService.getUriLabel(resources.dirname(breakpoint.uri), { relative: true });
    }
    renderBreakpointLineLabel(breakpoint, data) {
        data.name.textContent = localize('loading', "Loading...");
        data.filePath.textContent = '';
        this.textModelService.createModelReference(breakpoint.uri).then(reference => {
            if (data.context !== breakpoint) {
                reference.dispose();
                return;
            }
            data.elementDisposables.add(reference);
            const model = reference.object.textEditorModel;
            if (model && breakpoint.lineNumber <= model.getLineCount()) {
                const lineContent = model.getLineContent(breakpoint.lineNumber).trim();
                data.name.textContent = lineContent || localize('emptyLine', "(empty line)");
            }
            else {
                data.name.textContent = localize('lineNotFound', "(line not found)");
            }
        }).catch(() => {
            if (data.context === breakpoint) {
                data.name.textContent = localize('cannotLoadLine', "(cannot load line)");
            }
        });
    }
    disposeElement(node, index, template) {
        template.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
BreakpointsRenderer = BreakpointsRenderer_1 = __decorate([
    __param(4, IDebugService),
    __param(5, IHoverService),
    __param(6, ILabelService),
    __param(7, ITextModelService)
], BreakpointsRenderer);
class ExceptionBreakpointsRenderer {
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, debugService, hoverService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        // noop
    }
    static { this.ID = 'exceptionbreakpoints'; }
    get templateId() {
        return ExceptionBreakpointsRenderer.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.breakpoint.classList.add('exception');
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(node, index, data) {
        const exceptionBreakpoint = node.element;
        this.renderExceptionBreakpoint(exceptionBreakpoint, data);
    }
    renderCompressedElements(node, index, data) {
        const exceptionBreakpoint = node.element.elements[node.element.elements.length - 1];
        this.renderExceptionBreakpoint(exceptionBreakpoint, data);
    }
    renderExceptionBreakpoint(exceptionBreakpoint, data) {
        data.context = exceptionBreakpoint;
        data.name.textContent = exceptionBreakpoint.label || `${exceptionBreakpoint.filter} exceptions`;
        const exceptionBreakpointtitle = exceptionBreakpoint.verified ? (exceptionBreakpoint.description || data.name.textContent) : exceptionBreakpoint.message || localize('unverifiedExceptionBreakpoint', "Unverified Exception Breakpoint");
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, exceptionBreakpointtitle));
        data.breakpoint.classList.toggle('disabled', !exceptionBreakpoint.verified);
        data.checkbox.checked = exceptionBreakpoint.enabled;
        data.condition.textContent = exceptionBreakpoint.condition || '';
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.condition, localize('expressionCondition', "Expression condition: {0}", exceptionBreakpoint.condition)));
        if (exceptionBreakpoint.modeLabel) {
            data.badge.textContent = exceptionBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        this.breakpointSupportsCondition.set(exceptionBreakpoint.supportsCondition);
        this.breakpointItemType.set('exceptionBreakpoint');
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('exception').length > 1);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: exceptionBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(exceptionBreakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
let FunctionBreakpointsRenderer = class FunctionBreakpointsRenderer {
    static { FunctionBreakpointsRenderer_1 = this; }
    constructor(menu, breakpointSupportsCondition, breakpointItemType, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'functionbreakpoints'; }
    get templateId() {
        return FunctionBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(node, _index, data) {
        this.renderFunctionBreakpoint(node.element, data);
    }
    renderCompressedElements(node, _index, data) {
        this.renderFunctionBreakpoint(node.element.elements[node.element.elements.length - 1], data);
    }
    renderFunctionBreakpoint(functionBreakpoint, data) {
        data.context = functionBreakpoint;
        data.name.textContent = functionBreakpoint.name;
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = functionBreakpoint.enabled;
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, message ? message : ''));
        if (functionBreakpoint.condition && functionBreakpoint.hitCondition) {
            data.condition.textContent = localize('expressionAndHitCount', "Condition: {0} | Hit Count: {1}", functionBreakpoint.condition, functionBreakpoint.hitCondition);
        }
        else {
            data.condition.textContent = functionBreakpoint.condition || functionBreakpoint.hitCondition || '';
        }
        if (functionBreakpoint.modeLabel) {
            data.badge.textContent = functionBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        // Mark function breakpoints as disabled if deactivated or if debug type does not support them #9099
        const session = this.debugService.getViewModel().focusedSession;
        data.breakpoint.classList.toggle('disabled', (session && !session.capabilities.supportsFunctionBreakpoints) || !this.debugService.getModel().areBreakpointsActivated());
        if (session && !session.capabilities.supportsFunctionBreakpoints) {
            data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, localize('functionBreakpointsNotSupported', "Function breakpoints are not supported by this debug type")));
        }
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointItemType.set('functionBreakpoint');
        const { primary } = getActionBarActions(this.menu.getActions({ arg: functionBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(functionBreakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
FunctionBreakpointsRenderer = FunctionBreakpointsRenderer_1 = __decorate([
    __param(3, IDebugService),
    __param(4, IHoverService),
    __param(5, ILabelService)
], FunctionBreakpointsRenderer);
let DataBreakpointsRenderer = class DataBreakpointsRenderer {
    static { DataBreakpointsRenderer_1 = this; }
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, breakpointIsDataBytes, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.breakpointIsDataBytes = breakpointIsDataBytes;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'databreakpoints'; }
    get templateId() {
        return DataBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.accessType = dom.append(data.breakpoint, $('span.access-type'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(node, _index, data) {
        this.renderDataBreakpoint(node.element, data);
    }
    renderCompressedElements(node, _index, data) {
        this.renderDataBreakpoint(node.element.elements[node.element.elements.length - 1], data);
    }
    renderDataBreakpoint(dataBreakpoint, data) {
        data.context = dataBreakpoint;
        data.name.textContent = dataBreakpoint.description;
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = dataBreakpoint.enabled;
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, message ? message : ''));
        if (dataBreakpoint.modeLabel) {
            data.badge.textContent = dataBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        // Mark data breakpoints as disabled if deactivated or if debug type does not support them
        const session = this.debugService.getViewModel().focusedSession;
        data.breakpoint.classList.toggle('disabled', (session && !session.capabilities.supportsDataBreakpoints) || !this.debugService.getModel().areBreakpointsActivated());
        if (session && !session.capabilities.supportsDataBreakpoints) {
            data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, localize('dataBreakpointsNotSupported', "Data breakpoints are not supported by this debug type")));
        }
        if (dataBreakpoint.accessType) {
            const accessType = dataBreakpoint.accessType === 'read' ? localize('read', "Read") : dataBreakpoint.accessType === 'write' ? localize('write', "Write") : localize('access', "Access");
            data.accessType.textContent = accessType;
        }
        else {
            data.accessType.textContent = '';
        }
        if (dataBreakpoint.condition && dataBreakpoint.hitCondition) {
            data.condition.textContent = localize('expressionAndHitCount', "Condition: {0} | Hit Count: {1}", dataBreakpoint.condition, dataBreakpoint.hitCondition);
        }
        else {
            data.condition.textContent = dataBreakpoint.condition || dataBreakpoint.hitCondition || '';
        }
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('data').length > 1);
        this.breakpointItemType.set('dataBreakpoint');
        this.breakpointIsDataBytes.set(dataBreakpoint.src.type === 1 /* DataBreakpointSetType.Address */);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: dataBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(dataBreakpoint.getId(), data.actionBar.domNode);
        this.breakpointIsDataBytes.reset();
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
DataBreakpointsRenderer = DataBreakpointsRenderer_1 = __decorate([
    __param(5, IDebugService),
    __param(6, IHoverService),
    __param(7, ILabelService)
], DataBreakpointsRenderer);
let InstructionBreakpointsRenderer = class InstructionBreakpointsRenderer {
    static { InstructionBreakpointsRenderer_1 = this; }
    constructor(debugService, hoverService, labelService) {
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'instructionBreakpoints'; }
    get templateId() {
        return InstructionBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.address = dom.append(data.breakpoint, $('span.file-path'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(node, index, data) {
        this.renderInstructionBreakpoint(node.element, data);
    }
    renderCompressedElements(node, index, data) {
        this.renderInstructionBreakpoint(node.element.elements[node.element.elements.length - 1], data);
    }
    renderInstructionBreakpoint(breakpoint, data) {
        data.context = breakpoint;
        data.breakpoint.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        data.name.textContent = '0x' + breakpoint.address.toString(16);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.name, localize('debug.decimal.address', "Decimal Address: {0}", breakpoint.address.toString())));
        data.checkbox.checked = breakpoint.enabled;
        const { message, icon } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), breakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, breakpoint.message || message || ''));
        const debugActive = this.debugService.state === 3 /* State.Running */ || this.debugService.state === 2 /* State.Stopped */;
        if (debugActive && !breakpoint.verified) {
            data.breakpoint.classList.add('disabled');
        }
        if (breakpoint.modeLabel) {
            data.badge.textContent = breakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
InstructionBreakpointsRenderer = InstructionBreakpointsRenderer_1 = __decorate([
    __param(0, IDebugService),
    __param(1, IHoverService),
    __param(2, ILabelService)
], InstructionBreakpointsRenderer);
class FunctionBreakpointInputRenderer {
    constructor(view, debugService, contextViewService, hoverService, labelService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
        this.labelService = labelService;
    }
    static { this.ID = 'functionbreakpointinput'; }
    get templateId() {
        return FunctionBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const template = Object.create(null);
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        template.icon = $('.icon');
        template.checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, template.icon);
        dom.append(breakpoint, template.checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, { inputBoxStyles: defaultInputBoxStyles });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            template.updating = true;
            try {
                this.view.breakpointInputFocused.set(false);
                const id = template.breakpoint.getId();
                if (success) {
                    if (template.type === 'name') {
                        this.debugService.updateFunctionBreakpoint(id, { name: inputBox.value });
                    }
                    if (template.type === 'condition') {
                        this.debugService.updateFunctionBreakpoint(id, { condition: inputBox.value });
                    }
                    if (template.type === 'hitCount') {
                        this.debugService.updateFunctionBreakpoint(id, { hitCondition: inputBox.value });
                    }
                }
                else {
                    if (template.type === 'name' && !template.breakpoint.name) {
                        this.debugService.removeFunctionBreakpoints(id);
                    }
                    else {
                        this.view.renderInputBox(undefined);
                    }
                }
            }
            finally {
                template.updating = false;
            }
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            if (!template.updating) {
                wrapUp(!!inputBox.value);
            }
        }));
        template.inputBox = inputBox;
        template.elementDisposables = new DisposableStore();
        template.templateDisposables = toDispose;
        template.templateDisposables.add(template.elementDisposables);
        return template;
    }
    renderElement(node, _index, data) {
        const functionBreakpoint = node.element;
        data.breakpoint = functionBreakpoint;
        data.type = this.view.inputBoxData?.type || 'name'; // If there is no type set take the 'name' as the default
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = functionBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = functionBreakpoint.name || '';
        let placeholder = localize('functionBreakpointPlaceholder', "Function to break on");
        let ariaLabel = localize('functionBreakPointInputAriaLabel', "Type function breakpoint.");
        if (data.type === 'condition') {
            data.inputBox.value = functionBreakpoint.condition || '';
            placeholder = localize('functionBreakpointExpressionPlaceholder', "Break when expression evaluates to true");
            ariaLabel = localize('functionBreakPointExpresionAriaLabel', "Type expression. Function breakpoint will break when expression evaluates to true");
        }
        else if (data.type === 'hitCount') {
            data.inputBox.value = functionBreakpoint.hitCondition || '';
            placeholder = localize('functionBreakpointHitCountPlaceholder', "Break when hit count is met");
            ariaLabel = localize('functionBreakPointHitCountAriaLabel', "Type hit count. Function breakpoint will break when hit count is met.");
        }
        data.inputBox.setAriaLabel(ariaLabel);
        data.inputBox.setPlaceHolder(placeholder);
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    renderCompressedElements(node, _index, data) {
        // Function breakpoints are not compressible
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class DataBreakpointInputRenderer {
    constructor(view, debugService, contextViewService, hoverService, labelService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
        this.labelService = labelService;
    }
    static { this.ID = 'databreakpointinput'; }
    get templateId() {
        return DataBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const template = Object.create(null);
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        template.icon = $('.icon');
        template.checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, template.icon);
        dom.append(breakpoint, template.checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, { inputBoxStyles: defaultInputBoxStyles });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            template.updating = true;
            try {
                this.view.breakpointInputFocused.set(false);
                const id = template.breakpoint.getId();
                if (success) {
                    if (template.type === 'condition') {
                        this.debugService.updateDataBreakpoint(id, { condition: inputBox.value });
                    }
                    if (template.type === 'hitCount') {
                        this.debugService.updateDataBreakpoint(id, { hitCondition: inputBox.value });
                    }
                }
                else {
                    this.view.renderInputBox(undefined);
                }
            }
            finally {
                template.updating = false;
            }
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            if (!template.updating) {
                wrapUp(!!inputBox.value);
            }
        }));
        template.inputBox = inputBox;
        template.elementDisposables = new DisposableStore();
        template.templateDisposables = toDispose;
        template.templateDisposables.add(template.elementDisposables);
        return template;
    }
    renderElement(node, _index, data) {
        const dataBreakpoint = node.element;
        data.breakpoint = dataBreakpoint;
        data.type = this.view.inputBoxData?.type || 'condition'; // If there is no type set take the 'condition' as the default
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ?? ''));
        data.checkbox.checked = dataBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = '';
        let placeholder = '';
        let ariaLabel = '';
        if (data.type === 'condition') {
            data.inputBox.value = dataBreakpoint.condition || '';
            placeholder = localize('dataBreakpointExpressionPlaceholder', "Break when expression evaluates to true");
            ariaLabel = localize('dataBreakPointExpresionAriaLabel', "Type expression. Data breakpoint will break when expression evaluates to true");
        }
        else if (data.type === 'hitCount') {
            data.inputBox.value = dataBreakpoint.hitCondition || '';
            placeholder = localize('dataBreakpointHitCountPlaceholder', "Break when hit count is met");
            ariaLabel = localize('dataBreakPointHitCountAriaLabel', "Type hit count. Data breakpoint will break when hit count is met.");
        }
        data.inputBox.setAriaLabel(ariaLabel);
        data.inputBox.setPlaceHolder(placeholder);
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    renderCompressedElements(node, _index, data) {
        // Data breakpoints are not compressible
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class ExceptionBreakpointInputRenderer {
    constructor(view, debugService, contextViewService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        // noop
    }
    static { this.ID = 'exceptionbreakpointinput'; }
    get templateId() {
        return ExceptionBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        breakpoint.classList.add('exception');
        const checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
            ariaLabel: localize('exceptionBreakpointAriaLabel', "Type exception breakpoint condition"),
            inputBoxStyles: defaultInputBoxStyles
        });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            if (!templateData.currentBreakpoint) {
                return;
            }
            this.view.breakpointInputFocused.set(false);
            let newCondition = templateData.currentBreakpoint.condition;
            if (success) {
                newCondition = inputBox.value !== '' ? inputBox.value : undefined;
            }
            this.debugService.setExceptionBreakpointCondition(templateData.currentBreakpoint, newCondition);
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            // Need to react with a timeout on the blur event due to possible concurent splices #56443
            setTimeout(() => {
                wrapUp(true);
            });
        }));
        const elementDisposables = new DisposableStore();
        toDispose.add(elementDisposables);
        const templateData = {
            inputBox,
            checkbox,
            templateDisposables: toDispose,
            elementDisposables: new DisposableStore(),
        };
        return templateData;
    }
    renderElement(node, _index, data) {
        const exceptionBreakpoint = node.element;
        const placeHolder = exceptionBreakpoint.conditionDescription || localize('exceptionBreakpointPlaceholder', "Break when expression evaluates to true");
        data.inputBox.setPlaceHolder(placeHolder);
        data.currentBreakpoint = exceptionBreakpoint;
        data.checkbox.checked = exceptionBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = exceptionBreakpoint.condition || '';
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    renderCompressedElements(node, _index, data) {
        // Exception breakpoints are not compressible
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class BreakpointsAccessibilityProvider {
    constructor(debugService, labelService) {
        this.debugService = debugService;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('breakpoints', "Breakpoints");
    }
    getRole() {
        return 'checkbox';
    }
    isChecked(element) {
        if (element instanceof BreakpointsFolderItem) {
            return element.enabled;
        }
        return element.enabled;
    }
    getAriaLabel(element) {
        if (element instanceof BreakpointsFolderItem) {
            return localize('breakpointFolder', "Breakpoints in {0}, {1} breakpoints", resources.basenameOrAuthority(element.uri), element.breakpoints.length);
        }
        if (element instanceof ExceptionBreakpoint) {
            return element.toString();
        }
        const { message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), element, this.labelService, this.debugService.getModel());
        const toString = element.toString();
        return message ? `${toString}, ${message}` : toString;
    }
}
export function openBreakpointSource(breakpoint, sideBySide, preserveFocus, pinned, debugService, editorService) {
    if (breakpoint.uri.scheme === DEBUG_SCHEME && debugService.state === 0 /* State.Inactive */) {
        return Promise.resolve(undefined);
    }
    const selection = breakpoint.endLineNumber ? {
        startLineNumber: breakpoint.lineNumber,
        endLineNumber: breakpoint.endLineNumber,
        startColumn: breakpoint.column || 1,
        endColumn: breakpoint.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
    } : {
        startLineNumber: breakpoint.lineNumber,
        startColumn: breakpoint.column || 1,
        endLineNumber: breakpoint.lineNumber,
        endColumn: breakpoint.column || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
    };
    return editorService.openEditor({
        resource: breakpoint.uri,
        options: {
            preserveFocus,
            selection,
            revealIfOpened: true,
            selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            pinned
        }
    }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
}
export function getBreakpointMessageAndIcon(state, breakpointsActivated, breakpoint, labelService, debugModel) {
    const debugActive = state === 3 /* State.Running */ || state === 2 /* State.Stopped */;
    const breakpointIcon = breakpoint instanceof DataBreakpoint ? icons.dataBreakpoint : breakpoint instanceof FunctionBreakpoint ? icons.functionBreakpoint : breakpoint.logMessage ? icons.logBreakpoint : icons.breakpoint;
    if (!breakpoint.enabled || !breakpointsActivated) {
        return {
            icon: breakpointIcon.disabled,
            message: breakpoint.logMessage ? localize('disabledLogpoint', "Disabled Logpoint") : localize('disabledBreakpoint', "Disabled Breakpoint"),
        };
    }
    const appendMessage = (text) => {
        return ('message' in breakpoint && breakpoint.message) ? text.concat(', ' + breakpoint.message) : text;
    };
    if (debugActive && breakpoint instanceof Breakpoint && breakpoint.pending) {
        return {
            icon: icons.breakpoint.pending
        };
    }
    if (debugActive && !breakpoint.verified) {
        return {
            icon: breakpointIcon.unverified,
            message: ('message' in breakpoint && breakpoint.message) ? breakpoint.message : (breakpoint.logMessage ? localize('unverifiedLogpoint', "Unverified Logpoint") : localize('unverifiedBreakpoint', "Unverified Breakpoint")),
            showAdapterUnverifiedMessage: true
        };
    }
    if (breakpoint instanceof DataBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('dataBreakpointUnsupported', "Data breakpoints not supported by this debug type"),
            };
        }
        return {
            icon: breakpointIcon.regular,
            message: breakpoint.message || localize('dataBreakpoint', "Data Breakpoint")
        };
    }
    if (breakpoint instanceof FunctionBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('functionBreakpointUnsupported', "Function breakpoints not supported by this debug type"),
            };
        }
        const messages = [];
        messages.push(breakpoint.message || localize('functionBreakpoint', "Function Breakpoint"));
        if (breakpoint.condition) {
            messages.push(localize('expression', "Condition: {0}", breakpoint.condition));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', "Hit Count: {0}", breakpoint.hitCondition));
        }
        return {
            icon: breakpointIcon.regular,
            message: appendMessage(messages.join('\n'))
        };
    }
    if (breakpoint instanceof InstructionBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('instructionBreakpointUnsupported', "Instruction breakpoints not supported by this debug type"),
            };
        }
        const messages = [];
        if (breakpoint.message) {
            messages.push(breakpoint.message);
        }
        else if (breakpoint.instructionReference) {
            messages.push(localize('instructionBreakpointAtAddress', "Instruction breakpoint at address {0}", breakpoint.instructionReference));
        }
        else {
            messages.push(localize('instructionBreakpoint', "Instruction breakpoint"));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', "Hit Count: {0}", breakpoint.hitCondition));
        }
        return {
            icon: breakpointIcon.regular,
            message: appendMessage(messages.join('\n'))
        };
    }
    // can change this when all breakpoint supports dependent breakpoint condition
    let triggeringBreakpoint;
    if (breakpoint instanceof Breakpoint && breakpoint.triggeredBy) {
        triggeringBreakpoint = debugModel.getBreakpoints().find(bp => bp.getId() === breakpoint.triggeredBy);
    }
    if (breakpoint.logMessage || breakpoint.condition || breakpoint.hitCondition || triggeringBreakpoint) {
        const messages = [];
        let icon = breakpoint.logMessage ? icons.logBreakpoint.regular : icons.conditionalBreakpoint.regular;
        if (!breakpoint.supported) {
            icon = icons.debugBreakpointUnsupported;
            messages.push(localize('breakpointUnsupported', "Breakpoints of this type are not supported by the debugger"));
        }
        if (breakpoint.logMessage) {
            messages.push(localize('logMessage', "Log Message: {0}", breakpoint.logMessage));
        }
        if (breakpoint.condition) {
            messages.push(localize('expression', "Condition: {0}", breakpoint.condition));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', "Hit Count: {0}", breakpoint.hitCondition));
        }
        if (triggeringBreakpoint) {
            messages.push(localize('triggeredBy', "Hit after breakpoint: {0}", `${labelService.getUriLabel(triggeringBreakpoint.uri, { relative: true })}: ${triggeringBreakpoint.lineNumber}`));
        }
        return {
            icon,
            message: appendMessage(messages.join('\n'))
        };
    }
    const message = ('message' in breakpoint && breakpoint.message) ? breakpoint.message : breakpoint instanceof Breakpoint && labelService ? labelService.getUriLabel(breakpoint.uri) : localize('breakpoint', "Breakpoint");
    return {
        icon: breakpointIcon.regular,
        message
    };
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.addFunctionBreakpointAction',
            title: {
                ...localize2('addFunctionBreakpoint', "Add Function Breakpoint"),
                mnemonicTitle: localize({ key: 'miFunctionBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Function Breakpoint..."),
            },
            f1: true,
            icon: icons.watchExpressionsAddFuncBreakpoint,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 10,
                    when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
                }, {
                    id: MenuId.MenubarNewBreakpointMenu,
                    group: '1_breakpoints',
                    order: 3,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        const viewService = accessor.get(IViewsService);
        await viewService.openView(BREAKPOINTS_VIEW_ID);
        debugService.addFunctionBreakpoint();
    }
});
class MemoryBreakpointAction extends Action2 {
    async run(accessor, existingBreakpoint) {
        const debugService = accessor.get(IDebugService);
        const session = debugService.getViewModel().focusedSession;
        if (!session) {
            return;
        }
        let defaultValue = undefined;
        if (existingBreakpoint && existingBreakpoint.src.type === 1 /* DataBreakpointSetType.Address */) {
            defaultValue = `${existingBreakpoint.src.address} + ${existingBreakpoint.src.bytes}`;
        }
        const quickInput = accessor.get(IQuickInputService);
        const notifications = accessor.get(INotificationService);
        const range = await this.getRange(quickInput, defaultValue);
        if (!range) {
            return;
        }
        let info;
        try {
            info = await session.dataBytesBreakpointInfo(range.address, range.bytes);
        }
        catch (e) {
            notifications.error(localize('dataBreakpointError', "Failed to set data breakpoint at {0}: {1}", range.address, e.message));
        }
        if (!info?.dataId) {
            return;
        }
        let accessType = 'write';
        if (info.accessTypes && info.accessTypes?.length > 1) {
            const accessTypes = info.accessTypes.map(type => ({ label: type }));
            const selectedAccessType = await quickInput.pick(accessTypes, { placeHolder: localize('dataBreakpointAccessType', "Select the access type to monitor") });
            if (!selectedAccessType) {
                return;
            }
            accessType = selectedAccessType.label;
        }
        const src = { type: 1 /* DataBreakpointSetType.Address */, ...range };
        if (existingBreakpoint) {
            await debugService.removeDataBreakpoints(existingBreakpoint.getId());
        }
        await debugService.addDataBreakpoint({
            description: info.description,
            src,
            canPersist: true,
            accessTypes: info.accessTypes,
            accessType: accessType,
            initialSessionData: { session, dataId: info.dataId }
        });
    }
    getRange(quickInput, defaultValue) {
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            const input = disposables.add(quickInput.createInputBox());
            input.prompt = localize('dataBreakpointMemoryRangePrompt', "Enter a memory range in which to break");
            input.placeholder = localize('dataBreakpointMemoryRangePlaceholder', 'Absolute range (0x1234 - 0x1300) or range of bytes after an address (0x1234 + 0xff)');
            if (defaultValue) {
                input.value = defaultValue;
                input.valueSelection = [0, defaultValue.length];
            }
            disposables.add(input.onDidChangeValue(e => {
                const err = this.parseAddress(e, false);
                input.validationMessage = err?.error;
            }));
            disposables.add(input.onDidAccept(() => {
                const r = this.parseAddress(input.value, true);
                if ('error' in r) {
                    input.validationMessage = r.error;
                }
                else {
                    resolve(r);
                }
                input.dispose();
            }));
            disposables.add(input.onDidHide(() => {
                resolve(undefined);
                disposables.dispose();
            }));
            input.ignoreFocusOut = true;
            input.show();
        });
    }
    parseAddress(range, isFinal) {
        const parts = /^(\S+)\s*(?:([+-])\s*(\S+))?/.exec(range);
        if (!parts) {
            return { error: localize('dataBreakpointAddrFormat', 'Address should be a range of numbers the form "[Start] - [End]" or "[Start] + [Bytes]"') };
        }
        const isNum = (e) => isFinal ? /^0x[0-9a-f]*|[0-9]*$/i.test(e) : /^0x[0-9a-f]+|[0-9]+$/i.test(e);
        const [, startStr, sign = '+', endStr = '1'] = parts;
        for (const n of [startStr, endStr]) {
            if (!isNum(n)) {
                return { error: localize('dataBreakpointAddrStartEnd', 'Number must be a decimal integer or hex value starting with \"0x\", got {0}', n) };
            }
        }
        if (!isFinal) {
            return;
        }
        const start = BigInt(startStr);
        const end = BigInt(endStr);
        const address = `0x${start.toString(16)}`;
        if (sign === '-') {
            if (start > end) {
                return { error: localize('dataBreakpointAddrOrder', 'End ({1}) should be greater than Start ({0})', startStr, endStr) };
            }
            return { address, bytes: Number(end - start) };
        }
        return { address, bytes: Number(end) };
    }
}
registerAction2(class extends MemoryBreakpointAction {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.addDataBreakpointOnAddress',
            title: {
                ...localize2('addDataBreakpointOnAddress', "Add Data Breakpoint at Address"),
                mnemonicTitle: localize({ key: 'miDataBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Data Breakpoint..."),
            },
            f1: true,
            icon: icons.watchExpressionsAddDataBreakpoint,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 11,
                    when: ContextKeyExpr.and(CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID))
                }, {
                    id: MenuId.MenubarNewBreakpointMenu,
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED
                }]
        });
    }
});
registerAction2(class extends MemoryBreakpointAction {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.editDataBreakpointOnAddress',
            title: localize2('editDataBreakpointOnAddress', "Edit Address..."),
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    when: ContextKeyExpr.and(CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES),
                    group: 'navigation',
                    order: 15,
                }]
        });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.toggleBreakpointsActivatedAction',
            title: localize2('activateBreakpoints', 'Toggle Activate Breakpoints'),
            f1: true,
            icon: icons.breakpointsActivate,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 20,
                when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
            }
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.setBreakpointsActivated(!debugService.getModel().areBreakpointsActivated());
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.removeBreakpoint',
            title: localize('removeBreakpoint', "Remove Breakpoint"),
            icon: Codicon.removeClose,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: '3_modification',
                    order: 10,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')
                }, {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'inline',
                    order: 20,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')
                }]
        });
    }
    async run(accessor, breakpoint) {
        const debugService = accessor.get(IDebugService);
        if (breakpoint instanceof Breakpoint) {
            await debugService.removeBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof FunctionBreakpoint) {
            await debugService.removeFunctionBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof DataBreakpoint) {
            await debugService.removeDataBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof InstructionBreakpoint) {
            await debugService.removeInstructionBreakpoints(breakpoint.instructionReference, breakpoint.offset);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.removeAllBreakpoints',
            title: {
                ...localize2('removeAllBreakpoints', "Remove All Breakpoints"),
                mnemonicTitle: localize({ key: 'miRemoveAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "Remove &&All Breakpoints"),
            },
            f1: true,
            icon: icons.breakpointsRemoveAll,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 30,
                    when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
                }, {
                    id: MenuId.DebugBreakpointsContext,
                    group: '3_modification',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 3,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.removeBreakpoints();
        debugService.removeFunctionBreakpoints();
        debugService.removeDataBreakpoints();
        debugService.removeInstructionBreakpoints();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.enableAllBreakpoints',
            title: {
                ...localize2('enableAllBreakpoints', "Enable All Breakpoints"),
                mnemonicTitle: localize({ key: 'miEnableAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "&&Enable All Breakpoints"),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 10,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 1,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.enableOrDisableBreakpoints(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.disableAllBreakpoints',
            title: {
                ...localize2('disableAllBreakpoints', "Disable All Breakpoints"),
                mnemonicTitle: localize({ key: 'miDisableAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "Disable A&&ll Breakpoints"),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 2,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.enableOrDisableBreakpoints(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.reapplyBreakpointsAction',
            title: localize2('reapplyAllBreakpoints', 'Reapply All Breakpoints'),
            f1: true,
            precondition: CONTEXT_IN_DEBUG_MODE,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 30,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'))
                }]
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.setBreakpointsActivated(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.toggleBreakpointsPresentation',
            title: localize2('toggleBreakpointsPresentation', "Toggle Breakpoints View Presentation"),
            f1: true,
            icon: icons.breakpointsViewIcon,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 10,
                when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const currentPresentation = configurationService.getValue('debug.breakpointsView.presentation');
        const newPresentation = currentPresentation === 'tree' ? 'list' : 'tree';
        await configurationService.updateValue('debug.breakpointsView.presentation', newPresentation);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editBreakpoint',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editCondition', "Edit Condition..."),
            icon: Codicon.edit,
            precondition: CONTEXT_BREAKPOINT_SUPPORTS_CONDITION,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('functionBreakpoint'),
                    group: 'navigation',
                    order: 10
                }, {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'inline',
                    order: 10
                }]
        });
    }
    async runInView(accessor, view, breakpoint) {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        if (breakpoint instanceof Breakpoint) {
            const editor = await openBreakpointSource(breakpoint, false, false, true, debugService, editorService);
            if (editor) {
                const codeEditor = editor.getControl();
                if (isCodeEditor(codeEditor)) {
                    codeEditor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)?.showBreakpointWidget(breakpoint.lineNumber, breakpoint.column);
                }
            }
        }
        else if (breakpoint instanceof FunctionBreakpoint) {
            const contextMenuService = accessor.get(IContextMenuService);
            const actions = [new Action('breakpoint.editCondition', localize('editCondition', "Edit Condition..."), undefined, true, async () => view.renderInputBox({ breakpoint, type: 'condition' })),
                new Action('breakpoint.editCondition', localize('editHitCount', "Edit Hit Count..."), undefined, true, async () => view.renderInputBox({ breakpoint, type: 'hitCount' }))];
            const domNode = breakpointIdToActionBarDomeNode.get(breakpoint.getId());
            if (domNode) {
                contextMenuService.showContextMenu({
                    getActions: () => actions,
                    getAnchor: () => domNode,
                    onHide: () => dispose(actions)
                });
            }
        }
        else {
            view.renderInputBox({ breakpoint, type: 'condition' });
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editFunctionBreakpoint',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editBreakpoint', "Edit Function Condition..."),
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 10,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('functionBreakpoint')
                }]
        });
    }
    runInView(_accessor, view, breakpoint) {
        view.renderInputBox({ breakpoint, type: 'name' });
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editFunctionBreakpointHitCount',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editHitCount', "Edit Hit Count..."),
            precondition: CONTEXT_BREAKPOINT_SUPPORTS_CONDITION,
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.or(CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('functionBreakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('dataBreakpoint'))
                }]
        });
    }
    runInView(_accessor, view, breakpoint) {
        view.renderInputBox({ breakpoint, type: 'hitCount' });
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editBreakpointMode',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editMode', "Edit Mode..."),
            menu: [{
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINT_HAS_MODES, ContextKeyExpr.or(CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('breakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('exceptionBreakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('instructionBreakpoint')))
                }]
        });
    }
    async runInView(accessor, view, breakpoint) {
        const debugService = accessor.get(IDebugService);
        const kind = getModeKindForBreakpoint(breakpoint);
        const modes = debugService.getModel().getBreakpointModes(kind);
        const picked = await accessor.get(IQuickInputService).pick(modes.map(mode => ({ label: mode.label, description: mode.description, mode: mode.mode })), { placeHolder: localize('selectBreakpointMode', "Select Breakpoint Mode") });
        if (!picked) {
            return;
        }
        if (kind === 'source') {
            const data = new Map();
            data.set(breakpoint.getId(), { mode: picked.mode, modeLabel: picked.label });
            debugService.updateBreakpoints(breakpoint.originalUri, data, false);
        }
        else if (breakpoint instanceof InstructionBreakpoint) {
            debugService.removeInstructionBreakpoints(breakpoint.instructionReference, breakpoint.offset);
            debugService.addInstructionBreakpoint({ ...breakpoint.toJSON(), mode: picked.mode, modeLabel: picked.label });
        }
        else if (breakpoint instanceof ExceptionBreakpoint) {
            breakpoint.mode = picked.mode;
            breakpoint.modeLabel = picked.label;
            debugService.setExceptionBreakpointCondition(breakpoint, breakpoint.condition); // no-op to trigger a re-send
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvYnJlYWtwb2ludHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFL0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQU81RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RixPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFN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
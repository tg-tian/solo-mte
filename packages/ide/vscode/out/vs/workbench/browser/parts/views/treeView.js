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
var TreeRenderer_1;
import { DataTransfers } from '../../../../base/browser/dnd.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { CollapseAllAction } from '../../../../base/browser/ui/tree/treeDefaults.js';
import { ActionRunner, Separator } from '../../../../base/common/actions.js';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { isMarkdownString, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/views.css';
import { VSDataTransfer } from '../../../../base/common/dataTransfer.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { FileThemeIcon, FolderThemeIcon, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { fillEditorsDragData } from '../../dnd.js';
import { ResourceLabels } from '../../labels.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID } from '../editor/editorCommands.js';
import { getLocationBasedViewColors, ViewPane } from './viewPane.js';
import { Extensions, IViewDescriptorService, ResolvableTreeItem, TreeItemCollapsibleState } from '../../../common/views.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { CodeDataTransfers, LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { toExternalVSDataTransfer } from '../../../../editor/browser/dataTransfer.js';
import { CheckboxStateHandler, TreeItemCheckbox } from './checkbox.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { ITreeViewsDnDService } from '../../../../editor/common/services/treeViewsDndService.js';
import { DraggedTreeItemsIdentifier } from '../../../../editor/common/services/treeViewsDnd.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IAccessibleViewInformationService } from '../../../services/accessibility/common/accessibleViewInformationService.js';
let TreeViewPane = class TreeViewPane extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, notificationService, hoverService, accessibleViewService) {
        super({ ...options, titleMenuId: MenuId.ViewTitle, donotForwardArgs: false }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService);
        const { treeView } = Registry.as(Extensions.ViewsRegistry).getView(options.id);
        this.treeView = treeView;
        this._register(this.treeView.onDidChangeActions(() => this.updateActions(), this));
        this._register(this.treeView.onDidChangeTitle((newTitle) => this.updateTitle(newTitle)));
        this._register(this.treeView.onDidChangeDescription((newDescription) => this.updateTitleDescription(newDescription)));
        this._register(toDisposable(() => {
            if (this._container && this.treeView.container && (this._container === this.treeView.container)) {
                this.treeView.setVisibility(false);
            }
        }));
        this._register(this.onDidChangeBodyVisibility(() => this.updateTreeVisibility()));
        this._register(this.treeView.onDidChangeWelcomeState(() => this._onDidChangeViewWelcomeState.fire()));
        if (options.title !== this.treeView.title) {
            this.updateTitle(this.treeView.title);
        }
        if (options.titleDescription !== this.treeView.description) {
            this.updateTitleDescription(this.treeView.description);
        }
        this._actionRunner = this._register(new MultipleSelectionActionRunner(notificationService, () => this.treeView.getSelection()));
        this.updateTreeVisibility();
    }
    focus() {
        super.focus();
        this.treeView.focus();
    }
    renderBody(container) {
        this._container = container;
        super.renderBody(container);
        this.renderTreeView(container);
    }
    shouldShowWelcome() {
        return ((this.treeView.dataProvider === undefined) || !!this.treeView.dataProvider.isTreeEmpty) && ((this.treeView.message === undefined) || (this.treeView.message === ''));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.layoutTreeView(height, width);
    }
    getOptimalWidth() {
        return this.treeView.getOptimalWidth();
    }
    renderTreeView(container) {
        this.treeView.show(container);
    }
    layoutTreeView(height, width) {
        this.treeView.layout(height, width);
    }
    updateTreeVisibility() {
        this.treeView.setVisibility(this.isBodyVisible());
    }
    getActionRunner() {
        return this._actionRunner;
    }
    getActionsContext() {
        return { $treeViewId: this.id, $focusedTreeItem: true, $selectedTreeItems: true };
    }
};
TreeViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, INotificationService),
    __param(10, IHoverService),
    __param(11, IAccessibleViewInformationService)
], TreeViewPane);
export { TreeViewPane };
class Root {
    constructor() {
        this.label = { label: 'root' };
        this.handle = '0';
        this.parentHandle = undefined;
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
        this.children = undefined;
    }
}
function commandPreconditions(commandId) {
    const command = CommandsRegistry.getCommand(commandId);
    if (command) {
        const commandAction = MenuRegistry.getCommand(command.id);
        return commandAction?.precondition;
    }
    return undefined;
}
function isTreeCommandEnabled(treeCommand, contextKeyService) {
    const commandId = treeCommand.originalId ? treeCommand.originalId : treeCommand.id;
    const precondition = commandPreconditions(commandId);
    if (precondition) {
        return contextKeyService.contextMatchesRules(precondition);
    }
    return true;
}
function isRenderedMessageValue(messageValue) {
    return !!messageValue && typeof messageValue !== 'string' && !!messageValue.element && !!messageValue.disposables;
}
const noDataProviderMessage = localize('no-dataprovider', "There is no data provider registered that can provide view data.");
export const RawCustomTreeViewContextKey = new RawContextKey('customTreeView', false);
class Tree extends WorkbenchAsyncDataTree {
}
let AbstractTreeView = class AbstractTreeView extends Disposable {
    get onDidExpandItem() { return this._onDidExpandItem.event; }
    get onDidCollapseItem() { return this._onDidCollapseItem.event; }
    get onDidChangeSelectionAndFocus() { return this._onDidChangeSelectionAndFocus.event; }
    get onDidChangeVisibility() { return this._onDidChangeVisibility.event; }
    get onDidChangeActions() { return this._onDidChangeActions.event; }
    get onDidChangeWelcomeState() { return this._onDidChangeWelcomeState.event; }
    get onDidChangeTitle() { return this._onDidChangeTitle.event; }
    get onDidChangeDescription() { return this._onDidChangeDescription.event; }
    get onDidChangeCheckboxState() { return this._onDidChangeCheckboxState.event; }
    constructor(id, _title, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keybindingService, notificationService, viewDescriptorService, hoverService, contextKeyService, activityService, logService, openerService, markdownRendererService) {
        super();
        this.id = id;
        this._title = _title;
        this.themeService = themeService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.progressService = progressService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.viewDescriptorService = viewDescriptorService;
        this.hoverService = hoverService;
        this.contextKeyService = contextKeyService;
        this.activityService = activityService;
        this.logService = logService;
        this.openerService = openerService;
        this.markdownRendererService = markdownRendererService;
        this.isVisible = false;
        this._hasIconForParentNode = false;
        this._hasIconForLeafNode = false;
        this.focused = false;
        this._canSelectMany = false;
        this._manuallyManageCheckboxes = false;
        this.elementsToRefresh = [];
        this.lastSelection = [];
        this._onDidExpandItem = this._register(new Emitter());
        this._onDidCollapseItem = this._register(new Emitter());
        this._onDidChangeSelectionAndFocus = this._register(new Emitter());
        this._onDidChangeVisibility = this._register(new Emitter());
        this._onDidChangeActions = this._register(new Emitter());
        this._onDidChangeWelcomeState = this._register(new Emitter());
        this._onDidChangeTitle = this._register(new Emitter());
        this._onDidChangeDescription = this._register(new Emitter());
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this._onDidCompleteRefresh = this._register(new Emitter());
        this._isInitialized = false;
        this._activity = this._register(new MutableDisposable());
        this.activated = false;
        this.treeDisposables = this._register(new DisposableStore());
        this._height = 0;
        this._width = 0;
        this.refreshing = false;
        this.root = new Root();
        this.lastActive = this.root;
        // Try not to add anything that could be costly to this constructor. It gets called once per tree view
        // during startup, and anything added here can affect performance.
    }
    initialize() {
        if (this._isInitialized) {
            return;
        }
        this._isInitialized = true;
        // Remember when adding to this method that it isn't called until the view is visible, meaning that
        // properties could be set and events could be fired before we're initialized and that this needs to be handled.
        this.contextKeyService.bufferChangeEvents(() => {
            this.initializeShowCollapseAllAction();
            this.initializeCollapseAllToggle();
            this.initializeShowRefreshAction();
        });
        this.treeViewDnd = this.instantiationService.createInstance(CustomTreeViewDragAndDrop, this.id);
        if (this._dragAndDropController) {
            this.treeViewDnd.controller = this._dragAndDropController;
        }
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('explorer.decorations')) {
                this.doRefresh([this.root]); /** soft refresh **/
            }
        }));
        this._register(this.viewDescriptorService.onDidChangeLocation(({ views, from, to }) => {
            if (views.some(v => v.id === this.id)) {
                this.tree?.updateOptions({ overrideStyles: getLocationBasedViewColors(this.viewLocation).listOverrideStyles });
            }
        }));
        this.registerActions();
        this.create();
    }
    get viewContainer() {
        return this.viewDescriptorService.getViewContainerByViewId(this.id);
    }
    get viewLocation() {
        return this.viewDescriptorService.getViewLocationById(this.id);
    }
    get dragAndDropController() {
        return this._dragAndDropController;
    }
    set dragAndDropController(dnd) {
        this._dragAndDropController = dnd;
        if (this.treeViewDnd) {
            this.treeViewDnd.controller = dnd;
        }
    }
    get dataProvider() {
        return this._dataProvider;
    }
    set dataProvider(dataProvider) {
        if (dataProvider) {
            if (this.visible) {
                this.activate();
            }
            const self = this;
            this._dataProvider = new class {
                constructor() {
                    this._isEmpty = true;
                    this._onDidChangeEmpty = new Emitter();
                    this.onDidChangeEmpty = this._onDidChangeEmpty.event;
                }
                get isTreeEmpty() {
                    return this._isEmpty;
                }
                async getChildren(element) {
                    const batches = await this.getChildrenBatch(element ? [element] : undefined);
                    return batches?.[0];
                }
                updateEmptyState(nodes, childrenGroups) {
                    if ((nodes.length === 1) && (nodes[0] instanceof Root)) {
                        const oldEmpty = this._isEmpty;
                        this._isEmpty = (childrenGroups.length === 0) || (childrenGroups[0].length === 0);
                        if (oldEmpty !== this._isEmpty) {
                            this._onDidChangeEmpty.fire();
                        }
                    }
                }
                findCheckboxesUpdated(nodes, childrenGroups) {
                    if (childrenGroups.length === 0) {
                        return [];
                    }
                    const checkboxesUpdated = [];
                    for (let i = 0; i < nodes.length; i++) {
                        const node = nodes[i];
                        const children = childrenGroups[i];
                        for (const child of children) {
                            child.parent = node;
                            if (!self.manuallyManageCheckboxes && (node?.checkbox?.isChecked === true) && (child.checkbox?.isChecked === false)) {
                                child.checkbox.isChecked = true;
                                checkboxesUpdated.push(child);
                            }
                        }
                    }
                    return checkboxesUpdated;
                }
                async getChildrenBatch(nodes) {
                    let childrenGroups;
                    let checkboxesUpdated = [];
                    if (nodes?.every((node) => !!node.children)) {
                        childrenGroups = nodes.map(node => node.children);
                    }
                    else {
                        nodes = nodes ?? [self.root];
                        const batchedChildren = await (nodes.length === 1 && nodes[0] instanceof Root ? doGetChildrenOrBatch(dataProvider, undefined) : doGetChildrenOrBatch(dataProvider, nodes));
                        for (let i = 0; i < nodes.length; i++) {
                            const node = nodes[i];
                            node.children = batchedChildren ? batchedChildren[i] : undefined;
                        }
                        childrenGroups = batchedChildren ?? [];
                        checkboxesUpdated = this.findCheckboxesUpdated(nodes, childrenGroups);
                    }
                    this.updateEmptyState(nodes, childrenGroups);
                    if (checkboxesUpdated.length > 0) {
                        self._onDidChangeCheckboxState.fire(checkboxesUpdated);
                    }
                    return childrenGroups;
                }
            };
            if (this._dataProvider.onDidChangeEmpty) {
                this._register(this._dataProvider.onDidChangeEmpty(() => {
                    this.updateCollapseAllToggle();
                    this._onDidChangeWelcomeState.fire();
                }));
            }
            this.updateMessage();
            this.refresh();
        }
        else {
            this._dataProvider = undefined;
            this.treeDisposables.clear();
            this.activated = false;
            this.updateMessage();
        }
        this._onDidChangeWelcomeState.fire();
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this.updateMessage();
        this._onDidChangeWelcomeState.fire();
    }
    get title() {
        return this._title;
    }
    set title(name) {
        this._title = name;
        if (this.tree) {
            this.tree.ariaLabel = this._title;
        }
        this._onDidChangeTitle.fire(this._title);
    }
    get description() {
        return this._description;
    }
    set description(description) {
        this._description = description;
        this._onDidChangeDescription.fire(this._description);
    }
    get badge() {
        return this._badge;
    }
    set badge(badge) {
        if (this._badge?.value === badge?.value &&
            this._badge?.tooltip === badge?.tooltip) {
            return;
        }
        this._badge = badge;
        if (badge) {
            const activity = {
                badge: new NumberBadge(badge.value, () => badge.tooltip),
                priority: 50
            };
            this._activity.value = this.activityService.showViewActivity(this.id, activity);
        }
        else {
            this._activity.clear();
        }
    }
    get canSelectMany() {
        return this._canSelectMany;
    }
    set canSelectMany(canSelectMany) {
        const oldCanSelectMany = this._canSelectMany;
        this._canSelectMany = canSelectMany;
        if (this._canSelectMany !== oldCanSelectMany) {
            this.tree?.updateOptions({ multipleSelectionSupport: this.canSelectMany });
        }
    }
    get manuallyManageCheckboxes() {
        return this._manuallyManageCheckboxes;
    }
    set manuallyManageCheckboxes(manuallyManageCheckboxes) {
        this._manuallyManageCheckboxes = manuallyManageCheckboxes;
    }
    get hasIconForParentNode() {
        return this._hasIconForParentNode;
    }
    get hasIconForLeafNode() {
        return this._hasIconForLeafNode;
    }
    get visible() {
        return this.isVisible;
    }
    initializeShowCollapseAllAction(startingValue = false) {
        if (!this.collapseAllContext) {
            this.collapseAllContextKey = new RawContextKey(`treeView.${this.id}.enableCollapseAll`, startingValue, localize('treeView.enableCollapseAll', "Whether the tree view with id {0} enables collapse all.", this.id));
            this.collapseAllContext = this.collapseAllContextKey.bindTo(this.contextKeyService);
        }
        return true;
    }
    get showCollapseAllAction() {
        this.initializeShowCollapseAllAction();
        return !!this.collapseAllContext?.get();
    }
    set showCollapseAllAction(showCollapseAllAction) {
        this.initializeShowCollapseAllAction(showCollapseAllAction);
        this.collapseAllContext?.set(showCollapseAllAction);
    }
    initializeShowRefreshAction(startingValue = false) {
        if (!this.refreshContext) {
            this.refreshContextKey = new RawContextKey(`treeView.${this.id}.enableRefresh`, startingValue, localize('treeView.enableRefresh', "Whether the tree view with id {0} enables refresh.", this.id));
            this.refreshContext = this.refreshContextKey.bindTo(this.contextKeyService);
        }
    }
    get showRefreshAction() {
        this.initializeShowRefreshAction();
        return !!this.refreshContext?.get();
    }
    set showRefreshAction(showRefreshAction) {
        this.initializeShowRefreshAction(showRefreshAction);
        this.refreshContext?.set(showRefreshAction);
    }
    registerActions() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.treeView.${that.id}.refresh`,
                    title: localize('refresh', "Refresh"),
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', that.id), that.refreshContextKey),
                        group: 'navigation',
                        order: Number.MAX_SAFE_INTEGER - 1,
                    },
                    icon: Codicon.refresh
                });
            }
            async run() {
                return that.refresh();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.treeView.${that.id}.collapseAll`,
                    title: localize('collapseAll', "Collapse All"),
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', that.id), that.collapseAllContextKey),
                        group: 'navigation',
                        order: Number.MAX_SAFE_INTEGER,
                    },
                    precondition: that.collapseAllToggleContextKey,
                    icon: Codicon.collapseAll
                });
            }
            async run() {
                if (that.tree) {
                    return new CollapseAllAction(that.tree, true).run();
                }
            }
        }));
    }
    setVisibility(isVisible) {
        // Throughout setVisibility we need to check if the tree view's data provider still exists.
        // This can happen because the `getChildren` call to the extension can return
        // after the tree has been disposed.
        this.initialize();
        isVisible = !!isVisible;
        if (this.isVisible === isVisible) {
            return;
        }
        this.isVisible = isVisible;
        if (this.tree) {
            if (this.isVisible) {
                DOM.show(this.tree.getHTMLElement());
            }
            else {
                DOM.hide(this.tree.getHTMLElement()); // make sure the tree goes out of the tabindex world by hiding it
            }
            if (this.isVisible && this.elementsToRefresh.length && this.dataProvider) {
                this.doRefresh(this.elementsToRefresh);
                this.elementsToRefresh = [];
            }
        }
        setTimeout0(() => {
            if (this.dataProvider) {
                this._onDidChangeVisibility.fire(this.isVisible);
            }
        });
        if (this.visible) {
            this.activate();
        }
    }
    focus(reveal = true, revealItem) {
        if (this.tree && this.root.children && this.root.children.length > 0) {
            // Make sure the current selected element is revealed
            const element = revealItem ?? this.tree.getSelection()[0];
            if (element && reveal) {
                this.tree.reveal(element, 0.5);
            }
            // Pass Focus to Viewer
            this.tree.domFocus();
        }
        else if (this.tree && this.treeContainer && !this.treeContainer.classList.contains('hide')) {
            this.tree.domFocus();
        }
        else {
            this.domNode.focus();
        }
    }
    show(container) {
        this._container = container;
        DOM.append(container, this.domNode);
    }
    create() {
        this.domNode = DOM.$('.tree-explorer-viewlet-tree-view');
        this.messageElement = DOM.append(this.domNode, DOM.$('.message'));
        this.updateMessage();
        this.treeContainer = DOM.append(this.domNode, DOM.$('.customview-tree'));
        this.treeContainer.classList.add('file-icon-themable-tree', 'show-file-icons');
        const focusTracker = this._register(DOM.trackFocus(this.domNode));
        this._register(focusTracker.onDidFocus(() => this.focused = true));
        this._register(focusTracker.onDidBlur(() => this.focused = false));
    }
    createTree() {
        this.treeDisposables.clear();
        const actionViewItemProvider = createActionViewItem.bind(undefined, this.instantiationService);
        const treeMenus = this.treeDisposables.add(this.instantiationService.createInstance(TreeMenus, this.id));
        this.treeLabels = this.treeDisposables.add(this.instantiationService.createInstance(ResourceLabels, this));
        const dataSource = this.instantiationService.createInstance(TreeDataSource, this, (task) => this.progressService.withProgress({ location: this.id }, () => task));
        const aligner = this.treeDisposables.add(new Aligner(this.themeService, this.logService));
        const checkboxStateHandler = this.treeDisposables.add(new CheckboxStateHandler());
        const renderer = this.treeDisposables.add(this.instantiationService.createInstance(TreeRenderer, this.id, treeMenus, this.treeLabels, actionViewItemProvider, aligner, checkboxStateHandler, () => this.manuallyManageCheckboxes));
        this.treeDisposables.add(renderer.onDidChangeCheckboxState(e => this._onDidChangeCheckboxState.fire(e)));
        const widgetAriaLabel = this._title;
        this.tree = this.treeDisposables.add(this.instantiationService.createInstance(Tree, this.id, this.treeContainer, new TreeViewDelegate(), [renderer], dataSource, {
            identityProvider: new TreeViewIdentityProvider(),
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (element.accessibilityInformation) {
                        return element.accessibilityInformation.label;
                    }
                    if (isString(element.tooltip)) {
                        return element.tooltip;
                    }
                    else {
                        if (element.resourceUri && !element.label) {
                            // The custom tree has no good information on what should be used for the aria label.
                            // Allow the tree widget's default aria label to be used.
                            return null;
                        }
                        let buildAriaLabel = '';
                        if (element.label) {
                            const labelText = isMarkdownString(element.label.label) ? element.label.label.value : element.label.label;
                            buildAriaLabel += labelText + ' ';
                        }
                        if (element.description) {
                            buildAriaLabel += element.description;
                        }
                        return buildAriaLabel;
                    }
                },
                getRole(element) {
                    return element.accessibilityInformation?.role ?? 'treeitem';
                },
                getWidgetAriaLabel() {
                    return widgetAriaLabel;
                }
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (item) => {
                    if (item.label) {
                        return isMarkdownString(item.label.label) ? item.label.label.value : item.label.label;
                    }
                    return item.resourceUri ? basename(URI.revive(item.resourceUri)) : undefined;
                }
            },
            expandOnlyOnTwistieClick: (e) => {
                return !!e.command || !!e.checkbox || this.configurationService.getValue('workbench.tree.expandMode') === 'doubleClick';
            },
            collapseByDefault: (e) => {
                return e.collapsibleState !== TreeItemCollapsibleState.Expanded;
            },
            multipleSelectionSupport: this.canSelectMany,
            dnd: this.treeViewDnd,
            overrideStyles: getLocationBasedViewColors(this.viewLocation).listOverrideStyles
        }));
        this.treeDisposables.add(renderer.onDidChangeMenuContext(e => e.forEach(e => this.tree?.rerender(e))));
        this.treeDisposables.add(this.tree);
        treeMenus.setContextKeyService(this.tree.contextKeyService);
        aligner.tree = this.tree;
        const actionRunner = this.treeDisposables.add(new MultipleSelectionActionRunner(this.notificationService, () => this.tree.getSelection()));
        renderer.actionRunner = actionRunner;
        this.tree.contextKeyService.createKey(this.id, true);
        const customTreeKey = RawCustomTreeViewContextKey.bindTo(this.tree.contextKeyService);
        customTreeKey.set(true);
        this.treeDisposables.add(this.tree.onContextMenu(e => this.onContextMenu(treeMenus, e, actionRunner)));
        this.treeDisposables.add(this.tree.onDidChangeSelection(e => {
            this.lastSelection = e.elements;
            this.lastActive = this.tree?.getFocus()[0] ?? this.lastActive;
            this._onDidChangeSelectionAndFocus.fire({ selection: this.lastSelection, focus: this.lastActive });
        }));
        this.treeDisposables.add(this.tree.onDidChangeFocus(e => {
            if (e.elements.length && (e.elements[0] !== this.lastActive)) {
                this.lastActive = e.elements[0];
                this.lastSelection = this.tree?.getSelection() ?? this.lastSelection;
                this._onDidChangeSelectionAndFocus.fire({ selection: this.lastSelection, focus: this.lastActive });
            }
        }));
        this.treeDisposables.add(this.tree.onDidChangeCollapseState(e => {
            if (!e.node.element) {
                return;
            }
            const element = Array.isArray(e.node.element.element) ? e.node.element.element[0] : e.node.element.element;
            if (e.node.collapsed) {
                this._onDidCollapseItem.fire(element);
            }
            else {
                this._onDidExpandItem.fire(element);
            }
        }));
        this.tree.setInput(this.root).then(() => this.updateContentAreas());
        this.treeDisposables.add(this.tree.onDidOpen(async (e) => {
            if (!e.browserEvent) {
                return;
            }
            if (e.browserEvent.target && e.browserEvent.target.classList.contains(TreeItemCheckbox.checkboxClass)) {
                return;
            }
            const selection = this.tree.getSelection();
            const command = await this.resolveCommand(selection.length === 1 ? selection[0] : undefined);
            if (command && isTreeCommandEnabled(command, this.contextKeyService)) {
                let args = command.arguments || [];
                if (command.id === API_OPEN_EDITOR_COMMAND_ID || command.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                    // Some commands owned by us should receive the
                    // `IOpenEvent` as context to open properly
                    args = [...args, e];
                }
                try {
                    await this.commandService.executeCommand(command.id, ...args);
                }
                catch (err) {
                    this.notificationService.error(err);
                }
            }
        }));
        this.treeDisposables.add(treeMenus.onDidChange((changed) => {
            if (this.tree?.hasNode(changed)) {
                this.tree?.rerender(changed);
            }
        }));
    }
    async resolveCommand(element) {
        let command = element?.command;
        if (element && !command) {
            if ((element instanceof ResolvableTreeItem) && element.hasResolve) {
                await element.resolve(CancellationToken.None);
                command = element.command;
            }
        }
        return command;
    }
    onContextMenu(treeMenus, treeEvent, actionRunner) {
        this.hoverService.hideHover();
        const node = treeEvent.element;
        if (node === null) {
            return;
        }
        const event = treeEvent.browserEvent;
        event.preventDefault();
        event.stopPropagation();
        this.tree.setFocus([node]);
        let selected = this.canSelectMany ? this.getSelection() : [];
        if (!selected.find(item => item.handle === node.handle)) {
            selected = [node];
        }
        const actions = treeMenus.getResourceContextActions(selected);
        if (!actions.length) {
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => treeEvent.anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel() });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => ({ $treeViewId: this.id, $treeItemHandle: node.handle }),
            actionRunner
        });
    }
    updateMessage() {
        if (this._message) {
            this.showMessage(this._message);
        }
        else if (!this.dataProvider) {
            this.showMessage(noDataProviderMessage);
        }
        else {
            this.hideMessage();
        }
        this.updateContentAreas();
    }
    processMessage(message, disposables) {
        const lines = message.value.split('\n');
        const result = [];
        let hasFoundButton = false;
        for (const line of lines) {
            const linkedText = parseLinkedText(line);
            if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                const node = linkedText.nodes[0];
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('button-container');
                const button = new Button(buttonContainer, { title: node.title, secondary: hasFoundButton, supportIcons: true, ...defaultButtonStyles });
                button.label = node.label;
                button.onDidClick(_ => {
                    this.openerService.open(node.href, { allowCommands: true });
                }, null, disposables);
                const href = URI.parse(node.href);
                if (href.scheme === Schemas.command) {
                    const preConditions = commandPreconditions(href.path);
                    if (preConditions) {
                        button.enabled = this.contextKeyService.contextMatchesRules(preConditions);
                        disposables.add(this.contextKeyService.onDidChangeContext(e => {
                            if (e.affectsSome(new Set(preConditions.keys()))) {
                                button.enabled = this.contextKeyService.contextMatchesRules(preConditions);
                            }
                        }));
                    }
                }
                disposables.add(button);
                hasFoundButton = true;
                result.push(buttonContainer);
            }
            else {
                hasFoundButton = false;
                const rendered = this.markdownRendererService.render(new MarkdownString(line, { isTrusted: message.isTrusted, supportThemeIcons: message.supportThemeIcons, supportHtml: message.supportHtml }));
                result.push(rendered.element);
                disposables.add(rendered);
            }
        }
        const container = document.createElement('div');
        container.classList.add('rendered-message');
        for (const child of result) {
            if (DOM.isHTMLElement(child)) {
                container.appendChild(child);
            }
            else {
                container.appendChild(child.element);
            }
        }
        return container;
    }
    showMessage(message) {
        if (isRenderedMessageValue(this._messageValue)) {
            this._messageValue.disposables.dispose();
        }
        if (isMarkdownString(message)) {
            const disposables = new DisposableStore();
            const renderedMessage = this.processMessage(message, disposables);
            this._messageValue = { element: renderedMessage, disposables };
        }
        else {
            this._messageValue = message;
        }
        if (!this.messageElement) {
            return;
        }
        this.messageElement.classList.remove('hide');
        this.resetMessageElement();
        if (typeof this._messageValue === 'string' && !isFalsyOrWhitespace(this._messageValue)) {
            this.messageElement.textContent = this._messageValue;
        }
        else if (isRenderedMessageValue(this._messageValue)) {
            this.messageElement.appendChild(this._messageValue.element);
        }
        this.layout(this._height, this._width);
    }
    hideMessage() {
        this.resetMessageElement();
        this.messageElement?.classList.add('hide');
        this.layout(this._height, this._width);
    }
    resetMessageElement() {
        if (this.messageElement) {
            DOM.clearNode(this.messageElement);
        }
    }
    layout(height, width) {
        if (height && width && this.messageElement && this.treeContainer) {
            this._height = height;
            this._width = width;
            const treeHeight = height - DOM.getTotalHeight(this.messageElement);
            this.treeContainer.style.height = treeHeight + 'px';
            this.tree?.layout(treeHeight, width);
        }
    }
    getOptimalWidth() {
        if (this.tree) {
            const parentNode = this.tree.getHTMLElement();
            // eslint-disable-next-line no-restricted-syntax
            const childNodes = [].slice.call(parentNode.querySelectorAll('.outline-item-label > a'));
            return DOM.getLargestChildWidth(parentNode, childNodes);
        }
        return 0;
    }
    updateCheckboxes(elements) {
        return setCascadingCheckboxUpdates(elements);
    }
    async refresh(elements, checkboxes) {
        if (this.dataProvider && this.tree) {
            if (this.refreshing) {
                await Event.toPromise(this._onDidCompleteRefresh.event);
            }
            if (!elements) {
                elements = [this.root];
                // remove all waiting elements to refresh if root is asked to refresh
                this.elementsToRefresh = [];
            }
            for (const element of elements) {
                element.children = undefined; // reset children
            }
            if (this.isVisible) {
                const affectedElements = this.updateCheckboxes(checkboxes ?? []);
                return this.doRefresh(elements.concat(affectedElements));
            }
            else {
                if (this.elementsToRefresh.length) {
                    const seen = new Set();
                    this.elementsToRefresh.forEach(element => seen.add(element.handle));
                    for (const element of elements) {
                        if (!seen.has(element.handle)) {
                            this.elementsToRefresh.push(element);
                        }
                    }
                }
                else {
                    this.elementsToRefresh.push(...elements);
                }
            }
        }
        return undefined;
    }
    async expand(itemOrItems) {
        const tree = this.tree;
        if (!tree) {
            return;
        }
        try {
            itemOrItems = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
            for (const element of itemOrItems) {
                await tree.expand(element, false);
            }
        }
        catch (e) {
            // The extension could have changed the tree during the reveal.
            // Because of that, we ignore errors.
        }
    }
    isCollapsed(item) {
        return !!this.tree?.isCollapsed(item);
    }
    setSelection(items) {
        this.tree?.setSelection(items);
    }
    getSelection() {
        return this.tree?.getSelection() ?? [];
    }
    setFocus(item) {
        if (this.tree) {
            if (item) {
                this.focus(true, item);
                this.tree.setFocus([item]);
            }
            else if (this.tree.getFocus().length === 0) {
                this.tree.setFocus([]);
            }
        }
    }
    async reveal(item) {
        if (this.tree) {
            return this.tree.reveal(item);
        }
    }
    async doRefresh(elements) {
        const tree = this.tree;
        if (tree && this.visible) {
            this.refreshing = true;
            const oldSelection = tree.getSelection();
            try {
                await Promise.all(elements.map(element => tree.updateChildren(element, true, true)));
            }
            catch (e) {
                // When multiple calls are made to refresh the tree in quick succession,
                // we can get a "Tree element not found" error. This is expected.
                // Ideally this is fixable, so log instead of ignoring so the error is preserved.
                this.logService.error(e);
            }
            const newSelection = tree.getSelection();
            if (oldSelection.length !== newSelection.length || oldSelection.some((value, index) => value.handle !== newSelection[index].handle)) {
                this.lastSelection = newSelection;
                this._onDidChangeSelectionAndFocus.fire({ selection: this.lastSelection, focus: this.lastActive });
            }
            this.refreshing = false;
            this._onDidCompleteRefresh.fire();
            this.updateContentAreas();
            if (this.focused) {
                this.focus(false);
            }
            this.updateCollapseAllToggle();
        }
    }
    initializeCollapseAllToggle() {
        if (!this.collapseAllToggleContext) {
            this.collapseAllToggleContextKey = new RawContextKey(`treeView.${this.id}.toggleCollapseAll`, false, localize('treeView.toggleCollapseAll', "Whether collapse all is toggled for the tree view with id {0}.", this.id));
            this.collapseAllToggleContext = this.collapseAllToggleContextKey.bindTo(this.contextKeyService);
        }
    }
    updateCollapseAllToggle() {
        if (this.showCollapseAllAction) {
            this.initializeCollapseAllToggle();
            this.collapseAllToggleContext?.set(!!this.root.children && (this.root.children.length > 0) &&
                this.root.children.some(value => value.collapsibleState !== TreeItemCollapsibleState.None));
        }
    }
    updateContentAreas() {
        const isTreeEmpty = !this.root.children || this.root.children.length === 0;
        // Hide tree container only when there is a message and tree is empty and not refreshing
        if (this._messageValue && isTreeEmpty && !this.refreshing && this.treeContainer) {
            // If there's a dnd controller then hiding the tree prevents it from being dragged into.
            if (!this.dragAndDropController) {
                this.treeContainer.classList.add('hide');
            }
            this.domNode.setAttribute('tabindex', '0');
        }
        else if (this.treeContainer) {
            this.treeContainer.classList.remove('hide');
            if (this.domNode === DOM.getActiveElement()) {
                this.focus();
            }
            this.domNode.removeAttribute('tabindex');
        }
    }
    get container() {
        return this._container;
    }
};
AbstractTreeView = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, ICommandService),
    __param(5, IConfigurationService),
    __param(6, IProgressService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IViewDescriptorService),
    __param(11, IHoverService),
    __param(12, IContextKeyService),
    __param(13, IActivityService),
    __param(14, ILogService),
    __param(15, IOpenerService),
    __param(16, IMarkdownRendererService)
], AbstractTreeView);
class TreeViewIdentityProvider {
    getId(element) {
        return element.handle;
    }
}
class TreeViewDelegate {
    getHeight(element) {
        return TreeRenderer.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return TreeRenderer.TREE_TEMPLATE_ID;
    }
}
async function doGetChildrenOrBatch(dataProvider, nodes) {
    if (dataProvider.getChildrenBatch) {
        return dataProvider.getChildrenBatch(nodes);
    }
    else {
        if (nodes) {
            return Promise.all(nodes.map(node => dataProvider.getChildren(node).then(children => children ?? [])));
        }
        else {
            return [await dataProvider.getChildren()].filter(children => children !== undefined);
        }
    }
}
class TreeDataSource {
    constructor(treeView, withProgress) {
        this.treeView = treeView;
        this.withProgress = withProgress;
    }
    hasChildren(element) {
        return !!this.treeView.dataProvider && (element.collapsibleState !== TreeItemCollapsibleState.None);
    }
    async getChildren(element) {
        const dataProvider = this.treeView.dataProvider;
        if (!dataProvider) {
            return [];
        }
        if (this.batch === undefined) {
            this.batch = [element];
            this.batchPromise = undefined;
        }
        else {
            this.batch.push(element);
        }
        const indexInBatch = this.batch.length - 1;
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                const batch = this.batch;
                this.batch = undefined;
                if (!this.batchPromise) {
                    this.batchPromise = this.withProgress(doGetChildrenOrBatch(dataProvider, batch));
                }
                try {
                    const result = await this.batchPromise;
                    resolve((result && (indexInBatch < result.length)) ? result[indexInBatch] : []);
                }
                catch (e) {
                    if (!e.message.startsWith('Bad progress location:')) {
                        reject(e);
                    }
                }
            }, 0);
        });
    }
}
let TreeRenderer = class TreeRenderer extends Disposable {
    static { TreeRenderer_1 = this; }
    static { this.ITEM_HEIGHT = 22; }
    static { this.TREE_TEMPLATE_ID = 'treeExplorer'; }
    constructor(treeViewId, menus, labels, actionViewItemProvider, aligner, checkboxStateHandler, manuallyManageCheckboxes, themeService, configurationService, labelService, contextKeyService, hoverService, instantiationService) {
        super();
        this.treeViewId = treeViewId;
        this.menus = menus;
        this.labels = labels;
        this.actionViewItemProvider = actionViewItemProvider;
        this.aligner = aligner;
        this.checkboxStateHandler = checkboxStateHandler;
        this.manuallyManageCheckboxes = manuallyManageCheckboxes;
        this.themeService = themeService;
        this.configurationService = configurationService;
        this.labelService = labelService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this._onDidChangeMenuContext = this._register(new Emitter());
        this.onDidChangeMenuContext = this._onDidChangeMenuContext.event;
        this._hasCheckbox = false;
        this._renderedElements = new Map(); // tree item handle to template data
        this._hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'mouse', undefined, {}));
        this._register(this.themeService.onDidFileIconThemeChange(() => this.rerender()));
        this._register(this.themeService.onDidColorThemeChange(() => this.rerender()));
        this._register(checkboxStateHandler.onDidChangeCheckboxState(items => {
            this.updateCheckboxes(items);
        }));
        this._register(this.contextKeyService.onDidChangeContext(e => this.onDidChangeContext(e)));
    }
    get templateId() {
        return TreeRenderer_1.TREE_TEMPLATE_ID;
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
    }
    renderTemplate(container) {
        container.classList.add('custom-view-tree-node-item');
        const checkboxContainer = DOM.append(container, DOM.$(''));
        const resourceLabel = this.labels.create(container, { supportHighlights: true, hoverDelegate: this._hoverDelegate });
        const icon = DOM.prepend(resourceLabel.element, DOM.$('.custom-view-tree-node-item-icon'));
        const actionsContainer = DOM.append(resourceLabel.element, DOM.$('.actions'));
        const actionBar = new ActionBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider
        });
        return { resourceLabel, icon, checkboxContainer, actionBar, container };
    }
    getHover(label, resource, node) {
        if (!(node instanceof ResolvableTreeItem) || !node.hasResolve) {
            if (resource && !node.tooltip) {
                return undefined;
            }
            else if (node.tooltip === undefined) {
                if (isMarkdownString(label)) {
                    return { markdown: label, markdownNotSupportedFallback: label.value };
                }
                else {
                    return label;
                }
            }
            else if (!isString(node.tooltip)) {
                return { markdown: node.tooltip, markdownNotSupportedFallback: resource ? undefined : renderAsPlaintext(node.tooltip) }; // Passing undefined as the fallback for a resource falls back to the old native hover
            }
            else if (node.tooltip !== '') {
                return node.tooltip;
            }
            else {
                return undefined;
            }
        }
        return {
            markdown: typeof node.tooltip === 'string' ? node.tooltip :
                (token) => {
                    return new Promise((resolve) => {
                        node.resolve(token).then(() => resolve(node.tooltip));
                    });
                },
            markdownNotSupportedFallback: resource ? undefined : (label ? (isMarkdownString(label) ? label.value : label) : '') // Passing undefined as the fallback for a resource falls back to the old native hover
        };
    }
    processLabel(label, matches) {
        if (!isMarkdownString(label)) {
            return { label };
        }
        let text = label.value.trim();
        let bold = false;
        let italic = false;
        let strikethrough = false;
        function moveMatches(offset) {
            if (matches) {
                for (const match of matches) {
                    match.start -= offset;
                    match.end -= offset;
                }
            }
        }
        const syntaxes = [
            { open: '~~', close: '~~', mark: () => { strikethrough = true; } },
            { open: '**', close: '**', mark: () => { bold = true; } },
            { open: '*', close: '*', mark: () => { italic = true; } },
            { open: '_', close: '_', mark: () => { italic = true; } }
        ];
        function checkSyntaxes() {
            let didChange = false;
            for (const syntax of syntaxes) {
                if (text.startsWith(syntax.open) && text.endsWith(syntax.close)) {
                    // If there is a match within the markers, stop processing
                    if (matches?.some(match => match.start < syntax.open.length || match.end > text.length - syntax.close.length)) {
                        return false;
                    }
                    syntax.mark();
                    text = text.substring(syntax.open.length, text.length - syntax.close.length);
                    moveMatches(syntax.open.length);
                    didChange = true;
                }
            }
            return didChange;
        }
        // Arbitrary max # of iterations
        for (let i = 0; i < 10; i++) {
            if (!checkSyntaxes()) {
                break;
            }
        }
        return {
            label: text,
            bold,
            italic,
            strikethrough,
            supportIcons: label.supportThemeIcons
        };
    }
    renderElement(element, index, templateData) {
        const node = element.element;
        const resource = node.resourceUri ? URI.revive(node.resourceUri) : null;
        const treeItemLabel = node.label ? node.label : (resource ? { label: basename(resource) } : undefined);
        const description = isString(node.description) ? node.description : resource && node.description === true ? this.labelService.getUriLabel(dirname(resource), { relative: true }) : undefined;
        const labelStr = treeItemLabel ? isMarkdownString(treeItemLabel.label) ? treeItemLabel.label.value : treeItemLabel.label : undefined;
        const matches = (treeItemLabel?.highlights && labelStr) ? treeItemLabel.highlights.map(([start, end]) => {
            if (start < 0) {
                start = labelStr.length + start;
            }
            if (end < 0) {
                end = labelStr.length + end;
            }
            if ((start >= labelStr.length) || (end > labelStr.length)) {
                return ({ start: 0, end: 0 });
            }
            if (start > end) {
                const swap = start;
                start = end;
                end = swap;
            }
            return ({ start, end });
        }) : undefined;
        const { label, bold, italic, strikethrough, supportIcons } = this.processLabel(treeItemLabel?.label, matches);
        const icon = !isDark(this.themeService.getColorTheme().type) ? node.icon : node.iconDark;
        const iconUrl = icon ? URI.revive(icon) : undefined;
        const title = this.getHover(treeItemLabel?.label, resource, node);
        // reset
        templateData.actionBar.clear();
        templateData.icon.style.color = '';
        let commandEnabled = true;
        if (node.command) {
            commandEnabled = isTreeCommandEnabled(node.command, this.contextKeyService);
        }
        this.renderCheckbox(node, templateData);
        if (resource) {
            const fileDecorations = this.configurationService.getValue('explorer.decorations');
            const labelResource = resource ? resource : URI.parse('missing:_icon_resource');
            templateData.resourceLabel.setResource({ name: label, description, resource: labelResource }, {
                fileKind: this.getFileKind(node),
                title,
                hideIcon: this.shouldHideResourceLabelIcon(iconUrl, node.themeIcon),
                fileDecorations,
                extraClasses: ['custom-view-tree-node-item-resourceLabel'],
                matches: matches ? matches : createMatches(element.filterData),
                bold,
                italic,
                strikethrough,
                disabledCommand: !commandEnabled,
                labelEscapeNewLines: true,
                forceLabel: !!node.label,
                supportIcons
            });
        }
        else {
            templateData.resourceLabel.setResource({ name: label, description }, {
                title,
                hideIcon: true,
                extraClasses: ['custom-view-tree-node-item-resourceLabel'],
                matches: matches ? matches : createMatches(element.filterData),
                bold,
                italic,
                strikethrough,
                disabledCommand: !commandEnabled,
                labelEscapeNewLines: true,
                supportIcons
            });
        }
        if (iconUrl) {
            templateData.icon.className = 'custom-view-tree-node-item-icon';
            templateData.icon.style.backgroundImage = cssJs.asCSSUrl(iconUrl);
        }
        else {
            let iconClass;
            if (this.shouldShowThemeIcon(!!resource, node.themeIcon)) {
                iconClass = ThemeIcon.asClassName(node.themeIcon);
                if (node.themeIcon.color) {
                    templateData.icon.style.color = this.themeService.getColorTheme().getColor(node.themeIcon.color.id)?.toString() ?? '';
                }
            }
            templateData.icon.className = iconClass ? `custom-view-tree-node-item-icon ${iconClass}` : '';
            templateData.icon.style.backgroundImage = '';
        }
        if (!commandEnabled) {
            templateData.icon.className = templateData.icon.className + ' disabled';
            if (templateData.container.parentElement) {
                templateData.container.parentElement.className = templateData.container.parentElement.className + ' disabled';
            }
        }
        templateData.actionBar.context = { $treeViewId: this.treeViewId, $treeItemHandle: node.handle };
        const menuActions = this.menus.getResourceActions([node]);
        templateData.actionBar.push(menuActions, { icon: true, label: false });
        if (this._actionRunner) {
            templateData.actionBar.actionRunner = this._actionRunner;
        }
        this.setAlignment(templateData.container, node);
        if (node.parent instanceof Root) {
            if (node.collapsibleState === TreeItemCollapsibleState.None) {
                templateData.container.classList.add('no-twisty');
            }
            else {
                templateData.container.classList.remove('no-twisty');
            }
        }
        // remember rendered element, an element can be rendered multiple times
        const renderedItems = this._renderedElements.get(element.element.handle) ?? [];
        this._renderedElements.set(element.element.handle, [...renderedItems, { original: element, rendered: templateData }]);
    }
    rerender() {
        // As we add items to the map during this call we can't directly use the map in the for loop
        // but have to create a copy of the keys first
        const keys = new Set(this._renderedElements.keys());
        for (const key of keys) {
            const values = this._renderedElements.get(key) ?? [];
            for (const value of values) {
                this.disposeElement(value.original, 0, value.rendered);
                this.renderElement(value.original, 0, value.rendered);
            }
        }
    }
    renderCheckbox(node, templateData) {
        if (node.checkbox) {
            // The first time we find a checkbox we want to rerender the visible tree to adapt the alignment
            if (!this._hasCheckbox) {
                this._hasCheckbox = true;
                this.rerender();
            }
            if (!templateData.checkbox) {
                const checkbox = new TreeItemCheckbox(templateData.checkboxContainer, this.checkboxStateHandler, this._hoverDelegate, this.hoverService);
                templateData.checkbox = checkbox;
            }
            templateData.checkbox.render(node);
        }
        else if (templateData.checkbox) {
            templateData.checkbox.dispose();
            templateData.checkbox = undefined;
        }
    }
    setAlignment(container, treeItem) {
        container.parentElement.classList.toggle('align-icon-with-twisty', this.aligner.alignIconWithTwisty(treeItem));
    }
    shouldHideResourceLabelIcon(iconUrl, icon) {
        // We always hide the resource label in favor of the iconUrl when it's provided.
        // When `ThemeIcon` is provided, we hide the resource label icon in favor of it only if it's a not a file icon.
        return (!!iconUrl || (!!icon && !this.isFileKindThemeIcon(icon)));
    }
    shouldShowThemeIcon(hasResource, icon) {
        if (!icon) {
            return false;
        }
        // If there's a resource and the icon is a file icon, then the icon (or lack thereof) will already be coming from the
        // icon theme and should use whatever the icon theme has provided.
        return !(hasResource && this.isFileKindThemeIcon(icon));
    }
    isFileKindThemeIcon(icon) {
        return ThemeIcon.isFile(icon) || ThemeIcon.isFolder(icon);
    }
    getFileKind(node) {
        if (node.themeIcon) {
            switch (node.themeIcon.id) {
                case FileThemeIcon.id:
                    return FileKind.FILE;
                case FolderThemeIcon.id:
                    return FileKind.FOLDER;
            }
        }
        return node.collapsibleState === TreeItemCollapsibleState.Collapsed || node.collapsibleState === TreeItemCollapsibleState.Expanded ? FileKind.FOLDER : FileKind.FILE;
    }
    onDidChangeContext(e) {
        const affectsEntireMenuContexts = e.affectsSome(this.menus.getEntireMenuContexts());
        const items = [];
        for (const [_, elements] of this._renderedElements) {
            for (const element of elements) {
                if (affectsEntireMenuContexts || e.affectsSome(this.menus.getElementOverlayContexts(element.original.element))) {
                    items.push(element.original.element);
                }
            }
        }
        if (items.length) {
            this._onDidChangeMenuContext.fire(items);
        }
    }
    updateCheckboxes(items) {
        let allItems = [];
        if (!this.manuallyManageCheckboxes()) {
            allItems = setCascadingCheckboxUpdates(items);
        }
        else {
            allItems = items;
        }
        allItems.forEach(item => {
            const renderedItems = this._renderedElements.get(item.handle);
            if (renderedItems) {
                renderedItems.forEach(renderedItems => renderedItems.rendered.checkbox?.render(item));
            }
        });
        this._onDidChangeCheckboxState.fire(allItems);
    }
    disposeElement(resource, index, templateData) {
        const itemRenders = this._renderedElements.get(resource.element.handle) ?? [];
        const renderedIndex = itemRenders.findIndex(renderedItem => templateData === renderedItem.rendered);
        if (itemRenders.length === 1) {
            this._renderedElements.delete(resource.element.handle);
        }
        else if (itemRenders.length > 0) {
            itemRenders.splice(renderedIndex, 1);
        }
        templateData.checkbox?.dispose();
        templateData.checkbox = undefined;
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.actionBar.dispose();
    }
};
TreeRenderer = TreeRenderer_1 = __decorate([
    __param(7, IThemeService),
    __param(8, IConfigurationService),
    __param(9, ILabelService),
    __param(10, IContextKeyService),
    __param(11, IHoverService),
    __param(12, IInstantiationService)
], TreeRenderer);
class Aligner extends Disposable {
    constructor(themeService, logService) {
        super();
        this.themeService = themeService;
        this.logService = logService;
    }
    set tree(tree) {
        this._tree = tree;
    }
    alignIconWithTwisty(treeItem) {
        if (treeItem.collapsibleState !== TreeItemCollapsibleState.None) {
            return false;
        }
        if (!this.hasIconOrCheckbox(treeItem)) {
            return false;
        }
        if (this._tree) {
            const root = this._tree.getInput();
            let parent;
            try {
                parent = this._tree.getParentElement(treeItem) || root;
            }
            catch (error) {
                this.logService.error(`[TreeView] Failed to resolve parent for ${treeItem.handle}`, error);
                return false;
            }
            if (this.hasIconOrCheckbox(parent)) {
                return !!parent.children && parent.children.some(c => c.collapsibleState !== TreeItemCollapsibleState.None && !this.hasIconOrCheckbox(c));
            }
            return !!parent.children && parent.children.every(c => c.collapsibleState === TreeItemCollapsibleState.None || !this.hasIconOrCheckbox(c));
        }
        else {
            return false;
        }
    }
    hasIconOrCheckbox(node) {
        return this.hasIcon(node) || !!node.checkbox;
    }
    hasIcon(node) {
        const icon = !isDark(this.themeService.getColorTheme().type) ? node.icon : node.iconDark;
        if (icon) {
            return true;
        }
        if (node.resourceUri || node.themeIcon) {
            const fileIconTheme = this.themeService.getFileIconTheme();
            const isFolder = node.themeIcon ? node.themeIcon.id === FolderThemeIcon.id : node.collapsibleState !== TreeItemCollapsibleState.None;
            if (isFolder) {
                return fileIconTheme.hasFileIcons && fileIconTheme.hasFolderIcons;
            }
            return fileIconTheme.hasFileIcons;
        }
        return false;
    }
}
class MultipleSelectionActionRunner extends ActionRunner {
    constructor(notificationService, getSelectedResources) {
        super();
        this.getSelectedResources = getSelectedResources;
        this._register(this.onDidRun(e => {
            if (e.error && !isCancellationError(e.error)) {
                notificationService.error(localize('command-error', 'Error running command {1}: {0}. This is likely caused by the extension that contributes {1}.', e.error.message, e.action.id));
            }
        }));
    }
    async runAction(action, context) {
        const selection = this.getSelectedResources();
        let selectionHandleArgs = undefined;
        let actionInSelected = false;
        if (selection.length > 1) {
            selectionHandleArgs = selection.map(selected => {
                if ((selected.handle === context.$treeItemHandle) || context.$selectedTreeItems) {
                    actionInSelected = true;
                }
                return { $treeViewId: context.$treeViewId, $treeItemHandle: selected.handle };
            });
        }
        if (!actionInSelected && selectionHandleArgs) {
            selectionHandleArgs = undefined;
        }
        await action.run(context, selectionHandleArgs);
    }
}
let TreeMenus = class TreeMenus {
    constructor(id, menuService) {
        this.id = id;
        this.menuService = menuService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    /**
     * Gets only the actions that apply to all of the given elements.
     */
    getResourceActions(elements) {
        const actions = this.getActions(this.getMenuId(), elements);
        return actions.primary;
    }
    /**
     * Gets only the actions that apply to all of the given elements.
     */
    getResourceContextActions(elements) {
        return this.getActions(this.getMenuId(), elements).secondary;
    }
    setContextKeyService(service) {
        this.contextKeyService = service;
    }
    filterNonUniversalActions(groups, newActions) {
        const newActionsSet = new Set(newActions.map(a => a.id));
        for (const group of groups) {
            const actions = group.keys();
            for (const action of actions) {
                if (!newActionsSet.has(action)) {
                    group.delete(action);
                }
            }
        }
    }
    buildMenu(groups) {
        const result = [];
        for (const group of groups) {
            if (group.size > 0) {
                if (result.length) {
                    result.push(new Separator());
                }
                result.push(...group.values());
            }
        }
        return result;
    }
    createGroups(actions) {
        const groups = [];
        let group = new Map();
        for (const action of actions) {
            if (action instanceof Separator) {
                groups.push(group);
                group = new Map();
            }
            else {
                group.set(action.id, action);
            }
        }
        groups.push(group);
        return groups;
    }
    getElementOverlayContexts(element) {
        return new Map([
            ['view', this.id],
            ['viewItem', element.contextValue]
        ]);
    }
    getEntireMenuContexts() {
        return this.menuService.getMenuContexts(this.getMenuId());
    }
    getMenuId() {
        return MenuId.ViewItemContext;
    }
    getActions(menuId, elements) {
        if (!this.contextKeyService) {
            return { primary: [], secondary: [] };
        }
        let primaryGroups = [];
        let secondaryGroups = [];
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const contextKeyService = this.contextKeyService.createOverlay(this.getElementOverlayContexts(element));
            const menuData = this.menuService.getMenuActions(menuId, contextKeyService, { shouldForwardArgs: true });
            const result = getContextMenuActions(menuData, 'inline');
            if (i === 0) {
                primaryGroups = this.createGroups(result.primary);
                secondaryGroups = this.createGroups(result.secondary);
            }
            else {
                this.filterNonUniversalActions(primaryGroups, result.primary);
                this.filterNonUniversalActions(secondaryGroups, result.secondary);
            }
        }
        return { primary: this.buildMenu(primaryGroups), secondary: this.buildMenu(secondaryGroups) };
    }
    dispose() {
        this.contextKeyService = undefined;
    }
};
TreeMenus = __decorate([
    __param(1, IMenuService)
], TreeMenus);
let CustomTreeView = class CustomTreeView extends AbstractTreeView {
    constructor(id, title, extensionId, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keybindingService, notificationService, viewDescriptorService, contextKeyService, hoverService, extensionService, activityService, telemetryService, logService, openerService, markdownRendererService) {
        super(id, title, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keybindingService, notificationService, viewDescriptorService, hoverService, contextKeyService, activityService, logService, openerService, markdownRendererService);
        this.extensionId = extensionId;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
    }
    activate() {
        if (!this.activated) {
            this.telemetryService.publicLog2('Extension:ViewActivate', {
                extensionId: new TelemetryTrustedValue(this.extensionId),
                id: this.id,
            });
            this.createTree();
            this.progressService.withProgress({ location: this.id }, () => this.extensionService.activateByEvent(`onView:${this.id}`))
                .then(() => timeout(2000))
                .then(() => {
                this.updateMessage();
            });
            this.activated = true;
        }
    }
};
CustomTreeView = __decorate([
    __param(3, IThemeService),
    __param(4, IInstantiationService),
    __param(5, ICommandService),
    __param(6, IConfigurationService),
    __param(7, IProgressService),
    __param(8, IContextMenuService),
    __param(9, IKeybindingService),
    __param(10, INotificationService),
    __param(11, IViewDescriptorService),
    __param(12, IContextKeyService),
    __param(13, IHoverService),
    __param(14, IExtensionService),
    __param(15, IActivityService),
    __param(16, ITelemetryService),
    __param(17, ILogService),
    __param(18, IOpenerService),
    __param(19, IMarkdownRendererService)
], CustomTreeView);
export { CustomTreeView };
export class TreeView extends AbstractTreeView {
    activate() {
        if (!this.activated) {
            this.createTree();
            this.activated = true;
        }
    }
}
let CustomTreeViewDragAndDrop = class CustomTreeViewDragAndDrop {
    constructor(treeId, labelService, instantiationService, treeViewsDragAndDropService, logService) {
        this.treeId = treeId;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.treeViewsDragAndDropService = treeViewsDragAndDropService;
        this.logService = logService;
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.treeMimeType = `application/vnd.code.tree.${treeId.toLowerCase()}`;
    }
    set controller(controller) {
        this.dndController = controller;
    }
    handleDragAndLog(dndController, itemHandles, uuid, dragCancellationToken) {
        return dndController.handleDrag(itemHandles, uuid, dragCancellationToken).then(additionalDataTransfer => {
            if (additionalDataTransfer) {
                const unlistedTypes = [];
                for (const item of additionalDataTransfer) {
                    if ((item[0] !== this.treeMimeType) && (dndController.dragMimeTypes.findIndex(value => value === item[0]) < 0)) {
                        unlistedTypes.push(item[0]);
                    }
                }
                if (unlistedTypes.length) {
                    this.logService.warn(`Drag and drop controller for tree ${this.treeId} adds the following data transfer types but does not declare them in dragMimeTypes: ${unlistedTypes.join(', ')}`);
                }
            }
            return additionalDataTransfer;
        });
    }
    addExtensionProvidedTransferTypes(originalEvent, itemHandles) {
        if (!originalEvent.dataTransfer || !this.dndController) {
            return;
        }
        const uuid = generateUuid();
        this.dragCancellationToken = new CancellationTokenSource();
        this.treeViewsDragAndDropService.addDragOperationTransfer(uuid, this.handleDragAndLog(this.dndController, itemHandles, uuid, this.dragCancellationToken.token));
        this.treeItemsTransfer.setData([new DraggedTreeItemsIdentifier(uuid)], DraggedTreeItemsIdentifier.prototype);
        originalEvent.dataTransfer.clearData(Mimes.text);
        if (this.dndController.dragMimeTypes.find((element) => element === Mimes.uriList)) {
            // Add the type that the editor knows
            originalEvent.dataTransfer?.setData(DataTransfers.RESOURCES, '');
        }
        this.dndController.dragMimeTypes.forEach(supportedType => {
            originalEvent.dataTransfer?.setData(supportedType, '');
        });
    }
    addResourceInfoToTransfer(originalEvent, resources) {
        if (resources.length && originalEvent.dataTransfer) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, resources, originalEvent));
            // The only custom data transfer we set from the explorer is a file transfer
            // to be able to DND between multiple code file explorers across windows
            const fileResources = resources.filter(s => s.scheme === Schemas.file).map(r => r.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    onDragStart(data, originalEvent) {
        if (originalEvent.dataTransfer) {
            const treeItemsData = data.getData();
            const resources = [];
            const sourceInfo = {
                id: this.treeId,
                itemHandles: []
            };
            treeItemsData.forEach(item => {
                sourceInfo.itemHandles.push(item.handle);
                if (item.resourceUri) {
                    resources.push(URI.revive(item.resourceUri));
                }
            });
            this.addResourceInfoToTransfer(originalEvent, resources);
            this.addExtensionProvidedTransferTypes(originalEvent, sourceInfo.itemHandles);
            originalEvent.dataTransfer.setData(this.treeMimeType, JSON.stringify(sourceInfo));
        }
    }
    debugLog(types) {
        if (types.size) {
            this.logService.debug(`TreeView dragged mime types: ${Array.from(types).join(', ')}`);
        }
        else {
            this.logService.debug(`TreeView dragged with no supported mime types.`);
        }
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        const dataTransfer = toExternalVSDataTransfer(originalEvent.dataTransfer);
        const types = new Set(Array.from(dataTransfer, x => x[0]));
        if (originalEvent.dataTransfer) {
            // Also add uri-list if we have any files. At this stage we can't actually access the file itself though.
            for (const item of originalEvent.dataTransfer.items) {
                if (item.kind === 'file' || item.type === DataTransfers.RESOURCES.toLowerCase()) {
                    types.add(Mimes.uriList);
                    break;
                }
            }
        }
        this.debugLog(types);
        const dndController = this.dndController;
        if (!dndController || !originalEvent.dataTransfer || (dndController.dropMimeTypes.length === 0)) {
            return false;
        }
        const dragContainersSupportedType = Array.from(types).some((value, index) => {
            if (value === this.treeMimeType) {
                return true;
            }
            else {
                return dndController.dropMimeTypes.indexOf(value) >= 0;
            }
        });
        if (dragContainersSupportedType) {
            return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, autoExpand: true };
        }
        return false;
    }
    getDragURI(element) {
        if (!this.dndController) {
            return null;
        }
        return element.resourceUri ? URI.revive(element.resourceUri).toString() : element.handle;
    }
    getDragLabel(elements) {
        if (!this.dndController) {
            return undefined;
        }
        if (elements.length > 1) {
            return String(elements.length);
        }
        const element = elements[0];
        if (element.label) {
            return isMarkdownString(element.label.label) ? element.label.label.value : element.label.label;
        }
        return element.resourceUri ? this.labelService.getUriLabel(URI.revive(element.resourceUri)) : undefined;
    }
    async drop(data, targetNode, targetIndex, targetSector, originalEvent) {
        const dndController = this.dndController;
        if (!originalEvent.dataTransfer || !dndController) {
            return;
        }
        let treeSourceInfo;
        let willDropUuid;
        if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            willDropUuid = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype)[0].identifier;
        }
        const originalDataTransfer = toExternalVSDataTransfer(originalEvent.dataTransfer, true);
        const outDataTransfer = new VSDataTransfer();
        for (const [type, item] of originalDataTransfer) {
            if (type === this.treeMimeType || dndController.dropMimeTypes.includes(type) || (item.asFile() && dndController.dropMimeTypes.includes(DataTransfers.FILES.toLowerCase()))) {
                outDataTransfer.append(type, item);
                if (type === this.treeMimeType) {
                    try {
                        treeSourceInfo = JSON.parse(await item.asString());
                    }
                    catch {
                        // noop
                    }
                }
            }
        }
        const additionalDataTransfer = await this.treeViewsDragAndDropService.removeDragOperationTransfer(willDropUuid);
        if (additionalDataTransfer) {
            for (const [type, item] of additionalDataTransfer) {
                outDataTransfer.append(type, item);
            }
        }
        return dndController.handleDrop(outDataTransfer, targetNode, CancellationToken.None, willDropUuid, treeSourceInfo?.id, treeSourceInfo?.itemHandles);
    }
    onDragEnd(originalEvent) {
        // Check if the drag was cancelled.
        if (originalEvent.dataTransfer?.dropEffect === 'none') {
            this.dragCancellationToken?.cancel();
        }
    }
    dispose() { }
};
CustomTreeViewDragAndDrop = __decorate([
    __param(1, ILabelService),
    __param(2, IInstantiationService),
    __param(3, ITreeViewsDnDService),
    __param(4, ILogService)
], CustomTreeViewDragAndDrop);
export { CustomTreeViewDragAndDrop };
function setCascadingCheckboxUpdates(items) {
    const additionalItems = [];
    for (const item of items) {
        if (item.checkbox !== undefined) {
            const checkChildren = (currentItem) => {
                for (const child of (currentItem.children ?? [])) {
                    if ((child.checkbox !== undefined) && (currentItem.checkbox !== undefined) && (child.checkbox.isChecked !== currentItem.checkbox.isChecked)) {
                        child.checkbox.isChecked = currentItem.checkbox.isChecked;
                        additionalItems.push(child);
                        checkChildren(child);
                    }
                }
            };
            checkChildren(item);
            const visitedParents = new Set();
            const checkParents = (currentItem) => {
                if (currentItem.parent?.checkbox !== undefined && currentItem.parent.children) {
                    if (visitedParents.has(currentItem.parent)) {
                        return;
                    }
                    else {
                        visitedParents.add(currentItem.parent);
                    }
                    let someUnchecked = false;
                    let someChecked = false;
                    for (const child of currentItem.parent.children) {
                        if (someUnchecked && someChecked) {
                            break;
                        }
                        if (child.checkbox !== undefined) {
                            if (child.checkbox.isChecked) {
                                someChecked = true;
                            }
                            else {
                                someUnchecked = true;
                            }
                        }
                    }
                    if (someChecked && !someUnchecked && (currentItem.parent.checkbox.isChecked !== true)) {
                        currentItem.parent.checkbox.isChecked = true;
                        additionalItems.push(currentItem.parent);
                        checkParents(currentItem.parent);
                    }
                    else if (someUnchecked && (currentItem.parent.checkbox.isChecked !== false)) {
                        currentItem.parent.checkbox.isChecked = false;
                        additionalItems.push(currentItem.parent);
                        checkParents(currentItem.parent);
                    }
                }
            };
            checkParents(item);
        }
    }
    return items.concat(additionalItems);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdmlld3MvdHJlZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0saUNBQWlDLENBQUM7QUFDbEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssS0FBSyxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsU0FBUyxFQUEyQixNQUFNLG9EQUFvRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUsxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMzRyxPQUFPLEVBQUUs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
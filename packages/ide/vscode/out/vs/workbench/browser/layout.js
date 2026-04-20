/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { Event, Emitter } from '../../base/common/event.js';
import { EventType, addDisposableListener, getClientArea, size, isAncestorUsingFlowTo, computeScreenAwareSize, getActiveDocument, getWindows, getActiveWindow, isActiveDocument, getWindow, getWindowId, getActiveElement, Dimension } from '../../base/browser/dom.js';
import { onDidChangeFullscreen, isFullscreen, isWCOEnabled } from '../../base/browser/browser.js';
import { isWindows, isLinux, isMacintosh, isWeb, isIOS } from '../../base/common/platform.js';
import { isResourceEditorInput, pathsToEditors } from '../common/editor.js';
import { SidebarPart } from './parts/sidebar/sidebarPart.js';
import { PanelPart } from './parts/panel/panelPart.js';
import { positionFromString, positionToString, partOpensMaximizedFromString, shouldShowCustomTitleBar, isHorizontal, isMultiWindowPart } from '../services/layout/browser/layoutService.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { IConfigurationService, isConfigured } from '../../platform/configuration/common/configuration.js';
import { ITitleService } from '../services/title/browser/titleService.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { getMenuBarVisibility, hasNativeTitlebar, hasCustomTitlebar, useWindowControlsOverlay, DEFAULT_EMPTY_WINDOW_SIZE, DEFAULT_WORKSPACE_WINDOW_SIZE, hasNativeMenu } from '../../platform/window/common/window.js';
import { IHostService } from '../services/host/browser/host.js';
import { IBrowserWorkbenchEnvironmentService } from '../services/environment/browser/environmentService.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../services/editor/common/editorGroupsService.js';
import { SerializableGrid, Sizing } from '../../base/browser/ui/grid/grid.js';
import { Part } from './part.js';
import { IStatusbarService } from '../services/statusbar/browser/statusbar.js';
import { IFileService } from '../../platform/files/common/files.js';
import { isCodeEditor } from '../../editor/browser/editorBrowser.js';
import { coalesce } from '../../base/common/arrays.js';
import { assertReturnsDefined } from '../../base/common/types.js';
import { INotificationService, NotificationsFilter } from '../../platform/notification/common/notification.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { WINDOW_ACTIVE_BORDER, WINDOW_INACTIVE_BORDER } from '../common/theme.js';
import { URI } from '../../base/common/uri.js';
import { IViewDescriptorService } from '../common/views.js';
import { DiffEditorInput } from '../common/editor/diffEditorInput.js';
import { mark } from '../../base/common/performance.js';
import { IExtensionService } from '../services/extensions/common/extensions.js';
import { ILogService } from '../../platform/log/common/log.js';
import { DeferredPromise, Promises } from '../../base/common/async.js';
import { IBannerService } from '../services/banner/browser/bannerService.js';
import { IPaneCompositePartService } from '../services/panecomposite/browser/panecomposite.js';
import { AuxiliaryBarPart } from './parts/auxiliarybar/auxiliaryBarPart.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IAuxiliaryWindowService } from '../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { mainWindow } from '../../base/browser/window.js';
var LayoutClasses;
(function (LayoutClasses) {
    LayoutClasses["SIDEBAR_HIDDEN"] = "nosidebar";
    LayoutClasses["MAIN_EDITOR_AREA_HIDDEN"] = "nomaineditorarea";
    LayoutClasses["PANEL_HIDDEN"] = "nopanel";
    LayoutClasses["AUXILIARYBAR_HIDDEN"] = "noauxiliarybar";
    LayoutClasses["STATUSBAR_HIDDEN"] = "nostatusbar";
    LayoutClasses["FULLSCREEN"] = "fullscreen";
    LayoutClasses["MAXIMIZED"] = "maximized";
    LayoutClasses["WINDOW_BORDER"] = "border";
})(LayoutClasses || (LayoutClasses = {}));
const COMMAND_CENTER_SETTINGS = [
    'chat.commandCenter.enabled',
    'workbench.navigationControl.enabled',
    'workbench.experimental.share.enabled',
];
export const TITLE_BAR_SETTINGS = [
    "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */,
    "window.commandCenter" /* LayoutSettings.COMMAND_CENTER */,
    ...COMMAND_CENTER_SETTINGS,
    "workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */,
    "workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */,
    "window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */,
    "window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */,
    "window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */,
];
const DEFAULT_EMPTY_WINDOW_DIMENSIONS = new Dimension(DEFAULT_EMPTY_WINDOW_SIZE.width, DEFAULT_EMPTY_WINDOW_SIZE.height);
const DEFAULT_WORKSPACE_WINDOW_DIMENSIONS = new Dimension(DEFAULT_WORKSPACE_WINDOW_SIZE.width, DEFAULT_WORKSPACE_WINDOW_SIZE.height);
export class Layout extends Disposable {
    get activeContainer() { return this.getContainerFromDocument(getActiveDocument()); }
    get containers() {
        const containers = [];
        for (const { window } of getWindows()) {
            containers.push(this.getContainerFromDocument(window.document));
        }
        return containers;
    }
    getContainerFromDocument(targetDocument) {
        if (targetDocument === this.mainContainer.ownerDocument) {
            return this.mainContainer; // main window
        }
        else {
            // eslint-disable-next-line no-restricted-syntax
            return targetDocument.body.getElementsByClassName('monaco-workbench')[0]; // auxiliary window
        }
    }
    whenContainerStylesLoaded(window) {
        return this.containerStylesLoaded.get(window.vscodeWindowId);
    }
    get mainContainerDimension() { return this._mainContainerDimension; }
    get activeContainerDimension() {
        return this.getContainerDimension(this.activeContainer);
    }
    getContainerDimension(container) {
        if (container === this.mainContainer) {
            return this.mainContainerDimension; // main window
        }
        else {
            return getClientArea(container); // auxiliary window
        }
    }
    get mainContainerOffset() {
        return this.computeContainerOffset(mainWindow);
    }
    get activeContainerOffset() {
        return this.computeContainerOffset(getWindow(this.activeContainer));
    }
    computeContainerOffset(targetWindow) {
        let top = 0;
        let quickPickTop = 0;
        if (this.isVisible("workbench.parts.banner" /* Parts.BANNER_PART */)) {
            top = this.getPart("workbench.parts.banner" /* Parts.BANNER_PART */).maximumHeight;
            quickPickTop = top;
        }
        const titlebarVisible = this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow);
        if (titlebarVisible) {
            top += this.getPart("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */).maximumHeight;
            quickPickTop = top;
        }
        const isCommandCenterVisible = titlebarVisible && this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) !== false;
        if (isCommandCenterVisible) {
            // If the command center is visible then the quickinput
            // should go over the title bar and the banner
            quickPickTop = 6;
        }
        return { top, quickPickTop };
    }
    constructor(parent, layoutOptions) {
        super();
        this.parent = parent;
        this.layoutOptions = layoutOptions;
        //#region Events
        this._onDidChangeZenMode = this._register(new Emitter());
        this.onDidChangeZenMode = this._onDidChangeZenMode.event;
        this._onDidChangeMainEditorCenteredLayout = this._register(new Emitter());
        this.onDidChangeMainEditorCenteredLayout = this._onDidChangeMainEditorCenteredLayout.event;
        this._onDidChangePanelAlignment = this._register(new Emitter());
        this.onDidChangePanelAlignment = this._onDidChangePanelAlignment.event;
        this._onDidChangeWindowMaximized = this._register(new Emitter());
        this.onDidChangeWindowMaximized = this._onDidChangeWindowMaximized.event;
        this._onDidChangePanelPosition = this._register(new Emitter());
        this.onDidChangePanelPosition = this._onDidChangePanelPosition.event;
        this._onDidChangePartVisibility = this._register(new Emitter());
        this.onDidChangePartVisibility = this._onDidChangePartVisibility.event;
        this._onDidChangeNotificationsVisibility = this._register(new Emitter());
        this.onDidChangeNotificationsVisibility = this._onDidChangeNotificationsVisibility.event;
        this._onDidChangeAuxiliaryBarMaximized = this._register(new Emitter());
        this.onDidChangeAuxiliaryBarMaximized = this._onDidChangeAuxiliaryBarMaximized.event;
        this._onDidLayoutMainContainer = this._register(new Emitter());
        this.onDidLayoutMainContainer = this._onDidLayoutMainContainer.event;
        this._onDidLayoutActiveContainer = this._register(new Emitter());
        this.onDidLayoutActiveContainer = this._onDidLayoutActiveContainer.event;
        this._onDidLayoutContainer = this._register(new Emitter());
        this.onDidLayoutContainer = this._onDidLayoutContainer.event;
        this._onDidAddContainer = this._register(new Emitter());
        this.onDidAddContainer = this._onDidAddContainer.event;
        this._onDidChangeActiveContainer = this._register(new Emitter());
        this.onDidChangeActiveContainer = this._onDidChangeActiveContainer.event;
        //#endregion
        //#region Properties
        this.mainContainer = document.createElement('div');
        this.containerStylesLoaded = new Map();
        //#endregion
        this.parts = new Map();
        this.initialized = false;
        this.disposed = false;
        this._openedDefaultEditors = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this.restored = false;
        this.inMaximizedAuxiliaryBarTransition = false;
    }
    initLayout(accessor) {
        // Services
        this.environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
        this.configurationService = accessor.get(IConfigurationService);
        this.hostService = accessor.get(IHostService);
        this.contextService = accessor.get(IWorkspaceContextService);
        this.storageService = accessor.get(IStorageService);
        this.themeService = accessor.get(IThemeService);
        this.extensionService = accessor.get(IExtensionService);
        this.logService = accessor.get(ILogService);
        this.telemetryService = accessor.get(ITelemetryService);
        this.auxiliaryWindowService = accessor.get(IAuxiliaryWindowService);
        // Parts
        this.editorService = accessor.get(IEditorService);
        this.editorGroupService = accessor.get(IEditorGroupsService);
        this.mainPartEditorService = this.editorService.createScoped(this.editorGroupService.mainPart, this._store);
        this.paneCompositeService = accessor.get(IPaneCompositePartService);
        this.viewDescriptorService = accessor.get(IViewDescriptorService);
        this.titleService = accessor.get(ITitleService);
        this.notificationService = accessor.get(INotificationService);
        this.statusBarService = accessor.get(IStatusbarService);
        accessor.get(IBannerService);
        // Listeners
        this.registerLayoutListeners();
        // State
        this.initLayoutState(accessor.get(ILifecycleService), accessor.get(IFileService));
    }
    registerLayoutListeners() {
        // Restore editor if hidden and an editor is to show
        const showEditorIfHidden = () => {
            if (!this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow)) {
                if (this.isAuxiliaryBarMaximized()) {
                    this.toggleMaximizedAuxiliaryBar();
                }
                else {
                    this.toggleMaximizedPanel();
                }
            }
        };
        // Wait to register these listeners after the editor group service
        // is ready to avoid conflicts on startup
        this.editorGroupService.whenRestored.then(() => {
            // Restore main editor part on any editor change in main part
            this._register(this.mainPartEditorService.onDidVisibleEditorsChange(showEditorIfHidden));
            this._register(this.editorGroupService.mainPart.onDidActivateGroup(showEditorIfHidden));
            // Revalidate center layout when active editor changes: diff editor quits centered mode.
            this._register(this.mainPartEditorService.onDidActiveEditorChange(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        });
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if ([
                ...TITLE_BAR_SETTINGS,
                LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION,
                LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE,
            ].some(setting => e.affectsConfiguration(setting))) {
                // Show Command Center if command center actions enabled
                const shareEnabled = e.affectsConfiguration('workbench.experimental.share.enabled') && this.configurationService.getValue('workbench.experimental.share.enabled');
                const navigationControlEnabled = e.affectsConfiguration('workbench.navigationControl.enabled') && this.configurationService.getValue('workbench.navigationControl.enabled');
                // Currently not supported for "chat.commandCenter.enabled" as we
                // programatically set this during setup and could lead to unwanted titlebar appearing
                // const chatControlsEnabled = e.affectsConfiguration('chat.commandCenter.enabled') && this.configurationService.getValue<boolean>('chat.commandCenter.enabled');
                if (shareEnabled || navigationControlEnabled) {
                    if (this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) === false) {
                        this.configurationService.updateValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */, true);
                        return; // onDidChangeConfiguration will be triggered again
                    }
                }
                // Show Custom TitleBar if actions enabled in (or moved to) the titlebar
                const editorActionsMovedToTitlebar = e.affectsConfiguration("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */) && this.configurationService.getValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */) === "titleBar" /* EditorActionsLocation.TITLEBAR */;
                const commandCenterEnabled = e.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) && this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */);
                const layoutControlsEnabled = e.affectsConfiguration("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */) && this.configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */);
                const activityBarMovedToTopOrBottom = e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) && ["top" /* ActivityBarPosition.TOP */, "bottom" /* ActivityBarPosition.BOTTOM */].includes(this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */));
                if (activityBarMovedToTopOrBottom || editorActionsMovedToTitlebar || commandCenterEnabled || layoutControlsEnabled) {
                    if (this.configurationService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */) === "never" /* CustomTitleBarVisibility.NEVER */) {
                        this.configurationService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                        return; // onDidChangeConfiguration will be triggered again
                    }
                }
                this.doUpdateLayoutConfiguration();
            }
        }));
        // Fullscreen changes
        this._register(onDidChangeFullscreen(windowId => this.onFullscreenChanged(windowId)));
        // Group changes
        this._register(this.editorGroupService.mainPart.onDidAddGroup(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        this._register(this.editorGroupService.mainPart.onDidRemoveGroup(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        this._register(this.editorGroupService.mainPart.onDidChangeGroupMaximized(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        // Prevent workbench from scrolling #55456
        this._register(addDisposableListener(this.mainContainer, EventType.SCROLL, () => this.mainContainer.scrollTop = 0));
        // Menubar visibility changes
        const showingCustomMenu = (isWindows || isLinux || isWeb) && !hasNativeTitlebar(this.configurationService);
        if (showingCustomMenu) {
            this._register(this.titleService.onMenubarVisibilityChange(visible => this.onMenubarToggled(visible)));
        }
        // Theme changes
        this._register(this.themeService.onDidColorThemeChange(() => this.updateWindowBorder()));
        // Window active / focus changes
        this._register(this.hostService.onDidChangeFocus(focused => this.onWindowFocusChanged(focused)));
        this._register(this.hostService.onDidChangeActiveWindow(() => this.onActiveWindowChanged()));
        // WCO changes
        if (isWeb && typeof navigator.windowControlsOverlay === 'object') {
            this._register(addDisposableListener(navigator.windowControlsOverlay, 'geometrychange', () => this.onDidChangeWCO()));
        }
        // Auxiliary windows
        this._register(this.auxiliaryWindowService.onDidOpenAuxiliaryWindow(({ window, disposables }) => {
            const windowId = window.window.vscodeWindowId;
            this.containerStylesLoaded.set(windowId, window.whenStylesHaveLoaded);
            window.whenStylesHaveLoaded.then(() => this.containerStylesLoaded.delete(windowId));
            disposables.add(toDisposable(() => this.containerStylesLoaded.delete(windowId)));
            const eventDisposables = disposables.add(new DisposableStore());
            this._onDidAddContainer.fire({ container: window.container, disposables: eventDisposables });
            disposables.add(window.onDidLayout(dimension => this.handleContainerDidLayout(window.container, dimension)));
        }));
    }
    onMenubarToggled(visible) {
        if (visible !== this.state.runtime.menuBar.toggled) {
            this.state.runtime.menuBar.toggled = visible;
            const menuBarVisibility = getMenuBarVisibility(this.configurationService);
            // The menu bar toggles the title bar in web because it does not need to be shown for window controls only
            if (isWeb && menuBarVisibility === 'toggle') {
                this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            }
            // The menu bar toggles the title bar in full screen for toggle and classic settings
            else if (this.state.runtime.mainWindowFullscreen && (menuBarVisibility === 'toggle' || menuBarVisibility === 'classic')) {
                this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            }
            // Move layout call to any time the menubar
            // is toggled to update consumers of offset
            // see issue #115267
            this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
        }
    }
    handleContainerDidLayout(container, dimension) {
        if (container === this.mainContainer) {
            this._onDidLayoutMainContainer.fire(dimension);
        }
        if (isActiveDocument(container)) {
            this._onDidLayoutActiveContainer.fire(dimension);
        }
        this._onDidLayoutContainer.fire({ container, dimension });
    }
    onFullscreenChanged(windowId) {
        if (windowId !== mainWindow.vscodeWindowId) {
            return; // ignore all but main window
        }
        this.state.runtime.mainWindowFullscreen = isFullscreen(mainWindow);
        // Apply as CSS class
        if (this.state.runtime.mainWindowFullscreen) {
            this.mainContainer.classList.add(LayoutClasses.FULLSCREEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.FULLSCREEN);
            const zenModeExitInfo = this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO);
            if (zenModeExitInfo.transitionedToFullScreen && this.isZenModeActive()) {
                this.toggleZenMode();
            }
        }
        // Change edge snapping accordingly
        this.workbenchGrid.edgeSnapping = this.state.runtime.mainWindowFullscreen;
        // Changing fullscreen state of the main window has an impact
        // on custom title bar visibility, so we need to update
        if (hasCustomTitlebar(this.configurationService)) {
            // Propagate to grid
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            // Indicate active window border
            this.updateWindowBorder(true);
        }
    }
    onActiveWindowChanged() {
        const activeContainerId = this.getActiveContainerId();
        if (this.state.runtime.activeContainerId !== activeContainerId) {
            this.state.runtime.activeContainerId = activeContainerId;
            // Indicate active window border
            this.updateWindowBorder();
            this._onDidChangeActiveContainer.fire();
        }
    }
    onWindowFocusChanged(hasFocus) {
        if (this.state.runtime.hasFocus !== hasFocus) {
            this.state.runtime.hasFocus = hasFocus;
            // Indicate active window border
            this.updateWindowBorder();
        }
    }
    getActiveContainerId() {
        const activeContainer = this.activeContainer;
        return getWindow(activeContainer).vscodeWindowId;
    }
    doUpdateLayoutConfiguration(skipLayout) {
        // Custom Titlebar visibility with native titlebar
        this.updateCustomTitleBarVisibility();
        // Menubar visibility
        this.updateMenubarVisibility(!!skipLayout);
        // Centered Layout
        this.editorGroupService.whenRestored.then(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED), skipLayout));
    }
    setSideBarPosition(position) {
        const activityBar = this.getPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
        const sideBar = this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const auxiliaryBar = this.getPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const newPositionValue = (position === 0 /* Position.LEFT */) ? 'left' : 'right';
        const oldPositionValue = (position === 1 /* Position.RIGHT */) ? 'left' : 'right';
        const panelAlignment = this.getPanelAlignment();
        const panelPosition = this.getPanelPosition();
        this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON, position);
        // Adjust CSS
        const activityBarContainer = assertReturnsDefined(activityBar.getContainer());
        const sideBarContainer = assertReturnsDefined(sideBar.getContainer());
        const auxiliaryBarContainer = assertReturnsDefined(auxiliaryBar.getContainer());
        activityBarContainer.classList.remove(oldPositionValue);
        sideBarContainer.classList.remove(oldPositionValue);
        activityBarContainer.classList.add(newPositionValue);
        sideBarContainer.classList.add(newPositionValue);
        // Auxiliary Bar has opposite values
        auxiliaryBarContainer.classList.remove(newPositionValue);
        auxiliaryBarContainer.classList.add(oldPositionValue);
        // Update Styles
        activityBar.updateStyles();
        sideBar.updateStyles();
        auxiliaryBar.updateStyles();
        // Move activity bar and side bars
        this.adjustPartPositions(position, panelAlignment, panelPosition);
    }
    updateWindowBorder(skipLayout = false) {
        if (isWeb ||
            isWindows || // not working well with zooming (border often not visible)
            ((isWindows || isLinux) &&
                useWindowControlsOverlay(this.configurationService) // Windows/Linux: not working with WCO (border cannot draw over the overlay)
            ) ||
            hasNativeTitlebar(this.configurationService)) {
            return;
        }
        const theme = this.themeService.getColorTheme();
        const activeBorder = theme.getColor(WINDOW_ACTIVE_BORDER);
        const inactiveBorder = theme.getColor(WINDOW_INACTIVE_BORDER);
        const didHaveMainWindowBorder = this.hasMainWindowBorder();
        for (const container of this.containers) {
            const isMainContainer = container === this.mainContainer;
            const isActiveContainer = this.activeContainer === container;
            let windowBorder = false;
            if (!this.state.runtime.mainWindowFullscreen && (activeBorder || inactiveBorder)) {
                windowBorder = true;
                // If the inactive color is missing, fallback to the active one
                const borderColor = isActiveContainer && this.state.runtime.hasFocus ? activeBorder : inactiveBorder ?? activeBorder;
                container.style.setProperty('--window-border-color', borderColor?.toString() ?? 'transparent');
            }
            if (isMainContainer) {
                this.state.runtime.mainWindowBorder = windowBorder;
            }
            container.classList.toggle(LayoutClasses.WINDOW_BORDER, windowBorder);
        }
        if (!skipLayout && didHaveMainWindowBorder !== this.hasMainWindowBorder()) {
            this.layout();
        }
    }
    initLayoutState(lifecycleService, fileService) {
        this._mainContainerDimension = getClientArea(this.parent, this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? DEFAULT_EMPTY_WINDOW_DIMENSIONS : DEFAULT_WORKSPACE_WINDOW_DIMENSIONS); // running with fallback to ensure no error is thrown (https://github.com/microsoft/vscode/issues/240242)
        this.stateModel = new LayoutStateModel(this.storageService, this.configurationService, this.contextService, this.environmentService);
        this.stateModel.load({
            mainContainerDimension: this._mainContainerDimension,
            resetLayout: Boolean(this.layoutOptions?.resetLayout)
        });
        this._register(this.stateModel.onDidChangeState(change => {
            if (change.key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
                this.setActivityBarHidden(change.value);
            }
            if (change.key === LayoutStateKeys.STATUSBAR_HIDDEN) {
                this.setStatusBarHidden(change.value);
            }
            if (change.key === LayoutStateKeys.SIDEBAR_POSITON) {
                this.setSideBarPosition(change.value);
            }
            if (change.key === LayoutStateKeys.PANEL_POSITION) {
                this.setPanelPosition(change.value);
            }
            if (change.key === LayoutStateKeys.PANEL_ALIGNMENT) {
                this.setPanelAlignment(change.value);
            }
            this.doUpdateLayoutConfiguration();
        }));
        // Layout Initialization State
        const initialEditorsState = this.getInitialEditorsState();
        if (initialEditorsState) {
            this.logService.trace('Initial editor state', initialEditorsState);
        }
        const initialLayoutState = {
            layout: {
                editors: initialEditorsState?.layout
            },
            editor: {
                restoreEditors: this.shouldRestoreEditors(this.contextService, initialEditorsState),
                editorsToOpen: this.resolveEditorsToOpen(fileService, initialEditorsState),
            },
            views: {
                defaults: this.getDefaultLayoutViews(this.environmentService, this.storageService),
                containerToRestore: {}
            }
        };
        // Layout Runtime State
        const layoutRuntimeState = {
            activeContainerId: this.getActiveContainerId(),
            mainWindowFullscreen: isFullscreen(mainWindow),
            hasFocus: this.hostService.hasFocus,
            maximized: new Set(),
            mainWindowBorder: false,
            menuBar: {
                toggled: false,
            },
            zenMode: {
                transitionDisposables: new DisposableMap(),
            }
        };
        this.state = {
            initialization: initialLayoutState,
            runtime: layoutRuntimeState,
        };
        // Sidebar View Container To Restore
        if (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            let viewContainerToRestore = this.storageService.get(SidebarPart.activeViewletSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id);
            if (!this.environmentService.isBuilt ||
                lifecycleService.startupKind === 3 /* StartupKind.ReloadedWindow */ ||
                this.environmentService.isExtensionDevelopment && !this.environmentService.extensionTestsLocationURI) {
                // allow to restore a non-default viewlet in development mode or when window reloads
            }
            else if (viewContainerToRestore !== this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id &&
                viewContainerToRestore !== this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)?.id) {
                // fallback to default viewlet otherwise if the viewlet is not a default viewlet
                viewContainerToRestore = this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id;
            }
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.sideBar = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, true);
            }
        }
        // Panel View Container To Restore
        if (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            const viewContainerToRestore = this.storageService.get(PanelPart.activePanelSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(1 /* ViewContainerLocation.Panel */)?.id);
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.panel = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, true);
            }
        }
        // Auxiliary View to restore
        if (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            const viewContainerToRestore = this.storageService.get(AuxiliaryBarPart.activeViewSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)?.id);
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.auxiliaryBar = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, true);
            }
        }
        // Window border
        this.updateWindowBorder(true);
    }
    getDefaultLayoutViews(environmentService, storageService) {
        const defaultLayout = environmentService.options?.defaultLayout;
        if (!defaultLayout) {
            return undefined;
        }
        if (!defaultLayout.force && !storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
            return undefined;
        }
        const { views } = defaultLayout;
        if (views?.length) {
            return views.map(view => view.id);
        }
        return undefined;
    }
    shouldRestoreEditors(contextService, initialEditorsState) {
        // Restore editors based on a set of rules:
        // - never when running on temporary workspace
        // - not when we have files to open, unless:
        // - always when `window.restoreWindows: preserve`
        if (isTemporaryWorkspace(contextService.getWorkspace())) {
            return false;
        }
        const forceRestoreEditors = this.configurationService.getValue('window.restoreWindows') === 'preserve';
        return !!forceRestoreEditors || initialEditorsState === undefined;
    }
    willRestoreEditors() {
        return this.state.initialization.editor.restoreEditors;
    }
    async resolveEditorsToOpen(fileService, initialEditorsState) {
        if (initialEditorsState) {
            // Merge editor (single)
            const filesToMerge = coalesce(await pathsToEditors(initialEditorsState.filesToMerge, fileService, this.logService));
            if (filesToMerge.length === 4 && isResourceEditorInput(filesToMerge[0]) && isResourceEditorInput(filesToMerge[1]) && isResourceEditorInput(filesToMerge[2]) && isResourceEditorInput(filesToMerge[3])) {
                return [{
                        editor: {
                            input1: { resource: filesToMerge[0].resource },
                            input2: { resource: filesToMerge[1].resource },
                            base: { resource: filesToMerge[2].resource },
                            result: { resource: filesToMerge[3].resource },
                            options: { pinned: true }
                        }
                    }];
            }
            // Diff editor (single)
            const filesToDiff = coalesce(await pathsToEditors(initialEditorsState.filesToDiff, fileService, this.logService));
            if (filesToDiff.length === 2) {
                return [{
                        editor: {
                            original: { resource: filesToDiff[0].resource },
                            modified: { resource: filesToDiff[1].resource },
                            options: { pinned: true }
                        }
                    }];
            }
            // Normal editor (multiple)
            const filesToOpenOrCreate = [];
            const resolvedFilesToOpenOrCreate = await pathsToEditors(initialEditorsState.filesToOpenOrCreate, fileService, this.logService);
            for (let i = 0; i < resolvedFilesToOpenOrCreate.length; i++) {
                const resolvedFileToOpenOrCreate = resolvedFilesToOpenOrCreate[i];
                if (resolvedFileToOpenOrCreate) {
                    filesToOpenOrCreate.push({
                        editor: resolvedFileToOpenOrCreate,
                        viewColumn: initialEditorsState.filesToOpenOrCreate?.[i].viewColumn // take over `viewColumn` from initial state
                    });
                }
            }
            return filesToOpenOrCreate;
        }
        // Empty workbench configured to open untitled file if empty
        else if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && this.configurationService.getValue('workbench.startupEditor') === 'newUntitledFile') {
            if (this.editorGroupService.hasRestorableState) {
                return []; // do not open any empty untitled file if we restored groups/editors from previous session
            }
            return [{
                    editor: { resource: undefined } // open empty untitled file
                }];
        }
        return [];
    }
    get openedDefaultEditors() { return this._openedDefaultEditors; }
    getInitialEditorsState() {
        // Check for editors / editor layout from `defaultLayout` options first
        const defaultLayout = this.environmentService.options?.defaultLayout;
        if ((defaultLayout?.editors?.length || defaultLayout?.layout?.editors) && (defaultLayout.force || this.storageService.isNew(1 /* StorageScope.WORKSPACE */))) {
            this._openedDefaultEditors = true;
            return {
                layout: defaultLayout.layout?.editors,
                filesToOpenOrCreate: defaultLayout?.editors?.map(editor => {
                    return {
                        viewColumn: editor.viewColumn,
                        fileUri: URI.revive(editor.uri),
                        openOnlyIfExists: editor.openOnlyIfExists,
                        options: editor.options
                    };
                })
            };
        }
        // Then check for files to open, create or diff/merge from main side
        const { filesToOpenOrCreate, filesToDiff, filesToMerge } = this.environmentService;
        if (filesToOpenOrCreate || filesToDiff || filesToMerge) {
            return { filesToOpenOrCreate, filesToDiff, filesToMerge };
        }
        return undefined;
    }
    isRestored() {
        return this.restored;
    }
    restoreParts() {
        // distinguish long running restore operations that
        // are required for the layout to be ready from those
        // that are needed to signal restoring is done
        const layoutReadyPromises = [];
        const layoutRestoredPromises = [];
        // Restore editors
        layoutReadyPromises.push((async () => {
            mark('code/willRestoreEditors');
            // first ensure the editor part is ready
            await this.editorGroupService.whenReady;
            mark('code/restoreEditors/editorGroupsReady');
            // apply editor layout if any
            if (this.state.initialization.layout?.editors) {
                this.editorGroupService.mainPart.applyLayout(this.state.initialization.layout.editors);
            }
            // then see for editors to open as instructed
            // it is important that we trigger this from
            // the overall restore flow to reduce possible
            // flicker on startup: we want any editor to
            // open to get a chance to open first before
            // signaling that layout is restored, but we do
            // not need to await the editors from having
            // fully loaded.
            const editors = await this.state.initialization.editor.editorsToOpen;
            mark('code/restoreEditors/editorsToOpenResolved');
            let openEditorsPromise = undefined;
            if (editors.length) {
                // we have to map editors to their groups as instructed
                // by the input. this is important to ensure that we open
                // the editors in the groups they belong to.
                const editorGroupsInVisualOrder = this.editorGroupService.mainPart.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
                const mapEditorsToGroup = new Map();
                for (const editor of editors) {
                    const group = editorGroupsInVisualOrder[(editor.viewColumn ?? 1) - 1]; // viewColumn is index+1 based
                    let editorsByGroup = mapEditorsToGroup.get(group.id);
                    if (!editorsByGroup) {
                        editorsByGroup = new Set();
                        mapEditorsToGroup.set(group.id, editorsByGroup);
                    }
                    editorsByGroup.add(editor.editor);
                }
                openEditorsPromise = Promise.all(Array.from(mapEditorsToGroup).map(async ([groupId, editors]) => {
                    try {
                        await this.editorService.openEditors(Array.from(editors), groupId, { validateTrust: true });
                    }
                    catch (error) {
                        this.logService.error(error);
                    }
                }));
            }
            // do not block the overall layout ready flow from potentially
            // slow editors to resolve on startup
            layoutRestoredPromises.push(Promise.all([
                openEditorsPromise?.finally(() => mark('code/restoreEditors/editorsOpened')),
                this.editorGroupService.whenRestored.finally(() => mark('code/restoreEditors/editorGroupsRestored'))
            ]).finally(() => {
                // the `code/didRestoreEditors` perf mark is specifically
                // for when visible editors have resolved, so we only mark
                // if when editor group service has restored.
                mark('code/didRestoreEditors');
            }));
        })());
        // Restore default views (only when `IDefaultLayout` is provided)
        const restoreDefaultViewsPromise = (async () => {
            if (this.state.initialization.views.defaults?.length) {
                mark('code/willOpenDefaultViews');
                const locationsRestored = [];
                const tryOpenView = (view) => {
                    const location = this.viewDescriptorService.getViewLocationById(view.id);
                    if (location !== null) {
                        const container = this.viewDescriptorService.getViewContainerByViewId(view.id);
                        if (container) {
                            if (view.order >= (locationsRestored?.[location]?.order ?? 0)) {
                                locationsRestored[location] = { id: container.id, order: view.order };
                            }
                            const containerModel = this.viewDescriptorService.getViewContainerModel(container);
                            containerModel.setCollapsed(view.id, false);
                            containerModel.setVisible(view.id, true);
                            return true;
                        }
                    }
                    return false;
                };
                const defaultViews = [...this.state.initialization.views.defaults].reverse().map((v, index) => ({ id: v, order: index }));
                let i = defaultViews.length;
                while (i) {
                    i--;
                    if (tryOpenView(defaultViews[i])) {
                        defaultViews.splice(i, 1);
                    }
                }
                // If we still have views left over, wait until all extensions have been registered and try again
                if (defaultViews.length) {
                    await this.extensionService.whenInstalledExtensionsRegistered();
                    let i = defaultViews.length;
                    while (i) {
                        i--;
                        if (tryOpenView(defaultViews[i])) {
                            defaultViews.splice(i, 1);
                        }
                    }
                }
                // If we opened a view in the sidebar, stop any restore there
                if (locationsRestored[0 /* ViewContainerLocation.Sidebar */]) {
                    this.state.initialization.views.containerToRestore.sideBar = locationsRestored[0 /* ViewContainerLocation.Sidebar */].id;
                }
                // If we opened a view in the panel, stop any restore there
                if (locationsRestored[1 /* ViewContainerLocation.Panel */]) {
                    this.state.initialization.views.containerToRestore.panel = locationsRestored[1 /* ViewContainerLocation.Panel */].id;
                }
                // If we opened a view in the auxiliary bar, stop any restore there
                if (locationsRestored[2 /* ViewContainerLocation.AuxiliaryBar */]) {
                    this.state.initialization.views.containerToRestore.auxiliaryBar = locationsRestored[2 /* ViewContainerLocation.AuxiliaryBar */].id;
                }
                mark('code/didOpenDefaultViews');
            }
        })();
        layoutReadyPromises.push(restoreDefaultViewsPromise);
        // Restore Sidebar
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that sidebar already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.sideBar) {
                return;
            }
            mark('code/willRestoreViewlet');
            await this.openViewContainer(0 /* ViewContainerLocation.Sidebar */, this.state.initialization.views.containerToRestore.sideBar);
            mark('code/didRestoreViewlet');
        })());
        // Restore Panel
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that panel already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.panel) {
                return;
            }
            mark('code/willRestorePanel');
            await this.openViewContainer(1 /* ViewContainerLocation.Panel */, this.state.initialization.views.containerToRestore.panel);
            mark('code/didRestorePanel');
        })());
        // Restore Auxiliary Bar
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that auxbar already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.auxiliaryBar) {
                return;
            }
            mark('code/willRestoreAuxiliaryBar');
            await this.openViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */, this.state.initialization.views.containerToRestore.auxiliaryBar);
            mark('code/didRestoreAuxiliaryBar');
        })());
        // Restore Zen Mode
        const zenModeWasActive = this.isZenModeActive();
        const restoreZenMode = getZenModeConfiguration(this.configurationService).restore;
        if (zenModeWasActive) {
            this.setZenModeActive(!restoreZenMode);
            this.toggleZenMode(false, true);
        }
        // Restore Main Editor Center Mode
        if (this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED)) {
            this.centerMainEditorLayout(true, true);
        }
        // Await for promises that we recorded to update
        // our ready and restored states properly.
        Promises.settled(layoutReadyPromises).finally(() => {
            // Focus the active maximized part in case we have
            // not yet focused a specific element and panel
            // or auxiliary bar are maximized.
            if (getActiveElement() === mainWindow.document.body && (this.isPanelMaximized() || this.isAuxiliaryBarMaximized())) {
                this.focus();
            }
            this.whenReadyPromise.complete();
            Promises.settled(layoutRestoredPromises).finally(() => {
                this.restored = true;
                this.whenRestoredPromise.complete();
            });
        });
    }
    async openViewContainer(location, id, focus) {
        let viewContainer = await this.paneCompositeService.openPaneComposite(id, location, focus);
        if (viewContainer) {
            return;
        }
        // fallback to default view container
        viewContainer = await this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(location)?.id, location, focus);
        if (viewContainer) {
            return;
        }
        // finally try to just open the first visible view container
        await this.paneCompositeService.openPaneComposite(this.paneCompositeService.getVisiblePaneCompositeIds(location).at(0), location, focus);
    }
    registerPart(part) {
        const id = part.getId();
        this.parts.set(id, part);
        return toDisposable(() => this.parts.delete(id));
    }
    getPart(key) {
        const part = this.parts.get(key);
        if (!part) {
            throw new Error(`Unknown part ${key}`);
        }
        return part;
    }
    registerNotifications(delegate) {
        this._register(delegate.onDidChangeNotificationsVisibility(visible => this._onDidChangeNotificationsVisibility.fire(visible)));
    }
    hasFocus(part) {
        const container = this.getContainer(getActiveWindow(), part);
        if (!container) {
            return false;
        }
        const activeElement = getActiveElement();
        if (!activeElement) {
            return false;
        }
        return isAncestorUsingFlowTo(activeElement, container);
    }
    _getFocusedPart() {
        for (const part of this.parts.keys()) {
            if (this.hasFocus(part)) {
                return part;
            }
        }
        return undefined;
    }
    focusPart(part, targetWindow = mainWindow) {
        const container = this.getContainer(targetWindow, part) ?? this.mainContainer;
        switch (part) {
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                this.editorGroupService.getPart(container).activeGroup.focus();
                break;
            case "workbench.parts.panel" /* Parts.PANEL_PART */: {
                this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)?.focus();
                break;
            }
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */: {
                this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)?.focus();
                break;
            }
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */: {
                this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)?.focus();
                break;
            }
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */).focusActivityBar();
                break;
            case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                this.statusBarService.getPart(container).focus();
                break;
            default: {
                container?.focus();
            }
        }
    }
    getContainer(targetWindow, part) {
        if (typeof part === 'undefined') {
            return this.getContainerFromDocument(targetWindow.document);
        }
        if (targetWindow === mainWindow) {
            return this.getPart(part).getContainer();
        }
        // Only some parts are supported for auxiliary windows
        let partCandidate;
        if (part === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            partCandidate = this.editorGroupService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        else if (part === "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */) {
            partCandidate = this.statusBarService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        else if (part === "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */) {
            partCandidate = this.titleService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        if (partCandidate instanceof Part) {
            return partCandidate.getContainer();
        }
        return undefined;
    }
    isVisible(part, targetWindow = mainWindow) {
        if (targetWindow !== mainWindow && part === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            return true; // cannot hide editor part in auxiliary windows
        }
        switch (part) {
            case "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */:
                return this.initialized ?
                    this.workbenchGrid.isViewVisible(this.titleBarPartView) :
                    shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN);
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN);
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN);
            case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN);
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN);
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN);
            case "workbench.parts.banner" /* Parts.BANNER_PART */:
                return this.initialized ? this.workbenchGrid.isViewVisible(this.bannerPartView) : false;
            default:
                return false; // any other part cannot be hidden
        }
    }
    shouldShowBannerFirst() {
        return isWeb && !isWCOEnabled();
    }
    focus() {
        if (this.isPanelMaximized() && this.mainContainer === this.activeContainer) {
            this.focusPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        else if (this.isAuxiliaryBarMaximized() && this.mainContainer === this.activeContainer) {
            this.focusPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
        else {
            this.focusPart("workbench.parts.editor" /* Parts.EDITOR_PART */, getWindow(this.activeContainer));
        }
    }
    focusPanelOrEditor() {
        const activePanel = this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if ((this.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */) || !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */)) && activePanel) {
            activePanel.focus(); // prefer panel if it has focus or editor is hidden
        }
        else {
            this.focus(); // otherwise focus editor
        }
    }
    getMaximumEditorDimensions(container) {
        const targetWindow = getWindow(container);
        const containerDimension = this.getContainerDimension(container);
        if (container === this.mainContainer) {
            const isPanelHorizontal = isHorizontal(this.getPanelPosition());
            const takenWidth = (this.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */) ? this.activityBarPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? this.sideBarPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && !isPanelHorizontal ? this.panelPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? this.auxiliaryBarPartView.minimumWidth : 0);
            const takenHeight = (this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow) ? this.titleBarPartView.minimumHeight : 0) +
                (this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, targetWindow) ? this.statusBarPartView.minimumHeight : 0) +
                (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && isPanelHorizontal ? this.panelPartView.minimumHeight : 0);
            const availableWidth = containerDimension.width - takenWidth;
            const availableHeight = containerDimension.height - takenHeight;
            return { width: availableWidth, height: availableHeight };
        }
        else {
            const takenHeight = (this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow) ? this.titleBarPartView.minimumHeight : 0) +
                (this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, targetWindow) ? this.statusBarPartView.minimumHeight : 0);
            return { width: containerDimension.width, height: containerDimension.height - takenHeight };
        }
    }
    isZenModeActive() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
    }
    setZenModeActive(active) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE, active);
    }
    toggleZenMode(skipLayout, restoring = false) {
        const focusedPartPreTransition = this._getFocusedPart();
        this.setZenModeActive(!this.isZenModeActive());
        this.state.runtime.zenMode.transitionDisposables.clearAndDisposeAll();
        const setLineNumbers = (lineNumbers) => {
            for (const editor of this.mainPartEditorService.visibleTextEditorControls) {
                // To properly reset line numbers we need to read the configuration for each editor respecting it's uri.
                if (!lineNumbers && isCodeEditor(editor) && editor.hasModel()) {
                    const model = editor.getModel();
                    lineNumbers = this.configurationService.getValue('editor.lineNumbers', { resource: model.uri, overrideIdentifier: model.getLanguageId() });
                }
                if (!lineNumbers) {
                    lineNumbers = this.configurationService.getValue('editor.lineNumbers');
                }
                editor.updateOptions({ lineNumbers });
            }
        };
        // Check if zen mode transitioned to full screen and if now we are out of zen mode
        // -> we need to go out of full screen (same goes for the centered editor layout)
        let toggleMainWindowFullScreen = false;
        const config = getZenModeConfiguration(this.configurationService);
        const zenModeExitInfo = this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO);
        // Zen Mode Active
        if (this.isZenModeActive()) {
            toggleMainWindowFullScreen = !this.state.runtime.mainWindowFullscreen && config.fullScreen && !isIOS;
            if (!restoring) {
                zenModeExitInfo.transitionedToFullScreen = toggleMainWindowFullScreen;
                zenModeExitInfo.transitionedToCenteredEditorLayout = !this.isMainEditorLayoutCentered() && config.centerLayout;
                zenModeExitInfo.handleNotificationsDoNotDisturbMode = this.notificationService.getFilter() === NotificationsFilter.OFF;
                zenModeExitInfo.wasVisible.sideBar = this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
                zenModeExitInfo.wasVisible.panel = this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */);
                zenModeExitInfo.wasVisible.auxiliaryBar = this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
                this.stateModel.setRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO, zenModeExitInfo);
            }
            this.setPanelHidden(true, true);
            this.setAuxiliaryBarHidden(true, true);
            this.setSideBarHidden(true);
            if (config.hideActivityBar) {
                this.setActivityBarHidden(true);
            }
            if (config.hideStatusBar) {
                this.setStatusBarHidden(true);
            }
            if (config.hideLineNumbers) {
                setLineNumbers('off');
                this.state.runtime.zenMode.transitionDisposables.set("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */, this.mainPartEditorService.onDidVisibleEditorsChange(() => setLineNumbers('off')));
            }
            if (config.showTabs !== this.editorGroupService.partOptions.showTabs) {
                this.state.runtime.zenMode.transitionDisposables.set("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, this.editorGroupService.mainPart.enforcePartOptions({ showTabs: config.showTabs }));
            }
            if (config.silentNotifications && zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                this.notificationService.setFilter(NotificationsFilter.ERROR);
            }
            if (config.centerLayout) {
                this.centerMainEditorLayout(true, true);
            }
            // Zen Mode Configuration Changes
            this.state.runtime.zenMode.transitionDisposables.set('configurationChange', this.configurationService.onDidChangeConfiguration(e => {
                // Activity Bar
                if (e.affectsConfiguration("zenMode.hideActivityBar" /* ZenModeSettings.HIDE_ACTIVITYBAR */) || e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                    const zenModeHideActivityBar = this.configurationService.getValue("zenMode.hideActivityBar" /* ZenModeSettings.HIDE_ACTIVITYBAR */);
                    const activityBarLocation = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
                    this.setActivityBarHidden(zenModeHideActivityBar ? true : (activityBarLocation === "top" /* ActivityBarPosition.TOP */ || activityBarLocation === "bottom" /* ActivityBarPosition.BOTTOM */));
                }
                // Status Bar
                if (e.affectsConfiguration("zenMode.hideStatusBar" /* ZenModeSettings.HIDE_STATUSBAR */)) {
                    const zenModeHideStatusBar = this.configurationService.getValue("zenMode.hideStatusBar" /* ZenModeSettings.HIDE_STATUSBAR */);
                    this.setStatusBarHidden(zenModeHideStatusBar);
                }
                // Center Layout
                if (e.affectsConfiguration("zenMode.centerLayout" /* ZenModeSettings.CENTER_LAYOUT */)) {
                    const zenModeCenterLayout = this.configurationService.getValue("zenMode.centerLayout" /* ZenModeSettings.CENTER_LAYOUT */);
                    this.centerMainEditorLayout(zenModeCenterLayout, true);
                }
                // Show Tabs
                if (e.affectsConfiguration("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */)) {
                    const zenModeShowTabs = this.configurationService.getValue("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */) ?? 'multiple';
                    this.state.runtime.zenMode.transitionDisposables.set("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, this.editorGroupService.mainPart.enforcePartOptions({ showTabs: zenModeShowTabs }));
                }
                // Notifications
                if (e.affectsConfiguration("zenMode.silentNotifications" /* ZenModeSettings.SILENT_NOTIFICATIONS */)) {
                    const zenModeSilentNotifications = !!this.configurationService.getValue("zenMode.silentNotifications" /* ZenModeSettings.SILENT_NOTIFICATIONS */);
                    if (zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                        this.notificationService.setFilter(zenModeSilentNotifications ? NotificationsFilter.ERROR : NotificationsFilter.OFF);
                    }
                }
                // Center Layout
                if (e.affectsConfiguration("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */)) {
                    const lineNumbersType = this.configurationService.getValue("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */) ? 'off' : undefined;
                    setLineNumbers(lineNumbersType);
                    this.state.runtime.zenMode.transitionDisposables.set("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */, this.mainPartEditorService.onDidVisibleEditorsChange(() => setLineNumbers(lineNumbersType)));
                }
            }));
        }
        // Zen Mode Inactive
        else {
            if (zenModeExitInfo.wasVisible.panel) {
                this.setPanelHidden(false, true);
            }
            if (zenModeExitInfo.wasVisible.auxiliaryBar) {
                this.setAuxiliaryBarHidden(false, true);
            }
            if (zenModeExitInfo.wasVisible.sideBar) {
                this.setSideBarHidden(false);
            }
            if (!this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, true)) {
                this.setActivityBarHidden(false);
            }
            if (!this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN, true)) {
                this.setStatusBarHidden(false);
            }
            if (zenModeExitInfo.transitionedToCenteredEditorLayout) {
                this.centerMainEditorLayout(false, true);
            }
            if (zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                this.notificationService.setFilter(NotificationsFilter.OFF);
            }
            setLineNumbers();
            toggleMainWindowFullScreen = zenModeExitInfo.transitionedToFullScreen && this.state.runtime.mainWindowFullscreen;
        }
        if (!skipLayout) {
            this.layout();
        }
        if (toggleMainWindowFullScreen) {
            this.hostService.toggleFullScreen(mainWindow);
        }
        // restore focus if part is still visible, otherwise fallback to editor
        if (focusedPartPreTransition && this.isVisible(focusedPartPreTransition, getWindow(this.activeContainer))) {
            if (isMultiWindowPart(focusedPartPreTransition)) {
                this.focusPart(focusedPartPreTransition, getWindow(this.activeContainer));
            }
            else {
                this.focusPart(focusedPartPreTransition);
            }
        }
        else {
            this.focus();
        }
        // Event
        this._onDidChangeZenMode.fire(this.isZenModeActive());
    }
    setStatusBarHidden(hidden) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.STATUSBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.STATUSBAR_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.statusBarPartView, !hidden);
    }
    createWorkbenchLayout() {
        const titleBar = this.getPart("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */);
        const bannerPart = this.getPart("workbench.parts.banner" /* Parts.BANNER_PART */);
        const editorPart = this.getPart("workbench.parts.editor" /* Parts.EDITOR_PART */);
        const activityBar = this.getPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
        const panelPart = this.getPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        const auxiliaryBarPart = this.getPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const sideBar = this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const statusBar = this.getPart("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */);
        // View references for all parts
        this.titleBarPartView = titleBar;
        this.bannerPartView = bannerPart;
        this.sideBarPartView = sideBar;
        this.activityBarPartView = activityBar;
        this.editorPartView = editorPart;
        this.panelPartView = panelPart;
        this.auxiliaryBarPartView = auxiliaryBarPart;
        this.statusBarPartView = statusBar;
        const viewMap = {
            ["workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */]: this.activityBarPartView,
            ["workbench.parts.banner" /* Parts.BANNER_PART */]: this.bannerPartView,
            ["workbench.parts.titlebar" /* Parts.TITLEBAR_PART */]: this.titleBarPartView,
            ["workbench.parts.editor" /* Parts.EDITOR_PART */]: this.editorPartView,
            ["workbench.parts.panel" /* Parts.PANEL_PART */]: this.panelPartView,
            ["workbench.parts.sidebar" /* Parts.SIDEBAR_PART */]: this.sideBarPartView,
            ["workbench.parts.statusbar" /* Parts.STATUSBAR_PART */]: this.statusBarPartView,
            ["workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */]: this.auxiliaryBarPartView
        };
        const fromJSON = ({ type }) => viewMap[type];
        const workbenchGrid = SerializableGrid.deserialize(this.createGridDescriptor(), { fromJSON }, { proportionalLayout: false });
        this.mainContainer.prepend(workbenchGrid.element);
        this.mainContainer.setAttribute('role', 'application');
        this.workbenchGrid = workbenchGrid;
        this.workbenchGrid.edgeSnapping = this.state.runtime.mainWindowFullscreen;
        for (const part of [titleBar, editorPart, activityBar, panelPart, sideBar, statusBar, auxiliaryBarPart, bannerPart]) {
            this._register(part.onDidVisibilityChange(visible => {
                if (!this.inMaximizedAuxiliaryBarTransition) {
                    // skip reacting when we are transitioning
                    // in or out of maximised auxiliary bar to prevent
                    // stepping on each other toes because this
                    // transition is already dealing with all parts
                    // visibility efficiently.
                    if (part === sideBar) {
                        this.setSideBarHidden(!visible);
                    }
                    else if (part === panelPart && this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN) === visible) {
                        this.setPanelHidden(!visible, true);
                    }
                    else if (part === auxiliaryBarPart) {
                        this.setAuxiliaryBarHidden(!visible, true);
                    }
                    else if (part === editorPart) {
                        this.setEditorHidden(!visible);
                    }
                }
                this._onDidChangePartVisibility.fire();
                this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
            }));
        }
        this._register(this.storageService.onWillSaveState(() => {
            // Side Bar Size
            const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.sideBarPartView)
                : this.workbenchGrid.getViewSize(this.sideBarPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.SIDEBAR_SIZE, sideBarSize);
            // Panel Size
            const panelSize = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView)
                : isHorizontal(this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION))
                    ? this.workbenchGrid.getViewSize(this.panelPartView).height
                    : this.workbenchGrid.getViewSize(this.panelPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.PANEL_SIZE, panelSize);
            // Auxiliary Bar Size
            const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.auxiliaryBarPartView)
                : this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE, auxiliaryBarSize);
            this.stateModel.save(true, true);
        }));
        this._register(Event.any(this.paneCompositeService.onDidPaneCompositeOpen, this.paneCompositeService.onDidPaneCompositeClose)(() => {
            // Auxiliary Bar State
            this.stateModel.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_EMPTY, this.paneCompositeService.getPaneCompositeIds(2 /* ViewContainerLocation.AuxiliaryBar */).length === 0);
        }));
    }
    layout() {
        if (!this.disposed) {
            this._mainContainerDimension = getClientArea(this.state.runtime.mainWindowFullscreen ?
                mainWindow.document.body : // in fullscreen mode, make sure to use <body> element because
                this.parent, // in that case the workbench will span the entire site
            this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? DEFAULT_EMPTY_WINDOW_DIMENSIONS : DEFAULT_WORKSPACE_WINDOW_DIMENSIONS // running with fallback to ensure no error is thrown (https://github.com/microsoft/vscode/issues/240242)
            );
            this.logService.trace(`Layout#layout, height: ${this._mainContainerDimension.height}, width: ${this._mainContainerDimension.width}`);
            size(this.mainContainer, this._mainContainerDimension.width, this._mainContainerDimension.height);
            // Layout the grid widget
            this.workbenchGrid.layout(this._mainContainerDimension.width, this._mainContainerDimension.height);
            this.initialized = true;
            // Emit as event
            this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
        }
    }
    isMainEditorLayoutCentered() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED);
    }
    centerMainEditorLayout(active, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED, active);
        const mainVisibleEditors = coalesce(this.editorGroupService.mainPart.groups.map(group => group.activeEditor));
        const isEditorComplex = mainVisibleEditors.some(editor => {
            if (editor instanceof DiffEditorInput) {
                return this.configurationService.getValue('diffEditor.renderSideBySide');
            }
            if (editor?.hasCapability(256 /* EditorInputCapabilities.MultipleEditors */)) {
                return true;
            }
            return false;
        });
        const layout = this.editorGroupService.getLayout();
        let hasMoreThanOneColumn = false;
        if (layout.orientation === 0 /* GroupOrientation.HORIZONTAL */) {
            hasMoreThanOneColumn = layout.groups.length > 1;
        }
        else {
            hasMoreThanOneColumn = layout.groups.some(group => group.groups && group.groups.length > 1);
        }
        const isCenteredLayoutAutoResizing = this.configurationService.getValue('workbench.editor.centeredLayoutAutoResize');
        if (isCenteredLayoutAutoResizing &&
            ((hasMoreThanOneColumn && !this.editorGroupService.mainPart.hasMaximizedGroup()) || isEditorComplex)) {
            active = false; // disable centered layout for complex editors or when there is more than one group
        }
        if (this.editorGroupService.mainPart.isLayoutCentered() !== active) {
            this.editorGroupService.mainPart.centerLayout(active);
            if (!skipLayout) {
                this.layout();
            }
        }
        this._onDidChangeMainEditorCenteredLayout.fire(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED));
    }
    getSize(part) {
        return this.workbenchGrid.getViewSize(this.getPart(part));
    }
    setSize(part, size) {
        this.workbenchGrid.resizeView(this.getPart(part), size);
    }
    resizePart(part, sizeChangeWidth, sizeChangeHeight) {
        const sizeChangePxWidth = Math.sign(sizeChangeWidth) * computeScreenAwareSize(getActiveWindow(), Math.abs(sizeChangeWidth));
        const sizeChangePxHeight = Math.sign(sizeChangeHeight) * computeScreenAwareSize(getActiveWindow(), Math.abs(sizeChangeHeight));
        let viewSize;
        switch (part) {
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.sideBarPartView);
                this.workbenchGrid.resizeView(this.sideBarPartView, {
                    width: viewSize.width + sizeChangePxWidth,
                    height: viewSize.height
                });
                break;
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.panelPartView);
                this.workbenchGrid.resizeView(this.panelPartView, {
                    width: viewSize.width + (isHorizontal(this.getPanelPosition()) ? 0 : sizeChangePxWidth),
                    height: viewSize.height + (isHorizontal(this.getPanelPosition()) ? sizeChangePxHeight : 0)
                });
                break;
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
                this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                    width: viewSize.width + sizeChangePxWidth,
                    height: viewSize.height
                });
                break;
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.editorPartView);
                // Single Editor Group
                if (this.editorGroupService.mainPart.count === 1) {
                    this.workbenchGrid.resizeView(this.editorPartView, {
                        width: viewSize.width + sizeChangePxWidth,
                        height: viewSize.height + sizeChangePxHeight
                    });
                }
                else {
                    const activeGroup = this.editorGroupService.mainPart.activeGroup;
                    const { width, height } = this.editorGroupService.mainPart.getSize(activeGroup);
                    this.editorGroupService.mainPart.setSize(activeGroup, { width: width + sizeChangePxWidth, height: height + sizeChangePxHeight });
                    // After resizing the editor group
                    // if it does not change in either direction
                    // try resizing the full editor part
                    const { width: newWidth, height: newHeight } = this.editorGroupService.mainPart.getSize(activeGroup);
                    if ((sizeChangePxHeight && height === newHeight) || (sizeChangePxWidth && width === newWidth)) {
                        this.workbenchGrid.resizeView(this.editorPartView, {
                            width: viewSize.width + (sizeChangePxWidth && width === newWidth ? sizeChangePxWidth : 0),
                            height: viewSize.height + (sizeChangePxHeight && height === newHeight ? sizeChangePxHeight : 0)
                        });
                    }
                }
                break;
            default:
                return; // Cannot resize other parts
        }
    }
    setActivityBarHidden(hidden) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, hidden);
        this.workbenchGrid.setViewVisible(this.activityBarPartView, !hidden);
    }
    setBannerHidden(hidden) {
        this.workbenchGrid.setViewVisible(this.bannerPartView, !hidden);
    }
    setEditorHidden(hidden) {
        if (!hidden && this.setAuxiliaryBarMaximized(false) && this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part visible
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.MAIN_EDITOR_AREA_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.MAIN_EDITOR_AREA_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.editorPartView, !hidden);
        // The editor and panel cannot be hidden at the same time
        // unless we have a maximized auxiliary bar
        if (hidden && !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && !this.isAuxiliaryBarMaximized()) {
            this.setPanelHidden(false, true);
        }
    }
    getLayoutClasses() {
        return coalesce([
            !this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? LayoutClasses.SIDEBAR_HIDDEN : undefined,
            !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow) ? LayoutClasses.MAIN_EDITOR_AREA_HIDDEN : undefined,
            !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? LayoutClasses.PANEL_HIDDEN : undefined,
            !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? LayoutClasses.AUXILIARYBAR_HIDDEN : undefined,
            !this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */) ? LayoutClasses.STATUSBAR_HIDDEN : undefined,
            this.state.runtime.mainWindowFullscreen ? LayoutClasses.FULLSCREEN : undefined
        ]);
    }
    setSideBarHidden(hidden) {
        if (!hidden && this.setAuxiliaryBarMaximized(false) && this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part visible
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.SIDEBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.SIDEBAR_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.sideBarPartView, !hidden);
        // If sidebar becomes hidden, also hide the current active Viewlet if any
        if (hidden && this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)) {
            this.paneCompositeService.hideActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
            if (!this.isAuxiliaryBarMaximized()) {
                this.focusPanelOrEditor(); // do not auto focus when auxiliary bar is maximized
            }
        }
        // If sidebar becomes visible, show last active Viewlet or default viewlet
        else if (!hidden && !this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)) {
            const viewletToOpen = this.paneCompositeService.getLastActivePaneCompositeId(0 /* ViewContainerLocation.Sidebar */);
            if (viewletToOpen) {
                this.openViewContainer(0 /* ViewContainerLocation.Sidebar */, viewletToOpen);
            }
        }
    }
    hasViews(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (!viewContainer) {
            return false;
        }
        const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
        if (!viewContainerModel) {
            return false;
        }
        return viewContainerModel.activeViewDescriptors.length >= 1;
    }
    adjustPartPositions(sideBarPosition, panelAlignment, panelPosition) {
        // Move activity bar and side bars
        const isPanelVertical = !isHorizontal(panelPosition);
        const sideBarSiblingToEditor = isPanelVertical || !(panelAlignment === 'center' || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'right') || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'left'));
        const auxiliaryBarSiblingToEditor = isPanelVertical || !(panelAlignment === 'center' || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'right') || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'left'));
        const preMovePanelWidth = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView) ?? this.panelPartView.minimumWidth) : this.workbenchGrid.getViewSize(this.panelPartView).width;
        const preMovePanelHeight = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView) ?? this.panelPartView.minimumHeight) : this.workbenchGrid.getViewSize(this.panelPartView).height;
        const preMoveSideBarSize = !this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.sideBarPartView) ?? this.sideBarPartView.minimumWidth) : this.workbenchGrid.getViewSize(this.sideBarPartView).width;
        const preMoveAuxiliaryBarSize = !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.auxiliaryBarPartView) ?? this.auxiliaryBarPartView.minimumWidth) : this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
        const focusedPart = ["workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */].find(part => this.hasFocus(part));
        if (sideBarPosition === 0 /* Position.LEFT */) {
            this.workbenchGrid.moveViewTo(this.activityBarPartView, [2, 0]);
            this.workbenchGrid.moveView(this.sideBarPartView, preMoveSideBarSize, sideBarSiblingToEditor ? this.editorPartView : this.activityBarPartView, sideBarSiblingToEditor ? 2 /* Direction.Left */ : 3 /* Direction.Right */);
            if (auxiliaryBarSiblingToEditor) {
                this.workbenchGrid.moveView(this.auxiliaryBarPartView, preMoveAuxiliaryBarSize, this.editorPartView, 3 /* Direction.Right */);
            }
            else {
                this.workbenchGrid.moveViewTo(this.auxiliaryBarPartView, [2, -1]);
            }
        }
        else {
            this.workbenchGrid.moveViewTo(this.activityBarPartView, [2, -1]);
            this.workbenchGrid.moveView(this.sideBarPartView, preMoveSideBarSize, sideBarSiblingToEditor ? this.editorPartView : this.activityBarPartView, sideBarSiblingToEditor ? 3 /* Direction.Right */ : 2 /* Direction.Left */);
            if (auxiliaryBarSiblingToEditor) {
                this.workbenchGrid.moveView(this.auxiliaryBarPartView, preMoveAuxiliaryBarSize, this.editorPartView, 2 /* Direction.Left */);
            }
            else {
                this.workbenchGrid.moveViewTo(this.auxiliaryBarPartView, [2, 0]);
            }
        }
        // Maintain focus after moving parts
        if (focusedPart) {
            this.focusPart(focusedPart);
        }
        // We moved all the side parts based on the editor and ignored the panel
        // Now, we need to put the panel back in the right position when it is next to the editor
        if (isPanelVertical) {
            this.workbenchGrid.moveView(this.panelPartView, preMovePanelWidth, this.editorPartView, panelPosition === 0 /* Position.LEFT */ ? 2 /* Direction.Left */ : 3 /* Direction.Right */);
            this.workbenchGrid.resizeView(this.panelPartView, {
                height: preMovePanelHeight,
                width: preMovePanelWidth
            });
        }
        // Moving views in the grid can cause them to re-distribute sizing unnecessarily
        // Resize visible parts to the width they were before the operation
        if (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            this.workbenchGrid.resizeView(this.sideBarPartView, {
                height: this.workbenchGrid.getViewSize(this.sideBarPartView).height,
                width: preMoveSideBarSize
            });
        }
        if (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                height: this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).height,
                width: preMoveAuxiliaryBarSize
            });
        }
    }
    setPanelAlignment(alignment) {
        // Panel alignment only applies to a panel in the top/bottom position
        if (!isHorizontal(this.getPanelPosition())) {
            this.setPanelPosition(2 /* Position.BOTTOM */);
        }
        // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        if (alignment !== 'center' && this.isPanelMaximized()) {
            this.toggleMaximizedPanel();
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT, alignment);
        this.adjustPartPositions(this.getSideBarPosition(), alignment, this.getPanelPosition());
        this._onDidChangePanelAlignment.fire(alignment);
    }
    setPanelHidden(hidden, skipLayout) {
        if (!this.workbenchGrid) {
            return; // Return if not initialized fully (https://github.com/microsoft/vscode/issues/105480)
        }
        if (!hidden && this.setAuxiliaryBarMaximized(false) && this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part visible
        }
        const wasHidden = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */);
        const isPanelMaximized = this.isPanelMaximized();
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, hidden);
        const panelOpensMaximized = this.panelOpensMaximized();
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.PANEL_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.PANEL_HIDDEN);
        }
        // If maximized and in process of hiding, unmaximize FIRST before
        // changing visibility to prevent conflict with setEditorHidden
        // which would force panel visible again (fixes #281772)
        if (hidden && isPanelMaximized) {
            this.toggleMaximizedPanel();
        }
        // Propagate layout changes to grid
        this.workbenchGrid.setViewVisible(this.panelPartView, !hidden);
        // If panel part becomes hidden, also hide the current active panel if any
        let focusEditor = false;
        if (hidden && this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)) {
            this.paneCompositeService.hideActivePaneComposite(1 /* ViewContainerLocation.Panel */);
            if (!isIOS && // do not auto focus on iOS (https://github.com/microsoft/vscode/issues/127832)
                !this.isAuxiliaryBarMaximized() // do not auto focus when auxiliary bar is maximized
            ) {
                focusEditor = true;
            }
        }
        // If panel part becomes visible, show last active panel or default panel
        else if (!hidden && !this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)) {
            let panelToOpen = this.paneCompositeService.getLastActivePaneCompositeId(1 /* ViewContainerLocation.Panel */);
            // verify that the panel we try to open has views before we default to it
            // otherwise fall back to any view that has views still refs #111463
            if (!panelToOpen || !this.hasViews(panelToOpen)) {
                panelToOpen = this.viewDescriptorService
                    .getViewContainersByLocation(1 /* ViewContainerLocation.Panel */)
                    .find(viewContainer => this.hasViews(viewContainer.id))?.id;
            }
            if (panelToOpen) {
                this.openViewContainer(1 /* ViewContainerLocation.Panel */, panelToOpen, !skipLayout);
            }
        }
        // Don't proceed if we have already done this before
        if (wasHidden === hidden) {
            return;
        }
        // If in process of showing, toggle whether or not panel is maximized
        if (!hidden) {
            if (!skipLayout && isPanelMaximized !== panelOpensMaximized) {
                this.toggleMaximizedPanel();
            }
        }
        else {
            // If in process of hiding, remember whether the panel is maximized or not
            this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED, isPanelMaximized);
        }
        if (focusEditor) {
            this.editorGroupService.mainPart.activeGroup.focus(); // Pass focus to editor group if panel part is now hidden
        }
    }
    isAuxiliaryBarMaximized() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED);
    }
    toggleMaximizedAuxiliaryBar() {
        this.setAuxiliaryBarMaximized(!this.isAuxiliaryBarMaximized());
    }
    setAuxiliaryBarMaximized(maximized) {
        if (this.inMaximizedAuxiliaryBarTransition || // prevent re-entrance
            (maximized === this.isAuxiliaryBarMaximized()) // return early if state is already present
        ) {
            return false;
        }
        if (maximized) {
            const state = {
                sideBarVisible: this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */),
                editorVisible: this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */),
                panelVisible: this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */),
                auxiliaryBarVisible: this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)
            };
            this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED, true);
            this.inMaximizedAuxiliaryBarTransition = true;
            try {
                if (!state.auxiliaryBarVisible) {
                    this.setAuxiliaryBarHidden(false);
                }
                const size = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE, size);
                if (state.sideBarVisible) {
                    this.setSideBarHidden(true);
                }
                if (state.panelVisible) {
                    this.setPanelHidden(true);
                }
                if (state.editorVisible) {
                    this.setEditorHidden(true);
                }
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY, state);
            }
            finally {
                this.inMaximizedAuxiliaryBarTransition = false;
            }
        }
        else {
            const state = assertReturnsDefined(this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY));
            this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED, false);
            this.inMaximizedAuxiliaryBarTransition = true;
            try {
                this.setEditorHidden(!state?.editorVisible); // this order of updating view visibility
                this.setPanelHidden(!state?.panelVisible); // helps in restoring the previous view
                this.setSideBarHidden(!state?.sideBarVisible); // sizes we had
                const size = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
                this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                    width: this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE),
                    height: size.height
                });
            }
            finally {
                this.inMaximizedAuxiliaryBarTransition = false;
            }
        }
        this.focusPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        this._onDidChangeAuxiliaryBarMaximized.fire();
        return true;
    }
    isPanelMaximized() {
        return (this.getPanelAlignment() === 'center' || // the workbench grid currently prevents us from supporting panel
            !isHorizontal(this.getPanelPosition()) // maximization with non-center panel alignment
        ) && !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow) && !this.isAuxiliaryBarMaximized();
    }
    toggleMaximizedPanel() {
        const size = this.workbenchGrid.getViewSize(this.panelPartView);
        const panelPosition = this.getPanelPosition();
        const maximize = !this.isPanelMaximized();
        if (maximize) {
            if (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
                if (isHorizontal(panelPosition)) {
                    this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT, size.height);
                }
                else {
                    this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH, size.width);
                }
            }
            this.setEditorHidden(true);
        }
        else {
            this.setEditorHidden(false);
            this.workbenchGrid.resizeView(this.panelPartView, {
                width: isHorizontal(panelPosition) ? size.width : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH),
                height: isHorizontal(panelPosition) ? this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT) : size.height
            });
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED, maximize);
    }
    panelOpensMaximized() {
        if (this.getPanelAlignment() !== 'center' && isHorizontal(this.getPanelPosition())) {
            return false; // The workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        }
        const panelOpensMaximized = partOpensMaximizedFromString(this.configurationService.getValue(WorkbenchLayoutSettings.PANEL_OPENS_MAXIMIZED));
        const panelLastIsMaximized = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED);
        return panelOpensMaximized === 0 /* PartOpensMaximizedOptions.ALWAYS */ || (panelOpensMaximized === 2 /* PartOpensMaximizedOptions.REMEMBER_LAST */ && panelLastIsMaximized);
    }
    setAuxiliaryBarHidden(hidden, skipLayout) {
        if (hidden && this.setAuxiliaryBarMaximized(false) && !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            return; // return: leaving maximised auxiliary bar made this part hidden
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.AUXILIARYBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.AUXILIARYBAR_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.auxiliaryBarPartView, !hidden);
        // If auxiliary bar becomes hidden, also hide the current active pane composite if any
        if (hidden && this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)) {
            this.paneCompositeService.hideActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
            this.focusPanelOrEditor();
        }
        // If auxiliary bar becomes visible, show last active pane composite or default pane composite
        else if (!hidden && !this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)) {
            let viewletToOpen = this.paneCompositeService.getLastActivePaneCompositeId(2 /* ViewContainerLocation.AuxiliaryBar */);
            // verify that the viewlet we try to open has views before we default to it
            // otherwise fall back to any view that has views still refs #111463
            if (!viewletToOpen || !this.hasViews(viewletToOpen)) {
                viewletToOpen = this.viewDescriptorService
                    .getViewContainersByLocation(2 /* ViewContainerLocation.AuxiliaryBar */)
                    .find(viewContainer => this.hasViews(viewContainer.id))?.id;
            }
            if (viewletToOpen) {
                this.openViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */, viewletToOpen, !skipLayout);
            }
        }
    }
    setPartHidden(hidden, part) {
        switch (part) {
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                return this.setActivityBarHidden(hidden);
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                return this.setSideBarHidden(hidden);
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                return this.setEditorHidden(hidden);
            case "workbench.parts.banner" /* Parts.BANNER_PART */:
                return this.setBannerHidden(hidden);
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                return this.setAuxiliaryBarHidden(hidden);
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                return this.setPanelHidden(hidden);
        }
    }
    hasMainWindowBorder() {
        return this.state.runtime.mainWindowBorder;
    }
    getMainWindowBorderRadius() {
        return this.state.runtime.mainWindowBorder && isMacintosh ? '10px' : undefined;
    }
    getSideBarPosition() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
    }
    getPanelAlignment() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
    }
    updateMenubarVisibility(skipLayout) {
        const shouldShowTitleBar = shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
        if (!skipLayout && this.workbenchGrid && shouldShowTitleBar !== this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowTitleBar);
        }
    }
    updateCustomTitleBarVisibility() {
        const shouldShowTitleBar = shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
        const titlebarVisible = this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */);
        if (shouldShowTitleBar !== titlebarVisible) {
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowTitleBar);
        }
    }
    toggleMenuBar() {
        let currentVisibilityValue = getMenuBarVisibility(this.configurationService);
        if (typeof currentVisibilityValue !== 'string') {
            currentVisibilityValue = 'classic';
        }
        let newVisibilityValue;
        if (currentVisibilityValue === 'visible' || currentVisibilityValue === 'classic') {
            newVisibilityValue = hasNativeMenu(this.configurationService) ? 'toggle' : 'compact';
        }
        else {
            newVisibilityValue = 'classic';
        }
        this.configurationService.updateValue("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */, newVisibilityValue);
    }
    getPanelPosition() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION);
    }
    setPanelPosition(position) {
        if (!this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            this.setPanelHidden(false);
        }
        const panelPart = this.getPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        const oldPositionValue = positionToString(this.getPanelPosition());
        const newPositionValue = positionToString(position);
        // Adjust CSS
        const panelContainer = assertReturnsDefined(panelPart.getContainer());
        panelContainer.classList.remove(oldPositionValue);
        panelContainer.classList.add(newPositionValue);
        // Update Styles
        panelPart.updateStyles();
        // Layout
        const size = this.workbenchGrid.getViewSize(this.panelPartView);
        const sideBarSize = this.workbenchGrid.getViewSize(this.sideBarPartView);
        const auxiliaryBarSize = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
        let editorHidden = !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow);
        // Save last non-maximized size for panel before move
        if (newPositionValue !== oldPositionValue && !editorHidden) {
            // Save the current size of the panel for the new orthogonal direction
            // If moving down, save the width of the panel
            // Otherwise, save the height of the panel
            if (isHorizontal(position)) {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH, size.width);
            }
            else if (isHorizontal(positionFromString(oldPositionValue))) {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT, size.height);
            }
        }
        if (isHorizontal(position) && this.getPanelAlignment() !== 'center' && editorHidden) {
            this.toggleMaximizedPanel();
            editorHidden = false;
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_POSITION, position);
        const sideBarVisible = this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const auxiliaryBarVisible = this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const hadFocus = this.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
        if (position === 2 /* Position.BOTTOM */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.height : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT), this.editorPartView, 1 /* Direction.Down */);
        }
        else if (position === 3 /* Position.TOP */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.height : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT), this.editorPartView, 0 /* Direction.Up */);
        }
        else if (position === 1 /* Position.RIGHT */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.width : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH), this.editorPartView, 3 /* Direction.Right */);
        }
        else {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden ? size.width : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH), this.editorPartView, 2 /* Direction.Left */);
        }
        if (hadFocus) {
            this.focusPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        // Reset sidebar to original size before shifting the panel
        this.workbenchGrid.resizeView(this.sideBarPartView, sideBarSize);
        if (!sideBarVisible) {
            this.setSideBarHidden(true);
        }
        this.workbenchGrid.resizeView(this.auxiliaryBarPartView, auxiliaryBarSize);
        if (!auxiliaryBarVisible) {
            this.setAuxiliaryBarHidden(true);
        }
        if (isHorizontal(position)) {
            this.adjustPartPositions(this.getSideBarPosition(), this.getPanelAlignment(), position);
        }
        this._onDidChangePanelPosition.fire(newPositionValue);
    }
    isWindowMaximized(targetWindow) {
        return this.state.runtime.maximized.has(getWindowId(targetWindow));
    }
    updateWindowMaximizedState(targetWindow, maximized) {
        this.mainContainer.classList.toggle(LayoutClasses.MAXIMIZED, maximized);
        const targetWindowId = getWindowId(targetWindow);
        if (maximized === this.state.runtime.maximized.has(targetWindowId)) {
            return;
        }
        if (maximized) {
            this.state.runtime.maximized.add(targetWindowId);
        }
        else {
            this.state.runtime.maximized.delete(targetWindowId);
        }
        this.updateWindowBorder();
        this._onDidChangeWindowMaximized.fire({ windowId: targetWindowId, maximized });
    }
    getVisibleNeighborPart(part, direction) {
        if (!this.workbenchGrid) {
            return undefined;
        }
        if (!this.isVisible(part, mainWindow)) {
            return undefined;
        }
        const neighborViews = this.workbenchGrid.getNeighborViews(this.getPart(part), direction, false);
        if (!neighborViews) {
            return undefined;
        }
        for (const neighborView of neighborViews) {
            const neighborPart = ["workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, "workbench.parts.editor" /* Parts.EDITOR_PART */, "workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */]
                .find(partId => this.getPart(partId) === neighborView && this.isVisible(partId, mainWindow));
            if (neighborPart !== undefined) {
                return neighborPart;
            }
        }
        return undefined;
    }
    onDidChangeWCO() {
        const bannerFirst = this.workbenchGrid.getNeighborViews(this.titleBarPartView, 0 /* Direction.Up */, false).length > 0;
        const shouldBannerBeFirst = this.shouldShowBannerFirst();
        if (bannerFirst !== shouldBannerBeFirst) {
            this.workbenchGrid.moveView(this.bannerPartView, Sizing.Distribute, this.titleBarPartView, shouldBannerBeFirst ? 0 /* Direction.Up */ : 1 /* Direction.Down */);
        }
        this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
    }
    arrangeEditorNodes(nodes, availableHeight, availableWidth) {
        if (!nodes.sideBar && !nodes.auxiliaryBar) {
            nodes.editor.size = availableHeight;
            return nodes.editor;
        }
        const result = [nodes.editor];
        nodes.editor.size = availableWidth;
        if (nodes.sideBar) {
            if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === 0 /* Position.LEFT */) {
                result.splice(0, 0, nodes.sideBar);
            }
            else {
                result.push(nodes.sideBar);
            }
            nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN) ? 0 : nodes.sideBar.size;
        }
        if (nodes.auxiliaryBar) {
            if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === 1 /* Position.RIGHT */) {
                result.splice(0, 0, nodes.auxiliaryBar);
            }
            else {
                result.push(nodes.auxiliaryBar);
            }
            nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN) ? 0 : nodes.auxiliaryBar.size;
        }
        return {
            type: 'branch',
            data: result,
            size: availableHeight,
            visible: result.some(node => node.visible)
        };
    }
    arrangeMiddleSectionNodes(nodes, availableWidth, availableHeight) {
        const activityBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN) ? 0 : nodes.activityBar.size;
        const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN) ? 0 : nodes.sideBar.size;
        const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN) ? 0 : nodes.auxiliaryBar.size;
        const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE) ? 0 : nodes.panel.size;
        const panelPostion = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION);
        const sideBarPosition = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
        const result = [];
        if (!isHorizontal(panelPostion)) {
            result.push(nodes.editor);
            nodes.editor.size = availableWidth - activityBarSize - sideBarSize - panelSize - auxiliaryBarSize;
            if (panelPostion === 1 /* Position.RIGHT */) {
                result.push(nodes.panel);
            }
            else {
                result.splice(0, 0, nodes.panel);
            }
            if (sideBarPosition === 0 /* Position.LEFT */) {
                result.push(nodes.auxiliaryBar);
                result.splice(0, 0, nodes.sideBar);
                result.splice(0, 0, nodes.activityBar);
            }
            else {
                result.splice(0, 0, nodes.auxiliaryBar);
                result.push(nodes.sideBar);
                result.push(nodes.activityBar);
            }
        }
        else {
            const panelAlignment = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
            const sideBarNextToEditor = !(panelAlignment === 'center' || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'right') || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'left'));
            const auxiliaryBarNextToEditor = !(panelAlignment === 'center' || (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'right') || (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'left'));
            const editorSectionWidth = availableWidth - activityBarSize - (sideBarNextToEditor ? 0 : sideBarSize) - (auxiliaryBarNextToEditor ? 0 : auxiliaryBarSize);
            const editorNodes = this.arrangeEditorNodes({
                editor: nodes.editor,
                sideBar: sideBarNextToEditor ? nodes.sideBar : undefined,
                auxiliaryBar: auxiliaryBarNextToEditor ? nodes.auxiliaryBar : undefined
            }, availableHeight - panelSize, editorSectionWidth);
            const data = panelPostion === 2 /* Position.BOTTOM */ ? [editorNodes, nodes.panel] : [nodes.panel, editorNodes];
            result.push({
                type: 'branch',
                data,
                size: editorSectionWidth,
                visible: data.some(node => node.visible)
            });
            if (!sideBarNextToEditor) {
                if (sideBarPosition === 0 /* Position.LEFT */) {
                    result.splice(0, 0, nodes.sideBar);
                }
                else {
                    result.push(nodes.sideBar);
                }
            }
            if (!auxiliaryBarNextToEditor) {
                if (sideBarPosition === 1 /* Position.RIGHT */) {
                    result.splice(0, 0, nodes.auxiliaryBar);
                }
                else {
                    result.push(nodes.auxiliaryBar);
                }
            }
            if (sideBarPosition === 0 /* Position.LEFT */) {
                result.splice(0, 0, nodes.activityBar);
            }
            else {
                result.push(nodes.activityBar);
            }
        }
        return result;
    }
    createGridDescriptor() {
        const { width, height } = this._mainContainerDimension;
        const sideBarSize = this.stateModel.getInitializationValue(LayoutStateKeys.SIDEBAR_SIZE);
        const auxiliaryBarSize = this.stateModel.getInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE);
        const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE);
        const titleBarHeight = this.titleBarPartView.minimumHeight;
        const bannerHeight = this.bannerPartView.minimumHeight;
        const statusBarHeight = this.statusBarPartView.minimumHeight;
        const activityBarWidth = this.activityBarPartView.minimumWidth;
        const middleSectionHeight = height - titleBarHeight - statusBarHeight;
        const titleAndBanner = [
            {
                type: 'leaf',
                data: { type: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */ },
                size: titleBarHeight,
                visible: this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)
            },
            {
                type: 'leaf',
                data: { type: "workbench.parts.banner" /* Parts.BANNER_PART */ },
                size: bannerHeight,
                visible: false
            }
        ];
        const activityBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */ },
            size: activityBarWidth,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN)
        };
        const sideBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ },
            size: sideBarSize,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
        };
        const auxiliaryBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */ },
            size: auxiliaryBarSize,
            visible: this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)
        };
        const editorNode = {
            type: 'leaf',
            data: { type: "workbench.parts.editor" /* Parts.EDITOR_PART */ },
            size: 0, // Update based on sibling sizes
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN)
        };
        const panelNode = {
            type: 'leaf',
            data: { type: "workbench.parts.panel" /* Parts.PANEL_PART */ },
            size: panelSize,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN)
        };
        const middleSection = this.arrangeMiddleSectionNodes({
            activityBar: activityBarNode,
            auxiliaryBar: auxiliaryBarNode,
            editor: editorNode,
            panel: panelNode,
            sideBar: sideBarNode
        }, width, middleSectionHeight);
        const result = {
            root: {
                type: 'branch',
                size: width,
                data: [
                    ...(this.shouldShowBannerFirst() ? titleAndBanner.reverse() : titleAndBanner),
                    {
                        type: 'branch',
                        data: middleSection,
                        size: middleSectionHeight
                    },
                    {
                        type: 'leaf',
                        data: { type: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ },
                        size: statusBarHeight,
                        visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN)
                    }
                ]
            },
            orientation: 0 /* Orientation.VERTICAL */,
            width,
            height
        };
        const layoutDescriptor = {
            activityBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN),
            sideBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN),
            auxiliaryBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN),
            panelVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN),
            statusbarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN),
            sideBarPosition: positionToString(this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON)),
            panelPosition: positionToString(this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION)),
        };
        // WARNING: Do not remove this event, it's used to track build rollout progress
        // Talk to @joaomoreno, @lszomoru or @jruales before doing so
        this.telemetryService.publicLog2('startupLayout', layoutDescriptor);
        return result;
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
}
function getZenModeConfiguration(configurationService) {
    return configurationService.getValue(WorkbenchLayoutSettings.ZEN_MODE_CONFIG);
}
class WorkbenchLayoutStateKey {
    constructor(name, scope, target, defaultValue) {
        this.name = name;
        this.scope = scope;
        this.target = target;
        this.defaultValue = defaultValue;
    }
}
class RuntimeStateKey extends WorkbenchLayoutStateKey {
    constructor(name, scope, target, defaultValue, zenModeIgnore) {
        super(name, scope, target, defaultValue);
        this.zenModeIgnore = zenModeIgnore;
        this.runtime = true;
    }
}
class InitializationStateKey extends WorkbenchLayoutStateKey {
    constructor() {
        super(...arguments);
        this.runtime = false;
    }
}
const LayoutStateKeys = {
    // Editor
    MAIN_EDITOR_CENTERED: new RuntimeStateKey('editor.centered', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    // Zen Mode
    ZEN_MODE_ACTIVE: new RuntimeStateKey('zenMode.active', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    ZEN_MODE_EXIT_INFO: new RuntimeStateKey('zenMode.exitInfo', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, {
        transitionedToCenteredEditorLayout: false,
        transitionedToFullScreen: false,
        handleNotificationsDoNotDisturbMode: false,
        wasVisible: {
            auxiliaryBar: false,
            panel: false,
            sideBar: false,
        },
    }),
    // Part Sizing
    SIDEBAR_SIZE: new InitializationStateKey('sideBar.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    AUXILIARYBAR_SIZE: new InitializationStateKey('auxiliaryBar.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_SIZE: new InitializationStateKey('panel.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    // Part State
    PANEL_LAST_NON_MAXIMIZED_HEIGHT: new RuntimeStateKey('panel.lastNonMaximizedHeight', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_LAST_NON_MAXIMIZED_WIDTH: new RuntimeStateKey('panel.lastNonMaximizedWidth', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_WAS_LAST_MAXIMIZED: new RuntimeStateKey('panel.wasLastMaximized', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    AUXILIARYBAR_WAS_LAST_MAXIMIZED: new RuntimeStateKey('auxiliaryBar.wasLastMaximized', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE: new RuntimeStateKey('auxiliaryBar.lastNonMaximizedSize', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY: new RuntimeStateKey('auxiliaryBar.lastNonMaximizedVisibility', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, {
        sideBarVisible: false,
        editorVisible: false,
        panelVisible: false,
        auxiliaryBarVisible: false
    }),
    AUXILIARYBAR_EMPTY: new InitializationStateKey('auxiliaryBar.empty', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, false),
    // Part Positions
    SIDEBAR_POSITON: new RuntimeStateKey('sideBar.position', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, 0 /* Position.LEFT */),
    PANEL_POSITION: new RuntimeStateKey('panel.position', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, 2 /* Position.BOTTOM */),
    PANEL_ALIGNMENT: new RuntimeStateKey('panel.alignment', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */, 'center'),
    // Part Visibility
    ACTIVITYBAR_HIDDEN: new RuntimeStateKey('activityBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false, true),
    SIDEBAR_HIDDEN: new RuntimeStateKey('sideBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    EDITOR_HIDDEN: new RuntimeStateKey('editor.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    PANEL_HIDDEN: new RuntimeStateKey('panel.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, true),
    AUXILIARYBAR_HIDDEN: new RuntimeStateKey('auxiliaryBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, true),
    STATUSBAR_HIDDEN: new RuntimeStateKey('statusBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false, true)
};
var WorkbenchLayoutSettings;
(function (WorkbenchLayoutSettings) {
    WorkbenchLayoutSettings["AUXILIARYBAR_DEFAULT_VISIBILITY"] = "workbench.secondarySideBar.defaultVisibility";
    WorkbenchLayoutSettings["ACTIVITY_BAR_VISIBLE"] = "workbench.activityBar.visible";
    WorkbenchLayoutSettings["PANEL_POSITION"] = "workbench.panel.defaultLocation";
    WorkbenchLayoutSettings["PANEL_OPENS_MAXIMIZED"] = "workbench.panel.opensMaximized";
    WorkbenchLayoutSettings["ZEN_MODE_CONFIG"] = "zenMode";
    WorkbenchLayoutSettings["EDITOR_CENTERED_LAYOUT_AUTO_RESIZE"] = "workbench.editor.centeredLayoutAutoResize";
})(WorkbenchLayoutSettings || (WorkbenchLayoutSettings = {}));
var LegacyWorkbenchLayoutSettings;
(function (LegacyWorkbenchLayoutSettings) {
    LegacyWorkbenchLayoutSettings["STATUSBAR_VISIBLE"] = "workbench.statusBar.visible";
    LegacyWorkbenchLayoutSettings["SIDEBAR_POSITION"] = "workbench.sideBar.location";
})(LegacyWorkbenchLayoutSettings || (LegacyWorkbenchLayoutSettings = {}));
class LayoutStateModel extends Disposable {
    static { this.STORAGE_PREFIX = 'workbench.'; }
    constructor(storageService, configurationService, contextService, environmentService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this.stateCache = new Map();
        this.isNew = {
            [1 /* StorageScope.WORKSPACE */]: this.storageService.isNew(1 /* StorageScope.WORKSPACE */),
            [0 /* StorageScope.PROFILE */]: this.storageService.isNew(0 /* StorageScope.PROFILE */),
            [-1 /* StorageScope.APPLICATION */]: this.storageService.isNew(-1 /* StorageScope.APPLICATION */)
        };
        this._register(this.configurationService.onDidChangeConfiguration(configurationChange => this.updateStateFromLegacySettings(configurationChange)));
    }
    updateStateFromLegacySettings(configurationChangeEvent) {
        if (configurationChangeEvent.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.ACTIVITYBAR_HIDDEN, this.isActivityBarHidden());
        }
        if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.STATUSBAR_HIDDEN, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
        }
        if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.SIDEBAR_POSITON, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left'));
        }
    }
    updateLegacySettingsFromState(key, value) {
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        if (key.zenModeIgnore && isZenMode) {
            return;
        }
        if (key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
            this.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, value ? "hidden" /* ActivityBarPosition.HIDDEN */ : undefined);
        }
        else if (key === LayoutStateKeys.STATUSBAR_HIDDEN) {
            this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE, !value);
        }
        else if (key === LayoutStateKeys.SIDEBAR_POSITON) {
            this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION, positionToString(value));
        }
    }
    load(configuration) {
        let key;
        // Load stored values for all keys unless we explicitly set to reset
        if (!configuration.resetLayout) {
            for (key in LayoutStateKeys) {
                const stateKey = LayoutStateKeys[key];
                const value = this.loadKeyFromStorage(stateKey);
                if (value !== undefined) {
                    this.stateCache.set(stateKey.name, value);
                }
            }
        }
        // Apply legacy settings
        this.stateCache.set(LayoutStateKeys.ACTIVITYBAR_HIDDEN.name, this.isActivityBarHidden());
        this.stateCache.set(LayoutStateKeys.STATUSBAR_HIDDEN.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
        this.stateCache.set(LayoutStateKeys.SIDEBAR_POSITON.name, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left'));
        // Set dynamic defaults: part sizing and side bar visibility
        const workbenchState = this.contextService.getWorkbenchState();
        const mainContainerDimension = configuration.mainContainerDimension;
        LayoutStateKeys.SIDEBAR_SIZE.defaultValue = Math.min(300, mainContainerDimension.width / 4);
        LayoutStateKeys.SIDEBAR_HIDDEN.defaultValue = workbenchState === 1 /* WorkbenchState.EMPTY */;
        LayoutStateKeys.AUXILIARYBAR_SIZE.defaultValue = Math.min(300, mainContainerDimension.width / 4);
        LayoutStateKeys.AUXILIARYBAR_HIDDEN.defaultValue = (() => {
            if (isWeb && !this.environmentService.remoteAuthority) {
                return true; // not required in web if unsupported
            }
            const configuration = this.configurationService.inspect(WorkbenchLayoutSettings.AUXILIARYBAR_DEFAULT_VISIBILITY);
            // Unless auxiliary bar visibility is explicitly configured, make
            // sure to not force open it in case we know it was empty before.
            if (configuration.defaultValue !== 'hidden' && !isConfigured(configuration) && this.stateCache.get(LayoutStateKeys.AUXILIARYBAR_EMPTY.name)) {
                return true;
            }
            // New users: Show auxiliary bar even in empty workspaces
            // but not if the user explicitly hides it
            if (this.isNew[-1 /* StorageScope.APPLICATION */] &&
                configuration.value !== 'hidden') {
                return false;
            }
            // Existing users: respect visibility setting
            switch (configuration.value) {
                case 'hidden':
                    return true;
                case 'visibleInWorkspace':
                case 'maximizedInWorkspace':
                    return workbenchState === 1 /* WorkbenchState.EMPTY */;
                default:
                    return false;
            }
        })();
        LayoutStateKeys.PANEL_SIZE.defaultValue = (this.stateCache.get(LayoutStateKeys.PANEL_POSITION.name) ?? isHorizontal(LayoutStateKeys.PANEL_POSITION.defaultValue)) ? mainContainerDimension.height / 3 : mainContainerDimension.width / 4;
        LayoutStateKeys.PANEL_POSITION.defaultValue = positionFromString(this.configurationService.getValue(WorkbenchLayoutSettings.PANEL_POSITION) ?? 'bottom');
        // Apply all defaults
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            if (this.stateCache.get(stateKey.name) === undefined) {
                this.stateCache.set(stateKey.name, stateKey.defaultValue);
            }
        }
        // Apply all overrides
        this.applyOverrides(configuration);
        // Register for runtime key changes
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)(storageChangeEvent => {
            let key;
            for (key in LayoutStateKeys) {
                const stateKey = LayoutStateKeys[key];
                if (stateKey instanceof RuntimeStateKey && stateKey.scope === 0 /* StorageScope.PROFILE */ && stateKey.target === 0 /* StorageTarget.USER */) {
                    if (`${LayoutStateModel.STORAGE_PREFIX}${stateKey.name}` === storageChangeEvent.key) {
                        const value = this.loadKeyFromStorage(stateKey) ?? stateKey.defaultValue;
                        if (this.stateCache.get(stateKey.name) !== value) {
                            this.stateCache.set(stateKey.name, value);
                            this._onDidChangeState.fire({ key: stateKey, value });
                        }
                    }
                }
            }
        }));
    }
    applyOverrides(configuration) {
        // Auxiliary bar: Maximized setting (new workspaces)
        if (this.isNew[1 /* StorageScope.WORKSPACE */]) {
            const defaultAuxiliaryBarVisibility = this.configurationService.getValue(WorkbenchLayoutSettings.AUXILIARYBAR_DEFAULT_VISIBILITY);
            if (defaultAuxiliaryBarVisibility === 'maximized' ||
                (defaultAuxiliaryBarVisibility === 'maximizedInWorkspace' && this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */)) {
                this.applyAuxiliaryBarMaximizedOverride();
            }
        }
        // Both editor and panel should not be hidden on startup unless auxiliary bar is maximized
        if (this.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN) &&
            this.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN) &&
            !this.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED)) {
            this.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, false);
        }
        // Restrict auxiliary bar size in case of small window dimensions
        if (this.isNew[1 /* StorageScope.WORKSPACE */] && configuration.mainContainerDimension.width <= DEFAULT_WORKSPACE_WINDOW_DIMENSIONS.width) {
            this.setInitializationValue(LayoutStateKeys.SIDEBAR_SIZE, Math.min(300, configuration.mainContainerDimension.width / 4));
            this.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE, Math.min(300, configuration.mainContainerDimension.width / 4));
        }
    }
    applyAuxiliaryBarMaximizedOverride() {
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_VISIBILITY, {
            sideBarVisible: !this.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN),
            panelVisible: !this.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN),
            editorVisible: !this.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN),
            auxiliaryBarVisible: !this.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
        });
        this.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, true);
        this.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, true);
        this.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, true);
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, false);
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_LAST_NON_MAXIMIZED_SIZE, this.getInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE));
        this.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_WAS_LAST_MAXIMIZED, true);
    }
    save(workspace, global) {
        let key;
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            if ((workspace && stateKey.scope === 1 /* StorageScope.WORKSPACE */) ||
                (global && stateKey.scope === 0 /* StorageScope.PROFILE */)) {
                if (isZenMode && stateKey instanceof RuntimeStateKey && stateKey.zenModeIgnore) {
                    continue; // Don't write out specific keys while in zen mode
                }
                this.saveKeyToStorage(stateKey);
            }
        }
    }
    getInitializationValue(key) {
        return this.stateCache.get(key.name);
    }
    setInitializationValue(key, value) {
        this.stateCache.set(key.name, value);
    }
    getRuntimeValue(key, fallbackToSetting) {
        if (fallbackToSetting) {
            switch (key) {
                case LayoutStateKeys.ACTIVITYBAR_HIDDEN:
                    this.stateCache.set(key.name, this.isActivityBarHidden());
                    break;
                case LayoutStateKeys.STATUSBAR_HIDDEN:
                    this.stateCache.set(key.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
                    break;
                case LayoutStateKeys.SIDEBAR_POSITON:
                    this.stateCache.set(key.name, this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left');
                    break;
            }
        }
        return this.stateCache.get(key.name);
    }
    setRuntimeValue(key, value) {
        this.stateCache.set(key.name, value);
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        if (key.scope === 0 /* StorageScope.PROFILE */) {
            if (!isZenMode || !key.zenModeIgnore) {
                this.saveKeyToStorage(key);
                this.updateLegacySettingsFromState(key, value);
            }
        }
    }
    isActivityBarHidden() {
        const oldValue = this.configurationService.getValue(WorkbenchLayoutSettings.ACTIVITY_BAR_VISIBLE);
        if (oldValue !== undefined) {
            return !oldValue;
        }
        return this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) !== "default" /* ActivityBarPosition.DEFAULT */;
    }
    setRuntimeValueAndFire(key, value) {
        const previousValue = this.stateCache.get(key.name);
        if (previousValue === value) {
            return;
        }
        this.setRuntimeValue(key, value);
        this._onDidChangeState.fire({ key, value });
    }
    saveKeyToStorage(key) {
        const value = this.stateCache.get(key.name);
        this.storageService.store(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, typeof value === 'object' ? JSON.stringify(value) : value, key.scope, key.target);
    }
    loadKeyFromStorage(key) {
        const value = this.storageService.get(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, key.scope);
        if (value !== undefined) {
            this.isNew[key.scope] = false; // remember that we had previous state for this scope
            switch (typeof key.defaultValue) {
                case 'boolean': return (value === 'true');
                case 'number': return parseInt(value);
                case 'object': return JSON.parse(value);
            }
        }
        return value;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2xheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkgsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQWMscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BSLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RixPQUFPLEVBQTRDLHFCQUFxQixFQUF1QixjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMzSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZELE9BQU8sRUFBdUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsNEJBQTRCLEVBQXdKLHdCQUF3QixFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3ZaLE9BQU8sRUFBRSxvQkFBb0IsRUFB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
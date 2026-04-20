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
var ChatViewPane_1;
import './media/chatViewPane.css';
import { $, addDisposableListener, append, EventHelper, EventType, getWindow, setVisibility } from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { ChatViewTitleControl } from './chatViewTitleControl.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
import { IChatService } from '../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../common/chatSessionsService.js';
import { LocalChatSessionUri, getChatSessionType } from '../common/chatUri.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { AgentSessionsControl } from './agentSessions/agentSessionsControl.js';
import { AgentSessionsListDelegate } from './agentSessions/agentSessionsViewer.js';
import { ChatWidget } from './chatWidget.js';
import { ChatViewWelcomeController } from './viewsWelcome/chatViewWelcomeController.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { AgentSessionsViewerOrientation, AgentSessionsViewerPosition } from './agentSessions/agentSessions.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { ChatViewId } from './chat.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { AgentSessionsFilter } from './agentSessions/agentSessionsFilter.js';
import { IAgentSessionsService } from './agentSessions/agentSessionsService.js';
let ChatViewPane = class ChatViewPane extends ViewPane {
    static { ChatViewPane_1 = this; }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, storageService, chatService, chatAgentService, logService, layoutService, chatSessionsService, telemetryService, lifecycleService, progressService, agentSessionsService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.storageService = storageService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.chatSessionsService = chatSessionsService;
        this.telemetryService = telemetryService;
        this.progressService = progressService;
        this.agentSessionsService = agentSessionsService;
        this.lastDimensionsPerOrientation = new Map();
        this.modelRef = this._register(new MutableDisposable());
        this.sessionsCount = 0;
        this.sessionsViewerLimited = true;
        this.sessionsViewerOrientation = AgentSessionsViewerOrientation.Stacked;
        this.sessionsViewerOrientationConfiguration = 'sideBySide';
        // View state for the ViewPane is currently global per-provider basically,
        // but some other strictly per-model state will require a separate memento.
        this.memento = new Memento(`interactive-session-view-${CHAT_PROVIDER_ID}`, this.storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */ &&
            this.configurationService.getValue(ChatConfiguration.RestoreLastPanelSession) === false) {
            this.viewState.sessionId = undefined; // clear persisted session on fresh start
        }
        // Contextkeys
        this.chatViewLocationContext = ChatContextKeys.panelLocation.bindTo(contextKeyService);
        this.sessionsViewerLimitedContext = ChatContextKeys.agentSessionsViewerLimited.bindTo(contextKeyService);
        this.sessionsViewerOrientationContext = ChatContextKeys.agentSessionsViewerOrientation.bindTo(contextKeyService);
        this.sessionsViewerPositionContext = ChatContextKeys.agentSessionsViewerPosition.bindTo(contextKeyService);
        this.sessionsViewerVisibilityContext = ChatContextKeys.agentSessionsViewerVisible.bindTo(contextKeyService);
        this.updateContextKeys(false);
        this.registerListeners();
    }
    updateContextKeys(fromEvent) {
        const { position, location } = this.getViewPositionAndLocation();
        this.sessionsViewerLimitedContext.set(this.sessionsViewerLimited);
        this.chatViewLocationContext.set(location ?? 2 /* ViewContainerLocation.AuxiliaryBar */);
        this.sessionsViewerOrientationContext.set(this.sessionsViewerOrientation);
        this.sessionsViewerPositionContext.set(position === 1 /* Position.RIGHT */ ? AgentSessionsViewerPosition.Right : AgentSessionsViewerPosition.Left);
        if (fromEvent && this.lastDimensions) {
            this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
        }
    }
    getViewPositionAndLocation() {
        const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
        const sideBarPosition = this.layoutService.getSideBarPosition();
        const panelPosition = this.layoutService.getPanelPosition();
        let sideSessionsOnRightPosition;
        switch (viewLocation) {
            case 0 /* ViewContainerLocation.Sidebar */:
                sideSessionsOnRightPosition = sideBarPosition === 1 /* Position.RIGHT */;
                break;
            case 1 /* ViewContainerLocation.Panel */:
                sideSessionsOnRightPosition = panelPosition !== 0 /* Position.LEFT */;
                break;
            default:
                sideSessionsOnRightPosition = sideBarPosition === 0 /* Position.LEFT */;
                break;
        }
        return {
            position: sideSessionsOnRightPosition ? 1 /* Position.RIGHT */ : 0 /* Position.LEFT */,
            location: viewLocation ?? 2 /* ViewContainerLocation.AuxiliaryBar */
        };
    }
    updateViewPaneClasses(fromEvent) {
        const welcomeEnabled = this.configurationService.getValue(ChatConfiguration.ChatViewWelcomeEnabled) !== false;
        this.viewPaneContainer?.classList.toggle('chat-view-welcome-enabled', welcomeEnabled);
        const activityBarLocationDefault = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) === 'default';
        this.viewPaneContainer?.classList.toggle('activity-bar-location-default', activityBarLocationDefault);
        this.viewPaneContainer?.classList.toggle('activity-bar-location-other', !activityBarLocationDefault);
        const { position, location } = this.getViewPositionAndLocation();
        this.viewPaneContainer?.classList.toggle('chat-view-location-auxiliarybar', location === 2 /* ViewContainerLocation.AuxiliaryBar */);
        this.viewPaneContainer?.classList.toggle('chat-view-location-sidebar', location === 0 /* ViewContainerLocation.Sidebar */);
        this.viewPaneContainer?.classList.toggle('chat-view-location-panel', location === 1 /* ViewContainerLocation.Panel */);
        this.viewPaneContainer?.classList.toggle('chat-view-position-left', position === 0 /* Position.LEFT */);
        this.viewPaneContainer?.classList.toggle('chat-view-position-right', position === 1 /* Position.RIGHT */);
        if (fromEvent && this.lastDimensions) {
            this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
        }
    }
    registerListeners() {
        // Agent changes
        this._register(this.chatAgentService.onDidChangeAgents(() => this.onDidChangeAgents()));
        // Layout changes
        this._register(Event.any(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('workbench.sideBar.location')), this.layoutService.onDidChangePanelPosition, Event.filter(this.viewDescriptorService.onDidChangeContainerLocation, e => e.viewContainer === this.viewDescriptorService.getViewContainerByViewId(this.id)))(() => {
            this.updateContextKeys(false);
            this.updateViewPaneClasses(true /* layout here */);
        }));
        // Settings changes
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => {
            return e.affectsConfiguration(ChatConfiguration.ChatViewWelcomeEnabled) || e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        })(() => this.updateViewPaneClasses(true)));
    }
    onDidChangeAgents() {
        if (this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat)) {
            if (!this._widget?.viewModel && !this.restoringSession) {
                const info = this.getTransferredOrPersistedSessionInfo();
                this.restoringSession =
                    (info.sessionId ? this.chatService.getOrRestoreSession(LocalChatSessionUri.forSession(info.sessionId)) : Promise.resolve(undefined)).then(async (modelRef) => {
                        if (!this._widget) {
                            return; // renderBody has not been called yet
                        }
                        // The widget may be hidden at this point, because welcome views were allowed. Use setVisible to
                        // avoid doing a render while the widget is hidden. This is changing the condition in `shouldShowWelcome`
                        // so it should fire onDidChangeViewWelcomeState.
                        const wasVisible = this._widget.visible;
                        try {
                            this._widget.setVisible(false);
                            if (info.inputState && modelRef) {
                                modelRef.object.inputModel.setState(info.inputState);
                            }
                            await this.showModel(modelRef);
                        }
                        finally {
                            this._widget.setVisible(wasVisible);
                        }
                    });
                this.restoringSession.finally(() => this.restoringSession = undefined);
            }
        }
        this._onDidChangeViewWelcomeState.fire();
    }
    getTransferredOrPersistedSessionInfo() {
        if (this.chatService.transferredSessionData?.location === ChatAgentLocation.Chat) {
            const sessionId = this.chatService.transferredSessionData.sessionId;
            return {
                sessionId,
                inputState: this.chatService.transferredSessionData.inputState,
            };
        }
        return { sessionId: this.viewState.sessionId };
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.telemetryService.publicLog2('chatViewPaneOpened');
        this.viewPaneContainer = parent;
        this.viewPaneContainer.classList.add('chat-viewpane');
        this.updateViewPaneClasses(false);
        this.createControls(parent);
        this.setupContextMenu(parent);
        this.applyModel();
    }
    createControls(parent) {
        // Sessions Control
        const sessionsControl = this.createSessionsControl(parent);
        // Welcome Control (used to show chat specific extension provided welcome views via `chatViewsWelcome` contribution point)
        const welcomeController = this.welcomeController = this._register(this.instantiationService.createInstance(ChatViewWelcomeController, parent, this, ChatAgentLocation.Chat));
        // Chat Control
        const chatWidget = this.createChatControl(parent);
        // Controls Listeners
        this.registerControlsListeners(sessionsControl, chatWidget, welcomeController);
        // Update sessions control visibility when all controls are created
        this.updateSessionsControlVisibility();
    }
    //#region Sessions Control
    static { this.SESSIONS_LIMIT = 3; }
    static { this.SESSIONS_SIDEBAR_WIDTH = 300; }
    static { this.SESSIONS_SIDEBAR_VIEW_MIN_WIDTH = 300 /* default chat width */ + this.SESSIONS_SIDEBAR_WIDTH; }
    createSessionsControl(parent) {
        const that = this;
        const sessionsContainer = this.sessionsContainer = parent.appendChild($('.agent-sessions-container'));
        // Sessions Title
        const sessionsTitleContainer = this.sessionsTitleContainer = append(sessionsContainer, $('.agent-sessions-title-container'));
        const sessionsTitle = this.sessionsTitle = append(sessionsTitleContainer, $('span.agent-sessions-title'));
        this.updateSessionsControlTitle();
        this._register(addDisposableListener(sessionsTitle, EventType.CLICK, () => {
            this.sessionsControl?.scrollToTop();
            this.sessionsControl?.focus();
        }));
        // Sessions Toolbar
        const sessionsToolbarContainer = append(sessionsTitleContainer, $('.agent-sessions-toolbar'));
        const sessionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, sessionsToolbarContainer, MenuId.AgentSessionsToolbar, {
            menuOptions: { shouldForwardArgs: true }
        }));
        // Sessions Filter
        const sessionsFilter = this._register(this.instantiationService.createInstance(AgentSessionsFilter, {
            filterMenuId: MenuId.AgentSessionsViewerFilterSubMenu,
            limitResults: () => {
                return that.sessionsViewerLimited ? ChatViewPane_1.SESSIONS_LIMIT : undefined;
            },
            groupResults: () => {
                return !that.sessionsViewerLimited;
            },
            overrideExclude(session) {
                if (that.sessionsViewerLimited) {
                    if (session.isArchived()) {
                        return true; // exclude archived sessions when limited
                    }
                    return false;
                }
                return undefined; // leave up to the filter settings
            },
            notifyResults(count) {
                that.notifySessionsControlCountChanged(count);
            },
        }));
        this._register(Event.runAndSubscribe(sessionsFilter.onDidChange, () => {
            sessionsToolbarContainer.classList.toggle('filtered', !sessionsFilter.isDefault());
        }));
        // Sessions Control
        this.sessionsControlContainer = append(sessionsContainer, $('.agent-sessions-control-container'));
        const sessionsControl = this.sessionsControl = this._register(this.instantiationService.createInstance(AgentSessionsControl, this.sessionsControlContainer, {
            filter: sessionsFilter,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            getHoverPosition: () => {
                const { position } = this.getViewPositionAndLocation();
                return position === 1 /* Position.RIGHT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
            },
            overrideCompare(sessionA, sessionB) {
                // When limited where only few sessions show, sort unread sessions to the top
                if (that.sessionsViewerLimited) {
                    const aIsUnread = !sessionA.isRead();
                    const bIsUnread = !sessionB.isRead();
                    if (aIsUnread && !bIsUnread) {
                        return -1; // a (unread) comes before b (read)
                    }
                    if (!aIsUnread && bIsUnread) {
                        return 1; // a (read) comes after b (unread)
                    }
                }
                return undefined;
            }
        }));
        this._register(this.onDidChangeBodyVisibility(visible => sessionsControl.setVisible(visible)));
        sessionsToolbar.context = sessionsControl;
        // Link to Sessions View
        this.sessionsLinkContainer = append(sessionsContainer, $('.agent-sessions-link-container'));
        this.sessionsLink = this._register(this.instantiationService.createInstance(Link, this.sessionsLinkContainer, {
            label: this.sessionsViewerLimited ? localize('showAllSessions', "Show More") : localize('showRecentSessions', "Show Less"),
            href: '',
        }, {
            opener: () => {
                this.sessionsViewerLimited = !this.sessionsViewerLimited;
                this.notifySessionsControlLimitedChanged(true);
                sessionsControl.focus();
            }
        }));
        // Deal with orientation configuration
        this._register(Event.runAndSubscribe(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.ChatViewSessionsOrientation)), e => {
            const newSessionsViewerOrientationConfiguration = this.configurationService.getValue(ChatConfiguration.ChatViewSessionsOrientation);
            this.doUpdateConfiguredSessionsViewerOrientation(newSessionsViewerOrientationConfiguration, { updateConfiguration: false, layout: !!e });
        }));
        return sessionsControl;
    }
    getSessionsViewerOrientation() {
        return this.sessionsViewerOrientation;
    }
    updateConfiguredSessionsViewerOrientation(orientation) {
        return this.doUpdateConfiguredSessionsViewerOrientation(orientation, { updateConfiguration: true, layout: true });
    }
    doUpdateConfiguredSessionsViewerOrientation(orientation, options) {
        const oldSessionsViewerOrientationConfiguration = this.sessionsViewerOrientationConfiguration;
        let validatedOrientation;
        if (orientation === 'stacked' || orientation === 'sideBySide') {
            validatedOrientation = orientation;
        }
        else {
            validatedOrientation = 'sideBySide'; // default
        }
        this.sessionsViewerOrientationConfiguration = validatedOrientation;
        if (oldSessionsViewerOrientationConfiguration === this.sessionsViewerOrientationConfiguration) {
            return; // no change from our existing config
        }
        if (options.updateConfiguration) {
            this.configurationService.updateValue(ChatConfiguration.ChatViewSessionsOrientation, validatedOrientation);
        }
        if (options.layout && this.lastDimensions) {
            this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
        }
    }
    notifySessionsControlLimitedChanged(triggerLayout) {
        this.sessionsViewerLimitedContext.set(this.sessionsViewerLimited);
        this.updateSessionsControlTitle();
        if (this.sessionsLink) {
            this.sessionsLink.link = {
                label: this.sessionsViewerLimited ? localize('showAllSessions', "Show More") : localize('showRecentSessions', "Show Less"),
                href: ''
            };
        }
        const updatePromise = this.sessionsControl?.update();
        if (triggerLayout && this.lastDimensions) {
            this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
        }
        return updatePromise ?? Promise.resolve();
    }
    notifySessionsControlCountChanged(newSessionsCount) {
        const countChanged = typeof newSessionsCount === 'number' && newSessionsCount !== this.sessionsCount;
        this.sessionsCount = newSessionsCount ?? this.sessionsCount;
        const { changed: visibilityChanged, visible } = this.updateSessionsControlVisibility();
        if (visibilityChanged || (countChanged && visible)) {
            if (this.lastDimensions) {
                this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
            }
        }
    }
    updateSessionsControlTitle() {
        if (!this.sessionsTitle) {
            return;
        }
        this.sessionsTitle.textContent = this.sessionsViewerLimited ? localize('recentSessions', "Recent Sessions") : localize('allSessions', "Sessions");
    }
    updateSessionsControlVisibility() {
        if (!this.sessionsContainer || !this.viewPaneContainer) {
            return { changed: false, visible: false };
        }
        let newSessionsContainerVisible;
        if (!this.configurationService.getValue(ChatConfiguration.ChatViewSessionsEnabled)) {
            newSessionsContainerVisible = false; // disabled in settings
        }
        else {
            // Sessions control: stacked
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                newSessionsContainerVisible =
                    (!this._widget || this._widget?.isEmpty()) && // chat widget empty
                        !this.welcomeController?.isShowingWelcome.get() && // welcome not showing
                        (this.sessionsCount > 0 || !this.sessionsViewerLimited); // has sessions or is showing all sessions
            }
            // Sessions control: sidebar
            else {
                newSessionsContainerVisible =
                    !this.welcomeController?.isShowingWelcome.get() && // welcome not showing
                        !!this.lastDimensions && this.lastDimensions.width >= ChatViewPane_1.SESSIONS_SIDEBAR_VIEW_MIN_WIDTH; // has sessions or is showing all sessions
            }
        }
        this.viewPaneContainer.classList.toggle('has-sessions-control', newSessionsContainerVisible);
        const sessionsContainerVisible = this.sessionsContainer.style.display !== 'none';
        setVisibility(newSessionsContainerVisible, this.sessionsContainer);
        this.sessionsViewerVisibilityContext.set(newSessionsContainerVisible);
        return {
            changed: sessionsContainerVisible !== newSessionsContainerVisible,
            visible: newSessionsContainerVisible
        };
    }
    getFocusedSessions() {
        return this.sessionsControl?.getFocus() ?? [];
    }
    //#endregion
    //#region Chat Control
    static { this.MIN_CHAT_WIDGET_HEIGHT = 120; }
    get widget() { return this._widget; }
    createChatControl(parent) {
        const chatControlsContainer = append(parent, $('.chat-controls-container'));
        const locationBasedColors = this.getLocationBasedColors();
        const editorOverflowWidgetsDomNode = this.layoutService.getContainer(getWindow(chatControlsContainer)).appendChild($('.chat-editor-overflow.monaco-editor'));
        this._register(toDisposable(() => editorOverflowWidgetsDomNode.remove()));
        // Chat Title
        this.createChatTitleControl(chatControlsContainer);
        // Chat Widget
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this._widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Chat, { viewId: this.id }, {
            autoScroll: mode => mode !== ChatModeKind.Ask,
            renderFollowups: true,
            supportsFileReferences: true,
            clear: () => this.clear(),
            rendererOptions: {
                renderTextEditsAsSummary: (uri) => {
                    return true;
                },
                referencesExpandedWhenEmptyResponse: false,
                progressMessageAtBottomOfResponse: mode => mode !== ChatModeKind.Ask,
            },
            editorOverflowWidgetsDomNode,
            enableImplicitContext: true,
            enableWorkingSet: 'explicit',
            supportsChangingModes: true,
        }, {
            listForeground: SIDE_BAR_FOREGROUND,
            listBackground: locationBasedColors.background,
            overlayBackground: locationBasedColors.overlayBackground,
            inputEditorBackground: locationBasedColors.background,
            resultEditorBackground: editorBackground,
        }));
        this._widget.render(chatControlsContainer);
        const updateWidgetVisibility = (reader) => this._widget.setVisible(this.isBodyVisible() && !this.welcomeController?.isShowingWelcome.read(reader));
        this._register(this.onDidChangeBodyVisibility(() => updateWidgetVisibility()));
        this._register(autorun(reader => updateWidgetVisibility(reader)));
        return this._widget;
    }
    createChatTitleControl(parent) {
        this.titleControl = this._register(this.instantiationService.createInstance(ChatViewTitleControl, parent, {
            focusChat: () => this._widget.focusInput()
        }));
        this._register(this.titleControl.onDidChangeHeight(() => {
            if (this.lastDimensions) {
                this.layoutBody(this.lastDimensions.height, this.lastDimensions.width);
            }
        }));
    }
    //#endregion
    registerControlsListeners(sessionsControl, chatWidget, welcomeController) {
        // Sessions control visibility is impacted by multiple things:
        // - chat widget being in empty state or showing a chat
        // - extensions provided welcome view showing or not
        // - configuration setting
        this._register(Event.any(chatWidget.onDidChangeEmptyState, Event.fromObservable(welcomeController.isShowingWelcome), Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.ChatViewSessionsEnabled)))(() => {
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                sessionsControl.clearFocus(); // improve visual appearance when switching visibility by clearing focus
            }
            this.notifySessionsControlCountChanged();
        }));
        // Track the active chat model and reveal it in the sessions control if side-by-side
        this._register(chatWidget.onDidChangeViewModel(() => {
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
                return; // only reveal in side-by-side mode
            }
            const sessionResource = chatWidget.viewModel?.sessionResource;
            if (sessionResource) {
                sessionsControl.reveal(sessionResource);
            }
        }));
    }
    setupContextMenu(parent) {
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, e => {
            EventHelper.stop(e, true);
            this.contextMenuService.showContextMenu({
                menuId: MenuId.ChatWelcomeContext,
                contextKeyService: this.contextKeyService,
                getAnchor: () => new StandardMouseEvent(getWindow(parent), e)
            });
        }));
    }
    //#region Model Management
    async applyModel() {
        const info = this.getTransferredOrPersistedSessionInfo();
        const modelRef = info.sessionId ? await this.chatService.getOrRestoreSession(LocalChatSessionUri.forSession(info.sessionId)) : undefined;
        if (modelRef && info.inputState) {
            modelRef.object.inputModel.setState(info.inputState);
        }
        await this.showModel(modelRef);
    }
    async showModel(modelRef, startNewSession = true) {
        const oldModelResource = this.modelRef.value?.object.sessionResource;
        this.modelRef.value = undefined;
        let ref;
        if (startNewSession) {
            ref = modelRef ?? (this.chatService.transferredSessionData?.sessionId && this.chatService.transferredSessionData?.location === ChatAgentLocation.Chat
                ? await this.chatService.getOrRestoreSession(LocalChatSessionUri.forSession(this.chatService.transferredSessionData.sessionId))
                : this.chatService.startSession(ChatAgentLocation.Chat));
            if (!ref) {
                throw new Error('Could not start chat session');
            }
        }
        this.modelRef.value = ref;
        const model = ref?.object;
        if (model) {
            await this.updateWidgetLockState(model.sessionResource); // Update widget lock state based on session type
            this.viewState.sessionId = model.sessionId; // remember as model to restore in view state
        }
        this._widget.setModel(model);
        // Update title control
        this.titleControl?.update(model);
        // Update the toolbar context with new sessionId
        this.updateActions();
        // Mark the old model as read when closing
        if (oldModelResource) {
            this.agentSessionsService.model.getSession(oldModelResource)?.setRead(true);
        }
        return model;
    }
    async updateWidgetLockState(sessionResource) {
        const sessionType = getChatSessionType(sessionResource);
        if (sessionType === localChatSessionType) {
            this._widget.unlockFromCodingAgent();
            return;
        }
        let canResolve = false;
        try {
            canResolve = await this.chatSessionsService.canResolveChatSession(sessionResource);
        }
        catch (error) {
            this.logService.warn(`Failed to resolve chat session '${sessionResource.toString()}' for locking`, error);
        }
        if (!canResolve) {
            this._widget.unlockFromCodingAgent();
            return;
        }
        const contribution = this.chatSessionsService.getChatSessionContribution(sessionType);
        if (contribution) {
            this._widget.lockToCodingAgent(contribution.name, contribution.displayName, contribution.type);
        }
        else {
            this._widget.unlockFromCodingAgent();
        }
    }
    async clear() {
        // Grab the widget's latest view state because it will be loaded back into the widget
        this.updateViewState();
        await this.showModel(undefined);
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    async loadSession(sessionResource) {
        return this.progressService.withProgress({ location: ChatViewId, delay: 200 }, async () => {
            let queue = Promise.resolve();
            // A delay here to avoid blinking because only Cloud sessions are slow, most others are fast
            const clearWidget = disposableTimeout(() => {
                // clear current model without starting a new one
                queue = this.showModel(undefined, false).then(() => { });
            }, 100);
            const sessionType = getChatSessionType(sessionResource);
            if (sessionType !== localChatSessionType) {
                await this.chatSessionsService.canResolveChatSession(sessionResource);
            }
            const newModelRef = await this.chatService.loadSessionForResource(sessionResource, ChatAgentLocation.Chat, CancellationToken.None);
            clearWidget.dispose();
            await queue;
            return this.showModel(newModelRef);
        });
    }
    //#endregion
    focus() {
        super.focus();
        this.focusInput();
    }
    focusInput() {
        this._widget.focusInput();
    }
    focusSessions() {
        if (this.sessionsContainer?.style.display === 'none') {
            return false; // not visible
        }
        this.sessionsControl?.focus();
        return true;
    }
    //#region Layout
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.lastDimensions = { height, width };
        let remainingHeight = height;
        let remainingWidth = width;
        // Sessions Control
        const { heightReduction, widthReduction } = this.layoutSessionsControl(remainingHeight, remainingWidth);
        remainingHeight -= heightReduction;
        remainingWidth -= widthReduction;
        // Title Control
        remainingHeight -= this.titleControl?.getHeight() ?? 0;
        // Chat Widget
        this._widget.layout(remainingHeight, remainingWidth);
        // Remember last dimensions per orientation
        this.lastDimensionsPerOrientation.set(this.sessionsViewerOrientation, { height, width });
    }
    layoutSessionsControl(height, width) {
        let heightReduction = 0;
        let widthReduction = 0;
        if (!this.sessionsContainer || !this.sessionsControlContainer || !this.sessionsControl || !this.viewPaneContainer || !this.sessionsTitleContainer || !this.sessionsLinkContainer || !this.sessionsTitle || !this.sessionsLink) {
            return { heightReduction, widthReduction };
        }
        const oldSessionsViewerOrientation = this.sessionsViewerOrientation;
        let newSessionsViewerOrientation;
        switch (this.sessionsViewerOrientationConfiguration) {
            // Stacked
            case 'stacked':
                newSessionsViewerOrientation = AgentSessionsViewerOrientation.Stacked;
                break;
            // Update orientation based on available width
            default:
                newSessionsViewerOrientation = width >= ChatViewPane_1.SESSIONS_SIDEBAR_VIEW_MIN_WIDTH ? AgentSessionsViewerOrientation.SideBySide : AgentSessionsViewerOrientation.Stacked;
        }
        this.sessionsViewerOrientation = newSessionsViewerOrientation;
        if (newSessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-sidebyside', true);
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-stacked', false);
            this.sessionsViewerOrientationContext.set(AgentSessionsViewerOrientation.SideBySide);
        }
        else {
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-sidebyside', false);
            this.viewPaneContainer.classList.toggle('sessions-control-orientation-stacked', true);
            this.sessionsViewerOrientationContext.set(AgentSessionsViewerOrientation.Stacked);
        }
        // Update limited state based on orientation change
        if (oldSessionsViewerOrientation !== this.sessionsViewerOrientation) {
            const oldSessionsViewerLimited = this.sessionsViewerLimited;
            this.sessionsViewerLimited = this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked;
            let updatePromise;
            if (oldSessionsViewerLimited !== this.sessionsViewerLimited) {
                updatePromise = this.notifySessionsControlLimitedChanged(false /* already in layout */);
            }
            else {
                updatePromise = this.sessionsControl?.update(); // still need to update for section visibility
            }
            // Switching to side-by-side, reveal the current session after elements have loaded
            if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
                updatePromise.then(() => {
                    const sessionResource = this._widget?.viewModel?.sessionResource;
                    if (sessionResource) {
                        this.sessionsControl?.reveal(sessionResource);
                    }
                });
            }
        }
        // Ensure visibility is in sync before we layout
        const { visible: sessionsContainerVisible } = this.updateSessionsControlVisibility();
        if (!sessionsContainerVisible) {
            return { heightReduction: 0, widthReduction: 0 };
        }
        let availableSessionsHeight = height - this.sessionsTitleContainer.offsetHeight - this.sessionsLinkContainer.offsetHeight;
        if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.Stacked) {
            availableSessionsHeight -= ChatViewPane_1.MIN_CHAT_WIDGET_HEIGHT; // always reserve some space for chat input
        }
        // Show as sidebar
        if (this.sessionsViewerOrientation === AgentSessionsViewerOrientation.SideBySide) {
            this.sessionsControlContainer.style.height = `${availableSessionsHeight}px`;
            this.sessionsControlContainer.style.width = `${ChatViewPane_1.SESSIONS_SIDEBAR_WIDTH}px`;
            this.sessionsControl.layout(availableSessionsHeight, ChatViewPane_1.SESSIONS_SIDEBAR_WIDTH);
            heightReduction = 0; // side by side to chat widget
            widthReduction = this.sessionsContainer.offsetWidth;
        }
        // Show stacked (grows with the number of items displayed)
        else {
            let sessionsHeight;
            if (this.sessionsViewerLimited) {
                sessionsHeight = this.sessionsCount * AgentSessionsListDelegate.ITEM_HEIGHT;
            }
            else {
                sessionsHeight = (ChatViewPane_1.SESSIONS_LIMIT * 2 /* expand a bit to indicate more items */) * AgentSessionsListDelegate.ITEM_HEIGHT;
            }
            sessionsHeight = Math.min(availableSessionsHeight, sessionsHeight);
            this.sessionsControlContainer.style.height = `${sessionsHeight}px`;
            this.sessionsControlContainer.style.width = ``;
            this.sessionsControl.layout(sessionsHeight, width);
            heightReduction = this.sessionsContainer.offsetHeight;
            widthReduction = 0; // stacked on top of the chat widget
        }
        return { heightReduction, widthReduction };
    }
    getLastDimensions(orientation) {
        return this.lastDimensionsPerOrientation.get(orientation);
    }
    //#endregion
    saveState() {
        // Don't do saveState when no widget, or no viewModel in which case
        // the state has not yet been restored - in that case the default
        // state would overwrite the real state
        if (this._widget?.viewModel) {
            this._widget.saveState();
            this.updateViewState();
            this.memento.saveMemento();
        }
        super.saveState();
    }
    updateViewState(viewState) {
        const newViewState = viewState ?? this._widget.getViewState();
        if (newViewState) {
            for (const [key, value] of Object.entries(newViewState)) {
                this.viewState[key] = value; // Assign all props to the memento so they get saved
            }
        }
    }
    shouldShowWelcome() {
        const noPersistedSessions = !this.chatService.hasSessions();
        const hasCoreAgent = this.chatAgentService.getAgents().some(agent => agent.isCore && agent.locations.includes(ChatAgentLocation.Chat));
        const hasDefaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat) !== undefined; // only false when Hide AI Features has run and unregistered the setup agents
        const shouldShow = !hasCoreAgent && (!hasDefaultAgent || !this._widget?.viewModel && noPersistedSessions);
        this.logService.trace(`ChatViewPane#shouldShowWelcome() = ${shouldShow}: hasCoreAgent=${hasCoreAgent} hasDefaultAgent=${hasDefaultAgent} || noViewModel=${!this._widget?.viewModel} && noPersistedSessions=${noPersistedSessions}`);
        return !!shouldShow;
    }
    getActionsContext() {
        return this._widget?.viewModel ? {
            sessionResource: this._widget.viewModel.sessionResource,
            $mid: 19 /* MarshalledId.ChatViewContext */
        } : undefined;
    }
};
ChatViewPane = ChatViewPane_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IStorageService),
    __param(11, IChatService),
    __param(12, IChatAgentService),
    __param(13, ILogService),
    __param(14, IWorkbenchLayoutService),
    __param(15, IChatSessionsService),
    __param(16, ITelemetryService),
    __param(17, ILifecycleService),
    __param(18, IProgressService),
    __param(19, IAgentSessionsService)
], ChatViewPane);
export { ChatViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Vmlld1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2RixPQUFPLEVBQUUsT0FBTyxFQUFXLE1BQU0sdUNBQXVDLENBQUM7QUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1B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
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
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { $, append, EventHelper } from '../../../../../base/browser/dom.js';
import { isAgentSession, isAgentSessionSection } from './agentSessionsModel.js';
import { AgentSessionRenderer, AgentSessionsAccessibilityProvider, AgentSessionsCompressionDelegate, AgentSessionsDataSource, AgentSessionsDragAndDrop, AgentSessionsIdentityProvider, AgentSessionsKeyboardNavigationLabelProvider, AgentSessionsListDelegate, AgentSessionSectionRenderer, AgentSessionsSorter } from './agentSessionsViewer.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ACTION_ID_NEW_CHAT } from '../actions/chatActions.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Separator } from '../../../../../base/common/actions.js';
import { RenderIndentGuides, TreeFindMode } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { IAgentSessionsService } from './agentSessionsService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { openSession } from './agentSessionsOpener.js';
let AgentSessionsControl = class AgentSessionsControl extends Disposable {
    constructor(container, options, contextMenuService, contextKeyService, instantiationService, chatSessionsService, commandService, menuService, agentSessionsService, telemetryService) {
        super();
        this.container = container;
        this.options = options;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.chatSessionsService = chatSessionsService;
        this.commandService = commandService;
        this.menuService = menuService;
        this.agentSessionsService = agentSessionsService;
        this.telemetryService = telemetryService;
        this.visible = true;
        this.focusedAgentSessionArchivedContextKey = ChatContextKeys.isArchivedAgentSession.bindTo(this.contextKeyService);
        this.focusedAgentSessionReadContextKey = ChatContextKeys.isReadAgentSession.bindTo(this.contextKeyService);
        this.focusedAgentSessionTypeContextKey = ChatContextKeys.agentSessionType.bindTo(this.contextKeyService);
        this.createList(this.container);
    }
    createList(container) {
        this.sessionsContainer = append(container, $('.agent-sessions-viewer'));
        const sorter = new AgentSessionsSorter(this.options);
        const list = this.sessionsList = this._register(this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'AgentSessionsView', this.sessionsContainer, new AgentSessionsListDelegate(), new AgentSessionsCompressionDelegate(), [
            this.instantiationService.createInstance(AgentSessionRenderer, this.options),
            this.instantiationService.createInstance(AgentSessionSectionRenderer),
        ], new AgentSessionsDataSource(this.options.filter, sorter), {
            accessibilityProvider: new AgentSessionsAccessibilityProvider(),
            dnd: this.instantiationService.createInstance(AgentSessionsDragAndDrop),
            identityProvider: new AgentSessionsIdentityProvider(),
            horizontalScrolling: false,
            multipleSelectionSupport: false,
            findWidgetEnabled: true,
            defaultFindMode: TreeFindMode.Filter,
            keyboardNavigationLabelProvider: new AgentSessionsKeyboardNavigationLabelProvider(),
            overrideStyles: this.options.overrideStyles,
            expandOnlyOnTwistieClick: true,
            twistieAdditionalCssClass: () => 'force-no-twistie',
            collapseByDefault: () => false,
            renderIndentGuides: RenderIndentGuides.None,
        }));
        ChatContextKeys.agentSessionsViewerFocused.bindTo(list.contextKeyService);
        const model = this.agentSessionsService.model;
        this._register(Event.any(this.options.filter?.onDidChange ?? Event.None, model.onDidChangeSessions)(() => {
            if (this.visible) {
                list.updateChildren();
            }
        }));
        list.setInput(model);
        this._register(list.onDidOpen(e => this.openAgentSession(e)));
        this._register(list.onContextMenu(e => this.showContextMenu(e)));
        this._register(list.onMouseDblClick(({ element }) => {
            if (element === null) {
                this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
            }
        }));
        this._register(Event.any(list.onDidChangeFocus, model.onDidChangeSessions)(() => {
            const focused = list.getFocus().at(0);
            if (focused && isAgentSession(focused)) {
                this.focusedAgentSessionArchivedContextKey.set(focused.isArchived());
                this.focusedAgentSessionReadContextKey.set(focused.isRead());
                this.focusedAgentSessionTypeContextKey.set(focused.providerType);
            }
            else {
                this.focusedAgentSessionArchivedContextKey.reset();
                this.focusedAgentSessionReadContextKey.reset();
                this.focusedAgentSessionTypeContextKey.reset();
            }
        }));
    }
    async openAgentSession(e) {
        const element = e.element;
        if (!element || isAgentSessionSection(element)) {
            return; // Section headers are not openable
        }
        this.telemetryService.publicLog2('agentSessionOpened', {
            providerType: element.providerType
        });
        await this.instantiationService.invokeFunction(openSession, element, e);
    }
    async showContextMenu({ element, anchor, browserEvent }) {
        if (!element || isAgentSessionSection(element)) {
            return; // No context menu for section headers
        }
        EventHelper.stop(browserEvent, true);
        await this.chatSessionsService.activateChatSessionItemProvider(element.providerType);
        const contextOverlay = [];
        contextOverlay.push([ChatContextKeys.isArchivedAgentSession.key, element.isArchived()]);
        contextOverlay.push([ChatContextKeys.isReadAgentSession.key, element.isRead()]);
        contextOverlay.push([ChatContextKeys.agentSessionType.key, element.providerType]);
        const menu = this.menuService.createMenu(MenuId.AgentSessionsContext, this.contextKeyService.createOverlay(contextOverlay));
        const marshalledSession = { session: element, $mid: 25 /* MarshalledId.AgentSessionContext */ };
        this.contextMenuService.showContextMenu({
            getActions: () => Separator.join(...menu.getActions({ arg: marshalledSession, shouldForwardArgs: true }).map(([, actions]) => actions)),
            getAnchor: () => anchor,
            getActionsContext: () => marshalledSession,
        });
        menu.dispose();
    }
    openFind() {
        this.sessionsList?.openFind();
    }
    refresh() {
        return this.agentSessionsService.model.resolve(undefined);
    }
    async update() {
        await this.sessionsList?.updateChildren();
    }
    setVisible(visible) {
        if (this.visible === visible) {
            return;
        }
        this.visible = visible;
        if (this.visible) {
            this.sessionsList?.updateChildren();
        }
    }
    layout(height, width) {
        this.sessionsList?.layout(height, width);
    }
    focus() {
        this.sessionsList?.domFocus();
    }
    clearFocus() {
        this.sessionsList?.setFocus([]);
        this.sessionsList?.setSelection([]);
    }
    scrollToTop() {
        if (this.sessionsList) {
            this.sessionsList.scrollTop = 0;
        }
    }
    getFocus() {
        const focused = this.sessionsList?.getFocus() ?? [];
        return focused.filter(e => isAgentSession(e));
    }
    reveal(sessionResource) {
        if (!this.sessionsList) {
            return;
        }
        const session = this.agentSessionsService.model.getSession(sessionResource);
        if (!session || !this.sessionsList.hasNode(session)) {
            return;
        }
        if (this.sessionsList.getRelativeTop(session) === null) {
            this.sessionsList.reveal(session, 0.5); // only reveal when not already visible
        }
        this.sessionsList.setFocus([session]);
        this.sessionsList.setSelection([session]);
    }
};
AgentSessionsControl = __decorate([
    __param(2, IContextMenuService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, IChatSessionsService),
    __param(6, ICommandService),
    __param(7, IMenuService),
    __param(8, IAgentSessionsService),
    __param(9, ITelemetryService)
], AgentSessionsControl);
export { AgentSessionsControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FnZW50U2Vzc2lvbnMvYWdlbnRTZXNzaW9uc0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBYyxrQ0FBa0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBc0UsY0FBYyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEosT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxrQ0FBa0MsRUFBRSxnQ0FBZ0MsRUFBRSx1QkFBdUIsRUFBRSx3QkFBd0IsRUFBRSw2QkFBNkIsRUFBRSw0Q0FBNEMsRUFBRSx5QkFBeUIsRUFBRSwyQkFBMkIsRUFBRSxtQkFBbUIsRUFBcUQsTUFBTSwwQkFBMEIsQ0FBQztBQUU1WixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFB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
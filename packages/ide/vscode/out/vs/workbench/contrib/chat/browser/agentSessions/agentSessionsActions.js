/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { isAgentSessionSection, isMarshalledAgentSessionContext } from './agentSessionsModel.js';
import { Action2, MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { AGENT_SESSION_DELETE_ACTION_ID, AGENT_SESSION_RENAME_ACTION_ID, AgentSessionProviders, AgentSessionsViewerOrientation } from './agentSessions.js';
import { IChatService } from '../../common/chatService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { getPartByLocation } from '../../../../services/views/browser/viewsService.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IAgentSessionsService } from './agentSessionsService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatEditorInput, showClearEditingSessionConfirmation } from '../chatEditorInput.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ChatConfiguration } from '../../common/constants.js';
import { ACTION_ID_NEW_CHAT, CHAT_CATEGORY } from '../actions/chatActions.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { AgentSessionsPicker } from './agentSessionsPicker.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
//#region Chat View
export class ToggleChatViewSessionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleChatViewSessions',
            title: localize2('chat.toggleChatViewSessions.label', "Show Sessions"),
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true),
            menu: {
                id: MenuId.ChatWelcomeContext,
                group: '0_sessions',
                order: 1,
                when: ChatContextKeys.inChatEditor.negate()
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const chatViewSessionsEnabled = configurationService.getValue(ChatConfiguration.ChatViewSessionsEnabled);
        await configurationService.updateValue(ChatConfiguration.ChatViewSessionsEnabled, !chatViewSessionsEnabled);
    }
}
const agentSessionsOrientationSubmenu = new MenuId('chatAgentSessionsOrientationSubmenu');
MenuRegistry.appendMenuItem(MenuId.ChatWelcomeContext, {
    submenu: agentSessionsOrientationSubmenu,
    title: localize2('chat.sessionsOrientation', "Sessions Orientation"),
    group: '0_sessions',
    order: 2,
    when: ChatContextKeys.inChatEditor.negate()
});
export class SetAgentSessionsOrientationStackedAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.setAgentSessionsOrientationStacked',
            title: localize2('chat.sessionsOrientation.stacked', "Stacked"),
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsOrientation}`, 'stacked'),
            precondition: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true),
            menu: {
                id: agentSessionsOrientationSubmenu,
                group: 'navigation',
                order: 2
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(HideAgentSessionsSidebar.ID);
    }
}
export class SetAgentSessionsOrientationSideBySideAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.setAgentSessionsOrientationSideBySide',
            title: localize2('chat.sessionsOrientation.sideBySide', "Side by Side"),
            toggled: ContextKeyExpr.notEquals(`config.${ChatConfiguration.ChatViewSessionsOrientation}`, 'stacked'),
            precondition: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true),
            menu: {
                id: agentSessionsOrientationSubmenu,
                group: 'navigation',
                order: 3
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(ShowAgentSessionsSidebar.ID);
    }
}
export class PickAgentSessionAction extends Action2 {
    constructor() {
        super({
            id: `workbench.action.chat.history`,
            title: localize2('agentSessions.open', "Open Agent Session..."),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, false)),
                    group: 'navigation',
                    order: 2
                },
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true)),
                    group: '2_history',
                    order: 1
                },
                {
                    id: MenuId.EditorTitle,
                    when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                }
            ],
            category: CHAT_CATEGORY,
            icon: Codicon.history,
            f1: true,
            precondition: ChatContextKeys.enabled
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const agentSessionsPicker = instantiationService.createInstance(AgentSessionsPicker);
        await agentSessionsPicker.pickAgentSession();
    }
}
export class ArchiveAllAgentSessionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.archiveAllAgentSessions',
            title: localize2('archiveAll.label', "Archive All Workspace Agent Sessions"),
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const dialogService = accessor.get(IDialogService);
        const sessionsToArchive = agentSessionsService.model.sessions.filter(session => !session.isArchived());
        if (sessionsToArchive.length === 0) {
            return;
        }
        const confirmed = await dialogService.confirm({
            message: sessionsToArchive.length === 1
                ? localize('archiveAllSessions.confirmSingle', "Are you sure you want to archive 1 agent session?")
                : localize('archiveAllSessions.confirm', "Are you sure you want to archive {0} agent sessions?", sessionsToArchive.length),
            detail: localize('archiveAllSessions.detail', "You can unarchive sessions later if needed from the Chat view."),
            primaryButton: localize('archiveAllSessions.archive', "Archive")
        });
        if (!confirmed.confirmed) {
            return;
        }
        for (const session of sessionsToArchive) {
            session.setArchived(true);
        }
    }
}
export class ArchiveAgentSessionSectionAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionSection.archive',
            title: localize2('archiveSection', "Archive All"),
            icon: Codicon.archive,
            menu: {
                id: MenuId.AgentSessionSectionToolbar,
                group: 'navigation',
                order: 1,
                when: ChatContextKeys.agentSessionSection.notEqualsTo("archived" /* AgentSessionSection.Archived */),
            }
        });
    }
    async run(accessor, context) {
        if (!context || !isAgentSessionSection(context)) {
            return;
        }
        const dialogService = accessor.get(IDialogService);
        const confirmed = await dialogService.confirm({
            message: context.sessions.length === 1
                ? localize('archiveSectionSessions.confirmSingle', "Are you sure you want to archive 1 agent session from '{0}'?", context.label)
                : localize('archiveSectionSessions.confirm', "Are you sure you want to archive {0} agent sessions from '{1}'?", context.sessions.length, context.label),
            detail: localize('archiveSectionSessions.detail', "You can unarchive sessions later if needed from the sessions view."),
            primaryButton: localize('archiveSectionSessions.archive', "Archive All")
        });
        if (!confirmed.confirmed) {
            return;
        }
        for (const session of context.sessions) {
            session.setArchived(true);
        }
    }
}
//#endregion
//#region Session Actions
class BaseAgentSessionAction extends Action2 {
    async run(accessor, context) {
        const agentSessionsService = accessor.get(IAgentSessionsService);
        const viewsService = accessor.get(IViewsService);
        let session;
        if (isMarshalledAgentSessionContext(context)) {
            session = agentSessionsService.getSession(context.session.resource);
        }
        else {
            session = context;
        }
        if (!session) {
            const chatView = viewsService.getActiveViewWithId(ChatViewId);
            session = chatView?.getFocusedSessions().at(0);
        }
        if (session) {
            await this.runWithSession(session, accessor);
        }
    }
}
export class MarkAgentSessionUnreadAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.markUnread',
            title: localize2('markUnread', "Mark as Unread"),
            menu: {
                id: MenuId.AgentSessionsContext,
                group: 'edit',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.isReadAgentSession, ChatContextKeys.isArchivedAgentSession.negate() // no read state for archived sessions
                ),
            }
        });
    }
    runWithSession(session) {
        session.setRead(false);
    }
}
export class MarkAgentSessionReadAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.markRead',
            title: localize2('markRead', "Mark as Read"),
            menu: {
                id: MenuId.AgentSessionsContext,
                group: 'edit',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.isReadAgentSession.negate(), ChatContextKeys.isArchivedAgentSession.negate() // no read state for archived sessions
                ),
            }
        });
    }
    runWithSession(session) {
        session.setRead(true);
    }
}
export class ArchiveAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.archive',
            title: localize2('archive', "Archive"),
            icon: Codicon.archive,
            keybinding: {
                primary: 20 /* KeyCode.Delete */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, ChatContextKeys.isArchivedAgentSession.negate())
            },
            menu: [{
                    id: MenuId.AgentSessionItemToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ChatContextKeys.isArchivedAgentSession.negate(),
                }, {
                    id: MenuId.AgentSessionsContext,
                    group: 'edit',
                    order: 2,
                    when: ChatContextKeys.isArchivedAgentSession.negate()
                }]
        });
    }
    async runWithSession(session, accessor) {
        const chatService = accessor.get(IChatService);
        const chatModel = chatService.getSession(session.resource);
        const dialogService = accessor.get(IDialogService);
        if (chatModel && !await showClearEditingSessionConfirmation(chatModel, dialogService, {
            isArchiveAction: true,
            titleOverride: localize('archiveSession', "Archive chat with pending edits?"),
            messageOverride: localize('archiveSessionDescription', "You have pending changes in this chat session.")
        })) {
            return;
        }
        session.setArchived(true);
    }
}
export class UnarchiveAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: 'agentSession.unarchive',
            title: localize2('unarchive', "Unarchive"),
            icon: Codicon.unarchive,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */,
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, ChatContextKeys.isArchivedAgentSession)
            },
            menu: [{
                    id: MenuId.AgentSessionItemToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ChatContextKeys.isArchivedAgentSession,
                }, {
                    id: MenuId.AgentSessionsContext,
                    group: 'edit',
                    order: 2,
                    when: ChatContextKeys.isArchivedAgentSession,
                }]
        });
    }
    runWithSession(session) {
        session.setArchived(false);
    }
}
export class RenameAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: AGENT_SESSION_RENAME_ACTION_ID,
            title: localize2('rename', "Rename..."),
            keybinding: {
                primary: 60 /* KeyCode.F2 */,
                mac: {
                    primary: 3 /* KeyCode.Enter */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerFocused, ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)),
            },
            menu: {
                id: MenuId.AgentSessionsContext,
                group: 'edit',
                order: 3,
                when: ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)
            }
        });
    }
    async runWithSession(session, accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const chatService = accessor.get(IChatService);
        const title = await quickInputService.input({ prompt: localize('newChatTitle', "New agent session title"), value: session.label });
        if (title) {
            chatService.setChatSessionTitle(session.resource, title);
        }
    }
}
export class DeleteAgentSessionAction extends BaseAgentSessionAction {
    constructor() {
        super({
            id: AGENT_SESSION_DELETE_ACTION_ID,
            title: localize2('delete', "Delete..."),
            menu: {
                id: MenuId.AgentSessionsContext,
                group: 'edit',
                order: 4,
                when: ChatContextKeys.agentSessionType.isEqualTo(AgentSessionProviders.Local)
            }
        });
    }
    async runWithSession(session, accessor) {
        const chatService = accessor.get(IChatService);
        const dialogService = accessor.get(IDialogService);
        const widgetService = accessor.get(IChatWidgetService);
        const confirmed = await dialogService.confirm({
            message: localize('deleteSession.confirm', "Are you sure you want to delete this chat session?"),
            detail: localize('deleteSession.detail', "This action cannot be undone."),
            primaryButton: localize('deleteSession.delete', "Delete")
        });
        if (!confirmed.confirmed) {
            return;
        }
        // Clear chat widget
        await widgetService.getWidgetBySessionResource(session.resource)?.clear();
        // Remove from storage
        await chatService.removeHistoryEntry(session.resource);
    }
}
export class DeleteAllLocalSessionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.clearHistory',
            title: localize2('agentSessions.deleteAll', "Delete All Local Workspace Chat Sessions"),
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        const widgetService = accessor.get(IChatWidgetService);
        const dialogService = accessor.get(IDialogService);
        const confirmed = await dialogService.confirm({
            message: localize('deleteAllChats.confirm', "Are you sure you want to delete all local workspace chat sessions?"),
            detail: localize('deleteAllChats.detail', "This action cannot be undone."),
            primaryButton: localize('deleteAllChats.button', "Delete All")
        });
        if (!confirmed.confirmed) {
            return;
        }
        // Clear all chat widgets
        await Promise.all(widgetService.getAllWidgets().map(widget => widget.clear()));
        // Remove from storage
        await chatService.clearAllHistoryEntries();
    }
}
class BaseOpenAgentSessionAction extends BaseAgentSessionAction {
    async runWithSession(session, accessor) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const uri = session.resource;
        await chatWidgetService.openSession(uri, this.getTargetGroup(), {
            ...this.getOptions(),
            pinned: true
        });
    }
}
export class OpenAgentSessionInEditorGroupAction extends BaseOpenAgentSessionAction {
    static { this.id = 'workbench.action.chat.openSessionInEditorGroup'; }
    constructor() {
        super({
            id: OpenAgentSessionInEditorGroupAction.id,
            title: localize2('chat.openSessionInEditorGroup.label', "Open as Editor"),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ChatContextKeys.agentSessionsViewerFocused,
            },
            menu: {
                id: MenuId.AgentSessionsContext,
                order: 1,
                group: 'navigation'
            }
        });
    }
    getTargetGroup() {
        return ACTIVE_GROUP;
    }
    getOptions() {
        return {};
    }
}
export class OpenAgentSessionInNewEditorGroupAction extends BaseOpenAgentSessionAction {
    static { this.id = 'workbench.action.chat.openSessionInNewEditorGroup'; }
    constructor() {
        super({
            id: OpenAgentSessionInNewEditorGroupAction.id,
            title: localize2('chat.openSessionInNewEditorGroup.label', "Open to the Side"),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: ChatContextKeys.agentSessionsViewerFocused,
            },
            menu: {
                id: MenuId.AgentSessionsContext,
                order: 2,
                group: 'navigation'
            }
        });
    }
    getTargetGroup() {
        return SIDE_GROUP;
    }
    getOptions() {
        return {};
    }
}
export class OpenAgentSessionInNewWindowAction extends BaseOpenAgentSessionAction {
    static { this.id = 'workbench.action.chat.openSessionInNewWindow'; }
    constructor() {
        super({
            id: OpenAgentSessionInNewWindowAction.id,
            title: localize2('chat.openSessionInNewWindow.label', "Open in New Window"),
            menu: {
                id: MenuId.AgentSessionsContext,
                order: 3,
                group: 'navigation'
            }
        });
    }
    getTargetGroup() {
        return AUX_WINDOW_GROUP;
    }
    getOptions() {
        return {
            auxiliary: { compact: true, bounds: { width: 800, height: 640 } }
        };
    }
}
//#endregion
//#region Agent Sessions Sidebar
export class RefreshAgentSessionsViewerAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionsViewer.refresh',
            title: localize2('refresh', "Refresh Agent Sessions"),
            icon: Codicon.refresh,
            menu: {
                id: MenuId.AgentSessionsToolbar,
                group: 'navigation',
                order: 1,
                when: ChatContextKeys.agentSessionsViewerLimited.negate()
            },
        });
    }
    run(accessor, agentSessionsControl) {
        agentSessionsControl.refresh();
    }
}
export class FindAgentSessionInViewerAction extends Action2 {
    constructor() {
        super({
            id: 'agentSessionsViewer.find',
            title: localize2('find', "Find Agent Session"),
            icon: Codicon.search,
            menu: {
                id: MenuId.AgentSessionsToolbar,
                group: 'navigation',
                order: 2,
                when: ChatContextKeys.agentSessionsViewerLimited.negate()
            }
        });
    }
    run(accessor, agentSessionsControl) {
        return agentSessionsControl.openFind();
    }
}
class UpdateChatViewWidthAction extends Action2 {
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const configurationService = accessor.get(IConfigurationService);
        const viewsService = accessor.get(IViewsService);
        const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
        if (typeof chatLocation !== 'number') {
            return; // we need a view location
        }
        // Determine if we can resize the view: this is not possible
        // for when the chat view is in the panel at the top or bottom
        const panelPosition = layoutService.getPanelPosition();
        const canResizeView = chatLocation !== 1 /* ViewContainerLocation.Panel */ || (panelPosition === 0 /* Position.LEFT */ || panelPosition === 1 /* Position.RIGHT */);
        // Update configuration if needed
        let chatView = viewsService.getActiveViewWithId(ChatViewId);
        if (!chatView) {
            chatView = await viewsService.openView(ChatViewId, false);
        }
        if (!chatView) {
            return; // we need the chat view
        }
        const configuredOrientation = configurationService.getValue(ChatConfiguration.ChatViewSessionsOrientation);
        let validatedConfiguredOrientation;
        if (configuredOrientation === 'stacked' || configuredOrientation === 'sideBySide') {
            validatedConfiguredOrientation = configuredOrientation;
        }
        else {
            validatedConfiguredOrientation = 'sideBySide'; // default
        }
        const newOrientation = this.getOrientation();
        if ((!canResizeView || validatedConfiguredOrientation === 'sideBySide') && newOrientation === AgentSessionsViewerOrientation.Stacked) {
            chatView.updateConfiguredSessionsViewerOrientation('stacked');
        }
        else if ((!canResizeView || validatedConfiguredOrientation === 'stacked') && newOrientation === AgentSessionsViewerOrientation.SideBySide) {
            chatView.updateConfiguredSessionsViewerOrientation('sideBySide');
        }
        const part = getPartByLocation(chatLocation);
        let currentSize = layoutService.getSize(part);
        const sideBySideMinWidth = 600 + 1; // account for possible theme border
        const stackedMaxWidth = sideBySideMinWidth - 1;
        if ((newOrientation === AgentSessionsViewerOrientation.SideBySide && currentSize.width >= sideBySideMinWidth) || // already wide enough to show side by side
            newOrientation === AgentSessionsViewerOrientation.Stacked // always wide enough to show stacked
        ) {
            return; // size suffices
        }
        if (!canResizeView) {
            return; // location does not allow for resize (panel top or bottom)
        }
        if (chatLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
            layoutService.setAuxiliaryBarMaximized(false); // Leave maximized state if applicable
            currentSize = layoutService.getSize(part);
        }
        const lastWidthForOrientation = chatView?.getLastDimensions(newOrientation)?.width;
        let newWidth;
        if (newOrientation === AgentSessionsViewerOrientation.SideBySide) {
            newWidth = Math.max(sideBySideMinWidth, lastWidthForOrientation || Math.round(layoutService.mainContainerDimension.width / 2));
        }
        else {
            newWidth = Math.min(stackedMaxWidth, lastWidthForOrientation || stackedMaxWidth);
        }
        layoutService.setSize(part, {
            width: newWidth,
            height: currentSize.height
        });
    }
}
export class ShowAgentSessionsSidebar extends UpdateChatViewWidthAction {
    static { this.ID = 'agentSessions.showAgentSessionsSidebar'; }
    static { this.TITLE = localize2('showAgentSessionsSidebar', "Show Agent Sessions Sidebar"); }
    constructor() {
        super({
            id: ShowAgentSessionsSidebar.ID,
            title: ShowAgentSessionsSidebar.TITLE,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.Stacked), ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true)),
            f1: true,
            category: CHAT_CATEGORY,
        });
    }
    getOrientation() {
        return AgentSessionsViewerOrientation.SideBySide;
    }
}
export class HideAgentSessionsSidebar extends UpdateChatViewWidthAction {
    static { this.ID = 'agentSessions.hideAgentSessionsSidebar'; }
    static { this.TITLE = localize2('hideAgentSessionsSidebar', "Hide Agent Sessions Sidebar"); }
    constructor() {
        super({
            id: HideAgentSessionsSidebar.ID,
            title: HideAgentSessionsSidebar.TITLE,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.SideBySide), ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true)),
            f1: true,
            category: CHAT_CATEGORY,
        });
    }
    getOrientation() {
        return AgentSessionsViewerOrientation.Stacked;
    }
}
export class ToggleAgentSessionsSidebar extends Action2 {
    static { this.ID = 'agentSessions.toggleAgentSessionsSidebar'; }
    static { this.TITLE = localize2('toggleAgentSessionsSidebar', "Toggle Agent Sessions Sidebar"); }
    constructor() {
        super({
            id: ToggleAgentSessionsSidebar.ID,
            title: ToggleAgentSessionsSidebar.TITLE,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true)),
            f1: true,
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const viewsService = accessor.get(IViewsService);
        const chatView = viewsService.getActiveViewWithId(ChatViewId);
        const currentOrientation = chatView?.getSessionsViewerOrientation();
        if (currentOrientation === AgentSessionsViewerOrientation.SideBySide) {
            await commandService.executeCommand(HideAgentSessionsSidebar.ID);
        }
        else {
            await commandService.executeCommand(ShowAgentSessionsSidebar.ID);
        }
    }
}
export class FocusAgentSessionsAction extends Action2 {
    static { this.id = 'workbench.action.chat.focusAgentSessionsViewer'; }
    constructor() {
        super({
            id: FocusAgentSessionsAction.id,
            title: localize2('chat.focusAgentSessionsViewer.label', "Focus Agent Sessions"),
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewSessionsEnabled}`, true)),
            category: CHAT_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const configurationService = accessor.get(IConfigurationService);
        const commandService = accessor.get(ICommandService);
        const chatView = await viewsService.openView(ChatViewId, true);
        const focused = chatView?.focusSessions();
        if (focused) {
            return;
        }
        const configuredSessionsViewerOrientation = configurationService.getValue(ChatConfiguration.ChatViewSessionsOrientation);
        if (configuredSessionsViewerOrientation === 'stacked') {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        else {
            await commandService.executeCommand(ShowAgentSessionsSidebar.ID);
        }
        chatView?.focusSessions();
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FnZW50U2Vzc2lvbnMvYWdlbnRTZXNzaW9uc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQTRGLHFCQUFxQixFQUFFLCtCQUErQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDM0wsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSw4QkFBOEIsRUFBRSxxQkFBcUIsRUFBRSw4QkFBOEIsRUFBeUIsTUFBTSxvQkFBb0IsQ0FBQztBQUNsTCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBa0IsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakksT0FBTyxFQUFFLHNCQUFzQixFQUF5QixNQUFNLDZCQUE2QixDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx1QkFBdUIsRUFBWSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEy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
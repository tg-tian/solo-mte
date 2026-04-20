/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { AgentSessionsViewerOrientation, AgentSessionsViewerPosition } from './agentSessions.js';
import { IAgentSessionsService, AgentSessionsService } from './agentSessionsService.js';
import { LocalAgentsSessionsProvider } from './localAgentSessionsProvider.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ArchiveAgentSessionAction, ArchiveAgentSessionSectionAction, UnarchiveAgentSessionAction, OpenAgentSessionInEditorGroupAction, OpenAgentSessionInNewEditorGroupAction, OpenAgentSessionInNewWindowAction, ShowAgentSessionsSidebar, HideAgentSessionsSidebar, ToggleAgentSessionsSidebar, RefreshAgentSessionsViewerAction, FindAgentSessionInViewerAction, MarkAgentSessionUnreadAction, MarkAgentSessionReadAction, FocusAgentSessionsAction, SetAgentSessionsOrientationStackedAction, SetAgentSessionsOrientationSideBySideAction, ToggleChatViewSessionsAction, PickAgentSessionAction, ArchiveAllAgentSessionsAction, RenameAgentSessionAction, DeleteAgentSessionAction, DeleteAllLocalSessionsAction } from './agentSessionsActions.js';
//#region Actions and Menus
registerAction2(FocusAgentSessionsAction);
registerAction2(PickAgentSessionAction);
registerAction2(ArchiveAllAgentSessionsAction);
registerAction2(ArchiveAgentSessionSectionAction);
registerAction2(ArchiveAgentSessionAction);
registerAction2(UnarchiveAgentSessionAction);
registerAction2(RenameAgentSessionAction);
registerAction2(DeleteAgentSessionAction);
registerAction2(DeleteAllLocalSessionsAction);
registerAction2(MarkAgentSessionUnreadAction);
registerAction2(MarkAgentSessionReadAction);
registerAction2(OpenAgentSessionInNewWindowAction);
registerAction2(OpenAgentSessionInEditorGroupAction);
registerAction2(OpenAgentSessionInNewEditorGroupAction);
registerAction2(RefreshAgentSessionsViewerAction);
registerAction2(FindAgentSessionInViewerAction);
registerAction2(ShowAgentSessionsSidebar);
registerAction2(HideAgentSessionsSidebar);
registerAction2(ToggleAgentSessionsSidebar);
registerAction2(ToggleChatViewSessionsAction);
registerAction2(SetAgentSessionsOrientationStackedAction);
registerAction2(SetAgentSessionsOrientationSideBySideAction);
// --- Agent Sessions Toolbar
MenuRegistry.appendMenuItem(MenuId.AgentSessionsToolbar, {
    submenu: MenuId.AgentSessionsViewerFilterSubMenu,
    title: localize2('filterAgentSessions', "Filter Agent Sessions"),
    group: 'navigation',
    order: 3,
    icon: Codicon.filter,
    when: ChatContextKeys.agentSessionsViewerLimited.negate()
});
MenuRegistry.appendMenuItem(MenuId.AgentSessionsToolbar, {
    command: {
        id: ShowAgentSessionsSidebar.ID,
        title: ShowAgentSessionsSidebar.TITLE,
        icon: Codicon.layoutSidebarRightOff,
    },
    group: 'navigation',
    order: 5,
    when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.Stacked), ChatContextKeys.agentSessionsViewerPosition.isEqualTo(AgentSessionsViewerPosition.Right))
});
MenuRegistry.appendMenuItem(MenuId.AgentSessionsToolbar, {
    command: {
        id: ShowAgentSessionsSidebar.ID,
        title: ShowAgentSessionsSidebar.TITLE,
        icon: Codicon.layoutSidebarLeftOff,
    },
    group: 'navigation',
    order: 5,
    when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.Stacked), ChatContextKeys.agentSessionsViewerPosition.isEqualTo(AgentSessionsViewerPosition.Left))
});
MenuRegistry.appendMenuItem(MenuId.AgentSessionsToolbar, {
    command: {
        id: HideAgentSessionsSidebar.ID,
        title: HideAgentSessionsSidebar.TITLE,
        icon: Codicon.layoutSidebarRight,
    },
    group: 'navigation',
    order: 5,
    when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.SideBySide), ChatContextKeys.agentSessionsViewerPosition.isEqualTo(AgentSessionsViewerPosition.Right))
});
MenuRegistry.appendMenuItem(MenuId.AgentSessionsToolbar, {
    command: {
        id: HideAgentSessionsSidebar.ID,
        title: HideAgentSessionsSidebar.TITLE,
        icon: Codicon.layoutSidebarLeft,
    },
    group: 'navigation',
    order: 5,
    when: ContextKeyExpr.and(ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.SideBySide), ChatContextKeys.agentSessionsViewerPosition.isEqualTo(AgentSessionsViewerPosition.Left))
});
// --- Sessions Title Toolbar
MenuRegistry.appendMenuItem(MenuId.ChatViewSessionTitleToolbar, {
    command: {
        id: ShowAgentSessionsSidebar.ID,
        title: ShowAgentSessionsSidebar.TITLE,
        icon: Codicon.layoutSidebarLeftOff,
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.agentSessionsViewerVisible.negate(), ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.Stacked)), ChatContextKeys.agentSessionsViewerPosition.isEqualTo(AgentSessionsViewerPosition.Left))
});
MenuRegistry.appendMenuItem(MenuId.ChatViewSessionTitleToolbar, {
    command: {
        id: ShowAgentSessionsSidebar.ID,
        title: ShowAgentSessionsSidebar.TITLE,
        icon: Codicon.layoutSidebarRightOff,
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.agentSessionsViewerVisible.negate(), ChatContextKeys.agentSessionsViewerOrientation.isEqualTo(AgentSessionsViewerOrientation.Stacked)), ChatContextKeys.agentSessionsViewerPosition.isEqualTo(AgentSessionsViewerPosition.Right))
});
//#endregion
//#region Workbench Contributions
registerWorkbenchContribution2(LocalAgentsSessionsProvider.ID, LocalAgentsSessionsProvider, 3 /* WorkbenchPhase.AfterRestored */);
registerSingleton(IAgentSessionsService, AgentSessionsService, 1 /* InstantiationType.Delayed */);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FnZW50U2Vzc2lvbnMvYWdlbnRTZXNzaW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLDREQUE0RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0scUNBQXFDLENBQUM7QUFDckcsT0FBTyxFQUFnQixNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQ0FBZ0MsRUFBRSwyQkFBMkIsRUFBRSxtQ0FBbUMsRUFBRSxzQ0FBc0MsRUFBRSxpQ0FBaUMsRUFBRSx3QkFBd0IsRUFBRSx3QkFBd0IsRUFBRSwwQkFBMEIsRUFBRSxnQ0FBZ0MsRUFBRSw4QkFBOEIsRUFBRSw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0Is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
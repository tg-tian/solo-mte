/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { IChatSessionsService } from './chatSessionsService.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["Edits2Enabled"] = "chat.edits2.enabled";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
    ChatConfiguration["EditRequests"] = "chat.editRequests";
    ChatConfiguration["GlobalAutoApprove"] = "chat.tools.global.autoApprove";
    ChatConfiguration["AutoApproveEdits"] = "chat.tools.edits.autoApprove";
    ChatConfiguration["AutoApprovedUrls"] = "chat.tools.urls.autoApprove";
    ChatConfiguration["EligibleForAutoApproval"] = "chat.tools.eligibleForAutoApproval";
    ChatConfiguration["EnableMath"] = "chat.math.enabled";
    ChatConfiguration["CheckpointsEnabled"] = "chat.checkpoints.enabled";
    ChatConfiguration["ThinkingStyle"] = "chat.agent.thinkingStyle";
    ChatConfiguration["ThinkingGenerateTitles"] = "chat.agent.thinking.generateTitles";
    ChatConfiguration["TodosShowWidget"] = "chat.tools.todos.showWidget";
    ChatConfiguration["NotifyWindowOnResponseReceived"] = "chat.notifyWindowOnResponseReceived";
    ChatConfiguration["ChatViewSessionsEnabled"] = "chat.viewSessions.enabled";
    ChatConfiguration["ChatViewSessionsOrientation"] = "chat.viewSessions.orientation";
    ChatConfiguration["ChatViewTitleEnabled"] = "chat.viewTitle.enabled";
    ChatConfiguration["ChatViewWelcomeEnabled"] = "chat.viewWelcome.enabled";
    ChatConfiguration["SubagentToolCustomAgents"] = "chat.customAgentInSubagent.enabled";
    ChatConfiguration["ShowCodeBlockProgressAnimation"] = "chat.agent.codeBlockProgress";
    ChatConfiguration["RestoreLastPanelSession"] = "chat.restoreLastPanelSession";
    ChatConfiguration["ExitAfterDelegation"] = "chat.exitAfterDelegation";
    ChatConfiguration["SuspendThrottling"] = "chat.suspendThrottling";
})(ChatConfiguration || (ChatConfiguration = {}));
/**
 * The "kind" of agents for custom agents.
 */
export var ChatModeKind;
(function (ChatModeKind) {
    ChatModeKind["Ask"] = "ask";
    ChatModeKind["Edit"] = "edit";
    ChatModeKind["Agent"] = "agent";
})(ChatModeKind || (ChatModeKind = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatModeKind.Ask:
        case ChatModeKind.Edit:
        case ChatModeKind.Agent:
            return mode;
        default:
            return undefined;
    }
}
export function isChatMode(mode) {
    return !!validateChatMode(mode);
}
// Thinking display modes for pinned content
export var ThinkingDisplayMode;
(function (ThinkingDisplayMode) {
    ThinkingDisplayMode["Collapsed"] = "collapsed";
    ThinkingDisplayMode["CollapsedPreview"] = "collapsedPreview";
    ThinkingDisplayMode["FixedScrolling"] = "fixedScrolling";
})(ThinkingDisplayMode || (ThinkingDisplayMode = {}));
export var CollapsedToolsDisplayMode;
(function (CollapsedToolsDisplayMode) {
    CollapsedToolsDisplayMode["Off"] = "off";
    CollapsedToolsDisplayMode["WithThinking"] = "withThinking";
    CollapsedToolsDisplayMode["Always"] = "always";
})(CollapsedToolsDisplayMode || (CollapsedToolsDisplayMode = {}));
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    /**
     * This is chat, whether it's in the sidebar, a chat editor, or quick chat.
     * Leaving the values alone as they are in stored data so we don't have to normalize them.
     */
    ChatAgentLocation["Chat"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    /**
     * EditorInline means inline chat in a text editor.
     */
    ChatAgentLocation["EditorInline"] = "editor";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Chat;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.EditorInline;
        }
        return ChatAgentLocation.Chat;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
/**
 * List of file schemes that are always unsupported for use in chat
 */
const chatAlwaysUnsupportedFileSchemes = new Set([
    Schemas.vscodeChatEditor,
    Schemas.walkThrough,
    Schemas.vscodeLocalChatSession,
    Schemas.vscodeSettings,
    Schemas.webviewPanel,
    Schemas.vscodeUserData,
    Schemas.extension,
    'ccreq',
    'openai-codex', // Codex session custom editor scheme
]);
export function isSupportedChatFileScheme(accessor, scheme) {
    const chatService = accessor.get(IChatSessionsService);
    // Exclude schemes we always know are bad
    if (chatAlwaysUnsupportedFileSchemes.has(scheme)) {
        return false;
    }
    // Plus any schemes used by content providers
    if (chatService.getContentProviderSchemes().includes(scheme)) {
        return false;
    }
    // Everything else is supported
    return true;
}
export const MANAGE_CHAT_COMMAND_ID = 'workbench.action.chat.manage';
export const ChatEditorTitleMaxLength = 30;
export const CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES = 1000;
export const CONTEXT_MODELS_EDITOR = new RawContextKey('inModelsEditor', false);
export const CONTEXT_MODELS_SEARCH_FOCUS = new RawContextKey('inModelsSearch', false);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJGLE1BQU0sQ0FBTixJQUFZLGlCQXdCWDtBQXhCRCxXQUFZLGlCQUFpQjtJQUM1Qix3REFBbUMsQ0FBQTtJQUNuQywwREFBcUMsQ0FBQTtJQUNyQywwRUFBcUQsQ0FBQTtJQUNyRCx1REFBa0MsQ0FBQTtJQUNsQyx3RUFBbUQsQ0FBQTtJQUNuRCxzRUFBaUQsQ0FBQTtJQUNqRCxxRUFBZ0QsQ0FBQTtJQUNoRCxtRkFBOEQsQ0FBQTtJQUM5RCxxREFBZ0MsQ0FBQTtJQUNoQyxvRUFBK0MsQ0FBQTtJQUMvQywrREFBMEMsQ0FBQTtJQUMxQyxrRkFBNkQsQ0FBQTtJQUM3RCxvRUFBK0MsQ0FBQTtJQUMvQywyRkFBc0UsQ0FBQTtJQUN0RSwwRUFBcUQsQ0FBQTtJQUNyRCxrRkFBNkQsQ0FBQTtJQUM3RCxvRUFBK0MsQ0FBQTtJQUMvQyx3RUFBbUQsQ0FBQTtJQUNuRCxvRkFBK0QsQ0FBQTtJQUMvRCxvRkFBK0QsQ0FBQTtJQUMvRCw2RUFBd0QsQ0FBQTtJQUN4RCxxRUFBZ0QsQ0FBQTtJQUNoRCxpRUFBNEMsQ0FBQTtBQUM3QyxDQUFDLEVBeEJXLGlCQUFpQixLQUFqQixpQkFBaUIsUUF3QjVCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxZQUlYO0FBSkQsV0FBWSxZQUFZO0lBQ3ZCLDJCQUFXLENBQUE7SUFDWCw2QkFBYSxDQUFBO0lBQ2IsK0JBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSlcsWUFBWSxLQUFaLFlBQVksUUFJdkI7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBYTtJQUM3QyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQ2QsS0FBSyxZQUFZLENBQUMsR0FBRyxDQUFDO1FBQ3RCLEtBQUssWUFBWSxDQUFDLElBQUksQ0FBQztRQUN2QixLQUFLLFlBQVksQ0FBQyxLQUFLO1lBQ3RCLE9BQU8sSUFBb0IsQ0FBQztRQUM3QjtZQUNDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFhO0lBQ3ZDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFFRCw0Q0FBNEM7QUFDNUMsTUFBTSxDQUFOLElBQVksbUJBSVg7QUFKRCxXQUFZLG1CQUFtQjtJQUM5Qiw4Q0FBdUIsQ0FBQTtJQUN2Qiw0REFBcUMsQ0FBQTtJQUNyQyx3REFBaUMsQ0FBQTtBQUNsQyxDQUFDLEVBSlcsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUk5QjtBQUVELE1BQU0sQ0FBTixJQUFZLHlCQUlYO0FBSkQsV0FBWSx5QkFBeUI7SUFDcEMsd0NBQVcsQ0FBQTtJQUNYLDBEQUE2QixDQUFBO0lBQzdCLDhDQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFKVyx5QkFBeUIsS0FBekIseUJBQXlCLFFBSXBDO0FBSUQsTUFBTSxDQUFOLElBQVksaUJBWVg7QUFaRCxXQUFZLGlCQUFpQjtJQUM1Qjs7O09BR0c7SUFDSCxtQ0FBYyxDQUFBO0lBQ2QsMENBQXFCLENBQUE7SUFDckIsMENBQXFCLENBQUE7SUFDckI7O09BRUc7SUFDSCw0Q0FBdUIsQ0FBQTtBQUN4QixDQUFDLEVBWlcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQVk1QjtBQUVELFdBQWlCLGlCQUFpQjtJQUNqQyxTQUFnQixPQUFPLENBQUMsS0FBMEM7UUFDakUsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7WUFDNUMsS0FBSyxVQUFVLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztZQUNuRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDO1lBQ25ELEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxZQUFZLENBQUM7UUFDdEQsQ0FBQztRQUNELE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFSZSx5QkFBTyxVQVF0QixDQUFBO0FBQ0YsQ0FBQyxFQVZnQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBVWpDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGdDQUFnQyxHQUFHLElBQUksR0FBRyxDQUFDO0lBQ2hELE9BQU8sQ0FBQyxnQkFBZ0I7SUFDeEIsT0FBTyxDQUFDLFdBQVc7SUFDbkIsT0FBTyxDQUFDLHNCQUFzQjtJQUM5QixPQUFPLENBQUMsY0FBYztJQUN0QixPQUFPLENBQUMsWUFBWTtJQUNwQixPQUFPLENBQUMsY0FBYztJQUN0QixPQUFPLENBQUMsU0FBUztJQUNqQixPQUFPO0lBQ1AsY0FBYyxFQUFFLHFDQUFxQztDQUNyRCxDQUFDLENBQUM7QUFFSCxNQUFNLFVBQVUseUJBQXlCLENBQUMsUUFBMEIsRUFBRSxNQUFjO0lBQ25GLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUV2RCx5Q0FBeUM7SUFDekMsSUFBSSxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNsRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCw2Q0FBNkM7SUFDN0MsSUFBSSxXQUFXLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUM5RCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCwrQkFBK0I7SUFDL0IsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsOEJBQThCLENBQUM7QUFDckUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsRUFBRSxDQUFDO0FBRTNDLE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLElBQUksQ0FBQztBQUMzRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN6RixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQyJ9
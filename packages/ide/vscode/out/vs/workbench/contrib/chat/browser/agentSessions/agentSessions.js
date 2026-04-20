/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localChatSessionType } from '../../common/chatSessionsService.js';
import { foreground, listActiveSelectionForeground, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
export var AgentSessionProviders;
(function (AgentSessionProviders) {
    AgentSessionProviders["Local"] = "local";
    AgentSessionProviders["Background"] = "copilotcli";
    AgentSessionProviders["Cloud"] = "copilot-cloud-agent";
})(AgentSessionProviders || (AgentSessionProviders = {}));
export function getAgentSessionProviderName(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return localize('chat.session.providerLabel.local', "Local");
        case AgentSessionProviders.Background:
            return localize('chat.session.providerLabel.background', "Background");
        case AgentSessionProviders.Cloud:
            return localize('chat.session.providerLabel.cloud', "Cloud");
    }
}
export function getAgentSessionProviderIcon(provider) {
    switch (provider) {
        case AgentSessionProviders.Local:
            return Codicon.vm;
        case AgentSessionProviders.Background:
            return Codicon.worktree;
        case AgentSessionProviders.Cloud:
            return Codicon.cloud;
    }
}
export var AgentSessionsViewerOrientation;
(function (AgentSessionsViewerOrientation) {
    AgentSessionsViewerOrientation[AgentSessionsViewerOrientation["Stacked"] = 1] = "Stacked";
    AgentSessionsViewerOrientation[AgentSessionsViewerOrientation["SideBySide"] = 2] = "SideBySide";
})(AgentSessionsViewerOrientation || (AgentSessionsViewerOrientation = {}));
export var AgentSessionsViewerPosition;
(function (AgentSessionsViewerPosition) {
    AgentSessionsViewerPosition[AgentSessionsViewerPosition["Left"] = 1] = "Left";
    AgentSessionsViewerPosition[AgentSessionsViewerPosition["Right"] = 2] = "Right";
})(AgentSessionsViewerPosition || (AgentSessionsViewerPosition = {}));
export const agentSessionReadIndicatorForeground = registerColor('agentSessionReadIndicator.foreground', { dark: transparent(foreground, 0.15), light: transparent(foreground, 0.15), hcDark: null, hcLight: null }, localize('agentSessionReadIndicatorForeground', "Foreground color for the read indicator in an agent session."));
export const agentSessionSelectedBadgeBorder = registerColor('agentSessionSelectedBadge.border', { dark: transparent(listActiveSelectionForeground, 0.3), light: transparent(listActiveSelectionForeground, 0.3), hcDark: foreground, hcLight: foreground }, localize('agentSessionSelectedBadgeBorder', "Border color for the badges in selected agent session items."));
export const agentSessionSelectedUnfocusedBadgeBorder = registerColor('agentSessionSelectedUnfocusedBadge.border', { dark: transparent(foreground, 0.3), light: transparent(foreground, 0.3), hcDark: foreground, hcLight: foreground }, localize('agentSessionSelectedUnfocusedBadgeBorder', "Border color for the badges in selected agent session items when the view is unfocused."));
export const AGENT_SESSION_RENAME_ACTION_ID = 'agentSession.rename';
export const AGENT_SESSION_DELETE_ACTION_ID = 'agentSession.delete';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSw2QkFBNkIsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFOUksTUFBTSxDQUFOLElBQVkscUJBSVg7QUFKRCxXQUFZLHFCQUFxQjtJQUNoQyx3Q0FBNEIsQ0FBQTtJQUM1QixrREFBeUIsQ0FBQTtJQUN6QixzREFBNkIsQ0FBQTtBQUM5QixDQUFDLEVBSlcscUJBQXFCLEtBQXJCLHFCQUFxQixRQUloQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxRQUErQjtJQUMxRSxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUsscUJBQXFCLENBQUMsS0FBSztZQUMvQixPQUFPLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5RCxLQUFLLHFCQUFxQixDQUFDLFVBQVU7WUFDcEMsT0FBTyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEUsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLO1lBQy9CLE9BQU8sUUFBUSxDQUFDLGtDQUFrQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9ELENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFFBQStCO0lBQzFFLFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDbEIsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLO1lBQy9CLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNuQixLQUFLLHFCQUFxQixDQUFDLFVBQVU7WUFDcEMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ3pCLEtBQUsscUJBQXFCLENBQUMsS0FBSztZQUMvQixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDdkIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBWSw4QkFHWDtBQUhELFdBQVksOEJBQThCO0lBQ3pDLHlGQUFXLENBQUE7SUFDWCwrRkFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUhXLDhCQUE4QixLQUE5Qiw4QkFBOEIsUUFHekM7QUFFRCxNQUFNLENBQU4sSUFBWSwyQkFHWDtBQUhELFdBQVksMkJBQTJCO0lBQ3RDLDZFQUFRLENBQUE7SUFDUiwrRUFBSyxDQUFBO0FBQ04sQ0FBQyxFQUhXLDJCQUEyQixLQUEzQiwyQkFBMkIsUUFHdEM7QUFRRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxhQUFhLENBQy9ELHNDQUFzQyxFQUN0QyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUMxRyxRQUFRLENBQUMscUNBQXFDLEVBQUUsOERBQThELENBQUMsQ0FDL0csQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGFBQWEsQ0FDM0Qsa0NBQWtDLEVBQ2xDLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUMxSixRQUFRLENBQUMsaUNBQWlDLEVBQUUsOERBQThELENBQUMsQ0FDM0csQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHdDQUF3QyxHQUFHLGFBQWEsQ0FDcEUsMkNBQTJDLEVBQzNDLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEVBQ3BILFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSx5RkFBeUYsQ0FBQyxDQUMvSSxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcscUJBQXFCLENBQUM7QUFDcEUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcscUJBQXFCLENBQUMifQ==
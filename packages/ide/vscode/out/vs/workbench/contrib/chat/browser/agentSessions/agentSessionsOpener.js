/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLocalAgentSessionItem } from './agentSessionsModel.js';
import { ChatViewPaneTarget, IChatWidgetService } from '../chat.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { Schemas } from '../../../../../base/common/network.js';
export async function openSession(accessor, session, openOptions) {
    const chatSessionsService = accessor.get(IChatSessionsService);
    const chatWidgetService = accessor.get(IChatWidgetService);
    session.setRead(true); // mark as read when opened
    let sessionOptions;
    if (isLocalAgentSessionItem(session)) {
        sessionOptions = {};
    }
    else {
        sessionOptions = { title: { preferred: session.label } };
    }
    let options = {
        ...sessionOptions,
        ...openOptions?.editorOptions,
        revealIfOpened: true // always try to reveal if already opened
    };
    await chatSessionsService.activateChatSessionItemProvider(session.providerType); // ensure provider is activated before trying to open
    let target;
    if (openOptions?.sideBySide) {
        target = ACTIVE_GROUP;
    }
    else {
        target = ChatViewPaneTarget;
    }
    const isLocalChatSession = session.resource.scheme === Schemas.vscodeChatEditor || session.resource.scheme === Schemas.vscodeLocalChatSession;
    if (!isLocalChatSession && !(await chatSessionsService.canResolveChatSession(session.resource))) {
        target = openOptions?.sideBySide ? SIDE_GROUP : ACTIVE_GROUP; // force to open in editor if session cannot be resolved in panel
        options = { ...options, revealIfOpened: true };
    }
    await chatWidgetService.openSession(session.resource, target, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc09wZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zT3BlbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBaUIsdUJBQXVCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUdqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEUsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQUMsUUFBMEIsRUFBRSxPQUFzQixFQUFFLFdBQXNFO0lBQzNKLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9ELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBRTNELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQywyQkFBMkI7SUFFbEQsSUFBSSxjQUFrQyxDQUFDO0lBQ3ZDLElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN0QyxjQUFjLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7U0FBTSxDQUFDO1FBQ1AsY0FBYyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO0lBQzFELENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBdUI7UUFDakMsR0FBRyxjQUFjO1FBQ2pCLEdBQUcsV0FBVyxFQUFFLGFBQWE7UUFDN0IsY0FBYyxFQUFFLElBQUksQ0FBQyx5Q0FBeUM7S0FDOUQsQ0FBQztJQUVGLE1BQU0sbUJBQW1CLENBQUMsK0JBQStCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMscURBQXFEO0lBRXRJLElBQUksTUFBdUYsQ0FBQztJQUM1RixJQUFJLFdBQVcsRUFBRSxVQUFVLEVBQUUsQ0FBQztRQUM3QixNQUFNLEdBQUcsWUFBWSxDQUFDO0lBQ3ZCLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxHQUFHLGtCQUFrQixDQUFDO0lBQzdCLENBQUM7SUFFRCxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsc0JBQXNCLENBQUM7SUFDOUksSUFBSSxDQUFDLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxNQUFNLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakcsTUFBTSxHQUFHLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsaUVBQWlFO1FBQy9ILE9BQU8sR0FBRyxFQUFFLEdBQUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsTUFBTSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDeEUsQ0FBQyJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatSessionStatus;
(function (ChatSessionStatus) {
    ChatSessionStatus[ChatSessionStatus["Failed"] = 0] = "Failed";
    ChatSessionStatus[ChatSessionStatus["Completed"] = 1] = "Completed";
    ChatSessionStatus[ChatSessionStatus["InProgress"] = 2] = "InProgress";
    ChatSessionStatus[ChatSessionStatus["NeedsInput"] = 3] = "NeedsInput";
})(ChatSessionStatus || (ChatSessionStatus = {}));
/**
 * The session type used for local agent chat sessions.
 */
export const localChatSessionType = 'local';
export function isSessionInProgressStatus(state) {
    return state === 2 /* ChatSessionStatus.InProgress */ || state === 3 /* ChatSessionStatus.NeedsInput */;
}
export const IChatSessionsService = createDecorator('chatSessionsService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2Vzc2lvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixNQUFNLENBQU4sSUFBa0IsaUJBS2pCO0FBTEQsV0FBa0IsaUJBQWlCO0lBQ2xDLDZEQUFVLENBQUE7SUFDVixtRUFBYSxDQUFBO0lBQ2IscUVBQWMsQ0FBQTtJQUNkLHFFQUFjLENBQUE7QUFDZixDQUFDLEVBTGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFLbEM7QUFpRkQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUM7QUFzSDVDLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUF3QjtJQUNqRSxPQUFPLEtBQUsseUNBQWlDLElBQUksS0FBSyx5Q0FBaUMsQ0FBQztBQUN6RixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDIn0=
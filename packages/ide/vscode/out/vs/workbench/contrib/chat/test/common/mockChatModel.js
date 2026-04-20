/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { ChatAgentLocation } from '../../common/constants.js';
export class MockChatModel extends Disposable {
    constructor(sessionResource) {
        super();
        this.sessionResource = sessionResource;
        this.onDidDispose = this._register(new Emitter()).event;
        this.onDidChange = this._register(new Emitter()).event;
        this.sessionId = '';
        this.timestamp = 0;
        this.timing = { startTime: 0 };
        this.initialLocation = ChatAgentLocation.Chat;
        this.title = '';
        this.hasCustomTitle = false;
        this.requestInProgress = observableValue('requestInProgress', false);
        this.requestNeedsInput = observableValue('requestNeedsInput', undefined);
        this.inputPlaceholder = undefined;
        this.editingSession = undefined;
        this.checkpoint = undefined;
        this.willKeepAlive = true;
        this.inputModel = {
            state: observableValue('inputModelState', undefined),
            setState: () => { },
            clearState: () => { },
            toJSON: () => undefined
        };
        this.contributedChatSession = undefined;
        this.isDisposed = false;
        this.hasRequests = false;
        this.lastRequest = undefined;
        this.lastRequestObs = observableValue('lastRequest', undefined);
    }
    dispose() {
        this.isDisposed = true;
        super.dispose();
    }
    startEditingSession(isGlobalEditingSession, transferFromSession) { }
    getRequests() { return []; }
    setCheckpoint(requestId) { }
    toExport() {
        return {
            initialLocation: this.initialLocation,
            requests: [],
            responderUsername: '',
            responderAvatarIconUri: undefined
        };
    }
    toJSON() {
        return {
            version: 3,
            sessionId: this.sessionId,
            creationDate: this.timestamp,
            lastMessageDate: this.timestamp,
            customTitle: undefined,
            initialLocation: this.initialLocation,
            requests: [],
            responderUsername: '',
            responderAvatarIconUri: undefined
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tDaGF0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFOUQsTUFBTSxPQUFPLGFBQWMsU0FBUSxVQUFVO0lBeUI1QyxZQUFxQixlQUFvQjtRQUN4QyxLQUFLLEVBQUUsQ0FBQztRQURZLG9CQUFlLEdBQWYsZUFBZSxDQUFLO1FBeEJoQyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN6RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDcEUsY0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNmLGNBQVMsR0FBRyxDQUFDLENBQUM7UUFDZCxXQUFNLEdBQUcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDMUIsb0JBQWUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7UUFDekMsVUFBSyxHQUFHLEVBQUUsQ0FBQztRQUNYLG1CQUFjLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLHNCQUFpQixHQUFHLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRSxzQkFBaUIsR0FBRyxlQUFlLENBQXlDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVHLHFCQUFnQixHQUFHLFNBQVMsQ0FBQztRQUM3QixtQkFBYyxHQUFHLFNBQVMsQ0FBQztRQUMzQixlQUFVLEdBQUcsU0FBUyxDQUFDO1FBQ3ZCLGtCQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLGVBQVUsR0FBZ0I7WUFDbEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUM7WUFDcEQsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDbkIsVUFBVSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDckIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7U0FDdkIsQ0FBQztRQUNPLDJCQUFzQixHQUFHLFNBQVMsQ0FBQztRQUM1QyxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBU1YsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFKNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxlQUFlLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFLUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxzQkFBZ0MsRUFBRSxtQkFBeUMsSUFBVSxDQUFDO0lBQzFHLFdBQVcsS0FBMEIsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pELGFBQWEsQ0FBQyxTQUE2QixJQUFVLENBQUM7SUFDdEQsUUFBUTtRQUNQLE9BQU87WUFDTixlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7WUFDckMsUUFBUSxFQUFFLEVBQUU7WUFDWixpQkFBaUIsRUFBRSxFQUFFO1lBQ3JCLHNCQUFzQixFQUFFLFNBQVM7U0FDakMsQ0FBQztJQUNILENBQUM7SUFDRCxNQUFNO1FBQ0wsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDO1lBQ1YsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUztZQUM1QixlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDL0IsV0FBVyxFQUFFLFNBQVM7WUFDdEIsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlO1lBQ3JDLFFBQVEsRUFBRSxFQUFFO1lBQ1osaUJBQWlCLEVBQUUsRUFBRTtZQUNyQixzQkFBc0IsRUFBRSxTQUFTO1NBQ2pDLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { observableValue } from '../../../../../base/common/observable.js';
export class MockChatService {
    constructor() {
        this.chatModels = observableValue('chatModels', []);
        this.requestInProgressObs = observableValue('name', false);
        this.edits2Enabled = false;
        this.editingSessions = [];
        this.onDidSubmitRequest = Event.None;
        this.sessions = new ResourceMap();
        this.onDidPerformUserAction = undefined;
        this.onDidDisposeSession = undefined;
    }
    setSaveModelsEnabled(enabled) {
    }
    isEnabled(location) {
        throw new Error('Method not implemented.');
    }
    hasSessions() {
        throw new Error('Method not implemented.');
    }
    getProviderInfos() {
        throw new Error('Method not implemented.');
    }
    startSession(location, options) {
        throw new Error('Method not implemented.');
    }
    addSession(session) {
        this.sessions.set(session.sessionResource, session);
    }
    getSession(sessionResource) {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return this.sessions.get(sessionResource) ?? {};
    }
    async getOrRestoreSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    getPersistedSessionTitle(sessionResource) {
        throw new Error('Method not implemented.');
    }
    loadSessionFromContent(data) {
        throw new Error('Method not implemented.');
    }
    loadSessionForResource(resource, position, token) {
        throw new Error('Method not implemented.');
    }
    getActiveSessionReference(sessionResource) {
        return undefined;
    }
    setTitle(sessionResource, title) {
        throw new Error('Method not implemented.');
    }
    appendProgress(request, progress) {
    }
    /**
     * Returns whether the request was accepted.
     */
    sendRequest(sessionResource, message) {
        throw new Error('Method not implemented.');
    }
    resendRequest(request, options) {
        throw new Error('Method not implemented.');
    }
    adoptRequest(sessionResource, request) {
        throw new Error('Method not implemented.');
    }
    removeRequest(sessionResource, requestId) {
        throw new Error('Method not implemented.');
    }
    cancelCurrentRequestForSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    addCompleteRequest(sessionResource, message, variableData, attempt, response) {
        throw new Error('Method not implemented.');
    }
    async getLocalSessionHistory() {
        throw new Error('Method not implemented.');
    }
    async clearAllHistoryEntries() {
        throw new Error('Method not implemented.');
    }
    async removeHistoryEntry(resource) {
        throw new Error('Method not implemented.');
    }
    notifyUserAction(event) {
        throw new Error('Method not implemented.');
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        throw new Error('Method not implemented.');
    }
    setChatSessionTitle(sessionResource, title) {
        throw new Error('Method not implemented.');
    }
    isEditingLocation(location) {
        throw new Error('Method not implemented.');
    }
    getChatStorageFolder() {
        throw new Error('Method not implemented.');
    }
    logChatIndex() {
        throw new Error('Method not implemented.');
    }
    isPersistedSessionEmpty(sessionResource) {
        throw new Error('Method not implemented.');
    }
    activateDefaultAgent(location) {
        throw new Error('Method not implemented.');
    }
    getChatSessionFromInternalUri(sessionResource) {
        throw new Error('Method not implemented.');
    }
    async getLiveSessionItems() {
        throw new Error('Method not implemented.');
    }
    getHistorySessionItems() {
        throw new Error('Method not implemented.');
    }
    waitForModelDisposals() {
        throw new Error('Method not implemented.');
    }
    getMetadataForSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja0NoYXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBT3hGLE1BQU0sT0FBTyxlQUFlO0lBQTVCO1FBQ0MsZUFBVSxHQUFzQyxlQUFlLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLHlCQUFvQixHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsa0JBQWEsR0FBWSxLQUFLLENBQUM7UUFFL0Isb0JBQWUsR0FBRyxFQUFFLENBQUM7UUFFWix1QkFBa0IsR0FBaUQsS0FBSyxDQUFDLElBQUksQ0FBQztRQUUvRSxhQUFRLEdBQUcsSUFBSSxXQUFXLEVBQWMsQ0FBQztRQTRFeEMsMkJBQXNCLEdBQWdDLFNBQVUsQ0FBQztRQUlqRSx3QkFBbUIsR0FBeUQsU0FBVSxDQUFDO0lBK0NqRyxDQUFDO0lBN0hBLG9CQUFvQixDQUFDLE9BQWdCO0lBRXJDLENBQUM7SUFDRCxTQUFTLENBQUMsUUFBMkI7UUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxXQUFXO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxnQkFBZ0I7UUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJ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
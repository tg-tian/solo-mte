/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { LocalAgentsSessionsProvider } from '../../browser/agentSessions/localAgentSessionsProvider.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
import { MockChatSessionsService } from '../common/mockChatSessionsService.js';
class MockChatService {
    constructor() {
        this._chatModels = observableValue('chatModels', []);
        this.chatModels = this._chatModels;
        this.requestInProgressObs = observableValue('name', false);
        this.edits2Enabled = false;
        this.editingSessions = [];
        this.transferredSessionData = undefined;
        this.onDidSubmitRequest = Event.None;
        this.sessions = new Map();
        this.liveSessionItems = [];
        this.historySessionItems = [];
        this._onDidDisposeSession = new Emitter();
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this.onDidPerformUserAction = Event.None;
    }
    fireDidDisposeSession(sessionResource) {
        this._onDidDisposeSession.fire({ sessionResource, reason: 'cleared' });
    }
    setSaveModelsEnabled(enabled) {
    }
    setLiveSessionItems(items) {
        this.liveSessionItems = items;
    }
    setHistorySessionItems(items) {
        this.historySessionItems = items;
    }
    addSession(sessionResource, session) {
        this.sessions.set(sessionResource.toString(), session);
        // Update the chatModels observable
        this._chatModels.set([...this.sessions.values()], undefined);
    }
    removeSession(sessionResource) {
        this.sessions.delete(sessionResource.toString());
        // Update the chatModels observable
        this._chatModels.set([...this.sessions.values()], undefined);
    }
    isEnabled(_location) {
        return true;
    }
    hasSessions() {
        return this.sessions.size > 0;
    }
    getProviderInfos() {
        return [];
    }
    startSession(_location, _options) {
        throw new Error('Method not implemented.');
    }
    getSession(sessionResource) {
        return this.sessions.get(sessionResource.toString());
    }
    getOrRestoreSession(_sessionResource) {
        throw new Error('Method not implemented.');
    }
    getPersistedSessionTitle(_sessionResource) {
        return undefined;
    }
    loadSessionFromContent(_data) {
        throw new Error('Method not implemented.');
    }
    loadSessionForResource(_resource, _position, _token) {
        throw new Error('Method not implemented.');
    }
    getActiveSessionReference(_sessionResource) {
        return undefined;
    }
    setTitle(_sessionResource, _title) { }
    appendProgress(_request, _progress) { }
    sendRequest(_sessionResource, _message) {
        throw new Error('Method not implemented.');
    }
    resendRequest(_request, _options) {
        throw new Error('Method not implemented.');
    }
    adoptRequest(_sessionResource, _request) {
        throw new Error('Method not implemented.');
    }
    removeRequest(_sessionResource, _requestId) {
        throw new Error('Method not implemented.');
    }
    cancelCurrentRequestForSession(_sessionResource) { }
    addCompleteRequest() { }
    async getLocalSessionHistory() {
        return this.historySessionItems;
    }
    async clearAllHistoryEntries() { }
    async removeHistoryEntry(_resource) { }
    notifyUserAction(_event) { }
    transferChatSession() { }
    setChatSessionTitle() { }
    isEditingLocation(_location) {
        return false;
    }
    getChatStorageFolder() {
        return URI.file('/tmp');
    }
    logChatIndex() { }
    isPersistedSessionEmpty(_sessionResource) {
        return false;
    }
    activateDefaultAgent(_location) {
        return Promise.resolve();
    }
    getChatSessionFromInternalUri(_sessionResource) {
        return undefined;
    }
    async getLiveSessionItems() {
        return this.liveSessionItems;
    }
    async getHistorySessionItems() {
        return this.historySessionItems;
    }
    waitForModelDisposals() {
        return Promise.resolve();
    }
    getMetadataForSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
}
function createMockChatModel(options) {
    const requests = [];
    if (options.hasRequests !== false) {
        const mockResponse = {
            isComplete: options.lastResponseComplete ?? true,
            isCanceled: options.lastResponseCanceled ?? false,
            result: options.lastResponseHasError ? { errorDetails: { message: 'error' } } : undefined,
            timestamp: options.lastResponseTimestamp ?? Date.now(),
            completedAt: options.lastResponseCompletedAt,
            response: {
                value: [],
                getMarkdown: () => '',
                toString: () => options.customTitle ? '' : 'Test response content'
            }
        };
        requests.push({
            id: 'request-1',
            response: mockResponse
        });
    }
    const editingSessionEntries = options.editingSession?.entries.map(entry => ({
        state: observableValue('state', entry.state),
        linesAdded: observableValue('linesAdded', entry.linesAdded),
        linesRemoved: observableValue('linesRemoved', entry.linesRemoved),
        modifiedURI: entry.modifiedURI
    }));
    const mockEditingSession = options.editingSession ? {
        entries: observableValue('entries', editingSessionEntries ?? [])
    } : undefined;
    const _onDidChange = new Emitter();
    return {
        sessionResource: options.sessionResource,
        hasRequests: options.hasRequests !== false,
        timestamp: options.timestamp ?? Date.now(),
        requestInProgress: observableValue('requestInProgress', options.requestInProgress ?? false),
        getRequests: () => requests,
        onDidChange: _onDidChange.event,
        editingSession: mockEditingSession,
        setCustomTitle: (_title) => {
            _onDidChange.fire({ kind: 'setCustomTitle' });
        }
    };
}
suite('LocalAgentsSessionsProvider', () => {
    const disposables = new DisposableStore();
    let mockChatService;
    let mockChatSessionsService;
    let instantiationService;
    setup(() => {
        mockChatService = new MockChatService();
        mockChatSessionsService = new MockChatSessionsService();
        instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
        instantiationService.stub(IChatService, mockChatService);
        instantiationService.stub(IChatSessionsService, mockChatSessionsService);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createProvider() {
        return disposables.add(instantiationService.createInstance(LocalAgentsSessionsProvider));
    }
    test('should have correct session type', () => {
        const provider = createProvider();
        assert.strictEqual(provider.chatSessionType, localChatSessionType);
    });
    test('should register itself with chat sessions service', () => {
        const provider = createProvider();
        const providers = mockChatSessionsService.getAllChatSessionItemProviders();
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0], provider);
    });
    test('should provide empty sessions when no live or history sessions', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = createProvider();
            mockChatService.setLiveSessionItems([]);
            mockChatService.setHistorySessionItems([]);
            const sessions = await provider.provideChatSessionItems(CancellationToken.None);
            assert.strictEqual(sessions.length, 0);
        });
    });
    test('should provide live session items', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = createProvider();
            const sessionResource = LocalChatSessionUri.forSession('test-session');
            const mockModel = createMockChatModel({
                sessionResource,
                hasRequests: true,
                timestamp: Date.now()
            });
            mockChatService.addSession(sessionResource, mockModel);
            mockChatService.setLiveSessionItems([{
                    sessionResource,
                    title: 'Test Session',
                    lastMessageDate: Date.now(),
                    isActive: true,
                    timing: { startTime: 0, endTime: 1 },
                    lastResponseState: 1 /* ResponseModelState.Complete */
                }]);
            const sessions = await provider.provideChatSessionItems(CancellationToken.None);
            assert.strictEqual(sessions.length, 1);
            assert.strictEqual(sessions[0].label, 'Test Session');
            assert.strictEqual(sessions[0].resource.toString(), sessionResource.toString());
        });
    });
    test('should provide history session items', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = createProvider();
            const sessionResource = LocalChatSessionUri.forSession('history-session');
            mockChatService.setLiveSessionItems([]);
            mockChatService.setHistorySessionItems([{
                    sessionResource,
                    title: 'History Session',
                    lastMessageDate: Date.now() - 10000,
                    isActive: false,
                    lastResponseState: 1 /* ResponseModelState.Complete */,
                    timing: { startTime: 0, endTime: 1 }
                }]);
            const sessions = await provider.provideChatSessionItems(CancellationToken.None);
            assert.strictEqual(sessions.length, 1);
            assert.strictEqual(sessions[0].label, 'History Session');
        });
    });
    test('should not duplicate sessions in history and live', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = createProvider();
            const sessionResource = LocalChatSessionUri.forSession('duplicate-session');
            const mockModel = createMockChatModel({
                sessionResource,
                hasRequests: true
            });
            mockChatService.addSession(sessionResource, mockModel);
            mockChatService.setLiveSessionItems([{
                    sessionResource,
                    title: 'Live Session',
                    lastMessageDate: Date.now(),
                    isActive: true,
                    lastResponseState: 1 /* ResponseModelState.Complete */,
                    timing: { startTime: 0, endTime: 1 }
                }]);
            mockChatService.setHistorySessionItems([{
                    sessionResource,
                    title: 'History Session',
                    lastMessageDate: Date.now() - 10000,
                    isActive: false,
                    lastResponseState: 1 /* ResponseModelState.Complete */,
                    timing: { startTime: 0, endTime: 1 }
                }]);
            const sessions = await provider.provideChatSessionItems(CancellationToken.None);
            assert.strictEqual(sessions.length, 1);
            assert.strictEqual(sessions[0].label, 'Live Session');
        });
    });
    suite('Session Status', () => {
        test('should return InProgress status when request in progress', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('in-progress-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    requestInProgress: true
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'In Progress Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].status, 2 /* ChatSessionStatus.InProgress */);
            });
        });
        test('should return Completed status when last response is complete', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('completed-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    requestInProgress: false,
                    lastResponseComplete: true,
                    lastResponseCanceled: false,
                    lastResponseHasError: false
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'Completed Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 },
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].status, 1 /* ChatSessionStatus.Completed */);
            });
        });
        test('should return Success status when last response was canceled', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('canceled-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    requestInProgress: false,
                    lastResponseComplete: false,
                    lastResponseCanceled: true
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'Canceled Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 },
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].status, 1 /* ChatSessionStatus.Completed */);
            });
        });
        test('should return Failed status when last response has error', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('error-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    requestInProgress: false,
                    lastResponseComplete: true,
                    lastResponseHasError: true
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'Error Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 },
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].status, 0 /* ChatSessionStatus.Failed */);
            });
        });
    });
    suite('Session Statistics', () => {
        test('should return statistics for sessions with modified entries', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('stats-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    editingSession: {
                        entries: [
                            {
                                state: 0 /* ModifiedFileEntryState.Modified */,
                                linesAdded: 10,
                                linesRemoved: 5,
                                modifiedURI: URI.file('/test/file1.ts')
                            },
                            {
                                state: 0 /* ModifiedFileEntryState.Modified */,
                                linesAdded: 20,
                                linesRemoved: 3,
                                modifiedURI: URI.file('/test/file2.ts')
                            }
                        ]
                    }
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'Stats Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 },
                        stats: {
                            added: 30,
                            removed: 8,
                            fileCount: 2
                        }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.ok(sessions[0].changes);
                const changes = sessions[0].changes;
                assert.strictEqual(changes.files, 2);
                assert.strictEqual(changes.insertions, 30);
                assert.strictEqual(changes.deletions, 8);
            });
        });
        test('should not return statistics for sessions without modified entries', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('no-stats-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    editingSession: {
                        entries: [
                            {
                                state: 1 /* ModifiedFileEntryState.Accepted */,
                                linesAdded: 10,
                                linesRemoved: 5,
                                modifiedURI: URI.file('/test/file1.ts')
                            }
                        ]
                    }
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'No Stats Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].changes, undefined);
            });
        });
    });
    suite('Session Timing', () => {
        test('should use model timestamp for startTime when model exists', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('timing-session');
                const modelTimestamp = Date.now() - 5000;
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    timestamp: modelTimestamp
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'Timing Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: modelTimestamp }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].timing.startTime, modelTimestamp);
            });
        });
        test('should use lastMessageDate for startTime when model does not exist', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('history-timing');
                const lastMessageDate = Date.now() - 10000;
                mockChatService.setLiveSessionItems([]);
                mockChatService.setHistorySessionItems([{
                        sessionResource,
                        title: 'History Timing Session',
                        lastMessageDate,
                        isActive: false,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: lastMessageDate }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].timing.startTime, lastMessageDate);
            });
        });
        test('should set endTime from last response completedAt', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('endtime-session');
                const completedAt = Date.now() - 1000;
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    lastResponseComplete: true,
                    lastResponseCompletedAt: completedAt
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'EndTime Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: completedAt }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].timing.endTime, completedAt);
            });
        });
    });
    suite('Session Icon', () => {
        test('should use Codicon.chatSparkle as icon', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('icon-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true
                });
                mockChatService.addSession(sessionResource, mockModel);
                mockChatService.setLiveSessionItems([{
                        sessionResource,
                        title: 'Icon Session',
                        lastMessageDate: Date.now(),
                        isActive: true,
                        lastResponseState: 1 /* ResponseModelState.Complete */,
                        timing: { startTime: 0, endTime: 1 }
                    }]);
                const sessions = await provider.provideChatSessionItems(CancellationToken.None);
                assert.strictEqual(sessions.length, 1);
                assert.strictEqual(sessions[0].iconPath, Codicon.chatSparkle);
            });
        });
    });
    suite('Events', () => {
        test('should fire onDidChangeChatSessionItems when model progress changes', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('progress-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    requestInProgress: true
                });
                // Add the session first
                mockChatService.addSession(sessionResource, mockModel);
                let changeEventCount = 0;
                disposables.add(provider.onDidChangeChatSessionItems(() => {
                    changeEventCount++;
                }));
                // Simulate progress change by triggering the progress listener
                mockChatSessionsService.triggerProgressEvent();
                assert.strictEqual(changeEventCount, 1);
            });
        });
        test('should fire onDidChangeChatSessionItems when model request status changes', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('status-change-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true,
                    requestInProgress: false
                });
                // Add the session first
                mockChatService.addSession(sessionResource, mockModel);
                let changeEventCount = 0;
                disposables.add(provider.onDidChangeChatSessionItems(() => {
                    changeEventCount++;
                }));
                // Simulate progress change by triggering the progress listener
                mockChatSessionsService.triggerProgressEvent();
                assert.strictEqual(changeEventCount, 1);
            });
        });
        test('should clean up model listeners when model is removed via chatModels observable', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                const sessionResource = LocalChatSessionUri.forSession('cleanup-session');
                const mockModel = createMockChatModel({
                    sessionResource,
                    hasRequests: true
                });
                // Add the session first
                mockChatService.addSession(sessionResource, mockModel);
                // Now remove the session - the observable should trigger cleanup
                mockChatService.removeSession(sessionResource);
                // Verify the listener was cleaned up by triggering a title change
                // The onDidChangeChatSessionItems from registerModelListeners cleanup should fire once
                // but after that, title changes should NOT fire onDidChangeChatSessionItems
                let changeEventCount = 0;
                disposables.add(provider.onDidChangeChatSessionItems(() => {
                    changeEventCount++;
                }));
                mockModel.setCustomTitle('New Title');
                assert.strictEqual(changeEventCount, 0, 'onDidChangeChatSessionItems should NOT fire after model is removed');
            });
        });
        test('should fire onDidChange when session items change for local type', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                let changeEventFired = false;
                disposables.add(provider.onDidChange(() => {
                    changeEventFired = true;
                }));
                mockChatSessionsService.notifySessionItemsChanged(localChatSessionType);
                assert.strictEqual(changeEventFired, true);
            });
        });
        test('should not fire onDidChange when session items change for other types', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = createProvider();
                let changeEventFired = false;
                disposables.add(provider.onDidChange(() => {
                    changeEventFired = true;
                }));
                mockChatSessionsService.notifySessionItemsChanged('other-type');
                assert.strictEqual(changeEventFired, false);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxBZ2VudFNlc3Npb25zUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9sb2NhbEFnZW50U2Vzc2lvbnNQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUF1QixlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFHeEcsT0FBTyxFQUFlLFlBQVksRUFBZ0QsTUFBTSw2QkFBNkIsQ0FBQztBQUN0SCxPQUFPLEVBQXFCLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NB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
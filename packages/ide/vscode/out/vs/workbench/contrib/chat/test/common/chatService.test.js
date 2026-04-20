/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { constObservable, observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { IExtensionService, nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { InMemoryTestFileService, mock, TestContextService, TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IMcpService } from '../../../mcp/common/mcpTypes.js';
import { TestMcpService } from '../../../mcp/test/common/testMcpService.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatService } from '../../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { MockChatService } from './mockChatService.js';
import { MockChatVariablesService } from './mockChatVariables.js';
const chatAgentWithUsedContextId = 'ChatProviderWithUsedContext';
const chatAgentWithUsedContext = {
    id: chatAgentWithUsedContextId,
    name: chatAgentWithUsedContextId,
    extensionId: nullExtensionDescription.identifier,
    extensionVersion: undefined,
    publisherDisplayName: '',
    extensionPublisherId: '',
    extensionDisplayName: '',
    locations: [ChatAgentLocation.Chat],
    modes: [ChatModeKind.Ask],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
    async invoke(request, progress, history, token) {
        progress([{
                documents: [
                    {
                        uri: URI.file('/test/path/to/file'),
                        version: 3,
                        ranges: [
                            new Range(1, 1, 2, 2)
                        ]
                    }
                ],
                kind: 'usedContext'
            }]);
        return { metadata: { metadataKey: 'value' } };
    },
    async provideFollowups(sessionId, token) {
        return [{ kind: 'reply', message: 'Something else', agentId: '', tooltip: 'a tooltip' }];
    },
};
const chatAgentWithMarkdownId = 'ChatProviderWithMarkdown';
const chatAgentWithMarkdown = {
    id: chatAgentWithMarkdownId,
    name: chatAgentWithMarkdownId,
    extensionId: nullExtensionDescription.identifier,
    extensionVersion: undefined,
    publisherDisplayName: '',
    extensionPublisherId: '',
    extensionDisplayName: '',
    locations: [ChatAgentLocation.Chat],
    modes: [ChatModeKind.Ask],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
    async invoke(request, progress, history, token) {
        progress([{ kind: 'markdownContent', content: new MarkdownString('test') }]);
        return { metadata: { metadataKey: 'value' } };
    },
    async provideFollowups(sessionId, token) {
        return [];
    },
};
function getAgentData(id) {
    return {
        name: id,
        id: id,
        extensionId: nullExtensionDescription.identifier,
        extensionVersion: undefined,
        extensionPublisherId: '',
        publisherDisplayName: '',
        extensionDisplayName: '',
        locations: [ChatAgentLocation.Chat],
        modes: [ChatModeKind.Ask],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
}
suite('ChatService', () => {
    const testDisposables = new DisposableStore();
    let instantiationService;
    let testFileService;
    let chatAgentService;
    const testServices = [];
    /**
     * Ensure we wait for model disposals from all created ChatServices
     */
    function createChatService() {
        const service = testDisposables.add(instantiationService.createInstance(ChatService));
        testServices.push(service);
        return service;
    }
    function startSessionModel(service, location = ChatAgentLocation.Chat) {
        const ref = testDisposables.add(service.startSession(location));
        return ref;
    }
    async function getOrRestoreModel(service, resource) {
        const ref = await service.getOrRestoreSession(resource);
        if (!ref) {
            return undefined;
        }
        return testDisposables.add(ref).object;
    }
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService(new ServiceCollection([IChatVariablesService, new MockChatVariablesService()], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()], [IMcpService, new TestMcpService()])));
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IViewsService, new TestExtensionService());
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IChatSlashCommandService, testDisposables.add(instantiationService.createInstance(ChatSlashCommandService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IChatService, new MockChatService());
        instantiationService.stub(IEnvironmentService, { workspaceStorageHome: URI.file('/test/path/to/workspaceStorage') });
        instantiationService.stub(ILifecycleService, { onWillShutdown: Event.None });
        instantiationService.stub(IChatEditingService, new class extends mock() {
            startOrContinueGlobalEditingSession() {
                return {
                    state: constObservable('idle'),
                    requestDisablement: observableValue('requestDisablement', []),
                    entries: constObservable([]),
                    dispose: () => { }
                };
            }
        });
        // Configure test file service with tracking and in-memory storage
        testFileService = testDisposables.add(new InMemoryTestFileService());
        instantiationService.stub(IFileService, testFileService);
        chatAgentService = testDisposables.add(instantiationService.createInstance(ChatAgentService));
        instantiationService.stub(IChatAgentService, chatAgentService);
        const agent = {
            async invoke(request, progress, history, token) {
                return {};
            },
        };
        testDisposables.add(chatAgentService.registerAgent('testAgent', { ...getAgentData('testAgent'), isDefault: true }));
        testDisposables.add(chatAgentService.registerAgent(chatAgentWithUsedContextId, getAgentData(chatAgentWithUsedContextId)));
        testDisposables.add(chatAgentService.registerAgent(chatAgentWithMarkdownId, getAgentData(chatAgentWithMarkdownId)));
        testDisposables.add(chatAgentService.registerAgentImplementation('testAgent', agent));
        chatAgentService.updateAgent('testAgent', {});
    });
    teardown(async () => {
        testDisposables.clear();
        await Promise.all(testServices.map(s => s.waitForModelDisposals()));
        testServices.length = 0;
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('retrieveSession', async () => {
        const testService = createChatService();
        // Don't add refs to testDisposables so we can control disposal
        const session1Ref = testService.startSession(ChatAgentLocation.Chat);
        const session1 = session1Ref.object;
        session1.addRequest({ parts: [], text: 'request 1' }, { variables: [] }, 0);
        const session2Ref = testService.startSession(ChatAgentLocation.Chat);
        const session2 = session2Ref.object;
        session2.addRequest({ parts: [], text: 'request 2' }, { variables: [] }, 0);
        // Dispose refs to trigger persistence to file service
        session1Ref.dispose();
        session2Ref.dispose();
        // Wait for async persistence to complete
        await testService.waitForModelDisposals();
        // Verify that sessions were written to the file service
        assert.strictEqual(testFileService.writeOperations.length, 2, 'Should have written 2 sessions to file service');
        const session1WriteOp = testFileService.writeOperations.find((op) => op.content.includes('request 1'));
        const session2WriteOp = testFileService.writeOperations.find((op) => op.content.includes('request 2'));
        assert.ok(session1WriteOp, 'Session 1 should have been written to file service');
        assert.ok(session2WriteOp, 'Session 2 should have been written to file service');
        // Create a new service instance to simulate app restart
        const testService2 = createChatService();
        // Retrieve sessions and verify they're loaded from file service
        const retrieved1 = await getOrRestoreModel(testService2, session1.sessionResource);
        const retrieved2 = await getOrRestoreModel(testService2, session2.sessionResource);
        assert.ok(retrieved1, 'Should retrieve session 1');
        assert.ok(retrieved2, 'Should retrieve session 2');
        assert.deepStrictEqual(retrieved1.getRequests()[0]?.message.text, 'request 1');
        assert.deepStrictEqual(retrieved2.getRequests()[0]?.message.text, 'request 2');
    });
    test('addCompleteRequest', async () => {
        const testService = createChatService();
        const modelRef = testDisposables.add(startSessionModel(testService));
        const model = modelRef.object;
        assert.strictEqual(model.getRequests().length, 0);
        await testService.addCompleteRequest(model.sessionResource, 'test request', undefined, 0, { message: 'test response' });
        assert.strictEqual(model.getRequests().length, 1);
        assert.ok(model.getRequests()[0].response);
        assert.strictEqual(model.getRequests()[0].response?.response.toString(), 'test response');
    });
    test('sendRequest fails', async () => {
        const testService = createChatService();
        const modelRef = testDisposables.add(startSessionModel(testService));
        const model = modelRef.object;
        const response = await testService.sendRequest(model.sessionResource, `@${chatAgentWithUsedContextId} test request`);
        assert(response);
        await response.responseCompletePromise;
        await assertSnapshot(toSnapshotExportData(model));
    });
    test('history', async () => {
        const historyLengthAgent = {
            async invoke(request, progress, history, token) {
                return {
                    metadata: { historyLength: history.length }
                };
            },
        };
        testDisposables.add(chatAgentService.registerAgent('defaultAgent', { ...getAgentData('defaultAgent'), isDefault: true }));
        testDisposables.add(chatAgentService.registerAgent('agent2', getAgentData('agent2')));
        testDisposables.add(chatAgentService.registerAgentImplementation('defaultAgent', historyLengthAgent));
        testDisposables.add(chatAgentService.registerAgentImplementation('agent2', historyLengthAgent));
        const testService = createChatService();
        const modelRef = testDisposables.add(startSessionModel(testService));
        const model = modelRef.object;
        // Send a request to default agent
        const response = await testService.sendRequest(model.sessionResource, `test request`, { agentId: 'defaultAgent' });
        assert(response);
        await response.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 1);
        assert.strictEqual(model.getRequests()[0].response?.result?.metadata?.historyLength, 0);
        // Send a request to agent2- it can't see the default agent's message
        const response2 = await testService.sendRequest(model.sessionResource, `test request`, { agentId: 'agent2' });
        assert(response2);
        await response2.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 2);
        assert.strictEqual(model.getRequests()[1].response?.result?.metadata?.historyLength, 0);
        // Send a request to defaultAgent - the default agent can see agent2's message
        const response3 = await testService.sendRequest(model.sessionResource, `test request`, { agentId: 'defaultAgent' });
        assert(response3);
        await response3.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 3);
        assert.strictEqual(model.getRequests()[2].response?.result?.metadata?.historyLength, 2);
    });
    test('can serialize', async () => {
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithUsedContextId, chatAgentWithUsedContext));
        chatAgentService.updateAgent(chatAgentWithUsedContextId, {});
        const testService = createChatService();
        const modelRef = testDisposables.add(startSessionModel(testService));
        const model = modelRef.object;
        assert.strictEqual(model.getRequests().length, 0);
        await assertSnapshot(toSnapshotExportData(model));
        const response = await testService.sendRequest(model.sessionResource, `@${chatAgentWithUsedContextId} test request`);
        assert(response);
        await response.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 1);
        const response2 = await testService.sendRequest(model.sessionResource, `test request 2`);
        assert(response2);
        await response2.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 2);
        await assertSnapshot(toSnapshotExportData(model));
    });
    test('can deserialize', async () => {
        let serializedChatData;
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithUsedContextId, chatAgentWithUsedContext));
        // create the first service, send request, get response, and serialize the state
        { // serapate block to not leak variables in outer scope
            const testService = createChatService();
            const chatModel1Ref = testDisposables.add(startSessionModel(testService));
            const chatModel1 = chatModel1Ref.object;
            assert.strictEqual(chatModel1.getRequests().length, 0);
            const response = await testService.sendRequest(chatModel1.sessionResource, `@${chatAgentWithUsedContextId} test request`);
            assert(response);
            await response.responseCompletePromise;
            serializedChatData = JSON.parse(JSON.stringify(chatModel1));
        }
        // try deserializing the state into a new service
        const testService2 = createChatService();
        const chatModel2Ref = testService2.loadSessionFromContent(serializedChatData);
        assert(chatModel2Ref);
        testDisposables.add(chatModel2Ref);
        const chatModel2 = chatModel2Ref.object;
        await assertSnapshot(toSnapshotExportData(chatModel2));
    });
    test('can deserialize with response', async () => {
        let serializedChatData;
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithMarkdownId, chatAgentWithMarkdown));
        {
            const testService = createChatService();
            const chatModel1Ref = testDisposables.add(startSessionModel(testService));
            const chatModel1 = chatModel1Ref.object;
            assert.strictEqual(chatModel1.getRequests().length, 0);
            const response = await testService.sendRequest(chatModel1.sessionResource, `@${chatAgentWithUsedContextId} test request`);
            assert(response);
            await response.responseCompletePromise;
            serializedChatData = JSON.parse(JSON.stringify(chatModel1));
        }
        // try deserializing the state into a new service
        const testService2 = createChatService();
        const chatModel2Ref = testService2.loadSessionFromContent(serializedChatData);
        assert(chatModel2Ref);
        testDisposables.add(chatModel2Ref);
        const chatModel2 = chatModel2Ref.object;
        await assertSnapshot(toSnapshotExportData(chatModel2));
    });
    test('onDidDisposeSession', async () => {
        const testService = createChatService();
        const modelRef = testService.startSession(ChatAgentLocation.Chat);
        const model = modelRef.object;
        let disposed = false;
        testDisposables.add(testService.onDidDisposeSession(e => {
            for (const resource of e.sessionResource) {
                if (resource.toString() === model.sessionResource.toString()) {
                    disposed = true;
                }
            }
        }));
        modelRef.dispose();
        await testService.waitForModelDisposals();
        assert.strictEqual(disposed, true);
    });
});
function toSnapshotExportData(model) {
    const exp = model.toExport();
    return {
        ...exp,
        requests: exp.requests.map(r => {
            return {
                ...r,
                modelState: {
                    ...r.modelState,
                    completedAt: undefined
                },
                timestamp: undefined,
                requestId: undefined, // id contains a random part
                responseId: undefined, // id contains a random part
            };
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2NoYXRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxD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
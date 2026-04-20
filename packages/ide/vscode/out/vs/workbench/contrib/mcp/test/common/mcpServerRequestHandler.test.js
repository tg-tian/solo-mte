/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestLoggerService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpServerRequestHandler, McpTask } from '../../common/mcpServerRequestHandler.js';
import { MCP } from '../../common/modelContextProtocol.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { McpTaskManager } from '../../common/mcpTaskManager.js';
import { upcastPartial } from '../../../../../base/test/common/mock.js';
class TestMcpHostDelegate extends Disposable {
    constructor() {
        super();
        this.priority = 0;
        this._transport = this._register(new TestMcpMessageTransport());
    }
    substituteVariables(serverDefinition, launch) {
        return Promise.resolve(launch);
    }
    canStart() {
        return true;
    }
    start() {
        return this._transport;
    }
    getTransport() {
        return this._transport;
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
suite('Workbench - MCP - ServerRequestHandler', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let delegate;
    let transport;
    let handler;
    let cts;
    setup(async () => {
        delegate = store.add(new TestMcpHostDelegate());
        transport = delegate.getTransport();
        cts = store.add(new CancellationTokenSource());
        // Setup test services
        const services = new ServiceCollection([ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IStorageService, store.add(new TestStorageService())], [IProductService, TestProductService]);
        instantiationService = store.add(new TestInstantiationService(services));
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        // Manually create the handler since we need the transport already set up
        const logger = store.add(instantiationService.get(ILoggerService)
            .createLogger('mcpServerTest', { hidden: true, name: 'MCP Test' }));
        // Start the handler creation
        const handlerPromise = McpServerRequestHandler.create(instantiationService, { logger, launch: transport, taskManager: store.add(new McpTaskManager()) }, cts.token);
        handler = await handlerPromise;
        store.add(handler);
    });
    test('should send and receive JSON-RPC requests', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Get the sent message and verify it
        const sentMessages = transport.getSentMessages();
        assert.strictEqual(sentMessages.length, 3); // initialize + listResources
        // Verify listResources request format
        const listResourcesRequest = sentMessages[2];
        assert.strictEqual(listResourcesRequest.method, 'resources/list');
        assert.strictEqual(listResourcesRequest.jsonrpc, MCP.JSONRPC_VERSION);
        assert.ok(typeof listResourcesRequest.id === 'number');
        // Simulate server response with mock resources that match the expected Resource interface
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: listResourcesRequest.id,
            result: {
                resources: [
                    { uri: 'resource1', type: 'text/plain', name: 'Test Resource 1' },
                    { uri: 'resource2', type: 'text/plain', name: 'Test Resource 2' }
                ]
            }
        });
        // Verify the result
        const resources = await requestPromise;
        assert.strictEqual(resources.length, 2);
        assert.strictEqual(resources[0].uri, 'resource1');
        assert.strictEqual(resources[1].name, 'Test Resource 2');
    });
    test('should handle paginated requests', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Get the first request and respond with pagination
        const sentMessages = transport.getSentMessages();
        const listResourcesRequest = sentMessages[2];
        // Send first page with nextCursor
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: listResourcesRequest.id,
            result: {
                resources: [
                    { uri: 'resource1', type: 'text/plain', name: 'Test Resource 1' }
                ],
                nextCursor: 'page2'
            }
        });
        // Clear the sent messages to only capture the next page request
        transport.clearSentMessages();
        // Wait a bit to allow the handler to process and send the next request
        await new Promise(resolve => setTimeout(resolve, 0));
        // Get the second request and verify cursor is included
        const sentMessages2 = transport.getSentMessages();
        assert.strictEqual(sentMessages2.length, 1);
        const listResourcesRequest2 = sentMessages2[0];
        assert.strictEqual(listResourcesRequest2.method, 'resources/list');
        assert.deepStrictEqual(listResourcesRequest2.params, { cursor: 'page2' });
        // Send final page with no nextCursor
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: listResourcesRequest2.id,
            result: {
                resources: [
                    { uri: 'resource2', type: 'text/plain', name: 'Test Resource 2' }
                ]
            }
        });
        // Verify the combined result
        const resources = await requestPromise;
        assert.strictEqual(resources.length, 2);
        assert.strictEqual(resources[0].uri, 'resource1');
        assert.strictEqual(resources[1].uri, 'resource2');
    });
    test('should handle error responses', async () => {
        // Setup request
        const requestPromise = handler.readResource({ uri: 'non-existent' });
        // Get the sent message
        const sentMessages = transport.getSentMessages();
        const readResourceRequest = sentMessages[2]; // [0] is initialize
        // Simulate error response
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: readResourceRequest.id,
            error: {
                code: MCP.METHOD_NOT_FOUND,
                message: 'Resource not found'
            }
        });
        // Verify the error is thrown correctly
        try {
            await requestPromise;
            assert.fail('Expected error was not thrown');
        }
        catch (e) {
            assert.strictEqual(e.message, 'MPC -32601: Resource not found');
            assert.strictEqual(e.code, MCP.METHOD_NOT_FOUND);
        }
    });
    test('should handle server requests', async () => {
        // Simulate ping request from server
        const pingRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 100,
            method: 'ping'
        };
        transport.simulateReceiveMessage(pingRequest);
        // The handler should have sent a response
        const sentMessages = transport.getSentMessages();
        const pingResponse = sentMessages.find(m => 'id' in m && m.id === pingRequest.id && 'result' in m);
        assert.ok(pingResponse, 'No ping response was sent');
        assert.deepStrictEqual(pingResponse.result, {});
    });
    test('should handle roots list requests', async () => {
        // Set roots
        handler.roots = [
            { uri: 'file:///test/root1', name: 'Root 1' },
            { uri: 'file:///test/root2', name: 'Root 2' }
        ];
        // Simulate roots/list request from server
        const rootsRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 101,
            method: 'roots/list'
        };
        transport.simulateReceiveMessage(rootsRequest);
        // The handler should have sent a response
        const sentMessages = transport.getSentMessages();
        const rootsResponse = sentMessages.find(m => 'id' in m && m.id === rootsRequest.id && 'result' in m);
        assert.ok(rootsResponse, 'No roots/list response was sent');
        assert.strictEqual(rootsResponse.result.roots.length, 2);
        assert.strictEqual(rootsResponse.result.roots[0].uri, 'file:///test/root1');
    });
    test('should handle server notifications', async () => {
        let progressNotificationReceived = false;
        store.add(handler.onDidReceiveProgressNotification(notification => {
            progressNotificationReceived = true;
            assert.strictEqual(notification.method, 'notifications/progress');
            assert.strictEqual(notification.params.progressToken, 'token1');
            assert.strictEqual(notification.params.progress, 50);
        }));
        // Simulate progress notification with correct format
        const progressNotification = {
            jsonrpc: MCP.JSONRPC_VERSION,
            method: 'notifications/progress',
            params: {
                progressToken: 'token1',
                progress: 50,
                total: 100
            }
        };
        transport.simulateReceiveMessage(progressNotification);
        assert.strictEqual(progressNotificationReceived, true);
    });
    test('should handle cancellation', async () => {
        // Setup a new cancellation token source for this specific test
        const testCts = store.add(new CancellationTokenSource());
        const requestPromise = handler.listResources(undefined, testCts.token);
        // Get the request ID
        const sentMessages = transport.getSentMessages();
        const listResourcesRequest = sentMessages[2];
        const requestId = listResourcesRequest.id;
        // Cancel the request
        testCts.cancel();
        // Check that a cancellation notification was sent
        const cancelNotification = transport.getSentMessages().find(m => !('id' in m) &&
            'method' in m &&
            m.method === 'notifications/cancelled' &&
            'params' in m &&
            m.params && m.params.requestId === requestId);
        assert.ok(cancelNotification, 'No cancellation notification was sent');
        // Verify the promise was cancelled
        try {
            await requestPromise;
            assert.fail('Promise should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
    test('should handle cancelled notification from server', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Get the request ID
        const sentMessages = transport.getSentMessages();
        const listResourcesRequest = sentMessages[2];
        const requestId = listResourcesRequest.id;
        // Simulate cancelled notification from server
        const cancelledNotification = {
            jsonrpc: MCP.JSONRPC_VERSION,
            method: 'notifications/cancelled',
            params: {
                requestId
            }
        };
        transport.simulateReceiveMessage(cancelledNotification);
        // Verify the promise was cancelled
        try {
            await requestPromise;
            assert.fail('Promise should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
    test('should dispose properly and cancel pending requests', async () => {
        // Setup multiple requests
        const request1 = handler.listResources();
        const request2 = handler.listTools();
        // Dispose the handler
        handler.dispose();
        // Verify all promises were cancelled
        try {
            await request1;
            assert.fail('Promise 1 should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
        try {
            await request2;
            assert.fail('Promise 2 should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
    test('should handle connection error by cancelling requests', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Simulate connection error
        transport.setConnectionState({
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Connection lost'
        });
        // Verify the promise was cancelled
        try {
            await requestPromise;
            assert.fail('Promise should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
});
suite.skip('Workbench - MCP - McpTask', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let clock;
    setup(() => {
        clock = sinon.useFakeTimers();
    });
    teardown(() => {
        clock.restore();
    });
    function createTask(overrides = {}) {
        return {
            taskId: 'task1',
            status: 'working',
            createdAt: new Date().toISOString(),
            ttl: null,
            ...overrides
        };
    }
    test('should resolve when task completes', async () => {
        const mockHandler = upcastPartial({
            getTask: sinon.stub().resolves(createTask({ status: 'completed' })),
            getTaskResult: sinon.stub().resolves({ content: [{ type: 'text', text: 'result' }] })
        });
        const task = store.add(new McpTask(createTask()));
        task.setHandler(mockHandler);
        // Advance time to trigger polling
        await clock.tickAsync(2000);
        // Update to completed state
        task.onDidUpdateState(createTask({ status: 'completed' }));
        const result = await task.result;
        assert.deepStrictEqual(result, { content: [{ type: 'text', text: 'result' }] });
        assert.ok(mockHandler.getTaskResult.calledWith({ taskId: 'task1' }));
    });
    test('should poll for task updates', async () => {
        const getTaskStub = sinon.stub();
        getTaskStub.onCall(0).resolves(createTask({ status: 'working' }));
        getTaskStub.onCall(1).resolves(createTask({ status: 'working' }));
        getTaskStub.onCall(2).resolves(createTask({ status: 'completed' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
            getTaskResult: sinon.stub().resolves({ content: [{ type: 'text', text: 'result' }] })
        });
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        task.setHandler(mockHandler);
        // First poll
        await clock.tickAsync(1000);
        assert.strictEqual(getTaskStub.callCount, 1);
        // Second poll
        await clock.tickAsync(1000);
        assert.strictEqual(getTaskStub.callCount, 2);
        // Third poll - completes
        await clock.tickAsync(1000);
        assert.strictEqual(getTaskStub.callCount, 3);
        const result = await task.result;
        assert.deepStrictEqual(result, { content: [{ type: 'text', text: 'result' }] });
    });
    test('should use default poll interval if not specified', async () => {
        const getTaskStub = sinon.stub();
        getTaskStub.resolves(createTask({ status: 'working' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
        });
        const task = store.add(new McpTask(createTask()));
        task.setHandler(mockHandler);
        // Default poll interval is 2000ms
        await clock.tickAsync(2000);
        assert.strictEqual(getTaskStub.callCount, 1);
        await clock.tickAsync(2000);
        assert.strictEqual(getTaskStub.callCount, 2);
        task.dispose();
    });
    test('should reject when task fails', async () => {
        const mockHandler = upcastPartial({
            getTask: sinon.stub().resolves(createTask({
                status: 'failed',
                statusMessage: 'Something went wrong'
            }))
        });
        const task = store.add(new McpTask(createTask()));
        task.setHandler(mockHandler);
        // Update to failed state
        task.onDidUpdateState(createTask({
            status: 'failed',
            statusMessage: 'Something went wrong'
        }));
        await assert.rejects(task.result, (error) => {
            assert.ok(error.message.includes('Task task1 failed'));
            assert.ok(error.message.includes('Something went wrong'));
            return true;
        });
    });
    test('should cancel when task is cancelled', async () => {
        const task = store.add(new McpTask(createTask()));
        // Update to cancelled state
        task.onDidUpdateState(createTask({ status: 'cancelled' }));
        await assert.rejects(task.result, (error) => {
            assert.strictEqual(error.name, 'Canceled');
            return true;
        });
    });
    test('should cancel when cancellation token is triggered', async () => {
        const cts = store.add(new CancellationTokenSource());
        const task = store.add(new McpTask(createTask(), cts.token));
        // Cancel the token
        cts.cancel();
        await assert.rejects(task.result, (error) => {
            assert.strictEqual(error.name, 'Canceled');
            return true;
        });
    });
    test('should handle TTL expiration', async () => {
        const now = Date.now();
        clock.setSystemTime(now);
        const task = store.add(new McpTask(createTask({ ttl: 5000 })));
        // Advance time past TTL
        await clock.tickAsync(6000);
        await assert.rejects(task.result, (error) => {
            assert.strictEqual(error.name, 'Canceled');
            return true;
        });
    });
    test('should stop polling when in terminal state', async () => {
        const getTaskStub = sinon.stub();
        getTaskStub.resolves(createTask({ status: 'completed' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
            getTaskResult: sinon.stub().resolves({ content: [{ type: 'text', text: 'result' }] })
        });
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        task.setHandler(mockHandler);
        // Update to completed state immediately
        task.onDidUpdateState(createTask({ status: 'completed' }));
        await task.result;
        // Advance time - should not poll anymore
        const initialCallCount = getTaskStub.callCount;
        await clock.tickAsync(5000);
        assert.strictEqual(getTaskStub.callCount, initialCallCount);
    });
    test('should handle handler reconnection', async () => {
        const getTaskStub1 = sinon.stub();
        getTaskStub1.resolves(createTask({ status: 'working' }));
        const mockHandler1 = upcastPartial({
            getTask: getTaskStub1,
        });
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        task.setHandler(mockHandler1);
        // First poll with handler1
        await clock.tickAsync(1000);
        assert.strictEqual(getTaskStub1.callCount, 1);
        // Switch to a new handler
        const getTaskStub2 = sinon.stub();
        getTaskStub2.resolves(createTask({ status: 'completed' }));
        const mockHandler2 = upcastPartial({
            getTask: getTaskStub2,
            getTaskResult: sinon.stub().resolves({ content: [{ type: 'text', text: 'result' }] })
        });
        task.setHandler(mockHandler2);
        // Second poll with handler2
        await clock.tickAsync(1000);
        assert.strictEqual(getTaskStub1.callCount, 1); // No more calls to old handler
        assert.strictEqual(getTaskStub2.callCount, 1); // New handler is called
        const result = await task.result;
        assert.deepStrictEqual(result, { content: [{ type: 'text', text: 'result' }] });
    });
    test('should not poll when handler is undefined', async () => {
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        // Advance time - should not crash
        await clock.tickAsync(5000);
        // Now set a handler and it should start polling
        const getTaskStub = sinon.stub();
        getTaskStub.resolves(createTask({ status: 'completed' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
            getTaskResult: sinon.stub().resolves({ content: [{ type: 'text', text: 'result' }] })
        });
        task.setHandler(mockHandler);
        await clock.tickAsync(1000);
        assert.strictEqual(getTaskStub.callCount, 1);
        task.dispose();
    });
    test('should handle input_required state', async () => {
        const getTaskStub = sinon.stub();
        // getTask call returns completed (triggered by input_required handling)
        getTaskStub.resolves(createTask({ status: 'completed' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
            getTaskResult: sinon.stub().resolves({ content: [{ type: 'text', text: 'result' }] })
        });
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        task.setHandler(mockHandler);
        // Update to input_required - this triggers a getTask call
        task.onDidUpdateState(createTask({ status: 'input_required' }));
        // Allow the promise to settle
        await clock.tickAsync(0);
        // Verify getTask was called
        assert.strictEqual(getTaskStub.callCount, 1);
        // Once getTask resolves with completed, should fetch result
        const result = await task.result;
        assert.deepStrictEqual(result, { content: [{ type: 'text', text: 'result' }] });
    });
    test('should handle getTask returning cancelled during polling', async () => {
        const getTaskStub = sinon.stub();
        getTaskStub.resolves(createTask({ status: 'cancelled' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
        });
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        task.setHandler(mockHandler);
        // Advance time to trigger polling
        await clock.tickAsync(1000);
        await assert.rejects(task.result, (error) => {
            assert.strictEqual(error.name, 'Canceled');
            return true;
        });
    });
    test('should return correct task id', () => {
        const task = store.add(new McpTask(createTask({ taskId: 'my-task-id' })));
        assert.strictEqual(task.id, 'my-task-id');
    });
    test('should dispose cleanly', async () => {
        const getTaskStub = sinon.stub();
        getTaskStub.resolves(createTask({ status: 'working' }));
        const mockHandler = upcastPartial({
            getTask: getTaskStub,
        });
        const task = store.add(new McpTask(createTask({ pollInterval: 1000 })));
        task.setHandler(mockHandler);
        // Poll once
        await clock.tickAsync(1000);
        const callCountBeforeDispose = getTaskStub.callCount;
        // Dispose
        task.dispose();
        // Advance time - should not poll anymore
        await clock.tickAsync(5000);
        assert.strictEqual(getTaskStub.callCount, callCountBeforeDispose);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwU2VydmVyUmVxdWVzdEhhbmRsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFN0gsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxD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
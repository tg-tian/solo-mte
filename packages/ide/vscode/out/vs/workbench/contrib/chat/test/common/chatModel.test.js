/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { OffsetRange } from '../../../../../editor/common/core/ranges/offsetRange.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { ChatModel, isExportableSessionData, isSerializableSessionData, normalizeSerializableChatData, Response } from '../../common/chatModel.js';
import { ChatRequestTextPart } from '../../common/chatParserTypes.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { MockChatService } from './mockChatService.js';
suite('ChatModel', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IChatAgentService, testDisposables.add(instantiationService.createInstance(ChatAgentService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IChatService, new MockChatService());
    });
    test('initialization with exported data only (imported)', async () => {
        const exportedData = {
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, exportedData, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        assert.strictEqual(model.isImported, true);
        assert.ok(model.sessionId); // Should have generated ID
        assert.ok(model.timestamp > 0); // Should have generated timestamp
    });
    test('initialization with full serializable data (not imported)', async () => {
        const now = Date.now();
        const serializableData = {
            version: 3,
            sessionId: 'existing-session',
            creationDate: now - 1000,
            lastMessageDate: now,
            customTitle: 'My Chat',
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, serializableData, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        assert.strictEqual(model.isImported, false);
        assert.strictEqual(model.sessionId, 'existing-session');
        assert.strictEqual(model.timestamp, now - 1000);
        assert.strictEqual(model.lastMessageDate, now);
        assert.strictEqual(model.customTitle, 'My Chat');
    });
    test('initialization with invalid data', async () => {
        const invalidData = {
            // Missing required fields
            requests: 'not-an-array'
        };
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, invalidData, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        // Should handle gracefully with empty state
        assert.strictEqual(model.getRequests().length, 0);
        assert.ok(model.sessionId); // Should have generated ID
    });
    test('initialization without data', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        assert.strictEqual(model.isImported, false);
        assert.strictEqual(model.getRequests().length, 0);
        assert.ok(model.sessionId);
        assert.ok(model.timestamp > 0);
    });
    test('removeRequest', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        const text = 'hello';
        model.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0);
        const requests = model.getRequests();
        assert.strictEqual(requests.length, 1);
        model.removeRequest(requests[0].id);
        assert.strictEqual(model.getRequests().length, 0);
    });
    test('adoptRequest', async function () {
        const model1 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, { initialLocation: ChatAgentLocation.EditorInline, canUseTools: true }));
        const model2 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        const text = 'hello';
        const request1 = model1.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0);
        assert.strictEqual(model1.getRequests().length, 1);
        assert.strictEqual(model2.getRequests().length, 0);
        assert.ok(request1.session === model1);
        assert.ok(request1.response?.session === model1);
        model2.adoptRequest(request1);
        assert.strictEqual(model1.getRequests().length, 0);
        assert.strictEqual(model2.getRequests().length, 1);
        assert.ok(request1.session === model2);
        assert.ok(request1.response?.session === model2);
        model2.acceptResponseProgress(request1, { content: new MarkdownString('Hello'), kind: 'markdownContent' });
        assert.strictEqual(request1.response.response.toString(), 'Hello');
    });
    test('addCompleteRequest', async function () {
        const model1 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
        const text = 'hello';
        const request1 = model1.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0, undefined, undefined, undefined, undefined, undefined, undefined, true);
        assert.strictEqual(request1.isCompleteAddedRequest, true);
        assert.strictEqual(request1.response.isCompleteAddedRequest, true);
        assert.strictEqual(request1.shouldBeRemovedOnSend, undefined);
        assert.strictEqual(request1.response.shouldBeRemovedOnSend, undefined);
    });
});
suite('Response', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('mergeable markdown', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('markdown1'), kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('markdown2'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
        assert.strictEqual(response.toString(), 'markdown1markdown2');
    });
    test('not mergeable markdown', async () => {
        const response = store.add(new Response([]));
        const md1 = new MarkdownString('markdown1');
        md1.supportHtml = true;
        response.updateContent({ content: md1, kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('markdown2'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
    });
    test('inline reference', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('text before '), kind: 'markdownContent' });
        response.updateContent({ inlineReference: URI.parse('https://microsoft.com/'), kind: 'inlineReference' });
        response.updateContent({ content: new MarkdownString(' text after'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
        assert.strictEqual(response.toString(), 'text before https://microsoft.com/ text after');
    });
    test('consolidated edit summary', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('Some content before edits'), kind: 'markdownContent' });
        response.updateContent({ kind: 'textEditGroup', uri: URI.parse('file:///file1.ts'), edits: [], state: undefined, done: true });
        response.updateContent({ kind: 'textEditGroup', uri: URI.parse('file:///file2.ts'), edits: [], state: undefined, done: true });
        response.updateContent({ content: new MarkdownString('Some content after edits'), kind: 'markdownContent' });
        // Should have single "Made changes." at the end instead of multiple entries
        const responseString = response.toString();
        const madeChangesCount = (responseString.match(/Made changes\./g) || []).length;
        assert.strictEqual(madeChangesCount, 1, 'Should have exactly one "Made changes." message');
        assert.ok(responseString.includes('Some content before edits'), 'Should include content before edits');
        assert.ok(responseString.includes('Some content after edits'), 'Should include content after edits');
        assert.ok(responseString.endsWith('Made changes.'), 'Should end with "Made changes."');
    });
    test('no edit summary when no edits', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('Some content'), kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('More content'), kind: 'markdownContent' });
        // Should not have "Made changes." when there are no edit groups
        const responseString = response.toString();
        assert.ok(!responseString.includes('Made changes.'), 'Should not include "Made changes." when no edits present');
        assert.strictEqual(responseString, 'Some contentMore content');
    });
    test('consolidated edit summary with clear operation', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('Initial content'), kind: 'markdownContent' });
        response.updateContent({ kind: 'textEditGroup', uri: URI.parse('file:///file1.ts'), edits: [], state: undefined, done: true });
        response.updateContent({ kind: 'clearToPreviousToolInvocation', reason: 1 });
        response.updateContent({ content: new MarkdownString('Content after clear'), kind: 'markdownContent' });
        response.updateContent({ kind: 'textEditGroup', uri: URI.parse('file:///file2.ts'), edits: [], state: undefined, done: true });
        // Should only show "Made changes." for edits after the clear operation
        const responseString = response.toString();
        const madeChangesCount = (responseString.match(/Made changes\./g) || []).length;
        assert.strictEqual(madeChangesCount, 1, 'Should have exactly one "Made changes." message after clear');
        assert.ok(responseString.includes('Content after clear'), 'Should include content after clear');
        assert.ok(!responseString.includes('Initial content'), 'Should not include content before clear');
        assert.ok(responseString.endsWith('Made changes.'), 'Should end with "Made changes."');
    });
});
suite('normalizeSerializableChatData', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('v1', () => {
        const v1Data = {
            creationDate: Date.now(),
            initialLocation: undefined,
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
        };
        const newData = normalizeSerializableChatData(v1Data);
        assert.strictEqual(newData.creationDate, v1Data.creationDate);
        assert.strictEqual(newData.lastMessageDate, v1Data.creationDate);
        assert.strictEqual(newData.version, 3);
        assert.ok('customTitle' in newData);
    });
    test('v2', () => {
        const v2Data = {
            version: 2,
            creationDate: 100,
            lastMessageDate: Date.now(),
            initialLocation: undefined,
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
            computedTitle: 'computed title'
        };
        const newData = normalizeSerializableChatData(v2Data);
        assert.strictEqual(newData.version, 3);
        assert.strictEqual(newData.creationDate, v2Data.creationDate);
        assert.strictEqual(newData.lastMessageDate, v2Data.lastMessageDate);
        assert.strictEqual(newData.customTitle, v2Data.computedTitle);
    });
    test('old bad data', () => {
        const v1Data = {
            // Testing the scenario where these are missing
            sessionId: undefined,
            creationDate: undefined,
            initialLocation: undefined,
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
        };
        const newData = normalizeSerializableChatData(v1Data);
        assert.strictEqual(newData.version, 3);
        assert.ok(newData.creationDate > 0);
        assert.ok(newData.lastMessageDate > 0);
        assert.ok(newData.sessionId);
    });
    test('v3 with bug', () => {
        const v3Data = {
            // Test case where old data was wrongly normalized and these fields were missing
            creationDate: undefined,
            lastMessageDate: undefined,
            version: 3,
            initialLocation: undefined,
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
            customTitle: 'computed title'
        };
        const newData = normalizeSerializableChatData(v3Data);
        assert.strictEqual(newData.version, 3);
        assert.ok(newData.creationDate > 0);
        assert.ok(newData.lastMessageDate > 0);
        assert.ok(newData.sessionId);
    });
});
suite('isExportableSessionData', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('valid exportable data', () => {
        const validData = {
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isExportableSessionData(validData), true);
    });
    test('invalid - missing requests', () => {
        const invalidData = {
            initialLocation: ChatAgentLocation.Chat,
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isExportableSessionData(invalidData), false);
    });
    test('invalid - requests not array', () => {
        const invalidData = {
            initialLocation: ChatAgentLocation.Chat,
            requests: 'not-an-array',
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isExportableSessionData(invalidData), false);
    });
    test('invalid - missing responderUsername', () => {
        const invalidData = {
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isExportableSessionData(invalidData), false);
    });
    test('invalid - responderUsername not string', () => {
        const invalidData = {
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 123,
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isExportableSessionData(invalidData), false);
    });
    test('invalid - null', () => {
        assert.strictEqual(isExportableSessionData(null), false);
    });
    test('invalid - undefined', () => {
        assert.strictEqual(isExportableSessionData(undefined), false);
    });
});
suite('isSerializableSessionData', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('valid serializable data', () => {
        const validData = {
            version: 3,
            sessionId: 'session1',
            creationDate: Date.now(),
            lastMessageDate: Date.now(),
            customTitle: undefined,
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isSerializableSessionData(validData), true);
    });
    test('valid - with usedContext', () => {
        const validData = {
            version: 3,
            sessionId: 'session1',
            creationDate: Date.now(),
            lastMessageDate: Date.now(),
            customTitle: undefined,
            initialLocation: ChatAgentLocation.Chat,
            requests: [{
                    requestId: 'req1',
                    message: 'test',
                    variableData: { variables: [] },
                    response: undefined,
                    usedContext: { documents: [], kind: 'usedContext' }
                }],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isSerializableSessionData(validData), true);
    });
    test('invalid - missing sessionId', () => {
        const invalidData = {
            version: 3,
            creationDate: Date.now(),
            lastMessageDate: Date.now(),
            customTitle: undefined,
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isSerializableSessionData(invalidData), false);
    });
    test('invalid - missing creationDate', () => {
        const invalidData = {
            version: 3,
            sessionId: 'session1',
            lastMessageDate: Date.now(),
            customTitle: undefined,
            initialLocation: ChatAgentLocation.Chat,
            requests: [],
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isSerializableSessionData(invalidData), false);
    });
    test('invalid - not exportable', () => {
        const invalidData = {
            version: 3,
            sessionId: 'session1',
            creationDate: Date.now(),
            lastMessageDate: Date.now(),
            customTitle: undefined,
            initialLocation: ChatAgentLocation.Chat,
            requests: 'not-an-array',
            responderUsername: 'bot',
            responderAvatarIconUri: undefined
        };
        assert.strictEqual(isSerializableSessionData(invalidData), false);
    });
});
suite('ChatResponseModel', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IChatAgentService, testDisposables.add(instantiationService.createInstance(ChatAgentService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IChatService, new MockChatService());
    });
    test('timestamp and confirmationAdjustedTimestamp', async () => {
        const clock = sinon.useFakeTimers();
        try {
            const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, { initialLocation: ChatAgentLocation.Chat, canUseTools: true }));
            const start = Date.now();
            const text = 'hello';
            const request = model.addRequest({ text, parts: [new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text)] }, { variables: [] }, 0);
            const response = request.response;
            assert.strictEqual(response.timestamp, start);
            assert.strictEqual(response.confirmationAdjustedTimestamp.get(), start);
            // Advance time, no pending confirmation
            clock.tick(1000);
            assert.strictEqual(response.confirmationAdjustedTimestamp.get(), start);
            // Add pending confirmation via tool invocation
            const toolState = observableValue('state', { type: 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ });
            const toolInvocation = {
                kind: 'toolInvocation',
                invocationMessage: 'calling tool',
                confirmationMessages: { title: 'Please confirm' },
                state: toolState
            };
            model.acceptResponseProgress(request, toolInvocation);
            // Advance time while pending
            clock.tick(2000);
            // Timestamp should still be start (it includes the wait time while waiting)
            assert.strictEqual(response.confirmationAdjustedTimestamp.get(), start);
            // Resolve confirmation
            toolState.set({ type: 3 /* IChatToolInvocation.StateKind.Completed */ }, undefined);
            // Now adjusted timestamp should reflect the wait time
            // The wait time was 2000ms.
            // confirmationAdjustedTimestamp = start + waitTime = start + 2000
            assert.strictEqual(response.confirmationAdjustedTimestamp.get(), start + 2000);
            // Advance time again
            clock.tick(1000);
            assert.strictEqual(response.confirmationAdjustedTimestamp.get(), start + 2000);
        }
        finally {
            clock.restore();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FB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
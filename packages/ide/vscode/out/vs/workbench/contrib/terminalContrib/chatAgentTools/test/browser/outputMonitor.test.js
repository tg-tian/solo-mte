/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { detectsInputRequiredPattern, detectsNonInteractiveHelpPattern, OutputMonitor } from '../../browser/tools/monitoring/outputMonitor.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { OutputMonitorState } from '../../browser/tools/monitoring/types.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILanguageModelsService } from '../../../../chat/common/languageModels.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { ChatModel } from '../../../../chat/common/chatModel.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { runWithFakedTimers } from '../../../../../../base/test/common/timeTravelScheduler.js';
import { LocalChatSessionUri } from '../../../../chat/common/chatUri.js';
import { isNumber } from '../../../../../../base/common/types.js';
suite('OutputMonitor', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let monitor;
    let execution;
    let cts;
    let instantiationService;
    let sendTextCalled;
    let dataEmitter;
    setup(() => {
        sendTextCalled = false;
        dataEmitter = new Emitter();
        execution = {
            getOutput: () => 'test output',
            isActive: async () => false,
            instance: {
                instanceId: 1,
                sendText: async () => { sendTextCalled = true; },
                onDidInputData: dataEmitter.event,
                onDisposed: Event.None,
                onData: dataEmitter.event,
                focus: () => { },
                // eslint-disable-next-line local/code-no-any-casts
                registerMarker: () => ({ id: 1 })
            },
            sessionId: '1'
        };
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ILanguageModelsService, {
            selectLanguageModels: async () => []
        });
        instantiationService.stub(IChatService, {
            // eslint-disable-next-line local/code-no-any-casts
            getSession: () => ({
                sessionId: '1',
                onDidDispose: { event: () => { }, dispose: () => { } },
                onDidChange: { event: () => { }, dispose: () => { } },
                initialLocation: undefined,
                requests: [],
                responses: [],
                addRequest: () => { },
                addResponse: () => { },
                dispose: () => { }
            })
        });
        instantiationService.stub(ILogService, new NullLogService());
        cts = new CancellationTokenSource();
    });
    teardown(() => {
        cts.dispose();
    });
    test('startMonitoring returns immediately when polling succeeds', async () => {
        return runWithFakedTimers({}, async () => {
            // Simulate output change after first poll
            let callCount = 0;
            execution.getOutput = () => {
                callCount++;
                return callCount > 1 ? 'changed output' : 'test output';
            };
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, undefined, createTestContext('1'), cts.token, 'test command'));
            await Event.toPromise(monitor.onDidFinishCommand);
            const pollingResult = monitor.pollingResult;
            assert.strictEqual(pollingResult?.state, OutputMonitorState.Idle);
            assert.strictEqual(pollingResult.output, 'changed output');
            assert.strictEqual(sendTextCalled, false, 'sendText should not be called');
        });
    });
    test('startMonitoring returns cancelled when token is cancelled', async () => {
        return runWithFakedTimers({}, async () => {
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, undefined, createTestContext('1'), cts.token, 'test command'));
            cts.cancel();
            await Event.toPromise(monitor.onDidFinishCommand);
            const pollingResult = monitor.pollingResult;
            assert.strictEqual(pollingResult?.state, OutputMonitorState.Cancelled);
        });
    });
    test('startMonitoring returns idle when isActive is false', async () => {
        return runWithFakedTimers({}, async () => {
            execution.isActive = async () => false;
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, undefined, createTestContext('1'), cts.token, 'test command'));
            await Event.toPromise(monitor.onDidFinishCommand);
            const pollingResult = monitor.pollingResult;
            assert.strictEqual(pollingResult?.state, OutputMonitorState.Idle);
        });
    });
    test('startMonitoring works when isActive is undefined', async () => {
        return runWithFakedTimers({}, async () => {
            // Simulate output change after first poll
            let callCount = 0;
            execution.getOutput = () => {
                callCount++;
                return callCount > 1 ? 'changed output' : 'test output';
            };
            delete execution.isActive;
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, undefined, createTestContext('1'), cts.token, 'test command'));
            await Event.toPromise(monitor.onDidFinishCommand);
            const pollingResult = monitor.pollingResult;
            assert.strictEqual(pollingResult?.state, OutputMonitorState.Idle);
        });
    });
    test('non-interactive help completes without prompting', async () => {
        return runWithFakedTimers({}, async () => {
            execution.getOutput = () => 'press h + enter to show help';
            instantiationService.stub(ILanguageModelsService, {
                selectLanguageModels: async () => { throw new Error('language model should not be consulted'); }
            });
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, undefined, createTestContext('1'), cts.token, 'test command'));
            await Event.toPromise(monitor.onDidFinishCommand);
            const pollingResult = monitor.pollingResult;
            assert.strictEqual(pollingResult?.state, OutputMonitorState.Idle);
            assert.strictEqual(pollingResult?.output, 'press h + enter to show help');
        });
    });
    test('monitor can be disposed twice without error', async () => {
        return runWithFakedTimers({}, async () => {
            // Simulate output change after first poll
            let callCount = 0;
            execution.getOutput = () => {
                callCount++;
                return callCount > 1 ? 'changed output' : 'test output';
            };
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, undefined, createTestContext('1'), cts.token, 'test command'));
            await Event.toPromise(monitor.onDidFinishCommand);
            const pollingResult = monitor.pollingResult;
            assert.strictEqual(pollingResult?.state, OutputMonitorState.Idle);
            monitor.dispose();
            monitor.dispose();
        });
    });
    test('timeout prompt unanswered → continues polling and completes when idle', async () => {
        return runWithFakedTimers({}, async () => {
            // Fake a ChatModel enough to pass instanceof and the two methods used
            const fakeChatModel = {
                getRequests: () => [{}],
                acceptResponseProgress: () => { }
            };
            Object.setPrototypeOf(fakeChatModel, ChatModel.prototype);
            instantiationService.stub(IChatService, { getSession: () => fakeChatModel });
            // Poller: first pass times out (to show the prompt), second pass goes idle
            let pass = 0;
            const timeoutThenIdle = async () => {
                pass++;
                return pass === 1
                    ? { state: OutputMonitorState.Timeout, output: execution.getOutput(), modelOutputEvalResponse: 'Timed out' }
                    : { state: OutputMonitorState.Idle, output: execution.getOutput(), modelOutputEvalResponse: 'Done' };
            };
            monitor = store.add(instantiationService.createInstance(OutputMonitor, execution, timeoutThenIdle, createTestContext('1'), cts.token, 'test command'));
            await Event.toPromise(monitor.onDidFinishCommand);
            const res = monitor.pollingResult;
            assert.strictEqual(res.state, OutputMonitorState.Idle);
            assert.strictEqual(res.output, 'test output');
            assert.ok(isNumber(res.pollDurationMs));
        });
    });
    suite('detectsInputRequiredPattern', () => {
        test('detects yes/no confirmation prompts (pairs and variants)', () => {
            assert.strictEqual(detectsInputRequiredPattern('Continue? (y/N) '), true);
            assert.strictEqual(detectsInputRequiredPattern('Continue? (y/n) '), true);
            assert.strictEqual(detectsInputRequiredPattern('Overwrite file? [Y/n] '), true);
            assert.strictEqual(detectsInputRequiredPattern('Are you sure? (Y/N) '), true);
            assert.strictEqual(detectsInputRequiredPattern('Delete files? [y/N] '), true);
            assert.strictEqual(detectsInputRequiredPattern('Proceed? (yes/no) '), true);
            assert.strictEqual(detectsInputRequiredPattern('Proceed? [no/yes] '), true);
            assert.strictEqual(detectsInputRequiredPattern('Continue? y/n '), true);
            assert.strictEqual(detectsInputRequiredPattern('Overwrite: yes/no '), true);
            // No match if there's a response already
            assert.strictEqual(detectsInputRequiredPattern('Continue? (y/N) y'), false);
            assert.strictEqual(detectsInputRequiredPattern('Continue? (y/n) n'), false);
            assert.strictEqual(detectsInputRequiredPattern('Overwrite file? [Y/n] N'), false);
            assert.strictEqual(detectsInputRequiredPattern('Are you sure? (Y/N) Y'), false);
            assert.strictEqual(detectsInputRequiredPattern('Delete files? [y/N] y'), false);
            assert.strictEqual(detectsInputRequiredPattern('Continue? y/n y\/n'), false);
            assert.strictEqual(detectsInputRequiredPattern('Overwrite: yes/no yes\/n'), false);
        });
        test('detects PowerShell multi-option confirmation line', () => {
            assert.strictEqual(detectsInputRequiredPattern('[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "Y"): '), true);
            // also matches without default suffix
            assert.strictEqual(detectsInputRequiredPattern('[Y] Yes  [N] No '), true);
            // No match if there's a response already
            assert.strictEqual(detectsInputRequiredPattern('[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "Y"): Y'), false);
            assert.strictEqual(detectsInputRequiredPattern('[Y] Yes  [N] No N'), false);
        });
        test('Line ends with colon', () => {
            assert.strictEqual(detectsInputRequiredPattern('Enter your name: '), true);
            assert.strictEqual(detectsInputRequiredPattern('Password: '), true);
            assert.strictEqual(detectsInputRequiredPattern('File to overwrite: '), true);
        });
        test('detects trailing questions', () => {
            assert.strictEqual(detectsInputRequiredPattern('Continue?'), true);
            assert.strictEqual(detectsInputRequiredPattern('Proceed?   '), true);
            assert.strictEqual(detectsInputRequiredPattern('Are you sure?'), true);
        });
        test('detects press any key prompts', () => {
            assert.strictEqual(detectsInputRequiredPattern('Press any key to continue...'), true);
            assert.strictEqual(detectsInputRequiredPattern('Press a key'), true);
        });
        test('detects non-interactive help prompts without treating them as input', () => {
            assert.strictEqual(detectsInputRequiredPattern('press h + enter to show help'), false);
            assert.strictEqual(detectsInputRequiredPattern('press h to show help'), false);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press h + enter to show help'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press h to show help'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press h to show commands'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press ? to see commands'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press ? + enter for options'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('type h + enter to show help'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('hit ? for help'), true);
            assert.strictEqual(detectsNonInteractiveHelpPattern('type h to see options'), true);
            assert.strictEqual(detectsInputRequiredPattern('press o to open the app'), false);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press o to open the app'), true);
            assert.strictEqual(detectsInputRequiredPattern('press r to restart the server'), false);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press r to restart the server'), true);
            assert.strictEqual(detectsInputRequiredPattern('press q to quit'), false);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press q to quit'), true);
            assert.strictEqual(detectsInputRequiredPattern('press u to show server url'), false);
            assert.strictEqual(detectsNonInteractiveHelpPattern('press u to show server url'), true);
        });
    });
});
function createTestContext(id) {
    return { sessionId: id, sessionResource: LocalChatSessionUri.forSession(id) };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TW9uaXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy90ZXN0L2Jyb3dzZXIvb3V0cHV0TW9uaXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxnQ0FBZ0MsRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMvSSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RyxPQUFPLEVBQWtCLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWxFLEtBQUss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
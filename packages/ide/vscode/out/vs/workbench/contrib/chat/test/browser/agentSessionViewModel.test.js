/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AgentSessionsModel, isAgentSession, isAgentSessionsModel, isLocalAgentSessionItem } from '../../browser/agentSessions/agentSessionsModel.js';
import { AgentSessionsFilter } from '../../browser/agentSessions/agentSessionsFilter.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
import { MockChatSessionsService } from '../common/mockChatSessionsService.js';
import { TestLifecycleService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { AgentSessionProviders, getAgentSessionProviderIcon, getAgentSessionProviderName } from '../../browser/agentSessions/agentSessions.js';
suite('Agent Sessions', () => {
    suite('AgentSessionsViewModel', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let mockLifecycleService;
        let viewModel;
        let instantiationService;
        function createViewModel() {
            return disposables.add(instantiationService.createInstance(AgentSessionsModel));
        }
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            mockLifecycleService = disposables.add(new TestLifecycleService());
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
            instantiationService.stub(ILifecycleService, mockLifecycleService);
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should initialize with empty sessions', () => {
            viewModel = createViewModel();
            assert.strictEqual(viewModel.sessions.length, 0);
        });
        test('should resolve sessions from providers', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1', {
                            label: 'Test Session 1'
                        }),
                        makeSimpleSessionItem('session-2', {
                            label: 'Test Session 2'
                        })
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 2);
                assert.strictEqual(viewModel.sessions[0].resource.toString(), 'test://session-1');
                assert.strictEqual(viewModel.sessions[0].label, 'Test Session 1');
                assert.strictEqual(viewModel.sessions[1].resource.toString(), 'test://session-2');
                assert.strictEqual(viewModel.sessions[1].label, 'Test Session 2');
            });
        });
        test('should resolve sessions from multiple providers', async () => {
            return runWithFakedTimers({}, async () => {
                const provider1 = {
                    chatSessionType: 'type-1',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                const provider2 = {
                    chatSessionType: 'type-2',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-2'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider1);
                mockChatSessionsService.registerChatSessionItemProvider(provider2);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 2);
                assert.strictEqual(viewModel.sessions[0].resource.toString(), 'test://session-1');
                assert.strictEqual(viewModel.sessions[1].resource.toString(), 'test://session-2');
            });
        });
        test('should fire onWillResolve and onDidResolve events', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => []
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                let willResolveFired = false;
                let didResolveFired = false;
                disposables.add(viewModel.onWillResolve(() => {
                    willResolveFired = true;
                    assert.strictEqual(didResolveFired, false, 'onDidResolve should not fire before onWillResolve completes');
                }));
                disposables.add(viewModel.onDidResolve(() => {
                    didResolveFired = true;
                    assert.strictEqual(willResolveFired, true, 'onWillResolve should fire before onDidResolve');
                }));
                await viewModel.resolve(undefined);
                assert.strictEqual(willResolveFired, true, 'onWillResolve should have fired');
                assert.strictEqual(didResolveFired, true, 'onDidResolve should have fired');
            });
        });
        test('should fire onDidChangeSessions event after resolving', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                let sessionsChangedFired = false;
                disposables.add(viewModel.onDidChangeSessions(() => {
                    sessionsChangedFired = true;
                }));
                await viewModel.resolve(undefined);
                assert.strictEqual(sessionsChangedFired, true, 'onDidChangeSessions should have fired');
            });
        });
        test('should handle session with all properties', async () => {
            return runWithFakedTimers({}, async () => {
                const startTime = Date.now();
                const endTime = startTime + 1000;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            description: new MarkdownString('**Bold** description'),
                            status: 1 /* ChatSessionStatus.Completed */,
                            tooltip: 'Session tooltip',
                            iconPath: ThemeIcon.fromId('check'),
                            timing: { startTime, endTime },
                            changes: { files: 1, insertions: 10, deletions: 5, details: [] }
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 1);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.resource.toString(), 'test://session-1');
                assert.strictEqual(session.label, 'Test Session');
                assert.ok(session.description instanceof MarkdownString);
                if (session.description instanceof MarkdownString) {
                    assert.strictEqual(session.description.value, '**Bold** description');
                }
                assert.strictEqual(session.status, 1 /* ChatSessionStatus.Completed */);
                assert.strictEqual(session.timing.startTime, startTime);
                assert.strictEqual(session.timing.endTime, endTime);
                assert.deepStrictEqual(session.changes, { files: 1, insertions: 10, deletions: 5 });
            });
        });
        test('should handle resolve with specific provider', async () => {
            return runWithFakedTimers({}, async () => {
                const provider1 = {
                    chatSessionType: 'type-1',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                const provider2 = {
                    chatSessionType: 'type-2',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            id: 'session-2',
                            resource: URI.parse('test://session-2'),
                            label: 'Session 2',
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider1);
                mockChatSessionsService.registerChatSessionItemProvider(provider2);
                viewModel = createViewModel();
                // First resolve all
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 2);
                // Now resolve only type-1
                await viewModel.resolve('type-1');
                // Should still have both sessions, but only type-1 was re-resolved
                assert.strictEqual(viewModel.sessions.length, 2);
            });
        });
        test('should handle resolve with multiple specific providers', async () => {
            return runWithFakedTimers({}, async () => {
                const provider1 = {
                    chatSessionType: 'type-1',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                const provider2 = {
                    chatSessionType: 'type-2',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-2'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider1);
                mockChatSessionsService.registerChatSessionItemProvider(provider2);
                viewModel = createViewModel();
                await viewModel.resolve(['type-1', 'type-2']);
                assert.strictEqual(viewModel.sessions.length, 2);
            });
        });
        test('should respond to onDidChangeItemsProviders event', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                const sessionsChangedPromise = Event.toPromise(viewModel.onDidChangeSessions);
                // Trigger event - this should automatically call resolve
                mockChatSessionsService.fireDidChangeItemsProviders(provider);
                // Wait for the sessions to be resolved
                await sessionsChangedPromise;
                assert.strictEqual(viewModel.sessions.length, 1);
            });
        });
        test('should respond to onDidChangeAvailability event', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                const sessionsChangedPromise = Event.toPromise(viewModel.onDidChangeSessions);
                // Trigger event - this should automatically call resolve
                mockChatSessionsService.fireDidChangeAvailability();
                // Wait for the sessions to be resolved
                await sessionsChangedPromise;
                assert.strictEqual(viewModel.sessions.length, 1);
            });
        });
        test('should respond to onDidChangeSessionItems event', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                const sessionsChangedPromise = Event.toPromise(viewModel.onDidChangeSessions);
                // Trigger event - this should automatically call resolve
                mockChatSessionsService.fireDidChangeSessionItems('test-type');
                // Wait for the sessions to be resolved
                await sessionsChangedPromise;
                assert.strictEqual(viewModel.sessions.length, 1);
            });
        });
        test('should maintain provider reference in session view model', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 1);
                assert.strictEqual(viewModel.sessions[0].providerType, 'test-type');
            });
        });
        test('should handle empty provider results', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => []
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 0);
            });
        });
        test('should handle sessions with different statuses', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            id: 'session-failed',
                            resource: URI.parse('test://session-failed'),
                            label: 'Failed Session',
                            status: 0 /* ChatSessionStatus.Failed */,
                            timing: makeNewSessionTiming()
                        },
                        {
                            id: 'session-completed',
                            resource: URI.parse('test://session-completed'),
                            label: 'Completed Session',
                            status: 1 /* ChatSessionStatus.Completed */,
                            timing: makeNewSessionTiming()
                        },
                        {
                            id: 'session-inprogress',
                            resource: URI.parse('test://session-inprogress'),
                            label: 'In Progress Session',
                            status: 2 /* ChatSessionStatus.InProgress */,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 3);
                assert.strictEqual(viewModel.sessions[0].status, 0 /* ChatSessionStatus.Failed */);
                assert.strictEqual(viewModel.sessions[1].status, 1 /* ChatSessionStatus.Completed */);
                assert.strictEqual(viewModel.sessions[2].status, 2 /* ChatSessionStatus.InProgress */);
            });
        });
        test('should replace sessions on re-resolve', async () => {
            return runWithFakedTimers({}, async () => {
                let sessionCount = 1;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        const sessions = [];
                        for (let i = 0; i < sessionCount; i++) {
                            sessions.push(makeSimpleSessionItem(`session-${i + 1}`));
                        }
                        return sessions;
                    }
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 1);
                sessionCount = 3;
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 3);
            });
        });
        test('should handle local agent session type specially', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: localChatSessionType,
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            id: 'local-session',
                            resource: LocalChatSessionUri.forSession('local-session'),
                            label: 'Local Session',
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 1);
                assert.strictEqual(viewModel.sessions[0].providerType, localChatSessionType);
            });
        });
        test('should correctly construct resource URIs for sessions', async () => {
            return runWithFakedTimers({}, async () => {
                const resource = URI.parse('custom://my-session/path');
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: resource,
                            label: 'Test Session',
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 1);
                assert.strictEqual(viewModel.sessions[0].resource.toString(), resource.toString());
            });
        });
        test('should throttle multiple rapid resolve calls', async () => {
            return runWithFakedTimers({}, async () => {
                let providerCallCount = 0;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        providerCallCount++;
                        return [
                            makeSimpleSessionItem('session-1'),
                        ];
                    }
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = createViewModel();
                // Make multiple rapid resolve calls
                const resolvePromises = [
                    viewModel.resolve(undefined),
                    viewModel.resolve(undefined),
                    viewModel.resolve(undefined)
                ];
                await Promise.all(resolvePromises);
                // Should only call provider once due to throttling
                assert.strictEqual(providerCallCount, 1);
                assert.strictEqual(viewModel.sessions.length, 1);
            });
        });
        test('should preserve sessions from non-resolved providers', async () => {
            return runWithFakedTimers({}, async () => {
                let provider1CallCount = 0;
                let provider2CallCount = 0;
                const provider1 = {
                    chatSessionType: 'type-1',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        provider1CallCount++;
                        return [
                            {
                                resource: URI.parse('test://session-1'),
                                label: `Session 1 (call ${provider1CallCount})`,
                                timing: makeNewSessionTiming()
                            }
                        ];
                    }
                };
                const provider2 = {
                    chatSessionType: 'type-2',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        provider2CallCount++;
                        return [
                            {
                                resource: URI.parse('test://session-2'),
                                label: `Session 2 (call ${provider2CallCount})`,
                                timing: makeNewSessionTiming()
                            }
                        ];
                    }
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider1);
                mockChatSessionsService.registerChatSessionItemProvider(provider2);
                viewModel = createViewModel();
                // First resolve all
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 2);
                assert.strictEqual(provider1CallCount, 1);
                assert.strictEqual(provider2CallCount, 1);
                const originalSession1Label = viewModel.sessions[0].label;
                // Now resolve only type-2
                await viewModel.resolve('type-2');
                // Should still have both sessions
                assert.strictEqual(viewModel.sessions.length, 2);
                // Provider 1 should not be called again
                assert.strictEqual(provider1CallCount, 1);
                // Provider 2 should be called again
                assert.strictEqual(provider2CallCount, 2);
                // Session 1 should be preserved with original label
                assert.strictEqual(viewModel.sessions.find(s => s.resource.toString() === 'test://session-1')?.label, originalSession1Label);
            });
        });
        test('should accumulate providers when resolve is called with different provider types', async () => {
            return runWithFakedTimers({}, async () => {
                let resolveCount = 0;
                const resolvedProviders = [];
                const provider1 = {
                    chatSessionType: 'type-1',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        resolveCount++;
                        resolvedProviders.push('type-1');
                        return [makeSimpleSessionItem('session-1'),];
                    }
                };
                const provider2 = {
                    chatSessionType: 'type-2',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        resolveCount++;
                        resolvedProviders.push('type-2');
                        return [{
                                resource: URI.parse('test://session-2'),
                                label: 'Session 2',
                                timing: makeNewSessionTiming()
                            }];
                    }
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider1);
                mockChatSessionsService.registerChatSessionItemProvider(provider2);
                viewModel = createViewModel();
                // Call resolve with different types rapidly - they should accumulate
                const promise1 = viewModel.resolve('type-1');
                const promise2 = viewModel.resolve(['type-2']);
                await Promise.all([promise1, promise2]);
                // Both providers should be resolved
                assert.strictEqual(viewModel.sessions.length, 2);
            });
        });
    });
    suite('AgentSessionsViewModel - Helper Functions', () => {
        const disposables = new DisposableStore();
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('isLocalAgentSessionItem should identify local sessions', () => {
            const localSession = {
                providerType: localChatSessionType,
                providerLabel: 'Local',
                icon: Codicon.chatSparkle,
                resource: URI.parse('test://local-1'),
                label: 'Local',
                description: 'test',
                timing: makeNewSessionTiming(),
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => false,
                setArchived: archived => { },
                isRead: () => false,
                setRead: read => { }
            };
            const remoteSession = {
                providerType: 'remote',
                providerLabel: 'Remote',
                icon: Codicon.chatSparkle,
                resource: URI.parse('test://remote-1'),
                label: 'Remote',
                description: 'test',
                timing: makeNewSessionTiming(),
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => false,
                setArchived: archived => { },
                isRead: () => false,
                setRead: read => { }
            };
            assert.strictEqual(isLocalAgentSessionItem(localSession), true);
            assert.strictEqual(isLocalAgentSessionItem(remoteSession), false);
        });
        test('isAgentSession should identify session view models', () => {
            const session = {
                providerType: 'test',
                providerLabel: 'Local',
                icon: Codicon.chatSparkle,
                resource: URI.parse('test://test-1'),
                label: 'Test',
                description: 'test',
                timing: makeNewSessionTiming(),
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => false,
                setArchived: archived => { },
                isRead: () => false,
                setRead: read => { }
            };
            // Test with a session object
            assert.strictEqual(isAgentSession(session), true);
            // Test with a sessions container - pass as session to see it returns false
            const sessionOrContainer = session;
            assert.strictEqual(isAgentSession(sessionOrContainer), true);
        });
        test('isAgentSessionsViewModel should identify sessions view models', () => {
            const session = {
                providerType: 'test',
                providerLabel: 'Local',
                icon: Codicon.chatSparkle,
                resource: URI.parse('test://test-1'),
                label: 'Test',
                description: 'test',
                timing: makeNewSessionTiming(),
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => false,
                setArchived: archived => { },
                isRead: () => false,
                setRead: read => { }
            };
            // Test with actual view model
            const instantiationService = workbenchInstantiationService(undefined, disposables);
            const lifecycleService = disposables.add(new TestLifecycleService());
            instantiationService.stub(IChatSessionsService, new MockChatSessionsService());
            instantiationService.stub(ILifecycleService, lifecycleService);
            const actualViewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
            assert.strictEqual(isAgentSessionsModel(actualViewModel), true);
            // Test with session object
            assert.strictEqual(isAgentSessionsModel(session), false);
        });
    });
    suite('AgentSessionsFilter', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let instantiationService;
        function createSession(overrides = {}) {
            return {
                providerType: 'test-type',
                providerLabel: 'Test Provider',
                icon: Codicon.chatSparkle,
                resource: URI.parse('test://session'),
                label: 'Test Session',
                timing: makeNewSessionTiming(),
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => false,
                setArchived: () => { },
                isRead: () => false,
                setRead: read => { },
                ...overrides
            };
        }
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should initialize with default excludes', () => {
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            // Default: archived sessions should be excluded
            const archivedSession = createSession({
                isArchived: () => true
            });
            const activeSession = createSession({
                isArchived: () => false
            });
            assert.strictEqual(filter.exclude(archivedSession), true);
            assert.strictEqual(filter.exclude(activeSession), false);
        });
        test('should filter out sessions from excluded provider', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session1 = createSession({
                providerType: 'type-1',
                resource: URI.parse('test://session-1')
            });
            const session2 = createSession({
                providerType: 'type-2',
                resource: URI.parse('test://session-2')
            });
            // Initially, no sessions should be filtered by provider
            assert.strictEqual(filter.exclude(session1), false);
            assert.strictEqual(filter.exclude(session2), false);
            // Exclude type-1 by setting it in storage
            const excludes = {
                providers: ['type-1'],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // After excluding type-1, session1 should be filtered but not session2
            assert.strictEqual(filter.exclude(session1), true);
            assert.strictEqual(filter.exclude(session2), false);
        });
        test('should filter out multiple excluded providers', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session1 = createSession({ providerType: 'type-1' });
            const session2 = createSession({ providerType: 'type-2' });
            const session3 = createSession({ providerType: 'type-3' });
            // Exclude type-1 and type-2
            const excludes = {
                providers: ['type-1', 'type-2'],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            assert.strictEqual(filter.exclude(session1), true);
            assert.strictEqual(filter.exclude(session2), true);
            assert.strictEqual(filter.exclude(session3), false);
        });
        test('should filter out archived sessions', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const archivedSession = createSession({
                resource: URI.parse('test://archived-session'),
                isArchived: () => true
            });
            const activeSession = createSession({
                resource: URI.parse('test://active-session'),
                isArchived: () => false
            });
            // By default, archived sessions should be filtered (archived: true in default excludes)
            assert.strictEqual(filter.exclude(archivedSession), true);
            assert.strictEqual(filter.exclude(activeSession), false);
            // Include archived by setting archived to false in storage
            const excludes = {
                providers: [],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // After including archived, both sessions should not be filtered
            assert.strictEqual(filter.exclude(archivedSession), false);
            assert.strictEqual(filter.exclude(activeSession), false);
        });
        test('should filter out sessions with excluded status', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const failedSession = createSession({
                resource: URI.parse('test://failed-session'),
                status: 0 /* ChatSessionStatus.Failed */
            });
            const completedSession = createSession({
                resource: URI.parse('test://completed-session'),
                status: 1 /* ChatSessionStatus.Completed */
            });
            const inProgressSession = createSession({
                resource: URI.parse('test://inprogress-session'),
                status: 2 /* ChatSessionStatus.InProgress */
            });
            // Initially, no sessions should be filtered by status (archived is default exclude)
            assert.strictEqual(filter.exclude(failedSession), false);
            assert.strictEqual(filter.exclude(completedSession), false);
            assert.strictEqual(filter.exclude(inProgressSession), false);
            // Exclude failed status by setting it in storage
            const excludes = {
                providers: [],
                states: [0 /* ChatSessionStatus.Failed */],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // After excluding failed status, only failedSession should be filtered
            assert.strictEqual(filter.exclude(failedSession), true);
            assert.strictEqual(filter.exclude(completedSession), false);
            assert.strictEqual(filter.exclude(inProgressSession), false);
        });
        test('should filter out multiple excluded statuses', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const failedSession = createSession({ status: 0 /* ChatSessionStatus.Failed */ });
            const completedSession = createSession({ status: 1 /* ChatSessionStatus.Completed */ });
            const inProgressSession = createSession({ status: 2 /* ChatSessionStatus.InProgress */ });
            // Exclude failed and in-progress
            const excludes = {
                providers: [],
                states: [0 /* ChatSessionStatus.Failed */, 2 /* ChatSessionStatus.InProgress */],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            assert.strictEqual(filter.exclude(failedSession), true);
            assert.strictEqual(filter.exclude(completedSession), false);
            assert.strictEqual(filter.exclude(inProgressSession), true);
        });
        test('should combine multiple filter conditions', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session1 = createSession({
                providerType: 'type-1',
                status: 0 /* ChatSessionStatus.Failed */,
                isArchived: () => true
            });
            const session2 = createSession({
                providerType: 'type-2',
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => false
            });
            // Exclude type-1, failed status, and archived
            const excludes = {
                providers: ['type-1'],
                states: [0 /* ChatSessionStatus.Failed */],
                archived: true
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // session1 should be excluded for multiple reasons
            assert.strictEqual(filter.exclude(session1), true);
            // session2 should not be excluded
            assert.strictEqual(filter.exclude(session2), false);
        });
        test('should emit onDidChange when excludes are updated', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            let changeEventFired = false;
            disposables.add(filter.onDidChange(() => {
                changeEventFired = true;
            }));
            // Update excludes
            const excludes = {
                providers: ['type-1'],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            assert.strictEqual(changeEventFired, true);
        });
        test('should handle storage updates from other windows', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session = createSession({ providerType: 'type-1' });
            // Initially not excluded
            assert.strictEqual(filter.exclude(session), false);
            // Simulate storage update from another window
            const excludes = {
                providers: ['type-1'],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // Should now be excluded
            assert.strictEqual(filter.exclude(session), true);
        });
        test('should register provider filter actions', () => {
            const provider1 = {
                chatSessionType: 'custom-type-1',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => []
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider1);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            // Filter should work with custom provider
            const session = createSession({ providerType: 'custom-type-1' });
            assert.strictEqual(filter.exclude(session), false);
        });
        test('should handle providers registered after filter creation', () => {
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const provider = {
                chatSessionType: 'new-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => []
            };
            // Register provider after filter creation
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            mockChatSessionsService.fireDidChangeItemsProviders(provider);
            // Filter should work with new provider
            const session = createSession({ providerType: 'new-type' });
            assert.strictEqual(filter.exclude(session), false);
        });
        test('should not exclude when all filters are disabled', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session = createSession({
                providerType: 'type-1',
                status: 0 /* ChatSessionStatus.Failed */,
                isArchived: () => true
            });
            // Disable all filters
            const excludes = {
                providers: [],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // Nothing should be excluded
            assert.strictEqual(filter.exclude(session), false);
        });
        test('should handle empty provider list in storage', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session = createSession({ providerType: 'type-1' });
            // Set empty provider list
            const excludes = {
                providers: [],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            assert.strictEqual(filter.exclude(session), false);
        });
        test('should handle different MenuId contexts', () => {
            const storageService = instantiationService.get(IStorageService);
            // Create two filters with different menu IDs
            const filter1 = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const filter2 = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewItemContext }));
            const session = createSession({ providerType: 'type-1' });
            // Set excludes only for ViewTitle
            const excludes = {
                providers: ['type-1'],
                states: [],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // filter1 should exclude the session
            assert.strictEqual(filter1.exclude(session), true);
            // filter2 should not exclude the session (different storage key)
            assert.strictEqual(filter2.exclude(session), false);
        });
        test('should handle malformed storage data gracefully', () => {
            const storageService = instantiationService.get(IStorageService);
            // Store malformed JSON
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, 'invalid json', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // Filter should still be created with default excludes
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const archivedSession = createSession({ isArchived: () => true });
            // Default behavior: archived should be excluded
            assert.strictEqual(filter.exclude(archivedSession), true);
        });
        test('should prioritize archived check first', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const session = createSession({
                providerType: 'type-1',
                status: 1 /* ChatSessionStatus.Completed */,
                isArchived: () => true
            });
            // Set excludes for provider and status, but include archived
            const excludes = {
                providers: ['type-1'],
                states: [1 /* ChatSessionStatus.Completed */],
                archived: true
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            // Should be excluded due to archived (checked first)
            assert.strictEqual(filter.exclude(session), true);
        });
        test('should handle all three status types correctly', () => {
            const storageService = instantiationService.get(IStorageService);
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            const completedSession = createSession({ status: 1 /* ChatSessionStatus.Completed */ });
            const inProgressSession = createSession({ status: 2 /* ChatSessionStatus.InProgress */ });
            const failedSession = createSession({ status: 0 /* ChatSessionStatus.Failed */ });
            // Exclude all statuses
            const excludes = {
                providers: [],
                states: [1 /* ChatSessionStatus.Completed */, 2 /* ChatSessionStatus.InProgress */, 0 /* ChatSessionStatus.Failed */],
                archived: false
            };
            storageService.store(`agentSessions.filterExcludes.${MenuId.ViewTitle.id.toLowerCase()}`, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            assert.strictEqual(filter.exclude(completedSession), true);
            assert.strictEqual(filter.exclude(inProgressSession), true);
            assert.strictEqual(filter.exclude(failedSession), true);
        });
    });
    suite('AgentSessionsViewModel - Session Archiving', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let instantiationService;
        let viewModel;
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
            instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should archive and unarchive sessions', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.isArchived(), false);
                // Archive the session
                session.setArchived(true);
                assert.strictEqual(session.isArchived(), true);
                // Unarchive the session
                session.setArchived(false);
                assert.strictEqual(session.isArchived(), false);
            });
        });
        test('should fire onDidChangeSessions when archiving', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                let changeEventFired = false;
                disposables.add(viewModel.onDidChangeSessions(() => {
                    changeEventFired = true;
                }));
                session.setArchived(true);
                assert.strictEqual(changeEventFired, true);
            });
        });
        test('should not fire onDidChangeSessions when archiving with same value', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                session.setArchived(true);
                let changeEventFired = false;
                disposables.add(viewModel.onDidChangeSessions(() => {
                    changeEventFired = true;
                }));
                // Try to archive again with same value
                session.setArchived(true);
                assert.strictEqual(changeEventFired, false);
            });
        });
        test('should preserve archived state from provider', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            archived: true,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.isArchived(), true);
            });
        });
        test('should override provider archived state with user preference', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            archived: true,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.isArchived(), true);
                // User unarchives
                session.setArchived(false);
                assert.strictEqual(session.isArchived(), false);
                // Re-resolve should preserve user preference
                await viewModel.resolve(undefined);
                const sessionAfterResolve = viewModel.sessions[0];
                assert.strictEqual(sessionAfterResolve.isArchived(), false);
            });
        });
    });
    suite('AgentSessionsViewModel - Session Read State', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let instantiationService;
        let viewModel;
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
            instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should mark session as read and unread', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                // Mark as read
                session.setRead(true);
                assert.strictEqual(session.isRead(), true);
                // Mark as unread
                session.setRead(false);
                assert.strictEqual(session.isRead(), false);
            });
        });
        test('should fire onDidChangeSessions when marking as read', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                session.setRead(false); // ensure it's unread first
                let changeEventFired = false;
                disposables.add(viewModel.onDidChangeSessions(() => {
                    changeEventFired = true;
                }));
                session.setRead(true);
                assert.strictEqual(changeEventFired, true);
            });
        });
        test('should not fire onDidChangeSessions when marking as read with same value', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                session.setRead(true);
                let changeEventFired = false;
                disposables.add(viewModel.onDidChangeSessions(() => {
                    changeEventFired = true;
                }));
                // Try to mark as read again with same value
                session.setRead(true);
                assert.strictEqual(changeEventFired, false);
            });
        });
        test('should preserve read state after re-resolve', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                session.setRead(true);
                assert.strictEqual(session.isRead(), true);
                // Re-resolve should preserve read state
                await viewModel.resolve(undefined);
                const sessionAfterResolve = viewModel.sessions[0];
                assert.strictEqual(sessionAfterResolve.isRead(), true);
            });
        });
        test('should consider sessions before initial date as read by default', async () => {
            return runWithFakedTimers({}, async () => {
                // Session with timing before the READ_STATE_INITIAL_DATE (December 8, 2025)
                const oldSessionTiming = {
                    startTime: Date.UTC(2025, 10 /* November */, 1),
                    endTime: Date.UTC(2025, 10 /* November */, 2),
                };
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://old-session'),
                            label: 'Old Session',
                            timing: oldSessionTiming,
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                // Sessions before the initial date should be considered read
                assert.strictEqual(session.isRead(), true);
            });
        });
        test('should consider sessions after initial date as unread by default', async () => {
            return runWithFakedTimers({}, async () => {
                // Session with timing after the READ_STATE_INITIAL_DATE (December 8, 2025)
                const newSessionTiming = {
                    startTime: Date.UTC(2025, 11 /* December */, 10),
                    endTime: Date.UTC(2025, 11 /* December */, 11),
                };
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://new-session'),
                            label: 'New Session',
                            timing: newSessionTiming,
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                // Sessions after the initial date should be considered unread
                assert.strictEqual(session.isRead(), false);
            });
        });
        test('should use endTime for read state comparison when available', async () => {
            return runWithFakedTimers({}, async () => {
                // Session with startTime before initial date but endTime after
                const sessionTiming = {
                    startTime: Date.UTC(2025, 10 /* November */, 1),
                    endTime: Date.UTC(2025, 11 /* December */, 10),
                };
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-with-endtime'),
                            label: 'Session With EndTime',
                            timing: sessionTiming,
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                // Should use endTime (December 10) which is after the initial date
                assert.strictEqual(session.isRead(), false);
            });
        });
        test('should use startTime for read state comparison when endTime is not available', async () => {
            return runWithFakedTimers({}, async () => {
                // Session with only startTime before initial date
                const sessionTiming = {
                    startTime: Date.UTC(2025, 10 /* November */, 1),
                };
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-no-endtime'),
                            label: 'Session Without EndTime',
                            timing: sessionTiming,
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                // Should use startTime (November 1) which is before the initial date
                assert.strictEqual(session.isRead(), true);
            });
        });
    });
    suite('AgentSessionsViewModel - State Tracking', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let instantiationService;
        let viewModel;
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
            instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should track status transitions', async () => {
            return runWithFakedTimers({}, async () => {
                let sessionStatus = 2 /* ChatSessionStatus.InProgress */;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            status: sessionStatus,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions[0].status, 2 /* ChatSessionStatus.InProgress */);
                // Change status
                sessionStatus = 1 /* ChatSessionStatus.Completed */;
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions[0].status, 1 /* ChatSessionStatus.Completed */);
            });
        });
        test('should track inProgressTime when transitioning to InProgress', async () => {
            return runWithFakedTimers({}, async () => {
                let sessionStatus = 1 /* ChatSessionStatus.Completed */;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            status: sessionStatus,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session1 = viewModel.sessions[0];
                assert.strictEqual(session1.timing.inProgressTime, undefined);
                // Change to InProgress
                sessionStatus = 2 /* ChatSessionStatus.InProgress */;
                await viewModel.resolve(undefined);
                const session2 = viewModel.sessions[0];
                assert.notStrictEqual(session2.timing.inProgressTime, undefined);
            });
        });
        test('should track finishedOrFailedTime when transitioning from InProgress', async () => {
            return runWithFakedTimers({}, async () => {
                let sessionStatus = 2 /* ChatSessionStatus.InProgress */;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            status: sessionStatus,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session1 = viewModel.sessions[0];
                assert.strictEqual(session1.timing.finishedOrFailedTime, undefined);
                // Change to Completed
                sessionStatus = 1 /* ChatSessionStatus.Completed */;
                await viewModel.resolve(undefined);
                const session2 = viewModel.sessions[0];
                assert.notStrictEqual(session2.timing.finishedOrFailedTime, undefined);
            });
        });
        test('should clean up state tracking for removed sessions', async () => {
            return runWithFakedTimers({}, async () => {
                let includeSessions = true;
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => {
                        if (includeSessions) {
                            return [
                                makeSimpleSessionItem('session-1'),
                            ];
                        }
                        return [];
                    }
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 1);
                // Remove sessions
                includeSessions = false;
                await viewModel.resolve(undefined);
                assert.strictEqual(viewModel.sessions.length, 0);
            });
        });
    });
    suite('AgentSessionsViewModel - Provider Icons and Names', () => {
        const disposables = new DisposableStore();
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should return correct name for Local provider', () => {
            const name = getAgentSessionProviderName(AgentSessionProviders.Local);
            assert.ok(name.length > 0);
        });
        test('should return correct name for Background provider', () => {
            const name = getAgentSessionProviderName(AgentSessionProviders.Background);
            assert.ok(name.length > 0);
        });
        test('should return correct name for Cloud provider', () => {
            const name = getAgentSessionProviderName(AgentSessionProviders.Cloud);
            assert.ok(name.length > 0);
        });
        test('should return correct icon for Local provider', () => {
            const icon = getAgentSessionProviderIcon(AgentSessionProviders.Local);
            assert.strictEqual(icon.id, Codicon.vm.id);
        });
        test('should return correct icon for Background provider', () => {
            const icon = getAgentSessionProviderIcon(AgentSessionProviders.Background);
            assert.strictEqual(icon.id, Codicon.worktree.id);
        });
        test('should return correct icon for Cloud provider', () => {
            const icon = getAgentSessionProviderIcon(AgentSessionProviders.Cloud);
            assert.strictEqual(icon.id, Codicon.cloud.id);
        });
        test('should handle Local provider type in model', async () => {
            return runWithFakedTimers({}, async () => {
                const instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
                const mockChatSessionsService = new MockChatSessionsService();
                instantiationService.stub(IChatSessionsService, mockChatSessionsService);
                instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
                const provider = {
                    chatSessionType: AgentSessionProviders.Local,
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                const viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.providerType, AgentSessionProviders.Local);
                assert.strictEqual(session.icon.id, Codicon.vm.id);
                assert.strictEqual(session.providerLabel, getAgentSessionProviderName(AgentSessionProviders.Local));
            });
        });
        test('should handle Background provider type in model', async () => {
            return runWithFakedTimers({}, async () => {
                const instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
                const mockChatSessionsService = new MockChatSessionsService();
                instantiationService.stub(IChatSessionsService, mockChatSessionsService);
                instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
                const provider = {
                    chatSessionType: AgentSessionProviders.Background,
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                const viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.providerType, AgentSessionProviders.Background);
                assert.strictEqual(session.icon.id, Codicon.worktree.id);
                assert.strictEqual(session.providerLabel, getAgentSessionProviderName(AgentSessionProviders.Background));
            });
        });
        test('should handle Cloud provider type in model', async () => {
            return runWithFakedTimers({}, async () => {
                const instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
                const mockChatSessionsService = new MockChatSessionsService();
                instantiationService.stub(IChatSessionsService, mockChatSessionsService);
                instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
                const provider = {
                    chatSessionType: AgentSessionProviders.Cloud,
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                const viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.providerType, AgentSessionProviders.Cloud);
                assert.strictEqual(session.icon.id, Codicon.cloud.id);
                assert.strictEqual(session.providerLabel, getAgentSessionProviderName(AgentSessionProviders.Cloud));
            });
        });
        test('should use custom icon from session item', async () => {
            return runWithFakedTimers({}, async () => {
                const instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
                const mockChatSessionsService = new MockChatSessionsService();
                instantiationService.stub(IChatSessionsService, mockChatSessionsService);
                instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
                const customIcon = ThemeIcon.fromId('beaker');
                const provider = {
                    chatSessionType: 'custom-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            iconPath: customIcon,
                            timing: makeNewSessionTiming()
                        }
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                const viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.icon.id, customIcon.id);
            });
        });
        test('should use default icon for custom provider without iconPath', async () => {
            return runWithFakedTimers({}, async () => {
                const instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
                const mockChatSessionsService = new MockChatSessionsService();
                instantiationService.stub(IChatSessionsService, mockChatSessionsService);
                instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
                const provider = {
                    chatSessionType: 'custom-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                const viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                await viewModel.resolve(undefined);
                const session = viewModel.sessions[0];
                assert.strictEqual(session.icon.id, Codicon.terminal.id);
            });
        });
    });
    suite('AgentSessionsViewModel - Cancellation and Lifecycle', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let mockLifecycleService;
        let instantiationService;
        let viewModel;
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            mockLifecycleService = disposables.add(new TestLifecycleService());
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
            instantiationService.stub(ILifecycleService, mockLifecycleService);
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should not resolve if lifecycle will shutdown', async () => {
            return runWithFakedTimers({}, async () => {
                const provider = {
                    chatSessionType: 'test-type',
                    onDidChangeChatSessionItems: Event.None,
                    provideChatSessionItems: async () => [
                        makeSimpleSessionItem('session-1'),
                    ]
                };
                mockChatSessionsService.registerChatSessionItemProvider(provider);
                viewModel = disposables.add(instantiationService.createInstance(AgentSessionsModel));
                // Set willShutdown to true
                mockLifecycleService.willShutdown = true;
                await viewModel.resolve(undefined);
                // Should not resolve sessions
                assert.strictEqual(viewModel.sessions.length, 0);
            });
        });
    });
    suite('AgentSessionsFilter - Dynamic Provider Registration', () => {
        const disposables = new DisposableStore();
        let mockChatSessionsService;
        let instantiationService;
        setup(() => {
            mockChatSessionsService = new MockChatSessionsService();
            instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
            instantiationService.stub(IChatSessionsService, mockChatSessionsService);
        });
        teardown(() => {
            disposables.clear();
        });
        ensureNoDisposablesAreLeakedInTestSuite();
        test('should respond to onDidChangeAvailability', () => {
            const filter = disposables.add(instantiationService.createInstance(AgentSessionsFilter, { filterMenuId: MenuId.ViewTitle }));
            disposables.add(filter.onDidChange(() => {
                // Event handler registered to verify filter responds to availability changes
            }));
            // Trigger availability change
            mockChatSessionsService.fireDidChangeAvailability();
            // Filter should update its actions (internally)
            // We can't directly test action registration but we verified event handling
        });
    });
}); // End of Agent Sessions suite
function makeSimpleSessionItem(id, overrides) {
    return {
        resource: URI.parse(`test://${id}`),
        label: `Session ${id}`,
        timing: makeNewSessionTiming(),
        ...overrides
    };
}
function makeNewSessionTiming() {
    return {
        startTime: Date.now(),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uVmlld01vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvYWdlbnRTZXNzaW9uVmlld01vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFpQixjQUFjLEVBQUUsb0JBQW9CLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNySyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN6RixPQUFPLEVBQWlFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEssT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, ILogService, NullLogger, NullLogService } from '../../../../../platform/log/common/log.js';
import { mcpAccessConfig } from '../../../../../platform/mcp/common/mcpManagement.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistry } from '../../common/mcpRegistry.js';
import { McpTaskManager } from '../../common/mcpTaskManager.js';
import { McpStartServerInteraction } from '../../common/mcpTypes.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
class TestConfigurationResolverService {
    constructor() {
        this.interactiveCounter = 0;
        // Used to simulate stored/resolved variables
        this.resolvedVariables = new Map();
        // Add some test variables
        this.resolvedVariables.set('workspaceFolder', '/test/workspace');
        this.resolvedVariables.set('fileBasename', 'test.txt');
    }
    resolveAsync(folder, value) {
        const parsed = ConfigurationResolverExpression.parse(value);
        for (const variable of parsed.unresolved()) {
            const resolved = this.resolvedVariables.get(variable.inner);
            if (resolved) {
                parsed.resolve(variable, resolved);
            }
        }
        return Promise.resolve(parsed.toObject());
    }
    resolveWithInteraction(folder, config, section, variables, target) {
        const parsed = ConfigurationResolverExpression.parse(config);
        // For testing, we simulate interaction by returning a map with some variables
        const result = new Map();
        result.set('input:testInteractive', `interactiveValue${this.interactiveCounter++}`);
        result.set('command:testCommand', `commandOutput${this.interactiveCounter++}}`);
        // If variables are provided, include those too
        for (const [k, v] of result.entries()) {
            const replacement = {
                id: '${' + k + '}',
                inner: k,
                name: k.split(':')[0] || k,
                arg: k.split(':')[1]
            };
            parsed.resolve(replacement, v);
        }
        return Promise.resolve(result);
    }
}
class TestMcpHostDelegate {
    constructor() {
        this.priority = 0;
    }
    substituteVariables(serverDefinition, launch) {
        return Promise.resolve(launch);
    }
    canStart() {
        return true;
    }
    start() {
        return new TestMcpMessageTransport();
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
class TestDialogService {
    constructor() {
        this._promptResult = true;
        this._promptSpy = sinon.stub();
        this._promptSpy.callsFake(() => {
            return Promise.resolve({ result: this._promptResult });
        });
    }
    setPromptResult(result) {
        this._promptResult = result;
    }
    get promptSpy() {
        return this._promptSpy;
    }
    prompt(options) {
        return this._promptSpy(options);
    }
}
class TestMcpRegistry extends McpRegistry {
    _promptForTrustOpenDialog() {
        return Promise.resolve(this.nextDefinitionIdsToTrust);
    }
}
suite('Workbench - MCP - Registry', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let registry;
    let testStorageService;
    let testConfigResolverService;
    let testDialogService;
    let testCollection;
    let baseDefinition;
    let configurationService;
    let logger;
    let trustNonceBearer;
    let taskManager;
    setup(() => {
        testConfigResolverService = new TestConfigurationResolverService();
        testStorageService = store.add(new TestStorageService());
        testDialogService = new TestDialogService();
        configurationService = new TestConfigurationService({ [mcpAccessConfig]: "all" /* McpAccessValue.All */ });
        trustNonceBearer = { trustedAtNonce: undefined };
        const services = new ServiceCollection([IConfigurationService, configurationService], [IConfigurationResolverService, testConfigResolverService], [IStorageService, testStorageService], [ISecretStorageService, new TestSecretStorageService()], [ILoggerService, store.add(new TestLoggerService())], [ILogService, store.add(new NullLogService())], [IOutputService, upcast({ showChannel: () => { } })], [IDialogService, testDialogService], [IProductService, {}]);
        logger = new NullLogger();
        taskManager = store.add(new McpTaskManager());
        const instaService = store.add(new TestInstantiationService(services));
        registry = store.add(instaService.createInstance(TestMcpRegistry));
        // Create test collection that can be reused
        testCollection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            trustBehavior: 0 /* McpServerTrust.Kind.Trusted */,
            scope: -1 /* StorageScope.APPLICATION */,
            configTarget: 2 /* ConfigurationTarget.USER */,
        };
        // Create base definition that can be reused
        baseDefinition = {
            id: 'test-server',
            label: 'Test Server',
            cacheNonce: 'a',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: '/test',
            }
        };
    });
    test('registerCollection adds collection to registry', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        assert.strictEqual(registry.collections.get()[0], testCollection);
        disposable.dispose();
        assert.strictEqual(registry.collections.get().length, 0);
    });
    test('collections are not visible when not enabled', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        configurationService.setUserConfiguration(mcpAccessConfig, "none" /* McpAccessValue.None */);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([mcpAccessConfig]),
            change: { keys: [mcpAccessConfig], overrides: [] },
            source: 2 /* ConfigurationTarget.USER */
        });
        assert.strictEqual(registry.collections.get().length, 0);
        configurationService.setUserConfiguration(mcpAccessConfig, "all" /* McpAccessValue.All */);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([mcpAccessConfig]),
            change: { keys: [mcpAccessConfig], overrides: [] },
            source: 2 /* ConfigurationTarget.USER */
        });
    });
    test('registerDelegate adds delegate to registry', () => {
        const delegate = new TestMcpHostDelegate();
        const disposable = registry.registerDelegate(delegate);
        store.add(disposable);
        assert.strictEqual(registry.delegates.get().length, 1);
        assert.strictEqual(registry.delegates.get()[0], delegate);
        disposable.dispose();
        assert.strictEqual(registry.delegates.get().length, 0);
    });
    test('resolveConnection creates connection with resolved variables and memorizes them until cleared', async () => {
        const definition = {
            ...baseDefinition,
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: '${workspaceFolder}/cmd',
                args: ['--file', '${fileBasename}'],
                env: {
                    PATH: '${input:testInteractive}'
                },
                envFile: undefined,
                cwd: '/test',
            },
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(testCollection));
        const connection = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer, taskManager });
        assert.ok(connection);
        assert.strictEqual(connection.definition, definition);
        assert.strictEqual(connection.launchDefinition.command, '/test/workspace/cmd');
        assert.strictEqual(connection.launchDefinition.env.PATH, 'interactiveValue0');
        connection.dispose();
        const connection2 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer, taskManager });
        assert.ok(connection2);
        assert.strictEqual(connection2.launchDefinition.env.PATH, 'interactiveValue0');
        connection2.dispose();
        registry.clearSavedInputs(1 /* StorageScope.WORKSPACE */);
        const connection3 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer, taskManager });
        assert.ok(connection3);
        assert.strictEqual(connection3.launchDefinition.env.PATH, 'interactiveValue4');
        connection3.dispose();
    });
    test('resolveConnection uses user-provided launch configuration', async () => {
        // Create a collection with custom launch resolver
        const customCollection = {
            ...testCollection,
            resolveServerLanch: async (def) => {
                return {
                    ...def.launch,
                    env: { CUSTOM_ENV: 'value' },
                };
            }
        };
        // Create a definition with variable replacement
        const definition = {
            ...baseDefinition,
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(customCollection));
        // Resolve connection should use the custom launch configuration
        const connection = await registry.resolveConnection({
            collectionRef: customCollection,
            definitionRef: definition,
            logger,
            trustNonceBearer,
            taskManager,
        });
        assert.ok(connection);
        // Verify the launch configuration passed to _replaceVariablesInLaunch was the custom one
        assert.deepStrictEqual(connection.launchDefinition.env, { CUSTOM_ENV: 'value' });
        connection.dispose();
    });
    suite('Lazy Collections', () => {
        let lazyCollection;
        let normalCollection;
        let removedCalled;
        setup(() => {
            removedCalled = false;
            lazyCollection = {
                ...testCollection,
                id: 'lazy-collection',
                lazy: {
                    isCached: false,
                    load: () => Promise.resolve(),
                    removed: () => { removedCalled = true; }
                }
            };
            normalCollection = {
                ...testCollection,
                id: 'lazy-collection',
                serverDefinitions: observableValue('serverDefs', [baseDefinition])
            };
        });
        test('registers lazy collection', () => {
            const disposable = registry.registerCollection(lazyCollection);
            store.add(disposable);
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.collections.get()[0], lazyCollection);
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
        });
        test('lazy collection is replaced by normal collection', () => {
            store.add(registry.registerCollection(lazyCollection));
            store.add(registry.registerCollection(normalCollection));
            const collections = registry.collections.get();
            assert.strictEqual(collections.length, 1);
            assert.strictEqual(collections[0], normalCollection);
            assert.strictEqual(collections[0].lazy, undefined);
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
        });
        test('lazyCollectionState updates correctly during loading', async () => {
            lazyCollection = {
                ...lazyCollection,
                lazy: {
                    ...lazyCollection.lazy,
                    load: async () => {
                        await timeout(0);
                        store.add(registry.registerCollection(normalCollection));
                        return Promise.resolve();
                    }
                }
            };
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
            const loadingPromise = registry.discoverCollections();
            assert.strictEqual(registry.lazyCollectionState.get().state, 1 /* LazyCollectionState.LoadingUnknown */);
            await loadingPromise;
            // The collection wasn't replaced, so it should be removed
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
            assert.strictEqual(removedCalled, false);
        });
        test('removed callback is called when lazy collection is not replaced', async () => {
            store.add(registry.registerCollection(lazyCollection));
            await registry.discoverCollections();
            assert.strictEqual(removedCalled, true);
        });
        test('cached lazy collections are tracked correctly', () => {
            lazyCollection.lazy.isCached = true;
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
            // Adding an uncached lazy collection changes the state
            const uncachedLazy = {
                ...lazyCollection,
                id: 'uncached-lazy',
                lazy: {
                    ...lazyCollection.lazy,
                    isCached: false
                }
            };
            store.add(registry.registerCollection(uncachedLazy));
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
        });
    });
    suite('Trust Flow', () => {
        /**
         * Helper to create a test MCP collection with a specific trust behavior
         */
        function createTestCollection(trustBehavior, id = 'test-collection') {
            return {
                id,
                label: 'Test Collection',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                trustBehavior,
                scope: -1 /* StorageScope.APPLICATION */,
                configTarget: 2 /* ConfigurationTarget.USER */,
            };
        }
        /**
         * Helper to create a test server definition with a specific cache nonce
         */
        function createTestDefinition(id = 'test-server', cacheNonce = 'nonce-a') {
            return {
                id,
                label: 'Test Server',
                cacheNonce,
                launch: {
                    type: 1 /* McpServerTransportType.Stdio */,
                    command: 'test-command',
                    args: [],
                    env: {},
                    envFile: undefined,
                    cwd: '/test',
                }
            };
        }
        /**
         * Helper to set up a basic registry with delegate and collection
         */
        function setupRegistry(trustBehavior = 1 /* McpServerTrust.Kind.TrustedOnNonce */, cacheNonce = 'nonce-a') {
            const delegate = new TestMcpHostDelegate();
            store.add(registry.registerDelegate(delegate));
            const collection = createTestCollection(trustBehavior);
            const definition = createTestDefinition('test-server', cacheNonce);
            collection.serverDefinitions.set([definition], undefined);
            store.add(registry.registerCollection(collection));
            return { collection, definition, delegate };
        }
        test('trusted collection allows connection without prompting', async () => {
            const { collection, definition } = setupRegistry(0 /* McpServerTrust.Kind.Trusted */);
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                taskManager,
            });
            assert.ok(connection, 'Connection should be created for trusted collection');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('nonce-based trust allows connection when nonce matches', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-a');
            trustNonceBearer.trustedAtNonce = 'nonce-a';
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                taskManager,
            });
            assert.ok(connection, 'Connection should be created when nonce matches');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('nonce-based trust prompts when nonce changes', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            registry.nextDefinitionIdsToTrust = [definition.id]; // User trusts the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer, taskManager,
            });
            assert.ok(connection, 'Connection should be created when user trusts');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            connection.dispose();
        });
        test('nonce-based trust denies connection when user rejects', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            registry.nextDefinitionIdsToTrust = []; // User does not trust the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer, taskManager,
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created when user rejects');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, '__vscode_not_trusted', 'Should mark as explicitly not trusted');
        });
        test('autoTrustChanges bypasses prompt when nonce changes', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                autoTrustChanges: true,
                taskManager,
            });
            assert.ok(connection, 'Connection should be created with autoTrustChanges');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('promptType "never" skips prompt and fails silently', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'never',
                taskManager,
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created with promptType "never"');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
        });
        test('promptType "only-new" skips previously untrusted servers', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = '__vscode_not_trusted'; // Previously explicitly denied
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'only-new',
                taskManager,
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created for previously untrusted server');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
        });
        test('promptType "all-untrusted" prompts for previously untrusted servers', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = '__vscode_not_trusted'; // Previously explicitly denied
            registry.nextDefinitionIdsToTrust = [definition.id]; // User now trusts the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'all-untrusted',
                taskManager,
            });
            assert.ok(connection, 'Connection should be created when user trusts previously untrusted server');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            connection.dispose();
        });
        test('concurrent resolveConnection calls with same interaction are grouped', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // Trust both servers
            registry.nextDefinitionIdsToTrust = [definition.id, definition2.id];
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                    taskManager,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                    taskManager,
                })
            ]);
            assert.ok(connection1, 'First connection should be created');
            assert.ok(connection2, 'Second connection should be created');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'First nonce should be updated');
            assert.strictEqual(trustNonceBearer2.trustedAtNonce, 'nonce-c', 'Second nonce should be updated');
            connection1.dispose();
            connection2.dispose();
        });
        test('user cancelling trust dialog returns undefined for all pending connections', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // User cancels the dialog
            registry.nextDefinitionIdsToTrust = undefined;
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                    taskManager,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                    taskManager,
                })
            ]);
            assert.strictEqual(connection1, undefined, 'First connection should not be created when user cancels');
            assert.strictEqual(connection2, undefined, 'Second connection should not be created when user cancels');
        });
        test('partial trust selection in grouped interaction', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // User trusts only the first server
            registry.nextDefinitionIdsToTrust = [definition.id];
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                    taskManager,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                    taskManager,
                })
            ]);
            assert.ok(connection1, 'First connection should be created when trusted');
            assert.strictEqual(connection2, undefined, 'Second connection should not be created when not trusted');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'First nonce should be updated');
            assert.strictEqual(trustNonceBearer2.trustedAtNonce, '__vscode_not_trusted', 'Second nonce should be marked as not trusted');
            connection1.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwUmVnaXN0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUF1QixlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFrRCxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RKLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQVcsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQVcsY0FBYyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDN0gsT0FBTyxFQUFFLGVBQWUsRUFBa0IsTUFBTSxxREFBcUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3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
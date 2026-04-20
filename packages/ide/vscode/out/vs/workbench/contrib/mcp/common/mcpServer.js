/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var McpServer_1;
import { AsyncIterableProducer, raceCancellationError, Sequencer } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Iterable } from '../../../../base/common/iterator.js';
import * as json from '../../../../base/common/json.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { mapValues } from '../../../../base/common/objects.js';
import { autorun, autorunSelfDisposable, derived, disposableObservableValue, observableFromEvent, ObservablePromise, observableValue, transaction } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { createURITransformer } from '../../../../base/common/uriTransformer.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { mcpActivationEvent } from './mcpConfiguration.js';
import { McpDevModeServerAttache } from './mcpDevMode.js';
import { McpIcons, parseAndValidateMcpIcon } from './mcpIcons.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpTaskManager } from './mcpTaskManager.js';
import { extensionMcpCollectionPrefix, IMcpElicitationService, IMcpSamplingService, McpConnectionFailedError, McpConnectionState, mcpPromptReplaceSpecialChars, McpResourceURI, MpcResponseError, UserInteractionRequiredError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
import { UriTemplate } from './uriTemplate.js';
const emptyToolEntry = {
    serverName: undefined,
    serverIcons: [],
    serverInstructions: undefined,
    trustedAtNonce: undefined,
    nonce: undefined,
    tools: [],
    prompts: undefined,
    capabilities: undefined,
};
const toolInvalidCharRe = /[^a-z0-9_-]/gi;
let McpServerMetadataCache = class McpServerMetadataCache extends Disposable {
    constructor(scope, storageService) {
        super();
        this.didChange = false;
        this.cache = new LRUCache(128);
        this.extensionServers = new Map();
        const storageKey = 'mcpToolCache';
        this._register(storageService.onWillSaveState(() => {
            if (this.didChange) {
                storageService.store(storageKey, {
                    extensionServers: [...this.extensionServers],
                    serverTools: this.cache.toJSON(),
                }, scope, 1 /* StorageTarget.MACHINE */);
                this.didChange = false;
            }
        }));
        try {
            const cached = storageService.getObject(storageKey, scope);
            this.extensionServers = new Map(cached?.extensionServers ?? []);
            cached?.serverTools?.forEach(([k, v]) => this.cache.set(k, v));
        }
        catch {
            // ignored
        }
    }
    /** Resets the cache for primitives and extension servers */
    reset() {
        this.cache.clear();
        this.extensionServers.clear();
        this.didChange = true;
    }
    /** Gets cached primitives for a server (used before a server is running) */
    get(definitionId) {
        return this.cache.get(definitionId);
    }
    /** Sets cached primitives for a server */
    store(definitionId, entry) {
        const prev = this.get(definitionId) || emptyToolEntry;
        this.cache.set(definitionId, { ...prev, ...entry });
        this.didChange = true;
    }
    /** Gets cached servers for a collection (used for extensions, before the extension activates) */
    getServers(collectionId) {
        return this.extensionServers.get(collectionId);
    }
    /** Sets cached servers for a collection */
    storeServers(collectionId, entry) {
        if (entry) {
            this.extensionServers.set(collectionId, entry);
        }
        else {
            this.extensionServers.delete(collectionId);
        }
        this.didChange = true;
    }
};
McpServerMetadataCache = __decorate([
    __param(1, IStorageService)
], McpServerMetadataCache);
export { McpServerMetadataCache };
class CachedPrimitive {
    /**
     * @param _definitionId Server definition ID
     * @param _cache Metadata cache instance
     * @param _fromStaticDefinition Static definition that came with the server.
     * This should ONLY have a value if it should be used instead of whatever
     * is currently in the cache.
     * @param _fromCache Pull the value from the cache entry.
     * @param _toT Transform the value to the observable type.
     * @param defaultValue Default value if no cache entry.
     */
    constructor(_definitionId, _cache, _fromStaticDefinition, _fromCache, _toT, defaultValue) {
        this._definitionId = _definitionId;
        this._cache = _cache;
        this._fromStaticDefinition = _fromStaticDefinition;
        this._fromCache = _fromCache;
        this._toT = _toT;
        this.defaultValue = defaultValue;
        this.fromServerPromise = observableValue(this, undefined);
        this.fromServer = derived(reader => this.fromServerPromise.read(reader)?.promiseResult.read(reader)?.data);
        this.value = derived(reader => {
            const serverTools = this.fromServer.read(reader);
            const definitions = serverTools?.data ?? this._fromStaticDefinition?.read(reader) ?? this.fromCache?.data ?? this.defaultValue;
            return this._toT(definitions, reader);
        });
    }
    get fromCache() {
        const c = this._cache.get(this._definitionId);
        return c ? { data: this._fromCache(c), nonce: c.nonce } : undefined;
    }
    hasStaticDefinition(reader) {
        return !!this._fromStaticDefinition?.read(reader);
    }
}
let McpServer = McpServer_1 = class McpServer extends Disposable {
    /**
     * Helper function to call the function on the handler once it's online. The
     * connection started if it is not already.
     */
    static async callOn(server, fn, token = CancellationToken.None) {
        await server.start({ promptType: 'all-untrusted' }); // idempotent
        let ranOnce = false;
        let d;
        const callPromise = new Promise((resolve, reject) => {
            d = autorun(reader => {
                const connection = server.connection.read(reader);
                if (!connection || ranOnce) {
                    return;
                }
                const handler = connection.handler.read(reader);
                if (!handler) {
                    const state = connection.state.read(reader);
                    if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                        reject(new McpConnectionFailedError(`MCP server could not be started: ${state.message}`));
                        return;
                    }
                    else if (state.state === 0 /* McpConnectionState.Kind.Stopped */) {
                        reject(new McpConnectionFailedError('MCP server has stopped'));
                        return;
                    }
                    else {
                        // keep waiting for handler
                        return;
                    }
                }
                resolve(fn(handler));
                ranOnce = true; // aggressive prevent multiple racey calls, don't dispose because autorun is sync
            });
        });
        return raceCancellationError(callPromise, token).finally(() => d.dispose());
    }
    get capabilities() {
        return this._capabilities.value;
    }
    get tools() {
        return this._tools.value;
    }
    get prompts() {
        return this._prompts.value;
    }
    get serverMetadata() {
        return this._serverMetadata.value;
    }
    get trustedAtNonce() {
        return this._primitiveCache.get(this.definition.id)?.trustedAtNonce;
    }
    set trustedAtNonce(nonce) {
        this._primitiveCache.store(this.definition.id, { trustedAtNonce: nonce });
    }
    constructor(initialCollection, definition, explicitRoots, _requiresExtensionActivation, _primitiveCache, toolPrefix, _mcpRegistry, workspacesService, _extensionService, _loggerService, _outputService, _telemetryService, _commandService, _instantiationService, _notificationService, _openerService, _samplingService, _elicitationService, environmentService) {
        super();
        this.definition = definition;
        this._requiresExtensionActivation = _requiresExtensionActivation;
        this._primitiveCache = _primitiveCache;
        this._mcpRegistry = _mcpRegistry;
        this._extensionService = _extensionService;
        this._loggerService = _loggerService;
        this._outputService = _outputService;
        this._telemetryService = _telemetryService;
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._openerService = _openerService;
        this._samplingService = _samplingService;
        this._elicitationService = _elicitationService;
        /** Shared task manager that survives reconnections */
        this._taskManager = this._register(new McpTaskManager());
        this._connectionSequencer = new Sequencer();
        this._connection = this._register(disposableObservableValue(this, undefined));
        this.connection = this._connection;
        this.connectionState = derived(reader => this._connection.read(reader)?.state.read(reader) ?? { state: 0 /* McpConnectionState.Kind.Stopped */ });
        this.cacheState = derived(reader => {
            const currentNonce = () => this._fullDefinitions.read(reader)?.server?.cacheNonce;
            const stateWhenServingFromCache = () => {
                if (this._tools.hasStaticDefinition(reader)) {
                    return 1 /* McpServerCacheState.Cached */;
                }
                if (!this._tools.fromCache) {
                    return 0 /* McpServerCacheState.Unknown */;
                }
                return currentNonce() === this._tools.fromCache.nonce ? 1 /* McpServerCacheState.Cached */ : 2 /* McpServerCacheState.Outdated */;
            };
            const fromServer = this._tools.fromServerPromise.read(reader);
            const connectionState = this.connectionState.read(reader);
            const isIdle = McpConnectionState.canBeStarted(connectionState.state) || !fromServer;
            if (isIdle) {
                return stateWhenServingFromCache();
            }
            const fromServerResult = fromServer?.promiseResult.read(reader);
            if (!fromServerResult) {
                return this._tools.fromCache ? 4 /* McpServerCacheState.RefreshingFromCached */ : 3 /* McpServerCacheState.RefreshingFromUnknown */;
            }
            if (fromServerResult.error) {
                return stateWhenServingFromCache();
            }
            return fromServerResult.data?.nonce === currentNonce() ? 5 /* McpServerCacheState.Live */ : 2 /* McpServerCacheState.Outdated */;
        });
        this._lastModeDebugged = false;
        /** Count of running tool calls, used to detect if sampling is during an LM call */
        this.runningToolCalls = new Set();
        this.collection = initialCollection;
        this._fullDefinitions = this._mcpRegistry.getServerDefinition(this.collection, this.definition);
        this._loggerId = `mcpServer.${definition.id}`;
        this._logger = this._register(_loggerService.createLogger(this._loggerId, { hidden: true, name: `MCP: ${definition.label}` }));
        const that = this;
        this._register(this._instantiationService.createInstance(McpDevModeServerAttache, this, { get lastModeDebugged() { return that._lastModeDebugged; } }));
        // If the logger is disposed but not deregistered, then the disposed instance
        // is reused and no-ops. todo@sandy081 this seems like a bug.
        this._register(toDisposable(() => _loggerService.deregisterLogger(this._loggerId)));
        // 1. Reflect workspaces into the MCP roots
        const workspaces = explicitRoots
            ? observableValue(this, explicitRoots.map(uri => ({ uri, name: basename(uri) })))
            : observableFromEvent(this, workspacesService.onDidChangeWorkspaceFolders, () => workspacesService.getWorkspace().folders);
        const uriTransformer = environmentService.remoteAuthority ? createURITransformer(environmentService.remoteAuthority) : undefined;
        this._register(autorun(reader => {
            const cnx = this._connection.read(reader)?.handler.read(reader);
            if (!cnx) {
                return;
            }
            cnx.roots = workspaces.read(reader)
                .filter(w => w.uri.authority === (initialCollection.remoteAuthority || ''))
                .map(w => {
                let uri = URI.from(uriTransformer?.transformIncoming(w.uri) ?? w.uri);
                if (uri.scheme === Schemas.file) { // #271812
                    uri = URI.file(normalizeDriveLetter(uri.fsPath, true));
                }
                return { name: w.name, uri: uri.toString() };
            });
        }));
        // 2. Populate this.tools when we connect to a server.
        this._register(autorun(reader => {
            const cnx = this._connection.read(reader);
            const handler = cnx?.handler.read(reader);
            if (handler) {
                this._populateLiveData(handler, cnx?.definition.cacheNonce, reader.store);
            }
            else if (this._tools) {
                this.resetLiveData();
            }
        }));
        const staticMetadata = derived(reader => {
            const def = this._fullDefinitions.read(reader).server;
            return def && def.cacheNonce !== this._tools.fromCache?.nonce ? def.staticMetadata : undefined;
        });
        // 3. Publish tools
        this._tools = new CachedPrimitive(this.definition.id, this._primitiveCache, staticMetadata
            .map(m => {
            const tools = m?.tools?.filter(t => t.availability === 0 /* McpServerStaticToolAvailability.Initial */).map(t => t.definition);
            return tools?.length ? new ObservablePromise(this._getValidatedTools(tools)) : undefined;
        })
            .map((o, reader) => o?.promiseResult.read(reader)?.data), (entry) => entry.tools, (entry) => entry.map(def => this._instantiationService.createInstance(McpTool, this, toolPrefix, def)).sort((a, b) => a.compare(b)), []);
        // 4. Publish prompts
        this._prompts = new CachedPrimitive(this.definition.id, this._primitiveCache, undefined, (entry) => entry.prompts || [], (entry) => entry.map(e => new McpPrompt(this, e)), []);
        this._serverMetadata = new CachedPrimitive(this.definition.id, this._primitiveCache, staticMetadata.map(m => m ? this._toStoredMetadata(m?.serverInfo, m?.instructions) : undefined), (entry) => ({ serverName: entry.serverName, serverInstructions: entry.serverInstructions, serverIcons: entry.serverIcons }), (entry) => ({ serverName: entry?.serverName, serverInstructions: entry?.serverInstructions, icons: McpIcons.fromStored(entry?.serverIcons) }), undefined);
        this._capabilities = new CachedPrimitive(this.definition.id, this._primitiveCache, staticMetadata.map(m => m?.capabilities !== undefined ? encodeCapabilities(m.capabilities) : undefined), (entry) => entry.capabilities, (entry) => entry, undefined);
    }
    readDefinitions() {
        return this._fullDefinitions;
    }
    showOutput(preserveFocus) {
        this._loggerService.setVisibility(this._loggerId, true);
        return this._outputService.showChannel(this._loggerId, preserveFocus);
    }
    resources(token) {
        const cts = new CancellationTokenSource(token);
        return new AsyncIterableProducer(async (emitter) => {
            await McpServer_1.callOn(this, async (handler) => {
                for await (const resource of handler.listResourcesIterable({}, cts.token)) {
                    emitter.emitOne(resource.map(r => new McpResource(this, r, McpIcons.fromParsed(this._parseIcons(r)))));
                    if (cts.token.isCancellationRequested) {
                        return;
                    }
                }
            });
        }, () => cts.dispose(true));
    }
    resourceTemplates(token) {
        return McpServer_1.callOn(this, async (handler) => {
            const templates = await handler.listResourceTemplates({}, token);
            return templates.map(t => new McpResourceTemplate(this, t, McpIcons.fromParsed(this._parseIcons(t))));
        }, token);
    }
    start({ interaction, autoTrustChanges, promptType, debug, errorOnUserInteraction } = {}) {
        interaction?.participants.set(this.definition.id, { s: 'unknown' });
        return this._connectionSequencer.queue(async () => {
            const activationEvent = mcpActivationEvent(this.collection.id.slice(extensionMcpCollectionPrefix.length));
            if (this._requiresExtensionActivation && !this._extensionService.activationEventIsDone(activationEvent)) {
                await this._extensionService.activateByEvent(activationEvent);
                await Promise.all(this._mcpRegistry.delegates.get()
                    .map(r => r.waitForInitialProviderPromises()));
                // This can happen if the server was created from a cached MCP server seen
                // from an extension, but then it wasn't registered when the extension activated.
                if (this._store.isDisposed) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
            }
            let connection = this._connection.get();
            if (connection && McpConnectionState.canBeStarted(connection.state.get().state)) {
                connection.dispose();
                connection = undefined;
                this._connection.set(connection, undefined);
            }
            if (!connection) {
                this._lastModeDebugged = !!debug;
                const that = this;
                connection = await this._mcpRegistry.resolveConnection({
                    interaction,
                    autoTrustChanges,
                    promptType,
                    trustNonceBearer: {
                        get trustedAtNonce() { return that.trustedAtNonce; },
                        set trustedAtNonce(nonce) { that.trustedAtNonce = nonce; }
                    },
                    logger: this._logger,
                    collectionRef: this.collection,
                    definitionRef: this.definition,
                    debug,
                    errorOnUserInteraction,
                    taskManager: this._taskManager,
                });
                if (!connection) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                if (this._store.isDisposed) {
                    connection.dispose();
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                this._connection.set(connection, undefined);
                if (connection.definition.devMode) {
                    this.showOutput();
                }
            }
            const start = Date.now();
            let state = await connection.start({
                createMessageRequestHandler: (params, token) => this._samplingService.sample({
                    isDuringToolCall: this.runningToolCalls.size > 0,
                    server: this,
                    params,
                }, token).then(r => r.sample),
                elicitationRequestHandler: async (req, token) => {
                    const serverInfo = connection.handler.get()?.serverInfo;
                    if (serverInfo) {
                        this._telemetryService.publicLog2('mcp.elicitationRequested', {
                            serverName: serverInfo.name,
                            serverVersion: serverInfo.version,
                        });
                    }
                    const r = await this._elicitationService.elicit(this, Iterable.first(this.runningToolCalls), req, token || CancellationToken.None);
                    r.dispose();
                    return r.value;
                }
            });
            this._telemetryService.publicLog2('mcp/serverBootState', {
                state: McpConnectionState.toKindString(state.state),
                time: Date.now() - start,
            });
            if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                this.showInteractiveError(connection, state, debug);
            }
            // MCP servers that need auth can 'start' but will stop with an interaction-needed
            // error they first make a request. In this case, wait until the handler fully
            // initializes before resolving (throwing if it ends up needing auth)
            if (errorOnUserInteraction && state.state === 2 /* McpConnectionState.Kind.Running */) {
                let disposable;
                state = await new Promise((resolve, reject) => {
                    disposable = autorun(reader => {
                        const handler = connection.handler.read(reader);
                        if (handler) {
                            resolve(state);
                        }
                        const s = connection.state.read(reader);
                        if (s.state === 0 /* McpConnectionState.Kind.Stopped */ && s.reason === 'needs-user-interaction') {
                            reject(new UserInteractionRequiredError('auth'));
                        }
                        if (!McpConnectionState.isRunning(s)) {
                            resolve(s);
                        }
                    });
                }).finally(() => disposable.dispose());
            }
            return state;
        }).finally(() => {
            interaction?.participants.set(this.definition.id, { s: 'resolved' });
        });
    }
    showInteractiveError(cnx, error, debug) {
        if (error.code === 'ENOENT' && cnx.launchDefinition.type === 1 /* McpServerTransportType.Stdio */) {
            let docsLink;
            switch (cnx.launchDefinition.command) {
                case 'uvx':
                    docsLink = `https://aka.ms/vscode-mcp-install/uvx`;
                    break;
                case 'npx':
                    docsLink = `https://aka.ms/vscode-mcp-install/npx`;
                    break;
                case 'dnx':
                    docsLink = `https://aka.ms/vscode-mcp-install/dnx`;
                    break;
                case 'dotnet':
                    docsLink = `https://aka.ms/vscode-mcp-install/dotnet`;
                    break;
            }
            const options = [{
                    label: localize('mcp.command.showOutput', "Show Output"),
                    run: () => this.showOutput(),
                }];
            if (cnx.definition.devMode?.debug?.type === 'debugpy' && debug) {
                this._notificationService.prompt(Severity.Error, localize('mcpDebugPyHelp', 'The command "{0}" was not found. You can specify the path to debugpy in the `dev.debug.debugpyPath` option.', cnx.launchDefinition.command, cnx.definition.label), [...options, {
                        label: localize('mcpViewDocs', 'View Docs'),
                        run: () => this._openerService.open(URI.parse('https://aka.ms/vscode-mcp-install/debugpy')),
                    }]);
                return;
            }
            if (docsLink) {
                options.push({
                    label: localize('mcpServerInstall', 'Install {0}', cnx.launchDefinition.command),
                    run: () => this._openerService.open(URI.parse(docsLink)),
                });
            }
            this._notificationService.prompt(Severity.Error, localize('mcpServerNotFound', 'The command "{0}" needed to run {1} was not found.', cnx.launchDefinition.command, cnx.definition.label), options);
        }
        else {
            this._notificationService.warn(localize('mcpServerError', 'The MCP server {0} could not be started: {1}', cnx.definition.label, error.message));
        }
    }
    stop() {
        return this._connection.get()?.stop() || Promise.resolve();
    }
    /** Waits for any ongoing tools to be refreshed before resolving. */
    awaitToolRefresh() {
        return new Promise(resolve => {
            autorunSelfDisposable(reader => {
                const promise = this._tools.fromServerPromise.read(reader);
                const result = promise?.promiseResult.read(reader);
                if (result) {
                    resolve();
                }
            });
        });
    }
    resetLiveData() {
        transaction(tx => {
            this._tools.fromServerPromise.set(undefined, tx);
            this._prompts.fromServerPromise.set(undefined, tx);
        });
    }
    async _normalizeTool(originalTool) {
        const tool = {
            ...originalTool,
            serverToolName: originalTool.name,
            _icons: this._parseIcons(originalTool),
        };
        if (!tool.description) {
            // Ensure a description is provided for each tool, #243919
            this._logger.warn(`Tool ${tool.name} does not have a description. Tools must be accurately described to be called`);
            tool.description = '<empty>';
        }
        if (toolInvalidCharRe.test(tool.name)) {
            this._logger.warn(`Tool ${JSON.stringify(tool.name)} is invalid. Tools names may only contain [a-z0-9_-]`);
            tool.name = tool.name.replace(toolInvalidCharRe, '_');
        }
        let diagnostics = [];
        const toolJson = JSON.stringify(tool.inputSchema);
        try {
            const schemaUri = URI.parse('https://json-schema.org/draft-07/schema');
            diagnostics = await this._commandService.executeCommand('json.validate', schemaUri, toolJson) || [];
        }
        catch (e) {
            // ignored (error in json extension?);
        }
        if (!diagnostics.length) {
            return tool;
        }
        // because it's all one line from JSON.stringify, we can treat characters as offsets.
        const tree = json.parseTree(toolJson);
        const messages = diagnostics.map(d => {
            const node = json.findNodeAtOffset(tree, d.range[0].character);
            const path = node && `/${json.getNodePath(node).join('/')}`;
            return d.message + (path ? ` (at ${path})` : '');
        });
        return { error: messages };
    }
    async _getValidatedTools(tools) {
        let error = '';
        const validations = await Promise.all(tools.map(t => this._normalizeTool(t)));
        const validated = [];
        for (const [i, result] of validations.entries()) {
            if ('error' in result) {
                error += localize('mcpBadSchema.tool', 'Tool `{0}` has invalid JSON parameters:', tools[i].name) + '\n';
                for (const message of result.error) {
                    error += `\t- ${message}\n`;
                }
                error += `\t- Schema: ${JSON.stringify(tools[i].inputSchema)}\n\n`;
            }
            else {
                validated.push(result);
            }
        }
        if (error) {
            this._logger.warn(`${tools.length - validated.length} tools have invalid JSON schemas and will be omitted`);
            warnInvalidTools(this._instantiationService, this.definition.label, error);
        }
        return validated;
    }
    /**
     * Parses incoming MCP icons and returns the resulting 'stored' record. Note
     * that this requires an active MCP server connection since we validate
     * against some of that connection's data. The icons may however be stored
     * and rehydrated later.
     */
    _parseIcons(icons) {
        const cnx = this._connection.get();
        if (!cnx) {
            return [];
        }
        return parseAndValidateMcpIcon(icons, cnx.launchDefinition, this._logger);
    }
    _setServerTools(nonce, toolsPromise, tx) {
        const toolPromiseSafe = toolsPromise.then(async (tools) => {
            this._logger.info(`Discovered ${tools.length} tools`);
            const data = await this._getValidatedTools(tools);
            this._primitiveCache.store(this.definition.id, { tools: data, nonce });
            return { data, nonce };
        });
        this._tools.fromServerPromise.set(new ObservablePromise(toolPromiseSafe), tx);
        return toolPromiseSafe;
    }
    _setServerPrompts(nonce, promptsPromise, tx) {
        const promptsPromiseSafe = promptsPromise.then((result) => {
            const data = result.map(prompt => ({
                ...prompt,
                _icons: this._parseIcons(prompt)
            }));
            this._primitiveCache.store(this.definition.id, { prompts: data, nonce });
            return { data, nonce };
        });
        this._prompts.fromServerPromise.set(new ObservablePromise(promptsPromiseSafe), tx);
        return promptsPromiseSafe;
    }
    _toStoredMetadata(serverInfo, instructions) {
        return {
            serverName: serverInfo ? serverInfo.title || serverInfo.name : undefined,
            serverInstructions: instructions,
            serverIcons: serverInfo ? this._parseIcons(serverInfo) : undefined,
        };
    }
    _setServerMetadata(nonce, { serverInfo, instructions, capabilities }, tx) {
        const serverMetadata = this._toStoredMetadata(serverInfo, instructions);
        this._serverMetadata.fromServerPromise.set(ObservablePromise.resolved({ nonce, data: serverMetadata }), tx);
        const capabilitiesEncoded = encodeCapabilities(capabilities);
        this._capabilities.fromServerPromise.set(ObservablePromise.resolved({ data: capabilitiesEncoded, nonce }), tx);
        this._primitiveCache.store(this.definition.id, { ...serverMetadata, nonce, capabilities: capabilitiesEncoded });
    }
    _populateLiveData(handler, cacheNonce, store) {
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        const updateTools = (tx) => {
            const toolPromise = handler.capabilities.tools ? handler.listTools({}, cts.token) : Promise.resolve([]);
            return this._setServerTools(cacheNonce, toolPromise, tx);
        };
        const updatePrompts = (tx) => {
            const promptsPromise = handler.capabilities.prompts ? handler.listPrompts({}, cts.token) : Promise.resolve([]);
            return this._setServerPrompts(cacheNonce, promptsPromise, tx);
        };
        store.add(handler.onDidChangeToolList(() => {
            this._logger.info('Tool list changed, refreshing tools...');
            updateTools(undefined);
        }));
        store.add(handler.onDidChangePromptList(() => {
            this._logger.info('Prompts list changed, refreshing prompts...');
            updatePrompts(undefined);
        }));
        transaction(tx => {
            this._setServerMetadata(cacheNonce, { serverInfo: handler.serverInfo, instructions: handler.serverInstructions, capabilities: handler.capabilities }, tx);
            updatePrompts(tx);
            const toolUpdate = updateTools(tx);
            toolUpdate.then(tools => {
                this._telemetryService.publicLog2('mcp/serverBoot', {
                    supportsLogging: !!handler.capabilities.logging,
                    supportsPrompts: !!handler.capabilities.prompts,
                    supportsResources: !!handler.capabilities.resources,
                    toolCount: tools.data.length,
                    serverName: handler.serverInfo.name,
                    serverVersion: handler.serverInfo.version,
                });
            });
        });
    }
};
McpServer = McpServer_1 = __decorate([
    __param(6, IMcpRegistry),
    __param(7, IWorkspaceContextService),
    __param(8, IExtensionService),
    __param(9, ILoggerService),
    __param(10, IOutputService),
    __param(11, ITelemetryService),
    __param(12, ICommandService),
    __param(13, IInstantiationService),
    __param(14, INotificationService),
    __param(15, IOpenerService),
    __param(16, IMcpSamplingService),
    __param(17, IMcpElicitationService),
    __param(18, IWorkbenchEnvironmentService)
], McpServer);
export { McpServer };
class McpPrompt {
    constructor(_server, _definition) {
        this._server = _server;
        this._definition = _definition;
        this.id = mcpPromptReplaceSpecialChars(this._server.definition.label + '.' + _definition.name);
        this.name = _definition.name;
        this.title = _definition.title;
        this.description = _definition.description;
        this.arguments = _definition.arguments || [];
        this.icons = McpIcons.fromStored(this._definition._icons);
    }
    async resolve(args, token) {
        const result = await McpServer.callOn(this._server, h => h.getPrompt({ name: this._definition.name, arguments: args }, token), token);
        return result.messages;
    }
    async complete(argument, prefix, alreadyResolved, token) {
        const result = await McpServer.callOn(this._server, h => h.complete({
            ref: { type: 'ref/prompt', name: this._definition.name },
            argument: { name: argument, value: prefix },
            context: { arguments: alreadyResolved },
        }, token), token);
        return result.completion.values;
    }
}
function encodeCapabilities(cap) {
    let out = 0;
    if (cap.logging) {
        out |= 1 /* McpCapability.Logging */;
    }
    if (cap.completions) {
        out |= 2 /* McpCapability.Completions */;
    }
    if (cap.prompts) {
        out |= 4 /* McpCapability.Prompts */;
        if (cap.prompts.listChanged) {
            out |= 8 /* McpCapability.PromptsListChanged */;
        }
    }
    if (cap.resources) {
        out |= 16 /* McpCapability.Resources */;
        if (cap.resources.subscribe) {
            out |= 32 /* McpCapability.ResourcesSubscribe */;
        }
        if (cap.resources.listChanged) {
            out |= 64 /* McpCapability.ResourcesListChanged */;
        }
    }
    if (cap.tools) {
        out |= 128 /* McpCapability.Tools */;
        if (cap.tools.listChanged) {
            out |= 256 /* McpCapability.ToolsListChanged */;
        }
    }
    return out;
}
let McpTool = class McpTool {
    get definition() { return this._definition; }
    constructor(_server, idPrefix, _definition, _elicitationService) {
        this._server = _server;
        this._definition = _definition;
        this._elicitationService = _elicitationService;
        this.referenceName = _definition.name.replaceAll('.', '_');
        this.id = (idPrefix + _definition.name).replaceAll('.', '_').slice(0, 64 /* McpToolName.MaxLength */);
        this.icons = McpIcons.fromStored(this._definition._icons);
    }
    async call(params, context, token) {
        if (context) {
            this._server.runningToolCalls.add(context);
        }
        try {
            return await this._callWithProgress(params, undefined, context, token);
        }
        finally {
            if (context) {
                this._server.runningToolCalls.delete(context);
            }
        }
    }
    async callWithProgress(params, progress, context, token) {
        if (context) {
            this._server.runningToolCalls.add(context);
        }
        try {
            return await this._callWithProgress(params, progress, context, token);
        }
        finally {
            if (context) {
                this._server.runningToolCalls.delete(context);
            }
        }
    }
    _callWithProgress(params, progress, context, token = CancellationToken.None, allowRetry = true) {
        // serverToolName is always set now, but older cache entries (from 1.99-Insiders) may not have it.
        const name = this._definition.serverToolName ?? this._definition.name;
        const progressToken = progress ? generateUuid() : undefined;
        const store = new DisposableStore();
        return McpServer.callOn(this._server, async (h) => {
            if (progress) {
                store.add(h.onDidReceiveProgressNotification((e) => {
                    if (e.params.progressToken === progressToken) {
                        progress.report({
                            message: e.params.message,
                            progress: e.params.total !== undefined && e.params.progress !== undefined ? e.params.progress / e.params.total : undefined,
                        });
                    }
                }));
            }
            const meta = { progressToken };
            if (context?.chatSessionId) {
                meta['vscode.conversationId'] = context.chatSessionId;
            }
            if (context?.chatRequestId) {
                meta['vscode.requestId'] = context.chatRequestId;
            }
            const taskHint = this._definition.execution?.taskSupport;
            const serverSupportsTasksForTools = h.capabilities.tasks?.requests?.tools?.call !== undefined;
            const shouldUseTask = serverSupportsTasksForTools && (taskHint === 'required' || taskHint === 'optional');
            try {
                const result = await h.callTool({
                    name,
                    arguments: params,
                    task: shouldUseTask ? {} : undefined,
                    _meta: meta,
                }, token);
                // Wait for tools to refresh for dynamic servers (#261611)
                await this._server.awaitToolRefresh();
                return result;
            }
            catch (err) {
                // Handle URL elicitation required error
                if (err instanceof MpcResponseError && err.code === MCP.URL_ELICITATION_REQUIRED && allowRetry) {
                    await this._handleElicitationErr(err, context, token);
                    return this._callWithProgress(params, progress, context, token, false);
                }
                const state = this._server.connectionState.get();
                if (allowRetry && state.state === 3 /* McpConnectionState.Kind.Error */ && state.shouldRetry) {
                    return this._callWithProgress(params, progress, context, token, false);
                }
                else {
                    throw err;
                }
            }
            finally {
                store.dispose();
            }
        }, token);
    }
    async _handleElicitationErr(err, context, token) {
        const elicitations = err.data?.elicitations;
        if (Array.isArray(elicitations) && elicitations.length > 0) {
            for (const elicitation of elicitations) {
                const elicitResult = await this._elicitationService.elicit(this._server, context, elicitation, token);
                try {
                    if (elicitResult.value.action !== 'accept') {
                        throw err;
                    }
                    if (elicitResult.kind === 1 /* ElicitationKind.URL */) {
                        await elicitResult.wait;
                    }
                }
                finally {
                    elicitResult.dispose();
                }
            }
        }
    }
    compare(other) {
        return this._definition.name.localeCompare(other.definition.name);
    }
};
McpTool = __decorate([
    __param(3, IMcpElicitationService)
], McpTool);
export { McpTool };
function warnInvalidTools(instaService, serverName, errorText) {
    instaService.invokeFunction((accessor) => {
        const notificationService = accessor.get(INotificationService);
        const editorService = accessor.get(IEditorService);
        notificationService.notify({
            severity: Severity.Warning,
            message: localize('mcpBadSchema', 'MCP server `{0}` has tools with invalid parameters which will be omitted.', serverName),
            actions: {
                primary: [{
                        class: undefined,
                        enabled: true,
                        id: 'mcpBadSchema.show',
                        tooltip: '',
                        label: localize('mcpBadSchema.show', 'Show'),
                        run: () => {
                            editorService.openEditor({
                                resource: undefined,
                                contents: errorText,
                            });
                        }
                    }]
            }
        });
    });
}
class McpResource {
    constructor(server, original, icons) {
        this.icons = icons;
        this.mcpUri = original.uri;
        this.title = original.title;
        this.uri = McpResourceURI.fromServer(server.definition, original.uri);
        this.name = original.name;
        this.description = original.description;
        this.mimeType = original.mimeType;
        this.sizeInBytes = original.size;
    }
}
class McpResourceTemplate {
    constructor(_server, _definition, icons) {
        this._server = _server;
        this._definition = _definition;
        this.icons = icons;
        this.name = _definition.name;
        this.description = _definition.description;
        this.mimeType = _definition.mimeType;
        this.title = _definition.title;
        this.template = UriTemplate.parse(_definition.uriTemplate);
    }
    resolveURI(vars) {
        const serverUri = this.template.resolve(vars);
        return McpResourceURI.fromServer(this._server.definition, serverUri);
    }
    async complete(templatePart, prefix, alreadyResolved, token) {
        const result = await McpServer.callOn(this._server, h => h.complete({
            ref: { type: 'ref/resource', uri: this._definition.uriTemplate },
            argument: { name: templatePart, value: prefix },
            context: {
                arguments: mapValues(alreadyResolved, v => Array.isArray(v) ? v.join('/') : v),
            },
        }, token), token);
        return result.completion.values;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQXNELG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyUCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pGLE9BQU8s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
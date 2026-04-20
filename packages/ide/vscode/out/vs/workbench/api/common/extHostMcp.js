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
import { DeferredPromise, raceCancellationError, Sequencer, timeout } from '../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { AUTH_SCOPE_SEPARATOR, fetchAuthorizationServerMetadata, fetchResourceMetadata, getDefaultMetadataForUrl, parseWWWAuthenticateHeader, scopesMatch } from '../../../base/common/oauth.js';
import { SSEParser } from '../../../base/common/sseParser.js';
import { URI } from '../../../base/common/uri.js';
import { vArray, vNumber, vObj, vObjAny, vOptionalProp, vString } from '../../../base/common/validation.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { canLog, ILogService, LogLevel } from '../../../platform/log/common/log.js';
import product from '../../../platform/product/common/product.js';
import { extensionPrefixedIdentifier, McpServerLaunch, UserInteractionRequiredError } from '../../contrib/mcp/common/mcpTypes.js';
import { MCP } from '../../contrib/mcp/common/modelContextProtocol.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as Convert from './extHostTypeConverters.js';
import { McpToolAvailability } from './extHostTypes.js';
import { IExtHostVariableResolverProvider } from './extHostVariableResolverService.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
export const IExtHostMpcService = createDecorator('IExtHostMpcService');
const serverDataValidation = vObj({
    label: vString(),
    version: vOptionalProp(vString()),
    metadata: vOptionalProp(vObj({
        capabilities: vOptionalProp(vObjAny()),
        serverInfo: vOptionalProp(vObjAny()),
        tools: vOptionalProp(vArray(vObj({
            availability: vNumber(),
            definition: vObjAny(),
        }))),
    })),
    authentication: vOptionalProp(vObj({
        providerId: vString(),
        scopes: vArray(vString()),
    }))
});
// Can be validated with:
// declare const _serverDataValidationTest: vscode.McpStdioServerDefinition | vscode.McpHttpServerDefinition;
// const _serverDataValidationProd: ValidatorType<typeof serverDataValidation> = _serverDataValidationTest;
let ExtHostMcpService = class ExtHostMcpService extends Disposable {
    constructor(extHostRpc, _logService, _extHostInitData, _workspaceService, _variableResolver) {
        super();
        this._logService = _logService;
        this._extHostInitData = _extHostInitData;
        this._workspaceService = _workspaceService;
        this._variableResolver = _variableResolver;
        this._initialProviderPromises = new Set();
        this._sseEventSources = this._register(new DisposableMap());
        this._unresolvedMcpServers = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadMcp);
    }
    $startMcp(id, opts) {
        this._startMcp(id, McpServerLaunch.fromSerialized(opts.launch), opts.defaultCwd && URI.revive(opts.defaultCwd), opts.errorOnUserInteraction);
    }
    _startMcp(id, launch, _defaultCwd, errorOnUserInteraction) {
        if (launch.type === 2 /* McpServerTransportType.HTTP */) {
            this._sseEventSources.set(id, new McpHTTPHandle(id, launch, this._proxy, this._logService, errorOnUserInteraction));
            return;
        }
        throw new Error('not implemented');
    }
    async $substituteVariables(_workspaceFolder, value) {
        const folderURI = URI.revive(_workspaceFolder);
        const folder = folderURI && await this._workspaceService.resolveWorkspaceFolder(folderURI);
        const variableResolver = await this._variableResolver.getResolver();
        return variableResolver.resolveAsync(folder && {
            uri: folder.uri,
            name: folder.name,
            index: folder.index,
        }, value);
    }
    $stopMcp(id) {
        this._sseEventSources.get(id)
            ?.close()
            .then(() => this._didClose(id));
    }
    _didClose(id) {
        this._sseEventSources.deleteAndDispose(id);
    }
    $sendMessage(id, message) {
        this._sseEventSources.get(id)?.send(message);
    }
    async $waitForInitialCollectionProviders() {
        await Promise.all(this._initialProviderPromises);
    }
    async $resolveMcpLaunch(collectionId, label) {
        const rec = this._unresolvedMcpServers.get(collectionId);
        if (!rec) {
            return;
        }
        const server = rec.servers.find(s => s.label === label);
        if (!server) {
            return;
        }
        if (!rec.provider.resolveMcpServerDefinition) {
            return Convert.McpServerDefinition.from(server);
        }
        const resolved = await rec.provider.resolveMcpServerDefinition(server, CancellationToken.None);
        return resolved ? Convert.McpServerDefinition.from(resolved) : undefined;
    }
    /** {@link vscode.lm.registerMcpServerDefinitionProvider} */
    registerMcpConfigurationProvider(extension, id, provider) {
        const store = new DisposableStore();
        const metadata = extension.contributes?.mcpServerDefinitionProviders?.find(m => m.id === id);
        if (!metadata) {
            throw new Error(`MCP configuration providers must be registered in the contributes.mcpServerDefinitionProviders array within your package.json, but "${id}" was not`);
        }
        const mcp = {
            id: extensionPrefixedIdentifier(extension.identifier, id),
            isTrustedByDefault: true,
            label: metadata?.label ?? extension.displayName ?? extension.name,
            scope: 1 /* StorageScope.WORKSPACE */,
            canResolveLaunch: typeof provider.resolveMcpServerDefinition === 'function',
            extensionId: extension.identifier.value,
            configTarget: this._extHostInitData.remote.isRemote ? 4 /* ConfigurationTarget.USER_REMOTE */ : 2 /* ConfigurationTarget.USER */,
        };
        const update = async () => {
            const list = await provider.provideMcpServerDefinitions(CancellationToken.None);
            this._unresolvedMcpServers.set(mcp.id, { servers: list ?? [], provider });
            const servers = [];
            for (const item of list ?? []) {
                let id = ExtensionIdentifier.toKey(extension.identifier) + '/' + item.label;
                if (servers.some(s => s.id === id)) {
                    let i = 2;
                    while (servers.some(s => s.id === id + i)) {
                        i++;
                    }
                    id = id + i;
                }
                serverDataValidation.validateOrThrow(item);
                if (item.authentication) {
                    checkProposedApiEnabled(extension, 'mcpToolDefinitions');
                }
                let staticMetadata;
                const castAs2 = item;
                if (isProposedApiEnabled(extension, 'mcpToolDefinitions') && castAs2.metadata) {
                    staticMetadata = {
                        capabilities: castAs2.metadata.capabilities,
                        instructions: castAs2.metadata.instructions,
                        serverInfo: castAs2.metadata.serverInfo,
                        tools: castAs2.metadata.tools?.map(t => ({
                            availability: t.availability === McpToolAvailability.Dynamic ? 1 /* McpServerStaticToolAvailability.Dynamic */ : 0 /* McpServerStaticToolAvailability.Initial */,
                            definition: t.definition,
                        })),
                    };
                }
                servers.push({
                    id,
                    label: item.label,
                    cacheNonce: item.version || '$$NONE',
                    staticMetadata,
                    launch: Convert.McpServerDefinition.from(item),
                });
            }
            this._proxy.$upsertMcpCollection(mcp, servers);
        };
        store.add(toDisposable(() => {
            this._unresolvedMcpServers.delete(mcp.id);
            this._proxy.$deleteMcpCollection(mcp.id);
        }));
        if (provider.onDidChangeMcpServerDefinitions) {
            store.add(provider.onDidChangeMcpServerDefinitions(update));
        }
        // todo@connor4312: proposed API back-compat
        // eslint-disable-next-line local/code-no-any-casts
        if (provider.onDidChangeServerDefinitions) {
            // eslint-disable-next-line local/code-no-any-casts
            store.add(provider.onDidChangeServerDefinitions(update));
        }
        // eslint-disable-next-line local/code-no-any-casts
        if (provider.onDidChange) {
            // eslint-disable-next-line local/code-no-any-casts
            store.add(provider.onDidChange(update));
        }
        const promise = new Promise(resolve => {
            setTimeout(() => update().finally(() => {
                this._initialProviderPromises.delete(promise);
                resolve();
            }), 0);
        });
        this._initialProviderPromises.add(promise);
        return store;
    }
};
ExtHostMcpService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostInitDataService),
    __param(3, IExtHostWorkspace),
    __param(4, IExtHostVariableResolverProvider)
], ExtHostMcpService);
export { ExtHostMcpService };
var HttpMode;
(function (HttpMode) {
    HttpMode[HttpMode["Unknown"] = 0] = "Unknown";
    HttpMode[HttpMode["Http"] = 1] = "Http";
    HttpMode[HttpMode["SSE"] = 2] = "SSE";
})(HttpMode || (HttpMode = {}));
const MAX_FOLLOW_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
/**
 * Implementation of both MCP HTTP Streaming as well as legacy SSE.
 *
 * The first request will POST to the endpoint, assuming HTTP streaming. If the
 * server is legacy SSE, it should return some 4xx status in that case,
 * and we'll automatically fall back to SSE and res
 */
export class McpHTTPHandle extends Disposable {
    constructor(_id, _launch, _proxy, _logService, _errorOnUserInteraction) {
        super();
        this._id = _id;
        this._launch = _launch;
        this._proxy = _proxy;
        this._logService = _logService;
        this._errorOnUserInteraction = _errorOnUserInteraction;
        this._requestSequencer = new Sequencer();
        this._postEndpoint = new DeferredPromise();
        this._mode = { value: 0 /* HttpMode.Unknown */ };
        this._cts = new CancellationTokenSource();
        this._abortCtrl = new AbortController();
        this._didSendClose = false;
        this._register(toDisposable(() => {
            this._abortCtrl.abort();
            this._cts.dispose(true);
        }));
        this._proxy.$onDidChangeState(this._id, { state: 2 /* McpConnectionState.Kind.Running */ });
    }
    async send(message) {
        try {
            if (this._mode.value === 0 /* HttpMode.Unknown */) {
                await this._requestSequencer.queue(() => this._send(message));
            }
            else {
                await this._send(message);
            }
        }
        catch (err) {
            const msg = `Error sending message to ${this._launch.uri}: ${String(err)}`;
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: msg });
        }
    }
    async close() {
        if (this._mode.value === 1 /* HttpMode.Http */ && this._mode.sessionId && !this._didSendClose) {
            this._didSendClose = true;
            try {
                await this._closeSession(this._mode.sessionId);
            }
            catch {
                // ignored -- already logged
            }
        }
        this._proxy.$onDidChangeState(this._id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
    }
    async _closeSession(sessionId) {
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Mcp-Session-Id': sessionId,
        };
        await this._addAuthHeader(headers);
        // no fetch with retry here -- don't try to auth if we get an auth failure
        await this._fetch(this._launch.uri.toString(true), {
            method: 'DELETE',
            headers,
        });
    }
    _send(message) {
        if (this._mode.value === 2 /* HttpMode.SSE */) {
            return this._sendLegacySSE(this._mode.endpoint, message);
        }
        else {
            return this._sendStreamableHttp(message, this._mode.value === 1 /* HttpMode.Http */ ? this._mode.sessionId : undefined);
        }
    }
    /**
     * Sends a streamable-HTTP request.
     * 1. Posts to the endpoint
     * 2. Updates internal state as needed. Falls back to SSE if appropriate.
     * 3. If the response body is empty, JSON, or a JSON stream, handle it appropriately.
     */
    async _sendStreamableHttp(message, sessionId) {
        const asBytes = new TextEncoder().encode(message);
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Content-Type': 'application/json',
            'Content-Length': String(asBytes.length),
            Accept: 'text/event-stream, application/json',
        };
        if (sessionId) {
            headers['Mcp-Session-Id'] = sessionId;
        }
        await this._addAuthHeader(headers);
        const res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
            method: 'POST',
            headers,
            body: asBytes,
        }, headers);
        const wasUnknown = this._mode.value === 0 /* HttpMode.Unknown */;
        // Mcp-Session-Id is the strongest signal that we're in streamable HTTP mode
        const nextSessionId = res.headers.get('Mcp-Session-Id');
        if (nextSessionId) {
            this._mode = { value: 1 /* HttpMode.Http */, sessionId: nextSessionId };
        }
        if (this._mode.value === 0 /* HttpMode.Unknown */ &&
            // We care about 4xx errors...
            res.status >= 400 && res.status < 500
            // ...except for auth errors
            && !isAuthStatusCode(res.status)) {
            this._log(LogLevel.Info, `${res.status} status sending message to ${this._launch.uri}, will attempt to fall back to legacy SSE`);
            this._sseFallbackWithMessage(message);
            return;
        }
        if (res.status >= 300) {
            // "When a client receives HTTP 404 in response to a request containing an Mcp-Session-Id, it MUST start a new session by sending a new InitializeRequest without a session ID attached"
            // Though this says only 404, some servers send 400s as well, including their example
            // https://github.com/modelcontextprotocol/typescript-sdk/issues/389
            const retryWithSessionId = this._mode.value === 1 /* HttpMode.Http */ && !!this._mode.sessionId && (res.status === 400 || res.status === 404);
            this._proxy.$onDidChangeState(this._id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `${res.status} status sending message to ${this._launch.uri}: ${await this._getErrText(res)}` + (retryWithSessionId ? `; will retry with new session ID` : ''),
                shouldRetry: retryWithSessionId,
            });
            return;
        }
        if (this._mode.value === 0 /* HttpMode.Unknown */) {
            this._mode = { value: 1 /* HttpMode.Http */, sessionId: undefined };
        }
        if (wasUnknown) {
            this._attachStreamableBackchannel();
        }
        await this._handleSuccessfulStreamableHttp(res, message);
    }
    async _sseFallbackWithMessage(message) {
        const endpoint = await this._attachSSE();
        if (endpoint) {
            this._mode = { value: 2 /* HttpMode.SSE */, endpoint };
            await this._sendLegacySSE(endpoint, message);
        }
    }
    async _handleSuccessfulStreamableHttp(res, message) {
        if (res.status === 202) {
            return; // no body
        }
        const contentType = res.headers.get('Content-Type')?.toLowerCase() || '';
        if (contentType.startsWith('text/event-stream')) {
            const parser = new SSEParser(event => {
                if (event.type === 'message') {
                    this._proxy.$onDidReceiveMessage(this._id, event.data);
                }
                else if (event.type === 'endpoint') {
                    // An SSE server that didn't correctly return a 4xx status when we POSTed
                    this._log(LogLevel.Warning, `Received SSE endpoint from a POST to ${this._launch.uri}, will fall back to legacy SSE`);
                    this._sseFallbackWithMessage(message);
                    throw new CancellationError(); // just to end the SSE stream
                }
            });
            try {
                await this._doSSE(parser, res);
            }
            catch (err) {
                this._log(LogLevel.Warning, `Error reading SSE stream: ${String(err)}`);
            }
        }
        else if (contentType.startsWith('application/json')) {
            this._proxy.$onDidReceiveMessage(this._id, await res.text());
        }
        else {
            const responseBody = await res.text();
            if (isJSON(responseBody)) { // try to read as JSON even if the server didn't set the content type
                this._proxy.$onDidReceiveMessage(this._id, responseBody);
            }
            else {
                this._log(LogLevel.Warning, `Unexpected ${res.status} response for request: ${responseBody}`);
            }
        }
    }
    /**
     * Attaches the SSE backchannel that streamable HTTP servers can use
     * for async notifications. This is a "MAY" support, so if the server gives
     * us a 4xx code, we'll stop trying to connect..
     */
    async _attachStreamableBackchannel() {
        let lastEventId;
        let canReconnectAt;
        for (let retry = 0; !this._store.isDisposed; retry++) {
            if (canReconnectAt !== undefined) {
                await timeout(Math.max(0, canReconnectAt - Date.now()), this._cts.token);
                canReconnectAt = undefined;
            }
            else {
                await timeout(Math.min(retry * 1000, 30_000), this._cts.token);
            }
            let res;
            try {
                const headers = {
                    ...Object.fromEntries(this._launch.headers),
                    'Accept': 'text/event-stream',
                };
                await this._addAuthHeader(headers);
                if (this._mode.value === 1 /* HttpMode.Http */ && this._mode.sessionId !== undefined) {
                    headers['Mcp-Session-Id'] = this._mode.sessionId;
                }
                if (lastEventId) {
                    headers['Last-Event-ID'] = lastEventId;
                }
                res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
                    method: 'GET',
                    headers,
                }, headers);
            }
            catch (e) {
                this._log(LogLevel.Info, `Error connecting to ${this._launch.uri} for async notifications, will retry`);
                continue;
            }
            if (res.status >= 400) {
                this._log(LogLevel.Debug, `${res.status} status connecting to ${this._launch.uri} for async notifications; they will be disabled: ${await this._getErrText(res)}`);
                return;
            }
            // Only reset the retry counter if we definitely get an event stream to avoid
            // spamming servers that (incorrectly) don't return one from this endpoint.
            if (res.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
                retry = 0;
            }
            const parser = new SSEParser(event => {
                if (event.retry) {
                    canReconnectAt = Date.now() + event.retry;
                }
                if (event.type === 'message' && event.data) {
                    this._proxy.$onDidReceiveMessage(this._id, event.data);
                }
                if (event.id) {
                    lastEventId = event.id;
                }
            });
            try {
                await this._doSSE(parser, res);
            }
            catch (e) {
                this._log(LogLevel.Info, `Error reading from async stream, we will reconnect: ${e}`);
            }
        }
    }
    /**
     * Starts a legacy SSE attachment, where the SSE response is the session lifetime.
     * Unlike `_attachStreamableBackchannel`, this fails the server if it disconnects.
     */
    async _attachSSE() {
        const postEndpoint = new DeferredPromise();
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Accept': 'text/event-stream',
        };
        await this._addAuthHeader(headers);
        let res;
        try {
            res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
                method: 'GET',
                headers,
            }, headers);
            if (res.status >= 300) {
                this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `${res.status} status connecting to ${this._launch.uri} as SSE: ${await this._getErrText(res)}` });
                return;
            }
        }
        catch (e) {
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error connecting to ${this._launch.uri} as SSE: ${e}` });
            return;
        }
        const parser = new SSEParser(event => {
            if (event.type === 'message') {
                this._proxy.$onDidReceiveMessage(this._id, event.data);
            }
            else if (event.type === 'endpoint') {
                postEndpoint.complete(new URL(event.data, this._launch.uri.toString(true)).toString());
            }
        });
        this._register(toDisposable(() => postEndpoint.cancel()));
        this._doSSE(parser, res).catch(err => {
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error reading SSE stream: ${String(err)}` });
        });
        return postEndpoint.p;
    }
    /**
     * Sends a legacy SSE message to the server. The response is always empty and
     * is otherwise received in {@link _attachSSE}'s loop.
     */
    async _sendLegacySSE(url, message) {
        const asBytes = new TextEncoder().encode(message);
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Content-Type': 'application/json',
            'Content-Length': String(asBytes.length),
        };
        await this._addAuthHeader(headers);
        const res = await this._fetch(url, {
            method: 'POST',
            headers,
            body: asBytes,
        });
        if (res.status >= 300) {
            this._log(LogLevel.Warning, `${res.status} status sending message to ${this._postEndpoint}: ${await this._getErrText(res)}`);
        }
    }
    /** Generic handle to pipe a response into an SSE parser. */
    async _doSSE(parser, res) {
        if (!res.body) {
            return;
        }
        const reader = res.body.getReader();
        let chunk;
        do {
            try {
                chunk = await raceCancellationError(reader.read(), this._cts.token);
            }
            catch (err) {
                reader.cancel();
                if (this._store.isDisposed) {
                    return;
                }
                else {
                    throw err;
                }
            }
            if (chunk.value) {
                parser.feed(chunk.value);
            }
        } while (!chunk.done);
    }
    async _addAuthHeader(headers, forceNewRegistration) {
        if (this._authMetadata) {
            try {
                const authDetails = {
                    authorizationServer: this._authMetadata.authorizationServer.toJSON(),
                    authorizationServerMetadata: this._authMetadata.serverMetadata,
                    resourceMetadata: this._authMetadata.resourceMetadata,
                    scopes: this._authMetadata.scopes
                };
                const token = await this._proxy.$getTokenFromServerMetadata(this._id, authDetails, {
                    errorOnUserInteraction: this._errorOnUserInteraction,
                    forceNewRegistration
                });
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            catch (e) {
                if (UserInteractionRequiredError.is(e)) {
                    this._proxy.$onDidChangeState(this._id, { state: 0 /* McpConnectionState.Kind.Stopped */, reason: 'needs-user-interaction' });
                    throw new CancellationError();
                }
                this._log(LogLevel.Warning, `Error getting token from server metadata: ${String(e)}`);
            }
        }
        if (this._launch.authentication) {
            try {
                this._log(LogLevel.Debug, `Using provided authentication config: providerId=${this._launch.authentication.providerId}, scopes=${this._launch.authentication.scopes.join(', ')}`);
                const token = await this._proxy.$getTokenForProviderId(this._id, this._launch.authentication.providerId, this._launch.authentication.scopes, {
                    errorOnUserInteraction: this._errorOnUserInteraction,
                    forceNewRegistration
                });
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                    this._log(LogLevel.Info, 'Successfully obtained token from provided authentication config');
                }
            }
            catch (e) {
                if (UserInteractionRequiredError.is(e)) {
                    this._proxy.$onDidChangeState(this._id, { state: 0 /* McpConnectionState.Kind.Stopped */, reason: 'needs-user-interaction' });
                    throw new CancellationError();
                }
                this._log(LogLevel.Warning, `Error getting token from provided authentication config: ${String(e)}`);
            }
        }
        return headers;
    }
    _log(level, message) {
        if (!this._store.isDisposed) {
            this._proxy.$onDidPublishLog(this._id, level, message);
        }
    }
    async _getErrText(res) {
        try {
            return await res.text();
        }
        catch {
            return res.statusText;
        }
    }
    /**
     * Helper method to perform fetch with authentication retry logic.
     * If the initial request returns an auth error and we don't have auth metadata,
     * it will populate the auth metadata and retry once.
     * If we already have auth metadata, check if the scopes changed and update them.
     */
    async _fetchWithAuthRetry(mcpUrl, init, headers) {
        const doFetch = () => this._fetch(mcpUrl, init);
        let res = await doFetch();
        if (isAuthStatusCode(res.status)) {
            if (!this._authMetadata) {
                this._authMetadata = await createAuthMetadata(mcpUrl, res, {
                    launchHeaders: this._launch.headers,
                    fetch: (url, init) => this._fetch(url, init),
                    log: (level, message) => this._log(level, message)
                });
                await this._addAuthHeader(headers);
                if (headers['Authorization']) {
                    // Update the headers in the init object
                    init.headers = headers;
                    res = await doFetch();
                }
            }
            else {
                // We have auth metadata, but got an auth error. Check if the scopes changed.
                if (this._authMetadata.update(res)) {
                    await this._addAuthHeader(headers);
                    if (headers['Authorization']) {
                        // Update the headers in the init object
                        init.headers = headers;
                        res = await doFetch();
                    }
                }
            }
        }
        // If we have an Authorization header and still get an auth error, we should retry with a new auth registration
        if (headers['Authorization'] && isAuthStatusCode(res.status)) {
            const errorText = await this._getErrText(res);
            this._log(LogLevel.Debug, `Received ${res.status} status with Authorization header, retrying with new auth registration. Error details: ${errorText || 'no additional details'}`);
            await this._addAuthHeader(headers, true);
            res = await doFetch();
        }
        return res;
    }
    async _fetch(url, init) {
        init.headers['user-agent'] = `${product.nameLong}/${product.version}`;
        if (canLog(this._logService.getLevel(), LogLevel.Trace)) {
            const traceObj = { ...init, headers: { ...init.headers } };
            if (traceObj.body) {
                traceObj.body = new TextDecoder().decode(traceObj.body);
            }
            if (traceObj.headers?.Authorization) {
                traceObj.headers.Authorization = '***'; // don't log the auth header
            }
            this._log(LogLevel.Trace, `Fetching ${url} with options: ${JSON.stringify(traceObj)}`);
        }
        let currentUrl = url;
        let response;
        for (let redirectCount = 0; redirectCount < MAX_FOLLOW_REDIRECTS; redirectCount++) {
            response = await this._fetchInternal(currentUrl, {
                ...init,
                signal: this._abortCtrl.signal,
                redirect: 'manual'
            });
            // Check for redirect status codes (301, 302, 303, 307, 308)
            if (!REDIRECT_STATUS_CODES.includes(response.status)) {
                break;
            }
            const location = response.headers.get('location');
            if (!location) {
                break;
            }
            const nextUrl = new URL(location, currentUrl).toString();
            this._log(LogLevel.Trace, `Redirect (${response.status}) from ${currentUrl} to ${nextUrl}`);
            currentUrl = nextUrl;
            // Per fetch spec, for 303 always use GET, keep method unless original was POST and 301/302, then GET.
            if (response.status === 303 || ((response.status === 301 || response.status === 302) && init.method === 'POST')) {
                init.method = 'GET';
                delete init.body;
            }
        }
        if (canLog(this._logService.getLevel(), LogLevel.Trace)) {
            const headers = {};
            response.headers.forEach((value, key) => { headers[key] = value; });
            this._log(LogLevel.Trace, `Fetched ${currentUrl}: ${JSON.stringify({
                status: response.status,
                headers: headers,
            })}`);
        }
        return response;
    }
    _fetchInternal(url, init) {
        return fetch(url, init);
    }
}
function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
function isAuthStatusCode(status) {
    return status === 401 || status === 403;
}
/**
 * Concrete implementation of IAuthMetadata that manages OAuth authentication metadata.
 * Consumers should use {@link createAuthMetadata} to create instances.
 */
class AuthMetadata {
    constructor(authorizationServer, serverMetadata, resourceMetadata, scopes, _log) {
        this.authorizationServer = authorizationServer;
        this.serverMetadata = serverMetadata;
        this.resourceMetadata = resourceMetadata;
        this._log = _log;
        this._scopes = scopes;
    }
    get scopes() {
        return this._scopes;
    }
    update(response) {
        const scopesChallenge = this._parseScopesFromResponse(response);
        if (!scopesMatch(scopesChallenge, this._scopes)) {
            this._log(LogLevel.Debug, `Scopes changed from ${JSON.stringify(this._scopes)} to ${JSON.stringify(scopesChallenge)}, updating`);
            this._scopes = scopesChallenge;
            return true;
        }
        return false;
    }
    _parseScopesFromResponse(response) {
        if (!response.headers.has('WWW-Authenticate')) {
            return undefined;
        }
        const authHeader = response.headers.get('WWW-Authenticate');
        const challenges = parseWWWAuthenticateHeader(authHeader);
        for (const challenge of challenges) {
            if (challenge.scheme === 'Bearer' && challenge.params['scope']) {
                const scopes = challenge.params['scope'].split(AUTH_SCOPE_SEPARATOR).filter(s => s.trim().length);
                if (scopes.length) {
                    this._log(LogLevel.Debug, `Found scope challenge in WWW-Authenticate header: ${challenge.params['scope']}`);
                    return scopes;
                }
            }
        }
        return undefined;
    }
}
/**
 * Creates an AuthMetadata instance by discovering OAuth metadata from the server.
 *
 * This function:
 * 1. Parses the WWW-Authenticate header for resource_metadata and scope challenges
 * 2. Fetches OAuth protected resource metadata from well-known URIs or the challenge URL
 * 3. Fetches authorization server metadata
 * 4. Falls back to default metadata if discovery fails
 *
 * @param mcpUrl The MCP server URL
 * @param originalResponse The original HTTP response that triggered auth (typically 401/403)
 * @param options Configuration options including headers, fetch function, and logger
 * @returns A new AuthMetadata instance
 */
export async function createAuthMetadata(mcpUrl, originalResponse, options) {
    const { launchHeaders, fetch, log } = options;
    // Parse the WWW-Authenticate header for resource_metadata and scope challenges
    const { resourceMetadataChallenge, scopesChallenge: scopesChallengeFromHeader } = parseWWWAuthenticateHeaderForChallenges(originalResponse, log);
    // Fetch the resource metadata either from the challenge URL or from well-known URIs
    let serverMetadataUrl;
    let resource;
    let scopesChallenge = scopesChallengeFromHeader;
    try {
        const { metadata, errors } = await fetchResourceMetadata(mcpUrl, resourceMetadataChallenge, {
            sameOriginHeaders: {
                ...Object.fromEntries(launchHeaders),
                'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
            },
            fetch: (url, init) => fetch(url, init)
        });
        for (const err of errors) {
            log(LogLevel.Warning, `Error fetching resource metadata: ${err}`);
        }
        // TODO:@TylerLeonhardt support multiple authorization servers
        // Consider using one that has an auth provider first, over the dynamic flow
        serverMetadataUrl = metadata.authorization_servers?.[0];
        log(LogLevel.Debug, `Using auth server metadata url: ${serverMetadataUrl}`);
        scopesChallenge ??= metadata.scopes_supported;
        resource = metadata;
    }
    catch (e) {
        log(LogLevel.Warning, `Could not fetch resource metadata: ${String(e)}`);
    }
    const baseUrl = new URL(originalResponse.url).origin;
    // If we are not given a resource_metadata, see if the well-known server metadata is available
    // on the base url.
    let additionalHeaders = {};
    if (!serverMetadataUrl) {
        serverMetadataUrl = baseUrl;
        // Maintain the launch headers when talking to the MCP origin.
        additionalHeaders = {
            ...Object.fromEntries(launchHeaders),
            'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
        };
    }
    try {
        log(LogLevel.Debug, `Fetching auth server metadata for: ${serverMetadataUrl} ...`);
        const serverMetadataResponse = await fetchAuthorizationServerMetadata(serverMetadataUrl, {
            additionalHeaders,
            fetch: (url, init) => fetch(url, init)
        });
        log(LogLevel.Info, 'Populated auth metadata');
        return new AuthMetadata(URI.parse(serverMetadataUrl), serverMetadataResponse, resource, scopesChallenge, log);
    }
    catch (e) {
        log(LogLevel.Warning, `Error populating auth server metadata for ${serverMetadataUrl}: ${String(e)}`);
    }
    // If there's no well-known server metadata, then use the default values based off of the url.
    const defaultMetadata = getDefaultMetadataForUrl(new URL(baseUrl));
    log(LogLevel.Info, 'Using default auth metadata');
    return new AuthMetadata(URI.parse(baseUrl), defaultMetadata, resource, scopesChallenge, log);
}
/**
 * Parses the WWW-Authenticate header for resource_metadata and scope challenges.
 */
function parseWWWAuthenticateHeaderForChallenges(response, log) {
    let resourceMetadataChallenge;
    let scopesChallenge;
    if (response.headers.has('WWW-Authenticate')) {
        const authHeader = response.headers.get('WWW-Authenticate');
        const challenges = parseWWWAuthenticateHeader(authHeader);
        for (const challenge of challenges) {
            if (challenge.scheme === 'Bearer') {
                if (!resourceMetadataChallenge && challenge.params['resource_metadata']) {
                    resourceMetadataChallenge = challenge.params['resource_metadata'];
                    log(LogLevel.Debug, `Found resource_metadata challenge in WWW-Authenticate header: ${resourceMetadataChallenge}`);
                }
                if (!scopesChallenge && challenge.params['scope']) {
                    const scopes = challenge.params['scope'].split(AUTH_SCOPE_SEPARATOR).filter(s => s.trim().length);
                    if (scopes.length) {
                        log(LogLevel.Debug, `Found scope challenge in WWW-Authenticate header: ${challenge.params['scope']}`);
                        scopesChallenge = scopes;
                    }
                }
                if (resourceMetadataChallenge && scopesChallenge) {
                    break;
                }
            }
        }
    }
    return { resourceMetadataChallenge, scopesChallenge };
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TWNwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzNHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0NBQWdDLEVBQUUscUJBQXFCLEVBQUUsd0JBQXdCLEVBQXlFLDBCQUEwQixFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hRLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVHLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEYsT0FBTyxPQUFPLE1BQU0sNkNBQTZD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
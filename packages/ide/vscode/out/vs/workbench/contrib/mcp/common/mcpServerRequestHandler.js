/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { assertNever, softAssertNever } from '../../../../base/common/assert.js';
import { DeferredPromise, disposableTimeout, IntervalTimer } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, ObservablePromise, observableValue, transaction } from '../../../../base/common/observable.js';
import { canLog, log, LogLevel } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { McpError, MpcResponseError } from './mcpTypes.js';
import { isTaskResult } from './mcpTypesUtils.js';
import { MCP } from './modelContextProtocol.js';
/**
 * Request handler for communicating with an MCP server.
 *
 * Handles sending requests and receiving responses, with automatic
 * handling of ping requests and typed client request methods.
 */
export class McpServerRequestHandler extends Disposable {
    set roots(roots) {
        if (!equals(this._roots, roots)) {
            this._roots = roots;
            if (this._hasAnnouncedRoots) {
                this.sendNotification({ method: 'notifications/roots/list_changed' });
                this._hasAnnouncedRoots = false;
            }
        }
    }
    get capabilities() {
        return this._serverInit.capabilities;
    }
    get serverInfo() {
        return this._serverInit.serverInfo;
    }
    get serverInstructions() {
        return this._serverInit.instructions;
    }
    /**
     * Connects to the MCP server and does the initialization handshake.
     * @throws MpcResponseError if the server fails to initialize.
     */
    static async create(instaService, opts, token) {
        const mcp = new McpServerRequestHandler(opts);
        const store = new DisposableStore();
        try {
            const timer = store.add(new IntervalTimer());
            timer.cancelAndSet(() => {
                opts.logger.info('Waiting for server to respond to `initialize` request...');
            }, 5000);
            await instaService.invokeFunction(async (accessor) => {
                const productService = accessor.get(IProductService);
                const initialized = await mcp.sendRequest({
                    method: 'initialize',
                    params: {
                        protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                        capabilities: {
                            roots: { listChanged: true },
                            sampling: opts.createMessageRequestHandler ? {} : undefined,
                            elicitation: opts.elicitationRequestHandler ? { form: {}, url: {} } : undefined,
                            tasks: {
                                list: {},
                                cancel: {},
                                requests: {
                                    sampling: opts.createMessageRequestHandler ? { createMessage: {} } : undefined,
                                    elicitation: opts.elicitationRequestHandler ? { create: {} } : undefined,
                                },
                            },
                        },
                        clientInfo: {
                            name: productService.nameLong,
                            version: productService.version,
                        }
                    }
                }, token);
                mcp._serverInit = initialized;
                mcp._sendLogLevelToServer(opts.logger.getLevel());
                mcp.sendNotification({
                    method: 'notifications/initialized'
                });
            });
            return mcp;
        }
        catch (e) {
            mcp.dispose();
            throw e;
        }
        finally {
            store.dispose();
        }
    }
    constructor({ launch, logger, createMessageRequestHandler, elicitationRequestHandler, requestLogLevel = LogLevel.Debug, taskManager, }) {
        super();
        this._nextRequestId = 1;
        this._pendingRequests = new Map();
        this._hasAnnouncedRoots = false;
        this._roots = [];
        // Event emitters for server notifications
        this._onDidReceiveCancelledNotification = this._register(new Emitter());
        this.onDidReceiveCancelledNotification = this._onDidReceiveCancelledNotification.event;
        this._onDidReceiveProgressNotification = this._register(new Emitter());
        this.onDidReceiveProgressNotification = this._onDidReceiveProgressNotification.event;
        this._onDidReceiveElicitationCompleteNotification = this._register(new Emitter());
        this.onDidReceiveElicitationCompleteNotification = this._onDidReceiveElicitationCompleteNotification.event;
        this._onDidChangeResourceList = this._register(new Emitter());
        this.onDidChangeResourceList = this._onDidChangeResourceList.event;
        this._onDidUpdateResource = this._register(new Emitter());
        this.onDidUpdateResource = this._onDidUpdateResource.event;
        this._onDidChangeToolList = this._register(new Emitter());
        this.onDidChangeToolList = this._onDidChangeToolList.event;
        this._onDidChangePromptList = this._register(new Emitter());
        this.onDidChangePromptList = this._onDidChangePromptList.event;
        this._launch = launch;
        this.logger = logger;
        this._requestLogLevel = requestLogLevel;
        this._createMessageRequestHandler = createMessageRequestHandler;
        this._elicitationRequestHandler = elicitationRequestHandler;
        this._taskManager = taskManager;
        // Attach this handler to the task manager
        this._taskManager.setHandler(this);
        this._register(this._taskManager.onDidUpdateTask(task => {
            this.send({
                jsonrpc: MCP.JSONRPC_VERSION,
                method: 'notifications/tasks/status',
                params: task
            });
        }));
        this._register(toDisposable(() => this._taskManager.setHandler(undefined)));
        this._register(launch.onDidReceiveMessage(message => this.handleMessage(message)));
        this._register(autorun(reader => {
            const state = launch.state.read(reader).state;
            // the handler will get disposed when the launch stops, but if we're still
            // create()'ing we need to make sure to cancel the initialize request.
            if (state === 3 /* McpConnectionState.Kind.Error */ || state === 0 /* McpConnectionState.Kind.Stopped */) {
                this.cancelAllRequests();
            }
        }));
        // Listen for log level changes and forward them to the MCP server
        this._register(logger.onDidChangeLogLevel((logLevel) => {
            this._sendLogLevelToServer(logLevel);
        }));
    }
    /**
     * Send a client request to the server and return the response.
     *
     * @param request The request to send
     * @param token Cancellation token
     * @param timeoutMs Optional timeout in milliseconds
     * @returns A promise that resolves with the response
     */
    async sendRequest(request, token = CancellationToken.None) {
        if (this._store.isDisposed) {
            return Promise.reject(new CancellationError());
        }
        const id = this._nextRequestId++;
        // Create the full JSON-RPC request
        const jsonRpcRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id,
            ...request
        };
        const promise = new DeferredPromise();
        // Store the pending request
        this._pendingRequests.set(id, { promise });
        // Set up cancellation
        const cancelListener = token.onCancellationRequested(() => {
            if (!promise.isSettled) {
                this._pendingRequests.delete(id);
                this.sendNotification({ method: 'notifications/cancelled', params: { requestId: id } });
                promise.cancel();
            }
            cancelListener.dispose();
        });
        // Send the request
        this.send(jsonRpcRequest);
        const ret = promise.p.finally(() => {
            cancelListener.dispose();
            this._pendingRequests.delete(id);
        });
        return ret;
    }
    send(mcp) {
        if (canLog(this.logger.getLevel(), this._requestLogLevel)) { // avoid building the string if we don't need to
            log(this.logger, this._requestLogLevel, `[editor -> server] ${JSON.stringify(mcp)}`);
        }
        this._launch.send(mcp);
    }
    /**
     * Handles paginated requests by making multiple requests until all items are retrieved.
     *
     * @param method The method name to call
     * @param getItems Function to extract the array of items from a result
     * @param initialParams Initial parameters
     * @param token Cancellation token
     * @returns Promise with all items combined
     */
    async *sendRequestPaginated(method, getItems, initialParams, token = CancellationToken.None) {
        let nextCursor = undefined;
        do {
            const params = {
                ...initialParams,
                cursor: nextCursor
            };
            const result = await this.sendRequest({ method, params }, token);
            yield getItems(result);
            nextCursor = result.nextCursor;
        } while (nextCursor !== undefined && !token.isCancellationRequested);
    }
    sendNotification(notification) {
        this.send({ ...notification, jsonrpc: MCP.JSONRPC_VERSION });
    }
    /**
     * Handle incoming messages from the server
     */
    handleMessage(message) {
        if (canLog(this.logger.getLevel(), this._requestLogLevel)) { // avoid building the string if we don't need to
            log(this.logger, this._requestLogLevel, `[server -> editor] ${JSON.stringify(message)}`);
        }
        // Handle responses to our requests
        if ('id' in message) {
            if ('result' in message) {
                this.handleResult(message);
            }
            else if ('error' in message) {
                this.handleError(message);
            }
        }
        // Handle requests from the server
        if ('method' in message) {
            if ('id' in message) {
                this.handleServerRequest(message);
            }
            else {
                this.handleServerNotification(message);
            }
        }
    }
    /**
     * Handle successful responses
     */
    handleResult(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.complete(response.result);
        }
    }
    /**
     * Handle error responses
     */
    handleError(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.error(new MpcResponseError(response.error.message, response.error.code, response.error.data));
        }
    }
    /**
     * Handle incoming server requests
     */
    async handleServerRequest(request) {
        try {
            let response;
            if (request.method === 'ping') {
                response = this.handlePing(request);
            }
            else if (request.method === 'roots/list') {
                response = this.handleRootsList(request);
            }
            else if (request.method === 'sampling/createMessage' && this._createMessageRequestHandler) {
                // Check if this is a task-augmented request
                if (request.params.task) {
                    const taskResult = this._taskManager.createTask(request.params.task.ttl ?? null, (token) => this._createMessageRequestHandler(request.params, token));
                    taskResult._meta ??= {};
                    taskResult._meta['io.modelcontextprotocol/related-task'] = { taskId: taskResult.task.taskId };
                    response = taskResult;
                }
                else {
                    response = await this._createMessageRequestHandler(request.params);
                }
            }
            else if (request.method === 'elicitation/create' && this._elicitationRequestHandler) {
                // Check if this is a task-augmented request
                if (request.params.task) {
                    const taskResult = this._taskManager.createTask(request.params.task.ttl ?? null, (token) => this._elicitationRequestHandler(request.params, token));
                    taskResult._meta ??= {};
                    taskResult._meta['io.modelcontextprotocol/related-task'] = { taskId: taskResult.task.taskId };
                    response = taskResult;
                }
                else {
                    response = await this._elicitationRequestHandler(request.params);
                }
            }
            else if (request.method === 'tasks/get') {
                response = this._taskManager.getTask(request.params.taskId);
            }
            else if (request.method === 'tasks/result') {
                response = await this._taskManager.getTaskResult(request.params.taskId);
            }
            else if (request.method === 'tasks/cancel') {
                response = this._taskManager.cancelTask(request.params.taskId);
            }
            else if (request.method === 'tasks/list') {
                response = this._taskManager.listTasks();
            }
            else {
                throw McpError.methodNotFound(request.method);
            }
            this.respondToRequest(request, response);
        }
        catch (e) {
            if (!(e instanceof McpError)) {
                this.logger.error(`Error handling request ${request.method}:`, e);
                e = McpError.unknown(e);
            }
            const errorResponse = {
                jsonrpc: MCP.JSONRPC_VERSION,
                id: request.id,
                error: {
                    code: e.code,
                    message: e.message,
                    data: e.data,
                }
            };
            this.send(errorResponse);
        }
    }
    /**
     * Handle incoming server notifications
     */
    handleServerNotification(request) {
        switch (request.method) {
            case 'notifications/message':
                return this.handleLoggingNotification(request);
            case 'notifications/cancelled':
                this._onDidReceiveCancelledNotification.fire(request);
                return this.handleCancelledNotification(request);
            case 'notifications/progress':
                this._onDidReceiveProgressNotification.fire(request);
                return;
            case 'notifications/resources/list_changed':
                this._onDidChangeResourceList.fire();
                return;
            case 'notifications/resources/updated':
                this._onDidUpdateResource.fire(request);
                return;
            case 'notifications/tools/list_changed':
                this._onDidChangeToolList.fire();
                return;
            case 'notifications/prompts/list_changed':
                this._onDidChangePromptList.fire();
                return;
            case 'notifications/elicitation/complete':
                this._onDidReceiveElicitationCompleteNotification.fire(request);
                return;
            case 'notifications/tasks/status':
                this._taskManager.getClientTask(request.params.taskId)?.onDidUpdateState(request.params);
                return;
            default:
                softAssertNever(request);
        }
    }
    handleCancelledNotification(request) {
        if (request.params.requestId) {
            const pendingRequest = this._pendingRequests.get(request.params.requestId);
            if (pendingRequest) {
                this._pendingRequests.delete(request.params.requestId);
                pendingRequest.promise.cancel();
            }
        }
    }
    handleLoggingNotification(request) {
        let contents = typeof request.params.data === 'string' ? request.params.data : JSON.stringify(request.params.data);
        if (request.params.logger) {
            contents = `${request.params.logger}: ${contents}`;
        }
        switch (request.params?.level) {
            case 'debug':
                this.logger.debug(contents);
                break;
            case 'info':
            case 'notice':
                this.logger.info(contents);
                break;
            case 'warning':
                this.logger.warn(contents);
                break;
            case 'error':
            case 'critical':
            case 'alert':
            case 'emergency':
                this.logger.error(contents);
                break;
            default:
                this.logger.info(contents);
                break;
        }
    }
    /**
     * Send a generic response to a request
     */
    respondToRequest(request, result) {
        const response = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: request.id,
            result
        };
        this.send(response);
    }
    /**
     * Send a response to a ping request
     */
    handlePing(_request) {
        return {};
    }
    /**
     * Send a response to a roots/list request
     */
    handleRootsList(_request) {
        this._hasAnnouncedRoots = true;
        return { roots: this._roots };
    }
    cancelAllRequests() {
        this._pendingRequests.forEach(pending => pending.promise.cancel());
        this._pendingRequests.clear();
    }
    dispose() {
        this.cancelAllRequests();
        super.dispose();
    }
    /**
     * Forwards log level changes to the MCP server if it supports logging
     */
    async _sendLogLevelToServer(logLevel) {
        try {
            // Only send if the server supports logging capabilities
            if (!this.capabilities.logging) {
                return;
            }
            await this.setLevel({ level: mapLogLevelToMcp(logLevel) });
        }
        catch (error) {
            this.logger.error(`Failed to set MCP server log level: ${error}`);
        }
    }
    /**
     * Send an initialize request
     */
    initialize(params, token) {
        return this.sendRequest({ method: 'initialize', params }, token);
    }
    /**
     * List available resources
     */
    listResources(params, token) {
        return Iterable.asyncToArrayFlat(this.listResourcesIterable(params, token));
    }
    /**
     * List available resources (iterable)
     */
    listResourcesIterable(params, token) {
        return this.sendRequestPaginated('resources/list', result => result.resources, params, token);
    }
    /**
     * Read a specific resource
     */
    readResource(params, token) {
        return this.sendRequest({ method: 'resources/read', params }, token);
    }
    /**
     * List available resource templates
     */
    listResourceTemplates(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('resources/templates/list', result => result.resourceTemplates, params, token));
    }
    /**
     * Subscribe to resource updates
     */
    subscribe(params, token) {
        return this.sendRequest({ method: 'resources/subscribe', params }, token);
    }
    /**
     * Unsubscribe from resource updates
     */
    unsubscribe(params, token) {
        return this.sendRequest({ method: 'resources/unsubscribe', params }, token);
    }
    /**
     * List available prompts
     */
    listPrompts(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('prompts/list', result => result.prompts, params, token));
    }
    /**
     * Get a specific prompt
     */
    getPrompt(params, token) {
        return this.sendRequest({ method: 'prompts/get', params }, token);
    }
    /**
     * List available tools
     */
    listTools(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('tools/list', result => result.tools, params, token));
    }
    /**
     * Call a specific tool. Supports tasks automatically if `task` is set on the request.
     */
    async callTool(params, token) {
        const response = await this.sendRequest({ method: 'tools/call', params }, token);
        if (isTaskResult(response)) {
            const task = new McpTask(response.task, token);
            this._taskManager.adoptClientTask(task);
            task.setHandler(this);
            return task.result.finally(() => {
                this._taskManager.abandonClientTask(task.id);
            });
        }
        return response;
    }
    /**
     * Set the logging level
     */
    setLevel(params, token) {
        return this.sendRequest({ method: 'logging/setLevel', params }, token);
    }
    /**
     * Find completions for an argument
     */
    complete(params, token) {
        return this.sendRequest({ method: 'completion/complete', params }, token);
    }
    /**
     * Get task status
     */
    getTask(params, token) {
        return this.sendRequest({ method: 'tasks/get', params }, token);
    }
    /**
     * Get task result
     */
    getTaskResult(params, token) {
        return this.sendRequest({ method: 'tasks/result', params }, token);
    }
    /**
     * Cancel a task
     */
    cancelTask(params, token) {
        return this.sendRequest({ method: 'tasks/cancel', params }, token);
    }
    /**
     * List all tasks
     */
    listTasks(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('tasks/list', result => result.tasks, params, token));
    }
}
function isTaskInTerminalState(task) {
    return task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';
}
/**
 * Implementation of a task that handles polling, status notifications, and handler reconnections. It implements the task polling loop internally and can also be
 * updated externally via `onDidUpdateState`, when notifications are received
 * for example.
 * @internal
 */
export class McpTask extends Disposable {
    get result() {
        return this.promise.p;
    }
    get id() {
        return this._task.taskId;
    }
    constructor(_task, _token = CancellationToken.None) {
        super();
        this._task = _task;
        this.promise = new DeferredPromise();
        this._handler = observableValue('mcpTaskHandler', undefined);
        const expiresAt = _task.ttl ? (Date.now() + _task.ttl) : undefined;
        this._lastTaskState = observableValue('lastTaskState', this._task);
        const store = this._register(new DisposableStore());
        // Handle external cancellation token
        if (_token.isCancellationRequested) {
            this._lastTaskState.set({ ...this._task, status: 'cancelled' }, undefined);
        }
        else {
            store.add(_token.onCancellationRequested(() => {
                const current = this._lastTaskState.get();
                if (!isTaskInTerminalState(current)) {
                    this._lastTaskState.set({ ...current, status: 'cancelled' }, undefined);
                }
            }));
        }
        // Handle TTL expiration with an explicit timeout
        if (expiresAt) {
            const ttlTimeout = expiresAt - Date.now();
            if (ttlTimeout <= 0) {
                this._lastTaskState.set({ ...this._task, status: 'cancelled', statusMessage: 'Task timed out.' }, undefined);
            }
            else {
                store.add(disposableTimeout(() => {
                    const current = this._lastTaskState.get();
                    if (!isTaskInTerminalState(current)) {
                        this._lastTaskState.set({ ...current, status: 'cancelled', statusMessage: 'Task timed out.' }, undefined);
                    }
                }, ttlTimeout));
            }
        }
        // A `tasks/result` call triggered by an input_required state.
        const inputRequiredLookup = observableValue('activeResultLookup', undefined);
        // 1. Poll for task updates when the task isn't in a terminal state
        store.add(autorun(reader => {
            const current = this._lastTaskState.read(reader);
            if (isTaskInTerminalState(current)) {
                return;
            }
            // When a task goes into the input_required state, by spec we should call
            // `tasks/result` which can return an SSE stream of task updates. No need
            // to poll while such a lookup is going on, but once it resolves we should
            // clear and update our state.
            const lookup = inputRequiredLookup.read(reader);
            if (lookup) {
                const result = lookup.promiseResult.read(reader);
                return transaction(tx => {
                    if (!result) {
                        // still ongoing
                    }
                    else if (result.data) {
                        inputRequiredLookup.set(undefined, tx);
                        this._lastTaskState.set(result.data, tx);
                    }
                    else {
                        inputRequiredLookup.set(undefined, tx);
                        if (result.error instanceof McpError && result.error.code === MCP.INVALID_PARAMS) {
                            this._lastTaskState.set({ ...current, status: 'cancelled' }, undefined);
                        }
                        else {
                            // Maybe a connection error -- start polling again
                            this._lastTaskState.set({ ...current, status: 'working' }, undefined);
                        }
                    }
                });
            }
            const handler = this._handler.read(reader);
            if (!handler) {
                return;
            }
            const pollInterval = _task.pollInterval ?? 2000;
            const cts = new CancellationTokenSource(_token);
            reader.store.add(toDisposable(() => cts.dispose(true)));
            reader.store.add(disposableTimeout(() => {
                handler.getTask({ taskId: current.taskId }, cts.token)
                    .catch((e) => {
                    if (e instanceof McpError && e.code === MCP.INVALID_PARAMS) {
                        return { ...current, status: 'cancelled' };
                    }
                    else {
                        return { ...current }; // errors are already logged, keep in current state
                    }
                })
                    .then(r => {
                    if (r && !cts.token.isCancellationRequested) {
                        this._lastTaskState.set(r, undefined);
                    }
                });
            }, pollInterval));
        }));
        // 2. Get the result once it's available (or propagate errors). Trigger
        // input_required handling as needed. Only react when the status itself changes.
        const lastStatus = this._lastTaskState.map(task => task.status);
        store.add(autorun(reader => {
            const status = lastStatus.read(reader);
            if (status === 'failed') {
                const current = this._lastTaskState.read(undefined);
                this.promise.error(new Error(`Task ${current.taskId} failed: ${current.statusMessage ?? 'unknown error'}`));
                store.dispose();
            }
            else if (status === 'cancelled') {
                this.promise.cancel();
                store.dispose();
            }
            else if (status === 'input_required') {
                const handler = this._handler.read(reader);
                if (handler) {
                    const current = this._lastTaskState.read(undefined);
                    const cts = new CancellationTokenSource(_token);
                    reader.store.add(toDisposable(() => cts.dispose(true)));
                    inputRequiredLookup.set(new ObservablePromise(handler.getTask({ taskId: current.taskId }, cts.token)), undefined);
                }
            }
            else if (status === 'completed') {
                const handler = this._handler.read(reader);
                if (handler) {
                    this.promise.settleWith(handler.getTaskResult({ taskId: _task.taskId }, _token));
                    store.dispose();
                }
            }
            else if (status === 'working') {
                // no-op
            }
            else {
                softAssertNever(status);
            }
        }));
    }
    onDidUpdateState(task) {
        this._lastTaskState.set(task, undefined);
    }
    setHandler(handler) {
        this._handler.set(handler, undefined);
    }
}
/**
 * Maps VSCode LogLevel to MCP LoggingLevel
 */
function mapLogLevelToMcp(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace:
            return 'debug'; // MCP doesn't have trace, use debug
        case LogLevel.Debug:
            return 'debug';
        case LogLevel.Info:
            return 'info';
        case LogLevel.Warning:
            return 'warning';
        case LogLevel.Error:
            return 'error';
        case LogLevel.Off:
            return 'emergency'; // MCP doesn't have off, use emergency
        default:
            return assertNever(logLevel); // Off and other levels are not supported
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTZXJ2ZXJSZXF1ZXN0SGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBdUIsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXRJLE9BQU8sRUFBRSxNQUFNLEVBQVcsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUd4RixPQUFPLEVBQXlDLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENB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
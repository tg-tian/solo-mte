/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../base/common/arrays.js';
import { timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableResourceMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { assertType } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { isChatViewTitleActionContext } from '../../contrib/chat/common/chatActions.js';
import { ChatAgentVoteDirection } from '../../contrib/chat/common/chatService.js';
import { LocalChatSessionUri } from '../../contrib/chat/common/chatUri.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
export class ChatAgentResponseStream {
    constructor(_extension, _request, _proxy, _commandsConverter, _sessionDisposables) {
        this._extension = _extension;
        this._request = _request;
        this._proxy = _proxy;
        this._commandsConverter = _commandsConverter;
        this._sessionDisposables = _sessionDisposables;
        this._stopWatch = StopWatch.create(false);
        this._isClosed = false;
    }
    close() {
        this._isClosed = true;
    }
    get timings() {
        return {
            firstProgress: this._firstProgress,
            totalElapsed: this._stopWatch.elapsed()
        };
    }
    get apiObject() {
        if (!this._apiObject) {
            const that = this;
            this._stopWatch.reset();
            let taskHandlePool = 0;
            function throwIfDone(source) {
                if (that._isClosed) {
                    const err = new Error('Response stream has been closed');
                    Error.captureStackTrace(err, source);
                    throw err;
                }
            }
            const sendQueue = [];
            let notify = [];
            function send(chunk, handle) {
                // push data into send queue. the first entry schedules the micro task which
                // does the actual send to the main thread
                const newLen = sendQueue.push(handle !== undefined ? [chunk, handle] : chunk);
                if (newLen === 1) {
                    queueMicrotask(() => {
                        const toNotify = notify;
                        notify = [];
                        that._proxy.$handleProgressChunk(that._request.requestId, sendQueue).finally(() => {
                            toNotify.forEach(f => f());
                        });
                        sendQueue.length = 0;
                    });
                }
                if (handle !== undefined) {
                    return new Promise(resolve => { notify.push(resolve); });
                }
                return;
            }
            const _report = (progress, task) => {
                // Measure the time to the first progress update with real markdown content
                if (typeof this._firstProgress === 'undefined' && (progress.kind === 'markdownContent' || progress.kind === 'markdownVuln' || progress.kind === 'prepareToolInvocation')) {
                    this._firstProgress = this._stopWatch.elapsed();
                }
                if (task) {
                    const myHandle = taskHandlePool++;
                    const progressReporterPromise = send(progress, myHandle);
                    const progressReporter = {
                        report: (p) => {
                            progressReporterPromise.then(() => {
                                if (extHostTypes.MarkdownString.isMarkdownString(p.value)) {
                                    send(typeConvert.ChatResponseWarningPart.from(p), myHandle);
                                }
                                else {
                                    send(typeConvert.ChatResponseReferencePart.from(p), myHandle);
                                }
                            });
                        }
                    };
                    Promise.all([progressReporterPromise, task(progressReporter)]).then(([_void, res]) => {
                        send(typeConvert.ChatTaskResult.from(res), myHandle);
                    });
                }
                else {
                    send(progress);
                }
            };
            this._apiObject = Object.freeze({
                clearToPreviousToolInvocation(reason) {
                    throwIfDone(this.markdown);
                    send({ kind: 'clearToPreviousToolInvocation', reason: reason });
                    return this;
                },
                markdown(value) {
                    throwIfDone(this.markdown);
                    const part = new extHostTypes.ChatResponseMarkdownPart(value);
                    const dto = typeConvert.ChatResponseMarkdownPart.from(part);
                    _report(dto);
                    return this;
                },
                markdownWithVulnerabilities(value, vulnerabilities) {
                    throwIfDone(this.markdown);
                    if (vulnerabilities) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    const part = new extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart(value, vulnerabilities);
                    const dto = typeConvert.ChatResponseMarkdownWithVulnerabilitiesPart.from(part);
                    _report(dto);
                    return this;
                },
                codeblockUri(value, isEdit) {
                    throwIfDone(this.codeblockUri);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseCodeblockUriPart(value, isEdit);
                    const dto = typeConvert.ChatResponseCodeblockUriPart.from(part);
                    _report(dto);
                    return this;
                },
                filetree(value, baseUri) {
                    throwIfDone(this.filetree);
                    const part = new extHostTypes.ChatResponseFileTreePart(value, baseUri);
                    const dto = typeConvert.ChatResponseFilesPart.from(part);
                    _report(dto);
                    return this;
                },
                anchor(value, title) {
                    const part = new extHostTypes.ChatResponseAnchorPart(value, title);
                    return this.push(part);
                },
                button(value) {
                    throwIfDone(this.anchor);
                    const part = new extHostTypes.ChatResponseCommandButtonPart(value);
                    const dto = typeConvert.ChatResponseCommandButtonPart.from(part, that._commandsConverter, that._sessionDisposables);
                    _report(dto);
                    return this;
                },
                progress(value, task) {
                    throwIfDone(this.progress);
                    const part = new extHostTypes.ChatResponseProgressPart2(value, task);
                    const dto = task ? typeConvert.ChatTask.from(part) : typeConvert.ChatResponseProgressPart.from(part);
                    _report(dto, task);
                    return this;
                },
                thinkingProgress(thinkingDelta) {
                    throwIfDone(this.thinkingProgress);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseThinkingProgressPart(thinkingDelta.text ?? '', thinkingDelta.id, thinkingDelta.metadata);
                    const dto = typeConvert.ChatResponseThinkingProgressPart.from(part);
                    _report(dto);
                    return this;
                },
                warning(value) {
                    throwIfDone(this.progress);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseWarningPart(value);
                    const dto = typeConvert.ChatResponseWarningPart.from(part);
                    _report(dto);
                    return this;
                },
                reference(value, iconPath) {
                    return this.reference2(value, iconPath);
                },
                reference2(value, iconPath, options) {
                    throwIfDone(this.reference);
                    if (typeof value === 'object' && 'variableName' in value) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    if (typeof value === 'object' && 'variableName' in value && !value.value) {
                        // The participant used this variable. Does that variable have any references to pull in?
                        const matchingVarData = that._request.variables.variables.find(v => v.name === value.variableName);
                        if (matchingVarData) {
                            let references;
                            if (matchingVarData.references?.length) {
                                references = matchingVarData.references.map(r => ({
                                    kind: 'reference',
                                    reference: { variableName: value.variableName, value: r.reference }
                                }));
                            }
                            else {
                                // Participant sent a variableName reference but the variable produced no references. Show variable reference with no value
                                const part = new extHostTypes.ChatResponseReferencePart(value, iconPath, options);
                                const dto = typeConvert.ChatResponseReferencePart.from(part);
                                references = [dto];
                            }
                            references.forEach(r => _report(r));
                            return this;
                        }
                        else {
                            // Something went wrong- that variable doesn't actually exist
                        }
                    }
                    else {
                        const part = new extHostTypes.ChatResponseReferencePart(value, iconPath, options);
                        const dto = typeConvert.ChatResponseReferencePart.from(part);
                        _report(dto);
                    }
                    return this;
                },
                codeCitation(value, license, snippet) {
                    throwIfDone(this.codeCitation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseCodeCitationPart(value, license, snippet);
                    const dto = typeConvert.ChatResponseCodeCitationPart.from(part);
                    _report(dto);
                },
                textEdit(target, edits) {
                    throwIfDone(this.textEdit);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseTextEditPart(target, edits);
                    part.isDone = edits === true ? true : undefined;
                    const dto = typeConvert.ChatResponseTextEditPart.from(part);
                    _report(dto);
                    return this;
                },
                notebookEdit(target, edits) {
                    throwIfDone(this.notebookEdit);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseNotebookEditPart(target, edits);
                    const dto = typeConvert.ChatResponseNotebookEditPart.from(part);
                    _report(dto);
                    return this;
                },
                async externalEdit(target, callback) {
                    throwIfDone(this.externalEdit);
                    const resources = Array.isArray(target) ? target : [target];
                    const operationId = taskHandlePool++;
                    const undoStopId = generateUuid();
                    await send({ kind: 'externalEdits', start: true, resources, undoStopId }, operationId);
                    try {
                        await callback();
                        return undoStopId;
                    }
                    finally {
                        await send({ kind: 'externalEdits', start: false, resources, undoStopId }, operationId);
                    }
                },
                confirmation(title, message, data, buttons) {
                    throwIfDone(this.confirmation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseConfirmationPart(title, message, data, buttons);
                    const dto = typeConvert.ChatResponseConfirmationPart.from(part);
                    _report(dto);
                    return this;
                },
                prepareToolInvocation(toolName) {
                    throwIfDone(this.prepareToolInvocation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatPrepareToolInvocationPart(toolName);
                    const dto = typeConvert.ChatPrepareToolInvocationPart.from(part);
                    _report(dto);
                    return this;
                },
                push(part) {
                    throwIfDone(this.push);
                    if (part instanceof extHostTypes.ChatResponseTextEditPart ||
                        part instanceof extHostTypes.ChatResponseNotebookEditPart ||
                        part instanceof extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart ||
                        part instanceof extHostTypes.ChatResponseWarningPart ||
                        part instanceof extHostTypes.ChatResponseConfirmationPart ||
                        part instanceof extHostTypes.ChatResponseCodeCitationPart ||
                        part instanceof extHostTypes.ChatResponseMovePart ||
                        part instanceof extHostTypes.ChatResponseExtensionsPart ||
                        part instanceof extHostTypes.ChatResponseExternalEditPart ||
                        part instanceof extHostTypes.ChatResponseThinkingProgressPart ||
                        part instanceof extHostTypes.ChatResponsePullRequestPart ||
                        part instanceof extHostTypes.ChatResponseProgressPart2) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    if (part instanceof extHostTypes.ChatResponseReferencePart) {
                        // Ensure variable reference values get fixed up
                        this.reference2(part.value, part.iconPath, part.options);
                    }
                    else if (part instanceof extHostTypes.ChatResponseProgressPart2) {
                        const dto = part.task ? typeConvert.ChatTask.from(part) : typeConvert.ChatResponseProgressPart.from(part);
                        _report(dto, part.task);
                    }
                    else if (part instanceof extHostTypes.ChatResponseThinkingProgressPart) {
                        const dto = typeConvert.ChatResponseThinkingProgressPart.from(part);
                        _report(dto);
                    }
                    else if (part instanceof extHostTypes.ChatResponseAnchorPart) {
                        const dto = typeConvert.ChatResponseAnchorPart.from(part);
                        if (part.resolve) {
                            checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                            dto.resolveId = generateUuid();
                            const cts = new CancellationTokenSource();
                            part.resolve(cts.token)
                                .then(() => {
                                const resolvedDto = typeConvert.ChatResponseAnchorPart.from(part);
                                that._proxy.$handleAnchorResolve(that._request.requestId, dto.resolveId, resolvedDto);
                            })
                                .then(() => cts.dispose(), () => cts.dispose());
                            that._sessionDisposables.add(toDisposable(() => cts.dispose(true)));
                        }
                        _report(dto);
                    }
                    else if (part instanceof extHostTypes.ChatPrepareToolInvocationPart) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                        const dto = typeConvert.ChatPrepareToolInvocationPart.from(part);
                        _report(dto);
                        return this;
                    }
                    else if (part instanceof extHostTypes.ChatResponseExternalEditPart) {
                        const p = this.externalEdit(part.uris, part.callback);
                        p.then((value) => part.didGetApplied(value));
                        return this;
                    }
                    else {
                        const dto = typeConvert.ChatResponsePart.from(part, that._commandsConverter, that._sessionDisposables);
                        _report(dto);
                    }
                    return this;
                },
            });
        }
        return this._apiObject;
    }
}
export class ExtHostChatAgents2 extends Disposable {
    static { this._idPool = 0; }
    static { this._participantDetectionProviderIdPool = 0; }
    static { this._relatedFilesProviderIdPool = 0; }
    static { this._customAgentsProviderIdPool = 0; }
    constructor(mainContext, _logService, _commands, _documents, _editorsAndDocuments, _languageModels, _diagnostics, _tools) {
        super();
        this._logService = _logService;
        this._commands = _commands;
        this._documents = _documents;
        this._editorsAndDocuments = _editorsAndDocuments;
        this._languageModels = _languageModels;
        this._diagnostics = _diagnostics;
        this._tools = _tools;
        this._agents = new Map();
        this._participantDetectionProviders = new Map();
        this._relatedFilesProviders = new Map();
        this._customAgentsProviders = new Map();
        this._sessionDisposables = this._register(new DisposableResourceMap());
        this._completionDisposables = this._register(new DisposableMap());
        this._inFlightRequests = new Set();
        this._onDidChangeChatRequestTools = this._register(new Emitter());
        this.onDidChangeChatRequestTools = this._onDidChangeChatRequestTools.event;
        this._onDidDisposeChatSession = this._register(new Emitter());
        this.onDidDisposeChatSession = this._onDidDisposeChatSession.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadChatAgents2);
        _commands.registerArgumentProcessor({
            processArgument: (arg) => {
                // Don't send this argument to extension commands
                if (isChatViewTitleActionContext(arg)) {
                    return null;
                }
                return arg;
            }
        });
    }
    transferActiveChat(newWorkspace) {
        this._proxy.$transferActiveChatSession(newWorkspace);
    }
    createChatAgent(extension, id, handler) {
        const handle = ExtHostChatAgents2._idPool++;
        const agent = new ExtHostChatAgent(extension, id, this._proxy, handle, handler);
        this._agents.set(handle, agent);
        this._proxy.$registerAgent(handle, extension.identifier, id, {}, undefined);
        return agent.apiAgent;
    }
    createDynamicChatAgent(extension, id, dynamicProps, handler) {
        const handle = ExtHostChatAgents2._idPool++;
        const agent = new ExtHostChatAgent(extension, id, this._proxy, handle, handler);
        this._agents.set(handle, agent);
        this._proxy.$registerAgent(handle, extension.identifier, id, { isSticky: true }, dynamicProps);
        return agent.apiAgent;
    }
    registerChatParticipantDetectionProvider(extension, provider) {
        const handle = ExtHostChatAgents2._participantDetectionProviderIdPool++;
        this._participantDetectionProviders.set(handle, new ExtHostParticipantDetector(extension, provider));
        this._proxy.$registerChatParticipantDetectionProvider(handle);
        return toDisposable(() => {
            this._participantDetectionProviders.delete(handle);
            this._proxy.$unregisterChatParticipantDetectionProvider(handle);
        });
    }
    registerRelatedFilesProvider(extension, provider, metadata) {
        const handle = ExtHostChatAgents2._relatedFilesProviderIdPool++;
        this._relatedFilesProviders.set(handle, new ExtHostRelatedFilesProvider(extension, provider));
        this._proxy.$registerRelatedFilesProvider(handle, metadata);
        return toDisposable(() => {
            this._relatedFilesProviders.delete(handle);
            this._proxy.$unregisterRelatedFilesProvider(handle);
        });
    }
    registerCustomAgentsProvider(extension, provider) {
        const handle = ExtHostChatAgents2._customAgentsProviderIdPool++;
        this._customAgentsProviders.set(handle, { extension, provider });
        this._proxy.$registerCustomAgentsProvider(handle, extension.identifier);
        const disposables = new DisposableStore();
        // Listen to provider change events and notify main thread
        if (provider.onDidChangeCustomAgents) {
            disposables.add(provider.onDidChangeCustomAgents(() => {
                this._proxy.$onDidChangeCustomAgents(handle);
            }));
        }
        disposables.add(toDisposable(() => {
            this._customAgentsProviders.delete(handle);
            this._proxy.$unregisterCustomAgentsProvider(handle);
        }));
        return disposables;
    }
    async $provideRelatedFiles(handle, request, token) {
        const provider = this._relatedFilesProviders.get(handle);
        if (!provider) {
            return Promise.resolve([]);
        }
        const extRequestDraft = typeConvert.ChatRequestDraft.to(request);
        return await provider.provider.provideRelatedFiles(extRequestDraft, token) ?? undefined;
    }
    async $provideCustomAgents(handle, options, token) {
        const providerData = this._customAgentsProviders.get(handle);
        if (!providerData) {
            return Promise.resolve(undefined);
        }
        return await providerData.provider.provideCustomAgents(options, token) ?? undefined;
    }
    async $detectChatParticipant(handle, requestDto, context, options, token) {
        const detector = this._participantDetectionProviders.get(handle);
        if (!detector) {
            return undefined;
        }
        const { request, location, history } = await this._createRequest(requestDto, context, detector.extension);
        const model = await this.getModelForRequest(request, detector.extension);
        const extRequest = typeConvert.ChatAgentRequest.to(request, location, model, this.getDiagnosticsWhenEnabled(detector.extension), this.getToolsForRequest(detector.extension, request.userSelectedTools), detector.extension, this._logService);
        return detector.provider.provideParticipantDetection(extRequest, { history }, { participants: options.participants, location: typeConvert.ChatLocation.to(options.location) }, token);
    }
    async _createRequest(requestDto, context, extension) {
        const request = revive(requestDto);
        const convertedHistory = await this.prepareHistoryTurns(extension, request.agentId, context);
        // in-place converting for location-data
        let location;
        if (request.locationData?.type === ChatAgentLocation.EditorInline) {
            // editor data
            const document = this._documents.getDocument(request.locationData.document);
            const editor = this._editorsAndDocuments.getEditor(request.locationData.id);
            location = new extHostTypes.ChatRequestEditorData(editor.value, document, typeConvert.Selection.to(request.locationData.selection), typeConvert.Range.to(request.locationData.wholeRange));
        }
        else if (request.locationData?.type === ChatAgentLocation.Notebook) {
            // notebook data
            const cell = this._documents.getDocument(request.locationData.sessionInputUri);
            location = new extHostTypes.ChatRequestNotebookData(cell);
        }
        else if (request.locationData?.type === ChatAgentLocation.Terminal) {
            // TBD
        }
        return { request, location, history: convertedHistory };
    }
    async getModelForRequest(request, extension) {
        let model;
        if (request.userSelectedModelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, request.userSelectedModelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    async $setRequestTools(requestId, tools) {
        const request = [...this._inFlightRequests].find(r => r.requestId === requestId);
        if (!request) {
            return;
        }
        request.extRequest.tools.clear();
        for (const [k, v] of this.getToolsForRequest(request.extension, tools)) {
            request.extRequest.tools.set(k, v);
        }
        this._onDidChangeChatRequestTools.fire(request.extRequest);
    }
    async $invokeAgent(handle, requestDto, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            throw new Error(`[CHAT](${handle}) CANNOT invoke agent because the agent is not registered`);
        }
        let stream;
        let inFlightRequest;
        try {
            const { request, location, history } = await this._createRequest(requestDto, context, agent.extension);
            // Init session disposables
            let sessionDisposables = this._sessionDisposables.get(request.sessionResource);
            if (!sessionDisposables) {
                sessionDisposables = new DisposableStore();
                this._sessionDisposables.set(request.sessionResource, sessionDisposables);
            }
            stream = new ChatAgentResponseStream(agent.extension, request, this._proxy, this._commands.converter, sessionDisposables);
            const model = await this.getModelForRequest(request, agent.extension);
            const extRequest = typeConvert.ChatAgentRequest.to(request, location, model, this.getDiagnosticsWhenEnabled(agent.extension), this.getToolsForRequest(agent.extension, request.userSelectedTools), agent.extension, this._logService);
            inFlightRequest = { requestId: requestDto.requestId, extRequest, extension: agent.extension };
            this._inFlightRequests.add(inFlightRequest);
            // If this request originates from a contributed chat session editor, attempt to resolve the ChatSession API object
            let chatSessionContext;
            if (context.chatSessionContext) {
                chatSessionContext = {
                    chatSessionItem: {
                        resource: URI.revive(context.chatSessionContext.chatSessionResource),
                        label: context.chatSessionContext.isUntitled ? 'Untitled Session' : 'Session',
                    },
                    isUntitled: context.chatSessionContext.isUntitled,
                };
            }
            const chatContext = { history, chatSessionContext };
            const task = agent.invoke(extRequest, chatContext, stream.apiObject, token);
            return await raceCancellationWithTimeout(1000, Promise.resolve(task).then((result) => {
                if (result?.metadata) {
                    try {
                        JSON.stringify(result.metadata);
                    }
                    catch (err) {
                        const msg = `result.metadata MUST be JSON.stringify-able. Got error: ${err.message}`;
                        this._logService.error(`[${agent.extension.identifier.value}] [@${agent.id}] ${msg}`, agent.extension);
                        return { errorDetails: { message: msg }, timings: stream?.timings, nextQuestion: result.nextQuestion, };
                    }
                }
                let errorDetails;
                if (result?.errorDetails) {
                    errorDetails = {
                        ...result.errorDetails,
                        responseIsIncomplete: true
                    };
                }
                if (errorDetails?.responseIsRedacted || errorDetails?.isQuotaExceeded || errorDetails?.isRateLimited || errorDetails?.confirmationButtons || errorDetails?.code) {
                    checkProposedApiEnabled(agent.extension, 'chatParticipantPrivate');
                }
                return { errorDetails, timings: stream?.timings, metadata: result?.metadata, nextQuestion: result?.nextQuestion, details: result?.details };
            }), token);
        }
        catch (e) {
            this._logService.error(e, agent.extension);
            if (e instanceof extHostTypes.LanguageModelError && e.cause) {
                e = e.cause;
            }
            const isQuotaExceeded = e instanceof Error && e.name === 'ChatQuotaExceeded';
            const isRateLimited = e instanceof Error && e.name === 'ChatRateLimited';
            return { errorDetails: { message: toErrorMessage(e), responseIsIncomplete: true, isQuotaExceeded, isRateLimited } };
        }
        finally {
            if (inFlightRequest) {
                this._inFlightRequests.delete(inFlightRequest);
            }
            stream?.close();
        }
    }
    getDiagnosticsWhenEnabled(extension) {
        if (!isProposedApiEnabled(extension, 'chatReferenceDiagnostic')) {
            return [];
        }
        return this._diagnostics.getDiagnostics();
    }
    getToolsForRequest(extension, tools) {
        if (!tools) {
            return new Map();
        }
        const result = new Map();
        for (const tool of this._tools.getTools(extension)) {
            if (typeof tools[tool.name] === 'boolean') {
                result.set(tool.name, tools[tool.name]);
            }
        }
        return result;
    }
    async prepareHistoryTurns(extension, agentId, context) {
        const res = [];
        for (const h of context.history) {
            const ehResult = typeConvert.ChatAgentResult.to(h.result);
            const result = agentId === h.request.agentId ?
                ehResult :
                { ...ehResult, metadata: undefined };
            // REQUEST turn
            const varsWithoutTools = [];
            const toolReferences = [];
            for (const v of h.request.variables.variables) {
                if (v.kind === 'tool') {
                    toolReferences.push(typeConvert.ChatLanguageModelToolReference.to(v));
                }
                else if (v.kind === 'toolset') {
                    toolReferences.push(...v.value.map(typeConvert.ChatLanguageModelToolReference.to));
                }
                else {
                    const ref = typeConvert.ChatPromptReference.to(v, this.getDiagnosticsWhenEnabled(extension), this._logService);
                    if (ref) {
                        varsWithoutTools.push(ref);
                    }
                }
            }
            const editedFileEvents = isProposedApiEnabled(extension, 'chatParticipantPrivate') ? h.request.editedFileEvents : undefined;
            const turn = new extHostTypes.ChatRequestTurn(h.request.message, h.request.command, varsWithoutTools, h.request.agentId, toolReferences, editedFileEvents, h.request.requestId);
            res.push(turn);
            // RESPONSE turn
            const parts = coalesce(h.response.map(r => typeConvert.ChatResponsePart.toContent(r, this._commands.converter)));
            res.push(new extHostTypes.ChatResponseTurn(parts, result, h.request.agentId, h.request.command));
        }
        return res;
    }
    $releaseSession(sessionResourceDto) {
        const sessionResource = URI.revive(sessionResourceDto);
        this._sessionDisposables.deleteAndDispose(sessionResource);
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (sessionId) {
            this._onDidDisposeChatSession.fire(sessionId);
        }
    }
    async $provideFollowups(requestDto, handle, result, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return Promise.resolve([]);
        }
        const request = revive(requestDto);
        const convertedHistory = await this.prepareHistoryTurns(agent.extension, agent.id, context);
        const ehResult = typeConvert.ChatAgentResult.to(result);
        return (await agent.provideFollowups(ehResult, { history: convertedHistory }, token))
            .filter(f => {
            // The followup must refer to a participant that exists from the same extension
            const isValid = !f.participant || Iterable.some(this._agents.values(), a => a.id === f.participant && ExtensionIdentifier.equals(a.extension.identifier, agent.extension.identifier));
            if (!isValid) {
                this._logService.warn(`[@${agent.id}] ChatFollowup refers to an unknown participant: ${f.participant}`);
            }
            return isValid;
        })
            .map(f => typeConvert.ChatFollowup.from(f, request));
    }
    $acceptFeedback(handle, result, voteAction) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const ehResult = typeConvert.ChatAgentResult.to(result);
        let kind;
        switch (voteAction.direction) {
            case ChatAgentVoteDirection.Down:
                kind = extHostTypes.ChatResultFeedbackKind.Unhelpful;
                break;
            case ChatAgentVoteDirection.Up:
                kind = extHostTypes.ChatResultFeedbackKind.Helpful;
                break;
        }
        const feedback = {
            result: ehResult,
            kind,
            unhelpfulReason: isProposedApiEnabled(agent.extension, 'chatParticipantAdditions') ? voteAction.reason : undefined,
        };
        agent.acceptFeedback(Object.freeze(feedback));
    }
    $acceptAction(handle, result, event) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        if (event.action.kind === 'vote') {
            // handled by $acceptFeedback
            return;
        }
        const ehAction = typeConvert.ChatAgentUserActionEvent.to(result, event, this._commands.converter);
        if (ehAction) {
            agent.acceptAction(Object.freeze(ehAction));
        }
    }
    async $invokeCompletionProvider(handle, query, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return [];
        }
        let disposables = this._completionDisposables.get(handle);
        if (disposables) {
            // Clear any disposables from the last invocation of this completion provider
            disposables.clear();
        }
        else {
            disposables = new DisposableStore();
            this._completionDisposables.set(handle, disposables);
        }
        const items = await agent.invokeCompletionProvider(query, token);
        return items.map((i) => typeConvert.ChatAgentCompletionItem.from(i, this._commands.converter, disposables));
    }
    async $provideChatTitle(handle, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const history = await this.prepareHistoryTurns(agent.extension, agent.id, { history: context });
        return await agent.provideTitle({ history }, token);
    }
    async $provideChatSummary(handle, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const history = await this.prepareHistoryTurns(agent.extension, agent.id, { history: context });
        return await agent.provideSummary({ history }, token);
    }
}
class ExtHostParticipantDetector {
    constructor(extension, provider) {
        this.extension = extension;
        this.provider = provider;
    }
}
class ExtHostRelatedFilesProvider {
    constructor(extension, provider) {
        this.extension = extension;
        this.provider = provider;
    }
}
class ExtHostChatAgent {
    constructor(extension, id, _proxy, _handle, _requestHandler) {
        this.extension = extension;
        this.id = id;
        this._proxy = _proxy;
        this._handle = _handle;
        this._requestHandler = _requestHandler;
        this._onDidReceiveFeedback = new Emitter();
        this._onDidPerformAction = new Emitter();
        this._pauseStateEmitter = new Emitter();
    }
    acceptFeedback(feedback) {
        this._onDidReceiveFeedback.fire(feedback);
    }
    acceptAction(event) {
        this._onDidPerformAction.fire(event);
    }
    setChatRequestPauseState(pauseState) {
        this._pauseStateEmitter.fire(pauseState);
    }
    async invokeCompletionProvider(query, token) {
        if (!this._agentVariableProvider) {
            return [];
        }
        return await this._agentVariableProvider.provider.provideCompletionItems(query, token) ?? [];
    }
    async provideFollowups(result, context, token) {
        if (!this._followupProvider) {
            return [];
        }
        const followups = await this._followupProvider.provideFollowups(result, context, token);
        if (!followups) {
            return [];
        }
        return followups
            // Filter out "command followups" from older providers
            .filter(f => !(f && 'commandId' in f))
            // Filter out followups from older providers before 'message' changed to 'prompt'
            .filter(f => !(f && 'message' in f));
    }
    async provideTitle(context, token) {
        if (!this._titleProvider) {
            return;
        }
        return await this._titleProvider.provideChatTitle(context, token) ?? undefined;
    }
    async provideSummary(context, token) {
        if (!this._summarizer) {
            return;
        }
        return await this._summarizer.provideChatSummary(context, token) ?? undefined;
    }
    get apiAgent() {
        let disposed = false;
        let updateScheduled = false;
        const updateMetadataSoon = () => {
            if (disposed) {
                return;
            }
            if (updateScheduled) {
                return;
            }
            updateScheduled = true;
            queueMicrotask(() => {
                this._proxy.$updateAgent(this._handle, {
                    icon: !this._iconPath ? undefined :
                        this._iconPath instanceof URI ? this._iconPath :
                            'light' in this._iconPath ? this._iconPath.light :
                                undefined,
                    iconDark: !this._iconPath ? undefined :
                        'dark' in this._iconPath ? this._iconPath.dark :
                            undefined,
                    themeIcon: this._iconPath instanceof extHostTypes.ThemeIcon ? this._iconPath : undefined,
                    hasFollowups: this._followupProvider !== undefined,
                    helpTextPrefix: (!this._helpTextPrefix || typeof this._helpTextPrefix === 'string') ? this._helpTextPrefix : typeConvert.MarkdownString.from(this._helpTextPrefix),
                    helpTextPostfix: (!this._helpTextPostfix || typeof this._helpTextPostfix === 'string') ? this._helpTextPostfix : typeConvert.MarkdownString.from(this._helpTextPostfix),
                    supportIssueReporting: this._supportIssueReporting,
                    additionalWelcomeMessage: (!this._additionalWelcomeMessage || typeof this._additionalWelcomeMessage === 'string') ? this._additionalWelcomeMessage : typeConvert.MarkdownString.from(this._additionalWelcomeMessage),
                });
                updateScheduled = false;
            });
        };
        const that = this;
        return {
            get id() {
                return that.id;
            },
            get iconPath() {
                return that._iconPath;
            },
            set iconPath(v) {
                that._iconPath = v;
                updateMetadataSoon();
            },
            get requestHandler() {
                return that._requestHandler;
            },
            set requestHandler(v) {
                assertType(typeof v === 'function', 'Invalid request handler');
                that._requestHandler = v;
            },
            get followupProvider() {
                return that._followupProvider;
            },
            set followupProvider(v) {
                that._followupProvider = v;
                updateMetadataSoon();
            },
            get helpTextPrefix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextPrefix;
            },
            set helpTextPrefix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextPrefix = v;
                updateMetadataSoon();
            },
            get helpTextPostfix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextPostfix;
            },
            set helpTextPostfix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextPostfix = v;
                updateMetadataSoon();
            },
            get supportIssueReporting() {
                checkProposedApiEnabled(that.extension, 'chatParticipantPrivate');
                return that._supportIssueReporting;
            },
            set supportIssueReporting(v) {
                checkProposedApiEnabled(that.extension, 'chatParticipantPrivate');
                that._supportIssueReporting = v;
                updateMetadataSoon();
            },
            get onDidReceiveFeedback() {
                return that._onDidReceiveFeedback.event;
            },
            set participantVariableProvider(v) {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                that._agentVariableProvider = v;
                if (v) {
                    if (!v.triggerCharacters.length) {
                        throw new Error('triggerCharacters are required');
                    }
                    that._proxy.$registerAgentCompletionsProvider(that._handle, that.id, v.triggerCharacters);
                }
                else {
                    that._proxy.$unregisterAgentCompletionsProvider(that._handle, that.id);
                }
            },
            get participantVariableProvider() {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                return that._agentVariableProvider;
            },
            set additionalWelcomeMessage(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._additionalWelcomeMessage = v;
                updateMetadataSoon();
            },
            get additionalWelcomeMessage() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._additionalWelcomeMessage;
            },
            set titleProvider(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._titleProvider = v;
                updateMetadataSoon();
            },
            get titleProvider() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._titleProvider;
            },
            set summarizer(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._summarizer = v;
            },
            get summarizer() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._summarizer;
            },
            get onDidChangePauseState() {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                return that._pauseStateEmitter.event;
            },
            onDidPerformAction: !isProposedApiEnabled(this.extension, 'chatParticipantAdditions')
                ? undefined
                : this._onDidPerformAction.event,
            dispose() {
                disposed = true;
                that._followupProvider = undefined;
                that._onDidReceiveFeedback.dispose();
                that._proxy.$unregisterAgent(that._handle);
            },
        };
    }
    invoke(request, context, response, token) {
        return this._requestHandler(request, context, response, token);
    }
}
/**
 * raceCancellation, but give the promise a little time to complete to see if we can get a real result quickly.
 */
function raceCancellationWithTimeout(cancelWait, promise, token) {
    return new Promise((resolve, reject) => {
        const ref = token.onCancellationRequested(async () => {
            ref.dispose();
            await timeout(cancelWait);
            resolve(undefined);
        });
        promise.then(resolve, reject).finally(() => ref.dispose());
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDaGF0QWdlbnRzMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEksT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFNUQsT0FBTyxFQUFFLG1CQUFtQixFQUF1RCxNQUFNLG1EQUFtRCxDQUFDO0FBRTdJLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBMEcsTUFBTSwwQ0FBMEMsQ0FBQztBQUMxTCxP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
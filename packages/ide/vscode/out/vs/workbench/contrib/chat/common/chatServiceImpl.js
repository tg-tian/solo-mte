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
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { BugIndicatingError, ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableResourceMap, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun, derived } from '../../../../base/common/observable.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IMcpService } from '../../mcp/common/mcpTypes.js';
import { awaitStatsForSession } from './chat.js';
import { IChatAgentService } from './chatAgents.js';
import { chatEditingSessionIsReady } from './chatEditingService.js';
import { ChatModel, ChatRequestModel, normalizeSerializableChatData, toChatHistoryContent, updateRanges } from './chatModel.js';
import { ChatModelStore } from './chatModelStore.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, ChatRequestTextPart, chatSubcommandLeader, getPromptText } from './chatParserTypes.js';
import { ChatRequestParser } from './chatRequestParser.js';
import { ChatMcpServersStarting } from './chatService.js';
import { ChatRequestTelemetry, ChatServiceTelemetry } from './chatServiceTelemetry.js';
import { IChatSessionsService } from './chatSessionsService.js';
import { ChatSessionStore } from './chatSessionStore.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatTransferService } from './chatTransferService.js';
import { LocalChatSessionUri } from './chatUri.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from './constants.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const serializedChatKey = 'interactive.sessions';
const TransferredGlobalChatKey = 'chat.workspaceTransfer';
const SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS = 1000 * 60;
let CancellableRequest = class CancellableRequest {
    constructor(cancellationTokenSource, requestId, toolsService) {
        this.cancellationTokenSource = cancellationTokenSource;
        this.requestId = requestId;
        this.toolsService = toolsService;
    }
    dispose() {
        this.cancellationTokenSource.dispose();
    }
    cancel() {
        if (this.requestId) {
            this.toolsService.cancelToolCallsForRequest(this.requestId);
        }
        this.cancellationTokenSource.cancel();
    }
};
CancellableRequest = __decorate([
    __param(2, ILanguageModelToolsService)
], CancellableRequest);
let ChatService = class ChatService extends Disposable {
    get transferredSessionData() {
        return this._transferredSessionData;
    }
    /**
     * For test use only
     */
    setSaveModelsEnabled(enabled) {
        this._saveModelsEnabled = enabled;
    }
    /**
     * For test use only
     */
    waitForModelDisposals() {
        return this._sessionModels.waitForModelDisposals();
    }
    get edits2Enabled() {
        return this.configurationService.getValue(ChatConfiguration.Edits2Enabled);
    }
    get isEmptyWindow() {
        const workspace = this.workspaceContextService.getWorkspace();
        return !workspace.configuration && workspace.folders.length === 0;
    }
    constructor(storageService, logService, extensionService, instantiationService, workspaceContextService, chatSlashCommandService, chatAgentService, configurationService, chatTransferService, chatSessionService, mcpService) {
        super();
        this.storageService = storageService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.workspaceContextService = workspaceContextService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.chatTransferService = chatTransferService;
        this.chatSessionService = chatSessionService;
        this.mcpService = mcpService;
        this._pendingRequests = this._register(new DisposableResourceMap());
        this._saveModelsEnabled = true;
        this._onDidSubmitRequest = this._register(new Emitter());
        this.onDidSubmitRequest = this._onDidSubmitRequest.event;
        this._onDidPerformUserAction = this._register(new Emitter());
        this.onDidPerformUserAction = this._onDidPerformUserAction.event;
        this._onDidDisposeSession = this._register(new Emitter());
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this._sessionFollowupCancelTokens = this._register(new DisposableResourceMap());
        this._sessionModels = this._register(instantiationService.createInstance(ChatModelStore, {
            createModel: (props) => this._startSession(props),
            willDisposeModel: async (model) => {
                const localSessionId = LocalChatSessionUri.parseLocalSessionId(model.sessionResource);
                if (localSessionId && this.shouldStoreSession(model)) {
                    // Always preserve sessions that have custom titles, even if empty
                    if (model.getRequests().length === 0 && !model.customTitle) {
                        await this._chatSessionStore.deleteSession(localSessionId);
                    }
                    else if (this._saveModelsEnabled) {
                        await this._chatSessionStore.storeSessions([model]);
                    }
                }
                else if (!localSessionId && model.getRequests().length > 0) {
                    await this._chatSessionStore.storeSessionsMetadataOnly([model]);
                }
            }
        }));
        this._register(this._sessionModels.onDidDisposeModel(model => {
            this._onDidDisposeSession.fire({ sessionResource: [model.sessionResource], reason: 'cleared' });
        }));
        this._chatServiceTelemetry = this.instantiationService.createInstance(ChatServiceTelemetry);
        const sessionData = storageService.get(serializedChatKey, this.isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */, '');
        if (sessionData) {
            this._persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(this._persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            this._persistedSessions = {};
        }
        const transferredData = this.getTransferredSessionData();
        const transferredChat = transferredData?.chat;
        if (transferredChat) {
            this.trace('constructor', `Transferred session ${transferredChat.sessionId}`);
            this._persistedSessions[transferredChat.sessionId] = transferredChat;
            this._transferredSessionData = {
                sessionId: transferredChat.sessionId,
                location: transferredData.location,
                inputState: transferredData.inputState
            };
        }
        this._chatSessionStore = this._register(this.instantiationService.createInstance(ChatSessionStore));
        this._chatSessionStore.migrateDataIfNeeded(() => this._persistedSessions);
        // When using file storage, populate _persistedSessions with session metadata from the index
        // This ensures that getPersistedSessionTitle() can find titles for inactive sessions
        this.initializePersistedSessionsFromFileStorage().then(() => {
            this.reviveSessionsWithEdits();
        });
        this._register(storageService.onWillSaveState(() => this.saveState()));
        this.chatModels = derived(this, reader => [...this._sessionModels.observable.read(reader).values()]);
        this.requestInProgressObs = derived(reader => {
            const models = this._sessionModels.observable.read(reader).values();
            return Iterable.some(models, model => model.requestInProgress.read(reader));
        });
    }
    get editingSessions() {
        return [...this._sessionModels.values()].map(v => v.editingSession).filter(isDefined);
    }
    isEnabled(location) {
        return this.chatAgentService.getContributedDefaultAgent(location) !== undefined;
    }
    saveState() {
        if (!this._saveModelsEnabled) {
            return;
        }
        const liveLocalChats = Array.from(this._sessionModels.values())
            .filter(session => this.shouldStoreSession(session));
        this._chatSessionStore.storeSessions(liveLocalChats);
        const liveNonLocalChats = Array.from(this._sessionModels.values())
            .filter(session => !LocalChatSessionUri.parseLocalSessionId(session.sessionResource));
        this._chatSessionStore.storeSessionsMetadataOnly(liveNonLocalChats);
    }
    /**
     * Only persist local sessions from chat that are not imported.
     */
    shouldStoreSession(session) {
        if (!LocalChatSessionUri.parseLocalSessionId(session.sessionResource)) {
            return false;
        }
        return session.initialLocation === ChatAgentLocation.Chat && !session.isImported;
    }
    notifyUserAction(action) {
        this._chatServiceTelemetry.notifyUserAction(action);
        this._onDidPerformUserAction.fire(action);
        if (action.action.kind === 'chatEditingSessionAction') {
            const model = this._sessionModels.get(action.sessionResource);
            if (model) {
                model.notifyEditingAction(action.action);
            }
        }
    }
    async setChatSessionTitle(sessionResource, title) {
        const model = this._sessionModels.get(sessionResource);
        if (model) {
            model.setCustomTitle(title);
        }
        // Update the title in the file storage
        const localSessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (localSessionId) {
            await this._chatSessionStore.setSessionTitle(localSessionId, title);
            // Trigger immediate save to ensure consistency
            this.saveState();
        }
    }
    trace(method, message) {
        if (message) {
            this.logService.trace(`ChatService#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatService#${method}`);
        }
    }
    error(method, message) {
        this.logService.error(`ChatService#${method} ${message}`);
    }
    deserializeChats(sessionData) {
        try {
            const arrayOfSessions = revive(JSON.parse(sessionData)); // Revive serialized URIs in session data
            if (!Array.isArray(arrayOfSessions)) {
                throw new Error('Expected array');
            }
            const sessions = arrayOfSessions.reduce((acc, session) => {
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                acc[session.sessionId] = normalizeSerializableChatData(session);
                return acc;
            }, {});
            return sessions;
        }
        catch (err) {
            this.error('deserializeChats', `Malformed session data: ${err}. [${sessionData.substring(0, 20)}${sessionData.length > 20 ? '...' : ''}]`);
            return {};
        }
    }
    getTransferredSessionData() {
        const data = this.storageService.getObject(TransferredGlobalChatKey, 0 /* StorageScope.PROFILE */, []);
        const workspaceUri = this.workspaceContextService.getWorkspace().folders[0]?.uri;
        if (!workspaceUri) {
            return;
        }
        const thisWorkspace = workspaceUri.toString();
        const currentTime = Date.now();
        // Only use transferred data if it was created recently
        const transferred = data.find(item => URI.revive(item.toWorkspace).toString() === thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        // Keep data that isn't for the current workspace and that hasn't expired yet
        const filtered = data.filter(item => URI.revive(item.toWorkspace).toString() !== thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        this.storageService.store(TransferredGlobalChatKey, JSON.stringify(filtered), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return transferred;
    }
    /**
     * todo@connor4312 This will be cleaned up with the globalization of edits.
     */
    async reviveSessionsWithEdits() {
        await Promise.all(Object.values(this._persistedSessions).map(async (session) => {
            if (!session.hasPendingEdits) {
                return;
            }
            const sessionResource = LocalChatSessionUri.forSession(session.sessionId);
            const sessionRef = await this.getOrRestoreSession(sessionResource);
            if (sessionRef?.object.editingSession) {
                await chatEditingSessionIsReady(sessionRef.object.editingSession);
                // the session will hold a self-reference as long as there are modified files
                sessionRef.dispose();
            }
        }));
    }
    async initializePersistedSessionsFromFileStorage() {
        const index = await this._chatSessionStore.getIndex();
        const sessionIds = Object.keys(index);
        for (const sessionId of sessionIds) {
            const metadata = index[sessionId];
            if (metadata && !this._persistedSessions[sessionId]) {
                // Create a minimal session entry with the title information
                // This allows getPersistedSessionTitle() to find the title without loading the full session
                const minimalSession = {
                    version: 3,
                    sessionId: sessionId,
                    customTitle: metadata.title,
                    creationDate: Date.now(), // Use current time as fallback
                    lastMessageDate: metadata.lastMessageDate,
                    initialLocation: metadata.initialLocation,
                    requests: [], // Empty requests array - this is just for title lookup
                    responderUsername: '',
                    responderAvatarIconUri: undefined,
                    hasPendingEdits: metadata.hasPendingEdits,
                };
                this._persistedSessions[sessionId] = minimalSession;
            }
        }
    }
    /**
     * Returns an array of chat details for all persisted chat sessions that have at least one request.
     * Chat sessions that have already been loaded into the chat view are excluded from the result.
     * Imported chat sessions are also excluded from the result.
     * TODO this is only used by the old "show chats" command which can be removed when the pre-agents view
     * options are removed.
     */
    async getLocalSessionHistory() {
        const liveSessionItems = await this.getLiveSessionItems();
        const historySessionItems = await this.getHistorySessionItems();
        return [...liveSessionItems, ...historySessionItems];
    }
    /**
     * Returns an array of chat details for all local live chat sessions.
     */
    async getLiveSessionItems() {
        return await Promise.all(Array.from(this._sessionModels.values())
            .filter(session => this.shouldBeInHistory(session))
            .map(async (session) => {
            const title = session.title || localize('newChat', "New Chat");
            return {
                sessionResource: session.sessionResource,
                title,
                lastMessageDate: session.lastMessageDate,
                timing: session.timing,
                isActive: true,
                stats: await awaitStatsForSession(session),
                lastResponseState: session.lastRequest?.response?.state ?? 0 /* ResponseModelState.Pending */,
            };
        }));
    }
    /**
     * Returns an array of chat details for all local chat sessions in history (not currently loaded).
     */
    async getHistorySessionItems() {
        const index = await this._chatSessionStore.getIndex();
        return Object.values(index)
            .filter(entry => !entry.isExternal)
            .filter(entry => !this._sessionModels.has(LocalChatSessionUri.forSession(entry.sessionId)) && entry.initialLocation === ChatAgentLocation.Chat && !entry.isEmpty)
            .map((entry) => {
            const sessionResource = LocalChatSessionUri.forSession(entry.sessionId);
            return ({
                ...entry,
                sessionResource,
                // TODO@roblourens- missing for old data- normalize inside the store
                timing: entry.timing ?? { startTime: entry.lastMessageDate },
                isActive: this._sessionModels.has(sessionResource),
                // TODO@roblourens- missing for old data- normalize inside the store
                lastResponseState: entry.lastResponseState ?? 1 /* ResponseModelState.Complete */,
            });
        });
    }
    async getMetadataForSession(sessionResource) {
        const index = await this._chatSessionStore.getIndex();
        const metadata = index[sessionResource.toString()];
        if (metadata) {
            return {
                ...metadata,
                sessionResource,
                // TODO@roblourens- missing for old data- normalize inside the store
                timing: metadata.timing ?? { startTime: metadata.lastMessageDate },
                isActive: this._sessionModels.has(sessionResource),
                // TODO@roblourens- missing for old data- normalize inside the store
                lastResponseState: metadata.lastResponseState ?? 1 /* ResponseModelState.Complete */,
            };
        }
        return undefined;
    }
    shouldBeInHistory(entry) {
        return !entry.isImported && !!LocalChatSessionUri.parseLocalSessionId(entry.sessionResource) && entry.initialLocation === ChatAgentLocation.Chat;
    }
    async removeHistoryEntry(sessionResource) {
        await this._chatSessionStore.deleteSession(this.toLocalSessionId(sessionResource));
        this._onDidDisposeSession.fire({ sessionResource: [sessionResource], reason: 'cleared' });
    }
    async clearAllHistoryEntries() {
        await this._chatSessionStore.clearAllSessions();
    }
    startSession(location, options) {
        this.trace('startSession');
        const sessionId = generateUuid();
        const sessionResource = LocalChatSessionUri.forSession(sessionId);
        return this._sessionModels.acquireOrCreate({
            initialData: undefined,
            location,
            sessionResource,
            sessionId,
            canUseTools: options?.canUseTools ?? true,
            disableBackgroundKeepAlive: options?.disableBackgroundKeepAlive
        });
    }
    _startSession(props) {
        const { initialData, location, sessionResource, sessionId, canUseTools, transferEditingSession, disableBackgroundKeepAlive, inputState } = props;
        const model = this.instantiationService.createInstance(ChatModel, initialData, { initialLocation: location, canUseTools, resource: sessionResource, sessionId, disableBackgroundKeepAlive, inputState });
        if (location === ChatAgentLocation.Chat) {
            model.startEditingSession(true, transferEditingSession);
        }
        this.initializeSession(model);
        return model;
    }
    initializeSession(model) {
        this.trace('initializeSession', `Initialize session ${model.sessionResource}`);
        // Activate the default extension provided agent but do not wait
        // for it to be ready so that the session can be used immediately
        // without having to wait for the agent to be ready.
        this.activateDefaultAgent(model.initialLocation).catch(e => this.logService.error(e));
    }
    async activateDefaultAgent(location) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const defaultAgentData = this.chatAgentService.getContributedDefaultAgent(location) ?? this.chatAgentService.getContributedDefaultAgent(ChatAgentLocation.Chat);
        if (!defaultAgentData) {
            throw new ErrorNoTelemetry('No default agent contributed');
        }
        // Await activation of the extension provided agent
        // Using `activateById` as workaround for the issue
        // https://github.com/microsoft/vscode/issues/250590
        if (!defaultAgentData.isCore) {
            await this.extensionService.activateById(defaultAgentData.extensionId, {
                activationEvent: `onChatParticipant:${defaultAgentData.id}`,
                extensionId: defaultAgentData.extensionId,
                startup: false
            });
        }
        const defaultAgent = this.chatAgentService.getActivatedAgents().find(agent => agent.id === defaultAgentData.id);
        if (!defaultAgent) {
            throw new ErrorNoTelemetry('No default agent registered');
        }
    }
    getSession(sessionResource) {
        return this._sessionModels.get(sessionResource);
    }
    getActiveSessionReference(sessionResource) {
        return this._sessionModels.acquireExisting(sessionResource);
    }
    async getOrRestoreSession(sessionResource) {
        this.trace('getOrRestoreSession', `${sessionResource}`);
        const existingRef = this._sessionModels.acquireExisting(sessionResource);
        if (existingRef) {
            return existingRef;
        }
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!sessionId) {
            throw new Error(`Cannot restore non-local session ${sessionResource}`);
        }
        let sessionData;
        if (this.transferredSessionData?.sessionId === sessionId) {
            sessionData = revive(this._persistedSessions[sessionId]);
        }
        else {
            sessionData = revive(await this._chatSessionStore.readSession(sessionId));
        }
        if (!sessionData) {
            return undefined;
        }
        const sessionRef = this._sessionModels.acquireOrCreate({
            initialData: sessionData,
            location: sessionData.initialLocation ?? ChatAgentLocation.Chat,
            sessionResource,
            sessionId,
            canUseTools: true,
        });
        const isTransferred = this.transferredSessionData?.sessionId === sessionId;
        if (isTransferred) {
            this._transferredSessionData = undefined;
        }
        return sessionRef;
    }
    /**
     * This is really just for migrating data from the edit session location to the panel.
     */
    isPersistedSessionEmpty(sessionResource) {
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!sessionId) {
            throw new Error(`Cannot restore non-local session ${sessionResource}`);
        }
        const session = this._persistedSessions[sessionId];
        if (session) {
            return session.requests.length === 0;
        }
        return this._chatSessionStore.isSessionEmpty(sessionId);
    }
    getPersistedSessionTitle(sessionResource) {
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!sessionId) {
            return undefined;
        }
        // First check the memory cache (_persistedSessions)
        const session = this._persistedSessions[sessionId];
        if (session) {
            const title = session.customTitle || ChatModel.getDefaultTitle(session.requests);
            return title;
        }
        // Try to read directly from file storage index
        // This handles the case where getName() is called before initialization completes
        // Access the internal synchronous index method via reflection
        // This is a workaround for the timing issue where initialization hasn't completed
        // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
        const internalGetIndex = this._chatSessionStore.internalGetIndex;
        if (typeof internalGetIndex === 'function') {
            const indexData = internalGetIndex.call(this._chatSessionStore);
            const metadata = indexData.entries[sessionId];
            if (metadata && metadata.title) {
                return metadata.title;
            }
        }
        return undefined;
    }
    loadSessionFromContent(data) {
        const sessionId = 'sessionId' in data && data.sessionId ? data.sessionId : generateUuid();
        const sessionResource = LocalChatSessionUri.forSession(sessionId);
        return this._sessionModels.acquireOrCreate({
            initialData: data,
            location: data.initialLocation ?? ChatAgentLocation.Chat,
            sessionResource,
            sessionId,
            canUseTools: true,
        });
    }
    async loadSessionForResource(chatSessionResource, location, token) {
        // TODO: Move this into a new ChatModelService
        if (chatSessionResource.scheme === Schemas.vscodeLocalChatSession) {
            return this.getOrRestoreSession(chatSessionResource);
        }
        const existingRef = this._sessionModels.acquireExisting(chatSessionResource);
        if (existingRef) {
            return existingRef;
        }
        const providedSession = await this.chatSessionService.getOrCreateChatSession(chatSessionResource, CancellationToken.None);
        const chatSessionType = chatSessionResource.scheme;
        // Contributed sessions do not use UI tools
        const modelRef = this._sessionModels.acquireOrCreate({
            initialData: undefined,
            location,
            sessionResource: chatSessionResource,
            canUseTools: false,
            transferEditingSession: providedSession.transferredState?.editingSession,
            inputState: providedSession.transferredState?.inputState,
        });
        modelRef.object.setContributedChatSession({
            chatSessionResource,
            chatSessionType,
            isUntitled: chatSessionResource.path.startsWith('/untitled-') //TODO(jospicer)
        });
        const model = modelRef.object;
        const disposables = new DisposableStore();
        disposables.add(modelRef.object.onDidDispose(() => {
            disposables.dispose();
            providedSession.dispose();
        }));
        let lastRequest;
        for (const message of providedSession.history) {
            if (message.type === 'request') {
                if (lastRequest) {
                    lastRequest.response?.complete();
                }
                const requestText = message.prompt;
                const parsedRequest = {
                    text: requestText,
                    parts: [new ChatRequestTextPart(new OffsetRange(0, requestText.length), { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: requestText.length + 1 }, requestText)]
                };
                const agent = message.participant
                    ? this.chatAgentService.getAgent(message.participant) // TODO(jospicer): Remove and always hardcode?
                    : this.chatAgentService.getAgent(chatSessionType);
                lastRequest = model.addRequest(parsedRequest, message.variableData ?? { variables: [] }, 0, // attempt
                undefined, agent, undefined, // slashCommand
                undefined, // confirmation
                undefined, // locationData
                undefined, // attachments
                false, // Do not treat as requests completed, else edit pills won't show.
                undefined, undefined, message.id);
            }
            else {
                // response
                if (lastRequest) {
                    for (const part of message.parts) {
                        model.acceptResponseProgress(lastRequest, part);
                    }
                }
            }
        }
        if (providedSession.isCompleteObs?.get()) {
            lastRequest?.response?.complete();
        }
        if (providedSession.progressObs && lastRequest && providedSession.interruptActiveResponseCallback) {
            const initialCancellationRequest = this.instantiationService.createInstance(CancellableRequest, new CancellationTokenSource(), undefined);
            this._pendingRequests.set(model.sessionResource, initialCancellationRequest);
            const cancellationListener = disposables.add(new MutableDisposable());
            const createCancellationListener = (token) => {
                return token.onCancellationRequested(() => {
                    providedSession.interruptActiveResponseCallback?.().then(userConfirmedInterruption => {
                        if (!userConfirmedInterruption) {
                            // User cancelled the interruption
                            const newCancellationRequest = this.instantiationService.createInstance(CancellableRequest, new CancellationTokenSource(), undefined);
                            this._pendingRequests.set(model.sessionResource, newCancellationRequest);
                            cancellationListener.value = createCancellationListener(newCancellationRequest.cancellationTokenSource.token);
                        }
                    });
                });
            };
            cancellationListener.value = createCancellationListener(initialCancellationRequest.cancellationTokenSource.token);
            let lastProgressLength = 0;
            disposables.add(autorun(reader => {
                const progressArray = providedSession.progressObs?.read(reader) ?? [];
                const isComplete = providedSession.isCompleteObs?.read(reader) ?? false;
                // Process only new progress items
                if (progressArray.length > lastProgressLength) {
                    const newProgress = progressArray.slice(lastProgressLength);
                    for (const progress of newProgress) {
                        model?.acceptResponseProgress(lastRequest, progress);
                    }
                    lastProgressLength = progressArray.length;
                }
                // Handle completion
                if (isComplete) {
                    lastRequest.response?.complete();
                    cancellationListener.clear();
                }
            }));
        }
        else {
            if (lastRequest && model.editingSession) {
                // wait for timeline to load so that a 'changes' part is added when the response completes
                await chatEditingSessionIsReady(model.editingSession);
                lastRequest.response?.complete();
            }
        }
        return modelRef;
    }
    getChatSessionFromInternalUri(sessionResource) {
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            return;
        }
        const { contributedChatSession } = model;
        return contributedChatSession;
    }
    async resendRequest(request, options) {
        const model = this._sessionModels.get(request.session.sessionResource);
        if (!model && model !== request.session) {
            throw new Error(`Unknown session: ${request.session.sessionResource}`);
        }
        const cts = this._pendingRequests.get(request.session.sessionResource);
        if (cts) {
            this.trace('resendRequest', `Session ${request.session.sessionResource} already has a pending request, cancelling...`);
            cts.cancel();
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const enableCommandDetection = !options?.noCommandDetection;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.modeInfo?.kind);
        model.removeRequest(request.id, 1 /* ChatRequestRemovalReason.Resend */);
        const resendOptions = {
            ...options,
            locationData: request.locationData,
            attachedContext: request.attachedContext,
        };
        await this._sendRequestAsync(model, model.sessionResource, request.message, attempt, enableCommandDetection, defaultAgent, location, resendOptions).responseCompletePromise;
    }
    async sendRequest(sessionResource, request, options) {
        this.trace('sendRequest', `sessionResource: ${sessionResource.toString()}, message: ${request.substring(0, 20)}${request.length > 20 ? '[...]' : ''}}`);
        if (!request.trim() && !options?.slashCommand && !options?.agentId && !options?.agentIdSilent) {
            this.trace('sendRequest', 'Rejected empty message');
            return;
        }
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        if (this._pendingRequests.has(sessionResource)) {
            this.trace('sendRequest', `Session ${sessionResource} already has a pending request`);
            return;
        }
        const requests = model.getRequests();
        for (let i = requests.length - 1; i >= 0; i -= 1) {
            const request = requests[i];
            if (request.shouldBeRemovedOnSend) {
                if (request.shouldBeRemovedOnSend.afterUndoStop) {
                    request.response?.finalizeUndoState();
                }
                else {
                    await this.removeRequest(sessionResource, request.id);
                }
            }
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.modeInfo?.kind);
        const parsedRequest = this.parseChatRequest(sessionResource, request, location, options);
        const silentAgent = options?.agentIdSilent ? this.chatAgentService.getAgent(options.agentIdSilent) : undefined;
        const agent = silentAgent ?? parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart)?.agent ?? defaultAgent;
        const agentSlashCommandPart = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        // This method is only returning whether the request was accepted - don't block on the actual request
        return {
            ...this._sendRequestAsync(model, sessionResource, parsedRequest, attempt, !options?.noCommandDetection, silentAgent ?? defaultAgent, location, options),
            agent,
            slashCommand: agentSlashCommandPart?.command,
        };
    }
    parseChatRequest(sessionResource, request, location, options) {
        let parserContext = options?.parserContext;
        if (options?.agentId) {
            const agent = this.chatAgentService.getAgent(options.agentId);
            if (!agent) {
                throw new Error(`Unknown agent: ${options.agentId}`);
            }
            parserContext = { selectedAgent: agent, mode: options.modeInfo?.kind };
            const commandPart = options.slashCommand ? ` ${chatSubcommandLeader}${options.slashCommand}` : '';
            request = `${chatAgentLeader}${agent.name}${commandPart} ${request}`;
        }
        const parsedRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionResource, request, location, parserContext);
        return parsedRequest;
    }
    refreshFollowupsCancellationToken(sessionResource) {
        this._sessionFollowupCancelTokens.get(sessionResource)?.cancel();
        const newTokenSource = new CancellationTokenSource();
        this._sessionFollowupCancelTokens.set(sessionResource, newTokenSource);
        return newTokenSource.token;
    }
    _sendRequestAsync(model, sessionResource, parsedRequest, attempt, enableCommandDetection, defaultAgent, location, options) {
        const followupsCancelToken = this.refreshFollowupsCancellationToken(sessionResource);
        let request;
        const agentPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart);
        const agentSlashCommandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        const commandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestSlashCommandPart);
        const requests = [...model.getRequests()];
        const requestTelemetry = this.instantiationService.createInstance(ChatRequestTelemetry, {
            agent: agentPart?.agent ?? defaultAgent,
            agentSlashCommandPart,
            commandPart,
            sessionId: model.sessionId,
            location: model.initialLocation,
            options,
            enableCommandDetection
        });
        let gotProgress = false;
        const requestType = commandPart ? 'slashCommand' : 'string';
        const responseCreated = new DeferredPromise();
        let responseCreatedComplete = false;
        function completeResponseCreated() {
            if (!responseCreatedComplete && request?.response) {
                responseCreated.complete(request.response);
                responseCreatedComplete = true;
            }
        }
        const store = new DisposableStore();
        const source = store.add(new CancellationTokenSource());
        const token = source.token;
        const sendRequestInternal = async () => {
            const progressCallback = (progress) => {
                if (token.isCancellationRequested) {
                    return;
                }
                gotProgress = true;
                for (let i = 0; i < progress.length; i++) {
                    const isLast = i === progress.length - 1;
                    const progressItem = progress[i];
                    if (progressItem.kind === 'markdownContent') {
                        this.trace('sendRequest', `Provider returned progress for session ${model.sessionResource}, ${progressItem.content.value.length} chars`);
                    }
                    else {
                        this.trace('sendRequest', `Provider returned progress: ${JSON.stringify(progressItem)}`);
                    }
                    model.acceptResponseProgress(request, progressItem, !isLast);
                }
                completeResponseCreated();
            };
            let detectedAgent;
            let detectedCommand;
            const stopWatch = new StopWatch(false);
            store.add(token.onCancellationRequested(() => {
                this.trace('sendRequest', `Request for session ${model.sessionResource} was cancelled`);
                if (!request) {
                    return;
                }
                requestTelemetry.complete({
                    timeToFirstProgress: undefined,
                    result: 'cancelled',
                    // Normally timings happen inside the EH around the actual provider. For cancellation we can measure how long the user waited before cancelling
                    totalTime: stopWatch.elapsed(),
                    requestType,
                    detectedAgent,
                    request,
                });
                model.cancelRequest(request);
            }));
            try {
                let rawResult;
                let agentOrCommandFollowups = undefined;
                if (agentPart || (defaultAgent && !commandPart)) {
                    const prepareChatAgentRequest = (agent, command, enableCommandDetection, chatRequest, isParticipantDetected) => {
                        const initVariableData = { variables: [] };
                        request = chatRequest ?? model.addRequest(parsedRequest, initVariableData, attempt, options?.modeInfo, agent, command, options?.confirmation, options?.locationData, options?.attachedContext, undefined, options?.userSelectedModelId, options?.userSelectedTools?.get());
                        let variableData;
                        let message;
                        if (chatRequest) {
                            variableData = chatRequest.variableData;
                            message = getPromptText(request.message).message;
                        }
                        else {
                            variableData = { variables: this.prepareContext(request.attachedContext) };
                            model.updateRequest(request, variableData);
                            const promptTextResult = getPromptText(request.message);
                            variableData = updateRanges(variableData, promptTextResult.diff); // TODO bit of a hack
                            message = promptTextResult.message;
                        }
                        const agentRequest = {
                            sessionResource: model.sessionResource,
                            requestId: request.id,
                            agentId: agent.id,
                            message,
                            command: command?.name,
                            variables: variableData,
                            enableCommandDetection,
                            isParticipantDetected,
                            attempt,
                            location,
                            locationData: request.locationData,
                            acceptedConfirmationData: options?.acceptedConfirmationData,
                            rejectedConfirmationData: options?.rejectedConfirmationData,
                            userSelectedModelId: options?.userSelectedModelId,
                            userSelectedTools: options?.userSelectedTools?.get(),
                            modeInstructions: options?.modeInfo?.modeInstructions,
                            editedFileEvents: request.editedFileEvents,
                        };
                        let isInitialTools = true;
                        store.add(autorun(reader => {
                            const tools = options?.userSelectedTools?.read(reader);
                            if (isInitialTools) {
                                isInitialTools = false;
                                return;
                            }
                            if (tools) {
                                this.chatAgentService.setRequestTools(agent.id, request.id, tools);
                                // in case the request has not been sent out yet:
                                agentRequest.userSelectedTools = tools;
                            }
                        }));
                        return agentRequest;
                    };
                    if (this.configurationService.getValue('chat.detectParticipant.enabled') !== false &&
                        this.chatAgentService.hasChatParticipantDetectionProviders() &&
                        !agentPart &&
                        !commandPart &&
                        !agentSlashCommandPart &&
                        enableCommandDetection &&
                        (location !== ChatAgentLocation.EditorInline || !this.configurationService.getValue("inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */)) &&
                        options?.modeInfo?.kind !== ChatModeKind.Agent &&
                        options?.modeInfo?.kind !== ChatModeKind.Edit &&
                        !options?.agentIdSilent) {
                        // We have no agent or command to scope history with, pass the full history to the participant detection provider
                        const defaultAgentHistory = this.getHistoryEntriesFromModel(requests, location, defaultAgent.id);
                        // Prepare the request object that we will send to the participant detection provider
                        const chatAgentRequest = prepareChatAgentRequest(defaultAgent, undefined, enableCommandDetection, undefined, false);
                        const result = await this.chatAgentService.detectAgentOrCommand(chatAgentRequest, defaultAgentHistory, { location }, token);
                        if (result && this.chatAgentService.getAgent(result.agent.id)?.locations?.includes(location)) {
                            // Update the response in the ChatModel to reflect the detected agent and command
                            request.response?.setAgent(result.agent, result.command);
                            detectedAgent = result.agent;
                            detectedCommand = result.command;
                        }
                    }
                    const agent = (detectedAgent ?? agentPart?.agent ?? defaultAgent);
                    const command = detectedCommand ?? agentSlashCommandPart?.command;
                    await this.extensionService.activateByEvent(`onChatParticipant:${agent.id}`);
                    // Recompute history in case the agent or command changed
                    const history = this.getHistoryEntriesFromModel(requests, location, agent.id);
                    const requestProps = prepareChatAgentRequest(agent, command, enableCommandDetection, request /* Reuse the request object if we already created it for participant detection */, !!detectedAgent);
                    this.generateInitialChatTitleIfNeeded(model, requestProps, defaultAgent, token);
                    const pendingRequest = this._pendingRequests.get(sessionResource);
                    if (pendingRequest && !pendingRequest.requestId) {
                        pendingRequest.requestId = requestProps.requestId;
                    }
                    completeResponseCreated();
                    // MCP autostart: only run for native VS Code sessions (sidebar, new editors) but not for extension contributed sessions that have inputType set.
                    if (model.canUseTools) {
                        const autostartResult = new ChatMcpServersStarting(this.mcpService.autostart(token));
                        if (!autostartResult.isEmpty) {
                            progressCallback([autostartResult]);
                            await autostartResult.wait();
                        }
                    }
                    const agentResult = await this.chatAgentService.invokeAgent(agent.id, requestProps, progressCallback, history, token);
                    rawResult = agentResult;
                    agentOrCommandFollowups = this.chatAgentService.getFollowups(agent.id, requestProps, agentResult, history, followupsCancelToken);
                }
                else if (commandPart && this.chatSlashCommandService.hasCommand(commandPart.slashCommand.command)) {
                    if (commandPart.slashCommand.silent !== true) {
                        request = model.addRequest(parsedRequest, { variables: [] }, attempt, options?.modeInfo);
                        completeResponseCreated();
                    }
                    // contributed slash commands
                    // TODO: spell this out in the UI
                    const history = [];
                    for (const modelRequest of model.getRequests()) {
                        if (!modelRequest.response) {
                            continue;
                        }
                        history.push({ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: modelRequest.message.text }] });
                        history.push({ role: 2 /* ChatMessageRole.Assistant */, content: [{ type: 'text', value: modelRequest.response.response.toString() }] });
                    }
                    const message = parsedRequest.text;
                    const commandResult = await this.chatSlashCommandService.executeCommand(commandPart.slashCommand.command, message.substring(commandPart.slashCommand.command.length + 1).trimStart(), new Progress(p => {
                        progressCallback([p]);
                    }), history, location, model.sessionResource, token);
                    agentOrCommandFollowups = Promise.resolve(commandResult?.followUp);
                    rawResult = {};
                }
                else {
                    throw new Error(`Cannot handle request`);
                }
                if (token.isCancellationRequested && !rawResult) {
                    return;
                }
                else {
                    if (!rawResult) {
                        this.trace('sendRequest', `Provider returned no response for session ${model.sessionResource}`);
                        rawResult = { errorDetails: { message: localize('emptyResponse', "Provider returned null response") } };
                    }
                    const result = rawResult.errorDetails?.responseIsFiltered ? 'filtered' :
                        rawResult.errorDetails && gotProgress ? 'errorWithOutput' :
                            rawResult.errorDetails ? 'error' :
                                'success';
                    requestTelemetry.complete({
                        timeToFirstProgress: rawResult.timings?.firstProgress,
                        totalTime: rawResult.timings?.totalElapsed,
                        result,
                        requestType,
                        detectedAgent,
                        request,
                    });
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    this.trace('sendRequest', `Provider returned response for session ${model.sessionResource}`);
                    request.response?.complete();
                    if (agentOrCommandFollowups) {
                        agentOrCommandFollowups.then(followups => {
                            model.setFollowups(request, followups);
                            const commandForTelemetry = agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command;
                            this._chatServiceTelemetry.retrievedFollowups(agentPart?.agent.id ?? '', commandForTelemetry, followups?.length ?? 0);
                        });
                    }
                }
            }
            catch (err) {
                this.logService.error(`Error while handling chat request: ${toErrorMessage(err, true)}`);
                requestTelemetry.complete({
                    timeToFirstProgress: undefined,
                    totalTime: undefined,
                    result: 'error',
                    requestType,
                    detectedAgent,
                    request,
                });
                if (request) {
                    const rawResult = { errorDetails: { message: err.message } };
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    request.response?.complete();
                }
            }
            finally {
                store.dispose();
            }
        };
        const rawResponsePromise = sendRequestInternal();
        // Note- requestId is not known at this point, assigned later
        this._pendingRequests.set(model.sessionResource, this.instantiationService.createInstance(CancellableRequest, source, undefined));
        rawResponsePromise.finally(() => {
            this._pendingRequests.deleteAndDispose(model.sessionResource);
        });
        this._onDidSubmitRequest.fire({ chatSessionResource: model.sessionResource });
        return {
            responseCreatedPromise: responseCreated.p,
            responseCompletePromise: rawResponsePromise,
        };
    }
    generateInitialChatTitleIfNeeded(model, request, defaultAgent, token) {
        // Generate a title only for the first request, and only via the default agent.
        // Use a single-entry history based on the current request (no full chat history).
        if (model.getRequests().length !== 1 || model.customTitle) {
            return;
        }
        const singleEntryHistory = [{
                request,
                response: [],
                result: {}
            }];
        const generate = async () => {
            const title = await this.chatAgentService.getChatTitle(defaultAgent.id, singleEntryHistory, token);
            if (title && !model.customTitle) {
                model.setCustomTitle(title);
            }
        };
        void generate();
    }
    prepareContext(attachedContextVariables) {
        attachedContextVariables ??= [];
        // "reverse", high index first so that replacement is simple
        attachedContextVariables.sort((a, b) => {
            // If either range is undefined, sort it to the back
            if (!a.range && !b.range) {
                return 0; // Keep relative order if both ranges are undefined
            }
            if (!a.range) {
                return 1; // a goes after b
            }
            if (!b.range) {
                return -1; // a goes before b
            }
            return b.range.start - a.range.start;
        });
        return attachedContextVariables;
    }
    getHistoryEntriesFromModel(requests, location, forAgentId) {
        const history = [];
        const agent = this.chatAgentService.getAgent(forAgentId);
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            if (forAgentId !== request.response.agent?.id && !agent?.isDefault && !agent?.canAccessPreviousChatHistory) {
                // An agent only gets to see requests that were sent to this agent.
                // The default agent (the undefined case), or agents with 'canAccessPreviousChatHistory', get to see all of them.
                continue;
            }
            // Do not save to history inline completions
            if (location === ChatAgentLocation.EditorInline) {
                continue;
            }
            const promptTextResult = getPromptText(request.message);
            const historyRequest = {
                sessionResource: request.session.sessionResource,
                requestId: request.id,
                agentId: request.response.agent?.id ?? '',
                message: promptTextResult.message,
                command: request.response.slashCommand?.name,
                variables: updateRanges(request.variableData, promptTextResult.diff), // TODO bit of a hack
                location: ChatAgentLocation.Chat,
                editedFileEvents: request.editedFileEvents,
            };
            history.push({ request: historyRequest, response: toChatHistoryContent(request.response.response.value), result: request.response.result ?? {} });
        }
        return history;
    }
    async removeRequest(sessionResource, requestId) {
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const pendingRequest = this._pendingRequests.get(sessionResource);
        if (pendingRequest?.requestId === requestId) {
            pendingRequest.cancel();
            this._pendingRequests.deleteAndDispose(sessionResource);
        }
        model.removeRequest(requestId);
    }
    async adoptRequest(sessionResource, request) {
        if (!(request instanceof ChatRequestModel)) {
            throw new TypeError('Can only adopt requests of type ChatRequestModel');
        }
        const target = this._sessionModels.get(sessionResource);
        if (!target) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const oldOwner = request.session;
        target.adoptRequest(request);
        if (request.response && !request.response.isComplete) {
            const cts = this._pendingRequests.deleteAndLeak(oldOwner.sessionResource);
            if (cts) {
                cts.requestId = request.id;
                this._pendingRequests.set(target.sessionResource, cts);
            }
        }
    }
    async addCompleteRequest(sessionResource, message, variableData, attempt, response) {
        this.trace('addCompleteRequest', `message: ${message}`);
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const parsedRequest = typeof message === 'string' ?
            this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionResource, message) :
            message;
        const request = model.addRequest(parsedRequest, variableData || { variables: [] }, attempt ?? 0, undefined, undefined, undefined, undefined, undefined, undefined, true);
        if (typeof response.message === 'string') {
            // TODO is this possible?
            model.acceptResponseProgress(request, { content: new MarkdownString(response.message), kind: 'markdownContent' });
        }
        else {
            for (const part of response.message) {
                model.acceptResponseProgress(request, part, true);
            }
        }
        model.setResponse(request, response.result || {});
        if (response.followups !== undefined) {
            model.setFollowups(request, response.followups);
        }
        request.response?.complete();
    }
    cancelCurrentRequestForSession(sessionResource) {
        this.trace('cancelCurrentRequestForSession', `session: ${sessionResource}`);
        this._pendingRequests.get(sessionResource)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionResource);
    }
    hasSessions() {
        return this._chatSessionStore.hasSessions();
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        const model = Iterable.find(this._sessionModels.values(), model => model.sessionId === transferredSessionData.sessionId);
        if (!model) {
            throw new Error(`Failed to transfer session. Unknown session ID: ${transferredSessionData.sessionId}`);
        }
        const existingRaw = this.storageService.getObject(TransferredGlobalChatKey, 0 /* StorageScope.PROFILE */, []);
        existingRaw.push({
            chat: model.toJSON(),
            timestampInMilliseconds: Date.now(),
            toWorkspace: toWorkspace,
            inputState: transferredSessionData.inputState,
            location: transferredSessionData.location,
        });
        this.storageService.store(TransferredGlobalChatKey, JSON.stringify(existingRaw), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.chatTransferService.addWorkspaceToTransferred(toWorkspace);
        this.trace('transferChatSession', `Transferred session ${model.sessionResource} to workspace ${toWorkspace.toString()}`);
    }
    getChatStorageFolder() {
        return this._chatSessionStore.getChatStorageFolder();
    }
    logChatIndex() {
        this._chatSessionStore.logIndex();
    }
    setTitle(sessionResource, title) {
        this._sessionModels.get(sessionResource)?.setCustomTitle(title);
    }
    appendProgress(request, progress) {
        const model = this._sessionModels.get(request.session.sessionResource);
        if (!(request instanceof ChatRequestModel)) {
            throw new BugIndicatingError('Can only append progress to requests of type ChatRequestModel');
        }
        model?.acceptResponseProgress(request, progress);
    }
    toLocalSessionId(sessionResource) {
        const localSessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!localSessionId) {
            throw new Error(`Invalid local chat session resource: ${sessionResource}`);
        }
        return localSessionId;
    }
};
ChatService = __decorate([
    __param(0, IStorageService),
    __param(1, ILogService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, IWorkspaceContextService),
    __param(5, IChatSlashCommandService),
    __param(6, IChatAgentService),
    __param(7, IConfigurationService),
    __param(8, IChatTransferService),
    __param(9, IChatSessionsService),
    __param(10, IMcpService)
], ChatService);
export { ChatService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUksT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZ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
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
import { raceCancellationError } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { revive } from '../../../base/common/marshalling.js';
import { autorun, observableValue } from '../../../base/common/observable.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { hasValidDiff } from '../../contrib/chat/browser/agentSessions/agentSessionsModel.js';
import { ChatViewPaneTarget, IChatWidgetService, isIChatViewViewContext } from '../../contrib/chat/browser/chat.js';
import { ChatEditorInput } from '../../contrib/chat/browser/chatEditorInput.js';
import { awaitStatsForSession } from '../../contrib/chat/common/chat.js';
import { IChatService } from '../../contrib/chat/common/chatService.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
export class ObservableChatSession extends Disposable {
    get options() {
        return this._options;
    }
    get progressObs() {
        return this._progressObservable;
    }
    get isCompleteObs() {
        return this._isCompleteObservable;
    }
    constructor(resource, providerHandle, proxy, logService, dialogService) {
        super();
        this._progressObservable = observableValue(this, []);
        this._isCompleteObservable = observableValue(this, false);
        this._onWillDispose = new Emitter();
        this.onWillDispose = this._onWillDispose.event;
        this._pendingProgressChunks = new Map();
        this._isInitialized = false;
        this._interruptionWasCanceled = false;
        this._disposalPending = false;
        this.sessionResource = resource;
        this.providerHandle = providerHandle;
        this.history = [];
        this._proxy = proxy;
        this._providerHandle = providerHandle;
        this._logService = logService;
        this._dialogService = dialogService;
    }
    initialize(token) {
        if (!this._initializationPromise) {
            this._initializationPromise = this._doInitializeContent(token);
        }
        return this._initializationPromise;
    }
    async _doInitializeContent(token) {
        try {
            const sessionContent = await raceCancellationError(this._proxy.$provideChatSessionContent(this._providerHandle, this.sessionResource, token), token);
            this._options = sessionContent.options;
            this.history.length = 0;
            this.history.push(...sessionContent.history.map((turn) => {
                if (turn.type === 'request') {
                    const variables = turn.variableData?.variables.map(v => {
                        const entry = {
                            ...v,
                            value: revive(v.value)
                        };
                        return entry;
                    });
                    return {
                        type: 'request',
                        prompt: turn.prompt,
                        participant: turn.participant,
                        command: turn.command,
                        variableData: variables ? { variables } : undefined,
                        id: turn.id
                    };
                }
                return {
                    type: 'response',
                    parts: turn.parts.map((part) => revive(part)),
                    participant: turn.participant
                };
            }));
            if (sessionContent.hasActiveResponseCallback && !this.interruptActiveResponseCallback) {
                this.interruptActiveResponseCallback = async () => {
                    const confirmInterrupt = () => {
                        if (this._disposalPending) {
                            this._proxy.$disposeChatSessionContent(this._providerHandle, this.sessionResource);
                            this._disposalPending = false;
                        }
                        this._proxy.$interruptChatSessionActiveResponse(this._providerHandle, this.sessionResource, 'ongoing');
                        return true;
                    };
                    if (sessionContent.supportsInterruption) {
                        // If the session supports hot reload, interrupt without confirmation
                        return confirmInterrupt();
                    }
                    // Prompt the user to confirm interruption
                    return this._dialogService.confirm({
                        message: localize('interruptActiveResponse', 'Are you sure you want to interrupt the active session?')
                    }).then(confirmed => {
                        if (confirmed.confirmed) {
                            // User confirmed interruption - dispose the session content on extension host
                            return confirmInterrupt();
                        }
                        else {
                            // When user cancels the interruption, fire an empty progress message to keep the session alive
                            // This matches the behavior of the old implementation
                            this._addProgress([{
                                    kind: 'progressMessage',
                                    content: { value: '', isTrusted: false }
                                }]);
                            // Set flag to prevent completion when extension host calls handleProgressComplete
                            this._interruptionWasCanceled = true;
                            // User canceled interruption - cancel the deferred disposal
                            if (this._disposalPending) {
                                this._logService.info(`Canceling deferred disposal for session ${this.sessionResource} (user canceled interruption)`);
                                this._disposalPending = false;
                            }
                            return false;
                        }
                    });
                };
            }
            if (sessionContent.hasRequestHandler && !this.requestHandler) {
                this.requestHandler = async (request, progress, history, token) => {
                    // Clear previous progress and mark as active
                    this._progressObservable.set([], undefined);
                    this._isCompleteObservable.set(false, undefined);
                    // Set up reactive progress observation before starting the request
                    let lastProgressLength = 0;
                    const progressDisposable = autorun(reader => {
                        const progressArray = this._progressObservable.read(reader);
                        const isComplete = this._isCompleteObservable.read(reader);
                        if (progressArray.length > lastProgressLength) {
                            const newProgress = progressArray.slice(lastProgressLength);
                            progress(newProgress);
                            lastProgressLength = progressArray.length;
                        }
                        if (isComplete) {
                            progressDisposable.dispose();
                        }
                    });
                    try {
                        await this._proxy.$invokeChatSessionRequestHandler(this._providerHandle, this.sessionResource, request, history, token);
                        // Only mark as complete if there's no active response callback
                        // Sessions with active response callbacks should only complete when explicitly told to via handleProgressComplete
                        if (!this._isCompleteObservable.get() && !this.interruptActiveResponseCallback) {
                            this._markComplete();
                        }
                    }
                    catch (error) {
                        const errorProgress = {
                            kind: 'progressMessage',
                            content: { value: `Error: ${error instanceof Error ? error.message : String(error)}`, isTrusted: false }
                        };
                        this._addProgress([errorProgress]);
                        this._markComplete();
                        throw error;
                    }
                    finally {
                        // Ensure progress observation is cleaned up
                        progressDisposable.dispose();
                    }
                };
            }
            this._isInitialized = true;
            // Process any pending progress chunks
            const hasActiveResponse = sessionContent.hasActiveResponseCallback;
            const hasRequestHandler = sessionContent.hasRequestHandler;
            const hasAnyCapability = hasActiveResponse || hasRequestHandler;
            for (const [requestId, chunks] of this._pendingProgressChunks) {
                this._logService.debug(`Processing ${chunks.length} pending progress chunks for session ${this.sessionResource}, requestId ${requestId}`);
                this._addProgress(chunks);
            }
            this._pendingProgressChunks.clear();
            // If session has no active response callback and no request handler, mark it as complete
            if (!hasAnyCapability) {
                this._isCompleteObservable.set(true, undefined);
            }
        }
        catch (error) {
            this._logService.error(`Failed to initialize chat session ${this.sessionResource}:`, error);
            throw error;
        }
    }
    /**
     * Handle progress chunks coming from the extension host.
     * If the session is not initialized yet, the chunks will be queued.
     */
    handleProgressChunk(requestId, progress) {
        if (!this._isInitialized) {
            const existing = this._pendingProgressChunks.get(requestId) || [];
            this._pendingProgressChunks.set(requestId, [...existing, ...progress]);
            this._logService.debug(`Queuing ${progress.length} progress chunks for session ${this.sessionResource}, requestId ${requestId} (session not initialized)`);
            return;
        }
        this._addProgress(progress);
    }
    /**
     * Handle progress completion from the extension host.
     */
    handleProgressComplete(requestId) {
        // Clean up any pending chunks for this request
        this._pendingProgressChunks.delete(requestId);
        if (this._isInitialized) {
            // Don't mark as complete if user canceled the interruption
            if (!this._interruptionWasCanceled) {
                this._markComplete();
            }
            else {
                // Reset the flag and don't mark as complete
                this._interruptionWasCanceled = false;
            }
        }
    }
    _addProgress(progress) {
        const currentProgress = this._progressObservable.get();
        this._progressObservable.set([...currentProgress, ...progress], undefined);
    }
    _markComplete() {
        if (!this._isCompleteObservable.get()) {
            this._isCompleteObservable.set(true, undefined);
        }
    }
    dispose() {
        this._onWillDispose.fire();
        this._onWillDispose.dispose();
        this._pendingProgressChunks.clear();
        // If this session has an active response callback and disposal is happening,
        // defer the actual session content disposal until we know the user's choice
        if (this.interruptActiveResponseCallback && !this._interruptionWasCanceled) {
            this._disposalPending = true;
            // The actual disposal will happen in the interruption callback based on user's choice
        }
        else {
            // No active response callback or user already canceled interruption - dispose immediately
            this._proxy.$disposeChatSessionContent(this._providerHandle, this.sessionResource);
        }
        super.dispose();
    }
}
let MainThreadChatSessions = class MainThreadChatSessions extends Disposable {
    constructor(_extHostContext, _chatSessionsService, _chatService, _chatWidgetService, _dialogService, _editorService, editorGroupService, _logService) {
        super();
        this._extHostContext = _extHostContext;
        this._chatSessionsService = _chatSessionsService;
        this._chatService = _chatService;
        this._chatWidgetService = _chatWidgetService;
        this._dialogService = _dialogService;
        this._editorService = _editorService;
        this.editorGroupService = editorGroupService;
        this._logService = _logService;
        this._itemProvidersRegistrations = this._register(new DisposableMap());
        this._contentProvidersRegistrations = this._register(new DisposableMap());
        this._sessionTypeToHandle = new Map();
        this._activeSessions = new ResourceMap();
        this._sessionDisposables = new ResourceMap();
        this._proxy = this._extHostContext.getProxy(ExtHostContext.ExtHostChatSessions);
        this._chatSessionsService.setOptionsChangeCallback(async (sessionResource, updates) => {
            const handle = this._getHandleForSessionType(sessionResource.scheme);
            if (handle !== undefined) {
                await this.notifyOptionsChange(handle, sessionResource, updates);
            }
        });
    }
    _getHandleForSessionType(chatSessionType) {
        return this._sessionTypeToHandle.get(chatSessionType);
    }
    $registerChatSessionItemProvider(handle, chatSessionType) {
        // Register the provider handle - this tracks that a provider exists
        const disposables = new DisposableStore();
        const changeEmitter = disposables.add(new Emitter());
        const provider = {
            chatSessionType,
            onDidChangeChatSessionItems: Event.debounce(changeEmitter.event, (_, e) => e, 200),
            provideChatSessionItems: (token) => this._provideChatSessionItems(handle, token),
        };
        disposables.add(this._chatSessionsService.registerChatSessionItemProvider(provider));
        this._itemProvidersRegistrations.set(handle, {
            dispose: () => disposables.dispose(),
            provider,
            onDidChangeItems: changeEmitter,
        });
        disposables.add(this._chatSessionsService.registerChatModelChangeListeners(this._chatService, chatSessionType, () => changeEmitter.fire()));
    }
    $onDidChangeChatSessionItems(handle) {
        this._itemProvidersRegistrations.get(handle)?.onDidChangeItems.fire();
    }
    $onDidChangeChatSessionOptions(handle, sessionResourceComponents, updates) {
        const sessionResource = URI.revive(sessionResourceComponents);
        this._chatSessionsService.notifySessionOptionsChange(sessionResource, updates);
    }
    async $onDidCommitChatSessionItem(handle, originalComponents, modifiedCompoennts) {
        const originalResource = URI.revive(originalComponents);
        const modifiedResource = URI.revive(modifiedCompoennts);
        this._logService.trace(`$onDidCommitChatSessionItem: handle(${handle}), original(${originalResource}), modified(${modifiedResource})`);
        const chatSessionType = this._itemProvidersRegistrations.get(handle)?.provider.chatSessionType;
        if (!chatSessionType) {
            this._logService.error(`No chat session type found for provider handle ${handle}`);
            return;
        }
        const originalEditor = this._editorService.editors.find(editor => editor.resource?.toString() === originalResource.toString());
        const originalModel = this._chatService.getSession(originalResource);
        const contribution = this._chatSessionsService.getAllChatSessionContributions().find(c => c.type === chatSessionType);
        // Find the group containing the original editor
        const originalGroup = this.editorGroupService.groups.find(group => group.editors.some(editor => isEqual(editor.resource, originalResource)))
            ?? this.editorGroupService.activeGroup;
        const options = {
            title: {
                preferred: originalEditor?.getName() || undefined,
                fallback: localize('chatEditorContributionName', "{0}", contribution?.displayName),
            }
        };
        // Prefetch the chat session content to make the subsequent editor swap quick
        const newSession = await this._chatSessionsService.getOrCreateChatSession(URI.revive(modifiedResource), CancellationToken.None);
        if (originalEditor) {
            newSession.transferredState = originalEditor instanceof ChatEditorInput
                ? { editingSession: originalEditor.transferOutEditingSession(), inputState: originalModel?.inputModel.toJSON() }
                : undefined;
            this._editorService.replaceEditors([{
                    editor: originalEditor,
                    replacement: {
                        resource: modifiedResource,
                        options,
                    },
                }], originalGroup);
            return;
        }
        // If chat editor is in the side panel, then those are not listed as editors.
        // In that case we need to transfer editing session using the original model.
        if (originalModel) {
            newSession.transferredState = {
                editingSession: originalModel.editingSession,
                inputState: originalModel.inputModel.toJSON()
            };
        }
        const chatViewWidget = this._chatWidgetService.getWidgetBySessionResource(originalResource);
        if (chatViewWidget && isIChatViewViewContext(chatViewWidget.viewContext)) {
            await this._chatWidgetService.openSession(modifiedResource, ChatViewPaneTarget, { preserveFocus: true });
        }
        else {
            // Loading the session to ensure the session is created and editing session is transferred.
            const ref = await this._chatService.loadSessionForResource(modifiedResource, ChatAgentLocation.Chat, CancellationToken.None);
            ref?.dispose();
        }
    }
    async _provideChatSessionItems(handle, token) {
        try {
            // Get all results as an array from the RPC call
            const sessions = await this._proxy.$provideChatSessionItems(handle, token);
            return Promise.all(sessions.map(async (session) => {
                const uri = URI.revive(session.resource);
                const model = this._chatService.getSession(uri);
                if (model) {
                    session = await this.handleSessionModelOverrides(model, session);
                }
                // We can still get stats if there is no model or if fetching from model failed
                if (!session.changes || !model) {
                    const stats = (await this._chatService.getMetadataForSession(uri))?.stats;
                    // TODO: we shouldn't be converting this, the types should match
                    const diffs = {
                        files: stats?.fileCount || 0,
                        insertions: stats?.added || 0,
                        deletions: stats?.removed || 0
                    };
                    if (hasValidDiff(diffs)) {
                        session.changes = diffs;
                    }
                }
                return {
                    ...session,
                    changes: revive(session.changes),
                    resource: uri,
                    iconPath: session.iconPath,
                    tooltip: session.tooltip ? this._reviveTooltip(session.tooltip) : undefined,
                };
            }));
        }
        catch (error) {
            this._logService.error('Error providing chat sessions:', error);
        }
        return [];
    }
    async handleSessionModelOverrides(model, session) {
        // Override desciription if there's an in-progress count
        const inProgress = model.getRequests().filter(r => r.response && !r.response.isComplete);
        if (inProgress.length) {
            session.description = this._chatSessionsService.getInProgressSessionDescription(model);
        }
        // Override changes
        // TODO: @osortega we don't really use statistics anymore, we need to clarify that in the API
        if (!(session.changes instanceof Array)) {
            const modelStats = await awaitStatsForSession(model);
            if (modelStats) {
                session.changes = {
                    files: modelStats.fileCount,
                    insertions: modelStats.added,
                    deletions: modelStats.removed
                };
            }
        }
        // Override status if the models needs input
        if (model.lastRequest?.response?.state === 4 /* ResponseModelState.NeedsInput */) {
            session.status = 3 /* ChatSessionStatus.NeedsInput */;
        }
        return session;
    }
    async _provideChatSessionContent(providerHandle, sessionResource, token) {
        let session = this._activeSessions.get(sessionResource);
        if (!session) {
            session = new ObservableChatSession(sessionResource, providerHandle, this._proxy, this._logService, this._dialogService);
            this._activeSessions.set(sessionResource, session);
            const disposable = session.onWillDispose(() => {
                this._activeSessions.delete(sessionResource);
                this._sessionDisposables.get(sessionResource)?.dispose();
                this._sessionDisposables.delete(sessionResource);
            });
            this._sessionDisposables.set(sessionResource, disposable);
        }
        try {
            await session.initialize(token);
            if (session.options) {
                for (const [_, handle] of this._sessionTypeToHandle) {
                    if (handle === providerHandle) {
                        for (const [optionId, value] of Object.entries(session.options)) {
                            this._chatSessionsService.setSessionOption(sessionResource, optionId, value);
                        }
                        break;
                    }
                }
            }
            return session;
        }
        catch (error) {
            session.dispose();
            this._logService.error(`Error providing chat session content for handle ${providerHandle} and resource ${sessionResource.toString()}:`, error);
            throw error;
        }
    }
    $unregisterChatSessionItemProvider(handle) {
        this._itemProvidersRegistrations.deleteAndDispose(handle);
    }
    $registerChatSessionContentProvider(handle, chatSessionScheme) {
        const provider = {
            provideChatSessionContent: (resource, token) => this._provideChatSessionContent(handle, resource, token)
        };
        this._sessionTypeToHandle.set(chatSessionScheme, handle);
        this._contentProvidersRegistrations.set(handle, this._chatSessionsService.registerChatSessionContentProvider(chatSessionScheme, provider));
        this._proxy.$provideChatSessionProviderOptions(handle, CancellationToken.None).then(options => {
            if (options?.optionGroups && options.optionGroups.length) {
                this._chatSessionsService.setOptionGroupsForSessionType(chatSessionScheme, handle, options.optionGroups);
            }
        }).catch(err => this._logService.error('Error fetching chat session options', err));
    }
    $unregisterChatSessionContentProvider(handle) {
        this._contentProvidersRegistrations.deleteAndDispose(handle);
        for (const [sessionType, h] of this._sessionTypeToHandle) {
            if (h === handle) {
                this._sessionTypeToHandle.delete(sessionType);
                break;
            }
        }
        // dispose all sessions from this provider and clean up its disposables
        for (const [key, session] of this._activeSessions) {
            if (session.providerHandle === handle) {
                session.dispose();
                this._activeSessions.delete(key);
            }
        }
    }
    async $handleProgressChunk(handle, sessionResource, requestId, chunks) {
        const resource = URI.revive(sessionResource);
        const observableSession = this._activeSessions.get(resource);
        if (!observableSession) {
            this._logService.warn(`No session found for progress chunks: handle ${handle}, sessionResource ${resource}, requestId ${requestId}`);
            return;
        }
        const chatProgressParts = chunks.map(chunk => {
            const [progress] = Array.isArray(chunk) ? chunk : [chunk];
            return revive(progress);
        });
        observableSession.handleProgressChunk(requestId, chatProgressParts);
    }
    $handleProgressComplete(handle, sessionResource, requestId) {
        const resource = URI.revive(sessionResource);
        const observableSession = this._activeSessions.get(resource);
        if (!observableSession) {
            this._logService.warn(`No session found for progress completion: handle ${handle}, sessionResource ${resource}, requestId ${requestId}`);
            return;
        }
        observableSession.handleProgressComplete(requestId);
    }
    $handleAnchorResolve(handle, sesssionResource, requestId, requestHandle, anchor) {
        // throw new Error('Method not implemented.');
    }
    dispose() {
        for (const session of this._activeSessions.values()) {
            session.dispose();
        }
        this._activeSessions.clear();
        for (const disposable of this._sessionDisposables.values()) {
            disposable.dispose();
        }
        this._sessionDisposables.clear();
        super.dispose();
    }
    _reviveTooltip(tooltip) {
        if (!tooltip) {
            return undefined;
        }
        // If it's already a string, return as-is
        if (typeof tooltip === 'string') {
            return tooltip;
        }
        // If it's a serialized IMarkdownString, revive it to MarkdownString
        if (typeof tooltip === 'object' && 'value' in tooltip) {
            return MarkdownString.lift(tooltip);
        }
        return undefined;
    }
    /**
     * Notify the extension about option changes for a session
     */
    async notifyOptionsChange(handle, sessionResource, updates) {
        try {
            await this._proxy.$provideHandleOptionsChange(handle, sessionResource, updates, CancellationToken.None);
        }
        catch (error) {
            this._logService.error(`Error notifying extension about options change for handle ${handle}, sessionResource ${sessionResource}:`, error);
        }
    }
};
MainThreadChatSessions = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatSessions),
    __param(1, IChatSessionsService),
    __param(2, IChatService),
    __param(3, IChatWidgetService),
    __param(4, IDialogService),
    __param(5, IEditorService),
    __param(6, IEditorGroupsService),
    __param(7, ILogService)
], MainThreadChatSessions);
export { MainThreadChatSessions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENoYXRTZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDNUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQWlCLE1BQU0sZ0VBQWdFLENBQUM7QUFDN0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFF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
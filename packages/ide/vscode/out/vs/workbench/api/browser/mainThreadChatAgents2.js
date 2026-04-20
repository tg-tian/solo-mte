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
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import { getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IChatWidgetService } from '../../contrib/chat/browser/chat.js';
import { AddDynamicVariableAction } from '../../contrib/chat/browser/contrib/chatDynamicVariables.js';
import { IChatAgentService } from '../../contrib/chat/common/chatAgents.js';
import { IPromptsService } from '../../contrib/chat/common/promptSyntax/service/promptsService.js';
import { IChatEditingService } from '../../contrib/chat/common/chatEditingService.js';
import { ChatRequestAgentPart } from '../../contrib/chat/common/chatParserTypes.js';
import { ChatRequestParser } from '../../contrib/chat/common/chatRequestParser.js';
import { IChatService } from '../../contrib/chat/common/chatService.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { ChatAgentLocation, ChatModeKind } from '../../contrib/chat/common/constants.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
export class MainThreadChatTask {
    get onDidAddProgress() { return this._onDidAddProgress.event; }
    constructor(content) {
        this.content = content;
        this.kind = 'progressTask';
        this.deferred = new DeferredPromise();
        this._onDidAddProgress = new Emitter();
        this.progress = [];
    }
    task() {
        return this.deferred.p;
    }
    isSettled() {
        return this.deferred.isSettled;
    }
    complete(v) {
        this.deferred.complete(v);
    }
    add(progress) {
        this.progress.push(progress);
        this._onDidAddProgress.fire(progress);
    }
    toJSON() {
        return {
            kind: 'progressTaskSerialized',
            content: this.content,
            progress: this.progress
        };
    }
}
let MainThreadChatAgents2 = class MainThreadChatAgents2 extends Disposable {
    constructor(extHostContext, _chatAgentService, _chatSessionService, _chatService, _chatEditingService, _languageFeaturesService, _chatWidgetService, _instantiationService, _logService, _extensionService, _uriIdentityService, _promptsService) {
        super();
        this._chatAgentService = _chatAgentService;
        this._chatSessionService = _chatSessionService;
        this._chatService = _chatService;
        this._chatEditingService = _chatEditingService;
        this._languageFeaturesService = _languageFeaturesService;
        this._chatWidgetService = _chatWidgetService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._extensionService = _extensionService;
        this._uriIdentityService = _uriIdentityService;
        this._promptsService = _promptsService;
        this._agents = this._register(new DisposableMap());
        this._agentCompletionProviders = this._register(new DisposableMap());
        this._agentIdsToCompletionProviders = this._register(new DisposableMap);
        this._chatParticipantDetectionProviders = this._register(new DisposableMap());
        this._chatRelatedFilesProviders = this._register(new DisposableMap());
        this._customAgentsProviders = this._register(new DisposableMap());
        this._customAgentsProviderEmitters = this._register(new DisposableMap());
        this._pendingProgress = new Map();
        this._activeTasks = new Map();
        this._unresolvedAnchors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatAgents2);
        this._register(this._chatService.onDidDisposeSession(e => {
            for (const resource of e.sessionResource) {
                this._proxy.$releaseSession(resource);
            }
        }));
        this._register(this._chatService.onDidPerformUserAction(e => {
            if (typeof e.agentId === 'string') {
                for (const [handle, agent] of this._agents) {
                    if (agent.id === e.agentId) {
                        if (e.action.kind === 'vote') {
                            this._proxy.$acceptFeedback(handle, e.result ?? {}, e.action);
                        }
                        else {
                            this._proxy.$acceptAction(handle, e.result || {}, e);
                        }
                        break;
                    }
                }
            }
        }));
    }
    $unregisterAgent(handle) {
        this._agents.deleteAndDispose(handle);
    }
    $transferActiveChatSession(toWorkspace) {
        const widget = this._chatWidgetService.lastFocusedWidget;
        const model = widget?.viewModel?.model;
        if (!model) {
            this._logService.error(`MainThreadChat#$transferActiveChatSession: No active chat session found`);
            return;
        }
        const location = widget.location;
        this._chatService.transferChatSession({ sessionId: model.sessionId, inputState: model.inputModel.state.get(), location }, URI.revive(toWorkspace));
    }
    async $registerAgent(handle, extension, id, metadata, dynamicProps) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const staticAgentRegistration = this._chatAgentService.getAgent(id, true);
        const chatSessionRegistration = this._chatSessionService.getAllChatSessionContributions().find(c => c.type === id || c.alternativeIds?.includes(id));
        if (!staticAgentRegistration && !chatSessionRegistration && !dynamicProps) {
            if (this._chatAgentService.getAgentsByName(id).length) {
                // Likely some extension authors will not adopt the new ID, so give a hint if they register a
                // participant by name instead of ID.
                throw new Error(`chatParticipant must be declared with an ID in package.json. The "id" property may be missing! "${id}"`);
            }
            throw new Error(`chatParticipant must be declared in package.json: ${id}`);
        }
        const impl = {
            invoke: async (request, progress, history, token) => {
                const chatSession = this._chatService.getSession(request.sessionResource);
                this._pendingProgress.set(request.requestId, { progress, chatSession });
                try {
                    return await this._proxy.$invokeAgent(handle, request, {
                        history,
                        chatSessionContext: chatSession?.contributedChatSession
                    }, token) ?? {};
                }
                finally {
                    this._pendingProgress.delete(request.requestId);
                }
            },
            setRequestTools: (requestId, tools) => {
                this._proxy.$setRequestTools(requestId, tools);
            },
            provideFollowups: async (request, result, history, token) => {
                if (!this._agents.get(handle)?.hasFollowups) {
                    return [];
                }
                return this._proxy.$provideFollowups(request, handle, result, { history }, token);
            },
            provideChatTitle: (history, token) => {
                return this._proxy.$provideChatTitle(handle, history, token);
            },
            provideChatSummary: (history, token) => {
                return this._proxy.$provideChatSummary(handle, history, token);
            },
        };
        // Do not attempt to register migrated chatSession providers
        if (chatSessionRegistration?.alternativeIds?.includes(id)) {
            return;
        }
        let disposable;
        if (!staticAgentRegistration && dynamicProps) {
            const extensionDescription = this._extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension));
            disposable = this._chatAgentService.registerDynamicAgent({
                id,
                name: dynamicProps.name,
                description: dynamicProps.description,
                extensionId: extension,
                extensionVersion: extensionDescription?.version,
                extensionDisplayName: extensionDescription?.displayName ?? extension.value,
                extensionPublisherId: extensionDescription?.publisher ?? '',
                publisherDisplayName: dynamicProps.publisherName,
                fullName: dynamicProps.fullName,
                metadata: revive(metadata),
                slashCommands: [],
                disambiguation: [],
                locations: [ChatAgentLocation.Chat],
                modes: [ChatModeKind.Ask, ChatModeKind.Agent, ChatModeKind.Edit],
            }, impl);
        }
        else {
            disposable = this._chatAgentService.registerAgentImplementation(id, impl);
        }
        this._agents.set(handle, {
            id: id,
            extensionId: extension,
            dispose: () => disposable.dispose(),
            hasFollowups: metadata.hasFollowups
        });
    }
    async $updateAgent(handle, metadataUpdate) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const data = this._agents.get(handle);
        if (!data) {
            this._logService.error(`MainThreadChatAgents2#$updateAgent: No agent with handle ${handle} registered`);
            return;
        }
        data.hasFollowups = metadataUpdate.hasFollowups;
        this._chatAgentService.updateAgent(data.id, revive(metadataUpdate));
    }
    async $handleProgressChunk(requestId, chunks) {
        const pendingProgress = this._pendingProgress.get(requestId);
        if (!pendingProgress) {
            this._logService.warn(`MainThreadChatAgents2#$handleProgressChunk: No pending progress for requestId ${requestId}`);
            return;
        }
        const { progress, chatSession } = pendingProgress;
        const chatProgressParts = [];
        for (const item of chunks) {
            const [progress, responsePartHandle] = Array.isArray(item) ? item : [item];
            if (progress.kind === 'externalEdits') {
                // todo@connor4312: be more specific here, pass response model through to invocation?
                const response = chatSession?.getRequests().at(-1)?.response;
                if (chatSession?.editingSession && responsePartHandle !== undefined && response) {
                    const parts = progress.start
                        ? await chatSession.editingSession.startExternalEdits(response, responsePartHandle, revive(progress.resources), progress.undoStopId)
                        : await chatSession.editingSession.stopExternalEdits(response, responsePartHandle);
                    chatProgressParts.push(...parts);
                }
                continue;
            }
            const revivedProgress = progress.kind === 'notebookEdit'
                ? ChatNotebookEdit.fromChatEdit(progress)
                : revive(progress);
            if (revivedProgress.kind === 'notebookEdit'
                || revivedProgress.kind === 'textEdit'
                || revivedProgress.kind === 'codeblockUri') {
                // make sure to use the canonical uri
                revivedProgress.uri = this._uriIdentityService.asCanonicalUri(revivedProgress.uri);
            }
            if (responsePartHandle !== undefined) {
                if (revivedProgress.kind === 'progressTask') {
                    const handle = responsePartHandle;
                    const responsePartId = `${requestId}_${handle}`;
                    const task = new MainThreadChatTask(revivedProgress.content);
                    this._activeTasks.set(responsePartId, task);
                    chatProgressParts.push(task);
                }
                else if (responsePartHandle !== undefined) {
                    const responsePartId = `${requestId}_${responsePartHandle}`;
                    const task = this._activeTasks.get(responsePartId);
                    switch (revivedProgress.kind) {
                        case 'progressTaskResult':
                            if (task && revivedProgress.content) {
                                task.complete(revivedProgress.content.value);
                                this._activeTasks.delete(responsePartId);
                            }
                            else {
                                task?.complete(undefined);
                            }
                            break;
                        case 'warning':
                        case 'reference':
                            task?.add(revivedProgress);
                            break;
                    }
                }
                continue;
            }
            if (revivedProgress.kind === 'inlineReference' && revivedProgress.resolveId) {
                if (!this._unresolvedAnchors.has(requestId)) {
                    this._unresolvedAnchors.set(requestId, new Map());
                }
                this._unresolvedAnchors.get(requestId)?.set(revivedProgress.resolveId, revivedProgress);
            }
            chatProgressParts.push(revivedProgress);
        }
        progress(chatProgressParts);
    }
    $handleAnchorResolve(requestId, handle, resolveAnchor) {
        const anchor = this._unresolvedAnchors.get(requestId)?.get(handle);
        if (!anchor) {
            return;
        }
        this._unresolvedAnchors.get(requestId)?.delete(handle);
        if (resolveAnchor) {
            const revivedAnchor = revive(resolveAnchor);
            anchor.inlineReference = revivedAnchor.inlineReference;
        }
    }
    $registerAgentCompletionsProvider(handle, id, triggerCharacters) {
        const provide = async (query, token) => {
            const completions = await this._proxy.$invokeCompletionProvider(handle, query, token);
            return completions.map((c) => ({ ...c, icon: c.icon ? ThemeIcon.fromId(c.icon) : undefined }));
        };
        this._agentIdsToCompletionProviders.set(id, this._chatAgentService.registerAgentCompletionProvider(id, provide));
        this._agentCompletionProviders.set(handle, this._languageFeaturesService.completionProvider.register({ scheme: Schemas.vscodeChatInput, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentCompletions:' + handle,
            triggerCharacters,
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this._chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const triggerCharsPart = triggerCharacters.map(c => escapeRegExpCharacters(c)).join('');
                const wordRegex = new RegExp(`[${triggerCharsPart}]\\S*`, 'g');
                const query = getWordAtText(position.column, wordRegex, model.getLineContent(position.lineNumber), 0)?.word ?? '';
                if (query && !triggerCharacters.some(c => query.startsWith(c))) {
                    return;
                }
                const parsedRequest = this._instantiationService.createInstance(ChatRequestParser).parseChatRequest(widget.viewModel.sessionResource, model.getValue()).parts;
                const agentPart = parsedRequest.find((part) => part instanceof ChatRequestAgentPart);
                const thisAgentId = this._agents.get(handle)?.id;
                if (agentPart?.agent.id !== thisAgentId) {
                    return;
                }
                const range = computeCompletionRanges(model, position, wordRegex);
                if (!range) {
                    return null;
                }
                const result = await provide(query, token);
                const variableItems = result.map(v => {
                    const insertText = v.insertText ?? (typeof v.label === 'string' ? v.label : v.label.label);
                    const rangeAfterInsert = new Range(range.insert.startLineNumber, range.insert.startColumn, range.insert.endLineNumber, range.insert.startColumn + insertText.length);
                    return {
                        label: v.label,
                        range,
                        insertText: insertText + ' ',
                        kind: 18 /* CompletionItemKind.Text */,
                        detail: v.detail,
                        documentation: v.documentation,
                        command: { id: AddDynamicVariableAction.ID, title: '', arguments: [{ id: v.id, widget, range: rangeAfterInsert, variableData: revive(v.value), command: v.command }] }
                    };
                });
                return {
                    suggestions: variableItems
                };
            }
        }));
    }
    $unregisterAgentCompletionsProvider(handle, id) {
        this._agentCompletionProviders.deleteAndDispose(handle);
        this._agentIdsToCompletionProviders.deleteAndDispose(id);
    }
    $registerChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.set(handle, this._chatAgentService.registerChatParticipantDetectionProvider(handle, {
            provideParticipantDetection: async (request, history, options, token) => {
                return await this._proxy.$detectChatParticipant(handle, request, { history }, options, token);
            }
        }));
    }
    $unregisterChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.deleteAndDispose(handle);
    }
    $registerRelatedFilesProvider(handle, metadata) {
        this._chatRelatedFilesProviders.set(handle, this._chatEditingService.registerRelatedFilesProvider(handle, {
            description: metadata.description,
            provideRelatedFiles: async (request, token) => {
                return (await this._proxy.$provideRelatedFiles(handle, request, token))?.map((v) => ({ uri: URI.from(v.uri), description: v.description })) ?? [];
            }
        }));
    }
    $unregisterRelatedFilesProvider(handle) {
        this._chatRelatedFilesProviders.deleteAndDispose(handle);
    }
    async $registerCustomAgentsProvider(handle, extensionId) {
        const extension = await this._extensionService.getExtension(extensionId.value);
        if (!extension) {
            this._logService.error(`[MainThreadChatAgents2] Could not find extension for CustomAgentsProvider: ${extensionId.value}`);
            return;
        }
        const emitter = new Emitter();
        this._customAgentsProviderEmitters.set(handle, emitter);
        const disposable = this._promptsService.registerCustomAgentsProvider(extension, {
            onDidChangeCustomAgents: emitter.event,
            provideCustomAgents: async (options, token) => {
                const agents = await this._proxy.$provideCustomAgents(handle, options, token);
                if (!agents) {
                    return undefined;
                }
                // Convert UriComponents to URI
                return agents.map(agent => ({
                    ...agent,
                    uri: URI.revive(agent.uri)
                }));
            }
        });
        this._customAgentsProviders.set(handle, disposable);
    }
    $unregisterCustomAgentsProvider(handle) {
        this._customAgentsProviders.deleteAndDispose(handle);
        this._customAgentsProviderEmitters.deleteAndDispose(handle);
    }
    $onDidChangeCustomAgents(handle) {
        const emitter = this._customAgentsProviderEmitters.get(handle);
        if (emitter) {
            emitter.fire();
        }
    }
};
MainThreadChatAgents2 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatAgents2),
    __param(1, IChatAgentService),
    __param(2, IChatSessionsService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, ILanguageFeaturesService),
    __param(6, IChatWidgetService),
    __param(7, IInstantiationService),
    __param(8, ILogService),
    __param(9, IExtensionService),
    __param(10, IUriIdentityService),
    __param(11, IPromptsService)
], MainThreadChatAgents2);
export { MainThreadChatAgents2 };
function computeCompletionRanges(model, position, reg) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
    }
    let insert;
    let replace;
    if (!varWord) {
        insert = replace = Range.fromPositions(position);
    }
    else {
        insert = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, position.column);
        replace = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, varWord.endColumn);
    }
    return { insert, replace };
}
var ChatNotebookEdit;
(function (ChatNotebookEdit) {
    function fromChatEdit(part) {
        return {
            kind: 'notebookEdit',
            uri: URI.revive(part.uri),
            done: part.done,
            edits: part.edits.map(NotebookDto.fromCellEditOperationDto)
        };
    }
    ChatNotebookEdit.fromChatEdit = fromChatEdit;
})(ChatNotebookEdit || (ChatNotebookEdit = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ2hhdEFnZW50czIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFFakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUcxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixF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
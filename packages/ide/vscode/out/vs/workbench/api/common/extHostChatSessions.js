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
var ExtHostChatSessions_1;
import { coalesce } from '../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { revive } from '../../../base/common/marshalling.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { MainContext } from './extHost.protocol.js';
import { ChatAgentResponseStream } from './extHostChatAgents2.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { IDiagnosticVariableEntryFilterData, PromptFileVariableKind } from '../../contrib/chat/common/chatVariableEntries.js';
import { basename } from '../../../base/common/resources.js';
import { Diagnostic } from './extHostTypeConverters.js';
import { SymbolKinds } from '../../../editor/common/languages.js';
class ExtHostChatSession {
    constructor(session, extension, request, proxy, commandsConverter, sessionDisposables) {
        this.session = session;
        this.extension = extension;
        this.proxy = proxy;
        this.commandsConverter = commandsConverter;
        this.sessionDisposables = sessionDisposables;
        this._stream = new ChatAgentResponseStream(extension, request, proxy, commandsConverter, sessionDisposables);
    }
    get activeResponseStream() {
        return this._stream;
    }
    getActiveRequestStream(request) {
        return new ChatAgentResponseStream(this.extension, request, this.proxy, this.commandsConverter, this.sessionDisposables);
    }
}
let ExtHostChatSessions = class ExtHostChatSessions extends Disposable {
    static { ExtHostChatSessions_1 = this; }
    static { this._sessionHandlePool = 0; }
    constructor(commands, _languageModels, _extHostRpc, _logService) {
        super();
        this.commands = commands;
        this._languageModels = _languageModels;
        this._extHostRpc = _extHostRpc;
        this._logService = _logService;
        this._chatSessionItemProviders = new Map();
        this._chatSessionContentProviders = new Map();
        this._nextChatSessionItemProviderHandle = 0;
        this._nextChatSessionContentProviderHandle = 0;
        /**
         * Map of uri -> chat session items
         *
         * TODO: this isn't cleared/updated properly
         */
        this._sessionItems = new ResourceMap();
        /**
         * Map of uri -> chat sessions infos
         */
        this._extHostChatSessions = new ResourceMap();
        this._proxy = this._extHostRpc.getProxy(MainContext.MainThreadChatSessions);
        commands.registerArgumentProcessor({
            processArgument: (arg) => {
                if (arg && arg.$mid === 25 /* MarshalledId.AgentSessionContext */) {
                    const id = arg.session.resource || arg.sessionId;
                    const sessionContent = this._sessionItems.get(id);
                    if (sessionContent) {
                        return sessionContent;
                    }
                    else {
                        this._logService.warn(`No chat session found for ID: ${id}`);
                        return arg;
                    }
                }
                return arg;
            }
        });
    }
    registerChatSessionItemProvider(extension, chatSessionType, provider) {
        const handle = this._nextChatSessionItemProviderHandle++;
        const disposables = new DisposableStore();
        this._chatSessionItemProviders.set(handle, { provider, extension, disposable: disposables, sessionType: chatSessionType });
        this._proxy.$registerChatSessionItemProvider(handle, chatSessionType);
        if (provider.onDidChangeChatSessionItems) {
            disposables.add(provider.onDidChangeChatSessionItems(() => {
                this._proxy.$onDidChangeChatSessionItems(handle);
            }));
        }
        if (provider.onDidCommitChatSessionItem) {
            disposables.add(provider.onDidCommitChatSessionItem((e) => {
                const { original, modified } = e;
                this._proxy.$onDidCommitChatSessionItem(handle, original.resource, modified.resource);
            }));
        }
        return {
            dispose: () => {
                this._chatSessionItemProviders.delete(handle);
                disposables.dispose();
                this._proxy.$unregisterChatSessionItemProvider(handle);
            }
        };
    }
    registerChatSessionContentProvider(extension, chatSessionScheme, chatParticipant, provider, capabilities) {
        const handle = this._nextChatSessionContentProviderHandle++;
        const disposables = new DisposableStore();
        this._chatSessionContentProviders.set(handle, { provider, extension, capabilities, disposable: disposables });
        this._proxy.$registerChatSessionContentProvider(handle, chatSessionScheme);
        if (provider.onDidChangeChatSessionOptions) {
            disposables.add(provider.onDidChangeChatSessionOptions(evt => {
                this._proxy.$onDidChangeChatSessionOptions(handle, evt.resource, evt.updates);
            }));
        }
        return new extHostTypes.Disposable(() => {
            this._chatSessionContentProviders.delete(handle);
            disposables.dispose();
            this._proxy.$unregisterChatSessionContentProvider(handle);
        });
    }
    convertChatSessionStatus(status) {
        if (status === undefined) {
            return undefined;
        }
        switch (status) {
            case 0: // vscode.ChatSessionStatus.Failed
                return 0 /* ChatSessionStatus.Failed */;
            case 1: // vscode.ChatSessionStatus.Completed
                return 1 /* ChatSessionStatus.Completed */;
            case 2: // vscode.ChatSessionStatus.InProgress
                return 2 /* ChatSessionStatus.InProgress */;
            // Need to support NeedsInput status if we ever export it to the extension API
            default:
                return undefined;
        }
    }
    convertChatSessionItem(sessionType, sessionContent) {
        return {
            resource: sessionContent.resource,
            label: sessionContent.label,
            description: sessionContent.description ? typeConvert.MarkdownString.from(sessionContent.description) : undefined,
            badge: sessionContent.badge ? typeConvert.MarkdownString.from(sessionContent.badge) : undefined,
            status: this.convertChatSessionStatus(sessionContent.status),
            tooltip: typeConvert.MarkdownString.fromStrict(sessionContent.tooltip),
            timing: {
                startTime: sessionContent.timing?.startTime ?? 0,
                endTime: sessionContent.timing?.endTime
            },
            changes: sessionContent.changes instanceof Array
                ? sessionContent.changes :
                (sessionContent.changes && {
                    files: sessionContent.changes?.files ?? 0,
                    insertions: sessionContent.changes?.insertions ?? 0,
                    deletions: sessionContent.changes?.deletions ?? 0,
                }),
        };
    }
    async $provideNewChatSessionItem(handle, options, token) {
        const entry = this._chatSessionItemProviders.get(handle);
        if (!entry || !entry.provider.provideNewChatSessionItem) {
            throw new Error(`No provider registered for handle ${handle} or provider does not support creating sessions`);
        }
        try {
            const model = await this.getModelForRequest(options.request, entry.extension);
            const vscodeRequest = typeConvert.ChatAgentRequest.to(revive(options.request), undefined, model, [], new Map(), entry.extension, this._logService);
            const vscodeOptions = {
                request: vscodeRequest,
                metadata: options.metadata
            };
            const chatSessionItem = await entry.provider.provideNewChatSessionItem(vscodeOptions, token);
            if (!chatSessionItem) {
                throw new Error('Provider did not create session');
            }
            this._sessionItems.set(chatSessionItem.resource, chatSessionItem);
            return this.convertChatSessionItem(entry.sessionType, chatSessionItem);
        }
        catch (error) {
            this._logService.error(`Error creating chat session: ${error}`);
            throw error;
        }
    }
    async $provideChatSessionItems(handle, token) {
        const entry = this._chatSessionItemProviders.get(handle);
        if (!entry) {
            this._logService.error(`No provider registered for handle ${handle}`);
            return [];
        }
        const sessions = await entry.provider.provideChatSessionItems(token);
        if (!sessions) {
            return [];
        }
        const response = [];
        for (const sessionContent of sessions) {
            this._sessionItems.set(sessionContent.resource, sessionContent);
            response.push(this.convertChatSessionItem(entry.sessionType, sessionContent));
        }
        return response;
    }
    async $provideChatSessionContent(handle, sessionResourceComponents, token) {
        const provider = this._chatSessionContentProviders.get(handle);
        if (!provider) {
            throw new Error(`No provider for handle ${handle}`);
        }
        const sessionResource = URI.revive(sessionResourceComponents);
        const session = await provider.provider.provideChatSessionContent(sessionResource, token);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        const sessionDisposables = new DisposableStore();
        const sessionId = ExtHostChatSessions_1._sessionHandlePool++;
        const id = sessionResource.toString();
        const chatSession = new ExtHostChatSession(session, provider.extension, {
            sessionResource,
            requestId: 'ongoing',
            agentId: id,
            message: '',
            variables: { variables: [] },
            location: ChatAgentLocation.Chat,
        }, {
            $handleProgressChunk: (requestId, chunks) => {
                return this._proxy.$handleProgressChunk(handle, sessionResource, requestId, chunks);
            },
            $handleAnchorResolve: (requestId, requestHandle, anchor) => {
                this._proxy.$handleAnchorResolve(handle, sessionResource, requestId, requestHandle, anchor);
            },
        }, this.commands.converter, sessionDisposables);
        const disposeCts = sessionDisposables.add(new CancellationTokenSource());
        this._extHostChatSessions.set(sessionResource, { sessionObj: chatSession, disposeCts });
        // Call activeResponseCallback immediately for best user experience
        if (session.activeResponseCallback) {
            Promise.resolve(session.activeResponseCallback(chatSession.activeResponseStream.apiObject, disposeCts.token)).finally(() => {
                // complete
                this._proxy.$handleProgressComplete(handle, sessionResource, 'ongoing');
            });
        }
        const { capabilities } = provider;
        return {
            id: sessionId + '',
            resource: URI.revive(sessionResource),
            hasActiveResponseCallback: !!session.activeResponseCallback,
            hasRequestHandler: !!session.requestHandler,
            supportsInterruption: !!capabilities?.supportsInterruptions,
            options: session.options,
            history: session.history.map(turn => {
                if (turn instanceof extHostTypes.ChatRequestTurn) {
                    return this.convertRequestTurn(turn);
                }
                else {
                    return this.convertResponseTurn(turn, sessionDisposables);
                }
            })
        };
    }
    async $provideHandleOptionsChange(handle, sessionResourceComponents, updates, token) {
        const sessionResource = URI.revive(sessionResourceComponents);
        const provider = this._chatSessionContentProviders.get(handle);
        if (!provider) {
            this._logService.warn(`No provider for handle ${handle}`);
            return;
        }
        if (!provider.provider.provideHandleOptionsChange) {
            this._logService.debug(`Provider for handle ${handle} does not implement provideHandleOptionsChange`);
            return;
        }
        try {
            const updatesToSend = updates.map(update => ({
                optionId: update.optionId,
                value: update.value === undefined ? undefined : (typeof update.value === 'string' ? update.value : update.value.id)
            }));
            await provider.provider.provideHandleOptionsChange(sessionResource, updatesToSend, token);
        }
        catch (error) {
            this._logService.error(`Error calling provideHandleOptionsChange for handle ${handle}, sessionResource ${sessionResource}:`, error);
        }
    }
    async $provideChatSessionProviderOptions(handle, token) {
        const entry = this._chatSessionContentProviders.get(handle);
        if (!entry) {
            this._logService.warn(`No provider for handle ${handle} when requesting chat session options`);
            return;
        }
        const provider = entry.provider;
        if (!provider.provideChatSessionProviderOptions) {
            return;
        }
        try {
            const { optionGroups } = await provider.provideChatSessionProviderOptions(token);
            if (!optionGroups) {
                return;
            }
            return {
                optionGroups,
            };
        }
        catch (error) {
            this._logService.error(`Error calling provideChatSessionProviderOptions for handle ${handle}:`, error);
            return;
        }
    }
    async $interruptChatSessionActiveResponse(providerHandle, sessionResource, requestId) {
        const entry = this._extHostChatSessions.get(URI.revive(sessionResource));
        entry?.disposeCts.cancel();
    }
    async $disposeChatSessionContent(providerHandle, sessionResource) {
        const entry = this._extHostChatSessions.get(URI.revive(sessionResource));
        if (!entry) {
            this._logService.warn(`No chat session found for resource: ${sessionResource}`);
            return;
        }
        entry.disposeCts.cancel();
        entry.sessionObj.sessionDisposables.dispose();
        this._extHostChatSessions.delete(URI.revive(sessionResource));
    }
    async $invokeChatSessionRequestHandler(handle, sessionResource, request, history, token) {
        const entry = this._extHostChatSessions.get(URI.revive(sessionResource));
        if (!entry || !entry.sessionObj.session.requestHandler) {
            return {};
        }
        const chatRequest = typeConvert.ChatAgentRequest.to(request, undefined, await this.getModelForRequest(request, entry.sessionObj.extension), [], new Map(), entry.sessionObj.extension, this._logService);
        const stream = entry.sessionObj.getActiveRequestStream(request);
        await entry.sessionObj.session.requestHandler(chatRequest, { history: history }, stream.apiObject, token);
        // TODO: do we need to dispose the stream object?
        return {};
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
    convertRequestTurn(turn) {
        const variables = turn.references.map(ref => this.convertReferenceToVariable(ref));
        return {
            type: 'request',
            id: turn.id,
            prompt: turn.prompt,
            participant: turn.participant,
            command: turn.command,
            variableData: variables.length > 0 ? { variables } : undefined
        };
    }
    convertReferenceToVariable(ref) {
        const value = ref.value && typeof ref.value === 'object' && 'uri' in ref.value && 'range' in ref.value
            ? typeConvert.Location.from(ref.value)
            : ref.value;
        const range = ref.range ? { start: ref.range[0], endExclusive: ref.range[1] } : undefined;
        if (value && value instanceof extHostTypes.ChatReferenceDiagnostic && Array.isArray(value.diagnostics) && value.diagnostics.length && value.diagnostics[0][1].length) {
            const marker = Diagnostic.from(value.diagnostics[0][1][0]);
            const refValue = {
                filterRange: { startLineNumber: marker.startLineNumber, startColumn: marker.startColumn, endLineNumber: marker.endLineNumber, endColumn: marker.endColumn },
                filterSeverity: marker.severity,
                filterUri: value.diagnostics[0][0],
                problemMessage: value.diagnostics[0][1][0].message
            };
            return IDiagnosticVariableEntryFilterData.toEntry(refValue);
        }
        if (extHostTypes.Location.isLocation(ref.value) && ref.name.startsWith(`sym:`)) {
            const loc = typeConvert.Location.from(ref.value);
            return {
                id: ref.id,
                name: ref.name,
                fullName: ref.name.substring(4),
                value: { uri: ref.value.uri, range: loc.range },
                // We never send this information to extensions, so default to Property
                symbolKind: 6 /* SymbolKind.Property */,
                // We never send this information to extensions, so default to Property
                icon: SymbolKinds.toIcon(6 /* SymbolKind.Property */),
                kind: 'symbol',
                range,
            };
        }
        if (URI.isUri(value) && ref.name.startsWith(`prompt:`) &&
            ref.id.startsWith(PromptFileVariableKind.PromptFile) &&
            ref.id.endsWith(value.toString())) {
            return {
                id: ref.id,
                name: `prompt:${basename(value)}`,
                value,
                kind: 'promptFile',
                modelDescription: 'Prompt instructions file',
                isRoot: true,
                automaticallyAdded: false,
                range,
            };
        }
        const isFile = URI.isUri(value) || (value && typeof value === 'object' && 'uri' in value);
        const isFolder = isFile && URI.isUri(value) && value.path.endsWith('/');
        return {
            id: ref.id,
            name: ref.name,
            value,
            modelDescription: ref.modelDescription,
            range,
            kind: isFolder ? 'directory' : isFile ? 'file' : 'generic'
        };
    }
    convertResponseTurn(turn, sessionDisposables) {
        const parts = coalesce(turn.response.map(r => typeConvert.ChatResponsePart.from(r, this.commands.converter, sessionDisposables)));
        return {
            type: 'response',
            parts,
            participant: turn.participant
        };
    }
};
ExtHostChatSessions = ExtHostChatSessions_1 = __decorate([
    __param(2, IExtHostRpcService),
    __param(3, ILogService)
], ExtHostChatSessions);
export { ExtHostChatSessions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q2hhdFNlc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBRWpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUdsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUzRSxPQUFPLEVBQWtHLFdBQVcsRUFBK0IsTUFBTSx1QkFBdUIsQ0FBQztBQUNqTCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUdsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEtBQUssV0FBVyxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sS0FBSyxZQUFZLE1BQU0sbUJBQW1CLENBQUM7QUFDbEQsT0FBTyxFQUE2QixrQ0FBa0MsRUFBa0Qsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6TSxPQUFPLEVBQUUsUUFB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
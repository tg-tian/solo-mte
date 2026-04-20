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
import { coalesce, compareBy, delta } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { groupBy } from '../../../../../base/common/collections.js';
import { ErrorNoTelemetry } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../../base/common/linkedList.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { derived, observableValueOpts, runOnChange, ValueWithChangeEventFromObservable } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { compare } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IDecorationsService } from '../../../../services/decorations/common/decorations.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, chatEditingAgentSupportsReadonlyReferencesContextKey, chatEditingResourceContextKey, inChatEditingSessionContextKey, parseChatMultiDiffUri } from '../../common/chatEditingService.js';
import { isCellTextEditOperationArray } from '../../common/chatModel.js';
import { IChatService } from '../../common/chatService.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingSession } from './chatEditingSession.js';
import { ChatEditingSnapshotTextModelContentProvider, ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
let ChatEditingService = class ChatEditingService extends Disposable {
    constructor(_instantiationService, multiDiffSourceResolverService, textModelService, contextKeyService, _chatService, _editorService, decorationsService, _fileService, lifecycleService, storageService, logService, extensionService, productService, notebookService, _configurationService) {
        super();
        this._instantiationService = _instantiationService;
        this._chatService = _chatService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this.lifecycleService = lifecycleService;
        this.notebookService = notebookService;
        this._configurationService = _configurationService;
        this._sessionsObs = observableValueOpts({ equalsFn: (a, b) => false }, new LinkedList());
        this.editingSessionsObs = derived(r => {
            const result = Array.from(this._sessionsObs.read(r));
            return result;
        });
        this._chatRelatedFilesProviders = new Map();
        this._register(decorationsService.registerDecorationsProvider(_instantiationService.createInstance(ChatDecorationsProvider, this.editingSessionsObs)));
        this._register(multiDiffSourceResolverService.registerResolver(_instantiationService.createInstance(ChatEditingMultiDiffSourceResolver, this.editingSessionsObs)));
        // TODO@jrieken
        // some ugly casting so that this service can pass itself as argument instad as service dependeny
        // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
        this._register(textModelService.registerTextModelContentProvider(ChatEditingTextModelContentProvider.scheme, _instantiationService.createInstance(ChatEditingTextModelContentProvider, this)));
        // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
        this._register(textModelService.registerTextModelContentProvider(Schemas.chatEditingSnapshotScheme, _instantiationService.createInstance(ChatEditingSnapshotTextModelContentProvider, this)));
        this._register(this._chatService.onDidDisposeSession((e) => {
            if (e.reason === 'cleared') {
                for (const resource of e.sessionResource) {
                    this.getEditingSession(resource)?.stop();
                }
            }
        }));
        // todo@connor4312: temporary until chatReadonlyPromptReference proposal is finalized
        const readonlyEnabledContextKey = chatEditingAgentSupportsReadonlyReferencesContextKey.bindTo(contextKeyService);
        const setReadonlyFilesEnabled = () => {
            const enabled = productService.quality !== 'stable' && extensionService.extensions.some(e => e.enabledApiProposals?.includes('chatReadonlyPromptReference'));
            readonlyEnabledContextKey.set(enabled);
        };
        setReadonlyFilesEnabled();
        this._register(extensionService.onDidRegisterExtensions(setReadonlyFilesEnabled));
        this._register(extensionService.onDidChangeExtensions(setReadonlyFilesEnabled));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let storageTask;
        this._register(storageService.onWillSaveState(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tasks = [];
            for (const session of this.editingSessionsObs.get()) {
                if (!session.isGlobalEditingSession) {
                    continue;
                }
                tasks.push(session.storeState());
            }
            storageTask = Promise.resolve(storageTask)
                .then(() => Promise.all(tasks))
                .finally(() => storageTask = undefined);
        }));
        this._register(this.lifecycleService.onWillShutdown(e => {
            if (!storageTask) {
                return;
            }
            e.join(storageTask, {
                id: 'join.chatEditingSession',
                label: localize('join.chatEditingSession', "Saving chat edits history")
            });
        }));
    }
    dispose() {
        dispose(this._sessionsObs.get());
        super.dispose();
    }
    startOrContinueGlobalEditingSession(chatModel) {
        return this.getEditingSession(chatModel.sessionResource) || this.createEditingSession(chatModel, true);
    }
    _lookupEntry(uri) {
        for (const item of Iterable.concat(this.editingSessionsObs.get())) {
            const candidate = item.getEntry(uri);
            if (candidate instanceof AbstractChatEditingModifiedFileEntry) {
                // make sure to ref-count this object
                return candidate.acquire();
            }
        }
        return undefined;
    }
    getEditingSession(chatSessionResource) {
        return this.editingSessionsObs.get()
            .find(candidate => isEqual(candidate.chatSessionResource, chatSessionResource));
    }
    createEditingSession(chatModel, global = false) {
        return this._createEditingSession(chatModel, global, undefined);
    }
    transferEditingSession(chatModel, session) {
        return this._createEditingSession(chatModel, session.isGlobalEditingSession, session);
    }
    _createEditingSession(chatModel, global, initFrom) {
        assertType(this.getEditingSession(chatModel.sessionResource) === undefined, 'CANNOT have more than one editing session per chat session');
        const session = this._instantiationService.createInstance(ChatEditingSession, chatModel.sessionResource, global, this._lookupEntry.bind(this), initFrom);
        const list = this._sessionsObs.get();
        const removeSession = list.unshift(session);
        const store = new DisposableStore();
        this._store.add(store);
        store.add(this.installAutoApplyObserver(session, chatModel));
        store.add(session.onDidDispose(e => {
            removeSession();
            this._sessionsObs.set(list, undefined);
            this._store.delete(store);
        }));
        this._sessionsObs.set(list, undefined);
        return session;
    }
    installAutoApplyObserver(session, chatModel) {
        if (!chatModel) {
            throw new ErrorNoTelemetry(`Edit session was created for a non-existing chat session: ${session.chatSessionResource}`);
        }
        const observerDisposables = new DisposableStore();
        observerDisposables.add(chatModel.onDidChange(async (e) => {
            if (e.kind !== 'addRequest') {
                return;
            }
            session.createSnapshot(e.request.id, undefined);
            const responseModel = e.request.response;
            if (responseModel) {
                this.observerEditsInResponse(e.request.id, responseModel, session, observerDisposables);
            }
        }));
        observerDisposables.add(chatModel.onDidDispose(() => observerDisposables.dispose()));
        return observerDisposables;
    }
    observerEditsInResponse(requestId, responseModel, session, observerDisposables) {
        // Sparse array: the indicies are indexes of `responseModel.response.value`
        // that are edit groups, and then this tracks the edit application for
        // each of them. Note that text edit groups can be updated
        // multiple times during the process of response streaming.
        const editsSeen = [];
        let editorDidChange = false;
        const editorListener = Event.once(this._editorService.onDidActiveEditorChange)(() => {
            editorDidChange = true;
        });
        const editorOpenPromises = new ResourceMap();
        const openChatEditedFiles = this._configurationService.getValue('accessibility.openChatEditedFiles');
        const ensureEditorOpen = (partUri) => {
            const uri = CellUri.parse(partUri)?.notebook ?? partUri;
            if (editorOpenPromises.has(uri)) {
                return;
            }
            editorOpenPromises.set(uri, (async () => {
                if (this.notebookService.getNotebookTextModel(uri) || uri.scheme === Schemas.untitled || await this._fileService.exists(uri).catch(() => false)) {
                    const activeUri = this._editorService.activeEditorPane?.input.resource;
                    const inactive = editorDidChange
                        || this._editorService.activeEditorPane?.input instanceof ChatEditorInput && isEqual(this._editorService.activeEditorPane.input.sessionResource, session.chatSessionResource)
                        || Boolean(activeUri && session.entries.get().find(entry => isEqual(activeUri, entry.modifiedURI)));
                    this._editorService.openEditor({ resource: uri, options: { inactive, preserveFocus: true, pinned: true } });
                }
            })());
        };
        const onResponseComplete = () => {
            for (const remaining of editsSeen) {
                remaining?.streaming.complete();
            }
            editsSeen.length = 0;
            editorOpenPromises.clear();
            editorListener.dispose();
        };
        const handleResponseParts = async () => {
            if (responseModel.isCanceled) {
                return;
            }
            let undoStop;
            for (let i = 0; i < responseModel.response.value.length; i++) {
                const part = responseModel.response.value[i];
                if (part.kind === 'undoStop') {
                    undoStop = part.id;
                    continue;
                }
                if (part.kind !== 'textEditGroup' && part.kind !== 'notebookEditGroup') {
                    continue;
                }
                // Skip external edits - they're already applied on disk
                if (part.isExternalEdit) {
                    continue;
                }
                if (openChatEditedFiles) {
                    ensureEditorOpen(part.uri);
                }
                // get new edits and start editing session
                let entry = editsSeen[i];
                if (!entry) {
                    entry = { seen: 0, streaming: session.startStreamingEdits(CellUri.parse(part.uri)?.notebook ?? part.uri, responseModel, undoStop) };
                    editsSeen[i] = entry;
                }
                const isFirst = entry.seen === 0;
                const newEdits = part.edits.slice(entry.seen);
                entry.seen = part.edits.length;
                if (newEdits.length > 0 || isFirst) {
                    for (let i = 0; i < newEdits.length; i++) {
                        const edit = newEdits[i];
                        const done = part.done ? i === newEdits.length - 1 : false;
                        if (isTextEditOperationArray(edit)) {
                            entry.streaming.pushText(edit, done);
                        }
                        else if (isCellTextEditOperationArray(edit)) {
                            for (const edits of Object.values(groupBy(edit, e => e.uri.toString()))) {
                                if (edits) {
                                    entry.streaming.pushNotebookCellText(edits[0].uri, edits.map(e => e.edit), done);
                                }
                            }
                        }
                        else {
                            entry.streaming.pushNotebook(edit, done);
                        }
                    }
                }
                if (part.done) {
                    entry.streaming.complete();
                }
            }
        };
        if (responseModel.isComplete) {
            handleResponseParts().then(() => {
                onResponseComplete();
            });
        }
        else {
            const disposable = observerDisposables.add(responseModel.onDidChange(e2 => {
                if (e2.reason === 'undoStop') {
                    session.createSnapshot(requestId, e2.id);
                }
                else {
                    handleResponseParts().then(() => {
                        if (responseModel.isComplete) {
                            onResponseComplete();
                            observerDisposables.delete(disposable);
                        }
                    });
                }
            }));
        }
    }
    hasRelatedFilesProviders() {
        return this._chatRelatedFilesProviders.size > 0;
    }
    registerRelatedFilesProvider(handle, provider) {
        this._chatRelatedFilesProviders.set(handle, provider);
        return toDisposable(() => {
            this._chatRelatedFilesProviders.delete(handle);
        });
    }
    async getRelatedFiles(chatSessionResource, prompt, files, token) {
        const providers = Array.from(this._chatRelatedFilesProviders.values());
        const result = await Promise.all(providers.map(async (provider) => {
            try {
                const relatedFiles = await provider.provideRelatedFiles({ prompt, files }, token);
                if (relatedFiles?.length) {
                    return { group: provider.description, files: relatedFiles };
                }
                return undefined;
            }
            catch (e) {
                return undefined;
            }
        }));
        return coalesce(result);
    }
};
ChatEditingService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMultiDiffSourceResolverService),
    __param(2, ITextModelService),
    __param(3, IContextKeyService),
    __param(4, IChatService),
    __param(5, IEditorService),
    __param(6, IDecorationsService),
    __param(7, IFileService),
    __param(8, ILifecycleService),
    __param(9, IStorageService),
    __param(10, ILogService),
    __param(11, IExtensionService),
    __param(12, IProductService),
    __param(13, INotebookService),
    __param(14, IConfigurationService)
], ChatEditingService);
export { ChatEditingService };
/**
 * Emits an event containing the added or removed elements of the observable.
 */
function observeArrayChanges(obs, compare, store) {
    const emitter = store.add(new Emitter());
    store.add(runOnChange(obs, (newArr, oldArr) => {
        const change = delta(oldArr || [], newArr, compare);
        const changedElements = [].concat(change.added).concat(change.removed);
        emitter.fire(changedElements);
    }));
    return emitter.event;
}
class ChatDecorationsProvider extends Disposable {
    constructor(_sessions) {
        super();
        this._sessions = _sessions;
        this.label = localize('chat', "Chat Editing");
        this._currentEntries = derived(this, (r) => {
            const sessions = this._sessions.read(r);
            if (!sessions) {
                return [];
            }
            const result = [];
            for (const session of sessions) {
                if (session.state.read(r) !== 3 /* ChatEditingSessionState.Disposed */) {
                    const entries = session.entries.read(r);
                    result.push(...entries);
                }
            }
            return result;
        });
        this._currentlyEditingUris = derived(this, (r) => {
            const uri = this._currentEntries.read(r);
            return uri.filter(entry => entry.isCurrentlyBeingModifiedBy.read(r)).map(entry => entry.modifiedURI);
        });
        this._modifiedUris = derived(this, (r) => {
            const uri = this._currentEntries.read(r);
            return uri.filter(entry => !entry.isCurrentlyBeingModifiedBy.read(r) && entry.state.read(r) === 0 /* ModifiedFileEntryState.Modified */).map(entry => entry.modifiedURI);
        });
        this.onDidChange = Event.any(observeArrayChanges(this._currentlyEditingUris, compareBy(uri => uri.toString(), compare), this._store), observeArrayChanges(this._modifiedUris, compareBy(uri => uri.toString(), compare), this._store));
    }
    provideDecorations(uri, _token) {
        const isCurrentlyBeingModified = this._currentlyEditingUris.get().some(e => e.toString() === uri.toString());
        if (isCurrentlyBeingModified) {
            return {
                weight: 1000,
                letter: ThemeIcon.modify(Codicon.loading, 'spin'),
                bubble: false
            };
        }
        const isModified = this._modifiedUris.get().some(e => e.toString() === uri.toString());
        if (isModified) {
            return {
                weight: 1000,
                letter: Codicon.diffModified,
                tooltip: localize('chatEditing.modified2', "Pending changes from chat"),
                bubble: true
            };
        }
        return undefined;
    }
}
let ChatEditingMultiDiffSourceResolver = class ChatEditingMultiDiffSourceResolver {
    constructor(_editingSessionsObs, _instantiationService) {
        this._editingSessionsObs = _editingSessionsObs;
        this._instantiationService = _instantiationService;
    }
    canHandleUri(uri) {
        return uri.scheme === CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME;
    }
    async resolveDiffSource(uri) {
        const parsed = parseChatMultiDiffUri(uri);
        const thisSession = derived(this, r => {
            return this._editingSessionsObs.read(r).find(candidate => isEqual(candidate.chatSessionResource, parsed.chatSessionResource));
        });
        return this._instantiationService.createInstance(ChatEditingMultiDiffSource, thisSession, parsed.showPreviousChanges);
    }
};
ChatEditingMultiDiffSourceResolver = __decorate([
    __param(1, IInstantiationService)
], ChatEditingMultiDiffSourceResolver);
export { ChatEditingMultiDiffSourceResolver };
class ChatEditingMultiDiffSource {
    constructor(_currentSession, _showPreviousChanges) {
        this._currentSession = _currentSession;
        this._showPreviousChanges = _showPreviousChanges;
        this._resources = derived(this, (reader) => {
            const currentSession = this._currentSession.read(reader);
            if (!currentSession) {
                return [];
            }
            const entries = currentSession.entries.read(reader);
            return entries.map((entry) => {
                if (this._showPreviousChanges) {
                    const entryDiffObs = currentSession.getEntryDiffBetweenStops(entry.modifiedURI, undefined, undefined);
                    const entryDiff = entryDiffObs?.read(reader);
                    if (entryDiff) {
                        return new MultiDiffEditorItem(entryDiff.originalURI, entryDiff.modifiedURI, undefined, undefined, {
                            [chatEditingResourceContextKey.key]: entry.entryId,
                        });
                    }
                }
                return new MultiDiffEditorItem(entry.originalURI, entry.modifiedURI, undefined, undefined, {
                    [chatEditingResourceContextKey.key]: entry.entryId,
                    // [inChatEditingSessionContextKey.key]: true
                });
            });
        });
        this.resources = new ValueWithChangeEventFromObservable(this._resources);
        this.contextKeys = {
            [inChatEditingSessionContextKey.key]: true
        };
    }
}
function isTextEditOperationArray(value) {
    return value.some(e => TextEdit.isTextEdit(e));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFlLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RKLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxF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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InlineChatEscapeToolContribution_1;
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun, observableFromEvent } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor, isCompositeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { CTX_INLINE_CHAT_HAS_AGENT2, CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT, CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE, CTX_INLINE_CHAT_POSSIBLE } from '../common/inlineChat.js';
import { HunkData, Session, SessionWholeRange, StashedSession } from './inlineChatSession.js';
import { askInPanelChat, IInlineChatSessionService } from './inlineChatSessionService.js';
export class InlineChatError extends Error {
    static { this.code = 'InlineChatError'; }
    constructor(message) {
        super(message);
        this.name = InlineChatError.code;
    }
}
let InlineChatSessionServiceImpl = class InlineChatSessionServiceImpl {
    constructor(_telemetryService, _modelService, _textModelService, _editorWorkerService, _logService, _instaService, _editorService, _textFileService, _languageService, _chatService, _chatAgentService, _chatWidgetService) {
        this._telemetryService = _telemetryService;
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._editorWorkerService = _editorWorkerService;
        this._logService = _logService;
        this._instaService = _instaService;
        this._editorService = _editorService;
        this._textFileService = _textFileService;
        this._languageService = _languageService;
        this._chatService = _chatService;
        this._chatAgentService = _chatAgentService;
        this._chatWidgetService = _chatWidgetService;
        this._store = new DisposableStore();
        this._onWillStartSession = this._store.add(new Emitter());
        this.onWillStartSession = this._onWillStartSession.event;
        this._onDidMoveSession = this._store.add(new Emitter());
        this.onDidMoveSession = this._onDidMoveSession.event;
        this._onDidEndSession = this._store.add(new Emitter());
        this.onDidEndSession = this._onDidEndSession.event;
        this._onDidStashSession = this._store.add(new Emitter());
        this.onDidStashSession = this._onDidStashSession.event;
        this._sessions = new Map();
        this._keyComputers = new Map();
        // ---- NEW
        this._sessions2 = new ResourceMap();
        this._onDidChangeSessions = this._store.add(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    dispose() {
        this._store.dispose();
        this._sessions.forEach(x => x.store.dispose());
        this._sessions.clear();
    }
    async createSession(editor, options, token) {
        const agent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditorInline);
        if (!agent) {
            this._logService.trace('[IE] NO agent found');
            return undefined;
        }
        this._onWillStartSession.fire(editor);
        const textModel = editor.getModel();
        const selection = editor.getSelection();
        const store = new DisposableStore();
        this._logService.trace(`[IE] creating NEW session for ${editor.getId()}, ${agent.extensionId}`);
        const chatModelRef = options.session ? undefined : this._chatService.startSession(ChatAgentLocation.EditorInline);
        const chatModel = options.session?.chatModel ?? chatModelRef?.object;
        if (!chatModel) {
            this._logService.trace('[IE] NO chatModel found');
            chatModelRef?.dispose();
            return undefined;
        }
        if (chatModelRef) {
            store.add(chatModelRef);
        }
        const lastResponseListener = store.add(new MutableDisposable());
        store.add(chatModel.onDidChange(e => {
            if (e.kind !== 'addRequest' || !e.request.response) {
                return;
            }
            const { response } = e.request;
            session.markModelVersion(e.request);
            lastResponseListener.value = response.onDidChange(() => {
                if (!response.isComplete) {
                    return;
                }
                lastResponseListener.clear(); // ONCE
                // special handling for untitled files
                for (const part of response.response.value) {
                    if (part.kind !== 'textEditGroup' || part.uri.scheme !== Schemas.untitled || isEqual(part.uri, session.textModelN.uri)) {
                        continue;
                    }
                    const langSelection = this._languageService.createByFilepathOrFirstLine(part.uri, undefined);
                    const untitledTextModel = this._textFileService.untitled.create({
                        associatedResource: part.uri,
                        languageId: langSelection.languageId
                    });
                    untitledTextModel.resolve();
                    this._textModelService.createModelReference(part.uri).then(ref => {
                        store.add(ref);
                    });
                }
            });
        }));
        store.add(this._chatAgentService.onDidChangeAgents(e => {
            if (e === undefined && (!this._chatAgentService.getAgent(agent.id) || !this._chatAgentService.getActivatedAgents().map(agent => agent.id).includes(agent.id))) {
                this._logService.trace(`[IE] provider GONE for ${editor.getId()}, ${agent.extensionId}`);
                this._releaseSession(session, true);
            }
        }));
        const id = generateUuid();
        const targetUri = textModel.uri;
        // AI edits happen in the actual model, keep a reference but make no copy
        store.add((await this._textModelService.createModelReference(textModel.uri)));
        const textModelN = textModel;
        // create: keep a snapshot of the "actual" model
        const textModel0 = store.add(this._modelService.createModel(createTextBufferFactoryFromSnapshot(textModel.createSnapshot()), { languageId: textModel.getLanguageId(), onDidChange: Event.None }, targetUri.with({ scheme: Schemas.vscode, authority: 'inline-chat', path: '', query: new URLSearchParams({ id, 'textModel0': '' }).toString() }), true));
        // untitled documents are special and we are releasing their session when their last editor closes
        if (targetUri.scheme === Schemas.untitled) {
            store.add(this._editorService.onDidCloseEditor(() => {
                if (!this._editorService.isOpened({ resource: targetUri, typeId: UntitledTextEditorInput.ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id })) {
                    this._releaseSession(session, true);
                }
            }));
        }
        let wholeRange = options.wholeRange;
        if (!wholeRange) {
            wholeRange = new Range(selection.selectionStartLineNumber, selection.selectionStartColumn, selection.positionLineNumber, selection.positionColumn);
        }
        if (token.isCancellationRequested) {
            store.dispose();
            return undefined;
        }
        const session = new Session(options.headless ?? false, targetUri, textModel0, textModelN, agent, store.add(new SessionWholeRange(textModelN, wholeRange)), store.add(new HunkData(this._editorWorkerService, textModel0, textModelN)), chatModel, options.session?.versionsByRequest);
        // store: key -> session
        const key = this._key(editor, session.targetUri);
        if (this._sessions.has(key)) {
            store.dispose();
            throw new Error(`Session already stored for ${key}`);
        }
        this._sessions.set(key, { session, editor, store });
        return session;
    }
    moveSession(session, target) {
        const newKey = this._key(target, session.targetUri);
        const existing = this._sessions.get(newKey);
        if (existing) {
            if (existing.session !== session) {
                throw new Error(`Cannot move session because the target editor already/still has one`);
            }
            else {
                // noop
                return;
            }
        }
        let found = false;
        for (const [oldKey, data] of this._sessions) {
            if (data.session === session) {
                found = true;
                this._sessions.delete(oldKey);
                this._sessions.set(newKey, { ...data, editor: target });
                this._logService.trace(`[IE] did MOVE session for ${data.editor.getId()} to NEW EDITOR ${target.getId()}, ${session.agent.extensionId}`);
                this._onDidMoveSession.fire({ session, editor: target });
                break;
            }
        }
        if (!found) {
            throw new Error(`Cannot move session because it is not stored`);
        }
    }
    releaseSession(session) {
        this._releaseSession(session, false);
    }
    _releaseSession(session, byServer) {
        let tuple;
        // cleanup
        for (const candidate of this._sessions) {
            if (candidate[1].session === session) {
                // if (value.session === session) {
                tuple = candidate;
                break;
            }
        }
        if (!tuple) {
            // double remove
            return;
        }
        this._telemetryService.publicLog2('interactiveEditor/session', session.asTelemetryData());
        const [key, value] = tuple;
        this._sessions.delete(key);
        this._logService.trace(`[IE] did RELEASED session for ${value.editor.getId()}, ${session.agent.extensionId}`);
        this._onDidEndSession.fire({ editor: value.editor, session, endedByExternalCause: byServer });
        value.store.dispose();
    }
    stashSession(session, editor, undoCancelEdits) {
        const result = this._instaService.createInstance(StashedSession, editor, session, undoCancelEdits);
        this._onDidStashSession.fire({ editor, session });
        this._logService.trace(`[IE] did STASH session for ${editor.getId()}, ${session.agent.extensionId}`);
        return result;
    }
    getCodeEditor(session) {
        for (const [, data] of this._sessions) {
            if (data.session === session) {
                return data.editor;
            }
        }
        throw new Error('session not found');
    }
    getSession(editor, uri) {
        const key = this._key(editor, uri);
        return this._sessions.get(key)?.session;
    }
    _key(editor, uri) {
        const item = this._keyComputers.get(uri.scheme);
        return item
            ? item.getComparisonKey(editor, uri)
            : `${editor.getId()}@${uri.toString()}`;
    }
    registerSessionKeyComputer(scheme, value) {
        this._keyComputers.set(scheme, value);
        return toDisposable(() => this._keyComputers.delete(scheme));
    }
    async createSession2(editor, uri, token) {
        assertType(editor.hasModel());
        if (this._sessions2.has(uri)) {
            throw new Error('Session already exists');
        }
        this._onWillStartSession.fire(editor);
        const chatModelRef = this._chatService.startSession(ChatAgentLocation.EditorInline, { canUseTools: false /* SEE https://github.com/microsoft/vscode/issues/279946 */ });
        const chatModel = chatModelRef.object;
        chatModel.startEditingSession(false);
        const widget = this._chatWidgetService.getWidgetBySessionResource(chatModel.sessionResource);
        await widget?.attachmentModel.addFile(uri);
        const store = new DisposableStore();
        store.add(toDisposable(() => {
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionResource);
            chatModel.editingSession?.reject();
            this._sessions2.delete(uri);
            this._onDidChangeSessions.fire(this);
        }));
        store.add(chatModelRef);
        store.add(autorun(r => {
            const entries = chatModel.editingSession?.entries.read(r);
            if (!entries?.length) {
                return;
            }
            const state = entries.find(entry => isEqual(entry.modifiedURI, uri))?.state.read(r);
            if (state === 1 /* ModifiedFileEntryState.Accepted */ || state === 2 /* ModifiedFileEntryState.Rejected */) {
                const response = chatModel.getRequests().at(-1)?.response;
                if (response) {
                    this._chatService.notifyUserAction({
                        sessionResource: response.session.sessionResource,
                        requestId: response.requestId,
                        agentId: response.agent?.id,
                        command: response.slashCommand?.name,
                        result: response.result,
                        action: {
                            kind: 'inlineChat',
                            action: state === 1 /* ModifiedFileEntryState.Accepted */ ? 'accepted' : 'discarded'
                        }
                    });
                }
            }
            const allSettled = entries.every(entry => {
                const state = entry.state.read(r);
                return (state === 1 /* ModifiedFileEntryState.Accepted */ || state === 2 /* ModifiedFileEntryState.Rejected */)
                    && !entry.isCurrentlyBeingModifiedBy.read(r);
            });
            if (allSettled && !chatModel.requestInProgress.read(undefined)) {
                // self terminate
                store.dispose();
            }
        }));
        const result = {
            uri,
            initialPosition: editor.getSelection().getStartPosition().delta(-1), /* one line above selection start */
            initialSelection: editor.getSelection(),
            chatModel,
            editingSession: chatModel.editingSession,
            dispose: store.dispose.bind(store)
        };
        this._sessions2.set(uri, result);
        this._onDidChangeSessions.fire(this);
        return result;
    }
    getSession2(uri) {
        let result = this._sessions2.get(uri);
        if (!result) {
            // no direct session, try to find an editing session which has a file entry for the uri
            for (const [_, candidate] of this._sessions2) {
                const entry = candidate.editingSession.getEntry(uri);
                if (entry) {
                    result = candidate;
                    break;
                }
            }
        }
        return result;
    }
    getSessionBySessionUri(sessionResource) {
        for (const session of this._sessions2.values()) {
            if (isEqual(session.chatModel.sessionResource, sessionResource)) {
                return session;
            }
        }
        return undefined;
    }
};
InlineChatSessionServiceImpl = __decorate([
    __param(0, ITelemetryService),
    __param(1, IModelService),
    __param(2, ITextModelService),
    __param(3, IEditorWorkerService),
    __param(4, ILogService),
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, ITextFileService),
    __param(8, ILanguageService),
    __param(9, IChatService),
    __param(10, IChatAgentService),
    __param(11, IChatWidgetService)
], InlineChatSessionServiceImpl);
export { InlineChatSessionServiceImpl };
let InlineChatEnabler = class InlineChatEnabler {
    static { this.Id = 'inlineChat.enabler'; }
    constructor(contextKeyService, chatAgentService, editorService, configService) {
        this._store = new DisposableStore();
        this._ctxHasProvider2 = CTX_INLINE_CHAT_HAS_AGENT2.bindTo(contextKeyService);
        this._ctxHasNotebookInline = CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE.bindTo(contextKeyService);
        this._ctxHasNotebookProvider = CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT.bindTo(contextKeyService);
        this._ctxPossible = CTX_INLINE_CHAT_POSSIBLE.bindTo(contextKeyService);
        const agentObs = observableFromEvent(this, chatAgentService.onDidChangeAgents, () => chatAgentService.getDefaultAgent(ChatAgentLocation.EditorInline));
        const notebookAgentObs = observableFromEvent(this, chatAgentService.onDidChangeAgents, () => chatAgentService.getDefaultAgent(ChatAgentLocation.Notebook));
        const notebookAgentConfigObs = observableConfigValue("inlineChat.notebookAgent" /* InlineChatConfigKeys.notebookAgent */, false, configService);
        this._store.add(autorun(r => {
            const agent = agentObs.read(r);
            if (!agent) {
                this._ctxHasProvider2.reset();
            }
            else {
                this._ctxHasProvider2.set(true);
            }
        }));
        this._store.add(autorun(r => {
            this._ctxHasNotebookInline.set(!notebookAgentConfigObs.read(r) && !!agentObs.read(r));
            this._ctxHasNotebookProvider.set(notebookAgentConfigObs.read(r) && !!notebookAgentObs.read(r));
        }));
        const updateEditor = () => {
            const ctrl = editorService.activeEditorPane?.getControl();
            const isCodeEditorLike = isCodeEditor(ctrl) || isDiffEditor(ctrl) || isCompositeEditor(ctrl);
            this._ctxPossible.set(isCodeEditorLike);
        };
        this._store.add(editorService.onDidActiveEditorChange(updateEditor));
        updateEditor();
    }
    dispose() {
        this._ctxPossible.reset();
        this._ctxHasProvider2.reset();
        this._store.dispose();
    }
};
InlineChatEnabler = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService),
    __param(3, IConfigurationService)
], InlineChatEnabler);
export { InlineChatEnabler };
let InlineChatEscapeToolContribution = class InlineChatEscapeToolContribution extends Disposable {
    static { InlineChatEscapeToolContribution_1 = this; }
    static { this.Id = 'inlineChat.escapeTool'; }
    static { this.DONT_ASK_AGAIN_KEY = 'inlineChat.dontAskMoveToPanelChat'; }
    static { this._data = {
        id: 'inline_chat_exit',
        source: ToolDataSource.Internal,
        canBeReferencedInPrompt: false,
        alwaysDisplayInputOutput: false,
        displayName: localize('name', "Inline Chat to Panel Chat"),
        modelDescription: 'Moves the inline chat session to the richer panel chat which supports edits across files, creating and deleting files, multi-turn conversations between the user and the assistant, and access to more IDE tools, like retrieve problems, interact with source control, run terminal commands etc.',
    }; }
    constructor(lmTools, inlineChatSessionService, dialogService, codeEditorService, chatService, logService, storageService, instaService) {
        super();
        this._store.add(lmTools.registerTool(InlineChatEscapeToolContribution_1._data, {
            invoke: async (invocation, _tokenCountFn, _progress, _token) => {
                const sessionResource = invocation.context?.sessionResource;
                if (!sessionResource) {
                    logService.warn('InlineChatEscapeToolContribution: no sessionId in tool invocation context');
                    return { content: [{ kind: 'text', value: 'Cancel' }] };
                }
                const session = inlineChatSessionService.getSessionBySessionUri(sessionResource);
                if (!session) {
                    logService.warn(`InlineChatEscapeToolContribution: no session found for id ${sessionResource}`);
                    return { content: [{ kind: 'text', value: 'Cancel' }] };
                }
                const dontAskAgain = storageService.getBoolean(InlineChatEscapeToolContribution_1.DONT_ASK_AGAIN_KEY, 0 /* StorageScope.PROFILE */);
                let result;
                if (dontAskAgain !== undefined) {
                    // Use previously stored user preference: true = 'Continue in Chat view', false = 'Rephrase' (Cancel)
                    result = { confirmed: dontAskAgain, checkboxChecked: false };
                }
                else {
                    result = await dialogService.confirm({
                        type: 'question',
                        title: localize('confirm.title', "Do you want to continue in Chat view?"),
                        message: localize('confirm', "Do you want to continue in Chat view?"),
                        detail: localize('confirm.detail', "Inline chat is designed for making single-file code changes. Continue your request in the Chat view or rephrase it for inline chat."),
                        primaryButton: localize('confirm.yes', "Continue in Chat view"),
                        cancelButton: localize('confirm.cancel', "Cancel"),
                        checkbox: { label: localize('chat.remove.confirmation.checkbox', "Don't ask again"), checked: false },
                    });
                }
                const editor = codeEditorService.getFocusedCodeEditor();
                if (!editor || result.confirmed) {
                    logService.trace('InlineChatEscapeToolContribution: moving session to panel chat');
                    await instaService.invokeFunction(askInPanelChat, session.chatModel.getRequests().at(-1), session.chatModel.inputModel.state.get());
                    session.dispose();
                }
                else {
                    logService.trace('InlineChatEscapeToolContribution: rephrase prompt');
                    const lastRequest = session.chatModel.getRequests().at(-1);
                    chatService.removeRequest(session.chatModel.sessionResource, lastRequest.id);
                    session.chatModel.inputModel.setState({ inputText: lastRequest.message.text });
                }
                if (result.checkboxChecked) {
                    storageService.store(InlineChatEscapeToolContribution_1.DONT_ASK_AGAIN_KEY, result.confirmed, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                    logService.trace('InlineChatEscapeToolContribution: stored don\'t ask again preference');
                }
                return { content: [{ kind: 'text', value: 'Success' }] };
            }
        }));
    }
};
InlineChatEscapeToolContribution = InlineChatEscapeToolContribution_1 = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInlineChatSessionService),
    __param(2, IDialogService),
    __param(3, ICodeEditorService),
    __param(4, IChatService),
    __param(5, ILogService),
    __param(6, IStorageService),
    __param(7, IInstantiationService)
], InlineChatEscapeToolContribution);
export { InlineChatEscapeToolContribution };
registerAction2(class ResetMoveToPanelChatChoice extends Action2 {
    constructor() {
        super({
            id: 'inlineChat.resetMoveToPanelChatChoice',
            precondition: ContextKeyExpr.has('config.chat.disableAIFeatures').negate(),
            title: localize2('resetChoice.label', "Reset Choice for 'Move Inline Chat to Panel Chat'"),
            f1: true
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove(InlineChatEscapeToolContribution.DONT_ASK_AGAIN_KEY, 0 /* StorageScope.PROFILE */);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb25TZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFNlc3Npb25TZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQWtDLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1SSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFbkYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0s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
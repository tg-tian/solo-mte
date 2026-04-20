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
var ChatEditorInput_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { truncate } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IChatService } from '../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../common/chatSessionsService.js';
import { LocalChatSessionUri, getChatSessionType } from '../common/chatUri.js';
import { ChatAgentLocation, ChatEditorTitleMaxLength } from '../common/constants.js';
const ChatEditorIcon = registerIcon('chat-editor-label-icon', Codicon.chatSparkle, nls.localize('chatEditorLabelIcon', 'Icon of the chat editor label.'));
let ChatEditorInput = class ChatEditorInput extends EditorInput {
    static { ChatEditorInput_1 = this; }
    /** Maps input name strings to sets of active editor counts */
    static { this.countsInUseMap = new Map(); }
    static { this.TypeID = 'workbench.input.chatSession'; }
    static { this.EditorID = 'workbench.editor.chatSession'; }
    /**
     * Get the uri of the session this editor input is associated with.
     *
     * This should be preferred over using `resource` directly, as it handles cases where a chat editor becomes a session
     */
    get sessionResource() { return this._sessionResource; }
    get model() {
        return this.modelRef.value?.object;
    }
    static getNewEditorUri() {
        return ChatEditorUri.getNewEditorUri();
    }
    static getNextCount(inputName) {
        let count = 0;
        while (ChatEditorInput_1.countsInUseMap.get(inputName)?.has(count)) {
            count++;
        }
        return count;
    }
    constructor(resource, options, chatService, dialogService, chatSessionsService) {
        super();
        this.resource = resource;
        this.options = options;
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.chatSessionsService = chatSessionsService;
        this.hasCustomTitle = false;
        this.didTransferOutEditingSession = false;
        this.modelRef = this._register(new MutableDisposable());
        this.closeHandler = this;
        if (resource.scheme === Schemas.vscodeChatEditor) {
            const parsed = ChatEditorUri.parse(resource);
            if (!parsed || typeof parsed !== 'number') {
                throw new Error('Invalid chat URI');
            }
        }
        else if (resource.scheme === Schemas.vscodeLocalChatSession) {
            const localSessionId = LocalChatSessionUri.parseLocalSessionId(resource);
            if (!localSessionId) {
                throw new Error('Invalid local chat session URI');
            }
            this._sessionResource = resource;
        }
        else {
            this._sessionResource = resource;
        }
        // Check if we already have a custom title for this session
        const hasExistingCustomTitle = this._sessionResource && (this.chatService.getSession(this._sessionResource)?.title ||
            this.chatService.getPersistedSessionTitle(this._sessionResource)?.trim());
        this.hasCustomTitle = Boolean(hasExistingCustomTitle);
        // Input counts are unique to the displayed fallback title
        this.inputName = options.title?.fallback ?? '';
        if (!ChatEditorInput_1.countsInUseMap.has(this.inputName)) {
            ChatEditorInput_1.countsInUseMap.set(this.inputName, new Set());
        }
        // Only allocate a count if we don't already have a custom title
        if (!this.hasCustomTitle) {
            this.inputCount = ChatEditorInput_1.getNextCount(this.inputName);
            ChatEditorInput_1.countsInUseMap.get(this.inputName)?.add(this.inputCount);
            this._register(toDisposable(() => {
                // Only remove if we haven't already removed it due to custom title
                if (!this.hasCustomTitle) {
                    ChatEditorInput_1.countsInUseMap.get(this.inputName)?.delete(this.inputCount);
                    if (ChatEditorInput_1.countsInUseMap.get(this.inputName)?.size === 0) {
                        ChatEditorInput_1.countsInUseMap.delete(this.inputName);
                    }
                }
            }));
        }
        else {
            this.inputCount = 0; // Not used when we have a custom title
        }
    }
    showConfirm() {
        return !!(this.model && shouldShowClearEditingSessionConfirmation(this.model));
    }
    transferOutEditingSession() {
        this.didTransferOutEditingSession = true;
        return this.model?.editingSession;
    }
    async confirm(editors) {
        if (!this.model?.editingSession || this.didTransferOutEditingSession || this.getSessionType() !== localChatSessionType) {
            return 0 /* ConfirmResult.SAVE */;
        }
        const titleOverride = nls.localize('chatEditorConfirmTitle', "Close Chat Editor");
        const messageOverride = nls.localize('chat.startEditing.confirmation.pending.message.default', "Closing the chat editor will end your current edit session.");
        const result = await showClearEditingSessionConfirmation(this.model, this.dialogService, { titleOverride, messageOverride });
        return result ? 0 /* ConfirmResult.SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    get editorId() {
        return ChatEditorInput_1.EditorID;
    }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */;
    }
    matches(otherInput) {
        if (!(otherInput instanceof ChatEditorInput_1)) {
            return false;
        }
        return isEqual(this.sessionResource, otherInput.sessionResource);
    }
    get typeId() {
        return ChatEditorInput_1.TypeID;
    }
    getName() {
        // If we have a resolved model, use its title
        if (this.model?.title) {
            // Only truncate if the default title is being used (don't truncate custom titles)
            return this.model.hasCustomTitle ? this.model.title : truncate(this.model.title, ChatEditorTitleMaxLength);
        }
        // If we have a sessionId but no resolved model, try to get the title from persisted sessions
        if (this._sessionResource) {
            // First try the active session registry
            const existingSession = this.chatService.getSession(this._sessionResource);
            if (existingSession?.title) {
                return existingSession.title;
            }
            // If not in active registry, try persisted session data
            const persistedTitle = this.chatService.getPersistedSessionTitle(this._sessionResource);
            if (persistedTitle && persistedTitle.trim()) { // Only use non-empty persisted titles
                return persistedTitle;
            }
        }
        // If a preferred title was provided in options, use it
        if (this.options.title?.preferred) {
            return this.options.title.preferred;
        }
        // Fall back to default naming pattern
        const inputCountSuffix = (this.inputCount > 0 ? ` ${this.inputCount + 1}` : '');
        const defaultName = this.options.title?.fallback ?? nls.localize('chatEditorName', "Chat");
        return defaultName + inputCountSuffix;
    }
    getTitle(verbosity) {
        const name = this.getName();
        if (verbosity === 2 /* Verbosity.LONG */) { // Verbosity LONG is used for tooltips
            const sessionTypeDisplayName = this.getSessionTypeDisplayName();
            if (sessionTypeDisplayName) {
                return `${name} | ${sessionTypeDisplayName}`;
            }
        }
        return name;
    }
    getSessionTypeDisplayName() {
        const sessionType = this.getSessionType();
        if (sessionType === localChatSessionType) {
            return;
        }
        const contributions = this.chatSessionsService.getAllChatSessionContributions();
        const contribution = contributions.find(c => c.type === sessionType);
        return contribution?.displayName;
    }
    getIcon() {
        const resolvedIcon = this.resolveIcon();
        if (resolvedIcon) {
            this.cachedIcon = resolvedIcon;
            return resolvedIcon;
        }
        // Fall back to default icon
        return ChatEditorIcon;
    }
    resolveIcon() {
        // TODO@osortega,@rebornix double check: Chat Session Item icon is reserved for chat session list and deprecated for chat session status. thus here we use session type icon. We may want to show status for the Editor Title.
        const sessionType = this.getSessionType();
        if (sessionType !== localChatSessionType) {
            const typeIcon = this.chatSessionsService.getIconForSessionType(sessionType);
            if (typeIcon) {
                return typeIcon;
            }
        }
        return undefined;
    }
    /**
     * Returns chat session type from a URI, or {@linkcode localChatSessionType} if not specified or cannot be determined.
     */
    getSessionType() {
        return getChatSessionType(this.resource);
    }
    async resolve() {
        const searchParams = new URLSearchParams(this.resource.query);
        const chatSessionType = searchParams.get('chatSessionType');
        const inputType = chatSessionType ?? this.resource.authority;
        if (this._sessionResource) {
            this.modelRef.value = await this.chatService.loadSessionForResource(this._sessionResource, ChatAgentLocation.Chat, CancellationToken.None);
            // For local session only, if we find no existing session, create a new one
            if (!this.model && LocalChatSessionUri.parseLocalSessionId(this._sessionResource)) {
                this.modelRef.value = this.chatService.startSession(ChatAgentLocation.Chat, { canUseTools: true });
            }
        }
        else if (!this.options.target) {
            this.modelRef.value = this.chatService.startSession(ChatAgentLocation.Chat, { canUseTools: !inputType });
        }
        else if (this.options.target.data) {
            this.modelRef.value = this.chatService.loadSessionFromContent(this.options.target.data);
        }
        if (!this.model || this.isDisposed()) {
            return null;
        }
        this._sessionResource = this.model.sessionResource;
        this._register(this.model.onDidChange((e) => {
            // When a custom title is set, we no longer need the numeric count
            if (e && e.kind === 'setCustomTitle' && !this.hasCustomTitle) {
                this.hasCustomTitle = true;
                ChatEditorInput_1.countsInUseMap.get(this.inputName)?.delete(this.inputCount);
                if (ChatEditorInput_1.countsInUseMap.get(this.inputName)?.size === 0) {
                    ChatEditorInput_1.countsInUseMap.delete(this.inputName);
                }
            }
            // Invalidate icon cache when label changes
            this.cachedIcon = undefined;
            this._onDidChangeLabel.fire();
        }));
        // Check if icon has changed after model resolution
        const newIcon = this.resolveIcon();
        if (newIcon && (!this.cachedIcon || !this.iconsEqual(this.cachedIcon, newIcon))) {
            this.cachedIcon = newIcon;
        }
        this._onDidChangeLabel.fire();
        return this._register(new ChatEditorModel(this.model));
    }
    iconsEqual(a, b) {
        if (ThemeIcon.isThemeIcon(a) && ThemeIcon.isThemeIcon(b)) {
            return a.id === b.id;
        }
        if (a instanceof URI && b instanceof URI) {
            return a.toString() === b.toString();
        }
        return false;
    }
};
ChatEditorInput = ChatEditorInput_1 = __decorate([
    __param(2, IChatService),
    __param(3, IDialogService),
    __param(4, IChatSessionsService)
], ChatEditorInput);
export { ChatEditorInput };
export class ChatEditorModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._isResolved = false;
    }
    async resolve() {
        this._isResolved = true;
    }
    isResolved() {
        return this._isResolved;
    }
    isDisposed() {
        return this._store.isDisposed;
    }
}
var ChatEditorUri;
(function (ChatEditorUri) {
    const scheme = Schemas.vscodeChatEditor;
    function getNewEditorUri() {
        const handle = Math.floor(Math.random() * 1e9);
        return URI.from({ scheme, path: `chat-${handle}` });
    }
    ChatEditorUri.getNewEditorUri = getNewEditorUri;
    function parse(resource) {
        if (resource.scheme !== scheme) {
            return undefined;
        }
        const match = resource.path.match(/chat-(\d+)/);
        const handleStr = match?.[1];
        if (typeof handleStr !== 'string') {
            return undefined;
        }
        const handle = parseInt(handleStr);
        if (isNaN(handle)) {
            return undefined;
        }
        return handle;
    }
    ChatEditorUri.parse = parse;
})(ChatEditorUri || (ChatEditorUri = {}));
export class ChatEditorInputSerializer {
    canSerialize(input) {
        return input instanceof ChatEditorInput && !!input.sessionResource;
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const obj = {
            options: input.options,
            sessionResource: input.sessionResource,
            resource: input.resource,
        };
        return JSON.stringify(obj);
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            // Old inputs have a session id for local session
            const parsed = JSON.parse(serializedEditor);
            // First if we have a modern session resource, use that
            if (parsed.sessionResource) {
                const sessionResource = URI.revive(parsed.sessionResource);
                return instantiationService.createInstance(ChatEditorInput, sessionResource, parsed.options);
            }
            // Otherwise check to see if we're a chat editor with a local session id
            let resource = URI.revive(parsed.resource);
            if (resource.scheme === Schemas.vscodeChatEditor && parsed.sessionId) {
                resource = LocalChatSessionUri.forSession(parsed.sessionId);
            }
            return instantiationService.createInstance(ChatEditorInput, resource, parsed.options);
        }
        catch (err) {
            return undefined;
        }
    }
}
export async function showClearEditingSessionConfirmation(model, dialogService, options) {
    const undecidedEdits = shouldShowClearEditingSessionConfirmation(model, options);
    if (!undecidedEdits) {
        return true; // safe to dispose without confirmation
    }
    const defaultPhrase = nls.localize('chat.startEditing.confirmation.pending.message.default1', "Starting a new chat will end your current edit session.");
    const defaultTitle = nls.localize('chat.startEditing.confirmation.title', "Start new chat?");
    const phrase = options?.messageOverride ?? defaultPhrase;
    const title = options?.titleOverride ?? defaultTitle;
    const { result } = await dialogService.prompt({
        title,
        message: phrase + ' ' + nls.localize('chat.startEditing.confirmation.pending.message.2', "Do you want to keep pending edits to {0} files?", undecidedEdits),
        type: 'info',
        cancelButton: true,
        buttons: [
            {
                label: nls.localize('chat.startEditing.confirmation.acceptEdits', "Keep & Continue"),
                run: async () => {
                    await model.editingSession.accept();
                    return true;
                }
            },
            {
                label: nls.localize('chat.startEditing.confirmation.discardEdits', "Undo & Continue"),
                run: async () => {
                    await model.editingSession.reject();
                    return true;
                }
            }
        ],
    });
    return Boolean(result);
}
/** Returns the number of files in the  model's modifications that need a prompt before saving */
export function shouldShowClearEditingSessionConfirmation(model, options) {
    if (!model.editingSession || (model.willKeepAlive && !options?.isArchiveAction)) {
        return 0; // safe to dispose without confirmation
    }
    const currentEdits = model.editingSession.entries.get();
    const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
    return undecidedEdits.length;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQWlCLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsV0FBVyxFQUF1QixNQUFNLHVDQUF1QyxDQUFDO0FBR3pGLE9BQU8sRUFBdUIsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFJckYsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixFQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7QUFFbkosSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxXQUFXOztJQUMvQyw4REFBOEQ7YUFDOUMsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQUFBakMsQ0FBa0M7YUFFaEQsV0FBTSxHQUFXLDZCQUE2QixBQUF4QyxDQUF5QzthQUMvQyxhQUFRLEdBQVcsOEJBQThCLEFBQXpDLENBQTBDO0lBT2xFOzs7O09BSUc7SUFDSCxJQUFXLGVBQWUsS0FBc0IsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBUS9FLElBQVksS0FBSztRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztJQUNwQyxDQUFDO0lBRUQsTUFBTSxDQUFDLGVBQWU7UUFDckIsT0FBTyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxZQUFZLENBQUMsU0FBaUI7UUFDNUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxpQkFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEUsS0FBSyxFQUFFLENBQUM7UUFDVCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsWUFDVSxRQUFhLEVBQ2IsT0FBMkIsRUFDdEIsV0FBMEMsRUFDeEMsYUFBOEMsRUFDeEMsbUJBQTBEO1FBRWhGLEtBQUssRUFBRSxDQUFDO1FBTkMsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNiLFlBQU8sR0FBUCxPQUFPLENBQW9CO1FBQ0wsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3ZCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUE1QnpFLG1CQUFjLEdBQVksS0FBSyxDQUFDO1FBQ2hDLGlDQUE0QixHQUFHLEtBQUssQ0FBQztRQUc1QixhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUF1QixDQUFDLENBQUM7UUEyRWhGLGlCQUFZLEdBQUcsSUFBSSxDQUFDO1FBL0M1QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDbEQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDckMsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDL0QsTUFBTSxjQUFjLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7WUFDbkQsQ0FBQztZQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUM7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDO1FBQ2xDLENBQUM7UUFFRCwyREFBMkQ7UUFDM0QsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FDdkQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsS0FBSztZQUN6RCxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUN4RSxDQUFDO1FBRUYsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUV0RCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLGlCQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN6RCxpQkFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsaUJBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9ELGlCQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6RSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hDLG1FQUFtRTtnQkFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDMUIsaUJBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUM1RSxJQUFJLGlCQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNwRSxpQkFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUN2RCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLHVDQUF1QztRQUM3RCxDQUFDO0lBQ0YsQ0FBQztJQUlELFdBQVc7UUFDVixPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUkseUNBQXlDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVELHlCQUF5QjtRQUN4QixJQUFJLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBeUM7UUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsY0FBYyxJQUFJLElBQUksQ0FBQyw0QkFBNEIsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssb0JBQW9CLEVBQUUsQ0FBQztZQUN4SCxrQ0FBMEI7UUFDM0IsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNsRixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHdEQUF3RCxFQUFFLDZEQUE2RCxDQUFDLENBQUM7UUFDOUosTUFBTSxNQUFNLEdBQUcsTUFBTSxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM3SCxPQUFPLE1BQU0sQ0FBQyxDQUFDLDRCQUFvQixDQUFDLDZCQUFxQixDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDcEIsT0FBTyxpQkFBZSxDQUFDLFFBQVEsQ0FBQztJQUNqQyxDQUFDO0lBRUQsSUFBYSxZQUFZO1FBQ3hCLE9BQU8sS0FBSyxDQUFDLFlBQVksNENBQW9DLHNEQUE0QyxDQUFDO0lBQzNHLENBQUM7SUFFUSxPQUFPLENBQUMsVUFBNkM7UUFDN0QsSUFBSSxDQUFDLENBQUMsVUFBVSxZQUFZLGlCQUFlLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxJQUFhLE1BQU07UUFDbEIsT0FBTyxpQkFBZSxDQUFDLE1BQU0sQ0FBQztJQUMvQixDQUFDO0lBRVEsT0FBTztRQUNmLDZDQUE2QztRQUM3QyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDdkIsa0ZBQWtGO1lBQ2xGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUM1RyxDQUFDO1FBRUQsNkZBQTZGO1FBQzdGLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDM0Isd0NBQXdDO1lBQ3hDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzNFLElBQUksZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUM1QixPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUM7WUFDOUIsQ0FBQztZQUVELHdEQUF3RDtZQUN4RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3hGLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsc0NBQXNDO2dCQUNwRixPQUFPLGNBQWMsQ0FBQztZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELHVEQUF1RDtRQUN2RCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzNGLE9BQU8sV0FBVyxHQUFHLGdCQUFnQixDQUFDO0lBQ3ZDLENBQUM7SUFFUSxRQUFRLENBQUMsU0FBcUI7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLElBQUksU0FBUywyQkFBbUIsRUFBRSxDQUFDLENBQUMsc0NBQXNDO1lBQ3pFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDaEUsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO2dCQUM1QixPQUFPLEdBQUcsSUFBSSxNQUFNLHNCQUFzQixFQUFFLENBQUM7WUFDOUMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzFDLElBQUksV0FBVyxLQUFLLG9CQUFvQixFQUFFLENBQUM7WUFDMUMsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUNoRixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQztRQUNyRSxPQUFPLFlBQVksRUFBRSxXQUFXLENBQUM7SUFDbEMsQ0FBQztJQUVRLE9BQU87UUFDZixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDeEMsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQztZQUMvQixPQUFPLFlBQVksQ0FBQztRQUNyQixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE9BQU8sY0FBYyxDQUFDO0lBQ3ZCLENBQUM7SUFFTyxXQUFXO1FBQ2xCLDhOQUE4TjtRQUM5TixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDMUMsSUFBSSxXQUFXLEtBQUssb0JBQW9CLEVBQUUsQ0FBQztZQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDN0UsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxPQUFPLFFBQVEsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNJLGNBQWM7UUFDcEIsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLE1BQU0sWUFBWSxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUQsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzVELE1BQU0sU0FBUyxHQUFHLGVBQWUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztRQUU3RCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTNJLDJFQUEyRTtZQUMzRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUNuRixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNwRyxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDMUcsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO1FBRW5ELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzQyxrRUFBa0U7WUFDbEUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxnQkFBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7Z0JBQzNCLGlCQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDNUUsSUFBSSxpQkFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDcEUsaUJBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkQsQ0FBQztZQUNGLENBQUM7WUFDRCwyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixtREFBbUQ7UUFDbkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25DLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNqRixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO1FBRTlCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU8sVUFBVSxDQUFDLENBQWtCLEVBQUUsQ0FBa0I7UUFDeEQsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztZQUMxQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQzs7QUExUlcsZUFBZTtJQTZDekIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsb0JBQW9CLENBQUE7R0EvQ1YsZUFBZSxDQTRSM0I7O0FBRUQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsVUFBVTtJQUc5QyxZQUNVLEtBQWlCO1FBQ3ZCLEtBQUssRUFBRSxDQUFDO1FBREYsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUhuQixnQkFBVyxHQUFHLEtBQUssQ0FBQztJQUlmLENBQUM7SUFFZCxLQUFLLENBQUMsT0FBTztRQUNaLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztJQUMvQixDQUFDO0NBQ0Q7QUFHRCxJQUFVLGFBQWEsQ0EyQnRCO0FBM0JELFdBQVUsYUFBYTtJQUV0QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFeEMsU0FBZ0IsZUFBZTtRQUM5QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMvQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFIZSw2QkFBZSxrQkFHOUIsQ0FBQTtJQUVELFNBQWdCLEtBQUssQ0FBQyxRQUFhO1FBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDaEQsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25DLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbkIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQWpCZSxtQkFBSyxRQWlCcEIsQ0FBQTtBQUNGLENBQUMsRUEzQlMsYUFBYSxLQUFiLGFBQWEsUUEyQnRCO0FBUUQsTUFBTSxPQUFPLHlCQUF5QjtJQUNyQyxZQUFZLENBQUMsS0FBa0I7UUFDOUIsT0FBTyxLQUFLLFlBQVksZUFBZSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO0lBQ3BFLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBa0I7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQStCO1lBQ3ZDLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWU7WUFDdEMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1NBRXhCLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELFdBQVcsQ0FBQyxvQkFBMkMsRUFBRSxnQkFBd0I7UUFDaEYsSUFBSSxDQUFDO1lBQ0osaURBQWlEO1lBQ2pELE1BQU0sTUFBTSxHQUE0RSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFckgsdURBQXVEO1lBQ3ZELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUM1QixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUYsQ0FBQztZQUVELHdFQUF3RTtZQUN4RSxJQUFJLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGdCQUFnQixJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdEUsUUFBUSxHQUFHLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0QsQ0FBQztZQUVELE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsbUNBQW1DLENBQUMsS0FBaUIsRUFBRSxhQUE2QixFQUFFLE9BQWlEO0lBQzVKLE1BQU0sY0FBYyxHQUFHLHlDQUF5QyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDckIsT0FBTyxJQUFJLENBQUMsQ0FBQyx1Q0FBdUM7SUFDckQsQ0FBQztJQUVELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMseURBQXlELEVBQUUseURBQXlELENBQUMsQ0FBQztJQUN6SixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDN0YsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLGVBQWUsSUFBSSxhQUFhLENBQUM7SUFDekQsTUFBTSxLQUFLLEdBQUcsT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLENBQUM7SUFFckQsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxLQUFLO1FBQ0wsT0FBTyxFQUFFLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsRUFBRSxpREFBaUQsRUFBRSxjQUFjLENBQUM7UUFDM0osSUFBSSxFQUFFLE1BQU07UUFDWixZQUFZLEVBQUUsSUFBSTtRQUNsQixPQUFPLEVBQUU7WUFDUjtnQkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxpQkFBaUIsQ0FBQztnQkFDcEYsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO29CQUNmLE1BQU0sS0FBSyxDQUFDLGNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDckMsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQzthQUNEO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLEVBQUUsaUJBQWlCLENBQUM7Z0JBQ3JGLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDZixNQUFNLEtBQUssQ0FBQyxjQUFlLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3JDLE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUM7YUFDRDtTQUNEO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUVELGlHQUFpRztBQUNqRyxNQUFNLFVBQVUseUNBQXlDLENBQUMsS0FBaUIsRUFBRSxPQUFpRDtJQUM3SCxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUNqRixPQUFPLENBQUMsQ0FBQyxDQUFDLHVDQUF1QztJQUNsRCxDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDeEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsNENBQW9DLENBQUMsQ0FBQztJQUMzRyxPQUFPLGNBQWMsQ0FBQyxNQUFNLENBQUM7QUFDOUIsQ0FBQyJ9
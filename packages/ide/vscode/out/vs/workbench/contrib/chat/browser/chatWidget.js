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
var ChatWidget_1;
import './media/chat.css';
import './media/chatAgentHover.css';
import './media/chatViewWelcome.css';
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { disposableTimeout, timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, MutableDisposable, thenIfNotDisposed } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { filter } from '../../../../base/common/objects.js';
import { autorun, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { basename, extUri, isEqual } from '../../../../base/common/resources.js';
import { MicrotaskDelay } from '../../../../base/common/symbols.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import product from '../../../../platform/product/common/product.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { buttonSecondaryBackground, buttonSecondaryForeground, buttonSecondaryHoverBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { EditorResourceAccessor } from '../../../../workbench/common/editor.js';
import { IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { katexContainerClassName } from '../../markdown/common/markedKatexExtension.js';
import { checkModeOption } from '../common/chat.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, decidedChatEditingResourceContextKey, hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, IChatEditingService, inChatEditingSessionContextKey } from '../common/chatEditingService.js';
import { IChatLayoutService } from '../common/chatLayoutService.js';
import { ChatMode, IChatModeService } from '../common/chatModes.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestDynamicVariablePart, ChatRequestSlashPromptPart, ChatRequestToolPart, ChatRequestToolSetPart, chatSubcommandLeader, formatChatQuestion } from '../common/chatParserTypes.js';
import { ChatRequestParser } from '../common/chatRequestParser.js';
import { IChatService } from '../common/chatService.js';
import { IChatSessionsService } from '../common/chatSessionsService.js';
import { IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { IChatTodoListService } from '../common/chatTodoListService.js';
import { isPromptFileVariableEntry, isPromptTextVariableEntry, isWorkspaceVariableEntry, PromptFileVariableKind, toPromptFileVariableEntry } from '../common/chatVariableEntries.js';
import { ChatViewModel, isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { CodeBlockModelCollection } from '../common/codeBlockModelCollection.js';
import { ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { ComputeAutomaticInstructions } from '../common/promptSyntax/computeAutomaticInstructions.js';
import { PromptsConfig } from '../common/promptSyntax/config/config.js';
import { Target } from '../common/promptSyntax/promptFileParser.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
import { handleModeSwitch } from './actions/chatActions.js';
import { IChatAccessibilityService, IChatWidgetService, isIChatResourceViewContext, isIChatViewViewContext } from './chat.js';
import { ChatAccessibilityProvider } from './chatAccessibilityProvider.js';
import { ChatSuggestNextWidget } from './chatContentParts/chatSuggestNextWidget.js';
import { ChatInputPart } from './chatInputPart.js';
import { ChatListDelegate, ChatListItemRenderer } from './chatListRenderer.js';
import { ChatEditorOptions } from './chatOptions.js';
import { ChatViewWelcomePart } from './viewsWelcome/chatViewWelcomeController.js';
import { IAgentSessionsService } from './agentSessions/agentSessionsService.js';
const $ = dom.$;
export function isQuickChat(widget) {
    return isIChatResourceViewContext(widget.viewContext) && Boolean(widget.viewContext.isQuickChat);
}
function isInlineChat(widget) {
    return isIChatResourceViewContext(widget.viewContext) && Boolean(widget.viewContext.isInlineChat);
}
const supportsAllAttachments = {
    supportsFileAttachments: true,
    supportsToolAttachments: true,
    supportsMCPAttachments: true,
    supportsImageAttachments: true,
    supportsSearchResultAttachments: true,
    supportsInstructionAttachments: true,
    supportsSourceControlAttachments: true,
    supportsProblemAttachments: true,
    supportsSymbolAttachments: true,
    supportsTerminalAttachments: true,
};
const DISCLAIMER = localize('chatDisclaimer', "AI responses may be inaccurate.");
let ChatWidget = class ChatWidget extends Disposable {
    static { ChatWidget_1 = this; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static { this.CONTRIBS = []; }
    get domNode() { return this.container; }
    get visible() { return this._visible; }
    set viewModel(viewModel) {
        if (this._viewModel === viewModel) {
            return;
        }
        const previousSessionResource = this._viewModel?.sessionResource;
        this.viewModelDisposables.clear();
        this._viewModel = viewModel;
        if (viewModel) {
            this.viewModelDisposables.add(viewModel);
            this.logService.debug('ChatWidget#setViewModel: have viewModel');
        }
        else {
            this.logService.debug('ChatWidget#setViewModel: no viewModel');
        }
        this._onDidChangeViewModel.fire({ previousSessionResource, currentSessionResource: this._viewModel?.sessionResource });
    }
    get viewModel() {
        return this._viewModel;
    }
    get parsedInput() {
        if (this.parsedChatRequest === undefined) {
            if (!this.viewModel) {
                return { text: '', parts: [] };
            }
            this.parsedChatRequest = this.instantiationService.createInstance(ChatRequestParser)
                .parseChatRequest(this.viewModel.sessionResource, this.getInput(), this.location, {
                selectedAgent: this._lastSelectedAgent,
                mode: this.input.currentModeKind,
                forcedAgent: this._lockedAgent?.id ? this.chatAgentService.getAgent(this._lockedAgent.id) : undefined
            });
            this._onDidChangeParsedInput.fire();
        }
        return this.parsedChatRequest;
    }
    get scopedContextKeyService() {
        return this.contextKeyService;
    }
    get location() {
        return this._location.location;
    }
    get supportsChangingModes() {
        return !!this.viewOptions.supportsChangingModes;
    }
    get locationData() {
        return this._location.resolveData?.();
    }
    constructor(location, viewContext, viewOptions, styles, codeEditorService, editorService, configurationService, contextKeyService, instantiationService, chatService, chatAgentService, chatWidgetService, contextMenuService, chatAccessibilityService, logService, themeService, chatSlashCommandService, chatEditingService, telemetryService, promptsService, toolsService, chatModeService, chatLayoutService, chatEntitlementService, chatSessionsService, agentSessionsService, chatTodoListService, contextService, lifecycleService) {
        super();
        this.viewOptions = viewOptions;
        this.styles = styles;
        this.codeEditorService = codeEditorService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.chatWidgetService = chatWidgetService;
        this.contextMenuService = contextMenuService;
        this.chatAccessibilityService = chatAccessibilityService;
        this.logService = logService;
        this.themeService = themeService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.telemetryService = telemetryService;
        this.promptsService = promptsService;
        this.toolsService = toolsService;
        this.chatModeService = chatModeService;
        this.chatLayoutService = chatLayoutService;
        this.chatEntitlementService = chatEntitlementService;
        this.chatSessionsService = chatSessionsService;
        this.agentSessionsService = agentSessionsService;
        this.chatTodoListService = chatTodoListService;
        this.contextService = contextService;
        this.lifecycleService = lifecycleService;
        this._onDidSubmitAgent = this._register(new Emitter());
        this.onDidSubmitAgent = this._onDidSubmitAgent.event;
        this._onDidChangeAgent = this._register(new Emitter());
        this.onDidChangeAgent = this._onDidChangeAgent.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidChangeViewModel = this._register(new Emitter());
        this.onDidChangeViewModel = this._onDidChangeViewModel.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidAcceptInput = this._register(new Emitter());
        this.onDidAcceptInput = this._onDidAcceptInput.event;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._onDidShow = this._register(new Emitter());
        this.onDidShow = this._onDidShow.event;
        this._onDidChangeParsedInput = this._register(new Emitter());
        this.onDidChangeParsedInput = this._onDidChangeParsedInput.event;
        this._onWillMaybeChangeHeight = new Emitter();
        this.onWillMaybeChangeHeight = this._onWillMaybeChangeHeight.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidChangeContentHeight = new Emitter();
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this._onDidChangeEmptyState = this._register(new Emitter());
        this.onDidChangeEmptyState = this._onDidChangeEmptyState.event;
        this.contribs = [];
        this.visibilityTimeoutDisposable = this._register(new MutableDisposable());
        this.visibilityAnimationFrameDisposable = this._register(new MutableDisposable());
        this.scrollAnimationFrameDisposable = this._register(new MutableDisposable());
        this.inputPartDisposable = this._register(new MutableDisposable());
        this.inlineInputPartDisposable = this._register(new MutableDisposable());
        this.recentlyRestoredCheckpoint = false;
        this.settingChangeCounter = 0;
        this.welcomePart = this._register(new MutableDisposable());
        this.visibleChangeCount = 0;
        this._visible = false;
        this.previousTreeScrollHeight = 0;
        /**
         * Whether the list is scroll-locked to the bottom. Initialize to true so that we can scroll to the bottom on first render.
         * The initial render leads to a lot of `onDidChangeTreeContentHeight` as the renderer works out the real heights of rows.
        */
        this.scrollLock = true;
        this._isRenderingWelcome = false;
        this._attachmentCapabilities = supportsAllAttachments;
        // Cache for prompt file descriptions to avoid async calls during rendering
        this.promptDescriptionsCache = new Map();
        this.promptUriCache = new Map();
        this._isLoadingPromptDescriptions = false;
        this._mostRecentlyFocusedItemIndex = -1;
        this.viewModelDisposables = this._register(new DisposableStore());
        this._editingSession = observableValue(this, undefined);
        this._lockedToCodingAgentContextKey = ChatContextKeys.lockedToCodingAgent.bindTo(this.contextKeyService);
        this._agentSupportsAttachmentsContextKey = ChatContextKeys.agentSupportsAttachments.bindTo(this.contextKeyService);
        this._sessionIsEmptyContextKey = ChatContextKeys.chatSessionIsEmpty.bindTo(this.contextKeyService);
        this.viewContext = viewContext ?? {};
        const viewModelObs = observableFromEvent(this, this.onDidChangeViewModel, () => this.viewModel);
        if (typeof location === 'object') {
            this._location = location;
        }
        else {
            this._location = { location };
        }
        ChatContextKeys.inChatSession.bindTo(contextKeyService).set(true);
        ChatContextKeys.location.bindTo(contextKeyService).set(this._location.location);
        ChatContextKeys.inQuickChat.bindTo(contextKeyService).set(isQuickChat(this));
        this.agentInInput = ChatContextKeys.inputHasAgent.bindTo(contextKeyService);
        this.requestInProgress = ChatContextKeys.requestInProgress.bindTo(contextKeyService);
        this._register(this.chatEntitlementService.onDidChangeAnonymous(() => this.renderWelcomeViewContentIfNeeded()));
        this._register(bindContextKey(decidedChatEditingResourceContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            if (!currentSession) {
                return;
            }
            const entries = currentSession.entries.read(reader);
            const decidedEntries = entries.filter(entry => entry.state.read(reader) !== 0 /* ModifiedFileEntryState.Modified */);
            return decidedEntries.map(entry => entry.entryId);
        }));
        this._register(bindContextKey(hasUndecidedChatEditingResourceContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            const entries = currentSession?.entries.read(reader) ?? []; // using currentSession here
            const decidedEntries = entries.filter(entry => entry.state.read(reader) === 0 /* ModifiedFileEntryState.Modified */);
            return decidedEntries.length > 0;
        }));
        this._register(bindContextKey(hasAppliedChatEditsContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            if (!currentSession) {
                return false;
            }
            const entries = currentSession.entries.read(reader);
            return entries.length > 0;
        }));
        this._register(bindContextKey(inChatEditingSessionContextKey, contextKeyService, (reader) => {
            return this._editingSession.read(reader) !== null;
        }));
        this._register(bindContextKey(ChatContextKeys.chatEditingCanUndo, contextKeyService, (r) => {
            return this._editingSession.read(r)?.canUndo.read(r) || false;
        }));
        this._register(bindContextKey(ChatContextKeys.chatEditingCanRedo, contextKeyService, (r) => {
            return this._editingSession.read(r)?.canRedo.read(r) || false;
        }));
        this._register(bindContextKey(applyingChatEditsFailedContextKey, contextKeyService, (r) => {
            const chatModel = viewModelObs.read(r)?.model;
            const editingSession = this._editingSession.read(r);
            if (!editingSession || !chatModel) {
                return false;
            }
            const lastResponse = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)?.response).read(r);
            return lastResponse?.result?.errorDetails && !lastResponse?.result?.errorDetails.responseIsIncomplete;
        }));
        this._codeBlockModelCollection = this._register(instantiationService.createInstance(CodeBlockModelCollection, undefined));
        this.chatSuggestNextWidget = this._register(this.instantiationService.createInstance(ChatSuggestNextWidget));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('chat.renderRelatedFiles')) {
                this.input.renderChatRelatedFiles();
            }
            if (e.affectsConfiguration(ChatConfiguration.EditRequests) || e.affectsConfiguration(ChatConfiguration.CheckpointsEnabled)) {
                this.settingChangeCounter++;
                this.onDidChangeItems();
            }
        }));
        this._register(autorun(r => {
            const viewModel = viewModelObs.read(r);
            const sessions = chatEditingService.editingSessionsObs.read(r);
            const session = sessions.find(candidate => isEqual(candidate.chatSessionResource, viewModel?.sessionResource));
            this._editingSession.set(undefined, undefined);
            this.renderChatEditingSessionState(); // this is necessary to make sure we dispose previous buttons, etc.
            if (!session) {
                // none or for a different chat widget
                return;
            }
            const entries = session.entries.read(r);
            for (const entry of entries) {
                entry.state.read(r); // SIGNAL
            }
            this._editingSession.set(session, undefined);
            r.store.add(session.onDidDispose(() => {
                this._editingSession.set(undefined, undefined);
                this.renderChatEditingSessionState();
            }));
            r.store.add(this.onDidChangeParsedInput(() => {
                this.renderChatEditingSessionState();
            }));
            r.store.add(this.inputEditor.onDidChangeModelContent(() => {
                if (this.getInput() === '') {
                    this.refreshParsedInput();
                    this.renderChatEditingSessionState();
                }
            }));
            this.renderChatEditingSessionState();
        }));
        this._register(codeEditorService.registerCodeEditorOpenHandler(async (input, _source, _sideBySide) => {
            const resource = input.resource;
            if (resource.scheme !== Schemas.vscodeChatCodeBlock) {
                return null;
            }
            const responseId = resource.path.split('/').at(1);
            if (!responseId) {
                return null;
            }
            const item = this.viewModel?.getItems().find(item => item.id === responseId);
            if (!item) {
                return null;
            }
            // TODO: needs to reveal the chat view
            this.reveal(item);
            await timeout(0); // wait for list to actually render
            for (const codeBlockPart of this.renderer.editorsInUse()) {
                if (extUri.isEqual(codeBlockPart.uri, resource, true)) {
                    const editor = codeBlockPart.editor;
                    let relativeTop = 0;
                    const editorDomNode = editor.getDomNode();
                    if (editorDomNode) {
                        const row = dom.findParentWithClass(editorDomNode, 'monaco-list-row');
                        if (row) {
                            relativeTop = dom.getTopLeftOffset(editorDomNode).top - dom.getTopLeftOffset(row).top;
                        }
                    }
                    if (input.options?.selection) {
                        const editorSelectionTopOffset = editor.getTopForPosition(input.options.selection.startLineNumber, input.options.selection.startColumn);
                        relativeTop += editorSelectionTopOffset;
                        editor.focus();
                        editor.setSelection({
                            startLineNumber: input.options.selection.startLineNumber,
                            startColumn: input.options.selection.startColumn,
                            endLineNumber: input.options.selection.endLineNumber ?? input.options.selection.startLineNumber,
                            endColumn: input.options.selection.endColumn ?? input.options.selection.startColumn
                        });
                    }
                    this.reveal(item, relativeTop);
                    return editor;
                }
            }
            return null;
        }));
        this._register(this.onDidChangeParsedInput(() => this.updateChatInputContext()));
        this._register(this.chatTodoListService.onDidUpdateTodos((sessionResource) => {
            if (isEqual(this.viewModel?.sessionResource, sessionResource)) {
                this.inputPart.renderChatTodoListWidget(sessionResource);
            }
        }));
    }
    set lastSelectedAgent(agent) {
        this.parsedChatRequest = undefined;
        this._lastSelectedAgent = agent;
        this._updateAgentCapabilitiesContextKeys(agent);
        this._onDidChangeParsedInput.fire();
    }
    get lastSelectedAgent() {
        return this._lastSelectedAgent;
    }
    _updateAgentCapabilitiesContextKeys(agent) {
        // Check if the agent has capabilities defined directly
        const capabilities = agent?.capabilities ?? (this._lockedAgent ? this.chatSessionsService.getCapabilitiesForSessionType(this._lockedAgent.id) : undefined);
        this._attachmentCapabilities = capabilities ?? supportsAllAttachments;
        const supportsAttachments = Object.keys(filter(this._attachmentCapabilities, (key, value) => value === true)).length > 0;
        this._agentSupportsAttachmentsContextKey.set(supportsAttachments);
    }
    get supportsFileReferences() {
        return !!this.viewOptions.supportsFileReferences;
    }
    get attachmentCapabilities() {
        return this._attachmentCapabilities;
    }
    get input() {
        return this.viewModel?.editing && this.configurationService.getValue('chat.editRequests') !== 'input' ? this.inlineInputPart : this.inputPart;
    }
    get inputPart() {
        return this.inputPartDisposable.value;
    }
    get inlineInputPart() {
        return this.inlineInputPartDisposable.value;
    }
    get inputEditor() {
        return this.input.inputEditor;
    }
    get contentHeight() {
        return this.input.contentHeight + this.tree.contentHeight + this.chatSuggestNextWidget.height;
    }
    get attachmentModel() {
        return this.input.attachmentModel;
    }
    render(parent) {
        const viewId = isIChatViewViewContext(this.viewContext) ? this.viewContext.viewId : undefined;
        this.editorOptions = this._register(this.instantiationService.createInstance(ChatEditorOptions, viewId, this.styles.listForeground, this.styles.inputEditorBackground, this.styles.resultEditorBackground));
        const renderInputOnTop = this.viewOptions.renderInputOnTop ?? false;
        const renderFollowups = this.viewOptions.renderFollowups ?? !renderInputOnTop;
        const renderStyle = this.viewOptions.renderStyle;
        const renderInputToolbarBelowInput = this.viewOptions.renderInputToolbarBelowInput ?? false;
        this.container = dom.append(parent, $('.interactive-session'));
        this.welcomeMessageContainer = dom.append(this.container, $('.chat-welcome-view-container', { style: 'display: none' }));
        this._register(dom.addStandardDisposableListener(this.welcomeMessageContainer, dom.EventType.CLICK, () => this.focusInput()));
        this._register(this.chatSuggestNextWidget.onDidChangeHeight(() => {
            if (this.bodyDimension) {
                this.layout(this.bodyDimension.height, this.bodyDimension.width);
            }
        }));
        this._register(this.chatSuggestNextWidget.onDidSelectPrompt(({ handoff, agentId }) => {
            this.handleNextPromptSelection(handoff, agentId);
        }));
        if (renderInputOnTop) {
            this.createInput(this.container, { renderFollowups, renderStyle, renderInputToolbarBelowInput });
            this.listContainer = dom.append(this.container, $(`.interactive-list`));
        }
        else {
            this.listContainer = dom.append(this.container, $(`.interactive-list`));
            dom.append(this.container, this.chatSuggestNextWidget.domNode);
            this.createInput(this.container, { renderFollowups, renderStyle, renderInputToolbarBelowInput });
        }
        this.renderWelcomeViewContentIfNeeded();
        this.createList(this.listContainer, { editable: !isInlineChat(this) && !isQuickChat(this), ...this.viewOptions.rendererOptions, renderStyle });
        const scrollDownButton = this._register(new Button(this.listContainer, {
            supportIcons: true,
            buttonBackground: asCssVariable(buttonSecondaryBackground),
            buttonForeground: asCssVariable(buttonSecondaryForeground),
            buttonHoverBackground: asCssVariable(buttonSecondaryHoverBackground),
        }));
        scrollDownButton.element.classList.add('chat-scroll-down');
        scrollDownButton.label = `$(${Codicon.chevronDown.id})`;
        scrollDownButton.setTitle(localize('scrollDownButtonLabel', "Scroll down"));
        this._register(scrollDownButton.onDidClick(() => {
            this.scrollLock = true;
            this.scrollToEnd();
        }));
        // Update the font family and size
        this._register(autorun(reader => {
            const fontFamily = this.chatLayoutService.fontFamily.read(reader);
            const fontSize = this.chatLayoutService.fontSize.read(reader);
            this.container.style.setProperty('--vscode-chat-font-family', fontFamily);
            this.container.style.fontSize = `${fontSize}px`;
            if (this.visible) {
                this.tree.rerender();
            }
        }));
        this._register(Event.runAndSubscribe(this.editorOptions.onDidChange, () => this.onDidStyleChange()));
        // Do initial render
        if (this.viewModel) {
            this.onDidChangeItems();
            this.scrollToEnd();
        }
        this.contribs = ChatWidget_1.CONTRIBS.map(contrib => {
            try {
                return this._register(this.instantiationService.createInstance(contrib, this));
            }
            catch (err) {
                this.logService.error('Failed to instantiate chat widget contrib', toErrorMessage(err));
                return undefined;
            }
        }).filter(isDefined);
        this._register(this.chatWidgetService.register(this));
        const parsedInput = observableFromEvent(this.onDidChangeParsedInput, () => this.parsedInput);
        this._register(autorun(r => {
            const input = parsedInput.read(r);
            const newPromptAttachments = new Map();
            const oldPromptAttachments = new Set();
            // get all attachments, know those that are prompt-referenced
            for (const attachment of this.attachmentModel.attachments) {
                if (attachment.range) {
                    oldPromptAttachments.add(attachment.id);
                }
            }
            // update/insert prompt-referenced attachments
            for (const part of input.parts) {
                if (part instanceof ChatRequestToolPart || part instanceof ChatRequestToolSetPart || part instanceof ChatRequestDynamicVariablePart) {
                    const entry = part.toVariableEntry();
                    newPromptAttachments.set(entry.id, entry);
                    oldPromptAttachments.delete(entry.id);
                }
            }
            this.attachmentModel.updateContext(oldPromptAttachments, newPromptAttachments.values());
        }));
        if (!this.focusedInputDOM) {
            this.focusedInputDOM = this.container.appendChild(dom.$('.focused-input-dom'));
        }
    }
    scrollToEnd() {
        if (this.lastItem) {
            const offset = Math.max(this.lastItem.currentRenderedHeight ?? 0, 1e6);
            if (this.tree.hasElement(this.lastItem)) {
                this.tree.reveal(this.lastItem, offset);
            }
        }
    }
    focusInput() {
        this.input.focus();
        // Sometimes focusing the input part is not possible,
        // but we'd like to be the last focused chat widget,
        // so we emit an optimistic onDidFocus event nonetheless.
        this._onDidFocus.fire();
    }
    hasInputFocus() {
        return this.input.hasFocus();
    }
    refreshParsedInput() {
        if (!this.viewModel) {
            return;
        }
        this.parsedChatRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(this.viewModel.sessionResource, this.getInput(), this.location, { selectedAgent: this._lastSelectedAgent, mode: this.input.currentModeKind });
        this._onDidChangeParsedInput.fire();
    }
    getSibling(item, type) {
        if (!isResponseVM(item)) {
            return;
        }
        const items = this.viewModel?.getItems();
        if (!items) {
            return;
        }
        const responseItems = items.filter(i => isResponseVM(i));
        const targetIndex = responseItems.indexOf(item);
        if (targetIndex === undefined) {
            return;
        }
        const indexToFocus = type === 'next' ? targetIndex + 1 : targetIndex - 1;
        if (indexToFocus < 0 || indexToFocus > responseItems.length - 1) {
            return;
        }
        return responseItems[indexToFocus];
    }
    async clear() {
        this.logService.debug('ChatWidget#clear');
        if (this._dynamicMessageLayoutData) {
            this._dynamicMessageLayoutData.enabled = true;
        }
        if (this.viewModel?.editing) {
            this.finishedEditing();
        }
        if (this.viewModel) {
            this.viewModel.resetInputPlaceholder();
        }
        if (this._lockedAgent) {
            this.lockToCodingAgent(this._lockedAgent.name, this._lockedAgent.displayName, this._lockedAgent.id);
        }
        else {
            this.unlockFromCodingAgent();
        }
        this.inputPart.clearTodoListWidget(this.viewModel?.sessionResource, true);
        this.chatSuggestNextWidget.hide();
        await this.viewOptions.clear?.();
    }
    onDidChangeItems(skipDynamicLayout) {
        if (this._visible || !this.viewModel) {
            const treeItems = (this.viewModel?.getItems() ?? [])
                .map((item) => {
                return {
                    element: item,
                    collapsed: false,
                    collapsible: false
                };
            });
            if (treeItems.length > 0) {
                this.updateChatViewVisibility();
            }
            else {
                this.renderWelcomeViewContentIfNeeded();
            }
            this._onWillMaybeChangeHeight.fire();
            this.lastItem = treeItems.at(-1)?.element;
            ChatContextKeys.lastItemId.bindTo(this.contextKeyService).set(this.lastItem ? [this.lastItem.id] : []);
            this.tree.setChildren(null, treeItems, {
                diffIdentityProvider: {
                    getId: (element) => {
                        return element.dataId +
                            // Ensure re-rendering an element once slash commands are loaded, so the colorization can be applied.
                            `${(isRequestVM(element)) /* && !!this.lastSlashCommands ? '_scLoaded' : '' */}` +
                            // If a response is in the process of progressive rendering, we need to ensure that it will
                            // be re-rendered so progressive rendering is restarted, even if the model wasn't updated.
                            `${isResponseVM(element) && element.renderData ? `_${this.visibleChangeCount}` : ''}` +
                            // Re-render once content references are loaded
                            (isResponseVM(element) ? `_${element.contentReferences.length}` : '') +
                            // Re-render if element becomes hidden due to undo/redo
                            `_${element.shouldBeRemovedOnSend ? `${element.shouldBeRemovedOnSend.afterUndoStop || '1'}` : '0'}` +
                            // Re-render if element becomes enabled/disabled due to checkpointing
                            `_${element.shouldBeBlocked ? '1' : '0'}` +
                            // Re-render if we have an element currently being edited
                            `_${this.viewModel?.editing ? '1' : '0'}` +
                            // Re-render if we have an element currently being checkpointed
                            `_${this.viewModel?.model.checkpoint ? '1' : '0'}` +
                            // Re-render all if invoked by setting change
                            `_setting${this.settingChangeCounter || '0'}` +
                            // Rerender request if we got new content references in the response
                            // since this may change how we render the corresponding attachments in the request
                            (isRequestVM(element) && element.contentReferences ? `_${element.contentReferences?.length}` : '');
                    },
                }
            });
            if (!skipDynamicLayout && this._dynamicMessageLayoutData) {
                this.layoutDynamicChatTreeItemMode();
            }
            this.renderFollowups();
        }
    }
    /**
     * Updates the DOM visibility of welcome view and chat list immediately
     */
    updateChatViewVisibility() {
        if (!this.viewModel) {
            return;
        }
        const numItems = this.viewModel.getItems().length;
        dom.setVisibility(numItems === 0, this.welcomeMessageContainer);
        dom.setVisibility(numItems !== 0, this.listContainer);
        this._onDidChangeEmptyState.fire();
    }
    isEmpty() {
        return (this.viewModel?.getItems().length ?? 0) === 0;
    }
    /**
     * Renders the welcome view content when needed.
     */
    renderWelcomeViewContentIfNeeded() {
        if (this._isRenderingWelcome) {
            return;
        }
        this._isRenderingWelcome = true;
        try {
            if (this.viewOptions.renderStyle === 'compact' || this.viewOptions.renderStyle === 'minimal' || this.lifecycleService.willShutdown) {
                return;
            }
            const numItems = this.viewModel?.getItems().length ?? 0;
            if (!numItems) {
                const defaultAgent = this.chatAgentService.getDefaultAgent(this.location, this.input.currentModeKind);
                let additionalMessage;
                if (this.chatEntitlementService.anonymous && !this.chatEntitlementService.sentiment.installed) {
                    const providers = product.defaultChatAgent.provider;
                    additionalMessage = new MarkdownString(localize({ key: 'settings', comment: ['{Locked="]({2})"}', '{Locked="]({3})"}'] }, "By continuing with {0} Copilot, you agree to {1}'s [Terms]({2}) and [Privacy Statement]({3}).", providers.default.name, providers.default.name, product.defaultChatAgent.termsStatementUrl, product.defaultChatAgent.privacyStatementUrl), { isTrusted: true });
                }
                else {
                    additionalMessage = defaultAgent?.metadata.additionalWelcomeMessage;
                }
                if (!additionalMessage && !this._lockedAgent) {
                    additionalMessage = this._getGenerateInstructionsMessage();
                }
                const welcomeContent = this.getWelcomeViewContent(additionalMessage);
                if (!this.welcomePart.value || this.welcomePart.value.needsRerender(welcomeContent)) {
                    dom.clearNode(this.welcomeMessageContainer);
                    this.welcomePart.value = this.instantiationService.createInstance(ChatViewWelcomePart, welcomeContent, {
                        location: this.location,
                        isWidgetAgentWelcomeViewContent: this.input?.currentModeKind === ChatModeKind.Agent
                    });
                    dom.append(this.welcomeMessageContainer, this.welcomePart.value.element);
                }
            }
            this.updateChatViewVisibility();
        }
        finally {
            this._isRenderingWelcome = false;
        }
    }
    _getGenerateInstructionsMessage() {
        // Start checking for instruction files immediately if not already done
        if (!this._instructionFilesCheckPromise) {
            this._instructionFilesCheckPromise = this._checkForAgentInstructionFiles();
            // Use VS Code's idiomatic pattern for disposal-safe promise callbacks
            this._register(thenIfNotDisposed(this._instructionFilesCheckPromise, hasFiles => {
                this._instructionFilesExist = hasFiles;
                // Only re-render if the current view still doesn't have items and we're showing the welcome message
                const hasViewModelItems = this.viewModel?.getItems().length ?? 0;
                if (hasViewModelItems === 0) {
                    this.renderWelcomeViewContentIfNeeded();
                }
            }));
        }
        // If we already know the result, use it
        if (this._instructionFilesExist === true) {
            // Don't show generate instructions message if files exist
            return new MarkdownString('');
        }
        else if (this._instructionFilesExist === false) {
            // Show generate instructions message if no files exist
            const generateInstructionsCommand = 'workbench.action.chat.generateInstructions';
            return new MarkdownString(localize('chatWidget.instructions', "[Generate Agent Instructions]({0}) to onboard AI onto your codebase.", `command:${generateInstructionsCommand}`), { isTrusted: { enabledCommands: [generateInstructionsCommand] } });
        }
        // While checking, don't show the generate instructions message
        return new MarkdownString('');
    }
    /**
     * Checks if any agent instruction files (.github/copilot-instructions.md or AGENTS.md) exist in the workspace.
     * Used to determine whether to show the "Generate Agent Instructions" hint.
     *
     * @returns true if instruction files exist OR if instruction features are disabled (to hide the hint)
     */
    async _checkForAgentInstructionFiles() {
        try {
            const useCopilotInstructionsFiles = this.configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
            const useAgentMd = this.configurationService.getValue(PromptsConfig.USE_AGENT_MD);
            if (!useCopilotInstructionsFiles && !useAgentMd) {
                // If both settings are disabled, return true to hide the hint (since the features aren't enabled)
                return true;
            }
            return ((await this.promptsService.listCopilotInstructionsMDs(CancellationToken.None)).length > 0 ||
                // Note: only checking for AGENTS.md files at the root folder, not ones in subfolders.
                (await this.promptsService.listAgentMDs(CancellationToken.None, false)).length > 0);
        }
        catch (error) {
            // On error, assume no instruction files exist to be safe
            this.logService.warn('[ChatWidget] Error checking for instruction files:', error);
            return false;
        }
    }
    getWelcomeViewContent(additionalMessage) {
        if (this.isLockedToCodingAgent) {
            // Check for provider-specific customizations from chat sessions service
            const providerIcon = this._lockedAgent ? this.chatSessionsService.getIconForSessionType(this._lockedAgent.id) : undefined;
            const providerTitle = this._lockedAgent ? this.chatSessionsService.getWelcomeTitleForSessionType(this._lockedAgent.id) : undefined;
            const providerMessage = this._lockedAgent ? this.chatSessionsService.getWelcomeMessageForSessionType(this._lockedAgent.id) : undefined;
            // Fallback to default messages if provider doesn't specify
            const message = providerMessage
                ? new MarkdownString(providerMessage)
                : (this._lockedAgent?.prefix === '@copilot '
                    ? new MarkdownString(localize('copilotCodingAgentMessage', "This chat session will be forwarded to the {0} [coding agent]({1}) where work is completed in the background. ", this._lockedAgent.prefix, 'https://aka.ms/coding-agent-docs') + DISCLAIMER, { isTrusted: true })
                    : new MarkdownString(localize('genericCodingAgentMessage', "This chat session will be forwarded to the {0} coding agent where work is completed in the background. ", this._lockedAgent?.prefix) + DISCLAIMER));
            return {
                title: providerTitle ?? localize('codingAgentTitle', "Delegate to {0}", this._lockedAgent?.prefix),
                message,
                icon: providerIcon ?? Codicon.sendToRemoteAgent,
                additionalMessage,
                useLargeIcon: !!providerIcon,
            };
        }
        let title;
        if (this.input.currentModeKind === ChatModeKind.Ask) {
            title = localize('chatDescription', "Ask about your code");
        }
        else if (this.input.currentModeKind === ChatModeKind.Edit) {
            title = localize('editsTitle', "Edit in context");
        }
        else {
            title = localize('agentTitle', "Build with Agent");
        }
        return {
            title,
            message: new MarkdownString(DISCLAIMER),
            icon: Codicon.chatSparkle,
            additionalMessage,
            suggestedPrompts: this.getPromptFileSuggestions()
        };
    }
    getPromptFileSuggestions() {
        // Use predefined suggestions for new users
        if (!this.chatEntitlementService.sentiment.installed) {
            const isEmpty = this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */;
            if (isEmpty) {
                return [
                    {
                        icon: Codicon.vscode,
                        label: localize('chatWidget.suggestedPrompts.gettingStarted', "Ask @vscode"),
                        prompt: localize('chatWidget.suggestedPrompts.gettingStartedPrompt', "@vscode How do I change the theme to light mode?"),
                    },
                    {
                        icon: Codicon.newFolder,
                        label: localize('chatWidget.suggestedPrompts.newProject', "Create Project"),
                        prompt: localize('chatWidget.suggestedPrompts.newProjectPrompt', "Create a #new Hello World project in TypeScript"),
                    }
                ];
            }
            else {
                return [
                    {
                        icon: Codicon.debugAlt,
                        label: localize('chatWidget.suggestedPrompts.buildWorkspace', "Build Workspace"),
                        prompt: localize('chatWidget.suggestedPrompts.buildWorkspacePrompt', "How do I build this workspace?"),
                    },
                    {
                        icon: Codicon.gear,
                        label: localize('chatWidget.suggestedPrompts.findConfig', "Show Config"),
                        prompt: localize('chatWidget.suggestedPrompts.findConfigPrompt', "Where is the configuration for this project defined?"),
                    }
                ];
            }
        }
        // Get the current workspace folder context if available
        const activeEditor = this.editorService.activeEditor;
        const resource = activeEditor ? EditorResourceAccessor.getOriginalUri(activeEditor) : undefined;
        // Get the prompt file suggestions configuration
        const suggestions = PromptsConfig.getPromptFilesRecommendationsValue(this.configurationService, resource);
        if (!suggestions) {
            return [];
        }
        const result = [];
        const promptsToLoad = [];
        // First, collect all prompts that need loading (regardless of shouldInclude)
        for (const [promptName] of Object.entries(suggestions)) {
            const description = this.promptDescriptionsCache.get(promptName);
            if (description === undefined) {
                promptsToLoad.push(promptName);
            }
        }
        // If we have prompts to load, load them asynchronously and don't return anything yet
        // But only if we're not already loading to prevent infinite loop
        if (promptsToLoad.length > 0 && !this._isLoadingPromptDescriptions) {
            this.loadPromptDescriptions(promptsToLoad);
            return [];
        }
        // Now process the suggestions with loaded descriptions
        const promptsWithScores = [];
        for (const [promptName, condition] of Object.entries(suggestions)) {
            let score = 0;
            // Handle boolean conditions
            if (typeof condition === 'boolean') {
                score = condition ? 1 : 0;
            }
            // Handle when clause conditions
            else if (typeof condition === 'string') {
                try {
                    const whenClause = ContextKeyExpr.deserialize(condition);
                    if (whenClause) {
                        // Test against all open code editors
                        const allEditors = this.codeEditorService.listCodeEditors();
                        if (allEditors.length > 0) {
                            // Count how many editors match the when clause
                            score = allEditors.reduce((count, editor) => {
                                try {
                                    const editorContext = this.contextKeyService.getContext(editor.getDomNode());
                                    return count + (whenClause.evaluate(editorContext) ? 1 : 0);
                                }
                                catch (error) {
                                    // Log error for this specific editor but continue with others
                                    this.logService.warn('Failed to evaluate when clause for editor:', error);
                                    return count;
                                }
                            }, 0);
                        }
                        else {
                            // Fallback to global context if no editors are open
                            score = this.contextKeyService.contextMatchesRules(whenClause) ? 1 : 0;
                        }
                    }
                    else {
                        score = 0;
                    }
                }
                catch (error) {
                    // Log the error but don't fail completely
                    this.logService.warn('Failed to parse when clause for prompt file suggestion:', condition, error);
                    score = 0;
                }
            }
            if (score > 0) {
                promptsWithScores.push({ promptName, condition, score });
            }
        }
        // Sort by score (descending) and take top 5
        promptsWithScores.sort((a, b) => b.score - a.score);
        const topPrompts = promptsWithScores.slice(0, 5);
        // Build the final result array
        for (const { promptName } of topPrompts) {
            const description = this.promptDescriptionsCache.get(promptName);
            const commandLabel = localize('chatWidget.promptFile.commandLabel', "{0}", promptName);
            const uri = this.promptUriCache.get(promptName);
            const descriptionText = description?.trim() ? description : undefined;
            result.push({
                icon: Codicon.run,
                label: commandLabel,
                description: descriptionText,
                prompt: `/${promptName} `,
                uri: uri
            });
        }
        return result;
    }
    async loadPromptDescriptions(promptNames) {
        // Don't start loading if the widget is being disposed
        if (this._store.isDisposed) {
            return;
        }
        // Set loading guard to prevent infinite loop
        this._isLoadingPromptDescriptions = true;
        try {
            // Get all available prompt files with their metadata
            const promptCommands = await this.promptsService.getPromptSlashCommands(CancellationToken.None);
            let cacheUpdated = false;
            // Load descriptions only for the specified prompts
            for (const promptCommand of promptCommands) {
                if (promptNames.includes(promptCommand.name)) {
                    const description = promptCommand.description;
                    if (description) {
                        this.promptDescriptionsCache.set(promptCommand.name, description);
                        cacheUpdated = true;
                    }
                    else {
                        // Set empty string to indicate we've checked this prompt
                        this.promptDescriptionsCache.set(promptCommand.name, '');
                        cacheUpdated = true;
                    }
                }
            }
            // Fire event to trigger a re-render of the welcome view only if cache was updated
            if (cacheUpdated) {
                this.renderWelcomeViewContentIfNeeded();
            }
        }
        catch (error) {
            this.logService.warn('Failed to load specific prompt descriptions:', error);
        }
        finally {
            // Always clear the loading guard, even on error
            this._isLoadingPromptDescriptions = false;
        }
    }
    async renderChatEditingSessionState() {
        if (!this.input) {
            return;
        }
        this.input.renderChatEditingSessionState(this._editingSession.get() ?? null);
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    async renderFollowups() {
        if (this.lastItem && isResponseVM(this.lastItem) && this.lastItem.isComplete) {
            this.input.renderFollowups(this.lastItem.replyFollowups, this.lastItem);
        }
        else {
            this.input.renderFollowups(undefined, undefined);
        }
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    renderChatSuggestNextWidget() {
        if (this.lifecycleService.willShutdown) {
            return;
        }
        // Skip rendering in coding agent sessions
        if (this.isLockedToCodingAgent) {
            this.chatSuggestNextWidget.hide();
            return;
        }
        const items = this.viewModel?.getItems() ?? [];
        if (!items.length) {
            return;
        }
        const lastItem = items[items.length - 1];
        const lastResponseComplete = lastItem && isResponseVM(lastItem) && lastItem.isComplete;
        if (!lastResponseComplete) {
            return;
        }
        // Get the currently selected mode directly from the observable
        // Note: We use currentModeObs instead of currentModeKind because currentModeKind returns
        // the ChatModeKind enum (e.g., 'agent'), which doesn't distinguish between custom modes.
        // Custom modes all have kind='agent' but different IDs.
        const currentMode = this.input.currentModeObs.get();
        const handoffs = currentMode?.handOffs?.get();
        // Only show if: mode has handoffs AND chat has content AND not quick chat
        const shouldShow = currentMode && handoffs && handoffs.length > 0;
        if (shouldShow) {
            // Log telemetry only when widget transitions from hidden to visible
            const wasHidden = this.chatSuggestNextWidget.domNode.style.display === 'none';
            this.chatSuggestNextWidget.render(currentMode);
            if (wasHidden) {
                this.telemetryService.publicLog2('chat.handoffWidgetShown', {
                    agent: currentMode.id,
                    handoffCount: handoffs.length
                });
            }
        }
        else {
            this.chatSuggestNextWidget.hide();
        }
        // Trigger layout update
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    handleNextPromptSelection(handoff, agentId) {
        // Hide the widget after selection
        this.chatSuggestNextWidget.hide();
        const promptToUse = handoff.prompt;
        // Log telemetry
        const currentMode = this.input.currentModeObs.get();
        const fromAgent = currentMode?.id ?? '';
        this.telemetryService.publicLog2('chat.handoffClicked', {
            fromAgent: fromAgent,
            toAgent: agentId || handoff.agent || '',
            hasPrompt: Boolean(promptToUse),
            autoSend: Boolean(handoff.send)
        });
        // If agentId is provided (from chevron dropdown), delegate to that chat session
        // Otherwise, switch to the handoff agent
        if (agentId) {
            // Delegate to chat session (e.g., @background or @cloud)
            this.input.setValue(`@${agentId} ${promptToUse}`, false);
            this.input.focus();
            // Auto-submit for delegated chat sessions
            this.acceptInput().catch(e => this.logService.error('Failed to handle handoff continueOn', e));
        }
        else if (handoff.agent) {
            // Regular handoff to specified agent
            this._switchToAgentByName(handoff.agent);
            // Insert the handoff prompt into the input
            this.input.setValue(promptToUse, false);
            this.input.focus();
            // Auto-submit if send flag is true
            if (handoff.send) {
                this.acceptInput();
            }
        }
    }
    async handleDelegationExitIfNeeded(sourceAgent, targetAgent) {
        if (!this._shouldExitAfterDelegation(sourceAgent, targetAgent)) {
            return;
        }
        try {
            await this._handleDelegationExit();
        }
        catch (e) {
            this.logService.error('Failed to handle delegation exit', e);
        }
    }
    _shouldExitAfterDelegation(sourceAgent, targetAgent) {
        if (!targetAgent) {
            // Undefined behavior
            return false;
        }
        if (!this.configurationService.getValue(ChatConfiguration.ExitAfterDelegation)) {
            return false;
        }
        // Never exit if the source and target are the same (that means that you're providing a follow up, etc.)
        // NOTE: sourceAgent would be the chatWidget's 'lockedAgent'
        if (sourceAgent && sourceAgent.id === targetAgent.id) {
            return false;
        }
        if (!isIChatViewViewContext(this.viewContext)) {
            return false;
        }
        const contribution = this.chatSessionsService.getChatSessionContribution(targetAgent.id);
        if (!contribution) {
            return false;
        }
        if (contribution.canDelegate !== true) {
            return false;
        }
        return true;
    }
    /**
     * Handles the exit of the panel chat when a delegation to another session occurs.
     * Waits for the response to complete and any pending confirmations to be resolved,
     * then clears the widget unless the final message is an error.
     */
    async _handleDelegationExit() {
        const viewModel = this.viewModel;
        if (!viewModel) {
            return;
        }
        const parentSessionResource = viewModel.sessionResource;
        // Check if response is complete, not pending confirmation, and has no error
        const checkIfShouldClear = () => {
            const items = viewModel.getItems();
            const lastItem = items[items.length - 1];
            if (lastItem && isResponseVM(lastItem) && lastItem.model && lastItem.isComplete && !lastItem.model.isPendingConfirmation.get()) {
                const hasError = Boolean(lastItem.result?.errorDetails);
                return !hasError;
            }
            return false;
        };
        if (checkIfShouldClear()) {
            await this.clear();
            this.archiveLocalParentSession(parentSessionResource);
            return;
        }
        const shouldClear = await new Promise(resolve => {
            const disposable = viewModel.onDidChange(() => {
                const result = checkIfShouldClear();
                if (result) {
                    cleanup();
                    resolve(true);
                }
            });
            const timeout = setTimeout(() => {
                cleanup();
                resolve(false);
            }, 30_000); // 30 second timeout
            const cleanup = () => {
                clearTimeout(timeout);
                disposable.dispose();
            };
        });
        if (shouldClear) {
            await this.clear();
            this.archiveLocalParentSession(parentSessionResource);
        }
    }
    async archiveLocalParentSession(sessionResource) {
        if (sessionResource.scheme !== Schemas.vscodeLocalChatSession) {
            return;
        }
        // Implicitly keep parent session's changes as they've now been delegated to the new agent.
        await this.chatService.getSession(sessionResource)?.editingSession?.accept();
        const session = this.agentSessionsService.getSession(sessionResource);
        session?.setArchived(true);
    }
    setVisible(visible) {
        const wasVisible = this._visible;
        this._visible = visible;
        this.visibleChangeCount++;
        this.renderer.setVisible(visible);
        this.input.setVisible(visible);
        if (visible) {
            if (!wasVisible) {
                this.visibilityTimeoutDisposable.value = disposableTimeout(() => {
                    // Progressive rendering paused while hidden, so start it up again.
                    // Do it after a timeout because the container is not visible yet (it should be but offsetHeight returns 0 here)
                    if (this._visible) {
                        this.onDidChangeItems(true);
                    }
                }, 0);
                this.visibilityAnimationFrameDisposable.value = dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                    this._onDidShow.fire();
                });
            }
        }
        else if (wasVisible) {
            this._onDidHide.fire();
        }
    }
    createList(listContainer, options) {
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        const delegate = scopedInstantiationService.createInstance(ChatListDelegate, this.viewOptions.defaultElementHeight ?? 200);
        const rendererDelegate = {
            getListLength: () => this.tree.getNode(null).visibleChildrenCount,
            onDidScroll: this.onDidScroll,
            container: listContainer,
            currentChatMode: () => this.input.currentModeKind,
        };
        // Create a dom element to hold UI from editor widgets embedded in chat messages
        const overflowWidgetsContainer = document.createElement('div');
        overflowWidgetsContainer.classList.add('chat-overflow-widget-container', 'monaco-editor');
        listContainer.append(overflowWidgetsContainer);
        this.renderer = this._register(scopedInstantiationService.createInstance(ChatListItemRenderer, this.editorOptions, options, rendererDelegate, this._codeBlockModelCollection, overflowWidgetsContainer, this.viewModel));
        this._register(this.renderer.onDidClickRequest(async (item) => {
            this.clickedRequest(item);
        }));
        this._register(this.renderer.onDidRerender(item => {
            if (isRequestVM(item.currentElement) && this.configurationService.getValue('chat.editRequests') !== 'input') {
                if (!item.rowContainer.contains(this.inputContainer)) {
                    item.rowContainer.appendChild(this.inputContainer);
                }
                this.input.focus();
            }
        }));
        this._register(this.renderer.onDidDispose((item) => {
            this.focusedInputDOM.appendChild(this.inputContainer);
            this.input.focus();
        }));
        this._register(this.renderer.onDidFocusOutside(() => {
            this.finishedEditing();
        }));
        this._register(this.renderer.onDidClickFollowup(item => {
            // is this used anymore?
            this.acceptInput(item.message);
        }));
        this._register(this.renderer.onDidClickRerunWithAgentOrCommandDetection(e => {
            const request = this.chatService.getSession(e.sessionResource)?.getRequests().find(candidate => candidate.id === e.requestId);
            if (request) {
                const options = {
                    noCommandDetection: true,
                    attempt: request.attempt + 1,
                    location: this.location,
                    userSelectedModelId: this.input.currentLanguageModel,
                    modeInfo: this.input.currentModeInfo,
                };
                this.chatService.resendRequest(request, options).catch(e => this.logService.error('FAILED to rerun request', e));
            }
        }));
        this.tree = this._register(scopedInstantiationService.createInstance((WorkbenchObjectTree), 'Chat', listContainer, delegate, [this.renderer], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            alwaysConsumeMouseWheel: false,
            supportDynamicHeights: true,
            hideTwistiesOfChildlessElements: true,
            accessibilityProvider: this.instantiationService.createInstance(ChatAccessibilityProvider),
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => isRequestVM(e) ? e.message : isResponseVM(e) ? e.response.value : '' }, // TODO
            setRowLineHeight: false,
            filter: this.viewOptions.filter ? { filter: this.viewOptions.filter.bind(this.viewOptions), } : undefined,
            scrollToActiveElement: true,
            overrideStyles: {
                listFocusBackground: this.styles.listBackground,
                listInactiveFocusBackground: this.styles.listBackground,
                listActiveSelectionBackground: this.styles.listBackground,
                listFocusAndSelectionBackground: this.styles.listBackground,
                listInactiveSelectionBackground: this.styles.listBackground,
                listHoverBackground: this.styles.listBackground,
                listBackground: this.styles.listBackground,
                listFocusForeground: this.styles.listForeground,
                listHoverForeground: this.styles.listForeground,
                listInactiveFocusForeground: this.styles.listForeground,
                listInactiveSelectionForeground: this.styles.listForeground,
                listActiveSelectionForeground: this.styles.listForeground,
                listFocusAndSelectionForeground: this.styles.listForeground,
                listActiveSelectionIconForeground: undefined,
                listInactiveSelectionIconForeground: undefined,
            }
        }));
        this._register(this.tree.onDidChangeFocus(() => {
            const focused = this.tree.getFocus();
            if (focused && focused.length > 0) {
                const focusedItem = focused[0];
                const items = this.tree.getNode(null).children;
                const idx = items.findIndex(i => i.element === focusedItem);
                if (idx !== -1) {
                    this._mostRecentlyFocusedItemIndex = idx;
                }
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onDidChangeContentHeight(() => {
            this.onDidChangeTreeContentHeight();
        }));
        this._register(this.renderer.onDidChangeItemHeight(e => {
            if (this.tree.hasElement(e.element) && this.visible) {
                this.tree.updateElementHeight(e.element, e.height);
            }
        }));
        this._register(this.tree.onDidFocus(() => {
            this._onDidFocus.fire();
        }));
        this._register(this.tree.onDidScroll(() => {
            this._onDidScroll.fire();
            const isScrolledDown = this.tree.scrollTop >= this.tree.scrollHeight - this.tree.renderHeight - 2;
            this.container.classList.toggle('show-scroll-down', !isScrolledDown && !this.scrollLock);
        }));
    }
    startEditing(requestId) {
        const editedRequest = this.renderer.getTemplateDataForRequestId(requestId);
        if (editedRequest) {
            this.clickedRequest(editedRequest);
        }
    }
    clickedRequest(item) {
        const currentElement = item.currentElement;
        if (isRequestVM(currentElement) && !this.viewModel?.editing) {
            const requests = this.viewModel?.model.getRequests();
            if (!requests || !this.viewModel?.sessionResource) {
                return;
            }
            // this will only ever be true if we restored a checkpoint
            if (this.viewModel?.model.checkpoint) {
                this.recentlyRestoredCheckpoint = true;
            }
            this.viewModel?.model.setCheckpoint(currentElement.id);
            // set contexts and request to false
            const currentContext = [];
            for (let i = requests.length - 1; i >= 0; i -= 1) {
                const request = requests[i];
                if (request.id === currentElement.id) {
                    request.shouldBeBlocked = false; // unblocking just this request.
                    if (request.attachedContext) {
                        const context = request.attachedContext.filter(entry => !isWorkspaceVariableEntry(entry) && (!(isPromptFileVariableEntry(entry) || isPromptTextVariableEntry(entry)) || !entry.automaticallyAdded));
                        currentContext.push(...context);
                    }
                }
            }
            // set states
            this.viewModel?.setEditing(currentElement);
            if (item?.contextKeyService) {
                ChatContextKeys.currentlyEditing.bindTo(item.contextKeyService).set(true);
            }
            const isInput = this.configurationService.getValue('chat.editRequests') === 'input';
            this.inputPart?.setEditing(!!this.viewModel?.editing && isInput);
            if (!isInput) {
                const rowContainer = item.rowContainer;
                this.inputContainer = dom.$('.chat-edit-input-container');
                rowContainer.appendChild(this.inputContainer);
                this.createInput(this.inputContainer);
                this.input.setChatMode(this.inputPart.currentModeKind);
            }
            else {
                this.inputPart.element.classList.add('editing');
            }
            this.inputPart.toggleChatInputOverlay(!isInput);
            if (currentContext.length > 0) {
                this.input.attachmentModel.addContext(...currentContext);
            }
            // rerenders
            this.inputPart.dnd.setDisabledOverlay(!isInput);
            this.input.renderAttachedContext();
            this.input.setValue(currentElement.messageText, false);
            this.renderer.updateItemHeightOnRender(currentElement, item);
            this.onDidChangeItems();
            this.input.inputEditor.focus();
            this._register(this.inputPart.onDidClickOverlay(() => {
                if (this.viewModel?.editing && this.configurationService.getValue('chat.editRequests') !== 'input') {
                    this.finishedEditing();
                }
            }));
            // listeners
            if (!isInput) {
                this._register(this.inlineInputPart.inputEditor.onDidChangeModelContent(() => {
                    this.scrollToCurrentItem(currentElement);
                }));
                this._register(this.inlineInputPart.inputEditor.onDidChangeCursorSelection((e) => {
                    this.scrollToCurrentItem(currentElement);
                }));
            }
        }
        this.telemetryService.publicLog2('chat.startEditingRequests', {
            editRequestType: this.configurationService.getValue('chat.editRequests'),
        });
    }
    finishedEditing(completedEdit) {
        // reset states
        const editedRequest = this.renderer.getTemplateDataForRequestId(this.viewModel?.editing?.id);
        if (this.recentlyRestoredCheckpoint) {
            this.recentlyRestoredCheckpoint = false;
        }
        else {
            this.viewModel?.model.setCheckpoint(undefined);
        }
        this.inputPart.dnd.setDisabledOverlay(false);
        if (editedRequest?.contextKeyService) {
            ChatContextKeys.currentlyEditing.bindTo(editedRequest.contextKeyService).set(false);
        }
        const isInput = this.configurationService.getValue('chat.editRequests') === 'input';
        if (!isInput) {
            this.inputPart.setChatMode(this.input.currentModeKind);
            const currentModel = this.input.selectedLanguageModel;
            if (currentModel) {
                this.inputPart.switchModel(currentModel.metadata);
            }
            this.inputPart?.toggleChatInputOverlay(false);
            try {
                if (editedRequest?.rowContainer?.contains(this.inputContainer)) {
                    editedRequest.rowContainer.removeChild(this.inputContainer);
                }
                else if (this.inputContainer.parentElement) {
                    this.inputContainer.parentElement.removeChild(this.inputContainer);
                }
            }
            catch (e) {
                this.logService.error('Error occurred while finishing editing:', e);
            }
            this.inputContainer = dom.$('.empty-chat-state');
            // only dispose if we know the input is not the bottom input object.
            this.input.dispose();
        }
        if (isInput) {
            this.inputPart.element.classList.remove('editing');
        }
        this.viewModel?.setEditing(undefined);
        this.inputPart?.setEditing(!!this.viewModel?.editing && isInput);
        this.onDidChangeItems();
        if (editedRequest?.currentElement) {
            this.renderer.updateItemHeightOnRender(editedRequest.currentElement, editedRequest);
        }
        this.telemetryService.publicLog2('chat.editRequestsFinished', {
            editRequestType: this.configurationService.getValue('chat.editRequests'),
            editCanceled: !completedEdit
        });
        this.inputPart.focus();
    }
    scrollToCurrentItem(currentElement) {
        if (this.viewModel?.editing && currentElement) {
            const element = currentElement;
            if (!this.tree.hasElement(element)) {
                return;
            }
            const relativeTop = this.tree.getRelativeTop(element);
            if (relativeTop === null || relativeTop < 0 || relativeTop > 1) {
                this.tree.reveal(element, 0);
            }
        }
    }
    onContextMenu(e) {
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        const selected = e.element;
        // Check if the context menu was opened on a KaTeX element
        const target = e.browserEvent.target;
        const isKatexElement = target.closest(`.${katexContainerClassName}`) !== null;
        const scopedContextKeyService = this.contextKeyService.createOverlay([
            [ChatContextKeys.responseIsFiltered.key, isResponseVM(selected) && !!selected.errorDetails?.responseIsFiltered],
            [ChatContextKeys.isKatexMathElement.key, isKatexElement]
        ]);
        this.contextMenuService.showContextMenu({
            menuId: MenuId.ChatContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => selected,
        });
    }
    onDidChangeTreeContentHeight() {
        // If the list was previously scrolled all the way down, ensure it stays scrolled down, if scroll lock is on
        if (this.tree.scrollHeight !== this.previousTreeScrollHeight) {
            const lastItem = this.viewModel?.getItems().at(-1);
            const lastResponseIsRendering = isResponseVM(lastItem) && lastItem.renderData;
            if (!lastResponseIsRendering || this.scrollLock) {
                // Due to rounding, the scrollTop + renderHeight will not exactly match the scrollHeight.
                // Consider the tree to be scrolled all the way down if it is within 2px of the bottom.
                const lastElementWasVisible = this.tree.scrollTop + this.tree.renderHeight >= this.previousTreeScrollHeight - 2;
                if (lastElementWasVisible) {
                    this.scrollAnimationFrameDisposable.value = dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                        // Can't set scrollTop during this event listener, the list might overwrite the change
                        this.scrollToEnd();
                    }, 0);
                }
            }
        }
        // TODO@roblourens add `show-scroll-down` class when button should show
        // Show the button when content height changes, the list is not fully scrolled down, and (the latest response is currently rendering OR I haven't yet scrolled all the way down since the last response)
        // So for example it would not reappear if I scroll up and delete a message
        this.previousTreeScrollHeight = this.tree.scrollHeight;
        this._onDidChangeContentHeight.fire();
    }
    getWidgetViewKindTag() {
        if (!this.viewContext) {
            return 'editor';
        }
        else if (isIChatViewViewContext(this.viewContext)) {
            return 'view';
        }
        else {
            return 'quick';
        }
    }
    createInput(container, options) {
        const commonConfig = {
            renderFollowups: options?.renderFollowups ?? true,
            renderStyle: options?.renderStyle === 'minimal' ? 'compact' : options?.renderStyle,
            renderInputToolbarBelowInput: options?.renderInputToolbarBelowInput ?? false,
            menus: {
                executeToolbar: MenuId.ChatExecute,
                telemetrySource: 'chatWidget',
                ...this.viewOptions.menus
            },
            editorOverflowWidgetsDomNode: this.viewOptions.editorOverflowWidgetsDomNode,
            enableImplicitContext: this.viewOptions.enableImplicitContext,
            renderWorkingSet: this.viewOptions.enableWorkingSet === 'explicit',
            supportsChangingModes: this.viewOptions.supportsChangingModes,
            dndContainer: this.viewOptions.dndContainer,
            widgetViewKindTag: this.getWidgetViewKindTag(),
            defaultMode: this.viewOptions.defaultMode
        };
        if (this.viewModel?.editing) {
            const editedRequest = this.renderer.getTemplateDataForRequestId(this.viewModel?.editing?.id);
            const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editedRequest?.contextKeyService])));
            this.inlineInputPartDisposable.value = scopedInstantiationService.createInstance(ChatInputPart, this.location, commonConfig, this.styles, true);
        }
        else {
            this.inputPartDisposable.value = this.instantiationService.createInstance(ChatInputPart, this.location, commonConfig, this.styles, false);
        }
        this.input.render(container, '', this);
        this._register(this.input.onDidLoadInputState(() => {
            this.refreshParsedInput();
        }));
        this._register(this.input.onDidFocus(() => this._onDidFocus.fire()));
        this._register(this.input.onDidAcceptFollowup(e => {
            if (!this.viewModel) {
                return;
            }
            let msg = '';
            if (e.followup.agentId && e.followup.agentId !== this.chatAgentService.getDefaultAgent(this.location, this.input.currentModeKind)?.id) {
                const agent = this.chatAgentService.getAgent(e.followup.agentId);
                if (!agent) {
                    return;
                }
                this.lastSelectedAgent = agent;
                msg = `${chatAgentLeader}${agent.name} `;
                if (e.followup.subCommand) {
                    msg += `${chatSubcommandLeader}${e.followup.subCommand} `;
                }
            }
            else if (!e.followup.agentId && e.followup.subCommand && this.chatSlashCommandService.hasCommand(e.followup.subCommand)) {
                msg = `${chatSubcommandLeader}${e.followup.subCommand} `;
            }
            msg += e.followup.message;
            this.acceptInput(msg);
            if (!e.response) {
                // Followups can be shown by the welcome message, then there is no response associated.
                // At some point we probably want telemetry for these too.
                return;
            }
            this.chatService.notifyUserAction({
                sessionResource: this.viewModel.sessionResource,
                requestId: e.response.requestId,
                agentId: e.response.agent?.id,
                command: e.response.slashCommand?.name,
                result: e.response.result,
                action: {
                    kind: 'followUp',
                    followup: e.followup
                },
            });
        }));
        this._register(this.input.onDidChangeHeight(() => {
            const editedRequest = this.renderer.getTemplateDataForRequestId(this.viewModel?.editing?.id);
            if (isRequestVM(editedRequest?.currentElement) && this.viewModel?.editing) {
                this.renderer.updateItemHeightOnRender(editedRequest?.currentElement, editedRequest);
            }
            if (this.bodyDimension) {
                this.layout(this.bodyDimension.height, this.bodyDimension.width);
            }
            this._onDidChangeContentHeight.fire();
        }));
        this._register(this.inputEditor.onDidChangeModelContent(() => {
            this.parsedChatRequest = undefined;
            this.updateChatInputContext();
        }));
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            this.parsedChatRequest = undefined;
            // Tools agent loads -> welcome content changes
            this.renderWelcomeViewContentIfNeeded();
        }));
        this._register(this.input.onDidChangeCurrentChatMode(() => {
            this.renderWelcomeViewContentIfNeeded();
            this.refreshParsedInput();
            this.renderFollowups();
            this.renderChatSuggestNextWidget();
        }));
        this._register(autorun(r => {
            const toolSetIds = new Set();
            const toolIds = new Set();
            for (const [entry, enabled] of this.input.selectedToolsModel.entriesMap.read(r)) {
                if (enabled) {
                    if (entry instanceof ToolSet) {
                        toolSetIds.add(entry.id);
                    }
                    else {
                        toolIds.add(entry.id);
                    }
                }
            }
            const disabledTools = this.input.attachmentModel.attachments
                .filter(a => a.kind === 'tool' && !toolIds.has(a.id) || a.kind === 'toolset' && !toolSetIds.has(a.id))
                .map(a => a.id);
            this.input.attachmentModel.updateContext(disabledTools, Iterable.empty());
            this.refreshParsedInput();
        }));
    }
    onDidStyleChange() {
        this.container.style.setProperty('--vscode-interactive-result-editor-background-color', this.editorOptions.configuration.resultEditor.backgroundColor?.toString() ?? '');
        this.container.style.setProperty('--vscode-interactive-session-foreground', this.editorOptions.configuration.foreground?.toString() ?? '');
        this.container.style.setProperty('--vscode-chat-list-background', this.themeService.getColorTheme().getColor(this.styles.listBackground)?.toString() ?? '');
    }
    setModel(model) {
        if (!this.container) {
            throw new Error('Call render() before setModel()');
        }
        if (!model) {
            this.viewModel = undefined;
            this.onDidChangeItems();
            return;
        }
        if (isEqual(model.sessionResource, this.viewModel?.sessionResource)) {
            return;
        }
        this.inputPart.clearTodoListWidget(model.sessionResource, false);
        this.chatSuggestNextWidget.hide();
        this._codeBlockModelCollection.clear();
        this.container.setAttribute('data-session-id', model.sessionId);
        this.viewModel = this.instantiationService.createInstance(ChatViewModel, model, this._codeBlockModelCollection);
        // Pass input model reference to input part for state syncing
        this.inputPart.setInputModel(model.inputModel, model.getRequests().length === 0);
        if (this._lockedAgent) {
            let placeholder = this.chatSessionsService.getInputPlaceholderForSessionType(this._lockedAgent.id);
            if (!placeholder) {
                placeholder = localize('chat.input.placeholder.lockedToAgent', "Chat with {0}", this._lockedAgent.id);
            }
            this.viewModel.setInputPlaceholder(placeholder);
            this.inputEditor.updateOptions({ placeholder });
        }
        else if (this.viewModel.inputPlaceholder) {
            this.inputEditor.updateOptions({ placeholder: this.viewModel.inputPlaceholder });
        }
        const renderImmediately = this.configurationService.getValue('chat.experimental.renderMarkdownImmediately');
        const delay = renderImmediately ? MicrotaskDelay : 0;
        this.viewModelDisposables.add(Event.runAndSubscribe(Event.accumulate(this.viewModel.onDidChange, delay), (events => {
            if (!this.viewModel || this._store.isDisposed) {
                // See https://github.com/microsoft/vscode/issues/278969
                return;
            }
            this.requestInProgress.set(this.viewModel.model.requestInProgress.get());
            // Update the editor's placeholder text when it changes in the view model
            if (events?.some(e => e?.kind === 'changePlaceholder')) {
                this.inputEditor.updateOptions({ placeholder: this.viewModel.inputPlaceholder });
            }
            this.onDidChangeItems();
            if (events?.some(e => e?.kind === 'addRequest') && this.visible) {
                this.scrollToEnd();
            }
        })));
        this.viewModelDisposables.add(autorun(reader => {
            this._editingSession.read(reader); // re-render when the session changes
            this.renderChatEditingSessionState();
        }));
        this.viewModelDisposables.add(this.viewModel.onDidDisposeModel(() => {
            // Ensure that view state is saved here, because we will load it again when a new model is assigned
            if (this.viewModel?.editing) {
                this.finishedEditing();
            }
            // Disposes the viewmodel and listeners
            this.viewModel = undefined;
            this.onDidChangeItems();
        }));
        this._sessionIsEmptyContextKey.set(model.getRequests().length === 0);
        this.refreshParsedInput();
        this.viewModelDisposables.add(model.onDidChange((e) => {
            if (e.kind === 'setAgent') {
                this._onDidChangeAgent.fire({ agent: e.agent, slashCommand: e.command });
                // Update capabilities context keys when agent changes
                this._updateAgentCapabilitiesContextKeys(e.agent);
            }
            if (e.kind === 'addRequest') {
                this.inputPart.clearTodoListWidget(this.viewModel?.sessionResource, false);
                this._sessionIsEmptyContextKey.set(false);
            }
            // Hide widget on request removal
            if (e.kind === 'removeRequest') {
                this.inputPart.clearTodoListWidget(this.viewModel?.sessionResource, true);
                this.chatSuggestNextWidget.hide();
                this._sessionIsEmptyContextKey.set((this.viewModel?.model.getRequests().length ?? 0) === 0);
            }
            // Show next steps widget when response completes (not when request starts)
            if (e.kind === 'completedRequest') {
                const lastRequest = this.viewModel?.model.getRequests().at(-1);
                const wasCancelled = lastRequest?.response?.isCanceled ?? false;
                if (wasCancelled) {
                    // Clear todo list when request is cancelled
                    this.inputPart.clearTodoListWidget(this.viewModel?.sessionResource, true);
                }
                // Only show if response wasn't canceled
                this.renderChatSuggestNextWidget();
            }
        }));
        if (this.tree && this.visible) {
            this.onDidChangeItems();
            this.scrollToEnd();
        }
        this.renderer.updateViewModel(this.viewModel);
        this.updateChatInputContext();
        this.input.renderChatTodoListWidget(this.viewModel.sessionResource);
    }
    getFocus() {
        return this.tree.getFocus()[0] ?? undefined;
    }
    reveal(item, relativeTop) {
        this.tree.reveal(item, relativeTop);
    }
    focus(item) {
        const items = this.tree.getNode(null).children;
        const node = items.find(i => i.element?.id === item.id);
        if (!node) {
            return;
        }
        this._mostRecentlyFocusedItemIndex = items.indexOf(node);
        this.tree.setFocus([node.element]);
        this.tree.domFocus();
    }
    setInputPlaceholder(placeholder) {
        this.viewModel?.setInputPlaceholder(placeholder);
    }
    resetInputPlaceholder() {
        this.viewModel?.resetInputPlaceholder();
    }
    setInput(value = '') {
        this.input.setValue(value, false);
        this.refreshParsedInput();
    }
    getInput() {
        return this.input.inputEditor.getValue();
    }
    getContrib(id) {
        return this.contribs.find(c => c.id === id);
    }
    // Coding agent locking methods
    lockToCodingAgent(name, displayName, agentId) {
        this._lockedAgent = {
            id: agentId,
            name,
            prefix: `@${name} `,
            displayName
        };
        this._lockedToCodingAgentContextKey.set(true);
        this.renderWelcomeViewContentIfNeeded();
        // Update capabilities for the locked agent
        const agent = this.chatAgentService.getAgent(agentId);
        this._updateAgentCapabilitiesContextKeys(agent);
        this.renderer.updateOptions({ restorable: false, editable: false, noFooter: true, progressMessageAtBottomOfResponse: true });
        if (this.visible) {
            this.tree.rerender();
        }
    }
    unlockFromCodingAgent() {
        // Clear all state related to locking
        this._lockedAgent = undefined;
        this._lockedToCodingAgentContextKey.set(false);
        this._updateAgentCapabilitiesContextKeys(undefined);
        // Explicitly update the DOM to reflect unlocked state
        this.renderWelcomeViewContentIfNeeded();
        // Reset to default placeholder
        if (this.viewModel) {
            this.viewModel.resetInputPlaceholder();
        }
        this.inputEditor.updateOptions({ placeholder: undefined });
        this.renderer.updateOptions({ restorable: true, editable: true, noFooter: false, progressMessageAtBottomOfResponse: mode => mode !== ChatModeKind.Ask });
        if (this.visible) {
            this.tree.rerender();
        }
    }
    get isLockedToCodingAgent() {
        return !!this._lockedAgent;
    }
    get lockedAgentId() {
        return this._lockedAgent?.id;
    }
    logInputHistory() {
        this.input.logInputHistory();
    }
    async acceptInput(query, options) {
        return this._acceptInput(query ? { query } : undefined, options);
    }
    async rerunLastRequest() {
        if (!this.viewModel) {
            return;
        }
        const sessionResource = this.viewModel.sessionResource;
        const lastRequest = this.chatService.getSession(sessionResource)?.getRequests().at(-1);
        if (!lastRequest) {
            return;
        }
        const options = {
            attempt: lastRequest.attempt + 1,
            location: this.location,
            userSelectedModelId: this.input.currentLanguageModel
        };
        return await this.chatService.resendRequest(lastRequest, options);
    }
    async _applyPromptFileIfSet(requestInput) {
        // first check if the input has a prompt slash command
        const agentSlashPromptPart = this.parsedInput.parts.find((r) => r instanceof ChatRequestSlashPromptPart);
        if (!agentSlashPromptPart) {
            return;
        }
        // need to resolve the slash command to get the prompt file
        const slashCommand = await this.promptsService.resolvePromptSlashCommand(agentSlashPromptPart.name, CancellationToken.None);
        if (!slashCommand) {
            return;
        }
        const parseResult = slashCommand.parsedPromptFile;
        // add the prompt file to the context
        const refs = parseResult.body?.variableReferences.map(({ name, offset }) => ({ name, range: new OffsetRange(offset, offset + name.length + 1) })) ?? [];
        const toolReferences = this.toolsService.toToolReferences(refs);
        requestInput.attachedContext.insertFirst(toPromptFileVariableEntry(parseResult.uri, PromptFileVariableKind.PromptFile, undefined, true, toolReferences));
        // remove the slash command from the input
        requestInput.input = this.parsedInput.parts.filter(part => !(part instanceof ChatRequestSlashPromptPart)).map(part => part.text).join('').trim();
        const input = requestInput.input.trim();
        requestInput.input = `Follow instructions in [${basename(parseResult.uri)}](${parseResult.uri.toString()}).`;
        if (input) {
            // if the input is not empty, append it to the prompt
            requestInput.input += `\n${input}`;
        }
        if (parseResult.header) {
            await this._applyPromptMetadata(parseResult.header, requestInput);
        }
    }
    async _acceptInput(query, options) {
        if (this.viewModel?.model.requestInProgress.get()) {
            return;
        }
        if (!query && this.input.generating) {
            // if the user submits the input and generation finishes quickly, just submit it for them
            const generatingAutoSubmitWindow = 500;
            const start = Date.now();
            await this.input.generating;
            if (Date.now() - start > generatingAutoSubmitWindow) {
                return;
            }
        }
        while (!this._viewModel && !this._store.isDisposed) {
            await Event.toPromise(this.onDidChangeViewModel, this._store);
        }
        if (!this.viewModel) {
            return;
        }
        this._onDidAcceptInput.fire();
        this.scrollLock = this.isLockedToCodingAgent || !!checkModeOption(this.input.currentModeKind, this.viewOptions.autoScroll);
        const editorValue = this.getInput();
        const requestInputs = {
            input: !query ? editorValue : query.query,
            attachedContext: options?.enableImplicitContext === false ? this.input.getAttachedContext(this.viewModel.sessionResource) : this.input.getAttachedAndImplicitContext(this.viewModel.sessionResource),
        };
        const isUserQuery = !query;
        if (this.viewModel?.editing) {
            this.finishedEditing(true);
            this.viewModel.model?.setCheckpoint(undefined);
        }
        // process the prompt command
        await this._applyPromptFileIfSet(requestInputs);
        await this._autoAttachInstructions(requestInputs);
        if (this.viewOptions.enableWorkingSet !== undefined && this.input.currentModeKind === ChatModeKind.Edit && !this.chatService.edits2Enabled) {
            const uniqueWorkingSetEntries = new ResourceSet(); // NOTE: this is used for bookkeeping so the UI can avoid rendering references in the UI that are already shown in the working set
            const editingSessionAttachedContext = requestInputs.attachedContext;
            // Collect file variables from previous requests before sending the request
            const previousRequests = this.viewModel.model.getRequests();
            for (const request of previousRequests) {
                for (const variable of request.variableData.variables) {
                    if (URI.isUri(variable.value) && variable.kind === 'file') {
                        const uri = variable.value;
                        if (!uniqueWorkingSetEntries.has(uri)) {
                            editingSessionAttachedContext.add(variable);
                            uniqueWorkingSetEntries.add(variable.value);
                        }
                    }
                }
            }
            requestInputs.attachedContext = editingSessionAttachedContext;
            this.telemetryService.publicLog2('chatEditing/workingSetSize', { originalSize: uniqueWorkingSetEntries.size, actualSize: uniqueWorkingSetEntries.size });
        }
        this.chatService.cancelCurrentRequestForSession(this.viewModel.sessionResource);
        if (this.currentRequest) {
            // We have to wait the current request to be properly cancelled so that it has a chance to update the model with its result metadata.
            // This is awkward, it's basically a limitation of the chat provider-based agent.
            await Promise.race([this.currentRequest, timeout(1000)]);
        }
        this.input.validateAgentMode();
        if (this.viewModel.model.checkpoint) {
            const requests = this.viewModel.model.getRequests();
            for (let i = requests.length - 1; i >= 0; i -= 1) {
                const request = requests[i];
                if (request.shouldBeBlocked) {
                    this.chatService.removeRequest(this.viewModel.sessionResource, request.id);
                }
            }
        }
        if (this.viewModel.sessionResource) {
            this.chatAccessibilityService.acceptRequest(this._viewModel.sessionResource);
        }
        const result = await this.chatService.sendRequest(this.viewModel.sessionResource, requestInputs.input, {
            userSelectedModelId: this.input.currentLanguageModel,
            location: this.location,
            locationData: this._location.resolveData?.(),
            parserContext: { selectedAgent: this._lastSelectedAgent, mode: this.input.currentModeKind },
            attachedContext: requestInputs.attachedContext.asArray(),
            noCommandDetection: options?.noCommandDetection,
            ...this.getModeRequestOptions(),
            modeInfo: this.input.currentModeInfo,
            agentIdSilent: this._lockedAgent?.id,
        });
        if (!result) {
            this.chatAccessibilityService.disposeRequest(this.viewModel.sessionResource);
            return;
        }
        // visibility sync before we accept input to hide the welcome view
        this.updateChatViewVisibility();
        this.input.acceptInput(options?.storeToHistory ?? isUserQuery);
        this._onDidSubmitAgent.fire({ agent: result.agent, slashCommand: result.slashCommand });
        this.handleDelegationExitIfNeeded(this._lockedAgent, result.agent);
        this.currentRequest = result.responseCompletePromise.then(() => {
            const responses = this.viewModel?.getItems().filter(isResponseVM);
            const lastResponse = responses?.[responses.length - 1];
            this.chatAccessibilityService.acceptResponse(this, this.container, lastResponse, this.viewModel?.sessionResource, options?.isVoiceInput);
            if (lastResponse?.result?.nextQuestion) {
                const { prompt, participant, command } = lastResponse.result.nextQuestion;
                const question = formatChatQuestion(this.chatAgentService, this.location, prompt, participant, command);
                if (question) {
                    this.input.setValue(question, false);
                }
            }
            this.currentRequest = undefined;
        });
        return result.responseCreatedPromise;
    }
    getModeRequestOptions() {
        return {
            modeInfo: this.input.currentModeInfo,
            userSelectedTools: this.input.selectedToolsModel.userSelectedTools,
        };
    }
    getCodeBlockInfosForResponse(response) {
        return this.renderer.getCodeBlockInfosForResponse(response);
    }
    getCodeBlockInfoForEditor(uri) {
        return this.renderer.getCodeBlockInfoForEditor(uri);
    }
    getFileTreeInfosForResponse(response) {
        return this.renderer.getFileTreeInfosForResponse(response);
    }
    getLastFocusedFileTreeForResponse(response) {
        return this.renderer.getLastFocusedFileTreeForResponse(response);
    }
    focusResponseItem(lastFocused) {
        if (!this.viewModel) {
            return;
        }
        const items = this.tree.getNode(null).children;
        let item;
        if (lastFocused) {
            item = items[this._mostRecentlyFocusedItemIndex] ?? items[items.length - 1];
        }
        else {
            item = items[items.length - 1];
        }
        if (!item) {
            return;
        }
        this.tree.setFocus([item.element]);
        this.tree.domFocus();
    }
    layout(height, width) {
        width = Math.min(width, this.viewOptions.renderStyle === 'minimal' ? width : 950); // no min width of inline chat
        const heightUpdated = this.bodyDimension && this.bodyDimension.height !== height;
        this.bodyDimension = new dom.Dimension(width, height);
        const layoutHeight = this._dynamicMessageLayoutData?.enabled ? this._dynamicMessageLayoutData.maxHeight : height;
        if (this.viewModel?.editing) {
            this.inlineInputPart?.layout(layoutHeight, width);
        }
        this.inputPart.layout(layoutHeight, width);
        const inputHeight = this.inputPart.inputPartHeight;
        const chatSuggestNextWidgetHeight = this.chatSuggestNextWidget.height;
        const lastElementVisible = this.tree.scrollTop + this.tree.renderHeight >= this.tree.scrollHeight - 2;
        const lastItem = this.viewModel?.getItems().at(-1);
        const contentHeight = Math.max(0, height - inputHeight - chatSuggestNextWidgetHeight);
        if (this.viewOptions.renderStyle === 'compact' || this.viewOptions.renderStyle === 'minimal') {
            this.listContainer.style.removeProperty('--chat-current-response-min-height');
        }
        else {
            this.listContainer.style.setProperty('--chat-current-response-min-height', contentHeight * .75 + 'px');
            if (heightUpdated && lastItem && this.visible && this.tree.hasElement(lastItem)) {
                this.tree.updateElementHeight(lastItem, undefined);
            }
        }
        this.tree.layout(contentHeight, width);
        this.welcomeMessageContainer.style.height = `${contentHeight}px`;
        this.renderer.layout(width);
        const lastResponseIsRendering = isResponseVM(lastItem) && lastItem.renderData;
        if (lastElementVisible && (!lastResponseIsRendering || checkModeOption(this.input.currentModeKind, this.viewOptions.autoScroll))) {
            this.scrollToEnd();
        }
        this.listContainer.style.height = `${contentHeight}px`;
        this._onDidChangeHeight.fire(height);
    }
    // An alternative to layout, this allows you to specify the number of ChatTreeItems
    // you want to show, and the max height of the container. It will then layout the
    // tree to show that many items.
    // TODO@TylerLeonhardt: This could use some refactoring to make it clear which layout strategy is being used
    setDynamicChatTreeItemLayout(numOfChatTreeItems, maxHeight) {
        this._dynamicMessageLayoutData = { numOfMessages: numOfChatTreeItems, maxHeight, enabled: true };
        this._register(this.renderer.onDidChangeItemHeight(() => this.layoutDynamicChatTreeItemMode()));
        const mutableDisposable = this._register(new MutableDisposable());
        this._register(this.tree.onDidScroll((e) => {
            // TODO@TylerLeonhardt this should probably just be disposed when this is disabled
            // and then set up again when it is enabled again
            if (!this._dynamicMessageLayoutData?.enabled) {
                return;
            }
            mutableDisposable.value = dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                if (!e.scrollTopChanged || e.heightChanged || e.scrollHeightChanged) {
                    return;
                }
                const renderHeight = e.height;
                const diff = e.scrollHeight - renderHeight - e.scrollTop;
                if (diff === 0) {
                    return;
                }
                const possibleMaxHeight = (this._dynamicMessageLayoutData?.maxHeight ?? maxHeight);
                const width = this.bodyDimension?.width ?? this.container.offsetWidth;
                this.input.layout(possibleMaxHeight, width);
                const inputPartHeight = this.input.inputPartHeight;
                const chatSuggestNextWidgetHeight = this.chatSuggestNextWidget.height;
                const newHeight = Math.min(renderHeight + diff, possibleMaxHeight - inputPartHeight - chatSuggestNextWidgetHeight);
                this.layout(newHeight + inputPartHeight + chatSuggestNextWidgetHeight, width);
            });
        }));
    }
    updateDynamicChatTreeItemLayout(numOfChatTreeItems, maxHeight) {
        this._dynamicMessageLayoutData = { numOfMessages: numOfChatTreeItems, maxHeight, enabled: true };
        let hasChanged = false;
        let height = this.bodyDimension.height;
        let width = this.bodyDimension.width;
        if (maxHeight < this.bodyDimension.height) {
            height = maxHeight;
            hasChanged = true;
        }
        const containerWidth = this.container.offsetWidth;
        if (this.bodyDimension?.width !== containerWidth) {
            width = containerWidth;
            hasChanged = true;
        }
        if (hasChanged) {
            this.layout(height, width);
        }
    }
    get isDynamicChatTreeItemLayoutEnabled() {
        return this._dynamicMessageLayoutData?.enabled ?? false;
    }
    set isDynamicChatTreeItemLayoutEnabled(value) {
        if (!this._dynamicMessageLayoutData) {
            return;
        }
        this._dynamicMessageLayoutData.enabled = value;
    }
    layoutDynamicChatTreeItemMode() {
        if (!this.viewModel || !this._dynamicMessageLayoutData?.enabled) {
            return;
        }
        const width = this.bodyDimension?.width ?? this.container.offsetWidth;
        this.input.layout(this._dynamicMessageLayoutData.maxHeight, width);
        const inputHeight = this.input.inputPartHeight;
        const chatSuggestNextWidgetHeight = this.chatSuggestNextWidget.height;
        const totalMessages = this.viewModel.getItems();
        // grab the last N messages
        const messages = totalMessages.slice(-this._dynamicMessageLayoutData.numOfMessages);
        const needsRerender = messages.some(m => m.currentRenderedHeight === undefined);
        const listHeight = needsRerender
            ? this._dynamicMessageLayoutData.maxHeight
            : messages.reduce((acc, message) => acc + message.currentRenderedHeight, 0);
        this.layout(Math.min(
        // we add an additional 18px in order to show that there is scrollable content
        inputHeight + chatSuggestNextWidgetHeight + listHeight + (totalMessages.length > 2 ? 18 : 0), this._dynamicMessageLayoutData.maxHeight), width);
        if (needsRerender || !listHeight) {
            this.scrollToEnd();
        }
    }
    saveState() {
        // no-op
    }
    getViewState() {
        return this.input.getCurrentInputState();
    }
    updateChatInputContext() {
        const currentAgent = this.parsedInput.parts.find(part => part instanceof ChatRequestAgentPart);
        this.agentInInput.set(!!currentAgent);
    }
    async _switchToAgentByName(agentName) {
        const currentAgent = this.input.currentModeObs.get();
        // switch to appropriate agent if needed
        if (agentName !== currentAgent.name.get()) {
            // Find the mode object to get its kind
            const agent = this.chatModeService.findModeByName(agentName);
            if (agent) {
                if (currentAgent.kind !== agent.kind) {
                    const chatModeCheck = await this.instantiationService.invokeFunction(handleModeSwitch, currentAgent.kind, agent.kind, this.viewModel?.model.getRequests().length ?? 0, this.viewModel?.model);
                    if (!chatModeCheck) {
                        return;
                    }
                    if (chatModeCheck.needToClearSession) {
                        await this.clear();
                    }
                }
                this.input.setChatMode(agent.id);
            }
        }
    }
    async _applyPromptMetadata({ agent, tools, model }, requestInput) {
        if (tools !== undefined && !agent && this.input.currentModeKind !== ChatModeKind.Agent) {
            agent = ChatMode.Agent.name.get();
        }
        // switch to appropriate agent if needed
        if (agent) {
            this._switchToAgentByName(agent);
        }
        // if not tools to enable are present, we are done
        if (tools !== undefined && this.input.currentModeKind === ChatModeKind.Agent) {
            const enablementMap = this.toolsService.toToolAndToolSetEnablementMap(tools, Target.VSCode);
            this.input.selectedToolsModel.set(enablementMap, true);
        }
        if (model !== undefined) {
            this.input.switchModelByQualifiedName(model);
        }
    }
    /**
     * Adds additional instructions to the context
     * - instructions that have a 'applyTo' pattern that matches the current input
     * - instructions referenced in the copilot settings 'copilot-instructions'
     * - instructions referenced in an already included instruction file
     */
    async _autoAttachInstructions({ attachedContext }) {
        this.logService.debug(`ChatWidget#_autoAttachInstructions: prompt files are always enabled`);
        const enabledTools = this.input.currentModeKind === ChatModeKind.Agent ? this.input.selectedToolsModel.entriesMap.get() : undefined;
        const computer = this.instantiationService.createInstance(ComputeAutomaticInstructions, enabledTools);
        await computer.collect(attachedContext, CancellationToken.None);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this.tree.delegateScrollFromMouseWheelEvent(browserEvent);
    }
};
ChatWidget = ChatWidget_1 = __decorate([
    __param(4, ICodeEditorService),
    __param(5, IEditorService),
    __param(6, IConfigurationService),
    __param(7, IContextKeyService),
    __param(8, IInstantiationService),
    __param(9, IChatService),
    __param(10, IChatAgentService),
    __param(11, IChatWidgetService),
    __param(12, IContextMenuService),
    __param(13, IChatAccessibilityService),
    __param(14, ILogService),
    __param(15, IThemeService),
    __param(16, IChatSlashCommandService),
    __param(17, IChatEditingService),
    __param(18, ITelemetryService),
    __param(19, IPromptsService),
    __param(20, ILanguageModelToolsService),
    __param(21, IChatModeService),
    __param(22, IChatLayoutService),
    __param(23, IChatEntitlementService),
    __param(24, IChatSessionsService),
    __param(25, IAgentSessionsService),
    __param(26, IChatTodoListService),
    __param(27, IWorkspaceContextService),
    __param(28, ILifecycleService)
], ChatWidget);
export { ChatWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxrQkFBa0IsQ0FBQztBQUMxQixPQUFPLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFP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
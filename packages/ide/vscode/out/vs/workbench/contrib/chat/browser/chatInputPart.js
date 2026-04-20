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
var ChatInputPart_1;
import * as dom from '../../../../base/browser/dom.js';
import { addDisposableListener } from '../../../../base/browser/dom.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { hasModifierKeys } from '../../../../base/browser/keyboardEvent.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Button, ButtonWithIcon } from '../../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { DeferredPromise, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun, derived, derivedOpts, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorOptions } from '../../../../editor/common/config/editorOptions.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchButtonBar } from '../../../../platform/actions/browser/buttonbar.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions, setupSimpleEditorSelectionStyling } from '../../codeEditor/browser/simpleEditorOptions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatMode, IChatModeService } from '../common/chatModes.js';
import { IChatService } from '../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../common/chatSessionsService.js';
import { getChatSessionType } from '../common/chatUri.js';
import { ChatRequestVariableSet, isElementVariableEntry, isImageVariableEntry, isNotebookOutputVariableEntry, isPasteVariableEntry, isPromptFileVariableEntry, isPromptTextVariableEntry, isSCMHistoryItemChangeRangeVariableEntry, isSCMHistoryItemChangeVariableEntry, isSCMHistoryItemVariableEntry, isStringVariableEntry } from '../common/chatVariableEntries.js';
import { ChatHistoryNavigator } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind, validateChatMode } from '../common/constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { ChatContinueInSessionActionItem, ContinueChatInSessionAction } from './actions/chatContinueInAction.js';
import { ChatOpenModelPickerActionId, ChatSessionPrimaryPickerAction, ChatSubmitAction, OpenModePickerAction } from './actions/chatExecuteActions.js';
import { IAgentSessionsService } from './agentSessions/agentSessionsService.js';
import { ImplicitContextAttachmentWidget } from './attachments/implicitContextAttachment.js';
import { ChatAttachmentModel } from './chatAttachmentModel.js';
import { DefaultChatAttachmentWidget, ElementChatAttachmentWidget, FileAttachmentWidget, ImageAttachmentWidget, NotebookCellOutputChatAttachmentWidget, PasteAttachmentWidget, PromptFileAttachmentWidget, PromptTextAttachmentWidget, SCMHistoryItemAttachmentWidget, SCMHistoryItemChangeAttachmentWidget, SCMHistoryItemChangeRangeAttachmentWidget, TerminalCommandAttachmentWidget, ToolSetOrToolItemAttachmentWidget } from './chatAttachmentWidgets.js';
import { CollapsibleListPool } from './chatContentParts/chatReferencesContentPart.js';
import { ChatTodoListWidget } from './chatContentParts/chatTodoListWidget.js';
import { IChatContextService } from './chatContextService.js';
import { ChatDragAndDrop } from './chatDragAndDrop.js';
import { ChatEditingShowChangesAction, ViewAllSessionChangesAction, ViewPreviousEditsAction } from './chatEditing/chatEditingActions.js';
import { ChatFollowups } from './chatFollowups.js';
import { ChatInputPartWidgetController } from './chatInputPartWidgets.js';
import { ChatSelectedTools } from './chatSelectedTools.js';
import { ChatSessionPickerActionItem } from './chatSessions/chatSessionPickerActionItem.js';
import { ChatImplicitContext } from './contrib/chatImplicitContext.js';
import { ChatRelatedFiles } from './contrib/chatInputRelatedFilesContrib.js';
import { resizeImage } from './chatImageUtils.js';
import { ModelPickerActionItem } from './modelPicker/modelPickerActionItem.js';
import { ModePickerActionItem } from './modelPicker/modePickerActionItem.js';
const $ = dom.$;
const INPUT_EDITOR_MAX_HEIGHT = 250;
const emptyInputState = observableMemento({
    defaultValue: undefined,
    key: 'chat.untitledInputState',
    toStorage: JSON.stringify,
    fromStorage: JSON.parse,
});
let ChatInputPart = class ChatInputPart extends Disposable {
    static { ChatInputPart_1 = this; }
    static { this._counter = 0; }
    get attachmentModel() {
        return this._attachmentModel;
    }
    getAttachedContext(sessionResource) {
        const contextArr = new ChatRequestVariableSet();
        contextArr.add(...this.attachmentModel.attachments, ...this.chatContextService.getWorkspaceContextItems());
        return contextArr;
    }
    getAttachedAndImplicitContext(sessionResource) {
        const contextArr = this.getAttachedContext(sessionResource);
        if ((this.implicitContext?.enabled && this.implicitContext?.value) || (this.implicitContext && !URI.isUri(this.implicitContext.value) && this.configurationService.getValue('chat.implicitContext.suggestedContext'))) {
            const implicitChatVariables = this.implicitContext.toBaseEntries();
            contextArr.add(...implicitChatVariables);
        }
        return contextArr;
    }
    get implicitContext() {
        return this._implicitContext;
    }
    get relatedFiles() {
        return this._relatedFiles;
    }
    get inputPartHeight() {
        return this._inputPartHeight;
    }
    get followupsHeight() {
        return this._followupsHeight;
    }
    get editSessionWidgetHeight() {
        return this._editSessionWidgetHeight;
    }
    get todoListWidgetHeight() {
        return this.chatInputTodoListWidgetContainer.offsetHeight;
    }
    get inputWidgetsHeight() {
        return this.chatInputWidgetsContainer?.offsetHeight ?? 0;
    }
    get attachmentsHeight() {
        return this.attachmentsContainer.offsetHeight + (this.attachmentsContainer.checkVisibility() ? 6 : 0);
    }
    get inputEditor() {
        return this._inputEditor;
    }
    get currentLanguageModel() {
        return this._currentLanguageModel?.identifier;
    }
    get selectedLanguageModel() {
        return this._currentLanguageModel;
    }
    get currentModeKind() {
        const mode = this._currentModeObservable.get();
        return mode.kind === ChatModeKind.Agent && !this.agentService.hasToolsAgent ?
            ChatModeKind.Edit :
            mode.kind;
    }
    get currentModeObs() {
        return this._currentModeObservable;
    }
    get currentModeInfo() {
        const mode = this._currentModeObservable.get();
        const modeId = mode.isBuiltin ? this.currentModeKind : 'custom';
        const modeInstructions = mode.modeInstructions?.get();
        return {
            kind: this.currentModeKind,
            isBuiltin: mode.isBuiltin,
            modeInstructions: modeInstructions ? {
                name: mode.name.get(),
                content: modeInstructions.content,
                toolReferences: this.toolService.toToolReferences(modeInstructions.toolReferences),
                metadata: modeInstructions.metadata,
            } : undefined,
            modeId: modeId,
            applyCodeBlockSuggestionId: undefined,
        };
    }
    get selectedElements() {
        const edits = [];
        const editsList = this._chatEditList?.object;
        const selectedElements = editsList?.getSelectedElements() ?? [];
        for (const element of selectedElements) {
            if (element.kind === 'reference' && URI.isUri(element.reference)) {
                edits.push(element.reference);
            }
        }
        return edits;
    }
    /**
     * The number of working set entries that the user actually wanted to attach.
     * This is less than or equal to {@link ChatInputPart.chatEditWorkingSetFiles}.
     */
    get attemptedWorkingSetEntriesCount() {
        return this._attemptedWorkingSetEntriesCount;
    }
    constructor(
    // private readonly editorOptions: ChatEditorOptions, // TODO this should be used
    location, options, styles, inline, modelService, instantiationService, contextKeyService, configurationService, keybindingService, accessibilityService, languageModelsService, logService, fileService, editorService, themeService, textModelResolverService, storageService, labelService, agentService, sharedWebExtracterService, experimentService, entitlementService, chatModeService, toolService, chatService, chatSessionsService, chatContextService, agentSessionsService) {
        super();
        this.location = location;
        this.options = options;
        this.inline = inline;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.fileService = fileService;
        this.editorService = editorService;
        this.themeService = themeService;
        this.textModelResolverService = textModelResolverService;
        this.storageService = storageService;
        this.labelService = labelService;
        this.agentService = agentService;
        this.sharedWebExtracterService = sharedWebExtracterService;
        this.experimentService = experimentService;
        this.entitlementService = entitlementService;
        this.chatModeService = chatModeService;
        this.toolService = toolService;
        this.chatService = chatService;
        this.chatSessionsService = chatSessionsService;
        this.chatContextService = chatContextService;
        this.agentSessionsService = agentSessionsService;
        this._workingSetCollapsed = observableValue('chatInputPart.workingSetCollapsed', true);
        this._chatInputTodoListWidget = this._register(new MutableDisposable());
        this._chatEditingTodosDisposables = this._register(new DisposableStore());
        this._onDidLoadInputState = this._register(new Emitter());
        this.onDidLoadInputState = this._onDidLoadInputState.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeContext = this._register(new Emitter());
        this.onDidChangeContext = this._onDidChangeContext.event;
        this._onDidAcceptFollowup = this._register(new Emitter());
        this.onDidAcceptFollowup = this._onDidAcceptFollowup.event;
        this._onDidClickOverlay = this._register(new Emitter());
        this.onDidClickOverlay = this._onDidClickOverlay.event;
        this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        this._indexOfLastOpenedContext = -1;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.inputEditorHeight = 0;
        this.followupsDisposables = this._register(new DisposableStore());
        this.overlayClickListener = this._register(new MutableDisposable());
        this.attachedContextDisposables = this._register(new MutableDisposable());
        this._widgetController = this._register(new MutableDisposable());
        this._inputPartHeight = 0;
        this._followupsHeight = 0;
        this._editSessionWidgetHeight = 0;
        // Disposables for model observation
        this._modelSyncDisposables = this._register(new DisposableStore());
        // Flag to prevent circular updates between view and model
        this._isSyncingToOrFromInputModel = false;
        this.chatSessionPickerWidgets = new Map();
        this._waitForPersistedLanguageModel = this._register(new MutableDisposable());
        this._onDidChangeCurrentLanguageModel = this._register(new Emitter());
        this._chatSessionOptionEmitters = new Map();
        this._onDidChangeCurrentChatMode = this._register(new Emitter());
        this.onDidChangeCurrentChatMode = this._onDidChangeCurrentChatMode.event;
        this.inputUri = URI.parse(`${Schemas.vscodeChatInput}:input-${ChatInputPart_1._counter++}`);
        this._workingSetLinesAddedSpan = new Lazy(() => dom.$('.working-set-lines-added'));
        this._workingSetLinesRemovedSpan = new Lazy(() => dom.$('.working-set-lines-removed'));
        this._chatEditsActionsDisposables = this._register(new DisposableStore());
        this._chatEditsDisposables = this._register(new DisposableStore());
        this._renderingChatEdits = this._register(new MutableDisposable());
        this._attemptedWorkingSetEntriesCount = 0;
        this._chatSessionIsEmpty = false;
        // Initialize debounced text sync scheduler
        this._syncTextDebounced = this._register(new RunOnceScheduler(() => this._syncInputStateToModel(), 150));
        this._emptyInputState = this._register(emptyInputState(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */, this.storageService));
        this._contextResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event }));
        this._currentModeObservable = observableValue('currentMode', this.options.defaultMode ?? ChatMode.Agent);
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this._indexOfLastOpenedContext = -1;
            this.refreshChatSessionPickers();
        }));
        // React to chat session option changes for the active session
        this._register(this.chatSessionsService.onDidChangeSessionOptions(e => {
            const sessionResource = this._widget?.viewModel?.model.sessionResource;
            if (sessionResource && isEqual(sessionResource, e)) {
                // Options changed for our current session - refresh pickers
                this.refreshChatSessionPickers();
            }
        }));
        this._register(this.chatSessionsService.onDidChangeOptionGroups(chatSessionType => {
            const sessionResource = this._widget?.viewModel?.model.sessionResource;
            if (sessionResource) {
                const ctx = this.chatService.getChatSessionFromInternalUri(sessionResource);
                if (ctx?.chatSessionType === chatSessionType) {
                    this.refreshChatSessionPickers();
                }
            }
        }));
        this._attachmentModel = this._register(this.instantiationService.createInstance(ChatAttachmentModel));
        this._register(this._attachmentModel.onDidChange(() => this._syncInputStateToModel()));
        this.selectedToolsModel = this._register(this.instantiationService.createInstance(ChatSelectedTools, this.currentModeObs));
        this.dnd = this._register(this.instantiationService.createInstance(ChatDragAndDrop, () => this._widget, this._attachmentModel, styles));
        this.inputEditorMaxHeight = this.options.renderStyle === 'compact' ? INPUT_EDITOR_MAX_HEIGHT / 3 : INPUT_EDITOR_MAX_HEIGHT;
        this.inputEditorHasText = ChatContextKeys.inputHasText.bindTo(contextKeyService);
        this.chatCursorAtTop = ChatContextKeys.inputCursorAtTop.bindTo(contextKeyService);
        this.inputEditorHasFocus = ChatContextKeys.inputHasFocus.bindTo(contextKeyService);
        this.chatModeKindKey = ChatContextKeys.chatModeKind.bindTo(contextKeyService);
        this.withinEditSessionKey = ChatContextKeys.withinEditSessionDiff.bindTo(contextKeyService);
        this.filePartOfEditSessionKey = ChatContextKeys.filePartOfEditSession.bindTo(contextKeyService);
        this.chatSessionHasOptions = ChatContextKeys.chatSessionHasModels.bindTo(contextKeyService);
        const chatToolCount = ChatContextKeys.chatToolCount.bindTo(contextKeyService);
        this._register(autorun(reader => {
            let count = 0;
            const userSelectedTools = this.selectedToolsModel.userSelectedTools.read(reader);
            for (const key in userSelectedTools) {
                if (userSelectedTools[key] === true) {
                    count++;
                }
            }
            chatToolCount.set(count);
        }));
        this.history = this._register(this.instantiationService.createInstance(ChatHistoryNavigator, this.location));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            const newOptions = {};
            if (e.affectsConfiguration("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                newOptions.ariaLabel = this._getAriaLabel();
            }
            if (e.affectsConfiguration('editor.wordSegmenterLocales')) {
                newOptions.wordSegmenterLocales = this.configurationService.getValue('editor.wordSegmenterLocales');
            }
            if (e.affectsConfiguration('editor.autoClosingBrackets')) {
                newOptions.autoClosingBrackets = this.configurationService.getValue('editor.autoClosingBrackets');
            }
            if (e.affectsConfiguration('editor.autoClosingQuotes')) {
                newOptions.autoClosingQuotes = this.configurationService.getValue('editor.autoClosingQuotes');
            }
            if (e.affectsConfiguration('editor.autoSurround')) {
                newOptions.autoSurround = this.configurationService.getValue('editor.autoSurround');
            }
            this.inputEditor.updateOptions(newOptions);
        }));
        this._chatEditsListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, MenuId.ChatEditingWidgetModifiedFilesToolbar, { verticalScrollMode: 3 /* ScrollbarVisibility.Visible */ }));
        this._hasFileAttachmentContextKey = ChatContextKeys.hasFileAttachments.bindTo(contextKeyService);
        this.initSelectedModel();
        this._register(this.languageModelsService.onDidChangeLanguageModels((vendor) => {
            // Remove vendor from cache since the models changed and what is stored is no longer valid
            // TODO @lramos15 - The cache should be less confusing since we have the LM Service cache + the view cache interacting weirdly
            this.storageService.store('chat.cachedLanguageModels', this.storageService.getObject('chat.cachedLanguageModels', -1 /* StorageScope.APPLICATION */, []).filter(m => !m.identifier.startsWith(vendor)), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // We've changed models and the current one is no longer available. Select a new one
            const selectedModel = this._currentLanguageModel ? this.getModels().find(m => m.identifier === this._currentLanguageModel?.identifier) : undefined;
            const selectedModelNotAvailable = this._currentLanguageModel && (!selectedModel?.metadata.isUserSelectable);
            if (!this.currentLanguageModel || selectedModelNotAvailable) {
                this.setCurrentLanguageModelToDefault();
            }
        }));
        this._register(this.onDidChangeCurrentChatMode(() => {
            this.accessibilityService.alert(this._currentModeObservable.get().label.get());
            if (this._inputEditor) {
                this._inputEditor.updateOptions({ ariaLabel: this._getAriaLabel() });
            }
            this.setImplicitContextEnablement();
        }));
        this._register(this._onDidChangeCurrentLanguageModel.event(() => {
            if (this._currentLanguageModel?.metadata.name) {
                this.accessibilityService.alert(this._currentLanguageModel.metadata.name);
            }
            this._inputEditor?.updateOptions({ ariaLabel: this._getAriaLabel() });
        }));
        this._register(this.chatModeService.onDidChangeChatModes(() => this.validateCurrentChatMode()));
        this._register(autorun(r => {
            const mode = this._currentModeObservable.read(r);
            this.chatModeKindKey.set(mode.kind);
            const model = mode.model?.read(r);
            if (model) {
                this.switchModelByQualifiedName(model);
            }
        }));
        // Validate the initial mode - if Agent mode is set by default but disabled by policy, switch to Ask
        this.validateCurrentChatMode();
    }
    setImplicitContextEnablement() {
        if (this.implicitContext && this.configurationService.getValue('chat.implicitContext.suggestedContext')) {
            this.implicitContext.enabled = this._currentModeObservable.get().kind !== ChatMode.Agent.kind;
        }
    }
    setIsWithinEditSession(inInsideDiff, isFilePartOfEditSession) {
        this.withinEditSessionKey.set(inInsideDiff);
        this.filePartOfEditSessionKey.set(isFilePartOfEditSession);
    }
    getSelectedModelStorageKey() {
        return `chat.currentLanguageModel.${this.location}`;
    }
    getSelectedModelIsDefaultStorageKey() {
        return `chat.currentLanguageModel.${this.location}.isDefault`;
    }
    initSelectedModel() {
        const persistedSelection = this.storageService.get(this.getSelectedModelStorageKey(), -1 /* StorageScope.APPLICATION */);
        const persistedAsDefault = this.storageService.getBoolean(this.getSelectedModelIsDefaultStorageKey(), -1 /* StorageScope.APPLICATION */, persistedSelection === 'copilot/gpt-4.1');
        if (persistedSelection) {
            const model = this.getModels().find(m => m.identifier === persistedSelection);
            if (model) {
                // Only restore the model if it wasn't the default at the time of storing or it is now the default
                if (!persistedAsDefault || model.metadata.isDefault) {
                    this.setCurrentLanguageModel(model);
                    this.checkModelSupported();
                }
            }
            else {
                this._waitForPersistedLanguageModel.value = this.languageModelsService.onDidChangeLanguageModels(e => {
                    const persistedModel = this.languageModelsService.lookupLanguageModel(persistedSelection);
                    if (persistedModel) {
                        this._waitForPersistedLanguageModel.clear();
                        // Only restore the model if it wasn't the default at the time of storing or it is now the default
                        if (!persistedAsDefault || persistedModel.isDefault) {
                            if (persistedModel.isUserSelectable) {
                                this.setCurrentLanguageModel({ metadata: persistedModel, identifier: persistedSelection });
                                this.checkModelSupported();
                            }
                        }
                    }
                    else {
                        this.setCurrentLanguageModelToDefault();
                    }
                });
            }
        }
        this._register(this._onDidChangeCurrentChatMode.event(() => {
            this.checkModelSupported();
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.Edits2Enabled)) {
                this.checkModelSupported();
            }
        }));
    }
    setEditing(enabled) {
        this.currentlyEditingInputKey?.set(enabled);
    }
    switchModel(modelMetadata) {
        const models = this.getModels();
        const model = models.find(m => m.metadata.vendor === modelMetadata.vendor && m.metadata.id === modelMetadata.id && m.metadata.family === modelMetadata.family);
        if (model) {
            this.setCurrentLanguageModel(model);
        }
    }
    switchModelByQualifiedName(qualifiedModelName) {
        const models = this.getModels();
        const model = models.find(m => ILanguageModelChatMetadata.matchesQualifiedName(qualifiedModelName, m.metadata));
        if (model) {
            this.setCurrentLanguageModel(model);
            return true;
        }
        return false;
    }
    switchToNextModel() {
        const models = this.getModels();
        if (models.length > 0) {
            const currentIndex = models.findIndex(model => model.identifier === this._currentLanguageModel?.identifier);
            const nextIndex = (currentIndex + 1) % models.length;
            this.setCurrentLanguageModel(models[nextIndex]);
        }
    }
    openModelPicker() {
        this.modelWidget?.show();
    }
    openModePicker() {
        this.modeWidget?.show();
    }
    openChatSessionPicker() {
        // Open the first available picker widget
        const firstWidget = this.chatSessionPickerWidgets?.values()?.next().value;
        firstWidget?.show();
    }
    /**
     * Create picker widgets for all option groups available for the current session type.
     */
    createChatSessionPickerWidgets(action) {
        this._lastSessionPickerAction = action;
        // Helper to resolve chat session context
        const resolveChatSessionContext = () => {
            const sessionResource = this._widget?.viewModel?.model.sessionResource;
            if (!sessionResource) {
                return undefined;
            }
            return this.chatService.getChatSessionFromInternalUri(sessionResource);
        };
        // Get all option groups for the current session type
        const ctx = resolveChatSessionContext();
        const optionGroups = ctx ? this.chatSessionsService.getOptionGroupsForSessionType(ctx.chatSessionType) : undefined;
        if (!optionGroups || optionGroups.length === 0) {
            return [];
        }
        // Clear existing widgets
        this.disposeSessionPickerWidgets();
        // Create a widget for each option group in effect for this specific session
        const widgets = [];
        for (const optionGroup of optionGroups) {
            if (!ctx) {
                continue;
            }
            if (!this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroup.id)) {
                // This session does not have a value to contribute for this option group
                continue;
            }
            const initialItem = this.getCurrentOptionForGroup(optionGroup.id);
            const initialState = { group: optionGroup, item: initialItem };
            // Create delegate for this option group
            const itemDelegate = {
                getCurrentOption: () => this.getCurrentOptionForGroup(optionGroup.id),
                onDidChangeOption: this.getOrCreateOptionEmitter(optionGroup.id).event,
                setOption: (option) => {
                    const ctx = resolveChatSessionContext();
                    if (!ctx) {
                        return;
                    }
                    this.getOrCreateOptionEmitter(optionGroup.id).fire(option);
                    this.chatSessionsService.notifySessionOptionsChange(ctx.chatSessionResource, [{ optionId: optionGroup.id, value: option }]).catch(err => this.logService.error(`Failed to notify extension of ${optionGroup.id} change:`, err));
                },
                getAllOptions: () => {
                    const ctx = resolveChatSessionContext();
                    if (!ctx) {
                        return [];
                    }
                    const groups = this.chatSessionsService.getOptionGroupsForSessionType(ctx.chatSessionType);
                    const group = groups?.find(g => g.id === optionGroup.id);
                    return group?.items ?? [];
                }
            };
            const widget = this.instantiationService.createInstance(ChatSessionPickerActionItem, action, initialState, itemDelegate);
            this.chatSessionPickerWidgets.set(optionGroup.id, widget);
            widgets.push(widget);
        }
        return widgets;
    }
    /**
     * Set the input model reference for syncing input state
     */
    setInputModel(model, chatSessionIsEmpty) {
        this._inputModel = model;
        this._modelSyncDisposables.clear();
        this.selectedToolsModel.resetSessionEnablementState();
        this._chatSessionIsEmpty = chatSessionIsEmpty;
        // TODO@roblourens This is for an experiment which will be obsolete in a month or two and can then be removed.
        if (chatSessionIsEmpty) {
            this._setEmptyModelState();
        }
        // Observe changes from model and sync to view
        this._modelSyncDisposables.add(autorun(reader => {
            let state = model.state.read(reader);
            if (!state && this._chatSessionIsEmpty) {
                state = this._emptyInputState.read(undefined);
            }
            this._syncFromModel(state);
        }));
    }
    _setEmptyModelState() {
        const storageKey = this.getDefaultModeExperimentStorageKey();
        const hasSetDefaultMode = this.storageService.getBoolean(storageKey, 1 /* StorageScope.WORKSPACE */, false);
        if (!hasSetDefaultMode) {
            const isAnonymous = this.entitlementService.anonymous;
            this.experimentService.getTreatment('chat.defaultMode')
                .then((defaultModeTreatment => {
                if (isAnonymous) {
                    // be deterministic for anonymous users
                    // to support agentic flows with default
                    // model.
                    defaultModeTreatment = ChatModeKind.Agent;
                }
                if (typeof defaultModeTreatment === 'string') {
                    this.storageService.store(storageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    const defaultMode = validateChatMode(defaultModeTreatment);
                    if (defaultMode) {
                        this.logService.trace(`Applying default mode from experiment: ${defaultMode}`);
                        this.setChatMode(defaultMode, false);
                        this.checkModelSupported();
                    }
                }
            }));
        }
    }
    /**
     * Sync from model to view (when model state changes)
     */
    _syncFromModel(state) {
        // Prevent circular updates
        if (this._isSyncingToOrFromInputModel) {
            return;
        }
        try {
            this._isSyncingToOrFromInputModel = true;
            // Sync mode
            if (state) {
                const currentMode = this._currentModeObservable.get();
                if (currentMode.id !== state.mode.id) {
                    this.setChatMode(state.mode.id, false);
                }
            }
            // Sync selected model
            if (state?.selectedModel) {
                if (!this._currentLanguageModel || this._currentLanguageModel.identifier !== state.selectedModel.identifier) {
                    this.setCurrentLanguageModel(state.selectedModel);
                }
            }
            // Sync attachments
            const currentAttachments = this._attachmentModel.attachments;
            if (!state) {
                this._attachmentModel.clear();
            }
            else if (!arraysEqual(currentAttachments, state.attachments)) {
                this._attachmentModel.clearAndSetContext(...state.attachments);
            }
            // Sync input text
            if (this._inputEditor) {
                this._inputEditor.setValue(state?.inputText || '');
                if (state?.selections.length) {
                    this._inputEditor.setSelections(state.selections);
                }
            }
            if (state) {
                this._widget?.contribs.forEach(contrib => {
                    contrib.setInputState?.(state.contrib);
                });
            }
        }
        finally {
            this._isSyncingToOrFromInputModel = false;
        }
    }
    /**
     * Sync current input state to the input model
     */
    _syncInputStateToModel() {
        if (this._isSyncingToOrFromInputModel) {
            return;
        }
        this._isSyncingToOrFromInputModel = true;
        const state = this.getCurrentInputState();
        if (this._chatSessionIsEmpty) {
            this._emptyInputState.set(state, undefined);
        }
        this._inputModel?.setState(state);
        this._isSyncingToOrFromInputModel = false;
    }
    setCurrentLanguageModel(model) {
        this._currentLanguageModel = model;
        if (this.cachedDimensions) {
            // For quick chat and editor chat, relayout because the input may need to shrink to accomodate the model name
            this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
        }
        // Store as global user preference (session-specific state is in the model's inputModel)
        this.storageService.store(this.getSelectedModelStorageKey(), model.identifier, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this.storageService.store(this.getSelectedModelIsDefaultStorageKey(), !!model.metadata.isDefault, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeCurrentLanguageModel.fire(model);
        // Sync to model
        this._syncInputStateToModel();
    }
    checkModelSupported() {
        if (this._currentLanguageModel && (!this.modelSupportedForDefaultAgent(this._currentLanguageModel) || !this.modelSupportedForInlineChat(this._currentLanguageModel))) {
            this.setCurrentLanguageModelToDefault();
        }
    }
    /**
     * By ID- prefer this method
     */
    setChatMode(mode, storeSelection = true) {
        if (!this.options.supportsChangingModes) {
            return;
        }
        const mode2 = this.chatModeService.findModeById(mode) ??
            this.chatModeService.findModeById(ChatModeKind.Agent) ??
            ChatMode.Ask;
        this.setChatMode2(mode2, storeSelection);
    }
    setChatMode2(mode, storeSelection = true) {
        if (!this.options.supportsChangingModes) {
            return;
        }
        this._currentModeObservable.set(mode, undefined);
        this._onDidChangeCurrentChatMode.fire();
        // Sync to model (mode is now persisted in the model's input state)
        this._syncInputStateToModel();
    }
    modelSupportedForDefaultAgent(model) {
        // Probably this logic could live in configuration on the agent, or somewhere else, if it gets more complex
        if (this.currentModeKind === ChatModeKind.Agent || (this.currentModeKind === ChatModeKind.Edit && this.configurationService.getValue(ChatConfiguration.Edits2Enabled))) {
            return ILanguageModelChatMetadata.suitableForAgentMode(model.metadata);
        }
        return true;
    }
    modelSupportedForInlineChat(model) {
        if (this.location !== ChatAgentLocation.EditorInline || !this.configurationService.getValue("inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */)) {
            return true;
        }
        return !!model.metadata.capabilities?.toolCalling;
    }
    getModels() {
        const cachedModels = this.storageService.getObject('chat.cachedLanguageModels', -1 /* StorageScope.APPLICATION */, []);
        let models = this.languageModelsService.getLanguageModelIds()
            .map(modelId => ({ identifier: modelId, metadata: this.languageModelsService.lookupLanguageModel(modelId) }));
        if (models.length === 0 || models.some(m => m.metadata.isDefault) === false) {
            models = cachedModels;
        }
        else {
            this.storageService.store('chat.cachedLanguageModels', models, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        models.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
        return models.filter(entry => entry.metadata?.isUserSelectable && this.modelSupportedForDefaultAgent(entry) && this.modelSupportedForInlineChat(entry));
    }
    setCurrentLanguageModelToDefault() {
        const allModels = this.getModels();
        const defaultModel = allModels.find(m => m.metadata.isDefault) || allModels.find(m => m.metadata.isUserSelectable);
        if (defaultModel) {
            this.setCurrentLanguageModel(defaultModel);
        }
    }
    /**
     * Get the current input state for history
     */
    getCurrentInputState() {
        const mode = this._currentModeObservable.get();
        const state = {
            inputText: this._inputEditor?.getValue() ?? '',
            attachments: this._attachmentModel.attachments,
            mode: {
                id: mode.id,
                kind: mode.kind
            },
            selectedModel: this._currentLanguageModel,
            selections: this._inputEditor?.getSelections() || [],
            contrib: {},
        };
        for (const contrib of this._widget?.contribs || Iterable.empty()) {
            contrib.getInputState?.(state.contrib);
        }
        return state;
    }
    _getAriaLabel() {
        const verbose = this.configurationService.getValue("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        let kbLabel;
        if (verbose) {
            kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
        }
        const mode = this._currentModeObservable.get();
        // Include model information if available
        const modelName = this._currentLanguageModel?.metadata.name;
        const modelInfo = modelName ? localize('chatInput.model', ", {0}. ", modelName) : '';
        let modeLabel = '';
        if (!mode.isBuiltin) {
            const mode = this.currentModeObs.get();
            modeLabel = localize('chatInput.mode.custom', "({0}), {1}", mode.label.get(), mode.description.get());
        }
        else {
            switch (this.currentModeKind) {
                case ChatModeKind.Agent:
                    modeLabel = localize('chatInput.mode.agent', "(Agent), edit files in your workspace.");
                    break;
                case ChatModeKind.Edit:
                    modeLabel = localize('chatInput.mode.edit', "(Edit), edit files in your workspace.");
                    break;
                case ChatModeKind.Ask:
                default:
                    modeLabel = localize('chatInput.mode.ask', "(Ask), ask questions or type / for topics.");
                    break;
            }
        }
        if (verbose) {
            return kbLabel
                ? localize('actions.chat.accessibiltyHelp', "Chat Input {0}{1} Press Enter to send out the request. Use {2} for Chat Accessibility Help.", modeLabel, modelInfo, kbLabel)
                : localize('chatInput.accessibilityHelpNoKb', "Chat Input {0}{1} Press Enter to send out the request. Use the Chat Accessibility Help command for more information.", modeLabel, modelInfo);
        }
        else {
            return localize('chatInput.accessibilityHelp', "Chat Input {0}{1}.", modeLabel, modelInfo);
        }
    }
    validateCurrentChatMode() {
        const currentMode = this._currentModeObservable.get();
        const validMode = this.chatModeService.findModeById(currentMode.id);
        const isAgentModeEnabled = this.configurationService.getValue(ChatConfiguration.AgentEnabled);
        if (!validMode) {
            this.setChatMode(isAgentModeEnabled ? ChatModeKind.Agent : ChatModeKind.Ask);
            return;
        }
        if (currentMode.kind === ChatModeKind.Agent && !isAgentModeEnabled) {
            this.setChatMode(ChatModeKind.Ask);
            return;
        }
    }
    getDefaultModeExperimentStorageKey() {
        const tag = this.options.widgetViewKindTag;
        return `chat.${tag}.hasSetDefaultModeByExperiment`;
    }
    logInputHistory() {
        const historyStr = this.history.values.map(entry => JSON.stringify(entry)).join('\n');
        this.logService.info(`[${this.location}] Chat input history:`, historyStr);
    }
    setVisible(visible) {
        this._onDidChangeVisibility.fire(visible);
    }
    /** If consumers are busy generating the chat input, returns the promise resolved when they finish */
    get generating() {
        return this._generating?.defer.p;
    }
    /** Disables the input submissions buttons until the disposable is disposed. */
    startGenerating() {
        this.logService.trace('ChatWidget#startGenerating');
        if (this._generating) {
            this._generating.rc++;
        }
        else {
            this._generating = { rc: 1, defer: new DeferredPromise() };
        }
        return toDisposable(() => {
            this.logService.trace('ChatWidget#doneGenerating');
            if (this._generating && !--this._generating.rc) {
                this._generating.defer.complete();
                this._generating = undefined;
            }
        });
    }
    get element() {
        return this.container;
    }
    async showPreviousValue() {
        if (this.history.isAtStart()) {
            return;
        }
        const state = this.getCurrentInputState();
        if (state.inputText || state.attachments.length) {
            this.history.overlay(state);
        }
        this.navigateHistory(true);
    }
    async showNextValue() {
        if (this.history.isAtEnd()) {
            return;
        }
        const state = this.getCurrentInputState();
        if (state.inputText || state.attachments.length) {
            this.history.overlay(state);
        }
        this.navigateHistory(false);
    }
    async navigateHistory(previous) {
        const historyEntry = previous ?
            this.history.previous() : this.history.next();
        let historyAttachments = historyEntry?.attachments ?? [];
        // Check for images in history to restore the value.
        if (historyAttachments.length > 0) {
            historyAttachments = (await Promise.all(historyAttachments.map(async (attachment) => {
                if (isImageVariableEntry(attachment) && attachment.references?.length && URI.isUri(attachment.references[0].reference)) {
                    const currReference = attachment.references[0].reference;
                    try {
                        const imageBinary = currReference.toString(true).startsWith('http') ? await this.sharedWebExtracterService.readImage(currReference, CancellationToken.None) : (await this.fileService.readFile(currReference)).value;
                        if (!imageBinary) {
                            return undefined;
                        }
                        const newAttachment = { ...attachment };
                        newAttachment.value = (isImageVariableEntry(attachment) && attachment.isPasted) ? imageBinary.buffer : await resizeImage(imageBinary.buffer); // if pasted image, we do not need to resize.
                        return newAttachment;
                    }
                    catch (err) {
                        this.logService.error('Failed to fetch and reference.', err);
                        return undefined;
                    }
                }
                return attachment;
            }))).filter(attachment => attachment !== undefined);
        }
        this._attachmentModel.clearAndSetContext(...historyAttachments);
        const inputText = historyEntry?.inputText ?? '';
        const contribData = historyEntry?.contrib ?? {};
        aria.status(inputText);
        this.setValue(inputText, true);
        this._widget?.contribs.forEach(contrib => {
            contrib.setInputState?.(contribData);
        });
        this._onDidLoadInputState.fire();
        const model = this._inputEditor.getModel();
        if (!model) {
            return;
        }
        if (previous) {
            // When navigating to previous history, always position cursor at the start (line 1, column 1)
            // This ensures that pressing up again will continue to navigate history
            this._inputEditor.setPosition({ lineNumber: 1, column: 1 });
        }
        else {
            this._inputEditor.setPosition(getLastPosition(model));
        }
    }
    setValue(value, transient) {
        this.inputEditor.setValue(value);
        // always leave cursor at the end
        const model = this.inputEditor.getModel();
        if (model) {
            this.inputEditor.setPosition(getLastPosition(model));
        }
    }
    focus() {
        this._inputEditor.focus();
    }
    hasFocus() {
        return this._inputEditor.hasWidgetFocus();
    }
    /**
     * Reset the input and update history.
     * @param userQuery If provided, this will be added to the history. Followups and programmatic queries should not be passed.
     */
    async acceptInput(isUserQuery) {
        if (isUserQuery) {
            const userQuery = this.getCurrentInputState();
            this.history.append(this._getFilteredEntry(userQuery));
        }
        if (this._chatSessionIsEmpty) {
            this._chatSessionIsEmpty = false;
            this._emptyInputState.set(undefined, undefined);
        }
        // Clear attached context, fire event to clear input state, and clear the input editor
        this.attachmentModel.clear();
        this._onDidLoadInputState.fire();
        if (this.accessibilityService.isScreenReaderOptimized() && isMacintosh) {
            this._acceptInputForVoiceover();
        }
        else {
            this._inputEditor.focus();
            this._inputEditor.setValue('');
        }
    }
    validateAgentMode() {
        if (!this.agentService.hasToolsAgent && this._currentModeObservable.get().kind === ChatModeKind.Agent) {
            this.setChatMode(ChatModeKind.Edit);
        }
    }
    // A function that filters out specifically the `value` property of the attachment.
    _getFilteredEntry(inputState) {
        const attachmentsWithoutImageValues = inputState.attachments.map(attachment => {
            if (isImageVariableEntry(attachment) && attachment.references?.length && attachment.value) {
                const newAttachment = { ...attachment };
                newAttachment.value = undefined;
                return newAttachment;
            }
            return attachment;
        });
        return { ...inputState, attachments: attachmentsWithoutImageValues };
    }
    _acceptInputForVoiceover() {
        const domNode = this._inputEditor.getDomNode();
        if (!domNode) {
            return;
        }
        // Remove the input editor from the DOM temporarily to prevent VoiceOver
        // from reading the cleared text (the request) to the user.
        domNode.remove();
        this._inputEditor.setValue('');
        this._inputEditorElement.appendChild(domNode);
        this._inputEditor.focus();
    }
    _handleAttachedContextChange() {
        this._hasFileAttachmentContextKey.set(Boolean(this._attachmentModel.attachments.find(a => a.kind === 'file')));
        this.renderAttachedContext();
    }
    getOrCreateOptionEmitter(optionGroupId) {
        let emitter = this._chatSessionOptionEmitters.get(optionGroupId);
        if (!emitter) {
            emitter = this._register(new Emitter());
            this._chatSessionOptionEmitters.set(optionGroupId, emitter);
        }
        return emitter;
    }
    /**
     * Refresh all registered option groups for the current chat session.
     * Fires events for each option group with their current selection.
     */
    refreshChatSessionPickers() {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        const hideAll = () => {
            this.chatSessionHasOptions.set(false);
            this.hideAllSessionPickerWidgets();
        };
        if (!sessionResource) {
            return hideAll();
        }
        const ctx = this.chatService.getChatSessionFromInternalUri(sessionResource);
        if (!ctx) {
            return hideAll();
        }
        const optionGroups = this.chatSessionsService.getOptionGroupsForSessionType(ctx.chatSessionType);
        if (!optionGroups || optionGroups.length === 0) {
            return hideAll();
        }
        if (!this.chatSessionsService.hasAnySessionOptions(ctx.chatSessionResource)) {
            return hideAll();
        }
        this.chatSessionHasOptions.set(true);
        const currentWidgetGroupIds = new Set(this.chatSessionPickerWidgets.keys());
        const requiredGroupIds = new Set(optionGroups.map(g => g.id));
        const needsRecreation = currentWidgetGroupIds.size !== requiredGroupIds.size ||
            !Array.from(requiredGroupIds).every(id => currentWidgetGroupIds.has(id));
        if (needsRecreation && this._lastSessionPickerAction && this.chatSessionPickerContainer) {
            const widgets = this.createChatSessionPickerWidgets(this._lastSessionPickerAction);
            dom.clearNode(this.chatSessionPickerContainer);
            for (const widget of widgets) {
                const container = dom.$('.action-item.chat-sessionPicker-item');
                widget.render(container);
                this.chatSessionPickerContainer.appendChild(container);
            }
        }
        if (this.chatSessionPickerContainer) {
            this.chatSessionPickerContainer.style.display = '';
        }
        for (const [optionGroupId] of this.chatSessionPickerWidgets.entries()) {
            const currentOption = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroupId);
            if (currentOption) {
                const optionGroup = optionGroups.find(g => g.id === optionGroupId);
                if (optionGroup) {
                    const currentOptionId = typeof currentOption === 'string' ? currentOption : currentOption.id;
                    const item = optionGroup.items.find(m => m.id === currentOptionId);
                    if (item) {
                        // If currentOption is an object (not a string ID), it represents a complete option item and should be used directly.
                        // Otherwise, if it's a string ID, look up the corresponding item and use that.
                        if (typeof currentOption === 'string') {
                            this.getOrCreateOptionEmitter(optionGroupId).fire(item);
                        }
                        else {
                            this.getOrCreateOptionEmitter(optionGroupId).fire(currentOption);
                        }
                    }
                }
            }
        }
    }
    hideAllSessionPickerWidgets() {
        if (this.chatSessionPickerContainer) {
            this.chatSessionPickerContainer.style.display = 'none';
        }
    }
    disposeSessionPickerWidgets() {
        for (const widget of this.chatSessionPickerWidgets.values()) {
            widget.dispose();
        }
        this.chatSessionPickerWidgets.clear();
    }
    /**
     * Get the current option for a specific option group.
     * If no option is currently set, initializes with the first item as default.
     */
    getCurrentOptionForGroup(optionGroupId) {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        if (!sessionResource) {
            return;
        }
        const ctx = this.chatService.getChatSessionFromInternalUri(sessionResource);
        if (!ctx) {
            return;
        }
        const optionGroups = this.chatSessionsService.getOptionGroupsForSessionType(ctx.chatSessionType);
        const optionGroup = optionGroups?.find(g => g.id === optionGroupId);
        if (!optionGroup || optionGroup.items.length === 0) {
            return;
        }
        const currentOptionValue = this.chatSessionsService.getSessionOption(ctx.chatSessionResource, optionGroupId);
        if (!currentOptionValue) {
            return;
        }
        if (typeof currentOptionValue === 'string') {
            return optionGroup.items.find(m => m.id === currentOptionValue);
        }
        else {
            return currentOptionValue;
        }
    }
    /**
     * Updates the widget controller based on session type.
     */
    tryUpdateWidgetController() {
        const sessionResource = this._widget?.viewModel?.model.sessionResource;
        if (!sessionResource) {
            return;
        }
        const sessionType = getChatSessionType(sessionResource);
        const isLocalSession = sessionType === localChatSessionType;
        if (!isLocalSession) {
            this._widgetController.clear();
            return;
        }
        if (!this._widgetController.value) {
            this._widgetController.value = this.instantiationService.createInstance(ChatInputPartWidgetController, this.chatInputWidgetsContainer);
            this._register(this._widgetController.value.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        }
    }
    render(container, initialValue, widget) {
        this._widget = widget;
        this._register(widget.onDidChangeViewModel(() => {
            this.refreshChatSessionPickers();
            this.tryUpdateWidgetController();
        }));
        let elements;
        if (this.options.renderStyle === 'compact') {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-and-edit-session', [
                    dom.h('.chat-input-widgets-container@chatInputWidgetsContainer'),
                    dom.h('.chat-todo-list-widget-container@chatInputTodoListWidgetContainer'),
                    dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                    dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                        dom.h('.chat-input-container@inputContainer', [
                            dom.h('.chat-editor-container@editorContainer'),
                            dom.h('.chat-input-toolbars@inputToolbars'),
                        ]),
                    ]),
                    dom.h('.chat-attachments-container@attachmentsContainer', [
                        dom.h('.chat-attachment-toolbar@attachmentToolbar'),
                        dom.h('.chat-attached-context@attachedContextContainer'),
                        dom.h('.chat-related-files@relatedFilesContainer'),
                    ]),
                    dom.h('.interactive-input-followups@followupsContainer'),
                ])
            ]);
        }
        else {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-followups@followupsContainer'),
                dom.h('.chat-input-widgets-container@chatInputWidgetsContainer'),
                dom.h('.chat-todo-list-widget-container@chatInputTodoListWidgetContainer'),
                dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                    dom.h('.chat-input-container@inputContainer', [
                        dom.h('.chat-attachments-container@attachmentsContainer', [
                            dom.h('.chat-attachment-toolbar@attachmentToolbar'),
                            dom.h('.chat-related-files@relatedFilesContainer'),
                            dom.h('.chat-attached-context@attachedContextContainer'),
                        ]),
                        dom.h('.chat-editor-container@editorContainer'),
                        dom.h('.chat-input-toolbars@inputToolbars'),
                    ]),
                ]),
            ]);
        }
        this.container = elements.root;
        this.chatInputOverlay = dom.$('.chat-input-overlay');
        container.append(this.container);
        this.container.append(this.chatInputOverlay);
        this.container.classList.toggle('compact', this.options.renderStyle === 'compact');
        this.followupsContainer = elements.followupsContainer;
        const inputAndSideToolbar = elements.inputAndSideToolbar; // The chat input and toolbar to the right
        const inputContainer = elements.inputContainer; // The chat editor, attachments, and toolbars
        const editorContainer = elements.editorContainer;
        this.attachmentsContainer = elements.attachmentsContainer;
        this.attachedContextContainer = elements.attachedContextContainer;
        this.relatedFilesContainer = elements.relatedFilesContainer;
        const toolbarsContainer = elements.inputToolbars;
        const attachmentToolbarContainer = elements.attachmentToolbar;
        this.chatEditingSessionWidgetContainer = elements.chatEditingSessionWidgetContainer;
        this.chatInputTodoListWidgetContainer = elements.chatInputTodoListWidgetContainer;
        this.chatInputWidgetsContainer = elements.chatInputWidgetsContainer;
        if (this.options.enableImplicitContext && !this._implicitContext) {
            this._implicitContext = this._register(this.instantiationService.createInstance(ChatImplicitContext));
            this.setImplicitContextEnablement();
            this._register(this._implicitContext.onDidChangeValue(() => {
                this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
                this._handleAttachedContextChange();
            }));
        }
        else if (!this.options.enableImplicitContext && this._implicitContext) {
            this._implicitContext?.dispose();
            this._implicitContext = undefined;
        }
        this.tryUpdateWidgetController();
        this.renderAttachedContext();
        this._register(this._attachmentModel.onDidChange((e) => {
            if (e.added.length > 0) {
                this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
            }
            this._handleAttachedContextChange();
        }));
        this.renderChatEditingSessionState(null);
        if (this.options.renderWorkingSet) {
            this._relatedFiles = this._register(new ChatRelatedFiles());
            this._register(this._relatedFiles.onDidChange(() => this.renderChatRelatedFiles()));
        }
        this.renderChatRelatedFiles();
        this.dnd.addOverlay(this.options.dndContainer ?? container, this.options.dndContainer ?? container);
        const inputScopedContextKeyService = this._register(this.contextKeyService.createScoped(inputContainer));
        ChatContextKeys.inChatInput.bindTo(inputScopedContextKeyService).set(true);
        this.currentlyEditingInputKey = ChatContextKeys.currentlyEditingInput.bindTo(inputScopedContextKeyService);
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, inputScopedContextKeyService])));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(inputScopedContextKeyService, this));
        this.historyNavigationBackwardsEnablement = historyNavigationBackwardsEnablement;
        this.historyNavigationForewardsEnablement = historyNavigationForwardsEnablement;
        const options = getSimpleEditorOptions(this.configurationService);
        options.overflowWidgetsDomNode = this.options.editorOverflowWidgetsDomNode;
        options.pasteAs = EditorOptions.pasteAs.defaultValue;
        options.readOnly = false;
        options.ariaLabel = this._getAriaLabel();
        options.fontFamily = DEFAULT_FONT_FAMILY;
        options.fontSize = 13;
        options.lineHeight = 20;
        options.padding = this.options.renderStyle === 'compact' ? { top: 2, bottom: 2 } : { top: 8, bottom: 8 };
        options.cursorWidth = 1;
        options.wrappingStrategy = 'advanced';
        options.bracketPairColorization = { enabled: false };
        // Respect user's editor settings for auto-closing and auto-surrounding behavior
        options.autoClosingBrackets = this.configurationService.getValue('editor.autoClosingBrackets');
        options.autoClosingQuotes = this.configurationService.getValue('editor.autoClosingQuotes');
        options.autoSurround = this.configurationService.getValue('editor.autoSurround');
        options.suggest = {
            showIcons: true,
            showSnippets: false,
            showWords: true,
            showStatusBar: false,
            insertMode: 'insert',
        };
        options.scrollbar = { ...(options.scrollbar ?? {}), vertical: 'hidden' };
        options.stickyScroll = { enabled: false };
        this._inputEditorElement = dom.append(editorContainer, $(chatInputEditorContainerSelector));
        const editorOptions = getSimpleCodeEditorWidgetOptions();
        editorOptions.contributions?.push(...EditorExtensionsRegistry.getSomeEditorContributions([ContentHoverController.ID, GlyphHoverController.ID, DropIntoEditorController.ID, CopyPasteController.ID, LinkDetector.ID]));
        this._inputEditor = this._register(scopedInstantiationService.createInstance(CodeEditorWidget, this._inputEditorElement, options, editorOptions));
        SuggestController.get(this._inputEditor)?.forceRenderingAbove();
        options.overflowWidgetsDomNode?.classList.add('hideSuggestTextIcons');
        this._inputEditorElement.classList.add('hideSuggestTextIcons');
        // Prevent Enter key from creating new lines - but respect user's custom keybindings
        // Only prevent default behavior if ChatSubmitAction is bound to Enter AND its precondition is met
        this._register(this._inputEditor.onKeyDown((e) => {
            if (e.keyCode === 3 /* KeyCode.Enter */ && !hasModifierKeys(e)) {
                // Check if ChatSubmitAction has a keybinding for plain Enter in the current context
                // This respects user's custom keybindings that disable the submit action
                for (const keybinding of this.keybindingService.lookupKeybindings(ChatSubmitAction.ID)) {
                    const chords = keybinding.getDispatchChords();
                    const isPlainEnter = chords.length === 1 && chords[0] === '[Enter]';
                    if (isPlainEnter) {
                        // Do NOT call stopPropagation() so the keybinding service can still process this event
                        e.preventDefault();
                        break;
                    }
                }
            }
        }));
        this._register(this._inputEditor.onDidScrollChange(e => {
            toolbarsContainer.classList.toggle('scroll-top-decoration', e.scrollTop > 0);
        }));
        this._register(this._inputEditor.onDidChangeModelContent(() => {
            const currentHeight = Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight);
            if (currentHeight !== this.inputEditorHeight) {
                this.inputEditorHeight = currentHeight;
                this._onDidChangeHeight.fire();
            }
            const model = this._inputEditor.getModel();
            const inputHasText = !!model && model.getValue().trim().length > 0;
            this.inputEditorHasText.set(inputHasText);
            // Debounced sync to model for text changes
            this._syncTextDebounced.schedule();
        }));
        this._register(this._inputEditor.onDidContentSizeChange(e => {
            if (e.contentHeightChanged) {
                this.inputEditorHeight = !this.inline ? e.contentHeight : this.inputEditorHeight;
                this._onDidChangeHeight.fire();
            }
        }));
        this._register(this._inputEditor.onDidFocusEditorText(() => {
            this.inputEditorHasFocus.set(true);
            this._onDidFocus.fire();
            inputContainer.classList.toggle('focused', true);
        }));
        this._register(this._inputEditor.onDidBlurEditorText(() => {
            this.inputEditorHasFocus.set(false);
            inputContainer.classList.toggle('focused', false);
            this._onDidBlur.fire();
        }));
        this._register(this._inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this._inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this._inputEditor)?.clearWidgets();
        }));
        const hoverDelegate = this._register(createInstantHoverDelegate());
        this._register(dom.addStandardDisposableListener(toolbarsContainer, dom.EventType.CLICK, e => this.inputEditor.focus()));
        this._register(dom.addStandardDisposableListener(this.attachmentsContainer, dom.EventType.CLICK, e => this.inputEditor.focus()));
        this.inputActionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, this.options.renderInputToolbarBelowInput ? this.attachmentsContainer : toolbarsContainer, MenuId.ChatInput, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: { shouldForwardArgs: true },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            hoverDelegate,
            actionViewItemProvider: (action, options) => {
                if (action.id === ChatOpenModelPickerActionId && action instanceof MenuItemAction) {
                    if (!this._currentLanguageModel) {
                        this.setCurrentLanguageModelToDefault();
                    }
                    const itemDelegate = {
                        getCurrentModel: () => this._currentLanguageModel,
                        onDidChangeModel: this._onDidChangeCurrentLanguageModel.event,
                        setModel: (model) => {
                            this._waitForPersistedLanguageModel.clear();
                            this.setCurrentLanguageModel(model);
                            this.renderAttachedContext();
                        },
                        getModels: () => this.getModels()
                    };
                    return this.modelWidget = this.instantiationService.createInstance(ModelPickerActionItem, action, this._currentLanguageModel, undefined, itemDelegate);
                }
                else if (action.id === OpenModePickerAction.ID && action instanceof MenuItemAction) {
                    const delegate = {
                        currentMode: this._currentModeObservable,
                        sessionResource: () => this._widget?.viewModel?.sessionResource,
                    };
                    return this.modeWidget = this.instantiationService.createInstance(ModePickerActionItem, action, delegate);
                }
                else if (action.id === ChatSessionPrimaryPickerAction.ID && action instanceof MenuItemAction) {
                    // Create all pickers and return a container action view item
                    const widgets = this.createChatSessionPickerWidgets(action);
                    if (widgets.length === 0) {
                        return undefined;
                    }
                    // Create a container to hold all picker widgets
                    return this.instantiationService.createInstance(ChatSessionPickersContainerActionItem, action, widgets);
                }
                return undefined;
            }
        }));
        this.inputActionsToolbar.getElement().classList.add('chat-input-toolbar');
        this.inputActionsToolbar.context = { widget };
        this._register(this.inputActionsToolbar.onDidChangeMenuItems(() => {
            // Update container reference for the pickers
            const toolbarElement = this.inputActionsToolbar.getElement();
            // eslint-disable-next-line no-restricted-syntax
            const container = toolbarElement.querySelector('.chat-sessionPicker-container');
            this.chatSessionPickerContainer = container;
            if (this.cachedDimensions && typeof this.cachedInputToolbarWidth === 'number' && this.cachedInputToolbarWidth !== this.inputActionsToolbar.getItemsWidth()) {
                this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
            }
        }));
        this.executeToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarsContainer, this.options.menus.executeToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: {
                shouldForwardArgs: true
            },
            hoverDelegate,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            actionViewItemProvider: (action, options) => {
                if (action.id === ContinueChatInSessionAction.ID && action instanceof MenuItemAction) {
                    return this.instantiationService.createInstance(ChatContinueInSessionActionItem, action, "chatWidget" /* ActionLocation.ChatWidget */);
                }
                return undefined;
            }
        }));
        this.executeToolbar.getElement().classList.add('chat-execute-toolbar');
        this.executeToolbar.context = { widget };
        this._register(this.executeToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions && typeof this.cachedExecuteToolbarWidth === 'number' && this.cachedExecuteToolbarWidth !== this.executeToolbar.getItemsWidth()) {
                this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
            }
        }));
        if (this.options.menus.inputSideToolbar) {
            const toolbarSide = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, inputAndSideToolbar, this.options.menus.inputSideToolbar, {
                telemetrySource: this.options.menus.telemetrySource,
                menuOptions: {
                    shouldForwardArgs: true
                },
                hoverDelegate
            }));
            this.inputSideToolbarContainer = toolbarSide.getElement();
            toolbarSide.getElement().classList.add('chat-side-toolbar');
            toolbarSide.context = { widget };
        }
        let inputModel = this.modelService.getModel(this.inputUri);
        if (!inputModel) {
            inputModel = this.modelService.createModel('', null, this.inputUri, true);
        }
        this.textModelResolverService.createModelReference(this.inputUri).then(ref => {
            // make sure to hold a reference so that the model doesn't get disposed by the text model service
            if (this._store.isDisposed) {
                ref.dispose();
                return;
            }
            this._register(ref);
        });
        this.inputModel = inputModel;
        this.inputModel.updateOptions({ bracketColorizationOptions: { enabled: false, independentColorPoolPerBracketType: false } });
        this._inputEditor.setModel(this.inputModel);
        if (initialValue) {
            this.inputModel.setValue(initialValue);
            const lineNumber = this.inputModel.getLineCount();
            this._inputEditor.setPosition({ lineNumber, column: this.inputModel.getLineMaxColumn(lineNumber) });
        }
        const onDidChangeCursorPosition = () => {
            const model = this._inputEditor.getModel();
            if (!model) {
                return;
            }
            const position = this._inputEditor.getPosition();
            if (!position) {
                return;
            }
            const atTop = position.lineNumber === 1 && position.column === 1;
            this.chatCursorAtTop.set(atTop);
            this.historyNavigationBackwardsEnablement.set(atTop);
            this.historyNavigationForewardsEnablement.set(position.equals(getLastPosition(model)));
            // Sync cursor and selection to model
            this._syncInputStateToModel();
        };
        this._register(this._inputEditor.onDidChangeCursorPosition(e => onDidChangeCursorPosition()));
        onDidChangeCursorPosition();
        this._register(this.themeService.onDidFileIconThemeChange(() => {
            this.renderAttachedContext();
        }));
        this.addFilesToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, attachmentToolbarContainer, MenuId.ChatInputAttachmentToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            label: true,
            menuOptions: { shouldForwardArgs: true, renderShortTitle: true },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            hoverDelegate,
            actionViewItemProvider: (action, options) => {
                if (action.id === 'workbench.action.chat.attachContext') {
                    const viewItem = this.instantiationService.createInstance(AddFilesButton, this._attachmentModel, action, options);
                    viewItem.setShowLabel(this._attachmentModel.size === 0 && !this.hasImplicitContextBlock());
                    this.addFilesButton = viewItem;
                    return this.addFilesButton;
                }
                return undefined;
            }
        }));
        this.addFilesToolbar.context = { widget, placeholder: localize('chatAttachFiles', 'Search for files and context to add to your request') };
        this._register(this.addFilesToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions) {
                this._onDidChangeHeight.fire();
            }
        }));
    }
    toggleChatInputOverlay(editing) {
        this.chatInputOverlay.classList.toggle('disabled', editing);
        if (editing) {
            this.overlayClickListener.value = dom.addStandardDisposableListener(this.chatInputOverlay, dom.EventType.CLICK, e => {
                e.preventDefault();
                e.stopPropagation();
                this._onDidClickOverlay.fire();
            });
        }
        else {
            this.overlayClickListener.clear();
        }
    }
    renderAttachedContext() {
        const container = this.attachedContextContainer;
        // Note- can't measure attachedContextContainer, because it has `display: contents`, so measure the parent to check for height changes
        const oldHeight = this.attachmentsContainer.offsetHeight;
        const store = new DisposableStore();
        this.attachedContextDisposables.value = store;
        dom.clearNode(container);
        store.add(dom.addStandardDisposableListener(this.attachmentsContainer, dom.EventType.KEY_DOWN, (e) => {
            this.handleAttachmentNavigation(e);
        }));
        const attachments = [...this.attachmentModel.attachments.entries()];
        const hasAttachments = Boolean(attachments.length) || Boolean(this.implicitContext?.value);
        dom.setVisibility(Boolean(this.options.renderInputToolbarBelowInput || hasAttachments || (this.addFilesToolbar && !this.addFilesToolbar.isEmpty())), this.attachmentsContainer);
        dom.setVisibility(hasAttachments, this.attachedContextContainer);
        if (!attachments.length) {
            this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
            this._indexOfLastOpenedContext = -1;
        }
        const isSuggestedEnabled = this.configurationService.getValue('chat.implicitContext.suggestedContext');
        if (this.implicitContext?.value && !isSuggestedEnabled) {
            const implicitPart = store.add(this.instantiationService.createInstance(ImplicitContextAttachmentWidget, () => this._widget, this.implicitContext, this._contextResourceLabels, this.attachmentModel));
            container.appendChild(implicitPart.domNode);
        }
        for (const [index, attachment] of attachments) {
            const resource = URI.isUri(attachment.value) ? attachment.value : isLocation(attachment.value) ? attachment.value.uri : undefined;
            const range = isLocation(attachment.value) ? attachment.value.range : undefined;
            const shouldFocusClearButton = index === Math.min(this._indexOfLastAttachedContextDeletedWithKeyboard, this.attachmentModel.size - 1) && this._indexOfLastAttachedContextDeletedWithKeyboard > -1;
            let attachmentWidget;
            const options = { shouldFocusClearButton, supportsDeletion: true };
            if (attachment.kind === 'tool' || attachment.kind === 'toolset') {
                attachmentWidget = this.instantiationService.createInstance(ToolSetOrToolItemAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (resource && isNotebookOutputVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(NotebookCellOutputChatAttachmentWidget, resource, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isPromptFileVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PromptFileAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isPromptTextVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PromptTextAttachmentWidget, attachment, undefined, options, container, this._contextResourceLabels);
            }
            else if (resource && (attachment.kind === 'file' || attachment.kind === 'directory')) {
                attachmentWidget = this.instantiationService.createInstance(FileAttachmentWidget, resource, range, attachment, undefined, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (attachment.kind === 'terminalCommand') {
                attachmentWidget = this.instantiationService.createInstance(TerminalCommandAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isImageVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(ImageAttachmentWidget, resource, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isElementVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(ElementChatAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isPasteVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PasteAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isSCMHistoryItemVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(SCMHistoryItemAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isSCMHistoryItemChangeVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(SCMHistoryItemChangeAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else if (isSCMHistoryItemChangeRangeVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(SCMHistoryItemChangeRangeAttachmentWidget, attachment, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            else {
                attachmentWidget = this.instantiationService.createInstance(DefaultChatAttachmentWidget, resource, range, attachment, undefined, this._currentLanguageModel, options, container, this._contextResourceLabels);
            }
            if (shouldFocusClearButton) {
                attachmentWidget.element.focus();
            }
            if (index === Math.min(this._indexOfLastOpenedContext, this.attachmentModel.size - 1)) {
                attachmentWidget.element.focus();
            }
            store.add(attachmentWidget);
            store.add(attachmentWidget.onDidDelete(e => {
                this.handleAttachmentDeletion(e, index, attachment);
            }));
            store.add(attachmentWidget.onDidOpen(e => {
                this.handleAttachmentOpen(index, attachment);
            }));
        }
        const implicitValue = this.implicitContext?.value;
        if (isSuggestedEnabled && implicitValue) {
            const targetUri = this.implicitContext.uri;
            const currentlyAttached = attachments.some(([, attachment]) => {
                let uri;
                if (URI.isUri(attachment.value)) {
                    uri = attachment.value;
                }
                else if (isStringVariableEntry(attachment)) {
                    uri = attachment.uri;
                }
                return uri && isEqual(uri, targetUri);
            });
            const shouldShowImplicit = !isLocation(implicitValue) ? !currentlyAttached : implicitValue.range;
            if (shouldShowImplicit) {
                const implicitPart = store.add(this.instantiationService.createInstance(ImplicitContextAttachmentWidget, () => this._widget, this.implicitContext, this._contextResourceLabels, this._attachmentModel));
                container.appendChild(implicitPart.domNode);
            }
        }
        if (oldHeight !== this.attachmentsContainer.offsetHeight) {
            this._onDidChangeHeight.fire();
        }
        this.addFilesButton?.setShowLabel(this._attachmentModel.size === 0 && !this.hasImplicitContextBlock());
        this._indexOfLastOpenedContext = -1;
    }
    hasImplicitContextBlock() {
        const implicit = this.implicitContext?.value;
        if (!implicit) {
            return false;
        }
        const isSuggestedEnabled = this.configurationService.getValue('chat.implicitContext.suggestedContext');
        if (!isSuggestedEnabled) {
            return true;
        }
        // TODO @justschen: merge this with above showing implicit logic
        const isUri = URI.isUri(implicit);
        if (isUri || isLocation(implicit)) {
            const targetUri = isUri ? implicit : implicit.uri;
            const attachments = [...this._attachmentModel.attachments.entries()];
            const currentlyAttached = attachments.some(([, a]) => URI.isUri(a.value) && isEqual(a.value, targetUri));
            const shouldShowImplicit = isUri ? !currentlyAttached : implicit.range;
            return !!shouldShowImplicit;
        }
        return false;
    }
    handleAttachmentDeletion(e, index, attachment) {
        // Set focus to the next attached context item if deletion was triggered by a keystroke (vs a mouse click)
        if (dom.isKeyboardEvent(e)) {
            this._indexOfLastAttachedContextDeletedWithKeyboard = index;
        }
        this._attachmentModel.delete(attachment.id);
        if (this.configurationService.getValue('chat.implicitContext.enableImplicitContext')) {
            // if currently opened file is deleted, do not show implicit context
            const implicitValue = URI.isUri(this.implicitContext?.value) && URI.isUri(attachment.value) && isEqual(this.implicitContext.value, attachment.value);
            if (this.implicitContext?.isFile && implicitValue) {
                this.implicitContext.enabled = false;
            }
        }
        if (this._attachmentModel.size === 0) {
            this.focus();
        }
        this._onDidChangeContext.fire({ removed: [attachment] });
        this.renderAttachedContext();
    }
    handleAttachmentOpen(index, attachment) {
        this._indexOfLastOpenedContext = index;
        this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        if (this._attachmentModel.size === 0) {
            this.focus();
        }
    }
    handleAttachmentNavigation(e) {
        if (!e.equals(15 /* KeyCode.LeftArrow */) && !e.equals(17 /* KeyCode.RightArrow */)) {
            return;
        }
        // eslint-disable-next-line no-restricted-syntax
        const toolbar = this.addFilesToolbar?.getElement().querySelector('.action-label');
        if (!toolbar) {
            return;
        }
        // eslint-disable-next-line no-restricted-syntax
        const attachments = Array.from(this.attachedContextContainer.querySelectorAll('.chat-attached-context-attachment'));
        if (!attachments.length) {
            return;
        }
        attachments.unshift(toolbar);
        const activeElement = dom.getWindow(this.attachmentsContainer).document.activeElement;
        const currentIndex = attachments.findIndex(attachment => attachment === activeElement);
        let newIndex = currentIndex;
        if (e.equals(15 /* KeyCode.LeftArrow */)) {
            newIndex = currentIndex > 0 ? currentIndex - 1 : attachments.length - 1;
        }
        else if (e.equals(17 /* KeyCode.RightArrow */)) {
            newIndex = currentIndex < attachments.length - 1 ? currentIndex + 1 : 0;
        }
        if (newIndex !== -1) {
            const nextElement = attachments[newIndex];
            nextElement.focus();
            e.preventDefault();
            e.stopPropagation();
        }
    }
    async renderChatTodoListWidget(chatSessionResource) {
        const isTodoWidgetEnabled = this.configurationService.getValue(ChatConfiguration.TodosShowWidget) !== false;
        if (!isTodoWidgetEnabled) {
            return;
        }
        if (!this._chatInputTodoListWidget.value) {
            const widget = this._chatEditingTodosDisposables.add(this.instantiationService.createInstance(ChatTodoListWidget));
            this._chatInputTodoListWidget.value = widget;
            // Add the widget's DOM node to the dedicated todo list container
            dom.clearNode(this.chatInputTodoListWidgetContainer);
            dom.append(this.chatInputTodoListWidgetContainer, widget.domNode);
            // Listen to height changes
            this._chatEditingTodosDisposables.add(widget.onDidChangeHeight(() => {
                this._onDidChangeHeight.fire();
            }));
        }
        this._chatInputTodoListWidget.value.render(chatSessionResource);
    }
    clearTodoListWidget(sessionResource, force) {
        this._chatInputTodoListWidget.value?.clear(sessionResource, force);
    }
    renderChatEditingSessionState(chatEditingSession) {
        dom.setVisibility(Boolean(chatEditingSession), this.chatEditingSessionWidgetContainer);
        if (chatEditingSession) {
            if (!isEqual(chatEditingSession.chatSessionResource, this._lastEditingSessionResource)) {
                this._workingSetCollapsed.set(true, undefined);
            }
            this._lastEditingSessionResource = chatEditingSession.chatSessionResource;
        }
        const modifiedEntries = derivedOpts({ equalsFn: arraysEqual }, r => {
            return chatEditingSession?.entries.read(r).filter(entry => entry.state.read(r) === 0 /* ModifiedFileEntryState.Modified */) || [];
        });
        const editSessionEntries = derived((reader) => {
            const seenEntries = new ResourceSet();
            const entries = [];
            for (const entry of modifiedEntries.read(reader)) {
                if (entry.state.read(reader) !== 0 /* ModifiedFileEntryState.Modified */) {
                    continue;
                }
                if (!seenEntries.has(entry.modifiedURI)) {
                    seenEntries.add(entry.modifiedURI);
                    const linesAdded = entry.linesAdded?.read(reader);
                    const linesRemoved = entry.linesRemoved?.read(reader);
                    entries.push({
                        reference: entry.modifiedURI,
                        state: 0 /* ModifiedFileEntryState.Modified */,
                        kind: 'reference',
                        options: {
                            status: undefined,
                            diffMeta: { added: linesAdded ?? 0, removed: linesRemoved ?? 0 }
                        }
                    });
                }
            }
            entries.sort((a, b) => {
                if (a.kind === 'reference' && b.kind === 'reference') {
                    if (a.state === b.state || a.state === undefined || b.state === undefined) {
                        return a.reference.toString().localeCompare(b.reference.toString());
                    }
                    return a.state - b.state;
                }
                return 0;
            });
            return entries;
        });
        const sessionFileChanges = observableFromEvent(this, this.agentSessionsService.model.onDidChangeSessions, () => {
            const sessionResource = this._widget?.viewModel?.model?.sessionResource;
            if (!sessionResource) {
                return Iterable.empty();
            }
            const model = this.agentSessionsService.getSession(sessionResource);
            return model?.changes instanceof Array ? model.changes : Iterable.empty();
        });
        const sessionFiles = derived(reader => sessionFileChanges.read(reader).map((entry) => ({
            reference: entry.modifiedUri,
            state: 1 /* ModifiedFileEntryState.Accepted */,
            kind: 'reference',
            options: {
                status: undefined,
                diffMeta: { added: entry.insertions, removed: entry.deletions },
                originalUri: entry.originalUri,
            }
        })));
        const shouldRender = derived(reader => editSessionEntries.read(reader).length > 0 || sessionFiles.read(reader).length > 0);
        this._renderingChatEdits.value = autorun(reader => {
            if (this.options.renderWorkingSet && shouldRender.read(reader)) {
                this.renderChatEditingSessionWithEntries(reader.store, chatEditingSession, modifiedEntries, sessionFileChanges, editSessionEntries, sessionFiles);
            }
            else {
                dom.clearNode(this.chatEditingSessionWidgetContainer);
                this._chatEditsDisposables.clear();
                this._chatEditList = undefined;
            }
        });
    }
    renderChatEditingSessionWithEntries(store, chatEditingSession, modifiedEntries, sessionFileChanges, editSessionEntries, sessionEntries) {
        // Summary of number of files changed
        // eslint-disable-next-line no-restricted-syntax
        const innerContainer = this.chatEditingSessionWidgetContainer.querySelector('.chat-editing-session-container.show-file-icons') ?? dom.append(this.chatEditingSessionWidgetContainer, $('.chat-editing-session-container.show-file-icons'));
        // eslint-disable-next-line no-restricted-syntax
        const overviewRegion = innerContainer.querySelector('.chat-editing-session-overview') ?? dom.append(innerContainer, $('.chat-editing-session-overview'));
        // eslint-disable-next-line no-restricted-syntax
        const overviewTitle = overviewRegion.querySelector('.working-set-title') ?? dom.append(overviewRegion, $('.working-set-title'));
        // Clear out the previous actions (if any)
        this._chatEditsActionsDisposables.clear();
        // Chat editing session actions
        // eslint-disable-next-line no-restricted-syntax
        const actionsContainer = overviewRegion.querySelector('.chat-editing-session-actions') ?? dom.append(overviewRegion, $('.chat-editing-session-actions'));
        const sessionResource = chatEditingSession?.chatSessionResource || this._widget?.viewModel?.model.sessionResource;
        const scopedContextKeyService = this._chatEditsActionsDisposables.add(this.contextKeyService.createScoped(actionsContainer));
        if (sessionResource) {
            scopedContextKeyService.createKey(ChatContextKeys.agentSessionType.key, getChatSessionType(sessionResource));
        }
        this._chatEditsActionsDisposables.add(bindContextKey(ChatContextKeys.hasAgentSessionChanges, scopedContextKeyService, r => !!sessionEntries.read(r)?.length));
        const scopedInstantiationService = this._chatEditsActionsDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        // Working set
        // eslint-disable-next-line no-restricted-syntax
        const workingSetContainer = innerContainer.querySelector('.chat-editing-session-list') ?? dom.append(innerContainer, $('.chat-editing-session-list'));
        const button = this._chatEditsActionsDisposables.add(new ButtonWithIcon(overviewTitle, {
            supportIcons: true,
            secondary: true,
            ariaLabel: localize('chatEditingSession.toggleWorkingSet', 'Toggle changed files.'),
        }));
        const topLevelStats = derived(reader => {
            let added = 0;
            let removed = 0;
            const entries = modifiedEntries.read(reader);
            for (const entry of entries) {
                if (entry.linesAdded && entry.linesRemoved) {
                    added += entry.linesAdded.read(reader);
                    removed += entry.linesRemoved.read(reader);
                }
            }
            let baseLabel = entries.length === 1 ? localize('chatEditingSession.oneFile.1', '1 file changed') : localize('chatEditingSession.manyFiles.1', '{0} files changed', entries.length);
            let shouldShowEditingSession = added > 0 || removed > 0;
            let topLevelIsSessionMenu = false;
            if (added === 0 && removed === 0) {
                const sessionValue = sessionFileChanges.read(reader) || [];
                for (const entry of sessionValue) {
                    added += entry.insertions;
                    removed += entry.deletions;
                }
                shouldShowEditingSession = sessionValue.length > 0;
                baseLabel = sessionValue.length === 1 ? localize('chatEditingSession.oneFile.2', '1 file ready to merge') : localize('chatEditingSession.manyFiles.2', '{0} files ready to merge', sessionValue.length);
                topLevelIsSessionMenu = true;
            }
            button.label = baseLabel;
            return { added, removed, shouldShowEditingSession, baseLabel, topLevelIsSessionMenu };
        });
        const topLevelIsSessionMenu = topLevelStats.map(t => t.topLevelIsSessionMenu);
        store.add(autorun(reader => {
            const isSessionMenu = topLevelIsSessionMenu.read(reader);
            reader.store.add(scopedInstantiationService.createInstance(MenuWorkbenchButtonBar, actionsContainer, isSessionMenu ? MenuId.ChatEditingSessionChangesToolbar : MenuId.ChatEditingWidgetToolbar, {
                telemetrySource: this.options.menus.telemetrySource,
                menuOptions: {
                    arg: sessionResource && (isSessionMenu ? sessionResource : {
                        $mid: 19 /* MarshalledId.ChatViewContext */,
                        sessionResource,
                    }),
                },
                buttonConfigProvider: (action) => {
                    if (action.id === ChatEditingShowChangesAction.ID || action.id === ViewPreviousEditsAction.Id || action.id === ViewAllSessionChangesAction.ID) {
                        return { showIcon: true, showLabel: false, isSecondary: true };
                    }
                    return undefined;
                }
            }));
        }));
        store.add(autorun(reader => {
            const { added, removed, shouldShowEditingSession, baseLabel } = topLevelStats.read(reader);
            button.label = baseLabel;
            this._workingSetLinesAddedSpan.value.textContent = `+${added}`;
            this._workingSetLinesRemovedSpan.value.textContent = `-${removed}`;
            button.element.setAttribute('aria-label', localize('chatEditingSession.ariaLabelWithCounts', '{0}, {1} lines added, {2} lines removed', baseLabel, added, removed));
            dom.setVisibility(shouldShowEditingSession, this.chatEditingSessionWidgetContainer);
            if (!shouldShowEditingSession) {
                this._onDidChangeHeight.fire();
            }
        }));
        const countsContainer = dom.$('.working-set-line-counts');
        button.element.appendChild(countsContainer);
        countsContainer.appendChild(this._workingSetLinesAddedSpan.value);
        countsContainer.appendChild(this._workingSetLinesRemovedSpan.value);
        const toggleWorkingSet = () => {
            this._workingSetCollapsed.set(!this._workingSetCollapsed.get(), undefined);
        };
        this._chatEditsActionsDisposables.add(button.onDidClick(toggleWorkingSet));
        this._chatEditsActionsDisposables.add(addDisposableListener(overviewRegion, 'click', e => {
            if (e.defaultPrevented) {
                return;
            }
            const target = e.target;
            if (target.closest('.monaco-button')) {
                return;
            }
            toggleWorkingSet();
        }));
        this._chatEditsActionsDisposables.add(autorun(reader => {
            const collapsed = this._workingSetCollapsed.read(reader);
            button.icon = collapsed ? Codicon.chevronRight : Codicon.chevronDown;
            workingSetContainer.classList.toggle('collapsed', collapsed);
            this._onDidChangeHeight.fire();
        }));
        if (!this._chatEditList) {
            this._chatEditList = this._chatEditsListPool.get();
            const list = this._chatEditList.object;
            this._chatEditsDisposables.add(this._chatEditList);
            this._chatEditsDisposables.add(list.onDidFocus(() => {
                this._onDidFocus.fire();
            }));
            this._chatEditsDisposables.add(list.onDidOpen(async (e) => {
                if (e.element?.kind === 'reference' && URI.isUri(e.element.reference)) {
                    const modifiedFileUri = e.element.reference;
                    const originalUri = e.element.options?.originalUri;
                    // If there's a originalUri, open as diff editor
                    if (originalUri) {
                        await this.editorService.openEditor({
                            original: { resource: originalUri },
                            modified: { resource: modifiedFileUri },
                            options: e.editorOptions
                        }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                        return;
                    }
                    const entry = chatEditingSession?.getEntry(modifiedFileUri);
                    const pane = await this.editorService.openEditor({
                        resource: modifiedFileUri,
                        options: e.editorOptions
                    }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                    if (pane) {
                        entry?.getEditorIntegration(pane).reveal(true, e.editorOptions.preserveFocus);
                    }
                }
            }));
            this._chatEditsDisposables.add(addDisposableListener(list.getHTMLElement(), 'click', e => {
                if (!this.hasFocus()) {
                    this._onDidFocus.fire();
                }
            }, true));
            dom.append(workingSetContainer, list.getHTMLElement());
            dom.append(innerContainer, workingSetContainer);
        }
        store.add(autorun(reader => {
            const editEntries = editSessionEntries.read(reader);
            const sessionFileEntries = sessionEntries.read(reader) ?? [];
            // Combine entries with an optional divider
            const allEntries = [...editEntries];
            if (sessionFileEntries.length > 0) {
                if (editEntries.length > 0) {
                    // Add divider between edit session entries and session file entries
                    allEntries.push({
                        kind: 'divider',
                        label: localize('chatEditingSession.allChanges', 'Worktree Changes'),
                        menuId: MenuId.ChatEditingSessionChangesToolbar,
                        menuArg: sessionResource,
                        scopedInstantiationService,
                    });
                }
                allEntries.push(...sessionFileEntries);
            }
            const maxItemsShown = 6;
            const itemsShown = Math.min(allEntries.length, maxItemsShown);
            const height = itemsShown * 22;
            const list = this._chatEditList.object;
            list.layout(height);
            list.getHTMLElement().style.height = `${height}px`;
            list.splice(0, list.length, allEntries);
            this._onDidChangeHeight.fire();
        }));
    }
    async renderChatRelatedFiles() {
        const anchor = this.relatedFilesContainer;
        dom.clearNode(anchor);
        const shouldRender = this.configurationService.getValue('chat.renderRelatedFiles');
        dom.setVisibility(Boolean(this.relatedFiles?.value.length && shouldRender), anchor);
        if (!shouldRender || !this.relatedFiles?.value.length) {
            return;
        }
        const hoverDelegate = getDefaultHoverDelegate('element');
        for (const { uri, description } of this.relatedFiles.value) {
            const uriLabel = this._chatEditsActionsDisposables.add(new Button(anchor, {
                supportIcons: true,
                secondary: true,
                hoverDelegate
            }));
            uriLabel.label = this.labelService.getUriBasenameLabel(uri);
            uriLabel.element.classList.add('monaco-icon-label');
            uriLabel.element.title = localize('suggeste.title', "{0} - {1}", this.labelService.getUriLabel(uri, { relative: true }), description ?? '');
            this._chatEditsActionsDisposables.add(uriLabel.onDidClick(async () => {
                group.remove(); // REMOVE asap
                await this._attachmentModel.addFile(uri);
                this.relatedFiles?.remove(uri);
            }));
            const addButton = this._chatEditsActionsDisposables.add(new Button(anchor, {
                supportIcons: false,
                secondary: true,
                hoverDelegate,
                ariaLabel: localize('chatEditingSession.addSuggestion', 'Add suggestion {0}', this.labelService.getUriLabel(uri, { relative: true })),
            }));
            addButton.icon = Codicon.add;
            addButton.setTitle(localize('chatEditingSession.addSuggested', 'Add suggestion'));
            this._chatEditsActionsDisposables.add(addButton.onDidClick(async () => {
                group.remove(); // REMOVE asap
                await this._attachmentModel.addFile(uri);
                this.relatedFiles?.remove(uri);
            }));
            const sep = document.createElement('div');
            sep.classList.add('separator');
            const group = document.createElement('span');
            group.classList.add('monaco-button-dropdown', 'sidebyside-button');
            group.appendChild(addButton.element);
            group.appendChild(sep);
            group.appendChild(uriLabel.element);
            dom.append(anchor, group);
            this._chatEditsActionsDisposables.add(toDisposable(() => {
                group.remove();
            }));
        }
        this._onDidChangeHeight.fire();
    }
    async renderFollowups(items, response) {
        if (!this.options.renderFollowups) {
            return;
        }
        this.followupsDisposables.clear();
        dom.clearNode(this.followupsContainer);
        if (items && items.length > 0) {
            this.followupsDisposables.add(this.instantiationService.createInstance(ChatFollowups, this.followupsContainer, items, this.location, undefined, followup => this._onDidAcceptFollowup.fire({ followup, response })));
        }
        this._onDidChangeHeight.fire();
    }
    get contentHeight() {
        const data = this.getLayoutData();
        return data.followupsHeight + data.inputPartEditorHeight + data.inputPartVerticalPadding + data.inputEditorBorder + data.attachmentsHeight + data.toolbarsHeight + data.chatEditingStateHeight + data.todoListWidgetContainerHeight + data.inputWidgetsContainerHeight;
    }
    layout(height, width) {
        this.cachedDimensions = new dom.Dimension(width, height);
        return this._layout(height, width);
    }
    _layout(height, width, allowRecurse = true) {
        const data = this.getLayoutData();
        const inputEditorHeight = Math.min(data.inputPartEditorHeight, height - data.followupsHeight - data.attachmentsHeight - data.inputPartVerticalPadding - data.toolbarsHeight - data.chatEditingStateHeight - data.todoListWidgetContainerHeight - data.inputWidgetsContainerHeight);
        const followupsWidth = width - data.inputPartHorizontalPadding;
        this.followupsContainer.style.width = `${followupsWidth}px`;
        this._inputPartHeight = data.inputPartVerticalPadding + data.followupsHeight + inputEditorHeight + data.inputEditorBorder + data.attachmentsHeight + data.toolbarsHeight + data.chatEditingStateHeight + data.todoListWidgetContainerHeight + data.inputWidgetsContainerHeight;
        this._followupsHeight = data.followupsHeight;
        this._editSessionWidgetHeight = data.chatEditingStateHeight;
        const initialEditorScrollWidth = this._inputEditor.getScrollWidth();
        const newEditorWidth = width - data.inputPartHorizontalPadding - data.editorBorder - data.inputPartHorizontalPaddingInside - data.toolbarsWidth - data.sideToolbarWidth;
        const newDimension = { width: newEditorWidth, height: inputEditorHeight };
        if (!this.previousInputEditorDimension || (this.previousInputEditorDimension.width !== newDimension.width || this.previousInputEditorDimension.height !== newDimension.height)) {
            // This layout call has side-effects that are hard to understand. eg if we are calling this inside a onDidChangeContent handler, this can trigger the next onDidChangeContent handler
            // to be invoked, and we have a lot of these on this editor. Only doing a layout this when the editor size has actually changed makes it much easier to follow.
            this._inputEditor.layout(newDimension);
            this.previousInputEditorDimension = newDimension;
        }
        if (allowRecurse && initialEditorScrollWidth < 10) {
            // This is probably the initial layout. Now that the editor is layed out with its correct width, it should report the correct contentHeight
            return this._layout(height, width, false);
        }
    }
    getLayoutData() {
        // ###########################################################################
        // #                                                                         #
        // #    CHANGING THIS METHOD HAS RENDERING IMPLICATIONS FOR THE CHAT VIEW    #
        // #    IF YOU MAKE CHANGES HERE, PLEASE TEST THE CHAT VIEW THOROUGHLY:      #
        // #    - produce various chat responses                                     #
        // #    - click the response to get a focus outline                          #
        // #    - ensure the outline is not cut off at the bottom                    #
        // #                                                                         #
        // ###########################################################################
        const executeToolbarWidth = this.cachedExecuteToolbarWidth = this.executeToolbar.getItemsWidth();
        const inputToolbarWidth = this.cachedInputToolbarWidth = this.inputActionsToolbar.getItemsWidth();
        const inputSideToolbarWidth = this.inputSideToolbarContainer ? dom.getTotalWidth(this.inputSideToolbarContainer) : 0;
        const executeToolbarPadding = (this.executeToolbar.getItemsLength() - 1) * 4;
        const inputToolbarPadding = this.inputActionsToolbar.getItemsLength() ? (this.inputActionsToolbar.getItemsLength() - 1) * 4 : 0;
        return {
            inputEditorBorder: 2,
            followupsHeight: this.followupsContainer.offsetHeight,
            inputPartEditorHeight: Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight),
            inputPartHorizontalPadding: this.options.renderStyle === 'compact' ? 16 : 32,
            inputPartVerticalPadding: this.options.renderStyle === 'compact' ? 12 : (16 /* entire part */ + 6 /* input container */ + (2 * 4) /* flex gap: todo|edits|input */),
            attachmentsHeight: this.attachmentsHeight,
            editorBorder: 2,
            inputPartHorizontalPaddingInside: 12,
            toolbarsWidth: this.options.renderStyle === 'compact' ? executeToolbarWidth + executeToolbarPadding + (this.options.renderInputToolbarBelowInput ? 0 : inputToolbarWidth + inputToolbarPadding) : 0,
            toolbarsHeight: this.options.renderStyle === 'compact' ? 0 : 22,
            chatEditingStateHeight: this.chatEditingSessionWidgetContainer.offsetHeight,
            sideToolbarWidth: inputSideToolbarWidth > 0 ? inputSideToolbarWidth + 4 /*gap*/ : 0,
            todoListWidgetContainerHeight: this.chatInputTodoListWidgetContainer.offsetHeight,
            inputWidgetsContainerHeight: this.inputWidgetsHeight,
        };
    }
};
ChatInputPart = ChatInputPart_1 = __decorate([
    __param(4, IModelService),
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IConfigurationService),
    __param(8, IKeybindingService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageModelsService),
    __param(11, ILogService),
    __param(12, IFileService),
    __param(13, IEditorService),
    __param(14, IThemeService),
    __param(15, ITextModelService),
    __param(16, IStorageService),
    __param(17, ILabelService),
    __param(18, IChatAgentService),
    __param(19, ISharedWebContentExtractorService),
    __param(20, IWorkbenchAssignmentService),
    __param(21, IChatEntitlementService),
    __param(22, IChatModeService),
    __param(23, ILanguageModelToolsService),
    __param(24, IChatService),
    __param(25, IChatSessionsService),
    __param(26, IChatContextService),
    __param(27, IAgentSessionsService)
], ChatInputPart);
export { ChatInputPart };
function getLastPosition(model) {
    return { lineNumber: model.getLineCount(), column: model.getLineLength(model.getLineCount()) + 1 };
}
const chatInputEditorContainerSelector = '.interactive-input-editor';
setupSimpleEditorSelectionStyling(chatInputEditorContainerSelector);
class ChatSessionPickersContainerActionItem extends ActionViewItem {
    constructor(action, widgets, options) {
        super(null, action, options ?? {});
        this.widgets = widgets;
    }
    render(container) {
        container.classList.add('chat-sessionPicker-container');
        for (const widget of this.widgets) {
            const itemContainer = dom.$('.action-item.chat-sessionPicker-item');
            widget.render(itemContainer);
            container.appendChild(itemContainer);
        }
    }
    dispose() {
        for (const widget of this.widgets) {
            widget.dispose();
        }
        super.dispose();
    }
}
class AddFilesButton extends ActionViewItem {
    constructor(context, action, options) {
        super(context, action, {
            ...options,
            icon: false,
            label: true,
            keybindingNotRenderedWithLabel: true,
        });
    }
    setShowLabel(show) {
        this.showLabel = show;
        this.updateLabel();
    }
    render(container) {
        container.classList.add('chat-attachment-button');
        super.render(container);
        this.updateLabel();
    }
    updateLabel() {
        if (!this.label) {
            return;
        }
        assertType(this.label);
        this.label.classList.toggle('has-label', this.showLabel);
        const message = this.showLabel ? `$(attach) ${this.action.label}` : `$(attach)`;
        dom.reset(this.label, ...renderLabelWithIcons(message));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdElucHV0UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsZUFBZSxFQUF5QixNQUFNLDJDQUEyQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQTBCLE1BQU0sMERBQTBELENBQUM7QUFDbEgsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9E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
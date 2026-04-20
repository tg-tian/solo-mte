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
var ChatListItemRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { canceledName } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, thenIfNotDisposed, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { clamp } from '../../../../base/common/numbers.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
import { CodiconActionViewItem } from '../../notebook/browser/view/cellParts/cellActionView.js';
import { annotateSpecialMarkdownContent } from '../common/annotations.js';
import { checkModeOption } from '../common/chat.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { chatSubcommandLeader } from '../common/chatParserTypes.js';
import { ChatAgentVoteDirection, ChatAgentVoteDownReason, ChatErrorLevel, IChatToolInvocation, isChatFollowup } from '../common/chatService.js';
import { localChatSessionType } from '../common/chatSessionsService.js';
import { getChatSessionType } from '../common/chatUri.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { getNWords } from '../common/chatWordCounter.js';
import { CodeBlockModelCollection } from '../common/codeBlockModelCollection.js';
import { ChatAgentLocation, ChatConfiguration, CollapsedToolsDisplayMode, ThinkingDisplayMode } from '../common/constants.js';
import { MarkUnhelpfulActionId } from './actions/chatTitleActions.js';
import { IChatWidgetService } from './chat.js';
import { ChatAgentHover, getChatAgentHoverOptions } from './chatAgentHover.js';
import { ChatContentMarkdownRenderer } from './chatContentMarkdownRenderer.js';
import { ChatAgentCommandContentPart } from './chatContentParts/chatAgentCommandContentPart.js';
import { ChatAnonymousRateLimitedPart } from './chatContentParts/chatAnonymousRateLimitedPart.js';
import { ChatAttachmentsContentPart } from './chatContentParts/chatAttachmentsContentPart.js';
import { ChatCheckpointFileChangesSummaryContentPart } from './chatContentParts/chatChangesSummaryPart.js';
import { ChatCodeCitationContentPart } from './chatContentParts/chatCodeCitationContentPart.js';
import { ChatCommandButtonContentPart } from './chatContentParts/chatCommandContentPart.js';
import { ChatConfirmationContentPart } from './chatContentParts/chatConfirmationContentPart.js';
import { DiffEditorPool, EditorPool } from './chatContentParts/chatContentCodePools.js';
import { ChatElicitationContentPart } from './chatContentParts/chatElicitationContentPart.js';
import { ChatErrorConfirmationContentPart } from './chatContentParts/chatErrorConfirmationPart.js';
import { ChatErrorContentPart } from './chatContentParts/chatErrorContentPart.js';
import { ChatExtensionsContentPart } from './chatContentParts/chatExtensionsContentPart.js';
import { ChatMarkdownContentPart } from './chatContentParts/chatMarkdownContentPart.js';
import { ChatMcpServersInteractionContentPart } from './chatContentParts/chatMcpServersInteractionContentPart.js';
import { ChatMultiDiffContentPart } from './chatContentParts/chatMultiDiffContentPart.js';
import { ChatProgressContentPart, ChatWorkingProgressContentPart } from './chatContentParts/chatProgressContentPart.js';
import { ChatPullRequestContentPart } from './chatContentParts/chatPullRequestContentPart.js';
import { ChatQuotaExceededPart } from './chatContentParts/chatQuotaExceededPart.js';
import { ChatUsedReferencesListContentPart, CollapsibleListPool } from './chatContentParts/chatReferencesContentPart.js';
import { ChatTaskContentPart } from './chatContentParts/chatTaskContentPart.js';
import { ChatTextEditContentPart } from './chatContentParts/chatTextEditContentPart.js';
import { ChatThinkingContentPart } from './chatContentParts/chatThinkingContentPart.js';
import { ChatTreeContentPart, TreePool } from './chatContentParts/chatTreeContentPart.js';
import './chatContentParts/media/chatMcpServersInteractionContent.css';
import { ChatToolInvocationPart } from './chatContentParts/toolInvocationParts/chatToolInvocationPart.js';
import { ChatMarkdownDecorationsRenderer } from './chatMarkdownDecorationsRenderer.js';
import { ChatCodeBlockContentProvider } from './codeBlockPart.js';
const $ = dom.$;
const COPILOT_USERNAME = 'GitHub Copilot';
const forceVerboseLayoutTracing = false;
const mostRecentResponseClassName = 'chat-most-recent-response';
let ChatListItemRenderer = class ChatListItemRenderer extends Disposable {
    static { ChatListItemRenderer_1 = this; }
    static { this.ID = 'item'; }
    constructor(editorOptions, rendererOptions, delegate, codeBlockModelCollection, overflowWidgetsDomNode, viewModel, instantiationService, configService, logService, contextKeyService, themeService, commandService, hoverService, chatWidgetService, chatEntitlementService) {
        super();
        this.rendererOptions = rendererOptions;
        this.delegate = delegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.viewModel = viewModel;
        this.instantiationService = instantiationService;
        this.configService = configService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.themeService = themeService;
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.chatWidgetService = chatWidgetService;
        this.chatEntitlementService = chatEntitlementService;
        this.codeBlocksByResponseId = new Map();
        this.codeBlocksByEditorUri = new ResourceMap();
        this.fileTreesByResponseId = new Map();
        this.focusedFileTreesByResponseId = new Map();
        this.templateDataByRequestId = new Map();
        this._onDidClickFollowup = this._register(new Emitter());
        this.onDidClickFollowup = this._onDidClickFollowup.event;
        this._onDidClickRerunWithAgentOrCommandDetection = new Emitter();
        this.onDidClickRerunWithAgentOrCommandDetection = this._onDidClickRerunWithAgentOrCommandDetection.event;
        this._onDidClickRequest = this._register(new Emitter());
        this.onDidClickRequest = this._onDidClickRequest.event;
        this._onDidRerender = this._register(new Emitter());
        this.onDidRerender = this._onDidRerender.event;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidFocusOutside = this._register(new Emitter());
        this.onDidFocusOutside = this._onDidFocusOutside.event;
        this._onDidChangeItemHeight = this._register(new Emitter());
        this.onDidChangeItemHeight = this._onDidChangeItemHeight.event;
        this._currentLayoutWidth = 0;
        this._isVisible = true;
        this._onDidChangeVisibility = this._register(new Emitter());
        /**
         * Prevents re-announcement of already rendered chat progress
         * by screen readers
         */
        this._announcedToolProgressKeys = new Set();
        this.chatContentMarkdownRenderer = this.instantiationService.createInstance(ChatContentMarkdownRenderer);
        this.markdownDecorationsRenderer = this.instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
        this._editorPool = this._register(this.instantiationService.createInstance(EditorPool, editorOptions, delegate, overflowWidgetsDomNode, false));
        this._toolEditorPool = this._register(this.instantiationService.createInstance(EditorPool, editorOptions, delegate, overflowWidgetsDomNode, true));
        this._diffEditorPool = this._register(this.instantiationService.createInstance(DiffEditorPool, editorOptions, delegate, overflowWidgetsDomNode, false));
        this._treePool = this._register(this.instantiationService.createInstance(TreePool, this._onDidChangeVisibility.event));
        this._contentReferencesListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, undefined, undefined));
        this._register(this.instantiationService.createInstance(ChatCodeBlockContentProvider));
        this._toolInvocationCodeBlockCollection = this._register(this.instantiationService.createInstance(CodeBlockModelCollection, 'tools'));
    }
    updateOptions(options) {
        this.rendererOptions = { ...this.rendererOptions, ...options };
    }
    get templateId() {
        return ChatListItemRenderer_1.ID;
    }
    editorsInUse() {
        return Iterable.concat(this._editorPool.inUse(), this._toolEditorPool.inUse());
    }
    traceLayout(method, message) {
        if (forceVerboseLayoutTracing) {
            this.logService.info(`ChatListItemRenderer#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatListItemRenderer#${method}: ${message}`);
        }
    }
    /**
     * Compute a rate to render at in words/s.
     */
    getProgressiveRenderRate(element) {
        let Rate;
        (function (Rate) {
            Rate[Rate["Min"] = 5] = "Min";
            Rate[Rate["Max"] = 2000] = "Max";
        })(Rate || (Rate = {}));
        const minAfterComplete = 80;
        const rate = element.contentUpdateTimings?.impliedWordLoadRate;
        if (element.isComplete) {
            if (typeof rate === 'number') {
                return clamp(rate, minAfterComplete, 2000 /* Rate.Max */);
            }
            else {
                return minAfterComplete;
            }
        }
        if (typeof rate === 'number') {
            return clamp(rate, 5 /* Rate.Min */, 2000 /* Rate.Max */);
        }
        return 8;
    }
    getCodeBlockInfosForResponse(response) {
        const codeBlocks = this.codeBlocksByResponseId.get(response.id);
        return codeBlocks ?? [];
    }
    updateViewModel(viewModel) {
        this.viewModel = viewModel;
        this._announcedToolProgressKeys.clear();
    }
    getCodeBlockInfoForEditor(uri) {
        return this.codeBlocksByEditorUri.get(uri);
    }
    getFileTreeInfosForResponse(response) {
        const fileTrees = this.fileTreesByResponseId.get(response.id);
        return fileTrees ?? [];
    }
    getLastFocusedFileTreeForResponse(response) {
        const fileTrees = this.fileTreesByResponseId.get(response.id);
        const lastFocusedFileTreeIndex = this.focusedFileTreesByResponseId.get(response.id);
        if (fileTrees?.length && lastFocusedFileTreeIndex !== undefined && lastFocusedFileTreeIndex < fileTrees.length) {
            return fileTrees[lastFocusedFileTreeIndex];
        }
        return undefined;
    }
    getTemplateDataForRequestId(requestId) {
        if (!requestId) {
            return undefined;
        }
        const templateData = this.templateDataByRequestId.get(requestId);
        if (templateData && templateData.currentElement?.id === requestId) {
            return templateData;
        }
        if (templateData) {
            this.templateDataByRequestId.delete(requestId);
        }
        return undefined;
    }
    setVisible(visible) {
        this._isVisible = visible;
        this._onDidChangeVisibility.fire(visible);
    }
    layout(width) {
        const newWidth = width - 40; // padding
        if (newWidth !== this._currentLayoutWidth) {
            this._currentLayoutWidth = newWidth;
            for (const editor of this._editorPool.inUse()) {
                editor.layout(this._currentLayoutWidth);
            }
            for (const toolEditor of this._toolEditorPool.inUse()) {
                toolEditor.layout(this._currentLayoutWidth);
            }
            for (const diffEditor of this._diffEditorPool.inUse()) {
                diffEditor.layout(this._currentLayoutWidth);
            }
        }
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const disabledOverlay = dom.append(container, $('.chat-row-disabled-overlay'));
        const rowContainer = dom.append(container, $('.interactive-item-container'));
        if (this.rendererOptions.renderStyle === 'compact') {
            rowContainer.classList.add('interactive-item-compact');
        }
        let headerParent = rowContainer;
        let valueParent = rowContainer;
        let detailContainerParent;
        if (this.rendererOptions.renderStyle === 'minimal') {
            rowContainer.classList.add('interactive-item-compact');
            rowContainer.classList.add('minimal');
            // -----------------------------------------------------
            //  icon | details
            //       | references
            //       | value
            // -----------------------------------------------------
            const lhsContainer = dom.append(rowContainer, $('.column.left'));
            const rhsContainer = dom.append(rowContainer, $('.column.right'));
            headerParent = lhsContainer;
            detailContainerParent = rhsContainer;
            valueParent = rhsContainer;
        }
        const header = dom.append(headerParent, $('.header'));
        const contextKeyService = templateDisposables.add(this.contextKeyService.createScoped(rowContainer));
        const scopedInstantiationService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const requestHover = dom.append(rowContainer, $('.request-hover'));
        let titleToolbar;
        if (this.rendererOptions.noHeader) {
            header.classList.add('hidden');
        }
        else {
            titleToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, requestHover, MenuId.ChatMessageTitle, {
                menuOptions: {
                    shouldForwardArgs: true
                },
                toolbarOptions: {
                    shouldInlineSubmenu: submenu => submenu.actions.length <= 1
                },
            }));
        }
        this.hoverHidden(requestHover);
        const checkpointContainer = dom.append(rowContainer, $('.checkpoint-container'));
        const codiconContainer = dom.append(checkpointContainer, $('.codicon-container'));
        dom.append(codiconContainer, $('span.codicon.codicon-bookmark'));
        const checkpointToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, checkpointContainer, MenuId.ChatMessageCheckpoint, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    return this.instantiationService.createInstance(CodiconActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                }
                return undefined;
            },
            renderDropdownAsChildElement: true,
            menuOptions: {
                shouldForwardArgs: true
            },
            toolbarOptions: {
                shouldInlineSubmenu: submenu => submenu.actions.length <= 1
            },
        }));
        dom.append(checkpointContainer, $('.checkpoint-divider'));
        const user = dom.append(header, $('.user'));
        const avatarContainer = dom.append(user, $('.avatar-container'));
        const username = dom.append(user, $('h3.username'));
        username.tabIndex = 0;
        const detailContainer = dom.append(detailContainerParent ?? user, $('span.detail-container'));
        const detail = dom.append(detailContainer, $('span.detail'));
        dom.append(detailContainer, $('span.chat-animated-ellipsis'));
        const value = dom.append(valueParent, $('.value'));
        const elementDisposables = new DisposableStore();
        const footerToolbarContainer = dom.append(rowContainer, $('.chat-footer-toolbar'));
        if (this.rendererOptions.noFooter) {
            footerToolbarContainer.classList.add('hidden');
        }
        const footerToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, footerToolbarContainer, MenuId.ChatMessageFooter, {
            eventDebounceDelay: 0,
            menuOptions: { shouldForwardArgs: true, renderShortTitle: true },
            toolbarOptions: { shouldInlineSubmenu: submenu => submenu.actions.length <= 1 },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && action.item.id === MarkUnhelpfulActionId) {
                    return scopedInstantiationService.createInstance(ChatVoteDownButton, action, options);
                }
                return createActionViewItem(scopedInstantiationService, action, options);
            }
        }));
        // Insert the details container into the toolbar's internal element structure
        const footerDetailsContainer = dom.append(footerToolbar.getElement(), $('.chat-footer-details'));
        footerDetailsContainer.tabIndex = 0;
        const checkpointRestoreContainer = dom.append(rowContainer, $('.checkpoint-restore-container'));
        const codiconRestoreContainer = dom.append(checkpointRestoreContainer, $('.codicon-container'));
        dom.append(codiconRestoreContainer, $('span.codicon.codicon-bookmark'));
        const label = dom.append(checkpointRestoreContainer, $('span.checkpoint-label-text'));
        label.textContent = localize('checkpointRestore', 'Checkpoint Restored');
        const checkpointRestoreToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, checkpointRestoreContainer, MenuId.ChatMessageRestoreCheckpoint, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    return this.instantiationService.createInstance(CodiconActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                }
                return undefined;
            },
            renderDropdownAsChildElement: true,
            menuOptions: {
                shouldForwardArgs: true
            },
            toolbarOptions: {
                shouldInlineSubmenu: submenu => submenu.actions.length <= 1
            },
        }));
        dom.append(checkpointRestoreContainer, $('.checkpoint-divider'));
        const agentHover = templateDisposables.add(this.instantiationService.createInstance(ChatAgentHover));
        const hoverContent = () => {
            if (isResponseVM(template.currentElement) && template.currentElement.agent && !template.currentElement.agent.isDefault) {
                agentHover.setAgent(template.currentElement.agent.id);
                return agentHover.domNode;
            }
            return undefined;
        };
        const hoverOptions = getChatAgentHoverOptions(() => isResponseVM(template.currentElement) ? template.currentElement.agent : undefined, this.commandService);
        templateDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), user, hoverContent, hoverOptions));
        templateDisposables.add(dom.addDisposableListener(user, dom.EventType.KEY_DOWN, e => {
            const ev = new StandardKeyboardEvent(e);
            if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                const content = hoverContent();
                if (content) {
                    this.hoverService.showInstantHover({ content, target: user, trapFocus: true, actions: hoverOptions.actions }, true);
                }
            }
            else if (ev.equals(9 /* KeyCode.Escape */)) {
                this.hoverService.hideHover();
            }
        }));
        const template = { header, avatarContainer, requestHover, username, detail, value, rowContainer, elementDisposables, templateDisposables, contextKeyService, instantiationService: scopedInstantiationService, agentHover, titleToolbar, footerToolbar, footerDetailsContainer, disabledOverlay, checkpointToolbar, checkpointRestoreToolbar, checkpointContainer, checkpointRestoreContainer };
        templateDisposables.add(dom.addDisposableListener(disabledOverlay, dom.EventType.CLICK, e => {
            if (!this.viewModel?.editing) {
                return;
            }
            const current = template.currentElement;
            if (!current || current.id === this.viewModel.editing.id) {
                return;
            }
            if (disabledOverlay.classList.contains('disabled')) {
                e.preventDefault();
                e.stopPropagation();
                this._onDidFocusOutside.fire();
            }
        }));
        return template;
    }
    renderElement(node, index, templateData) {
        this.renderChatTreeItem(node.element, index, templateData);
    }
    clearRenderedParts(templateData) {
        if (templateData.renderedParts) {
            dispose(coalesce(templateData.renderedParts));
            templateData.renderedParts = undefined;
            dom.clearNode(templateData.value);
        }
    }
    renderChatTreeItem(element, index, templateData) {
        if (templateData.currentElement && templateData.currentElement.id !== element.id) {
            this.traceLayout('renderChatTreeItem', `Rendering a different element into the template, index=${index}`);
            this.clearRenderedParts(templateData);
            const mappedTemplateData = this.templateDataByRequestId.get(templateData.currentElement.id);
            if (mappedTemplateData && (mappedTemplateData.currentElement?.id !== templateData.currentElement.id)) {
                this.templateDataByRequestId.delete(templateData.currentElement.id);
            }
        }
        templateData.currentElement = element;
        this.templateDataByRequestId.set(element.id, templateData);
        const kind = isRequestVM(element) ? 'request' :
            isResponseVM(element) ? 'response' :
                'welcome';
        this.traceLayout('renderElement', `${kind}, index=${index}`);
        ChatContextKeys.isResponse.bindTo(templateData.contextKeyService).set(isResponseVM(element));
        ChatContextKeys.itemId.bindTo(templateData.contextKeyService).set(element.id);
        ChatContextKeys.isRequest.bindTo(templateData.contextKeyService).set(isRequestVM(element));
        ChatContextKeys.responseDetectedAgentCommand.bindTo(templateData.contextKeyService).set(isResponseVM(element) && element.agentOrSlashCommandDetected);
        if (isResponseVM(element)) {
            ChatContextKeys.responseSupportsIssueReporting.bindTo(templateData.contextKeyService).set(!!element.agent?.metadata.supportIssueReporting);
            ChatContextKeys.responseVote.bindTo(templateData.contextKeyService).set(element.vote === ChatAgentVoteDirection.Up ? 'up' : element.vote === ChatAgentVoteDirection.Down ? 'down' : '');
        }
        else {
            ChatContextKeys.responseVote.bindTo(templateData.contextKeyService).set('');
        }
        if (templateData.titleToolbar) {
            templateData.titleToolbar.context = element;
        }
        templateData.footerToolbar.context = element;
        // Render result details in footer if available
        if (isResponseVM(element) && element.result?.details) {
            templateData.footerDetailsContainer.textContent = element.result.details;
            templateData.footerDetailsContainer.classList.remove('hidden');
        }
        else {
            templateData.footerDetailsContainer.classList.add('hidden');
        }
        ChatContextKeys.responseHasError.bindTo(templateData.contextKeyService).set(isResponseVM(element) && !!element.errorDetails);
        const isFiltered = !!(isResponseVM(element) && element.errorDetails?.responseIsFiltered);
        ChatContextKeys.responseIsFiltered.bindTo(templateData.contextKeyService).set(isFiltered);
        const location = this.chatWidgetService.getWidgetBySessionResource(element.sessionResource)?.location;
        templateData.rowContainer.classList.toggle('editing-session', location === ChatAgentLocation.Chat);
        templateData.rowContainer.classList.toggle('interactive-request', isRequestVM(element));
        templateData.rowContainer.classList.toggle('interactive-response', isResponseVM(element));
        const progressMessageAtBottomOfResponse = checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse);
        templateData.rowContainer.classList.toggle('show-detail-progress', isResponseVM(element) && !element.isComplete && !element.progressMessages.length && !progressMessageAtBottomOfResponse);
        if (!this.rendererOptions.noHeader) {
            this.renderAvatar(element, templateData);
        }
        templateData.username.textContent = element.username;
        templateData.username.classList.toggle('hidden', element.username === COPILOT_USERNAME);
        templateData.avatarContainer.classList.toggle('hidden', element.username === COPILOT_USERNAME);
        this.hoverHidden(templateData.requestHover);
        dom.clearNode(templateData.detail);
        if (isResponseVM(element)) {
            this.renderDetail(element, templateData);
        }
        templateData.checkpointToolbar.context = element;
        const checkpointEnabled = this.configService.getValue(ChatConfiguration.CheckpointsEnabled)
            && (this.rendererOptions.restorable ?? true);
        templateData.checkpointContainer.classList.toggle('hidden', isResponseVM(element) || !(checkpointEnabled));
        // Only show restore container when we have a checkpoint and not editing
        const shouldShowRestore = this.viewModel?.model.checkpoint && !this.viewModel?.editing && (index === this.delegate.getListLength() - 1);
        templateData.checkpointRestoreContainer.classList.toggle('hidden', !(shouldShowRestore && checkpointEnabled));
        const editing = element.id === this.viewModel?.editing?.id;
        const isInput = this.configService.getValue('chat.editRequests') === 'input';
        templateData.disabledOverlay.classList.toggle('disabled', element.shouldBeBlocked && !editing && this.viewModel?.editing !== undefined);
        templateData.rowContainer.classList.toggle('editing', editing && !isInput);
        templateData.rowContainer.classList.toggle('editing-input', editing && isInput);
        templateData.requestHover.classList.toggle('editing', editing && isInput);
        templateData.requestHover.classList.toggle('hidden', (!!this.viewModel?.editing && !editing) || isResponseVM(element));
        templateData.requestHover.classList.toggle('expanded', this.configService.getValue('chat.editRequests') === 'hover');
        templateData.requestHover.classList.toggle('checkpoints-enabled', checkpointEnabled);
        templateData.elementDisposables.add(dom.addStandardDisposableListener(templateData.rowContainer, dom.EventType.CLICK, (e) => {
            const current = templateData.currentElement;
            if (current && this.viewModel?.editing && current.id !== this.viewModel.editing.id) {
                e.stopPropagation();
                e.preventDefault();
                this._onDidFocusOutside.fire();
            }
        }));
        // Overlay click listener removed: overlay is non-interactive in cancel-on-any-row mode.
        // hack @joaomoreno
        templateData.rowContainer.parentElement?.parentElement?.parentElement?.classList.toggle('request', isRequestVM(element));
        templateData.rowContainer.classList.toggle(mostRecentResponseClassName, index === this.delegate.getListLength() - 1);
        templateData.rowContainer.classList.toggle('confirmation-message', isRequestVM(element) && !!element.confirmation);
        // TODO: @justschen decide if we want to hide the header for requests or not
        const shouldShowHeader = isResponseVM(element) && !this.rendererOptions.noHeader;
        templateData.header?.classList.toggle('header-disabled', !shouldShowHeader);
        if (isRequestVM(element) && element.confirmation) {
            this.renderConfirmationAction(element, templateData);
        }
        // Do a progressive render if
        // - This the last response in the list
        // - And it has some content
        // - And the response is not complete
        //   - Or, we previously started a progressive rendering of this element (if the element is complete, we will finish progressive rendering with a very fast rate)
        if (isResponseVM(element) && index === this.delegate.getListLength() - 1 && (!element.isComplete || element.renderData)) {
            this.traceLayout('renderElement', `start progressive render, index=${index}`);
            const timer = templateData.elementDisposables.add(new dom.WindowIntervalTimer());
            const runProgressiveRender = (initial) => {
                try {
                    if (this.doNextProgressiveRender(element, index, templateData, !!initial)) {
                        timer.cancel();
                    }
                }
                catch (err) {
                    // Kill the timer if anything went wrong, avoid getting stuck in a nasty rendering loop.
                    timer.cancel();
                    this.logService.error(err);
                }
            };
            timer.cancelAndSet(runProgressiveRender, 50, dom.getWindow(templateData.rowContainer));
            runProgressiveRender(true);
        }
        else {
            if (isResponseVM(element)) {
                this.renderChatResponseBasic(element, index, templateData);
            }
            else if (isRequestVM(element)) {
                this.renderChatRequest(element, index, templateData);
            }
        }
    }
    renderDetail(element, templateData) {
        dom.clearNode(templateData.detail);
        if (element.agentOrSlashCommandDetected) {
            const msg = element.slashCommand ? localize('usedAgentSlashCommand', "used {0} [[(rerun without)]]", `${chatSubcommandLeader}${element.slashCommand.name}`) : localize('usedAgent', "[[(rerun without)]]");
            dom.reset(templateData.detail, renderFormattedText(msg, {
                actionHandler: {
                    disposables: templateData.elementDisposables,
                    callback: (content) => {
                        this._onDidClickRerunWithAgentOrCommandDetection.fire(element);
                    },
                }
            }, $('span.agentOrSlashCommandDetected')));
        }
        else if (this.rendererOptions.renderStyle !== 'minimal' && !element.isComplete && !checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse)) {
            templateData.detail.textContent = localize('working', "Working");
        }
    }
    renderConfirmationAction(element, templateData) {
        dom.clearNode(templateData.detail);
        if (element.confirmation) {
            dom.append(templateData.detail, $('span.codicon.codicon-check', { 'aria-hidden': 'true' }));
            dom.append(templateData.detail, $('span.confirmation-text', undefined, localize('chatConfirmationAction', 'Selected "{0}"', element.confirmation)));
            templateData.header?.classList.remove('header-disabled');
            templateData.header?.classList.add('partially-disabled');
        }
    }
    renderAvatar(element, templateData) {
        const icon = isResponseVM(element) ?
            this.getAgentIcon(element.agent?.metadata) :
            (element.avatarIcon ?? Codicon.account);
        if (icon instanceof URI) {
            const avatarIcon = dom.$('img.icon');
            avatarIcon.src = FileAccess.uriToBrowserUri(icon).toString(true);
            templateData.avatarContainer.replaceChildren(dom.$('.avatar', undefined, avatarIcon));
        }
        else {
            const avatarIcon = dom.$(ThemeIcon.asCSSSelector(icon));
            templateData.avatarContainer.replaceChildren(dom.$('.avatar.codicon-avatar', undefined, avatarIcon));
        }
    }
    getAgentIcon(agent) {
        if (agent?.themeIcon) {
            return agent.themeIcon;
        }
        else if (agent?.iconDark && isDark(this.themeService.getColorTheme().type)) {
            return agent.iconDark;
        }
        else if (agent?.icon) {
            return agent.icon;
        }
        else {
            return Codicon.chatSparkle;
        }
    }
    renderChatResponseBasic(element, index, templateData) {
        templateData.rowContainer.classList.toggle('chat-response-loading', (isResponseVM(element) && !element.isComplete));
        if (element.isCanceled) {
            const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
            if (lastThinking?.domNode) {
                lastThinking.finalizeTitleIfDefault();
                lastThinking.markAsInactive();
            }
        }
        const content = [];
        const isFiltered = !!element.errorDetails?.responseIsFiltered;
        if (!isFiltered) {
            // Always add the references to avoid shifting the content parts when a reference is added, and having to re-diff all the content.
            // The part will hide itself if the list is empty.
            content.push({ kind: 'references', references: element.contentReferences });
            content.push(...annotateSpecialMarkdownContent(element.response.value));
            if (element.codeCitations.length) {
                content.push({ kind: 'codeCitations', citations: element.codeCitations });
            }
        }
        if (element.model.response === element.model.entireResponse && element.errorDetails?.message && element.errorDetails.message !== canceledName) {
            content.push({ kind: 'errorDetails', errorDetails: element.errorDetails, isLast: index === this.delegate.getListLength() - 1 });
        }
        const fileChangesSummaryPart = this.getChatFileChangesSummaryPart(element);
        if (fileChangesSummaryPart) {
            content.push(fileChangesSummaryPart);
        }
        const diff = this.diff(templateData.renderedParts ?? [], content, element);
        this.renderChatContentDiff(diff, content, element, index, templateData);
        this.updateItemHeightOnRender(element, templateData);
    }
    shouldShowWorkingProgress(element, partsToRender, templateData) {
        if (element.agentOrSlashCommandDetected || this.rendererOptions.renderStyle === 'minimal' || element.isComplete || !checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse)) {
            return false;
        }
        // Show if no content, only "used references", ends with a complete tool call, or ends with complete text edits and there is no incomplete tool call (edits are still being applied some time after they are all generated)
        const lastPart = findLast(partsToRender, part => part.kind !== 'markdownContent' || part.content.value.trim().length > 0);
        const collapsedToolsMode = this.configService.getValue('chat.agent.thinking.collapsedTools');
        const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
        if (lastThinking &&
            (collapsedToolsMode === CollapsedToolsDisplayMode.Always ||
                collapsedToolsMode === CollapsedToolsDisplayMode.WithThinking)) {
            if (!lastPart || lastPart.kind === 'thinking' || lastPart.kind === 'toolInvocation' || lastPart.kind === 'prepareToolInvocation' || lastPart.kind === 'textEditGroup' || lastPart.kind === 'notebookEditGroup') {
                return false;
            }
        }
        if (!lastPart ||
            lastPart.kind === 'references' ||
            ((lastPart.kind === 'toolInvocation' || lastPart.kind === 'toolInvocationSerialized') && (IChatToolInvocation.isComplete(lastPart) || lastPart.presentation === 'hidden')) ||
            ((lastPart.kind === 'textEditGroup' || lastPart.kind === 'notebookEditGroup') && lastPart.done && !partsToRender.some(part => part.kind === 'toolInvocation' && !IChatToolInvocation.isComplete(part))) ||
            (lastPart.kind === 'progressTask' && lastPart.deferred.isSettled) ||
            lastPart.kind === 'prepareToolInvocation' || lastPart.kind === 'mcpServersStarting') {
            return true;
        }
        return false;
    }
    getChatFileChangesSummaryPart(element) {
        if (!this.shouldShowFileChangesSummary(element)) {
            return undefined;
        }
        if (!element.model.entireResponse.value.some(part => part.kind === 'textEditGroup' || part.kind === 'notebookEditGroup')) {
            return undefined;
        }
        return { kind: 'changesSummary', requestId: element.requestId, sessionResource: element.sessionResource };
    }
    renderChatRequest(element, index, templateData) {
        templateData.rowContainer.classList.toggle('chat-response-loading', false);
        if (element.id === this.viewModel?.editing?.id) {
            this._onDidRerender.fire(templateData);
        }
        if (this.configService.getValue('chat.editRequests') !== 'none' && this.rendererOptions.editable) {
            templateData.elementDisposables.add(dom.addDisposableListener(templateData.rowContainer, dom.EventType.KEY_DOWN, e => {
                const ev = new StandardKeyboardEvent(e);
                if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                    if (this.viewModel?.editing?.id !== element.id) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        this._onDidClickRequest.fire(templateData);
                    }
                }
            }));
        }
        let content = [];
        if (!element.confirmation) {
            const markdown = isChatFollowup(element.message) ?
                element.message.message :
                this.markdownDecorationsRenderer.convertParsedRequestToMarkdown(element.sessionResource, element.message);
            content = [{ content: new MarkdownString(markdown), kind: 'markdownContent' }];
            if (this.rendererOptions.renderStyle === 'minimal' && !element.isComplete) {
                templateData.value.classList.add('inline-progress');
                templateData.elementDisposables.add(toDisposable(() => templateData.value.classList.remove('inline-progress')));
                content.push({ content: new MarkdownString('<span></span>', { supportHtml: true }), kind: 'markdownContent' });
            }
            else {
                templateData.value.classList.remove('inline-progress');
            }
        }
        dom.clearNode(templateData.value);
        const parts = [];
        let inlineSlashCommandRendered = false;
        content.forEach((data, contentIndex) => {
            const context = {
                element,
                elementIndex: index,
                contentIndex: contentIndex,
                content: content,
                preceedingContentParts: parts,
                container: templateData.rowContainer,
                editorPool: this._editorPool,
                diffEditorPool: this._diffEditorPool,
                codeBlockModelCollection: this.codeBlockModelCollection,
                currentWidth: () => this._currentLayoutWidth,
                get codeBlockStartIndex() {
                    return context.preceedingContentParts.reduce((acc, part) => acc + (part.codeblocks?.length ?? 0), 0);
                },
            };
            const newPart = this.renderChatContentPart(data, templateData, context);
            if (newPart) {
                if (this.rendererOptions.renderDetectedCommandsWithRequest
                    && !inlineSlashCommandRendered
                    && element.agentOrSlashCommandDetected && element.slashCommand
                    && data.kind === 'markdownContent' // TODO this is fishy but I didn't find a better way to render on the same inline as the MD request part
                ) {
                    if (newPart.domNode) {
                        newPart.domNode.style.display = 'inline-flex';
                    }
                    const cmdPart = this.instantiationService.createInstance(ChatAgentCommandContentPart, element.slashCommand, () => this._onDidClickRerunWithAgentOrCommandDetection.fire({ sessionResource: element.sessionResource, requestId: element.id }));
                    templateData.value.appendChild(cmdPart.domNode);
                    parts.push(cmdPart);
                    inlineSlashCommandRendered = true;
                }
                if (newPart.domNode) {
                    templateData.value.appendChild(newPart.domNode);
                }
                parts.push(newPart);
            }
        });
        if (templateData.renderedParts) {
            dispose(templateData.renderedParts);
        }
        templateData.renderedParts = parts;
        if (element.variables.length) {
            const newPart = this.renderAttachments(element.variables, element.contentReferences, templateData);
            if (newPart.domNode) {
                // p has a :last-child rule for margin
                templateData.value.appendChild(newPart.domNode);
            }
            templateData.elementDisposables.add(newPart);
        }
        this.updateItemHeightOnRender(element, templateData);
    }
    updateItemHeightOnRender(element, templateData) {
        const newHeight = templateData.rowContainer.offsetHeight;
        const fireEvent = !element.currentRenderedHeight || element.currentRenderedHeight !== newHeight;
        element.currentRenderedHeight = newHeight;
        if (fireEvent) {
            const disposable = templateData.elementDisposables.add(dom.scheduleAtNextAnimationFrame(dom.getWindow(templateData.value), () => {
                // Have to recompute the height here because codeblock rendering is currently async and it may have changed.
                // If it becomes properly sync, then this could be removed.
                if (templateData.rowContainer.isConnected) {
                    element.currentRenderedHeight = templateData.rowContainer.offsetHeight;
                    this._onDidChangeItemHeight.fire({ element, height: element.currentRenderedHeight });
                }
                disposable.dispose();
            }));
        }
    }
    updateItemHeight(templateData) {
        if (!templateData.currentElement) {
            return;
        }
        if (templateData.rowContainer.isConnected) {
            const newHeight = templateData.rowContainer.offsetHeight;
            templateData.currentElement.currentRenderedHeight = newHeight;
            this._onDidChangeItemHeight.fire({ element: templateData.currentElement, height: newHeight });
        }
    }
    /**
     *	@returns true if progressive rendering should be considered complete- the element's data is fully rendered or the view is not visible
     */
    doNextProgressiveRender(element, index, templateData, isInRenderElement) {
        if (!this._isVisible) {
            return true;
        }
        if (element.isCanceled) {
            this.traceLayout('doNextProgressiveRender', `canceled, index=${index}`);
            element.renderData = undefined;
            this.renderChatResponseBasic(element, index, templateData);
            return true;
        }
        templateData.rowContainer.classList.toggle('chat-response-loading', true);
        this.traceLayout('doNextProgressiveRender', `START progressive render, index=${index}, renderData=${JSON.stringify(element.renderData)}`);
        const contentForThisTurn = this.getNextProgressiveRenderContent(element, templateData);
        const partsToRender = this.diff(templateData.renderedParts ?? [], contentForThisTurn.content, element);
        const contentIsAlreadyRendered = partsToRender.every(part => part === null);
        if (contentIsAlreadyRendered) {
            if (contentForThisTurn.moreContentAvailable) {
                // The content that we want to render in this turn is already rendered, but there is more content to render on the next tick
                this.traceLayout('doNextProgressiveRender', 'not rendering any new content this tick, but more available');
                return false;
            }
            else if (element.isComplete) {
                // All content is rendered, and response is done, so do a normal render
                this.traceLayout('doNextProgressiveRender', `END progressive render, index=${index} and clearing renderData, response is complete`);
                element.renderData = undefined;
                this.renderChatResponseBasic(element, index, templateData);
                return true;
            }
            else {
                // Nothing new to render, stop rendering until next model update
                this.traceLayout('doNextProgressiveRender', 'caught up with the stream- no new content to render');
                if (!templateData.renderedParts) {
                    // First render? Initialize currentRenderedHeight. https://github.com/microsoft/vscode/issues/232096
                    const height = templateData.rowContainer.offsetHeight;
                    element.currentRenderedHeight = height;
                }
                return true;
            }
        }
        // Do an actual progressive render
        this.traceLayout('doNextProgressiveRender', `doing progressive render, ${partsToRender.length} parts to render`);
        this.renderChatContentDiff(partsToRender, contentForThisTurn.content, element, index, templateData);
        const height = templateData.rowContainer.offsetHeight;
        element.currentRenderedHeight = height;
        if (!isInRenderElement) {
            this._onDidChangeItemHeight.fire({ element, height });
        }
        return false;
    }
    renderChatContentDiff(partsToRender, contentForThisTurn, element, elementIndex, templateData) {
        const renderedParts = templateData.renderedParts ?? [];
        templateData.renderedParts = renderedParts;
        partsToRender.forEach((partToRender, contentIndex) => {
            if (!partToRender) {
                // null=no change
                return;
            }
            const alreadyRenderedPart = templateData.renderedParts?.[contentIndex];
            // keep existing thinking part instance during streaming and update it in place
            if (alreadyRenderedPart) {
                if (partToRender.kind === 'thinking' && alreadyRenderedPart instanceof ChatThinkingContentPart) {
                    if (!Array.isArray(partToRender.value)) {
                        alreadyRenderedPart.updateThinking(partToRender);
                    }
                    renderedParts[contentIndex] = alreadyRenderedPart;
                    return;
                }
                else if (alreadyRenderedPart instanceof ChatThinkingContentPart && this.shouldPinPart(partToRender, element)) {
                    // keep existing thinking part if we are pinning it (combining tool calls into it)
                    renderedParts[contentIndex] = alreadyRenderedPart;
                    return;
                }
                alreadyRenderedPart.dispose();
            }
            const preceedingContentParts = renderedParts.slice(0, contentIndex);
            const context = {
                element,
                elementIndex: elementIndex,
                content: contentForThisTurn,
                preceedingContentParts,
                contentIndex: contentIndex,
                container: templateData.rowContainer,
                editorPool: this._editorPool,
                diffEditorPool: this._diffEditorPool,
                codeBlockModelCollection: this.codeBlockModelCollection,
                currentWidth: () => this._currentLayoutWidth,
                get codeBlockStartIndex() {
                    return context.preceedingContentParts.reduce((acc, part) => acc + (part.codeblocks?.length ?? 0), 0);
                },
            };
            // combine tool invocations into thinking part if needed. render the tool, but do not replace the working spinner with the new part's dom node since it is already inside the thinking part.
            const lastThinking = this.getLastThinkingPart(renderedParts);
            if (lastThinking && (partToRender.kind === 'toolInvocation' || partToRender.kind === 'toolInvocationSerialized') && this.shouldPinPart(partToRender, element)) {
                const newPart = this.renderChatContentPart(partToRender, templateData, context);
                if (newPart) {
                    renderedParts[contentIndex] = newPart;
                    if (alreadyRenderedPart instanceof ChatWorkingProgressContentPart && alreadyRenderedPart?.domNode) {
                        alreadyRenderedPart.domNode.remove();
                    }
                }
                return;
            }
            const newPart = this.renderChatContentPart(partToRender, templateData, context);
            if (newPart) {
                renderedParts[contentIndex] = newPart;
                // Maybe the part can't be rendered in this context, but this shouldn't really happen
                try {
                    if (alreadyRenderedPart?.domNode) {
                        if (newPart.domNode) {
                            alreadyRenderedPart.domNode.replaceWith(newPart.domNode);
                        }
                        else {
                            alreadyRenderedPart.domNode.remove();
                        }
                    }
                    else if (newPart.domNode && !newPart.domNode.parentElement) {
                        // Only append if not already attached somewhere else (e.g. inside a thinking wrapper)
                        templateData.value.appendChild(newPart.domNode);
                    }
                }
                catch (err) {
                    this.logService.error('ChatListItemRenderer#renderChatContentDiff: error replacing part', err);
                }
            }
            else {
                alreadyRenderedPart?.domNode?.remove();
            }
        });
        // Delete previously rendered parts that are removed
        for (let i = partsToRender.length; i < renderedParts.length; i++) {
            const part = renderedParts[i];
            if (part) {
                part.dispose();
                part.domNode?.remove();
                delete renderedParts[i];
            }
        }
    }
    /**
     * Returns all content parts that should be rendered, and trimmed markdown content. We will diff this with the current rendered set.
     */
    getNextProgressiveRenderContent(element, templateData) {
        const data = this.getDataForProgressiveRender(element);
        // An unregistered setting for development- skip the word counting and smoothing, just render content as it comes in
        const renderImmediately = this.configService.getValue('chat.experimental.renderMarkdownImmediately') === true;
        const renderableResponse = annotateSpecialMarkdownContent(element.response.value);
        this.traceLayout('getNextProgressiveRenderContent', `Want to render ${data.numWordsToRender} at ${data.rate} words/s, counting...`);
        let numNeededWords = data.numWordsToRender;
        const partsToRender = [];
        // Always add the references to avoid shifting the content parts when a reference is added, and having to re-diff all the content.
        // The part will hide itself if the list is empty.
        partsToRender.push({ kind: 'references', references: element.contentReferences });
        let moreContentAvailable = false;
        for (let i = 0; i < renderableResponse.length; i++) {
            const part = renderableResponse[i];
            if (part.kind === 'markdownContent' && !renderImmediately) {
                const wordCountResult = getNWords(part.content.value, numNeededWords);
                this.traceLayout('getNextProgressiveRenderContent', `  Chunk ${i}: Want to render ${numNeededWords} words and found ${wordCountResult.returnedWordCount} words. Total words in chunk: ${wordCountResult.totalWordCount}`);
                numNeededWords -= wordCountResult.returnedWordCount;
                if (wordCountResult.isFullString) {
                    partsToRender.push(part);
                    // Consumed full markdown chunk- need to ensure that all following non-markdown parts are rendered
                    for (const nextPart of renderableResponse.slice(i + 1)) {
                        if (nextPart.kind !== 'markdownContent') {
                            i++;
                            partsToRender.push(nextPart);
                        }
                        else {
                            break;
                        }
                    }
                }
                else {
                    // Only taking part of this markdown part
                    moreContentAvailable = true;
                    partsToRender.push({ ...part, content: new MarkdownString(wordCountResult.value, part.content) });
                }
                if (numNeededWords <= 0) {
                    // Collected all words and following non-markdown parts if needed, done
                    if (renderableResponse.slice(i + 1).some(part => part.kind === 'markdownContent')) {
                        moreContentAvailable = true;
                    }
                    break;
                }
            }
            else {
                partsToRender.push(part);
            }
        }
        const lastWordCount = element.contentUpdateTimings?.lastWordCount ?? 0;
        const newRenderedWordCount = data.numWordsToRender - numNeededWords;
        const bufferWords = lastWordCount - newRenderedWordCount;
        this.traceLayout('getNextProgressiveRenderContent', `Want to render ${data.numWordsToRender} words. Rendering ${newRenderedWordCount} words. Buffer: ${bufferWords} words`);
        if (newRenderedWordCount > 0 && newRenderedWordCount !== element.renderData?.renderedWordCount) {
            // Only update lastRenderTime when we actually render new content
            element.renderData = { lastRenderTime: Date.now(), renderedWordCount: newRenderedWordCount, renderedParts: partsToRender };
        }
        if (this.shouldShowWorkingProgress(element, partsToRender, templateData)) {
            partsToRender.push({ kind: 'working' });
        }
        const fileChangesSummaryPart = this.getChatFileChangesSummaryPart(element);
        if (fileChangesSummaryPart) {
            partsToRender.push(fileChangesSummaryPart);
        }
        return { content: partsToRender, moreContentAvailable };
    }
    shouldShowFileChangesSummary(element) {
        // Only show file changes summary for local sessions - background sessions already have their own file changes part
        const isLocalSession = getChatSessionType(element.sessionResource) === localChatSessionType;
        return element.isComplete && isLocalSession && this.configService.getValue('chat.checkpoints.showFileChanges');
    }
    getDataForProgressiveRender(element) {
        const hasMarkdownParts = element.response.value.some(part => part.kind === 'markdownContent' && part.content.value.trim().length > 0);
        if (!element.isComplete && hasMarkdownParts && (element.contentUpdateTimings ? element.contentUpdateTimings.lastWordCount : 0) === 0) {
            /**
             * None of the content parts in the ongoing response have been rendered yet,
             * so we should render all existing parts without animation.
             */
            return {
                numWordsToRender: Number.MAX_SAFE_INTEGER,
                rate: Number.MAX_SAFE_INTEGER
            };
        }
        const renderData = element.renderData ?? { lastRenderTime: 0, renderedWordCount: 0 };
        const rate = this.getProgressiveRenderRate(element);
        const numWordsToRender = renderData.lastRenderTime === 0 ?
            1 :
            renderData.renderedWordCount +
                // Additional words to render beyond what's already rendered
                Math.floor((Date.now() - renderData.lastRenderTime) / 1000 * rate);
        return {
            numWordsToRender,
            rate
        };
    }
    diff(renderedParts, contentToRender, element) {
        const diff = [];
        for (let i = 0; i < contentToRender.length; i++) {
            const content = contentToRender[i];
            const renderedPart = renderedParts[i];
            if (!renderedPart || !renderedPart.hasSameContent(content, contentToRender.slice(i + 1), element)) {
                diff.push(content);
            }
            else {
                // null -> no change
                diff.push(null);
            }
        }
        return diff;
    }
    // put thinking parts inside a pinned part. commented out for now.
    shouldPinPart(part, element) {
        const collapsedToolsMode = this.configService.getValue('chat.agent.thinking.collapsedTools');
        if (collapsedToolsMode === CollapsedToolsDisplayMode.Off) {
            return false;
        }
        // Don't pin MCP tools
        const isMcpTool = (part.kind === 'toolInvocation' || part.kind === 'toolInvocationSerialized') && part.source.type === 'mcp';
        if (isMcpTool) {
            return false;
        }
        // Don't pin subagent tools and prepareToolInvocations
        const isSubagentTool = (part.kind === 'toolInvocation' || part.kind === 'toolInvocationSerialized') && (part.fromSubAgent || part.toolId === 'runSubagent');
        if (isSubagentTool) {
            return false;
        }
        // Don't pin terminal tools
        const isTerminalTool = (part.kind === 'toolInvocation' || part.kind === 'toolInvocationSerialized') && part.toolSpecificData?.kind === 'terminal';
        const isContributedTerminalToolInvocation = element
            && (element.sessionResource.scheme !== Schemas.vscodeChatInput && element.sessionResource.scheme !== Schemas.vscodeLocalChatSession) // contributed sessions
            && part.kind === 'toolInvocationSerialized' && part.toolSpecificData?.kind === 'terminal'; // contributed serialized terminal tool invocations data
        if (isTerminalTool && !isContributedTerminalToolInvocation) {
            return false;
        }
        if (part.kind === 'toolInvocation') {
            return !part.confirmationMessages;
        }
        if (part.kind === 'toolInvocationSerialized') {
            return true;
        }
        return part.kind === 'prepareToolInvocation';
    }
    isCreateToolInvocationContent(content) {
        if (!content || (content.kind !== 'toolInvocation' && content.kind !== 'toolInvocationSerialized')) {
            return false;
        }
        const containsCreate = (value) => {
            if (!value) {
                return false;
            }
            const text = typeof value === 'string' ? value : value.value;
            return text.toLowerCase().includes('create');
        };
        if (containsCreate(content.invocationMessage) || containsCreate(content.pastTenseMessage)) {
            return true;
        }
        return content.toolId.toLowerCase().includes('create');
    }
    getLastThinkingPart(renderedParts) {
        if (!renderedParts || renderedParts.length === 0) {
            return undefined;
        }
        // Search backwards for the most recent active thinking part
        for (let i = renderedParts.length - 1; i >= 0; i--) {
            const part = renderedParts[i];
            if (part instanceof ChatThinkingContentPart && part.getIsActive()) {
                return part;
            }
        }
        return undefined;
    }
    finalizeCurrentThinkingPart(context, templateData) {
        const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
        if (!lastThinking) {
            return;
        }
        const style = this.configService.getValue('chat.agent.thinkingStyle');
        if (style === ThinkingDisplayMode.CollapsedPreview) {
            lastThinking.collapseContent();
        }
        lastThinking.finalizeTitleIfDefault();
        lastThinking.resetId();
        lastThinking.markAsInactive();
    }
    renderChatContentPart(content, templateData, context) {
        try {
            const collapsedToolsMode = this.configService.getValue('chat.agent.thinking.collapsedTools');
            // if we get an empty thinking part, mark thinking as finished
            if (content.kind === 'thinking' && (Array.isArray(content.value) ? content.value.length === 0 : !content.value)) {
                const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
                lastThinking?.resetId();
                return this.renderNoContent(other => content.kind === other.kind);
            }
            const lastRenderedPart = context.preceedingContentParts.length ? context.preceedingContentParts[context.preceedingContentParts.length - 1] : undefined;
            const previousContent = context.contentIndex > 0 ? context.content[context.contentIndex - 1] : undefined;
            // Special handling for "create" tool invocations- do not end thinking if previous part is a create tool invocation and config is set.
            const shouldKeepThinkingForCreateTool = collapsedToolsMode !== CollapsedToolsDisplayMode.Off && lastRenderedPart instanceof ChatToolInvocationPart && this.isCreateToolInvocationContent(previousContent);
            const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
            const isResponseElement = isResponseVM(context.element);
            const isThinkingContent = content.kind === 'working' || content.kind === 'thinking';
            const isToolStreamingContent = isResponseElement && this.shouldPinPart(content, isResponseElement ? context.element : undefined);
            if (!shouldKeepThinkingForCreateTool && lastThinking && lastThinking.getIsActive()) {
                if (!isThinkingContent && !isToolStreamingContent) {
                    const followsThinkingPart = previousContent?.kind === 'thinking' || previousContent?.kind === 'toolInvocation' || previousContent?.kind === 'prepareToolInvocation' || previousContent?.kind === 'toolInvocationSerialized';
                    if (content.kind !== 'textEditGroup' && (context.element.isComplete || followsThinkingPart)) {
                        this.finalizeCurrentThinkingPart(context, templateData);
                    }
                }
            }
            // sometimes content is rendered out of order on re-renders so instead of looking at the current chat content part's
            // context and templateData, we have to look globally to find the active thinking part.
            if (context.element.isComplete && !isThinkingContent && !this.shouldPinPart(content, isResponseElement ? context.element : undefined)) {
                for (const templateData of this.templateDataByRequestId.values()) {
                    if (templateData.renderedParts) {
                        const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
                        if (content.kind !== 'textEditGroup' && lastThinking?.getIsActive()) {
                            this.finalizeCurrentThinkingPart(context, templateData);
                        }
                    }
                }
            }
            if (content.kind === 'treeData') {
                return this.renderTreeData(content, templateData, context);
            }
            else if (content.kind === 'multiDiffData') {
                return this.renderMultiDiffData(content, templateData, context);
            }
            else if (content.kind === 'progressMessage') {
                return this.instantiationService.createInstance(ChatProgressContentPart, content, this.chatContentMarkdownRenderer, context, undefined, undefined, undefined, undefined);
            }
            else if (content.kind === 'working') {
                return this.instantiationService.createInstance(ChatWorkingProgressContentPart, content, this.chatContentMarkdownRenderer, context);
            }
            else if (content.kind === 'progressTask' || content.kind === 'progressTaskSerialized') {
                return this.renderProgressTask(content, templateData, context);
            }
            else if (content.kind === 'command') {
                return this.instantiationService.createInstance(ChatCommandButtonContentPart, content, context);
            }
            else if (content.kind === 'textEditGroup') {
                return this.renderTextEdit(context, content, templateData);
            }
            else if (content.kind === 'confirmation') {
                return this.renderConfirmation(context, content, templateData);
            }
            else if (content.kind === 'warning') {
                return this.instantiationService.createInstance(ChatErrorContentPart, ChatErrorLevel.Warning, content.content, content, this.chatContentMarkdownRenderer);
            }
            else if (content.kind === 'markdownContent') {
                return this.renderMarkdown(content, templateData, context);
            }
            else if (content.kind === 'references') {
                return this.renderContentReferencesListData(content, undefined, context, templateData);
            }
            else if (content.kind === 'codeCitations') {
                return this.renderCodeCitations(content, context, templateData);
            }
            else if (content.kind === 'toolInvocation' || content.kind === 'toolInvocationSerialized') {
                return this.renderToolInvocation(content, context, templateData);
            }
            else if (content.kind === 'extensions') {
                return this.renderExtensionsContent(content, context, templateData);
            }
            else if (content.kind === 'pullRequest') {
                return this.renderPullRequestContent(content, context, templateData);
            }
            else if (content.kind === 'undoStop') {
                return this.renderUndoStop(content);
            }
            else if (content.kind === 'errorDetails') {
                return this.renderChatErrorDetails(context, content, templateData);
            }
            else if (content.kind === 'elicitation2' || content.kind === 'elicitationSerialized') {
                return this.renderElicitation(context, content, templateData);
            }
            else if (content.kind === 'changesSummary') {
                return this.renderChangesSummary(content, context, templateData);
            }
            else if (content.kind === 'mcpServersStarting') {
                return this.renderMcpServersInteractionRequired(content, context, templateData);
            }
            else if (content.kind === 'thinking') {
                return this.renderThinkingPart(content, context, templateData);
            }
            return this.renderNoContent(other => content.kind === other.kind);
        }
        catch (err) {
            alert(`Chat error: ${toErrorMessage(err, false)}`);
            this.logService.error('ChatListItemRenderer#renderChatContentPart: error rendering content', toErrorMessage(err, true));
            const errorPart = this.instantiationService.createInstance(ChatErrorContentPart, ChatErrorLevel.Error, new MarkdownString(localize('renderFailMsg', "Failed to render content") + `: ${toErrorMessage(err, false)}`), content, this.chatContentMarkdownRenderer);
            return {
                dispose: () => errorPart.dispose(),
                domNode: errorPart.domNode,
                hasSameContent: (other => content.kind === other.kind),
            };
        }
    }
    dispose() {
        this._announcedToolProgressKeys.clear();
        super.dispose();
    }
    renderChatErrorDetails(context, content, templateData) {
        if (!isResponseVM(context.element)) {
            return this.renderNoContent(other => content.kind === other.kind);
        }
        const isLast = context.elementIndex === this.delegate.getListLength() - 1;
        if (content.errorDetails.isQuotaExceeded) {
            const renderedError = this.instantiationService.createInstance(ChatQuotaExceededPart, context.element, content, this.chatContentMarkdownRenderer);
            renderedError.addDisposable(renderedError.onDidChangeHeight(() => this.updateItemHeight(templateData)));
            return renderedError;
        }
        else if (content.errorDetails.isRateLimited && this.chatEntitlementService.anonymous) {
            const renderedError = this.instantiationService.createInstance(ChatAnonymousRateLimitedPart, content);
            return renderedError;
        }
        else if (content.errorDetails.confirmationButtons && isLast) {
            const level = content.errorDetails.level ?? ChatErrorLevel.Error;
            const errorConfirmation = this.instantiationService.createInstance(ChatErrorConfirmationContentPart, level, new MarkdownString(content.errorDetails.message), content, content.errorDetails.confirmationButtons, this.chatContentMarkdownRenderer, context);
            errorConfirmation.addDisposable(errorConfirmation.onDidChangeHeight(() => this.updateItemHeight(templateData)));
            return errorConfirmation;
        }
        else {
            const level = content.errorDetails.level ?? ChatErrorLevel.Error;
            return this.instantiationService.createInstance(ChatErrorContentPart, level, new MarkdownString(content.errorDetails.message), content, this.chatContentMarkdownRenderer);
        }
    }
    renderUndoStop(content) {
        return this.renderNoContent(other => other.kind === content.kind && other.id === content.id);
    }
    renderNoContent(equals) {
        return {
            dispose: () => { },
            domNode: undefined,
            hasSameContent: equals,
        };
    }
    renderTreeData(content, templateData, context) {
        const data = content.treeData;
        const treeDataIndex = context.preceedingContentParts.filter(part => part instanceof ChatTreeContentPart).length;
        const treePart = this.instantiationService.createInstance(ChatTreeContentPart, data, context.element, this._treePool, treeDataIndex);
        treePart.addDisposable(treePart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        if (isResponseVM(context.element)) {
            const fileTreeFocusInfo = {
                treeDataId: data.uri.toString(),
                treeIndex: treeDataIndex,
                focus() {
                    treePart.domFocus();
                }
            };
            // TODO@roblourens there's got to be a better way to navigate trees
            treePart.addDisposable(treePart.onDidFocus(() => {
                this.focusedFileTreesByResponseId.set(context.element.id, fileTreeFocusInfo.treeIndex);
            }));
            const fileTrees = this.fileTreesByResponseId.get(context.element.id) ?? [];
            fileTrees.push(fileTreeFocusInfo);
            this.fileTreesByResponseId.set(context.element.id, distinct(fileTrees, (v) => v.treeDataId));
            treePart.addDisposable(toDisposable(() => this.fileTreesByResponseId.set(context.element.id, fileTrees.filter(v => v.treeDataId !== data.uri.toString()))));
        }
        return treePart;
    }
    renderMultiDiffData(content, templateData, context) {
        const multiDiffPart = this.instantiationService.createInstance(ChatMultiDiffContentPart, content, context.element);
        multiDiffPart.addDisposable(multiDiffPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return multiDiffPart;
    }
    renderContentReferencesListData(references, labelOverride, context, templateData) {
        const referencesPart = this.instantiationService.createInstance(ChatUsedReferencesListContentPart, references.references, labelOverride, context, this._contentReferencesListPool, { expandedWhenEmptyResponse: checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.referencesExpandedWhenEmptyResponse) });
        referencesPart.addDisposable(referencesPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return referencesPart;
    }
    renderCodeCitations(citations, context, templateData) {
        const citationsPart = this.instantiationService.createInstance(ChatCodeCitationContentPart, citations, context);
        return citationsPart;
    }
    handleRenderedCodeblocks(element, part, codeBlockStartIndex) {
        if (!part.addDisposable || part.codeblocksPartId === undefined) {
            return;
        }
        const codeBlocksByResponseId = this.codeBlocksByResponseId.get(element.id) ?? [];
        this.codeBlocksByResponseId.set(element.id, codeBlocksByResponseId);
        part.addDisposable(toDisposable(() => {
            const codeBlocksByResponseId = this.codeBlocksByResponseId.get(element.id);
            if (codeBlocksByResponseId) {
                // Only delete if this is my code block
                part.codeblocks?.forEach((info, i) => {
                    const codeblock = codeBlocksByResponseId[codeBlockStartIndex + i];
                    if (codeblock?.ownerMarkdownPartId === part.codeblocksPartId) {
                        delete codeBlocksByResponseId[codeBlockStartIndex + i];
                    }
                });
            }
        }));
        part.codeblocks?.forEach((info, i) => {
            codeBlocksByResponseId[codeBlockStartIndex + i] = info;
            part.addDisposable(thenIfNotDisposed(info.uriPromise, uri => {
                if (!uri) {
                    return;
                }
                this.codeBlocksByEditorUri.set(uri, info);
                part.addDisposable(toDisposable(() => {
                    const codeblock = this.codeBlocksByEditorUri.get(uri);
                    if (codeblock?.ownerMarkdownPartId === part.codeblocksPartId) {
                        this.codeBlocksByEditorUri.delete(uri);
                    }
                }));
            }));
        });
    }
    renderToolInvocation(toolInvocation, context, templateData) {
        const codeBlockStartIndex = context.codeBlockStartIndex;
        const part = this.instantiationService.createInstance(ChatToolInvocationPart, toolInvocation, context, this.chatContentMarkdownRenderer, this._contentReferencesListPool, this._toolEditorPool, () => this._currentLayoutWidth, this._toolInvocationCodeBlockCollection, this._announcedToolProgressKeys, codeBlockStartIndex);
        part.addDisposable(part.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        this.handleRenderedCodeblocks(context.element, part, codeBlockStartIndex);
        // handling for when we want to put tool invocations inside a thinking part
        const collapsedToolsMode = this.configService.getValue('chat.agent.thinking.collapsedTools');
        if (isResponseVM(context.element) && collapsedToolsMode !== CollapsedToolsDisplayMode.Off) {
            // create thinking part if it doesn't exist yet
            const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
            if (!lastThinking && part?.domNode && toolInvocation.presentation !== 'hidden' && this.shouldPinPart(toolInvocation, context.element) && collapsedToolsMode === CollapsedToolsDisplayMode.Always) {
                const thinkingPart = this.renderThinkingPart({
                    kind: 'thinking',
                }, context, templateData);
                if (thinkingPart instanceof ChatThinkingContentPart) {
                    thinkingPart.appendItem(part?.domNode, toolInvocation.toolId, toolInvocation);
                    thinkingPart.addDisposable(part);
                    thinkingPart.addDisposable(thinkingPart.onDidChangeHeight(() => {
                        this.updateItemHeight(templateData);
                    }));
                }
                return thinkingPart;
            }
            if (this.shouldPinPart(toolInvocation, context.element)) {
                if (lastThinking && part?.domNode && toolInvocation.presentation !== 'hidden') {
                    lastThinking.appendItem(part?.domNode, toolInvocation.toolId, toolInvocation);
                    lastThinking.addDisposable(part);
                }
            }
            else {
                this.finalizeCurrentThinkingPart(context, templateData);
            }
        }
        return part;
    }
    renderExtensionsContent(extensionsContent, context, templateData) {
        const part = this.instantiationService.createInstance(ChatExtensionsContentPart, extensionsContent);
        part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
        return part;
    }
    renderPullRequestContent(pullRequestContent, context, templateData) {
        const part = this.instantiationService.createInstance(ChatPullRequestContentPart, pullRequestContent);
        part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
        return part;
    }
    renderProgressTask(task, templateData, context) {
        if (!isResponseVM(context.element)) {
            return;
        }
        const taskPart = this.instantiationService.createInstance(ChatTaskContentPart, task, this._contentReferencesListPool, this.chatContentMarkdownRenderer, context);
        taskPart.addDisposable(taskPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return taskPart;
    }
    renderConfirmation(context, confirmation, templateData) {
        const part = this.instantiationService.createInstance(ChatConfirmationContentPart, confirmation, context);
        part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
        return part;
    }
    renderElicitation(context, elicitation, templateData) {
        if (elicitation.kind === 'elicitationSerialized' ? elicitation.isHidden : elicitation.isHidden?.get()) {
            return this.renderNoContent(other => elicitation.kind === other.kind);
        }
        const part = this.instantiationService.createInstance(ChatElicitationContentPart, elicitation, context);
        part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
        return part;
    }
    renderChangesSummary(content, context, templateData) {
        const part = this.instantiationService.createInstance(ChatCheckpointFileChangesSummaryContentPart, content, context);
        part.addDisposable(part.onDidChangeHeight(() => { this.updateItemHeight(templateData); }));
        return part;
    }
    renderAttachments(variables, contentReferences, templateData) {
        return this.instantiationService.createInstance(ChatAttachmentsContentPart, {
            variables,
            contentReferences,
            domNode: undefined
        });
    }
    renderTextEdit(context, chatTextEdit, templateData) {
        const textEditPart = this.instantiationService.createInstance(ChatTextEditContentPart, chatTextEdit, context, this.rendererOptions, this._diffEditorPool, this._currentLayoutWidth);
        textEditPart.addDisposable(textEditPart.onDidChangeHeight(() => {
            textEditPart.layout(this._currentLayoutWidth);
            this.updateItemHeight(templateData);
        }));
        return textEditPart;
    }
    renderMarkdown(markdown, templateData, context) {
        this.finalizeCurrentThinkingPart(context, templateData);
        const element = context.element;
        const fillInIncompleteTokens = isResponseVM(element) && (!element.isComplete || element.isCanceled || element.errorDetails?.responseIsFiltered || element.errorDetails?.responseIsIncomplete || !!element.renderData);
        const codeBlockStartIndex = context.codeBlockStartIndex;
        const markdownPart = templateData.instantiationService.createInstance(ChatMarkdownContentPart, markdown, context, this._editorPool, fillInIncompleteTokens, codeBlockStartIndex, this.chatContentMarkdownRenderer, undefined, this._currentLayoutWidth, this.codeBlockModelCollection, {});
        if (isRequestVM(element)) {
            markdownPart.domNode.tabIndex = 0;
            if (this.configService.getValue('chat.editRequests') === 'inline' && this.rendererOptions.editable) {
                markdownPart.domNode.classList.add('clickable');
                markdownPart.addDisposable(dom.addDisposableListener(markdownPart.domNode, dom.EventType.CLICK, (e) => {
                    if (this.viewModel?.editing?.id === element.id) {
                        return;
                    }
                    // Don't handle clicks on links
                    const clickedElement = e.target;
                    if (clickedElement.tagName === 'A') {
                        return;
                    }
                    // Don't handle if there's a text selection in the window
                    const selection = dom.getWindow(templateData.rowContainer).getSelection();
                    if (selection && !selection.isCollapsed && selection.toString().length > 0) {
                        return;
                    }
                    // Don't handle if there's a selection in code block
                    const monacoEditor = dom.findParentWithClass(clickedElement, 'monaco-editor');
                    if (monacoEditor) {
                        const editorPart = Array.from(this.editorsInUse()).find(editor => editor.element.contains(monacoEditor));
                        if (editorPart?.editor.getSelection()?.isEmpty() === false) {
                            return;
                        }
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    this._onDidClickRequest.fire(templateData);
                }));
                markdownPart.addDisposable(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), markdownPart.domNode, localize('requestMarkdownPartTitle', "Click to Edit"), { trapFocus: true }));
            }
            markdownPart.addDisposable(dom.addDisposableListener(markdownPart.domNode, dom.EventType.FOCUS, () => {
                this.hoverVisible(templateData.requestHover);
            }));
            markdownPart.addDisposable(dom.addDisposableListener(markdownPart.domNode, dom.EventType.BLUR, () => {
                this.hoverHidden(templateData.requestHover);
            }));
        }
        markdownPart.addDisposable(markdownPart.onDidChangeHeight(() => {
            markdownPart.layout(this._currentLayoutWidth);
            this.updateItemHeight(templateData);
        }));
        this.handleRenderedCodeblocks(element, markdownPart, codeBlockStartIndex);
        return markdownPart;
    }
    renderThinkingPart(content, context, templateData) {
        // TODO @justschen @karthiknadig: remove this when OSWE moves off commentary channel
        if (!content.id) {
            content.id = Date.now().toString();
        }
        // if array, we do a naive part by part rendering for now
        if (Array.isArray(content.value)) {
            if (content.value.length < 1) {
                const lastThinking = this.getLastThinkingPart(templateData.renderedParts);
                lastThinking?.finalizeTitleIfDefault();
                return this.renderNoContent(other => content.kind === other.kind);
            }
            let lastPart;
            for (const item of content.value) {
                if (item) {
                    const lastThinkingPart = lastPart instanceof ChatThinkingContentPart && lastPart.getIsActive() ? lastPart : undefined;
                    if (lastThinkingPart) {
                        lastThinkingPart.setupThinkingContainer({ ...content, value: item }, context);
                    }
                    else {
                        const itemContent = { ...content, value: item };
                        const itemPart = templateData.instantiationService.createInstance(ChatThinkingContentPart, itemContent, context, this.chatContentMarkdownRenderer);
                        itemPart.addDisposable(itemPart.onDidChangeHeight(() => this.updateItemHeight(templateData)));
                        lastPart = itemPart;
                    }
                }
            }
            return lastPart ?? this.renderNoContent(other => content.kind === other.kind);
            // non-array, handle case where we are currently thinking vs. starting a new thinking part
        }
        else {
            const lastActiveThinking = this.getLastThinkingPart(templateData.renderedParts);
            if (lastActiveThinking) {
                lastActiveThinking.setupThinkingContainer(content, context);
                return lastActiveThinking;
            }
            else {
                const part = templateData.instantiationService.createInstance(ChatThinkingContentPart, content, context, this.chatContentMarkdownRenderer);
                part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
                return part;
            }
        }
    }
    disposeElement(node, index, templateData, details) {
        this.traceLayout('disposeElement', `Disposing element, index=${index}`);
        templateData.elementDisposables.clear();
        if (templateData.currentElement && !this.viewModel?.editing) {
            this.templateDataByRequestId.delete(templateData.currentElement.id);
        }
        if (isRequestVM(node.element) && node.element.id === this.viewModel?.editing?.id && details?.onScroll) {
            this._onDidDispose.fire(templateData);
        }
        // Don't retain the toolbar context which includes chat viewmodels
        if (templateData.titleToolbar) {
            templateData.titleToolbar.context = undefined;
        }
        templateData.footerToolbar.context = undefined;
    }
    renderMcpServersInteractionRequired(content, context, templateData) {
        return this.instantiationService.createInstance(ChatMcpServersInteractionContentPart, content, context);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    hoverVisible(requestHover) {
        requestHover.style.opacity = '1';
    }
    hoverHidden(requestHover) {
        requestHover.style.opacity = '0';
    }
};
ChatListItemRenderer = ChatListItemRenderer_1 = __decorate([
    __param(6, IInstantiationService),
    __param(7, IConfigurationService),
    __param(8, ILogService),
    __param(9, IContextKeyService),
    __param(10, IThemeService),
    __param(11, ICommandService),
    __param(12, IHoverService),
    __param(13, IChatWidgetService),
    __param(14, IChatEntitlementService)
], ChatListItemRenderer);
export { ChatListItemRenderer };
let ChatListDelegate = class ChatListDelegate {
    constructor(defaultElementHeight, logService) {
        this.defaultElementHeight = defaultElementHeight;
        this.logService = logService;
    }
    _traceLayout(method, message) {
        if (forceVerboseLayoutTracing) {
            this.logService.info(`ChatListDelegate#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatListDelegate#${method}: ${message}`);
        }
    }
    getHeight(element) {
        const kind = isRequestVM(element) ? 'request' : 'response';
        const height = element.currentRenderedHeight ?? this.defaultElementHeight;
        this._traceLayout('getHeight', `${kind}, height=${height}`);
        return height;
    }
    getTemplateId(element) {
        return ChatListItemRenderer.ID;
    }
    hasDynamicHeight(element) {
        return true;
    }
};
ChatListDelegate = __decorate([
    __param(1, ILogService)
], ChatListDelegate);
export { ChatListDelegate };
const voteDownDetailLabels = {
    [ChatAgentVoteDownReason.IncorrectCode]: localize('incorrectCode', "Suggested incorrect code"),
    [ChatAgentVoteDownReason.DidNotFollowInstructions]: localize('didNotFollowInstructions', "Didn't follow instructions"),
    [ChatAgentVoteDownReason.MissingContext]: localize('missingContext', "Missing context"),
    [ChatAgentVoteDownReason.OffensiveOrUnsafe]: localize('offensiveOrUnsafe', "Offensive or unsafe"),
    [ChatAgentVoteDownReason.PoorlyWrittenOrFormatted]: localize('poorlyWrittenOrFormatted', "Poorly written or formatted"),
    [ChatAgentVoteDownReason.RefusedAValidRequest]: localize('refusedAValidRequest', "Refused a valid request"),
    [ChatAgentVoteDownReason.IncompleteCode]: localize('incompleteCode', "Incomplete code"),
    [ChatAgentVoteDownReason.WillReportIssue]: localize('reportIssue', "Report an issue"),
    [ChatAgentVoteDownReason.Other]: localize('other', "Other"),
};
let ChatVoteDownButton = class ChatVoteDownButton extends DropdownMenuActionViewItem {
    constructor(action, options, commandService, issueService, logService, contextMenuService) {
        super(action, { getActions: () => this.getActions(), }, contextMenuService, {
            ...options,
            classNames: ThemeIcon.asClassNameArray(Codicon.thumbsdown),
        });
        this.commandService = commandService;
        this.issueService = issueService;
        this.logService = logService;
    }
    getActions() {
        return [
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.IncorrectCode),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.DidNotFollowInstructions),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.IncompleteCode),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.MissingContext),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.PoorlyWrittenOrFormatted),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.RefusedAValidRequest),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.OffensiveOrUnsafe),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.Other),
            {
                id: 'reportIssue',
                label: voteDownDetailLabels[ChatAgentVoteDownReason.WillReportIssue],
                tooltip: '',
                enabled: true,
                class: undefined,
                run: async (context) => {
                    if (!isResponseVM(context)) {
                        this.logService.error('ChatVoteDownButton#run: invalid context');
                        return;
                    }
                    await this.commandService.executeCommand(MarkUnhelpfulActionId, context, ChatAgentVoteDownReason.WillReportIssue);
                    await this.issueService.openReporter({ extensionId: context.agent?.extensionId.value });
                }
            }
        ];
    }
    render(container) {
        super.render(container);
        this.element?.classList.toggle('checked', this.action.checked);
    }
    getVoteDownDetailAction(reason) {
        const label = voteDownDetailLabels[reason];
        return {
            id: MarkUnhelpfulActionId,
            label,
            tooltip: '',
            enabled: true,
            checked: this._context.voteDownReason === reason,
            class: undefined,
            run: async (context) => {
                if (!isResponseVM(context)) {
                    this.logService.error('ChatVoteDownButton#getVoteDownDetailAction: invalid context');
                    return;
                }
                await this.commandService.executeCommand(MarkUnhelpfulActionId, context, reason);
            }
        };
    }
};
ChatVoteDownButton = __decorate([
    __param(2, ICommandService),
    __param(3, IWorkbenchIssueService),
    __param(4, ILogService),
    __param(5, IContextMenuService)
], ChatVoteDownButton);
export { ChatVoteDownButton };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdExpc3RSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdExpc3RSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLDBCQUEwQixFQUFzQyxNQUFNLGdFQUFnRSxDQUFDO0FBQ2hKLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBSXBHLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0s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
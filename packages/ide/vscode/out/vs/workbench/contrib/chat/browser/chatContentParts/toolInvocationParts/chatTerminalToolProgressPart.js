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
import { h } from '../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { isMarkdownString, MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { migrateLegacyTerminalToolSpecificData } from '../../../common/chat.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatQueryTitlePart } from '../chatConfirmationWidget.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { ChatProgressSubPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
import '../media/chatTerminalToolProgressPart.css';
import { Action } from '../../../../../../base/common/actions.js';
import { ITerminalChatService, ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../../terminal/browser/terminal.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { getTerminalCommandDecorationState, getTerminalCommandDecorationTooltip } from '../../../../terminal/browser/xterm/decorationStyles.js';
import * as dom from '../../../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { localize } from '../../../../../../nls.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { URI } from '../../../../../../base/common/uri.js';
import { stripIcons } from '../../../../../../base/common/iconLabels.js';
import { IAccessibleViewService } from '../../../../../../platform/accessibility/browser/accessibleView.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { DetachedTerminalCommandMirror, DetachedTerminalSnapshotMirror } from '../../../../terminal/browser/chatTerminalCommandMirror.js';
import { TerminalLocation } from '../../../../../../platform/terminal/common/terminal.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { isNumber } from '../../../../../../base/common/types.js';
import { removeAnsiEscapeCodes } from '../../../../../../base/common/strings.js';
import { PANEL_BACKGROUND } from '../../../../../common/theme.js';
import { editorBackground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
const MIN_OUTPUT_ROWS = 1;
const MAX_OUTPUT_ROWS = 10;
/**
 * Remembers whether a tool invocation was last expanded so state survives virtualization re-renders.
 */
const expandedStateByInvocation = new WeakMap();
let TerminalCommandDecoration = class TerminalCommandDecoration extends Disposable {
    constructor(_options, _hoverService) {
        super();
        this._options = _options;
        this._hoverService = _hoverService;
        const decorationElements = h('span.chat-terminal-command-decoration@decoration', { role: 'img', tabIndex: 0 });
        this._element = decorationElements.decoration;
        this._attachElementToContainer();
    }
    _attachElementToContainer() {
        const container = this._options.getCommandBlock();
        if (!container) {
            return;
        }
        const decoration = this._element;
        if (!decoration.isConnected || decoration.parentElement !== container) {
            const icon = this._options.getIconElement();
            if (icon && icon.parentElement === container) {
                icon.insertAdjacentElement('afterend', decoration);
            }
            else {
                container.insertBefore(decoration, container.firstElementChild ?? null);
            }
        }
        this._register(this._hoverService.setupDelayedHover(decoration, () => ({
            content: this._getHoverText()
        })));
        this._attachInteractionHandlers(decoration);
    }
    _getHoverText() {
        const command = this._options.getResolvedCommand();
        const storedState = this._options.terminalData.terminalCommandState;
        return getTerminalCommandDecorationTooltip(command, storedState) || '';
    }
    update(command) {
        this._attachElementToContainer();
        const decoration = this._element;
        const resolvedCommand = command ?? this._options.getResolvedCommand();
        this._apply(decoration, resolvedCommand);
    }
    _apply(decoration, command) {
        const terminalData = this._options.terminalData;
        let storedState = terminalData.terminalCommandState;
        if (command) {
            const existingState = terminalData.terminalCommandState ?? {};
            terminalData.terminalCommandState = {
                ...existingState,
                exitCode: command.exitCode,
                timestamp: command.timestamp ?? existingState.timestamp,
                duration: command.duration ?? existingState.duration
            };
            storedState = terminalData.terminalCommandState;
        }
        else if (!storedState) {
            const now = Date.now();
            terminalData.terminalCommandState = { exitCode: undefined, timestamp: now };
            storedState = terminalData.terminalCommandState;
        }
        const decorationState = getTerminalCommandDecorationState(command, storedState);
        const tooltip = getTerminalCommandDecorationTooltip(command, storedState);
        decoration.className = `chat-terminal-command-decoration ${"terminal-command-decoration" /* DecorationSelector.CommandDecoration */}`;
        decoration.classList.add("codicon" /* DecorationSelector.Codicon */);
        for (const className of decorationState.classNames) {
            decoration.classList.add(className);
        }
        decoration.classList.add(...ThemeIcon.asClassNameArray(decorationState.icon));
        const isInteractive = !decoration.classList.contains("default" /* DecorationSelector.Default */);
        decoration.tabIndex = isInteractive ? 0 : -1;
        if (isInteractive) {
            decoration.removeAttribute('aria-disabled');
        }
        else {
            decoration.setAttribute('aria-disabled', 'true');
        }
        const hoverText = tooltip || decorationState.hoverMessage;
        if (hoverText) {
            decoration.setAttribute('aria-label', hoverText);
        }
        else {
            decoration.removeAttribute('aria-label');
        }
    }
    _attachInteractionHandlers(decoration) {
        if (this._interactionElement === decoration) {
            return;
        }
        this._interactionElement = decoration;
    }
};
TerminalCommandDecoration = __decorate([
    __param(1, IHoverService)
], TerminalCommandDecoration);
let ChatTerminalToolProgressPart = class ChatTerminalToolProgressPart extends BaseChatToolInvocationSubPart {
    get codeblocks() {
        return this.markdownPart?.codeblocks ?? [];
    }
    get elementIndex() {
        return this._elementIndex;
    }
    get contentIndex() {
        return this._contentIndex;
    }
    constructor(toolInvocation, terminalData, context, renderer, editorPool, currentWidthDelegate, codeBlockStartIndex, codeBlockModelCollection, _instantiationService, _terminalChatService, _terminalService, _contextKeyService, _chatWidgetService, _keybindingService) {
        super(toolInvocation);
        this._instantiationService = _instantiationService;
        this._terminalChatService = _terminalChatService;
        this._terminalService = _terminalService;
        this._contextKeyService = _contextKeyService;
        this._chatWidgetService = _chatWidgetService;
        this._keybindingService = _keybindingService;
        this._showOutputAction = this._register(new MutableDisposable());
        this._showOutputActionAdded = false;
        this._focusAction = this._register(new MutableDisposable());
        this._elementIndex = context.elementIndex;
        this._contentIndex = context.contentIndex;
        this._sessionResource = context.element.sessionResource;
        terminalData = migrateLegacyTerminalToolSpecificData(terminalData);
        this._terminalData = terminalData;
        this._terminalCommandUri = terminalData.terminalCommandUri ? URI.revive(terminalData.terminalCommandUri) : undefined;
        this._storedCommandId = this._terminalCommandUri ? new URLSearchParams(this._terminalCommandUri.query ?? '').get('command') ?? undefined : undefined;
        this._isSerializedInvocation = (toolInvocation.kind === 'toolInvocationSerialized');
        const elements = h('.chat-terminal-content-part@container', [
            h('.chat-terminal-content-title@title', [
                h('.chat-terminal-command-block@commandBlock')
            ]),
            h('.chat-terminal-content-message@message')
        ]);
        this._titleElement = elements.title;
        const command = terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
        this._commandText = command;
        this._terminalOutputContextKey = ChatContextKeys.inChatTerminalToolOutput.bindTo(this._contextKeyService);
        this._decoration = this._register(this._instantiationService.createInstance(TerminalCommandDecoration, {
            terminalData: this._terminalData,
            getCommandBlock: () => elements.commandBlock,
            getIconElement: () => undefined,
            getResolvedCommand: () => this._getResolvedCommand()
        }));
        const titlePart = this._register(_instantiationService.createInstance(ChatQueryTitlePart, elements.commandBlock, new MarkdownString([
            `\`\`\`${terminalData.language}`,
            `${command.replaceAll('```', '\\`\\`\\`')}`,
            `\`\`\``
        ].join('\n'), { supportThemeIcons: true }), undefined));
        this._register(titlePart.onDidChangeHeight(() => {
            this._decoration.update();
            this._onDidChangeHeight.fire();
        }));
        this._outputView = this._register(this._instantiationService.createInstance(ChatTerminalToolOutputSection, () => this._onDidChangeHeight.fire(), () => this._ensureTerminalInstance(), () => this._getResolvedCommand(), () => this._terminalData.terminalCommandOutput, () => this._commandText, () => this._terminalData.terminalTheme));
        elements.container.append(this._outputView.domNode);
        this._register(this._outputView.onDidFocus(() => this._handleOutputFocus()));
        this._register(this._outputView.onDidBlur(e => this._handleOutputBlur(e)));
        this._register(toDisposable(() => this._handleDispose()));
        this._register(this._keybindingService.onDidUpdateKeybindings(() => {
            this._focusAction.value?.refreshKeybindingTooltip();
            this._showOutputAction.value?.refreshKeybindingTooltip();
        }));
        const actionBarEl = h('.chat-terminal-action-bar@actionBar');
        elements.title.append(actionBarEl.root);
        this._actionBar = this._register(new ActionBar(actionBarEl.actionBar, {}));
        this._initializeTerminalActions();
        this._terminalService.whenConnected.then(() => this._initializeTerminalActions());
        let pastTenseMessage;
        if (toolInvocation.pastTenseMessage) {
            pastTenseMessage = `${typeof toolInvocation.pastTenseMessage === 'string' ? toolInvocation.pastTenseMessage : toolInvocation.pastTenseMessage.value}`;
        }
        const markdownContent = new MarkdownString(pastTenseMessage, {
            supportThemeIcons: true,
            isTrusted: isMarkdownString(toolInvocation.pastTenseMessage) ? toolInvocation.pastTenseMessage.isTrusted : false,
        });
        const chatMarkdownContent = {
            kind: 'markdownContent',
            content: markdownContent,
        };
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on'
            }
        };
        const markdownOptions = {
            codeBlockRenderOptions,
            accessibilityOptions: pastTenseMessage ? {
                statusMessage: localize('terminalToolCommand', '{0}', stripIcons(pastTenseMessage))
            } : undefined
        };
        this.markdownPart = this._register(_instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, context, editorPool, false, codeBlockStartIndex, renderer, {}, currentWidthDelegate(), codeBlockModelCollection, markdownOptions));
        this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        elements.message.append(this.markdownPart.domNode);
        const progressPart = this._register(_instantiationService.createInstance(ChatProgressSubPart, elements.container, this.getIcon(), terminalData.autoApproveInfo));
        this.domNode = progressPart.domNode;
        this._decoration.update();
        if (expandedStateByInvocation.get(toolInvocation)) {
            void this._toggleOutput(true);
        }
        this._register(this._terminalChatService.registerProgressPart(this));
    }
    async _initializeTerminalActions() {
        if (this._store.isDisposed) {
            return;
        }
        const terminalToolSessionId = this._terminalData.terminalToolSessionId;
        if (!terminalToolSessionId) {
            this._addActions();
            return;
        }
        const attachInstance = async (instance) => {
            if (this._store.isDisposed) {
                return;
            }
            if (!instance) {
                if (this._isSerializedInvocation) {
                    this._clearCommandAssociation();
                }
                this._addActions(undefined, terminalToolSessionId);
                return;
            }
            const isNewInstance = this._terminalInstance !== instance;
            if (isNewInstance) {
                this._terminalInstance = instance;
                this._registerInstanceListener(instance);
            }
            // Always call _addActions to ensure actions are added, even if instance was set earlier
            // (e.g., by the output view during expanded state restoration)
            this._addActions(instance, terminalToolSessionId);
        };
        const initialInstance = await this._terminalChatService.getTerminalInstanceByToolSessionId(terminalToolSessionId);
        await attachInstance(initialInstance);
        if (!initialInstance) {
            this._addActions(undefined, terminalToolSessionId);
        }
        if (this._store.isDisposed) {
            return;
        }
        if (!this._terminalSessionRegistration) {
            const listener = this._terminalChatService.onDidRegisterTerminalInstanceWithToolSession(async (instance) => {
                const registeredInstance = await this._terminalChatService.getTerminalInstanceByToolSessionId(terminalToolSessionId);
                if (instance !== registeredInstance) {
                    return;
                }
                this._terminalSessionRegistration?.dispose();
                this._terminalSessionRegistration = undefined;
                await attachInstance(instance);
            });
            this._terminalSessionRegistration = this._store.add(listener);
        }
    }
    _addActions(terminalInstance, terminalToolSessionId) {
        if (this._store.isDisposed) {
            return;
        }
        const actionBar = this._actionBar;
        this._removeFocusAction();
        const resolvedCommand = this._getResolvedCommand(terminalInstance);
        if (terminalInstance) {
            const isTerminalHidden = terminalInstance && terminalToolSessionId ? this._terminalChatService.isBackgroundTerminal(terminalToolSessionId) : false;
            const focusAction = this._instantiationService.createInstance(FocusChatInstanceAction, terminalInstance, resolvedCommand, this._terminalCommandUri, this._storedCommandId, isTerminalHidden);
            this._focusAction.value = focusAction;
            actionBar.push(focusAction, { icon: true, label: false, index: 0 });
        }
        this._ensureShowOutputAction(resolvedCommand);
        this._decoration.update(resolvedCommand);
    }
    _getResolvedCommand(instance) {
        const target = instance ?? this._terminalInstance;
        if (!target) {
            return undefined;
        }
        return this._resolveCommand(target);
    }
    _ensureShowOutputAction(command) {
        if (this._store.isDisposed) {
            return;
        }
        const resolvedCommand = command ?? this._getResolvedCommand();
        const hasSnapshot = !!this._terminalData.terminalCommandOutput;
        if (!resolvedCommand && !hasSnapshot) {
            return;
        }
        let showOutputAction = this._showOutputAction.value;
        if (!showOutputAction) {
            showOutputAction = this._instantiationService.createInstance(ToggleChatTerminalOutputAction, () => this._toggleOutputFromAction());
            this._showOutputAction.value = showOutputAction;
            const exitCode = resolvedCommand?.exitCode ?? this._terminalData.terminalCommandState?.exitCode;
            if (exitCode) {
                this._toggleOutput(true);
            }
        }
        showOutputAction.syncPresentation(this._outputView.isExpanded);
        const actionBar = this._actionBar;
        if (this._showOutputActionAdded) {
            const existingIndex = actionBar.viewItems.findIndex(item => item.action === showOutputAction);
            if (existingIndex >= 0 && existingIndex !== actionBar.length() - 1) {
                actionBar.pull(existingIndex);
                this._showOutputActionAdded = false;
            }
            else if (existingIndex >= 0) {
                return;
            }
        }
        if (this._showOutputActionAdded) {
            return;
        }
        actionBar.push([showOutputAction], { icon: true, label: false });
        this._showOutputActionAdded = true;
    }
    _clearCommandAssociation(options) {
        this._terminalCommandUri = undefined;
        this._storedCommandId = undefined;
        if (options?.clearPersistentData) {
            if (this._terminalData.terminalCommandUri) {
                delete this._terminalData.terminalCommandUri;
            }
            if (this._terminalData.terminalToolSessionId) {
                delete this._terminalData.terminalToolSessionId;
            }
        }
        this._decoration.update();
    }
    _registerInstanceListener(terminalInstance) {
        const commandDetectionListener = this._register(new MutableDisposable());
        const tryResolveCommand = async () => {
            const resolvedCommand = this._resolveCommand(terminalInstance);
            this._addActions(terminalInstance, this._terminalData.terminalToolSessionId);
            return resolvedCommand;
        };
        const attachCommandDetection = async (commandDetection) => {
            commandDetectionListener.clear();
            if (!commandDetection) {
                await tryResolveCommand();
                return;
            }
            commandDetectionListener.value = commandDetection.onCommandFinished(() => {
                this._addActions(terminalInstance, this._terminalData.terminalToolSessionId);
                const resolvedCommand = this._getResolvedCommand(terminalInstance);
                if (resolvedCommand?.endMarker) {
                    commandDetectionListener.clear();
                }
            });
            const resolvedImmediately = await tryResolveCommand();
            if (resolvedImmediately?.endMarker) {
                commandDetectionListener.clear();
                return;
            }
        };
        attachCommandDetection(terminalInstance.capabilities.get(2 /* TerminalCapability.CommandDetection */));
        this._register(terminalInstance.capabilities.onDidAddCommandDetectionCapability(cd => attachCommandDetection(cd)));
        const instanceListener = this._register(terminalInstance.onDisposed(() => {
            if (this._terminalInstance === terminalInstance) {
                this._terminalInstance = undefined;
            }
            this._clearCommandAssociation({ clearPersistentData: true });
            commandDetectionListener.clear();
            if (!this._store.isDisposed) {
                this._actionBar.clear();
            }
            this._removeFocusAction();
            this._showOutputActionAdded = false;
            this._showOutputAction.clear();
            this._addActions(undefined, this._terminalData.terminalToolSessionId);
            instanceListener.dispose();
        }));
    }
    _removeFocusAction() {
        if (this._store.isDisposed) {
            return;
        }
        const actionBar = this._actionBar;
        const focusAction = this._focusAction.value;
        if (actionBar && focusAction) {
            const existingIndex = actionBar.viewItems.findIndex(item => item.action === focusAction);
            if (existingIndex >= 0) {
                actionBar.pull(existingIndex);
            }
        }
        this._focusAction.clear();
    }
    async _toggleOutput(expanded) {
        const didChange = await this._outputView.toggle(expanded);
        const isExpanded = this._outputView.isExpanded;
        this._titleElement.classList.toggle('chat-terminal-content-title-no-bottom-radius', isExpanded);
        this._showOutputAction.value?.syncPresentation(isExpanded);
        if (didChange) {
            expandedStateByInvocation.set(this.toolInvocation, isExpanded);
        }
        return didChange;
    }
    async _ensureTerminalInstance() {
        if (this._terminalInstance?.isDisposed) {
            this._terminalInstance = undefined;
        }
        if (!this._terminalInstance && this._terminalData.terminalToolSessionId) {
            this._terminalInstance = await this._terminalChatService.getTerminalInstanceByToolSessionId(this._terminalData.terminalToolSessionId);
            if (this._terminalInstance?.isDisposed) {
                this._terminalInstance = undefined;
            }
        }
        return this._terminalInstance;
    }
    _handleOutputFocus() {
        this._terminalOutputContextKey.set(true);
        this._terminalChatService.setFocusedProgressPart(this);
        this._outputView.updateAriaLabel();
    }
    _handleOutputBlur(event) {
        const nextTarget = event.relatedTarget;
        if (this._outputView.containsElement(nextTarget)) {
            return;
        }
        this._terminalOutputContextKey.reset();
        this._terminalChatService.clearFocusedProgressPart(this);
    }
    _handleDispose() {
        this._terminalOutputContextKey.reset();
        this._terminalChatService.clearFocusedProgressPart(this);
    }
    getCommandAndOutputAsText() {
        return this._outputView.getCommandAndOutputAsText();
    }
    focusOutput() {
        this._outputView.focus();
    }
    _focusChatInput() {
        const widget = this._chatWidgetService.getWidgetBySessionResource(this._sessionResource);
        widget?.focusInput();
    }
    async focusTerminal() {
        if (this._focusAction.value) {
            await this._focusAction.value.run();
            return;
        }
        if (this._terminalCommandUri) {
            this._terminalService.openResource(this._terminalCommandUri);
        }
    }
    async toggleOutputFromKeyboard() {
        if (!this._outputView.isExpanded) {
            await this._toggleOutput(true);
            this.focusOutput();
            return;
        }
        await this._collapseOutputAndFocusInput();
    }
    async _toggleOutputFromAction() {
        if (!this._outputView.isExpanded) {
            await this._toggleOutput(true);
            return;
        }
        await this._toggleOutput(false);
    }
    async _collapseOutputAndFocusInput() {
        if (this._outputView.isExpanded) {
            await this._toggleOutput(false);
        }
        this._focusChatInput();
    }
    _resolveCommand(instance) {
        if (instance.isDisposed) {
            return undefined;
        }
        const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = commandDetection?.commands;
        if (!commands || commands.length === 0) {
            return undefined;
        }
        return commands.find(c => c.id === this._terminalData.terminalCommandId);
    }
};
ChatTerminalToolProgressPart = __decorate([
    __param(8, IInstantiationService),
    __param(9, ITerminalChatService),
    __param(10, ITerminalService),
    __param(11, IContextKeyService),
    __param(12, IChatWidgetService),
    __param(13, IKeybindingService)
], ChatTerminalToolProgressPart);
export { ChatTerminalToolProgressPart };
let ChatTerminalToolOutputSection = class ChatTerminalToolOutputSection extends Disposable {
    get isExpanded() {
        return this.domNode.classList.contains('expanded');
    }
    get onDidFocus() { return this._onDidFocusEmitter.event; }
    get onDidBlur() { return this._onDidBlurEmitter.event; }
    constructor(_onDidChangeHeight, _ensureTerminalInstance, _resolveCommand, _getTerminalCommandOutput, _getCommandText, _getStoredTheme, _accessibleViewService, _instantiationService, _terminalConfigurationService, _themeService, _contextKeyService) {
        super();
        this._onDidChangeHeight = _onDidChangeHeight;
        this._ensureTerminalInstance = _ensureTerminalInstance;
        this._resolveCommand = _resolveCommand;
        this._getTerminalCommandOutput = _getTerminalCommandOutput;
        this._getCommandText = _getCommandText;
        this._getStoredTheme = _getStoredTheme;
        this._accessibleViewService = _accessibleViewService;
        this._instantiationService = _instantiationService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._themeService = _themeService;
        this._contextKeyService = _contextKeyService;
        this._onDidFocusEmitter = this._register(new Emitter());
        this._onDidBlurEmitter = this._register(new Emitter());
        const containerElements = h('.chat-terminal-output-container@container', [
            h('.chat-terminal-output-body@body', [
                h('.chat-terminal-output-content@content', [
                    h('.chat-terminal-output-terminal@terminal'),
                    h('.chat-terminal-output-empty@empty')
                ])
            ])
        ]);
        this.domNode = containerElements.container;
        this.domNode.classList.add('collapsed');
        this._outputBody = containerElements.body;
        this._contentContainer = containerElements.content;
        this._terminalContainer = containerElements.terminal;
        this._emptyElement = containerElements.empty;
        this._contentContainer.appendChild(this._emptyElement);
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.FOCUS_IN, () => this._onDidFocusEmitter.fire()));
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.FOCUS_OUT, event => this._onDidBlurEmitter.fire(event)));
        const resizeObserver = new ResizeObserver(() => this._handleResize());
        resizeObserver.observe(this.domNode);
        this._register(toDisposable(() => resizeObserver.disconnect()));
        this._applyBackgroundColor();
        this._register(this._themeService.onDidColorThemeChange(() => this._applyBackgroundColor()));
    }
    async toggle(expanded) {
        const currentlyExpanded = this.isExpanded;
        if (expanded === currentlyExpanded) {
            if (expanded) {
                await this._updateTerminalContent();
            }
            return false;
        }
        this._setExpanded(expanded);
        if (!expanded) {
            this._renderedOutputHeight = undefined;
            this._onDidChangeHeight();
            return true;
        }
        if (!this._scrollableContainer) {
            await this._createScrollableContainer();
        }
        await this._updateTerminalContent();
        this._layoutOutput();
        this._scrollOutputToBottom();
        this._scheduleOutputRelayout();
        return true;
    }
    focus() {
        this._scrollableContainer?.getDomNode().focus();
    }
    containsElement(element) {
        return !!element && this.domNode.contains(element);
    }
    updateAriaLabel() {
        if (!this._scrollableContainer) {
            return;
        }
        const command = this._resolveCommand();
        const commandText = command?.command ?? this._getCommandText();
        if (!commandText) {
            return;
        }
        const ariaLabel = localize('chatTerminalOutputAriaLabel', 'Terminal output for {0}', commandText);
        const scrollableDomNode = this._scrollableContainer.getDomNode();
        scrollableDomNode.setAttribute('role', 'region');
        const accessibleViewHint = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.terminalChatOutput" /* AccessibilityVerbositySettingId.TerminalChatOutput */);
        const label = accessibleViewHint
            ? ariaLabel + ', ' + accessibleViewHint
            : ariaLabel;
        scrollableDomNode.setAttribute('aria-label', label);
    }
    getCommandAndOutputAsText() {
        const command = this._resolveCommand();
        const commandText = command?.command ?? this._getCommandText();
        if (!commandText) {
            return undefined;
        }
        const commandHeader = localize('chatTerminalOutputAccessibleViewHeader', 'Command: {0}', commandText);
        if (command) {
            const rawOutput = command.getOutput();
            if (!rawOutput || rawOutput.trim().length === 0) {
                return `${commandHeader}\n${localize('chat.terminalOutputEmpty', 'No output was produced by the command.')}`;
            }
            const lines = rawOutput.split('\n');
            return `${commandHeader}\n${lines.join('\n').trimEnd()}`;
        }
        const snapshot = this._getTerminalCommandOutput();
        if (!snapshot) {
            return `${commandHeader}\n${localize('chatTerminalOutputUnavailable', 'Command output is no longer available.')}`;
        }
        const plain = removeAnsiEscapeCodes((snapshot.text ?? ''));
        if (!plain.trim().length) {
            return `${commandHeader}\n${localize('chat.terminalOutputEmpty', 'No output was produced by the command.')}`;
        }
        let outputText = plain.trimEnd();
        if (snapshot.truncated) {
            outputText += `\n${localize('chatTerminalOutputTruncated', 'Output truncated.')}`;
        }
        return `${commandHeader}\n${outputText}`;
    }
    _setExpanded(expanded) {
        this.domNode.classList.toggle('expanded', expanded);
        this.domNode.classList.toggle('collapsed', !expanded);
    }
    async _createScrollableContainer() {
        this._scrollableContainer = this._register(new DomScrollableElement(this._outputBody, {
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            handleMouseWheel: true
        }));
        const scrollableDomNode = this._scrollableContainer.getDomNode();
        scrollableDomNode.tabIndex = 0;
        this.domNode.appendChild(scrollableDomNode);
        this.updateAriaLabel();
    }
    async _updateTerminalContent() {
        const liveTerminalInstance = await this._resolveLiveTerminal();
        const command = liveTerminalInstance ? this._resolveCommand() : undefined;
        const snapshot = this._getTerminalCommandOutput();
        if (liveTerminalInstance && command) {
            const handled = await this._renderLiveOutput(liveTerminalInstance, command);
            if (handled) {
                return;
            }
        }
        this._disposeLiveMirror();
        if (snapshot) {
            await this._renderSnapshotOutput(snapshot);
            return;
        }
        this._renderUnavailableMessage(liveTerminalInstance);
    }
    async _renderLiveOutput(liveTerminalInstance, command) {
        if (this._mirror) {
            return true;
        }
        await liveTerminalInstance.xtermReadyPromise;
        if (liveTerminalInstance.isDisposed || !liveTerminalInstance.xterm) {
            this._disposeLiveMirror();
            return false;
        }
        this._mirror = this._register(this._instantiationService.createInstance(DetachedTerminalCommandMirror, liveTerminalInstance.xterm, command));
        await this._mirror.attach(this._terminalContainer);
        const result = await this._mirror.renderCommand();
        if (!result || result.lineCount === 0) {
            this._showEmptyMessage(localize('chat.terminalOutputEmpty', 'No output was produced by the command.'));
        }
        else {
            this._hideEmptyMessage();
        }
        this._layoutOutput(result?.lineCount ?? 0);
        return true;
    }
    async _renderSnapshotOutput(snapshot) {
        if (this._snapshotMirror) {
            this._layoutOutput(snapshot.lineCount ?? 0);
            return;
        }
        dom.clearNode(this._terminalContainer);
        this._snapshotMirror = this._register(this._instantiationService.createInstance(DetachedTerminalSnapshotMirror, snapshot, this._getStoredTheme));
        await this._snapshotMirror.attach(this._terminalContainer);
        this._snapshotMirror.setOutput(snapshot);
        const result = await this._snapshotMirror.render();
        const hasText = !!snapshot.text && snapshot.text.length > 0;
        if (hasText) {
            this._hideEmptyMessage();
        }
        else {
            this._showEmptyMessage(localize('chat.terminalOutputEmpty', 'No output was produced by the command.'));
        }
        const lineCount = result?.lineCount ?? snapshot.lineCount ?? 0;
        this._layoutOutput(lineCount);
    }
    _renderUnavailableMessage(liveTerminalInstance) {
        dom.clearNode(this._terminalContainer);
        this._lastRenderedLineCount = undefined;
        if (!liveTerminalInstance) {
            this._showEmptyMessage(localize('chat.terminalOutputTerminalMissing', 'Terminal is no longer available.'));
        }
        else {
            this._showEmptyMessage(localize('chat.terminalOutputCommandMissing', 'Command information is not available.'));
        }
    }
    async _resolveLiveTerminal() {
        const instance = await this._ensureTerminalInstance();
        return instance && !instance.isDisposed ? instance : undefined;
    }
    _showEmptyMessage(message) {
        this._emptyElement.textContent = message;
        this._terminalContainer.classList.add('chat-terminal-output-terminal-no-output');
        this.domNode.classList.add('chat-terminal-output-container-no-output');
    }
    _hideEmptyMessage() {
        this._emptyElement.textContent = '';
        this._terminalContainer.classList.remove('chat-terminal-output-terminal-no-output');
        this.domNode.classList.remove('chat-terminal-output-container-no-output');
    }
    _disposeLiveMirror() {
        if (this._mirror) {
            this._mirror.dispose();
            this._mirror = undefined;
        }
    }
    _scheduleOutputRelayout() {
        dom.getActiveWindow().requestAnimationFrame(() => {
            this._layoutOutput();
            this._scrollOutputToBottom();
        });
    }
    _handleResize() {
        if (!this._scrollableContainer) {
            return;
        }
        if (this.isExpanded) {
            this._layoutOutput();
            this._scrollOutputToBottom();
        }
        else {
            this._scrollableContainer.scanDomNode();
        }
    }
    _layoutOutput(lineCount) {
        if (!this._scrollableContainer) {
            return;
        }
        if (lineCount !== undefined) {
            this._lastRenderedLineCount = lineCount;
        }
        else {
            lineCount = this._lastRenderedLineCount;
        }
        this._scrollableContainer.scanDomNode();
        if (!this.isExpanded || lineCount === undefined) {
            return;
        }
        const scrollableDomNode = this._scrollableContainer.getDomNode();
        const rowHeight = this._computeRowHeightPx();
        const padding = this._getOutputPadding();
        const minHeight = rowHeight * MIN_OUTPUT_ROWS + padding;
        const maxHeight = rowHeight * MAX_OUTPUT_ROWS + padding;
        const contentHeight = this._getOutputContentHeight(lineCount, rowHeight, padding);
        const clampedHeight = Math.min(contentHeight, maxHeight);
        const measuredBodyHeight = Math.max(this._outputBody.clientHeight, minHeight);
        const appliedHeight = Math.min(clampedHeight, measuredBodyHeight);
        scrollableDomNode.style.height = appliedHeight < maxHeight ? `${appliedHeight}px` : '';
        this._scrollableContainer.scanDomNode();
        if (this._renderedOutputHeight !== appliedHeight) {
            this._renderedOutputHeight = appliedHeight;
            this._onDidChangeHeight();
        }
    }
    _scrollOutputToBottom() {
        if (!this._scrollableContainer) {
            return;
        }
        const dimensions = this._scrollableContainer.getScrollDimensions();
        this._scrollableContainer.setScrollPosition({ scrollTop: dimensions.scrollHeight });
    }
    _getOutputContentHeight(lineCount, rowHeight, padding) {
        const contentRows = Math.max(lineCount, MIN_OUTPUT_ROWS);
        const adjustedRows = contentRows + (lineCount > MAX_OUTPUT_ROWS ? 1 : 0);
        return (adjustedRows * rowHeight) + padding;
    }
    _getOutputPadding() {
        const style = dom.getComputedStyle(this._outputBody);
        const paddingTop = Number.parseFloat(style.paddingTop || '0');
        const paddingBottom = Number.parseFloat(style.paddingBottom || '0');
        return paddingTop + paddingBottom;
    }
    _computeRowHeightPx() {
        const window = dom.getActiveWindow();
        const font = this._terminalConfigurationService.getFont(window);
        const hasCharHeight = isNumber(font.charHeight) && font.charHeight > 0;
        const hasFontSize = isNumber(font.fontSize) && font.fontSize > 0;
        const hasLineHeight = isNumber(font.lineHeight) && font.lineHeight > 0;
        const charHeight = (hasCharHeight ? font.charHeight : (hasFontSize ? font.fontSize : 1)) ?? 1;
        const lineHeight = hasLineHeight ? font.lineHeight : 1;
        const rowHeight = Math.ceil(charHeight * lineHeight);
        return Math.max(rowHeight, 1);
    }
    _applyBackgroundColor() {
        const theme = this._themeService.getColorTheme();
        const isInEditor = ChatContextKeys.inChatEditor.getValue(this._contextKeyService);
        const backgroundColor = theme.getColor(isInEditor ? editorBackground : PANEL_BACKGROUND);
        if (backgroundColor) {
            this.domNode.style.backgroundColor = backgroundColor.toString();
        }
    }
};
ChatTerminalToolOutputSection = __decorate([
    __param(6, IAccessibleViewService),
    __param(7, IInstantiationService),
    __param(8, ITerminalConfigurationService),
    __param(9, IThemeService),
    __param(10, IContextKeyService)
], ChatTerminalToolOutputSection);
let ToggleChatTerminalOutputAction = class ToggleChatTerminalOutputAction extends Action {
    constructor(_toggle, _keybindingService, _telemetryService) {
        super("workbench.action.terminal.chat.toggleChatTerminalOutput" /* TerminalContribCommandId.ToggleChatTerminalOutput */, localize('showTerminalOutput', 'Show Output'), ThemeIcon.asClassName(Codicon.chevronRight), true);
        this._toggle = _toggle;
        this._keybindingService = _keybindingService;
        this._telemetryService = _telemetryService;
        this._expanded = false;
        this._updateTooltip();
    }
    async run() {
        this._telemetryService.publicLog2('terminal/chatToggleOutput', {
            previousExpanded: this._expanded
        });
        await this._toggle();
    }
    syncPresentation(expanded) {
        this._expanded = expanded;
        this._updatePresentation();
        this._updateTooltip();
    }
    refreshKeybindingTooltip() {
        this._updateTooltip();
    }
    _updatePresentation() {
        if (this._expanded) {
            this.label = localize('hideTerminalOutput', 'Hide Output');
            this.class = ThemeIcon.asClassName(Codicon.chevronDown);
        }
        else {
            this.label = localize('showTerminalOutput', 'Show Output');
            this.class = ThemeIcon.asClassName(Codicon.chevronRight);
        }
    }
    _updateTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding("workbench.action.terminal.chat.focusMostRecentChatTerminalOutput" /* TerminalContribCommandId.FocusMostRecentChatTerminalOutput */);
        const label = keybinding?.getLabel();
        this.tooltip = label ? `${this.label} (${label})` : this.label;
    }
};
ToggleChatTerminalOutputAction = __decorate([
    __param(1, IKeybindingService),
    __param(2, ITelemetryService)
], ToggleChatTerminalOutputAction);
export { ToggleChatTerminalOutputAction };
let FocusChatInstanceAction = class FocusChatInstanceAction extends Action {
    constructor(_instance, _command, _commandUri, _commandId, isTerminalHidden, _terminalService, _terminalEditorService, _terminalGroupService, _keybindingService, _telemetryService) {
        super("workbench.action.terminal.chat.focusChatInstance" /* TerminalContribCommandId.FocusChatInstanceAction */, isTerminalHidden ? localize('showTerminal', 'Show and Focus Terminal') : localize('focusTerminal', 'Focus Terminal'), ThemeIcon.asClassName(Codicon.openInProduct), true);
        this._instance = _instance;
        this._command = _command;
        this._commandUri = _commandUri;
        this._commandId = _commandId;
        this._terminalService = _terminalService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._keybindingService = _keybindingService;
        this._telemetryService = _telemetryService;
        this._updateTooltip();
    }
    async run() {
        this.label = this._instance?.shellLaunchConfig.hideFromUser ? localize('showAndFocusTerminal', 'Show and Focus Terminal') : localize('focusTerminal', 'Focus Terminal');
        this._updateTooltip();
        let target = 'none';
        let location = 'panel';
        if (this._instance) {
            target = 'instance';
            location = this._instance.target === TerminalLocation.Editor ? 'editor' : 'panel';
        }
        else if (this._commandUri) {
            target = 'commandUri';
        }
        this._telemetryService.publicLog2('terminal/chatFocusInstance', {
            target,
            location
        });
        if (this._instance) {
            this._terminalService.setActiveInstance(this._instance);
            if (this._instance.target === TerminalLocation.Editor) {
                this._terminalEditorService.openEditor(this._instance);
            }
            else {
                await this._terminalGroupService.showPanel(true);
            }
            this._terminalService.setActiveInstance(this._instance);
            await this._instance.focusWhenReady(true);
            const command = this._resolveCommand();
            if (command) {
                this._instance.xterm?.markTracker.revealCommand(command);
            }
            return;
        }
        if (this._commandUri) {
            this._terminalService.openResource(this._commandUri);
        }
    }
    refreshKeybindingTooltip() {
        this._updateTooltip();
    }
    _resolveCommand() {
        if (this._command && !this._command.endMarker?.isDisposed) {
            return this._command;
        }
        if (!this._instance || !this._commandId) {
            return this._command;
        }
        const commandDetection = this._instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const resolved = commandDetection?.commands.find(c => c.id === this._commandId);
        if (resolved) {
            this._command = resolved;
        }
        return this._command;
    }
    _updateTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding("workbench.action.terminal.chat.focusMostRecentChatTerminal" /* TerminalContribCommandId.FocusMostRecentChatTerminal */);
        const label = keybinding?.getLabel();
        this.tooltip = label ? `${this.label} (${label})` : this.label;
    }
};
FocusChatInstanceAction = __decorate([
    __param(5, ITerminalService),
    __param(6, ITerminalEditorService),
    __param(7, ITerminalGroupService),
    __param(8, IKeybindingService),
    __param(9, ITelemetryService)
], FocusChatInstanceAction);
export { FocusChatInstanceAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRlcm1pbmFsVG9vbFByb2dyZXNzUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRUZXJtaW5hbFRvb2xQcm9ncmVzc1BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHaEYsT0FBTyxFQUFzQixrQkFBa0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVsRSxPQUFPLEVBQUUsdUJBQXVCLEVBQXdDLE1BQU0sK0JBQStCLENBQUM7QUFDOUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0UsT0FBTywyQ0FBMkMsQ0FBQztBQUVuRCxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFpQyxvQkFBb0IsRUFBRSw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsTyxPQUFPLEVB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
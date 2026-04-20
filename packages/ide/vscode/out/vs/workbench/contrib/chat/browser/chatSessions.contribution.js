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
import { sep } from '../../../../base/common/path.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ChatEditorInput } from '../browser/chatEditorInput.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatSessionsService, isSessionInProgressStatus, localChatSessionType } from '../common/chatSessionsService.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { CHAT_CATEGORY } from './actions/chatActions.js';
import { IChatService } from '../common/chatService.js';
import { autorun, autorunIterableDelta, observableSignalFromEvent } from '../../../../base/common/observable.js';
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ChatViewId } from './chat.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatSessions',
    jsonSchema: {
        description: localize('chatSessionsExtPoint', 'Contributes chat session integrations to the chat widget.'),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            properties: {
                type: {
                    description: localize('chatSessionsExtPoint.chatSessionType', 'Unique identifier for the type of chat session.'),
                    type: 'string',
                },
                name: {
                    description: localize('chatSessionsExtPoint.name', 'Name of the dynamically registered chat participant (eg: @agent). Must not contain whitespace.'),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                displayName: {
                    description: localize('chatSessionsExtPoint.displayName', 'A longer name for this item which is used for display in menus.'),
                    type: 'string',
                },
                description: {
                    description: localize('chatSessionsExtPoint.description', 'Description of the chat session for use in menus and tooltips.'),
                    type: 'string'
                },
                when: {
                    description: localize('chatSessionsExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string'
                },
                icon: {
                    description: localize('chatSessionsExtPoint.icon', 'Icon identifier (codicon ID) for the chat session editor tab. For example, "$(github)" or "$(cloud)".'),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize('icon.light', 'Icon path when a light theme is used'),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize('icon.dark', 'Icon path when a dark theme is used'),
                                    type: 'string'
                                }
                            }
                        }]
                },
                order: {
                    description: localize('chatSessionsExtPoint.order', 'Order in which this item should be displayed.'),
                    type: 'integer'
                },
                alternativeIds: {
                    description: localize('chatSessionsExtPoint.alternativeIds', 'Alternative identifiers for backward compatibility.'),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                welcomeTitle: {
                    description: localize('chatSessionsExtPoint.welcomeTitle', 'Title text to display in the chat welcome view for this session type.'),
                    type: 'string'
                },
                welcomeMessage: {
                    description: localize('chatSessionsExtPoint.welcomeMessage', 'Message text (supports markdown) to display in the chat welcome view for this session type.'),
                    type: 'string'
                },
                welcomeTips: {
                    description: localize('chatSessionsExtPoint.welcomeTips', 'Tips text (supports markdown and theme icons) to display in the chat welcome view for this session type.'),
                    type: 'string'
                },
                inputPlaceholder: {
                    description: localize('chatSessionsExtPoint.inputPlaceholder', 'Placeholder text to display in the chat input box for this session type.'),
                    type: 'string'
                },
                capabilities: {
                    description: localize('chatSessionsExtPoint.capabilities', 'Optional capabilities for this chat session.'),
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        supportsFileAttachments: {
                            description: localize('chatSessionsExtPoint.supportsFileAttachments', 'Whether this chat session supports attaching files or file references.'),
                            type: 'boolean'
                        },
                        supportsToolAttachments: {
                            description: localize('chatSessionsExtPoint.supportsToolAttachments', 'Whether this chat session supports attaching tools or tool references.'),
                            type: 'boolean'
                        },
                        supportsMCPAttachments: {
                            description: localize('chatSessionsExtPoint.supportsMCPAttachments', 'Whether this chat session supports attaching MCP resources.'),
                            type: 'boolean'
                        },
                        supportsImageAttachments: {
                            description: localize('chatSessionsExtPoint.supportsImageAttachments', 'Whether this chat session supports attaching images.'),
                            type: 'boolean'
                        },
                        supportsSearchResultAttachments: {
                            description: localize('chatSessionsExtPoint.supportsSearchResultAttachments', 'Whether this chat session supports attaching search results.'),
                            type: 'boolean'
                        },
                        supportsInstructionAttachments: {
                            description: localize('chatSessionsExtPoint.supportsInstructionAttachments', 'Whether this chat session supports attaching instructions.'),
                            type: 'boolean'
                        },
                        supportsSourceControlAttachments: {
                            description: localize('chatSessionsExtPoint.supportsSourceControlAttachments', 'Whether this chat session supports attaching source control changes.'),
                            type: 'boolean'
                        },
                        supportsProblemAttachments: {
                            description: localize('chatSessionsExtPoint.supportsProblemAttachments', 'Whether this chat session supports attaching problems.'),
                            type: 'boolean'
                        },
                        supportsSymbolAttachments: {
                            description: localize('chatSessionsExtPoint.supportsSymbolAttachments', 'Whether this chat session supports attaching symbols.'),
                            type: 'boolean'
                        }
                    }
                },
                commands: {
                    markdownDescription: localize('chatCommandsDescription', "Commands available for this chat session, which the user can invoke with a `/`."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('chatCommand', "A short name by which this command is referred to in the UI, e.g. `fix` or `explain` for commands that fix an issue or explain code. The name should be unique among the commands provided by this participant."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatCommandDescription', "A description of this command."),
                                type: 'string'
                            },
                            when: {
                                description: localize('chatCommandWhen', "A condition which must be true to enable this command."),
                                type: 'string'
                            },
                        }
                    }
                },
                canDelegate: {
                    description: localize('chatSessionsExtPoint.canDelegate', 'Whether delegation is supported. Default is false. Note that enabling this is experimental and may not be respected at all times.'),
                    type: 'boolean',
                    default: false
                }
            },
            required: ['type', 'name', 'displayName', 'description'],
        }
    },
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            yield `onChatSession:${contrib.type}`;
        }
    }
});
class ContributedChatSessionData extends Disposable {
    getOption(optionId) {
        return this._optionsCache.get(optionId);
    }
    setOption(optionId, value) {
        this._optionsCache.set(optionId, value);
    }
    constructor(session, chatSessionType, resource, options, onWillDispose) {
        super();
        this.session = session;
        this.chatSessionType = chatSessionType;
        this.resource = resource;
        this.options = options;
        this.onWillDispose = onWillDispose;
        this._optionsCache = new Map();
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                this._optionsCache.set(key, value);
            }
        }
        this._register(this.session.onWillDispose(() => {
            this.onWillDispose(this.resource);
        }));
    }
}
let ChatSessionsService = class ChatSessionsService extends Disposable {
    get onDidChangeInProgress() { return this._onDidChangeInProgress.event; }
    get onDidChangeContentProviderSchemes() { return this._onDidChangeContentProviderSchemes.event; }
    get onDidChangeSessionOptions() { return this._onDidChangeSessionOptions.event; }
    get onDidChangeOptionGroups() { return this._onDidChangeOptionGroups.event; }
    constructor(_logService, _chatAgentService, _extensionService, _contextKeyService, _menuService, _themeService, _labelService) {
        super();
        this._logService = _logService;
        this._chatAgentService = _chatAgentService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._themeService = _themeService;
        this._labelService = _labelService;
        this._itemsProviders = new Map();
        this._contributions = new Map();
        this._contributionDisposables = this._register(new DisposableMap());
        this._contentProviders = new Map();
        this._alternativeIdMap = new Map();
        this._contextKeys = new Set();
        this._onDidChangeItemsProviders = this._register(new Emitter());
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._onDidChangeSessionItems = this._register(new Emitter());
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = this._register(new Emitter());
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._onDidChangeInProgress = this._register(new Emitter());
        this._onDidChangeContentProviderSchemes = this._register(new Emitter());
        this._onDidChangeSessionOptions = this._register(new Emitter());
        this._onDidChangeOptionGroups = this._register(new Emitter());
        this.inProgressMap = new Map();
        this._sessionTypeOptions = new Map();
        this._sessionTypeIcons = new Map();
        this._sessionTypeWelcomeTitles = new Map();
        this._sessionTypeWelcomeMessages = new Map();
        this._sessionTypeWelcomeTips = new Map();
        this._sessionTypeInputPlaceholders = new Map();
        this._sessions = new ResourceMap();
        this._hasCanDelegateProvidersKey = ChatContextKeys.hasCanDelegateProviders.bindTo(this._contextKeyService);
        this._register(extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'chatSessionsProvider')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    this._register(this.registerContribution(contribution, ext.description));
                }
            }
        }));
        // Listen for context changes and re-evaluate contributions
        this._register(Event.filter(this._contextKeyService.onDidChangeContext, e => e.affectsSome(this._contextKeys))(() => {
            this._evaluateAvailability();
        }));
        this._register(this.onDidChangeSessionItems(chatSessionType => {
            this.updateInProgressStatus(chatSessionType).catch(error => {
                this._logService.warn(`Failed to update progress status for '${chatSessionType}':`, error);
            });
        }));
        this._register(this._labelService.registerFormatter({
            scheme: Schemas.copilotPr,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                stripPathStartingSeparator: true,
            }
        }));
    }
    reportInProgress(chatSessionType, count) {
        let displayName;
        if (chatSessionType === localChatSessionType) {
            displayName = 'Local Chat Agent';
        }
        else {
            displayName = this._contributions.get(chatSessionType)?.contribution.displayName;
        }
        if (displayName) {
            this.inProgressMap.set(displayName, count);
        }
        this._onDidChangeInProgress.fire();
    }
    getInProgress() {
        return Array.from(this.inProgressMap.entries()).map(([displayName, count]) => ({ displayName, count }));
    }
    async updateInProgressStatus(chatSessionType) {
        try {
            const items = await this.getChatSessionItems(chatSessionType, CancellationToken.None);
            const inProgress = items.filter(item => item.status && isSessionInProgressStatus(item.status));
            this.reportInProgress(chatSessionType, inProgress.length);
        }
        catch (error) {
            this._logService.warn(`Failed to update in-progress status for chat session type '${chatSessionType}':`, error);
        }
    }
    registerContribution(contribution, ext) {
        if (this._contributions.has(contribution.type)) {
            return { dispose: () => { } };
        }
        // Track context keys from the when condition
        if (contribution.when) {
            const whenExpr = ContextKeyExpr.deserialize(contribution.when);
            if (whenExpr) {
                for (const key of whenExpr.keys()) {
                    this._contextKeys.add(key);
                }
            }
        }
        this._contributions.set(contribution.type, { contribution, extension: ext });
        // Register alternative IDs if provided
        if (contribution.alternativeIds) {
            for (const altId of contribution.alternativeIds) {
                if (this._alternativeIdMap.has(altId)) {
                    this._logService.warn(`Alternative ID '${altId}' is already mapped to '${this._alternativeIdMap.get(altId)}'. Remapping to '${contribution.type}'.`);
                }
                this._alternativeIdMap.set(altId, contribution.type);
            }
        }
        // Store icon mapping if provided
        let icon;
        if (contribution.icon) {
            // Parse icon string - support ThemeIcon format or file path from extension
            if (typeof contribution.icon === 'string') {
                icon = contribution.icon.startsWith('$(') && contribution.icon.endsWith(')')
                    ? ThemeIcon.fromString(contribution.icon)
                    : ThemeIcon.fromId(contribution.icon);
            }
            else {
                icon = {
                    dark: resources.joinPath(ext.extensionLocation, contribution.icon.dark),
                    light: resources.joinPath(ext.extensionLocation, contribution.icon.light)
                };
            }
        }
        if (icon) {
            this._sessionTypeIcons.set(contribution.type, icon);
        }
        // Store welcome title, message, tips, and input placeholder if provided
        if (contribution.welcomeTitle) {
            this._sessionTypeWelcomeTitles.set(contribution.type, contribution.welcomeTitle);
        }
        if (contribution.welcomeMessage) {
            this._sessionTypeWelcomeMessages.set(contribution.type, contribution.welcomeMessage);
        }
        if (contribution.welcomeTips) {
            this._sessionTypeWelcomeTips.set(contribution.type, contribution.welcomeTips);
        }
        if (contribution.inputPlaceholder) {
            this._sessionTypeInputPlaceholders.set(contribution.type, contribution.inputPlaceholder);
        }
        this._evaluateAvailability();
        return {
            dispose: () => {
                this._contributions.delete(contribution.type);
                // Remove alternative ID mappings
                if (contribution.alternativeIds) {
                    for (const altId of contribution.alternativeIds) {
                        if (this._alternativeIdMap.get(altId) === contribution.type) {
                            this._alternativeIdMap.delete(altId);
                        }
                    }
                }
                this._sessionTypeIcons.delete(contribution.type);
                this._sessionTypeWelcomeTitles.delete(contribution.type);
                this._sessionTypeWelcomeMessages.delete(contribution.type);
                this._sessionTypeWelcomeTips.delete(contribution.type);
                this._sessionTypeInputPlaceholders.delete(contribution.type);
                this._contributionDisposables.deleteAndDispose(contribution.type);
                this._updateHasCanDelegateProvidersContextKey();
            }
        };
    }
    _isContributionAvailable(contribution) {
        if (!contribution.when) {
            return true;
        }
        const whenExpr = ContextKeyExpr.deserialize(contribution.when);
        return !whenExpr || this._contextKeyService.contextMatchesRules(whenExpr);
    }
    /**
     * Resolves a session type to its primary type, checking for alternative IDs.
     * @param sessionType The session type or alternative ID to resolve
     * @returns The primary session type, or undefined if not found or not available
     */
    _resolveToPrimaryType(sessionType) {
        // Try to find the primary type first
        const contribution = this._contributions.get(sessionType)?.contribution;
        if (contribution) {
            // If the contribution is available, use it
            if (this._isContributionAvailable(contribution)) {
                return sessionType;
            }
            // If not available, fall through to check for alternatives
        }
        // Check if this is an alternative ID, or if the primary type is not available
        const primaryType = this._alternativeIdMap.get(sessionType);
        if (primaryType) {
            const altContribution = this._contributions.get(primaryType)?.contribution;
            if (altContribution && this._isContributionAvailable(altContribution)) {
                return primaryType;
            }
        }
        return undefined;
    }
    _registerMenuItems(contribution, extensionDescription) {
        // If provider registers anything for the create submenu, let it fully control the creation
        const contextKeyService = this._contextKeyService.createOverlay([
            ['chatSessionType', contribution.type]
        ]);
        const rawMenuActions = this._menuService.getMenuActions(MenuId.AgentSessionsCreateSubMenu, contextKeyService);
        const menuActions = rawMenuActions.map(value => value[1]).flat();
        const disposables = new DisposableStore();
        // Mirror all create submenu actions into the global Chat New menu
        for (const action of menuActions) {
            if (action instanceof MenuItemAction) {
                disposables.add(MenuRegistry.appendMenuItem(MenuId.ChatNewMenu, {
                    command: action.item,
                    group: '4_externally_contributed',
                }));
            }
        }
        return {
            dispose: () => disposables.dispose()
        };
    }
    _registerCommands(contribution) {
        return combinedDisposable(registerAction2(class OpenChatSessionAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openSessionWithPrompt.${contribution.type}`,
                    title: localize2('interactiveSession.openSessionWithPrompt', "New {0} with Prompt", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: false,
                    precondition: ChatContextKeys.enabled
                });
            }
            async run(accessor, chatOptions) {
                const chatService = accessor.get(IChatService);
                const { type } = contribution;
                if (chatOptions) {
                    const resource = URI.revive(chatOptions.resource);
                    const ref = await chatService.loadSessionForResource(resource, ChatAgentLocation.Chat, CancellationToken.None);
                    await chatService.sendRequest(resource, chatOptions.prompt, { agentIdSilent: type, attachedContext: chatOptions.attachedContext });
                    ref?.dispose();
                }
            }
        }), 
        // Creates a chat editor
        registerAction2(class OpenNewChatSessionEditorAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openNewSessionEditor.${contribution.type}`,
                    title: localize2('interactiveSession.openNewSessionEditor', "New {0}", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: true,
                    precondition: ChatContextKeys.enabled,
                });
            }
            async run(accessor, chatOptions) {
                const editorService = accessor.get(IEditorService);
                const logService = accessor.get(ILogService);
                const chatService = accessor.get(IChatService);
                const { type } = contribution;
                try {
                    const options = {
                        override: ChatEditorInput.EditorID,
                        pinned: true,
                        title: {
                            fallback: localize('chatEditorContributionName', "{0}", contribution.displayName),
                        }
                    };
                    const resource = URI.from({
                        scheme: type,
                        path: `/untitled-${generateUuid()}`,
                    });
                    await editorService.openEditor({ resource, options });
                    if (chatOptions?.prompt) {
                        await chatService.sendRequest(resource, chatOptions.prompt, { agentIdSilent: type, attachedContext: chatOptions.attachedContext });
                    }
                }
                catch (e) {
                    logService.error(`Failed to open new '${type}' chat session editor`, e);
                }
            }
        }), 
        // New chat in sidebar chat (+ button)
        registerAction2(class OpenNewChatSessionSidebarAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.chat.openNewSessionSidebar.${contribution.type}`,
                    title: localize2('interactiveSession.openNewSessionSidebar', "New {0}", contribution.displayName),
                    category: CHAT_CATEGORY,
                    icon: Codicon.plus,
                    f1: false, // Hide from Command Palette
                    precondition: ChatContextKeys.enabled,
                    menu: {
                        id: MenuId.ChatNewMenu,
                        group: '3_new_special',
                    }
                });
            }
            async run(accessor, chatOptions) {
                const viewsService = accessor.get(IViewsService);
                const logService = accessor.get(ILogService);
                const chatService = accessor.get(IChatService);
                const { type } = contribution;
                try {
                    const resource = URI.from({
                        scheme: type,
                        path: `/untitled-${generateUuid()}`,
                    });
                    const view = await viewsService.openView(ChatViewId);
                    await view.loadSession(resource);
                    if (chatOptions?.prompt) {
                        await chatService.sendRequest(resource, chatOptions.prompt, { agentIdSilent: type, attachedContext: chatOptions.attachedContext });
                    }
                    view.focus();
                }
                catch (e) {
                    logService.error(`Failed to open new '${type}' chat session in sidebar`, e);
                }
            }
        }));
    }
    _evaluateAvailability() {
        let hasChanges = false;
        for (const { contribution, extension } of this._contributions.values()) {
            const isCurrentlyRegistered = this._contributionDisposables.has(contribution.type);
            const shouldBeRegistered = this._isContributionAvailable(contribution);
            if (isCurrentlyRegistered && !shouldBeRegistered) {
                // Disable the contribution by disposing its disposable store
                this._contributionDisposables.deleteAndDispose(contribution.type);
                // Also dispose any cached sessions for this contribution
                this._disposeSessionsForContribution(contribution.type);
                hasChanges = true;
            }
            else if (!isCurrentlyRegistered && shouldBeRegistered) {
                // Enable the contribution by registering it
                this._enableContribution(contribution, extension);
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this._onDidChangeAvailability.fire();
            for (const provider of this._itemsProviders.values()) {
                this._onDidChangeItemsProviders.fire(provider);
            }
            for (const { contribution } of this._contributions.values()) {
                this._onDidChangeSessionItems.fire(contribution.type);
            }
        }
        this._updateHasCanDelegateProvidersContextKey();
    }
    _enableContribution(contribution, ext) {
        const disposableStore = new DisposableStore();
        this._contributionDisposables.set(contribution.type, disposableStore);
        if (contribution.canDelegate) {
            disposableStore.add(this._registerAgent(contribution, ext));
            disposableStore.add(this._registerCommands(contribution));
        }
        disposableStore.add(this._registerMenuItems(contribution, ext));
    }
    _disposeSessionsForContribution(contributionId) {
        // Find and dispose all sessions that belong to this contribution
        const sessionsToDispose = [];
        for (const [sessionResource, sessionData] of this._sessions) {
            if (sessionData.chatSessionType === contributionId) {
                sessionsToDispose.push(sessionResource);
            }
        }
        if (sessionsToDispose.length > 0) {
            this._logService.info(`Disposing ${sessionsToDispose.length} cached sessions for contribution '${contributionId}' due to when clause change`);
        }
        for (const sessionKey of sessionsToDispose) {
            const sessionData = this._sessions.get(sessionKey);
            if (sessionData) {
                sessionData.dispose(); // This will call _onWillDisposeSession and clean up
            }
        }
    }
    _registerAgent(contribution, ext) {
        const { type: id, name, displayName, description } = contribution;
        const storedIcon = this._sessionTypeIcons.get(id);
        const icons = ThemeIcon.isThemeIcon(storedIcon)
            ? { themeIcon: storedIcon, icon: undefined, iconDark: undefined }
            : storedIcon
                ? { icon: storedIcon.light, iconDark: storedIcon.dark }
                : { themeIcon: Codicon.sendToRemoteAgent };
        const agentData = {
            id,
            name,
            fullName: displayName,
            description: description,
            isDefault: false,
            isCore: false,
            isDynamic: true,
            slashCommands: contribution.commands ?? [],
            locations: [ChatAgentLocation.Chat],
            modes: [ChatModeKind.Agent, ChatModeKind.Ask],
            disambiguation: [],
            metadata: {
                ...icons,
            },
            capabilities: contribution.capabilities,
            canAccessPreviousChatHistory: true,
            extensionId: ext.identifier,
            extensionVersion: ext.version,
            extensionDisplayName: ext.displayName || ext.name,
            extensionPublisherId: ext.publisher,
        };
        return this._chatAgentService.registerAgent(id, agentData);
    }
    getAllChatSessionContributions() {
        return Array.from(this._contributions.values(), x => x.contribution)
            .filter(contribution => this._isContributionAvailable(contribution));
    }
    _updateHasCanDelegateProvidersContextKey() {
        const hasCanDelegate = this.getAllChatSessionContributions().filter(c => c.canDelegate);
        const canDelegateEnabled = hasCanDelegate.length > 0;
        this._logService.trace(`[ChatSessionsService] hasCanDelegateProvidersAvailable=${canDelegateEnabled} (${hasCanDelegate.map(c => c.type).join(', ')})`);
        this._hasCanDelegateProvidersKey.set(canDelegateEnabled);
    }
    getChatSessionContribution(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        if (!contribution) {
            return undefined;
        }
        return this._isContributionAvailable(contribution) ? contribution : undefined;
    }
    getAllChatSessionItemProviders() {
        return [...this._itemsProviders.values()].filter(provider => {
            // Check if the provider's corresponding contribution is available
            const contribution = this._contributions.get(provider.chatSessionType)?.contribution;
            return !contribution || this._isContributionAvailable(contribution);
        });
    }
    async activateChatSessionItemProvider(chatViewType) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const resolvedType = this._resolveToPrimaryType(chatViewType);
        if (resolvedType) {
            chatViewType = resolvedType;
        }
        const contribution = this._contributions.get(chatViewType)?.contribution;
        if (contribution && !this._isContributionAvailable(contribution)) {
            return undefined;
        }
        if (this._itemsProviders.has(chatViewType)) {
            return this._itemsProviders.get(chatViewType);
        }
        await this._extensionService.activateByEvent(`onChatSession:${chatViewType}`);
        return this._itemsProviders.get(chatViewType);
    }
    async canResolveChatSession(chatSessionResource) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const resolvedType = this._resolveToPrimaryType(chatSessionResource.scheme) || chatSessionResource.scheme;
        const contribution = this._contributions.get(resolvedType)?.contribution;
        if (contribution && !this._isContributionAvailable(contribution)) {
            return false;
        }
        if (this._contentProviders.has(chatSessionResource.scheme)) {
            return true;
        }
        await this._extensionService.activateByEvent(`onChatSession:${chatSessionResource.scheme}`);
        return this._contentProviders.has(chatSessionResource.scheme);
    }
    async getAllChatSessionItems(token) {
        return Promise.all(Array.from(this.getAllChatSessionContributions(), async (contrib) => {
            return {
                chatSessionType: contrib.type,
                items: await this.getChatSessionItems(contrib.type, token)
            };
        }));
    }
    async getChatSessionItems(chatSessionType, token) {
        if (!(await this.activateChatSessionItemProvider(chatSessionType))) {
            return [];
        }
        const resolvedType = this._resolveToPrimaryType(chatSessionType);
        if (resolvedType) {
            chatSessionType = resolvedType;
        }
        const provider = this._itemsProviders.get(chatSessionType);
        if (provider?.provideChatSessionItems) {
            const sessions = await provider.provideChatSessionItems(token);
            return sessions;
        }
        return [];
    }
    registerChatSessionItemProvider(provider) {
        const chatSessionType = provider.chatSessionType;
        this._itemsProviders.set(chatSessionType, provider);
        this._onDidChangeItemsProviders.fire(provider);
        const disposables = new DisposableStore();
        disposables.add(provider.onDidChangeChatSessionItems(() => {
            this._onDidChangeSessionItems.fire(chatSessionType);
        }));
        this.updateInProgressStatus(chatSessionType).catch(error => {
            this._logService.warn(`Failed to update initial progress status for '${chatSessionType}':`, error);
        });
        return {
            dispose: () => {
                disposables.dispose();
                const provider = this._itemsProviders.get(chatSessionType);
                if (provider) {
                    this._itemsProviders.delete(chatSessionType);
                    this._onDidChangeItemsProviders.fire(provider);
                }
            }
        };
    }
    registerChatSessionContentProvider(chatSessionType, provider) {
        if (this._contentProviders.has(chatSessionType)) {
            throw new Error(`Content provider for ${chatSessionType} is already registered.`);
        }
        this._contentProviders.set(chatSessionType, provider);
        this._onDidChangeContentProviderSchemes.fire({ added: [chatSessionType], removed: [] });
        return {
            dispose: () => {
                this._contentProviders.delete(chatSessionType);
                this._onDidChangeContentProviderSchemes.fire({ added: [], removed: [chatSessionType] });
                // Remove all sessions that were created by this provider
                for (const [key, session] of this._sessions) {
                    if (session.chatSessionType === chatSessionType) {
                        session.dispose();
                        this._sessions.delete(key);
                    }
                }
            }
        };
    }
    registerChatModelChangeListeners(chatService, chatSessionType, onChange) {
        const disposableStore = new DisposableStore();
        const chatModelsICareAbout = chatService.chatModels.map(models => Array.from(models).filter((model) => model.sessionResource.scheme === chatSessionType));
        const listeners = new ResourceMap();
        const autoRunDisposable = autorunIterableDelta(reader => chatModelsICareAbout.read(reader), ({ addedValues, removedValues }) => {
            removedValues.forEach((removed) => {
                const listener = listeners.get(removed.sessionResource);
                if (listener) {
                    listeners.delete(removed.sessionResource);
                    listener.dispose();
                }
            });
            addedValues.forEach((added) => {
                const requestChangeListener = added.lastRequestObs.map(last => last?.response && observableSignalFromEvent('chatSessions.modelRequestChangeListener', last.response.onDidChange));
                const modelChangeListener = observableSignalFromEvent('chatSessions.modelChangeListener', added.onDidChange);
                listeners.set(added.sessionResource, autorun(reader => {
                    requestChangeListener.read(reader)?.read(reader);
                    modelChangeListener.read(reader);
                    onChange();
                }));
            });
        });
        disposableStore.add(toDisposable(() => {
            for (const listener of listeners.values()) {
                listener.dispose();
            }
        }));
        disposableStore.add(autoRunDisposable);
        return disposableStore;
    }
    getInProgressSessionDescription(chatModel) {
        const requests = chatModel.getRequests();
        if (requests.length === 0) {
            return undefined;
        }
        // Get the last request to check its response status
        const lastRequest = requests.at(-1);
        const response = lastRequest?.response;
        if (!response) {
            return undefined;
        }
        // If the response is complete, show Finished
        if (response.isComplete) {
            return undefined;
        }
        // Get the response parts to find tool invocations and progress messages
        const responseParts = response.response.value;
        let description = '';
        for (let i = responseParts.length - 1; i >= 0; i--) {
            const part = responseParts[i];
            if (description) {
                break;
            }
            if (part.kind === 'confirmation' && typeof part.message === 'string') {
                description = part.message;
            }
            else if (part.kind === 'toolInvocation') {
                const toolInvocation = part;
                const state = toolInvocation.state.get();
                description = toolInvocation.generatedTitle || toolInvocation.pastTenseMessage || toolInvocation.invocationMessage;
                if (state.type === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
                    const confirmationTitle = toolInvocation.confirmationMessages?.title;
                    const titleMessage = confirmationTitle && (typeof confirmationTitle === 'string'
                        ? confirmationTitle
                        : confirmationTitle.value);
                    const descriptionValue = typeof description === 'string' ? description : description.value;
                    description = titleMessage ?? localize('chat.sessions.description.waitingForConfirmation', "Waiting for confirmation: {0}", descriptionValue);
                }
            }
            else if (part.kind === 'toolInvocationSerialized') {
                description = part.invocationMessage;
            }
            else if (part.kind === 'progressMessage') {
                description = part.content;
            }
            else if (part.kind === 'thinking') {
                description = localize('chat.sessions.description.thinking', 'Thinking...');
            }
        }
        return renderAsPlaintext(description, { useLinkFormatter: true });
    }
    async getOrCreateChatSession(sessionResource, token) {
        const existingSessionData = this._sessions.get(sessionResource);
        if (existingSessionData) {
            return existingSessionData.session;
        }
        if (!(await raceCancellationError(this.canResolveChatSession(sessionResource), token))) {
            throw Error(`Can not find provider for ${sessionResource}`);
        }
        const resolvedType = this._resolveToPrimaryType(sessionResource.scheme) || sessionResource.scheme;
        const provider = this._contentProviders.get(resolvedType);
        if (!provider) {
            throw Error(`Can not find provider for ${sessionResource}`);
        }
        const session = await raceCancellationError(provider.provideChatSessionContent(sessionResource, token), token);
        const sessionData = new ContributedChatSessionData(session, sessionResource.scheme, sessionResource, session.options, resource => {
            sessionData.dispose();
            this._sessions.delete(resource);
        });
        this._sessions.set(sessionResource, sessionData);
        return session;
    }
    hasAnySessionOptions(sessionResource) {
        const session = this._sessions.get(sessionResource);
        return !!session && !!session.options && Object.keys(session.options).length > 0;
    }
    getSessionOption(sessionResource, optionId) {
        const session = this._sessions.get(sessionResource);
        return session?.getOption(optionId);
    }
    setSessionOption(sessionResource, optionId, value) {
        const session = this._sessions.get(sessionResource);
        return !!session?.setOption(optionId, value);
    }
    notifySessionItemsChanged(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    /**
     * Store option groups for a session type
     */
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) {
        if (optionGroups) {
            this._sessionTypeOptions.set(chatSessionType, optionGroups);
        }
        else {
            this._sessionTypeOptions.delete(chatSessionType);
        }
        this._onDidChangeOptionGroups.fire(chatSessionType);
    }
    /**
     * Get available option groups for a session type
     */
    getOptionGroupsForSessionType(chatSessionType) {
        return this._sessionTypeOptions.get(chatSessionType);
    }
    /**
     * Set the callback for notifying extensions about option changes
     */
    setOptionsChangeCallback(callback) {
        this._optionsChangeCallback = callback;
    }
    /**
     * Notify extension about option changes for a session
     */
    async notifySessionOptionsChange(sessionResource, updates) {
        if (!updates.length) {
            return;
        }
        if (this._optionsChangeCallback) {
            await this._optionsChangeCallback(sessionResource, updates);
        }
        for (const u of updates) {
            this.setSessionOption(sessionResource, u.optionId, u.value);
        }
        this._onDidChangeSessionOptions.fire(sessionResource);
    }
    /**
     * Get the icon for a specific session type
     */
    getIconForSessionType(chatSessionType) {
        const sessionTypeIcon = this._sessionTypeIcons.get(chatSessionType);
        if (ThemeIcon.isThemeIcon(sessionTypeIcon)) {
            return sessionTypeIcon;
        }
        if (isDark(this._themeService.getColorTheme().type)) {
            return sessionTypeIcon?.dark;
        }
        else {
            return sessionTypeIcon?.light;
        }
    }
    /**
     * Get the welcome title for a specific session type
     */
    getWelcomeTitleForSessionType(chatSessionType) {
        return this._sessionTypeWelcomeTitles.get(chatSessionType);
    }
    /**
     * Get the welcome message for a specific session type
     */
    getWelcomeMessageForSessionType(chatSessionType) {
        return this._sessionTypeWelcomeMessages.get(chatSessionType);
    }
    /**
     * Get the input placeholder for a specific session type
     */
    getInputPlaceholderForSessionType(chatSessionType) {
        return this._sessionTypeInputPlaceholders.get(chatSessionType);
    }
    /**
     * Get the capabilities for a specific session type
     */
    getCapabilitiesForSessionType(chatSessionType) {
        const contribution = this._contributions.get(chatSessionType)?.contribution;
        return contribution?.capabilities;
    }
    getContentProviderSchemes() {
        return Array.from(this._contentProviders.keys());
    }
};
ChatSessionsService = __decorate([
    __param(0, ILogService),
    __param(1, IChatAgentService),
    __param(2, IExtensionService),
    __param(3, IContextKeyService),
    __param(4, IMenuService),
    __param(5, IThemeService),
    __param(6, ILabelService)
], ChatSessionsService);
export { ChatSessionsService };
registerSingleton(IChatSessionsService, ChatSessionsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsY0FBYyxF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
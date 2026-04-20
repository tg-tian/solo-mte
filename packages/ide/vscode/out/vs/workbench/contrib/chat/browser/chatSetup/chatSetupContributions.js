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
var ChatTeardownContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, markAsSingleton, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import Severity from '../../../../../base/common/severity.js';
import { equalsIgnoreCase } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import product from '../../../../../platform/product/common/product.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ChatEntitlement, IChatEntitlementService, isProUser } from '../../../../services/chat/common/chatEntitlementService.js';
import { IWorkbenchExtensionEnablementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { ExtensionUrlHandlerOverrideRegistry } from '../../../../services/extensions/browser/extensionUrlHandler.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatModeService } from '../../common/chatModes.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { CHAT_CATEGORY, CHAT_SETUP_ACTION_ID, CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID } from '../actions/chatActions.js';
import { ChatViewContainerId, IChatWidgetService } from '../chat.js';
import { chatViewsWelcomeRegistry } from '../viewsWelcome/chatViewsWelcome.js';
import { ChatSetupAnonymous } from './chatSetup.js';
import { ChatSetupController } from './chatSetupController.js';
import { AICodeActionsHelper, AINewSymbolNamesProvider, ChatCodeActionsProvider, SetupAgent } from './chatSetupProviders.js';
import { ChatSetup } from './chatSetupRunner.js';
const defaultChat = {
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    manageOveragesUrl: product.defaultChatAgent?.manageOverageUrl ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
};
let ChatSetupContribution = class ChatSetupContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSetup'; }
    constructor(instantiationService, chatEntitlementService, logService, contextKeyService, extensionEnablementService, extensionsWorkbenchService, extensionService, environmentService) {
        super();
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        const context = chatEntitlementService.context?.value;
        const requests = chatEntitlementService.requests?.value;
        if (!context || !requests) {
            return; // disabled
        }
        const controller = new Lazy(() => this._register(this.instantiationService.createInstance(ChatSetupController, context, requests)));
        this.registerSetupAgents(context, controller);
        this.registerActions(context, requests, controller);
        this.registerUrlLinkHandler();
        this.checkExtensionInstallation(context);
    }
    registerSetupAgents(context, controller) {
        const defaultAgentDisposables = markAsSingleton(new MutableDisposable()); // prevents flicker on window reload
        const vscodeAgentDisposables = markAsSingleton(new MutableDisposable());
        const renameProviderDisposables = markAsSingleton(new MutableDisposable());
        const codeActionsProviderDisposables = markAsSingleton(new MutableDisposable());
        const updateRegistration = () => {
            // Agent + Tools
            {
                if (!context.state.hidden && !context.state.disabled) {
                    // Default Agents (always, even if installed to allow for speedy requests right on startup)
                    if (!defaultAgentDisposables.value) {
                        const disposables = defaultAgentDisposables.value = new DisposableStore();
                        // Panel Agents
                        const panelAgentDisposables = disposables.add(new DisposableStore());
                        for (const mode of [ChatModeKind.Ask, ChatModeKind.Edit, ChatModeKind.Agent]) {
                            const { agent, disposable } = SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Chat, mode, context, controller);
                            panelAgentDisposables.add(disposable);
                            panelAgentDisposables.add(agent.onUnresolvableError(() => {
                                const panelAgentHasGuidance = chatViewsWelcomeRegistry.get().some(descriptor => this.contextKeyService.contextMatchesRules(descriptor.when));
                                if (panelAgentHasGuidance) {
                                    // An unresolvable error from our agent registrations means that
                                    // Chat is unhealthy for some reason. We clear our panel
                                    // registration to give Chat a chance to show a custom message
                                    // to the user from the views and stop pretending as if there was
                                    // a functional agent.
                                    this.logService.error('[chat setup] Unresolvable error from Chat agent registration, clearing registration.');
                                    panelAgentDisposables.dispose();
                                }
                            }));
                        }
                        // Inline Agents
                        disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Terminal, undefined, context, controller).disposable);
                        disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Notebook, undefined, context, controller).disposable);
                        disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.EditorInline, undefined, context, controller).disposable);
                    }
                    // Built-In Agent + Tool (unless installed, signed-in and enabled)
                    if ((!context.state.installed || context.state.entitlement === ChatEntitlement.Unknown || context.state.entitlement === ChatEntitlement.Unresolved) && !vscodeAgentDisposables.value) {
                        const disposables = vscodeAgentDisposables.value = new DisposableStore();
                        disposables.add(SetupAgent.registerBuiltInAgents(this.instantiationService, context, controller));
                    }
                }
                else {
                    defaultAgentDisposables.clear();
                    vscodeAgentDisposables.clear();
                }
                if (context.state.installed && !context.state.disabled) {
                    vscodeAgentDisposables.clear(); // we need to do this to prevent showing duplicate agent/tool entries in the list
                }
            }
            // Rename Provider
            {
                if (!context.state.installed && !context.state.hidden && !context.state.disabled) {
                    if (!renameProviderDisposables.value) {
                        renameProviderDisposables.value = AINewSymbolNamesProvider.registerProvider(this.instantiationService, context, controller);
                    }
                }
                else {
                    renameProviderDisposables.clear();
                }
            }
            // Code Actions Provider
            {
                if (!context.state.installed && !context.state.hidden && !context.state.disabled) {
                    if (!codeActionsProviderDisposables.value) {
                        codeActionsProviderDisposables.value = ChatCodeActionsProvider.registerProvider(this.instantiationService);
                    }
                }
                else {
                    codeActionsProviderDisposables.clear();
                }
            }
        };
        this._register(Event.runAndSubscribe(context.onDidChange, () => updateRegistration()));
    }
    registerActions(context, requests, controller) {
        //#region Global Chat Setup Actions
        class ChatSetupTriggerAction extends Action2 {
            static { this.CHAT_SETUP_ACTION_LABEL = localize2('triggerChatSetup', "Use AI Features with Copilot for free..."); }
            constructor() {
                super({
                    id: CHAT_SETUP_ACTION_ID,
                    title: ChatSetupTriggerAction.CHAT_SETUP_ACTION_LABEL,
                    category: CHAT_CATEGORY,
                    f1: true,
                    precondition: ContextKeyExpr.or(ChatContextKeys.Setup.hidden, ChatContextKeys.Setup.disabled, ChatContextKeys.Setup.untrusted, ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp)
                });
            }
            async run(accessor, mode, options) {
                const widgetService = accessor.get(IChatWidgetService);
                const instantiationService = accessor.get(IInstantiationService);
                const dialogService = accessor.get(IDialogService);
                const commandService = accessor.get(ICommandService);
                const lifecycleService = accessor.get(ILifecycleService);
                const configurationService = accessor.get(IConfigurationService);
                await context.update({ hidden: false });
                configurationService.updateValue(ChatTeardownContribution.CHAT_DISABLED_CONFIGURATION_KEY, false);
                if (mode) {
                    const chatWidget = await widgetService.revealWidget();
                    chatWidget?.input.setChatMode(mode);
                }
                if (options?.inputValue) {
                    const chatWidget = await widgetService.revealWidget();
                    chatWidget?.setInput(options.inputValue);
                }
                const setup = ChatSetup.getInstance(instantiationService, context, controller);
                const { success } = await setup.run(options);
                if (success === false && !lifecycleService.willShutdown) {
                    const { confirmed } = await dialogService.confirm({
                        type: Severity.Error,
                        message: localize('setupErrorDialog', "Chat setup failed. Would you like to try again?"),
                        primaryButton: localize('retry', "Retry"),
                    });
                    if (confirmed) {
                        return Boolean(await commandService.executeCommand(CHAT_SETUP_ACTION_ID, mode, options));
                    }
                }
                return Boolean(success);
            }
        }
        class ChatSetupTriggerSupportAnonymousAction extends Action2 {
            constructor() {
                super({
                    id: CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID,
                    title: ChatSetupTriggerAction.CHAT_SETUP_ACTION_LABEL
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                const chatEntitlementService = accessor.get(IChatEntitlementService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, {
                    forceAnonymous: chatEntitlementService.anonymous ? ChatSetupAnonymous.EnabledWithDialog : undefined
                });
            }
        }
        class ChatSetupTriggerForceSignInDialogAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupForceSignIn',
                    title: localize2('forceSignIn', "Sign in to use AI features")
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceSignInDialog: true });
            }
        }
        class ChatSetupTriggerAnonymousWithoutDialogAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupAnonymousWithoutDialog',
                    title: ChatSetupTriggerAction.CHAT_SETUP_ACTION_LABEL
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceAnonymous: ChatSetupAnonymous.EnabledWithoutDialog });
            }
        }
        class ChatSetupFromAccountsAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupFromAccounts',
                    title: localize2('triggerChatSetupFromAccounts', "Sign in to use AI features..."),
                    menu: {
                        id: MenuId.AccountsContext,
                        group: '2_copilot',
                        when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.signedOut)
                    }
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'accounts' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID);
            }
        }
        const windowFocusListener = this._register(new MutableDisposable());
        class UpgradePlanAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.upgradePlan',
                    title: localize2('managePlan', "Upgrade to GitHub Copilot Pro"),
                    category: localize2('chat.category', 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ContextKeyExpr.or(ChatContextKeys.Entitlement.canSignUp, ChatContextKeys.Entitlement.planFree)),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.Entitlement.planFree, ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded))
                    }
                });
            }
            async run(accessor) {
                const openerService = accessor.get(IOpenerService);
                const hostService = accessor.get(IHostService);
                const commandService = accessor.get(ICommandService);
                openerService.open(URI.parse(defaultChat.upgradePlanUrl));
                const entitlement = context.state.entitlement;
                if (!isProUser(entitlement)) {
                    // If the user is not yet Pro, we listen to window focus to refresh the token
                    // when the user has come back to the window assuming the user signed up.
                    windowFocusListener.value = hostService.onDidChangeFocus(focus => this.onWindowFocus(focus, commandService));
                }
            }
            async onWindowFocus(focus, commandService) {
                if (focus) {
                    windowFocusListener.clear();
                    const entitlements = await requests.forceResolveEntitlement(undefined);
                    if (entitlements?.entitlement && isProUser(entitlements?.entitlement)) {
                        refreshTokens(commandService);
                    }
                }
            }
        }
        class EnableOveragesAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.manageOverages',
                    title: localize2('manageOverages', "Manage GitHub Copilot Overages"),
                    category: localize2('chat.category', 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ContextKeyExpr.or(ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus)),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus), ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded))
                    }
                });
            }
            async run(accessor) {
                const openerService = accessor.get(IOpenerService);
                openerService.open(URI.parse(defaultChat.manageOveragesUrl));
            }
        }
        registerAction2(ChatSetupTriggerAction);
        registerAction2(ChatSetupTriggerForceSignInDialogAction);
        registerAction2(ChatSetupFromAccountsAction);
        registerAction2(ChatSetupTriggerAnonymousWithoutDialogAction);
        registerAction2(ChatSetupTriggerSupportAnonymousAction);
        registerAction2(UpgradePlanAction);
        registerAction2(EnableOveragesAction);
        //#endregion
        //#region Editor Context Menu
        function registerGenerateCodeCommand(coreCommand, actualCommand) {
            CommandsRegistry.registerCommand(coreCommand, async (accessor) => {
                const commandService = accessor.get(ICommandService);
                const codeEditorService = accessor.get(ICodeEditorService);
                const markerService = accessor.get(IMarkerService);
                switch (coreCommand) {
                    case 'chat.internal.explain':
                    case 'chat.internal.fix': {
                        const textEditor = codeEditorService.getActiveCodeEditor();
                        const uri = textEditor?.getModel()?.uri;
                        const range = textEditor?.getSelection();
                        if (!uri || !range) {
                            return;
                        }
                        const markers = AICodeActionsHelper.warningOrErrorMarkersAtRange(markerService, uri, range);
                        const actualCommand = coreCommand === 'chat.internal.explain'
                            ? AICodeActionsHelper.explainMarkers(markers)
                            : AICodeActionsHelper.fixMarkers(markers, range);
                        await commandService.executeCommand(actualCommand.id, ...(actualCommand.arguments ?? []));
                        break;
                    }
                    case 'chat.internal.review':
                    case 'chat.internal.generateDocs':
                    case 'chat.internal.generateTests': {
                        const result = await commandService.executeCommand(CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID);
                        if (result) {
                            await commandService.executeCommand(actualCommand);
                        }
                    }
                }
            });
        }
        registerGenerateCodeCommand('chat.internal.explain', 'github.copilot.chat.explain');
        registerGenerateCodeCommand('chat.internal.fix', 'github.copilot.chat.fix');
        registerGenerateCodeCommand('chat.internal.review', 'github.copilot.chat.review');
        registerGenerateCodeCommand('chat.internal.generateDocs', 'github.copilot.chat.generateDocs');
        registerGenerateCodeCommand('chat.internal.generateTests', 'github.copilot.chat.generateTests');
        const internalGenerateCodeContext = ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate(), ChatContextKeys.Setup.installed.negate());
        MenuRegistry.appendMenuItem(MenuId.EditorContext, {
            command: {
                id: 'chat.internal.explain',
                title: localize('explain', "Explain"),
            },
            group: '1_chat',
            order: 4,
            when: internalGenerateCodeContext
        });
        MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
            command: {
                id: 'chat.internal.fix',
                title: localize('fix', "Fix"),
            },
            group: '1_action',
            order: 1,
            when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
        });
        MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
            command: {
                id: 'chat.internal.review',
                title: localize('review', "Code Review"),
            },
            group: '1_action',
            order: 2,
            when: internalGenerateCodeContext
        });
        MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
            command: {
                id: 'chat.internal.generateDocs',
                title: localize('generateDocs', "Generate Docs"),
            },
            group: '2_generate',
            order: 1,
            when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
        });
        MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
            command: {
                id: 'chat.internal.generateTests',
                title: localize('generateTests', "Generate Tests"),
            },
            group: '2_generate',
            order: 2,
            when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
        });
    }
    registerUrlLinkHandler() {
        this._register(ExtensionUrlHandlerOverrideRegistry.registerHandler(this.instantiationService.createInstance(ChatSetupExtensionUrlHandler)));
    }
    async checkExtensionInstallation(context) {
        // When developing extensions, await registration and then check
        if (this.environmentService.isExtensionDevelopment) {
            await this.extensionService.whenInstalledExtensionsRegistered();
            if (this.extensionService.extensions.find(ext => ExtensionIdentifier.equals(ext.identifier, defaultChat.chatExtensionId))) {
                context.update({ installed: true, disabled: false, untrusted: false });
                return;
            }
        }
        // Await extensions to be ready to be queried
        await this.extensionsWorkbenchService.queryLocal();
        // Listen to extensions change and process extensions once
        this._register(Event.runAndSubscribe(this.extensionsWorkbenchService.onChange, e => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.chatExtensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.chatExtensionId));
            const installed = !!defaultChatExtension?.local;
            let disabled;
            let untrusted = false;
            if (installed) {
                disabled = !this.extensionEnablementService.isEnabled(defaultChatExtension.local);
                if (disabled) {
                    const state = this.extensionEnablementService.getEnablementState(defaultChatExtension.local);
                    if (state === 0 /* EnablementState.DisabledByTrustRequirement */) {
                        disabled = false; // not disabled by user choice but
                        untrusted = true; // by missing workspace trust
                    }
                }
            }
            else {
                disabled = false;
            }
            context.update({ installed, disabled, untrusted });
        }));
    }
};
ChatSetupContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatEntitlementService),
    __param(2, ILogService),
    __param(3, IContextKeyService),
    __param(4, IWorkbenchExtensionEnablementService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionService),
    __param(7, IEnvironmentService)
], ChatSetupContribution);
export { ChatSetupContribution };
let ChatSetupExtensionUrlHandler = class ChatSetupExtensionUrlHandler {
    constructor(productService, commandService, telemetryService, chatModeService) {
        this.productService = productService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.chatModeService = chatModeService;
    }
    canHandleURL(url) {
        return url.scheme === this.productService.urlProtocol && equalsIgnoreCase(url.authority, defaultChat.chatExtensionId);
    }
    async handleURL(url) {
        const params = new URLSearchParams(url.query);
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'url', detail: params.get('referrer') ?? undefined });
        const agentParam = params.get('agent') ?? params.get('mode');
        const inputParam = params.get('prompt');
        if (!agentParam && !inputParam) {
            return false;
        }
        const agentId = agentParam ? this.resolveAgentId(agentParam) : undefined;
        await this.commandService.executeCommand(CHAT_SETUP_ACTION_ID, agentId, inputParam ? { inputValue: inputParam } : undefined);
        return true;
    }
    resolveAgentId(agentParam) {
        const agents = this.chatModeService.getModes();
        const allAgents = [...agents.builtin, ...agents.custom];
        const foundAgent = allAgents.find(agent => agent.id === agentParam);
        if (foundAgent) {
            return foundAgent.id;
        }
        const nameLower = agentParam.toLowerCase();
        const agentByName = allAgents.find(agent => agent.name.get().toLowerCase() === nameLower);
        return agentByName?.id;
    }
};
ChatSetupExtensionUrlHandler = __decorate([
    __param(0, IProductService),
    __param(1, ICommandService),
    __param(2, ITelemetryService),
    __param(3, IChatModeService)
], ChatSetupExtensionUrlHandler);
let ChatTeardownContribution = class ChatTeardownContribution extends Disposable {
    static { ChatTeardownContribution_1 = this; }
    static { this.ID = 'workbench.contrib.chatTeardown'; }
    static { this.CHAT_DISABLED_CONFIGURATION_KEY = 'chat.disableAIFeatures'; }
    constructor(chatEntitlementService, configurationService, extensionsWorkbenchService, extensionEnablementService, viewDescriptorService, layoutService) {
        super();
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.viewDescriptorService = viewDescriptorService;
        this.layoutService = layoutService;
        const context = chatEntitlementService.context?.value;
        if (!context) {
            return; // disabled
        }
        this.registerListeners();
        this.registerActions();
        this.handleChatDisabled(false);
    }
    handleChatDisabled(fromEvent) {
        const chatDisabled = this.configurationService.inspect(ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY);
        if (chatDisabled.value === true) {
            this.maybeEnableOrDisableExtension(typeof chatDisabled.workspaceValue === 'boolean' ? 11 /* EnablementState.DisabledWorkspace */ : 10 /* EnablementState.DisabledGlobally */);
            if (fromEvent) {
                this.maybeHideAuxiliaryBar();
            }
        }
        else if (chatDisabled.value === false && fromEvent /* do not enable extensions unless its an explicit settings change */) {
            this.maybeEnableOrDisableExtension(typeof chatDisabled.workspaceValue === 'boolean' ? 13 /* EnablementState.EnabledWorkspace */ : 12 /* EnablementState.EnabledGlobally */);
        }
    }
    async registerListeners() {
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration(ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY)) {
                return;
            }
            this.handleChatDisabled(true);
        }));
        // Extension installation
        await this.extensionsWorkbenchService.queryLocal();
        this._register(this.extensionsWorkbenchService.onChange(e => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.chatExtensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.chatExtensionId));
            if (defaultChatExtension?.local && this.extensionEnablementService.isEnabled(defaultChatExtension.local)) {
                this.configurationService.updateValue(ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY, false);
            }
        }));
    }
    async maybeEnableOrDisableExtension(state) {
        const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.chatExtensionId));
        if (!defaultChatExtension) {
            return;
        }
        await this.extensionsWorkbenchService.setEnablement([defaultChatExtension], state);
        await this.extensionsWorkbenchService.updateRunningExtensions(state === 12 /* EnablementState.EnabledGlobally */ || state === 13 /* EnablementState.EnabledWorkspace */ ? localize('restartExtensionHost.reason.enable', "Enabling AI features") : localize('restartExtensionHost.reason.disable', "Disabling AI features"));
    }
    maybeHideAuxiliaryBar() {
        const activeContainers = this.viewDescriptorService.getViewContainersByLocation(2 /* ViewContainerLocation.AuxiliaryBar */).filter(container => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);
        if ((activeContainers.length === 0) || // chat view is already gone but we know it was there before
            (activeContainers.length === 1 && activeContainers.at(0)?.id === ChatViewContainerId) // chat view is the only view which is going to go away
        ) {
            this.layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */); // hide if there are no views in the secondary sidebar
        }
    }
    registerActions() {
        class ChatSetupHideAction extends Action2 {
            static { this.ID = 'workbench.action.chat.hideSetup'; }
            static { this.TITLE = localize2('hideChatSetup', "Learn How to Hide AI Features"); }
            constructor() {
                super({
                    id: ChatSetupHideAction.ID,
                    title: ChatSetupHideAction.TITLE,
                    f1: true,
                    category: CHAT_CATEGORY,
                    precondition: ChatContextKeys.Setup.hidden.negate(),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'z_hide',
                        order: 1,
                        when: ChatContextKeys.Setup.installed.negate()
                    }
                });
            }
            async run(accessor) {
                const preferencesService = accessor.get(IPreferencesService);
                preferencesService.openSettings({ jsonEditor: false, query: `@id:${ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY}` });
            }
        }
        registerAction2(ChatSetupHideAction);
    }
};
ChatTeardownContribution = ChatTeardownContribution_1 = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IConfigurationService),
    __param(2, IExtensionsWorkbenchService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, IViewDescriptorService),
    __param(5, IWorkbenchLayoutService)
], ChatTeardownContribution);
export { ChatTeardownContribution };
//#endregion
export function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwQ29udHJpYnV0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNldHVwL2NoYXRTZXR1cENvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUgsT0FBTyxRQUFRLE1BQU0sd0NBQXdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0csT0FBTyxFQUFF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
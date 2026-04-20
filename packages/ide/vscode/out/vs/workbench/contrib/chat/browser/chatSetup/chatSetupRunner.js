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
var ChatSetup_1;
import './media/chatSetup.css';
import { $ } from '../../../../../base/browser/dom.js';
import { Dialog, DialogContentsAlignment } from '../../../../../base/browser/ui/dialog/dialog.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { createWorkbenchDialogOptions } from '../../../../../platform/dialogs/browser/dialog.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import product from '../../../../../platform/product/common/product.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceTrustRequestService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ChatEntitlement, ChatEntitlementRequests, IChatEntitlementService, isProUser } from '../../../../services/chat/common/chatEntitlementService.js';
import { IChatWidgetService } from '../chat.js';
import { ChatSetupAnonymous, ChatSetupStrategy } from './chatSetup.js';
const defaultChat = {
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { id: '', name: '' }, enterprise: { id: '', name: '' }, apple: { id: '', name: '' }, google: { id: '', name: '' } },
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
    termsStatementUrl: product.defaultChatAgent?.termsStatementUrl ?? '',
    privacyStatementUrl: product.defaultChatAgent?.privacyStatementUrl ?? ''
};
let ChatSetup = class ChatSetup {
    static { ChatSetup_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService, context, controller) {
        let instance = ChatSetup_1.instance;
        if (!instance) {
            instance = ChatSetup_1.instance = instantiationService.invokeFunction(accessor => {
                return new ChatSetup_1(context, controller, accessor.get(ITelemetryService), accessor.get(IWorkbenchLayoutService), accessor.get(IKeybindingService), accessor.get(IChatEntitlementService), accessor.get(ILogService), accessor.get(IConfigurationService), accessor.get(IChatWidgetService), accessor.get(IWorkspaceTrustRequestService), accessor.get(IMarkdownRendererService));
            });
        }
        return instance;
    }
    constructor(context, controller, telemetryService, layoutService, keybindingService, chatEntitlementService, logService, configurationService, widgetService, workspaceTrustRequestService, markdownRendererService) {
        this.context = context;
        this.controller = controller;
        this.telemetryService = telemetryService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.chatEntitlementService = chatEntitlementService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.widgetService = widgetService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.markdownRendererService = markdownRendererService;
        this.pendingRun = undefined;
        this.skipDialogOnce = false;
    }
    skipDialog() {
        this.skipDialogOnce = true;
    }
    async run(options) {
        if (this.pendingRun) {
            return this.pendingRun;
        }
        this.pendingRun = this.doRun(options);
        try {
            return await this.pendingRun;
        }
        finally {
            this.pendingRun = undefined;
        }
    }
    async doRun(options) {
        this.context.update({ later: false });
        const dialogSkipped = this.skipDialogOnce;
        this.skipDialogOnce = false;
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('chatWorkspaceTrust', "AI features are currently only supported in trusted workspaces.")
        });
        if (!trusted) {
            this.context.update({ later: true });
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotTrusted', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
            return { dialogSkipped, success: undefined /* canceled */ };
        }
        let setupStrategy;
        if (!options?.forceSignInDialog && (dialogSkipped || isProUser(this.chatEntitlementService.entitlement) || this.chatEntitlementService.entitlement === ChatEntitlement.Free)) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // existing pro/free users setup without a dialog
        }
        else if (options?.forceAnonymous === ChatSetupAnonymous.EnabledWithoutDialog) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // anonymous setup without a dialog
        }
        else {
            setupStrategy = await this.showDialog(options);
        }
        if (setupStrategy === ChatSetupStrategy.DefaultSetup && ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id) {
            setupStrategy = ChatSetupStrategy.SetupWithEnterpriseProvider; // users with a configured provider go through provider setup
        }
        if (setupStrategy !== ChatSetupStrategy.Canceled && !options?.disableChatViewReveal) {
            // Show the chat view now to better indicate progress
            // while installing the extension or returning from sign in
            this.widgetService.revealWidget();
        }
        let success = undefined;
        try {
            switch (setupStrategy) {
                case ChatSetupStrategy.SetupWithEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: true, useSocialProvider: undefined, additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithoutEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: undefined, additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithAppleProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: 'apple', additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithGoogleProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: 'google', additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.DefaultSetup:
                    success = await this.controller.value.setup({ ...options, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.Canceled:
                    this.context.update({ later: true });
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedMaybeLater', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
                    break;
            }
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
            success = false;
        }
        return { success, dialogSkipped };
    }
    async showDialog(options) {
        const disposables = new DisposableStore();
        const buttons = this.getButtons(options);
        const dialog = disposables.add(new Dialog(this.layoutService.activeContainer, this.getDialogTitle(options), buttons.map(button => button[0]), createWorkbenchDialogOptions({
            type: 'none',
            extraClasses: ['chat-setup-dialog'],
            detail: ' ', // workaround allowing us to render the message in large
            icon: Codicon.copilotLarge,
            alignment: DialogContentsAlignment.Vertical,
            cancelId: buttons.length - 1,
            disableCloseButton: true,
            renderFooter: footer => footer.appendChild(this.createDialogFooter(disposables, options)),
            buttonOptions: buttons.map(button => button[2])
        }, this.keybindingService, this.layoutService)));
        const { button } = await dialog.show();
        disposables.dispose();
        return buttons[button]?.[1] ?? ChatSetupStrategy.Canceled;
    }
    getButtons(options) {
        const styleButton = (...classes) => ({ styleButton: (button) => button.element.classList.add(...classes) });
        let buttons;
        if (!options?.forceAnonymous && (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog)) {
            const defaultProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.default.name), ChatSetupStrategy.SetupWithoutEnterpriseProvider, styleButton('continue-button', 'default')];
            const defaultProviderLink = [defaultProviderButton[0], defaultProviderButton[1], styleButton('link-button')];
            const enterpriseProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.enterprise.name), ChatSetupStrategy.SetupWithEnterpriseProvider, styleButton('continue-button', 'default')];
            const enterpriseProviderLink = [enterpriseProviderButton[0], enterpriseProviderButton[1], styleButton('link-button')];
            const googleProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.google.name), ChatSetupStrategy.SetupWithGoogleProvider, styleButton('continue-button', 'google')];
            const appleProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.apple.name), ChatSetupStrategy.SetupWithAppleProvider, styleButton('continue-button', 'apple')];
            if (ChatEntitlementRequests.providerId(this.configurationService) !== defaultChat.provider.enterprise.id) {
                buttons = coalesce([
                    defaultProviderButton,
                    googleProviderButton,
                    appleProviderButton,
                    enterpriseProviderLink
                ]);
            }
            else {
                buttons = coalesce([
                    enterpriseProviderButton,
                    googleProviderButton,
                    appleProviderButton,
                    defaultProviderLink
                ]);
            }
        }
        else {
            buttons = [[localize('setupAIButton', "Use AI Features"), ChatSetupStrategy.DefaultSetup, undefined]];
        }
        buttons.push([localize('skipForNow', "Skip for now"), ChatSetupStrategy.Canceled, styleButton('link-button', 'skip-button')]);
        return buttons;
    }
    getDialogTitle(options) {
        if (this.chatEntitlementService.anonymous) {
            if (options?.forceAnonymous) {
                return localize('startUsing', "Start using AI Features");
            }
            else {
                return localize('enableMore', "Enable more AI features");
            }
        }
        if (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog) {
            return localize('signIn', "Sign in to use AI Features");
        }
        return localize('startUsing', "Start using AI Features");
    }
    createDialogFooter(disposables, options) {
        const element = $('.chat-setup-dialog-footer');
        let footer;
        if (options?.forceAnonymous || this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */) {
            footer = localize({ key: 'settingsAnonymous', comment: ['{Locked="["}', '{Locked="]({1})"}', '{Locked="]({2})"}'] }, "By continuing, you agree to {0}'s [Terms]({1}) and [Privacy Statement]({2}).", defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        }
        else {
            footer = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({1})"}', '{Locked="]({2})"}', '{Locked="]({4})"}', '{Locked="]({5})"}'] }, "By continuing, you agree to {0}'s [Terms]({1}) and [Privacy Statement]({2}). {3} Copilot may show [public code]({4}) suggestions and use your data to improve the product. You can change these [settings]({5}) anytime.", defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl, defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
        }
        element.appendChild($('p', undefined, disposables.add(this.markdownRendererService.render(new MarkdownString(footer, { isTrusted: true }))).element));
        return element;
    }
};
ChatSetup = ChatSetup_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, ILayoutService),
    __param(4, IKeybindingService),
    __param(5, IChatEntitlementService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IChatWidgetService),
    __param(9, IWorkspaceTrustRequestService),
    __param(10, IMarkdownRendererService)
], ChatSetup);
export { ChatSetup };
//#endregion
export function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwUnVubmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2V0dXAvY2hhdFNldHVwUnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLE9BQU8sTUFBTSxtREFBbUQsQ0FBQztBQUN4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
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
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import Severity from '../../../../../base/common/severity.js';
import { StopWatch } from '../../../../../base/common/stopwatch.js';
import { isObject } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import product from '../../../../../platform/product/common/product.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IActivityService, ProgressBadge } from '../../../../services/activity/common/activity.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { ChatEntitlement, ChatEntitlementRequests, isProUser } from '../../../../services/chat/common/chatEntitlementService.js';
import { CHAT_OPEN_ACTION_ID } from '../actions/chatActions.js';
import { ChatViewId, ChatViewContainerId } from '../chat.js';
import { ChatSetupStep, refreshTokens } from './chatSetup.js';
const defaultChat = {
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { id: '', name: '' }, enterprise: { id: '', name: '' }, apple: { id: '', name: '' }, google: { id: '', name: '' } },
    providerUriSetting: product.defaultChatAgent?.providerUriSetting ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
};
let ChatSetupController = class ChatSetupController extends Disposable {
    get step() { return this._step; }
    constructor(context, requests, telemetryService, authenticationService, extensionsWorkbenchService, productService, logService, progressService, activityService, commandService, dialogService, configurationService, lifecycleService, quickInputService) {
        super();
        this.context = context;
        this.requests = requests;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.productService = productService;
        this.logService = logService;
        this.progressService = progressService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.lifecycleService = lifecycleService;
        this.quickInputService = quickInputService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._step = ChatSetupStep.Initial;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.context.onDidChange(() => this._onDidChange.fire()));
    }
    setStep(step) {
        if (this._step === step) {
            return;
        }
        this._step = step;
        this._onDidChange.fire();
    }
    async setup(options = {}) {
        const watch = new StopWatch(false);
        const title = localize('setupChatProgress', "Getting chat ready...");
        const badge = this.activityService.showViewContainerActivity(ChatViewContainerId, {
            badge: new ProgressBadge(() => title),
        });
        try {
            return await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                command: CHAT_OPEN_ACTION_ID,
                title,
            }, () => this.doSetup(options, watch));
        }
        finally {
            badge.dispose();
        }
    }
    async doSetup(options, watch) {
        this.context.suspend(); // reduces flicker
        let success = false;
        try {
            const providerId = ChatEntitlementRequests.providerId(this.configurationService);
            let session;
            let entitlement;
            let signIn;
            if (options.forceSignIn) {
                signIn = true; // forced to sign in
            }
            else if (this.context.state.entitlement === ChatEntitlement.Unknown) {
                if (options.forceAnonymous) {
                    signIn = false; // forced to anonymous without sign in
                }
                else {
                    signIn = true; // sign in since we are signed out
                }
            }
            else {
                signIn = false; // already signed in
            }
            if (signIn) {
                this.setStep(ChatSetupStep.SigningIn);
                const result = await this.signIn(options);
                if (!result.session) {
                    this.doInstall(); // still install the extension in the background to remind the user to sign-in eventually
                    const provider = options.useSocialProvider ?? (options.useEnterpriseProvider ? defaultChat.provider.enterprise.id : defaultChat.provider.default.id);
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotSignedIn', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
                    return undefined; // treat as cancelled because signing in already triggers an error dialog
                }
                session = result.session;
                entitlement = result.entitlement;
            }
            // Await Install
            this.setStep(ChatSetupStep.Installing);
            success = await this.install(session, entitlement ?? this.context.state.entitlement, providerId, watch, options);
        }
        finally {
            this.setStep(ChatSetupStep.Initial);
            this.context.resume();
        }
        return success;
    }
    async signIn(options) {
        let session;
        let entitlements;
        try {
            ({ session, entitlements } = await this.requests.signIn(options));
        }
        catch (e) {
            this.logService.error(`[chat setup] signIn: error ${e}`);
        }
        if (!session && !this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignInError', "Failed to sign in to {0}. Would you like to try again?", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name),
                detail: localize('unknownSignInErrorDetail', "You must be signed in to use AI features."),
                primaryButton: localize('retry', "Retry")
            });
            if (confirmed) {
                return this.signIn(options);
            }
        }
        return { session, entitlement: entitlements?.entitlement };
    }
    async install(session, entitlement, providerId, watch, options) {
        const wasRunning = this.context.state.installed && !this.context.state.disabled;
        let signUpResult = undefined;
        let provider;
        if (options.forceAnonymous && entitlement === ChatEntitlement.Unknown) {
            provider = 'anonymous';
        }
        else {
            provider = options.useSocialProvider ?? (options.useEnterpriseProvider ? defaultChat.provider.enterprise.id : defaultChat.provider.default.id);
        }
        let sessions = session ? [session] : undefined;
        try {
            if (!options.forceAnonymous && // User is not asking for anonymous access
                entitlement !== ChatEntitlement.Free && // User is not signed up to Copilot Free
                !isProUser(entitlement) && // User is not signed up for a Copilot subscription
                entitlement !== ChatEntitlement.Unavailable // User is eligible for Copilot Free
            ) {
                if (!sessions) {
                    try {
                        // Consider all sessions for the provider to be suitable for signing up
                        const existingSessions = await this.authenticationService.getSessions(providerId);
                        sessions = existingSessions.length > 0 ? [...existingSessions] : undefined;
                    }
                    catch (error) {
                        // ignore - errors can throw if a provider is not registered
                    }
                    if (!sessions || sessions.length === 0) {
                        this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNoSession', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
                        return false; // unexpected
                    }
                }
                signUpResult = await this.requests.signUpFree(sessions);
                if (typeof signUpResult !== 'boolean' /* error */) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedSignUp', installDuration: watch.elapsed(), signUpErrorCode: signUpResult.errorCode, provider });
                }
            }
            await this.doInstallWithRetry();
        }
        catch (error) {
            this.logService.error(`[chat setup] install: error ${error}`);
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: isCancellationError(error) ? 'cancelled' : 'failedInstall', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
            return false;
        }
        if (typeof signUpResult === 'boolean' /* not an error case */ || typeof signUpResult === 'undefined' /* already signed up */) {
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: wasRunning && !signUpResult ? 'alreadyInstalled' : 'installed', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
        }
        if (wasRunning) {
            // We always trigger refresh of tokens to help the user
            // get out of authentication issues that can happen when
            // for example the sign-up ran after the extension tried
            // to use the authentication information to mint a token
            refreshTokens(this.commandService);
        }
        return true;
    }
    async doInstallWithRetry() {
        let error;
        try {
            await this.doInstall();
        }
        catch (e) {
            this.logService.error(`[chat setup] install: error ${error}`);
            error = e;
        }
        if (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: localize('unknownSetupError', "An error occurred while setting up chat. Would you like to try again?"),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: localize('retry', "Retry")
                });
                if (confirmed) {
                    return this.doInstallWithRetry();
                }
            }
            throw error;
        }
    }
    async doInstall() {
        await this.extensionsWorkbenchService.install(defaultChat.chatExtensionId, {
            enable: true,
            isApplicationScoped: true, // install into all profiles
            isMachineScoped: false, // do not ask to sync
            installEverywhere: true, // install in local and remote
            installPreReleaseVersion: this.productService.quality !== 'stable'
        }, ChatViewId);
    }
    async setupWithProvider(options) {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            'id': 'copilot.setup',
            'type': 'object',
            'properties': {
                [defaultChat.completionsAdvancedSetting]: {
                    'type': 'object',
                    'properties': {
                        'authProvider': {
                            'type': 'string'
                        }
                    }
                },
                [defaultChat.providerUriSetting]: {
                    'type': 'string'
                }
            }
        });
        if (options.useEnterpriseProvider) {
            const success = await this.handleEnterpriseInstance();
            if (!success) {
                this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedEnterpriseSetup', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
                return success; // not properly configured, abort
            }
        }
        let existingAdvancedSetting = this.configurationService.inspect(defaultChat.completionsAdvancedSetting).user?.value;
        if (!isObject(existingAdvancedSetting)) {
            existingAdvancedSetting = {};
        }
        if (options.useEnterpriseProvider) {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, {
                ...existingAdvancedSetting,
                'authProvider': defaultChat.provider.enterprise.id
            }, 2 /* ConfigurationTarget.USER */);
        }
        else {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, Object.keys(existingAdvancedSetting).length > 0 ? {
                ...existingAdvancedSetting,
                'authProvider': undefined
            } : undefined, 2 /* ConfigurationTarget.USER */);
        }
        return this.setup({ ...options, forceSignIn: true });
    }
    async handleEnterpriseInstance() {
        const domainRegEx = /^[a-zA-Z\-_]+$/;
        const fullUriRegEx = /^(https:\/\/)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.ghe\.com\/?$/;
        const uri = this.configurationService.getValue(defaultChat.providerUriSetting);
        if (typeof uri === 'string' && fullUriRegEx.test(uri)) {
            return true; // already setup with a valid URI
        }
        let isSingleWord = false;
        const result = await this.quickInputService.input({
            prompt: localize('enterpriseInstance', "What is your {0} instance?", defaultChat.provider.enterprise.name),
            placeHolder: localize('enterpriseInstancePlaceholder', 'i.e. "octocat" or "https://octocat.ghe.com"...'),
            ignoreFocusLost: true,
            value: uri,
            validateInput: async (value) => {
                isSingleWord = false;
                if (!value) {
                    return undefined;
                }
                if (domainRegEx.test(value)) {
                    isSingleWord = true;
                    return {
                        content: localize('willResolveTo', "Will resolve to {0}", `https://${value}.ghe.com`),
                        severity: Severity.Info
                    };
                }
                if (!fullUriRegEx.test(value)) {
                    return {
                        content: localize('invalidEnterpriseInstance', 'You must enter a valid {0} instance (i.e. "octocat" or "https://octocat.ghe.com")', defaultChat.provider.enterprise.name),
                        severity: Severity.Error
                    };
                }
                return undefined;
            }
        });
        if (!result) {
            return undefined; // canceled
        }
        let resolvedUri = result;
        if (isSingleWord) {
            resolvedUri = `https://${resolvedUri}.ghe.com`;
        }
        else {
            const normalizedUri = result.toLowerCase();
            const hasHttps = normalizedUri.startsWith('https://');
            if (!hasHttps) {
                resolvedUri = `https://${result}`;
            }
        }
        await this.configurationService.updateValue(defaultChat.providerUriSetting, resolvedUri, 2 /* ConfigurationTarget.USER */);
        return true;
    }
};
ChatSetupController = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IProductService),
    __param(6, ILogService),
    __param(7, IProgressService),
    __param(8, IActivityService),
    __param(9, ICommandService),
    __param(10, IDialogService),
    __param(11, IConfigurationService),
    __param(12, ILifecycleService),
    __param(13, IQuickInputService)
], ChatSetupController);
export { ChatSetupController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNldHVwL2NoYXRTZXR1cENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxRQUFRLE1BQU0sd0NBQXdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUEwQixNQUFNLHVFQUF1RSxDQUFDO0FBQ3RKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxPQUFPLE1BQU0sbURBQW1ELENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFB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
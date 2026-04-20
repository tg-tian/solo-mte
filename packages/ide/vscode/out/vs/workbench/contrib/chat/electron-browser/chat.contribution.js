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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { resolve } from '../../../../base/common/path.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-browser/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ACTION_ID_NEW_CHAT, CHAT_OPEN_ACTION_ID } from '../browser/actions/chatActions.js';
import { IChatWidgetService } from '../browser/chat.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { IChatService } from '../common/chatService.js';
import { ChatUrlFetchingConfirmationContribution } from '../common/chatUrlFetchingConfirmation.js';
import { ILanguageModelToolsConfirmationService } from '../common/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { InternalFetchWebPageToolId } from '../common/tools/tools.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { HoldToVoiceChatInChatViewAction, InlineVoiceChatAction, KeywordActivationContribution, QuickVoiceChatAction, ReadChatResponseAloud, StartVoiceChatAction, StopListeningAction, StopListeningAndSubmitAction, StopReadAloud, StopReadChatItemAloud, VoiceChatInChatViewAction } from './actions/voiceChatActions.js';
import { FetchWebPageTool, FetchWebPageToolData } from './tools/fetchPageTool.js';
let NativeBuiltinToolsContribution = class NativeBuiltinToolsContribution extends Disposable {
    static { this.ID = 'chat.nativeBuiltinTools'; }
    constructor(toolsService, instantiationService, confirmationService) {
        super();
        const editTool = instantiationService.createInstance(FetchWebPageTool);
        this._register(toolsService.registerTool(FetchWebPageToolData, editTool));
        this._register(confirmationService.registerConfirmationContribution(InternalFetchWebPageToolId, instantiationService.createInstance(ChatUrlFetchingConfirmationContribution, params => params.urls)));
    }
};
NativeBuiltinToolsContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, ILanguageModelToolsConfirmationService)
], NativeBuiltinToolsContribution);
let ChatCommandLineHandler = class ChatCommandLineHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatCommandLineHandler'; }
    constructor(environmentService, commandService, workspaceTrustRequestService, logService, layoutService, contextKeyService) {
        super();
        this.environmentService = environmentService;
        this.commandService = commandService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.contextKeyService = contextKeyService;
        this.registerListeners();
    }
    registerListeners() {
        ipcRenderer.on('vscode:handleChatRequest', (_, ...args) => {
            const chatArgs = args[0];
            this.logService.trace('vscode:handleChatRequest', chatArgs);
            this.prompt(chatArgs);
        });
    }
    async prompt(args) {
        if (!Array.isArray(args?._)) {
            return;
        }
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('copilotWorkspaceTrust', "AI features are currently only supported in trusted workspaces.")
        });
        if (!trusted) {
            return;
        }
        const opts = {
            query: args._.length > 0 ? args._.join(' ') : '',
            mode: args.mode ?? ChatModeKind.Agent,
            attachFiles: args['add-file']?.map(file => URI.file(resolve(file))), // use `resolve` to deal with relative paths properly
        };
        if (args.maximize) {
            const location = this.contextKeyService.getContextKeyValue(ChatContextKeys.panelLocation.key);
            if (location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                this.layoutService.setAuxiliaryBarMaximized(true);
            }
            else if (location === 1 /* ViewContainerLocation.Panel */ && !this.layoutService.isPanelMaximized()) {
                this.layoutService.toggleMaximizedPanel();
            }
        }
        await this.commandService.executeCommand(ACTION_ID_NEW_CHAT);
        await this.commandService.executeCommand(CHAT_OPEN_ACTION_ID, opts);
    }
};
ChatCommandLineHandler = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, ICommandService),
    __param(2, IWorkspaceTrustRequestService),
    __param(3, ILogService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextKeyService)
], ChatCommandLineHandler);
let ChatSuspendThrottlingHandler = class ChatSuspendThrottlingHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatSuspendThrottlingHandler'; }
    constructor(nativeHostService, chatService, configurationService) {
        super();
        if (!configurationService.getValue(ChatConfiguration.SuspendThrottling)) {
            return;
        }
        this._register(autorun(reader => {
            const running = chatService.requestInProgressObs.read(reader);
            // When a chat request is in progress, we must ensure that background
            // throttling is not applied so that the chat session can continue
            // even when the window is not in focus.
            nativeHostService.setBackgroundThrottling(!running);
        }));
    }
};
ChatSuspendThrottlingHandler = __decorate([
    __param(0, INativeHostService),
    __param(1, IChatService),
    __param(2, IConfigurationService)
], ChatSuspendThrottlingHandler);
let ChatLifecycleHandler = class ChatLifecycleHandler extends Disposable {
    static { this.ID = 'workbench.contrib.chatLifecycleHandler'; }
    constructor(lifecycleService, chatService, dialogService, widgetService, contextKeyService, extensionService) {
        super();
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.widgetService = widgetService;
        this.contextKeyService = contextKeyService;
        this._register(lifecycleService.onBeforeShutdown(e => {
            e.veto(this.shouldVetoShutdown(e.reason), 'veto.chat');
        }));
        this._register(extensionService.onWillStop(e => {
            e.veto(this.chatService.requestInProgressObs.get(), localize('chatRequestInProgress', "A chat request is in progress."));
        }));
    }
    shouldVetoShutdown(reason) {
        const running = this.chatService.requestInProgressObs.read(undefined);
        if (!running) {
            return false;
        }
        if (ChatContextKeys.skipChatRequestInProgressMessage.getValue(this.contextKeyService) === true) {
            return false;
        }
        return this.doShouldVetoShutdown(reason);
    }
    async doShouldVetoShutdown(reason) {
        this.widgetService.revealWidget();
        let message;
        let detail;
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                message = localize('closeTheWindow.message', "A chat request is in progress. Are you sure you want to close the window?");
                detail = localize('closeTheWindow.detail', "The chat request will stop if you close the window.");
                break;
            case 4 /* ShutdownReason.LOAD */:
                message = localize('changeWorkspace.message', "A chat request is in progress. Are you sure you want to change the workspace?");
                detail = localize('changeWorkspace.detail', "The chat request will stop if you change the workspace.");
                break;
            case 3 /* ShutdownReason.RELOAD */:
                message = localize('reloadTheWindow.message', "A chat request is in progress. Are you sure you want to reload the window?");
                detail = localize('reloadTheWindow.detail', "The chat request will stop if you reload the window.");
                break;
            default:
                message = isMacintosh ? localize('quit.message', "A chat request is in progress. Are you sure you want to quit?") : localize('exit.message', "A chat request is in progress. Are you sure you want to exit?");
                detail = isMacintosh ? localize('quit.detail', "The chat request will stop if you quit.") : localize('exit.detail', "The chat request will stop if you exit.");
                break;
        }
        const result = await this.dialogService.confirm({ message, detail });
        return !result.confirmed;
    }
};
ChatLifecycleHandler = __decorate([
    __param(0, ILifecycleService),
    __param(1, IChatService),
    __param(2, IDialogService),
    __param(3, IChatWidgetService),
    __param(4, IContextKeyService),
    __param(5, IExtensionService)
], ChatLifecycleHandler);
registerAction2(StartVoiceChatAction);
registerAction2(VoiceChatInChatViewAction);
registerAction2(HoldToVoiceChatInChatViewAction);
registerAction2(QuickVoiceChatAction);
registerAction2(InlineVoiceChatAction);
registerAction2(StopListeningAction);
registerAction2(StopListeningAndSubmitAction);
registerAction2(ReadChatResponseAloud);
registerAction2(StopReadChatItemAloud);
registerAction2(StopReadAloud);
registerChatDeveloperActions();
registerWorkbenchContribution2(KeywordActivationContribution.ID, KeywordActivationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(NativeBuiltinToolsContribution.ID, NativeBuiltinToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatCommandLineHandler.ID, ChatCommandLineHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatSuspendThrottlingHandler.ID, ChatSuspendThrottlingHandler, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatLifecycleHandler.ID, ChatLifecycleHandler, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9lbGVjdHJvbi1icm93c2VyL2NoYXQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLDZCQUE2QixFQUFF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
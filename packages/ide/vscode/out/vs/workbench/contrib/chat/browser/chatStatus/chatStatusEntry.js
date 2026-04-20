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
import './media/chatStatus.css';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IStatusbarService, ShowTooltipCommand } from '../../../../services/statusbar/browser/statusbar.js';
import { ChatEntitlement, IChatEntitlementService, isProUser } from '../../../../services/chat/common/chatEntitlementService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IInlineCompletionsService } from '../../../../../editor/browser/services/inlineCompletionsService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ChatStatusDashboard } from './chatStatusDashboard.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { disposableWindowInterval } from '../../../../../base/browser/dom.js';
import { isNewUser, isCompletionsEnabled } from './chatStatus.js';
import product from '../../../../../platform/product/common/product.js';
let ChatStatusBarEntry = class ChatStatusBarEntry extends Disposable {
    static { this.ID = 'workbench.contrib.chatStatusBarEntry'; }
    constructor(chatEntitlementService, instantiationService, statusbarService, editorService, configurationService, completionsService, chatSessionsService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.instantiationService = instantiationService;
        this.statusbarService = statusbarService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.completionsService = completionsService;
        this.chatSessionsService = chatSessionsService;
        this.entry = undefined;
        this.activeCodeEditorListener = this._register(new MutableDisposable());
        this.runningSessionsCount = this.chatSessionsService.getInProgress().reduce((total, item) => total + item.count, 0);
        this.update();
        this.registerListeners();
    }
    update() {
        const sentiment = this.chatEntitlementService.sentiment;
        if (!sentiment.hidden) {
            const props = this.getEntryProps();
            if (this.entry) {
                this.entry.update(props);
            }
            else {
                this.entry = this.statusbarService.addEntry(props, 'chat.statusBarEntry', 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.editor.mode', priority: 100.1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
            }
        }
        else {
            this.entry?.dispose();
            this.entry = undefined;
        }
    }
    registerListeners() {
        this._register(this.chatEntitlementService.onDidChangeQuotaExceeded(() => this.update()));
        this._register(this.chatEntitlementService.onDidChangeSentiment(() => this.update()));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.update()));
        this._register(this.completionsService.onDidChangeIsSnoozing(() => this.update()));
        this._register(this.chatSessionsService.onDidChangeInProgress(() => {
            const oldSessionsCount = this.runningSessionsCount;
            this.runningSessionsCount = this.chatSessionsService.getInProgress().reduce((total, item) => total + item.count, 0);
            if (this.runningSessionsCount !== oldSessionsCount) {
                this.update();
            }
        }));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(product.defaultChatAgent.completionsEnablementSetting)) {
                this.update();
            }
        }));
    }
    onDidActiveEditorChange() {
        this.update();
        this.activeCodeEditorListener.clear();
        // Listen to language changes in the active code editor
        const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
        if (activeCodeEditor) {
            this.activeCodeEditorListener.value = activeCodeEditor.onDidChangeModelLanguage(() => {
                this.update();
            });
        }
    }
    getEntryProps() {
        let text = '$(copilot)';
        let ariaLabel = localize('chatStatusAria', "Copilot status");
        let kind;
        if (isNewUser(this.chatEntitlementService)) {
            const entitlement = this.chatEntitlementService.entitlement;
            // Finish Setup
            if (this.chatEntitlementService.sentiment.later || // user skipped setup
                entitlement === ChatEntitlement.Available || // user is entitled
                isProUser(entitlement) || // user is already pro
                entitlement === ChatEntitlement.Free // user is already free
            ) {
                const finishSetup = localize('finishSetup', "Finish Setup");
                text = `$(copilot) ${finishSetup}`;
                ariaLabel = finishSetup;
                kind = 'prominent';
            }
        }
        else {
            const chatQuotaExceeded = this.chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const completionsQuotaExceeded = this.chatEntitlementService.quotas.completions?.percentRemaining === 0;
            // Disabled
            if (this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted) {
                text = '$(copilot-unavailable)';
                ariaLabel = localize('copilotDisabledStatus', "Copilot disabled");
            }
            // Sessions in progress
            else if (this.runningSessionsCount > 0) {
                text = '$(copilot-in-progress)';
                if (this.runningSessionsCount > 1) {
                    ariaLabel = localize('chatSessionsInProgressStatus', "{0} agent sessions in progress", this.runningSessionsCount);
                }
                else {
                    ariaLabel = localize('chatSessionInProgressStatus', "1 agent session in progress");
                }
            }
            // Signed out
            else if (this.chatEntitlementService.entitlement === ChatEntitlement.Unknown) {
                const signedOutWarning = localize('notSignedIn', "Signed out");
                text = `${this.chatEntitlementService.anonymous ? '$(copilot)' : '$(copilot-not-connected)'} ${signedOutWarning}`;
                ariaLabel = signedOutWarning;
                kind = 'prominent';
            }
            // Free Quota Exceeded
            else if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && (chatQuotaExceeded || completionsQuotaExceeded)) {
                let quotaWarning;
                if (chatQuotaExceeded && !completionsQuotaExceeded) {
                    quotaWarning = localize('chatQuotaExceededStatus', "Chat quota reached");
                }
                else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                    quotaWarning = localize('completionsQuotaExceededStatus', "Inline suggestions quota reached");
                }
                else {
                    quotaWarning = localize('chatAndCompletionsQuotaExceededStatus', "Quota reached");
                }
                text = `$(copilot-warning) ${quotaWarning}`;
                ariaLabel = quotaWarning;
                kind = 'prominent';
            }
            // Completions Disabled
            else if (this.editorService.activeTextEditorLanguageId && !isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId)) {
                text = '$(copilot-unavailable)';
                ariaLabel = localize('completionsDisabledStatus', "Inline suggestions disabled");
            }
            // Completions Snoozed
            else if (this.completionsService.isSnoozing()) {
                text = '$(copilot-snooze)';
                ariaLabel = localize('completionsSnoozedStatus', "Inline suggestions snoozed");
            }
        }
        const baseResult = {
            name: localize('chatStatus', "Copilot Status"),
            text,
            ariaLabel,
            command: ShowTooltipCommand,
            showInAllWindows: true,
            kind,
            tooltip: {
                element: (token) => {
                    const store = new DisposableStore();
                    store.add(token.onCancellationRequested(() => {
                        store.dispose();
                    }));
                    const elem = ChatStatusDashboard.instantiateInContents(this.instantiationService, store);
                    // todo@connor4312/@benibenj: workaround for #257923
                    store.add(disposableWindowInterval(mainWindow, () => {
                        if (!elem.isConnected) {
                            store.dispose();
                        }
                    }, 2000));
                    return elem;
                }
            }
        };
        return baseResult;
    }
    dispose() {
        super.dispose();
        this.entry?.dispose();
        this.entry = undefined;
    }
};
ChatStatusBarEntry = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IInstantiationService),
    __param(2, IStatusbarService),
    __param(3, IEditorService),
    __param(4, IConfigurationService),
    __param(5, IInlineCompletionsService),
    __param(6, IChatSessionsService)
], ChatStatusBarEntry);
export { ChatStatusBarEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1c0VudHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U3RhdHVzL2NoYXRTdGF0dXNFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sRUFBNEMsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQTBDLE1BQU0scURBQXFELENBQUM7QUFDOUwsT0FBTyxFQUFFLGVBQWUsRUFBMEIsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFekosT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUMvRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxv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
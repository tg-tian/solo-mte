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
import './media/chatStatusWidget.css';
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { ChatEntitlement, ChatEntitlementContextKeys, IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { ChatInputPartWidgetsRegistry } from './chatInputPartWidgets.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { CHAT_SETUP_ACTION_ID } from './actions/chatActions.js';
const $ = dom.$;
/**
 * Widget that displays a status message with an optional action button.
 * Only shown for free tier users when the setting is enabled (experiment controlled via onExP tag).
 */
let ChatStatusWidget = class ChatStatusWidget extends Disposable {
    static { this.ID = 'chatStatusWidget'; }
    constructor(chatEntitlementService, commandService, configurationService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.domNode = $('.chat-status-widget');
        this.domNode.style.display = 'none';
        this.initializeIfEnabled();
    }
    initializeIfEnabled() {
        const enabledSku = this.configurationService.getValue('chat.statusWidget.sku');
        if (enabledSku !== 'free' && enabledSku !== 'anonymous') {
            return;
        }
        const entitlement = this.chatEntitlementService.entitlement;
        const isAnonymous = this.chatEntitlementService.anonymous;
        if (enabledSku === 'anonymous' && isAnonymous) {
            this.createWidgetContent(enabledSku);
        }
        else if (enabledSku === 'free' && entitlement === ChatEntitlement.Free) {
            this.createWidgetContent(enabledSku);
        }
        else {
            return;
        }
        this.domNode.style.display = '';
        this._onDidChangeHeight.fire();
    }
    get height() {
        return this.domNode.style.display === 'none' ? 0 : this.domNode.offsetHeight;
    }
    createWidgetContent(enabledSku) {
        const contentContainer = $('.chat-status-content');
        this.messageElement = $('.chat-status-message');
        contentContainer.appendChild(this.messageElement);
        const actionContainer = $('.chat-status-action');
        this.actionButton = this._register(new Button(actionContainer, {
            ...defaultButtonStyles,
            supportIcons: true
        }));
        this.actionButton.element.classList.add('chat-status-button');
        if (enabledSku === 'anonymous') {
            const message = localize('chat.anonymousRateLimited.message', "You've reached the limit for chat messages. Try Copilot Pro for free.");
            const buttonLabel = localize('chat.anonymousRateLimited.signIn', "Sign In");
            this.messageElement.textContent = message;
            this.actionButton.label = buttonLabel;
            this.actionButton.element.ariaLabel = localize('chat.anonymousRateLimited.signIn.ariaLabel', "{0} {1}", message, buttonLabel);
        }
        else {
            const message = localize('chat.freeQuotaExceeded.message', "You've reached the limit for chat messages.");
            const buttonLabel = localize('chat.freeQuotaExceeded.upgrade', "Upgrade");
            this.messageElement.textContent = message;
            this.actionButton.label = buttonLabel;
            this.actionButton.element.ariaLabel = localize('chat.freeQuotaExceeded.upgrade.ariaLabel', "{0} {1}", message, buttonLabel);
        }
        this._register(this.actionButton.onDidClick(async () => {
            const commandId = this.chatEntitlementService.anonymous
                ? CHAT_SETUP_ACTION_ID
                : 'workbench.action.chat.upgradePlan';
            await this.commandService.executeCommand(commandId);
        }));
        this.domNode.appendChild(contentContainer);
        this.domNode.appendChild(actionContainer);
    }
};
ChatStatusWidget = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, ICommandService),
    __param(2, IConfigurationService)
], ChatStatusWidget);
export { ChatStatusWidget };
ChatInputPartWidgetsRegistry.register(ChatStatusWidget.ID, ChatStatusWidget, ContextKeyExpr.and(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.chatSessionIsEmpty, ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatEntitlementContextKeys.chatAnonymous)));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1c1dpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFN0YXR1c1dpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9JLE9BQU8sRUFBRSw0QkFBNEIsRUFBd0IsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFaEUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQjs7O0dBR0c7QUFDSSxJQUFNLGdCQUFnQixHQUF0QixNQUFN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
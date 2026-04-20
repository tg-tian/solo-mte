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
import { localize } from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { renderIcon, renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { MANAGE_CHAT_COMMAND_ID } from '../../common/constants.js';
import { TelemetryTrustedValue } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
function modelDelegateToWidgetActionsProvider(delegate, telemetryService) {
    return {
        getActions: () => {
            const models = delegate.getModels();
            if (models.length === 0) {
                // Show a fake "Auto" entry when no models are available
                return [{
                        id: 'auto',
                        enabled: true,
                        checked: true,
                        category: DEFAULT_MODEL_PICKER_CATEGORY,
                        class: undefined,
                        tooltip: localize('chat.modelPicker.auto', "Auto"),
                        label: localize('chat.modelPicker.auto', "Auto"),
                        run: () => { }
                    }];
            }
            return models.map(model => {
                return {
                    id: model.metadata.id,
                    enabled: true,
                    icon: model.metadata.statusIcon,
                    checked: model.identifier === delegate.getCurrentModel()?.identifier,
                    category: model.metadata.modelPickerCategory || DEFAULT_MODEL_PICKER_CATEGORY,
                    class: undefined,
                    description: model.metadata.detail,
                    tooltip: model.metadata.tooltip ?? model.metadata.name,
                    label: model.metadata.name,
                    run: () => {
                        const previousModel = delegate.getCurrentModel();
                        telemetryService.publicLog2('chat.modelChange', {
                            fromModel: previousModel?.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(previousModel.identifier) : 'unknown',
                            toModel: model.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(model.identifier) : 'unknown'
                        });
                        delegate.setModel(model);
                    }
                };
            });
        }
    };
}
function getModelPickerActionBarActionProvider(commandService, chatEntitlementService, productService) {
    const actionProvider = {
        getActions: () => {
            const additionalActions = [];
            if (chatEntitlementService.entitlement === ChatEntitlement.Free ||
                chatEntitlementService.entitlement === ChatEntitlement.Pro ||
                chatEntitlementService.entitlement === ChatEntitlement.ProPlus ||
                chatEntitlementService.isInternal) {
                additionalActions.push({
                    id: 'manageModels',
                    label: localize('chat.manageModels', "Manage Models..."),
                    enabled: true,
                    tooltip: localize('chat.manageModels.tooltip', "Manage Language Models"),
                    class: undefined,
                    run: () => {
                        commandService.executeCommand(MANAGE_CHAT_COMMAND_ID);
                    }
                });
            }
            // Add sign-in / upgrade option if entitlement is anonymous / free / new user
            const isNewOrAnonymousUser = !chatEntitlementService.sentiment.installed ||
                chatEntitlementService.entitlement === ChatEntitlement.Available ||
                chatEntitlementService.anonymous ||
                chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (isNewOrAnonymousUser || chatEntitlementService.entitlement === ChatEntitlement.Free) {
                additionalActions.push({
                    id: 'moreModels',
                    label: isNewOrAnonymousUser ? localize('chat.moreModels', "Add Language Models") : localize('chat.morePremiumModels', "Add Premium Models"),
                    enabled: true,
                    tooltip: isNewOrAnonymousUser ? localize('chat.moreModels.tooltip', "Add Language Models") : localize('chat.morePremiumModels.tooltip', "Add Premium Models"),
                    class: undefined,
                    run: () => {
                        const commandId = isNewOrAnonymousUser ? 'workbench.action.chat.triggerSetup' : 'workbench.action.chat.upgradePlan';
                        commandService.executeCommand(commandId);
                    }
                });
            }
            return additionalActions;
        }
    };
    return actionProvider;
}
/**
 * Action view item for selecting a language model in the chat interface.
 */
let ModelPickerActionItem = class ModelPickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, currentModel, widgetOptions, delegate, actionWidgetService, contextKeyService, commandService, chatEntitlementService, keybindingService, telemetryService, productService, hoverService) {
        // Modify the original action with a different label and make it show the current model
        const actionWithLabel = {
            ...action,
            label: currentModel?.metadata.name ?? localize('chat.modelPicker.auto', "Auto"),
            tooltip: localize('chat.modelPicker.label', "Pick Model"),
            run: () => { }
        };
        const modelPickerActionWidgetOptions = {
            actionProvider: modelDelegateToWidgetActionsProvider(delegate, telemetryService),
            actionBarActionProvider: getModelPickerActionBarActionProvider(commandService, chatEntitlementService, productService)
        };
        super(actionWithLabel, widgetOptions ?? modelPickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.currentModel = currentModel;
        this.hoverService = hoverService;
        this.tooltipDisposable = this._register(new MutableDisposable());
        // Listen for model changes from the delegate
        this._register(delegate.onDidChangeModel(model => {
            this.currentModel = model;
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    renderLabel(element) {
        const { name, statusIcon, tooltip } = this.currentModel?.metadata || {};
        const domChildren = [];
        if (statusIcon) {
            const iconElement = renderIcon(statusIcon);
            domChildren.push(iconElement);
            if (tooltip) {
                this.tooltipDisposable.value = this.hoverService.setupDelayedHoverAtMouse(iconElement, () => ({ content: tooltip }));
            }
        }
        domChildren.push(dom.$('span.chat-model-label', undefined, name ?? localize('chat.modelPicker.auto', "Auto")));
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...domChildren);
        this.setAriaLabelAttributes(element);
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModelPickerActionItem = __decorate([
    __param(4, IActionWidgetService),
    __param(5, IContextKeyService),
    __param(6, ICommandService),
    __param(7, IChatEntitlementService),
    __param(8, IKeybindingService),
    __param(9, ITelemetryService),
    __param(10, IProductService),
    __param(11, IHoverService)
], ModelPickerActionItem);
export { ModelPickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxQaWNrZXJBY3Rpb25JdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9tb2RlbFBpY2tlci9tb2RlbFBpY2tlckFjdGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzFHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ25JLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDdEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFN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
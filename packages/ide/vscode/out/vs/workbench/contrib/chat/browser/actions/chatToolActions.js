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
import { $ } from '../../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatModeKind } from '../../common/constants.js';
import { IChatWidgetService } from '../chat.js';
import { ToolsScope } from '../chatSelectedTools.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { showToolsPicker } from './chatToolPicker.js';
export const AcceptToolConfirmationActionId = 'workbench.action.chat.acceptTool';
export const SkipToolConfirmationActionId = 'workbench.action.chat.skipTool';
export const AcceptToolPostConfirmationActionId = 'workbench.action.chat.acceptToolPostExecution';
export const SkipToolPostConfirmationActionId = 'workbench.action.chat.skipToolPostExecution';
class ToolConfirmationAction extends Action2 {
    run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        const lastItem = widget?.viewModel?.getItems().at(-1);
        if (!isResponseVM(lastItem)) {
            return;
        }
        for (const item of lastItem.model.response.value) {
            const state = item.kind === 'toolInvocation' ? item.state.get() : undefined;
            if (state?.type === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */ || state?.type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                state.confirm(this.getReason());
                break;
            }
        }
        // Return focus to the chat input, in case it was in the tool confirmation editor
        widget?.focusInput();
    }
}
class AcceptToolConfirmation extends ToolConfirmationAction {
    constructor() {
        super({
            id: AcceptToolConfirmationActionId,
            title: localize2('chat.accept', "Accept"),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    getReason() {
        return { type: 4 /* ToolConfirmKind.UserAction */ };
    }
}
class SkipToolConfirmation extends ToolConfirmationAction {
    constructor() {
        super({
            id: SkipToolConfirmationActionId,
            title: localize2('chat.skip', "Skip"),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    getReason() {
        return { type: 5 /* ToolConfirmKind.Skipped */ };
    }
}
class ConfigureToolsAction extends Action2 {
    static { this.ID = 'workbench.action.chat.configureTools'; }
    constructor() {
        super({
            id: ConfigureToolsAction.ID,
            title: localize('label', "Configure Tools..."),
            icon: Codicon.tools,
            f1: false,
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
            menu: [{
                    when: ContextKeyExpr.and(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.lockedToCodingAgent.negate()),
                    id: MenuId.ChatInput,
                    group: 'navigation',
                    order: 100,
                }]
        });
    }
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const telemetryService = accessor.get(ITelemetryService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            function isChatActionContext(obj) {
                return !!obj && typeof obj === 'object' && !!obj.widget;
            }
            const context = args[0];
            if (isChatActionContext(context)) {
                widget = context.widget;
            }
        }
        if (!widget) {
            return;
        }
        let placeholder;
        let description;
        const { entriesScope, entriesMap } = widget.input.selectedToolsModel;
        switch (entriesScope) {
            case ToolsScope.Session:
                placeholder = localize('chat.tools.placeholder.session', "Select tools for this chat session");
                description = localize('chat.tools.description.session', "The selected tools were configured only for this chat session.");
                break;
            case ToolsScope.Agent:
                placeholder = localize('chat.tools.placeholder.agent', "Select tools for this custom agent");
                description = localize('chat.tools.description.agent', "The selected tools are configured by the '{0}' custom agent. Changes to the tools will be applied to the custom agent file as well.", widget.input.currentModeObs.get().label.get());
                break;
            case ToolsScope.Agent_ReadOnly:
                placeholder = localize('chat.tools.placeholder.readOnlyAgent', "Select tools for this custom agent");
                description = localize('chat.tools.description.readOnlyAgent', "The selected tools are configured by the '{0}' custom agent. Changes to the tools will only be used for this session and will not change the '{0}' custom agent.", widget.input.currentModeObs.get().label.get());
                break;
            case ToolsScope.Global:
                placeholder = localize('chat.tools.placeholder.global', "Select tools that are available to chat.");
                description = localize('chat.tools.description.global', "The selected tools will be applied globally for all chat sessions that use the default agent.");
                break;
        }
        // Create a cancellation token that cancels when the mode changes
        const cts = new CancellationTokenSource();
        const initialMode = widget.input.currentModeObs.get();
        const modeListener = autorun(reader => {
            if (initialMode.id !== widget.input.currentModeObs.read(reader).id) {
                cts.cancel();
            }
        });
        try {
            const result = await instaService.invokeFunction(showToolsPicker, placeholder, description, () => entriesMap.get(), cts.token);
            if (result) {
                widget.input.selectedToolsModel.set(result, false);
            }
        }
        finally {
            modeListener.dispose();
            cts.dispose();
        }
        const tools = widget.input.selectedToolsModel.entriesMap.get();
        telemetryService.publicLog2('chat/selectedTools', {
            total: tools.size,
            enabled: Iterable.reduce(tools, (prev, [_, enabled]) => enabled ? prev + 1 : prev, 0),
        });
    }
}
let ConfigureToolsActionRendering = class ConfigureToolsActionRendering {
    static { this.ID = 'chat.configureToolsActionRendering'; }
    constructor(actionViewItemService) {
        const disposable = actionViewItemService.register(MenuId.ChatInput, ConfigureToolsAction.ID, (action, _opts, instantiationService) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    super.render(container);
                    // Add warning indicator element
                    this.warningElement = $(`.tool-warning-indicator${ThemeIcon.asCSSSelector(Codicon.warning)}`);
                    this.warningElement.style.display = 'none';
                    container.appendChild(this.warningElement);
                    container.style.position = 'relative';
                    // Set up context key listeners
                    this.updateWarningState();
                    this._register(this._contextKeyService.onDidChangeContext(() => {
                        this.updateWarningState();
                    }));
                }
                updateWarningState() {
                    const wasShown = this.warningElement.style.display === 'block';
                    const shouldBeShown = this.isAboveToolLimit();
                    if (!wasShown && shouldBeShown) {
                        this.warningElement.style.display = 'block';
                        this.updateTooltip();
                    }
                    else if (wasShown && !shouldBeShown) {
                        this.warningElement.style.display = 'none';
                        this.updateTooltip();
                    }
                }
                getTooltip() {
                    if (this.isAboveToolLimit()) {
                        const warningMessage = localize('chatTools.tooManyEnabled', 'More than {0} tools are enabled, you may experience degraded tool calling.', this._contextKeyService.getContextKeyValue(ChatContextKeys.chatToolGroupingThreshold.key));
                        return `${warningMessage}`;
                    }
                    return super.getTooltip();
                }
                isAboveToolLimit() {
                    const rawToolLimit = this._contextKeyService.getContextKeyValue(ChatContextKeys.chatToolGroupingThreshold.key);
                    const rawToolCount = this._contextKeyService.getContextKeyValue(ChatContextKeys.chatToolCount.key);
                    if (rawToolLimit === undefined || rawToolCount === undefined) {
                        return false;
                    }
                    const toolLimit = Number(rawToolLimit || 0);
                    const toolCount = Number(rawToolCount || 0);
                    return toolCount > toolLimit;
                }
            }, action, undefined);
        });
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
ConfigureToolsActionRendering = __decorate([
    __param(0, IActionViewItemService)
], ConfigureToolsActionRendering);
export function registerChatToolActions() {
    registerAction2(AcceptToolConfirmation);
    registerAction2(SkipToolConfirmation);
    registerAction2(ConfigureToolsAction);
    registerWorkbenchContribution2(ConfigureToolsActionRendering.ID, ConfigureToolsActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRUb29sQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFB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
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
var ChatContinueInSessionActionItem_1;
import { Codicon } from '../../../../../base/common/codicons.js';
import { h } from '../../../../../base/browser/dom.js';
import { Disposable, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { isITextModel } from '../../../../../editor/common/model.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { Action2, MenuId, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { chatEditingWidgetFileStateContextKey } from '../../common/chatEditingService.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { AgentSessionProviders, getAgentSessionProviderIcon, getAgentSessionProviderName } from '../agentSessions/agentSessions.js';
import { IChatWidgetService } from '../chat.js';
import { ctxHasEditorModification } from '../chatEditing/chatEditingEditorContextKeys.js';
import { CHAT_SETUP_ACTION_ID } from './chatActions.js';
import { PromptFileVariableKind, toPromptFileVariableEntry } from '../../common/chatVariableEntries.js';
export var ActionLocation;
(function (ActionLocation) {
    ActionLocation["ChatWidget"] = "chatWidget";
    ActionLocation["Editor"] = "editor";
})(ActionLocation || (ActionLocation = {}));
export class ContinueChatInSessionAction extends Action2 {
    static { this.ID = 'workbench.action.chat.continueChatInSession'; }
    constructor() {
        super({
            id: ContinueChatInSessionAction.ID,
            title: localize2('continueChatInSession', "Continue Chat in..."),
            tooltip: localize('continueChatInSession', "Continue Chat in..."),
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.requestInProgress.negate(), ChatContextKeys.remoteJobCreating.negate(), ChatContextKeys.hasCanDelegateProviders),
            menu: [{
                    id: MenuId.ChatExecute,
                    group: 'navigation',
                    order: 3.4,
                    when: ContextKeyExpr.and(ChatContextKeys.lockedToCodingAgent.negate(), ChatContextKeys.hasCanDelegateProviders),
                },
                {
                    id: MenuId.EditorContent,
                    group: 'continueIn',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals(ResourceContextKey.Scheme.key, Schemas.untitled), ContextKeyExpr.equals(ResourceContextKey.LangId.key, PROMPT_LANGUAGE_ID), ContextKeyExpr.notEquals(chatEditingWidgetFileStateContextKey.key, 0 /* ModifiedFileEntryState.Modified */), ctxHasEditorModification.negate(), ChatContextKeys.hasCanDelegateProviders),
                }
            ]
        });
    }
    async run() {
        // Handled by a custom action item
    }
}
let ChatContinueInSessionActionItem = ChatContinueInSessionActionItem_1 = class ChatContinueInSessionActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, location, actionWidgetService, contextKeyService, keybindingService, chatSessionsService, instantiationService, openerService) {
        super(action, {
            actionProvider: ChatContinueInSessionActionItem_1.actionProvider(chatSessionsService, instantiationService, location),
            actionBarActions: ChatContinueInSessionActionItem_1.getActionBarActions(openerService)
        }, actionWidgetService, keybindingService, contextKeyService);
        this.location = location;
        this.contextKeyService = contextKeyService;
    }
    static getActionBarActions(openerService) {
        const learnMoreUrl = 'https://aka.ms/vscode-continue-chat-in';
        return [{
                id: 'workbench.action.chat.continueChatInSession.learnMore',
                label: localize('chat.learnMore', "Learn More"),
                tooltip: localize('chat.learnMore', "Learn More"),
                class: undefined,
                enabled: true,
                run: async () => {
                    await openerService.open(URI.parse(learnMoreUrl));
                }
            }];
    }
    static actionProvider(chatSessionsService, instantiationService, location) {
        return {
            getActions: () => {
                const actions = [];
                const contributions = chatSessionsService.getAllChatSessionContributions();
                // Continue in Background
                const backgroundContrib = contributions.find(contrib => contrib.type === AgentSessionProviders.Background);
                if (backgroundContrib && backgroundContrib.canDelegate !== false) {
                    actions.push(this.toAction(AgentSessionProviders.Background, backgroundContrib, instantiationService, location));
                }
                // Continue in Cloud
                const cloudContrib = contributions.find(contrib => contrib.type === AgentSessionProviders.Cloud);
                if (cloudContrib && cloudContrib.canDelegate !== false) {
                    actions.push(this.toAction(AgentSessionProviders.Cloud, cloudContrib, instantiationService, location));
                }
                // Offer actions to enter setup if we have no contributions
                if (actions.length === 0) {
                    actions.push(this.toSetupAction(AgentSessionProviders.Background, instantiationService));
                    actions.push(this.toSetupAction(AgentSessionProviders.Cloud, instantiationService));
                }
                return actions;
            }
        };
    }
    static toAction(provider, contrib, instantiationService, location) {
        return {
            id: contrib.type,
            enabled: true,
            icon: getAgentSessionProviderIcon(provider),
            class: undefined,
            description: `@${contrib.name}`,
            label: getAgentSessionProviderName(provider),
            tooltip: localize('continueSessionIn', "Continue in {0}", getAgentSessionProviderName(provider)),
            category: { label: localize('continueIn', "Continue In"), order: 0, showHeader: true },
            run: () => instantiationService.invokeFunction(accessor => {
                if (location === "editor" /* ActionLocation.Editor */) {
                    return new CreateRemoteAgentJobFromEditorAction().run(accessor, contrib);
                }
                return new CreateRemoteAgentJobAction().run(accessor, contrib);
            })
        };
    }
    static toSetupAction(provider, instantiationService) {
        return {
            id: provider,
            enabled: true,
            icon: getAgentSessionProviderIcon(provider),
            class: undefined,
            label: getAgentSessionProviderName(provider),
            tooltip: localize('continueSessionIn', "Continue in {0}", getAgentSessionProviderName(provider)),
            category: { label: localize('continueIn', "Continue In"), order: 0, showHeader: true },
            run: () => instantiationService.invokeFunction(accessor => {
                const commandService = accessor.get(ICommandService);
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID);
            })
        };
    }
    renderLabel(element) {
        if (this.location === "editor" /* ActionLocation.Editor */) {
            const view = h('span.action-widget-delegate-label', [
                h('span', { className: ThemeIcon.asClassName(Codicon.forward) }),
                h('span', [localize('continueInEllipsis', "Continue in...")])
            ]);
            element.appendChild(view.root);
            return null;
        }
        else {
            const icon = this.contextKeyService.contextMatchesRules(ChatContextKeys.remoteJobCreating) ? Codicon.sync : Codicon.forward;
            element.classList.add(...ThemeIcon.asClassNameArray(icon));
            return super.renderLabel(element);
        }
    }
};
ChatContinueInSessionActionItem = ChatContinueInSessionActionItem_1 = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IChatSessionsService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService)
], ChatContinueInSessionActionItem);
export { ChatContinueInSessionActionItem };
const NEW_CHAT_SESSION_ACTION_ID = 'workbench.action.chat.openNewSessionEditor';
class CreateRemoteAgentJobAction {
    constructor() { }
    openUntitledEditor(commandService, continuationTarget) {
        commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${continuationTarget.type}`);
    }
    async run(accessor, continuationTarget) {
        const contextKeyService = accessor.get(IContextKeyService);
        const commandService = accessor.get(ICommandService);
        const widgetService = accessor.get(IChatWidgetService);
        const chatAgentService = accessor.get(IChatAgentService);
        const chatService = accessor.get(IChatService);
        const editorService = accessor.get(IEditorService);
        const remoteJobCreatingKey = ChatContextKeys.remoteJobCreating.bindTo(contextKeyService);
        try {
            remoteJobCreatingKey.set(true);
            const widget = widgetService.lastFocusedWidget;
            if (!widget || !widget.viewModel) {
                return this.openUntitledEditor(commandService, continuationTarget);
            }
            // todo@connor4312: remove 'as' cast
            const chatModel = widget.viewModel.model;
            if (!chatModel) {
                return;
            }
            const sessionResource = widget.viewModel.sessionResource;
            const chatRequests = chatModel.getRequests();
            let userPrompt = widget.getInput();
            if (!userPrompt) {
                if (!chatRequests.length) {
                    return this.openUntitledEditor(commandService, continuationTarget);
                }
                userPrompt = 'implement this.';
            }
            const attachedContext = widget.input.getAttachedAndImplicitContext(sessionResource);
            widget.input.acceptInput(true);
            // For inline editor mode, add selection or cursor information
            if (widget.location === ChatAgentLocation.EditorInline) {
                const activeEditor = editorService.activeTextEditorControl;
                if (activeEditor) {
                    const model = activeEditor.getModel();
                    let activeEditorUri = undefined;
                    if (model && isITextModel(model)) {
                        activeEditorUri = model.uri;
                    }
                    const selection = activeEditor.getSelection();
                    if (activeEditorUri && selection) {
                        attachedContext.add({
                            kind: 'file',
                            id: 'vscode.implicit.selection',
                            name: basename(activeEditorUri),
                            value: {
                                uri: activeEditorUri,
                                range: selection
                            },
                        });
                    }
                }
            }
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat);
            const instantiationService = accessor.get(IInstantiationService);
            const requestParser = instantiationService.createInstance(ChatRequestParser);
            const continuationTargetType = continuationTarget.type;
            // Add the request to the model first
            const parsedRequest = requestParser.parseChatRequest(sessionResource, userPrompt, ChatAgentLocation.Chat);
            const addedRequest = chatModel.addRequest(parsedRequest, { variables: attachedContext.asArray() }, 0, undefined, defaultAgent);
            await chatService.removeRequest(sessionResource, addedRequest.id);
            const requestData = await chatService.sendRequest(sessionResource, userPrompt, {
                agentIdSilent: continuationTargetType,
                attachedContext: attachedContext.asArray(),
                userSelectedModelId: widget.input.currentLanguageModel,
                ...widget.getModeRequestOptions()
            });
            if (requestData) {
                await widget.handleDelegationExitIfNeeded(defaultAgent, requestData.agent);
            }
        }
        catch (e) {
            console.error('Error creating remote coding agent job', e);
            throw e;
        }
        finally {
            remoteJobCreatingKey.set(false);
        }
    }
}
class CreateRemoteAgentJobFromEditorAction {
    constructor() { }
    async run(accessor, continuationTarget) {
        try {
            const editorService = accessor.get(IEditorService);
            const activeEditor = editorService.activeTextEditorControl;
            const commandService = accessor.get(ICommandService);
            if (!activeEditor) {
                return;
            }
            const model = activeEditor.getModel();
            if (!model || !isITextModel(model)) {
                return;
            }
            const uri = model.uri;
            const attachedContext = [toPromptFileVariableEntry(uri, PromptFileVariableKind.PromptFile, undefined, false, [])];
            const prompt = `Follow instructions in [${basename(uri)}](${uri.toString()}).`;
            await commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${continuationTarget.type}`, { prompt, attachedContext });
        }
        catch (e) {
            console.error('Error creating remote agent job from editor', e);
            throw e;
        }
    }
}
let ContinueChatInSessionActionRendering = class ContinueChatInSessionActionRendering extends Disposable {
    static { this.ID = 'chat.continueChatInSessionActionRendering'; }
    constructor(actionViewItemService, instantiationService) {
        super();
        const disposable = actionViewItemService.register(MenuId.EditorContent, ContinueChatInSessionAction.ID, (action, options, instantiationService2) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(ChatContinueInSessionActionItem, action, "editor" /* ActionLocation.Editor */);
        });
        markAsSingleton(disposable);
    }
};
ContinueChatInSessionActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService)
], ContinueChatInSessionActionRendering);
export { ContinueChatInSessionActionRendering };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRpbnVlSW5BY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENvbnRpbnVlSW5BY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDbkksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUs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
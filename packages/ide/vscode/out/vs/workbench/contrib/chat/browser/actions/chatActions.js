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
import { isAncestorOfActiveElement } from '../../../../../base/browser/dom.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { toAction } from '../../../../../base/common/actions.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { timeout } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { safeIntl } from '../../../../../base/common/date.js';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { language } from '../../../../../base/common/platform.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, MenuRegistry, registerAction2, SubmenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IsLinuxContext, IsWindowsContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import product from '../../../../../platform/product/common/product.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ToggleTitleBarConfigAction } from '../../../../browser/parts/titlebar/titlebarActions.js';
import { ActiveEditorContext, IsCompactTitleBarContext } from '../../../../common/contextkeys.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { AUX_WINDOW_GROUP } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { EXTENSIONS_CATEGORY, IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { SCMHistoryItemChangeRangeContentProvider } from '../../../scm/browser/scmHistoryChatContext.js';
import { ISCMService } from '../../../scm/common/scm.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatMode, IChatModeService } from '../../common/chatModes.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM } from '../../common/chatViewModel.js';
import { IChatWidgetHistoryService } from '../../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { CopilotUsageExtensionFeatureId } from '../../common/languageModelStats.js';
import { ILanguageModelToolsConfirmationService } from '../../common/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ChatEditorInput, showClearEditingSessionConfirmation } from '../chatEditorInput.js';
import { convertBufferToScreenshotVariable } from '../contrib/chatScreenshotContext.js';
export const CHAT_CATEGORY = localize2('chat.category', 'Chat');
export const ACTION_ID_NEW_CHAT = `workbench.action.chat.newChat`;
export const ACTION_ID_NEW_EDIT_SESSION = `workbench.action.chat.newEditSession`;
export const ACTION_ID_OPEN_CHAT = 'workbench.action.openChat';
export const CHAT_OPEN_ACTION_ID = 'workbench.action.chat.open';
export const CHAT_SETUP_ACTION_ID = 'workbench.action.chat.triggerSetup';
export const CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID = 'workbench.action.chat.triggerSetupSupportAnonymousAction';
const TOGGLE_CHAT_ACTION_ID = 'workbench.action.chat.toggle';
export const CHAT_CONFIG_MENU_ID = new MenuId('workbench.chat.menu.config');
const OPEN_CHAT_QUOTA_EXCEEDED_DIALOG = 'workbench.action.chat.openQuotaExceededDialog';
class OpenChatGlobalAction extends Action2 {
    constructor(overrides, mode) {
        super({
            ...overrides,
            icon: Codicon.chatSparkle,
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate())
        });
        this.mode = mode;
    }
    async run(accessor, opts) {
        opts = typeof opts === 'string' ? { query: opts } : opts;
        const chatService = accessor.get(IChatService);
        const widgetService = accessor.get(IChatWidgetService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        const hostService = accessor.get(IHostService);
        const chatAgentService = accessor.get(IChatAgentService);
        const instaService = accessor.get(IInstantiationService);
        const commandService = accessor.get(ICommandService);
        const chatModeService = accessor.get(IChatModeService);
        const fileService = accessor.get(IFileService);
        const languageModelService = accessor.get(ILanguageModelsService);
        const scmService = accessor.get(ISCMService);
        let chatWidget = widgetService.lastFocusedWidget;
        // When this was invoked to switch to a mode via keybinding, and some chat widget is focused, use that one.
        // Otherwise, open the view.
        if (!this.mode || !chatWidget || !isAncestorOfActiveElement(chatWidget.domNode)) {
            chatWidget = await widgetService.revealWidget();
        }
        if (!chatWidget) {
            return;
        }
        const switchToMode = (opts?.mode ? chatModeService.findModeByName(opts?.mode) : undefined) ?? this.mode;
        if (switchToMode) {
            await this.handleSwitchToMode(switchToMode, chatWidget, instaService, commandService);
        }
        if (opts?.modelSelector) {
            const ids = await languageModelService.selectLanguageModels(opts.modelSelector, false);
            const id = ids.sort().at(0);
            if (!id) {
                throw new Error(`No language models found matching selector: ${JSON.stringify(opts.modelSelector)}.`);
            }
            const model = languageModelService.lookupLanguageModel(id);
            if (!model) {
                throw new Error(`Language model not loaded: ${id}.`);
            }
            chatWidget.input.setCurrentLanguageModel({ metadata: model, identifier: id });
        }
        if (opts?.previousRequests?.length && chatWidget.viewModel) {
            for (const { request, response } of opts.previousRequests) {
                chatService.addCompleteRequest(chatWidget.viewModel.sessionResource, request, undefined, 0, { message: response });
            }
        }
        if (opts?.attachScreenshot) {
            const screenshot = await hostService.getScreenshot();
            if (screenshot) {
                chatWidget.attachmentModel.addContext(convertBufferToScreenshotVariable(screenshot));
            }
        }
        if (opts?.attachFiles) {
            for (const file of opts.attachFiles) {
                const uri = file instanceof URI ? file : file.uri;
                const range = file instanceof URI ? undefined : file.range;
                if (await fileService.exists(uri)) {
                    chatWidget.attachmentModel.addFile(uri, range);
                }
            }
        }
        if (opts?.attachHistoryItemChanges) {
            for (const historyItemChange of opts.attachHistoryItemChanges) {
                const repository = scmService.getRepository(URI.file(historyItemChange.uri.path));
                const historyProvider = repository?.provider.historyProvider.get();
                if (!historyProvider) {
                    continue;
                }
                const historyItem = await historyProvider.resolveHistoryItem(historyItemChange.historyItemId);
                if (!historyItem) {
                    continue;
                }
                chatWidget.attachmentModel.addContext({
                    id: historyItemChange.uri.toString(),
                    name: `${basename(historyItemChange.uri)}`,
                    value: historyItemChange.uri,
                    historyItem: historyItem,
                    kind: 'scmHistoryItemChange'
                });
            }
        }
        if (opts?.attachHistoryItemChangeRanges) {
            for (const historyItemChangeRange of opts.attachHistoryItemChangeRanges) {
                const repository = scmService.getRepository(URI.file(historyItemChangeRange.end.uri.path));
                const historyProvider = repository?.provider.historyProvider.get();
                if (!repository || !historyProvider) {
                    continue;
                }
                const [historyItemStart, historyItemEnd] = await Promise.all([
                    historyProvider.resolveHistoryItem(historyItemChangeRange.start.historyItemId),
                    historyProvider.resolveHistoryItem(historyItemChangeRange.end.historyItemId),
                ]);
                if (!historyItemStart || !historyItemEnd) {
                    continue;
                }
                const uri = historyItemChangeRange.end.uri.with({
                    scheme: SCMHistoryItemChangeRangeContentProvider.scheme,
                    query: JSON.stringify({
                        repositoryId: repository.id,
                        start: historyItemStart.id,
                        end: historyItemChangeRange.end.historyItemId
                    })
                });
                chatWidget.attachmentModel.addContext({
                    id: uri.toString(),
                    name: `${basename(uri)}`,
                    value: uri,
                    historyItemChangeStart: {
                        uri: historyItemChangeRange.start.uri,
                        historyItem: historyItemStart
                    },
                    historyItemChangeEnd: {
                        uri: historyItemChangeRange.end.uri,
                        historyItem: {
                            ...historyItemEnd,
                            displayId: historyItemChangeRange.end.historyItemId
                        }
                    },
                    kind: 'scmHistoryItemChangeRange'
                });
            }
        }
        let resp;
        if (opts?.query) {
            chatWidget.setInput(opts.query);
            if (!opts.isPartialQuery) {
                if (!chatWidget.viewModel) {
                    await Event.toPromise(chatWidget.onDidChangeViewModel);
                }
                await waitForDefaultAgent(chatAgentService, chatWidget.input.currentModeKind);
                resp = chatWidget.acceptInput();
            }
        }
        if (opts?.toolIds && opts.toolIds.length > 0) {
            for (const toolId of opts.toolIds) {
                const tool = toolsService.getTool(toolId);
                if (tool) {
                    chatWidget.attachmentModel.addContext({
                        id: tool.id,
                        name: tool.displayName,
                        fullName: tool.displayName,
                        value: undefined,
                        icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined,
                        kind: 'tool'
                    });
                }
            }
        }
        chatWidget.focusInput();
        if (opts?.blockOnResponse) {
            const response = await resp;
            if (response) {
                await new Promise(resolve => {
                    const d = response.onDidChange(async () => {
                        if (response.isComplete || response.isPendingConfirmation.get()) {
                            d.dispose();
                            resolve();
                        }
                    });
                });
                return { ...response.result, type: response.isPendingConfirmation.get() ? 'confirmation' : undefined };
            }
        }
        return undefined;
    }
    async handleSwitchToMode(switchToMode, chatWidget, instaService, commandService) {
        const currentMode = chatWidget.input.currentModeKind;
        if (switchToMode) {
            const model = chatWidget.viewModel?.model;
            const chatModeCheck = model ? await instaService.invokeFunction(handleModeSwitch, currentMode, switchToMode.kind, model.getRequests().length, model) : { needToClearSession: false };
            if (!chatModeCheck) {
                return;
            }
            chatWidget.input.setChatMode(switchToMode.id);
            if (chatModeCheck.needToClearSession) {
                await commandService.executeCommand(ACTION_ID_NEW_CHAT);
            }
        }
    }
}
async function waitForDefaultAgent(chatAgentService, mode) {
    const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode);
    if (defaultAgent) {
        return;
    }
    await Promise.race([
        Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode);
            return Boolean(defaultAgent);
        })),
        timeout(60_000).then(() => { throw new Error('Timed out waiting for default agent'); })
    ]);
}
class PrimaryOpenChatGlobalAction extends OpenChatGlobalAction {
    constructor() {
        super({
            id: CHAT_OPEN_ACTION_ID,
            title: localize2('openChat', "Open Chat"),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */
                }
            },
            menu: [{
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 1
                }]
        });
    }
}
export function getOpenChatActionIdForMode(mode) {
    return `workbench.action.chat.open${mode.name.get()}`;
}
export class ModeOpenChatGlobalAction extends OpenChatGlobalAction {
    constructor(mode, keybinding) {
        super({
            id: getOpenChatActionIdForMode(mode),
            title: localize2('openChatMode', "Open Chat ({0})", mode.label.get()),
            keybinding
        }, mode);
    }
}
export function registerChatActions() {
    registerAction2(PrimaryOpenChatGlobalAction);
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() { super(ChatMode.Ask); }
    });
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() {
            super(ChatMode.Agent, {
                when: ContextKeyExpr.has(`config.${ChatConfiguration.AgentEnabled}`),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */
                }
            });
        }
    });
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() { super(ChatMode.Edit); }
    });
    registerAction2(class ToggleChatAction extends Action2 {
        constructor() {
            super({
                id: TOGGLE_CHAT_ACTION_ID,
                title: localize2('toggleChat', "Toggle Chat"),
                category: CHAT_CATEGORY
            });
        }
        async run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            const viewsService = accessor.get(IViewsService);
            const viewDescriptorService = accessor.get(IViewDescriptorService);
            const widgetService = accessor.get(IChatWidgetService);
            const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
            if (viewsService.isViewVisible(ChatViewId)) {
                this.updatePartVisibility(layoutService, chatLocation, false);
            }
            else {
                this.updatePartVisibility(layoutService, chatLocation, true);
                (await widgetService.revealWidget())?.focusInput();
            }
        }
        updatePartVisibility(layoutService, location, visible) {
            let part;
            switch (location) {
                case 1 /* ViewContainerLocation.Panel */:
                    part = "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case 0 /* ViewContainerLocation.Sidebar */:
                    part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case 2 /* ViewContainerLocation.AuxiliaryBar */:
                    part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
            }
            if (part) {
                layoutService.setPartHidden(!visible, part);
            }
        }
    });
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_OPEN_CHAT,
                title: localize2('interactiveSession.open', "New Chat Editor"),
                icon: Codicon.plus,
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatEditor)
                },
                menu: [{
                        id: MenuId.ChatTitleBarMenu,
                        group: 'b_new',
                        order: 0
                    }, {
                        id: MenuId.ChatNewMenu,
                        group: '2_new',
                        order: 2
                    }, {
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.lockedToCodingAgent.negate()),
                        order: 1
                    }],
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(ChatEditorInput.getNewEditorUri(), undefined, { pinned: true });
        }
    });
    registerAction2(class NewChatWindowAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.newChatWindow`,
                title: localize2('interactiveSession.newChatWindow', "New Chat Window"),
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.ChatTitleBarMenu,
                        group: 'b_new',
                        order: 1
                    }, {
                        id: MenuId.ChatNewMenu,
                        group: '2_new',
                        order: 3
                    }]
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            await widgetService.openSession(ChatEditorInput.getNewEditorUri(), AUX_WINDOW_GROUP, { pinned: true, auxiliary: { compact: true, bounds: { width: 640, height: 640 } } });
        }
    });
    registerAction2(class ClearChatInputHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearInputHistory',
                title: localize2('interactiveSession.clearHistory.label', "Clear Input History"),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const historyService = accessor.get(IChatWidgetHistoryService);
            historyService.clearHistory();
        }
    });
    registerAction2(class FocusChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'chat.action.focus',
                title: localize2('actions.interactiveSession.focus', 'Focus Chat List'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusResponseItem();
            }
        }
    });
    registerAction2(class FocusMostRecentlyFocusedChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'workbench.chat.action.focusLastFocused',
                title: localize2('actions.interactiveSession.focusLastFocused', 'Focus Last Focused Chat List Item'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusResponseItem(true);
            }
        }
    });
    registerAction2(class FocusChatInputAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.focusInput',
                title: localize2('interactiveSession.focusInput.label', "Focus Chat Input"),
                f1: false,
                keybinding: [
                    {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat.negate()),
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.focusInput();
        }
    });
    const nonEnterpriseCopilotUsers = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.notEquals(`config.${defaultChat.completionsAdvancedSetting}.authProvider`, defaultChat.provider.enterprise.id));
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.manageSettings',
                title: localize2('manageChat', "Manage Chat"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus), nonEnterpriseCopilotUsers),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'y_manage',
                    order: 1,
                    when: nonEnterpriseCopilotUsers
                }
            });
        }
        async run(accessor) {
            const openerService = accessor.get(IOpenerService);
            openerService.open(URI.parse(defaultChat.manageSettingsUrl));
        }
    });
    registerAction2(class ShowExtensionsUsingCopilot extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.showExtensionsUsingCopilot',
                title: localize2('showCopilotUsageExtensions', "Show Extensions using Copilot"),
                f1: true,
                category: EXTENSIONS_CATEGORY,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
            extensionsWorkbenchService.openSearch(`@feature:${CopilotUsageExtensionFeatureId}`);
        }
    });
    registerAction2(class ConfigureCopilotCompletions extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.configureCodeCompletions',
                title: localize2('configureCompletions', "Configure Inline Suggestions..."),
                precondition: ContextKeyExpr.and(ChatContextKeys.Setup.installed, ChatContextKeys.Setup.disabled.negate(), ChatContextKeys.Setup.untrusted.negate()),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'f_completions',
                    order: 10,
                }
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(defaultChat.completionsMenuCommand);
        }
    });
    registerAction2(class ShowQuotaExceededDialogAction extends Action2 {
        constructor() {
            super({
                id: OPEN_CHAT_QUOTA_EXCEEDED_DIALOG,
                title: localize('upgradeChat', "Upgrade GitHub Copilot Plan")
            });
        }
        async run(accessor) {
            const chatEntitlementService = accessor.get(IChatEntitlementService);
            const commandService = accessor.get(ICommandService);
            const dialogService = accessor.get(IDialogService);
            const telemetryService = accessor.get(ITelemetryService);
            let message;
            const chatQuotaExceeded = chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const completionsQuotaExceeded = chatEntitlementService.quotas.completions?.percentRemaining === 0;
            if (chatQuotaExceeded && !completionsQuotaExceeded) {
                message = localize('chatQuotaExceeded', "You've reached your monthly chat messages quota. You still have free inline suggestions available.");
            }
            else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                message = localize('completionsQuotaExceeded', "You've reached your monthly inline suggestions quota. You still have free chat messages available.");
            }
            else {
                message = localize('chatAndCompletionsQuotaExceeded', "You've reached your monthly chat messages and inline suggestions quota.");
            }
            if (chatEntitlementService.quotas.resetDate) {
                const dateFormatter = chatEntitlementService.quotas.resetDateHasTime ? safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
                const quotaResetDate = new Date(chatEntitlementService.quotas.resetDate);
                message = [message, localize('quotaResetDate', "The allowance will reset on {0}.", dateFormatter.value.format(quotaResetDate))].join(' ');
            }
            const free = chatEntitlementService.entitlement === ChatEntitlement.Free;
            const upgradeToPro = free ? localize('upgradeToPro', "Upgrade to GitHub Copilot Pro (your first 30 days are free) for:\n- Unlimited inline suggestions\n- Unlimited chat messages\n- Access to premium models") : undefined;
            await dialogService.prompt({
                type: 'none',
                message: localize('copilotQuotaReached', "GitHub Copilot Quota Reached"),
                cancelButton: {
                    label: localize('dismiss', "Dismiss"),
                    run: () => { }
                },
                buttons: [
                    {
                        label: free ? localize('upgradePro', "Upgrade to GitHub Copilot Pro") : localize('upgradePlan', "Upgrade GitHub Copilot Plan"),
                        run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-dialog' });
                            commandService.executeCommand(commandId);
                        }
                    },
                ],
                custom: {
                    icon: Codicon.copilotWarningLarge,
                    markdownDetails: coalesce([
                        { markdown: new MarkdownString(message, true) },
                        upgradeToPro ? { markdown: new MarkdownString(upgradeToPro, true) } : undefined
                    ])
                }
            });
        }
    });
    registerAction2(class ResetTrustedToolsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.resetTrustedTools',
                title: localize2('resetTrustedTools', "Reset Tool Confirmations"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        run(accessor) {
            accessor.get(ILanguageModelToolsConfirmationService).resetToolAutoConfirmation();
            accessor.get(INotificationService).info(localize('resetTrustedToolsSuccess', "Tool confirmation preferences have been reset."));
        }
    });
    registerAction2(class UpdateInstructionsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.generateInstructions',
                title: localize2('generateInstructions', "Generate Workspace Instructions File"),
                shortTitle: localize2('generateInstructions.short', "Generate Chat Instructions"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled,
                menu: {
                    id: CHAT_CONFIG_MENU_ID,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                    order: 11,
                    group: '1_level'
                }
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            // Use chat command to open and send the query
            const query = `Analyze this codebase to generate or update \`.github/copilot-instructions.md\` for guiding AI coding agents.

Focus on discovering the essential knowledge that would help an AI agents be immediately productive in this codebase. Consider aspects like:
- The "big picture" architecture that requires reading multiple files to understand - major components, service boundaries, data flows, and the "why" behind structural decisions
- Critical developer workflows (builds, tests, debugging) especially commands that aren't obvious from file inspection alone
- Project-specific conventions and patterns that differ from common practices
- Integration points, external dependencies, and cross-component communication patterns

Source existing AI conventions from \`**/{.github/copilot-instructions.md,AGENT.md,AGENTS.md,CLAUDE.md,.cursorrules,.windsurfrules,.clinerules,.cursor/rules/**,.windsurf/rules/**,.clinerules/**,README.md}\` (do one glob search).

Guidelines (read more at https://aka.ms/vscode-instructions-docs):
- If \`.github/copilot-instructions.md\` exists, merge intelligently - preserve valuable content while updating outdated sections
- Write concise, actionable instructions (~20-50 lines) using markdown structure
- Include specific examples from the codebase when describing patterns
- Avoid generic advice ("write tests", "handle errors") - focus on THIS project's specific approaches
- Document only discoverable patterns, not aspirational practices
- Reference key files/directories that exemplify important patterns

Update \`.github/copilot-instructions.md\` for the user, then ask for feedback on any unclear or incomplete sections to iterate.`;
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: query,
            });
        }
    });
    registerAction2(class OpenChatFeatureSettingsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openFeatureSettings',
                title: localize2('openChatFeatureSettings', "Chat Settings"),
                shortTitle: localize('openChatFeatureSettings.short', "Chat Settings"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: CHAT_CONFIG_MENU_ID,
                        when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                        order: 15,
                        group: '3_configure'
                    },
                    {
                        id: MenuId.ChatWelcomeContext,
                        group: '2_settings',
                        order: 1
                    }]
            });
        }
        async run(accessor) {
            const preferencesService = accessor.get(IPreferencesService);
            preferencesService.openSettings({ query: '@feature:chat ' });
        }
    });
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        submenu: CHAT_CONFIG_MENU_ID,
        title: localize2('config.label', "Configure Chat"),
        group: 'navigation',
        when: ContextKeyExpr.equals('view', ChatViewId),
        icon: Codicon.gear,
        order: 6
    });
}
export function stringifyItem(item, includeName = true) {
    if (isRequestVM(item)) {
        return (includeName ? `${item.username}: ` : '') + item.messageText;
    }
    else {
        return (includeName ? `${item.username}: ` : '') + item.response.toString();
    }
}
// --- Title Bar Chat Controls
const defaultChat = {
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { enterprise: { id: '' } },
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    completionsMenuCommand: product.defaultChatAgent?.completionsMenuCommand ?? '',
};
// Add next to the command center if command center is disabled
MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Chat"),
    icon: Codicon.chatSparkle,
    when: ContextKeyExpr.and(ChatContextKeys.supported, ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), ContextKeyExpr.has('config.chat.commandCenter.enabled')),
    order: 10001 // to the right of command center
});
// Add to the global title bar if command center is disabled
MenuRegistry.appendMenuItem(MenuId.TitleBar, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Chat"),
    group: 'navigation',
    icon: Codicon.chatSparkle,
    when: ContextKeyExpr.and(ChatContextKeys.supported, ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), ContextKeyExpr.has('config.chat.commandCenter.enabled'), ContextKeyExpr.has('config.window.commandCenter').negate()),
    order: 1
});
registerAction2(class ToggleCopilotControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('chat.commandCenter.enabled', localize('toggle.chatControl', 'Chat Controls'), localize('toggle.chatControlsDescription', "Toggle visibility of the Chat Controls in title bar"), 5, ContextKeyExpr.and(ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), IsCompactTitleBarContext.negate(), ChatContextKeys.supported));
    }
});
let CopilotTitleBarMenuRendering = class CopilotTitleBarMenuRendering extends Disposable {
    static { this.ID = 'workbench.contrib.copilotTitleBarMenuRendering'; }
    constructor(actionViewItemService, chatEntitlementService) {
        super();
        const disposable = actionViewItemService.register(MenuId.CommandCenter, MenuId.ChatTitleBarMenu, (action, options, instantiationService, windowId) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            const dropdownAction = toAction({
                id: 'copilot.titleBarMenuRendering.more',
                label: localize('more', "More..."),
                run() { }
            });
            const chatSentiment = chatEntitlementService.sentiment;
            const chatQuotaExceeded = chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            const anonymous = chatEntitlementService.anonymous;
            const free = chatEntitlementService.entitlement === ChatEntitlement.Free;
            const isAuxiliaryWindow = windowId !== mainWindow.vscodeWindowId;
            let primaryActionId = isAuxiliaryWindow ? CHAT_OPEN_ACTION_ID : TOGGLE_CHAT_ACTION_ID;
            let primaryActionTitle = isAuxiliaryWindow ? localize('openChat', "Open Chat") : localize('toggleChat', "Toggle Chat");
            let primaryActionIcon = Codicon.chatSparkle;
            if (chatSentiment.installed && !chatSentiment.disabled) {
                if (signedOut && !anonymous) {
                    primaryActionId = CHAT_SETUP_ACTION_ID;
                    primaryActionTitle = localize('signInToChatSetup', "Sign in to use AI features...");
                    primaryActionIcon = Codicon.chatSparkleError;
                }
                else if (chatQuotaExceeded && free) {
                    primaryActionId = OPEN_CHAT_QUOTA_EXCEEDED_DIALOG;
                    primaryActionTitle = localize('chatQuotaExceededButton', "GitHub Copilot Free plan chat messages quota reached. Click for details.");
                    primaryActionIcon = Codicon.chatSparkleWarning;
                }
            }
            return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, instantiationService.createInstance(MenuItemAction, {
                id: primaryActionId,
                title: primaryActionTitle,
                icon: primaryActionIcon,
            }, undefined, undefined, undefined, undefined), dropdownAction, action.actions, '', { ...options, skipTelemetry: true });
        }, Event.any(chatEntitlementService.onDidChangeSentiment, chatEntitlementService.onDidChangeQuotaExceeded, chatEntitlementService.onDidChangeEntitlement, chatEntitlementService.onDidChangeAnonymous));
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
CopilotTitleBarMenuRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IChatEntitlementService)
], CopilotTitleBarMenuRendering);
export { CopilotTitleBarMenuRendering };
/**
 * Returns whether we can continue clearing/switching chat sessions, false to cancel.
 */
export async function handleCurrentEditingSession(model, phrase, dialogService) {
    return showClearEditingSessionConfirmation(model, dialogService, { messageOverride: phrase });
}
/**
 * Returns whether we can switch the agent, based on whether the user had to agree to clear the session, false to cancel.
 */
export async function handleModeSwitch(accessor, fromMode, toMode, requestCount, model) {
    if (!model?.editingSession || fromMode === toMode) {
        return { needToClearSession: false };
    }
    const configurationService = accessor.get(IConfigurationService);
    const dialogService = accessor.get(IDialogService);
    const needToClearEdits = (!configurationService.getValue(ChatConfiguration.Edits2Enabled) && (fromMode === ChatModeKind.Edit || toMode === ChatModeKind.Edit)) && requestCount > 0;
    if (needToClearEdits) {
        // If not using edits2 and switching into or out of edit mode, ask to discard the session
        const phrase = localize('switchMode.confirmPhrase', "Switching agents will end your current edit session.");
        const currentEdits = model.editingSession.entries.get();
        const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        if (undecidedEdits.length > 0) {
            if (!await handleCurrentEditingSession(model, phrase, dialogService)) {
                return false;
            }
            return { needToClearSession: true };
        }
        else {
            const confirmation = await dialogService.confirm({
                title: localize('agent.newSession', "Start new session?"),
                message: localize('agent.newSessionMessage', "Changing the agent will end your current edit session. Would you like to change the agent?"),
                primaryButton: localize('agent.newSession.confirm', "Yes"),
                type: 'info'
            });
            if (!confirmation.confirmed) {
                return false;
            }
            return { needToClearSession: true };
        }
    }
    return { needToClearSession: false };
}
// --- Chat Submenus in various Components
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.ChatTextEditorMenu,
    group: '1_chat',
    order: 5,
    title: localize('generateCode', "Generate Code"),
    when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate())
});
// --- Chat Default Visibility
registerAction2(class ToggleDefaultVisibilityAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleDefaultVisibility',
            title: localize2('chat.toggleDefaultVisibility.label', "Show View by Default"),
            toggled: ContextKeyExpr.equals('config.workbench.secondarySideBar.defaultVisibility', 'hidden').negate(),
            f1: false,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ChatContextKeys.panelLocation.isEqualTo(2 /* ViewContainerLocation.AuxiliaryBar */)),
                order: 0,
                group: '5_configure'
            },
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const currentValue = configurationService.getValue('workbench.secondarySideBar.defaultVisibility');
        configurationService.updateValue('workbench.secondarySideBar.defaultVisibility', currentValue !== 'hidden' ? 'hidden' : 'visible');
    }
});
registerAction2(class EditToolApproval extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.editToolApproval',
            title: localize2('chat.editToolApproval.label', "Manage Tool Approval"),
            metadata: {
                description: localize2('chat.editToolApproval.description', "Edit/manage the tool approval and confirmation preferences for AI chat agents."),
            },
            precondition: ChatContextKeys.enabled,
            f1: true,
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, scope) {
        const confirmationService = accessor.get(ILanguageModelToolsConfirmationService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        confirmationService.manageConfirmationPreferences([...toolsService.getTools()], scope ? { defaultScope: scope } : undefined);
    }
});
registerAction2(class ToggleChatViewTitleAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleChatViewTitle',
            title: localize2('chat.toggleChatViewTitle.label', "Show Chat Title"),
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewTitleEnabled}`, true),
            menu: {
                id: MenuId.ChatWelcomeContext,
                group: '1_modify',
                order: 2,
                when: ChatContextKeys.inChatEditor.negate()
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const chatViewTitleEnabled = configurationService.getValue(ChatConfiguration.ChatViewTitleEnabled);
        await configurationService.updateValue(ChatConfiguration.ChatViewTitleEnabled, !chatViewTitleEnabled);
    }
});
registerAction2(class ToggleChatViewWelcomeAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleChatViewWelcome',
            title: localize2('chat.toggleChatViewWelcome.label', "Show Welcome"),
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.enabled,
            toggled: ContextKeyExpr.equals(`config.${ChatConfiguration.ChatViewWelcomeEnabled}`, true),
            menu: {
                id: MenuId.ChatWelcomeContext,
                group: '1_modify',
                order: 3,
                when: ChatContextKeys.inChatEditor.negate()
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const chatViewWelcomeEnabled = configurationService.getValue(ChatConfiguration.ChatViewWelcomeEnabled);
        await configurationService.updateValue(ChatConfiguration.ChatViewWelcomeEnabled, !chatViewWelcomeEnabled);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQXVFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFF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
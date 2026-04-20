/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ChatViewId, IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatContextKeys } from '../../../chat/common/chatContextKeys.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { LocalChatSessionUri } from '../../../chat/common/chatUri.js';
import { ChatAgentLocation, ChatConfiguration } from '../../../chat/common/constants.js';
import { AbstractInline1ChatAction } from '../../../inlineChat/browser/inlineChatActions.js';
import { isDetachedTerminalInstance, ITerminalChatService, ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../terminal/browser/terminal.js';
import { registerActiveXtermAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { getIconId } from '../../../terminal/browser/terminalIcon.js';
import { TerminalChatController } from './terminalChatController.js';
import { isString } from '../../../../../base/common/types.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */,
    title: localize2('startChat', 'Open Inline Chat'),
    category: localize2('terminalCategory', "Terminal"),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
        when: ContextKeyExpr.and(TerminalContextKeys.focusInAny),
        // HACK: Force weight to be higher than the extension contributed keybinding to override it until it gets replaced
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 1, // KeybindingWeight.WorkbenchContrib,
    },
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.hasChatAgent),
    menu: {
        id: MenuId.TerminalInstanceContext,
        group: "0_chat" /* TerminalContextMenuGroup.Chat */,
        order: 2,
        when: ChatContextKeys.enabled
    },
    run: (_xterm, _accessor, activeInstance, opts) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        if (!contr) {
            return;
        }
        if (opts) {
            function isValidOptionsObject(obj) {
                return typeof obj === 'object' && obj !== null && 'query' in obj && isString(obj.query);
            }
            opts = isString(opts) ? { query: opts } : opts;
            if (isValidOptionsObject(opts)) {
                contr.updateInput(opts.query, false);
                if (!opts.isPartialQuery) {
                    contr.terminalChatWidget?.acceptInput();
                }
            }
        }
        contr.terminalChatWidget?.reveal();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.close" /* TerminalChatCommandId.Close */,
    title: localize2('closeChat', 'Close'),
    category: AbstractInline1ChatAction.category,
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        when: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.focus, TerminalChatContextKeys.focused), TerminalChatContextKeys.visible),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    menu: [{
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: '0_main',
            order: 2,
        }],
    icon: Codicon.close,
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, TerminalChatContextKeys.visible),
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.clear();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */,
    title: localize2('runCommand', 'Run Chat Command'),
    shortTitle: localize2('run', 'Run'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */,
    title: localize2('runFirstCommand', 'Run First Chat Command'),
    shortTitle: localize2('runFirst', 'Run First'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */,
    title: localize2('insertCommand', 'Insert Chat Command'),
    shortTitle: localize2('insert', 'Insert'),
    category: AbstractInline1ChatAction.category,
    icon: Codicon.insert,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */]
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertFirstCommand" /* TerminalChatCommandId.InsertFirstCommand */,
    title: localize2('insertFirstCommand', 'Insert First Chat Command'),
    shortTitle: localize2('insertFirst', 'Insert First'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */]
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
    title: localize2('chat.rerun.label', "Rerun Request"),
    f1: false,
    icon: Codicon.refresh,
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
        when: TerminalChatContextKeys.focused
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 5,
        when: ContextKeyExpr.and(TerminalChatContextKeys.inputHasText.toNegated(), TerminalChatContextKeys.requestActive.negate())
    },
    run: async (_xterm, _accessor, activeInstance) => {
        const chatService = _accessor.get(IChatService);
        const chatWidgetService = _accessor.get(IChatWidgetService);
        const contr = TerminalChatController.activeChatController;
        const model = contr?.terminalChatWidget?.inlineChatWidget.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionResource(model.sessionResource);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ChatAgentLocation.Terminal,
                userSelectedModelId: widget?.input.currentLanguageModel
            });
        }
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.viewInChat" /* TerminalChatCommandId.ViewInChat */,
    title: localize2('viewInChat', 'View in Chat'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    icon: Codicon.chatSparkle,
    menu: [{
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: 'zzz',
            order: 1,
            isHiddenByDefault: true,
            when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.requestActive.negate()),
        }],
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.viewInChat();
    }
});
registerAction2(class ShowChatTerminalsAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.terminal.chat.viewHiddenChatTerminals" /* TerminalChatCommandId.ViewHiddenChatTerminals */,
            title: localize2('viewHiddenChatTerminals', 'View Hidden Chat Terminals'),
            category: localize2('terminalCategory2', 'Terminal'),
            f1: true,
            precondition: ContextKeyExpr.and(TerminalChatContextKeys.hasHiddenChatTerminals, ChatContextKeys.enabled),
            menu: [{
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(TerminalChatContextKeys.hasHiddenChatTerminals, ContextKeyExpr.equals('view', ChatViewId)),
                    group: 'terminal',
                    order: 0,
                    isHiddenByDefault: true
                }]
        });
    }
    run(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const groupService = accessor.get(ITerminalGroupService);
        const editorService = accessor.get(ITerminalEditorService);
        const terminalChatService = accessor.get(ITerminalChatService);
        const quickInputService = accessor.get(IQuickInputService);
        const instantiationService = accessor.get(IInstantiationService);
        const chatService = accessor.get(IChatService);
        const visible = new Set([...groupService.instances, ...editorService.instances]);
        const toolInstances = terminalChatService.getToolSessionTerminalInstances();
        if (toolInstances.length === 0) {
            return;
        }
        const all = new Map();
        for (const i of toolInstances) {
            if (!visible.has(i)) {
                all.set(i.instanceId, i);
            }
        }
        const items = [];
        const lastCommandLocalized = (command) => localize2('chatTerminal.lastCommand', 'Last: {0}', command).value;
        const MAX_DETAIL_LENGTH = 80;
        const metas = [];
        for (const instance of all.values()) {
            const iconId = instantiationService.invokeFunction(getIconId, instance);
            const label = `$(${iconId}) ${instance.title}`;
            const lastCommand = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands.at(-1)?.command;
            // Get the chat session title
            const chatSessionId = terminalChatService.getChatSessionIdForInstance(instance);
            let chatSessionTitle;
            if (chatSessionId) {
                const sessionUri = LocalChatSessionUri.forSession(chatSessionId);
                // Try to get title from active session first, then fall back to persisted title
                chatSessionTitle = chatService.getSession(sessionUri)?.title || chatService.getPersistedSessionTitle(sessionUri);
            }
            let description;
            if (chatSessionTitle) {
                description = `${chatSessionTitle}`;
            }
            let detail;
            let tooltip;
            if (lastCommand) {
                // Take only the first line if the command spans multiple lines
                const commandLines = lastCommand.split('\n');
                const firstLine = commandLines[0];
                const displayCommand = firstLine.length > MAX_DETAIL_LENGTH ? firstLine.substring(0, MAX_DETAIL_LENGTH) + '…' : firstLine;
                detail = lastCommandLocalized(displayCommand);
                // If the command was truncated or has multiple lines, provide a tooltip with the full command
                const wasTruncated = firstLine.length > MAX_DETAIL_LENGTH;
                const hasMultipleLines = commandLines.length > 1;
                if (wasTruncated || hasMultipleLines) {
                    // Use markdown code block to preserve formatting for multi-line commands
                    if (hasMultipleLines) {
                        tooltip = { value: `\`\`\`\n${lastCommand}\n\`\`\``, supportThemeIcons: true };
                    }
                    else {
                        tooltip = lastCommandLocalized(lastCommand);
                    }
                }
            }
            metas.push({
                label,
                description,
                detail,
                tooltip,
                id: String(instance.instanceId),
            });
        }
        for (const m of metas) {
            items.push({
                label: m.label,
                description: m.description,
                detail: m.detail,
                tooltip: m.tooltip,
                id: m.id
            });
        }
        const qp = quickInputService.createQuickPick();
        qp.placeholder = localize2('selectChatTerminal', 'Select a chat terminal to show and focus').value;
        qp.items = items;
        qp.canSelectMany = false;
        qp.title = localize2('showChatTerminals.title', 'Chat Terminals').value;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        const qpDisposables = new DisposableStore();
        qpDisposables.add(qp);
        qpDisposables.add(qp.onDidAccept(async () => {
            const sel = qp.selectedItems[0];
            if (sel) {
                const instance = all.get(Number(sel.id));
                if (instance) {
                    terminalService.setActiveInstance(instance);
                    await terminalService.revealTerminal(instance);
                    qp.hide();
                    await terminalService.focusInstance(instance);
                }
                else {
                    qp.hide();
                }
            }
            else {
                qp.hide();
            }
        }));
        qpDisposables.add(qp.onDidHide(() => {
            qpDisposables.dispose();
            qp.dispose();
        }));
        qp.show();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.terminal.chat.focusMostRecentChatTerminal" /* TerminalChatCommandId.FocusMostRecentChatTerminal */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ChatContextKeys.inChatSession,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 50 /* KeyCode.KeyT */,
    handler: async (accessor) => {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getMostRecentProgressPart();
        if (!part) {
            return;
        }
        await part.focusTerminal();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.terminal.chat.focusMostRecentChatTerminalOutput" /* TerminalChatCommandId.FocusMostRecentChatTerminalOutput */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ChatContextKeys.inChatSession,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 45 /* KeyCode.KeyO */,
    handler: async (accessor) => {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getMostRecentProgressPart();
        if (!part) {
            return;
        }
        await part.toggleOutputFromKeyboard();
    }
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: "workbench.action.terminal.chat.focusMostRecentChatTerminal" /* TerminalChatCommandId.FocusMostRecentChatTerminal */,
        title: localize('chat.focusMostRecentTerminal', 'Chat: Focus Most Recent Terminal'),
    },
    when: ChatContextKeys.inChatSession
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: "workbench.action.terminal.chat.focusMostRecentChatTerminalOutput" /* TerminalChatCommandId.FocusMostRecentChatTerminalOutput */,
        title: localize('chat.focusMostRecentTerminalOutput', 'Chat: Focus Most Recent Terminal Output'),
    },
    when: ChatContextKeys.inChatSession
});
CommandsRegistry.registerCommand("workbench.action.terminal.chat.openTerminalSettingsLink" /* TerminalChatCommandId.OpenTerminalSettingsLink */, async (accessor, scopeRaw) => {
    const preferencesService = accessor.get(IPreferencesService);
    if (scopeRaw === 'global') {
        preferencesService.openSettings({
            query: `@id:${ChatConfiguration.GlobalAutoApprove}`
        });
    }
    else {
        const scope = parseInt(scopeRaw);
        const target = !isNaN(scope) ? scope : undefined;
        const options = {
            jsonEditor: true,
            revealSetting: {
                key: "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */,
            }
        };
        switch (target) {
            case 1 /* ConfigurationTarget.APPLICATION */:
                preferencesService.openApplicationSettings(options);
                break;
            case 2 /* ConfigurationTarget.USER */:
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                preferencesService.openUserSettings(options);
                break;
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                preferencesService.openRemoteSettings(options);
                break;
            case 5 /* ConfigurationTarget.WORKSPACE */:
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                preferencesService.openWorkspaceSettings(options);
                break;
            default: {
                // Fallback if something goes wrong
                preferencesService.openSettings({
                    target: 2 /* ConfigurationTarget.USER */,
                    query: `@id:${"chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */}`,
                });
                break;
            }
        }
    }
});
CommandsRegistry.registerCommand("workbench.action.terminal.chat.disableSessionAutoApproval" /* TerminalChatCommandId.DisableSessionAutoApproval */, async (accessor, chatSessionId) => {
    const terminalChatService = accessor.get(ITerminalChatService);
    terminalChatService.setChatSessionAutoApproval(chatSessionId, false);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLGtFQUFrRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxvQkFBb0IsRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMs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
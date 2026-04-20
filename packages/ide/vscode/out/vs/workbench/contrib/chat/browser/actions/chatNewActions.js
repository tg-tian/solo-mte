/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { EditingSessionAction, getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { ACTION_ID_NEW_CHAT, ACTION_ID_NEW_EDIT_SESSION, CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { clearChatEditor } from './chatClear.js';
export function registerNewChatActions() {
    // Add "New Chat" submenu to Chat view menu
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        submenu: MenuId.ChatNewMenu,
        title: localize2('chat.newEdits.label', "New Chat"),
        icon: Codicon.plus,
        when: ContextKeyExpr.equals('view', ChatViewId),
        group: 'navigation',
        order: -1,
        isSplitButton: true
    });
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chatEditor.newChat',
                title: localize2('chat.newChat.label', "New Chat"),
                icon: Codicon.plus,
                f1: false,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor, ...args) {
            await clearChatEditor(accessor);
        }
    });
    registerAction2(class NewChatAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_NEW_CHAT,
                title: localize2('chat.newEdits.label', "New Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat)),
                f1: true,
                menu: [
                    {
                        id: MenuId.ChatContext,
                        group: 'z_clear'
                    },
                    {
                        id: MenuId.ChatNewMenu,
                        group: '1_open',
                        order: 1,
                    },
                    {
                        id: MenuId.CompactWindowEditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.lockedToCodingAgent.negate()),
                        order: 1
                    }
                ],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */],
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                        secondary: [256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */]
                    },
                    when: ChatContextKeys.inChatSession
                }
            });
        }
        async run(accessor, ...args) {
            const executeCommandContext = args[0];
            // Context from toolbar or lastFocusedWidget
            const context = getEditingSessionContext(accessor, args);
            const { editingSession, chatWidget: widget } = context ?? {};
            if (!widget) {
                return;
            }
            const dialogService = accessor.get(IDialogService);
            const model = widget.viewModel?.model;
            if (model && !(await handleCurrentEditingSession(model, undefined, dialogService))) {
                return;
            }
            await editingSession?.stop();
            await widget.clear();
            widget.attachmentModel.clear(true);
            widget.input.relatedFiles?.clear();
            widget.focusInput();
            if (!executeCommandContext) {
                return;
            }
            if (typeof executeCommandContext.agentMode === 'boolean') {
                widget.input.setChatMode(executeCommandContext.agentMode ? ChatModeKind.Agent : ChatModeKind.Edit);
            }
            if (executeCommandContext.inputValue) {
                if (executeCommandContext.isPartialQuery) {
                    widget.setInput(executeCommandContext.inputValue);
                }
                else {
                    widget.acceptInput(executeCommandContext.inputValue);
                }
            }
        }
    });
    CommandsRegistry.registerCommandAlias(ACTION_ID_NEW_EDIT_SESSION, ACTION_ID_NEW_CHAT);
    MenuRegistry.appendMenuItem(MenuId.ChatViewSessionTitleNavigationToolbar, {
        command: {
            id: ACTION_ID_NEW_CHAT,
            title: localize2('chat.goBack', "Go Back"),
            icon: Codicon.arrowLeft,
        },
        group: 'navigation',
        order: 1
    });
    registerAction2(class UndoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.undoEdit',
                title: localize2('chat.undoEdit.label', "Undo Last Edit"),
                category: CHAT_CATEGORY,
                icon: Codicon.discard,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanUndo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -3,
                        isHiddenByDefault: true
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.undoInteraction();
        }
    });
    registerAction2(class RedoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit',
                title: localize2('chat.redoEdit.label', "Redo Last Edit"),
                category: CHAT_CATEGORY,
                icon: Codicon.redo,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -2,
                        isHiddenByDefault: true
                    }
                ]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const chatService = accessor.get(IChatService);
            await editingSession.redoInteraction();
            chatService.getSession(editingSession.chatSessionResource)?.setCheckpoint(undefined);
        }
    });
    registerAction2(class RedoChatCheckpoints extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit2',
                title: localize2('chat.redoEdit.label2', "Redo"),
                tooltip: localize2('chat.redoEdit.tooltip', "Reapply discarded workspace changes and chat"),
                category: CHAT_CATEGORY,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ChatMessageRestoreCheckpoint,
                        when: ChatContextKeys.lockedToCodingAgent.negate(),
                        group: 'navigation',
                        order: -1
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const widget = accessor.get(IChatWidgetService);
            while (editingSession.canRedo.get()) {
                await editingSession.redoInteraction();
            }
            const currentWidget = widget.getWidgetBySessionResource(editingSession.chatSessionResource);
            const requestText = currentWidget?.viewModel?.model.checkpoint?.message.text;
            // if the input has the same text that we just restored, clear it.
            if (currentWidget?.inputEditor.getValue() === requestText) {
                currentWidget?.input.setValue('', false);
            }
            currentWidget?.viewModel?.model.setCheckpoint(undefined);
            currentWidget?.focusInput();
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE5ld0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdE5ld0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLDJCQUEyQixFQUFFLE1BQU0s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
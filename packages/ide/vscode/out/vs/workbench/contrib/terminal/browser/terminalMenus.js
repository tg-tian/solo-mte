/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { TaskExecutionSupportedContext } from '../../tasks/common/taskService.js';
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { HasSpeechProvider } from '../../speech/common/speechService.js';
import { hasKey } from '../../../../base/common/types.js';
export var TerminalContextMenuGroup;
(function (TerminalContextMenuGroup) {
    TerminalContextMenuGroup["Chat"] = "0_chat";
    TerminalContextMenuGroup["Create"] = "1_create";
    TerminalContextMenuGroup["Edit"] = "3_edit";
    TerminalContextMenuGroup["Clear"] = "5_clear";
    TerminalContextMenuGroup["Kill"] = "7_kill";
    TerminalContextMenuGroup["Config"] = "9_config";
})(TerminalContextMenuGroup || (TerminalContextMenuGroup = {}));
export var TerminalMenuBarGroup;
(function (TerminalMenuBarGroup) {
    TerminalMenuBarGroup["Create"] = "1_create";
    TerminalMenuBarGroup["Run"] = "3_run";
    TerminalMenuBarGroup["Manage"] = "5_manage";
    TerminalMenuBarGroup["Configure"] = "7_configure";
})(TerminalMenuBarGroup || (TerminalMenuBarGroup = {}));
export function setupTerminalMenus() {
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: localize({ key: 'miNewTerminal', comment: ['&& denotes a mnemonic'] }, "&&New Terminal")
                },
                order: 1
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.newInNewWindow" /* TerminalCommandId.NewInNewWindow */,
                    title: localize({ key: 'miNewInNewWindow', comment: ['&& denotes a mnemonic'] }, "New Terminal &&Window"),
                    precondition: ContextKeyExpr.has("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */)
                },
                order: 2,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "1_create" /* TerminalMenuBarGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: localize({ key: 'miSplitTerminal', comment: ['&& denotes a mnemonic'] }, "&&Split Terminal"),
                    precondition: ContextKeyExpr.has("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */)
                },
                order: 2,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize({ key: 'miRunActiveFile', comment: ['&& denotes a mnemonic'] }, "Run &&Active File")
                },
                order: 3,
                when: TerminalContextKeys.processSupported
            }
        },
        {
            id: MenuId.MenubarTerminalMenu,
            item: {
                group: "3_run" /* TerminalMenuBarGroup.Run */,
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize({ key: 'miRunSelectedText', comment: ['&& denotes a mnemonic'] }, "Run &&Selected Text")
                },
                order: 4,
                when: TerminalContextKeys.processSupported
            }
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
                    title: terminalStrings.kill.value,
                },
                group: "7_kill" /* TerminalContextMenuGroup.Kill */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize('workbench.action.terminal.copySelection.short', "Copy")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize('workbench.action.terminal.copySelectionAsHtml', "Copy as HTML")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize('workbench.action.terminal.paste.short', "Paste")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clear', "Clear")
                },
                group: "5_clear" /* TerminalContextMenuGroup.Clear */,
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize('workbench.action.terminal.selectAll', "Select All"),
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
    ]);
    MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
        command: {
            id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
            title: terminalStrings.new
        },
        group: '1_zzz_file',
        order: 30,
        when: TerminalContextKeys.processSupported
    });
    MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
        command: {
            id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
            title: terminalStrings.new
        },
        group: '1_zzz_file',
        order: 30,
        when: TerminalContextKeys.processSupported
    });
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value
                }
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
                    title: terminalStrings.kill.value
                },
                group: "7_kill" /* TerminalContextMenuGroup.Kill */
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
                    title: localize('workbench.action.terminal.copySelection.short', "Copy")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
                    title: localize('workbench.action.terminal.copySelectionAsHtml', "Copy as HTML")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
                    title: localize('workbench.action.terminal.paste.short', "Paste")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clear', "Clear")
                },
                group: "5_clear" /* TerminalContextMenuGroup.Clear */,
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
                    title: localize('workbench.action.terminal.selectAll', "Select All"),
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */,
                order: 3
            }
        },
        {
            id: MenuId.TerminalEditorInstanceContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    title: localize('workbench.action.terminal.newWithProfile.short', "New Terminal With Profile...")
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */
            }
        },
        {
            id: MenuId.TerminalTabEmptyAreaContext,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */
            }
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
                    title: localize2('workbench.action.terminal.selectDefaultProfile', 'Select Default Profile'),
                },
                group: '3_configure'
            }
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
                    title: localize('workbench.action.terminal.openSettings', "Configure Terminal Settings")
                },
                group: '3_configure'
            }
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.runTask',
                    title: localize('workbench.action.tasks.runTask', "Run Task...")
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 1
            },
        },
        {
            id: MenuId.TerminalNewDropdownContext,
            item: {
                command: {
                    id: 'workbench.action.tasks.configureTaskRunner',
                    title: localize('workbench.action.tasks.configureTaskRunner', "Configure Tasks...")
                },
                when: TaskExecutionSupportedContext,
                group: '4_tasks',
                order: 2
            },
        }
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
                    title: localize2('workbench.action.terminal.switchTerminal', 'Switch Terminal')
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.not(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`)),
            }
        },
        {
            // This is used to show instead of tabs when there is only a single terminal
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
                    title: terminalStrings.focus
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.not("hasHiddenChatTerminals" /* TerminalContribContextKeyStrings.ChatHasHiddenTerminals */), ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.has(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`), ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminal'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleTerminalOrNarrow'), ContextKeyExpr.or(ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1), ContextKeyExpr.has("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */))), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'singleGroup'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */}`, 'always'))),
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 2,
                when: TerminalContextKeys.shouldShowViewInlineActions
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
                    title: terminalStrings.kill,
                    icon: Codicon.trash
                },
                group: 'navigation',
                order: 3,
                when: TerminalContextKeys.shouldShowViewInlineActions
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
                    title: terminalStrings.new,
                    icon: Codicon.plus
                },
                alt: {
                    id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                    title: terminalStrings.split.value,
                    icon: Codicon.splitHorizontal
                },
                group: 'navigation',
                order: 0,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.or(TerminalContextKeys.webExtensionContributedProfile, TerminalContextKeys.processSupported))
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                    title: localize('workbench.action.terminal.clearLong', "Clear Terminal"),
                    icon: Codicon.clearAll
                },
                group: 'navigation',
                order: 6,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                    title: localize('workbench.action.terminal.runActiveFile', "Run Active File"),
                    icon: Codicon.run
                },
                group: 'navigation',
                order: 7,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                    title: localize('workbench.action.terminal.runSelectedText', "Run Selected Text"),
                    icon: Codicon.selection
                },
                group: 'navigation',
                order: 8,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.startVoice" /* TerminalCommandId.StartVoice */,
                    title: localize('workbench.action.terminal.startVoice', "Start Dictation"),
                },
                group: 'navigation',
                order: 9,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), TerminalContextKeys.terminalDictationInProgress.toNegated()),
                isHiddenByDefault: true
            },
        },
        {
            id: MenuId.ViewTitle,
            item: {
                command: {
                    id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
                    title: localize('workbench.action.terminal.stopVoice', "Stop Dictation"),
                },
                group: 'navigation',
                order: 9,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), TerminalContextKeys.terminalDictationInProgress),
                isHiddenByDefault: true
            },
        },
    ]);
    MenuRegistry.appendMenuItems([
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
                    title: terminalStrings.split.value,
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                order: 1
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
                    title: terminalStrings.moveToEditor.value
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
                    title: terminalStrings.moveIntoNewWindow.value
                },
                group: "1_create" /* TerminalContextMenuGroup.Create */,
                order: 2
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
                    title: localize('workbench.action.terminal.renameInstance', "Rename...")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
                    title: localize('workbench.action.terminal.changeIcon', "Change Icon...")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
                    title: localize('workbench.action.terminal.changeColor', "Change Color...")
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
                    title: terminalStrings.toggleSizeToContentWidth
                },
                group: "3_edit" /* TerminalContextMenuGroup.Edit */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
                    title: localize('workbench.action.terminal.joinInstance', "Join Terminals")
                },
                when: TerminalContextKeys.tabsSingularSelection.toNegated(),
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
                    title: terminalStrings.unsplit.value
                },
                when: ContextKeyExpr.and(TerminalContextKeys.tabsSingularSelection, TerminalContextKeys.splitTerminalTabFocused),
                group: "9_config" /* TerminalContextMenuGroup.Config */
            }
        },
        {
            id: MenuId.TerminalTabContext,
            item: {
                command: {
                    id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
                    title: terminalStrings.kill.value
                },
                group: "7_kill" /* TerminalContextMenuGroup.Kill */,
            }
        }
    ]);
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
            title: terminalStrings.moveToTerminalPanel
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
            title: terminalStrings.rename
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
            title: terminalStrings.changeColor
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
            title: terminalStrings.changeIcon
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: {
            id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
            title: terminalStrings.toggleSizeToContentWidth
        },
        when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
        group: '2_files'
    });
    for (const menuId of [MenuId.EditorTitle, MenuId.CompactWindowEditorTitle]) {
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
                title: terminalStrings.new,
                icon: Codicon.plus
            },
            alt: {
                id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
                title: terminalStrings.split.value,
                icon: Codicon.splitHorizontal
            },
            group: 'navigation',
            order: 0,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal)
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
                title: localize('workbench.action.terminal.clearLong', "Clear Terminal"),
                icon: Codicon.clearAll
            },
            group: 'navigation',
            order: 6,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
                title: localize('workbench.action.terminal.runActiveFile', "Run Active File"),
                icon: Codicon.run
            },
            group: 'navigation',
            order: 7,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
                title: localize('workbench.action.terminal.runSelectedText', "Run Selected Text"),
                icon: Codicon.selection
            },
            group: 'navigation',
            order: 8,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.startVoice" /* TerminalCommandId.StartVoice */,
                title: localize('workbench.action.terminal.startVoiceEditor', "Start Dictation"),
                icon: Codicon.mic
            },
            group: 'navigation',
            order: 9,
            when: ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal), TerminalContextKeys.terminalDictationInProgress.negate()),
            isHiddenByDefault: true
        });
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
                title: localize('workbench.action.terminal.stopVoiceEditor', "Stop Dictation"),
                icon: Codicon.run
            },
            group: 'navigation',
            order: 10,
            when: ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal), HasSpeechProvider, TerminalContextKeys.terminalDictationInProgress),
            isHiddenByDefault: true
        });
    }
}
export function getTerminalActionBarArgs(location, profiles, defaultProfileName, contributedProfiles, terminalService, dropdownMenu, disposableStore) {
    const dropdownActions = [];
    const submenuActions = [];
    const splitLocation = (location === TerminalLocation.Editor || (typeof location === 'object' && hasKey(location, { viewColumn: true }) && location.viewColumn === ACTIVE_GROUP)) ? { viewColumn: SIDE_GROUP } : { splitActiveTerminal: true };
    if (location === TerminalLocation.Editor) {
        location = { viewColumn: ACTIVE_GROUP };
    }
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.new" /* TerminalCommandId.New */, terminalStrings.new, undefined, true, () => terminalService.createAndFocusTerminal())));
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.newInNewWindow" /* TerminalCommandId.NewInNewWindow */, terminalStrings.newInNewWindow.value, undefined, true, () => terminalService.createAndFocusTerminal({
        location: {
            viewColumn: AUX_WINDOW_GROUP,
            auxiliary: { compact: true },
        }
    }))));
    dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.split" /* TerminalCommandId.Split */, terminalStrings.split.value, undefined, true, () => terminalService.createAndFocusTerminal({
        location: splitLocation
    }))));
    dropdownActions.push(new Separator());
    profiles = profiles.filter(e => !e.isAutoDetected);
    for (const p of profiles) {
        const isDefault = p.profileName === defaultProfileName;
        const options = { config: p, location };
        const splitOptions = { config: p, location: splitLocation };
        const sanitizedProfileName = p.profileName.replace(/[\n\r\t]/g, '');
        dropdownActions.push(disposableStore.add(new Action("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */, isDefault ? localize('defaultTerminalProfile', "{0} (Default)", sanitizedProfileName) : sanitizedProfileName, undefined, true, async () => {
            await terminalService.createAndFocusTerminal(options);
        })));
        submenuActions.push(disposableStore.add(new Action("workbench.action.terminal.split" /* TerminalCommandId.Split */, isDefault ? localize('defaultTerminalProfile', "{0} (Default)", sanitizedProfileName) : sanitizedProfileName, undefined, true, async () => {
            await terminalService.createAndFocusTerminal(splitOptions);
        })));
    }
    for (const contributed of contributedProfiles) {
        const isDefault = contributed.title === defaultProfileName;
        const title = isDefault ? localize('defaultTerminalProfile', "{0} (Default)", contributed.title.replace(/[\n\r\t]/g, '')) : contributed.title.replace(/[\n\r\t]/g, '');
        dropdownActions.push(disposableStore.add(new Action('contributed', title, undefined, true, () => terminalService.createAndFocusTerminal({
            config: {
                extensionIdentifier: contributed.extensionIdentifier,
                id: contributed.id,
                title
            },
            location
        }))));
        submenuActions.push(disposableStore.add(new Action('contributed-split', title, undefined, true, () => terminalService.createAndFocusTerminal({
            config: {
                extensionIdentifier: contributed.extensionIdentifier,
                id: contributed.id,
                title
            },
            location: splitLocation
        }))));
    }
    if (dropdownActions.length > 0) {
        dropdownActions.push(new SubmenuAction('split.profile', localize('split.profile', 'Split Terminal with Profile'), submenuActions));
        dropdownActions.push(new Separator());
    }
    const actions = dropdownMenu.getActions();
    dropdownActions.push(...Separator.join(...actions.map(a => a[1])));
    const dropdownAction = disposableStore.add(new Action('refresh profiles', localize('launchProfile', 'Launch Profile...'), 'codicon-chevron-down', true));
    return { dropdownAction, dropdownMenuActions: dropdownActions, className: `terminal-tab-actions-${terminalService.resolveLocation(location)}` };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNZW51cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsTWVudXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBUyxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBK0MsZ0JBQWdCLEVBQXFCLE1BQU0sa0RBQWtELENBQUM7QUFDcEosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbEYsT0FBTyxFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBNkIsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxF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
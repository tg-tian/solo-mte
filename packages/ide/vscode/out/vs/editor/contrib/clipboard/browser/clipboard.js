/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { getActiveDocument, getActiveWindow } from '../../../../base/browser/dom.js';
import * as platform from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CopyOptions, generateDataToCopyAndStoreInMemory, InMemoryClipboardMetadataManager, PasteOptions } from '../../../browser/controller/editContext/clipboardUtils.js';
import { NativeEditContextRegistry } from '../../../browser/controller/editContext/native/nativeEditContextRegistry.js';
import { EditorAction, MultiCommand, registerEditorAction } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CopyPasteController } from '../../dropOrPasteInto/browser/copyPasteController.js';
const CLIPBOARD_CONTEXT_MENU_GROUP = '9_cutcopypaste';
const supportsCut = (platform.isNative || document.queryCommandSupported('cut'));
const supportsCopy = (platform.isNative || document.queryCommandSupported('copy'));
// Firefox only supports navigator.clipboard.readText() in browser extensions.
// See https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/readText#Browser_compatibility
// When loading over http, navigator.clipboard can be undefined. See https://github.com/microsoft/monaco-editor/issues/2313
const supportsPaste = (typeof navigator.clipboard === 'undefined' || browser.isFirefox) ? document.queryCommandSupported('paste') : true;
function registerCommand(command) {
    command.register();
    return command;
}
export const CutAction = supportsCut ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardCutAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind cut keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */, secondary: [1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miCut', comment: ['&& denotes a mnemonic'] }, "Cu&&t"),
            order: 1
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            when: EditorContextKeys.writable,
            order: 1,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            when: EditorContextKeys.writable,
            order: 1,
        }]
})) : undefined;
export const CopyAction = supportsCopy ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardCopyAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind copy keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miCopy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
            order: 2
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 2,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 2,
        }]
})) : undefined;
MenuRegistry.appendMenuItem(MenuId.MenubarEditMenu, { submenu: MenuId.MenubarCopy, title: nls.localize2('copy as', "Copy As"), group: '2_ccp', order: 3 });
MenuRegistry.appendMenuItem(MenuId.EditorContext, { submenu: MenuId.EditorContextCopy, title: nls.localize2('copy as', "Copy As"), group: CLIPBOARD_CONTEXT_MENU_GROUP, order: 3 });
MenuRegistry.appendMenuItem(MenuId.EditorContext, { submenu: MenuId.EditorContextShare, title: nls.localize2('share', "Share"), group: '11_share', order: -1, when: ContextKeyExpr.and(ContextKeyExpr.notEquals('resourceScheme', 'output'), EditorContextKeys.editorTextFocus) });
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, { submenu: MenuId.ExplorerContextShare, title: nls.localize2('share', "Share"), group: '11_share', order: -1 });
export const PasteAction = supportsPaste ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardPasteAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind paste keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
        linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miPaste', comment: ['&& denotes a mnemonic'] }, "&&Paste"),
            order: 4
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            when: EditorContextKeys.writable,
            order: 4,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            when: EditorContextKeys.writable,
            order: 4,
        }]
})) : undefined;
class ExecCommandCopyWithSyntaxHighlightingAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.clipboardCopyWithSyntaxHighlightingAction',
            label: nls.localize2('actions.clipboard.copyWithSyntaxHighlightingLabel', "Copy with Syntax Highlighting"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        const logService = accessor.get(ILogService);
        const clipboardService = accessor.get(IClipboardService);
        logService.trace('ExecCommandCopyWithSyntaxHighlightingAction#run');
        if (!editor.hasModel()) {
            return;
        }
        const emptySelectionClipboard = editor.getOption(45 /* EditorOption.emptySelectionClipboard */);
        if (!emptySelectionClipboard && editor.getSelection().isEmpty()) {
            return;
        }
        CopyOptions.forceCopyWithSyntaxHighlighting = true;
        editor.focus();
        logService.trace('ExecCommandCopyWithSyntaxHighlightingAction (before execCommand copy)');
        executeClipboardCopyWithWorkaround(editor, clipboardService);
        logService.trace('ExecCommandCopyWithSyntaxHighlightingAction (after execCommand copy)');
        CopyOptions.forceCopyWithSyntaxHighlighting = false;
    }
}
function executeClipboardCopyWithWorkaround(editor, clipboardService) {
    // !!!!!
    // This is a workaround for what we think is an Electron bug where
    // execCommand('copy') does not always work (it does not fire a clipboard event)
    // We will use this as a signal that we have executed a copy command
    // !!!!!
    CopyOptions.electronBugWorkaroundCopyEventHasFired = false;
    editor.getContainerDomNode().ownerDocument.execCommand('copy');
    if (platform.isNative && CopyOptions.electronBugWorkaroundCopyEventHasFired === false) {
        // We have encountered the Electron bug!
        // As a workaround, we will write (only the plaintext data) to the clipboard in a different way
        // We will use the clipboard service (which in the native case will go to electron's clipboard API)
        const { dataToCopy } = generateDataToCopyAndStoreInMemory(editor._getViewModel(), editor.getOptions(), undefined, browser.isFirefox);
        clipboardService.writeText(dataToCopy.text);
    }
}
async function pasteWithNavigatorAPI(editor, clipboardService, logService) {
    const clipboardText = await clipboardService.readText();
    if (clipboardText !== '') {
        const metadata = InMemoryClipboardMetadataManager.INSTANCE.get(clipboardText);
        let pasteOnNewLine = false;
        let multicursorText = null;
        let mode = null;
        if (metadata) {
            pasteOnNewLine = (editor.getOption(45 /* EditorOption.emptySelectionClipboard */) && !!metadata.isFromEmptySelection);
            multicursorText = (typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null);
            mode = metadata.mode;
        }
        logService.trace('pasteWithNavigatorAPI with id : ', metadata?.id, ', clipboardText.length : ', clipboardText.length);
        editor.trigger('keyboard', "paste" /* Handler.Paste */, {
            text: clipboardText,
            pasteOnNewLine,
            multicursorText,
            mode
        });
    }
}
function registerExecCommandImpl(target, browserCommand) {
    if (!target) {
        return;
    }
    // 1. handle case when focus is in editor.
    target.addImplementation(10000, 'code-editor', (accessor, args) => {
        const logService = accessor.get(ILogService);
        const clipboardService = accessor.get(IClipboardService);
        logService.trace('registerExecCommandImpl (addImplementation code-editor for : ', browserCommand, ')');
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasTextFocus() && focusedEditor.hasModel()) {
            // Do not execute if there is no selection and empty selection clipboard is off
            const emptySelectionClipboard = focusedEditor.getOption(45 /* EditorOption.emptySelectionClipboard */);
            const selection = focusedEditor.getSelection();
            if (selection && selection.isEmpty() && !emptySelectionClipboard) {
                return true;
            }
            // TODO this is very ugly. The entire copy/paste/cut system needs a complete refactoring.
            if (focusedEditor.getOption(170 /* EditorOption.effectiveEditContext */) && browserCommand === 'cut') {
                logCopyCommand(focusedEditor);
                // execCommand(copy) works for edit context, but not execCommand(cut).
                logService.trace('registerExecCommandImpl (before execCommand copy)');
                executeClipboardCopyWithWorkaround(focusedEditor, clipboardService);
                focusedEditor.trigger(undefined, "cut" /* Handler.Cut */, undefined);
                logService.trace('registerExecCommandImpl (after execCommand copy)');
            }
            else {
                logCopyCommand(focusedEditor);
                logService.trace('registerExecCommandImpl (before execCommand ' + browserCommand + ')');
                if (browserCommand === 'copy') {
                    executeClipboardCopyWithWorkaround(focusedEditor, clipboardService);
                }
                else {
                    focusedEditor.getContainerDomNode().ownerDocument.execCommand(browserCommand);
                }
                logService.trace('registerExecCommandImpl (after execCommand ' + browserCommand + ')');
            }
            return true;
        }
        return false;
    });
    // 2. (default) handle case when focus is somewhere else.
    target.addImplementation(0, 'generic-dom', (accessor, args) => {
        const logService = accessor.get(ILogService);
        logService.trace('registerExecCommandImpl (addImplementation generic-dom for : ', browserCommand, ')');
        logService.trace('registerExecCommandImpl (before execCommand ' + browserCommand + ')');
        getActiveDocument().execCommand(browserCommand);
        logService.trace('registerExecCommandImpl (after execCommand ' + browserCommand + ')');
        return true;
    });
}
function logCopyCommand(editor) {
    const editContextEnabled = editor.getOption(170 /* EditorOption.effectiveEditContext */);
    if (editContextEnabled) {
        const nativeEditContext = NativeEditContextRegistry.get(editor.getId());
        if (nativeEditContext) {
            nativeEditContext.onWillCopy();
        }
    }
}
registerExecCommandImpl(CutAction, 'cut');
registerExecCommandImpl(CopyAction, 'copy');
if (PasteAction) {
    // 1. Paste: handle case when focus is in editor.
    PasteAction.addImplementation(10000, 'code-editor', (accessor, args) => {
        const logService = accessor.get(ILogService);
        logService.trace('registerExecCommandImpl (addImplementation code-editor for : paste)');
        const codeEditorService = accessor.get(ICodeEditorService);
        const clipboardService = accessor.get(IClipboardService);
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = codeEditorService.getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasModel() && focusedEditor.hasTextFocus()) {
            // execCommand(paste) does not work with edit context
            const editContextEnabled = focusedEditor.getOption(170 /* EditorOption.effectiveEditContext */);
            if (editContextEnabled) {
                const nativeEditContext = NativeEditContextRegistry.get(focusedEditor.getId());
                if (nativeEditContext) {
                    nativeEditContext.onWillPaste();
                }
            }
            logService.trace('registerExecCommandImpl (before triggerPaste)');
            PasteOptions.electronBugWorkaroundPasteEventHasFired = false;
            const triggerPaste = clipboardService.triggerPaste(getActiveWindow().vscodeWindowId);
            if (triggerPaste) {
                logService.trace('registerExecCommandImpl (triggerPaste defined)');
                return triggerPaste.then(async () => {
                    if (PasteOptions.electronBugWorkaroundPasteEventHasFired === false) {
                        return pasteWithNavigatorAPI(focusedEditor, clipboardService, logService);
                    }
                    logService.trace('registerExecCommandImpl (after triggerPaste)');
                    return CopyPasteController.get(focusedEditor)?.finishedPaste() ?? Promise.resolve();
                });
            }
            else {
                logService.trace('registerExecCommandImpl (triggerPaste undefined)');
            }
            if (platform.isWeb) {
                logService.trace('registerExecCommandImpl (Paste handling on web)');
                // Use the clipboard service if document.execCommand('paste') was not successful
                return pasteWithNavigatorAPI(focusedEditor, clipboardService, logService);
            }
            return true;
        }
        return false;
    });
    // 2. Paste: (default) handle case when focus is somewhere else.
    PasteAction.addImplementation(0, 'generic-dom', (accessor, args) => {
        const logService = accessor.get(ILogService);
        logService.trace('registerExecCommandImpl (addImplementation generic-dom for : paste)');
        const triggerPaste = accessor.get(IClipboardService).triggerPaste(getActiveWindow().vscodeWindowId);
        return triggerPaste ?? false;
    });
}
if (supportsCopy) {
    registerEditorAction(ExecCommandCopyWithSyntaxHighlightingAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NsaXBib2FyZC9icm93c2VyL2NsaXBib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVyRixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsa0NBQWtDLEVBQUUsZ0NBQWdDLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDNUssT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFFeEgsT0FBTyxFQUFXLFlBQVksRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUdwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUzRixNQUFNLDRCQUE0QixHQUFHLGdCQUFnQixDQUFDO0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import './media/review.css';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import * as nls from '../../../../nls.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ICommentService } from './commentService.js';
import { ctxCommentEditorFocused, SimpleCommentEditor } from './simpleCommentEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CommentController, ID } from './commentsController.js';
import { Range } from '../../../../editor/common/core/range.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewCurrentProviderId } from '../../accessibility/browser/accessibilityConfiguration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { CommentsInputContentProvider } from './commentsInputContentProvider.js';
import { CommentWidgetFocus } from './commentThreadZoneWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CommentThreadCollapsibleState, CommentThreadState } from '../../../../editor/common/languages.js';
registerEditorContribution(ID, CommentController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerWorkbenchContribution2(CommentsInputContentProvider.ID, CommentsInputContentProvider, 2 /* WorkbenchPhase.BlockRestore */);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.nextCommentThreadAction" /* CommentCommandId.NextThread */,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.nextCommentThread(true);
    },
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 512 /* KeyMod.Alt */ | 67 /* KeyCode.F9 */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.previousCommentThreadAction" /* CommentCommandId.PreviousThread */,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.previousCommentThread(true);
    },
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 67 /* KeyCode.F9 */
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.nextCommentedRangeAction" /* CommentCommandId.NextCommentedRange */,
            title: {
                value: nls.localize('comments.NextCommentedRange', "Go to Next Commented Range"),
                original: 'Go to Next Commented Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeEditorHasCommentingRange
            }
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentThread(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.previousCommentedRangeAction" /* CommentCommandId.PreviousCommentedRange */,
            title: {
                value: nls.localize('comments.previousCommentedRange', "Go to Previous Commented Range"),
                original: 'Go to Previous Commented Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeEditorHasCommentingRange
            }
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentThread(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.nextCommentingRange" /* CommentCommandId.NextRange */,
            title: {
                value: nls.localize('comments.nextCommentingRange', "Go to Next Commenting Range"),
                original: 'Go to Next Commenting Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(EditorContextKeys.focus, CommentContextKeys.commentFocused, ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewCurrentProviderId.isEqualTo("comments" /* AccessibleViewProviderId.Comments */))))
            }
        });
    }
    run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentingRange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.previousCommentingRange" /* CommentCommandId.PreviousRange */,
            title: {
                value: nls.localize('comments.previousCommentingRange', "Go to Previous Commenting Range"),
                original: 'Go to Previous Commenting Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(EditorContextKeys.focus, CommentContextKeys.commentFocused, ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewCurrentProviderId.isEqualTo("comments" /* AccessibleViewProviderId.Comments */))))
            }
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentingRange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.toggleCommenting" /* CommentCommandId.ToggleCommenting */,
            title: {
                value: nls.localize('comments.toggleCommenting', "Toggle Editor Commenting"),
                original: 'Toggle Editor Commenting'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(ICommentService);
        const enable = commentService.isCommentingEnabled;
        commentService.enableCommenting(!enable);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.addComment" /* CommentCommandId.Add */,
            title: {
                value: nls.localize('comments.addCommand', "Add Comment on Current Selection"),
                original: 'Add Comment on Current Selection'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeCursorHasCommentingRange
                }],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeCursorHasCommentingRange
            }
        });
    }
    async run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = args?.range ? new Range(args.range.startLineNumber, args.range.startLineNumber, args.range.endLineNumber, args.range.endColumn)
            : (args?.fileComment ? undefined : activeEditor.getSelection());
        await controller.addOrToggleCommentAtLine(position, undefined);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.focusCommentOnCurrentLine" /* CommentCommandId.FocusCommentOnCurrentLine */,
            title: {
                value: nls.localize('comments.focusCommentOnCurrentLine', "Focus Comment on Current Line"),
                original: 'Focus Comment on Current Line'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            f1: true,
            precondition: CommentContextKeys.activeCursorHasComment,
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = activeEditor.getSelection();
        const notificationService = accessor.get(INotificationService);
        let error = false;
        try {
            const commentAtLine = controller.getCommentsAtLine(position);
            if (commentAtLine.length === 0) {
                error = true;
            }
            else {
                await controller.revealCommentThread(commentAtLine[0].commentThread.threadId, undefined, false, CommentWidgetFocus.Widget);
            }
        }
        catch (e) {
            error = true;
        }
        if (error) {
            notificationService.error(nls.localize('comments.focusCommand.error', "The cursor must be on a line with a comment to focus the comment"));
        }
    }
});
function changeAllCollapseState(commentService, newState) {
    for (const resource of commentService.commentsModel.resourceCommentThreads) {
        for (const thread of resource.commentThreads) {
            thread.thread.collapsibleState = newState(thread.thread);
        }
    }
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.collapseAllComments" /* CommentCommandId.CollapseAll */,
            title: {
                value: nls.localize('comments.collapseAll', "Collapse All Comments"),
                original: 'Collapse All Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(ICommentService);
        changeAllCollapseState(commentService, () => CommentThreadCollapsibleState.Collapsed);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.expandAllComments" /* CommentCommandId.ExpandAll */,
            title: {
                value: nls.localize('comments.expandAll', "Expand All Comments"),
                original: 'Expand All Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(ICommentService);
        changeAllCollapseState(commentService, () => CommentThreadCollapsibleState.Expanded);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.expandUnresolvedComments" /* CommentCommandId.ExpandUnresolved */,
            title: {
                value: nls.localize('comments.expandUnresolved', "Expand Unresolved Comments"),
                original: 'Expand Unresolved Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(ICommentService);
        changeAllCollapseState(commentService, (commentThread) => {
            return commentThread.state === CommentThreadState.Unresolved ? CommentThreadCollapsibleState.Expanded : CommentThreadCollapsibleState.Collapsed;
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.submitComment" /* CommentCommandId.Submit */,
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    when: ctxCommentEditorFocused,
    handler: (accessor, args) => {
        const activeCodeEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (activeCodeEditor instanceof SimpleCommentEditor) {
            activeCodeEditor.getParentThread().submitComment();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.hideComment" /* CommentCommandId.Hide */,
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.or(ctxCommentEditorFocused, CommentContextKeys.commentFocused),
    handler: async (accessor, args) => {
        const activeCodeEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        const keybindingService = accessor.get(IKeybindingService);
        // Unfortunate, but collapsing the comment thread might cause a dialog to show
        // If we don't wait for the key up here, then the dialog will consume it and immediately close
        await keybindingService.enableKeybindingHoldMode("workbench.action.hideComment" /* CommentCommandId.Hide */);
        if (activeCodeEditor instanceof SimpleCommentEditor) {
            activeCodeEditor.getParentThread().collapse();
        }
        else if (activeCodeEditor) {
            const controller = CommentController.get(activeCodeEditor);
            if (!controller) {
                return;
            }
            const notificationService = accessor.get(INotificationService);
            const commentService = accessor.get(ICommentService);
            let error = false;
            try {
                const activeComment = commentService.lastActiveCommentcontroller?.activeComment;
                if (!activeComment) {
                    error = true;
                }
                else {
                    controller.collapseAndFocusRange(activeComment.thread.threadId);
                }
            }
            catch (e) {
                error = true;
            }
            if (error) {
                notificationService.error(nls.localize('comments.focusCommand.error', "The cursor must be on a line with a comment to focus the comment"));
            }
        }
    }
});
export function getActiveEditor(accessor) {
    let activeTextEditorControl = accessor.get(IEditorService).activeTextEditorControl;
    if (isDiffEditor(activeTextEditorControl)) {
        if (activeTextEditorControl.getOriginalEditor().hasTextFocus()) {
            activeTextEditorControl = activeTextEditorControl.getOriginalEditor();
        }
        else {
            activeTextEditorControl = activeTextEditorControl.getModifiedEditor();
        }
    }
    if (!isCodeEditor(activeTextEditorControl) || !activeTextEditorControl.hasModel()) {
        return null;
    }
    return activeTextEditorControl;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0VkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFxQixZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUcsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2hFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFB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
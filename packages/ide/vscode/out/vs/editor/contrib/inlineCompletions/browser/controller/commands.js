/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asyncTransaction, transaction } from '../../../../../base/common/observable.js';
import { splitLines } from '../../../../../base/common/strings.js';
import { vBoolean, vObj, vOptionalProp, vString, vUndefined, vUnion, vWithJsonSchemaRef } from '../../../../../base/common/validation.js';
import * as nls from '../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { EditorAction } from '../../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { Context as SuggestContext } from '../../../suggest/browser/suggest.js';
import { hideInlineCompletionId, inlineSuggestCommitAlternativeActionId, inlineSuggestCommitId, jumpToNextInlineEditId, showNextInlineSuggestionActionId, showPreviousInlineSuggestionActionId, toggleShowCollapsedId } from './commandIds.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './inlineCompletionsController.js';
export class ShowNextInlineSuggestionAction extends EditorAction {
    static { this.ID = showNextInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowNextInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showNext', "Show Next Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.next();
    }
}
export class ShowPreviousInlineSuggestionAction extends EditorAction {
    static { this.ID = showPreviousInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowPreviousInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showPrevious', "Show Previous Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.previous();
    }
}
export const providerIdSchemaUri = 'vscode://schemas/inlineCompletionProviderIdArgs';
export function inlineCompletionProviderGetMatcher(provider) {
    const result = [];
    if (provider.providerId) {
        result.push(provider.providerId.toStringWithoutVersion());
        result.push(provider.providerId.extensionId + ':*');
    }
    return result;
}
const argsValidator = vUnion(vObj({
    showNoResultNotification: vOptionalProp(vBoolean()),
    providerId: vOptionalProp(vWithJsonSchemaRef(providerIdSchemaUri, vString())),
    explicit: vOptionalProp(vBoolean()),
}), vUndefined());
export class TriggerInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.trigger',
            label: nls.localize2('action.inlineSuggest.trigger', "Trigger Inline Suggestion"),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize('inlineSuggest.trigger.description', "Triggers an inline suggestion in the editor."),
                args: [{
                        name: 'args',
                        description: nls.localize('inlineSuggest.trigger.args', "Options for triggering inline suggestions."),
                        isOptional: true,
                        schema: argsValidator.getJSONSchema(),
                    }]
            }
        });
    }
    async run(accessor, editor, args) {
        const notificationService = accessor.get(INotificationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const controller = InlineCompletionsController.get(editor);
        const validatedArgs = argsValidator.validateOrThrow(args);
        const provider = validatedArgs?.providerId ?
            languageFeaturesService.inlineCompletionsProvider.all(editor.getModel())
                .find(p => inlineCompletionProviderGetMatcher(p).some(m => m === validatedArgs.providerId))
            : undefined;
        await asyncTransaction(async (tx) => {
            /** @description triggerExplicitly from command */
            await controller?.model.get()?.trigger(tx, {
                provider: provider,
                explicit: validatedArgs?.explicit ?? true,
            });
            controller?.playAccessibilitySignal(tx);
        });
        if (validatedArgs?.showNoResultNotification) {
            if (!controller?.model.get()?.state.get()) {
                notificationService.notify({
                    severity: Severity.Info,
                    message: nls.localize('noInlineSuggestionAvailable', "No inline suggestion is available.")
                });
            }
        }
    }
}
export class AcceptNextWordOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextWord',
            label: nls.localize2('action.inlineSuggest.acceptNextWord', "Accept Next Word Of Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.cursorBeforeGhostText, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptWord', 'Accept Word'),
                    group: 'primary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextWord();
    }
}
export class AcceptNextLineOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextLine',
            label: nls.localize2('action.inlineSuggest.acceptNextLine', "Accept Next Line Of Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptLine', 'Accept Line'),
                    group: 'secondary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextLine();
    }
}
export class AcceptInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: inlineSuggestCommitId,
            label: nls.localize2('action.inlineSuggest.accept', "Accept Inline Suggestion"),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 2,
                }, {
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 2,
                }],
            kbOpts: [
                {
                    primary: 2 /* KeyCode.Tab */,
                    weight: 200,
                    kbExpr: ContextKeyExpr.or(ContextKeyExpr.and(InlineCompletionContextKeys.inlineSuggestionVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.hasSelection.toNegated(), InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize), ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldAcceptInlineEdit)),
                }
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        if (controller) {
            controller.model.get()?.accept(controller.editor);
            controller.editor.focus();
        }
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: inlineSuggestCommitId,
    weight: 202, // greater than jump
    primary: 2 /* KeyCode.Tab */,
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class AcceptInlineCompletionAlternativeAction extends EditorAction {
    constructor() {
        super({
            id: inlineSuggestCommitAlternativeActionId,
            label: nls.localize2('action.inlineSuggest.acceptAlternativeAction', "Accept Inline Suggestion Alternative Action"),
            precondition: ContextKeyExpr.and(InlineCompletionContextKeys.inlineSuggestionAlternativeActionVisible, InlineCompletionContextKeys.inlineEditVisible),
            menuOpts: [],
            kbOpts: [
                {
                    primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
                    weight: 203,
                }
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        if (controller) {
            controller.model.get()?.accept(controller.editor, true);
            controller.editor.focus();
        }
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: inlineSuggestCommitAlternativeActionId,
    weight: 203,
    primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class JumpToNextInlineEdit extends EditorAction {
    constructor() {
        super({
            id: jumpToNextInlineEditId,
            label: nls.localize2('action.inlineSuggest.jump', "Jump to next inline edit"),
            precondition: InlineCompletionContextKeys.inlineEditVisible,
            menuOpts: [{
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('jump', "Jump"),
                    group: 'primary',
                    order: 1,
                    when: InlineCompletionContextKeys.cursorAtInlineEdit.toNegated(),
                }],
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                weight: 201,
                kbExpr: ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldJumpToInlineEdit),
            }
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        if (controller) {
            controller.jump();
        }
    }
}
export class HideInlineCompletion extends EditorAction {
    static { this.ID = hideInlineCompletionId; }
    constructor() {
        super({
            id: HideInlineCompletion.ID,
            label: nls.localize2('action.inlineSuggest.hide', "Hide Inline Suggestion"),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 90, // same as hiding the suggest widget
                primary: 9 /* KeyCode.Escape */,
            },
            menuOpts: [{
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('reject', "Reject"),
                    group: 'primary',
                    order: 3,
                }]
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        transaction(tx => {
            controller?.model.get()?.stop('explicitCancel', tx);
        });
        controller?.editor.focus();
    }
}
export class ToggleInlineCompletionShowCollapsed extends EditorAction {
    static { this.ID = toggleShowCollapsedId; }
    constructor() {
        super({
            id: ToggleInlineCompletionShowCollapsed.ID,
            label: nls.localize2('action.inlineSuggest.toggleShowCollapsed', "Toggle Inline Suggestions Show Collapsed"),
            precondition: ContextKeyExpr.true(),
        });
    }
    async run(accessor, editor) {
        const configurationService = accessor.get(IConfigurationService);
        const showCollapsed = configurationService.getValue('editor.inlineSuggest.edits.showCollapsed');
        configurationService.updateValue('editor.inlineSuggest.edits.showCollapsed', !showCollapsed);
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: HideInlineCompletion.ID,
    weight: -1, // very weak
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class ToggleAlwaysShowInlineSuggestionToolbar extends Action2 {
    static { this.ID = 'editor.action.inlineSuggest.toggleAlwaysShowToolbar'; }
    constructor() {
        super({
            id: ToggleAlwaysShowInlineSuggestionToolbar.ID,
            title: nls.localize('action.inlineSuggest.alwaysShowToolbar', "Always Show Toolbar"),
            f1: false,
            precondition: undefined,
            menu: [{
                    id: MenuId.InlineSuggestionToolbar,
                    group: 'secondary',
                    order: 10,
                }],
            toggled: ContextKeyExpr.equals('config.editor.inlineSuggest.showToolbar', 'always')
        });
    }
    async run(accessor) {
        const configService = accessor.get(IConfigurationService);
        const currentValue = configService.getValue('editor.inlineSuggest.showToolbar');
        const newValue = currentValue === 'always' ? 'onHover' : 'always';
        configService.updateValue('editor.inlineSuggest.showToolbar', newValue);
    }
}
export class DevExtractReproSample extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.dev.extractRepro',
            label: nls.localize('action.inlineSuggest.dev.extractRepro', "Developer: Extract Inline Suggest State"),
            alias: 'Developer: Inline Suggest Extract Repro',
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineEditVisible, InlineCompletionContextKeys.inlineSuggestionVisible),
        });
    }
    async run(accessor, editor) {
        const clipboardService = accessor.get(IClipboardService);
        const controller = InlineCompletionsController.get(editor);
        const m = controller?.model.get();
        if (!m) {
            return;
        }
        const repro = m.extractReproSample();
        const inlineCompletionLines = splitLines(JSON.stringify({ inlineCompletion: repro.inlineCompletion }, null, 4));
        const json = inlineCompletionLines.map(l => '// ' + l).join('\n');
        const reproStr = `${repro.documentValue}\n\n// <json>\n${json}\n// </json>\n`;
        await clipboardService.writeText(reproStr);
        return { reproCase: reproStr };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9jb250cm9sbGVyL2NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDMUksT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sa0VBQWtFLENBQUM7QUFDekgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRTdHLE9BQU8sRUFBRSxZQUFZLEVBQW9CLE1BQU0seUNBQXlDLENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0s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
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
var InputEditorDecorations_1;
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { inputPlaceholderForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { chatSlashCommandBackground, chatSlashCommandForeground } from '../../common/chatColors.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestDynamicVariablePart, ChatRequestSlashCommandPart, ChatRequestSlashPromptPart, ChatRequestTextPart, ChatRequestToolPart, ChatRequestToolSetPart, chatAgentLeader, chatSubcommandLeader } from '../../common/chatParserTypes.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { ChatWidget } from '../chatWidget.js';
import { dynamicVariableDecorationType } from './chatDynamicVariables.js';
import { NativeEditContextRegistry } from '../../../../../editor/browser/controller/editContext/native/nativeEditContextRegistry.js';
import { TextAreaEditContextRegistry } from '../../../../../editor/browser/controller/editContext/textArea/textAreaEditContextRegistry.js';
import { ThrottledDelayer } from '../../../../../base/common/async.js';
const decorationDescription = 'chat';
const placeholderDecorationType = 'chat-session-detail';
const slashCommandTextDecorationType = 'chat-session-text';
const variableTextDecorationType = 'chat-variable-text';
function agentAndCommandToKey(agent, subcommand) {
    return subcommand ? `${agent.id}__${subcommand}` : agent.id;
}
function isWhitespaceOrPromptPart(p) {
    return (p instanceof ChatRequestTextPart && !p.text.trim().length) || (p instanceof ChatRequestSlashPromptPart);
}
function exactlyOneSpaceAfterPart(parsedRequest, part) {
    const partIdx = parsedRequest.indexOf(part);
    if (parsedRequest.length > partIdx + 2) {
        return false;
    }
    const nextPart = parsedRequest[partIdx + 1];
    return nextPart && nextPart instanceof ChatRequestTextPart && nextPart.text === ' ';
}
function getRangeForPlaceholder(part) {
    return {
        startLineNumber: part.editorRange.startLineNumber,
        endLineNumber: part.editorRange.endLineNumber,
        startColumn: part.editorRange.endColumn + 1,
        endColumn: 1000
    };
}
let InputEditorDecorations = class InputEditorDecorations extends Disposable {
    static { InputEditorDecorations_1 = this; }
    static { this.UPDATE_DELAY = 200; }
    constructor(widget, codeEditorService, themeService, chatAgentService, labelService, promptsService) {
        super();
        this.widget = widget;
        this.codeEditorService = codeEditorService;
        this.themeService = themeService;
        this.chatAgentService = chatAgentService;
        this.labelService = labelService;
        this.promptsService = promptsService;
        this.id = 'inputEditorDecorations';
        this.previouslyUsedAgents = new Set();
        this.viewModelDisposables = this._register(new MutableDisposable());
        this.updateThrottle = this._register(new ThrottledDelayer(InputEditorDecorations_1.UPDATE_DELAY));
        this.registeredDecorationTypes();
        this.triggerInputEditorDecorationsUpdate();
        this._register(this.widget.inputEditor.onDidChangeModelContent(() => this.triggerInputEditorDecorationsUpdate()));
        this._register(this.widget.onDidChangeParsedInput(() => this.triggerInputEditorDecorationsUpdate()));
        this._register(this.widget.onDidChangeViewModel(() => {
            this.registerViewModelListeners();
            this.previouslyUsedAgents.clear();
            this.triggerInputEditorDecorationsUpdate();
        }));
        this._register(this.widget.onDidSubmitAgent((e) => {
            this.previouslyUsedAgents.add(agentAndCommandToKey(e.agent, e.slashCommand?.name));
        }));
        this._register(this.chatAgentService.onDidChangeAgents(() => this.triggerInputEditorDecorationsUpdate()));
        this._register(this.promptsService.onDidChangeSlashCommands(() => this.triggerInputEditorDecorationsUpdate()));
        this._register(autorun(reader => {
            // Watch for changes to the current mode and its properties
            const currentMode = this.widget.input.currentModeObs.read(reader);
            if (currentMode) {
                // Also watch the mode's description to react to any changes
                currentMode.description.read(reader);
            }
            // Trigger decoration update when mode or its properties change
            this.triggerInputEditorDecorationsUpdate();
        }));
        this.registerViewModelListeners();
    }
    registerViewModelListeners() {
        this.viewModelDisposables.value = this.widget.viewModel?.onDidChange(e => {
            if (e?.kind === 'changePlaceholder' || e?.kind === 'initialize') {
                this.triggerInputEditorDecorationsUpdate();
            }
        });
    }
    registeredDecorationTypes() {
        this._register(this.codeEditorService.registerDecorationType(decorationDescription, placeholderDecorationType, {}));
        this._register(this.codeEditorService.registerDecorationType(decorationDescription, slashCommandTextDecorationType, {
            color: themeColorFromId(chatSlashCommandForeground),
            backgroundColor: themeColorFromId(chatSlashCommandBackground),
            borderRadius: '3px'
        }));
        this._register(this.codeEditorService.registerDecorationType(decorationDescription, variableTextDecorationType, {
            color: themeColorFromId(chatSlashCommandForeground),
            backgroundColor: themeColorFromId(chatSlashCommandBackground),
            borderRadius: '3px'
        }));
        this._register(this.codeEditorService.registerDecorationType(decorationDescription, dynamicVariableDecorationType, {
            color: themeColorFromId(chatSlashCommandForeground),
            backgroundColor: themeColorFromId(chatSlashCommandBackground),
            borderRadius: '3px',
            rangeBehavior: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
        }));
    }
    getPlaceholderColor() {
        const theme = this.themeService.getColorTheme();
        const transparentForeground = theme.getColor(inputPlaceholderForeground);
        return transparentForeground?.toString();
    }
    triggerInputEditorDecorationsUpdate() {
        // update placeholder decorations immediately, in sync
        this.updateInputPlaceholderDecoration();
        // with a delay, update the rest of the decorations
        this.updateThrottle.trigger(token => this.updateAsyncInputEditorDecorations(token));
    }
    updateInputPlaceholderDecoration() {
        const inputValue = this.widget.inputEditor.getValue();
        const viewModel = this.widget.viewModel;
        if (!viewModel) {
            this.updateAriaPlaceholder(undefined);
            return;
        }
        if (!inputValue) {
            const mode = this.widget.input.currentModeObs.get();
            const placeholder = mode.argumentHint?.get() ?? mode.description.get() ?? '';
            const displayPlaceholder = viewModel.inputPlaceholder || placeholder;
            const decoration = [
                {
                    range: {
                        startLineNumber: 1,
                        endLineNumber: 1,
                        startColumn: 1,
                        endColumn: 1000
                    },
                    renderOptions: {
                        after: {
                            contentText: displayPlaceholder,
                            color: this.getPlaceholderColor()
                        }
                    }
                }
            ];
            this.updateAriaPlaceholder(displayPlaceholder || undefined);
            this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, decoration);
            return;
        }
        this.updateAriaPlaceholder(undefined);
        const parsedRequest = this.widget.parsedInput.parts;
        let placeholderDecoration;
        const agentPart = parsedRequest.find((p) => p instanceof ChatRequestAgentPart);
        const agentSubcommandPart = parsedRequest.find((p) => p instanceof ChatRequestAgentSubcommandPart);
        const onlyAgentAndWhitespace = agentPart && parsedRequest.every(p => p instanceof ChatRequestTextPart && !p.text.trim().length || p instanceof ChatRequestAgentPart);
        if (onlyAgentAndWhitespace) {
            // Agent reference with no other text - show the placeholder
            const isFollowupSlashCommand = this.previouslyUsedAgents.has(agentAndCommandToKey(agentPart.agent, undefined));
            const shouldRenderFollowupPlaceholder = isFollowupSlashCommand && agentPart.agent.metadata.followupPlaceholder;
            if (agentPart.agent.description && exactlyOneSpaceAfterPart(parsedRequest, agentPart)) {
                placeholderDecoration = [{
                        range: getRangeForPlaceholder(agentPart),
                        renderOptions: {
                            after: {
                                contentText: shouldRenderFollowupPlaceholder ? agentPart.agent.metadata.followupPlaceholder : agentPart.agent.description,
                                color: this.getPlaceholderColor(),
                            }
                        }
                    }];
            }
        }
        const onlyAgentAndAgentCommandAndWhitespace = agentPart && agentSubcommandPart && parsedRequest.every(p => p instanceof ChatRequestTextPart && !p.text.trim().length || p instanceof ChatRequestAgentPart || p instanceof ChatRequestAgentSubcommandPart);
        if (onlyAgentAndAgentCommandAndWhitespace) {
            // Agent reference and subcommand with no other text - show the placeholder
            const isFollowupSlashCommand = this.previouslyUsedAgents.has(agentAndCommandToKey(agentPart.agent, agentSubcommandPart.command.name));
            const shouldRenderFollowupPlaceholder = isFollowupSlashCommand && agentSubcommandPart.command.followupPlaceholder;
            if (agentSubcommandPart?.command.description && exactlyOneSpaceAfterPart(parsedRequest, agentSubcommandPart)) {
                placeholderDecoration = [{
                        range: getRangeForPlaceholder(agentSubcommandPart),
                        renderOptions: {
                            after: {
                                contentText: shouldRenderFollowupPlaceholder ? agentSubcommandPart.command.followupPlaceholder : agentSubcommandPart.command.description,
                                color: this.getPlaceholderColor(),
                            }
                        }
                    }];
            }
        }
        const onlyAgentCommandAndWhitespace = agentSubcommandPart && parsedRequest.every(p => p instanceof ChatRequestTextPart && !p.text.trim().length || p instanceof ChatRequestAgentSubcommandPart);
        if (onlyAgentCommandAndWhitespace) {
            // Agent subcommand with no other text - show the placeholder
            if (agentSubcommandPart?.command.description && exactlyOneSpaceAfterPart(parsedRequest, agentSubcommandPart)) {
                placeholderDecoration = [{
                        range: getRangeForPlaceholder(agentSubcommandPart),
                        renderOptions: {
                            after: {
                                contentText: agentSubcommandPart.command.description,
                                color: this.getPlaceholderColor(),
                            }
                        }
                    }];
            }
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, placeholderDecoration ?? []);
    }
    async updateAsyncInputEditorDecorations(token) {
        const parsedRequest = this.widget.parsedInput.parts;
        const agentPart = parsedRequest.find((p) => p instanceof ChatRequestAgentPart);
        const agentSubcommandPart = parsedRequest.find((p) => p instanceof ChatRequestAgentSubcommandPart);
        const slashCommandPart = parsedRequest.find((p) => p instanceof ChatRequestSlashCommandPart);
        const slashPromptPart = parsedRequest.find((p) => p instanceof ChatRequestSlashPromptPart);
        // first, fetch all async context
        const promptSlashCommand = slashPromptPart ? await this.promptsService.resolvePromptSlashCommand(slashPromptPart.name, token) : undefined;
        if (token.isCancellationRequested) {
            // a new update came in while we were waiting
            return;
        }
        if (slashPromptPart && promptSlashCommand) {
            const onlyPromptCommandAndWhitespace = slashPromptPart && parsedRequest.every(isWhitespaceOrPromptPart);
            if (onlyPromptCommandAndWhitespace && exactlyOneSpaceAfterPart(parsedRequest, slashPromptPart) && promptSlashCommand) {
                const description = promptSlashCommand.argumentHint ?? promptSlashCommand.description;
                if (description) {
                    this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, [{
                            range: getRangeForPlaceholder(slashPromptPart),
                            renderOptions: {
                                after: {
                                    contentText: description,
                                    color: this.getPlaceholderColor(),
                                }
                            }
                        }]);
                }
            }
        }
        const textDecorations = [];
        if (agentPart) {
            textDecorations.push({ range: agentPart.editorRange });
        }
        if (agentSubcommandPart) {
            textDecorations.push({ range: agentSubcommandPart.editorRange, hoverMessage: new MarkdownString(agentSubcommandPart.command.description) });
        }
        if (slashCommandPart) {
            textDecorations.push({ range: slashCommandPart.editorRange });
        }
        if (slashPromptPart && promptSlashCommand) {
            textDecorations.push({ range: slashPromptPart.editorRange });
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, slashCommandTextDecorationType, textDecorations);
        const varDecorations = [];
        const toolParts = parsedRequest.filter((p) => p instanceof ChatRequestToolPart || p instanceof ChatRequestToolSetPart);
        for (const tool of toolParts) {
            varDecorations.push({ range: tool.editorRange });
        }
        const dynamicVariableParts = parsedRequest.filter((p) => p instanceof ChatRequestDynamicVariablePart);
        const isEditingPreviousRequest = !!this.widget.viewModel?.editing;
        if (isEditingPreviousRequest) {
            for (const variable of dynamicVariableParts) {
                varDecorations.push({ range: variable.editorRange, hoverMessage: URI.isUri(variable.data) ? new MarkdownString(this.labelService.getUriLabel(variable.data, { relative: true })) : undefined });
            }
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, variableTextDecorationType, varDecorations);
    }
    updateAriaPlaceholder(value) {
        const nativeEditContext = NativeEditContextRegistry.get(this.widget.inputEditor.getId());
        if (nativeEditContext) {
            const domNode = nativeEditContext.domNode.domNode;
            if (value && value.trim().length) {
                domNode.setAttribute('aria-placeholder', value);
            }
            else {
                domNode.removeAttribute('aria-placeholder');
            }
        }
        else {
            const textAreaEditContext = TextAreaEditContextRegistry.get(this.widget.inputEditor.getId());
            if (textAreaEditContext) {
                const textArea = textAreaEditContext.textArea.domNode;
                if (value && value.trim().length) {
                    textArea.setAttribute('aria-placeholder', value);
                }
                else {
                    textArea.removeAttribute('aria-placeholder');
                }
            }
        }
    }
};
InputEditorDecorations = InputEditorDecorations_1 = __decorate([
    __param(1, ICodeEditorService),
    __param(2, IThemeService),
    __param(3, IChatAgentService),
    __param(4, ILabelService),
    __param(5, IPromptsService)
], InputEditorDecorations);
class InputEditorSlashCommandMode extends Disposable {
    constructor(widget) {
        super();
        this.widget = widget;
        this.id = 'InputEditorSlashCommandMode';
        this._register(this.widget.onDidChangeAgent(e => {
            if (e.slashCommand && e.slashCommand.isSticky || !e.slashCommand && e.agent.metadata.isSticky) {
                this.repopulateAgentCommand(e.agent, e.slashCommand);
            }
        }));
        this._register(this.widget.onDidSubmitAgent(e => {
            this.repopulateAgentCommand(e.agent, e.slashCommand);
        }));
    }
    async repopulateAgentCommand(agent, slashCommand) {
        // Make sure we don't repopulate if the user already has something in the input
        if (this.widget.inputEditor.getValue().trim()) {
            return;
        }
        let value;
        if (slashCommand && slashCommand.isSticky) {
            value = `${chatAgentLeader}${agent.name} ${chatSubcommandLeader}${slashCommand.name} `;
        }
        else if (agent.metadata.isSticky) {
            value = `${chatAgentLeader}${agent.name} `;
        }
        if (value) {
            this.widget.inputEditor.setValue(value);
            this.widget.inputEditor.setPosition({ lineNumber: 1, column: value.length + 1 });
        }
    }
}
ChatWidget.CONTRIBS.push(InputEditorDecorations, InputEditorSlashCommandMode);
let ChatTokenDeleter = class ChatTokenDeleter extends Disposable {
    constructor(widget, instantiationService) {
        super();
        this.widget = widget;
        this.instantiationService = instantiationService;
        this.id = 'chatTokenDeleter';
        const parser = this.instantiationService.createInstance(ChatRequestParser);
        const inputValue = this.widget.inputEditor.getValue();
        let previousInputValue;
        let previousSelectedAgent;
        // A simple heuristic to delete the previous token when the user presses backspace.
        // The sophisticated way to do this would be to have a parse tree that can be updated incrementally.
        this._register(this.widget.inputEditor.onDidChangeModelContent(e => {
            if (!previousInputValue) {
                previousInputValue = inputValue;
                previousSelectedAgent = this.widget.lastSelectedAgent;
            }
            // Don't try to handle multi-cursor edits right now
            const change = e.changes[0];
            // If this was a simple delete, try to find out whether it was inside a token
            if (!change.text && this.widget.viewModel) {
                const previousParsedValue = parser.parseChatRequest(this.widget.viewModel.sessionResource, previousInputValue, widget.location, { selectedAgent: previousSelectedAgent, mode: this.widget.input.currentModeKind });
                // For dynamic variables, this has to happen in ChatDynamicVariableModel with the other bookkeeping
                const deletableTokens = previousParsedValue.parts.filter(p => p instanceof ChatRequestAgentPart || p instanceof ChatRequestAgentSubcommandPart || p instanceof ChatRequestSlashCommandPart || p instanceof ChatRequestSlashPromptPart || p instanceof ChatRequestToolPart);
                deletableTokens.forEach(token => {
                    const deletedRangeOfToken = Range.intersectRanges(token.editorRange, change.range);
                    // Part of this token was deleted, or the space after it was deleted, and the deletion range doesn't go off the front of the token, for simpler math
                    if (deletedRangeOfToken && Range.compareRangesUsingStarts(token.editorRange, change.range) < 0) {
                        // Range.intersectRanges returns an empty range when the deletion happens *exactly* at a boundary.
                        // In that case, only treat this as a token-delete when the deleted character was a space.
                        if (previousInputValue && Range.isEmpty(deletedRangeOfToken)) {
                            const deletedText = previousInputValue.substring(change.rangeOffset, change.rangeOffset + change.rangeLength);
                            if (deletedText !== ' ') {
                                return;
                            }
                        }
                        // Assume single line tokens
                        const length = deletedRangeOfToken.endColumn - deletedRangeOfToken.startColumn;
                        const rangeToDelete = new Range(token.editorRange.startLineNumber, token.editorRange.startColumn, token.editorRange.endLineNumber, token.editorRange.endColumn - length);
                        this.widget.inputEditor.executeEdits(this.id, [{
                                range: rangeToDelete,
                                text: '',
                            }]);
                        this.widget.refreshParsedInput();
                    }
                });
            }
            previousInputValue = this.widget.inputEditor.getValue();
            previousSelectedAgent = this.widget.lastSelectedAgent;
        }));
    }
};
ChatTokenDeleter = __decorate([
    __param(1, IInstantiationService)
], ChatTokenDeleter);
ChatWidget.CONTRIBS.push(ChatTokenDeleter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0RWRpdG9yQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW5wdXRFZGl0b3JDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBR25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFxQyxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSw4QkFBOEIsRUFBRSw4QkFBOEIsRUFBRSwyQkFBMkIsRUFBRSwwQkFBMEIsRUFB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
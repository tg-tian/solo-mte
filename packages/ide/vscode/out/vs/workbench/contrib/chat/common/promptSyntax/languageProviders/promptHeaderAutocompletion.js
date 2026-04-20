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
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { IChatModeService } from '../../chatModes.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { PromptHeaderAttributes } from '../promptFileParser.js';
import { getValidAttributeNames, isGithubTarget, knownGithubCopilotTools } from './promptValidator.js';
import { localize } from '../../../../../../nls.js';
let PromptHeaderAutocompletion = class PromptHeaderAutocompletion {
    constructor(promptsService, languageModelsService, languageModelToolsService, chatModeService) {
        this.promptsService = promptsService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHeaderAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':'];
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any completions
            return undefined;
        }
        if (/^\s*$/.test(model.getValue())) {
            return {
                suggestions: [{
                        label: localize('promptHeaderAutocompletion.addHeader', "Add Prompt Header"),
                        kind: 28 /* CompletionItemKind.Snippet */,
                        insertText: [
                            `---`,
                            `description: $1`,
                            `---`,
                            `$0`
                        ].join('\n'),
                        insertTextRules: 4 /* CompletionItemInsertTextRule.InsertAsSnippet */,
                        range: model.getFullModelRange(),
                    }]
            };
        }
        const parsedAST = this.promptsService.getParsedPromptFile(model);
        const header = parsedAST.header;
        if (!header) {
            return undefined;
        }
        const headerRange = parsedAST.header.range;
        if (position.lineNumber < headerRange.startLineNumber || position.lineNumber >= headerRange.endLineNumber) {
            // if the position is not inside the header, we don't provide any completions
            return undefined;
        }
        const lineText = model.getLineContent(position.lineNumber);
        const colonIndex = lineText.indexOf(':');
        const colonPosition = colonIndex !== -1 ? new Position(position.lineNumber, colonIndex + 1) : undefined;
        if (!colonPosition || position.isBeforeOrEqual(colonPosition)) {
            return this.provideAttributeNameCompletions(model, position, header, colonPosition, promptType);
        }
        else if (colonPosition && colonPosition.isBefore(position)) {
            return this.provideValueCompletions(model, position, header, colonPosition, promptType);
        }
        return undefined;
    }
    async provideAttributeNameCompletions(model, position, header, colonPosition, promptType) {
        const suggestions = [];
        const isGitHubTarget = isGithubTarget(promptType, header.target);
        const attributesToPropose = new Set(getValidAttributeNames(promptType, false, isGitHubTarget));
        for (const attr of header.attributes) {
            attributesToPropose.delete(attr.key);
        }
        const getInsertText = (key) => {
            if (colonPosition) {
                return key;
            }
            const valueSuggestions = this.getValueSuggestions(promptType, key);
            if (valueSuggestions.length > 0) {
                return `${key}: \${0:${valueSuggestions[0]}}`;
            }
            else {
                return `${key}: \$0`;
            }
        };
        for (const attribute of attributesToPropose) {
            const item = {
                label: attribute,
                kind: 9 /* CompletionItemKind.Property */,
                insertText: getInsertText(attribute),
                insertTextRules: 4 /* CompletionItemInsertTextRule.InsertAsSnippet */,
                range: new Range(position.lineNumber, 1, position.lineNumber, !colonPosition ? model.getLineMaxColumn(position.lineNumber) : colonPosition.column),
            };
            suggestions.push(item);
        }
        return { suggestions };
    }
    async provideValueCompletions(model, position, header, colonPosition, promptType) {
        const suggestions = [];
        const lineContent = model.getLineContent(position.lineNumber);
        const attribute = lineContent.substring(0, colonPosition.column - 1).trim();
        const isGitHubTarget = isGithubTarget(promptType, header.target);
        if (!getValidAttributeNames(promptType, true, isGitHubTarget).includes(attribute)) {
            return undefined;
        }
        if (promptType === PromptsType.prompt || promptType === PromptsType.agent) {
            // if the position is inside the tools metadata, we provide tool name completions
            const result = this.provideToolCompletions(model, position, header, isGitHubTarget);
            if (result) {
                return result;
            }
        }
        const bracketIndex = lineContent.indexOf('[');
        if (bracketIndex !== -1 && bracketIndex <= position.column - 1) {
            // if the value is already inside a bracket, we don't provide value completions
            return undefined;
        }
        const whilespaceAfterColon = (lineContent.substring(colonPosition.column).match(/^\s*/)?.[0].length) ?? 0;
        const values = this.getValueSuggestions(promptType, attribute);
        for (const value of values) {
            const item = {
                label: value,
                kind: 13 /* CompletionItemKind.Value */,
                insertText: whilespaceAfterColon === 0 ? ` ${value}` : value,
                range: new Range(position.lineNumber, colonPosition.column + whilespaceAfterColon + 1, position.lineNumber, model.getLineMaxColumn(position.lineNumber)),
            };
            suggestions.push(item);
        }
        if (attribute === PromptHeaderAttributes.handOffs && (promptType === PromptsType.agent)) {
            const value = [
                '',
                '  - label: Start Implementation',
                '    agent: agent',
                '    prompt: Implement the plan',
                '    send: true'
            ].join('\n');
            const item = {
                label: localize('promptHeaderAutocompletion.handoffsExample', "Handoff Example"),
                kind: 13 /* CompletionItemKind.Value */,
                insertText: whilespaceAfterColon === 0 ? ` ${value}` : value,
                range: new Range(position.lineNumber, colonPosition.column + whilespaceAfterColon + 1, position.lineNumber, model.getLineMaxColumn(position.lineNumber)),
            };
            suggestions.push(item);
        }
        return { suggestions };
    }
    getValueSuggestions(promptType, attribute) {
        switch (attribute) {
            case PromptHeaderAttributes.applyTo:
                if (promptType === PromptsType.instructions) {
                    return [`'**'`, `'**/*.ts, **/*.js'`, `'**/*.php'`, `'**/*.py'`];
                }
                break;
            case PromptHeaderAttributes.agent:
            case PromptHeaderAttributes.mode:
                if (promptType === PromptsType.prompt) {
                    // Get all available agents (builtin + custom)
                    const agents = this.chatModeService.getModes();
                    const suggestions = [];
                    for (const agent of Iterable.concat(agents.builtin, agents.custom)) {
                        suggestions.push(agent.name.get());
                    }
                    return suggestions;
                }
                break;
            case PromptHeaderAttributes.target:
                if (promptType === PromptsType.agent) {
                    return ['vscode', 'github-copilot'];
                }
                break;
            case PromptHeaderAttributes.tools:
                if (promptType === PromptsType.prompt || promptType === PromptsType.agent) {
                    return ['[]', `['search', 'edit', 'fetch']`];
                }
                break;
            case PromptHeaderAttributes.model:
                if (promptType === PromptsType.prompt || promptType === PromptsType.agent) {
                    return this.getModelNames(promptType === PromptsType.agent);
                }
                break;
            case PromptHeaderAttributes.infer:
                if (promptType === PromptsType.agent) {
                    return ['true', 'false'];
                }
                break;
        }
        return [];
    }
    getModelNames(agentModeOnly) {
        const result = [];
        for (const model of this.languageModelsService.getLanguageModelIds()) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false) {
                if (!agentModeOnly || ILanguageModelChatMetadata.suitableForAgentMode(metadata)) {
                    result.push(ILanguageModelChatMetadata.asQualifiedName(metadata));
                }
            }
        }
        return result;
    }
    provideToolCompletions(model, position, header, isGitHubTarget) {
        const toolsAttr = header.getAttribute(PromptHeaderAttributes.tools);
        if (!toolsAttr || toolsAttr.value.type !== 'array' || !toolsAttr.range.containsPosition(position)) {
            return undefined;
        }
        const getSuggestions = (toolRange) => {
            const suggestions = [];
            const toolNames = isGitHubTarget ? knownGithubCopilotTools : this.languageModelToolsService.getFullReferenceNames();
            for (const toolName of toolNames) {
                let insertText;
                if (!toolRange.isEmpty()) {
                    const firstChar = model.getValueInRange(toolRange).charCodeAt(0);
                    insertText = firstChar === 39 /* CharCode.SingleQuote */ ? `'${toolName}'` : firstChar === 34 /* CharCode.DoubleQuote */ ? `"${toolName}"` : toolName;
                }
                else {
                    insertText = `'${toolName}'`;
                }
                suggestions.push({
                    label: toolName,
                    kind: 13 /* CompletionItemKind.Value */,
                    filterText: insertText,
                    insertText: insertText,
                    range: toolRange,
                });
            }
            return { suggestions };
        };
        for (const toolNameNode of toolsAttr.value.items) {
            if (toolNameNode.range.containsPosition(position)) {
                // if the position is inside a tool range, we provide tool name completions
                return getSuggestions(toolNameNode.range);
            }
        }
        const prefix = model.getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, position.column));
        if (prefix.match(/[,[]\s*$/)) {
            // if the position is after a comma or bracket
            return getSuggestions(new Range(position.lineNumber, position.column, position.lineNumber, position.column));
        }
        return undefined;
    }
};
PromptHeaderAutocompletion = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelsService),
    __param(2, ILanguageModelToolsService),
    __param(3, IChatModeService)
], PromptHeaderAutocompletion);
export { PromptHeaderAutocompletion };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVyQXV0b2NvbXBsZXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb21wdEhlYWRlckF1dG9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHdEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDdEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckUsT0FBTyxFQUFnQixzQkFBc0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzlFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxjQUFjLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFN0MsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMEI7SUFXdEMsWUFDa0IsY0FBZ0QsRUFDekMscUJBQThELEVBQzFELHlCQUFzRSxFQUNoRixlQUFrRDtRQUhsQyxtQkFBYyxHQUFkLGNB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
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
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService, ToolSet } from '../../languageModelToolsService.js';
import { IChatModeService, isBuiltinChatMode } from '../../chatModes.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
import { PromptHeaderAttributes } from '../promptFileParser.js';
import { isGithubTarget } from './promptValidator.js';
let PromptHoverProvider = class PromptHoverProvider {
    constructor(promptsService, languageModelToolsService, languageModelsService, chatModeService) {
        this.promptsService = promptsService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        this.chatModeService = chatModeService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHoverProvider';
    }
    createHover(contents, range) {
        return {
            contents: [new MarkdownString(contents)],
            range
        };
    }
    async provideHover(model, position, token, _context) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any hovers
            return undefined;
        }
        const promptAST = this.promptsService.getParsedPromptFile(model);
        if (promptAST.header?.range.containsPosition(position)) {
            return this.provideHeaderHover(position, promptType, promptAST.header);
        }
        if (promptAST.body?.range.containsPosition(position)) {
            return this.provideBodyHover(position, promptAST.body);
        }
        return undefined;
    }
    async provideBodyHover(position, body) {
        for (const ref of body.variableReferences) {
            if (ref.range.containsPosition(position)) {
                const toolName = ref.name;
                return this.getToolHoverByName(toolName, ref.range);
            }
        }
        return undefined;
    }
    async provideHeaderHover(position, promptType, header) {
        if (promptType === PromptsType.instructions) {
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize('promptHeader.instructions.name', 'The name of the instruction file as shown in the UI. If not set, the name is derived from the file name.'), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize('promptHeader.instructions.description', 'The description of the instruction file. It can be used to provide additional context or information about the instructions and is passed to the language model as part of the prompt.'), attribute.range);
                        case PromptHeaderAttributes.applyTo:
                            return this.createHover(localize('promptHeader.instructions.applyToRange', 'One or more glob pattern (separated by comma) that describe for which files the instructions apply to. Based on these patterns, the file is automatically included in the prompt, when the context contains a file that matches one or more of these patterns. Use `**` when you want this file to always be added.\nExample: `**/*.ts`, `**/*.js`, `client/**`'), attribute.range);
                    }
                }
            }
        }
        else if (promptType === PromptsType.agent) {
            const isGitHubTarget = isGithubTarget(promptType, header.target);
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize('promptHeader.agent.name', 'The name of the agent as shown in the UI.'), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize('promptHeader.agent.description', 'The description of the custom agent, what it does and when to use it.'), attribute.range);
                        case PromptHeaderAttributes.argumentHint:
                            return this.createHover(localize('promptHeader.agent.argumentHint', 'The argument-hint describes what inputs the custom agent expects or supports.'), attribute.range);
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, attribute.range, localize('promptHeader.agent.model', 'Specify the model that runs this custom agent.'), isGitHubTarget);
                        case PromptHeaderAttributes.tools:
                            return this.getToolHover(attribute, position, localize('promptHeader.agent.tools', 'The set of tools that the custom agent has access to.'));
                        case PromptHeaderAttributes.handOffs:
                            return this.getHandsOffHover(attribute, position, isGitHubTarget);
                        case PromptHeaderAttributes.target:
                            return this.createHover(localize('promptHeader.agent.target', 'The target to which the header attributes like tools apply to. Possible values are `github-copilot` and `vscode`.'), attribute.range);
                        case PromptHeaderAttributes.infer:
                            return this.createHover(localize('promptHeader.agent.infer', 'Whether the agent can be used as a subagent.'), attribute.range);
                    }
                }
            }
        }
        else {
            for (const attribute of header.attributes) {
                if (attribute.range.containsPosition(position)) {
                    switch (attribute.key) {
                        case PromptHeaderAttributes.name:
                            return this.createHover(localize('promptHeader.prompt.name', 'The name of the prompt. This is also the name of the slash command that will run this prompt.'), attribute.range);
                        case PromptHeaderAttributes.description:
                            return this.createHover(localize('promptHeader.prompt.description', 'The description of the reusable prompt, what it does and when to use it.'), attribute.range);
                        case PromptHeaderAttributes.argumentHint:
                            return this.createHover(localize('promptHeader.prompt.argumentHint', 'The argument-hint describes what inputs the prompt expects or supports.'), attribute.range);
                        case PromptHeaderAttributes.model:
                            return this.getModelHover(attribute, attribute.range, localize('promptHeader.prompt.model', 'The model to use in this prompt.'), false);
                        case PromptHeaderAttributes.tools:
                            return this.getToolHover(attribute, position, localize('promptHeader.prompt.tools', 'The tools to use in this prompt.'));
                        case PromptHeaderAttributes.agent:
                        case PromptHeaderAttributes.mode:
                            return this.getAgentHover(attribute, position);
                    }
                }
            }
        }
        return undefined;
    }
    getToolHover(node, position, baseMessage) {
        if (node.value.type === 'array') {
            for (const toolName of node.value.items) {
                if (toolName.type === 'string' && toolName.range.containsPosition(position)) {
                    const description = this.getToolHoverByName(toolName.value, toolName.range);
                    if (description) {
                        return description;
                    }
                }
            }
        }
        return this.createHover(baseMessage, node.range);
    }
    getToolHoverByName(toolName, range) {
        const tool = this.languageModelToolsService.getToolByFullReferenceName(toolName);
        if (tool !== undefined) {
            if (tool instanceof ToolSet) {
                return this.getToolsetHover(tool, range);
            }
            else {
                return this.createHover(tool.userDescription ?? tool.modelDescription, range);
            }
        }
        return undefined;
    }
    getToolsetHover(toolSet, range) {
        const lines = [];
        lines.push(localize('toolSetName', 'ToolSet: {0}\n\n', toolSet.referenceName));
        if (toolSet.description) {
            lines.push(toolSet.description);
        }
        for (const tool of toolSet.getTools()) {
            lines.push(`- ${tool.toolReferenceName ?? tool.displayName}`);
        }
        return this.createHover(lines.join('\n'), range);
    }
    getModelHover(node, range, baseMessage, isGitHubTarget) {
        if (isGitHubTarget) {
            return this.createHover(baseMessage + '\n\n' + localize('promptHeader.agent.model.githubCopilot', 'Note: This attribute is not used when target is github-copilot.'), range);
        }
        if (node.value.type === 'string') {
            for (const id of this.languageModelsService.getLanguageModelIds()) {
                const meta = this.languageModelsService.lookupLanguageModel(id);
                if (meta && ILanguageModelChatMetadata.matchesQualifiedName(node.value.value, meta)) {
                    const lines = [];
                    lines.push(baseMessage + '\n');
                    lines.push(localize('modelName', '- Name: {0}', meta.name));
                    lines.push(localize('modelFamily', '- Family: {0}', meta.family));
                    lines.push(localize('modelVendor', '- Vendor: {0}', meta.vendor));
                    if (meta.tooltip) {
                        lines.push('', '', meta.tooltip);
                    }
                    return this.createHover(lines.join('\n'), range);
                }
            }
        }
        return this.createHover(baseMessage, range);
    }
    getAgentHover(agentAttribute, position) {
        const lines = [];
        const value = agentAttribute.value;
        if (value.type === 'string' && value.range.containsPosition(position)) {
            const agent = this.chatModeService.findModeByName(value.value);
            if (agent) {
                const description = agent.description.get() || (isBuiltinChatMode(agent) ? localize('promptHeader.prompt.agent.builtInDesc', 'Built-in agent') : localize('promptHeader.prompt.agent.customDesc', 'Custom agent'));
                lines.push(`\`${agent.name.get()}\`: ${description}`);
            }
        }
        else {
            const agents = this.chatModeService.getModes();
            lines.push(localize('promptHeader.prompt.agent.description', 'The agent to use when running this prompt.'));
            lines.push('');
            // Built-in agents
            lines.push(localize('promptHeader.prompt.agent.builtin', '**Built-in agents:**'));
            for (const agent of agents.builtin) {
                lines.push(`- \`${agent.name.get()}\`: ${agent.description.get() || agent.label.get()}`);
            }
            // Custom agents
            if (agents.custom.length > 0) {
                lines.push('');
                lines.push(localize('promptHeader.prompt.agent.custom', '**Custom agents:**'));
                for (const agent of agents.custom) {
                    const description = agent.description.get();
                    lines.push(`- \`${agent.name.get()}\`: ${description || localize('promptHeader.prompt.agent.customDesc', 'Custom agent')}`);
                }
            }
        }
        return this.createHover(lines.join('\n'), agentAttribute.range);
    }
    getHandsOffHover(attribute, position, isGitHubTarget) {
        const handoffsBaseMessage = localize('promptHeader.agent.handoffs', 'Possible handoff actions when the agent has completed its task.');
        if (isGitHubTarget) {
            return this.createHover(handoffsBaseMessage + '\n\n' + localize('promptHeader.agent.handoffs.githubCopilot', 'Note: This attribute is not used when target is github-copilot.'), attribute.range);
        }
        return this.createHover(handoffsBaseMessage, attribute.range);
    }
};
PromptHoverProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageModelToolsService),
    __param(2, ILanguageModelsService),
    __param(3, IChatModeService)
], PromptHoverProvider);
export { PromptHoverProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SG92ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9wcm9tcHRIb3ZlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBSzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQThDLHNCQUFzQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRS9DLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBTS9CLFlBQ2tCLGNBQWdELEVBQ3JDLHlCQUFzRSxFQUMxRSxxQkFBOEQsRUFDcEUsZUFBa0Q7UUFIbEMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ3BCLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDekQsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNuRCxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFUckU7O1dBRUc7UUFD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
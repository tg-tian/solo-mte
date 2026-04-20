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
import { isEmptyPattern, parse, splitGlobAware } from '../../../../../../base/common/glob.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { IChatModeService } from '../../chatModes.js';
import { ChatModeKind } from '../../constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService, SpecedToolAliases } from '../../languageModelToolsService.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { GithubPromptHeaderAttributes, PromptHeaderAttributes, Target } from '../promptFileParser.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IPromptsService } from '../service/promptsService.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { AGENTS_SOURCE_FOLDER, LEGACY_MODE_FILE_EXTENSION } from '../config/promptFileLocations.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
export const MARKERS_OWNER_ID = 'prompts-diagnostics-provider';
let PromptValidator = class PromptValidator {
    constructor(languageModelsService, languageModelToolsService, chatModeService, fileService, labelService, promptsService) {
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.promptsService = promptsService;
    }
    async validate(promptAST, promptType, report) {
        promptAST.header?.errors.forEach(error => report(toMarker(error.message, error.range, MarkerSeverity.Error)));
        this.validateHeader(promptAST, promptType, report);
        await this.validateBody(promptAST, promptType, report);
        await this.validateFileName(promptAST, promptType, report);
    }
    async validateFileName(promptAST, promptType, report) {
        if (promptType === PromptsType.agent && promptAST.uri.path.endsWith(LEGACY_MODE_FILE_EXTENSION)) {
            const location = this.promptsService.getAgentFileURIFromModeFile(promptAST.uri);
            if (location && await this.fileService.canCreateFile(location)) {
                report(toMarker(localize('promptValidator.chatModesRenamedToAgents', "Chat modes have been renamed to agents. Please move this file to {0}", location.toString()), new Range(1, 1, 1, 4), MarkerSeverity.Warning));
            }
            else {
                report(toMarker(localize('promptValidator.chatModesRenamedToAgentsNoMove', "Chat modes have been renamed to agents. Please move the file to {0}", AGENTS_SOURCE_FOLDER), new Range(1, 1, 1, 4), MarkerSeverity.Warning));
            }
        }
    }
    async validateBody(promptAST, promptType, report) {
        const body = promptAST.body;
        if (!body) {
            return;
        }
        // Validate file references
        const fileReferenceChecks = [];
        for (const ref of body.fileReferences) {
            const resolved = body.resolveFilePath(ref.content);
            if (!resolved) {
                report(toMarker(localize('promptValidator.invalidFileReference', "Invalid file reference '{0}'.", ref.content), ref.range, MarkerSeverity.Warning));
                continue;
            }
            if (promptAST.uri.scheme === resolved.scheme) {
                // only validate if the link is in the file system of the prompt file
                fileReferenceChecks.push((async () => {
                    try {
                        const exists = await this.fileService.exists(resolved);
                        if (exists) {
                            return;
                        }
                    }
                    catch {
                    }
                    const loc = this.labelService.getUriLabel(resolved);
                    report(toMarker(localize('promptValidator.fileNotFound', "File '{0}' not found at '{1}'.", ref.content, loc), ref.range, MarkerSeverity.Warning));
                })());
            }
        }
        const isGitHubTarget = isGithubTarget(promptType, promptAST.header?.target);
        // Validate variable references (tool or toolset names)
        if (body.variableReferences.length && !isGitHubTarget) {
            const headerTools = promptAST.header?.tools;
            const headerTarget = promptAST.header?.target;
            const headerToolsMap = headerTools ? this.languageModelToolsService.toToolAndToolSetEnablementMap(headerTools, headerTarget) : undefined;
            const available = new Set(this.languageModelToolsService.getFullReferenceNames());
            const deprecatedNames = this.languageModelToolsService.getDeprecatedFullReferenceNames();
            for (const variable of body.variableReferences) {
                if (!available.has(variable.name)) {
                    if (deprecatedNames.has(variable.name)) {
                        const currentNames = deprecatedNames.get(variable.name);
                        if (currentNames && currentNames.size > 0) {
                            if (currentNames.size === 1) {
                                const newName = Array.from(currentNames)[0];
                                report(toMarker(localize('promptValidator.deprecatedVariableReference', "Tool or toolset '{0}' has been renamed, use '{1}' instead.", variable.name, newName), variable.range, MarkerSeverity.Info));
                            }
                            else {
                                const newNames = Array.from(currentNames).sort((a, b) => a.localeCompare(b)).join(', ');
                                report(toMarker(localize('promptValidator.deprecatedVariableReferenceMultipleNames', "Tool or toolset '{0}' has been renamed, use the following tools instead: {1}", variable.name, newNames), variable.range, MarkerSeverity.Info));
                            }
                        }
                    }
                    else {
                        report(toMarker(localize('promptValidator.unknownVariableReference', "Unknown tool or toolset '{0}'.", variable.name), variable.range, MarkerSeverity.Warning));
                    }
                }
                else if (headerToolsMap) {
                    const tool = this.languageModelToolsService.getToolByFullReferenceName(variable.name);
                    if (tool && headerToolsMap.get(tool) === false) {
                        report(toMarker(localize('promptValidator.disabledTool', "Tool or toolset '{0}' also needs to be enabled in the header.", variable.name), variable.range, MarkerSeverity.Warning));
                    }
                }
            }
        }
        await Promise.all(fileReferenceChecks);
    }
    validateHeader(promptAST, promptType, report) {
        const header = promptAST.header;
        if (!header) {
            return;
        }
        const attributes = header.attributes;
        const isGitHubTarget = isGithubTarget(promptType, header.target);
        this.checkForInvalidArguments(attributes, promptType, isGitHubTarget, report);
        this.validateName(attributes, isGitHubTarget, report);
        this.validateDescription(attributes, report);
        this.validateArgumentHint(attributes, report);
        switch (promptType) {
            case PromptsType.prompt: {
                const agent = this.validateAgent(attributes, report);
                this.validateTools(attributes, agent?.kind ?? ChatModeKind.Agent, header.target, report);
                this.validateModel(attributes, agent?.kind ?? ChatModeKind.Agent, report);
                break;
            }
            case PromptsType.instructions:
                this.validateApplyTo(attributes, report);
                this.validateExcludeAgent(attributes, report);
                break;
            case PromptsType.agent: {
                this.validateTarget(attributes, report);
                this.validateInfer(attributes, report);
                this.validateTools(attributes, ChatModeKind.Agent, header.target, report);
                if (!isGitHubTarget) {
                    this.validateModel(attributes, ChatModeKind.Agent, report);
                    this.validateHandoffs(attributes, report);
                }
                break;
            }
        }
    }
    checkForInvalidArguments(attributes, promptType, isGitHubTarget, report) {
        const validAttributeNames = getValidAttributeNames(promptType, true, isGitHubTarget);
        const validGithubCopilotAttributeNames = new Lazy(() => new Set(getValidAttributeNames(promptType, false, true)));
        for (const attribute of attributes) {
            if (!validAttributeNames.includes(attribute.key)) {
                const supportedNames = new Lazy(() => getValidAttributeNames(promptType, false, isGitHubTarget).sort().join(', '));
                switch (promptType) {
                    case PromptsType.prompt:
                        report(toMarker(localize('promptValidator.unknownAttribute.prompt', "Attribute '{0}' is not supported in prompt files. Supported: {1}.", attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        break;
                    case PromptsType.agent:
                        if (isGitHubTarget) {
                            report(toMarker(localize('promptValidator.unknownAttribute.github-agent', "Attribute '{0}' is not supported in custom GitHub Copilot agent files. Supported: {1}.", attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        }
                        else {
                            if (validGithubCopilotAttributeNames.value.has(attribute.key)) {
                                report(toMarker(localize('promptValidator.ignoredAttribute.vscode-agent', "Attribute '{0}' is ignored when running locally in VS Code.", attribute.key), attribute.range, MarkerSeverity.Info));
                            }
                            else {
                                report(toMarker(localize('promptValidator.unknownAttribute.vscode-agent', "Attribute '{0}' is not supported in VS Code agent files. Supported: {1}.", attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                            }
                        }
                        break;
                    case PromptsType.instructions:
                        report(toMarker(localize('promptValidator.unknownAttribute.instructions', "Attribute '{0}' is not supported in instructions files. Supported: {1}.", attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        break;
                }
            }
        }
    }
    validateName(attributes, isGitHubTarget, report) {
        const nameAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.name);
        if (!nameAttribute) {
            return;
        }
        if (nameAttribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.nameMustBeString', "The 'name' attribute must be a string."), nameAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (nameAttribute.value.value.trim().length === 0) {
            report(toMarker(localize('promptValidator.nameShouldNotBeEmpty', "The 'name' attribute must not be empty."), nameAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateDescription(attributes, report) {
        const descriptionAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.description);
        if (!descriptionAttribute) {
            return;
        }
        if (descriptionAttribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.descriptionMustBeString', "The 'description' attribute must be a string."), descriptionAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (descriptionAttribute.value.value.trim().length === 0) {
            report(toMarker(localize('promptValidator.descriptionShouldNotBeEmpty', "The 'description' attribute should not be empty."), descriptionAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateArgumentHint(attributes, report) {
        const argumentHintAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.argumentHint);
        if (!argumentHintAttribute) {
            return;
        }
        if (argumentHintAttribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.argumentHintMustBeString', "The 'argument-hint' attribute must be a string."), argumentHintAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (argumentHintAttribute.value.value.trim().length === 0) {
            report(toMarker(localize('promptValidator.argumentHintShouldNotBeEmpty', "The 'argument-hint' attribute should not be empty."), argumentHintAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateModel(attributes, agentKind, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.model);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.modelMustBeString', "The 'model' attribute must be a string."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const modelName = attribute.value.value.trim();
        if (modelName.length === 0) {
            report(toMarker(localize('promptValidator.modelMustBeNonEmpty', "The 'model' attribute must be a non-empty string."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const languageModes = this.languageModelsService.getLanguageModelIds();
        if (languageModes.length === 0) {
            // likely the service is not initialized yet
            return;
        }
        const modelMetadata = this.findModelByName(languageModes, modelName);
        if (!modelMetadata) {
            report(toMarker(localize('promptValidator.modelNotFound', "Unknown model '{0}'.", modelName), attribute.value.range, MarkerSeverity.Warning));
        }
        else if (agentKind === ChatModeKind.Agent && !ILanguageModelChatMetadata.suitableForAgentMode(modelMetadata)) {
            report(toMarker(localize('promptValidator.modelNotSuited', "Model '{0}' is not suited for agent mode.", modelName), attribute.value.range, MarkerSeverity.Warning));
        }
    }
    findModelByName(languageModes, modelName) {
        for (const model of languageModes) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false && ILanguageModelChatMetadata.matchesQualifiedName(modelName, metadata)) {
                return metadata;
            }
        }
        return undefined;
    }
    validateAgent(attributes, report) {
        const agentAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agent);
        const modeAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.mode);
        if (modeAttribute) {
            if (agentAttribute) {
                report(toMarker(localize('promptValidator.modeDeprecated', "The 'mode' attribute has been deprecated. The 'agent' attribute is used instead."), modeAttribute.range, MarkerSeverity.Warning));
            }
            else {
                report(toMarker(localize('promptValidator.modeDeprecated.useAgent', "The 'mode' attribute has been deprecated. Please rename it to 'agent'."), modeAttribute.range, MarkerSeverity.Error));
            }
        }
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agent) ?? modeAttribute;
        if (!attribute) {
            return undefined; // default agent for prompts is Agent
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.attributeMustBeString', "The '{0}' attribute must be a string.", attribute.key), attribute.value.range, MarkerSeverity.Error));
            return undefined;
        }
        const agentValue = attribute.value.value;
        if (agentValue.trim().length === 0) {
            report(toMarker(localize('promptValidator.attributeMustBeNonEmpty', "The '{0}' attribute must be a non-empty string.", attribute.key), attribute.value.range, MarkerSeverity.Error));
            return undefined;
        }
        return this.validateAgentValue(attribute.value, report);
    }
    validateAgentValue(value, report) {
        const agents = this.chatModeService.getModes();
        const availableAgents = [];
        // Check if agent exists in builtin or custom agents
        for (const agent of Iterable.concat(agents.builtin, agents.custom)) {
            if (agent.name.get() === value.value) {
                return agent;
            }
            availableAgents.push(agent.name.get()); // collect all available agent names
        }
        const errorMessage = localize('promptValidator.agentNotFound', "Unknown agent '{0}'. Available agents: {1}.", value.value, availableAgents.join(', '));
        report(toMarker(errorMessage, value.range, MarkerSeverity.Warning));
        return undefined;
    }
    validateTools(attributes, agentKind, target, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.tools);
        if (!attribute) {
            return;
        }
        if (agentKind !== ChatModeKind.Agent) {
            report(toMarker(localize('promptValidator.toolsOnlyInAgent', "The 'tools' attribute is only supported when using agents. Attribute will be ignored."), attribute.range, MarkerSeverity.Warning));
        }
        switch (attribute.value.type) {
            case 'array':
                if (target === Target.GitHubCopilot) {
                    // no validation for github-copilot target
                }
                else {
                    this.validateVSCodeTools(attribute.value, target, report);
                }
                break;
            default:
                report(toMarker(localize('promptValidator.toolsMustBeArrayOrMap', "The 'tools' attribute must be an array."), attribute.value.range, MarkerSeverity.Error));
        }
    }
    validateVSCodeTools(valueItem, target, report) {
        if (valueItem.items.length > 0) {
            const available = new Set(this.languageModelToolsService.getFullReferenceNames());
            const deprecatedNames = this.languageModelToolsService.getDeprecatedFullReferenceNames();
            for (const item of valueItem.items) {
                if (item.type !== 'string') {
                    report(toMarker(localize('promptValidator.eachToolMustBeString', "Each tool name in the 'tools' attribute must be a string."), item.range, MarkerSeverity.Error));
                }
                else if (item.value) {
                    if (!available.has(item.value)) {
                        const currentNames = deprecatedNames.get(item.value);
                        if (currentNames) {
                            if (currentNames?.size === 1) {
                                const newName = Array.from(currentNames)[0];
                                report(toMarker(localize('promptValidator.toolDeprecated', "Tool or toolset '{0}' has been renamed, use '{1}' instead.", item.value, newName), item.range, MarkerSeverity.Info));
                            }
                            else {
                                const newNames = Array.from(currentNames).sort((a, b) => a.localeCompare(b)).join(', ');
                                report(toMarker(localize('promptValidator.toolDeprecatedMultipleNames', "Tool or toolset '{0}' has been renamed, use the following tools instead: {1}", item.value, newNames), item.range, MarkerSeverity.Info));
                            }
                        }
                        else {
                            report(toMarker(localize('promptValidator.toolNotFound', "Unknown tool '{0}'.", item.value), item.range, MarkerSeverity.Warning));
                        }
                    }
                }
            }
        }
    }
    validateApplyTo(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.applyTo);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.applyToMustBeString', "The 'applyTo' attribute must be a string."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const pattern = attribute.value.value;
        try {
            const patterns = splitGlobAware(pattern, ',');
            if (patterns.length === 0) {
                report(toMarker(localize('promptValidator.applyToMustBeValidGlob', "The 'applyTo' attribute must be a valid glob pattern."), attribute.value.range, MarkerSeverity.Error));
                return;
            }
            for (const pattern of patterns) {
                const globPattern = parse(pattern);
                if (isEmptyPattern(globPattern)) {
                    report(toMarker(localize('promptValidator.applyToMustBeValidGlob', "The 'applyTo' attribute must be a valid glob pattern."), attribute.value.range, MarkerSeverity.Error));
                    return;
                }
            }
        }
        catch (_error) {
            report(toMarker(localize('promptValidator.applyToMustBeValidGlob', "The 'applyTo' attribute must be a valid glob pattern."), attribute.value.range, MarkerSeverity.Error));
        }
    }
    validateExcludeAgent(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.excludeAgent);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'array') {
            report(toMarker(localize('promptValidator.excludeAgentMustBeArray', "The 'excludeAgent' attribute must be an array."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateHandoffs(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.handOffs);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'array') {
            report(toMarker(localize('promptValidator.handoffsMustBeArray', "The 'handoffs' attribute must be an array."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        for (const item of attribute.value.items) {
            if (item.type !== 'object') {
                report(toMarker(localize('promptValidator.eachHandoffMustBeObject', "Each handoff in the 'handoffs' attribute must be an object with 'label', 'agent', 'prompt' and optional 'send'."), item.range, MarkerSeverity.Error));
                continue;
            }
            const required = new Set(['label', 'agent', 'prompt']);
            for (const prop of item.properties) {
                switch (prop.key.value) {
                    case 'label':
                        if (prop.value.type !== 'string' || prop.value.value.trim().length === 0) {
                            report(toMarker(localize('promptValidator.handoffLabelMustBeNonEmptyString', "The 'label' property in a handoff must be a non-empty string."), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'agent':
                        if (prop.value.type !== 'string' || prop.value.value.trim().length === 0) {
                            report(toMarker(localize('promptValidator.handoffAgentMustBeNonEmptyString', "The 'agent' property in a handoff must be a non-empty string."), prop.value.range, MarkerSeverity.Error));
                        }
                        else {
                            this.validateAgentValue(prop.value, report);
                        }
                        break;
                    case 'prompt':
                        if (prop.value.type !== 'string') {
                            report(toMarker(localize('promptValidator.handoffPromptMustBeString', "The 'prompt' property in a handoff must be a string."), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'send':
                        if (prop.value.type !== 'boolean') {
                            report(toMarker(localize('promptValidator.handoffSendMustBeBoolean', "The 'send' property in a handoff must be a boolean."), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'showContinueOn':
                        if (prop.value.type !== 'boolean') {
                            report(toMarker(localize('promptValidator.handoffShowContinueOnMustBeBoolean', "The 'showContinueOn' property in a handoff must be a boolean."), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    default:
                        report(toMarker(localize('promptValidator.unknownHandoffProperty', "Unknown property '{0}' in handoff object. Supported properties are 'label', 'agent', 'prompt' and optional 'send', 'showContinueOn'.", prop.key.value), prop.value.range, MarkerSeverity.Warning));
                }
                required.delete(prop.key.value);
            }
            if (required.size > 0) {
                report(toMarker(localize('promptValidator.missingHandoffProperties', "Missing required properties {0} in handoff object.", Array.from(required).map(s => `'${s}'`).join(', ')), item.range, MarkerSeverity.Error));
            }
        }
    }
    validateInfer(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.infer);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'boolean') {
            report(toMarker(localize('promptValidator.inferMustBeBoolean', "The 'infer' attribute must be a boolean."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateTarget(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.target);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize('promptValidator.targetMustBeString', "The 'target' attribute must be a string."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const targetValue = attribute.value.value.trim();
        if (targetValue.length === 0) {
            report(toMarker(localize('promptValidator.targetMustBeNonEmpty', "The 'target' attribute must be a non-empty string."), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const validTargets = ['github-copilot', 'vscode'];
        if (!validTargets.includes(targetValue)) {
            report(toMarker(localize('promptValidator.targetInvalidValue', "The 'target' attribute must be one of: {0}.", validTargets.join(', ')), attribute.value.range, MarkerSeverity.Error));
        }
    }
};
PromptValidator = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, ILanguageModelToolsService),
    __param(2, IChatModeService),
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, IPromptsService)
], PromptValidator);
export { PromptValidator };
const allAttributeNames = {
    [PromptsType.prompt]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.model, PromptHeaderAttributes.tools, PromptHeaderAttributes.mode, PromptHeaderAttributes.agent, PromptHeaderAttributes.argumentHint],
    [PromptsType.instructions]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.applyTo, PromptHeaderAttributes.excludeAgent],
    [PromptsType.agent]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.model, PromptHeaderAttributes.tools, PromptHeaderAttributes.advancedOptions, PromptHeaderAttributes.handOffs, PromptHeaderAttributes.argumentHint, PromptHeaderAttributes.target, PromptHeaderAttributes.infer]
};
const githubCopilotAgentAttributeNames = [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.tools, PromptHeaderAttributes.target, GithubPromptHeaderAttributes.mcpServers, PromptHeaderAttributes.infer];
const recommendedAttributeNames = {
    [PromptsType.prompt]: allAttributeNames[PromptsType.prompt].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.instructions]: allAttributeNames[PromptsType.instructions].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.agent]: allAttributeNames[PromptsType.agent].filter(name => !isNonRecommendedAttribute(name))
};
export function getValidAttributeNames(promptType, includeNonRecommended, isGitHubTarget) {
    if (isGitHubTarget && promptType === PromptsType.agent) {
        return githubCopilotAgentAttributeNames;
    }
    return includeNonRecommended ? allAttributeNames[promptType] : recommendedAttributeNames[promptType];
}
export function isNonRecommendedAttribute(attributeName) {
    return attributeName === PromptHeaderAttributes.advancedOptions || attributeName === PromptHeaderAttributes.excludeAgent || attributeName === PromptHeaderAttributes.mode;
}
// The list of tools known to be used by GitHub Copilot custom agents
export const knownGithubCopilotTools = [
    SpecedToolAliases.execute, SpecedToolAliases.read, SpecedToolAliases.edit, SpecedToolAliases.search, SpecedToolAliases.agent,
];
export function isGithubTarget(promptType, target) {
    return promptType === PromptsType.agent && target === Target.GitHubCopilot;
}
function toMarker(message, range, severity = MarkerSeverity.Error) {
    return { severity, message, ...range };
}
let PromptValidatorContribution = class PromptValidatorContribution extends Disposable {
    constructor(modelService, instantiationService, markerService, promptsService, languageModelsService, languageModelToolsService, chatModeService) {
        super();
        this.modelService = modelService;
        this.markerService = markerService;
        this.promptsService = promptsService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        this.localDisposables = this._register(new DisposableStore());
        this.validator = instantiationService.createInstance(PromptValidator);
        this.updateRegistration();
    }
    updateRegistration() {
        this.localDisposables.clear();
        const trackers = new ResourceMap();
        this.localDisposables.add(toDisposable(() => {
            trackers.forEach(tracker => tracker.dispose());
            trackers.clear();
        }));
        this.modelService.getModels().forEach(model => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        });
        this.localDisposables.add(this.modelService.onModelAdded((model) => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType && !trackers.has(model.uri)) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        }));
        this.localDisposables.add(this.modelService.onModelRemoved((model) => {
            const tracker = trackers.get(model.uri);
            if (tracker) {
                tracker.dispose();
                trackers.delete(model.uri);
            }
        }));
        this.localDisposables.add(this.modelService.onModelLanguageChanged((event) => {
            const { model } = event;
            const tracker = trackers.get(model.uri);
            if (tracker) {
                tracker.dispose();
                trackers.delete(model.uri);
            }
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        }));
        const validateAll = () => trackers.forEach(tracker => tracker.validate());
        this.localDisposables.add(this.languageModelToolsService.onDidChangeTools(() => validateAll()));
        this.localDisposables.add(this.chatModeService.onDidChangeChatModes(() => validateAll()));
        this.localDisposables.add(this.languageModelsService.onDidChangeLanguageModels(() => validateAll()));
    }
};
PromptValidatorContribution = __decorate([
    __param(0, IModelService),
    __param(1, IInstantiationService),
    __param(2, IMarkerService),
    __param(3, IPromptsService),
    __param(4, ILanguageModelsService),
    __param(5, ILanguageModelToolsService),
    __param(6, IChatModeService)
], PromptValidatorContribution);
export { PromptValidatorContribution };
let ModelTracker = class ModelTracker extends Disposable {
    constructor(textModel, promptType, validator, promptsService, markerService) {
        super();
        this.textModel = textModel;
        this.promptType = promptType;
        this.validator = validator;
        this.promptsService = promptsService;
        this.markerService = markerService;
        this.delayer = this._register(new Delayer(200));
        this._register(textModel.onDidChangeContent(() => this.validate()));
        this.validate();
    }
    validate() {
        this.delayer.trigger(async () => {
            const markers = [];
            const ast = this.promptsService.getParsedPromptFile(this.textModel);
            await this.validator.validate(ast, this.promptType, m => markers.push(m));
            this.markerService.changeOne(MARKERS_OWNER_ID, this.textModel.uri, markers);
        });
    }
    dispose() {
        this.markerService.remove(MARKERS_OWNER_ID, [this.textModel.uri]);
        super.dispose();
    }
};
ModelTracker = __decorate([
    __param(3, IPromptsService),
    __param(4, IMarkerService)
], ModelTracker);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9wcm9tcHRWYWxpZGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBZSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFhLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2xELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RSxPQUFPLEVBQUUsNEJBQTRCLEVBQWlFLHNCQUFzQixFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JL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
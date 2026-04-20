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
import { match, splitGlobAware } from '../../../../../base/common/glob.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ChatRequestVariableSet, IChatRequestVariableEntry, isPromptFileVariableEntry, toPromptFileVariableEntry, toPromptTextVariableEntry, PromptFileVariableKind, toToolVariableEntry } from '../chatVariableEntries.js';
import { ILanguageModelToolsService, VSCodeToolReference } from '../languageModelToolsService.js';
import { PromptsConfig } from './config/config.js';
import { isPromptOrInstructionsFile } from './config/promptFileLocations.js';
import { PromptsType } from './promptTypes.js';
import { IPromptsService } from './service/promptsService.js';
import { OffsetRange } from '../../../../../editor/common/core/ranges/offsetRange.js';
import { ChatConfiguration } from '../constants.js';
export function newInstructionsCollectionEvent() {
    return { applyingInstructionsCount: 0, referencedInstructionsCount: 0, agentInstructionsCount: 0, listedInstructionsCount: 0, totalInstructionsCount: 0 };
}
let ComputeAutomaticInstructions = class ComputeAutomaticInstructions {
    constructor(_enabledTools, _promptsService, _logService, _labelService, _configurationService, _workspaceService, _fileService, _telemetryService, _languageModelToolsService) {
        this._enabledTools = _enabledTools;
        this._promptsService = _promptsService;
        this._logService = _logService;
        this._labelService = _labelService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._telemetryService = _telemetryService;
        this._languageModelToolsService = _languageModelToolsService;
        this._parseResults = new ResourceMap();
    }
    async _parseInstructionsFile(uri, token) {
        if (this._parseResults.has(uri)) {
            return this._parseResults.get(uri);
        }
        try {
            const result = await this._promptsService.parseNew(uri, token);
            this._parseResults.set(uri, result);
            return result;
        }
        catch (error) {
            this._logService.error(`[InstructionsContextComputer] Failed to parse instruction file: ${uri}`, error);
            return undefined;
        }
    }
    async collect(variables, token) {
        const instructionFiles = await this._promptsService.listPromptFiles(PromptsType.instructions, token);
        this._logService.trace(`[InstructionsContextComputer] ${instructionFiles.length} instruction files available.`);
        const telemetryEvent = newInstructionsCollectionEvent();
        const context = this._getContext(variables);
        // find instructions where the `applyTo` matches the attached context
        await this.addApplyingInstructions(instructionFiles, context, variables, telemetryEvent, token);
        // add all instructions referenced by all instruction files that are in the context
        await this._addReferencedInstructions(variables, telemetryEvent, token);
        // get copilot instructions
        await this._addAgentInstructions(variables, telemetryEvent, token);
        const instructionsListVariable = await this._getInstructionsWithPatternsList(instructionFiles, variables, token);
        if (instructionsListVariable) {
            variables.add(instructionsListVariable);
            telemetryEvent.listedInstructionsCount++;
        }
        this.sendTelemetry(telemetryEvent);
    }
    sendTelemetry(telemetryEvent) {
        // Emit telemetry
        telemetryEvent.totalInstructionsCount = telemetryEvent.agentInstructionsCount + telemetryEvent.referencedInstructionsCount + telemetryEvent.applyingInstructionsCount + telemetryEvent.listedInstructionsCount;
        this._telemetryService.publicLog2('instructionsCollected', telemetryEvent);
    }
    /** public for testing */
    async addApplyingInstructions(instructionFiles, context, variables, telemetryEvent, token) {
        for (const { uri } of instructionFiles) {
            const parsedFile = await this._parseInstructionsFile(uri, token);
            if (!parsedFile) {
                this._logService.trace(`[InstructionsContextComputer] Unable to read: ${uri}`);
                continue;
            }
            const applyTo = parsedFile.header?.applyTo;
            if (!applyTo) {
                this._logService.trace(`[InstructionsContextComputer] No 'applyTo' found: ${uri}`);
                continue;
            }
            if (context.instructions.has(uri)) {
                // the instruction file is already part of the input or has already been processed
                this._logService.trace(`[InstructionsContextComputer] Skipping already processed instruction file: ${uri}`);
                continue;
            }
            const match = this._matches(context.files, applyTo);
            if (match) {
                this._logService.trace(`[InstructionsContextComputer] Match for ${uri} with ${match.pattern}${match.file ? ` for file ${match.file}` : ''}`);
                const reason = !match.file ?
                    localize('instruction.file.reason.allFiles', 'Automatically attached as pattern is **') :
                    localize('instruction.file.reason.specificFile', 'Automatically attached as pattern {0} matches {1}', applyTo, this._labelService.getUriLabel(match.file, { relative: true }));
                variables.add(toPromptFileVariableEntry(uri, PromptFileVariableKind.Instruction, reason, true));
                telemetryEvent.applyingInstructionsCount++;
            }
            else {
                this._logService.trace(`[InstructionsContextComputer] No match for ${uri} with ${applyTo}`);
            }
        }
    }
    _getContext(attachedContext) {
        const files = new ResourceSet();
        const instructions = new ResourceSet();
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                instructions.add(variable.value);
            }
            else {
                const uri = IChatRequestVariableEntry.toUri(variable);
                if (uri) {
                    files.add(uri);
                }
            }
        }
        return { files, instructions };
    }
    async _addAgentInstructions(variables, telemetryEvent, token) {
        const useCopilotInstructionsFiles = this._configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        const useAgentMd = this._configurationService.getValue(PromptsConfig.USE_AGENT_MD);
        if (!useCopilotInstructionsFiles && !useAgentMd) {
            this._logService.trace(`[InstructionsContextComputer] No agent instructions files added (settings disabled).`);
            return;
        }
        const entries = new ChatRequestVariableSet();
        if (useCopilotInstructionsFiles) {
            const files = await this._promptsService.listCopilotInstructionsMDs(token);
            for (const file of files) {
                entries.add(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize('instruction.file.reason.copilot', 'Automatically attached as setting {0} is enabled', PromptsConfig.USE_COPILOT_INSTRUCTION_FILES), true));
                telemetryEvent.agentInstructionsCount++;
                this._logService.trace(`[InstructionsContextComputer] copilot-instruction.md files added: ${file.toString()}`);
            }
            await this._addReferencedInstructions(entries, telemetryEvent, token);
        }
        if (useAgentMd) {
            const files = await this._promptsService.listAgentMDs(token, false);
            for (const file of files) {
                entries.add(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize('instruction.file.reason.agentsmd', 'Automatically attached as setting {0} is enabled', PromptsConfig.USE_AGENT_MD), true));
                telemetryEvent.agentInstructionsCount++;
                this._logService.trace(`[InstructionsContextComputer] AGENTS.md files added: ${file.toString()}`);
            }
        }
        for (const entry of entries.asArray()) {
            variables.add(entry);
        }
    }
    _matches(files, applyToPattern) {
        const patterns = splitGlobAware(applyToPattern, ',');
        const patterMatches = (pattern) => {
            pattern = pattern.trim();
            if (pattern.length === 0) {
                // if glob pattern is empty, skip it
                return undefined;
            }
            if (pattern === '**' || pattern === '**/*' || pattern === '*') {
                // if glob pattern is one of the special wildcard values,
                // add the instructions file event if no files are attached
                return { pattern };
            }
            if (!pattern.startsWith('/') && !pattern.startsWith('**/')) {
                // support relative glob patterns, e.g. `src/**/*.js`
                pattern = '**/' + pattern;
            }
            // match each attached file with each glob pattern and
            // add the instructions file if its rule matches the file
            for (const file of files) {
                // if the file is not a valid URI, skip it
                if (match(pattern, file.path, { ignoreCase: true })) {
                    return { pattern, file }; // return the matched pattern and file URI
                }
            }
            return undefined;
        };
        for (const pattern of patterns) {
            const matchResult = patterMatches(pattern);
            if (matchResult) {
                return matchResult; // return the first matched pattern and file URI
            }
        }
        return undefined;
    }
    _getTool(referenceName) {
        if (!this._enabledTools) {
            return undefined;
        }
        const tool = this._languageModelToolsService.getToolByName(referenceName);
        if (tool && this._enabledTools.get(tool)) {
            return { tool, variable: `#tool:${this._languageModelToolsService.getFullReferenceName(tool)}` };
        }
        return undefined;
    }
    async _getInstructionsWithPatternsList(instructionFiles, _existingVariables, token) {
        const readTool = this._getTool('readFile');
        const runSubagentTool = this._getTool(VSCodeToolReference.runSubagent);
        const entries = [];
        if (readTool) {
            const searchNestedAgentMd = this._configurationService.getValue(PromptsConfig.USE_NESTED_AGENT_MD);
            const agentsMdPromise = searchNestedAgentMd ? this._promptsService.findAgentMDsInWorkspace(token) : Promise.resolve([]);
            entries.push('<instructions>');
            entries.push('Here is a list of instruction files that contain rules for modifying or creating new code.');
            entries.push('These files are important for ensuring that the code is modified or created correctly.');
            entries.push('Please make sure to follow the rules specified in these files when working with the codebase.');
            entries.push(`If the file is not already available as attachment, use the ${readTool.variable} tool to acquire it.`);
            entries.push('Make sure to acquire the instructions before making any changes to the code.');
            let hasContent = false;
            for (const { uri } of instructionFiles) {
                const parsedFile = await this._parseInstructionsFile(uri, token);
                if (parsedFile) {
                    entries.push('<instruction>');
                    if (parsedFile.header) {
                        const { description, applyTo } = parsedFile.header;
                        if (description) {
                            entries.push(`<description>${description}</description>`);
                        }
                        entries.push(`<file>${getFilePath(uri)}</file>`);
                        if (applyTo) {
                            entries.push(`<applyTo>${applyTo}</applyTo>`);
                        }
                    }
                    else {
                        entries.push(`<file>${getFilePath(uri)}</file>`);
                    }
                    entries.push('</instruction>');
                    hasContent = true;
                }
            }
            const agentsMdFiles = await agentsMdPromise;
            for (const uri of agentsMdFiles) {
                if (uri) {
                    const folderName = this._labelService.getUriLabel(dirname(uri), { relative: true });
                    const description = folderName.trim().length === 0 ? localize('instruction.file.description.agentsmd.root', 'Instructions for the workspace') : localize('instruction.file.description.agentsmd.folder', 'Instructions for folder \'{0}\'', folderName);
                    entries.push('<instruction>');
                    entries.push(`<description>${description}</description>`);
                    entries.push(`<file>${getFilePath(uri)}</file>`);
                    entries.push('</instruction>');
                    hasContent = true;
                }
            }
            if (!hasContent) {
                entries.length = 0; // clear entries
            }
            else {
                entries.push('</instructions>', '', ''); // add trailing newline
            }
            const agentSkills = await this._promptsService.findAgentSkills(token);
            if (agentSkills && agentSkills.length > 0) {
                entries.push('<skills>');
                entries.push('Here is a list of skills that contain domain specific knowledge on a variety of topics.');
                entries.push('Each skill comes with a description of the topic and a file path that contains the detailed instructions.');
                entries.push(`When a user asks you to perform a task that falls within the domain of a skill, use the ${readTool.variable} tool to acquire the full instructions from the file URI.`);
                for (const skill of agentSkills) {
                    entries.push('<skill>');
                    entries.push(`<name>${skill.name}</name>`);
                    if (skill.description) {
                        entries.push(`<description>${skill.description}</description>`);
                    }
                    entries.push(`<file>${getFilePath(skill.uri)}</file>`);
                    entries.push('</skill>');
                }
                entries.push('</skills>', '', ''); // add trailing newline
            }
        }
        if (runSubagentTool) {
            const subagentToolCustomAgents = this._configurationService.getValue(ChatConfiguration.SubagentToolCustomAgents);
            if (subagentToolCustomAgents) {
                const agents = await this._promptsService.getCustomAgents(token);
                if (agents.length > 0) {
                    entries.push('<agents>');
                    entries.push('Here is a list of agents that can be used when running a subagent.');
                    entries.push('Each agent has optionally a description with the agent\'s purpose and expertise. When asked to run a subagent, choose the most appropriate agent from this list.');
                    entries.push(`Use the ${runSubagentTool.variable} tool with the agent name to run the subagent.`);
                    for (const agent of agents) {
                        if (agent.infer === false) {
                            // skip agents that are not meant for subagent use
                            continue;
                        }
                        entries.push('<agent>');
                        entries.push(`<name>${agent.name}</name>`);
                        if (agent.description) {
                            entries.push(`<description>${agent.description}</description>`);
                        }
                        if (agent.argumentHint) {
                            entries.push(`<argumentHint>${agent.argumentHint}</argumentHint>`);
                        }
                        entries.push('</agent>');
                    }
                    entries.push('</agents>', '', ''); // add trailing newline
                }
            }
        }
        if (entries.length === 0) {
            return undefined;
        }
        const content = entries.join('\n');
        const toolReferences = [];
        const collectToolReference = (tool) => {
            if (tool) {
                let offset = content.indexOf(tool.variable);
                while (offset >= 0) {
                    toolReferences.push(toToolVariableEntry(tool.tool, new OffsetRange(offset, offset + tool.variable.length)));
                    offset = content.indexOf(tool.variable, offset + 1);
                }
            }
        };
        collectToolReference(readTool);
        collectToolReference(runSubagentTool);
        return toPromptTextVariableEntry(content, true, toolReferences);
    }
    async _addReferencedInstructions(attachedContext, telemetryEvent, token) {
        const seen = new ResourceSet();
        const todo = [];
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                if (!seen.has(variable.value)) {
                    todo.push(variable.value);
                    seen.add(variable.value);
                }
            }
        }
        let next = todo.pop();
        while (next) {
            const result = await this._parseInstructionsFile(next, token);
            if (result && result.body) {
                const refsToCheck = [];
                for (const ref of result.body.fileReferences) {
                    const url = result.body.resolveFilePath(ref.content);
                    if (url && !seen.has(url) && (isPromptOrInstructionsFile(url) || this._workspaceService.getWorkspaceFolder(url) !== undefined)) {
                        // only add references that are either prompt or instruction files or are part of the workspace
                        refsToCheck.push({ resource: url });
                        seen.add(url);
                    }
                }
                if (refsToCheck.length > 0) {
                    const stats = await this._fileService.resolveAll(refsToCheck);
                    for (let i = 0; i < stats.length; i++) {
                        const stat = stats[i];
                        const uri = refsToCheck[i].resource;
                        if (stat.success && stat.stat?.isFile) {
                            if (isPromptOrInstructionsFile(uri)) {
                                // only recursively parse instruction files
                                todo.push(uri);
                            }
                            const reason = localize('instruction.file.reason.referenced', 'Referenced by {0}', basename(next));
                            attachedContext.add(toPromptFileVariableEntry(uri, PromptFileVariableKind.InstructionReference, reason, true));
                            telemetryEvent.referencedInstructionsCount++;
                            this._logService.trace(`[InstructionsContextComputer] ${uri.toString()} added, referenced by ${next.toString()}`);
                        }
                    }
                }
            }
            next = todo.pop();
        }
    }
};
ComputeAutomaticInstructions = __decorate([
    __param(1, IPromptsService),
    __param(2, ILogService),
    __param(3, ILabelService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IFileService),
    __param(7, ITelemetryService),
    __param(8, ILanguageModelToolsService)
], ComputeAutomaticInstructions);
export { ComputeAutomaticInstructions };
function getFilePath(uri) {
    if (uri.scheme === Schemas.file || uri.scheme === Schemas.vscodeRemote) {
        return uri.fsPath;
    }
    return uri.toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUF1dG9tYXRpY0luc3RydWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29tcHV0ZUF1dG9tYXRpY0luc3RydWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsRUFBMkQsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyUixPQUFPLEVBQUUsMEJBQTBCLEVBQTJD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
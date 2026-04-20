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
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IChatAgentService } from '../chatAgents.js';
import { IChatModeService } from '../chatModes.js';
import { IChatService } from '../chatService.js';
import { ChatRequestVariableSet } from '../chatVariableEntries.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../languageModels.js';
import { ILanguageModelToolsService, ToolDataSource, ToolSet, VSCodeToolReference } from '../languageModelToolsService.js';
import { ComputeAutomaticInstructions } from '../promptSyntax/computeAutomaticInstructions.js';
import { ManageTodoListToolToolId } from './manageTodoListTool.js';
import { createToolSimpleTextResult } from './toolHelpers.js';
export const RunSubagentToolId = 'runSubagent';
const BaseModelDescription = `Launch a new agent to handle complex, multi-step tasks autonomously. This tool is good at researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries, use this agent to perform the search for you.

- Agents do not run async or in the background, you will wait for the agent\'s result.
- When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
- Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
- The agent's outputs should generally be trusted
- Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user\'s intent`;
let RunSubagentTool = class RunSubagentTool extends Disposable {
    constructor(chatAgentService, chatService, chatModeService, languageModelToolsService, languageModelsService, logService, toolsService, configurationService, instantiationService) {
        super();
        this.chatAgentService = chatAgentService;
        this.chatService = chatService;
        this.chatModeService = chatModeService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.toolsService = toolsService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.onDidUpdateToolData = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ChatConfiguration.SubagentToolCustomAgents));
    }
    getToolData() {
        let modelDescription = BaseModelDescription;
        const inputSchema = {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'A detailed description of the task for the agent to perform'
                },
                description: {
                    type: 'string',
                    description: 'A short (3-5 word) description of the task'
                }
            },
            required: ['prompt', 'description']
        };
        if (this.configurationService.getValue(ChatConfiguration.SubagentToolCustomAgents)) {
            inputSchema.properties.agentName = {
                type: 'string',
                description: 'Optional name of a specific agent to invoke. If not provided, uses the current agent.'
            };
            modelDescription += `\n- If the user asks for a certain agent, you MUST provide that EXACT agent name (case-sensitive) to invoke that specific agent.`;
        }
        const runSubagentToolData = {
            id: RunSubagentToolId,
            toolReferenceName: VSCodeToolReference.runSubagent,
            icon: ThemeIcon.fromId(Codicon.organization.id),
            displayName: localize('tool.runSubagent.displayName', 'Run Subagent'),
            userDescription: localize('tool.runSubagent.userDescription', 'Run a task within an isolated subagent context to enable efficient organization of tasks and context window management.'),
            modelDescription: modelDescription,
            source: ToolDataSource.Internal,
            inputSchema: inputSchema
        };
        return runSubagentToolData;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        this.logService.debug(`RunSubagentTool: Invoking with prompt: ${args.prompt.substring(0, 100)}...`);
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        // Get the chat model and request for writing progress
        const model = this.chatService.getSession(invocation.context.sessionResource);
        if (!model) {
            throw new Error('Chat model not found for session');
        }
        const request = model.getRequests().at(-1);
        try {
            // Get the default agent
            const defaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, ChatModeKind.Agent);
            if (!defaultAgent) {
                return createToolSimpleTextResult('Error: No default agent available');
            }
            // Resolve mode-specific configuration if subagentId is provided
            let modeModelId = invocation.modelId;
            let modeTools = invocation.userSelectedTools;
            let modeInstructions;
            if (args.agentName) {
                const mode = this.chatModeService.findModeByName(args.agentName);
                if (mode) {
                    // Use mode-specific model if available
                    const modeModelQualifiedName = mode.model?.get();
                    if (modeModelQualifiedName) {
                        // Find the actual model identifier from the qualified name
                        const modelIds = this.languageModelsService.getLanguageModelIds();
                        for (const modelId of modelIds) {
                            const metadata = this.languageModelsService.lookupLanguageModel(modelId);
                            if (metadata && ILanguageModelChatMetadata.matchesQualifiedName(modeModelQualifiedName, metadata)) {
                                modeModelId = modelId;
                                break;
                            }
                        }
                    }
                    // Use mode-specific tools if available
                    const modeCustomTools = mode.customTools?.get();
                    if (modeCustomTools) {
                        // Convert the mode's custom tools (array of qualified names) to UserSelectedTools format
                        const enablementMap = this.languageModelToolsService.toToolAndToolSetEnablementMap(modeCustomTools, mode.target?.get());
                        // Convert enablement map to UserSelectedTools (Record<string, boolean>)
                        modeTools = {};
                        for (const [tool, enabled] of enablementMap) {
                            if (!(tool instanceof ToolSet)) {
                                modeTools[tool.id] = enabled;
                            }
                        }
                    }
                    const instructions = mode.modeInstructions?.get();
                    modeInstructions = instructions && {
                        name: mode.name.get(),
                        content: instructions.content,
                        toolReferences: this.toolsService.toToolReferences(instructions.toolReferences),
                        metadata: instructions.metadata,
                    };
                }
                else {
                    this.logService.warn(`RunSubagentTool: Agent '${args.agentName}' not found, using current configuration`);
                }
            }
            // Track whether we should collect markdown (after the last prepare tool invocation)
            const markdownParts = [];
            let inEdit = false;
            const progressCallback = (parts) => {
                for (const part of parts) {
                    // Write certain parts immediately to the model
                    if (part.kind === 'prepareToolInvocation' || part.kind === 'textEdit' || part.kind === 'notebookEdit' || part.kind === 'codeblockUri') {
                        if (part.kind === 'codeblockUri' && !inEdit) {
                            inEdit = true;
                            model.acceptResponseProgress(request, { kind: 'markdownContent', content: new MarkdownString('```\n'), fromSubagent: true });
                        }
                        model.acceptResponseProgress(request, part);
                        // When we see a prepare tool invocation, reset markdown collection
                        if (part.kind === 'prepareToolInvocation') {
                            markdownParts.length = 0; // Clear previously collected markdown
                        }
                    }
                    else if (part.kind === 'markdownContent') {
                        if (inEdit) {
                            model.acceptResponseProgress(request, { kind: 'markdownContent', content: new MarkdownString('\n```\n\n'), fromSubagent: true });
                            inEdit = false;
                        }
                        // Collect markdown content for the tool result
                        markdownParts.push(part.content.value);
                    }
                }
            };
            if (modeTools) {
                modeTools[RunSubagentToolId] = false;
                modeTools[ManageTodoListToolToolId] = false;
            }
            const variableSet = await this.collectVariables(modeTools, token);
            // Build the agent request
            const agentRequest = {
                sessionResource: invocation.context.sessionResource,
                requestId: invocation.callId ?? `subagent-${Date.now()}`,
                agentId: defaultAgent.id,
                message: args.prompt,
                variables: { variables: variableSet.asArray() },
                location: ChatAgentLocation.Chat,
                isSubagent: true,
                userSelectedModelId: modeModelId,
                userSelectedTools: modeTools,
                modeInstructions,
            };
            // Invoke the agent
            const result = await this.chatAgentService.invokeAgent(defaultAgent.id, agentRequest, progressCallback, [], token);
            // Check for errors
            if (result.errorDetails) {
                return createToolSimpleTextResult(`Agent error: ${result.errorDetails.message}`);
            }
            return createToolSimpleTextResult(markdownParts.join('') || 'Agent completed with no output');
        }
        catch (error) {
            const errorMessage = `Error invoking subagent: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.logService.error(errorMessage, error);
            return createToolSimpleTextResult(errorMessage);
        }
    }
    async prepareToolInvocation(context, _token) {
        const args = context.parameters;
        return {
            invocationMessage: args.description,
        };
    }
    async collectVariables(modeTools, token) {
        let enabledTools;
        if (modeTools) {
            // Convert tool IDs to full reference names
            const enabledToolIds = Object.entries(modeTools).filter(([, enabled]) => enabled).map(([id]) => id);
            const tools = enabledToolIds.map(id => this.languageModelToolsService.getTool(id)).filter(tool => !!tool);
            const fullReferenceNames = tools.map(tool => this.languageModelToolsService.getFullReferenceName(tool));
            if (fullReferenceNames.length > 0) {
                enabledTools = this.languageModelToolsService.toToolAndToolSetEnablementMap(fullReferenceNames, undefined);
            }
        }
        const variableSet = new ChatRequestVariableSet();
        const computer = this.instantiationService.createInstance(ComputeAutomaticInstructions, enabledTools);
        await computer.collect(variableSet, token);
        return variableSet;
    }
};
RunSubagentTool = __decorate([
    __param(0, IChatAgentService),
    __param(1, IChatService),
    __param(2, IChatModeService),
    __param(3, ILanguageModelToolsService),
    __param(4, ILanguageModelsService),
    __param(5, ILogService),
    __param(6, ILanguageModelToolsService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService)
], RunSubagentTool);
export { RunSubagentTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuU3ViYWdlbnRUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Rvb2xzL3J1blN1YmFnZW50VG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQTZCLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDakksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQXFCLE1BQU0sa0JBQWtCLENBQUM7QUFFM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDbkQsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDckYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0JB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
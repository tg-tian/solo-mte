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
var LanguageModelToolsService_1;
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { assertNever } from '../../../../base/common/assert.js';
import { RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { encodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { arrayEqualsC } from '../../../../base/common/equals.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createMarkdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { combinedDisposable, Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { derived, observableFromEventOpts, ObservableSet } from '../../../../base/common/observable.js';
import Severity from '../../../../base/common/severity.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatToolInvocation } from '../common/chatProgressTypes/chatToolInvocation.js';
import { IChatService, IChatToolInvocation } from '../common/chatService.js';
import { toToolSetVariableEntry, toToolVariableEntry } from '../common/chatVariableEntries.js';
import { ChatConfiguration } from '../common/constants.js';
import { ILanguageModelToolsConfirmationService } from '../common/languageModelToolsConfirmationService.js';
import { createToolSchemaUri, SpecedToolAliases, stringifyPromptTsxPart, ToolDataSource, ToolSet, VSCodeToolReference } from '../common/languageModelToolsService.js';
import { getToolConfirmationAlert } from './chatAccessibilityProvider.js';
const jsonSchemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
var AutoApproveStorageKeys;
(function (AutoApproveStorageKeys) {
    AutoApproveStorageKeys["GlobalAutoApproveOptIn"] = "chat.tools.global.autoApprove.optIn";
})(AutoApproveStorageKeys || (AutoApproveStorageKeys = {}));
const SkipAutoApproveConfirmationKey = 'vscode.chat.tools.global.autoApprove.testMode';
export const globalAutoApproveDescription = localize2({
    key: 'autoApprove2.markdown',
    comment: [
        '{Locked=\'](https://github.com/features/codespaces)\'}',
        '{Locked=\'](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)\'}',
        '{Locked=\'](https://code.visualstudio.com/docs/copilot/security)\'}',
        '{Locked=\'**\'}',
    ]
}, 'Global auto approve also known as "YOLO mode" disables manual approval completely for _all tools in all workspaces_, allowing the agent to act fully autonomously. This is extremely dangerous and is *never* recommended, even containerized environments like [Codespaces](https://github.com/features/codespaces) and [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) have user keys forwarded into the container that could be compromised.\n\n**This feature disables [critical security protections](https://code.visualstudio.com/docs/copilot/security) and makes it much easier for an attacker to compromise the machine.**');
let LanguageModelToolsService = class LanguageModelToolsService extends Disposable {
    static { LanguageModelToolsService_1 = this; }
    constructor(_instantiationService, _extensionService, _contextKeyService, _chatService, _dialogService, _telemetryService, _logService, _configurationService, _accessibilityService, _accessibilitySignalService, _storageService, _confirmationService) {
        super();
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._dialogService = _dialogService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._storageService = _storageService;
        this._confirmationService = _confirmationService;
        this._onDidChangeTools = this._register(new Emitter());
        this.onDidChangeTools = this._onDidChangeTools.event;
        this._onDidPrepareToolCallBecomeUnresponsive = this._register(new Emitter());
        this.onDidPrepareToolCallBecomeUnresponsive = this._onDidPrepareToolCallBecomeUnresponsive.event;
        /** Throttle tools updates because it sends all tools and runs on context key updates */
        this._onDidChangeToolsScheduler = new RunOnceScheduler(() => this._onDidChangeTools.fire(), 750);
        this._tools = new Map();
        this._toolContextKeys = new Set();
        this._callsByRequestId = new Map();
        this.toolsObservable = observableFromEventOpts({ equalsFn: arrayEqualsC() }, this.onDidChangeTools, () => Array.from(this.getTools()));
        this._toolSets = new ObservableSet();
        this.toolSets = derived(this, reader => {
            const allToolSets = Array.from(this._toolSets.observable.read(reader));
            return allToolSets.filter(toolSet => this.isPermitted(toolSet, reader));
        });
        this.toolsWithFullReferenceName = derived(reader => {
            const result = [];
            const coveredByToolSets = new Set();
            for (const toolSet of this.toolSets.read(reader)) {
                if (toolSet.source.type !== 'user') {
                    result.push([toolSet, getToolSetFullReferenceName(toolSet)]);
                    for (const tool of toolSet.getTools()) {
                        result.push([tool, getToolFullReferenceName(tool, toolSet)]);
                        coveredByToolSets.add(tool);
                    }
                }
            }
            for (const tool of this.toolsObservable.read(reader)) {
                if (tool.canBeReferencedInPrompt && !coveredByToolSets.has(tool) && this.isPermitted(tool, reader)) {
                    result.push([tool, getToolFullReferenceName(tool)]);
                }
            }
            return result;
        });
        this._isAgentModeEnabled = observableConfigValue(ChatConfiguration.AgentEnabled, true, this._configurationService);
        this._register(this._contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this._toolContextKeys)) {
                // Not worth it to compute a delta here unless we have many tools changing often
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ExtensionToolsEnabled) || e.affectsConfiguration(ChatConfiguration.AgentEnabled)) {
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        // Clear out warning accepted state if the setting is disabled
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(ChatConfiguration.GlobalAutoApprove)) {
                if (this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove) !== true) {
                    this._storageService.remove("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */);
                }
            }
        }));
        this._ctxToolsCount = ChatContextKeys.Tools.toolsCount.bindTo(_contextKeyService);
        // Create the internal VS Code tool set
        this.vscodeToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'vscode', VSCodeToolReference.vscode, {
            icon: ThemeIcon.fromId(Codicon.vscode.id),
            description: localize('copilot.toolSet.vscode.description', 'Use VS Code features'),
        }));
        // Create the internal Execute tool set
        this.executeToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'execute', SpecedToolAliases.execute, {
            icon: ThemeIcon.fromId(Codicon.terminal.id),
            description: localize('copilot.toolSet.execute.description', 'Execute code and applications on your machine'),
        }));
        // Create the internal Read tool set
        this.readToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'read', SpecedToolAliases.read, {
            icon: ThemeIcon.fromId(Codicon.eye.id),
            description: localize('copilot.toolSet.read.description', 'Read files in your workspace'),
        }));
    }
    /**
     * Returns if the given tool or toolset is permitted in the current context.
     * When agent mode is enabled, all tools are permitted (no restriction)
     * When agent mode is disabled only a subset of read-only tools are permitted in agentic-loop contexts.
     */
    isPermitted(toolOrToolSet, reader) {
        const agentModeEnabled = this._isAgentModeEnabled.read(reader);
        if (agentModeEnabled !== false) {
            return true;
        }
        const permittedInternalToolSetIds = [SpecedToolAliases.read, SpecedToolAliases.search, SpecedToolAliases.web];
        if (toolOrToolSet instanceof ToolSet) {
            const permitted = toolOrToolSet.source.type === 'internal' && permittedInternalToolSetIds.includes(toolOrToolSet.referenceName);
            this._logService.trace(`LanguageModelToolsService#isPermitted: ToolSet ${toolOrToolSet.id} (${toolOrToolSet.referenceName}) permitted=${permitted}`);
            return permitted;
        }
        this._logService.trace(`LanguageModelToolsService#isPermitted: Tool ${toolOrToolSet.id} (${toolOrToolSet.toolReferenceName}) permitted=false`);
        return false;
    }
    dispose() {
        super.dispose();
        this._callsByRequestId.forEach(calls => calls.forEach(call => call.store.dispose()));
        this._ctxToolsCount.reset();
    }
    registerToolData(toolData) {
        if (this._tools.has(toolData.id)) {
            throw new Error(`Tool "${toolData.id}" is already registered.`);
        }
        this._tools.set(toolData.id, { data: toolData });
        this._ctxToolsCount.set(this._tools.size);
        this._onDidChangeToolsScheduler.schedule();
        toolData.when?.keys().forEach(key => this._toolContextKeys.add(key));
        let store;
        if (toolData.inputSchema) {
            store = new DisposableStore();
            const schemaUrl = createToolSchemaUri(toolData.id).toString();
            jsonSchemaRegistry.registerSchema(schemaUrl, toolData.inputSchema, store);
            store.add(jsonSchemaRegistry.registerSchemaAssociation(schemaUrl, `/lm/tool/${toolData.id}/tool_input.json`));
        }
        return toDisposable(() => {
            store?.dispose();
            this._tools.delete(toolData.id);
            this._ctxToolsCount.set(this._tools.size);
            this._refreshAllToolContextKeys();
            this._onDidChangeToolsScheduler.schedule();
        });
    }
    flushToolUpdates() {
        this._onDidChangeToolsScheduler.flush();
    }
    _refreshAllToolContextKeys() {
        this._toolContextKeys.clear();
        for (const tool of this._tools.values()) {
            tool.data.when?.keys().forEach(key => this._toolContextKeys.add(key));
        }
    }
    registerToolImplementation(id, tool) {
        const entry = this._tools.get(id);
        if (!entry) {
            throw new Error(`Tool "${id}" was not contributed.`);
        }
        if (entry.impl) {
            throw new Error(`Tool "${id}" already has an implementation.`);
        }
        entry.impl = tool;
        return toDisposable(() => {
            entry.impl = undefined;
        });
    }
    registerTool(toolData, tool) {
        return combinedDisposable(this.registerToolData(toolData), this.registerToolImplementation(toolData.id, tool));
    }
    getTools(includeDisabled) {
        const toolDatas = Iterable.map(this._tools.values(), i => i.data);
        const extensionToolsEnabled = this._configurationService.getValue(ChatConfiguration.ExtensionToolsEnabled);
        return Iterable.filter(toolDatas, toolData => {
            const satisfiesWhenClause = includeDisabled || !toolData.when || this._contextKeyService.contextMatchesRules(toolData.when);
            const satisfiesExternalToolCheck = toolData.source.type !== 'extension' || !!extensionToolsEnabled;
            const satisfiesPermittedCheck = includeDisabled || this.isPermitted(toolData);
            return satisfiesWhenClause && satisfiesExternalToolCheck && satisfiesPermittedCheck;
        });
    }
    getTool(id) {
        return this._getToolEntry(id)?.data;
    }
    _getToolEntry(id) {
        const entry = this._tools.get(id);
        if (entry && (!entry.data.when || this._contextKeyService.contextMatchesRules(entry.data.when))) {
            return entry;
        }
        else {
            return undefined;
        }
    }
    getToolByName(name, includeDisabled) {
        for (const tool of this.getTools(!!includeDisabled)) {
            if (tool.toolReferenceName === name) {
                return tool;
            }
        }
        return undefined;
    }
    async invokeTool(dto, countTokens, token) {
        this._logService.trace(`[LanguageModelToolsService#invokeTool] Invoking tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}`);
        // When invoking a tool, don't validate the "when" clause. An extension may have invoked a tool just as it was becoming disabled, and just let it go through rather than throw and break the chat.
        let tool = this._tools.get(dto.toolId);
        if (!tool) {
            throw new Error(`Tool ${dto.toolId} was not contributed`);
        }
        if (!tool.impl) {
            await this._extensionService.activateByEvent(`onLanguageModelTool:${dto.toolId}`);
            // Extension should activate and register the tool implementation
            tool = this._tools.get(dto.toolId);
            if (!tool?.impl) {
                throw new Error(`Tool ${dto.toolId} does not have an implementation registered.`);
            }
        }
        // Shortcut to write to the model directly here, but could call all the way back to use the real stream.
        let toolInvocation;
        let requestId;
        let store;
        let toolResult;
        let prepareTimeWatch;
        let invocationTimeWatch;
        let preparedInvocation;
        try {
            if (dto.context) {
                store = new DisposableStore();
                const model = this._chatService.getSession(dto.context.sessionResource);
                if (!model) {
                    throw new Error(`Tool called for unknown chat session`);
                }
                const request = model.getRequests().at(-1);
                requestId = request.id;
                dto.modelId = request.modelId;
                dto.userSelectedTools = request.userSelectedTools && { ...request.userSelectedTools };
                // Replace the token with a new token that we can cancel when cancelToolCallsForRequest is called
                if (!this._callsByRequestId.has(requestId)) {
                    this._callsByRequestId.set(requestId, []);
                }
                const trackedCall = { store };
                this._callsByRequestId.get(requestId).push(trackedCall);
                const source = new CancellationTokenSource();
                store.add(toDisposable(() => {
                    source.dispose(true);
                }));
                store.add(token.onCancellationRequested(() => {
                    IChatToolInvocation.confirmWith(toolInvocation, { type: 0 /* ToolConfirmKind.Denied */ });
                    source.cancel();
                }));
                store.add(source.token.onCancellationRequested(() => {
                    IChatToolInvocation.confirmWith(toolInvocation, { type: 0 /* ToolConfirmKind.Denied */ });
                }));
                token = source.token;
                prepareTimeWatch = StopWatch.create(true);
                preparedInvocation = await this.prepareToolInvocation(tool, dto, token);
                prepareTimeWatch.stop();
                toolInvocation = new ChatToolInvocation(preparedInvocation, tool.data, dto.callId, dto.fromSubAgent, dto.parameters);
                trackedCall.invocation = toolInvocation;
                const autoConfirmed = await this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters);
                if (autoConfirmed) {
                    IChatToolInvocation.confirmWith(toolInvocation, autoConfirmed);
                }
                this._chatService.appendProgress(request, toolInvocation);
                dto.toolSpecificData = toolInvocation?.toolSpecificData;
                if (preparedInvocation?.confirmationMessages?.title) {
                    if (!IChatToolInvocation.executionConfirmedOrDenied(toolInvocation) && !autoConfirmed) {
                        this.playAccessibilitySignal([toolInvocation]);
                    }
                    const userConfirmed = await IChatToolInvocation.awaitConfirmation(toolInvocation, token);
                    if (userConfirmed.type === 0 /* ToolConfirmKind.Denied */) {
                        throw new CancellationError();
                    }
                    if (userConfirmed.type === 5 /* ToolConfirmKind.Skipped */) {
                        toolResult = {
                            content: [{
                                    kind: 'text',
                                    value: 'The user chose to skip the tool call, they want to proceed without running it'
                                }]
                        };
                        return toolResult;
                    }
                    if (dto.toolSpecificData?.kind === 'input') {
                        dto.parameters = dto.toolSpecificData.rawInput;
                        dto.toolSpecificData = undefined;
                    }
                }
            }
            else {
                prepareTimeWatch = StopWatch.create(true);
                preparedInvocation = await this.prepareToolInvocation(tool, dto, token);
                prepareTimeWatch.stop();
                if (preparedInvocation?.confirmationMessages?.title && !(await this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters))) {
                    const result = await this._dialogService.confirm({ message: renderAsPlaintext(preparedInvocation.confirmationMessages.title), detail: renderAsPlaintext(preparedInvocation.confirmationMessages.message) });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
                dto.toolSpecificData = preparedInvocation?.toolSpecificData;
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            invocationTimeWatch = StopWatch.create(true);
            toolResult = await tool.impl.invoke(dto, countTokens, {
                report: step => {
                    toolInvocation?.acceptProgress(step);
                }
            }, token);
            invocationTimeWatch.stop();
            this.ensureToolDetails(dto, toolResult, tool.data);
            if (toolInvocation?.didExecuteTool(toolResult).type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                const autoConfirmedPost = await this.shouldAutoConfirmPostExecution(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters);
                if (autoConfirmedPost) {
                    IChatToolInvocation.confirmWith(toolInvocation, autoConfirmedPost);
                }
                const postConfirm = await IChatToolInvocation.awaitPostConfirmation(toolInvocation, token);
                if (postConfirm.type === 0 /* ToolConfirmKind.Denied */) {
                    throw new CancellationError();
                }
                if (postConfirm.type === 5 /* ToolConfirmKind.Skipped */) {
                    toolResult = {
                        content: [{
                                kind: 'text',
                                value: 'The tool executed but the user chose not to share the results'
                            }]
                    };
                }
            }
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result: 'success',
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
                prepareTimeMs: prepareTimeWatch?.elapsed(),
                invocationTimeMs: invocationTimeWatch?.elapsed(),
            });
            return toolResult;
        }
        catch (err) {
            const result = isCancellationError(err) ? 'userCancelled' : 'error';
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result,
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
                prepareTimeMs: prepareTimeWatch?.elapsed(),
                invocationTimeMs: invocationTimeWatch?.elapsed(),
            });
            this._logService.error(`[LanguageModelToolsService#invokeTool] Error from tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}:\n${toErrorMessage(err, true)}`);
            toolResult ??= { content: [] };
            toolResult.toolResultError = err instanceof Error ? err.message : String(err);
            if (tool.data.alwaysDisplayInputOutput) {
                toolResult.toolResultDetails = { input: this.formatToolInput(dto), output: [{ type: 'embed', isText: true, value: String(err) }], isError: true };
            }
            throw err;
        }
        finally {
            toolInvocation?.didExecuteTool(toolResult, true);
            if (store) {
                this.cleanupCallDisposables(requestId, store);
            }
        }
    }
    async prepareToolInvocation(tool, dto, token) {
        let prepared;
        if (tool.impl.prepareToolInvocation) {
            const preparePromise = tool.impl.prepareToolInvocation({
                parameters: dto.parameters,
                chatRequestId: dto.chatRequestId,
                chatSessionId: dto.context?.sessionId,
                chatInteractionId: dto.chatInteractionId
            }, token);
            const raceResult = await Promise.race([
                timeout(3000, token).then(() => 'timeout'),
                preparePromise
            ]);
            if (raceResult === 'timeout') {
                this._onDidPrepareToolCallBecomeUnresponsive.fire({
                    sessionId: dto.context?.sessionId ?? '',
                    toolData: tool.data
                });
            }
            prepared = await preparePromise;
        }
        const isEligibleForAutoApproval = this.isToolEligibleForAutoApproval(tool.data);
        // Default confirmation messages if tool is not eligible for auto-approval
        if (!isEligibleForAutoApproval && !prepared?.confirmationMessages?.title) {
            if (!prepared) {
                prepared = {};
            }
            const fullReferenceName = getToolFullReferenceName(tool.data);
            // TODO: This should be more detailed per tool.
            prepared.confirmationMessages = {
                ...prepared.confirmationMessages,
                title: localize('defaultToolConfirmation.title', 'Confirm tool execution'),
                message: localize('defaultToolConfirmation.message', 'Run the \'{0}\' tool?', fullReferenceName),
                disclaimer: new MarkdownString(localize('defaultToolConfirmation.disclaimer', 'Auto approval for \'{0}\' is restricted via {1}.', getToolFullReferenceName(tool.data), createMarkdownCommandLink({ title: '`' + ChatConfiguration.EligibleForAutoApproval + '`', id: 'workbench.action.openSettings', arguments: [ChatConfiguration.EligibleForAutoApproval] }, false)), { isTrusted: true }),
                allowAutoConfirm: false,
            };
        }
        if (!isEligibleForAutoApproval && prepared?.confirmationMessages?.title) {
            // Always overwrite the disclaimer if not eligible for auto-approval
            prepared.confirmationMessages.disclaimer = new MarkdownString(localize('defaultToolConfirmation.disclaimer', 'Auto approval for \'{0}\' is restricted via {1}.', getToolFullReferenceName(tool.data), createMarkdownCommandLink({ title: '`' + ChatConfiguration.EligibleForAutoApproval + '`', id: 'workbench.action.openSettings', arguments: [ChatConfiguration.EligibleForAutoApproval] }, false)), { isTrusted: true });
        }
        if (prepared?.confirmationMessages?.title) {
            if (prepared.toolSpecificData?.kind !== 'terminal' && prepared.confirmationMessages.allowAutoConfirm !== false) {
                prepared.confirmationMessages.allowAutoConfirm = isEligibleForAutoApproval;
            }
            if (!prepared.toolSpecificData && tool.data.alwaysDisplayInputOutput) {
                prepared.toolSpecificData = {
                    kind: 'input',
                    rawInput: dto.parameters,
                };
            }
        }
        return prepared;
    }
    playAccessibilitySignal(toolInvocations) {
        const autoApproved = this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove);
        if (autoApproved) {
            return;
        }
        const setting = this._configurationService.getValue(AccessibilitySignal.chatUserActionRequired.settingsKey);
        if (!setting) {
            return;
        }
        const soundEnabled = setting.sound === 'on' || (setting.sound === 'auto' && (this._accessibilityService.isScreenReaderOptimized()));
        const announcementEnabled = this._accessibilityService.isScreenReaderOptimized() && setting.announcement === 'auto';
        if (soundEnabled || announcementEnabled) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.chatUserActionRequired, { customAlertMessage: this._instantiationService.invokeFunction(getToolConfirmationAlert, toolInvocations), userGesture: true, modality: !soundEnabled ? 'announcement' : undefined });
        }
    }
    ensureToolDetails(dto, toolResult, toolData) {
        if (!toolResult.toolResultDetails && toolData.alwaysDisplayInputOutput) {
            toolResult.toolResultDetails = {
                input: this.formatToolInput(dto),
                output: this.toolResultToIO(toolResult),
            };
        }
    }
    formatToolInput(dto) {
        return JSON.stringify(dto.parameters, undefined, 2);
    }
    toolResultToIO(toolResult) {
        return toolResult.content.map(part => {
            if (part.kind === 'text') {
                return { type: 'embed', isText: true, value: part.value };
            }
            else if (part.kind === 'promptTsx') {
                return { type: 'embed', isText: true, value: stringifyPromptTsxPart(part) };
            }
            else if (part.kind === 'data') {
                return { type: 'embed', value: encodeBase64(part.value.data), mimeType: part.value.mimeType };
            }
            else {
                assertNever(part);
            }
        });
    }
    getEligibleForAutoApprovalSpecialCase(toolData) {
        if (toolData.id === 'vscode_fetchWebPage_internal') {
            return 'fetch';
        }
        return undefined;
    }
    isToolEligibleForAutoApproval(toolData) {
        const fullReferenceName = this.getEligibleForAutoApprovalSpecialCase(toolData) ?? getToolFullReferenceName(toolData);
        if (toolData.id === 'copilot_fetchWebPage') {
            // Special case, this fetch will call an internal tool 'vscode_fetchWebPage_internal'
            return true;
        }
        const eligibilityConfig = this._configurationService.getValue(ChatConfiguration.EligibleForAutoApproval);
        if (eligibilityConfig && typeof eligibilityConfig === 'object' && fullReferenceName) {
            // Direct match
            if (Object.prototype.hasOwnProperty.call(eligibilityConfig, fullReferenceName)) {
                return eligibilityConfig[fullReferenceName];
            }
            // Back compat with legacy names
            if (toolData.legacyToolReferenceFullNames) {
                for (const legacyName of toolData.legacyToolReferenceFullNames) {
                    // Check if the full legacy name is in the config
                    if (Object.prototype.hasOwnProperty.call(eligibilityConfig, legacyName)) {
                        return eligibilityConfig[legacyName];
                    }
                    // Some tools may be both renamed and namespaced from a toolset, eg: xxx/yyy -> yyy
                    if (legacyName.includes('/')) {
                        const trimmedLegacyName = legacyName.split('/').pop();
                        if (trimmedLegacyName && Object.prototype.hasOwnProperty.call(eligibilityConfig, trimmedLegacyName)) {
                            return eligibilityConfig[trimmedLegacyName];
                        }
                    }
                }
            }
        }
        return true;
    }
    async shouldAutoConfirm(toolId, runsInWorkspace, source, parameters) {
        const tool = this._tools.get(toolId);
        if (!tool) {
            return undefined;
        }
        if (!this.isToolEligibleForAutoApproval(tool.data)) {
            return undefined;
        }
        const reason = this._confirmationService.getPreConfirmAction({ toolId, source, parameters });
        if (reason) {
            return reason;
        }
        const config = this._configurationService.inspect(ChatConfiguration.GlobalAutoApprove);
        // If we know the tool runs at a global level, only consider the global config.
        // If we know the tool runs at a workspace level, use those specific settings when appropriate.
        let value = config.value ?? config.defaultValue;
        if (typeof runsInWorkspace === 'boolean') {
            value = config.userLocalValue ?? config.applicationValue;
            if (runsInWorkspace) {
                value = config.workspaceValue ?? config.workspaceFolderValue ?? config.userRemoteValue ?? value;
            }
        }
        const autoConfirm = value === true || (typeof value === 'object' && value.hasOwnProperty(toolId) && value[toolId] === true);
        if (autoConfirm) {
            if (await this._checkGlobalAutoApprove()) {
                return { type: 2 /* ToolConfirmKind.Setting */, id: ChatConfiguration.GlobalAutoApprove };
            }
        }
        return undefined;
    }
    async shouldAutoConfirmPostExecution(toolId, runsInWorkspace, source, parameters) {
        if (this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove) && await this._checkGlobalAutoApprove()) {
            return { type: 2 /* ToolConfirmKind.Setting */, id: ChatConfiguration.GlobalAutoApprove };
        }
        return this._confirmationService.getPostConfirmAction({ toolId, source, parameters });
    }
    async _checkGlobalAutoApprove() {
        const optedIn = this._storageService.getBoolean("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */, false);
        if (optedIn) {
            return true;
        }
        if (this._contextKeyService.getContextKeyValue(SkipAutoApproveConfirmationKey) === true) {
            return true;
        }
        const promptResult = await this._dialogService.prompt({
            type: Severity.Warning,
            message: localize('autoApprove2.title', 'Enable global auto approve?'),
            buttons: [
                {
                    label: localize('autoApprove2.button.enable', 'Enable'),
                    run: () => true
                },
                {
                    label: localize('autoApprove2.button.disable', 'Disable'),
                    run: () => false
                },
            ],
            custom: {
                icon: Codicon.warning,
                disableCloseAction: true,
                markdownDetails: [{
                        markdown: new MarkdownString(globalAutoApproveDescription.value),
                    }],
            }
        });
        if (promptResult.result !== true) {
            await this._configurationService.updateValue(ChatConfiguration.GlobalAutoApprove, false);
            return false;
        }
        this._storageService.store("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        return true;
    }
    cleanupCallDisposables(requestId, store) {
        if (requestId) {
            const disposables = this._callsByRequestId.get(requestId);
            if (disposables) {
                const index = disposables.findIndex(d => d.store === store);
                if (index > -1) {
                    disposables.splice(index, 1);
                }
                if (disposables.length === 0) {
                    this._callsByRequestId.delete(requestId);
                }
            }
        }
        store.dispose();
    }
    cancelToolCallsForRequest(requestId) {
        const calls = this._callsByRequestId.get(requestId);
        if (calls) {
            calls.forEach(call => call.store.dispose());
            this._callsByRequestId.delete(requestId);
        }
    }
    static { this.githubMCPServerAliases = ['github/github-mcp-server', 'io.github.github/github-mcp-server', 'github-mcp-server']; }
    static { this.playwrightMCPServerAliases = ['microsoft/playwright-mcp', 'com.microsoft/playwright-mcp']; }
    *getToolSetAliases(toolSet, fullReferenceName) {
        if (fullReferenceName !== toolSet.referenceName) {
            yield toolSet.referenceName; // tool set name without '/*'
        }
        if (toolSet.legacyFullNames) {
            yield* toolSet.legacyFullNames;
        }
        switch (toolSet.referenceName) {
            case 'github':
                for (const alias of LanguageModelToolsService_1.githubMCPServerAliases) {
                    yield alias + '/*';
                }
                break;
            case 'playwright':
                for (const alias of LanguageModelToolsService_1.playwrightMCPServerAliases) {
                    yield alias + '/*';
                }
                break;
            case SpecedToolAliases.execute: // 'execute'
                yield 'shell'; // legacy alias
                break;
            case SpecedToolAliases.agent: // 'agent'
                yield VSCodeToolReference.runSubagent; // prefer the tool set over th old tool name
                yield 'custom-agent'; // legacy alias
                break;
        }
    }
    *getToolAliases(toolSet, fullReferenceName) {
        const referenceName = toolSet.toolReferenceName ?? toolSet.displayName;
        if (fullReferenceName !== referenceName && referenceName !== VSCodeToolReference.runSubagent) {
            yield referenceName; // simple name, without toolset name
        }
        if (toolSet.legacyToolReferenceFullNames) {
            for (const legacyName of toolSet.legacyToolReferenceFullNames) {
                yield legacyName;
                const lastSlashIndex = legacyName.lastIndexOf('/');
                if (lastSlashIndex !== -1) {
                    yield legacyName.substring(lastSlashIndex + 1); // it was also known under the simple name
                }
            }
        }
        const slashIndex = fullReferenceName.lastIndexOf('/');
        if (slashIndex !== -1) {
            switch (fullReferenceName.substring(0, slashIndex)) {
                case 'github':
                    for (const alias of LanguageModelToolsService_1.githubMCPServerAliases) {
                        yield alias + fullReferenceName.substring(slashIndex);
                    }
                    break;
                case 'playwright':
                    for (const alias of LanguageModelToolsService_1.playwrightMCPServerAliases) {
                        yield alias + fullReferenceName.substring(slashIndex);
                    }
                    break;
            }
        }
    }
    /**
     * Create a map that contains all tools and toolsets with their enablement state.
     * @param fullReferenceNames A list of tool or toolset by their full reference names that are enabled.
     * @returns A map of tool or toolset instances to their enablement state.
     */
    toToolAndToolSetEnablementMap(fullReferenceNames, _target) {
        const toolOrToolSetNames = new Set(fullReferenceNames);
        const result = new Map();
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (tool instanceof ToolSet) {
                const enabled = toolOrToolSetNames.has(fullReferenceName) || Iterable.some(this.getToolSetAliases(tool, fullReferenceName), name => toolOrToolSetNames.has(name));
                result.set(tool, enabled);
                if (enabled) {
                    for (const memberTool of tool.getTools()) {
                        result.set(memberTool, true);
                    }
                }
            }
            else {
                if (!result.has(tool)) { // already set via an enabled toolset
                    const enabled = toolOrToolSetNames.has(fullReferenceName)
                        || Iterable.some(this.getToolAliases(tool, fullReferenceName), name => toolOrToolSetNames.has(name))
                        || !!tool.legacyToolReferenceFullNames?.some(toolFullName => {
                            // enable tool if just the legacy tool set name is present
                            const index = toolFullName.lastIndexOf('/');
                            return index !== -1 && toolOrToolSetNames.has(toolFullName.substring(0, index));
                        });
                    result.set(tool, enabled);
                }
            }
        }
        // also add all user tool sets (not part of the prompt referencable tools)
        for (const toolSet of this._toolSets) {
            if (toolSet.source.type === 'user') {
                const enabled = Iterable.every(toolSet.getTools(), t => result.get(t) === true);
                result.set(toolSet, enabled);
            }
        }
        return result;
    }
    toFullReferenceNames(map) {
        const result = [];
        const toolsCoveredByEnabledToolSet = new Set();
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (tool instanceof ToolSet) {
                if (map.get(tool)) {
                    result.push(fullReferenceName);
                    for (const memberTool of tool.getTools()) {
                        toolsCoveredByEnabledToolSet.add(memberTool);
                    }
                }
            }
            else {
                if (map.get(tool) && !toolsCoveredByEnabledToolSet.has(tool)) {
                    result.push(fullReferenceName);
                }
            }
        }
        return result;
    }
    toToolReferences(variableReferences) {
        const toolsOrToolSetByName = new Map();
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            toolsOrToolSetByName.set(fullReferenceName, tool);
        }
        const result = [];
        for (const ref of variableReferences) {
            const toolOrToolSet = toolsOrToolSetByName.get(ref.name);
            if (toolOrToolSet) {
                if (toolOrToolSet instanceof ToolSet) {
                    result.push(toToolSetVariableEntry(toolOrToolSet, ref.range));
                }
                else {
                    result.push(toToolVariableEntry(toolOrToolSet, ref.range));
                }
            }
        }
        return result;
    }
    getToolSet(id) {
        for (const toolSet of this._toolSets) {
            if (toolSet.id === id) {
                return toolSet;
            }
        }
        return undefined;
    }
    getToolSetByName(name) {
        for (const toolSet of this._toolSets) {
            if (toolSet.referenceName === name) {
                return toolSet;
            }
        }
        return undefined;
    }
    getSpecedToolSetName(referenceName) {
        if (LanguageModelToolsService_1.githubMCPServerAliases.includes(referenceName)) {
            return 'github';
        }
        if (LanguageModelToolsService_1.playwrightMCPServerAliases.includes(referenceName)) {
            return 'playwright';
        }
        return referenceName;
    }
    createToolSet(source, id, referenceName, options) {
        const that = this;
        referenceName = this.getSpecedToolSetName(referenceName);
        const result = new class extends ToolSet {
            dispose() {
                if (that._toolSets.has(result)) {
                    this._tools.clear();
                    that._toolSets.delete(result);
                }
            }
        }(id, referenceName, options?.icon ?? Codicon.tools, source, options?.description, options?.legacyFullNames);
        this._toolSets.add(result);
        return result;
    }
    *getFullReferenceNames() {
        for (const [, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            yield fullReferenceName;
        }
    }
    getDeprecatedFullReferenceNames() {
        const result = new Map();
        const knownToolSetNames = new Set();
        const add = (name, fullReferenceName) => {
            if (name !== fullReferenceName) {
                if (!result.has(name)) {
                    result.set(name, new Set());
                }
                result.get(name).add(fullReferenceName);
            }
        };
        for (const [tool, _] of this.toolsWithFullReferenceName.get()) {
            if (tool instanceof ToolSet) {
                knownToolSetNames.add(tool.referenceName);
                if (tool.legacyFullNames) {
                    for (const legacyName of tool.legacyFullNames) {
                        knownToolSetNames.add(legacyName);
                    }
                }
            }
        }
        for (const [tool, fullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (tool instanceof ToolSet) {
                for (const alias of this.getToolSetAliases(tool, fullReferenceName)) {
                    add(alias, fullReferenceName);
                }
            }
            else {
                for (const alias of this.getToolAliases(tool, fullReferenceName)) {
                    add(alias, fullReferenceName);
                }
                if (tool.legacyToolReferenceFullNames) {
                    for (const legacyName of tool.legacyToolReferenceFullNames) {
                        // for any 'orphaned' toolsets (toolsets that no longer exist and
                        // do not have an explicit legacy mapping), we should
                        // just point them to the list of tools directly
                        if (legacyName.includes('/')) {
                            const toolSetFullName = legacyName.substring(0, legacyName.lastIndexOf('/'));
                            if (!knownToolSetNames.has(toolSetFullName)) {
                                add(toolSetFullName, fullReferenceName);
                            }
                        }
                    }
                }
            }
        }
        return result;
    }
    getToolByFullReferenceName(fullReferenceName) {
        for (const [tool, toolFullReferenceName] of this.toolsWithFullReferenceName.get()) {
            if (fullReferenceName === toolFullReferenceName) {
                return tool;
            }
            const aliases = tool instanceof ToolSet ? this.getToolSetAliases(tool, toolFullReferenceName) : this.getToolAliases(tool, toolFullReferenceName);
            if (Iterable.some(aliases, alias => fullReferenceName === alias)) {
                return tool;
            }
        }
        return undefined;
    }
    getFullReferenceName(tool, toolSet) {
        if (tool instanceof ToolSet) {
            return getToolSetFullReferenceName(tool);
        }
        return getToolFullReferenceName(tool, toolSet);
    }
};
LanguageModelToolsService = LanguageModelToolsService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService),
    __param(3, IChatService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService),
    __param(9, IAccessibilitySignalService),
    __param(10, IStorageService),
    __param(11, ILanguageModelToolsConfirmationService)
], LanguageModelToolsService);
export { LanguageModelToolsService };
function getToolFullReferenceName(tool, toolSet) {
    const toolName = tool.toolReferenceName ?? tool.displayName;
    if (toolSet) {
        return `${toolSet.referenceName}/${toolName}`;
    }
    else if (tool.source.type === 'extension') {
        return `${tool.source.extensionId.value.toLowerCase()}/${toolName}`;
    }
    return toolName;
}
function getToolSetFullReferenceName(toolSet) {
    if (toolSet.source.type === 'mcp') {
        return `${toolSet.referenceName}/*`;
    }
    return toolSet.referenceName;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvbGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsSSxPQUFPLEVBQUUsT0FBTyxFQUF3Qix1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
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
import { timeout } from '../../../../../../../base/common/async.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { isObject, isString } from '../../../../../../../base/common/types.js';
import { localize } from '../../../../../../../nls.js';
import { ExtensionIdentifier } from '../../../../../../../platform/extensions/common/extensions.js';
import { IChatWidgetService } from '../../../../../chat/browser/chat.js';
import { ChatElicitationRequestPart } from '../../../../../chat/browser/chatElicitationRequestPart.js';
import { ChatModel } from '../../../../../chat/common/chatModel.js';
import { IChatService } from '../../../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../../../chat/common/constants.js';
import { ILanguageModelsService } from '../../../../../chat/common/languageModels.js';
import { ITaskService } from '../../../../../tasks/common/taskService.js';
import { OutputMonitorState } from './types.js';
import { getTextResponseFromStream } from './utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../../../platform/log/common/log.js';
import { ITerminalService } from '../../../../../terminal/browser/terminal.js';
import { LocalChatSessionUri } from '../../../../../chat/common/chatUri.js';
let OutputMonitor = class OutputMonitor extends Disposable {
    get state() { return this._state; }
    get pollingResult() { return this._pollingResult; }
    get outputMonitorTelemetryCounters() { return this._outputMonitorTelemetryCounters; }
    constructor(_execution, _pollFn, invocationContext, token, command, _languageModelsService, _taskService, _chatService, _chatWidgetService, _configurationService, _logService, _terminalService) {
        super();
        this._execution = _execution;
        this._pollFn = _pollFn;
        this._languageModelsService = _languageModelsService;
        this._taskService = _taskService;
        this._chatService = _chatService;
        this._chatWidgetService = _chatWidgetService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._state = OutputMonitorState.PollingForIdle;
        this._outputMonitorTelemetryCounters = {
            inputToolManualAcceptCount: 0,
            inputToolManualRejectCount: 0,
            inputToolManualChars: 0,
            inputToolAutoAcceptCount: 0,
            inputToolAutoChars: 0,
            inputToolManualShownCount: 0,
            inputToolFreeFormInputShownCount: 0,
            inputToolFreeFormInputCount: 0,
        };
        this._onDidFinishCommand = this._register(new Emitter());
        this.onDidFinishCommand = this._onDidFinishCommand.event;
        // Start async to ensure listeners are set up
        timeout(0).then(() => {
            this._startMonitoring(command, invocationContext, token);
        });
    }
    async _startMonitoring(command, invocationContext, token) {
        const pollStartTime = Date.now();
        let modelOutputEvalResponse;
        let resources;
        let output;
        let extended = false;
        try {
            while (!token.isCancellationRequested) {
                switch (this._state) {
                    case OutputMonitorState.PollingForIdle: {
                        this._state = await this._waitForIdle(this._execution, extended, token);
                        continue;
                    }
                    case OutputMonitorState.Timeout: {
                        const shouldContinuePolling = await this._handleTimeoutState(command, invocationContext, extended, token);
                        if (shouldContinuePolling) {
                            extended = true;
                            continue;
                        }
                        else {
                            this._promptPart?.hide();
                            this._promptPart = undefined;
                            break;
                        }
                    }
                    case OutputMonitorState.Cancelled:
                        break;
                    case OutputMonitorState.Idle: {
                        const idleResult = await this._handleIdleState(token);
                        if (idleResult.shouldContinuePollling) {
                            this._state = OutputMonitorState.PollingForIdle;
                            continue;
                        }
                        else {
                            resources = idleResult.resources;
                            modelOutputEvalResponse = idleResult.modelOutputEvalResponse;
                            output = idleResult.output;
                        }
                        break;
                    }
                }
                if (this._state === OutputMonitorState.Idle || this._state === OutputMonitorState.Cancelled || this._state === OutputMonitorState.Timeout) {
                    break;
                }
            }
            if (token.isCancellationRequested) {
                this._state = OutputMonitorState.Cancelled;
            }
        }
        finally {
            this._pollingResult = {
                state: this._state,
                output: output ?? this._execution.getOutput(),
                modelOutputEvalResponse: token.isCancellationRequested ? 'Cancelled' : modelOutputEvalResponse,
                pollDurationMs: Date.now() - pollStartTime,
                resources
            };
            const promptPart = this._promptPart;
            this._promptPart = undefined;
            if (promptPart) {
                try {
                    promptPart.hide();
                }
                catch (err) {
                    this._logService.error('OutputMonitor: Failed to hide prompt', err);
                }
            }
            this._onDidFinishCommand.fire();
        }
    }
    async _handleIdleState(token) {
        const output = this._execution.getOutput(this._lastPromptMarker);
        if (detectsNonInteractiveHelpPattern(output)) {
            return { shouldContinuePollling: false, output };
        }
        const confirmationPrompt = await this._determineUserInputOptions(this._execution, token);
        if (confirmationPrompt?.detectedRequestForFreeFormInput) {
            this._outputMonitorTelemetryCounters.inputToolFreeFormInputShownCount++;
            const receivedTerminalInput = await this._requestFreeFormTerminalInput(token, this._execution, confirmationPrompt);
            if (receivedTerminalInput) {
                // Small delay to ensure input is processed
                await timeout(200);
                // Continue polling as we sent the input
                return { shouldContinuePollling: true };
            }
            else {
                // User declined
                return { shouldContinuePollling: false };
            }
        }
        if (confirmationPrompt?.options.length) {
            const suggestedOptionResult = await this._selectAndHandleOption(confirmationPrompt, token);
            if (suggestedOptionResult?.sentToTerminal) {
                // Continue polling as we sent the input
                return { shouldContinuePollling: true };
            }
            const confirmed = await this._confirmRunInTerminal(token, suggestedOptionResult?.suggestedOption ?? confirmationPrompt.options[0], this._execution, confirmationPrompt);
            if (confirmed) {
                // Continue polling as we sent the input
                return { shouldContinuePollling: true };
            }
            else {
                // User declined
                this._execution.instance.focus(true);
                return { shouldContinuePollling: false };
            }
        }
        // Let custom poller override if provided
        const custom = await this._pollFn?.(this._execution, token, this._taskService);
        const resources = custom?.resources;
        const modelOutputEvalResponse = await this._assessOutputForErrors(this._execution.getOutput(), token);
        return { resources, modelOutputEvalResponse, shouldContinuePollling: false, output: custom?.output ?? output };
    }
    async _handleTimeoutState(command, invocationContext, extended, token) {
        let continuePollingPart;
        if (extended) {
            this._state = OutputMonitorState.Cancelled;
            return false;
        }
        extended = true;
        const { promise: p, part } = await this._promptForMorePolling(command, token, invocationContext);
        let continuePollingDecisionP = p;
        continuePollingPart = part;
        // Start another polling pass and race it against the user's decision
        const nextPollP = this._waitForIdle(this._execution, extended, token)
            .catch(() => ({
            state: OutputMonitorState.Cancelled,
            output: this._execution.getOutput(),
            modelOutputEvalResponse: 'Cancelled'
        }));
        const race = await Promise.race([
            continuePollingDecisionP.then(v => ({ kind: 'decision', v })),
            nextPollP.then(r => ({ kind: 'poll', r }))
        ]);
        if (race.kind === 'decision') {
            try {
                continuePollingPart?.hide();
            }
            catch { /* noop */ }
            continuePollingPart = undefined;
            // User explicitly declined to keep waiting, so finish with the timed-out result
            if (race.v === false) {
                this._state = OutputMonitorState.Cancelled;
                return false;
            }
            // User accepted; keep polling (the loop iterates again).
            // Clear the decision so we don't race on a resolved promise.
            continuePollingDecisionP = undefined;
            return true;
        }
        else {
            // A background poll completed while waiting for a decision
            const r = race.r;
            // r can be either an OutputMonitorState or an IPollingResult object (from catch)
            const state = (typeof r === 'object' && r !== null) ? r.state : r;
            if (state === OutputMonitorState.Idle || state === OutputMonitorState.Cancelled || state === OutputMonitorState.Timeout) {
                try {
                    continuePollingPart?.hide();
                }
                catch { /* noop */ }
                continuePollingPart = undefined;
                continuePollingDecisionP = undefined;
                this._promptPart = undefined;
                return false;
            }
            // Still timing out; loop and race again with the same prompt.
            return true;
        }
    }
    /**
     * Single bounded polling pass that returns when:
     *  - terminal becomes inactive/idle, or
     *  - timeout window elapses.
     */
    async _waitForIdle(execution, extendedPolling, token) {
        const maxWaitMs = extendedPolling ? 120000 /* PollingConsts.ExtendedPollingMaxDuration */ : 20000 /* PollingConsts.FirstPollingMaxDuration */;
        const maxInterval = 2000 /* PollingConsts.MaxPollingIntervalDuration */;
        let currentInterval = 500 /* PollingConsts.MinPollingDuration */;
        let waited = 0;
        let consecutiveIdleEvents = 0;
        let hasReceivedData = false;
        const onDataDisposable = execution.instance.onData((_data) => {
            hasReceivedData = true;
        });
        try {
            while (!token.isCancellationRequested && waited < maxWaitMs) {
                const waitTime = Math.min(currentInterval, maxWaitMs - waited);
                await timeout(waitTime, token);
                waited += waitTime;
                currentInterval = Math.min(currentInterval * 2, maxInterval);
                const currentOutput = execution.getOutput();
                if (detectsNonInteractiveHelpPattern(currentOutput)) {
                    this._state = OutputMonitorState.Idle;
                    return this._state;
                }
                const promptResult = detectsInputRequiredPattern(currentOutput);
                if (promptResult) {
                    this._state = OutputMonitorState.Idle;
                    return this._state;
                }
                if (hasReceivedData) {
                    consecutiveIdleEvents = 0;
                    hasReceivedData = false;
                }
                else {
                    consecutiveIdleEvents++;
                }
                const recentlyIdle = consecutiveIdleEvents >= 2 /* PollingConsts.MinIdleEvents */;
                const isActive = execution.isActive ? await execution.isActive() : undefined;
                this._logService.trace(`OutputMonitor: waitForIdle check: waited=${waited}ms, recentlyIdle=${recentlyIdle}, isActive=${isActive}`);
                if (recentlyIdle && isActive !== true) {
                    this._state = OutputMonitorState.Idle;
                    return this._state;
                }
            }
        }
        finally {
            onDataDisposable.dispose();
        }
        if (token.isCancellationRequested) {
            return OutputMonitorState.Cancelled;
        }
        return OutputMonitorState.Timeout;
    }
    async _promptForMorePolling(command, token, context) {
        if (token.isCancellationRequested || this._state === OutputMonitorState.Cancelled) {
            return { promise: Promise.resolve(false) };
        }
        const result = this._createElicitationPart(token, context?.sessionId, new MarkdownString(localize('poll.terminal.waiting', "Continue waiting for `{0}`?", command)), new MarkdownString(localize('poll.terminal.polling', "This will continue to poll for output to determine when the terminal becomes idle for up to 2 minutes.")), '', localize('poll.terminal.accept', 'Yes'), localize('poll.terminal.reject', 'No'), async () => true, async () => { this._state = OutputMonitorState.Cancelled; return false; });
        return { promise: result.promise.then(p => p ?? false), part: result.part };
    }
    async _assessOutputForErrors(buffer, token) {
        const model = await this._getLanguageModel();
        if (!model) {
            return 'No models available';
        }
        const response = await this._languageModelsService.sendChatRequest(model, new ExtensionIdentifier('core'), [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: `Evaluate this terminal output to determine if there were errors. If there are errors, return them. Otherwise, return undefined: ${buffer}.` }] }], {}, token);
        try {
            const responseFromStream = getTextResponseFromStream(response);
            await Promise.all([response.result, responseFromStream]);
            return await responseFromStream;
        }
        catch (err) {
            return 'Error occurred ' + err;
        }
    }
    async _determineUserInputOptions(execution, token) {
        if (token.isCancellationRequested) {
            return;
        }
        const model = await this._getLanguageModel();
        if (!model) {
            return undefined;
        }
        const lastLines = execution.getOutput(this._lastPromptMarker).trimEnd().split('\n').slice(-15).join('\n');
        if (detectsNonInteractiveHelpPattern(lastLines)) {
            return undefined;
        }
        const promptText = `Analyze the following terminal output. If it contains a prompt requesting user input (such as a confirmation, selection, or yes/no question) and that prompt has NOT already been answered, extract the prompt text. The prompt may ask to choose from a set. If so, extract the possible options as a JSON object with keys 'prompt', 'options' (an array of strings or an object with option to description mappings), and 'freeFormInput': false. If no options are provided, and free form input is requested, for example: Password:, return the word freeFormInput. For example, if the options are "[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [C] Cancel", the option to description mappings would be {"Y": "Yes", "A": "Yes to All", "N": "No", "L": "No to All", "C": "Cancel"}. If there is no such prompt, return null. If the option is ambiguous, return null.
			Examples:
			1. Output: "Do you want to overwrite? (y/n)"
				Response: {"prompt": "Do you want to overwrite?", "options": ["y", "n"], "freeFormInput": false}

			2. Output: "Confirm: [Y] Yes  [A] Yes to All  [N] No  [L] No to All  [C] Cancel"
				Response: {"prompt": "Confirm", "options": ["Y", "A", "N", "L", "C"], "freeFormInput": false}

			3. Output: "Accept license terms? (yes/no)"
				Response: {"prompt": "Accept license terms?", "options": ["yes", "no"], "freeFormInput": false}

			4. Output: "Press Enter to continue"
				Response: {"prompt": "Press Enter to continue", "options": ["Enter"], "freeFormInput": false}

			5. Output: "Type Yes to proceed"
				Response: {"prompt": "Type Yes to proceed", "options": ["Yes"], "freeFormInput": false}

			6. Output: "Continue [y/N]"
				Response: {"prompt": "Continue", "options": ["y", "N"], "freeFormInput": false}

			7. Output: "Press any key to close the terminal."
				Response: null

			8. Output: "Terminal will be reused by tasks, press any key to close it."
				Response: null

			9. Output: "Password:"
				Response: {"prompt": "Password:", "freeFormInput": true, "options": []}
			10. Output: "press ctrl-c to detach, ctrl-d to kill"
				Response: null

			Alternatively, the prompt may request free form input, for example:
			1. Output: "Enter your username:"
				Response: {"prompt": "Enter your username:", "freeFormInput": true, "options": []}
			2. Output: "Password:"
				Response: {"prompt": "Password:", "freeFormInput": true, "options": []}
			Now, analyze this output:
			${lastLines}
			`;
        const response = await this._languageModelsService.sendChatRequest(model, new ExtensionIdentifier('core'), [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: promptText }] }], {}, token);
        const responseText = await getTextResponseFromStream(response);
        try {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                const obj = JSON.parse(match[0]);
                if (isObject(obj) &&
                    'prompt' in obj && isString(obj.prompt) &&
                    'options' in obj &&
                    'options' in obj &&
                    'freeFormInput' in obj && typeof obj.freeFormInput === 'boolean') {
                    if (this._lastPrompt === obj.prompt) {
                        return;
                    }
                    if (obj.freeFormInput === true) {
                        return { prompt: obj.prompt, options: [], detectedRequestForFreeFormInput: true };
                    }
                    if (Array.isArray(obj.options) && obj.options.every(isString)) {
                        return { prompt: obj.prompt, options: obj.options, detectedRequestForFreeFormInput: obj.freeFormInput };
                    }
                    else if (isObject(obj.options) && Object.values(obj.options).every(isString)) {
                        const keys = Object.keys(obj.options);
                        if (keys.length === 0) {
                            return undefined;
                        }
                        const descriptions = keys.map(key => obj.options[key]);
                        return { prompt: obj.prompt, options: keys, descriptions, detectedRequestForFreeFormInput: obj.freeFormInput };
                    }
                }
            }
        }
        catch (err) {
            console.error('Failed to parse confirmation prompt from language model response:', err);
        }
        return undefined;
    }
    async _selectAndHandleOption(confirmationPrompt, token) {
        if (!confirmationPrompt?.options.length) {
            return undefined;
        }
        const model = this._chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Chat)[0]?.input.currentLanguageModel;
        if (!model) {
            return undefined;
        }
        const models = await this._languageModelsService.selectLanguageModels({ vendor: 'copilot', family: model.replaceAll('copilot/', '') });
        if (!models.length) {
            return undefined;
        }
        const prompt = confirmationPrompt.prompt;
        const options = confirmationPrompt.options;
        const currentMarker = this._execution.instance.registerMarker();
        if (!currentMarker) {
            // Unable to register marker, so cannot track prompt location
            return undefined;
        }
        this._lastPromptMarker = currentMarker;
        this._lastPrompt = prompt;
        const promptText = `Given the following confirmation prompt and options from a terminal output, which option is the default?\nPrompt: "${prompt}"\nOptions: ${JSON.stringify(options)}\nRespond with only the option string.`;
        const response = await this._languageModelsService.sendChatRequest(models[0], new ExtensionIdentifier('core'), [
            { role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: promptText }] }
        ], {}, token);
        const suggestedOption = (await getTextResponseFromStream(response)).trim();
        if (!suggestedOption) {
            return;
        }
        const parsed = suggestedOption.replace(/['"`]/g, '').trim();
        const index = confirmationPrompt.options.indexOf(parsed);
        const validOption = confirmationPrompt.options.find(opt => parsed === opt.replace(/['"`]/g, '').trim());
        if (!validOption || index === -1) {
            return;
        }
        let sentToTerminal = false;
        if (this._configurationService.getValue("chat.tools.terminal.autoReplyToPrompts" /* TerminalChatAgentToolsSettingId.AutoReplyToPrompts */)) {
            await this._execution.instance.sendText(validOption, true);
            this._outputMonitorTelemetryCounters.inputToolAutoAcceptCount++;
            this._outputMonitorTelemetryCounters.inputToolAutoChars += validOption?.length || 0;
            sentToTerminal = true;
        }
        const description = confirmationPrompt.descriptions?.[index];
        return description ? { suggestedOption: { description, option: validOption }, sentToTerminal } : { suggestedOption: validOption, sentToTerminal };
    }
    async _requestFreeFormTerminalInput(token, execution, confirmationPrompt) {
        const focusTerminalSelection = Symbol('focusTerminalSelection');
        const { promise: userPrompt, part } = this._createElicitationPart(token, execution.sessionId, new MarkdownString(localize('poll.terminal.inputRequest', "The terminal is awaiting input.")), new MarkdownString(localize('poll.terminal.requireInput', "{0}\nPlease provide the required input to the terminal.\n\n", confirmationPrompt.prompt)), '', localize('poll.terminal.enterInput', 'Focus terminal'), undefined, () => {
            this._showInstance(execution.instance.instanceId);
            return focusTerminalSelection;
        });
        let inputDataDisposable = Disposable.None;
        let instanceDisposedDisposable = Disposable.None;
        const inputPromise = new Promise(resolve => {
            let settled = false;
            const settle = (value, state) => {
                if (settled) {
                    return;
                }
                settled = true;
                part.hide();
                inputDataDisposable.dispose();
                instanceDisposedDisposable.dispose();
                this._state = state;
                resolve(value);
            };
            inputDataDisposable = this._register(execution.instance.onDidInputData((data) => {
                if (!data || data === '\r' || data === '\n' || data === '\r\n') {
                    this._outputMonitorTelemetryCounters.inputToolFreeFormInputCount++;
                    settle(true, OutputMonitorState.PollingForIdle);
                }
            }));
            instanceDisposedDisposable = this._register(execution.instance.onDisposed(() => {
                settle(false, OutputMonitorState.Cancelled);
            }));
        });
        const disposeListeners = () => {
            inputDataDisposable.dispose();
            instanceDisposedDisposable.dispose();
        };
        const result = await Promise.race([userPrompt, inputPromise]);
        if (result === focusTerminalSelection) {
            execution.instance.focus(true);
            return await inputPromise;
        }
        if (result === undefined) {
            disposeListeners();
            // Prompt was dismissed without providing input
            return false;
        }
        disposeListeners();
        return !!result;
    }
    async _confirmRunInTerminal(token, suggestedOption, execution, confirmationPrompt) {
        const suggestedOptionValue = isString(suggestedOption) ? suggestedOption : suggestedOption.option;
        if (suggestedOptionValue === 'any key') {
            return;
        }
        const focusTerminalSelection = Symbol('focusTerminalSelection');
        let inputDataDisposable = Disposable.None;
        let instanceDisposedDisposable = Disposable.None;
        const { promise: userPrompt, part } = this._createElicitationPart(token, execution.sessionId, new MarkdownString(localize('poll.terminal.confirmRequired', "The terminal is awaiting input.")), new MarkdownString(localize('poll.terminal.confirmRunDetail', "{0}\n Do you want to send `{1}`{2} followed by `Enter` to the terminal?", confirmationPrompt.prompt, suggestedOptionValue, isString(suggestedOption) ? '' : suggestedOption.description ? ' (' + suggestedOption.description + ')' : '')), '', localize('poll.terminal.acceptRun', 'Allow'), localize('poll.terminal.rejectRun', 'Focus Terminal'), async (value) => {
            let option = undefined;
            if (value === true) {
                option = suggestedOptionValue;
            }
            else if (typeof value === 'object' && 'label' in value) {
                option = value.label.split(' (')[0];
            }
            this._outputMonitorTelemetryCounters.inputToolManualAcceptCount++;
            this._outputMonitorTelemetryCounters.inputToolManualChars += option?.length || 0;
            return option;
        }, () => {
            this._showInstance(execution.instance.instanceId);
            this._outputMonitorTelemetryCounters.inputToolManualRejectCount++;
            return focusTerminalSelection;
        }, getMoreActions(suggestedOption, confirmationPrompt));
        const inputPromise = new Promise(resolve => {
            let settled = false;
            const settle = (value, state) => {
                if (settled) {
                    return;
                }
                settled = true;
                part.hide();
                inputDataDisposable.dispose();
                instanceDisposedDisposable.dispose();
                this._state = state;
                resolve(value);
            };
            inputDataDisposable = this._register(execution.instance.onDidInputData(() => {
                settle(true, OutputMonitorState.PollingForIdle);
            }));
            instanceDisposedDisposable = this._register(execution.instance.onDisposed(() => {
                settle(false, OutputMonitorState.Cancelled);
            }));
        });
        const disposeListeners = () => {
            inputDataDisposable.dispose();
            instanceDisposedDisposable.dispose();
        };
        const optionToRun = await Promise.race([userPrompt, inputPromise]);
        if (optionToRun === focusTerminalSelection) {
            execution.instance.focus(true);
            return await inputPromise;
        }
        if (optionToRun === true) {
            disposeListeners();
            return true;
        }
        if (typeof optionToRun === 'string' && optionToRun.length) {
            execution.instance.focus(true);
            disposeListeners();
            await execution.instance.sendText(optionToRun, true);
            return optionToRun;
        }
        disposeListeners();
        return optionToRun;
    }
    _showInstance(instanceId) {
        if (!instanceId) {
            return;
        }
        const instance = this._terminalService.getInstanceFromId(instanceId);
        if (!instance) {
            return;
        }
        this._terminalService.setActiveInstance(instance);
        this._terminalService.revealActiveTerminal(true);
    }
    // Helper to create, register, and wire a ChatElicitationRequestPart. Returns the promise that
    // resolves when the part is accepted/rejected and the registered part itself so callers can
    // attach additional listeners (e.g., onDidRequestHide) or compose with other promises.
    _createElicitationPart(token, sessionId, title, detail, subtitle, acceptLabel, rejectLabel, onAccept, onReject, moreActions) {
        const chatModel = sessionId && this._chatService.getSession(LocalChatSessionUri.forSession(sessionId));
        if (!(chatModel instanceof ChatModel)) {
            throw new Error('No model');
        }
        const request = chatModel.getRequests().at(-1);
        if (!request) {
            throw new Error('No request');
        }
        let part;
        const promise = new Promise(resolve => {
            const thePart = part = this._register(new ChatElicitationRequestPart(title, detail, subtitle, acceptLabel, rejectLabel, async (value) => {
                thePart.hide();
                this._promptPart = undefined;
                try {
                    const r = await (onAccept ? onAccept(value) : undefined);
                    resolve(r);
                }
                catch {
                    resolve(undefined);
                }
                return "accepted" /* ElicitationState.Accepted */;
            }, async () => {
                thePart.hide();
                this._promptPart = undefined;
                try {
                    const r = await (onReject ? onReject() : undefined);
                    resolve(r);
                }
                catch {
                    resolve(undefined);
                }
                return "rejected" /* ElicitationState.Rejected */;
            }, undefined, // source
            moreActions, () => this._outputMonitorTelemetryCounters.inputToolManualShownCount++));
            chatModel.acceptResponseProgress(request, thePart);
            this._promptPart = thePart;
        });
        this._register(token.onCancellationRequested(() => part.hide()));
        return { promise, part };
    }
    async _getLanguageModel() {
        let models = await this._languageModelsService.selectLanguageModels({ vendor: 'copilot', id: 'copilot-fast' });
        // Fallback to gpt-4o-mini if copilot-fast is not available for backwards compatibility
        if (!models.length) {
            models = await this._languageModelsService.selectLanguageModels({ vendor: 'copilot', family: 'gpt-4o-mini' });
        }
        return models.length ? models[0] : undefined;
    }
};
OutputMonitor = __decorate([
    __param(5, ILanguageModelsService),
    __param(6, ITaskService),
    __param(7, IChatService),
    __param(8, IChatWidgetService),
    __param(9, IConfigurationService),
    __param(10, ILogService),
    __param(11, ITerminalService)
], OutputMonitor);
export { OutputMonitor };
function getMoreActions(suggestedOption, confirmationPrompt) {
    const moreActions = [];
    const moreOptions = confirmationPrompt.options.filter(a => a !== (isString(suggestedOption) ? suggestedOption : suggestedOption.option));
    let i = 0;
    for (const option of moreOptions) {
        const label = option + (confirmationPrompt.descriptions ? ' (' + confirmationPrompt.descriptions[i] + ')' : '');
        const action = {
            label,
            tooltip: label,
            id: `terminal.poll.send.${option}`,
            class: undefined,
            enabled: true,
            run: async () => { }
        };
        i++;
        moreActions.push(action);
    }
    return moreActions.length ? moreActions : undefined;
}
export function detectsInputRequiredPattern(cursorLine) {
    return [
        // PowerShell-style multi-option line (supports [?] Help and optional default suffix) ending
        // in whitespace
        /\s*(?:\[[^\]]\]\s+[^\[\s][^\[]*\s*)+(?:\(default is\s+"[^"]+"\):)?\s+$/,
        // Bracketed/parenthesized yes/no pairs at end of line: (y/n), [Y/n], (yes/no), [no/yes]
        /(?:\(|\[)\s*(?:y(?:es)?\s*\/\s*n(?:o)?|n(?:o)?\s*\/\s*y(?:es)?)\s*(?:\]|\))\s+$/i,
        // Same as above but allows a preceding '?' or ':' and optional wrappers e.g.
        // "Continue? (y/n)" or "Overwrite: [yes/no]"
        /[?:]\s*(?:\(|\[)?\s*y(?:es)?\s*\/\s*n(?:o)?\s*(?:\]|\))?\s+$/i,
        // Confirmation prompts ending with (y) e.g. "Ok to proceed? (y)"
        /\(y\)\s*$/i,
        // Line ends with ':'
        /:\s*$/,
        // Line contains (END) which is common in pagers
        /\(END\)$/,
        // Password prompt
        /password[:]?$/i,
        // Line ends with '?'
        /\?\s*(?:\([a-z\s]+\))?$/i,
        // "Press a key" or "Press any key"
        /press a(?:ny)? key/i,
    ].some(e => e.test(cursorLine));
}
export function detectsNonInteractiveHelpPattern(cursorLine) {
    return [
        /press [h?]\s*(?:\+\s*enter)?\s*to (?:show|open|display|get|see)\s*(?:available )?(?:help|commands|options)/i,
        /press h\s*(?:or\s*\?)?\s*(?:\+\s*enter)?\s*for (?:help|commands|options)/i,
        /press \?\s*(?:\+\s*enter)?\s*(?:to|for)?\s*(?:help|commands|options|list)/i,
        /type\s*[h?]\s*(?:\+\s*enter)?\s*(?:for|to see|to show)\s*(?:help|commands|options)/i,
        /hit\s*[h?]\s*(?:\+\s*enter)?\s*(?:for|to see|to show)\s*(?:help|commands|options)/i,
        /press o\s*(?:\+\s*enter)?\s*(?:to|for)?\s*(?:open|launch)(?:\s*(?:the )?(?:app|application|browser)|\s+in\s+(?:the\s+)?browser)?/i,
        /press r\s*(?:\+\s*enter)?\s*(?:to|for)?\s*(?:restart|reload|refresh)(?:\s*(?:the )?(?:server|dev server|service))?/i,
        /press q\s*(?:\+\s*enter)?\s*(?:to|for)?\s*(?:quit|exit|stop)(?:\s*(?:the )?(?:server|app|process))?/i,
        /press u\s*(?:\+\s*enter)?\s*(?:to|for)?\s*(?:show|print|display)\s*(?:the )?(?:server )?urls?/i
    ].some(e => e.test(cursorLine));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy9tb25pdG9yaW5nL291dHB1dE1vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBcUIsTUFBTSwyQ0FBMkMsQ0FBQztBQUV2RixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQW9CLE1BQU0sK0NBQStDLENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBb0IsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFtQixzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXZHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRSxPQUFPLEVBQW1ELGtCQUFrQixFQUFp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
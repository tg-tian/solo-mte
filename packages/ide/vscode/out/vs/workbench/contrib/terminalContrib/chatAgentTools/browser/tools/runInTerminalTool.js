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
var RunInTerminalTool_1;
import { timeout } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../../base/common/path.js';
import { OS } from '../../../../../../base/common/platform.js';
import { count } from '../../../../../../base/common/strings.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { IRemoteAgentService } from '../../../../../services/remote/common/remoteAgentService.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { ILanguageModelToolsService, ToolDataSource, ToolInvocationPresentation } from '../../../../chat/common/languageModelToolsService.js';
import { ITerminalChatService, ITerminalService } from '../../../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../../../terminal/common/terminal.js';
import { getRecommendedToolsOverRunInTerminal } from '../alternativeRecommendation.js';
import { BasicExecuteStrategy } from '../executeStrategy/basicExecuteStrategy.js';
import { NoneExecuteStrategy } from '../executeStrategy/noneExecuteStrategy.js';
import { RichExecuteStrategy } from '../executeStrategy/richExecuteStrategy.js';
import { getOutput } from '../outputHelpers.js';
import { isFish, isPowerShell, isWindowsPowerShell, isZsh } from '../runInTerminalHelpers.js';
import { RunInTerminalToolTelemetry } from '../runInTerminalToolTelemetry.js';
import { ToolTerminalCreator } from '../toolTerminalCreator.js';
import { TreeSitterCommandParser } from '../treeSitterCommandParser.js';
import { CommandLineAutoApproveAnalyzer } from './commandLineAnalyzer/commandLineAutoApproveAnalyzer.js';
import { CommandLineFileWriteAnalyzer } from './commandLineAnalyzer/commandLineFileWriteAnalyzer.js';
import { OutputMonitor } from './monitoring/outputMonitor.js';
import { OutputMonitorState } from './monitoring/types.js';
import { LocalChatSessionUri } from '../../../../chat/common/chatUri.js';
import { CommandLineCdPrefixRewriter } from './commandLineRewriter/commandLineCdPrefixRewriter.js';
import { CommandLinePwshChainOperatorRewriter } from './commandLineRewriter/commandLinePwshChainOperatorRewriter.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../../../../services/history/common/history.js';
import { TerminalCommandArtifactCollector } from './terminalCommandArtifactCollector.js';
import { isNumber, isString } from '../../../../../../base/common/types.js';
import { ChatConfiguration } from '../../../../chat/common/constants.js';
import { IChatWidgetService } from '../../../../chat/browser/chat.js';
// #region Tool data
const TOOL_REFERENCE_NAME = 'runInTerminal';
const LEGACY_TOOL_REFERENCE_FULL_NAMES = ['runCommands/runInTerminal'];
function createPowerShellModelDescription(shell) {
    const isWinPwsh = isWindowsPowerShell(shell);
    return [
        `This tool allows you to execute ${isWinPwsh ? 'Windows PowerShell 5.1' : 'PowerShell'} commands in a persistent terminal session, preserving environment variables, working directory, and other context across multiple commands.`,
        '',
        'Command Execution:',
        // IMPORTANT: PowerShell 5 does not support `&&` so always re-write them to `;`. Note that
        // the behavior of `&&` differs a little from `;` but in general it's fine
        isWinPwsh ? '- Use semicolons ; to chain commands on one line, NEVER use && even when asked explicitly' : '- Prefer ; when chaining commands on one line',
        '- Prefer pipelines | for object-based data flow',
        '- Never create a sub-shell (eg. powershell -c "command") unless explicitly asked',
        '',
        'Directory Management:',
        '- Must use absolute paths to avoid navigation issues',
        '- Use $PWD or Get-Location for current directory',
        '- Use Push-Location/Pop-Location for directory stack',
        '',
        'Program Execution:',
        '- Supports .NET, Python, Node.js, and other executables',
        '- Install modules via Install-Module, Install-Package',
        '- Use Get-Command to verify cmdlet/function availability',
        '',
        'Background Processes:',
        '- For long-running tasks (e.g., servers), set isBackground=true',
        '- Returns a terminal ID for checking status and runtime later',
        '- Use Start-Job for background PowerShell jobs',
        '',
        'Output Management:',
        '- Output is automatically truncated if longer than 60KB to prevent context overflow',
        '- Use Select-Object, Where-Object, Format-Table to filter output',
        '- Use -First/-Last parameters to limit results',
        '- For pager commands, add | Out-String or | Format-List',
        '',
        'Best Practices:',
        '- Use proper cmdlet names instead of aliases in scripts',
        '- Quote paths with spaces: "C:\\Path With Spaces"',
        '- Prefer PowerShell cmdlets over external commands when available',
        '- Prefer idiomatic PowerShell like Get-ChildItem instead of dir or ls for file listings',
        '- Use Test-Path to check file/directory existence',
        '- Be specific with Select-Object properties to avoid excessive output',
        '- Avoid printing credentials unless absolutely required',
    ].join('\n');
}
const genericDescription = `
Command Execution:
- Use && to chain simple commands on one line
- Prefer pipelines | over temporary files for data flow
- Never create a sub-shell (eg. bash -c "command") unless explicitly asked

Directory Management:
- Must use absolute paths to avoid navigation issues
- Use $PWD for current directory references
- Consider using pushd/popd for directory stack management
- Supports directory shortcuts like ~ and -

Program Execution:
- Supports Python, Node.js, and other executables
- Install packages via package managers (brew, apt, etc.)
- Use which or command -v to verify command availability

Background Processes:
- For long-running tasks (e.g., servers), set isBackground=true
- Returns a terminal ID for checking status and runtime later

Output Management:
- Output is automatically truncated if longer than 60KB to prevent context overflow
- Use head, tail, grep, awk to filter and limit output size
- For pager commands, disable paging: git --no-pager or add | cat
- Use wc -l to count lines before displaying large outputs

Best Practices:
- Quote variables: "$var" instead of $var to handle spaces
- Use find with -exec or xargs for file operations
- Be specific with commands to avoid excessive output
- Avoid printing credentials unless absolutely required`;
function createBashModelDescription() {
    return [
        'This tool allows you to execute shell commands in a persistent bash terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        genericDescription,
        '- Use [[ ]] for conditional tests instead of [ ]',
        '- Prefer $() over backticks for command substitution',
        '- Use set -e at start of complex commands to exit on errors'
    ].join('\n');
}
function createZshModelDescription() {
    return [
        'This tool allows you to execute shell commands in a persistent zsh terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        genericDescription,
        '- Use type to check command type (builtin, function, alias)',
        '- Use jobs, fg, bg for job control',
        '- Use [[ ]] for conditional tests instead of [ ]',
        '- Prefer $() over backticks for command substitution',
        '- Use setopt errexit for strict error handling',
        '- Take advantage of zsh globbing features (**, extended globs)'
    ].join('\n');
}
function createFishModelDescription() {
    return [
        'This tool allows you to execute shell commands in a persistent fish terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        genericDescription,
        '- Use type to check command type (builtin, function, alias)',
        '- Use jobs, fg, bg for job control',
        '- Use test expressions for conditionals (no [[ ]] syntax)',
        '- Prefer command substitution with () syntax',
        '- Variables are arrays by default, use $var[1] for first element',
        '- Use set -e for strict error handling',
        '- Take advantage of fish\'s autosuggestions and completions'
    ].join('\n');
}
export async function createRunInTerminalToolData(accessor) {
    const instantiationService = accessor.get(IInstantiationService);
    const profileFetcher = instantiationService.createInstance(TerminalProfileFetcher);
    const shell = await profileFetcher.getCopilotShell();
    const os = await profileFetcher.osBackend;
    let modelDescription;
    if (shell && os && isPowerShell(shell, os)) {
        modelDescription = createPowerShellModelDescription(shell);
    }
    else if (shell && os && isZsh(shell, os)) {
        modelDescription = createZshModelDescription();
    }
    else if (shell && os && isFish(shell, os)) {
        modelDescription = createFishModelDescription();
    }
    else {
        modelDescription = createBashModelDescription();
    }
    return {
        id: 'run_in_terminal',
        toolReferenceName: TOOL_REFERENCE_NAME,
        legacyToolReferenceFullNames: LEGACY_TOOL_REFERENCE_FULL_NAMES,
        displayName: localize('runInTerminalTool.displayName', 'Run in Terminal'),
        modelDescription,
        userDescription: localize('runInTerminalTool.userDescription', 'Run commands in the terminal'),
        source: ToolDataSource.Internal,
        icon: Codicon.terminal,
        inputSchema: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The command to run in the terminal.'
                },
                explanation: {
                    type: 'string',
                    description: 'A one-sentence description of what the command does. This will be shown to the user before the command is run.'
                },
                isBackground: {
                    type: 'boolean',
                    description: 'Whether the command starts a background process. If true, the command will run in the background and you will not see the output. If false, the tool call will block on the command finishing, and then you will get the output. Examples of background processes: building in watch mode, starting a server. You can check the output of a background process later on by using get_terminal_output.'
                },
            },
            required: [
                'command',
                'explanation',
                'isBackground',
            ]
        }
    };
}
// #endregion
// #region Tool implementation
var TerminalToolStorageKeysInternal;
(function (TerminalToolStorageKeysInternal) {
    TerminalToolStorageKeysInternal["TerminalSession"] = "chat.terminalSessions";
})(TerminalToolStorageKeysInternal || (TerminalToolStorageKeysInternal = {}));
/**
 * A set of characters to ignore when reporting telemetry
 */
const telemetryIgnoredSequences = [
    '\x1b[I', // Focus in
    '\x1b[O', // Focus out
];
const altBufferMessage = localize('runInTerminalTool.altBufferMessage', "The command opened the alternate buffer.");
let RunInTerminalTool = class RunInTerminalTool extends Disposable {
    static { RunInTerminalTool_1 = this; }
    static { this._backgroundExecutions = new Map(); }
    static getBackgroundOutput(id) {
        const backgroundExecution = RunInTerminalTool_1._backgroundExecutions.get(id);
        if (!backgroundExecution) {
            throw new Error('Invalid terminal ID');
        }
        return backgroundExecution.getOutput();
    }
    constructor(_chatService, _configurationService, _historyService, _instantiationService, _languageModelToolsService, _remoteAgentService, _storageService, _terminalChatService, _logService, _terminalService, _workspaceContextService, _chatWidgetService) {
        super();
        this._chatService = _chatService;
        this._configurationService = _configurationService;
        this._historyService = _historyService;
        this._instantiationService = _instantiationService;
        this._languageModelToolsService = _languageModelToolsService;
        this._remoteAgentService = _remoteAgentService;
        this._storageService = _storageService;
        this._terminalChatService = _terminalChatService;
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._workspaceContextService = _workspaceContextService;
        this._chatWidgetService = _chatWidgetService;
        this._sessionTerminalAssociations = new Map();
        this._osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
        this._terminalToolCreator = this._instantiationService.createInstance(ToolTerminalCreator);
        this._treeSitterCommandParser = this._register(this._instantiationService.createInstance(TreeSitterCommandParser));
        this._telemetry = this._instantiationService.createInstance(RunInTerminalToolTelemetry);
        this._commandArtifactCollector = this._instantiationService.createInstance(TerminalCommandArtifactCollector);
        this._profileFetcher = this._instantiationService.createInstance(TerminalProfileFetcher);
        this._commandLineRewriters = [
            this._register(this._instantiationService.createInstance(CommandLineCdPrefixRewriter)),
            this._register(this._instantiationService.createInstance(CommandLinePwshChainOperatorRewriter, this._treeSitterCommandParser)),
        ];
        this._commandLineAnalyzers = [
            this._register(this._instantiationService.createInstance(CommandLineFileWriteAnalyzer, this._treeSitterCommandParser, (message, args) => this._logService.info(`RunInTerminalTool#CommandLineFileWriteAnalyzer: ${message}`, args))),
            this._register(this._instantiationService.createInstance(CommandLineAutoApproveAnalyzer, this._treeSitterCommandParser, this._telemetry, (message, args) => this._logService.info(`RunInTerminalTool#CommandLineAutoApproveAnalyzer: ${message}`, args))),
        ];
        // Clear out warning accepted state if the setting is disabled
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */)) {
                if (this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) !== true) {
                    this._storageService.remove("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */);
                }
            }
        }));
        // Restore terminal associations from storage
        this._restoreTerminalAssociations();
        this._register(this._terminalService.onDidDisposeInstance(e => {
            for (const [sessionId, toolTerminal] of this._sessionTerminalAssociations.entries()) {
                if (e === toolTerminal.instance) {
                    this._sessionTerminalAssociations.delete(sessionId);
                }
            }
        }));
        // Listen for chat session disposal to clean up associated terminals
        this._register(this._chatService.onDidDisposeSession(e => {
            for (const resource of e.sessionResource) {
                const localSessionId = LocalChatSessionUri.parseLocalSessionId(resource);
                if (localSessionId) {
                    this._cleanupSessionTerminals(localSessionId);
                }
            }
        }));
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const instance = context.chatSessionId ? this._sessionTerminalAssociations.get(context.chatSessionId)?.instance : undefined;
        const [os, shell, cwd] = await Promise.all([
            this._osBackend,
            this._profileFetcher.getCopilotShell(),
            (async () => {
                let cwd = await instance?.getCwdResource();
                if (!cwd) {
                    const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
                    const workspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
                    cwd = workspaceFolder?.uri;
                }
                return cwd;
            })()
        ]);
        const language = os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'sh';
        const terminalToolSessionId = generateUuid();
        // Generate a custom command ID to link the command between renderer and pty host
        const terminalCommandId = `tool-${generateUuid()}`;
        let rewrittenCommand = args.command;
        for (const rewriter of this._commandLineRewriters) {
            const rewriteResult = await rewriter.rewrite({
                commandLine: rewrittenCommand,
                cwd,
                shell,
                os
            });
            if (rewriteResult) {
                rewrittenCommand = rewriteResult.rewritten;
                this._logService.info(`RunInTerminalTool: Command rewritten by ${rewriter.constructor.name}: ${rewriteResult.reasoning}`);
            }
        }
        const toolSpecificData = {
            kind: 'terminal',
            terminalToolSessionId,
            terminalCommandId,
            commandLine: {
                original: args.command,
                toolEdited: rewrittenCommand === args.command ? undefined : rewrittenCommand
            },
            language,
        };
        // HACK: Exit early if there's an alternative recommendation, this is a little hacky but
        // it's the current mechanism for re-routing terminal tool calls to something else.
        const alternativeRecommendation = getRecommendedToolsOverRunInTerminal(args.command, this._languageModelToolsService);
        if (alternativeRecommendation) {
            toolSpecificData.alternativeRecommendation = alternativeRecommendation;
            return {
                confirmationMessages: undefined,
                presentation: ToolInvocationPresentation.Hidden,
                toolSpecificData,
            };
        }
        // Determine auto approval, this happens even when auto approve is off to that reasoning
        // can be reviewed in the terminal channel. It also allows gauging the effective set of
        // commands that would be auto approved if it were enabled.
        const commandLine = rewrittenCommand ?? args.command;
        const isEligibleForAutoApproval = () => {
            const config = this._configurationService.getValue(ChatConfiguration.EligibleForAutoApproval);
            if (config && typeof config === 'object') {
                if (Object.prototype.hasOwnProperty.call(config, TOOL_REFERENCE_NAME)) {
                    return config[TOOL_REFERENCE_NAME];
                }
                for (const legacyName of LEGACY_TOOL_REFERENCE_FULL_NAMES) {
                    if (Object.prototype.hasOwnProperty.call(config, legacyName)) {
                        return config[legacyName];
                    }
                }
            }
            // Default
            return true;
        };
        const isAutoApproveEnabled = this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) === true;
        const isAutoApproveWarningAccepted = this._storageService.getBoolean("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */, false);
        const isAutoApproveAllowed = isEligibleForAutoApproval() && isAutoApproveEnabled && isAutoApproveWarningAccepted;
        const commandLineAnalyzerOptions = {
            commandLine,
            cwd,
            os,
            shell,
            treeSitterLanguage: isPowerShell(shell, os) ? "powershell" /* TreeSitterCommandParserLanguage.PowerShell */ : "bash" /* TreeSitterCommandParserLanguage.Bash */,
            terminalToolSessionId,
            chatSessionId: context.chatSessionId,
        };
        const commandLineAnalyzerResults = await Promise.all(this._commandLineAnalyzers.map(e => e.analyze(commandLineAnalyzerOptions)));
        const disclaimersRaw = commandLineAnalyzerResults.filter(e => e.disclaimers).flatMap(e => e.disclaimers);
        let disclaimer;
        if (disclaimersRaw.length > 0) {
            disclaimer = new MarkdownString(`$(${Codicon.info.id}) ` + disclaimersRaw.join(' '), { supportThemeIcons: true });
        }
        const analyzersIsAutoApproveAllowed = commandLineAnalyzerResults.every(e => e.isAutoApproveAllowed);
        const customActions = isEligibleForAutoApproval() && analyzersIsAutoApproveAllowed ? commandLineAnalyzerResults.map(e => e.customActions ?? []).flat() : undefined;
        let shellType = basename(shell, '.exe');
        if (shellType === 'powershell') {
            shellType = 'pwsh';
        }
        const isFinalAutoApproved = (
        // Is the setting enabled and the user has opted-in
        isAutoApproveAllowed &&
            // Does at least one analyzer auto approve
            commandLineAnalyzerResults.some(e => e.isAutoApproved) &&
            // No analyzer denies auto approval
            commandLineAnalyzerResults.every(e => e.isAutoApproved !== false) &&
            // All analyzers allow auto approval
            analyzersIsAutoApproveAllowed);
        if (isFinalAutoApproved) {
            toolSpecificData.autoApproveInfo = commandLineAnalyzerResults.find(e => e.autoApproveInfo)?.autoApproveInfo;
        }
        const confirmationMessages = isFinalAutoApproved ? undefined : {
            title: args.isBackground
                ? localize('runInTerminal.background', "Run `{0}` command? (background terminal)", shellType)
                : localize('runInTerminal', "Run `{0}` command?", shellType),
            message: new MarkdownString(args.explanation),
            disclaimer,
            terminalCustomActions: customActions,
        };
        return {
            confirmationMessages,
            toolSpecificData,
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const toolSpecificData = invocation.toolSpecificData;
        if (!toolSpecificData) {
            throw new Error('toolSpecificData must be provided for this tool');
        }
        const commandId = toolSpecificData.terminalCommandId;
        if (toolSpecificData.alternativeRecommendation) {
            return {
                content: [{
                        kind: 'text',
                        value: toolSpecificData.alternativeRecommendation
                    }]
            };
        }
        const args = invocation.parameters;
        this._logService.debug(`RunInTerminalTool: Invoking with options ${JSON.stringify(args)}`);
        let toolResultMessage;
        const chatSessionId = invocation.context?.sessionId ?? 'no-chat-session';
        const command = toolSpecificData.commandLine.userEdited ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original;
        const didUserEditCommand = (toolSpecificData.commandLine.userEdited !== undefined &&
            toolSpecificData.commandLine.userEdited !== toolSpecificData.commandLine.original);
        const didToolEditCommand = (!didUserEditCommand &&
            toolSpecificData.commandLine.toolEdited !== undefined &&
            toolSpecificData.commandLine.toolEdited !== toolSpecificData.commandLine.original);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        let error;
        const isNewSession = !args.isBackground && !this._sessionTerminalAssociations.has(chatSessionId);
        const timingStart = Date.now();
        const termId = generateUuid();
        const terminalToolSessionId = toolSpecificData.terminalToolSessionId;
        const store = new DisposableStore();
        this._logService.debug(`RunInTerminalTool: Creating ${args.isBackground ? 'background' : 'foreground'} terminal. termId=${termId}, chatSessionId=${chatSessionId}`);
        const toolTerminal = await (args.isBackground
            ? this._initBackgroundTerminal(chatSessionId, termId, terminalToolSessionId, token)
            : this._initForegroundTerminal(chatSessionId, termId, terminalToolSessionId, token));
        this._handleTerminalVisibility(toolTerminal, chatSessionId);
        const timingConnectMs = Date.now() - timingStart;
        const xterm = await toolTerminal.instance.xtermReadyPromise;
        if (!xterm) {
            throw new Error('Instance was disposed before xterm.js was ready');
        }
        const commandDetection = toolTerminal.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        let inputUserChars = 0;
        let inputUserSigint = false;
        store.add(xterm.raw.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                inputUserChars += data.length;
            }
            inputUserSigint ||= data === '\x03';
        }));
        let outputMonitor;
        if (args.isBackground) {
            let pollingResult;
            try {
                this._logService.debug(`RunInTerminalTool: Starting background execution \`${command}\``);
                const execution = new BackgroundTerminalExecution(toolTerminal.instance, xterm, command, chatSessionId, commandId);
                RunInTerminalTool_1._backgroundExecutions.set(termId, execution);
                outputMonitor = store.add(this._instantiationService.createInstance(OutputMonitor, execution, undefined, invocation.context, token, command));
                await Event.toPromise(outputMonitor.onDidFinishCommand);
                const pollingResult = outputMonitor.pollingResult;
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId);
                const state = toolSpecificData.terminalCommandState ?? {};
                state.timestamp = state.timestamp ?? timingStart;
                toolSpecificData.terminalCommandState = state;
                let resultText = (didUserEditCommand
                    ? `Note: The user manually edited the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                    : didToolEditCommand
                        ? `Note: The tool simplified the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                        : `Command is running in terminal with ID=${termId}`);
                if (pollingResult && pollingResult.modelOutputEvalResponse) {
                    resultText += `\n\ The command became idle with output:\n${pollingResult.modelOutputEvalResponse}`;
                }
                else if (pollingResult) {
                    resultText += `\n\ The command is still running, with output:\n${pollingResult.output}`;
                }
                return {
                    toolMetadata: {
                        exitCode: undefined // Background processes don't have immediate exit codes
                    },
                    content: [{
                            kind: 'text',
                            value: resultText,
                        }],
                };
            }
            catch (e) {
                if (termId) {
                    RunInTerminalTool_1._backgroundExecutions.get(termId)?.dispose();
                    RunInTerminalTool_1._backgroundExecutions.delete(termId);
                }
                error = e instanceof CancellationError ? 'canceled' : 'unexpectedException';
                throw e;
            }
            finally {
                store.dispose();
                this._logService.debug(`RunInTerminalTool: Finished polling \`${pollingResult?.output.length}\` lines of output in \`${pollingResult?.pollDurationMs}\``);
                const timingExecuteMs = Date.now() - timingStart;
                this._telemetry.logInvoke(toolTerminal.instance, {
                    terminalToolSessionId: toolSpecificData.terminalToolSessionId,
                    didUserEditCommand,
                    didToolEditCommand,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    isBackground: true,
                    error,
                    exitCode: undefined,
                    isNewSession: true,
                    timingExecuteMs,
                    timingConnectMs,
                    terminalExecutionIdleBeforeTimeout: pollingResult?.state === OutputMonitorState.Idle,
                    outputLineCount: pollingResult?.output ? count(pollingResult.output, '\n') : 0,
                    pollDurationMs: pollingResult?.pollDurationMs,
                    inputUserChars,
                    inputUserSigint,
                    inputToolManualAcceptCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualAcceptCount,
                    inputToolManualRejectCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualRejectCount,
                    inputToolManualChars: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualChars,
                    inputToolAutoAcceptCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolAutoAcceptCount,
                    inputToolAutoChars: outputMonitor?.outputMonitorTelemetryCounters.inputToolAutoChars,
                    inputToolManualShownCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualShownCount,
                    inputToolFreeFormInputCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolFreeFormInputCount,
                    inputToolFreeFormInputShownCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolFreeFormInputShownCount
                });
            }
        }
        else {
            let terminalResult = '';
            let outputLineCount = -1;
            let exitCode;
            let altBufferResult;
            const executeCancellation = store.add(new CancellationTokenSource(token));
            try {
                let strategy;
                switch (toolTerminal.shellIntegrationQuality) {
                    case "none" /* ShellIntegrationQuality.None */: {
                        strategy = this._instantiationService.createInstance(NoneExecuteStrategy, toolTerminal.instance, () => toolTerminal.receivedUserInput ?? false);
                        toolResultMessage = '$(info) Enable [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration) to improve command detection';
                        break;
                    }
                    case "basic" /* ShellIntegrationQuality.Basic */: {
                        strategy = this._instantiationService.createInstance(BasicExecuteStrategy, toolTerminal.instance, () => toolTerminal.receivedUserInput ?? false, commandDetection);
                        break;
                    }
                    case "rich" /* ShellIntegrationQuality.Rich */: {
                        strategy = this._instantiationService.createInstance(RichExecuteStrategy, toolTerminal.instance, commandDetection);
                        break;
                    }
                }
                this._logService.debug(`RunInTerminalTool: Using \`${strategy.type}\` execute strategy for command \`${command}\``);
                store.add(strategy.onDidCreateStartMarker(startMarker => {
                    if (!outputMonitor) {
                        outputMonitor = store.add(this._instantiationService.createInstance(OutputMonitor, { instance: toolTerminal.instance, sessionId: invocation.context?.sessionId, getOutput: (marker) => getOutput(toolTerminal.instance, marker ?? startMarker) }, undefined, invocation.context, token, command));
                    }
                }));
                const executeResult = await strategy.execute(command, executeCancellation.token, commandId);
                // Reset user input state after command execution completes
                toolTerminal.receivedUserInput = false;
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                if (executeResult.didEnterAltBuffer) {
                    const state = toolSpecificData.terminalCommandState ?? {};
                    state.timestamp = state.timestamp ?? timingStart;
                    toolSpecificData.terminalCommandState = state;
                    toolResultMessage = altBufferMessage;
                    outputLineCount = 0;
                    error = executeResult.error ?? 'alternateBuffer';
                    altBufferResult = {
                        toolResultMessage,
                        toolMetadata: {
                            exitCode: undefined
                        },
                        content: [{
                                kind: 'text',
                                value: altBufferMessage,
                            }]
                    };
                }
                else {
                    await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId);
                    {
                        const state = toolSpecificData.terminalCommandState ?? {};
                        state.timestamp = state.timestamp ?? timingStart;
                        if (executeResult.exitCode !== undefined) {
                            state.exitCode = executeResult.exitCode;
                            if (state.timestamp !== undefined) {
                                state.duration = state.duration ?? Math.max(0, Date.now() - state.timestamp);
                            }
                        }
                        toolSpecificData.terminalCommandState = state;
                    }
                    this._logService.debug(`RunInTerminalTool: Finished \`${strategy.type}\` execute strategy with exitCode \`${executeResult.exitCode}\`, result.length \`${executeResult.output?.length}\`, error \`${executeResult.error}\``);
                    outputLineCount = executeResult.output === undefined ? 0 : count(executeResult.output.trim(), '\n') + 1;
                    exitCode = executeResult.exitCode;
                    error = executeResult.error;
                    const resultArr = [];
                    if (executeResult.output !== undefined) {
                        resultArr.push(executeResult.output);
                    }
                    if (executeResult.additionalInformation) {
                        resultArr.push(executeResult.additionalInformation);
                    }
                    terminalResult = resultArr.join('\n\n');
                }
            }
            catch (e) {
                this._logService.debug(`RunInTerminalTool: Threw exception`);
                toolTerminal.instance.dispose();
                error = e instanceof CancellationError ? 'canceled' : 'unexpectedException';
                throw e;
            }
            finally {
                store.dispose();
                const timingExecuteMs = Date.now() - timingStart;
                this._telemetry.logInvoke(toolTerminal.instance, {
                    terminalToolSessionId: toolSpecificData.terminalToolSessionId,
                    didUserEditCommand,
                    didToolEditCommand,
                    isBackground: false,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    error,
                    isNewSession,
                    outputLineCount,
                    exitCode,
                    timingExecuteMs,
                    timingConnectMs,
                    inputUserChars,
                    inputUserSigint,
                    terminalExecutionIdleBeforeTimeout: undefined,
                    pollDurationMs: undefined,
                    inputToolManualAcceptCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualAcceptCount,
                    inputToolManualRejectCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualRejectCount,
                    inputToolManualChars: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualChars,
                    inputToolAutoAcceptCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolAutoAcceptCount,
                    inputToolAutoChars: outputMonitor?.outputMonitorTelemetryCounters?.inputToolAutoChars,
                    inputToolManualShownCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualShownCount,
                    inputToolFreeFormInputCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolFreeFormInputCount,
                    inputToolFreeFormInputShownCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolFreeFormInputShownCount
                });
            }
            if (altBufferResult) {
                return altBufferResult;
            }
            const resultText = [];
            if (didUserEditCommand) {
                resultText.push(`Note: The user manually edited the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            else if (didToolEditCommand) {
                resultText.push(`Note: The tool simplified the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            resultText.push(terminalResult);
            return {
                toolResultMessage,
                toolMetadata: {
                    exitCode: exitCode
                },
                content: [{
                        kind: 'text',
                        value: resultText.join(''),
                    }]
            };
        }
    }
    _handleTerminalVisibility(toolTerminal, chatSessionId) {
        const chatSessionOpenInWidget = !!this._chatWidgetService.getWidgetBySessionResource(LocalChatSessionUri.forSession(chatSessionId));
        if (this._configurationService.getValue("chat.tools.terminal.outputLocation" /* TerminalChatAgentToolsSettingId.OutputLocation */) === 'terminal' && chatSessionOpenInWidget) {
            this._terminalService.setActiveInstance(toolTerminal.instance);
            this._terminalService.revealTerminal(toolTerminal.instance, true);
        }
    }
    // #region Terminal init
    async _initBackgroundTerminal(chatSessionId, termId, terminalToolSessionId, token) {
        this._logService.debug(`RunInTerminalTool: Creating background terminal with ID=${termId}`);
        const profile = await this._profileFetcher.getCopilotProfile();
        const toolTerminal = await this._terminalToolCreator.createTerminal(profile, token);
        this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, toolTerminal.instance);
        this._terminalChatService.registerTerminalInstanceWithChatSession(chatSessionId, toolTerminal.instance);
        this._registerInputListener(toolTerminal);
        this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupProcessIdAssociation(toolTerminal, chatSessionId, termId, true);
        return toolTerminal;
    }
    async _initForegroundTerminal(chatSessionId, termId, terminalToolSessionId, token) {
        const cachedTerminal = this._sessionTerminalAssociations.get(chatSessionId);
        if (cachedTerminal) {
            this._logService.debug(`RunInTerminalTool: Using cached foreground terminal with session ID \`${chatSessionId}\``);
            this._terminalToolCreator.refreshShellIntegrationQuality(cachedTerminal);
            this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, cachedTerminal.instance);
            return cachedTerminal;
        }
        const profile = await this._profileFetcher.getCopilotProfile();
        const toolTerminal = await this._terminalToolCreator.createTerminal(profile, token);
        this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, toolTerminal.instance);
        this._terminalChatService.registerTerminalInstanceWithChatSession(chatSessionId, toolTerminal.instance);
        this._registerInputListener(toolTerminal);
        this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupProcessIdAssociation(toolTerminal, chatSessionId, termId, false);
        return toolTerminal;
    }
    _registerInputListener(toolTerminal) {
        const disposable = toolTerminal.instance.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                toolTerminal.receivedUserInput = data.length > 0;
            }
        });
        this._register(toolTerminal.instance.onDisposed(() => disposable.dispose()));
    }
    // #endregion
    // #region Session management
    _restoreTerminalAssociations() {
        const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
        try {
            const associations = JSON.parse(storedAssociations);
            // Find existing terminals and associate them with sessions
            for (const instance of this._terminalService.instances) {
                if (instance.processId) {
                    const association = associations[instance.processId];
                    if (association) {
                        this._logService.debug(`RunInTerminalTool: Restored terminal association for PID ${instance.processId}, session ${association.sessionId}`);
                        const toolTerminal = {
                            instance,
                            shellIntegrationQuality: association.shellIntegrationQuality
                        };
                        this._sessionTerminalAssociations.set(association.sessionId, toolTerminal);
                        this._terminalChatService.registerTerminalInstanceWithChatSession(association.sessionId, instance);
                        // Listen for terminal disposal to clean up storage
                        this._register(instance.onDisposed(() => {
                            this._removeProcessIdAssociation(instance.processId);
                        }));
                    }
                }
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to restore terminal associations: ${error}`);
        }
    }
    async _setupProcessIdAssociation(toolTerminal, chatSessionId, termId, isBackground) {
        await this._associateProcessIdWithSession(toolTerminal.instance, chatSessionId, termId, toolTerminal.shellIntegrationQuality, isBackground);
        this._register(toolTerminal.instance.onDisposed(() => {
            if (toolTerminal.instance.processId) {
                this._removeProcessIdAssociation(toolTerminal.instance.processId);
            }
        }));
    }
    async _associateProcessIdWithSession(terminal, sessionId, id, shellIntegrationQuality, isBackground) {
        try {
            // Wait for process ID with timeout
            const pid = await Promise.race([
                terminal.processReady.then(() => terminal.processId),
                timeout(5000).then(() => { throw new Error('Timeout'); })
            ]);
            if (isNumber(pid)) {
                const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
                const associations = JSON.parse(storedAssociations);
                const existingAssociation = associations[pid] || {};
                associations[pid] = {
                    ...existingAssociation,
                    sessionId,
                    shellIntegrationQuality,
                    id,
                    isBackground
                };
                this._storageService.store("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Associated terminal PID ${pid} with session ${sessionId}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to associate terminal with session: ${error}`);
        }
    }
    async _removeProcessIdAssociation(pid) {
        try {
            const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
            const associations = JSON.parse(storedAssociations);
            if (associations[pid]) {
                delete associations[pid];
                this._storageService.store("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Removed terminal association for PID ${pid}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to remove terminal association: ${error}`);
        }
    }
    _cleanupSessionTerminals(sessionId) {
        const toolTerminal = this._sessionTerminalAssociations.get(sessionId);
        if (toolTerminal) {
            this._logService.debug(`RunInTerminalTool: Cleaning up terminal for disposed chat session ${sessionId}`);
            this._sessionTerminalAssociations.delete(sessionId);
            toolTerminal.instance.dispose();
            // Clean up any background executions associated with this session
            const terminalToRemove = [];
            for (const [termId, execution] of RunInTerminalTool_1._backgroundExecutions.entries()) {
                if (execution.instance === toolTerminal.instance) {
                    execution.dispose();
                    terminalToRemove.push(termId);
                }
            }
            for (const termId of terminalToRemove) {
                RunInTerminalTool_1._backgroundExecutions.delete(termId);
            }
        }
    }
};
RunInTerminalTool = RunInTerminalTool_1 = __decorate([
    __param(0, IChatService),
    __param(1, IConfigurationService),
    __param(2, IHistoryService),
    __param(3, IInstantiationService),
    __param(4, ILanguageModelToolsService),
    __param(5, IRemoteAgentService),
    __param(6, IStorageService),
    __param(7, ITerminalChatService),
    __param(8, ITerminalLogService),
    __param(9, ITerminalService),
    __param(10, IWorkspaceContextService),
    __param(11, IChatWidgetService)
], RunInTerminalTool);
export { RunInTerminalTool };
class BackgroundTerminalExecution extends Disposable {
    constructor(instance, _xterm, _commandLine, sessionId, commandId) {
        super();
        this.instance = instance;
        this._xterm = _xterm;
        this._commandLine = _commandLine;
        this.sessionId = sessionId;
        this._startMarker = this._register(this._xterm.raw.registerMarker());
        this.instance.runCommand(this._commandLine, true, commandId);
    }
    getOutput(marker) {
        return getOutput(this.instance, marker ?? this._startMarker);
    }
}
let TerminalProfileFetcher = class TerminalProfileFetcher {
    constructor(_configurationService, _terminalProfileResolverService, _remoteAgentService) {
        this._configurationService = _configurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._remoteAgentService = _remoteAgentService;
        this.osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
    }
    async getCopilotProfile() {
        const os = await this.osBackend;
        // Check for chat agent terminal profile first
        const customChatAgentProfile = this._getChatTerminalProfile(os);
        if (customChatAgentProfile) {
            return customChatAgentProfile;
        }
        // When setting is null, use the previous behavior
        const defaultProfile = await this._terminalProfileResolverService.getDefaultProfile({
            os,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority
        });
        // Force pwsh over cmd as cmd doesn't have shell integration
        if (basename(defaultProfile.path) === 'cmd.exe') {
            return {
                ...defaultProfile,
                path: 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                profileName: 'PowerShell'
            };
        }
        // Setting icon: undefined allows the system to use the default AI terminal icon (not overridden or removed)
        return { ...defaultProfile, icon: undefined };
    }
    async getCopilotShell() {
        return (await this.getCopilotProfile()).path;
    }
    _getChatTerminalProfile(os) {
        let profileSetting;
        switch (os) {
            case 1 /* OperatingSystem.Windows */:
                profileSetting = "chat.tools.terminal.terminalProfile.windows" /* TerminalChatAgentToolsSettingId.TerminalProfileWindows */;
                break;
            case 2 /* OperatingSystem.Macintosh */:
                profileSetting = "chat.tools.terminal.terminalProfile.osx" /* TerminalChatAgentToolsSettingId.TerminalProfileMacOs */;
                break;
            case 3 /* OperatingSystem.Linux */:
            default:
                profileSetting = "chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */;
                break;
        }
        const profile = this._configurationService.getValue(profileSetting);
        if (this._isValidChatAgentTerminalProfile(profile)) {
            return profile;
        }
        return undefined;
    }
    _isValidChatAgentTerminalProfile(profile) {
        if (profile === null || profile === undefined || typeof profile !== 'object') {
            return false;
        }
        if ('path' in profile && isString(profile.path)) {
            return true;
        }
        return false;
    }
};
TerminalProfileFetcher = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITerminalProfileResolverService),
    __param(2, IRemoteAgentService)
], TerminalProfileFetcher);
export { TerminalProfileFetcher };
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvcnVuSW5UZXJtaW5hbFRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0csT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUF3QixNQUFNLDhDQUE4QyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUF5QixNQUFNLGtFQUFrRSxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0s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
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
var TerminalInstance_1;
import { isFirefox } from '../../../../base/browser/browser.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { AutoOpenBarrier, Promises, disposableTimeout, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { debounce } from '../../../../base/common/decorators.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { template } from '../../../../base/common/labels.js';
import { Disposable, DisposableMap, DisposableStore, ImmortalReference, MutableDisposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import { OS, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { TabFocus } from '../../../../editor/browser/config/tabFocus.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { CodeDataTransfers, containsDragType, getPathForFile } from '../../../../platform/dnd/browser/dnd.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { TerminalCapabilityStoreMultiplexer } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { deserializeEnvironmentVariableCollections } from '../../../../platform/terminal/common/environmentVariableShared.js';
import { ITerminalLogService, TerminalExitReason, TerminalLocation, TitleEventSource } from '../../../../platform/terminal/common/terminal.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ITerminalConfigurationService } from './terminal.js';
import { TerminalLaunchHelpAction } from './terminalActions.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { TerminalExtensionsRegistry } from './terminalExtensions.js';
import { getColorClass, createColorStyleElement, getStandardColors } from './terminalIcon.js';
import { TerminalProcessManager } from './terminalProcessManager.js';
import { TerminalStatusList } from './terminalStatusList.js';
import { getTerminalResourcesFromDragEvent, getTerminalUri } from './terminalUri.js';
import { TerminalWidgetManager } from './widgets/widgetManager.js';
import { LineDataEventAddon } from './xterm/lineDataEventAddon.js';
import { XtermTerminal, getXtermScaledDimensions } from './xterm/xtermTerminal.js';
import { DEFAULT_COMMANDS_TO_SKIP_SHELL, ITerminalProfileResolverService, TERMINAL_CREATION_COMMANDS, TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TERMINAL_BACKGROUND_COLOR } from '../common/terminalColorRegistry.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getUriLabelForShell, getShellIntegrationTimeout, getWorkspaceForTerminal, preparePathForShell } from '../common/terminalEnvironment.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { isHorizontal, IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { TerminalIconPicker } from './terminalIconPicker.js';
import { TerminalResizeDebouncer } from './terminalResizeDebouncer.js';
import { openContextMenu } from './terminalContextMenu.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { refreshShellIntegrationInfoStatus } from './terminalTooltip.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { hasKey, isNumber, isString } from '../../../../base/common/types.js';
var Constants;
(function (Constants) {
    /**
     * The maximum amount of milliseconds to wait for a container before starting to create the
     * terminal process. This period helps ensure the terminal has good initial dimensions to work
     * with if it's going to be a foreground terminal.
     */
    Constants[Constants["WaitForContainerThreshold"] = 100] = "WaitForContainerThreshold";
    Constants[Constants["DefaultCols"] = 80] = "DefaultCols";
    Constants[Constants["DefaultRows"] = 30] = "DefaultRows";
    Constants[Constants["MaxCanvasWidth"] = 4096] = "MaxCanvasWidth";
})(Constants || (Constants = {}));
let xtermConstructor;
const shellIntegrationSupportedShellTypes = [
    "bash" /* PosixShellType.Bash */,
    "zsh" /* PosixShellType.Zsh */,
    "pwsh" /* GeneralShellType.PowerShell */,
    "python" /* GeneralShellType.Python */,
];
let TerminalInstance = class TerminalInstance extends Disposable {
    static { TerminalInstance_1 = this; }
    static { this._instanceIdCounter = 1; }
    get xtermReadyPromise() { return this._xtermReadyPromise; }
    get domElement() { return this._wrapperElement; }
    get usedShellIntegrationInjection() { return this._usedShellIntegrationInjection; }
    get shellIntegrationInjectionFailureReason() { return this._shellIntegrationInjectionInfo; }
    get store() {
        return this._store;
    }
    get extEnvironmentVariableCollection() { return this._processManager.extEnvironmentVariableCollection; }
    get waitOnExit() { return this._shellLaunchConfig.attachPersistentProcess?.waitOnExit || this._shellLaunchConfig.waitOnExit; }
    set waitOnExit(value) {
        this._shellLaunchConfig.waitOnExit = value;
    }
    get targetRef() { return this._targetRef; }
    get target() { return this._targetRef.object; }
    set target(value) {
        this._targetRef.object = value;
        this._onDidChangeTarget.fire(value);
    }
    get instanceId() { return this._instanceId; }
    get resource() { return this._resource; }
    get cols() {
        if (this._fixedCols !== undefined) {
            return this._fixedCols;
        }
        if (this._dimensionsOverride && this._dimensionsOverride.cols) {
            if (this._dimensionsOverride.forceExactSize) {
                return this._dimensionsOverride.cols;
            }
            return Math.min(Math.max(this._dimensionsOverride.cols, 2), this._cols);
        }
        return this._cols;
    }
    get rows() {
        if (this._fixedRows !== undefined) {
            return this._fixedRows;
        }
        if (this._dimensionsOverride && this._dimensionsOverride.rows) {
            if (this._dimensionsOverride.forceExactSize) {
                return this._dimensionsOverride.rows;
            }
            return Math.min(Math.max(this._dimensionsOverride.rows, 2), this._rows);
        }
        return this._rows;
    }
    get isDisposed() { return this._store.isDisposed; }
    get fixedCols() { return this._fixedCols; }
    get fixedRows() { return this._fixedRows; }
    get maxCols() { return this._cols; }
    get maxRows() { return this._rows; }
    // TODO: Ideally processId would be merged into processReady
    get processId() { return this._processManager.shellProcessId; }
    // TODO: How does this work with detached processes?
    // TODO: Should this be an event as it can fire twice?
    get processReady() { return this._processManager.ptyProcessReady; }
    get hasChildProcesses() { return this.shellLaunchConfig.attachPersistentProcess?.hasChildProcesses || this._processManager.hasChildProcesses; }
    get reconnectionProperties() { return this.shellLaunchConfig.attachPersistentProcess?.reconnectionProperties || this.shellLaunchConfig.reconnectionProperties; }
    get areLinksReady() { return this._areLinksReady; }
    get initialDataEvents() { return this._initialDataEvents; }
    get exitCode() { return this._exitCode; }
    get exitReason() { return this._exitReason; }
    get hadFocusOnExit() { return this._hadFocusOnExit; }
    get isTitleSetByProcess() { return !!this._messageTitleDisposable.value; }
    get shellLaunchConfig() { return this._shellLaunchConfig; }
    get shellType() { return this._shellType; }
    get os() { return this._processManager.os; }
    get hasRemoteAuthority() { return this._processManager.remoteAuthority !== undefined; }
    get remoteAuthority() { return this._processManager.remoteAuthority; }
    get hasFocus() { return dom.isAncestorOfActiveElement(this._wrapperElement); }
    get title() { return this._title; }
    get titleSource() { return this._titleSource; }
    get icon() { return this._getIcon(); }
    get color() { return this._getColor(); }
    get processName() { return this._processName; }
    get sequence() { return this._sequence; }
    get staticTitle() { return this._staticTitle; }
    get progressState() { return this.xterm?.progressState; }
    get workspaceFolder() { return this._workspaceFolder; }
    get cwd() { return this._cwd; }
    get initialCwd() { return this._initialCwd; }
    get description() {
        if (this._description) {
            return this._description;
        }
        const type = this.shellLaunchConfig.attachPersistentProcess?.type || this.shellLaunchConfig.type;
        switch (type) {
            case 'Task': return terminalStrings.typeTask;
            case 'Local': return terminalStrings.typeLocal;
            default: return undefined;
        }
    }
    get userHome() { return this._userHome; }
    get shellIntegrationNonce() { return this._processManager.shellIntegrationNonce; }
    get injectedArgs() { return this._injectedArgs; }
    constructor(_terminalShellTypeContextKey, _shellLaunchConfig, _contextKeyService, _contextMenuService, instantiationService, _terminalConfigurationService, _terminalProfileResolverService, _pathService, _fileService, _keybindingService, _notificationService, _preferencesService, _viewsService, _themeService, _configurationService, _logService, _storageService, _accessibilityService, _productService, _quickInputService, _workbenchEnvironmentService, _workspaceContextService, _editorService, _workspaceTrustRequestService, _historyService, _telemetryService, _openerService, _commandService, _accessibilitySignalService, _viewDescriptorService) {
        super();
        this._terminalShellTypeContextKey = _terminalShellTypeContextKey;
        this._shellLaunchConfig = _shellLaunchConfig;
        this._contextKeyService = _contextKeyService;
        this._contextMenuService = _contextMenuService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._pathService = _pathService;
        this._fileService = _fileService;
        this._keybindingService = _keybindingService;
        this._notificationService = _notificationService;
        this._preferencesService = _preferencesService;
        this._viewsService = _viewsService;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._accessibilityService = _accessibilityService;
        this._productService = _productService;
        this._quickInputService = _quickInputService;
        this._workbenchEnvironmentService = _workbenchEnvironmentService;
        this._workspaceContextService = _workspaceContextService;
        this._editorService = _editorService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._historyService = _historyService;
        this._telemetryService = _telemetryService;
        this._openerService = _openerService;
        this._commandService = _commandService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._viewDescriptorService = _viewDescriptorService;
        this._contributions = new Map();
        this._latestXtermWriteData = 0;
        this._latestXtermParseData = 0;
        this._title = '';
        this._titleSource = TitleEventSource.Process;
        this._cols = 0;
        this._rows = 0;
        this._cwd = undefined;
        this._initialCwd = undefined;
        this._injectedArgs = undefined;
        this._layoutSettingsChanged = true;
        this._areLinksReady = false;
        this._initialDataEventsListener = this._register(new MutableDisposable());
        this._initialDataEvents = [];
        this._messageTitleDisposable = this._register(new MutableDisposable());
        this._dndObserver = this._register(new MutableDisposable());
        this._processName = '';
        this._usedShellIntegrationInjection = false;
        this.capabilities = this._register(new TerminalCapabilityStoreMultiplexer());
        this.disableLayout = false;
        this._targetRef = new ImmortalReference(undefined);
        // The onExit event is special in that it fires and is disposed after the terminal instance
        // itself is disposed
        this._onExit = new Emitter();
        this.onExit = this._onExit.event;
        this._onDisposed = this._register(new Emitter());
        this.onDisposed = this._onDisposed.event;
        this._onProcessIdReady = this._register(new Emitter());
        this.onProcessIdReady = this._onProcessIdReady.event;
        this._onProcessReplayComplete = this._register(new Emitter());
        this.onProcessReplayComplete = this._onProcessReplayComplete.event;
        this._onTitleChanged = this._register(new Emitter());
        this.onTitleChanged = this._onTitleChanged.event;
        this._onIconChanged = this._register(new Emitter());
        this.onIconChanged = this._onIconChanged.event;
        this._onWillData = this._register(new Emitter());
        this.onWillData = this._onWillData.event;
        this._onData = this._register(new Emitter());
        this.onData = this._onData.event;
        this._onBinary = this._register(new Emitter());
        this.onBinary = this._onBinary.event;
        this._onRequestExtHostProcess = this._register(new Emitter());
        this.onRequestExtHostProcess = this._onRequestExtHostProcess.event;
        this._onDimensionsChanged = this._register(new Emitter());
        this.onDimensionsChanged = this._onDimensionsChanged.event;
        this._onMaximumDimensionsChanged = this._register(new Emitter());
        this.onMaximumDimensionsChanged = this._onMaximumDimensionsChanged.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidRequestFocus = this._register(new Emitter());
        this.onDidRequestFocus = this._onDidRequestFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidInputData = this._register(new Emitter());
        this.onDidInputData = this._onDidInputData.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onRequestAddInstanceToGroup = this._register(new Emitter());
        this.onRequestAddInstanceToGroup = this._onRequestAddInstanceToGroup.event;
        this._onDidChangeHasChildProcesses = this._register(new Emitter());
        this.onDidChangeHasChildProcesses = this._onDidChangeHasChildProcesses.event;
        this._onDidExecuteText = this._register(new Emitter());
        this.onDidExecuteText = this._onDidExecuteText.event;
        this._onDidChangeTarget = this._register(new Emitter());
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onDidSendText = this._register(new Emitter());
        this.onDidSendText = this._onDidSendText.event;
        this._onDidChangeShellType = this._register(new Emitter());
        this.onDidChangeShellType = this._onDidChangeShellType.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onLineData = this._register(new Emitter({
            onDidAddFirstListener: async () => (this.xterm ?? await this._xtermReadyPromise)?.raw.loadAddon(this._lineDataEventAddon)
        }));
        this.onLineData = this._onLineData.event;
        this.sessionId = generateUuid();
        this._wrapperElement = document.createElement('div');
        this._wrapperElement.classList.add('terminal-wrapper');
        this._widgetManager = this._register(instantiationService.createInstance(TerminalWidgetManager));
        this._skipTerminalCommands = [];
        this._isExiting = false;
        this._hadFocusOnExit = false;
        this._isVisible = false;
        this._instanceId = TerminalInstance_1._instanceIdCounter++;
        this._hasHadInput = false;
        this._fixedRows = _shellLaunchConfig.attachPersistentProcess?.fixedDimensions?.rows;
        this._fixedCols = _shellLaunchConfig.attachPersistentProcess?.fixedDimensions?.cols;
        this._shellLaunchConfig.shellIntegrationEnvironmentReporting = this._configurationService.getValue("terminal.integrated.shellIntegration.environmentReporting" /* TerminalSettingId.ShellIntegrationEnvironmentReporting */);
        this._resource = getTerminalUri(this._workspaceContextService.getWorkspace().id, this.instanceId, this.title);
        if (this._shellLaunchConfig.attachPersistentProcess?.hideFromUser) {
            this._shellLaunchConfig.hideFromUser = this._shellLaunchConfig.attachPersistentProcess.hideFromUser;
        }
        if (this._shellLaunchConfig.attachPersistentProcess?.isFeatureTerminal) {
            this._shellLaunchConfig.isFeatureTerminal = this._shellLaunchConfig.attachPersistentProcess.isFeatureTerminal;
        }
        if (this._shellLaunchConfig.attachPersistentProcess?.type) {
            this._shellLaunchConfig.type = this._shellLaunchConfig.attachPersistentProcess.type;
        }
        if (this._shellLaunchConfig.attachPersistentProcess?.tabActions) {
            this._shellLaunchConfig.tabActions = this._shellLaunchConfig.attachPersistentProcess.tabActions;
        }
        if (this.shellLaunchConfig.cwd) {
            const cwdUri = isString(this._shellLaunchConfig.cwd) ? URI.from({
                scheme: Schemas.file,
                path: this._shellLaunchConfig.cwd
            }) : this._shellLaunchConfig.cwd;
            if (cwdUri) {
                this._workspaceFolder = this._workspaceContextService.getWorkspaceFolder(cwdUri) ?? undefined;
            }
        }
        if (!this._workspaceFolder) {
            const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
            this._workspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
        }
        const scopedContextKeyService = this._register(_contextKeyService.createScoped(this._wrapperElement));
        this._scopedContextKeyService = scopedContextKeyService;
        this._scopedInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        this._terminalFocusContextKey = TerminalContextKeys.focus.bindTo(scopedContextKeyService);
        this._terminalHasFixedWidth = TerminalContextKeys.terminalHasFixedWidth.bindTo(scopedContextKeyService);
        this._terminalHasTextContextKey = TerminalContextKeys.textSelected.bindTo(this._contextKeyService);
        this._terminalAltBufferActiveContextKey = TerminalContextKeys.altBufferActive.bindTo(scopedContextKeyService);
        this._terminalShellIntegrationEnabledContextKey = TerminalContextKeys.terminalShellIntegrationEnabled.bindTo(scopedContextKeyService);
        this._logService.trace(`terminalInstance#ctor (instanceId: ${this.instanceId})`, this._shellLaunchConfig);
        this._register(this.capabilities.onDidAddCapability(e => this._logService.debug('terminalInstance added capability', e.id)));
        this._register(this.capabilities.onDidRemoveCapability(e => this._logService.debug('terminalInstance removed capability', e.id)));
        const capabilityListeners = this._register(new DisposableMap());
        this._register(this.capabilities.onDidAddCapability(e => {
            capabilityListeners.get(e.id)?.dispose();
            const refreshInfo = () => {
                this._labelComputer?.refreshLabel(this);
                refreshShellIntegrationInfoStatus(this);
            };
            switch (e.id) {
                case 0 /* TerminalCapability.CwdDetection */: {
                    capabilityListeners.set(e.id, e.capability.onDidChangeCwd(e => {
                        this._cwd = e;
                        this._setTitle(this.title, TitleEventSource.Config);
                    }));
                    break;
                }
                case 2 /* TerminalCapability.CommandDetection */: {
                    e.capability.promptInputModel.setShellType(this.shellType);
                    capabilityListeners.set(e.id, Event.any(e.capability.promptInputModel.onDidStartInput, e.capability.promptInputModel.onDidChangeInput, e.capability.promptInputModel.onDidFinishInput)(refreshInfo));
                    this._register(e.capability.onCommandExecuted(async (command) => {
                        // Only generate ID if command doesn't already have one (i.e., it's a manual command, not Copilot-initiated)
                        // The tool terminal sets the command ID before command start, so this won't override it
                        if (!command.id && command.command) {
                            const commandId = generateUuid();
                            this.xterm?.shellIntegration.setNextCommandId(command.command, commandId);
                            await this._processManager.setNextCommandId(command.command, commandId);
                        }
                    }));
                    break;
                }
                case 6 /* TerminalCapability.PromptTypeDetection */: {
                    capabilityListeners.set(e.id, e.capability.onPromptTypeChanged(refreshInfo));
                    break;
                }
            }
        }));
        this._register(this.onDidChangeShellType(() => refreshShellIntegrationInfoStatus(this)));
        this._register(this.capabilities.onDidRemoveCapability(e => {
            capabilityListeners.get(e.id)?.dispose();
        }));
        // Resolve just the icon ahead of time so that it shows up immediately in the tabs. This is
        // disabled in remote because this needs to be sync and the OS may differ on the remote
        // which would result in the wrong profile being selected and the wrong icon being
        // permanently attached to the terminal. This also doesn't work when the default profile
        // setting is set to null, that's handled after the process is created.
        if (!this.shellLaunchConfig.executable && !this._workbenchEnvironmentService.remoteAuthority) {
            this._terminalProfileResolverService.resolveIcon(this._shellLaunchConfig, OS);
        }
        this._icon = _shellLaunchConfig.attachPersistentProcess?.icon || _shellLaunchConfig.icon;
        // When a custom pty is used set the name immediately so it gets passed over to the exthost
        // and is available when Pseudoterminal.open fires.
        if (this.shellLaunchConfig.customPtyImplementation) {
            this._setTitle(this._shellLaunchConfig.name, TitleEventSource.Api);
        }
        this.statusList = this._register(this._scopedInstantiationService.createInstance(TerminalStatusList));
        this._initDimensions();
        this._processManager = this._createProcessManager();
        this._containerReadyBarrier = new AutoOpenBarrier(100 /* Constants.WaitForContainerThreshold */);
        this._attachBarrier = new AutoOpenBarrier(1000);
        this._xtermReadyPromise = this._createXterm();
        this._xtermReadyPromise.then(async () => {
            // Wait for a period to allow a container to be ready
            await this._containerReadyBarrier.wait();
            // Resolve the executable ahead of time if shell integration is enabled, this should not
            // be done for custom PTYs as that would cause extension Pseudoterminal-based terminals
            // to hang in resolver extensions
            let os;
            if (!this.shellLaunchConfig.customPtyImplementation && this._terminalConfigurationService.config.shellIntegration?.enabled && !this.shellLaunchConfig.executable) {
                os = await this._processManager.getBackendOS();
                const defaultProfile = (await this._terminalProfileResolverService.getDefaultProfile({ remoteAuthority: this.remoteAuthority, os }));
                this.shellLaunchConfig.executable = defaultProfile.path;
                this.shellLaunchConfig.args = defaultProfile.args;
                // Only use default icon and color and env if they are undefined in the SLC
                this.shellLaunchConfig.icon ??= defaultProfile.icon;
                this.shellLaunchConfig.color ??= defaultProfile.color;
                this.shellLaunchConfig.env ??= defaultProfile.env;
            }
            // Resolve the shell type ahead of time to allow features that depend upon it to work
            // before the process is actually created (like terminal suggest manual request)
            if (os && this.shellLaunchConfig.executable) {
                this.setShellType(guessShellTypeFromExecutable(os, this.shellLaunchConfig.executable));
            }
            await this._createProcess();
            // Re-establish the title after reconnect
            if (this.shellLaunchConfig.attachPersistentProcess) {
                this._cwd = this.shellLaunchConfig.attachPersistentProcess.cwd;
                this._setTitle(this.shellLaunchConfig.attachPersistentProcess.title, this.shellLaunchConfig.attachPersistentProcess.titleSource);
                this.setShellType(this.shellType);
            }
            if (this._fixedCols) {
                await this._addScrollbar();
            }
        }).catch((err) => {
            // Ignore exceptions if the terminal is already disposed
            if (!this.isDisposed) {
                throw err;
            }
        });
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */)) {
                this._setAriaLabel(this.xterm?.raw, this._instanceId, this.title);
            }
            if (e.affectsConfiguration('terminal.integrated')) {
                this.updateConfig();
                this.setVisible(this._isVisible);
            }
            const layoutSettings = [
                "terminal.integrated.fontSize" /* TerminalSettingId.FontSize */,
                "terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */,
                "terminal.integrated.fontWeight" /* TerminalSettingId.FontWeight */,
                "terminal.integrated.fontWeightBold" /* TerminalSettingId.FontWeightBold */,
                "terminal.integrated.letterSpacing" /* TerminalSettingId.LetterSpacing */,
                "terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */,
                'editor.fontFamily'
            ];
            if (layoutSettings.some(id => e.affectsConfiguration(id))) {
                this._layoutSettingsChanged = true;
                await this._resize();
            }
            if (e.affectsConfiguration("terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */)) {
                this._updateUnicodeVersion();
            }
            if (e.affectsConfiguration('editor.accessibilitySupport')) {
                this.updateAccessibilitySupport();
            }
            if (e.affectsConfiguration("terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */) ||
                e.affectsConfiguration("terminal.integrated.tabs.separator" /* TerminalSettingId.TerminalTitleSeparator */) ||
                e.affectsConfiguration("terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */)) {
                this._labelComputer?.refreshLabel(this);
            }
        }));
        this._register(this._workspaceContextService.onDidChangeWorkspaceFolders(() => this._labelComputer?.refreshLabel(this)));
        // Clear out initial data events after 10 seconds, hopefully extension hosts are up and
        // running at that point.
        let initialDataEventsTimeout = dom.getWindow(this._container).setTimeout(() => {
            initialDataEventsTimeout = undefined;
            this._initialDataEvents = undefined;
            this._initialDataEventsListener.clear();
        }, 10000);
        this._register(toDisposable(() => {
            if (initialDataEventsTimeout) {
                dom.getWindow(this._container).clearTimeout(initialDataEventsTimeout);
            }
        }));
        // Initialize contributions
        const contributionDescs = TerminalExtensionsRegistry.getTerminalContributions();
        for (const desc of contributionDescs) {
            if (this._contributions.has(desc.id)) {
                onUnexpectedError(new Error(`Cannot have two terminal contributions with the same id ${desc.id}`));
                continue;
            }
            let contribution;
            try {
                contribution = this._register(this._scopedInstantiationService.createInstance(desc.ctor, {
                    instance: this,
                    processManager: this._processManager,
                    widgetManager: this._widgetManager
                }));
                this._contributions.set(desc.id, contribution);
            }
            catch (err) {
                onUnexpectedError(err);
            }
            this._xtermReadyPromise.then(xterm => {
                if (xterm) {
                    contribution.xtermReady?.(xterm);
                }
            });
            this._register(this.onDisposed(() => {
                contribution.dispose();
                this._contributions.delete(desc.id);
            }));
        }
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    async _handleOnData(data) {
        await this._processManager.write(data);
        this._onDidInputData.fire(data);
    }
    _getIcon() {
        if (!this._icon) {
            this._icon = this._processManager.processState >= 2 /* ProcessState.Launching */
                ? getIconRegistry().getIcon(this._configurationService.getValue("terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */))
                : undefined;
        }
        return this._icon;
    }
    _getColor() {
        if (this.shellLaunchConfig.color) {
            return this.shellLaunchConfig.color;
        }
        if (this.shellLaunchConfig?.attachPersistentProcess?.color) {
            return this.shellLaunchConfig.attachPersistentProcess.color;
        }
        if (this._processManager.processState >= 2 /* ProcessState.Launching */) {
            return undefined;
        }
        return undefined;
    }
    _initDimensions() {
        // The terminal panel needs to have been created to get the real view dimensions
        if (!this._container) {
            // Set the fallback dimensions if not
            this._cols = 80 /* Constants.DefaultCols */;
            this._rows = 30 /* Constants.DefaultRows */;
            return;
        }
        const computedStyle = dom.getWindow(this._container).getComputedStyle(this._container);
        const width = parseInt(computedStyle.width);
        const height = parseInt(computedStyle.height);
        this._evaluateColsAndRows(width, height);
    }
    /**
     * Evaluates and sets the cols and rows of the terminal if possible.
     * @param width The width of the container.
     * @param height The height of the container.
     * @return The terminal's width if it requires a layout.
     */
    _evaluateColsAndRows(width, height) {
        // Ignore if dimensions are undefined or 0
        if (!width || !height) {
            this._setLastKnownColsAndRows();
            return null;
        }
        const dimension = this._getDimension(width, height);
        if (!dimension) {
            this._setLastKnownColsAndRows();
            return null;
        }
        const font = this.xterm ? this.xterm.getFont() : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement));
        const newRC = getXtermScaledDimensions(dom.getWindow(this.domElement), font, dimension.width, dimension.height);
        if (!newRC) {
            this._setLastKnownColsAndRows();
            return null;
        }
        if (this._cols !== newRC.cols || this._rows !== newRC.rows) {
            this._cols = newRC.cols;
            this._rows = newRC.rows;
            this._fireMaximumDimensionsChanged();
        }
        return dimension.width;
    }
    _setLastKnownColsAndRows() {
        if (TerminalInstance_1._lastKnownGridDimensions) {
            this._cols = TerminalInstance_1._lastKnownGridDimensions.cols;
            this._rows = TerminalInstance_1._lastKnownGridDimensions.rows;
        }
    }
    _fireMaximumDimensionsChanged() {
        this._onMaximumDimensionsChanged.fire();
    }
    _getDimension(width, height) {
        // The font needs to have been initialized
        const font = this.xterm ? this.xterm.getFont() : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement));
        if (!font || !font.charWidth || !font.charHeight) {
            return undefined;
        }
        if (!this.xterm?.raw.element) {
            return undefined;
        }
        const computedStyle = dom.getWindow(this.xterm.raw.element).getComputedStyle(this.xterm.raw.element);
        const horizontalPadding = parseInt(computedStyle.paddingLeft) + parseInt(computedStyle.paddingRight) + 14 /*scroll bar padding*/;
        const verticalPadding = parseInt(computedStyle.paddingTop) + parseInt(computedStyle.paddingBottom);
        TerminalInstance_1._lastKnownCanvasDimensions = new dom.Dimension(Math.min(4096 /* Constants.MaxCanvasWidth */, width - horizontalPadding), height - verticalPadding + (this._hasScrollBar && this._horizontalScrollbar ? -5 /* scroll bar height */ : 0));
        return TerminalInstance_1._lastKnownCanvasDimensions;
    }
    get persistentProcessId() { return this._processManager.persistentProcessId; }
    get shouldPersist() { return this._processManager.shouldPersist && !this.shellLaunchConfig.isTransient && (!this.reconnectionProperties || this._configurationService.getValue('task.reconnection') === true); }
    static getXtermConstructor(keybindingService, contextKeyService) {
        const keybinding = keybindingService.lookupKeybinding("workbench.action.terminal.focusAccessibleBuffer" /* TerminalContribCommandId.A11yFocusAccessibleBuffer */, contextKeyService);
        if (xtermConstructor) {
            return xtermConstructor;
        }
        xtermConstructor = Promises.withAsyncBody(async (resolve) => {
            const Terminal = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
            // Localize strings
            Terminal.strings.promptLabel = nls.localize('terminal.integrated.a11yPromptLabel', 'Terminal input');
            Terminal.strings.tooMuchOutput = keybinding ? nls.localize('terminal.integrated.useAccessibleBuffer', 'Use the accessible buffer {0} to manually review output', keybinding.getLabel()) : nls.localize('terminal.integrated.useAccessibleBufferNoKb', 'Use the Terminal: Focus Accessible Buffer command to manually review output');
            resolve(Terminal);
        });
        return xtermConstructor;
    }
    /**
     * Create xterm.js instance and attach data listeners.
     */
    async _createXterm() {
        const Terminal = await TerminalInstance_1.getXtermConstructor(this._keybindingService, this._contextKeyService);
        if (this.isDisposed) {
            return undefined;
        }
        const disableShellIntegrationReporting = (this.shellLaunchConfig.executable === undefined || this.shellType === undefined) || !shellIntegrationSupportedShellTypes.includes(this.shellType);
        const xterm = this._scopedInstantiationService.createInstance(XtermTerminal, this._resource, Terminal, {
            cols: this._cols,
            rows: this._rows,
            xtermColorProvider: this._scopedInstantiationService.createInstance(TerminalInstanceColorProvider, this._targetRef),
            capabilities: this.capabilities,
            shellIntegrationNonce: this._processManager.shellIntegrationNonce,
            disableShellIntegrationReporting,
        }, this.onDidExecuteText);
        this.xterm = xterm;
        this._resizeDebouncer = this._register(new TerminalResizeDebouncer(() => this._isVisible, () => xterm, async (cols, rows) => {
            xterm.resize(cols, rows);
            await this._updatePtyDimensions(xterm.raw);
        }, async (cols) => {
            xterm.resize(cols, xterm.raw.rows);
            await this._updatePtyDimensions(xterm.raw);
        }, async (rows) => {
            xterm.resize(xterm.raw.cols, rows);
            await this._updatePtyDimensions(xterm.raw);
        }));
        this._register(toDisposable(() => this._resizeDebouncer = undefined));
        this.updateAccessibilitySupport();
        this._register(this.xterm.onDidRequestRunCommand(e => {
            this.sendText(e.command.command, e.noNewLine ? false : true);
        }));
        this._register(this.xterm.onDidRequestRefreshDimensions(() => {
            if (this._lastLayoutDimensions) {
                this.layout(this._lastLayoutDimensions);
            }
        }));
        // Write initial text, deferring onLineFeed listener when applicable to avoid firing
        // onLineData events containing initialText
        const initialTextWrittenPromise = this._shellLaunchConfig.initialText ? new Promise(r => this._writeInitialText(xterm, r)) : undefined;
        const lineDataEventAddon = this._register(new LineDataEventAddon(initialTextWrittenPromise));
        this._register(lineDataEventAddon.onLineData(e => this._onLineData.fire(e)));
        this._lineDataEventAddon = lineDataEventAddon;
        // Delay the creation of the bell listener to avoid showing the bell when the terminal
        // starts up or reconnects
        disposableTimeout(() => {
            this._register(xterm.raw.onBell(() => {
                if (this._configurationService.getValue("terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */) || this._configurationService.getValue("terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */)) {
                    this.statusList.add({
                        id: "bell" /* TerminalStatus.Bell */,
                        severity: Severity.Warning,
                        icon: Codicon.bell,
                        tooltip: nls.localize('bellStatus', "Bell")
                    }, this._terminalConfigurationService.config.bellDuration);
                }
                this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalBell);
            }));
        }, 1000, this._store);
        this._register(xterm.raw.onSelectionChange(() => this._onDidChangeSelection.fire(this)));
        this._register(xterm.raw.buffer.onBufferChange(() => this._refreshAltBufferContextKey()));
        this._register(this._processManager.onProcessData(e => this._onProcessData(e)));
        this._register(xterm.raw.onData(async (data) => {
            await this._handleOnData(data);
        }));
        this._register(xterm.raw.onBinary(data => this._processManager.processBinary(data)));
        // Init winpty compat and link handler after process creation as they rely on the
        // underlying process OS
        this._register(this._processManager.onProcessReady(async (processTraits) => {
            // Respond to DA1 with basic conformance. Note that including this is required to avoid
            // a long delay in conpty 1.22+ where it waits for the response.
            // Reference: https://github.com/microsoft/terminal/blob/3760caed97fa9140a40777a8fbc1c95785e6d2ab/src/terminal/adapter/adaptDispatch.cpp#L1471-L1495
            if (processTraits?.windowsPty?.backend === 'conpty') {
                this._register(xterm.raw.parser.registerCsiHandler({ final: 'c' }, params => {
                    if (params.length === 0 || params.length === 1 && params[0] === 0) {
                        this._handleOnData('\x1b[?61;4c');
                        return true;
                    }
                    return false;
                }));
            }
            if (this._processManager.os) {
                lineDataEventAddon.setOperatingSystem(this._processManager.os);
            }
            xterm.raw.options.windowsPty = processTraits.windowsPty;
        }));
        this._register(this._processManager.onRestoreCommands(e => this.xterm?.shellIntegration.deserialize(e)));
        this._register(this._viewDescriptorService.onDidChangeLocation(({ views }) => {
            if (views.some(v => v.id === TERMINAL_VIEW_ID)) {
                xterm.refresh();
            }
        }));
        this._register(xterm.onDidChangeProgress(() => this._labelComputer?.refreshLabel(this)));
        // Register and update the terminal's shell integration status
        this._register(Event.runAndSubscribe(xterm.shellIntegration.onDidChangeSeenSequences, () => {
            if (xterm.shellIntegration.seenSequences.size > 0) {
                refreshShellIntegrationInfoStatus(this);
            }
        }));
        // Set up updating of the process cwd on key press, this is only needed when the cwd
        // detection capability has not been registered
        if (!this.capabilities.has(0 /* TerminalCapability.CwdDetection */)) {
            let onKeyListener = xterm.raw.onKey(e => {
                const event = new StandardKeyboardEvent(e.domEvent);
                if (event.equals(3 /* KeyCode.Enter */)) {
                    this._updateProcessCwd();
                }
            });
            this._register(this.capabilities.onDidAddCwdDetectionCapability(() => {
                onKeyListener?.dispose();
                onKeyListener = undefined;
            }));
        }
        if (this.xterm?.shellIntegration) {
            this.capabilities.add(this.xterm.shellIntegration.capabilities);
        }
        this._pathService.userHome().then(userHome => {
            this._userHome = userHome.fsPath;
        });
        if (this._isVisible) {
            this._open();
        }
        return xterm;
    }
    async runCommand(commandLine, shouldExecute, commandId) {
        let commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const siInjectionEnabled = this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */) === true;
        const timeoutMs = getShellIntegrationTimeout(this._configurationService, siInjectionEnabled, this.hasRemoteAuthority, this._processManager.processReadyTimestamp);
        if (!commandDetection || commandDetection.promptInputModel.state !== 1 /* PromptInputState.Input */) {
            const store = new DisposableStore();
            await Promise.race([
                new Promise(r => {
                    store.add(this.capabilities.onDidAddCommandDetectionCapability(e => {
                        commandDetection = e;
                        if (commandDetection.promptInputModel.state === 1 /* PromptInputState.Input */) {
                            r();
                        }
                        else {
                            store.add(commandDetection.promptInputModel.onDidStartInput(() => {
                                r();
                            }));
                        }
                    }));
                }),
                timeout(timeoutMs)
            ]);
            store.dispose();
        }
        // If a command ID was provided and we have command detection, set it as the next command ID
        // so it will be used when the shell sends the command start sequence
        if (commandId && commandDetection) {
            this.xterm?.shellIntegration.setNextCommandId(commandLine, commandId);
            await this._processManager.setNextCommandId(commandLine, commandId);
        }
        // Determine whether to send ETX (ctrl+c) before running the command. Only do this when the
        // command will be executed immediately or when command detection shows the prompt contains text.
        if (shouldExecute && (!commandDetection || commandDetection.promptInputModel.value.length > 0)) {
            await this.sendText('\x03', false);
            // Wait a little before running the command to avoid the sequences being echoed while the ^C
            // is being evaluated
            await timeout(100);
        }
        // Use bracketed paste mode only when not running the command
        await this.sendText(commandLine, shouldExecute, !shouldExecute);
    }
    detachFromElement() {
        this._wrapperElement.remove();
        this._container = undefined;
    }
    attachToElement(container) {
        // The container did not change, do nothing
        if (this._container === container) {
            return;
        }
        if (!this._attachBarrier.isOpen()) {
            this._attachBarrier.open();
        }
        // The container changed, reattach
        this._container = container;
        this._container.appendChild(this._wrapperElement);
        // If xterm is already attached, call open again to pick up any changes to the window.
        if (this.xterm?.raw.element) {
            this.xterm.raw.open(this.xterm.raw.element);
        }
        this.xterm?.refresh();
        setTimeout(() => {
            if (this._store.isDisposed) {
                return;
            }
            this._initDragAndDrop(container);
        }, 0);
    }
    /**
     * Opens the terminal instance inside the parent DOM element previously set with
     * `attachToElement`, you must ensure the parent DOM element is explicitly visible before
     * invoking this function as it performs some DOM calculations internally
     */
    _open() {
        if (!this.xterm || this.xterm.raw.element) {
            return;
        }
        if (!this._container || !this._container.isConnected) {
            throw new Error('A container element needs to be set with `attachToElement` and be part of the DOM before calling `_open`');
        }
        const xtermElement = document.createElement('div');
        this._wrapperElement.appendChild(xtermElement);
        this._container.appendChild(this._wrapperElement);
        const xterm = this.xterm;
        // Attach the xterm object to the DOM, exposing it to the smoke tests
        this._wrapperElement.xterm = xterm.raw;
        const screenElement = xterm.attachToElement(xtermElement);
        // Fire xtermOpen on all contributions
        for (const contribution of this._contributions.values()) {
            if (!this.xterm) {
                this._xtermReadyPromise.then(xterm => {
                    if (xterm) {
                        contribution.xtermOpen?.(xterm);
                    }
                });
            }
            else {
                contribution.xtermOpen?.(this.xterm);
            }
        }
        this._register(xterm.shellIntegration.onDidChangeStatus(() => {
            if (this.hasFocus) {
                this._setShellIntegrationContextKey();
            }
            else {
                this._terminalShellIntegrationEnabledContextKey.reset();
            }
        }));
        if (!xterm.raw.element || !xterm.raw.textarea) {
            throw new Error('xterm elements not set after open');
        }
        this._setAriaLabel(xterm.raw, this._instanceId, this._title);
        xterm.raw.attachCustomKeyEventHandler((event) => {
            // Disable all input if the terminal is exiting
            if (this._isExiting) {
                return false;
            }
            const standardKeyboardEvent = new StandardKeyboardEvent(event);
            const resolveResult = this._keybindingService.softDispatch(standardKeyboardEvent, standardKeyboardEvent.target);
            // Respect chords if the allowChords setting is set and it's not Escape. Escape is
            // handled specially for Zen Mode's Escape, Escape chord, plus it's important in
            // terminals generally
            const isValidChord = resolveResult.kind === 1 /* ResultKind.MoreChordsNeeded */ && this._terminalConfigurationService.config.allowChords && event.key !== 'Escape';
            if (this._keybindingService.inChordMode || isValidChord) {
                event.preventDefault();
                return false;
            }
            const SHOW_TERMINAL_CONFIG_PROMPT_KEY = 'terminal.integrated.showTerminalConfigPrompt';
            const EXCLUDED_KEYS = ['RightArrow', 'LeftArrow', 'UpArrow', 'DownArrow', 'Space', 'Meta', 'Control', 'Shift', 'Alt', '', 'Delete', 'Backspace', 'Tab'];
            // only keep track of input if prompt hasn't already been shown
            if (this._storageService.getBoolean(SHOW_TERMINAL_CONFIG_PROMPT_KEY, -1 /* StorageScope.APPLICATION */, true) &&
                !EXCLUDED_KEYS.includes(event.key) &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey) {
                this._hasHadInput = true;
            }
            // for keyboard events that resolve to commands described
            // within commandsToSkipShell, either alert or skip processing by xterm.js
            if (resolveResult.kind === 2 /* ResultKind.KbFound */ && resolveResult.commandId && this._skipTerminalCommands.some(k => k === resolveResult.commandId) && !this._terminalConfigurationService.config.sendKeybindingsToShell) {
                // don't alert when terminal is opened or closed
                if (this._storageService.getBoolean(SHOW_TERMINAL_CONFIG_PROMPT_KEY, -1 /* StorageScope.APPLICATION */, true) &&
                    this._hasHadInput &&
                    !TERMINAL_CREATION_COMMANDS.includes(resolveResult.commandId)) {
                    this._notificationService.prompt(Severity.Info, nls.localize('keybindingHandling', "Some keybindings don't go to the terminal by default and are handled by {0} instead.", this._productService.nameLong), [
                        {
                            label: nls.localize('configureTerminalSettings', "Configure Terminal Settings"),
                            run: () => {
                                this._preferencesService.openSettings({ jsonEditor: false, query: `@id:${"terminal.integrated.commandsToSkipShell" /* TerminalSettingId.CommandsToSkipShell */},${"terminal.integrated.sendKeybindingsToShell" /* TerminalSettingId.SendKeybindingsToShell */},${"terminal.integrated.allowChords" /* TerminalSettingId.AllowChords */}` });
                            }
                        }
                    ]);
                    this._storageService.store(SHOW_TERMINAL_CONFIG_PROMPT_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
                event.preventDefault();
                return false;
            }
            // Skip processing by xterm.js of keyboard events that match menu bar mnemonics
            if (this._terminalConfigurationService.config.allowMnemonics && !isMacintosh && event.altKey) {
                return false;
            }
            // If tab focus mode is on, tab is not passed to the terminal
            if (TabFocus.getTabFocusMode() && event.key === 'Tab') {
                return false;
            }
            // Prevent default when shift+tab is being sent to the terminal to avoid it bubbling up
            // and changing focus https://github.com/microsoft/vscode/issues/188329
            if (event.key === 'Tab' && event.shiftKey) {
                event.preventDefault();
                return true;
            }
            // Always have alt+F4 skip the terminal on Windows and allow it to be handled by the
            // system
            if (isWindows && event.altKey && event.key === 'F4' && !event.ctrlKey) {
                return false;
            }
            // Fallback to force ctrl+v to paste on browsers that do not support
            // navigator.clipboard.readText
            if (!BrowserFeatures.clipboard.readText && event.key === 'v' && event.ctrlKey) {
                return false;
            }
            return true;
        });
        this._register(dom.addDisposableListener(xterm.raw.element, 'mousedown', () => {
            // We need to listen to the mouseup event on the document since the user may release
            // the mouse button anywhere outside of _xterm.element.
            const listener = dom.addDisposableListener(xterm.raw.element.ownerDocument, 'mouseup', () => {
                // Delay with a setTimeout to allow the mouseup to propagate through the DOM
                // before evaluating the new selection state.
                setTimeout(() => this._refreshSelectionContextKey(), 0);
                listener.dispose();
            });
        }));
        this._register(dom.addDisposableListener(xterm.raw.element, 'touchstart', () => {
            xterm.raw.focus();
        }));
        // xterm.js currently drops selection on keyup as we need to handle this case.
        this._register(dom.addDisposableListener(xterm.raw.element, 'keyup', () => {
            // Wait until keyup has propagated through the DOM before evaluating
            // the new selection state.
            setTimeout(() => this._refreshSelectionContextKey(), 0);
        }));
        this._register(dom.addDisposableListener(xterm.raw.textarea, 'focus', () => this._setFocus(true)));
        this._register(dom.addDisposableListener(xterm.raw.textarea, 'blur', () => this._setFocus(false)));
        this._register(dom.addDisposableListener(xterm.raw.textarea, 'focusout', () => this._setFocus(false)));
        this._initDragAndDrop(this._container);
        this._widgetManager.attachToElement(screenElement);
        if (this._lastLayoutDimensions) {
            this.layout(this._lastLayoutDimensions);
        }
        this.updateConfig();
        // If IShellLaunchConfig.waitOnExit was true and the process finished before the terminal
        // panel was initialized.
        if (xterm.raw.options.disableStdin) {
            this._attachPressAnyKeyToCloseListener(xterm.raw);
        }
    }
    _setFocus(focused) {
        if (focused) {
            this._terminalFocusContextKey.set(true);
            this._setShellIntegrationContextKey();
            this._onDidFocus.fire(this);
        }
        else {
            this.resetFocusContextKey();
            this._onDidBlur.fire(this);
            this._refreshSelectionContextKey();
        }
    }
    _setShellIntegrationContextKey() {
        if (this.xterm) {
            this._terminalShellIntegrationEnabledContextKey.set(this.xterm.shellIntegration.status === 2 /* ShellIntegrationStatus.VSCode */);
        }
    }
    resetFocusContextKey() {
        this._terminalFocusContextKey.reset();
        this._terminalShellIntegrationEnabledContextKey.reset();
    }
    _initDragAndDrop(container) {
        const store = new DisposableStore();
        const dndController = store.add(this._scopedInstantiationService.createInstance(TerminalInstanceDragAndDropController, container));
        store.add(dndController.onDropTerminal(e => this._onRequestAddInstanceToGroup.fire(e)));
        store.add(dndController.onDropFile(async (path) => {
            this.focus();
            await this.sendPath(path, false);
        }));
        store.add(new dom.DragAndDropObserver(container, dndController));
        this._dndObserver.value = store;
    }
    hasSelection() {
        return this.xterm ? this.xterm.raw.hasSelection() : false;
    }
    get selection() {
        return this.xterm && this.hasSelection() ? this.xterm.raw.getSelection() : undefined;
    }
    clearSelection() {
        this.xterm?.raw.clearSelection();
    }
    _refreshAltBufferContextKey() {
        this._terminalAltBufferActiveContextKey.set(!!(this.xterm && this.xterm.raw.buffer.active === this.xterm.raw.buffer.alternate));
    }
    dispose(reason) {
        if (this.shellLaunchConfig.type === 'Task' && reason === TerminalExitReason.Process && this._exitCode !== 0 && !this.shellLaunchConfig.waitOnExit) {
            return;
        }
        if (this.isDisposed) {
            return;
        }
        this._logService.trace(`terminalInstance#dispose (instanceId: ${this.instanceId})`);
        dispose(this._widgetManager);
        if (this.xterm?.raw.element) {
            this._hadFocusOnExit = this.hasFocus;
        }
        if (this._wrapperElement.xterm) {
            this._wrapperElement.xterm = undefined;
        }
        if (this._horizontalScrollbar) {
            this._horizontalScrollbar.dispose();
            this._horizontalScrollbar = undefined;
        }
        try {
            this.xterm?.dispose();
        }
        catch (err) {
            // See https://github.com/microsoft/vscode/issues/153486
            this._logService.error('Exception occurred during xterm disposal', err);
        }
        // HACK: Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=559561,
        // as 'blur' event in xterm.raw.textarea is not triggered on xterm.dispose()
        // See https://github.com/microsoft/vscode/issues/138358
        if (isFirefox) {
            this.resetFocusContextKey();
            this._terminalHasTextContextKey.reset();
            this._onDidBlur.fire(this);
        }
        if (this._pressAnyKeyToCloseListener) {
            this._pressAnyKeyToCloseListener.dispose();
            this._pressAnyKeyToCloseListener = undefined;
        }
        if (this._exitReason === undefined) {
            this._exitReason = reason ?? TerminalExitReason.Unknown;
        }
        this._processManager.dispose();
        // Process manager dispose/shutdown doesn't fire process exit, trigger with undefined if it
        // hasn't happened yet
        this._onProcessExit(undefined);
        this._onDisposed.fire(this);
        super.dispose();
    }
    async detachProcessAndDispose(reason) {
        // Detach the process and dispose the instance, without the instance dispose the terminal
        // won't go away. Force persist if the detach was requested by the user (not shutdown).
        await this._processManager.detachFromProcess(reason === TerminalExitReason.User);
        this.dispose(reason);
    }
    focus(force) {
        this._refreshAltBufferContextKey();
        if (!this.xterm) {
            return;
        }
        if (force || !dom.getActiveWindow().getSelection()?.toString()) {
            this.xterm.raw.focus();
            this._onDidRequestFocus.fire();
        }
    }
    async focusWhenReady(force) {
        await this._xtermReadyPromise;
        await this._attachBarrier.wait();
        this.focus(force);
    }
    async sendText(text, shouldExecute, bracketedPasteMode) {
        // Apply bracketed paste sequences if the terminal has the mode enabled, this will prevent
        // the text from triggering keybindings and ensure new lines are handled properly
        if (bracketedPasteMode && this.xterm?.raw.modes.bracketedPasteMode) {
            text = `\x1b[200~${text}\x1b[201~`;
        }
        // Normalize line endings to 'enter' press.
        text = text.replace(/\r?\n/g, '\r');
        if (shouldExecute && !text.endsWith('\r')) {
            text += '\r';
        }
        // Send it to the process
        this._logService.debug('sending data (vscode)', text);
        await this._processManager.write(text);
        this._onDidInputData.fire(text);
        this._onDidSendText.fire(text);
        this.xterm?.scrollToBottom();
        if (shouldExecute) {
            this._onDidExecuteText.fire();
        }
    }
    async sendSignal(signal) {
        this._logService.debug('sending signal (vscode)', signal);
        await this._processManager.sendSignal(signal);
    }
    async sendPath(originalPath, shouldExecute) {
        return this.sendText(await this.preparePathForShell(originalPath), shouldExecute);
    }
    async preparePathForShell(originalPath) {
        // Wait for shell type to be ready
        await this.processReady;
        return preparePathForShell(originalPath, this.shellLaunchConfig.executable, this.title, this.shellType, this._processManager.backend, this._processManager.os);
    }
    async getUriLabelForShell(uri) {
        // Wait for shell type to be ready
        await this.processReady;
        return getUriLabelForShell(uri, this._processManager.backend, this.shellType, this.os);
    }
    setVisible(visible) {
        const didChange = this._isVisible !== visible;
        this._isVisible = visible;
        this._wrapperElement.classList.toggle('active', visible);
        if (visible && this.xterm) {
            this._open();
            // Flush any pending resizes
            this._resizeDebouncer?.flush();
            // Resize to re-evaluate dimensions, this will ensure when switching to a terminal it is
            // using the most up to date dimensions (eg. when terminal is created in the background
            // using cached dimensions of a split terminal).
            this._resize();
        }
        if (didChange) {
            this._onDidChangeVisibility.fire(visible);
        }
    }
    scrollDownLine() {
        this.xterm?.scrollDownLine();
    }
    scrollDownPage() {
        this.xterm?.scrollDownPage();
    }
    scrollToBottom() {
        this.xterm?.scrollToBottom();
    }
    scrollUpLine() {
        this.xterm?.scrollUpLine();
    }
    scrollUpPage() {
        this.xterm?.scrollUpPage();
    }
    scrollToTop() {
        this.xterm?.scrollToTop();
    }
    clearBuffer() {
        this._processManager.clearBuffer();
        this.xterm?.clearBuffer();
    }
    _refreshSelectionContextKey() {
        const isActive = !!this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        let isEditorActive = false;
        const editor = this._editorService.activeEditor;
        if (editor) {
            isEditorActive = editor instanceof TerminalEditorInput;
        }
        this._terminalHasTextContextKey.set((isActive || isEditorActive) && this.hasSelection());
    }
    _createProcessManager() {
        let deserializedCollections;
        if (this.shellLaunchConfig.attachPersistentProcess?.environmentVariableCollections) {
            deserializedCollections = deserializeEnvironmentVariableCollections(this.shellLaunchConfig.attachPersistentProcess.environmentVariableCollections);
        }
        const processManager = this._scopedInstantiationService.createInstance(TerminalProcessManager, this._instanceId, this.shellLaunchConfig?.cwd, deserializedCollections, this.shellLaunchConfig.shellIntegrationNonce ?? this.shellLaunchConfig.attachPersistentProcess?.shellIntegrationNonce);
        this.capabilities.add(processManager.capabilities);
        this._register(processManager.onProcessReady(async (e) => {
            this._onProcessIdReady.fire(this);
            this._initialCwd = await this.getInitialCwd();
            // Set the initial name based on the _resolved_ shell launch config, this will also
            // ensure the resolved icon gets shown
            if (!this._labelComputer) {
                this._labelComputer = this._register(this._scopedInstantiationService.createInstance(TerminalLabelComputer));
                this._register(this._labelComputer.onDidChangeLabel(e => {
                    const wasChanged = this._title !== e.title || this._description !== e.description;
                    if (wasChanged) {
                        this._title = e.title;
                        this._description = e.description;
                        this._onTitleChanged.fire(this);
                    }
                }));
            }
            if (this._shellLaunchConfig.name) {
                this._setTitle(this._shellLaunchConfig.name, TitleEventSource.Api);
            }
            else {
                // Listen to xterm.js' sequence title change event, trigger this async to ensure
                // _xtermReadyPromise is ready constructed since this is called from the ctor
                setTimeout(() => {
                    this._xtermReadyPromise.then(xterm => {
                        if (xterm) {
                            this._messageTitleDisposable.value = xterm.raw.onTitleChange(e => this._onTitleChange(e));
                        }
                    });
                });
                this._setTitle(this._shellLaunchConfig.executable, TitleEventSource.Process);
            }
        }));
        this._register(processManager.onProcessExit(exitCode => this._onProcessExit(exitCode)));
        this._register(processManager.onDidChangeProperty(({ type, value }) => {
            switch (type) {
                case "cwd" /* ProcessPropertyType.Cwd */:
                    this._cwd = value;
                    this._labelComputer?.refreshLabel(this);
                    break;
                case "initialCwd" /* ProcessPropertyType.InitialCwd */:
                    this._initialCwd = value;
                    this._cwd = this._initialCwd;
                    this._setTitle(this.title, TitleEventSource.Config);
                    this._icon = this._shellLaunchConfig.attachPersistentProcess?.icon || this._shellLaunchConfig.icon;
                    this._onIconChanged.fire({ instance: this, userInitiated: false });
                    break;
                case "title" /* ProcessPropertyType.Title */:
                    this._setTitle(value ?? '', TitleEventSource.Process);
                    break;
                case "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */:
                    this.setOverrideDimensions(value, true);
                    break;
                case "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */:
                    this._setResolvedShellLaunchConfig(value);
                    break;
                case "shellType" /* ProcessPropertyType.ShellType */:
                    this.setShellType(value);
                    break;
                case "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */:
                    this._onDidChangeHasChildProcesses.fire(value);
                    break;
                case "usedShellIntegrationInjection" /* ProcessPropertyType.UsedShellIntegrationInjection */:
                    this._usedShellIntegrationInjection = true;
                    break;
                case "shellIntegrationInjectionFailureReason" /* ProcessPropertyType.ShellIntegrationInjectionFailureReason */:
                    this._shellIntegrationInjectionInfo = value;
                    break;
            }
        }));
        this._initialDataEventsListener.value = processManager.onProcessData(ev => this._initialDataEvents?.push(ev.data));
        this._register(processManager.onProcessReplayComplete(() => this._onProcessReplayComplete.fire()));
        this._register(processManager.onEnvironmentVariableInfoChanged(e => this._onEnvironmentVariableInfoChanged(e)));
        this._register(processManager.onPtyDisconnect(() => {
            if (this.xterm) {
                this.xterm.raw.options.disableStdin = true;
            }
            this.statusList.add({
                id: "disconnected" /* TerminalStatus.Disconnected */,
                severity: Severity.Error,
                icon: Codicon.debugDisconnect,
                tooltip: nls.localize('disconnectStatus', "Lost connection to process")
            });
        }));
        this._register(processManager.onPtyReconnect(() => {
            if (this.xterm) {
                this.xterm.raw.options.disableStdin = false;
            }
            this.statusList.remove("disconnected" /* TerminalStatus.Disconnected */);
        }));
        return processManager;
    }
    async _createProcess() {
        if (this.isDisposed) {
            return;
        }
        const trusted = await this._trust();
        // Allow remote and local terminals from remote to be created in untrusted remote workspace
        if (!trusted && !this.remoteAuthority && !this._workbenchEnvironmentService.remoteAuthority) {
            this._onProcessExit({ message: nls.localize('workspaceNotTrustedCreateTerminal', "Cannot launch a terminal process in an untrusted workspace") });
        }
        else if (this._workspaceContextService.getWorkspace().folders.length === 0 && this._cwd && this._userHome && this._cwd !== this._userHome) {
            // something strange is going on if cwd is not userHome in an empty workspace
            this._onProcessExit({
                message: nls.localize('workspaceNotTrustedCreateTerminalCwd', "Cannot launch a terminal process in an untrusted workspace with cwd {0} and userHome {1}", this._cwd, this._userHome)
            });
        }
        // Re-evaluate dimensions if the container has been set since the xterm instance was created
        if (this._container && this._cols === 0 && this._rows === 0) {
            this._initDimensions();
            this.xterm?.resize(this._cols || 80 /* Constants.DefaultCols */, this._rows || 30 /* Constants.DefaultRows */);
        }
        const originalIcon = this.shellLaunchConfig.icon;
        await this._processManager.createProcess(this._shellLaunchConfig, this._cols || 80 /* Constants.DefaultCols */, this._rows || 30 /* Constants.DefaultRows */).then(result => {
            if (result) {
                if (hasKey(result, { message: true })) {
                    this._onProcessExit(result);
                }
                else if (hasKey(result, { injectedArgs: true })) {
                    this._injectedArgs = result.injectedArgs;
                }
            }
        });
        if (this.isDisposed) {
            return;
        }
        if (originalIcon !== this.shellLaunchConfig.icon || this.shellLaunchConfig.color) {
            this._icon = this._shellLaunchConfig.attachPersistentProcess?.icon || this._shellLaunchConfig.icon;
            this._onIconChanged.fire({ instance: this, userInitiated: false });
        }
    }
    registerMarker(offset) {
        return this.xterm?.raw.registerMarker(offset);
    }
    addBufferMarker(properties) {
        this.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */)?.addMark(properties);
    }
    scrollToMark(startMarkId, endMarkId, highlight) {
        this.xterm?.markTracker.scrollToClosestMarker(startMarkId, endMarkId, highlight);
    }
    async freePortKillProcess(port, command) {
        await this._processManager?.freePortKillProcess(port);
        this.runCommand(command, false);
    }
    _onProcessData(ev) {
        // Ensure events are split by SI command execute and command finished sequence to ensure the
        // output of the command can be read by extensions and the output of the command is of a
        // consistent form respectively. This must be done here as xterm.js does not currently have
        // a listener for when individual data events are parsed, only `onWriteParsed` which fires
        // when the write buffer is flushed.
        const leadingSegmentedData = [];
        const matches = ev.data.matchAll(/(?<seq>\x1b\][16]33;(?:C|D(?:;\d+)?)\x07)/g);
        let i = 0;
        for (const match of matches) {
            if (match.groups?.seq === undefined) {
                throw new BugIndicatingError('seq must be defined');
            }
            leadingSegmentedData.push(ev.data.substring(i, match.index));
            leadingSegmentedData.push(match.groups?.seq ?? '');
            i = match.index + match[0].length;
        }
        const lastData = ev.data.substring(i);
        // Write all leading segmented data first, followed by the last data, tracking commit if
        // necessary
        for (let i = 0; i < leadingSegmentedData.length; i++) {
            this._writeProcessData(leadingSegmentedData[i]);
        }
        if (ev.trackCommit) {
            ev.writePromise = new Promise(r => this._writeProcessData(lastData, r));
        }
        else {
            this._writeProcessData(lastData);
        }
    }
    _writeProcessData(data, cb) {
        this._onWillData.fire(data);
        const messageId = ++this._latestXtermWriteData;
        this.xterm?.raw.write(data, () => {
            this._latestXtermParseData = messageId;
            this._processManager.acknowledgeDataEvent(data.length);
            cb?.();
            this._onData.fire(data);
        });
    }
    /**
     * Called when either a process tied to a terminal has exited or when a terminal renderer
     * simulates a process exiting (e.g. custom execution task).
     * @param exitCode The exit code of the process, this is undefined when the terminal was exited
     * through user action.
     */
    async _onProcessExit(exitCodeOrError) {
        // Prevent dispose functions being triggered multiple times
        if (this._isExiting) {
            return;
        }
        const parsedExitResult = parseExitResult(exitCodeOrError, this.shellLaunchConfig, this._processManager.processState, this._initialCwd);
        if (this._usedShellIntegrationInjection && this._processManager.processState === 4 /* ProcessState.KilledDuringLaunch */ && parsedExitResult?.code !== 0) {
            this._relaunchWithShellIntegrationDisabled(parsedExitResult?.message);
            this._onExit.fire(exitCodeOrError);
            return;
        }
        this._isExiting = true;
        await this._flushXtermData();
        this._exitCode = parsedExitResult?.code;
        const exitMessage = parsedExitResult?.message;
        this._logService.debug('Terminal process exit', 'instanceId', this.instanceId, 'code', this._exitCode, 'processState', this._processManager.processState);
        // Only trigger wait on exit when the exit was *not* triggered by the
        // user (via the `workbench.action.terminal.kill` command).
        const waitOnExit = this.waitOnExit;
        if (waitOnExit && this._processManager.processState !== 5 /* ProcessState.KilledByUser */) {
            this._xtermReadyPromise.then(xterm => {
                if (!xterm) {
                    return;
                }
                if (exitMessage) {
                    xterm.raw.write(formatMessageForTerminal(exitMessage));
                }
                switch (typeof waitOnExit) {
                    case 'string':
                        xterm.raw.write(formatMessageForTerminal(waitOnExit, { excludeLeadingNewLine: true }));
                        break;
                    case 'function':
                        if (this.exitCode !== undefined) {
                            xterm.raw.write(formatMessageForTerminal(waitOnExit(this.exitCode), { excludeLeadingNewLine: true }));
                        }
                        break;
                }
                // Disable all input if the terminal is exiting and listen for next keypress
                xterm.raw.options.disableStdin = true;
                if (xterm.raw.textarea) {
                    this._attachPressAnyKeyToCloseListener(xterm.raw);
                }
            });
        }
        else {
            if (exitMessage) {
                const failedDuringLaunch = this._processManager.processState === 4 /* ProcessState.KilledDuringLaunch */;
                if (failedDuringLaunch || (this._terminalConfigurationService.config.showExitAlert && this.xterm?.lastInputEvent !== /*Ctrl+D*/ '\x04')) {
                    // Always show launch failures
                    this._notificationService.notify({
                        message: exitMessage,
                        severity: Severity.Error,
                        actions: { primary: [this._scopedInstantiationService.createInstance(TerminalLaunchHelpAction)] }
                    });
                }
                else {
                    // Log to help surface the error in case users report issues with showExitAlert
                    // disabled
                    this._logService.warn(exitMessage);
                }
            }
            this.dispose(TerminalExitReason.Process);
        }
        // First onExit to consumers, this can happen after the terminal has already been disposed.
        this._onExit.fire(exitCodeOrError);
        // Dispose of the onExit event if the terminal will not be reused again
        if (this.isDisposed) {
            this._onExit.dispose();
        }
    }
    _relaunchWithShellIntegrationDisabled(exitMessage) {
        this._shellLaunchConfig.ignoreShellIntegration = true;
        this.relaunch();
        this.statusList.add({
            id: "shell-integration-attention-needed" /* TerminalStatus.ShellIntegrationAttentionNeeded */,
            severity: Severity.Warning,
            icon: Codicon.warning,
            tooltip: `${exitMessage} ` + nls.localize('launchFailed.exitCodeOnlyShellIntegration', 'Disabling shell integration in user settings might help.'),
            hoverActions: [{
                    commandId: "workbench.action.terminal.learnMore" /* TerminalCommandId.ShellIntegrationLearnMore */,
                    label: nls.localize('shellIntegration.learnMore', "Learn more about shell integration"),
                    run: () => {
                        this._openerService.open('https://code.visualstudio.com/docs/editor/integrated-terminal#_shell-integration');
                    }
                }, {
                    commandId: 'workbench.action.openSettings',
                    label: nls.localize('shellIntegration.openSettings', "Open user settings"),
                    run: () => {
                        this._commandService.executeCommand('workbench.action.openSettings', 'terminal.integrated.shellIntegration.enabled');
                    }
                }]
        });
        this._telemetryService.publicLog2('terminal/shellIntegrationFailureProcessExit');
    }
    /**
     * Ensure write calls to xterm.js have finished before resolving.
     */
    _flushXtermData() {
        if (this._latestXtermWriteData === this._latestXtermParseData) {
            return Promise.resolve();
        }
        let retries = 0;
        return new Promise(r => {
            const interval = dom.disposableWindowInterval(dom.getActiveWindow().window, () => {
                if (this._latestXtermWriteData === this._latestXtermParseData || ++retries === 5) {
                    interval.dispose();
                    r();
                }
            }, 20);
        });
    }
    _attachPressAnyKeyToCloseListener(xterm) {
        if (xterm.textarea && !this._pressAnyKeyToCloseListener) {
            this._pressAnyKeyToCloseListener = dom.addDisposableListener(xterm.textarea, 'keypress', (event) => {
                if (this._pressAnyKeyToCloseListener) {
                    this._pressAnyKeyToCloseListener.dispose();
                    this._pressAnyKeyToCloseListener = undefined;
                    this.dispose(TerminalExitReason.Process);
                    event.preventDefault();
                }
            });
        }
    }
    _writeInitialText(xterm, callback) {
        if (!this._shellLaunchConfig.initialText) {
            callback?.();
            return;
        }
        const text = isString(this._shellLaunchConfig.initialText)
            ? this._shellLaunchConfig.initialText
            : this._shellLaunchConfig.initialText?.text;
        if (isString(this._shellLaunchConfig.initialText)) {
            xterm.raw.writeln(text, callback);
        }
        else {
            if (this._shellLaunchConfig.initialText.trailingNewLine) {
                xterm.raw.writeln(text, callback);
            }
            else {
                xterm.raw.write(text, callback);
            }
        }
    }
    async reuseTerminal(shell, reset = false) {
        // Unsubscribe any key listener we may have.
        this._pressAnyKeyToCloseListener?.dispose();
        this._pressAnyKeyToCloseListener = undefined;
        const xterm = this.xterm;
        if (xterm) {
            if (!reset) {
                // Ensure new processes' output starts at start of new line
                await new Promise(r => xterm.raw.write('\n\x1b[G', r));
            }
            // Print initialText if specified
            if (shell.initialText) {
                this._shellLaunchConfig.initialText = shell.initialText;
                await new Promise(r => this._writeInitialText(xterm, r));
            }
            // Clean up waitOnExit state
            if (this._isExiting && this._shellLaunchConfig.waitOnExit) {
                xterm.raw.options.disableStdin = false;
                this._isExiting = false;
            }
            if (reset) {
                xterm.clearDecorations();
            }
        }
        // Dispose the environment info widget if it exists
        this.statusList.remove("relaunch-needed" /* TerminalStatus.RelaunchNeeded */);
        if (!reset) {
            // HACK: Force initialText to be non-falsy for reused terminals such that the
            // conptyInheritCursor flag is passed to the node-pty, this flag can cause a Window to stop
            // responding in Windows 10 1903 so we only want to use it when something is definitely written
            // to the terminal.
            shell.initialText = ' ';
        }
        // Set the new shell launch config
        this._shellLaunchConfig = shell; // Must be done before calling _createProcess()
        await this._processManager.relaunch(this._shellLaunchConfig, this._cols || 80 /* Constants.DefaultCols */, this._rows || 30 /* Constants.DefaultRows */, reset).then(result => {
            if (result) {
                if (hasKey(result, { message: true })) {
                    this._onProcessExit(result);
                }
                else if (hasKey(result, { injectedArgs: true })) {
                    this._injectedArgs = result.injectedArgs;
                }
            }
        });
    }
    relaunch() {
        // Clear the attachPersistentProcess flag to ensure we create a new process
        // instead of trying to reattach to the existing one during relaunch.
        const shellLaunchConfig = { ...this._shellLaunchConfig };
        delete shellLaunchConfig.attachPersistentProcess;
        this.reuseTerminal(shellLaunchConfig, true);
    }
    _onTitleChange(title) {
        if (this.isTitleSetByProcess) {
            this._setTitle(title, TitleEventSource.Sequence);
        }
    }
    async _trust() {
        return (await this._workspaceTrustRequestService.requestWorkspaceTrust({
            message: nls.localize('terminal.requestTrust', "Creating a terminal process requires executing code")
        })) === true;
    }
    async _updateProcessCwd() {
        if (this.isDisposed || this.shellLaunchConfig.customPtyImplementation) {
            return;
        }
        // reset cwd if it has changed, so file based url paths can be resolved
        try {
            const cwd = await this._refreshProperty("cwd" /* ProcessPropertyType.Cwd */);
            if (!isString(cwd)) {
                throw new Error(`cwd is not a string ${cwd}`);
            }
        }
        catch (e) {
            // Swallow this as it means the process has been killed
            if (e instanceof Error && e.message === 'Cannot refresh property when process is not set') {
                return;
            }
            throw e;
        }
    }
    updateConfig() {
        this._setCommandsToSkipShell(this._terminalConfigurationService.config.commandsToSkipShell);
        this._refreshEnvironmentVariableInfoWidgetState(this._processManager.environmentVariableInfo);
    }
    async _updateUnicodeVersion() {
        this._processManager.setUnicodeVersion(this._terminalConfigurationService.config.unicodeVersion);
    }
    updateAccessibilitySupport() {
        this.xterm.raw.options.screenReaderMode = this._accessibilityService.isScreenReaderOptimized();
    }
    _setCommandsToSkipShell(commands) {
        const excludeCommands = commands.filter(command => command[0] === '-').map(command => command.slice(1));
        this._skipTerminalCommands = DEFAULT_COMMANDS_TO_SKIP_SHELL.filter(defaultCommand => {
            return !excludeCommands.includes(defaultCommand);
        }).concat(commands);
    }
    layout(dimension) {
        this._lastLayoutDimensions = dimension;
        if (this.disableLayout) {
            return;
        }
        // Don't layout if dimensions are invalid (eg. the container is not attached to the DOM or
        // if display: none
        if (dimension.width <= 0 || dimension.height <= 0) {
            return;
        }
        // Evaluate columns and rows, exclude the wrapper element's margin
        const terminalWidth = this._evaluateColsAndRows(dimension.width, dimension.height);
        if (!terminalWidth) {
            return;
        }
        this._resize();
        // Signal the container is ready
        if (!this._containerReadyBarrier.isOpen()) {
            this._containerReadyBarrier.open();
        }
        // Layout all contributions
        for (const contribution of this._contributions.values()) {
            if (!this.xterm) {
                this._xtermReadyPromise.then(xterm => {
                    if (xterm) {
                        contribution.layout?.(xterm, dimension);
                    }
                });
            }
            else {
                contribution.layout?.(this.xterm, dimension);
            }
        }
    }
    async _resize(immediate) {
        if (!this.xterm) {
            return;
        }
        let cols = this.cols;
        let rows = this.rows;
        // Only apply these settings when the terminal is visible so that
        // the characters are measured correctly.
        if (this._isVisible && this._layoutSettingsChanged) {
            const font = this.xterm.getFont();
            const config = this._terminalConfigurationService.config;
            this.xterm.raw.options.letterSpacing = font.letterSpacing;
            this.xterm.raw.options.lineHeight = font.lineHeight;
            this.xterm.raw.options.fontSize = font.fontSize;
            this.xterm.raw.options.fontFamily = font.fontFamily;
            this.xterm.raw.options.fontWeight = config.fontWeight;
            this.xterm.raw.options.fontWeightBold = config.fontWeightBold;
            // Any of the above setting changes could have changed the dimensions of the
            // terminal, re-evaluate now.
            this._initDimensions();
            cols = this.cols;
            rows = this.rows;
            this._layoutSettingsChanged = false;
        }
        if (isNaN(cols) || isNaN(rows)) {
            return;
        }
        if (cols !== this.xterm.raw.cols || rows !== this.xterm.raw.rows) {
            if (this._fixedRows || this._fixedCols) {
                await this._updateProperty("fixedDimensions" /* ProcessPropertyType.FixedDimensions */, { cols: this._fixedCols, rows: this._fixedRows });
            }
            this._onDimensionsChanged.fire();
        }
        TerminalInstance_1._lastKnownGridDimensions = { cols, rows };
        this._resizeDebouncer.resize(cols, rows, immediate ?? false);
    }
    async _updatePtyDimensions(rawXterm) {
        await this._processManager.setDimensions(rawXterm.cols, rawXterm.rows);
    }
    setShellType(shellType) {
        if (this._shellType === shellType) {
            return;
        }
        this._shellType = shellType;
        if (shellType === undefined) {
            this._terminalShellTypeContextKey.reset();
        }
        else {
            this._terminalShellTypeContextKey.set(shellType?.toString());
        }
        this._onDidChangeShellType.fire(shellType);
    }
    _setAriaLabel(xterm, terminalId, title) {
        const labelParts = [];
        if (xterm && xterm.textarea) {
            if (title && title.length > 0) {
                labelParts.push(nls.localize('terminalTextBoxAriaLabelNumberAndTitle', "Terminal {0}, {1}", terminalId, title));
            }
            else {
                labelParts.push(nls.localize('terminalTextBoxAriaLabel', "Terminal {0}", terminalId));
            }
            const screenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!screenReaderOptimized) {
                labelParts.push(nls.localize('terminalScreenReaderMode', "Run the command: Toggle Screen Reader Accessibility Mode for an optimized screen reader experience"));
            }
            const accessibilityHelpKeybinding = this._keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            if (this._configurationService.getValue("accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */) && accessibilityHelpKeybinding) {
                labelParts.push(nls.localize('terminalHelpAriaLabel', "Use {0} for terminal accessibility help", accessibilityHelpKeybinding));
            }
            xterm.textarea.setAttribute('aria-label', labelParts.join('\n'));
        }
    }
    _updateTitleProperties(title, eventSource) {
        if (!title) {
            return this._processName;
        }
        switch (eventSource) {
            case TitleEventSource.Process:
                if (this._processManager.os === 1 /* OperatingSystem.Windows */) {
                    // Extract the file name without extension
                    title = path.win32.parse(title).name;
                }
                else {
                    const firstSpaceIndex = title.indexOf(' ');
                    if (title.startsWith('/')) {
                        title = path.basename(title);
                    }
                    else if (firstSpaceIndex > -1) {
                        title = title.substring(0, firstSpaceIndex);
                    }
                }
                this._processName = title;
                break;
            case TitleEventSource.Api:
                // If the title has not been set by the API or the rename command, unregister the handler that
                // automatically updates the terminal name
                this._staticTitle = title;
                this._messageTitleDisposable.value = undefined;
                break;
            case TitleEventSource.Sequence:
                // On Windows, some shells will fire this with the full path which we want to trim
                // to show just the file name. This should only happen if the title looks like an
                // absolute Windows file path
                this._sequence = title;
                if (this._processManager.os === 1 /* OperatingSystem.Windows */ &&
                    title.match(/^[a-zA-Z]:\\.+\.[a-zA-Z]{1,3}/)) {
                    this._sequence = path.win32.parse(title).name;
                }
                break;
        }
        this._titleSource = eventSource;
        return title;
    }
    setOverrideDimensions(dimensions, immediate = false) {
        if (this._dimensionsOverride && this._dimensionsOverride.forceExactSize && !dimensions && this._rows === 0 && this._cols === 0) {
            // this terminal never had a real size => keep the last dimensions override exact size
            this._cols = this._dimensionsOverride.cols;
            this._rows = this._dimensionsOverride.rows;
        }
        this._dimensionsOverride = dimensions;
        if (immediate) {
            this._resize(true);
        }
        else {
            this._resize();
        }
    }
    async setFixedDimensions() {
        const cols = await this._quickInputService.input({
            title: nls.localize('setTerminalDimensionsColumn', "Set Fixed Dimensions: Column"),
            placeHolder: 'Enter a number of columns or leave empty for automatic width',
            validateInput: async (text) => text.length > 0 && !text.match(/^\d+$/) ? { content: 'Enter a number or leave empty size automatically', severity: Severity.Error } : undefined
        });
        if (cols === undefined) {
            return;
        }
        this._fixedCols = this._parseFixedDimension(cols);
        this._labelComputer?.refreshLabel(this);
        this._terminalHasFixedWidth.set(!!this._fixedCols);
        const rows = await this._quickInputService.input({
            title: nls.localize('setTerminalDimensionsRow', "Set Fixed Dimensions: Row"),
            placeHolder: 'Enter a number of rows or leave empty for automatic height',
            validateInput: async (text) => text.length > 0 && !text.match(/^\d+$/) ? { content: 'Enter a number or leave empty size automatically', severity: Severity.Error } : undefined
        });
        if (rows === undefined) {
            return;
        }
        this._fixedRows = this._parseFixedDimension(rows);
        this._labelComputer?.refreshLabel(this);
        await this._refreshScrollbar();
        this._resize();
        this.focus();
    }
    _parseFixedDimension(value) {
        if (value === '') {
            return undefined;
        }
        const parsed = parseInt(value);
        if (parsed <= 0) {
            throw new Error(`Could not parse dimension "${value}"`);
        }
        return parsed;
    }
    async toggleSizeToContentWidth() {
        if (!this.xterm?.raw.buffer.active) {
            return;
        }
        if (this._hasScrollBar) {
            this._terminalHasFixedWidth.set(false);
            this._fixedCols = undefined;
            this._fixedRows = undefined;
            this._hasScrollBar = false;
            this._initDimensions();
            await this._resize();
        }
        else {
            const font = this.xterm ? this.xterm.getFont() : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement));
            const maxColsForTexture = Math.floor(4096 /* Constants.MaxCanvasWidth */ / (font.charWidth ?? 20));
            // Fixed columns should be at least xterm.js' regular column count
            const proposedCols = Math.max(this.maxCols, Math.min(this.xterm.getLongestViewportWrappedLineLength(), maxColsForTexture));
            // Don't switch to fixed dimensions if the content already fits as it makes the scroll
            // bar look bad being off the edge
            if (proposedCols > this.xterm.raw.cols) {
                this._fixedCols = proposedCols;
            }
        }
        await this._refreshScrollbar();
        this._labelComputer?.refreshLabel(this);
        this.focus();
    }
    _refreshScrollbar() {
        if (this._fixedCols || this._fixedRows) {
            return this._addScrollbar();
        }
        return this._removeScrollbar();
    }
    async _addScrollbar() {
        const charWidth = (this.xterm ? this.xterm.getFont() : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement))).charWidth;
        if (!this.xterm?.raw.element || !this._container || !charWidth || !this._fixedCols) {
            return;
        }
        this._wrapperElement.classList.add('fixed-dims');
        this._hasScrollBar = true;
        this._initDimensions();
        await this._resize();
        this._terminalHasFixedWidth.set(true);
        if (!this._horizontalScrollbar) {
            this._horizontalScrollbar = this._register(new DomScrollableElement(this._wrapperElement, {
                vertical: 2 /* ScrollbarVisibility.Hidden */,
                horizontal: 1 /* ScrollbarVisibility.Auto */,
                useShadows: false,
                scrollYToX: false,
                consumeMouseWheelIfScrollbarIsNeeded: false
            }));
            this._container.appendChild(this._horizontalScrollbar.getDomNode());
        }
        this._horizontalScrollbar.setScrollDimensions({
            width: this.xterm.raw.element.clientWidth,
            scrollWidth: this._fixedCols * charWidth + 40 // Padding + scroll bar
        });
        this._horizontalScrollbar.getDomNode().style.paddingBottom = '16px';
        // work around for https://github.com/xtermjs/xterm.js/issues/3482
        if (isWindows) {
            for (let i = this.xterm.raw.buffer.active.viewportY; i < this.xterm.raw.buffer.active.length; i++) {
                const line = this.xterm.raw.buffer.active.getLine(i);
                line._line.isWrapped = false;
            }
        }
    }
    async _removeScrollbar() {
        if (!this._container || !this._horizontalScrollbar) {
            return;
        }
        this._horizontalScrollbar.getDomNode().remove();
        this._horizontalScrollbar.dispose();
        this._horizontalScrollbar = undefined;
        this._wrapperElement.remove();
        this._wrapperElement.classList.remove('fixed-dims');
        this._container.appendChild(this._wrapperElement);
    }
    _setResolvedShellLaunchConfig(shellLaunchConfig) {
        this._shellLaunchConfig.args = shellLaunchConfig.args;
        this._shellLaunchConfig.cwd = shellLaunchConfig.cwd;
        this._shellLaunchConfig.executable = shellLaunchConfig.executable;
        this._shellLaunchConfig.env = shellLaunchConfig.env;
    }
    _onEnvironmentVariableInfoChanged(info) {
        if (info.requiresAction) {
            this.xterm?.raw.textarea?.setAttribute('aria-label', nls.localize('terminalStaleTextBoxAriaLabel', "Terminal {0} environment is stale, run the 'Show Environment Information' command for more information", this._instanceId));
        }
        this._refreshEnvironmentVariableInfoWidgetState(info);
    }
    async _refreshEnvironmentVariableInfoWidgetState(info) {
        // Check if the status should exist
        if (!info) {
            this.statusList.remove("relaunch-needed" /* TerminalStatus.RelaunchNeeded */);
            this.statusList.remove("env-var-info-changes-active" /* TerminalStatus.EnvironmentVariableInfoChangesActive */);
            return;
        }
        // Recreate the process seamlessly without informing the use if the following conditions are
        // met.
        if (
        // The change requires a relaunch
        info.requiresAction &&
            // The feature is enabled
            this._terminalConfigurationService.config.environmentChangesRelaunch &&
            // Has not been interacted with
            !this._processManager.hasWrittenData &&
            // Not a feature terminal or is a reconnecting task terminal (TODO: Need to explain the latter case)
            (!this._shellLaunchConfig.isFeatureTerminal || (this.reconnectionProperties && this._configurationService.getValue('task.reconnection') === true)) &&
            // Not a custom pty
            !this._shellLaunchConfig.customPtyImplementation &&
            // Not an extension owned terminal
            !this._shellLaunchConfig.isExtensionOwnedTerminal &&
            // Not a reconnected or revived terminal
            !this._shellLaunchConfig.attachPersistentProcess &&
            // Not a Windows remote using ConPTY (#187084)
            !(this._processManager.remoteAuthority && this._terminalConfigurationService.config.windowsEnableConpty && (await this._processManager.getBackendOS()) === 1 /* OperatingSystem.Windows */)) {
            this.relaunch();
            return;
        }
        // Re-create statuses
        const workspaceFolder = getWorkspaceForTerminal(this.shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
        this.statusList.add(info.getStatus({ workspaceFolder }));
    }
    async getInitialCwd() {
        if (!this._initialCwd) {
            this._initialCwd = this._processManager.initialCwd;
        }
        return this._initialCwd;
    }
    async getSpeculativeCwd() {
        if (this.capabilities.has(0 /* TerminalCapability.CwdDetection */)) {
            return this.capabilities.get(0 /* TerminalCapability.CwdDetection */).getCwd();
        }
        else if (this.capabilities.has(1 /* TerminalCapability.NaiveCwdDetection */)) {
            return this.capabilities.get(1 /* TerminalCapability.NaiveCwdDetection */).getCwd();
        }
        return this._processManager.initialCwd;
    }
    async getCwdResource() {
        const cwd = this.capabilities.get(0 /* TerminalCapability.CwdDetection */)?.getCwd();
        if (!cwd) {
            return undefined;
        }
        let resource;
        if (this.remoteAuthority) {
            resource = await this._pathService.fileURI(cwd);
        }
        else {
            resource = URI.file(cwd);
        }
        if (await this._fileService.exists(resource)) {
            return resource;
        }
        return undefined;
    }
    async _refreshProperty(type) {
        await this.processReady;
        return this._processManager.refreshProperty(type);
    }
    async _updateProperty(type, value) {
        return this._processManager.updateProperty(type, value);
    }
    async rename(title, source) {
        this._setTitle(title, source ?? TitleEventSource.Api);
    }
    _setTitle(title, eventSource) {
        if ((this._shellLaunchConfig?.type === 'Task' || this._titleSource === TitleEventSource.Api) && eventSource === TitleEventSource.Process) {
            return;
        }
        const reset = !title;
        title = this._updateTitleProperties(title, eventSource);
        const titleChanged = title !== this._title;
        this._title = title;
        this._labelComputer?.refreshLabel(this, reset);
        this._setAriaLabel(this.xterm?.raw, this._instanceId, this._title);
        if (titleChanged) {
            this._onTitleChanged.fire(this);
        }
    }
    async changeIcon(icon) {
        if (icon) {
            this._icon = icon;
            this._onIconChanged.fire({ instance: this, userInitiated: true });
            return icon;
        }
        const iconPicker = this._scopedInstantiationService.createInstance(TerminalIconPicker);
        const pickedIcon = await iconPicker.pickIcons();
        iconPicker.dispose();
        if (!pickedIcon) {
            return undefined;
        }
        this._icon = pickedIcon;
        this._onIconChanged.fire({ instance: this, userInitiated: true });
        return pickedIcon;
    }
    async changeColor(color, skipQuickPick) {
        if (color) {
            this.shellLaunchConfig.color = color;
            this._onIconChanged.fire({ instance: this, userInitiated: true });
            return color;
        }
        else if (skipQuickPick) {
            // Reset this tab's color
            this.shellLaunchConfig.color = '';
            this._onIconChanged.fire({ instance: this, userInitiated: true });
            return;
        }
        const icon = this._getIcon();
        if (!icon) {
            return;
        }
        const colorTheme = this._themeService.getColorTheme();
        const standardColors = getStandardColors(colorTheme);
        const colorStyleDisposable = createColorStyleElement(colorTheme);
        const items = [];
        for (const colorKey of standardColors) {
            const colorClass = getColorClass(colorKey);
            items.push({
                label: `$(${Codicon.circleFilled.id}) ${colorKey.replace('terminal.ansi', '')}`, id: colorKey, description: colorKey, iconClasses: [colorClass]
            });
        }
        items.push({ type: 'separator' });
        const showAllColorsItem = { label: 'Reset to default' };
        items.push(showAllColorsItem);
        const disposables = [];
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        disposables.push(quickPick);
        quickPick.items = items;
        quickPick.matchOnDescription = true;
        quickPick.placeholder = nls.localize('changeColor', 'Select a color for the terminal');
        quickPick.show();
        const result = await new Promise(r => {
            disposables.push(quickPick.onDidHide(() => r(undefined)));
            disposables.push(quickPick.onDidAccept(() => r(quickPick.selectedItems[0])));
        });
        dispose(disposables);
        if (result) {
            this.shellLaunchConfig.color = result.id;
            this._onIconChanged.fire({ instance: this, userInitiated: true });
        }
        quickPick.hide();
        colorStyleDisposable.dispose();
        return result?.id;
    }
    forceScrollbarVisibility() {
        this._wrapperElement.classList.add('force-scrollbar');
    }
    resetScrollbarVisibility() {
        this._wrapperElement.classList.remove('force-scrollbar');
    }
    setParentContextKeyService(parentContextKeyService) {
        this._scopedContextKeyService.updateParent(parentContextKeyService);
    }
    async handleMouseEvent(event, contextMenu) {
        // Don't handle mouse event if it was on the scroll bar
        if (dom.isHTMLElement(event.target) && (event.target.classList.contains('scrollbar') || event.target.classList.contains('slider'))) {
            return { cancelContextMenu: true };
        }
        // Allow contributions to handle the mouse event first
        for (const contrib of this._contributions.values()) {
            const result = await contrib.handleMouseEvent?.(event);
            if (result?.handled) {
                return { cancelContextMenu: true };
            }
        }
        // Middle click
        if (event.which === 2) {
            switch (this._terminalConfigurationService.config.middleClickBehavior) {
                case 'default':
                default:
                    // Drop selection and focus terminal on Linux to enable middle button paste
                    // when click occurs on the selection itself.
                    this.focus();
                    break;
            }
            return;
        }
        // Right click
        if (event.which === 3) {
            // Shift click forces the context menu
            if (event.shiftKey) {
                openContextMenu(dom.getActiveWindow(), event, this, contextMenu, this._contextMenuService);
                return;
            }
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing') {
                if (!event.shiftKey) {
                    return { cancelContextMenu: true };
                }
                return;
            }
        }
    }
};
__decorate([
    debounce(50)
], TerminalInstance.prototype, "_fireMaximumDimensionsChanged", null);
__decorate([
    debounce(1000)
], TerminalInstance.prototype, "relaunch", null);
__decorate([
    debounce(2000)
], TerminalInstance.prototype, "_updateProcessCwd", null);
TerminalInstance = TerminalInstance_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, ITerminalConfigurationService),
    __param(6, ITerminalProfileResolverService),
    __param(7, IPathService),
    __param(8, IFileService),
    __param(9, IKeybindingService),
    __param(10, INotificationService),
    __param(11, IPreferencesService),
    __param(12, IViewsService),
    __param(13, IThemeService),
    __param(14, IConfigurationService),
    __param(15, ITerminalLogService),
    __param(16, IStorageService),
    __param(17, IAccessibilityService),
    __param(18, IProductService),
    __param(19, IQuickInputService),
    __param(20, IWorkbenchEnvironmentService),
    __param(21, IWorkspaceContextService),
    __param(22, IEditorService),
    __param(23, IWorkspaceTrustRequestService),
    __param(24, IHistoryService),
    __param(25, ITelemetryService),
    __param(26, IOpenerService),
    __param(27, ICommandService),
    __param(28, IAccessibilitySignalService),
    __param(29, IViewDescriptorService)
], TerminalInstance);
export { TerminalInstance };
let TerminalInstanceDragAndDropController = class TerminalInstanceDragAndDropController extends Disposable {
    get onDropFile() { return this._onDropFile.event; }
    get onDropTerminal() { return this._onDropTerminal.event; }
    constructor(_container, _layoutService, _viewDescriptorService) {
        super();
        this._container = _container;
        this._layoutService = _layoutService;
        this._viewDescriptorService = _viewDescriptorService;
        this._onDropFile = this._register(new Emitter());
        this._onDropTerminal = this._register(new Emitter());
        this._register(toDisposable(() => this._clearDropOverlay()));
    }
    _clearDropOverlay() {
        this._dropOverlay?.remove();
        this._dropOverlay = undefined;
    }
    onDragEnter(e) {
        if (!containsDragType(e, DataTransfers.FILES, DataTransfers.RESOURCES, "Terminals" /* TerminalDataTransfers.Terminals */, CodeDataTransfers.FILES)) {
            return;
        }
        if (!this._dropOverlay) {
            this._dropOverlay = document.createElement('div');
            this._dropOverlay.classList.add('terminal-drop-overlay');
        }
        // Dragging terminals
        if (containsDragType(e, "Terminals" /* TerminalDataTransfers.Terminals */)) {
            const side = this._getDropSide(e);
            this._dropOverlay.classList.toggle('drop-before', side === 'before');
            this._dropOverlay.classList.toggle('drop-after', side === 'after');
        }
        if (!this._dropOverlay.parentElement) {
            this._container.appendChild(this._dropOverlay);
        }
    }
    onDragLeave(e) {
        this._clearDropOverlay();
    }
    onDragEnd(e) {
        this._clearDropOverlay();
    }
    onDragOver(e) {
        if (!e.dataTransfer || !this._dropOverlay) {
            return;
        }
        // Dragging terminals
        if (containsDragType(e, "Terminals" /* TerminalDataTransfers.Terminals */)) {
            const side = this._getDropSide(e);
            this._dropOverlay.classList.toggle('drop-before', side === 'before');
            this._dropOverlay.classList.toggle('drop-after', side === 'after');
        }
        this._dropOverlay.style.opacity = '1';
    }
    async onDrop(e) {
        this._clearDropOverlay();
        if (!e.dataTransfer) {
            return;
        }
        const terminalResources = getTerminalResourcesFromDragEvent(e);
        if (terminalResources) {
            for (const uri of terminalResources) {
                const side = this._getDropSide(e);
                this._onDropTerminal.fire({ uri, side });
            }
            return;
        }
        // Check if files were dragged from the tree explorer
        let path;
        const rawResources = e.dataTransfer.getData(DataTransfers.RESOURCES);
        if (rawResources) {
            path = URI.parse(JSON.parse(rawResources)[0]);
        }
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (!path && rawCodeFiles) {
            path = URI.file(JSON.parse(rawCodeFiles)[0]);
        }
        if (!path && e.dataTransfer.files.length > 0 && getPathForFile(e.dataTransfer.files[0])) {
            // Check if the file was dragged from the filesystem
            path = URI.file(getPathForFile(e.dataTransfer.files[0]));
        }
        if (!path) {
            return;
        }
        this._onDropFile.fire(path);
    }
    _getDropSide(e) {
        const target = this._container;
        if (!target) {
            return 'after';
        }
        const rect = target.getBoundingClientRect();
        return this._getViewOrientation() === 1 /* Orientation.HORIZONTAL */
            ? (e.clientX - rect.left < rect.width / 2 ? 'before' : 'after')
            : (e.clientY - rect.top < rect.height / 2 ? 'before' : 'after');
    }
    _getViewOrientation() {
        const panelPosition = this._layoutService.getPanelPosition();
        const terminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
        return terminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(panelPosition)
            ? 1 /* Orientation.HORIZONTAL */
            : 0 /* Orientation.VERTICAL */;
    }
};
TerminalInstanceDragAndDropController = __decorate([
    __param(1, IWorkbenchLayoutService),
    __param(2, IViewDescriptorService)
], TerminalInstanceDragAndDropController);
var TerminalLabelType;
(function (TerminalLabelType) {
    TerminalLabelType["Title"] = "title";
    TerminalLabelType["Description"] = "description";
})(TerminalLabelType || (TerminalLabelType = {}));
let TerminalLabelComputer = class TerminalLabelComputer extends Disposable {
    get title() { return this._title; }
    get description() { return this._description; }
    constructor(_fileService, _terminalConfigurationService, _workspaceContextService) {
        super();
        this._fileService = _fileService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._workspaceContextService = _workspaceContextService;
        this._title = '';
        this._description = '';
        this._onDidChangeLabel = this._register(new Emitter());
        this.onDidChangeLabel = this._onDidChangeLabel.event;
    }
    refreshLabel(instance, reset) {
        this._title = this.computeLabel(instance, this._terminalConfigurationService.config.tabs.title, "title" /* TerminalLabelType.Title */, reset);
        this._description = this.computeLabel(instance, this._terminalConfigurationService.config.tabs.description, "description" /* TerminalLabelType.Description */);
        if (this._title !== instance.title || this._description !== instance.description || reset) {
            this._onDidChangeLabel.fire({ title: this._title, description: this._description });
        }
    }
    computeLabel(instance, labelTemplate, labelType, reset) {
        const type = instance.shellLaunchConfig.attachPersistentProcess?.type || instance.shellLaunchConfig.type;
        const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const promptInputModel = commandDetection?.promptInputModel;
        const nonTaskSpinner = type === 'Task' ? '' : ' $(loading~spin)';
        const templateProperties = {
            cwd: instance.cwd || instance.initialCwd || '',
            cwdFolder: '',
            workspaceFolderName: instance.workspaceFolder?.name,
            workspaceFolder: instance.workspaceFolder ? path.basename(instance.workspaceFolder.uri.fsPath) : undefined,
            local: type === 'Local' ? terminalStrings.typeLocal : undefined,
            process: instance.processName,
            sequence: instance.sequence,
            task: type === 'Task' ? terminalStrings.typeTask : undefined,
            fixedDimensions: instance.fixedCols
                ? (instance.fixedRows ? `\u2194${instance.fixedCols} \u2195${instance.fixedRows}` : `\u2194${instance.fixedCols}`)
                : (instance.fixedRows ? `\u2195${instance.fixedRows}` : ''),
            separator: { label: this._terminalConfigurationService.config.tabs.separator },
            shellType: instance.shellType,
            // Shell command requires high confidence
            shellCommand: commandDetection?.executingCommand && commandDetection.executingCommandConfidence === 'high' && promptInputModel
                ? promptInputModel.value + nonTaskSpinner
                : undefined,
            // Shell prompt input does not require high confidence as it's largely for VS Code developers
            shellPromptInput: commandDetection?.executingCommand && promptInputModel
                ? promptInputModel.getCombinedString(true) + nonTaskSpinner
                : promptInputModel?.getCombinedString(true),
            progress: this._getProgressStateString(instance.progressState)
        };
        templateProperties.workspaceFolderName = instance.workspaceFolder?.name ?? templateProperties.workspaceFolder;
        labelTemplate = labelTemplate.trim();
        if (!labelTemplate) {
            return labelType === "title" /* TerminalLabelType.Title */ ? (instance.processName || '') : '';
        }
        if (!reset && instance.staticTitle && labelType === "title" /* TerminalLabelType.Title */) {
            return instance.staticTitle.replace(/[\n\r\t]/g, '') || templateProperties.process?.replace(/[\n\r\t]/g, '') || '';
        }
        const detection = instance.capabilities.has(0 /* TerminalCapability.CwdDetection */) || instance.capabilities.has(1 /* TerminalCapability.NaiveCwdDetection */);
        const folders = this._workspaceContextService.getWorkspace().folders;
        const multiRootWorkspace = folders.length > 1;
        // Only set cwdFolder if detection is on
        if (templateProperties.cwd && detection && (!instance.shellLaunchConfig.isFeatureTerminal || labelType === "title" /* TerminalLabelType.Title */)) {
            const cwdUri = URI.from({
                scheme: instance.workspaceFolder?.uri.scheme || Schemas.file,
                path: instance.cwd ? path.resolve(instance.cwd) : undefined
            });
            // Multi-root workspaces always show cwdFolder to disambiguate them, otherwise only show
            // when it differs from the workspace folder in which it was launched from
            let showCwd = false;
            if (multiRootWorkspace) {
                showCwd = true;
            }
            else if (instance.workspaceFolder?.uri) {
                const caseSensitive = this._fileService.hasCapability(instance.workspaceFolder.uri, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
                showCwd = cwdUri.fsPath.localeCompare(instance.workspaceFolder.uri.fsPath, undefined, { sensitivity: caseSensitive ? 'case' : 'base' }) !== 0;
            }
            if (showCwd) {
                templateProperties.cwdFolder = path.basename(templateProperties.cwd);
            }
        }
        // Remove special characters that could mess with rendering
        const label = template(labelTemplate, templateProperties).replace(/[\n\r\t]/g, '').trim();
        return label === '' && labelType === "title" /* TerminalLabelType.Title */ ? (instance.processName || '') : label;
    }
    _getProgressStateString(progressState) {
        if (!progressState) {
            return '';
        }
        switch (progressState.state) {
            case 0: return '';
            case 1: return `${Math.round(progressState.value)}%`;
            case 2: return '$(error)';
            case 3: return '$(loading~spin)';
            case 4: return '$(alert)';
        }
    }
};
TerminalLabelComputer = __decorate([
    __param(0, IFileService),
    __param(1, ITerminalConfigurationService),
    __param(2, IWorkspaceContextService)
], TerminalLabelComputer);
export { TerminalLabelComputer };
export function parseExitResult(exitCodeOrError, shellLaunchConfig, processState, initialCwd) {
    // Only return a message if the exit code is non-zero
    if (exitCodeOrError === undefined || exitCodeOrError === 0) {
        return { code: exitCodeOrError, message: undefined };
    }
    const code = isNumber(exitCodeOrError) ? exitCodeOrError : exitCodeOrError.code;
    // Create exit code message
    let message = undefined;
    switch (typeof exitCodeOrError) {
        case 'number': {
            let commandLine = undefined;
            if (shellLaunchConfig.executable) {
                commandLine = shellLaunchConfig.executable;
                if (isString(shellLaunchConfig.args)) {
                    commandLine += ` ${shellLaunchConfig.args}`;
                }
                else if (shellLaunchConfig.args && shellLaunchConfig.args.length) {
                    commandLine += shellLaunchConfig.args.map(a => ` '${a}'`).join();
                }
            }
            if (processState === 4 /* ProcessState.KilledDuringLaunch */) {
                if (commandLine) {
                    message = nls.localize('launchFailed.exitCodeAndCommandLine', "The terminal process \"{0}\" failed to launch (exit code: {1}).", commandLine, code);
                }
                else {
                    message = nls.localize('launchFailed.exitCodeOnly', "The terminal process failed to launch (exit code: {0}).", code);
                }
            }
            else {
                if (commandLine) {
                    message = nls.localize('terminated.exitCodeAndCommandLine', "The terminal process \"{0}\" terminated with exit code: {1}.", commandLine, code);
                }
                else {
                    message = nls.localize('terminated.exitCodeOnly', "The terminal process terminated with exit code: {0}.", code);
                }
            }
            break;
        }
        case 'object': {
            // Ignore internal errors
            if (exitCodeOrError.message.toString().includes('Could not find pty with id')) {
                break;
            }
            // Convert conpty code-based failures into human friendly messages
            let innerMessage = exitCodeOrError.message;
            const conptyError = exitCodeOrError.message.match(/.*error code:\s*(\d+).*$/);
            if (conptyError) {
                const errorCode = conptyError.length > 1 ? parseInt(conptyError[1]) : undefined;
                switch (errorCode) {
                    case 5:
                        innerMessage = `Access was denied to the path containing your executable "${shellLaunchConfig.executable}". Manage and change your permissions to get this to work`;
                        break;
                    case 267:
                        innerMessage = `Invalid starting directory "${initialCwd}", review your terminal.integrated.cwd setting`;
                        break;
                    case 1260:
                        innerMessage = `Windows cannot open this program because it has been prevented by a software restriction policy. For more information, open Event Viewer or contact your system Administrator`;
                        break;
                }
            }
            message = nls.localize('launchFailed.errorMessage', "The terminal process failed to launch: {0}.", innerMessage);
            break;
        }
    }
    return { code, message };
}
let TerminalInstanceColorProvider = class TerminalInstanceColorProvider {
    constructor(_target, _viewDescriptorService) {
        this._target = _target;
        this._viewDescriptorService = _viewDescriptorService;
    }
    getBackgroundColor(theme) {
        const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR);
        if (terminalBackground) {
            return terminalBackground;
        }
        if (this._target.object === TerminalLocation.Editor) {
            return theme.getColor(editorBackground);
        }
        const location = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
        if (location === 1 /* ViewContainerLocation.Panel */) {
            return theme.getColor(PANEL_BACKGROUND);
        }
        return theme.getColor(SIDE_BAR_BACKGROUND);
    }
};
TerminalInstanceColorProvider = __decorate([
    __param(1, IViewDescriptorService)
], TerminalInstanceColorProvider);
export { TerminalInstanceColorProvider };
function guessShellTypeFromExecutable(os, executable) {
    const exeBasename = path.basename(executable);
    const generalShellTypeMap = new Map([
        ["julia" /* GeneralShellType.Julia */, /^julia$/],
        ["node" /* GeneralShellType.Node */, /^node$/],
        ["nu" /* GeneralShellType.NuShell */, /^nu$/],
        ["pwsh" /* GeneralShellType.PowerShell */, /^pwsh(-preview)?|powershell$/],
        ["python" /* GeneralShellType.Python */, /^py(?:thon)?$/]
    ]);
    for (const [shellType, pattern] of generalShellTypeMap) {
        if (exeBasename.match(pattern)) {
            return shellType;
        }
    }
    if (os === 1 /* OperatingSystem.Windows */) {
        const windowsShellTypeMap = new Map([
            ["cmd" /* WindowsShellType.CommandPrompt */, /^cmd$/],
            ["gitbash" /* WindowsShellType.GitBash */, /^bash$/],
            ["wsl" /* WindowsShellType.Wsl */, /^wsl$/]
        ]);
        for (const [shellType, pattern] of windowsShellTypeMap) {
            if (exeBasename.match(pattern)) {
                return shellType;
            }
        }
    }
    else {
        const posixShellTypes = [
            "bash" /* PosixShellType.Bash */,
            "csh" /* PosixShellType.Csh */,
            "fish" /* PosixShellType.Fish */,
            "ksh" /* PosixShellType.Ksh */,
            "sh" /* PosixShellType.Sh */,
            "zsh" /* PosixShellType.Zsh */,
        ];
        for (const type of posixShellTypes) {
            if (exeBasename === type) {
                return type;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsSW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFbEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBYyxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBbUIsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3TCxP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
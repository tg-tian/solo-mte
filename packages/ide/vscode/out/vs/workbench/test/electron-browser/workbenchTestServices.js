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
import { insert } from '../../../base/common/arrays.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IExtensionManagementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { AbstractNativeExtensionTipsService } from '../../../platform/extensionManagement/common/extensionTipsService.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IFileService, FileType } from '../../../platform/files/common/files.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../platform/log/common/log.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { NativeTextFileService } from '../../services/textfile/electron-browser/nativeTextFileService.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { NativeWorkingCopyBackupService } from '../../services/workingCopy/electron-browser/workingCopyBackupService.js';
import { workbenchInstantiationService as browserWorkbenchInstantiationService, TestEncodingOracle, TestEnvironmentService, TestLifecycleService } from '../browser/workbenchTestServices.js';
export class TestSharedProcessService {
    createRawConnection() { throw new Error('Not Implemented'); }
    getChannel(channelName) { return undefined; }
    registerChannel(channelName, channel) { }
    notifyRestored() { }
}
export class TestNativeHostService {
    constructor() {
        this.windowId = -1;
        this.onDidOpenMainWindow = Event.None;
        this.onDidMaximizeWindow = Event.None;
        this.onDidUnmaximizeWindow = Event.None;
        this.onDidFocusMainWindow = Event.None;
        this.onDidBlurMainWindow = Event.None;
        this.onDidFocusMainOrAuxiliaryWindow = Event.None;
        this.onDidBlurMainOrAuxiliaryWindow = Event.None;
        this.onDidResumeOS = Event.None;
        this.onDidChangeColorScheme = Event.None;
        this.onDidChangePassword = Event.None;
        this.onDidTriggerWindowSystemContextMenu = Event.None;
        this.onDidChangeWindowFullScreen = Event.None;
        this.onDidChangeWindowAlwaysOnTop = Event.None;
        this.onDidChangeDisplay = Event.None;
        this.windowCount = Promise.resolve(1);
    }
    getWindowCount() { return this.windowCount; }
    async getWindows() { return []; }
    async getActiveWindowId() { return undefined; }
    async getActiveWindowPosition() { return undefined; }
    async getNativeWindowHandle(windowId) { return undefined; }
    openWindow(arg1, arg2) {
        throw new Error('Method not implemented.');
    }
    async toggleFullScreen() { }
    async isMaximized() { return true; }
    async isFullScreen() { return true; }
    async maximizeWindow() { }
    async unmaximizeWindow() { }
    async minimizeWindow() { }
    async moveWindowTop(options) { }
    async isWindowAlwaysOnTop(options) { return false; }
    async toggleWindowAlwaysOnTop(options) { }
    async setWindowAlwaysOnTop(alwaysOnTop, options) { }
    async getCursorScreenPoint() { throw new Error('Method not implemented.'); }
    async positionWindow(position, options) { }
    async updateWindowControls(options) { }
    async updateWindowAccentColor(color) { }
    async setMinimumSize(width, height) { }
    async saveWindowSplash(value) { }
    async setBackgroundThrottling(throttling) { }
    async focusWindow(options) { }
    async showMessageBox(options) { throw new Error('Method not implemented.'); }
    async showSaveDialog(options) { throw new Error('Method not implemented.'); }
    async showOpenDialog(options) { throw new Error('Method not implemented.'); }
    async pickFileFolderAndOpen(options) { }
    async pickFileAndOpen(options) { }
    async pickFolderAndOpen(options) { }
    async pickWorkspaceAndOpen(options) { }
    async showItemInFolder(path) { }
    async setRepresentedFilename(path) { }
    async isAdmin() { return false; }
    async writeElevated(source, target) { }
    async isRunningUnderARM64Translation() { return false; }
    async getOSProperties() { return Object.create(null); }
    async getOSStatistics() { return Object.create(null); }
    async getOSVirtualMachineHint() { return 0; }
    async getOSColorScheme() { return { dark: true, highContrast: false }; }
    async hasWSLFeatureInstalled() { return false; }
    async getProcessId() { throw new Error('Method not implemented.'); }
    async killProcess() { }
    async setDocumentEdited(edited) { }
    async openExternal(url, defaultApplication) { return false; }
    async updateTouchBar() { }
    async moveItemToTrash() { }
    async newWindowTab() { }
    async showPreviousWindowTab() { }
    async showNextWindowTab() { }
    async moveWindowTabToNewWindow() { }
    async mergeAllWindowTabs() { }
    async toggleWindowTabsBar() { }
    async installShellCommand() { }
    async uninstallShellCommand() { }
    async notifyReady() { }
    async relaunch(options) { }
    async reload() { }
    async closeWindow() { }
    async quit() { }
    async exit(code) { }
    async openDevTools(options) { }
    async toggleDevTools() { }
    async stopTracing() { }
    async openDevToolsWindow(url) { }
    async openGPUInfoWindow() { }
    async openContentTracingWindow() { }
    async resolveProxy(url) { return undefined; }
    async lookupAuthorization(authInfo) { return undefined; }
    async lookupKerberosAuthorization(url) { return undefined; }
    async loadCertificates() { return []; }
    async isPortFree() { return Promise.resolve(true); }
    async findFreePort(startPort, giveUpAfter, timeout, stride) { return -1; }
    async readClipboardText(type) { return ''; }
    async writeClipboardText(text, type) { }
    async readClipboardFindText() { return ''; }
    async writeClipboardFindText(text) { }
    async writeClipboardBuffer(format, buffer, type) { }
    async triggerPaste(options) { }
    async readImage() { return Uint8Array.from([]); }
    async readClipboardBuffer(format) { return VSBuffer.wrap(Uint8Array.from([])); }
    async hasClipboard(format, type) { return false; }
    async windowsGetStringRegKey(hive, path, name) { return undefined; }
    async profileRenderer() { throw new Error(); }
    async getScreenshot(rect) { return undefined; }
}
let TestExtensionTipsService = class TestExtensionTipsService extends AbstractNativeExtensionTipsService {
    constructor(environmentService, telemetryService, extensionManagementService, storageService, nativeHostService, extensionRecommendationNotificationService, fileService, productService) {
        super(environmentService.userHome, nativeHostService, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService);
    }
};
TestExtensionTipsService = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ITelemetryService),
    __param(2, IExtensionManagementService),
    __param(3, IStorageService),
    __param(4, INativeHostService),
    __param(5, IExtensionRecommendationNotificationService),
    __param(6, IFileService),
    __param(7, IProductService)
], TestExtensionTipsService);
export { TestExtensionTipsService };
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = browserWorkbenchInstantiationService({
        workingCopyBackupService: () => disposables.add(new TestNativeWorkingCopyBackupService()),
        ...overrides
    }, disposables);
    instantiationService.stub(INativeHostService, new TestNativeHostService());
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, filesConfigurationService, contextService, modelService, fileService, nativeHostService, fileDialogService, workingCopyBackupService, workingCopyService, editorService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.nativeHostService = nativeHostService;
        this.fileDialogService = fileDialogService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, IFilesConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IModelService),
    __param(5, IFileService),
    __param(6, INativeHostService),
    __param(7, IFileDialogService),
    __param(8, IWorkingCopyBackupService),
    __param(9, IWorkingCopyService),
    __param(10, IEditorService)
], TestServiceAccessor);
export { TestServiceAccessor };
export class TestNativeTextFileServiceWithEncodingOverrides extends NativeTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestNativeWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    constructor() {
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        const lifecycleService = new TestLifecycleService();
        // eslint-disable-next-line local/code-no-any-casts
        super(environmentService, fileService, logService, lifecycleService);
        const inMemoryFileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.inMemory, inMemoryFileSystemProvider));
        const uriIdentityService = this._register(new UriIdentityService(fileService));
        const userDataProfilesService = this._register(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        this._register(fileService.registerProvider(Schemas.vscodeUserData, this._register(new FileUserDataProvider(Schemas.file, inMemoryFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this.pendingBackupsArr = [];
        this.discardedAllBackups = false;
        this._register(fileService);
        this._register(lifecycleService);
    }
    testGetFileService() {
        return this.fileService;
    }
    async waitForAllBackups() {
        await Promise.all(this.pendingBackupsArr);
    }
    joinBackupResource() {
        return new Promise(resolve => this.backupResourceJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        const p = super.backup(identifier, content, versionId, meta, token);
        const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));
        try {
            await p;
        }
        finally {
            removeFromPendingBackups();
        }
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    joinDiscardBackup() {
        return new Promise(resolve => this.discardBackupJoiners.push(resolve));
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async discardBackups(filter) {
        this.discardedAllBackups = true;
        return super.discardBackups(filter);
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
export class TestIPCFileSystemProvider {
    constructor() {
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    async stat(resource) {
        const { ipcRenderer } = require('electron');
        const stats = await ipcRenderer.invoke('vscode:statFile', resource.fsPath);
        return {
            type: stats.isDirectory ? FileType.Directory : (stats.isFile ? FileType.File : FileType.Unknown),
            ctime: stats.ctimeMs,
            mtime: stats.mtimeMs,
            size: stats.size,
            permissions: stats.isReadonly ? 1 /* FilePermission.Readonly */ : undefined
        };
    }
    async readFile(resource) {
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('vscode:readFile', resource.fsPath);
        return VSBuffer.wrap(result).buffer;
    }
    watch(resource, opts) { return { dispose: () => { } }; }
    mkdir(resource) { throw new Error('mkdir not implemented in test provider'); }
    readdir(resource) { throw new Error('readdir not implemented in test provider'); }
    delete(resource, opts) { throw new Error('delete not implemented in test provider'); }
    rename(from, to, opts) { throw new Error('rename not implemented in test provider'); }
    writeFile(resource, content, opts) { throw new Error('writeFile not implemented in test provider'); }
    readFileStream(resource, opts, token) { throw new Error('readFileStream not implemented in test provider'); }
    open(resource, opts) { throw new Error('open not implemented in test provider'); }
    close(fd) { throw new Error('close not implemented in test provider'); }
    read(fd, pos, data, offset, length) { throw new Error('read not implemented in test provider'); }
    write(fd, pos, data, offset, length) { throw new Error('write not implemented in test provider'); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2VsZWN0cm9uLWJyb3dzZXIvd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUE0QyxNQUFNLGdDQUFnQyxDQUFDO0FBRXBHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUl6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQTRCLE1BQU0sNkNBQTZDLENBQUM7QUFDM0csT0FBTyxFQUF1Qix5QkFBeUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFILE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSxZQUFZLEVBQXNLLFFBQVEsRUFBaUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwUSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFHMUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9B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
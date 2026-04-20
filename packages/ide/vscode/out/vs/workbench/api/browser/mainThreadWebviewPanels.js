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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { DiffEditorInput } from '../../common/editor/diffEditorInput.js';
import { ExtensionKeyedWebviewOriginStore } from '../../contrib/webview/browser/webview.js';
import { WebviewInput } from '../../contrib/webviewPanel/browser/webviewEditorInput.js';
import { IWebviewWorkbenchService } from '../../contrib/webviewPanel/browser/webviewWorkbenchService.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection } from '../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { reviveWebviewContentOptions, reviveWebviewExtension } from './mainThreadWebviews.js';
import { ThemeIcon } from '../../../base/common/themables.js';
/**
 * Bi-directional map between webview handles and inputs.
 */
class WebviewInputStore {
    constructor() {
        this._handlesToInputs = new Map();
        this._inputsToHandles = new Map();
    }
    add(handle, input) {
        this._handlesToInputs.set(handle, input);
        this._inputsToHandles.set(input, handle);
    }
    getHandleForInput(input) {
        return this._inputsToHandles.get(input);
    }
    getInputForHandle(handle) {
        return this._handlesToInputs.get(handle);
    }
    delete(handle) {
        const input = this.getInputForHandle(handle);
        this._handlesToInputs.delete(handle);
        if (input) {
            this._inputsToHandles.delete(input);
        }
    }
    get size() {
        return this._handlesToInputs.size;
    }
    [Symbol.iterator]() {
        return this._handlesToInputs.values();
    }
}
class WebviewViewTypeTransformer {
    constructor(prefix) {
        this.prefix = prefix;
    }
    fromExternal(viewType) {
        return this.prefix + viewType;
    }
    toExternal(viewType) {
        return viewType.startsWith(this.prefix)
            ? viewType.substr(this.prefix.length)
            : undefined;
    }
}
let MainThreadWebviewPanels = class MainThreadWebviewPanels extends Disposable {
    constructor(context, _mainThreadWebviews, _configurationService, _editorGroupService, _editorService, extensionService, storageService, _webviewWorkbenchService) {
        super();
        this._mainThreadWebviews = _mainThreadWebviews;
        this._configurationService = _configurationService;
        this._editorGroupService = _editorGroupService;
        this._editorService = _editorService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this.webviewPanelViewType = new WebviewViewTypeTransformer('mainThreadWebview-');
        this._webviewInputs = new WebviewInputStore();
        this._revivers = this._register(new DisposableMap());
        this.webviewOriginStore = new ExtensionKeyedWebviewOriginStore('mainThreadWebviewPanel.origins', storageService);
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewPanels);
        this._register(Event.any(_editorService.onDidActiveEditorChange, _editorService.onDidVisibleEditorsChange, _editorGroupService.onDidAddGroup, _editorGroupService.onDidRemoveGroup, _editorGroupService.onDidMoveGroup)(() => {
            this.updateWebviewViewStates(this._editorService.activeEditor);
        }));
        this._register(_webviewWorkbenchService.onDidChangeActiveWebviewEditor(input => {
            this.updateWebviewViewStates(input);
        }));
        // This reviver's only job is to activate extensions.
        // This should trigger the real reviver to be registered from the extension host side.
        this._register(_webviewWorkbenchService.registerResolver({
            canResolve: (webview) => {
                const viewType = this.webviewPanelViewType.toExternal(webview.viewType);
                if (typeof viewType === 'string') {
                    extensionService.activateByEvent(`onWebviewPanel:${viewType}`);
                }
                return false;
            },
            resolveWebview: () => { throw new Error('not implemented'); }
        }));
    }
    get webviewInputs() { return this._webviewInputs; }
    addWebviewInput(handle, input, options) {
        this._webviewInputs.add(handle, input);
        this._mainThreadWebviews.addWebview(handle, input.webview, options);
        const disposeSub = input.webview.onDidDispose(() => {
            disposeSub.dispose();
            this._proxy.$onDidDisposeWebviewPanel(handle).finally(() => {
                this._webviewInputs.delete(handle);
            });
        });
    }
    $createWebviewPanel(extensionData, handle, viewType, initData, showOptions) {
        const targetGroup = this.getTargetGroupFromShowOptions(showOptions);
        const mainThreadShowOptions = showOptions ? {
            preserveFocus: !!showOptions.preserveFocus,
            group: targetGroup
        } : {};
        const extension = reviveWebviewExtension(extensionData);
        const origin = this.webviewOriginStore.getOrigin(viewType, extension.id);
        const webview = this._webviewWorkbenchService.openWebview({
            origin,
            providedViewType: viewType,
            title: initData.title,
            options: reviveWebviewOptions(initData.panelOptions),
            contentOptions: reviveWebviewContentOptions(initData.webviewOptions),
            extension
        }, this.webviewPanelViewType.fromExternal(viewType), initData.title, undefined, mainThreadShowOptions);
        this.addWebviewInput(handle, webview, { serializeBuffersForPostMessage: initData.serializeBuffersForPostMessage });
    }
    $disposeWebview(handle) {
        const webview = this.tryGetWebviewInput(handle);
        if (!webview) {
            return;
        }
        webview.dispose();
    }
    $setTitle(handle, value) {
        this.tryGetWebviewInput(handle)?.setWebviewTitle(value);
    }
    $setIconPath(handle, value) {
        const webview = this.tryGetWebviewInput(handle);
        if (webview) {
            webview.iconPath = reviveWebviewIcon(value);
        }
    }
    $reveal(handle, showOptions) {
        const webview = this.tryGetWebviewInput(handle);
        if (!webview || webview.isDisposed()) {
            return;
        }
        const targetGroup = this.getTargetGroupFromShowOptions(showOptions);
        this._webviewWorkbenchService.revealWebview(webview, targetGroup, !!showOptions.preserveFocus);
    }
    getTargetGroupFromShowOptions(showOptions) {
        if (typeof showOptions.viewColumn === 'undefined'
            || showOptions.viewColumn === ACTIVE_GROUP
            || (this._editorGroupService.count === 1 && this._editorGroupService.activeGroup.isEmpty)) {
            return ACTIVE_GROUP;
        }
        if (showOptions.viewColumn === SIDE_GROUP) {
            return SIDE_GROUP;
        }
        if (showOptions.viewColumn >= 0) {
            // First check to see if an existing group exists
            const groupInColumn = this._editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[showOptions.viewColumn];
            if (groupInColumn) {
                return groupInColumn.id;
            }
            // We are dealing with an unknown group and therefore need a new group.
            // Note that the new group's id may not match the one requested. We only allow
            // creating a single new group, so if someone passes in `showOptions.viewColumn = 99`
            // and there are two editor groups open, we simply create a third editor group instead
            // of creating all the groups up to 99.
            const newGroup = this._editorGroupService.findGroup({ location: 1 /* GroupLocation.LAST */ });
            if (newGroup) {
                const direction = preferredSideBySideGroupDirection(this._configurationService);
                return this._editorGroupService.addGroup(newGroup, direction);
            }
        }
        return ACTIVE_GROUP;
    }
    $registerSerializer(viewType, options) {
        if (this._revivers.has(viewType)) {
            throw new Error(`Reviver for ${viewType} already registered`);
        }
        this._revivers.set(viewType, this._webviewWorkbenchService.registerResolver({
            canResolve: (webviewInput) => {
                return webviewInput.viewType === this.webviewPanelViewType.fromExternal(viewType);
            },
            resolveWebview: async (webviewInput) => {
                const viewType = this.webviewPanelViewType.toExternal(webviewInput.viewType);
                if (!viewType) {
                    webviewInput.webview.setHtml(this._mainThreadWebviews.getWebviewResolvedFailedContent(webviewInput.viewType));
                    return;
                }
                const handle = generateUuid();
                this.addWebviewInput(handle, webviewInput, options);
                let state = undefined;
                if (webviewInput.webview.state) {
                    try {
                        state = JSON.parse(webviewInput.webview.state);
                    }
                    catch (e) {
                        console.error('Could not load webview state', e, webviewInput.webview.state);
                    }
                }
                try {
                    await this._proxy.$deserializeWebviewPanel(handle, viewType, {
                        title: webviewInput.getTitle(),
                        state,
                        panelOptions: webviewInput.webview.options,
                        webviewOptions: webviewInput.webview.contentOptions,
                        active: webviewInput === this._editorService.activeEditor,
                    }, editorGroupToColumn(this._editorGroupService, webviewInput.group || 0));
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this._mainThreadWebviews.getWebviewResolvedFailedContent(viewType));
                }
            }
        }));
    }
    $unregisterSerializer(viewType) {
        if (!this._revivers.has(viewType)) {
            throw new Error(`No reviver for ${viewType} registered`);
        }
        this._revivers.deleteAndDispose(viewType);
    }
    updateWebviewViewStates(activeEditorInput) {
        if (!this._webviewInputs.size) {
            return;
        }
        const viewStates = {};
        const updateViewStatesForInput = (group, topLevelInput, editorInput) => {
            if (!(editorInput instanceof WebviewInput)) {
                return;
            }
            editorInput.updateGroup(group.id);
            const handle = this._webviewInputs.getHandleForInput(editorInput);
            if (handle) {
                viewStates[handle] = {
                    visible: topLevelInput === group.activeEditor,
                    active: editorInput === activeEditorInput,
                    position: editorGroupToColumn(this._editorGroupService, group.id),
                };
            }
        };
        for (const group of this._editorGroupService.groups) {
            for (const input of group.editors) {
                if (input instanceof DiffEditorInput) {
                    updateViewStatesForInput(group, input, input.primary);
                    updateViewStatesForInput(group, input, input.secondary);
                }
                else {
                    updateViewStatesForInput(group, input, input);
                }
            }
        }
        if (Object.keys(viewStates).length) {
            this._proxy.$onDidChangeWebviewPanelViewStates(viewStates);
        }
    }
    tryGetWebviewInput(handle) {
        return this._webviewInputs.getInputForHandle(handle);
    }
};
MainThreadWebviewPanels = __decorate([
    __param(2, IConfigurationService),
    __param(3, IEditorGroupsService),
    __param(4, IEditorService),
    __param(5, IExtensionService),
    __param(6, IStorageService),
    __param(7, IWebviewWorkbenchService)
], MainThreadWebviewPanels);
export { MainThreadWebviewPanels };
function reviveWebviewIcon(value) {
    if (!value) {
        return undefined;
    }
    if (ThemeIcon.isThemeIcon(value)) {
        return value;
    }
    return {
        light: URI.revive(value.light),
        dark: URI.revive(value.dark),
    };
}
function reviveWebviewOptions(panelOptions) {
    return {
        enableFindWidget: panelOptions.enableFindWidget,
        retainContextWhenHidden: panelOptions.retainContextWhenHidden,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRXZWJ2aWV3UGFuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQWtCLE1BQU0sMENBQTBDLENBQUM7QUFDNUcsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6RyxPQUFPLEVBQXVCLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDOUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUE0QyxvQkFBb0IsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3hLLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFrQixVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6SCxPQUFPLEVBQUUsaUJBQWlCLEVB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
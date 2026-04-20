/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-native-private */
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as typeConverters from './extHostTypeConverters.js';
import { serializeWebviewOptions, toExtensionData, shouldSerializeBuffersForPostMessage } from './extHostWebview.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
class ExtHostWebviewPanel extends Disposable {
    #handle;
    #proxy;
    #viewType;
    #webview;
    #options;
    #title;
    #iconPath;
    #viewColumn;
    #visible;
    #active;
    #isDisposed;
    #onDidDispose;
    #onDidChangeViewState;
    constructor(handle, proxy, webview, params) {
        super();
        this.#viewColumn = undefined;
        this.#visible = true;
        this.#isDisposed = false;
        this.#onDidDispose = this._register(new Emitter());
        this.onDidDispose = this.#onDidDispose.event;
        this.#onDidChangeViewState = this._register(new Emitter());
        this.onDidChangeViewState = this.#onDidChangeViewState.event;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#webview = webview;
        this.#viewType = params.viewType;
        this.#options = params.panelOptions;
        this.#viewColumn = params.viewColumn;
        this.#title = params.title;
        this.#active = params.active;
    }
    dispose() {
        if (this.#isDisposed) {
            return;
        }
        this.#isDisposed = true;
        this.#onDidDispose.fire();
        this.#proxy.$disposeWebview(this.#handle);
        this.#webview.dispose();
        super.dispose();
    }
    get webview() {
        this.assertNotDisposed();
        return this.#webview;
    }
    get viewType() {
        this.assertNotDisposed();
        return this.#viewType;
    }
    get title() {
        this.assertNotDisposed();
        return this.#title;
    }
    set title(value) {
        this.assertNotDisposed();
        if (this.#title !== value) {
            this.#title = value;
            this.#proxy.$setTitle(this.#handle, value);
        }
    }
    get iconPath() {
        this.assertNotDisposed();
        return this.#iconPath;
    }
    set iconPath(value) {
        this.assertNotDisposed();
        if (this.#iconPath !== value) {
            this.#iconPath = value;
            if (URI.isUri(value)) {
                this.#proxy.$setIconPath(this.#handle, { light: value, dark: value });
            }
            else {
                this.#proxy.$setIconPath(this.#handle, value);
            }
        }
    }
    get options() {
        return this.#options;
    }
    get viewColumn() {
        this.assertNotDisposed();
        if (typeof this.#viewColumn === 'number' && this.#viewColumn < 0) {
            // We are using a symbolic view column
            // Return undefined instead to indicate that the real view column is currently unknown but will be resolved.
            return undefined;
        }
        return this.#viewColumn;
    }
    get active() {
        this.assertNotDisposed();
        return this.#active;
    }
    get visible() {
        this.assertNotDisposed();
        return this.#visible;
    }
    _updateViewState(newState) {
        if (this.#isDisposed) {
            return;
        }
        if (this.active !== newState.active || this.visible !== newState.visible || this.viewColumn !== newState.viewColumn) {
            this.#active = newState.active;
            this.#visible = newState.visible;
            this.#viewColumn = newState.viewColumn;
            this.#onDidChangeViewState.fire({ webviewPanel: this });
        }
    }
    reveal(viewColumn, preserveFocus) {
        this.assertNotDisposed();
        this.#proxy.$reveal(this.#handle, {
            viewColumn: typeof viewColumn === 'undefined' ? undefined : typeConverters.ViewColumn.from(viewColumn),
            preserveFocus: !!preserveFocus
        });
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
}
export class ExtHostWebviewPanels extends Disposable {
    static newHandle() {
        return generateUuid();
    }
    constructor(mainContext, webviews, workspace) {
        super();
        this.webviews = webviews;
        this.workspace = workspace;
        this._webviewPanels = new Map();
        this._serializers = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviewPanels);
    }
    dispose() {
        super.dispose();
        this._webviewPanels.forEach(value => value.dispose());
        this._webviewPanels.clear();
    }
    createWebviewPanel(extension, viewType, title, showOptions, options = {}) {
        const viewColumn = typeof showOptions === 'object' ? showOptions.viewColumn : showOptions;
        const webviewShowOptions = {
            viewColumn: typeConverters.ViewColumn.from(viewColumn),
            preserveFocus: typeof showOptions === 'object' && !!showOptions.preserveFocus
        };
        const serializeBuffersForPostMessage = shouldSerializeBuffersForPostMessage(extension);
        const handle = ExtHostWebviewPanels.newHandle();
        this._proxy.$createWebviewPanel(toExtensionData(extension), handle, viewType, {
            title,
            panelOptions: serializeWebviewPanelOptions(options),
            webviewOptions: serializeWebviewOptions(extension, this.workspace, options),
            serializeBuffersForPostMessage,
        }, webviewShowOptions);
        const webview = this.webviews.createNewWebview(handle, options, extension);
        const panel = this.createNewWebviewPanel(handle, viewType, title, viewColumn, options, webview, true);
        return panel;
    }
    $onDidChangeWebviewPanelViewStates(newStates) {
        const handles = Object.keys(newStates);
        // Notify webviews of state changes in the following order:
        // - Non-visible
        // - Visible
        // - Active
        handles.sort((a, b) => {
            const stateA = newStates[a];
            const stateB = newStates[b];
            if (stateA.active) {
                return 1;
            }
            if (stateB.active) {
                return -1;
            }
            return (+stateA.visible) - (+stateB.visible);
        });
        for (const handle of handles) {
            const panel = this.getWebviewPanel(handle);
            if (!panel) {
                continue;
            }
            const newState = newStates[handle];
            panel._updateViewState({
                active: newState.active,
                visible: newState.visible,
                viewColumn: typeConverters.ViewColumn.to(newState.position),
            });
        }
    }
    async $onDidDisposeWebviewPanel(handle) {
        const panel = this.getWebviewPanel(handle);
        panel?.dispose();
        this._webviewPanels.delete(handle);
        this.webviews.deleteWebview(handle);
    }
    registerWebviewPanelSerializer(extension, viewType, serializer) {
        if (this._serializers.has(viewType)) {
            throw new Error(`Serializer for '${viewType}' already registered`);
        }
        this._serializers.set(viewType, { serializer, extension });
        this._proxy.$registerSerializer(viewType, {
            serializeBuffersForPostMessage: shouldSerializeBuffersForPostMessage(extension)
        });
        return new extHostTypes.Disposable(() => {
            this._serializers.delete(viewType);
            this._proxy.$unregisterSerializer(viewType);
        });
    }
    async $deserializeWebviewPanel(webviewHandle, viewType, initData, position) {
        const entry = this._serializers.get(viewType);
        if (!entry) {
            throw new Error(`No serializer found for '${viewType}'`);
        }
        const { serializer, extension } = entry;
        const webview = this.webviews.createNewWebview(webviewHandle, initData.webviewOptions, extension);
        const revivedPanel = this.createNewWebviewPanel(webviewHandle, viewType, initData.title, position, initData.panelOptions, webview, initData.active);
        await serializer.deserializeWebviewPanel(revivedPanel, initData.state);
    }
    createNewWebviewPanel(webviewHandle, viewType, title, position, options, webview, active) {
        const panel = new ExtHostWebviewPanel(webviewHandle, this._proxy, webview, { viewType, title, viewColumn: position, panelOptions: options, active });
        this._webviewPanels.set(webviewHandle, panel);
        return panel;
    }
    getWebviewPanel(handle) {
        return this._webviewPanels.get(handle);
    }
}
function serializeWebviewPanelOptions(options) {
    return {
        enableFindWidget: options.enableFindWidget,
        retainContextWhenHidden: options.retainContextWhenHidden,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdlYnZpZXdQYW5lbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBbUMsZUFBZSxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFJdEosT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBRWxELE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUVsQyxPQUFPLENBQWdDO0lBQ3ZDLE1BQU0sQ0FBK0M7SUFDckQsU0FBUyxDQUFTO0lBRWxCLFFBQVEsQ0FBaUI7SUFDekIsUUFBUSxDQUE2QjtJQUU5QyxNQUFNLENBQVM7SUFDZixTQUFTLENBQW1CO0lBQzVCLFdBQVcsQ0FBNEM7SUFDdkQsUUFBUSxDQUFpQjtJQUN6QixPQUFPLENBQVU7SUFDakIsV0FBVyxDQUFrQjtJQUVwQixhQUFhLENBQXVDO0lBR3BELHFCQUFxQixDQUErRTtJQUc3RyxZQUNDLE1BQXFDLEVBQ3JDLEtBQW1ELEVBQ25ELE9BQXVCLEVBQ3ZCLE1BTUM7UUFFRCxLQUFLLEVBQUUsQ0FBQztRQXZCVCxnQkFBVyxHQUFr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
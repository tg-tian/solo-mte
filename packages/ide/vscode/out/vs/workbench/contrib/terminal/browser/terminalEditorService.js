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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalInstanceService } from './terminal.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { getInstanceFromResource } from './terminalUri.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService, ACTIVE_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let TerminalEditorService = class TerminalEditorService extends Disposable {
    constructor(_editorService, _editorGroupsService, _terminalInstanceService, _instantiationService, lifecycleService, contextKeyService) {
        super();
        this._editorService = _editorService;
        this._editorGroupsService = _editorGroupsService;
        this._terminalInstanceService = _terminalInstanceService;
        this._instantiationService = _instantiationService;
        this.instances = [];
        this._activeInstanceIndex = -1;
        this._isShuttingDown = false;
        this._editorInputs = new Map();
        this._instanceDisposables = new Map();
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onDidChangeInstances = this._register(new Emitter());
        this.onDidChangeInstances = this._onDidChangeInstances.event;
        this._terminalEditorActive = TerminalContextKeys.terminalEditorActive.bindTo(contextKeyService);
        this._register(toDisposable(() => {
            for (const d of this._instanceDisposables.values()) {
                dispose(d);
            }
        }));
        this._register(lifecycleService.onWillShutdown(() => this._isShuttingDown = true));
        this._register(this._editorService.onDidActiveEditorChange(() => {
            const activeEditor = this._editorService.activeEditor;
            const instance = activeEditor instanceof TerminalEditorInput ? activeEditor?.terminalInstance : undefined;
            const terminalEditorActive = !!instance && activeEditor instanceof TerminalEditorInput;
            this._terminalEditorActive.set(terminalEditorActive);
            if (terminalEditorActive) {
                activeEditor?.setGroup(this._editorService.activeEditorPane?.group);
                this.setActiveInstance(instance);
            }
            else {
                for (const instance of this.instances) {
                    instance.resetFocusContextKey();
                }
            }
        }));
        this._register(this._editorService.onDidVisibleEditorsChange(() => {
            // add any terminal editors created via the editor service split command
            const knownIds = this.instances.map(i => i.instanceId);
            const terminalEditors = this._getActiveTerminalEditors();
            const unknownEditor = terminalEditors.find(input => {
                const inputId = input instanceof TerminalEditorInput ? input.terminalInstance?.instanceId : undefined;
                if (inputId === undefined) {
                    return false;
                }
                return !knownIds.includes(inputId);
            });
            if (unknownEditor instanceof TerminalEditorInput && unknownEditor.terminalInstance) {
                this._editorInputs.set(unknownEditor.terminalInstance.resource.path, unknownEditor);
                this.instances.push(unknownEditor.terminalInstance);
            }
        }));
        // Remove the terminal from the managed instances when the editor closes. This fires when
        // dragging and dropping to another editor or closing the editor via cmd/ctrl+w.
        this._register(this._editorService.onDidCloseEditor(e => {
            const instance = e.editor instanceof TerminalEditorInput ? e.editor.terminalInstance : undefined;
            if (instance) {
                const instanceIndex = this.instances.findIndex(e => e === instance);
                if (instanceIndex !== -1) {
                    const wasActiveInstance = this.instances[instanceIndex] === this.activeInstance;
                    this._removeInstance(instance);
                    if (wasActiveInstance) {
                        this.setActiveInstance(undefined);
                    }
                }
            }
        }));
    }
    _getActiveTerminalEditors() {
        return this._editorService.visibleEditors.filter(e => e instanceof TerminalEditorInput && e.terminalInstance?.instanceId);
    }
    get activeInstance() {
        if (this.instances.length === 0 || this._activeInstanceIndex === -1) {
            return undefined;
        }
        return this.instances[this._activeInstanceIndex];
    }
    setActiveInstance(instance) {
        this._activeInstanceIndex = instance ? this.instances.findIndex(e => e === instance) : -1;
        this._onDidChangeActiveInstance.fire(this.activeInstance);
    }
    async focusInstance(instance) {
        if (!this.instances.includes(instance)) {
            return;
        }
        this.setActiveInstance(instance);
        await this._revealEditor(instance);
        await instance.focusWhenReady(true);
    }
    async focusActiveInstance() {
        return this.activeInstance?.focusWhenReady(true);
    }
    async openEditor(instance, editorOptions) {
        const resource = this.resolveResource(instance);
        if (resource) {
            await this._activeOpenEditorRequest?.promise;
            this._activeOpenEditorRequest = {
                instanceId: instance.instanceId,
                promise: this._editorService.openEditor({
                    resource,
                    description: instance.description || instance.shellLaunchConfig.type,
                    options: {
                        pinned: true,
                        forceReload: true,
                        preserveFocus: editorOptions?.preserveFocus,
                        auxiliary: editorOptions?.auxiliary,
                    }
                }, editorOptions?.viewColumn ?? ACTIVE_GROUP)
            };
            await this._activeOpenEditorRequest?.promise;
            this._activeOpenEditorRequest = undefined;
        }
    }
    resolveResource(instance) {
        const resource = instance.resource;
        const inputKey = resource.path;
        const cachedEditor = this._editorInputs.get(inputKey);
        if (cachedEditor) {
            return cachedEditor.resource;
        }
        instance.target = TerminalLocation.Editor;
        const input = this._instantiationService.createInstance(TerminalEditorInput, resource, instance);
        this._registerInstance(inputKey, input, instance);
        return input.resource;
    }
    getInputFromResource(resource) {
        const input = this._editorInputs.get(resource.path);
        if (!input) {
            throw new Error(`Could not get input from resource: ${resource.path}`);
        }
        return input;
    }
    _registerInstance(inputKey, input, instance) {
        this._editorInputs.set(inputKey, input);
        this._instanceDisposables.set(inputKey, [
            instance.onDidFocus(this._onDidFocusInstance.fire, this._onDidFocusInstance),
            instance.onDisposed(this._onDidDisposeInstance.fire, this._onDidDisposeInstance),
            instance.capabilities.onDidChangeCapabilities(() => this._onDidChangeInstanceCapability.fire(instance)),
        ]);
        this.instances.push(instance);
        this._onDidChangeInstances.fire();
    }
    _removeInstance(instance) {
        const inputKey = instance.resource.path;
        this._editorInputs.delete(inputKey);
        const instanceIndex = this.instances.findIndex(e => e === instance);
        if (instanceIndex !== -1) {
            this.instances.splice(instanceIndex, 1);
        }
        const disposables = this._instanceDisposables.get(inputKey);
        this._instanceDisposables.delete(inputKey);
        if (disposables) {
            dispose(disposables);
        }
        this._onDidChangeInstances.fire();
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    splitInstance(instanceToSplit, shellLaunchConfig = {}) {
        if (instanceToSplit.target === TerminalLocation.Editor) {
            // Make sure the instance to split's group is active
            const group = this._editorInputs.get(instanceToSplit.resource.path)?.group;
            if (group) {
                this._editorGroupsService.activateGroup(group);
            }
        }
        const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Editor);
        const resource = this.resolveResource(instance);
        if (resource) {
            this._editorService.openEditor({
                resource: URI.revive(resource),
                description: instance.description,
                options: {
                    pinned: true,
                    forceReload: true
                }
            }, SIDE_GROUP);
        }
        return instance;
    }
    reviveInput(deserializedInput) {
        const newDeserializedInput = { ...deserializedInput, findRevivedId: true };
        const instance = this._terminalInstanceService.createInstance({ attachPersistentProcess: newDeserializedInput }, TerminalLocation.Editor);
        const input = this._instantiationService.createInstance(TerminalEditorInput, instance.resource, instance);
        this._registerInstance(instance.resource.path, input, instance);
        return input;
    }
    detachInstance(instance) {
        const inputKey = instance.resource.path;
        const editorInput = this._editorInputs.get(inputKey);
        editorInput?.detachInstance();
        this._removeInstance(instance);
        // Don't dispose the input when shutting down to avoid layouts in the editor area
        if (!this._isShuttingDown) {
            editorInput?.dispose();
        }
    }
    async revealActiveEditor(preserveFocus) {
        const instance = this.activeInstance;
        if (!instance) {
            return;
        }
        await this._revealEditor(instance, preserveFocus);
    }
    async _revealEditor(instance, preserveFocus) {
        // If there is an active openEditor call for this instance it will be revealed by that
        if (this._activeOpenEditorRequest?.instanceId === instance.instanceId) {
            await this._activeOpenEditorRequest.promise;
            return;
        }
        const editorInput = this._editorInputs.get(instance.resource.path);
        if (!editorInput) {
            return;
        }
        await this._editorService.openEditor(editorInput, {
            pinned: true,
            forceReload: true,
            preserveFocus,
            activation: EditorActivation.PRESERVE
        });
    }
};
TerminalEditorService = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, ITerminalInstanceService),
    __param(3, IInstantiationService),
    __param(4, ILifecycleService),
    __param(5, IContextKeyService)
], TerminalEditorService);
export { TerminalEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFzQixnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBR3hHLE9BQU8sRUFBK0Usd0JBQXdCLEVBQTBCLE1BQU0sZUFBZSxDQUFDO0FBQzlKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTdFLElBQU0scUJB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
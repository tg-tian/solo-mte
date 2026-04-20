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
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Registry for chat input part widgets.
 * Widgets register themselves and are instantiated by the controller based on context key conditions.
 */
export const ChatInputPartWidgetsRegistry = new class {
    constructor() {
        this.widgets = [];
    }
    register(id, ctor, when) {
        this.widgets.push({ id, ctor: ctor, when });
    }
    getWidgets() {
        return this.widgets;
    }
}();
/**
 * Controller that manages the rendering of widgets in the chat input part.
 * Widgets are shown/hidden based on context key conditions.
 */
let ChatInputPartWidgetController = class ChatInputPartWidgetController extends Disposable {
    constructor(container, contextKeyService, instantiationService) {
        super();
        this.container = container;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.renderedWidgets = new Map();
        this.update();
        this._register(this.contextKeyService.onDidChangeContext(e => {
            const relevantKeys = new Set();
            for (const descriptor of ChatInputPartWidgetsRegistry.getWidgets()) {
                if (descriptor.when) {
                    for (const key of descriptor.when.keys()) {
                        relevantKeys.add(key);
                    }
                }
            }
            if (e.affectsSome(relevantKeys)) {
                this.update();
            }
        }));
    }
    update() {
        const visibleIds = new Set();
        for (const descriptor of ChatInputPartWidgetsRegistry.getWidgets()) {
            if (this.contextKeyService.contextMatchesRules(descriptor.when)) {
                visibleIds.add(descriptor.id);
            }
        }
        for (const [id, rendered] of this.renderedWidgets) {
            if (!visibleIds.has(id)) {
                rendered.widget.domNode.remove();
                rendered.disposables.dispose();
                this.renderedWidgets.delete(id);
            }
        }
        for (const descriptor of ChatInputPartWidgetsRegistry.getWidgets()) {
            if (!visibleIds.has(descriptor.id)) {
                continue;
            }
            if (!this.renderedWidgets.has(descriptor.id)) {
                const disposables = new DisposableStore();
                const widget = this.instantiationService.createInstance(descriptor.ctor);
                disposables.add(widget);
                disposables.add(widget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
                this.renderedWidgets.set(descriptor.id, { descriptor, widget, disposables });
                this.container.appendChild(widget.domNode);
            }
        }
        this._onDidChangeHeight.fire();
    }
    get height() {
        let total = 0;
        for (const rendered of this.renderedWidgets.values()) {
            total += rendered.widget.height;
        }
        return total;
    }
    dispose() {
        for (const rendered of this.renderedWidgets.values()) {
            rendered.widget.domNode.remove();
            rendered.disposables.dispose();
        }
        this.renderedWidgets.clear();
        super.dispose();
    }
};
ChatInputPartWidgetController = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], ChatInputPartWidgetController);
export { ChatInputPartWidgetController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UGFydFdpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRJbnB1dFBhcnRXaWRnZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBd0Isa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoSCxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUE0Qm5IOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLElBQUk7SUFBQTtRQUN0QyxZQUFPLEdBQXFDLEVBQUUsQ0FBQztJQVN6RCxDQUFDO0lBUEEsUUFBUSxDQUFvQyxFQUFVLEVBQUUsSUFBeUQsRUFBRSxJQUEyQjtRQUM3SSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBOEMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZGLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7Q0FDRCxFQUFFLENBQUM7QUFRSjs7O0dBR0c7QUFDSSxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFPNUQsWUFDa0IsU0FBc0IsRUFDbkIsaUJBQXNELEVBQ25ELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUpTLGNBQVMsR0FBVCxTQUFTLENBQWE7UUFDRixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2xDLHlCQUFv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
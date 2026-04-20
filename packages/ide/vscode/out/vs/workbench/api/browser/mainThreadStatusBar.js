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
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { DisposableMap, toDisposable, Disposable } from '../../../base/common/lifecycle.js';
import { IExtensionStatusBarItemService } from './statusBarExtensionPoint.js';
let MainThreadStatusBar = class MainThreadStatusBar extends Disposable {
    constructor(extHostContext, statusbarService) {
        super();
        this.statusbarService = statusbarService;
        this._entryDisposables = this._register(new DisposableMap());
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStatusBar);
        // once, at startup read existing items and send them over
        const entries = [];
        for (const [entryId, item] of statusbarService.getEntries()) {
            entries.push(asDto(entryId, item));
        }
        this._proxy.$acceptStaticEntries(entries);
        this._register(statusbarService.onDidChange(e => {
            if (e.added) {
                this._proxy.$acceptStaticEntries([asDto(e.added[0], e.added[1])]);
            }
        }));
        function asDto(entryId, item) {
            return {
                entryId,
                name: item.entry.name,
                text: item.entry.text,
                tooltip: item.entry.tooltip,
                command: typeof item.entry.command === 'string' ? item.entry.command : typeof item.entry.command === 'object' ? item.entry.command.id : undefined,
                priority: item.priority,
                alignLeft: item.alignment === 0 /* StatusbarAlignment.LEFT */,
                accessibilityInformation: item.entry.ariaLabel ? { label: item.entry.ariaLabel, role: item.entry.role } : undefined
            };
        }
    }
    $setEntry(entryId, id, extensionId, name, text, tooltip, hasTooltipProvider, command, color, backgroundColor, alignLeft, priority, accessibilityInformation) {
        const tooltipOrTooltipProvider = hasTooltipProvider
            ? {
                markdown: (cancellation) => {
                    return this._proxy.$provideTooltip(entryId, cancellation);
                },
                markdownNotSupportedFallback: undefined
            }
            : tooltip;
        const kind = this.statusbarService.setOrUpdateEntry(entryId, id, extensionId, name, text, tooltipOrTooltipProvider, command, color, backgroundColor, alignLeft, priority, accessibilityInformation);
        if (kind === 0 /* StatusBarUpdateKind.DidDefine */) {
            const disposable = toDisposable(() => this.statusbarService.unsetEntry(entryId));
            this._entryDisposables.set(entryId, disposable);
        }
    }
    $disposeEntry(entryId) {
        this._entryDisposables.deleteAndDispose(entryId);
    }
};
MainThreadStatusBar = __decorate([
    extHostNamedCustomer(MainContext.MainThreadStatusBar),
    __param(1, IExtensionStatusBarItemService)
], MainThreadStatusBar);
export { MainThreadStatusBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFN0YXR1c0Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTRCLFdBQVcsRUFBRSxjQUFjLEVBQTJDLE1BQU0sK0JBQStCLENBQUM7QUFFL0ksT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTVGLE9BQU8sRUFBRSw4QkFBOEIsRUFBdUIsTUFBTSw4QkFBOEIsQ0FBQztBQU01RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFLbEQsWUFDQyxjQUErQixFQUNDLGdCQUFpRTtRQUVqRyxLQUFLLEVBQUUsQ0FBQztRQUZ5QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWdDO1FBSmpGLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFDO1FBT2hGLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUV2RSwwREFBMEQ7UUFDMUQsTUFBTSxPQUFPLEdBQXVCLEVBQUUsQ0FBQztRQUN2QyxLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUM3RCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0s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
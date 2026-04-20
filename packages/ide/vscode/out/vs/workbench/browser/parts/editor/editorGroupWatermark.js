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
var EditorGroupWatermark_1;
import { $, append, clearNode, h } from '../../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { coalesce, shuffle } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb, OS } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
const showChatContextKey = ContextKeyExpr.and(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupDisabled', false));
const openChat = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showChatContextKey, web: showChatContextKey } };
const showCommands = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
const gotoFile = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
const openFile = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
const openFolder = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
const openFileOrFolder = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
const openRecent = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
const newUntitledFile = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
const findInFiles = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
const toggleTerminal = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
const startDebugging = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
const openSettings = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };
const baseEntries = [
    openChat,
    showCommands,
];
const emptyWindowEntries = coalesce([
    ...baseEntries,
    ...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
    openRecent,
    isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
]);
const workspaceEntries = [
    ...baseEntries,
];
const otherEntries = [
    gotoFile,
    findInFiles,
    startDebugging,
    toggleTerminal,
    openSettings,
];
let EditorGroupWatermark = class EditorGroupWatermark extends Disposable {
    static { EditorGroupWatermark_1 = this; }
    static { this.CACHED_WHEN = 'editorGroupWatermark.whenConditions'; }
    static { this.SETTINGS_KEY = 'workbench.tips.enabled'; }
    static { this.MINIMUM_ENTRIES = 3; }
    constructor(container, keybindingService, contextService, contextKeyService, configurationService, storageService) {
        super();
        this.keybindingService = keybindingService;
        this.contextService = contextService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.transientDisposables = this._register(new DisposableStore());
        this.keybindingLabels = this._register(new DisposableStore());
        this.enabled = false;
        this.cachedWhen = this.storageService.getObject(EditorGroupWatermark_1.CACHED_WHEN, 0 /* StorageScope.PROFILE */, Object.create(null));
        this.workbenchState = this.contextService.getWorkbenchState();
        const elements = h('.editor-group-watermark', [
            h('.watermark-container', [
                h('.letterpress'),
                h('.shortcuts@shortcuts'),
            ])
        ]);
        append(container, elements.root);
        this.shortcuts = elements.shortcuts;
        this.registerListeners();
        this.render();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(EditorGroupWatermark_1.SETTINGS_KEY) &&
                this.enabled !== this.configurationService.getValue(EditorGroupWatermark_1.SETTINGS_KEY)) {
                this.render();
            }
        }));
        this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
            if (this.workbenchState !== workbenchState) {
                this.workbenchState = workbenchState;
                this.render();
            }
        }));
        this._register(this.storageService.onWillSaveState(e => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                const entries = [...emptyWindowEntries, ...workspaceEntries, ...otherEntries];
                for (const entry of entries) {
                    const when = isWeb ? entry.when?.web : entry.when?.native;
                    if (when) {
                        this.cachedWhen[entry.id] = this.contextKeyService.contextMatchesRules(when);
                    }
                }
                this.storageService.store(EditorGroupWatermark_1.CACHED_WHEN, JSON.stringify(this.cachedWhen), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            }
        }));
    }
    render() {
        this.enabled = this.configurationService.getValue(EditorGroupWatermark_1.SETTINGS_KEY);
        clearNode(this.shortcuts);
        this.transientDisposables.clear();
        if (!this.enabled) {
            return;
        }
        const entries = this.filterEntries(this.workbenchState !== 1 /* WorkbenchState.EMPTY */ ? workspaceEntries : emptyWindowEntries);
        if (entries.length < EditorGroupWatermark_1.MINIMUM_ENTRIES) {
            const additionalEntries = this.filterEntries(otherEntries);
            shuffle(additionalEntries);
            entries.push(...additionalEntries.slice(0, EditorGroupWatermark_1.MINIMUM_ENTRIES - entries.length));
        }
        const box = append(this.shortcuts, $('.watermark-box'));
        const update = () => {
            clearNode(box);
            this.keybindingLabels.clear();
            for (const entry of entries) {
                const keys = this.keybindingService.lookupKeybinding(entry.id);
                if (!keys) {
                    continue;
                }
                const dl = append(box, $('dl'));
                const dt = append(dl, $('dt'));
                dt.textContent = entry.text;
                const dd = append(dl, $('dd'));
                const label = this.keybindingLabels.add(new KeybindingLabel(dd, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles }));
                label.set(keys);
            }
        };
        update();
        this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
    }
    filterEntries(entries) {
        const filteredEntries = entries
            .filter(entry => {
            if (this.cachedWhen[entry.id]) {
                return true; // cached from previous session
            }
            const contextKey = isWeb ? entry.when?.web : entry.when?.native;
            return !contextKey /* works without context */ || this.contextKeyService.contextMatchesRules(contextKey);
        })
            .filter(entry => !!CommandsRegistry.getCommand(entry.id))
            .filter(entry => !!this.keybindingService.lookupKeybinding(entry.id));
        return filteredEntries;
    }
};
EditorGroupWatermark = EditorGroupWatermark_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IWorkspaceContextService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IStorageService)
], EditorGroupWatermark);
export { EditorGroupWatermark };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckdyb3VwV2F0ZXJtYXJrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBd0Isa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUErQixtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25JLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSxvREFBb0QsQ0FBQztBQVc5RyxNQUFNLGtCQUFr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
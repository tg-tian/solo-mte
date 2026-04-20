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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { TerminalChatContextKeys } from './terminalChat.js';
import { LocalChatSessionUri } from '../../../chat/common/chatUri.js';
import { isNumber, isString } from '../../../../../base/common/types.js';
var StorageKeys;
(function (StorageKeys) {
    StorageKeys["ToolSessionMappings"] = "terminalChat.toolSessionMappings";
    StorageKeys["CommandIdMappings"] = "terminalChat.commandIdMappings";
})(StorageKeys || (StorageKeys = {}));
/**
 * Used to manage chat tool invocations and the underlying terminal instances they create/use.
 */
let TerminalChatService = class TerminalChatService extends Disposable {
    constructor(_logService, _terminalService, _storageService, _contextKeyService, _chatService) {
        super();
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._storageService = _storageService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._terminalInstancesByToolSessionId = new Map();
        this._toolSessionIdByTerminalInstance = new Map();
        this._chatSessionIdByTerminalInstance = new Map();
        this._terminalInstanceListenersByToolSessionId = this._register(new DisposableMap());
        this._chatSessionListenersByTerminalInstance = this._register(new DisposableMap());
        this._onDidRegisterTerminalInstanceForToolSession = new Emitter();
        this.onDidRegisterTerminalInstanceWithToolSession = this._onDidRegisterTerminalInstanceForToolSession.event;
        this._activeProgressParts = new Set();
        /**
         * Pending mappings restored from storage that have not yet been matched to a live terminal
         * instance (we match by persistentProcessId when it becomes available after reconnection).
         * toolSessionId -> persistentProcessId
         */
        this._pendingRestoredMappings = new Map();
        /**
         * Tracks chat session IDs that have auto approval enabled for all commands. This is a temporary
         * approval that lasts only for the duration of the session.
         */
        this._sessionAutoApprovalEnabled = new Set();
        this._hasToolTerminalContext = TerminalChatContextKeys.hasChatTerminals.bindTo(this._contextKeyService);
        this._hasHiddenToolTerminalContext = TerminalChatContextKeys.hasHiddenChatTerminals.bindTo(this._contextKeyService);
        this._restoreFromStorage();
    }
    registerTerminalInstanceWithToolSession(terminalToolSessionId, instance) {
        if (!terminalToolSessionId) {
            this._logService.warn('Attempted to register a terminal instance with an undefined tool session ID');
            return;
        }
        this._terminalInstancesByToolSessionId.set(terminalToolSessionId, instance);
        this._toolSessionIdByTerminalInstance.set(instance, terminalToolSessionId);
        this._onDidRegisterTerminalInstanceForToolSession.fire(instance);
        this._terminalInstanceListenersByToolSessionId.set(terminalToolSessionId, instance.onDisposed(() => {
            this._terminalInstancesByToolSessionId.delete(terminalToolSessionId);
            this._toolSessionIdByTerminalInstance.delete(instance);
            this._terminalInstanceListenersByToolSessionId.deleteAndDispose(terminalToolSessionId);
            this._persistToStorage();
            this._updateHasToolTerminalContextKeys();
        }));
        this._register(this._chatService.onDidDisposeSession(e => {
            for (const resource of e.sessionResource) {
                if (LocalChatSessionUri.parseLocalSessionId(resource) === terminalToolSessionId) {
                    this._terminalInstancesByToolSessionId.delete(terminalToolSessionId);
                    this._toolSessionIdByTerminalInstance.delete(instance);
                    this._terminalInstanceListenersByToolSessionId.deleteAndDispose(terminalToolSessionId);
                    // Clean up session auto approval state
                    const sessionId = LocalChatSessionUri.parseLocalSessionId(resource);
                    if (sessionId) {
                        this._sessionAutoApprovalEnabled.delete(sessionId);
                    }
                    this._persistToStorage();
                    this._updateHasToolTerminalContextKeys();
                }
            }
        }));
        // Update context keys when terminal instances change (including when terminals are created, disposed, revealed, or hidden)
        this._register(this._terminalService.onDidChangeInstances(() => this._updateHasToolTerminalContextKeys()));
        if (isNumber(instance.shellLaunchConfig?.attachPersistentProcess?.id) || isNumber(instance.persistentProcessId)) {
            this._persistToStorage();
        }
        this._updateHasToolTerminalContextKeys();
    }
    async getTerminalInstanceByToolSessionId(terminalToolSessionId) {
        await this._terminalService.whenConnected;
        if (!terminalToolSessionId) {
            return undefined;
        }
        if (this._pendingRestoredMappings.has(terminalToolSessionId)) {
            const instance = this._terminalService.instances.find(i => i.shellLaunchConfig.attachPersistentProcess?.id === this._pendingRestoredMappings.get(terminalToolSessionId));
            if (instance) {
                this._tryAdoptRestoredMapping(instance);
                return instance;
            }
        }
        return this._terminalInstancesByToolSessionId.get(terminalToolSessionId);
    }
    getToolSessionTerminalInstances(hiddenOnly) {
        if (hiddenOnly) {
            const foregroundInstances = new Set(this._terminalService.foregroundInstances.map(i => i.instanceId));
            const uniqueInstances = new Set(this._terminalInstancesByToolSessionId.values());
            return Array.from(uniqueInstances).filter(i => !foregroundInstances.has(i.instanceId));
        }
        // Ensure unique instances in case multiple tool sessions map to the same terminal
        return Array.from(new Set(this._terminalInstancesByToolSessionId.values()));
    }
    getToolSessionIdForInstance(instance) {
        return this._toolSessionIdByTerminalInstance.get(instance);
    }
    registerTerminalInstanceWithChatSession(chatSessionId, instance) {
        // If already registered with the same session ID, skip to avoid duplicate listeners
        if (this._chatSessionIdByTerminalInstance.get(instance) === chatSessionId) {
            return;
        }
        // Clean up previous listener if the instance was registered with a different session
        this._chatSessionListenersByTerminalInstance.deleteAndDispose(instance);
        this._chatSessionIdByTerminalInstance.set(instance, chatSessionId);
        // Clean up when the instance is disposed
        const disposable = instance.onDisposed(() => {
            this._chatSessionIdByTerminalInstance.delete(instance);
            this._chatSessionListenersByTerminalInstance.deleteAndDispose(instance);
        });
        this._chatSessionListenersByTerminalInstance.set(instance, disposable);
    }
    getChatSessionIdForInstance(instance) {
        return this._chatSessionIdByTerminalInstance.get(instance);
    }
    isBackgroundTerminal(terminalToolSessionId) {
        if (!terminalToolSessionId) {
            return false;
        }
        const instance = this._terminalInstancesByToolSessionId.get(terminalToolSessionId);
        if (!instance) {
            return false;
        }
        return this._terminalService.instances.includes(instance) && !this._terminalService.foregroundInstances.includes(instance);
    }
    registerProgressPart(part) {
        this._activeProgressParts.add(part);
        if (this._isAfter(part, this._mostRecentProgressPart)) {
            this._mostRecentProgressPart = part;
        }
        return toDisposable(() => {
            this._activeProgressParts.delete(part);
            if (this._focusedProgressPart === part) {
                this._focusedProgressPart = undefined;
            }
            if (this._mostRecentProgressPart === part) {
                this._mostRecentProgressPart = this._getLastActiveProgressPart();
            }
        });
    }
    setFocusedProgressPart(part) {
        this._focusedProgressPart = part;
    }
    clearFocusedProgressPart(part) {
        if (this._focusedProgressPart === part) {
            this._focusedProgressPart = undefined;
        }
    }
    getFocusedProgressPart() {
        return this._focusedProgressPart;
    }
    getMostRecentProgressPart() {
        if (!this._mostRecentProgressPart || !this._activeProgressParts.has(this._mostRecentProgressPart)) {
            this._mostRecentProgressPart = this._getLastActiveProgressPart();
        }
        return this._mostRecentProgressPart;
    }
    _getLastActiveProgressPart() {
        let latest;
        for (const part of this._activeProgressParts) {
            if (this._isAfter(part, latest)) {
                latest = part;
            }
        }
        return latest;
    }
    _isAfter(candidate, current) {
        if (!current) {
            return true;
        }
        if (candidate.elementIndex === current.elementIndex) {
            return candidate.contentIndex >= current.contentIndex;
        }
        return candidate.elementIndex > current.elementIndex;
    }
    _restoreFromStorage() {
        try {
            const raw = this._storageService.get("terminalChat.toolSessionMappings" /* StorageKeys.ToolSessionMappings */, 1 /* StorageScope.WORKSPACE */);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            for (const [toolSessionId, persistentProcessId] of parsed) {
                if (isString(toolSessionId) && isNumber(persistentProcessId)) {
                    this._pendingRestoredMappings.set(toolSessionId, persistentProcessId);
                }
            }
        }
        catch (err) {
            this._logService.warn('Failed to restore terminal chat tool session mappings', err);
        }
    }
    _tryAdoptRestoredMapping(instance) {
        if (this._pendingRestoredMappings.size === 0) {
            return;
        }
        for (const [toolSessionId, persistentProcessId] of this._pendingRestoredMappings) {
            if (persistentProcessId === instance.shellLaunchConfig.attachPersistentProcess?.id) {
                this._terminalInstancesByToolSessionId.set(toolSessionId, instance);
                this._toolSessionIdByTerminalInstance.set(instance, toolSessionId);
                this._onDidRegisterTerminalInstanceForToolSession.fire(instance);
                this._terminalInstanceListenersByToolSessionId.set(toolSessionId, instance.onDisposed(() => {
                    this._terminalInstancesByToolSessionId.delete(toolSessionId);
                    this._toolSessionIdByTerminalInstance.delete(instance);
                    this._terminalInstanceListenersByToolSessionId.deleteAndDispose(toolSessionId);
                    this._persistToStorage();
                }));
                this._pendingRestoredMappings.delete(toolSessionId);
                this._persistToStorage();
                break;
            }
        }
    }
    _persistToStorage() {
        this._updateHasToolTerminalContextKeys();
        try {
            const entries = [];
            for (const [toolSessionId, instance] of this._terminalInstancesByToolSessionId.entries()) {
                // Use the live persistent process id when available, otherwise fall back to the id
                // from the attached process so mappings survive early in the terminal lifecycle.
                const persistentId = isNumber(instance.persistentProcessId)
                    ? instance.persistentProcessId
                    : instance.shellLaunchConfig.attachPersistentProcess?.id;
                const shouldPersist = instance.shouldPersist || instance.shellLaunchConfig.forcePersist;
                if (isNumber(persistentId) && shouldPersist) {
                    entries.push([toolSessionId, persistentId]);
                }
            }
            if (entries.length > 0) {
                this._storageService.store("terminalChat.toolSessionMappings" /* StorageKeys.ToolSessionMappings */, JSON.stringify(entries), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this._storageService.remove("terminalChat.toolSessionMappings" /* StorageKeys.ToolSessionMappings */, 1 /* StorageScope.WORKSPACE */);
            }
        }
        catch (err) {
            this._logService.warn('Failed to persist terminal chat tool session mappings', err);
        }
    }
    _updateHasToolTerminalContextKeys() {
        const toolCount = this._terminalInstancesByToolSessionId.size;
        this._hasToolTerminalContext.set(toolCount > 0);
        const hiddenTerminalCount = this.getToolSessionTerminalInstances(true).length;
        this._hasHiddenToolTerminalContext.set(hiddenTerminalCount > 0);
    }
    setChatSessionAutoApproval(chatSessionId, enabled) {
        if (enabled) {
            this._sessionAutoApprovalEnabled.add(chatSessionId);
        }
        else {
            this._sessionAutoApprovalEnabled.delete(chatSessionId);
        }
    }
    hasChatSessionAutoApproval(chatSessionId) {
        return this._sessionAutoApprovalEnabled.has(chatSessionId);
    }
};
TerminalChatService = __decorate([
    __param(0, ILogService),
    __param(1, ITerminalService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IChatService)
], TerminalChatService);
export { TerminalChatService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQTBFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakosT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV6RSxJQUFXLFdBR1Y7QUFIRCxXQUFXLFdBQVc7SUFDckIsdUVBQXdELENBQUE7SUFDeEQsbUVBQW9ELENBQUE7QUFDckQsQ0FBQyxFQUhVLFdBQVcsS0FBWCxXQUFXLFFBR3JCO0FBR0Q7O0dBRUc7QUFDSSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUE4QmxELFlBQ2MsV0FBeUMsRUFDcEMsZ0JBQW1ELEVBQ3BELGVB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
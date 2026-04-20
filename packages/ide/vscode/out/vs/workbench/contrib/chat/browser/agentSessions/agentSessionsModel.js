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
var AgentSessionsModel_1, AgentSessionsCache_1;
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IChatSessionsService, isSessionInProgressStatus } from '../../common/chatSessionsService.js';
import { AgentSessionProviders, getAgentSessionProviderIcon, getAgentSessionProviderName } from './agentSessions.js';
//#region Interfaces, Types
export { ChatSessionStatus as AgentSessionStatus } from '../../common/chatSessionsService.js';
export { isSessionInProgressStatus } from '../../common/chatSessionsService.js';
/**
 * Checks if the provided changes object represents valid diff information.
 */
export function hasValidDiff(changes) {
    if (!changes) {
        return false;
    }
    if (changes instanceof Array) {
        return changes.length > 0;
    }
    return changes.files > 0 || changes.insertions > 0 || changes.deletions > 0;
}
/**
 * Gets a summary of agent session changes, converting from array format to object format if needed.
 */
export function getAgentChangesSummary(changes) {
    if (!changes) {
        return;
    }
    if (!(changes instanceof Array)) {
        return changes;
    }
    let insertions = 0;
    let deletions = 0;
    for (const change of changes) {
        insertions += change.insertions;
        deletions += change.deletions;
    }
    return { files: changes.length, insertions, deletions };
}
export function isLocalAgentSessionItem(session) {
    return session.providerType === AgentSessionProviders.Local;
}
export function isAgentSession(obj) {
    const session = obj;
    return URI.isUri(session?.resource) && typeof session.setArchived === 'function' && typeof session.setRead === 'function';
}
export function isAgentSessionsModel(obj) {
    const sessionsModel = obj;
    return Array.isArray(sessionsModel?.sessions) && typeof sessionsModel?.getSession === 'function';
}
export var AgentSessionSection;
(function (AgentSessionSection) {
    AgentSessionSection["InProgress"] = "inProgress";
    AgentSessionSection["Today"] = "today";
    AgentSessionSection["Yesterday"] = "yesterday";
    AgentSessionSection["Week"] = "week";
    AgentSessionSection["Older"] = "older";
    AgentSessionSection["Archived"] = "archived";
})(AgentSessionSection || (AgentSessionSection = {}));
export function isAgentSessionSection(obj) {
    const candidate = obj;
    return typeof candidate.section === 'string' && Array.isArray(candidate.sessions);
}
export function isMarshalledAgentSessionContext(thing) {
    if (typeof thing === 'object' && thing !== null) {
        const candidate = thing;
        return candidate.$mid === 25 /* MarshalledId.AgentSessionContext */ && typeof candidate.session === 'object' && candidate.session !== null;
    }
    return false;
}
//#endregion
let AgentSessionsModel = class AgentSessionsModel extends Disposable {
    static { AgentSessionsModel_1 = this; }
    get sessions() { return Array.from(this._sessions.values()); }
    constructor(chatSessionsService, lifecycleService, instantiationService, storageService, logService) {
        super();
        this.chatSessionsService = chatSessionsService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.logService = logService;
        this._onWillResolve = this._register(new Emitter());
        this.onWillResolve = this._onWillResolve.event;
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidChangeSessions = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this.resolver = this._register(new ThrottledDelayer(100));
        this.providersToResolve = new Set();
        this.mapSessionToState = new ResourceMap();
        this._sessions = new ResourceMap();
        this.cache = this.instantiationService.createInstance(AgentSessionsCache);
        for (const data of this.cache.loadCachedSessions()) {
            const session = this.toAgentSession(data);
            this._sessions.set(session.resource, session);
        }
        this.sessionStates = this.cache.loadSessionStates();
        this.registerListeners();
    }
    registerListeners() {
        // Sessions changes
        this._register(this.chatSessionsService.onDidChangeItemsProviders(({ chatSessionType: provider }) => this.resolve(provider)));
        this._register(this.chatSessionsService.onDidChangeAvailability(() => this.resolve(undefined)));
        this._register(this.chatSessionsService.onDidChangeSessionItems(provider => this.resolve(provider)));
        // State
        this._register(this.storageService.onWillSaveState(() => {
            this.cache.saveCachedSessions(Array.from(this._sessions.values()));
            this.cache.saveSessionStates(this.sessionStates);
        }));
    }
    getSession(resource) {
        return this._sessions.get(resource);
    }
    async resolve(provider) {
        if (Array.isArray(provider)) {
            for (const p of provider) {
                this.providersToResolve.add(p);
            }
        }
        else {
            this.providersToResolve.add(provider);
        }
        return this.resolver.trigger(async (token) => {
            if (token.isCancellationRequested || this.lifecycleService.willShutdown) {
                return;
            }
            try {
                this._onWillResolve.fire();
                return await this.doResolve(token);
            }
            finally {
                this._onDidResolve.fire();
            }
        });
    }
    async doResolve(token) {
        const providersToResolve = Array.from(this.providersToResolve);
        this.providersToResolve.clear();
        const mapSessionContributionToType = new Map();
        for (const contribution of this.chatSessionsService.getAllChatSessionContributions()) {
            mapSessionContributionToType.set(contribution.type, contribution);
        }
        const resolvedProviders = new Set();
        const sessions = new ResourceMap();
        for (const provider of this.chatSessionsService.getAllChatSessionItemProviders()) {
            if (!providersToResolve.includes(undefined) && !providersToResolve.includes(provider.chatSessionType)) {
                continue; // skip: not considered for resolving
            }
            let providerSessions;
            try {
                providerSessions = await provider.provideChatSessionItems(token);
            }
            catch (error) {
                this.logService.error(`Failed to resolve sessions for provider ${provider.chatSessionType}`, error);
                continue; // skip: failed to resolve sessions for provider
            }
            resolvedProviders.add(provider.chatSessionType);
            if (token.isCancellationRequested) {
                return;
            }
            for (const session of providerSessions) {
                // Icon + Label
                let icon;
                let providerLabel;
                switch ((provider.chatSessionType)) {
                    case AgentSessionProviders.Local:
                        providerLabel = getAgentSessionProviderName(AgentSessionProviders.Local);
                        icon = getAgentSessionProviderIcon(AgentSessionProviders.Local);
                        break;
                    case AgentSessionProviders.Background:
                        providerLabel = getAgentSessionProviderName(AgentSessionProviders.Background);
                        icon = getAgentSessionProviderIcon(AgentSessionProviders.Background);
                        break;
                    case AgentSessionProviders.Cloud:
                        providerLabel = getAgentSessionProviderName(AgentSessionProviders.Cloud);
                        icon = getAgentSessionProviderIcon(AgentSessionProviders.Cloud);
                        break;
                    default: {
                        providerLabel = mapSessionContributionToType.get(provider.chatSessionType)?.name ?? provider.chatSessionType;
                        icon = session.iconPath ?? Codicon.terminal;
                    }
                }
                // State + Timings
                // TODO@bpasero this is a workaround for not having precise timing info in sessions
                // yet: we only track the time when a transition changes because then we can say with
                // confidence that the time is correct by assuming `Date.now()`. A better approach would
                // be to get all this information directly from the session.
                const status = session.status ?? 1 /* AgentSessionStatus.Completed */;
                const state = this.mapSessionToState.get(session.resource);
                let inProgressTime = state?.inProgressTime;
                let finishedOrFailedTime = state?.finishedOrFailedTime;
                // No previous state, just add it
                if (!state) {
                    this.mapSessionToState.set(session.resource, {
                        status,
                        inProgressTime: isSessionInProgressStatus(status) ? Date.now() : undefined, // this is not accurate but best effort
                    });
                }
                // State changed, update it
                else if (status !== state.status) {
                    inProgressTime = isSessionInProgressStatus(status) ? Date.now() : state.inProgressTime;
                    finishedOrFailedTime = !isSessionInProgressStatus(status) ? Date.now() : state.finishedOrFailedTime;
                    this.mapSessionToState.set(session.resource, {
                        status,
                        inProgressTime,
                        finishedOrFailedTime
                    });
                }
                const changes = session.changes;
                const normalizedChanges = changes && !(changes instanceof Array)
                    ? { files: changes.files, insertions: changes.insertions, deletions: changes.deletions }
                    : changes;
                // Times: it is important to always provide a start and end time to track
                // unread/read state for example.
                // If somehow the provider does not provide any, fallback to last known
                let startTime = session.timing.startTime;
                let endTime = session.timing.endTime;
                if (!startTime || !endTime) {
                    const existing = this._sessions.get(session.resource);
                    if (!startTime && existing?.timing.startTime) {
                        startTime = existing.timing.startTime;
                    }
                    if (!endTime && existing?.timing.endTime) {
                        endTime = existing.timing.endTime;
                    }
                }
                sessions.set(session.resource, this.toAgentSession({
                    providerType: provider.chatSessionType,
                    providerLabel,
                    resource: session.resource,
                    label: session.label,
                    description: session.description,
                    icon,
                    badge: session.badge,
                    tooltip: session.tooltip,
                    status,
                    archived: session.archived,
                    timing: { startTime, endTime, inProgressTime, finishedOrFailedTime },
                    changes: normalizedChanges,
                }));
            }
        }
        for (const [, session] of this._sessions) {
            if (!resolvedProviders.has(session.providerType)) {
                sessions.set(session.resource, session); // fill in existing sessions for providers that did not resolve
            }
        }
        this._sessions = sessions;
        for (const [resource] of this.mapSessionToState) {
            if (!sessions.has(resource)) {
                this.mapSessionToState.delete(resource); // clean up tracking for removed sessions
            }
        }
        for (const [resource] of this.sessionStates) {
            if (!sessions.has(resource)) {
                this.sessionStates.delete(resource); // clean up states for removed sessions
            }
        }
        this._onDidChangeSessions.fire();
    }
    toAgentSession(data) {
        return {
            ...data,
            isArchived: () => this.isArchived(data),
            setArchived: (archived) => this.setArchived(data, archived),
            isRead: () => this.isRead(data),
            setRead: (read) => this.setRead(data, read),
        };
    }
    //#region States
    // In order to reduce the amount of unread sessions a user will
    // see after updating to 1.107, we specify a fixed date that a
    // session needs to be created after to be considered unread unless
    // the user has explicitly marked it as read.
    static { this.READ_STATE_INITIAL_DATE = Date.UTC(2025, 11 /* December */, 8); }
    isArchived(session) {
        return this.sessionStates.get(session.resource)?.archived ?? Boolean(session.archived);
    }
    setArchived(session, archived) {
        if (archived === this.isArchived(session)) {
            return; // no change
        }
        const state = this.sessionStates.get(session.resource) ?? { archived: false, read: 0 };
        this.sessionStates.set(session.resource, { ...state, archived });
        this._onDidChangeSessions.fire();
    }
    isRead(session) {
        const readDate = this.sessionStates.get(session.resource)?.read;
        return (readDate ?? AgentSessionsModel_1.READ_STATE_INITIAL_DATE) >= (session.timing.endTime ?? session.timing.startTime);
    }
    setRead(session, read) {
        if (read === this.isRead(session)) {
            return; // no change
        }
        const state = this.sessionStates.get(session.resource) ?? { archived: false, read: 0 };
        this.sessionStates.set(session.resource, { ...state, read: read ? Date.now() : 0 });
        this._onDidChangeSessions.fire();
    }
};
AgentSessionsModel = AgentSessionsModel_1 = __decorate([
    __param(0, IChatSessionsService),
    __param(1, ILifecycleService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, ILogService)
], AgentSessionsModel);
export { AgentSessionsModel };
let AgentSessionsCache = class AgentSessionsCache {
    static { AgentSessionsCache_1 = this; }
    static { this.SESSIONS_STORAGE_KEY = 'agentSessions.model.cache'; }
    static { this.STATE_STORAGE_KEY = 'agentSessions.state.cache'; }
    constructor(storageService) {
        this.storageService = storageService;
    }
    //#region Sessions
    saveCachedSessions(sessions) {
        const serialized = sessions.map(session => ({
            providerType: session.providerType,
            providerLabel: session.providerLabel,
            resource: session.resource.toJSON(),
            icon: session.icon.id,
            label: session.label,
            description: session.description,
            badge: session.badge,
            tooltip: session.tooltip,
            status: session.status,
            archived: session.archived,
            timing: {
                startTime: session.timing.startTime,
                endTime: session.timing.endTime,
            },
            changes: session.changes,
        }));
        this.storageService.store(AgentSessionsCache_1.SESSIONS_STORAGE_KEY, JSON.stringify(serialized), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadCachedSessions() {
        const sessionsCache = this.storageService.get(AgentSessionsCache_1.SESSIONS_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!sessionsCache) {
            return [];
        }
        try {
            const cached = JSON.parse(sessionsCache);
            return cached.map(session => ({
                providerType: session.providerType,
                providerLabel: session.providerLabel,
                resource: URI.revive(session.resource),
                icon: ThemeIcon.fromId(session.icon),
                label: session.label,
                description: session.description,
                badge: session.badge,
                tooltip: session.tooltip,
                status: session.status,
                archived: session.archived,
                timing: {
                    startTime: session.timing.startTime,
                    endTime: session.timing.endTime,
                },
                changes: Array.isArray(session.changes) ? session.changes.map((change) => ({
                    modifiedUri: URI.revive(change.modifiedUri),
                    originalUri: change.originalUri ? URI.revive(change.originalUri) : undefined,
                    insertions: change.insertions,
                    deletions: change.deletions,
                })) : session.changes,
            }));
        }
        catch {
            return []; // invalid data in storage, fallback to empty sessions list
        }
    }
    //#endregion
    //#region States
    saveSessionStates(states) {
        const serialized = Array.from(states.entries()).map(([resource, state]) => ({
            resource: resource.toJSON(),
            archived: state.archived,
            read: state.read
        }));
        this.storageService.store(AgentSessionsCache_1.STATE_STORAGE_KEY, JSON.stringify(serialized), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadSessionStates() {
        const states = new ResourceMap();
        const statesCache = this.storageService.get(AgentSessionsCache_1.STATE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!statesCache) {
            return states;
        }
        try {
            const cached = JSON.parse(statesCache);
            for (const entry of cached) {
                states.set(URI.revive(entry.resource), {
                    archived: entry.archived,
                    read: entry.read
                });
            }
        }
        catch {
            // invalid data in storage, fallback to empty states
        }
        return states;
    }
};
AgentSessionsCache = AgentSessionsCache_1 = __decorate([
    __param(0, IStorageService)
], AgentSessionsCache);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hZ2VudFNlc3Npb25zL2FnZW50U2Vzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLG1EQUFtRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBa0gsb0JBQW9CLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0TixPQUFPLEVBQUUscUJBQXFCLEVBQUUsMkJBQTJCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVySCwyQkFBMkI7QUFFM0IsT0FBTyxFQUFFLGlCQUFpQixJQUFJLGtCQUFrQixFQUFFLE1BQU0scUNBQXFD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
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
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { equals } from '../../../../../base/common/objects.js';
import { localize } from '../../../../../nls.js';
import { registerAction2, Action2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { AgentSessionProviders, getAgentSessionProviderName } from './agentSessions.js';
const DEFAULT_EXCLUDES = Object.freeze({
    providers: [],
    states: [],
    archived: true,
    read: false,
});
let AgentSessionsFilter = class AgentSessionsFilter extends Disposable {
    constructor(options, chatSessionsService, storageService) {
        super();
        this.options = options;
        this.chatSessionsService = chatSessionsService;
        this.storageService = storageService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.limitResults = () => this.options.limitResults?.();
        this.groupResults = () => this.options.groupResults?.();
        this.excludes = DEFAULT_EXCLUDES;
        this.actionDisposables = this._register(new DisposableStore());
        this.STORAGE_KEY = `agentSessions.filterExcludes.${this.options.filterMenuId.id.toLowerCase()}`;
        this.updateExcludes(false);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.chatSessionsService.onDidChangeItemsProviders(() => this.updateFilterActions()));
        this._register(this.chatSessionsService.onDidChangeAvailability(() => this.updateFilterActions()));
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, this.STORAGE_KEY, this._store)(() => this.updateExcludes(true)));
    }
    updateExcludes(fromEvent) {
        const excludedTypesRaw = this.storageService.get(this.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (excludedTypesRaw) {
            try {
                this.excludes = JSON.parse(excludedTypesRaw);
            }
            catch {
                this.resetExcludes();
            }
        }
        else {
            this.resetExcludes();
        }
        this.updateFilterActions();
        if (fromEvent) {
            this._onDidChange.fire();
        }
    }
    resetExcludes() {
        this.excludes = {
            providers: [...DEFAULT_EXCLUDES.providers],
            states: [...DEFAULT_EXCLUDES.states],
            archived: DEFAULT_EXCLUDES.archived,
            read: DEFAULT_EXCLUDES.read,
        };
    }
    storeExcludes(excludes) {
        this.excludes = excludes;
        this.storageService.store(this.STORAGE_KEY, JSON.stringify(this.excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    updateFilterActions() {
        this.actionDisposables.clear();
        this.registerProviderActions(this.actionDisposables);
        this.registerStateActions(this.actionDisposables);
        this.registerArchivedActions(this.actionDisposables);
        this.registerReadActions(this.actionDisposables);
        this.registerResetAction(this.actionDisposables);
    }
    registerProviderActions(disposables) {
        const providers = [
            { id: AgentSessionProviders.Local, label: getAgentSessionProviderName(AgentSessionProviders.Local) },
            { id: AgentSessionProviders.Background, label: getAgentSessionProviderName(AgentSessionProviders.Background) },
            { id: AgentSessionProviders.Cloud, label: getAgentSessionProviderName(AgentSessionProviders.Cloud) },
        ];
        for (const provider of this.chatSessionsService.getAllChatSessionContributions()) {
            if (providers.find(p => p.id === provider.type)) {
                continue; // already added
            }
            providers.push({ id: provider.type, label: provider.name });
        }
        const that = this;
        let counter = 0;
        for (const provider of providers) {
            disposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `agentSessions.filter.toggleExclude:${provider.id}.${that.options.filterMenuId.id.toLowerCase()}`,
                        title: provider.label,
                        menu: {
                            id: that.options.filterMenuId,
                            group: '1_providers',
                            order: counter++,
                        },
                        toggled: that.excludes.providers.includes(provider.id) ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                    });
                }
                run() {
                    const providerExcludes = new Set(that.excludes.providers);
                    if (!providerExcludes.delete(provider.id)) {
                        providerExcludes.add(provider.id);
                    }
                    that.storeExcludes({ ...that.excludes, providers: Array.from(providerExcludes) });
                }
            }));
        }
    }
    registerStateActions(disposables) {
        const states = [
            { id: 1 /* AgentSessionStatus.Completed */, label: localize('agentSessionStatus.completed', "Completed") },
            { id: 2 /* AgentSessionStatus.InProgress */, label: localize('agentSessionStatus.inProgress', "In Progress") },
            { id: 3 /* AgentSessionStatus.NeedsInput */, label: localize('agentSessionStatus.needsInput', "Input Needed") },
            { id: 0 /* AgentSessionStatus.Failed */, label: localize('agentSessionStatus.failed', "Failed") },
        ];
        const that = this;
        let counter = 0;
        for (const state of states) {
            disposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `agentSessions.filter.toggleExcludeState:${state.id}.${that.options.filterMenuId.id.toLowerCase()}`,
                        title: state.label,
                        menu: {
                            id: that.options.filterMenuId,
                            group: '2_states',
                            order: counter++,
                        },
                        toggled: that.excludes.states.includes(state.id) ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                    });
                }
                run() {
                    const stateExcludes = new Set(that.excludes.states);
                    if (!stateExcludes.delete(state.id)) {
                        stateExcludes.add(state.id);
                    }
                    that.storeExcludes({ ...that.excludes, states: Array.from(stateExcludes) });
                }
            }));
        }
    }
    registerArchivedActions(disposables) {
        const that = this;
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `agentSessions.filter.toggleExcludeArchived.${that.options.filterMenuId.id.toLowerCase()}`,
                    title: localize('agentSessions.filter.archived', 'Archived'),
                    menu: {
                        id: that.options.filterMenuId,
                        group: '3_props',
                        order: 1000,
                    },
                    toggled: that.excludes.archived ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                });
            }
            run() {
                that.storeExcludes({ ...that.excludes, archived: !that.excludes.archived });
            }
        }));
    }
    registerReadActions(disposables) {
        const that = this;
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `agentSessions.filter.toggleExcludeRead.${that.options.filterMenuId.id.toLowerCase()}`,
                    title: localize('agentSessions.filter.read', 'Read'),
                    menu: {
                        id: that.options.filterMenuId,
                        group: '3_props',
                        order: 0,
                    },
                    toggled: that.excludes.read ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                });
            }
            run() {
                that.storeExcludes({ ...that.excludes, read: !that.excludes.read });
            }
        }));
    }
    registerResetAction(disposables) {
        const that = this;
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `agentSessions.filter.resetExcludes.${that.options.filterMenuId.id.toLowerCase()}`,
                    title: localize('agentSessions.filter.reset', "Reset"),
                    menu: {
                        id: that.options.filterMenuId,
                        group: '4_reset',
                        order: 0,
                    },
                });
            }
            run() {
                that.resetExcludes();
                that.storageService.store(that.STORAGE_KEY, JSON.stringify(that.excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        }));
    }
    isDefault() {
        return equals(this.excludes, DEFAULT_EXCLUDES);
    }
    exclude(session) {
        const overrideExclude = this.options?.overrideExclude?.(session);
        if (typeof overrideExclude === 'boolean') {
            return overrideExclude;
        }
        if (this.excludes.archived && session.isArchived()) {
            return true;
        }
        if (this.excludes.read && (session.isArchived() || session.isRead())) {
            return true;
        }
        if (this.excludes.providers.includes(session.providerType)) {
            return true;
        }
        if (this.excludes.states.includes(session.status)) {
            return true;
        }
        return false;
    }
    notifyResults(count) {
        this.options.notifyResults?.(count);
    }
};
AgentSessionsFilter = __decorate([
    __param(1, IChatSessionsService),
    __param(2, IStorageService)
], AgentSessionsFilter);
export { AgentSessionsFilter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc0ZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zRmlsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQVUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQXdCeEYsTUFBTSxnQkFBZ0IsR0FBK0IsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNsRSxTQUFTLEVBQUUsRUFBVztJQUN0QixNQUFNLEVBQUUsRUFBVztJQUNuQixRQUFRLEVBQUUsSUFBYTtJQUN2QixJQUFJLEVBQUUsS0FBYztDQUNwQixDQUFDLENBQUM7QUFFSSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFjbEQsWUFDa0IsT0FBb0MsRUFDL0IsbUJBQTBELEVBQy9ELGNBQWdEO1FBRWpFLEtBQUssRUFB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
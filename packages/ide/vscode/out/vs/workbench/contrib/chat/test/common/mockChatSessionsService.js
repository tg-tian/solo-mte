/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
export class MockChatSessionsService {
    constructor() {
        this._onDidChangeSessionOptions = new Emitter();
        this.onDidChangeSessionOptions = this._onDidChangeSessionOptions.event;
        this._onDidChangeItemsProviders = new Emitter();
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._onDidChangeSessionItems = new Emitter();
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = new Emitter();
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._onDidChangeInProgress = new Emitter();
        this.onDidChangeInProgress = this._onDidChangeInProgress.event;
        this._onDidChangeContentProviderSchemes = new Emitter();
        this.onDidChangeContentProviderSchemes = this._onDidChangeContentProviderSchemes.event;
        this._onDidChangeOptionGroups = new Emitter();
        this.onDidChangeOptionGroups = this._onDidChangeOptionGroups.event;
        this.sessionItemProviders = new Map();
        this.contentProviders = new Map();
        this.contributions = [];
        this.optionGroups = new Map();
        this.sessionOptions = new ResourceMap();
        this.inProgress = new Map();
        this.onChange = () => { };
    }
    // For testing: allow triggering events
    fireDidChangeItemsProviders(provider) {
        this._onDidChangeItemsProviders.fire(provider);
    }
    fireDidChangeSessionItems(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    fireDidChangeAvailability() {
        this._onDidChangeAvailability.fire();
    }
    fireDidChangeInProgress() {
        this._onDidChangeInProgress.fire();
    }
    registerChatSessionItemProvider(provider) {
        this.sessionItemProviders.set(provider.chatSessionType, provider);
        return {
            dispose: () => {
                this.sessionItemProviders.delete(provider.chatSessionType);
            }
        };
    }
    getAllChatSessionContributions() {
        return this.contributions;
    }
    getChatSessionContribution(chatSessionType) {
        return this.contributions.find(contrib => contrib.type === chatSessionType);
    }
    setContributions(contributions) {
        this.contributions = contributions;
    }
    async activateChatSessionItemProvider(chatSessionType) {
        return this.sessionItemProviders.get(chatSessionType);
    }
    getAllChatSessionItemProviders() {
        return Array.from(this.sessionItemProviders.values());
    }
    getIconForSessionType(chatSessionType) {
        const contribution = this.contributions.find(c => c.type === chatSessionType);
        return contribution?.icon && typeof contribution.icon === 'string' ? ThemeIcon.fromId(contribution.icon) : undefined;
    }
    getWelcomeTitleForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.welcomeTitle;
    }
    getWelcomeMessageForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.welcomeMessage;
    }
    getInputPlaceholderForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.inputPlaceholder;
    }
    getAllChatSessionItems(token) {
        return Promise.all(Array.from(this.sessionItemProviders.values(), async (provider) => {
            return {
                chatSessionType: provider.chatSessionType,
                items: await provider.provideChatSessionItems(token),
            };
        }));
    }
    reportInProgress(chatSessionType, count) {
        this.inProgress.set(chatSessionType, count);
        this._onDidChangeInProgress.fire();
    }
    getInProgress() {
        return Array.from(this.inProgress.entries()).map(([displayName, count]) => ({ displayName, count }));
    }
    registerChatSessionContentProvider(chatSessionType, provider) {
        this.contentProviders.set(chatSessionType, provider);
        this._onDidChangeContentProviderSchemes.fire({ added: [chatSessionType], removed: [] });
        return {
            dispose: () => {
                this.contentProviders.delete(chatSessionType);
            }
        };
    }
    async canResolveContentProvider(chatSessionType) {
        return this.contentProviders.has(chatSessionType);
    }
    async getOrCreateChatSession(sessionResource, token) {
        const provider = this.contentProviders.get(sessionResource.scheme);
        if (!provider) {
            throw new Error(`No content provider for ${sessionResource.scheme}`);
        }
        return provider.provideChatSessionContent(sessionResource, token);
    }
    async canResolveChatSession(chatSessionResource) {
        return this.contentProviders.has(chatSessionResource.scheme);
    }
    getOptionGroupsForSessionType(chatSessionType) {
        return this.optionGroups.get(chatSessionType);
    }
    setOptionGroupsForSessionType(chatSessionType, handle, optionGroups) {
        if (optionGroups) {
            this.optionGroups.set(chatSessionType, optionGroups);
        }
        else {
            this.optionGroups.delete(chatSessionType);
        }
    }
    setOptionsChangeCallback(callback) {
        this.optionsChangeCallback = callback;
    }
    async notifySessionOptionsChange(sessionResource, updates) {
        await this.optionsChangeCallback?.(sessionResource, updates);
    }
    notifySessionItemsChanged(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    getSessionOption(sessionResource, optionId) {
        return this.sessionOptions.get(sessionResource)?.get(optionId);
    }
    setSessionOption(sessionResource, optionId, value) {
        if (!this.sessionOptions.has(sessionResource)) {
            this.sessionOptions.set(sessionResource, new Map());
        }
        this.sessionOptions.get(sessionResource).set(optionId, value);
        return true;
    }
    hasAnySessionOptions(resource) {
        return this.sessionOptions.has(resource) && this.sessionOptions.get(resource).size > 0;
    }
    getCapabilitiesForSessionType(chatSessionType) {
        return this.contributions.find(c => c.type === chatSessionType)?.capabilities;
    }
    getContentProviderSchemes() {
        return Array.from(this.contentProviders.keys());
    }
    getInProgressSessionDescription(chatModel) {
        return undefined;
    }
    registerChatModelChangeListeners(chatService, chatSessionType, onChange) {
        // Store the emitter so tests can trigger it
        this.onChange = onChange;
        return {
            dispose: () => {
            }
        };
    }
    // Helper method for tests to trigger progress events
    triggerProgressEvent() {
        if (this.onChange) {
            this.onChange();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRTZXNzaW9uc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrQ2hhdFNlc3Npb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQU9wRSxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBR2tCLCtCQUEwQixHQUFHLElBQUksT0FBTyxFQUFPLENBQUM7UUFDeEQsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztRQUMxRCwrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBNEIsQ0FBQztRQUM3RSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDO1FBRTFELDZCQUF3QixHQUFHLElBQUksT0FBTyxFQUFVLENBQUM7UUFDekQsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQztRQUV0RCw2QkFBd0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQ3ZELDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUM7UUFFdEQsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNyRCwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBRWxELHVDQUFrQyxHQUFHLElBQUksT0FBTyxFQUE0RCxDQUFDO1FBQ3JILHNDQUFpQyxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFL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
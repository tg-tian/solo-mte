/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, raceCancellation } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AiSettingsSearchResultKind, IAiSettingsSearchService } from './aiSettingsSearch.js';
export class AiSettingsSearchService extends Disposable {
    constructor() {
        super(...arguments);
        this._providers = [];
        this._llmRankedResultsPromises = new Map();
        this._embeddingsResultsPromises = new Map();
        this._onProviderRegistered = this._register(new Emitter());
        this.onProviderRegistered = this._onProviderRegistered.event;
    }
    static { this.MAX_PICKS = 5; }
    isEnabled() {
        return this._providers.length > 0;
    }
    registerSettingsSearchProvider(provider) {
        this._providers.push(provider);
        this._onProviderRegistered.fire();
        return {
            dispose: () => {
                const index = this._providers.indexOf(provider);
                if (index !== -1) {
                    this._providers.splice(index, 1);
                }
            }
        };
    }
    startSearch(query, token) {
        if (!this.isEnabled()) {
            throw new Error('No settings search providers registered');
        }
        this._embeddingsResultsPromises.delete(query);
        this._llmRankedResultsPromises.delete(query);
        this._providers.forEach(provider => provider.searchSettings(query, { limit: AiSettingsSearchService.MAX_PICKS, embeddingsOnly: false }, token));
    }
    async getEmbeddingsResults(query, token) {
        if (!this.isEnabled()) {
            throw new Error('No settings search providers registered');
        }
        const existingPromise = this._embeddingsResultsPromises.get(query);
        if (existingPromise) {
            const result = await existingPromise.p;
            return result ?? null;
        }
        const promise = new DeferredPromise();
        this._embeddingsResultsPromises.set(query, promise);
        const result = await raceCancellation(promise.p, token);
        return result ?? null;
    }
    async getLLMRankedResults(query, token) {
        if (!this.isEnabled()) {
            throw new Error('No settings search providers registered');
        }
        const existingPromise = this._llmRankedResultsPromises.get(query);
        if (existingPromise) {
            const result = await existingPromise.p;
            return result ?? null;
        }
        const promise = new DeferredPromise();
        this._llmRankedResultsPromises.set(query, promise);
        const result = await raceCancellation(promise.p, token);
        return result ?? null;
    }
    handleSearchResult(result) {
        if (!this.isEnabled()) {
            return;
        }
        if (result.kind === AiSettingsSearchResultKind.EMBEDDED) {
            const promise = this._embeddingsResultsPromises.get(result.query);
            if (promise) {
                promise.complete(result.settings);
            }
            else {
                const parkedPromise = new DeferredPromise();
                parkedPromise.complete(result.settings);
                this._embeddingsResultsPromises.set(result.query, parkedPromise);
            }
        }
        else if (result.kind === AiSettingsSearchResultKind.LLM_RANKED) {
            const promise = this._llmRankedResultsPromises.get(result.query);
            if (promise) {
                promise.complete(result.settings);
            }
            else {
                const parkedPromise = new DeferredPromise();
                parkedPromise.complete(result.settings);
                this._llmRankedResultsPromises.set(result.query, parkedPromise);
            }
        }
    }
}
registerSingleton(IAiSettingsSearchService, AiSettingsSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlTZXR0aW5nc1NlYXJjaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FpU2V0dGluZ3NTZWFyY2gvY29tbW9uL2FpU2V0dGluZ3NTZWFyY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVyRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQTBCLDBCQUEwQixFQUE2Qix3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWhKLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBQXZEOztRQUlTLGVBQVUsR0FBZ0MsRUFBRSxDQUFDO1FBQzdDLDhCQUF5QixHQUEyQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzlFLCtCQUEwQixHQUEyQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRS9FLDBCQUFxQixHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUMxRSx5QkFBb0IsR0FBZ0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztJQXlGL0UsQ0FBQzthQWhHd0IsY0FBUyxHQUFHLENBQUMsQUFBSixDQUFLO0lBU3RDLFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsOEJBQThCLENBQUMsUUFBbUM7UUFDakUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJ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
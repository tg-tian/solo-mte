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
import { DisposableStore, ReferenceCollection } from '../../../../base/common/lifecycle.js';
import { ObservableMap } from '../../../../base/common/observable.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let ChatModelStore = class ChatModelStore extends ReferenceCollection {
    constructor(delegate, logService) {
        super();
        this.delegate = delegate;
        this.logService = logService;
        this._store = new DisposableStore();
        this._models = new ObservableMap();
        this._modelsToDispose = new Set();
        this._pendingDisposals = new Set();
        this._onDidDisposeModel = this._store.add(new Emitter());
        this.onDidDisposeModel = this._onDidDisposeModel.event;
    }
    get observable() {
        return this._models.observable;
    }
    values() {
        return this._models.values();
    }
    /**
     * Get a ChatModel directly without acquiring a reference.
     */
    get(uri) {
        return this._models.get(this.toKey(uri));
    }
    has(uri) {
        return this._models.has(this.toKey(uri));
    }
    acquireExisting(uri) {
        const key = this.toKey(uri);
        if (!this._models.has(key)) {
            return undefined;
        }
        return this.acquire(key);
    }
    acquireOrCreate(props) {
        return this.acquire(this.toKey(props.sessionResource), props);
    }
    createReferencedObject(key, props) {
        this._modelsToDispose.delete(key);
        const existingModel = this._models.get(key);
        if (existingModel) {
            return existingModel;
        }
        if (!props) {
            throw new Error(`No start session props provided for chat session ${key}`);
        }
        this.logService.trace(`Creating chat session ${key}`);
        const model = this.delegate.createModel(props);
        if (model.sessionResource.toString() !== key) {
            throw new Error(`Chat session key mismatch for ${key}`);
        }
        this._models.set(key, model);
        return model;
    }
    destroyReferencedObject(key, object) {
        this._modelsToDispose.add(key);
        const promise = this.doDestroyReferencedObject(key, object);
        this._pendingDisposals.add(promise);
        promise.finally(() => {
            this._pendingDisposals.delete(promise);
        });
    }
    async doDestroyReferencedObject(key, object) {
        try {
            await this.delegate.willDisposeModel(object);
        }
        catch (error) {
            this.logService.error(error);
        }
        finally {
            if (this._modelsToDispose.has(key)) {
                this.logService.trace(`Disposing chat session ${key}`);
                this._models.delete(key);
                this._onDidDisposeModel.fire(object);
                object.dispose();
            }
            this._modelsToDispose.delete(key);
        }
    }
    /**
     * For test use only
     */
    async waitForModelDisposals() {
        await Promise.all(this._pendingDisposals);
    }
    toKey(uri) {
        return uri.toString();
    }
    dispose() {
        this._store.dispose();
        this._models.forEach(model => model.dispose());
    }
};
ChatModelStore = __decorate([
    __param(1, ILogService)
], ChatModelStore);
export { ChatModelStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsU3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdE1vZGVsU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQTJCLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQXFCOUQsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLG1CQUE4QjtJQVVqRSxZQUNrQixRQUFnQyxFQUNwQyxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQUhTLGFBQVEsR0FBUixRQUFRLENBQXdCO1FBQ25CLGVBQVUsR0FBVixVQUFVLENBQWE7UUFYckMsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFL0IsWUFBTyxHQUFHLElBQUksYUFBYSxFQUFxQixDQUFDO1FBQ2pELHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDckMsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUM7UUFFN0MsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQWEsQ0FBQyxDQUFDO1FBQ2hFLHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7SUFPbEUsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQ2hDLENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNJLEdBQUcsQ0FBQyxHQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTSxHQUFHLENBQUMsR0FBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sZUFBZSxDQUFDLEdBQVE7UUFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFTSxlQUFlLENBQUMsS0FBeUI7UUFDL0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxHQUFXLEVBQUUsS0FBMEI7UUFDdkUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sYUFBYSxDQUFDO1FBQ3RCLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVTLHVCQUF1QixDQUFDLEdBQVcsRUFBRSxNQUFpQjtRQUMvRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNwQixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxHQUFXLEVBQUUsTUFBaUI7UUFDckUsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixDQUFDO1lBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVPLEtBQUssQ0FBQyxHQUFRO1FBQ3JCLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRCxDQUFBO0FBNUdZLGNBQWM7SUFZeEIsV0FBQSxXQUFXLENBQUE7R0FaRCxjQUFjLENBNEcxQiJ9
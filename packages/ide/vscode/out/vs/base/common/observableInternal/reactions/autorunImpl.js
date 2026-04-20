/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertFn, BugIndicatingError, DisposableStore, markAsDisposed, onBugIndicatingError, trackDisposable } from '../commonFacade/deps.js';
import { getLogger } from '../logging/logging.js';
export var AutorunState;
(function (AutorunState) {
    /**
     * A dependency could have changed.
     * We need to explicitly ask them if at least one dependency changed.
     */
    AutorunState[AutorunState["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
    /**
     * A dependency changed and we need to recompute.
     */
    AutorunState[AutorunState["stale"] = 2] = "stale";
    AutorunState[AutorunState["upToDate"] = 3] = "upToDate";
})(AutorunState || (AutorunState = {}));
function autorunStateToString(state) {
    switch (state) {
        case 1 /* AutorunState.dependenciesMightHaveChanged */: return 'dependenciesMightHaveChanged';
        case 2 /* AutorunState.stale */: return 'stale';
        case 3 /* AutorunState.upToDate */: return 'upToDate';
        default: return '<unknown>';
    }
}
export class AutorunObserver {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _runFn, _changeTracker, debugLocation) {
        this._debugNameData = _debugNameData;
        this._runFn = _runFn;
        this._changeTracker = _changeTracker;
        this._state = 2 /* AutorunState.stale */;
        this._updateCount = 0;
        this._disposed = false;
        this._dependencies = new Set();
        this._dependenciesToBeRemoved = new Set();
        this._isRunning = false;
        this._iteration = 0;
        this._store = undefined;
        this._delayedStore = undefined;
        this._changeSummary = this._changeTracker?.createChangeSummary(undefined);
        getLogger()?.handleAutorunCreated(this, debugLocation);
        this._run();
        trackDisposable(this);
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        for (const o of this._dependencies) {
            o.removeObserver(this); // Warning: external call!
        }
        this._dependencies.clear();
        if (this._store !== undefined) {
            this._store.dispose();
        }
        if (this._delayedStore !== undefined) {
            this._delayedStore.dispose();
        }
        getLogger()?.handleAutorunDisposed(this);
        markAsDisposed(this);
    }
    _run() {
        const emptySet = this._dependenciesToBeRemoved;
        this._dependenciesToBeRemoved = this._dependencies;
        this._dependencies = emptySet;
        this._state = 3 /* AutorunState.upToDate */;
        try {
            if (!this._disposed) {
                getLogger()?.handleAutorunStarted(this);
                const changeSummary = this._changeSummary;
                const delayedStore = this._delayedStore;
                if (delayedStore !== undefined) {
                    this._delayedStore = undefined;
                }
                try {
                    this._isRunning = true;
                    if (this._changeTracker) {
                        this._changeTracker.beforeUpdate?.(this, changeSummary);
                        this._changeSummary = this._changeTracker.createChangeSummary(changeSummary); // Warning: external call!
                    }
                    if (this._store !== undefined) {
                        this._store.dispose();
                        this._store = undefined;
                    }
                    this._runFn(this, changeSummary); // Warning: external call!
                }
                catch (e) {
                    onBugIndicatingError(e);
                }
                finally {
                    this._isRunning = false;
                    if (delayedStore !== undefined) {
                        delayedStore.dispose();
                    }
                }
            }
        }
        finally {
            if (!this._disposed) {
                getLogger()?.handleAutorunFinished(this);
            }
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this._dependenciesToBeRemoved) {
                o.removeObserver(this); // Warning: external call!
            }
            this._dependenciesToBeRemoved.clear();
        }
    }
    toString() {
        return `Autorun<${this.debugName}>`;
    }
    // IObserver implementation
    beginUpdate(_observable) {
        if (this._state === 3 /* AutorunState.upToDate */) {
            this._checkIterations();
            this._state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
        this._updateCount++;
    }
    endUpdate(_observable) {
        try {
            if (this._updateCount === 1) {
                this._iteration = 1;
                do {
                    if (this._checkIterations()) {
                        return;
                    }
                    if (this._state === 1 /* AutorunState.dependenciesMightHaveChanged */) {
                        this._state = 3 /* AutorunState.upToDate */;
                        for (const d of this._dependencies) {
                            d.reportChanges(); // Warning: external call!
                            if (this._state === 2 /* AutorunState.stale */) {
                                // The other dependencies will refresh on demand
                                break;
                            }
                        }
                    }
                    this._iteration++;
                    if (this._state !== 3 /* AutorunState.upToDate */) {
                        this._run(); // Warning: indirect external call!
                    }
                } while (this._state !== 3 /* AutorunState.upToDate */);
            }
        }
        finally {
            this._updateCount--;
        }
        assertFn(() => this._updateCount >= 0);
    }
    handlePossibleChange(observable) {
        if (this._state === 3 /* AutorunState.upToDate */ && this._isDependency(observable)) {
            this._checkIterations();
            this._state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
    }
    handleChange(observable, change) {
        if (this._isDependency(observable)) {
            getLogger()?.handleAutorunDependencyChanged(this, observable, change);
            try {
                // Warning: external call!
                const shouldReact = this._changeTracker ? this._changeTracker.handleChange({
                    changedObservable: observable,
                    change,
                    // eslint-disable-next-line local/code-no-any-casts
                    didChange: (o) => o === observable,
                }, this._changeSummary) : true;
                if (shouldReact) {
                    this._checkIterations();
                    this._state = 2 /* AutorunState.stale */;
                }
            }
            catch (e) {
                onBugIndicatingError(e);
            }
        }
    }
    _isDependency(observable) {
        return this._dependencies.has(observable) && !this._dependenciesToBeRemoved.has(observable);
    }
    // IReader implementation
    _ensureNoRunning() {
        if (!this._isRunning) {
            throw new BugIndicatingError('The reader object cannot be used outside its compute function!');
        }
    }
    readObservable(observable) {
        this._ensureNoRunning();
        // In case the run action disposes the autorun
        if (this._disposed) {
            return observable.get(); // warning: external call!
        }
        observable.addObserver(this); // warning: external call!
        const value = observable.get(); // warning: external call!
        this._dependencies.add(observable);
        this._dependenciesToBeRemoved.delete(observable);
        return value;
    }
    get store() {
        this._ensureNoRunning();
        if (this._disposed) {
            throw new BugIndicatingError('Cannot access store after dispose');
        }
        if (this._store === undefined) {
            this._store = new DisposableStore();
        }
        return this._store;
    }
    get delayedStore() {
        this._ensureNoRunning();
        if (this._disposed) {
            throw new BugIndicatingError('Cannot access store after dispose');
        }
        if (this._delayedStore === undefined) {
            this._delayedStore = new DisposableStore();
        }
        return this._delayedStore;
    }
    debugGetState() {
        return {
            isRunning: this._isRunning,
            updateCount: this._updateCount,
            dependencies: this._dependencies,
            state: this._state,
            stateStr: autorunStateToString(this._state),
        };
    }
    debugRerun() {
        if (!this._isRunning) {
            this._run();
        }
        else {
            this._state = 2 /* AutorunState.stale */;
        }
    }
    _checkIterations() {
        if (this._iteration > 100) {
            onBugIndicatingError(new BugIndicatingError(`Autorun '${this.debugName}' is stuck in an infinite update loop.`));
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b3J1bkltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL3JlYWN0aW9ucy9hdXRvcnVuSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBZSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDNUosT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBSWxELE1BQU0sQ0FBTixJQUFrQixZQVlqQjtBQVpELFdBQWtCLFlBQVk7SUFDN0I7OztPQUdHO0lBQ0gsK0ZBQWdDLENBQUE7SUFFaEM7O09BRUc7SUFDSCxpREFBUyxDQUFBO0lBQ1QsdURBQVksQ0FBQTtBQUNiLENBQUMsRUFaaUIsWUFBWSxLQUFaLFlBQVksUUFZN0I7QUFFRCxTQUFTLG9CQUFvQixDQUFDLEtBQW1CO0lBQ2hELFFBQVEsS0FBSyxFQUFFLENBQUM7UUFDZixzREFBOEMsQ0FBQyxDQUFDLE9BQU8sOEJBQThCLENBQUM7UUFDdEYsK0JBQXVCLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQztRQUN4QyxrQ0FBMEIsQ0FBQyxDQUFDLE9BQU8sVUFBVSxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sV0FBVyxDQUFDO0lBQzdCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFPLGVBQWU7SUFVM0IsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDO0lBQ2hFLENBQUM7SUFFRCxZQUNpQixjQUE2QixFQUM3QixNQUF5RSxFQUN4RSxjQUEwRCxFQUMzRSxhQUE0QjtRQUhaLG1CQUFjLEdB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
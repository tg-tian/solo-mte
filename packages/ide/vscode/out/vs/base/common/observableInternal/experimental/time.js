/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../lifecycle.js';
import { DisposableStore, toDisposable } from '../commonFacade/deps.js';
import { observableValue } from '../observables/observableValue.js';
import { autorun } from '../reactions/autorun.js';
/** Measures the total time an observable had the value "true". */
export class TotalTrueTimeObservable extends Disposable {
    constructor(value) {
        super();
        this.value = value;
        this._totalTime = 0;
        this._startTime = undefined;
        this._register(autorun(reader => {
            const isTrue = this.value.read(reader);
            if (isTrue) {
                this._startTime = Date.now();
            }
            else {
                if (this._startTime !== undefined) {
                    const delta = Date.now() - this._startTime;
                    this._totalTime += delta;
                    this._startTime = undefined;
                }
            }
        }));
    }
    /**
     * Reports the total time the observable has been true in milliseconds.
     * E.g. `true` for 100ms, then `false` for 50ms, then `true` for 200ms results in 300ms.
    */
    totalTimeMs() {
        if (this._startTime !== undefined) {
            return this._totalTime + (Date.now() - this._startTime);
        }
        return this._totalTime;
    }
    /**
     * Runs the callback when the total time the observable has been true increased by the given delta in milliseconds.
    */
    fireWhenTimeIncreasedBy(deltaTimeMs, callback) {
        const store = new DisposableStore();
        let accumulatedTime = 0;
        let startTime = undefined;
        store.add(autorun(reader => {
            const isTrue = this.value.read(reader);
            if (isTrue) {
                startTime = Date.now();
                const remainingTime = deltaTimeMs - accumulatedTime;
                if (remainingTime <= 0) {
                    callback();
                    store.dispose();
                    return;
                }
                const handle = setTimeout(() => {
                    accumulatedTime += (Date.now() - startTime);
                    startTime = undefined;
                    callback();
                    store.dispose();
                }, remainingTime);
                reader.store.add(toDisposable(() => {
                    clearTimeout(handle);
                    if (startTime !== undefined) {
                        accumulatedTime += (Date.now() - startTime);
                        startTime = undefined;
                    }
                }));
            }
        }));
        return store;
    }
}
/**
 * Returns an observable that is true when the input observable was true within the last `timeMs` milliseconds.
 */
export function wasTrueRecently(obs, timeMs, store) {
    const result = observableValue('wasTrueRecently', false);
    let timeout;
    store.add(autorun(reader => {
        const value = obs.read(reader);
        if (value) {
            result.set(true, undefined);
            if (timeout !== undefined) {
                clearTimeout(timeout);
                timeout = undefined;
            }
        }
        else {
            timeout = setTimeout(() => {
                result.set(false, undefined);
                timeout = undefined;
            }, timeMs);
        }
    }));
    store.add(toDisposable(() => {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
    }));
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvZXhwZXJpbWVudGFsL3RpbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRWhELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVsRCxrRUFBa0U7QUFDbEUsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFJdEQsWUFDa0IsS0FBMkI7UUFFNUMsS0FBSyxFQUFFLENBQUM7UUFGUyxVQUFLLEdBQUwsS0FBSyxDQUFzQjtRQUpyQyxlQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsZUFBVSxHQUF1QixTQUFTLENBQUM7UUFNbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUM5QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUNuQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztvQkFDM0MsSUFBSSxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUM7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
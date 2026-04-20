/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { subtransaction } from '../transaction.js';
import { strictEquals } from '../commonFacade/deps.js';
import { DebugNameData } from '../debugName.js';
import { getLogger } from '../logging/logging.js';
import { BaseObservable } from './baseObservable.js';
import { DebugLocation } from '../debugLocation.js';
export function observableFromEvent(...args) {
    let owner;
    let event;
    let getValue;
    let debugLocation;
    if (args.length === 2) {
        [event, getValue] = args;
    }
    else {
        [owner, event, getValue, debugLocation] = args;
    }
    return new FromEventObservable(new DebugNameData(owner, undefined, getValue), event, getValue, () => FromEventObservable.globalTransaction, strictEquals, debugLocation ?? DebugLocation.ofCaller());
}
export function observableFromEventOpts(options, event, getValue, debugLocation = DebugLocation.ofCaller()) {
    return new FromEventObservable(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? getValue), event, getValue, () => options.getTransaction?.() ?? FromEventObservable.globalTransaction, options.equalsFn ?? strictEquals, debugLocation);
}
export class FromEventObservable extends BaseObservable {
    constructor(_debugNameData, event, _getValue, _getTransaction, _equalityComparator, debugLocation) {
        super(debugLocation);
        this._debugNameData = _debugNameData;
        this.event = event;
        this._getValue = _getValue;
        this._getTransaction = _getTransaction;
        this._equalityComparator = _equalityComparator;
        this._hasValue = false;
        this.handleEvent = (args) => {
            const newValue = this._getValue(args);
            const oldValue = this._value;
            const didChange = !this._hasValue || !(this._equalityComparator(oldValue, newValue));
            let didRunTransaction = false;
            if (didChange) {
                this._value = newValue;
                if (this._hasValue) {
                    didRunTransaction = true;
                    subtransaction(this._getTransaction(), (tx) => {
                        getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
                        for (const o of this._observers) {
                            tx.updateObserver(o, this);
                            o.handleChange(this, undefined);
                        }
                    }, () => {
                        const name = this.getDebugName();
                        return 'Event fired' + (name ? `: ${name}` : '');
                    });
                }
                this._hasValue = true;
            }
            if (!didRunTransaction) {
                getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
            }
        };
    }
    getDebugName() {
        return this._debugNameData.getDebugName(this);
    }
    get debugName() {
        const name = this.getDebugName();
        return 'From Event' + (name ? `: ${name}` : '');
    }
    onFirstObserverAdded() {
        this._subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this._subscription.dispose();
        this._subscription = undefined;
        this._hasValue = false;
        this._value = undefined;
    }
    get() {
        if (this._subscription) {
            if (!this._hasValue) {
                this.handleEvent(undefined);
            }
            return this._value;
        }
        else {
            // no cache, as there are no subscribers to keep it updated
            const value = this._getValue(undefined);
            return value;
        }
    }
    debugSetValue(value) {
        // eslint-disable-next-line local/code-no-any-casts
        this._value = value;
    }
    debugGetState() {
        return { value: this._value, hasValue: this._hasValue };
    }
}
(function (observableFromEvent) {
    observableFromEvent.Observer = FromEventObservable;
    function batchEventsGlobally(tx, fn) {
        let didSet = false;
        if (FromEventObservable.globalTransaction === undefined) {
            FromEventObservable.globalTransaction = tx;
            didSet = true;
        }
        try {
            fn();
        }
        finally {
            if (didSet) {
                FromEventObservable.globalTransaction = undefined;
            }
        }
    }
    observableFromEvent.batchEventsGlobally = batchEventsGlobally;
})(observableFromEvent || (observableFromEvent = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUZyb21FdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvb2JzZXJ2YWJsZXMvb2JzZXJ2YWJsZUZyb21FdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkQsT0FBTyxFQUF3QyxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RixPQUFPLEVBQWMsYUFBYSxFQUFrQixNQUFNLGlCQUFpQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBYXBELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxHQUFHLElBRXVCO0lBRTdELElBQUksS0FBSyxDQUFDO0lBQ1YsSUFBSSxLQUFLLENBQUM7SUFDVixJQUFJLFFBQVEsQ0FBQztJQUNiLElBQUksYUFBYSxDQUFDO0lBQ2xCLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDMUIsQ0FBQztTQUFNLENBQUM7UUFDUCxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNoRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxFQUM3QyxLQUFLLEVBQ0wsUUFBUSxFQUNSLEdBQUcsRUFBRSxDQUFD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from './arrays.js';
import { groupBy } from './collections.js';
import { SetMap, ResourceMap } from './map.js';
import { createSingleCallFunction } from './functional.js';
import { Iterable } from './iterator.js';
import { BugIndicatingError, onUnexpectedError } from './errors.js';
// #region Disposable Tracking
/**
 * Enables logging of potentially leaked disposables.
 *
 * A disposable is considered leaked if it is not disposed or not registered as the child of
 * another disposable. This tracking is very simple an only works for classes that either
 * extend Disposable or use a DisposableStore. This means there are a lot of false positives.
 */
const TRACK_DISPOSABLES = false;
let disposableTracker = null;
export class GCBasedDisposableTracker {
    constructor() {
        this._registry = new FinalizationRegistry(heldValue => {
            console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
        });
    }
    trackDisposable(disposable) {
        const stack = new Error('CREATED via:').stack;
        this._registry.register(disposable, stack, disposable);
    }
    setParent(child, parent) {
        if (parent) {
            this._registry.unregister(child);
        }
        else {
            this.trackDisposable(child);
        }
    }
    markAsDisposed(disposable) {
        this._registry.unregister(disposable);
    }
    markAsSingleton(disposable) {
        this._registry.unregister(disposable);
    }
}
export class DisposableTracker {
    constructor() {
        this.livingDisposables = new Map();
    }
    static { this.idx = 0; }
    getDisposableData(d) {
        let val = this.livingDisposables.get(d);
        if (!val) {
            val = { parent: null, source: null, isSingleton: false, value: d, idx: DisposableTracker.idx++ };
            this.livingDisposables.set(d, val);
        }
        return val;
    }
    trackDisposable(d) {
        const data = this.getDisposableData(d);
        if (!data.source) {
            data.source =
                new Error().stack;
        }
    }
    setParent(child, parent) {
        const data = this.getDisposableData(child);
        data.parent = parent;
    }
    markAsDisposed(x) {
        this.livingDisposables.delete(x);
    }
    markAsSingleton(disposable) {
        this.getDisposableData(disposable).isSingleton = true;
    }
    getRootParent(data, cache) {
        const cacheValue = cache.get(data);
        if (cacheValue) {
            return cacheValue;
        }
        const result = data.parent ? this.getRootParent(this.getDisposableData(data.parent), cache) : data;
        cache.set(data, result);
        return result;
    }
    getTrackedDisposables() {
        const rootParentCache = new Map();
        const leaking = [...this.livingDisposables.entries()]
            .filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton)
            .flatMap(([k]) => k);
        return leaking;
    }
    computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
        let uncoveredLeakingObjs;
        if (preComputedLeaks) {
            uncoveredLeakingObjs = preComputedLeaks;
        }
        else {
            const rootParentCache = new Map();
            const leakingObjects = [...this.livingDisposables.values()]
                .filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);
            if (leakingObjects.length === 0) {
                return;
            }
            const leakingObjsSet = new Set(leakingObjects.map(o => o.value));
            // Remove all objects that are a child of other leaking objects. Assumes there are no cycles.
            uncoveredLeakingObjs = leakingObjects.filter(l => {
                return !(l.parent && leakingObjsSet.has(l.parent));
            });
            if (uncoveredLeakingObjs.length === 0) {
                throw new Error('There are cyclic diposable chains!');
            }
        }
        if (!uncoveredLeakingObjs) {
            return undefined;
        }
        function getStackTracePath(leaking) {
            function removePrefix(array, linesToRemove) {
                while (array.length > 0 && linesToRemove.some(regexp => typeof regexp === 'string' ? regexp === array[0] : array[0].match(regexp))) {
                    array.shift();
                }
            }
            const lines = leaking.source.split('\n').map(p => p.trim().replace('at ', '')).filter(l => l !== '');
            removePrefix(lines, ['Error', /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
            return lines.reverse();
        }
        const stackTraceStarts = new SetMap();
        for (const leaking of uncoveredLeakingObjs) {
            const stackTracePath = getStackTracePath(leaking);
            for (let i = 0; i <= stackTracePath.length; i++) {
                stackTraceStarts.add(stackTracePath.slice(0, i).join('\n'), leaking);
            }
        }
        // Put earlier leaks first
        uncoveredLeakingObjs.sort(compareBy(l => l.idx, numberComparator));
        let message = '';
        let i = 0;
        for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
            i++;
            const stackTracePath = getStackTracePath(leaking);
            const stackTraceFormattedLines = [];
            for (let i = 0; i < stackTracePath.length; i++) {
                let line = stackTracePath[i];
                const starts = stackTraceStarts.get(stackTracePath.slice(0, i + 1).join('\n'));
                line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
                const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i).join('\n'));
                const continuations = groupBy([...prevStarts].map(d => getStackTracePath(d)[i]), v => v);
                delete continuations[stackTracePath[i]];
                for (const [cont, set] of Object.entries(continuations)) {
                    if (set) {
                        stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
                    }
                }
                stackTraceFormattedLines.unshift(line);
            }
            message += `\n\n\n==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================\n${stackTraceFormattedLines.join('\n')}\n============================================================\n\n`;
        }
        if (uncoveredLeakingObjs.length > maxReported) {
            message += `\n\n\n... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables\n\n`;
        }
        return { leaks: uncoveredLeakingObjs, details: message };
    }
}
export function setDisposableTracker(tracker) {
    disposableTracker = tracker;
}
if (TRACK_DISPOSABLES) {
    const __is_disposable_tracked__ = '__is_disposable_tracked__';
    setDisposableTracker(new class {
        trackDisposable(x) {
            const stack = new Error('Potentially leaked disposable').stack;
            setTimeout(() => {
                // eslint-disable-next-line local/code-no-any-casts
                if (!x[__is_disposable_tracked__]) {
                    console.log(stack);
                }
            }, 3000);
        }
        setParent(child, parent) {
            if (child && child !== Disposable.None) {
                try {
                    // eslint-disable-next-line local/code-no-any-casts
                    child[__is_disposable_tracked__] = true;
                }
                catch {
                    // noop
                }
            }
        }
        markAsDisposed(disposable) {
            if (disposable && disposable !== Disposable.None) {
                try {
                    // eslint-disable-next-line local/code-no-any-casts
                    disposable[__is_disposable_tracked__] = true;
                }
                catch {
                    // noop
                }
            }
        }
        markAsSingleton(disposable) { }
    });
}
export function trackDisposable(x) {
    disposableTracker?.trackDisposable(x);
    return x;
}
export function markAsDisposed(disposable) {
    disposableTracker?.markAsDisposed(disposable);
}
function setParentOfDisposable(child, parent) {
    disposableTracker?.setParent(child, parent);
}
function setParentOfDisposables(children, parent) {
    if (!disposableTracker) {
        return;
    }
    for (const child of children) {
        disposableTracker.setParent(child, parent);
    }
}
/**
 * Indicates that the given object is a singleton which does not need to be disposed.
*/
export function markAsSingleton(singleton) {
    disposableTracker?.markAsSingleton(singleton);
    return singleton;
}
/**
 * Check if `thing` is {@link IDisposable disposable}.
 */
export function isDisposable(thing) {
    // eslint-disable-next-line local/code-no-any-casts
    return typeof thing === 'object' && thing !== null && typeof thing.dispose === 'function' && thing.dispose.length === 0;
}
export function dispose(arg) {
    if (Iterable.is(arg)) {
        const errors = [];
        for (const d of arg) {
            if (d) {
                try {
                    d.dispose();
                }
                catch (e) {
                    errors.push(e);
                }
            }
        }
        if (errors.length === 1) {
            throw errors[0];
        }
        else if (errors.length > 1) {
            throw new AggregateError(errors, 'Encountered errors while disposing of store');
        }
        return Array.isArray(arg) ? [] : arg;
    }
    else if (arg) {
        arg.dispose();
        return arg;
    }
}
export function disposeIfDisposable(disposables) {
    for (const d of disposables) {
        if (isDisposable(d)) {
            d.dispose();
        }
    }
    return [];
}
/**
 * Combine multiple disposable values into a single {@link IDisposable}.
 */
export function combinedDisposable(...disposables) {
    const parent = toDisposable(() => dispose(disposables));
    setParentOfDisposables(disposables, parent);
    return parent;
}
class FunctionDisposable {
    constructor(fn) {
        this._isDisposed = false;
        this._fn = fn;
        trackDisposable(this);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        if (!this._fn) {
            throw new Error(`Unbound disposable context: Need to use an arrow function to preserve the value of this`);
        }
        this._isDisposed = true;
        markAsDisposed(this);
        this._fn();
    }
}
/**
 * Turn a function that implements dispose into an {@link IDisposable}.
 *
 * @param fn Clean up function, guaranteed to be called only **once**.
 */
export function toDisposable(fn) {
    return new FunctionDisposable(fn);
}
/**
 * Manages a collection of disposable values.
 *
 * This is the preferred way to manage multiple disposables. A `DisposableStore` is safer to work with than an
 * `IDisposable[]` as it considers edge cases, such as registering the same value multiple times or adding an item to a
 * store that has already been disposed of.
 */
export class DisposableStore {
    static { this.DISABLE_DISPOSED_WARNING = false; }
    constructor() {
        this._toDispose = new Set();
        this._isDisposed = false;
        trackDisposable(this);
    }
    /**
     * Dispose of all registered disposables and mark this object as disposed.
     *
     * Any future disposables added to this object will be disposed of on `add`.
     */
    dispose() {
        if (this._isDisposed) {
            return;
        }
        markAsDisposed(this);
        this._isDisposed = true;
        this.clear();
    }
    /**
     * @return `true` if this object has been disposed of.
     */
    get isDisposed() {
        return this._isDisposed;
    }
    /**
     * Dispose of all registered disposables but do not mark this object as disposed.
     */
    clear() {
        if (this._toDispose.size === 0) {
            return;
        }
        try {
            dispose(this._toDispose);
        }
        finally {
            this._toDispose.clear();
        }
    }
    /**
     * Add a new {@link IDisposable disposable} to the collection.
     */
    add(o) {
        if (!o || o === Disposable.None) {
            return o;
        }
        if (o === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        setParentOfDisposable(o, this);
        if (this._isDisposed) {
            if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
                console.warn(new Error('Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!').stack);
            }
        }
        else {
            this._toDispose.add(o);
        }
        return o;
    }
    /**
     * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
     * disposable even when the disposable is not part in the store.
     */
    delete(o) {
        if (!o) {
            return;
        }
        if (o === this) {
            throw new Error('Cannot dispose a disposable on itself!');
        }
        this._toDispose.delete(o);
        o.dispose();
    }
    /**
     * Deletes the value from the store, but does not dispose it.
     */
    deleteAndLeak(o) {
        if (!o) {
            return;
        }
        if (this._toDispose.delete(o)) {
            setParentOfDisposable(o, null);
        }
    }
    assertNotDisposed() {
        if (this._isDisposed) {
            onUnexpectedError(new BugIndicatingError('Object disposed'));
        }
    }
}
/**
 * Abstract base class for a {@link IDisposable disposable} object.
 *
 * Subclasses can {@linkcode _register} disposables that will be automatically cleaned up when this object is disposed of.
 */
export class Disposable {
    /**
     * A disposable that does nothing when it is disposed of.
     *
     * TODO: This should not be a static property.
     */
    static { this.None = Object.freeze({ dispose() { } }); }
    constructor() {
        this._store = new DisposableStore();
        trackDisposable(this);
        setParentOfDisposable(this._store, this);
    }
    dispose() {
        markAsDisposed(this);
        this._store.dispose();
    }
    /**
     * Adds `o` to the collection of disposables managed by this object.
     */
    _register(o) {
        if (o === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        return this._store.add(o);
    }
}
/**
 * Manages the lifecycle of a disposable value that may be changed.
 *
 * This ensures that when the disposable value is changed, the previously held disposable is disposed of. You can
 * also register a `MutableDisposable` on a `Disposable` to ensure it is automatically cleaned up.
 */
export class MutableDisposable {
    constructor() {
        this._isDisposed = false;
        trackDisposable(this);
    }
    /**
     * Get the currently held disposable value, or `undefined` if this MutableDisposable has been disposed
     */
    get value() {
        return this._isDisposed ? undefined : this._value;
    }
    /**
     * Set a new disposable value.
     *
     * Behaviour:
     * - If the MutableDisposable has been disposed, the setter is a no-op.
     * - If the new value is strictly equal to the current value, the setter is a no-op.
     * - Otherwise the previous value (if any) is disposed and the new value is stored.
     *
     * Related helpers:
     * - clear() resets the value to `undefined` (and disposes the previous value).
     * - clearAndLeak() returns the old value without disposing it and removes its parent.
     */
    set value(value) {
        if (this._isDisposed || value === this._value) {
            return;
        }
        this._value?.dispose();
        if (value) {
            setParentOfDisposable(value, this);
        }
        this._value = value;
    }
    /**
     * Resets the stored value and disposed of the previously stored value.
     */
    clear() {
        this.value = undefined;
    }
    dispose() {
        this._isDisposed = true;
        markAsDisposed(this);
        this._value?.dispose();
        this._value = undefined;
    }
    /**
     * Clears the value, but does not dispose it.
     * The old value is returned.
    */
    clearAndLeak() {
        const oldValue = this._value;
        this._value = undefined;
        if (oldValue) {
            setParentOfDisposable(oldValue, null);
        }
        return oldValue;
    }
}
/**
 * Manages the lifecycle of a disposable value that may be changed like {@link MutableDisposable}, but the value must
 * exist and cannot be undefined.
 */
export class MandatoryMutableDisposable {
    constructor(initialValue) {
        this._disposable = new MutableDisposable();
        this._isDisposed = false;
        this._disposable.value = initialValue;
    }
    get value() {
        return this._disposable.value;
    }
    set value(value) {
        if (this._isDisposed || value === this._disposable.value) {
            return;
        }
        this._disposable.value = value;
    }
    dispose() {
        this._isDisposed = true;
        this._disposable.dispose();
    }
}
export class RefCountedDisposable {
    constructor(_disposable) {
        this._disposable = _disposable;
        this._counter = 1;
    }
    acquire() {
        this._counter++;
        return this;
    }
    release() {
        if (--this._counter === 0) {
            this._disposable.dispose();
        }
        return this;
    }
}
export class ReferenceCollection {
    constructor() {
        this.references = new Map();
    }
    acquire(key, ...args) {
        let reference = this.references.get(key);
        if (!reference) {
            reference = { counter: 0, object: this.createReferencedObject(key, ...args) };
            this.references.set(key, reference);
        }
        const { object } = reference;
        const dispose = createSingleCallFunction(() => {
            if (--reference.counter === 0) {
                this.destroyReferencedObject(key, reference.object);
                this.references.delete(key);
            }
        });
        reference.counter++;
        return { object, dispose };
    }
}
/**
 * Unwraps a reference collection of promised values. Makes sure
 * references are disposed whenever promises get rejected.
 */
export class AsyncReferenceCollection {
    constructor(referenceCollection) {
        this.referenceCollection = referenceCollection;
    }
    async acquire(key, ...args) {
        const ref = this.referenceCollection.acquire(key, ...args);
        try {
            const object = await ref.object;
            return {
                object,
                dispose: () => ref.dispose()
            };
        }
        catch (error) {
            ref.dispose();
            throw error;
        }
    }
}
export class ImmortalReference {
    constructor(object) {
        this.object = object;
    }
    dispose() { }
}
export function disposeOnReturn(fn) {
    const store = new DisposableStore();
    try {
        fn(store);
    }
    finally {
        store.dispose();
    }
}
/**
 * A map the manages the lifecycle of the values that it stores.
 */
export class DisposableMap {
    constructor(store = new Map()) {
        this._isDisposed = false;
        this._store = store;
        trackDisposable(this);
    }
    /**
     * Disposes of all stored values and mark this object as disposed.
     *
     * Trying to use this object after it has been disposed of is an error.
     */
    dispose() {
        markAsDisposed(this);
        this._isDisposed = true;
        this.clearAndDisposeAll();
    }
    /**
     * Disposes of all stored values and clear the map, but DO NOT mark this object as disposed.
     */
    clearAndDisposeAll() {
        if (!this._store.size) {
            return;
        }
        try {
            dispose(this._store.values());
        }
        finally {
            this._store.clear();
        }
    }
    has(key) {
        return this._store.has(key);
    }
    get size() {
        return this._store.size;
    }
    get(key) {
        return this._store.get(key);
    }
    set(key, value, skipDisposeOnOverwrite = false) {
        if (this._isDisposed) {
            console.warn(new Error('Trying to add a disposable to a DisposableMap that has already been disposed of. The added object will be leaked!').stack);
        }
        if (!skipDisposeOnOverwrite) {
            this._store.get(key)?.dispose();
        }
        this._store.set(key, value);
        setParentOfDisposable(value, this);
    }
    /**
     * Delete the value stored for `key` from this map and also dispose of it.
     */
    deleteAndDispose(key) {
        this._store.get(key)?.dispose();
        this._store.delete(key);
    }
    /**
     * Delete the value stored for `key` from this map but return it. The caller is
     * responsible for disposing of the value.
     */
    deleteAndLeak(key) {
        const value = this._store.get(key);
        if (value) {
            setParentOfDisposable(value, null);
        }
        this._store.delete(key);
        return value;
    }
    keys() {
        return this._store.keys();
    }
    values() {
        return this._store.values();
    }
    [Symbol.iterator]() {
        return this._store[Symbol.iterator]();
    }
}
/**
 * Call `then` on a Promise, unless the returned disposable is disposed.
 */
export function thenIfNotDisposed(promise, then) {
    let disposed = false;
    promise.then(result => {
        if (disposed) {
            return;
        }
        then(result);
    });
    return toDisposable(() => {
        disposed = true;
    });
}
/**
 * Call `then` on a promise that resolves to a {@link IDisposable}, then either register the
 * disposable or register it to the {@link DisposableStore}, depending on whether the store is
 * disposed or not.
 */
export function thenRegisterOrDispose(promise, store) {
    return promise.then(disposable => {
        if (store.isDisposed) {
            disposable.dispose();
        }
        else {
            store.add(disposable);
        }
        return disposable;
    });
}
export class DisposableResourceMap extends DisposableMap {
    constructor() {
        super(new ResourceMap());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2xpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUvQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVwRSw4QkFBOEI7QUFFOUI7Ozs7OztHQU1HO0FBQ0gsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7QUFDaEMsSUFBSSxpQkFBaUIsR0FBOEIsSUFBSSxDQUFDO0FBeUJ4RCxNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBRWtCLGNBQVMsR0FBRyxJQUFJLG9CQUFvQixDQUFTLFNBQVMsQ0FBQyxFQUFFO1lBQ3pFLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFzQkosQ0FBQztJQXBCQSxlQUFlLENBQUMsVUFBdUI7UUFDdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBTSxDQUFDO1FBQy9DLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFrQixF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
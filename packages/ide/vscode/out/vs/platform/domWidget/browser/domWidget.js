/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHotReloadEnabled } from '../../../base/common/hotReload.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, observableValue } from '../../../base/common/observable.js';
/**
 * The DomWidget class provides a standard to define reusable UI components.
 * It is disposable and defines a single root element of type HTMLElement.
 * It also provides static helper methods to create and append widgets to the DOM,
 * with support for hot module replacement during development.
*/
export class DomWidget extends Disposable {
    /**
     * Appends the widget to the provided DOM element.
    */
    static createAppend(dom, store, ...params) {
        if (!isHotReloadEnabled()) {
            const widget = new this(...params);
            dom.appendChild(widget.element);
            store.add(widget);
            return;
        }
        const observable = this.createObservable(store, ...params);
        store.add(autorun((reader) => {
            const widget = observable.read(reader);
            dom.appendChild(widget.element);
            reader.store.add(toDisposable(() => widget.element.remove()));
            reader.store.add(widget);
        }));
    }
    /**
     * Creates the widget in a new div element with "display: contents".
    */
    static createInContents(store, ...params) {
        const div = document.createElement('div');
        div.style.display = 'contents';
        this.createAppend(div, store, ...params);
        return div;
    }
    /**
     * Creates an observable instance of the widget.
     * The observable will change when hot module replacement occurs.
    */
    static createObservable(store, ...params) {
        if (!isHotReloadEnabled()) {
            return constObservable(new this(...params));
        }
        const id = this[_hotReloadId];
        const observable = id ? hotReloadedWidgets.get(id) : undefined;
        if (!observable) {
            return constObservable(new this(...params));
        }
        return derived(reader => {
            const Ctor = observable.read(reader);
            return new Ctor(...params);
        });
    }
    /**
     * Appends the widget to the provided DOM element.
    */
    static instantiateAppend(instantiationService, dom, store, ...params) {
        if (!isHotReloadEnabled()) {
            const widget = instantiationService.createInstance(this, ...params);
            dom.appendChild(widget.element);
            store.add(widget);
            return;
        }
        const observable = this.instantiateObservable(instantiationService, store, ...params);
        let lastWidget = undefined;
        store.add(autorun((reader) => {
            const widget = observable.read(reader);
            if (lastWidget) {
                lastWidget.element.replaceWith(widget.element);
            }
            else {
                dom.appendChild(widget.element);
            }
            lastWidget = widget;
            reader.delayedStore.add(widget);
        }));
    }
    /**
     * Creates the widget in a new div element with "display: contents".
     * If possible, prefer `instantiateAppend`, as it avoids an extra div in the DOM.
    */
    static instantiateInContents(instantiationService, store, ...params) {
        const div = document.createElement('div');
        div.style.display = 'contents';
        this.instantiateAppend(instantiationService, div, store, ...params);
        return div;
    }
    /**
     * Creates an observable instance of the widget.
     * The observable will change when hot module replacement occurs.
    */
    static instantiateObservable(instantiationService, store, ...params) {
        if (!isHotReloadEnabled()) {
            return constObservable(instantiationService.createInstance(this, ...params));
        }
        const id = this[_hotReloadId];
        const observable = id ? hotReloadedWidgets.get(id) : undefined;
        if (!observable) {
            return constObservable(instantiationService.createInstance(this, ...params));
        }
        return derived(reader => {
            const Ctor = observable.read(reader);
            return instantiationService.createInstance(Ctor, ...params);
        });
    }
    /**
     * @deprecated Do not call manually! Only for use by the hot reload system (a vite plugin will inject calls to this method in dev mode).
    */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static registerWidgetHotReplacement(id) {
        if (!isHotReloadEnabled()) {
            return;
        }
        let observable = hotReloadedWidgets.get(id);
        if (!observable) {
            observable = observableValue(id, this);
            hotReloadedWidgets.set(id, observable);
        }
        else {
            observable.set(this, undefined);
        }
        this[_hotReloadId] = id;
    }
}
const _hotReloadId = Symbol('DomWidgetHotReloadId');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hotReloadedWidgets = new Map();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RvbVdpZGdldC9icm93c2VyL2RvbVdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFtQixZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RixPQUFPLEVBQW9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRzFJOzs7OztFQUtFO0FBQ0YsTUFBTSxPQUFnQixTQUFVLFNBQVEsVUFBVTtJQUNqRDs7TUFFRTtJQUNLLE1BQU0sQ0FBQyxZQUFZLENBQThFLEdBQWdCLEVBQUUsS0FBc0IsRUFBRSxHQUFHLE1BQWE7UUFDakssSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQztZQUMzQixNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDM0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM1QixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9B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
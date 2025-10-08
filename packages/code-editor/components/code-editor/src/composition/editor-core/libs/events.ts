import { ref } from 'vue';
import { UtilService } from './utils';
'use strict';

class EE {
    fn: any;
    context: any;
    once: boolean;
    constructor(fn, context, once = false) {
        this.fn = fn;
        this.context = context;
        this.once = once || false;
    }
}

class BaseEventEmitter {
    _events: any;
    constructor() {
        this._events = undefined;
    }

    eventNames() {
        const events = this._events;
        const names = [] as any;
        for (const name in events) {
            if (Object.prototype.hasOwnProperty.call(events, name)) {
                names.push(name);
            }
        }
        if (Object.getOwnPropertySymbols) {
            return names.concat(Object.getOwnPropertySymbols(events));
        }
        return names;
    }

    listeners(event, exists) {
        const available = this._events && this._events[event];
        if (exists) { return !!available; }
        if (!available) { return []; }
        if (available.fn) { return [available.fn]; }
        const list = [] as any;
        for (let i = 0, l = available.length; i < l; i++) {
            list[i] = available[i].fn;
        }
        return list;
    }

    emit(event, ...args) {
        if (!this._events || !this._events[event]) { return false; }
        const listeners = this._events[event];
        const len = args.length;
        let i;
        if (typeof listeners.fn === 'function') {
            if (listeners.once) { this.removeListener(event, listeners.fn, undefined, true); }
            switch (len) {
                case 0:
                    return listeners.fn.call(listeners.context), true;
                case 1:
                    return listeners.fn.call(listeners.context, args[0]), true;
                case 2:
                    return listeners.fn.call(listeners.context, args[0], args[1]), true;
                case 3:
                    return listeners.fn.call(listeners.context, args[0], args[1], args[2]), true;
                case 4:
                    return listeners.fn.call(listeners.context, args[0], args[1], args[2], args[3]), true;
                case 5:
                    return listeners.fn.call(listeners.context, args[0], args[1], args[2], args[3], args[4]), true;
            }
            listeners.fn.apply(listeners.context, args);
        } else {
            const listLength = listeners.length;
            for (i = 0; i < listLength; i++) {
                if (listeners[i].once) { this.removeListener(event, listeners[i].fn, undefined, true); }
                switch (len) {
                    case 0:
                        listeners[i].fn.call(listeners[i].context);
                        break;
                    case 1:
                        listeners[i].fn.call(listeners[i].context, args[0]);
                        break;
                    case 2:
                        listeners[i].fn.call(listeners[i].context, args[0], args[1]);
                        break;
                    default:
                        listeners[i].fn.apply(listeners[i].context, args);
                }
            }
        }
        return true;
    }

    on(event, fn) {
        const listener = new EE(fn, this);
        if (!this._events) { this._events = Object.create(null); }
        if (!this._events[event]) {
            this._events[event] = listener;
        } else {
            if (!this._events[event].fn) {
                this._events[event].push(listener);
            } else {
                this._events[event] = [this._events[event], listener];
            }
        }
        return this;
    }

    once(event, fn, context) {
        const listener = new EE(fn, context || this, true);
        if (!this._events) { this._events = Object.create(null); }
        if (!this._events[event]) { this._events[event] = listener; }
        else {
            if (!this._events[event].fn) { this._events[event].push(listener); }
            else { this._events[event] = [this._events[event], listener]; }
        }
        return this;
    }

    removeListener(event, fn, context, once) {
        if (!this._events || !this._events[event]) { return this; }
        const listeners = this._events[event];
        const events = [] as any;
        if (fn) {
            if (listeners.fn) {
                if (
                    listeners.fn !== fn ||
                    (once && !listeners.once) ||
                    (context && listeners.context !== context)
                ) {
                    events.push(listeners);
                }
            } else {
                const { length } = listeners;
                for (let i = 0; i < length; i++) {
                    if (
                        listeners[i].fn !== fn ||
                        (once && !listeners[i].once) ||
                        (context && listeners[i].context !== context)
                    ) {
                        events.push(listeners[i]);
                    }
                }
            }
        }
        if (events.length) {
            this._events[event] = events.length === 1 ? events[0] : events;
        } else {
            delete this._events[event];
        }
        return this;
    }

    removeAllListeners(event) {
        if (!this._events) { return this; }
        if (event) {
            delete this._events[event];
        } else {
            this._events = Object.create(null);
        }
        return this;
    }

    off = this.removeListener;
    addListener = this.on;
}


export class EventEmitter extends BaseEventEmitter {
    constructor() {
        super();
    }
    on(event, fn: (...args: any[]) => void, debounce?: number) {
        const tempFn = debounce ? (...args: any[]) => {
            UtilService.debounce(fn, debounce)(...args);
        } : fn;
        return super.on(event, tempFn);
    }

}


// export class EventEmitter {
//     private events;
//     constructor() {
//         this.events = ref({});
//     }

//     on<T extends string | symbol>(event: T, fn: (...args: any[]) => void, debounce?: number) {
//         const tempFn = debounce ? (...args: any[]) => {
//             UtilService.debounce(fn, debounce)(...args);
//         } : fn;
//         if (this.events.value[event]) {
//             this.events.value[event].push(tempFn);
//         } else {
//             this.events.value[event] = [tempFn];
//         }
//         return this;
//     }
//     // 注销事件
//     off(event, callback = null): EventEmitter {
//         if (!this.events.value[event]) {
//             return this;
//         }
//         this.events.value[event] = this.events.value[event].filter(cb => cb !== callback);
//         return this;
//     }

//     // 触发事件
//     emit(event, ...args) {
//         if (!this.events.value[event]) {
//             return;
//         }
//         this.events.value[event].forEach(callback => {
//             callback(...args);
//         });
//     }

// }

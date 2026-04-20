/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from './arrays.js';
/**
 * Compares two items for equality using strict equality.
*/
export function strictEquals(a, b) {
    return a === b;
}
export function strictEqualsC() {
    return (a, b) => a === b;
}
/**
 * Checks if the items of two arrays are equal.
 * By default, strict equality is used to compare elements, but a custom equality comparer can be provided.
 */
export function arrayEquals(a, b, itemEquals) {
    return arrays.equals(a, b, itemEquals ?? strictEquals);
}
/**
 * Checks if the items of two arrays are equal.
 * By default, strict equality is used to compare elements, but a custom equality comparer can be provided.
 */
export function arrayEqualsC(itemEquals) {
    return (a, b) => arrays.equals(a, b, itemEquals ?? strictEquals);
}
/**
 * Drills into arrays (items ordered) and objects (keys unordered) and uses strict equality on everything else.
*/
export function structuralEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!structuralEquals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    if (a && typeof a === 'object' && b && typeof b === 'object') {
        if (Object.getPrototypeOf(a) === Object.prototype && Object.getPrototypeOf(b) === Object.prototype) {
            const aObj = a;
            const bObj = b;
            const keysA = Object.keys(aObj);
            const keysB = Object.keys(bObj);
            const keysBSet = new Set(keysB);
            if (keysA.length !== keysB.length) {
                return false;
            }
            for (const key of keysA) {
                if (!keysBSet.has(key)) {
                    return false;
                }
                if (!structuralEquals(aObj[key], bObj[key])) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
export function structuralEqualsC() {
    return (a, b) => structuralEquals(a, b);
}
/**
 * `getStructuralKey(a) === getStructuralKey(b) <=> structuralEquals(a, b)`
 * (assuming that a and b are not cyclic structures and nothing extends globalThis Array).
*/
export function getStructuralKey(t) {
    return JSON.stringify(toNormalizedJsonStructure(t));
}
let objectId = 0;
const objIds = new WeakMap();
function toNormalizedJsonStructure(t) {
    if (Array.isArray(t)) {
        return t.map(toNormalizedJsonStructure);
    }
    if (t && typeof t === 'object') {
        if (Object.getPrototypeOf(t) === Object.prototype) {
            const tObj = t;
            const res = Object.create(null);
            for (const key of Object.keys(tObj).sort()) {
                res[key] = toNormalizedJsonStructure(tObj[key]);
            }
            return res;
        }
        else {
            let objId = objIds.get(t);
            if (objId === undefined) {
                objId = objectId++;
                objIds.set(t, objId);
            }
            // Random string to prevent collisions
            return objId + '----2b76a038c20c4bcc';
        }
    }
    return t;
}
/**
 * Two items are considered equal, if their stringified representations are equal.
*/
export function jsonStringifyEquals(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
/**
 * Two items are considered equal, if their stringified representations are equal.
*/
export function jsonStringifyEqualsC() {
    return (a, b) => JSON.stringify(a) === JSON.stringify(b);
}
/**
 * Uses `item.equals(other)` to determine equality.
 */
export function thisEqualsC() {
    return (a, b) => a.equals(b);
}
/**
 * Checks if two items are both null or undefined, or are equal according to the provided equality comparer.
*/
export function equalsIfDefined(v1, v2, equals) {
    if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
        return v2 === v1;
    }
    return equals(v1, v2);
}
/**
 * Returns an equality comparer that checks if two items are both null or undefined, or are equal according to the provided equality comparer.
*/
export function equalsIfDefinedC(equals) {
    return (v1, v2) => {
        if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
            return v2 === v1;
        }
        return equals(v1, v2);
    };
}
/**
 * Each function in this file which offers an equality comparison, has an accompanying
 * `*C` variant which returns an EqualityComparer function.
 *
 * The `*C` variant allows for easier composition of equality comparers and improved type-inference.
*/
export var equals;
(function (equals) {
    equals.strict = strictEquals;
    equals.strictC = strictEqualsC;
    equals.array = arrayEquals;
    equals.arrayC = arrayEqualsC;
    equals.structural = structuralEquals;
    equals.structuralC = structuralEqualsC;
    equals.jsonStringify = jsonStringifyEquals;
    equals.jsonStringifyC = jsonStringifyEqualsC;
    equals.thisC = thisEqualsC;
    equals.ifDefined = equalsIfDefined;
    equals.ifDefinedC = equalsIfDefinedC;
})(equals || (equals = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXF1YWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2VxdWFscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGFBQWEsQ0FBQztBQWlCdEM7O0VBRUU7QUFDRixNQUFNLFVBQVUsWUFBWSxDQUFJLENBQUksRUFBRSxDQUFJO0lBQ3pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoQixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWE7SUFDNUIsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUksQ0FBZSxFQUFFLENBQWUsRUFBRSxVQUFnQztJQUNoRyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxVQUFVLElBQUksWUFBWSxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUksVUFBZ0M7SUFDL0QsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxVQUFVLElBQUksWUFBWSxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQUVEOztFQUVFO0FBQ0YsTUFBTSxVQUFVLGdCQUFnQixDQUFJLENBQUksRUFBRSxDQUFJO0lBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
/**
 * Returns the css variable name for the given size identifier. Dots (`.`) are replaced with hyphens (`-`) and
 * everything is prefixed with `--vscode-`.
 *
 * @sample `editor.fontSize` is `--vscode-editor-fontSize`.
 */
export function asCssVariableName(sizeIdent) {
    return `--vscode-${sizeIdent.replace(/\./g, '-')}`;
}
export function asCssVariable(size) {
    return `var(${asCssVariableName(size)})`;
}
export function asCssVariableWithDefault(size, defaultCssValue) {
    return `var(${asCssVariableName(size)}, ${defaultCssValue})`;
}
export function isSizeDefaults(value) {
    return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}
/**
 * Helper function to create a size value
 */
export function size(value, unit = 'px') {
    return { value, unit };
}
/**
 * Helper function to create size defaults that use the same value for all themes
 */
export function sizeForAllThemes(value, unit = 'px') {
    const sizeValue = size(value, unit);
    return {
        light: sizeValue,
        dark: sizeValue,
        hcDark: sizeValue,
        hcLight: sizeValue
    };
}
/**
 * Convert a size value to a CSS string
 */
export function sizeValueToCss(sizeValue) {
    return `${sizeValue.value}${sizeValue.unit}`;
}
// size registry
export const Extensions = {
    SizeContribution: 'base.contributions.sizes'
};
export const DEFAULT_SIZE_CONFIG_VALUE = 'default';
class SizeRegistry extends Disposable {
    constructor() {
        super();
        this._onDidChangeSchema = this._register(new Emitter());
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.sizeSchema = { type: 'object', properties: {} };
        this.sizeReferenceSchema = { type: 'string', enum: [], enumDescriptions: [] };
        this.sizesById = {};
    }
    notifyThemeUpdate(theme) {
        for (const key of Object.keys(this.sizesById)) {
            const sizeVal = this.resolveDefaultSize(key, theme);
            if (sizeVal) {
                this.sizeSchema.properties[key].default = sizeValueToCss(sizeVal);
            }
        }
        this._onDidChangeSchema.fire();
    }
    registerSize(id, defaults, description, deprecationMessage) {
        const sizeContribution = { id, description, defaults, deprecationMessage };
        this.sizesById[id] = sizeContribution;
        const propertySchema = {
            type: 'string',
            pattern: '^(\\d+(\\.\\d+)?(px|rem|em|%))|default$',
            patternErrorMessage: 'Size must be a number followed by px, rem, em, or % (e.g., "12px", "1.5rem") or "default"'
        };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        this.sizeSchema.properties[id] = {
            description,
            ...propertySchema
        };
        this.sizeReferenceSchema.enum.push(id);
        this.sizeReferenceSchema.enumDescriptions.push(description);
        this._onDidChangeSchema.fire();
        return id;
    }
    deregisterSize(id) {
        delete this.sizesById[id];
        delete this.sizeSchema.properties[id];
        const index = this.sizeReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.sizeReferenceSchema.enum.splice(index, 1);
            this.sizeReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChangeSchema.fire();
    }
    getSizes() {
        return Object.keys(this.sizesById).map(id => this.sizesById[id]);
    }
    resolveDefaultSize(id, theme) {
        const sizeDesc = this.sizesById[id];
        if (sizeDesc?.defaults) {
            const sizeValue = isSizeDefaults(sizeDesc.defaults) ? sizeDesc.defaults[theme.type] : sizeDesc.defaults;
            return sizeValue ?? undefined;
        }
        return undefined;
    }
    getSizeSchema() {
        return this.sizeSchema;
    }
    getSizeReferenceSchema() {
        return this.sizeReferenceSchema;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.sizesById).sort(sorter).map(k => `- \`${k}\`: ${this.sizesById[k].description}`).join('\n');
    }
}
const sizeRegistry = new SizeRegistry();
platform.Registry.add(Extensions.SizeContribution, sizeRegistry);
export function registerSize(id, defaults, description, deprecationMessage) {
    return sizeRegistry.registerSize(id, defaults, description, deprecationMessage);
}
export function getSizeRegistry() {
    return sizeRegistry;
}
export const workbenchSizesSchemaId = 'vscode://schemas/workbench-sizes';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(workbenchSizesSchemaId, sizeRegistry.getSizeSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workbenchSizesSchemaId), 200);
sizeRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2l6ZVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi9zaXplVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBNkIsVUFBVSxJQUFJLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9ILE9BQU8sS0FBSyxRQUFRLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBMEJqRTs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxTQUF5QjtJQUMxRCxPQUFPLFlBQVksU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUNwRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxJQUFvQjtJQUNqRCxPQUFPLE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUMxQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLElBQW9CLEVBQUUsZUFBdUI7SUFDckYsT0FBTyxPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLGVBQWUsR0FBRyxDQUFDO0FBQzlELENBQUM7QUFTRCxNQUFNLFVBQVUsY0FBYyxDQUFDLEtBQWM7SUFDNUMsT0FBTyxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksS0FBSyxJQUFJLE1BQU0sSUFBSSxLQUFLLENBQUM7QUFDM0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLElBQUksQ0FB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
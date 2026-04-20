/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy, matchesFuzzy2 } from '../../../../base/common/filters.js';
import { splitGlobAware, getEmptyExpression, parse } from '../../../../base/common/glob.js';
import * as strings from '../../../../base/common/strings.js';
import { relativePath } from '../../../../base/common/resources.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
const SOURCE_FILTER_REGEX = /(!)?@source:("[^"]*"|[^\s,]+)(\s*)/i;
export class ResourceGlobMatcher {
    constructor(globalExpression, rootExpressions, uriIdentityService) {
        this.globalExpression = parse(globalExpression);
        this.expressionsByRoot = TernarySearchTree.forUris(uri => uriIdentityService.extUri.ignorePathCasing(uri));
        for (const expression of rootExpressions) {
            this.expressionsByRoot.set(expression.root, { root: expression.root, expression: parse(expression.expression) });
        }
    }
    matches(resource) {
        const rootExpression = this.expressionsByRoot.findSubstr(resource);
        if (rootExpression) {
            const path = relativePath(rootExpression.root, resource);
            if (path && !!rootExpression.expression(path)) {
                return true;
            }
        }
        return !!this.globalExpression(resource.path);
    }
}
export class FilterOptions {
    static { this._filter = matchesFuzzy2; }
    static { this._messageFilter = matchesFuzzy; }
    static EMPTY(uriIdentityService) { return new FilterOptions('', [], false, false, false, uriIdentityService); }
    constructor(filter, filesExclude, showWarnings, showErrors, showInfos, uriIdentityService) {
        this.filter = filter;
        this.showWarnings = false;
        this.showErrors = false;
        this.showInfos = false;
        filter = filter.trim();
        this.showWarnings = showWarnings;
        this.showErrors = showErrors;
        this.showInfos = showInfos;
        const filesExcludeByRoot = Array.isArray(filesExclude) ? filesExclude : [];
        const excludesExpression = Array.isArray(filesExclude) ? getEmptyExpression() : filesExclude;
        for (const { expression } of filesExcludeByRoot) {
            for (const pattern of Object.keys(expression)) {
                if (!pattern.endsWith('/**')) {
                    // Append `/**` to pattern to match a parent folder #103631
                    expression[`${strings.rtrim(pattern, '/')}/**`] = expression[pattern];
                }
            }
        }
        const includeSourceFilters = [];
        const excludeSourceFilters = [];
        let sourceMatch;
        while ((sourceMatch = SOURCE_FILTER_REGEX.exec(filter)) !== null) {
            const negate = !!sourceMatch[1];
            let source = sourceMatch[2];
            // Remove quotes if present
            if (source.startsWith('"') && source.endsWith('"')) {
                source = source.slice(1, -1);
            }
            if (negate) {
                excludeSourceFilters.push(source.toLowerCase());
            }
            else {
                includeSourceFilters.push(source.toLowerCase());
            }
            // Remove the entire match (including trailing whitespace)
            filter = (filter.substring(0, sourceMatch.index) + filter.substring(sourceMatch.index + sourceMatch[0].length)).trim();
        }
        this.includeSourceFilters = includeSourceFilters;
        this.excludeSourceFilters = excludeSourceFilters;
        const negate = filter.startsWith('!');
        this.textFilter = { text: (negate ? strings.ltrim(filter, '!') : filter).trim(), negate };
        const includeExpression = getEmptyExpression();
        if (filter) {
            const filters = splitGlobAware(filter, ',').map(s => s.trim()).filter(s => !!s.length);
            for (const f of filters) {
                if (f.startsWith('!')) {
                    const filterText = strings.ltrim(f, '!');
                    if (filterText) {
                        this.setPattern(excludesExpression, filterText);
                    }
                }
                else {
                    this.setPattern(includeExpression, f);
                }
            }
        }
        this.excludesMatcher = new ResourceGlobMatcher(excludesExpression, filesExcludeByRoot, uriIdentityService);
        this.includesMatcher = new ResourceGlobMatcher(includeExpression, [], uriIdentityService);
    }
    matchesSourceFilters(markerSource) {
        if (this.includeSourceFilters.length === 0 && this.excludeSourceFilters.length === 0) {
            return true;
        }
        const source = markerSource?.toLowerCase();
        // Check negative filters first - if any match, exclude
        if (source && this.excludeSourceFilters.includes(source)) {
            return false;
        }
        // If there are positive filters, check if any match
        if (this.includeSourceFilters.length > 0) {
            return source ? this.includeSourceFilters.includes(source) : false;
        }
        return true;
    }
    setPattern(expression, pattern) {
        if (pattern[0] === '.') {
            pattern = '*' + pattern; // convert ".js" to "*.js"
        }
        expression[`**/${pattern}/**`] = true;
        expression[`**/${pattern}`] = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbHRlck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNGaWx0ZXJPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUYsT0FBTyxFQUFlLGNBQWMsRUFBRSxrQkFBa0IsRUFBb0IsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0gsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHakYsTUFBTSxtQkFBbUIsR0FBRyxxQ0FBcUMsQ0FBQztBQUVsRSxNQUFNLE9BQU8sbUJBQW1CO0lBSy9CLFlBQ0MsZ0JBQTZCLEVBQzdCLGVBQXlELEVBQ3pELGtCQUF1QztRQUV2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBOEMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4SixLQUFLLE1BQU0sVUFBVSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFD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
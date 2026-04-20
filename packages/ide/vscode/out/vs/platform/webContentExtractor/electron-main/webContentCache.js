/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from '../../../base/common/map.js';
import { extUriIgnorePathCase } from '../../../base/common/resources.js';
/**
 * A cache for web content extraction results.
 */
export class WebContentCache {
    constructor() {
        this._cache = new LRUCache(WebContentCache.MAX_CACHE_SIZE);
    }
    static { this.MAX_CACHE_SIZE = 1000; }
    static { this.SUCCESS_CACHE_DURATION = 1000 * 60 * 60 * 24; } // 24 hours
    static { this.ERROR_CACHE_DURATION = 1000 * 60 * 5; } // 5 minutes
    /**
     * Add a web content extraction result to the cache.
     */
    add(uri, options, result) {
        let expiration;
        switch (result.status) {
            case 'ok':
            case 'redirect':
                expiration = Date.now() + WebContentCache.SUCCESS_CACHE_DURATION;
                break;
            default:
                expiration = Date.now() + WebContentCache.ERROR_CACHE_DURATION;
                break;
        }
        const key = WebContentCache.getKey(uri, options);
        this._cache.set(key, { result, options, expiration });
    }
    /**
     * Try to get a cached web content extraction result for the given URI and options.
     */
    tryGet(uri, options) {
        const key = WebContentCache.getKey(uri, options);
        const entry = this._cache.get(key);
        if (entry === undefined) {
            return undefined;
        }
        if (entry.expiration < Date.now()) {
            this._cache.delete(key);
            return undefined;
        }
        return entry.result;
    }
    static getKey(uri, options) {
        return `${!!options?.followRedirects}${extUriIgnorePathCase.getComparisonKey(uri)}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudENhY2hlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvZWxlY3Ryb24tbWFpbi93ZWJDb250ZW50Q2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBVXpFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFBNUI7UUFLa0IsV0FBTSxHQUFHLElBQUksUUFBUSxDQUFxQixlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7SUEwQzVGLENBQUM7YUE5Q3dCLG1CQUFjLEdBQUcsSUFBSSxBQUFQLENBQVE7YUFDdEIsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxBQUF0QixDQUF1QixHQUFDLFdBQVc7YUFDekQseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxDQUFDLEFBQWhCLENBQWlCLEdBQUMsWUFBWTtJQUkxRTs7T0FFRztJQUNJLEdBQUcsQ0FBQyxHQUFRLEVBQUUsT0FBZ0QsRUFBRSxNQUErQjtRQUNyRyxJQUFJLFVBQWtCLENBQUM7UUFDdkIsUUFBUSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsS0FBSyxJQUFJLENBQUM7WUFDVixLQUFLLFVBQVU7Z0JBQ2QsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxlQUFlLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2pFLE1BQU07WUFDUDtnQkFDQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQztnQkFDL0QsTUFBTTtRQUNSLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLEdBQVEsRUFBRSxPQUFnRDtRQUN2RSxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVPLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBUSxFQUFFLE9BQWdEO1FBQy9FLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQ3JGLENBQUMifQ==
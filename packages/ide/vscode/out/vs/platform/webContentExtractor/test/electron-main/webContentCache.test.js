/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { WebContentCache } from '../../electron-main/webContentCache.js';
suite('WebContentCache', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let cache;
    setup(() => {
        cache = new WebContentCache();
    });
    //#region Basic Cache Operations
    test('returns undefined for uncached URI', () => {
        const uri = URI.parse('https://example.com/page');
        const result = cache.tryGet(uri, undefined);
        assert.strictEqual(result, undefined);
    });
    test('returns cached result for previously added URI', () => {
        const uri = URI.parse('https://example.com/page');
        const extractResult = { status: 'ok', result: 'Test content', title: 'Test Title' };
        cache.add(uri, undefined, extractResult);
        const cached = cache.tryGet(uri, undefined);
        assert.deepStrictEqual(cached, extractResult);
    });
    test('returns cached ok result', () => {
        const uri = URI.parse('https://example.com/page');
        const extractResult = { status: 'ok', result: 'Content', title: 'Title' };
        cache.add(uri, undefined, extractResult);
        const cached = cache.tryGet(uri, undefined);
        assert.deepStrictEqual(cached, extractResult);
    });
    test('returns cached redirect result', () => {
        const uri = URI.parse('https://example.com/old');
        const redirectUri = URI.parse('https://example.com/new');
        const extractResult = { status: 'redirect', toURI: redirectUri };
        cache.add(uri, undefined, extractResult);
        const cached = cache.tryGet(uri, undefined);
        assert.deepStrictEqual(cached, extractResult);
    });
    test('returns cached error result', () => {
        const uri = URI.parse('https://example.com/error');
        const extractResult = { status: 'error', error: 'Not found', statusCode: 404 };
        cache.add(uri, undefined, extractResult);
        const cached = cache.tryGet(uri, undefined);
        assert.deepStrictEqual(cached, extractResult);
    });
    //#endregion
    //#region Options-Based Cache Key
    test('different options produce different cache entries', () => {
        const uri = URI.parse('https://example.com/page');
        const resultWithRedirects = { status: 'ok', result: 'With redirects', title: 'Redirects Title' };
        const resultWithoutRedirects = { status: 'ok', result: 'Without redirects', title: 'No Redirects Title' };
        cache.add(uri, { followRedirects: true }, resultWithRedirects);
        cache.add(uri, { followRedirects: false }, resultWithoutRedirects);
        assert.deepStrictEqual(cache.tryGet(uri, { followRedirects: true }), resultWithRedirects);
        assert.deepStrictEqual(cache.tryGet(uri, { followRedirects: false }), resultWithoutRedirects);
    });
    test('undefined options and followRedirects: false use same cache key', () => {
        const uri = URI.parse('https://example.com/page');
        const extractResult = { status: 'ok', result: 'Content', title: 'Title' };
        cache.add(uri, undefined, extractResult);
        // Both undefined and { followRedirects: false } should resolve to the same key
        // because !!undefined === false and !!false === false
        assert.deepStrictEqual(cache.tryGet(uri, undefined), extractResult);
        assert.deepStrictEqual(cache.tryGet(uri, { followRedirects: false }), extractResult);
    });
    //#endregion
    //#region URI Case Sensitivity
    test('URI path case is ignored for cache lookup', () => {
        const uri1 = URI.parse('https://example.com/Page');
        const uri2 = URI.parse('https://example.com/page');
        const extractResult = { status: 'ok', result: 'Content', title: 'Title' };
        cache.add(uri1, undefined, extractResult);
        // extUriIgnorePathCase should make these equivalent
        assert.deepStrictEqual(cache.tryGet(uri2, undefined), extractResult);
    });
    //#endregion
    //#region Cache Expiration
    test('expired success entries are not returned', () => {
        const uri = URI.parse('https://example.com/page');
        const extractResult = { status: 'ok', result: 'Content', title: 'Title' };
        // Mock Date.now to control expiration
        const originalDateNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;
        try {
            cache.add(uri, undefined, extractResult);
            // Move time forward past the 24-hour success cache duration
            currentTime += (1000 * 60 * 60 * 24) + 1; // 24 hours + 1ms
            const cached = cache.tryGet(uri, undefined);
            assert.strictEqual(cached, undefined);
        }
        finally {
            Date.now = originalDateNow;
        }
    });
    test('expired error entries are not returned', () => {
        const uri = URI.parse('https://example.com/error');
        const extractResult = { status: 'error', error: 'Server error', statusCode: 500 };
        const originalDateNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;
        try {
            cache.add(uri, undefined, extractResult);
            // Move time forward past the 5-minute error cache duration
            currentTime += (1000 * 60 * 5) + 1; // 5 minutes + 1ms
            const cached = cache.tryGet(uri, undefined);
            assert.strictEqual(cached, undefined);
        }
        finally {
            Date.now = originalDateNow;
        }
    });
    test('non-expired success entries are returned', () => {
        const uri = URI.parse('https://example.com/page');
        const extractResult = { status: 'ok', result: 'Content', title: 'Title' };
        const originalDateNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;
        try {
            cache.add(uri, undefined, extractResult);
            // Move time forward but stay within the 24-hour success cache duration
            currentTime += (1000 * 60 * 60 * 23); // 23 hours
            const cached = cache.tryGet(uri, undefined);
            assert.deepStrictEqual(cached, extractResult);
        }
        finally {
            Date.now = originalDateNow;
        }
    });
    test('non-expired error entries are returned', () => {
        const uri = URI.parse('https://example.com/error');
        const extractResult = { status: 'error', error: 'Server error', statusCode: 500 };
        const originalDateNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;
        try {
            cache.add(uri, undefined, extractResult);
            // Move time forward but stay within the 5-minute error cache duration
            currentTime += (1000 * 60 * 4); // 4 minutes
            const cached = cache.tryGet(uri, undefined);
            assert.deepStrictEqual(cached, extractResult);
        }
        finally {
            Date.now = originalDateNow;
        }
    });
    test('redirect results use success cache duration', () => {
        const uri = URI.parse('https://example.com/old');
        const extractResult = { status: 'redirect', toURI: URI.parse('https://example.com/new') };
        const originalDateNow = Date.now;
        let currentTime = 1000000;
        Date.now = () => currentTime;
        try {
            cache.add(uri, undefined, extractResult);
            // Move time forward past error duration but within success duration
            currentTime += (1000 * 60 * 60); // 1 hour (past 5 min error, within 24 hour success)
            const cached = cache.tryGet(uri, undefined);
            assert.deepStrictEqual(cached, extractResult);
        }
        finally {
            Date.now = originalDateNow;
        }
    });
    //#endregion
    //#region Cache Overwrite
    test('adding same URI overwrites previous entry', () => {
        const uri = URI.parse('https://example.com/page');
        const firstResult = { status: 'ok', result: 'First content', title: 'First Title' };
        const secondResult = { status: 'ok', result: 'Second content', title: 'Second Title' };
        cache.add(uri, undefined, firstResult);
        cache.add(uri, undefined, secondResult);
        const cached = cache.tryGet(uri, undefined);
        assert.deepStrictEqual(cached, secondResult);
    });
    //#endregion
    //#region Different URI Components
    test('different hosts produce different cache entries', () => {
        const uri1 = URI.parse('https://example.com/page');
        const uri2 = URI.parse('https://other.com/page');
        const result1 = { status: 'ok', result: 'Example content', title: 'Example Title' };
        const result2 = { status: 'ok', result: 'Other content', title: 'Other Title' };
        cache.add(uri1, undefined, result1);
        cache.add(uri2, undefined, result2);
        assert.deepStrictEqual(cache.tryGet(uri1, undefined), result1);
        assert.deepStrictEqual(cache.tryGet(uri2, undefined), result2);
    });
    test('different paths produce different cache entries', () => {
        const uri1 = URI.parse('https://example.com/page1');
        const uri2 = URI.parse('https://example.com/page2');
        const result1 = { status: 'ok', result: 'Page 1 content', title: 'Page 1 Title' };
        const result2 = { status: 'ok', result: 'Page 2 content', title: 'Page 2 Title' };
        cache.add(uri1, undefined, result1);
        cache.add(uri2, undefined, result2);
        assert.deepStrictEqual(cache.tryGet(uri1, undefined), result1);
        assert.deepStrictEqual(cache.tryGet(uri2, undefined), result2);
    });
    test('different query strings produce different cache entries', () => {
        const uri1 = URI.parse('https://example.com/page?a=1');
        const uri2 = URI.parse('https://example.com/page?a=2');
        const result1 = { status: 'ok', result: 'Query 1 content', title: 'Query 1 Title' };
        const result2 = { status: 'ok', result: 'Query 2 content', title: 'Query 2 Title' };
        cache.add(uri1, undefined, result1);
        cache.add(uri2, undefined, result2);
        assert.deepStrictEqual(cache.tryGet(uri1, undefined), result1);
        assert.deepStrictEqual(cache.tryGet(uri2, undefined), result2);
    });
    //#endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudENhY2hlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci90ZXN0L2VsZWN0cm9uLW1haW4vd2ViQ29udGVudENhY2hlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUd6RSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxLQUFzQixDQUFDO0lBRTNCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUVILGdDQUFnQztJQUVoQyxJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNsRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7UUFDM0QsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FB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
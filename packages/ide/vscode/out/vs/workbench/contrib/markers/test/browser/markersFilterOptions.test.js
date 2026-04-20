/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FilterOptions } from '../../browser/markersFilterOptions.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('MarkersFilterOptions', () => {
    let instantiationService;
    let uriIdentityService;
    setup(() => {
        instantiationService = new TestInstantiationService();
        const fileService = new FileService(new NullLogService());
        instantiationService.stub(IFileService, fileService);
        uriIdentityService = instantiationService.createInstance(UriIdentityService);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('source filter', () => {
        const filterOptions = new FilterOptions('@source:ts', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['ts']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, '');
    });
    test('source filter with negation', () => {
        const filterOptions = new FilterOptions('!@source:eslint', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, ['eslint']);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, '');
    });
    test('multiple source filters', () => {
        const filterOptions = new FilterOptions('@source:eslint @source:ts', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint', 'ts']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, '');
    });
    test('source filter combined with text filter', () => {
        const filterOptions = new FilterOptions('@source:ts error', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['ts']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, 'error');
    });
    test('negated source filter combined with text filter', () => {
        const filterOptions = new FilterOptions('!@source:ts error', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, ['ts']);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, 'error');
    });
    test('no source filter when not specified', () => {
        const filterOptions = new FilterOptions('some text', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, []);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, 'some text');
    });
    test('source filter case insensitive', () => {
        const filterOptions = new FilterOptions('@SOURCE:TypeScript', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['typescript']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, []);
    });
    test('complex filter with multiple source filters and text', () => {
        const filterOptions = new FilterOptions('text1 @source:eslint @source:ts text2', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint', 'ts']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, 'text1 text2');
    });
    test('source filter at the beginning', () => {
        const filterOptions = new FilterOptions('@source:eslint foo', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('source filter at the end', () => {
        const filterOptions = new FilterOptions('foo @source:eslint', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('source filter in the middle', () => {
        const filterOptions = new FilterOptions('foo @source:eslint bar', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo bar');
    });
    test('source filter with leading spaces', () => {
        const filterOptions = new FilterOptions('  @source:eslint foo', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('source filter with trailing spaces', () => {
        const filterOptions = new FilterOptions('foo @source:eslint  ', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('multiple consecutive source filters', () => {
        const filterOptions = new FilterOptions('@source:eslint @source:ts foo', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint', 'ts']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('only source filter with no text', () => {
        const filterOptions = new FilterOptions('@source:eslint', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.strictEqual(filterOptions.textFilter.text, '');
    });
    test('multiple source filters with no text', () => {
        const filterOptions = new FilterOptions('@source:eslint @source:ts', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint', 'ts']);
        assert.strictEqual(filterOptions.textFilter.text, '');
    });
    test('negated source filter at different positions', () => {
        const filterOptions = new FilterOptions('foo !@source:eslint bar', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, ['eslint']);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, []);
        assert.strictEqual(filterOptions.textFilter.text, 'foo bar');
    });
    test('mixed negated and positive source filters', () => {
        const filterOptions = new FilterOptions('@source:eslint !@source:ts foo', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['eslint']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, ['ts']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('single quoted source with spaces', () => {
        const filterOptions = new FilterOptions('@source:"hello world"', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['hello world']);
        assert.strictEqual(filterOptions.textFilter.text, '');
    });
    test('quoted source combined with text filter', () => {
        const filterOptions = new FilterOptions('@source:"hello world" foo', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['hello world']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo');
    });
    test('mixed quoted and unquoted sources (OR logic)', () => {
        const filterOptions = new FilterOptions('@source:"hello world" @source:eslint @source:ts', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['hello world', 'eslint', 'ts']);
    });
    test('multiple quoted sources (OR logic)', () => {
        const filterOptions = new FilterOptions('@source:"hello world" @source:"foo bar"', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['hello world', 'foo bar']);
    });
    test('quoted source with negation', () => {
        const filterOptions = new FilterOptions('!@source:"hello world"', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, ['hello world']);
    });
    test('quoted source in the middle of filter', () => {
        const filterOptions = new FilterOptions('foo @source:"hello world" bar', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['hello world']);
        assert.strictEqual(filterOptions.textFilter.text, 'foo bar');
    });
    test('complex filter with quoted and unquoted mixed', () => {
        const filterOptions = new FilterOptions('@source:"TypeScript Compiler" @source:eslint !@source:"My Extension" text', [], true, true, true, uriIdentityService);
        assert.deepStrictEqual(filterOptions.includeSourceFilters, ['typescript compiler', 'eslint']);
        assert.deepStrictEqual(filterOptions.excludeSourceFilters, ['my extension']);
        assert.strictEqual(filterOptions.textFilter.text, 'text');
    });
    test('no filters - always matches', () => {
        const filterOptions = new FilterOptions('foo', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters(undefined), true);
    });
    test('positive filter - exact match only', () => {
        const filterOptions = new FilterOptions('@source:eslint', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('ESLint'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('ts'), false);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint-plugin'), false);
        assert.strictEqual(filterOptions.matchesSourceFilters('es'), false);
    });
    test('positive filter - no source in marker', () => {
        const filterOptions = new FilterOptions('@source:eslint', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters(undefined), false);
    });
    test('negative filter - excludes exact source', () => {
        const filterOptions = new FilterOptions('!@source:eslint', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), false);
        assert.strictEqual(filterOptions.matchesSourceFilters('ts'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint-plugin'), true);
    });
    test('negative filter - no source in marker', () => {
        const filterOptions = new FilterOptions('!@source:eslint', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters(undefined), true);
    });
    test('OR logic - multiple @source filters', () => {
        const filterOptions = new FilterOptions('@source:eslint @source:ts', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('ts'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('python'), false);
    });
    test('OR logic with negation', () => {
        const filterOptions = new FilterOptions('@source:eslint @source:ts !@source:error', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('ts'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('error'), false);
        assert.strictEqual(filterOptions.matchesSourceFilters('python'), false);
    });
    test('only negative filters - excludes specified sources', () => {
        const filterOptions = new FilterOptions('!@source:eslint !@source:ts', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), false);
        assert.strictEqual(filterOptions.matchesSourceFilters('ts'), false);
        assert.strictEqual(filterOptions.matchesSourceFilters('python'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters(undefined), true);
    });
    test('case insensitivity', () => {
        const filterOptions = new FilterOptions('@source:ESLint', [], true, true, true, uriIdentityService);
        assert.strictEqual(filterOptions.matchesSourceFilters('eslint'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('ESLINT'), true);
        assert.strictEqual(filterOptions.matchesSourceFilters('EsLiNt'), true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbHRlck9wdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL3Rlc3QvYnJvd3Nlci9tYXJrZXJzRmlsdGVyT3B0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFFekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUVsQyxJQUFJLG9CQUE4QyxDQUFDO0lBQ25ELElBQUksa0JBQXVDLENBQUM7SUFFNUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDMUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRCxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM5RSxDQUFDLENBQUMs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
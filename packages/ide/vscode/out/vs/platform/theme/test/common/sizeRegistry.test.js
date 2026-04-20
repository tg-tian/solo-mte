/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getSizeRegistry, registerSize, size, sizeForAllThemes, sizeValueToCss, asCssVariableName, asCssVariable } from '../../common/sizeRegistry.js';
// Import baseSizes to ensure base size tokens are registered
import { bodyFontSize, bodyFontSizeSmall, codiconFontSize, cornerRadiusMedium, cornerRadiusSmall, cornerRadiusLarge, strokeThickness } from '../../common/sizes/baseSizes.js';
suite('Size Registry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('registerSize should register a size token', () => {
        const id = registerSize('test.size', { dark: size(10, 'px'), light: size(10, 'px'), hcDark: size(10, 'px'), hcLight: size(10, 'px') }, 'Test size');
        assert.strictEqual(id, 'test.size');
        const sizes = getSizeRegistry().getSizes();
        const testSize = sizes.find(s => s.id === 'test.size');
        assert.ok(testSize);
        assert.strictEqual(testSize.description, 'Test size');
        getSizeRegistry().deregisterSize('test.size');
    });
    test('sizeValueToCss should convert size value to CSS string', () => {
        assert.strictEqual(sizeValueToCss(size(10, 'px')), '10px');
        assert.strictEqual(sizeValueToCss(size(1.5, 'rem')), '1.5rem');
        assert.strictEqual(sizeValueToCss(size(100, '%')), '100%');
        assert.strictEqual(sizeValueToCss(size(1.2, 'em')), '1.2em');
    });
    test('asCssVariableName should convert identifier to CSS variable name', () => {
        assert.strictEqual(asCssVariableName('fontSize'), '--vscode-fontSize');
        assert.strictEqual(asCssVariableName('corner.radius'), '--vscode-corner-radius');
        assert.strictEqual(asCssVariableName('font.size.large'), '--vscode-font-size-large');
    });
    test('asCssVariable should create CSS variable reference', () => {
        assert.strictEqual(asCssVariable('fontSize'), 'var(--vscode-fontSize)');
        assert.strictEqual(asCssVariable('cornerRadius'), 'var(--vscode-cornerRadius)');
    });
    test('deregisterSize should remove a size token', () => {
        registerSize('test.remove', { dark: size(5, 'px'), light: size(5, 'px'), hcDark: size(5, 'px'), hcLight: size(5, 'px') }, 'Test remove');
        let sizes = getSizeRegistry().getSizes();
        assert.ok(sizes.find(s => s.id === 'test.remove'));
        getSizeRegistry().deregisterSize('test.remove');
        sizes = getSizeRegistry().getSizes();
        assert.ok(!sizes.find(s => s.id === 'test.remove'));
    });
    test('size tokens should be available', () => {
        const sizes = getSizeRegistry().getSizes();
        // Check that base sizes are registered
        assert.ok(sizes.find(s => s.id === bodyFontSize), 'bodyFontSize should be registered');
        assert.ok(sizes.find(s => s.id === bodyFontSizeSmall), 'bodyFontSizeSmall should be registered');
        assert.ok(sizes.find(s => s.id === codiconFontSize), 'codiconFontSize should be registered');
        assert.ok(sizes.find(s => s.id === cornerRadiusMedium), 'cornerRadius.medium should be registered');
        assert.ok(sizes.find(s => s.id === cornerRadiusSmall), 'cornerRadius.small should be registered');
        assert.ok(sizes.find(s => s.id === cornerRadiusLarge), 'cornerRadius.large should be registered');
        assert.ok(sizes.find(s => s.id === strokeThickness), 'strokeThickness should be registered');
    });
    test('sizeForAllThemes should create same value for all themes', () => {
        const sizeDefaults = sizeForAllThemes(10, 'px');
        assert.deepStrictEqual(sizeDefaults.light, { value: 10, unit: 'px' });
        assert.deepStrictEqual(sizeDefaults.dark, { value: 10, unit: 'px' });
        assert.deepStrictEqual(sizeDefaults.hcDark, { value: 10, unit: 'px' });
        assert.deepStrictEqual(sizeDefaults.hcLight, { value: 10, unit: 'px' });
    });
    test('registerSize should work with sizeForAllThemes', () => {
        const id = registerSize('test.allThemes', sizeForAllThemes(5, 'rem'), 'Test all themes');
        assert.strictEqual(id, 'test.allThemes');
        const sizes = getSizeRegistry().getSizes();
        const testSize = sizes.find(s => s.id === 'test.allThemes');
        assert.ok(testSize);
        getSizeRegistry().deregisterSize('test.allThemes');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2l6ZVJlZ2lzdHJ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvdGVzdC9jb21tb24vc2l6ZVJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkosNkRBQTZEO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTlLLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBRTNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNwSixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztR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
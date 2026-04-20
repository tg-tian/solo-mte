/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Size2D } from '../../../../common/core/2d/size.js';
import { LineRange } from '../../../../common/core/ranges/lineRange.js';
import { WidgetPlacementContext } from '../../browser/view/inlineEdits/inlineEditsViews/longDistanceHint/longDistnaceWidgetPlacement.js';
suite('WidgetPlacementContext', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createLineRangeInfo(startLine, sizes, top = 0) {
        return {
            lineRange: LineRange.ofLength(startLine, sizes.length),
            top,
            sizes,
        };
    }
    const defaultLayoutConstants = {
        previewEditorMargin: 5,
        widgetPadding: 2,
        widgetBorder: 1,
        lowerBarHeight: 10,
        minWidgetWidth: 50,
    };
    suite('constructor - availableSpaceSizes computation', () => {
        test('computes available space sizes correctly with no padding', () => {
            const sizes = [new Size2D(100, 20), new Size2D(150, 20), new Size2D(80, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const editorTrueContentWidth = 500;
            const endOfLinePadding = () => 0;
            const context = new WidgetPlacementContext(lineRangeInfo, editorTrueContentWidth, endOfLinePadding);
            assert.strictEqual(context.availableSpaceSizes.length, 3);
            assert.strictEqual(context.availableSpaceSizes[0].width, 400); // 500 - 100
            assert.strictEqual(context.availableSpaceSizes[1].width, 350); // 500 - 150
            assert.strictEqual(context.availableSpaceSizes[2].width, 420); // 500 - 80
        });
        test('computes available space sizes with end of line padding', () => {
            const sizes = [new Size2D(100, 20), new Size2D(150, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const editorTrueContentWidth = 500;
            const endOfLinePadding = (lineNumber) => lineNumber * 10;
            const context = new WidgetPlacementContext(lineRangeInfo, editorTrueContentWidth, endOfLinePadding);
            assert.strictEqual(context.availableSpaceSizes[0].width, 390); // 500 - 100 - 10
            assert.strictEqual(context.availableSpaceSizes[1].width, 330); // 500 - 150 - 20
        });
        test('available space width is never negative', () => {
            const sizes = [new Size2D(600, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const editorTrueContentWidth = 500;
            const endOfLinePadding = () => 0;
            const context = new WidgetPlacementContext(lineRangeInfo, editorTrueContentWidth, endOfLinePadding);
            assert.strictEqual(context.availableSpaceSizes[0].width, 0);
        });
        test('preserves heights in available space sizes', () => {
            const sizes = [new Size2D(100, 25), new Size2D(100, 30), new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const editorTrueContentWidth = 500;
            const endOfLinePadding = () => 0;
            const context = new WidgetPlacementContext(lineRangeInfo, editorTrueContentWidth, endOfLinePadding);
            assert.strictEqual(context.availableSpaceSizes[0].height, 25);
            assert.strictEqual(context.availableSpaceSizes[1].height, 30);
            assert.strictEqual(context.availableSpaceSizes[2].height, 20);
        });
    });
    suite('constructor - prefix sums computation', () => {
        test('computes height prefix sums correctly', () => {
            const sizes = [new Size2D(100, 20), new Size2D(100, 30), new Size2D(100, 25)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            assert.deepStrictEqual(context.availableSpaceHeightPrefixSums, [0, 20, 50, 75]);
        });
        test('prefix sums start with 0 and have length = sizes.length + 1', () => {
            const sizes = [new Size2D(100, 10), new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            assert.strictEqual(context.availableSpaceHeightPrefixSums[0], 0);
            assert.strictEqual(context.availableSpaceHeightPrefixSums.length, 3);
        });
    });
    suite('constructor - transposed sizes', () => {
        test('transposes width and height correctly', () => {
            const sizes = [new Size2D(100, 20), new Size2D(150, 30)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            // Transposed: width becomes height and vice versa
            // Available widths are 400 and 350, heights are 20 and 30
            assert.strictEqual(context.availableSpaceSizesTransposed[0].width, 20);
            assert.strictEqual(context.availableSpaceSizesTransposed[0].height, 400);
            assert.strictEqual(context.availableSpaceSizesTransposed[1].width, 30);
            assert.strictEqual(context.availableSpaceSizesTransposed[1].height, 350);
        });
    });
    suite('getWidgetVerticalOutline', () => {
        test('computes vertical outline for first line', () => {
            const sizes = [new Size2D(100, 20), new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 100);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const outline = context.getWidgetVerticalOutline(1, 50, defaultLayoutConstants);
            // previewEditorMargin + widgetPadding + widgetBorder = 5 + 2 + 1 = 8
            // editorRange = [100, 150)
            // verticalWidgetRange = [100 - 8, 150 + 8 + 10) = [92, 168)
            assert.strictEqual(outline.start, 92);
            assert.strictEqual(outline.endExclusive, 168);
        });
        test('computes vertical outline for second line', () => {
            const sizes = [new Size2D(100, 20), new Size2D(100, 25)];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 100);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const outline = context.getWidgetVerticalOutline(2, 50, defaultLayoutConstants);
            // Line 2 is at index 1, prefixSum[1] = 20
            // top = 100 + 20 = 120
            // editorRange = [120, 170)
            // margin = 8, lowerBarHeight = 10
            // verticalWidgetRange = [120 - 8, 170 + 8 + 10) = [112, 188)
            assert.strictEqual(outline.start, 112);
            assert.strictEqual(outline.endExclusive, 188);
        });
        test('works with zero margins', () => {
            const sizes = [new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 0);
            const zeroConstants = {
                previewEditorMargin: 0,
                widgetPadding: 0,
                widgetBorder: 0,
                lowerBarHeight: 0,
                minWidgetWidth: 50,
            };
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const outline = context.getWidgetVerticalOutline(1, 50, zeroConstants);
            assert.strictEqual(outline.start, 0);
            assert.strictEqual(outline.endExclusive, 50);
        });
    });
    suite('tryFindWidgetOutline', () => {
        test('returns undefined when no line has enough width', () => {
            // All lines have content that leaves less than minWidgetWidth
            const sizes = [new Size2D(460, 20), new Size2D(470, 20), new Size2D(480, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const result = context.tryFindWidgetOutline(2, 15, 500, defaultLayoutConstants);
            assert.strictEqual(result, undefined);
        });
        test('finds widget outline on target line when it has enough space', () => {
            const sizes = [new Size2D(100, 20), new Size2D(100, 20), new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 0);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const result = context.tryFindWidgetOutline(2, 15, 500, defaultLayoutConstants);
            assert.ok(result !== undefined);
            assert.ok(result.horizontalWidgetRange.length >= defaultLayoutConstants.minWidgetWidth);
        });
        test('searches outward from target line', () => {
            // First and last lines are excluded from placement
            // Lines 2, 3 have no space, line 4 has space
            const sizes = [
                new Size2D(100, 20), // line 1 - excluded (first)
                new Size2D(460, 20), // line 2 - no space
                new Size2D(460, 20), // line 3 - no space (target)
                new Size2D(100, 20), // line 4 - has space
                new Size2D(100, 20), // line 5 - has space
                new Size2D(100, 20), // line 6 - has space
                new Size2D(100, 20), // line 7 - excluded (last)
            ];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 0);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            // Target is line 3, but it should find line 4 (searching outward)
            const result = context.tryFindWidgetOutline(3, 15, 500, defaultLayoutConstants);
            assert.ok(result !== undefined);
        });
        test('prefers closer lines to target', () => {
            const sizes = [
                new Size2D(100, 20), // line 0 - excluded (first)
                new Size2D(100, 20), // line 1 - has space
                new Size2D(100, 20), // line 2 - has space
                new Size2D(100, 20), // line 3 - has space
                new Size2D(500, 9999), // line 4 - no space (target)
                new Size2D(100, 20), // line 5 - has space
                new Size2D(100, 20), // line 6 - has space
                new Size2D(100, 20), // line 7 - has space
                new Size2D(100, 20), // line 8 - excluded (last)
            ];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 0);
            for (let targetLine = 0; targetLine <= 4; targetLine++) {
                const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
                const result = context.tryFindWidgetOutline(targetLine, 15, 500, defaultLayoutConstants);
                assert.ok(result !== undefined);
                assert.ok(result.verticalWidgetRange.endExclusive < 9999);
            }
            for (let targetLine = 5; targetLine <= 10 /* test outside line range */; targetLine++) {
                const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
                const result = context.tryFindWidgetOutline(targetLine, 15, 500, defaultLayoutConstants);
                assert.ok(result !== undefined);
                assert.ok(result.verticalWidgetRange.start > 9999);
            }
        });
        test('horizontal widget range ends at editor content right', () => {
            const sizes = [new Size2D(100, 20), new Size2D(100, 20), new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 0);
            const editorTrueContentRight = 500;
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const result = context.tryFindWidgetOutline(2, 15, editorTrueContentRight, defaultLayoutConstants);
            assert.ok(result !== undefined);
            assert.strictEqual(result.horizontalWidgetRange.endExclusive, editorTrueContentRight);
        });
    });
    suite('edge cases', () => {
        test('handles single line range', () => {
            const sizes = [new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(5, sizes, 50);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            assert.strictEqual(context.availableSpaceSizes.length, 1);
            assert.deepStrictEqual(context.availableSpaceHeightPrefixSums, [0, 20]);
        });
        test('handles empty content lines (width 0)', () => {
            const sizes = [new Size2D(0, 20), new Size2D(0, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            assert.strictEqual(context.availableSpaceSizes[0].width, 500);
            assert.strictEqual(context.availableSpaceSizes[1].width, 500);
        });
        test('handles varying line heights', () => {
            const sizes = [new Size2D(100, 10), new Size2D(100, 30), new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(1, sizes, 100);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            // Verify prefix sums account for varying heights
            assert.deepStrictEqual(context.availableSpaceHeightPrefixSums, [0, 10, 40, 60]);
        });
        test('handles very large line numbers', () => {
            const sizes = [new Size2D(100, 20)];
            const lineRangeInfo = createLineRangeInfo(10000, sizes, 0);
            const context = new WidgetPlacementContext(lineRangeInfo, 500, () => 0);
            const outline = context.getWidgetVerticalOutline(10000, 50, defaultLayoutConstants);
            assert.ok(outline !== undefined);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9uZ0Rpc3RhbmNlV2lkZ2V0UGxhY2VtZW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2xvbmdEaXN0YW5jZVdpZGdldFBsYWNlbWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBeUIsc0JBQXNCLEVBQXVCLE1BQU0saUdBQWlHLENBQUM7QUFFckwsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsbUJBQW1CLENBQUMsU0FBaUIsRUFBRSxLQUFlLEVBQUUsTUFBYyxDQUFDO1FBQy9FLE9BQU87WUFDTixTQUFTLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUN0RCxHQUFHO1lBQ0gsS0FBSztTQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxzQkFBc0IsR0FBMEI7UUFDckQsbUJBQW1CLEVBQUUsQ0FBQztRQUN0QixhQUFhLEVBQUUsQ0FBQztRQUNoQixZQUFZLEVBQUUsQ0FBQztRQUNmLGNBQWMsRUFBRSxFQUFFO1FBQ2xCLGNBQWMsRUFBRSxFQUFFO0tBQ2xCLENBQUM7SUFFRixLQUFLLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQzNELElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVB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
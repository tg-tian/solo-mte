/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derived } from '../../../../../../../../base/common/observable.js';
import { Size2D } from '../../../../../../../common/core/2d/size.js';
import { LineRange } from '../../../../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../../../../common/core/ranges/offsetRange.js';
import { getMaxTowerHeightInAvailableArea } from '../../utils/towersLayout.js';
/**
 * Context for computing widget placement within a continuous line range.
 */
export class WidgetPlacementContext {
    constructor(_lineRangeInfo, editorTrueContentWidth, endOfLinePadding) {
        this._lineRangeInfo = _lineRangeInfo;
        this.availableSpaceSizes = _lineRangeInfo.sizes.map((s, idx) => {
            const lineNumber = _lineRangeInfo.lineRange.startLineNumber + idx;
            const linePaddingLeft = endOfLinePadding(lineNumber);
            return new Size2D(Math.max(0, editorTrueContentWidth - s.width - linePaddingLeft), s.height);
        });
        this.availableSpaceHeightPrefixSums = getSums(this.availableSpaceSizes, s => s.height);
        this.availableSpaceSizesTransposed = this.availableSpaceSizes.map(s => s.transpose());
    }
    /**
     * Computes the vertical outline for a widget placed at the given line number.
     */
    getWidgetVerticalOutline(lineNumber, previewEditorHeight, layoutConstants) {
        const sizeIdx = lineNumber - this._lineRangeInfo.lineRange.startLineNumber;
        const top = this._lineRangeInfo.top + this.availableSpaceHeightPrefixSums[sizeIdx];
        const editorRange = OffsetRange.ofStartAndLength(top, previewEditorHeight);
        const { previewEditorMargin, widgetPadding, widgetBorder, lowerBarHeight } = layoutConstants;
        const verticalWidgetRange = editorRange.withMargin(previewEditorMargin + widgetPadding + widgetBorder).withMargin(0, lowerBarHeight);
        return verticalWidgetRange;
    }
    /**
     * Tries to find a valid widget outline within this line range context.
     */
    tryFindWidgetOutline(targetLineNumber, previewEditorHeight, editorTrueContentRight, layoutConstants) {
        if (this._lineRangeInfo.lineRange.length < 3) {
            return undefined;
        }
        return findFirstMinimzeDistance(this._lineRangeInfo.lineRange.addMargin(-1, -1), targetLineNumber, lineNumber => {
            const verticalWidgetRange = this.getWidgetVerticalOutline(lineNumber, previewEditorHeight, layoutConstants);
            const maxWidth = getMaxTowerHeightInAvailableArea(verticalWidgetRange.delta(-this._lineRangeInfo.top), this.availableSpaceSizesTransposed);
            if (maxWidth < layoutConstants.minWidgetWidth) {
                return undefined;
            }
            const horizontalWidgetRange = OffsetRange.ofStartAndLength(editorTrueContentRight - maxWidth, maxWidth);
            return { horizontalWidgetRange, verticalWidgetRange };
        });
    }
}
/**
 * Splits line size information into continuous ranges, breaking at positions where
 * the expected vertical position differs from the actual position (e.g., due to folded regions).
 */
export function splitIntoContinuousLineRanges(lineRange, sizes, top, editorObs, reader) {
    const result = [];
    let currentRangeStart = lineRange.startLineNumber;
    let currentRangeTop = top;
    let currentSizes = [];
    for (let i = 0; i < sizes.length; i++) {
        const lineNumber = lineRange.startLineNumber + i;
        const expectedTop = currentRangeTop + currentSizes.reduce((p, c) => p + c.height, 0);
        const actualTop = editorObs.editor.getTopForLineNumber(lineNumber);
        if (i > 0 && actualTop !== expectedTop) {
            // Discontinuity detected - push the current range and start a new one
            result.push({
                lineRange: LineRange.ofLength(currentRangeStart, lineNumber - currentRangeStart),
                top: currentRangeTop,
                sizes: currentSizes,
            });
            currentRangeStart = lineNumber;
            currentRangeTop = actualTop;
            currentSizes = [];
        }
        currentSizes.push(sizes[i]);
    }
    // Push the final range
    result.push({
        lineRange: LineRange.ofLength(currentRangeStart, lineRange.endLineNumberExclusive - currentRangeStart),
        top: currentRangeTop,
        sizes: currentSizes,
    });
    // Don't observe each line individually for performance reasons
    derived({ owner: 'splitIntoContinuousLineRanges' }, r => {
        return editorObs.observeTopForLineNumber(lineRange.endLineNumberExclusive - 1).read(r);
    }).read(reader);
    return result;
}
function findFirstMinimzeDistance(range, targetLine, predicate) {
    for (let offset = 0;; offset++) {
        const down = targetLine + offset;
        if (down <= range.endLineNumberExclusive) {
            const result = predicate(down);
            if (result !== undefined) {
                return result;
            }
        }
        const up = targetLine - offset;
        if (up >= range.startLineNumber) {
            const result = predicate(up);
            if (result !== undefined) {
                return result;
            }
        }
        if (up < range.startLineNumber && down > range.endLineNumberExclusive) {
            return undefined;
        }
    }
}
function getSums(array, fn) {
    const result = [0];
    let sum = 0;
    for (const item of array) {
        sum += fn(item);
        result.push(sum);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9uZ0Rpc3RuYWNlV2lkZ2V0UGxhY2VtZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2xvbmdEaXN0YW5jZUhpbnQvbG9uZ0Rpc3RuYWNlV2lkZ2V0UGxhY2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVcsTUFBTSxtREFBbUQsQ0FBQztBQUVyRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQTRCL0U7O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBS2xDLFlBQ2tCLGNBQW1DLEVBQ3BELHNCQUE4QixFQUM5QixnQkFBZ0Q7UUFGL0IsbUJBQWMsR0FBZCxjQUFjLENBQXFCO1FBSXBELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM5RCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUM7WUFDbEUsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckQsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxzQkFBc0IsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FB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
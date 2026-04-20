/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastIdxMonotonous } from '../../../../base/common/arraysFind.js';
import { OffsetRange } from '../ranges/offsetRange.js';
import { Position } from '../position.js';
import { Range } from '../range.js';
export class PositionOffsetTransformerBase {
    getOffsetRange(range) {
        return new OffsetRange(this.getOffset(range.getStartPosition()), this.getOffset(range.getEndPosition()));
    }
    getRange(offsetRange) {
        return Range.fromPositions(this.getPosition(offsetRange.start), this.getPosition(offsetRange.endExclusive));
    }
    getStringEdit(edit) {
        const edits = edit.replacements.map(e => this.getStringReplacement(e));
        return new Deps.deps.StringEdit(edits);
    }
    getStringReplacement(edit) {
        return new Deps.deps.StringReplacement(this.getOffsetRange(edit.range), edit.text);
    }
    getTextReplacement(edit) {
        return new Deps.deps.TextReplacement(this.getRange(edit.replaceRange), edit.newText);
    }
    getTextEdit(edit) {
        const edits = edit.replacements.map(e => this.getTextReplacement(e));
        return new Deps.deps.TextEdit(edits);
    }
}
class Deps {
    static { this._deps = undefined; }
    static get deps() {
        if (!this._deps) {
            throw new Error('Dependencies not set. Call _setDependencies first.');
        }
        return this._deps;
    }
}
/** This is to break circular module dependencies. */
export function _setPositionOffsetTransformerDependencies(deps) {
    Deps._deps = deps;
}
export class PositionOffsetTransformer extends PositionOffsetTransformerBase {
    constructor(text) {
        super();
        this.text = text;
    }
    get lineStartOffsetByLineIdx() {
        if (!this._lineStartOffsetByLineIdx) {
            this._computeLineOffsets();
        }
        return this._lineStartOffsetByLineIdx;
    }
    get lineEndOffsetByLineIdx() {
        if (!this._lineEndOffsetByLineIdx) {
            this._computeLineOffsets();
        }
        return this._lineEndOffsetByLineIdx;
    }
    _computeLineOffsets() {
        this._lineStartOffsetByLineIdx = [];
        this._lineEndOffsetByLineIdx = [];
        this._lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < this.text.length; i++) {
            if (this.text.charAt(i) === '\n') {
                this._lineStartOffsetByLineIdx.push(i + 1);
                if (i > 0 && this.text.charAt(i - 1) === '\r') {
                    this._lineEndOffsetByLineIdx.push(i - 1);
                }
                else {
                    this._lineEndOffsetByLineIdx.push(i);
                }
            }
        }
        this._lineEndOffsetByLineIdx.push(this.text.length);
    }
    getOffset(position) {
        const valPos = this._validatePosition(position);
        return this.lineStartOffsetByLineIdx[valPos.lineNumber - 1] + valPos.column - 1;
    }
    _validatePosition(position) {
        if (position.lineNumber < 1) {
            return new Position(1, 1);
        }
        const lineCount = this.textLength.lineCount + 1;
        if (position.lineNumber > lineCount) {
            const lineLength = this.getLineLength(lineCount);
            return new Position(lineCount, lineLength + 1);
        }
        if (position.column < 1) {
            return new Position(position.lineNumber, 1);
        }
        const lineLength = this.getLineLength(position.lineNumber);
        if (position.column - 1 > lineLength) {
            return new Position(position.lineNumber, lineLength + 1);
        }
        return position;
    }
    getPosition(offset) {
        const idx = findLastIdxMonotonous(this.lineStartOffsetByLineIdx, i => i <= offset);
        const lineNumber = idx + 1;
        const column = offset - this.lineStartOffsetByLineIdx[idx] + 1;
        return new Position(lineNumber, column);
    }
    getTextLength(offsetRange) {
        return Deps.deps.TextLength.ofRange(this.getRange(offsetRange));
    }
    get textLength() {
        const lineIdx = this.lineStartOffsetByLineIdx.length - 1;
        return new Deps.deps.TextLength(lineIdx, this.text.length - this.lineStartOffsetByLineIdx[lineIdx]);
    }
    getLineLength(lineNumber) {
        return this.lineEndOffsetByLineIdx[lineNumber - 1] - this.lineStartOffsetByLineIdx[lineNumber - 1];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb25Ub09mZnNldEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3RleHQvcG9zaXRpb25Ub09mZnNldEltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBSXBDLE1BQU0sT0FBZ0IsNkJBQTZCO0lBR2xELGNBQWMsQ0FBQyxLQUFZO1FBQzFCLE9BQU8sSUFBSSxXQUFXLENBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FDdEMsQ0FBQztJQUNILENBQUM7SUFJRCxRQUFRLENBQUMsV0FBd0I7UUFDaEMsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQWM7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RSxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENB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
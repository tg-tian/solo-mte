/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineReplacement } from '../../../../../common/core/edits/lineEdit.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
export class InlineEditWithChanges {
    // TODO@hediet: Move the next 3 fields into the action
    get lineEdit() {
        if (this.action?.kind === 'jumpTo') {
            return new LineReplacement(LineRange.ofLength(this.action.position.lineNumber, 0), []);
        }
        else if (this.action?.kind === 'edit') {
            return LineReplacement.fromSingleTextEdit(this.edit.toReplacement(this.originalText), this.originalText);
        }
        return new LineReplacement(new LineRange(1, 1), []);
    }
    get originalLineRange() { return this.lineEdit.lineRange; }
    get modifiedLineRange() { return this.lineEdit.toLineEdit().getNewLineRanges()[0]; }
    get displayRange() {
        return this.originalText.lineRange.intersect(this.originalLineRange.join(LineRange.ofLength(this.originalLineRange.startLineNumber, this.lineEdit.newLines.length)));
    }
    constructor(originalText, action, edit, cursorPosition, multiCursorPositions, commands, inlineCompletion) {
        this.originalText = originalText;
        this.action = action;
        this.edit = edit;
        this.cursorPosition = cursorPosition;
        this.multiCursorPositions = multiCursorPositions;
        this.commands = commands;
        this.inlineCompletion = inlineCompletion;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdFdpdGhDaGFuZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0V2l0aENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUszRSxNQUFNLE9BQU8scUJBQXFCO0lBQ2pDLHNEQUFzRDtJQUN0RCxJQUFXLFFBQVE7UUFDbEIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksZUFBZSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3pDLE9BQU8sZUFBZSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDM0csQ0FBQztRQUVELE9BQU8sSUFBSSxlQUFlLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxJQUFXLGlCQUFpQixLQUFnQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUM3RSxJQUFXLGlCQUFpQixLQUFnQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEcsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUMzQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMxQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQ3pGLENBQ0EsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUNpQixZQUEwQixFQUMxQixNQUEwQyxFQUMxQyxJQUEwQixFQUMxQixjQUF3QixFQUN4QixvQkFBeUMsRUFDekMsUUFBNEMsRUFDNUMsZ0JBQXNDO1FBTnRDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQzFCLFdBQU0sR0FBTixNQUFNLENBQW9DO1FBQzFDLFNBQUksR0FBSixJQUFJLENBQXNCO1FBQzFCLG1CQUFjLEdBQWQsY0FBYyxDQUFVO1FBQ3hCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBcUI7UUFDekMsYUFBUSxHQUFSLFFBQVEsQ0FBb0M7UUFDNUMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFzQjtJQUV2RCxDQUFDO0NBQ0QifQ==
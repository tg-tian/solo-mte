/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesSubString } from '../../../../../base/common/filters.js';
import { singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
export function inlineCompletionIsVisible(singleTextEdit, originalRange, model, cursorPosition) {
    const minimizedReplacement = singleTextRemoveCommonPrefix(singleTextEdit, model);
    const editRange = singleTextEdit.range;
    if (!editRange
        || (originalRange && !originalRange.getStartPosition().equals(editRange.getStartPosition()))
        || cursorPosition.lineNumber !== minimizedReplacement.range.startLineNumber
        || minimizedReplacement.isEmpty // if the completion is empty after removing the common prefix of the completion and the model, the completion item would not be visible
    ) {
        return false;
    }
    // We might consider comparing by .toLowerText, but this requires GhostTextReplacement
    const originalValue = model.getValueInRange(minimizedReplacement.range, 1 /* EndOfLinePreference.LF */);
    const filterText = minimizedReplacement.text;
    const cursorPosIndex = Math.max(0, cursorPosition.column - minimizedReplacement.range.startColumn);
    let filterTextBefore = filterText.substring(0, cursorPosIndex);
    let filterTextAfter = filterText.substring(cursorPosIndex);
    let originalValueBefore = originalValue.substring(0, cursorPosIndex);
    let originalValueAfter = originalValue.substring(cursorPosIndex);
    const originalValueIndent = model.getLineIndentColumn(minimizedReplacement.range.startLineNumber);
    if (minimizedReplacement.range.startColumn <= originalValueIndent) {
        // Remove indentation
        originalValueBefore = originalValueBefore.trimStart();
        if (originalValueBefore.length === 0) {
            originalValueAfter = originalValueAfter.trimStart();
        }
        filterTextBefore = filterTextBefore.trimStart();
        if (filterTextBefore.length === 0) {
            filterTextAfter = filterTextAfter.trimStart();
        }
    }
    return filterTextBefore.startsWith(originalValueBefore)
        && !!matchesSubString(originalValueAfter, filterTextAfter);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbklzVmlzaWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2lubGluZUNvbXBsZXRpb25Jc1Zpc2libGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFLekUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFMUUsTUFBTSxVQUFVLHlCQUF5QixDQUFDLGNBQStCLEVBQUUsYUFBZ0MsRUFBRSxLQUFpQixFQUFFLGNBQXdCO0lBQ3ZKLE1BQU0sb0JBQW9CLEdBQUcsNEJBQTRCLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pGLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUM7SUFDdkMsSUFBSSxDQUFDLFNBQVM7V0FDVixDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1dBQ3pGLGNBQWMsQ0FBQyxVQUFVLEtBQUssb0JBQW9CLENBQUMsS0FBSyxDQUFDLGVBQWU7V0FDeEUsb0JBQW9CLENBQUMsT0FBTyxDQUFDLHdJQUF3STtNQUN2SyxDQUFDO1FBQ0YsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsc0ZBQXNGO0lBQ3RGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsS0FBSyxpQ0FBeUIsQ0FBQztJQUNoRyxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7SUFFN0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFbkcsSUFBSSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUMvRCxJQUFJLGVBQWUsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRTNELElBQUksbUJBQW1CLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDckUsSUFBSSxrQkFBa0IsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRWpFLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsRyxJQUFJLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUNuRSxxQkFBcUI7UUFDckIsbUJBQW1CLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckQsQ0FBQztRQUNELGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hELElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25DLGVBQWUsR0FBRyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztXQUNuRCxDQUFDLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDN0QsQ0FBQyJ9
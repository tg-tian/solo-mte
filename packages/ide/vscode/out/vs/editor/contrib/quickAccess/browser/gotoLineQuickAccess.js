/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { QuickInputButtonLocation } from '../../../../platform/quickinput/common/quickInput.js';
import { getCodeEditor } from '../../../browser/editorBrowser.js';
import { AbstractEditorNavigationQuickAccessProvider } from './editorNavigationQuickAccess.js';
export class AbstractGotoLineQuickAccessProvider extends AbstractEditorNavigationQuickAccessProvider {
    static { this.GO_TO_LINE_PREFIX = ':'; }
    static { this.GO_TO_OFFSET_PREFIX = '::'; }
    static { this.ZERO_BASED_OFFSET_STORAGE_KEY = 'gotoLine.useZeroBasedOffset'; }
    constructor() {
        super({ canAcceptInBackground: true });
    }
    get useZeroBasedOffset() {
        return this.storageService.getBoolean(AbstractGotoLineQuickAccessProvider.ZERO_BASED_OFFSET_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
    }
    set useZeroBasedOffset(value) {
        this.storageService.store(AbstractGotoLineQuickAccessProvider.ZERO_BASED_OFFSET_STORAGE_KEY, value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    provideWithoutTextEditor(picker) {
        const label = localize('gotoLine.noEditor', "Open a text editor first to go to a line or an offset.");
        picker.items = [{ label }];
        picker.ariaLabel = label;
        return Disposable.None;
    }
    provideWithTextEditor(context, picker, token) {
        const editor = context.editor;
        const disposables = new DisposableStore();
        // Goto line once picked
        disposables.add(picker.onDidAccept(event => {
            const [item] = picker.selectedItems;
            if (item) {
                if (!item.lineNumber) {
                    return;
                }
                this.gotoLocation(context, { range: this.toRange(item.lineNumber, item.column), keyMods: picker.keyMods, preserveFocus: event.inBackground });
                if (!event.inBackground) {
                    picker.hide();
                }
            }
        }));
        // Add a toggle to switch between 1- and 0-based offsets.
        const offsetButton = {
            iconClass: ThemeIcon.asClassName(Codicon.indexZero),
            tooltip: localize('gotoLineToggleButton', "Toggle Zero-Based Offset"),
            location: QuickInputButtonLocation.Input,
            toggle: { checked: this.useZeroBasedOffset }
        };
        // React to picker changes
        const updatePickerAndEditor = () => {
            const inputText = picker.value.trim().substring(AbstractGotoLineQuickAccessProvider.GO_TO_LINE_PREFIX.length);
            const { inOffsetMode, lineNumber, column, label } = this.parsePosition(editor, inputText);
            // Show toggle only when input text starts with '::'.
            picker.buttons = inOffsetMode ? [offsetButton] : [];
            // Picker
            picker.items = [{
                    lineNumber,
                    column,
                    label,
                }];
            // ARIA Label
            const cursor = editor.getPosition() ?? { lineNumber: 1, column: 1 };
            picker.ariaLabel = localize({
                key: 'gotoLine.ariaLabel',
                comment: ['{0} is the line number, {1} is the column number, {2} is instructions for typing in the Go To Line picker']
            }, "Current position: line {0}, column {1}. {2}", cursor.lineNumber, cursor.column, label);
            // Clear decorations for invalid range
            if (!lineNumber) {
                this.clearDecorations(editor);
                return;
            }
            // Reveal
            const range = this.toRange(lineNumber, column);
            editor.revealRangeInCenter(range, 0 /* ScrollType.Smooth */);
            // Decorate
            this.addDecorations(editor, range);
        };
        disposables.add(picker.onDidTriggerButton(button => {
            if (button === offsetButton) {
                this.useZeroBasedOffset = button.toggle?.checked ?? !this.useZeroBasedOffset;
                updatePickerAndEditor();
            }
        }));
        updatePickerAndEditor();
        disposables.add(picker.onDidChangeValue(() => updatePickerAndEditor()));
        // Adjust line number visibility as needed
        const codeEditor = getCodeEditor(editor);
        if (codeEditor) {
            const options = codeEditor.getOptions();
            const lineNumbers = options.get(76 /* EditorOption.lineNumbers */);
            if (lineNumbers.renderType === 2 /* RenderLineNumbersType.Relative */) {
                codeEditor.updateOptions({ lineNumbers: 'on' });
                disposables.add(toDisposable(() => codeEditor.updateOptions({ lineNumbers: 'relative' })));
            }
        }
        return disposables;
    }
    toRange(lineNumber = 1, column = 1) {
        return {
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column
        };
    }
    parsePosition(editor, value) {
        const model = this.getModel(editor);
        if (!model) {
            return {
                label: localize('gotoLine.noEditor', "Open a text editor first to go to a line or an offset.")
            };
        }
        // Support ::<offset> notation to navigate to a specific offset in the model.
        if (value.startsWith(':')) {
            let offset = parseInt(value.substring(1), 10);
            const maxOffset = model.getValueLength();
            if (isNaN(offset)) {
                // No valid offset specified.
                return {
                    inOffsetMode: true,
                    label: this.useZeroBasedOffset ?
                        localize('gotoLine.offsetPromptZero', "Type a character position to go to (from 0 to {0}).", maxOffset - 1) :
                        localize('gotoLine.offsetPrompt', "Type a character position to go to (from 1 to {0}).", maxOffset)
                };
            }
            else {
                const reverse = offset < 0;
                if (!this.useZeroBasedOffset) {
                    // Convert 1-based offset to model's 0-based.
                    offset -= Math.sign(offset);
                }
                if (reverse) {
                    // Offset from the end of the buffer
                    offset += maxOffset;
                }
                const pos = model.getPositionAt(offset);
                return {
                    ...pos,
                    inOffsetMode: true,
                    label: localize('gotoLine.goToPosition', "Press 'Enter' to go to line {0} at column {1}.", pos.lineNumber, pos.column)
                };
            }
        }
        else {
            // Support line-col formats of `line,col`, `line:col`, `line#col`
            const parts = value.split(/,|:|#/);
            const maxLine = model.getLineCount();
            let lineNumber = parseInt(parts[0]?.trim(), 10);
            if (parts.length < 1 || isNaN(lineNumber)) {
                return {
                    label: localize('gotoLine.linePrompt', "Type a line number to go to (from 1 to {0}).", maxLine)
                };
            }
            // Handle negative line numbers and clip to valid range.
            lineNumber = lineNumber >= 0 ? lineNumber : (maxLine + 1) + lineNumber;
            lineNumber = Math.min(Math.max(1, lineNumber), maxLine);
            const maxColumn = model.getLineMaxColumn(lineNumber);
            let column = parseInt(parts[1]?.trim(), 10);
            if (parts.length < 2 || isNaN(column)) {
                return {
                    lineNumber,
                    column: 1,
                    label: parts.length < 2 ?
                        localize('gotoLine.lineColumnPrompt', "Press 'Enter' to go to line {0} or enter colon : to add a column number.", lineNumber) :
                        localize('gotoLine.columnPrompt', "Press 'Enter' to go to line {0} or enter a column number (from 1 to {1}).", lineNumber, maxColumn)
                };
            }
            // Handle negative column numbers and clip to valid range.
            column = column >= 0 ? column : maxColumn + column;
            column = Math.min(Math.max(1, column), maxColumn);
            return {
                lineNumber,
                column,
                label: localize('gotoLine.goToPosition', "Press 'Enter' to go to line {0} at column {1}.", lineNumber, column)
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0xpbmVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL2dvdG9MaW5lUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFpRCx3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRS9JLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUtsRSxPQUFPLEVBQUUsMkNBQTJDLEVBQWlDLE1BQU0sa0NBQWtDLENBQUM7QUFJOUgsTUFBTSxPQUFnQixtQ0FBb0MsU0FBUSwyQ0FBMkM7YUFFNUYsc0JBQWlCLEdBQUcsR0FBRyxDQUFDO2FBQ3hCLHdCQUFtQixHQUFHLElBQUksQ0FBQzthQUNuQixrQ0FBNkIsR0FBRyw2QkFBNkIsQ0FBQztJQUV0RjtRQUNDLEtBQUssQ0FBQyxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUlELElBQVksa0JBQWtCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQ3BDLG1DQUFtQyxDQUFDLDZCQUE2QixxQ0FFakUsS0FBSyxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRUQsSUFBWSxrQkFBa0IsQ0FBQyxLQUFjO1FBQzVDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixtQ0FBbUMsQ0FBQyw2QkFBNkIsRUFDakUsS0FBSyxnRUFFYyxDQUFDO0lBQ3RCLENBQUM7SUFFUyx3QkFBd0IsQ0FBQyxNQUFtRTtRQUNyRyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsd0RBQXdELENBQUMsQ0FBQztRQUV0RyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBRXpCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztJQUN4QixDQUFDO0lBRVMscUJBQXFCLENBQUMsT0FBc0MsRUFBRSxNQUFtRSxFQUFFLEtBQXdCO1FBQ3BLLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDOUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUUxQyx3QkFBd0I7UUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDO1lBQ3BDLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDdEIsT0FBTztnQkFDUixDQUFDO2dCQUVELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO2dCQUU5SSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUN6QixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUoseURBQXlEO1FBQ3pELE1BQU0sWUFBWSxHQUFzQjtZQUN2QyxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsMEJBQTBCLENBQUM7WUFDckUsUUFBUSxFQUFFLHdCQUF3QixDQUFDLEtBQUs7WUFDeEMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtTQUM1QyxDQUFDO1FBRUYsMEJBQTBCO1FBQzFCLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxFQUFFO1lBQ2xDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLG1DQUFtQyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlHLE1BQU0sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUUxRixxREFBcUQ7WUFDckQsTUFBTSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUVwRCxTQUFTO1lBQ1QsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDO29CQUNmLFVBQVU7b0JBQ1YsTUFBTTtvQkFDTixLQUFLO2lCQUNMLENBQUMsQ0FBQztZQUVILGFBQWE7WUFDYixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNwRSxNQUFNLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FDMUI7Z0JBQ0MsR0FBRyxFQUFFLG9CQUFvQjtnQkFDekIsT0FBTyxFQUFFLENBQUMsMkdBQTJHLENBQUM7YUFDdEgsRUFDRCw2Q0FBNkMsRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUN0RixDQUFDO1lBRUYsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QixPQUFPO1lBQ1IsQ0FBQztZQUVELFNBQVM7WUFDVCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyw0QkFBb0IsQ0FBQztZQUVyRCxXQUFXO1lBQ1gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDO1FBRUYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEQsSUFBSSxNQUFNLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztnQkFDN0UscUJBQXFCLEVBQUUsQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLHFCQUFxQixFQUFFLENBQUM7UUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEUsMENBQTBDO1FBQzFDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztZQUMxRCxJQUFJLFdBQVcsQ0FBQyxVQUFVLDJDQUFtQyxFQUFFLENBQUM7Z0JBQy9ELFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFFaEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFTyxPQUFPLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUN6QyxPQUFPO1lBQ04sZUFBZSxFQUFFLFVBQVU7WUFDM0IsV0FBVyxFQUFFLE1BQU07WUFDbkIsYUFBYSxFQUFFLFVBQVU7WUFDekIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQztJQUNILENBQUM7SUFFUyxhQUFhLENBQUMsTUFBZSxFQUFFLEtBQWE7UUFDckQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNOLEtBQUssRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsd0RBQXdELENBQUM7YUFDOUYsQ0FBQztRQUNILENBQUM7UUFFRCw2RUFBNkU7UUFDN0UsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0IsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ25CLDZCQUE2QjtnQkFDN0IsT0FBTztvQkFDTixZQUFZLEVBQUUsSUFBSTtvQkFDbEIsS0FBSyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO3dCQUMvQixRQUFRLENBQUMsMkJBQTJCLEVBQUUscURBQXFELEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzdHLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxxREFBcUQsRUFBRSxTQUFTLENBQUM7aUJBQ3BHLENBQUM7WUFDSCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUM5Qiw2Q0FBNkM7b0JBQzdDLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QixDQUFDO2dCQUNELElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2Isb0NBQW9DO29CQUNwQyxNQUFNLElBQUksU0FBUyxDQUFDO2dCQUNyQixDQUFDO2dCQUNELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hDLE9BQU87b0JBQ04sR0FBRyxHQUFHO29CQUNOLFlBQVksRUFBRSxJQUFJO29CQUNsQixLQUFLLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGdEQUFnRCxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQztpQkFDdEgsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGlFQUFpRTtZQUNqRSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRW5DLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNyQyxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzNDLE9BQU87b0JBQ04sS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw4Q0FBOEMsRUFBRSxPQUFPLENBQUM7aUJBQy9GLENBQUM7WUFDSCxDQUFDO1lBRUQsd0RBQXdEO1lBQ3hELFVBQVUsR0FBRyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztZQUN2RSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUV4RCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckQsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM1QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPO29CQUNOLFVBQVU7b0JBQ1YsTUFBTSxFQUFFLENBQUM7b0JBQ1QsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ3hCLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwwRUFBMEUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO3dCQUMvSCxRQUFRLENBQUMsdUJBQXVCLEVBQUUsMkVBQTJFLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQztpQkFDdEksQ0FBQztZQUNILENBQUM7WUFFRCwwREFBMEQ7WUFDMUQsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztZQUNuRCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUVsRCxPQUFPO2dCQUNOLFVBQVU7Z0JBQ1YsTUFBTTtnQkFDTixLQUFLLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGdEQUFnRCxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUM7YUFDOUcsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDIn0=
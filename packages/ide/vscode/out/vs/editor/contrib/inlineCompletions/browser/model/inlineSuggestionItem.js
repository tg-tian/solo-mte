/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { observableSignal, observableValue } from '../../../../../base/common/observable.js';
import { commonPrefixLength, commonSuffixLength, splitLines } from '../../../../../base/common/strings.js';
import { applyEditsToRanges, StringEdit, StringReplacement } from '../../../../common/core/edits/stringEdit.js';
import { TextEdit, TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { Range } from '../../../../common/core/range.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { StringText } from '../../../../common/core/text/abstractText.js';
import { getPositionOffsetTransformerFromTextModel } from '../../../../common/core/text/getPositionOffsetTransformerFromTextModel.js';
import { TextLength } from '../../../../common/core/text/textLength.js';
import { linesDiffComputers } from '../../../../common/diff/linesDiffComputers.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { computeEditKind } from './editKind.js';
import { inlineCompletionIsVisible } from './inlineCompletionIsVisible.js';
import { InlineSuggestAlternativeAction } from './InlineSuggestAlternativeAction.js';
export var InlineSuggestionItem;
(function (InlineSuggestionItem) {
    function create(data, textModel, shouldDiffEdit = true) {
        if (!data.isInlineEdit && !data.action?.uri && data.action?.kind === 'edit') {
            return InlineCompletionItem.create(data, textModel, data.action);
        }
        else {
            return InlineEditItem.create(data, textModel, shouldDiffEdit);
        }
    }
    InlineSuggestionItem.create = create;
})(InlineSuggestionItem || (InlineSuggestionItem = {}));
function hashInlineSuggestionAction(action) {
    const obj = action?.kind === 'edit' ? { ...action, alternativeAction: InlineSuggestAlternativeAction.toString(action.alternativeAction) } : action;
    return JSON.stringify(obj);
}
class InlineSuggestionItemBase {
    constructor(_data, identity, hint) {
        this._data = _data;
        this.identity = identity;
        this.hint = hint;
    }
    /**
     * A reference to the original inline completion list this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    get source() { return this._data.source; }
    get isFromExplicitRequest() { return this._data.context.triggerKind === InlineCompletionTriggerKind.Explicit; }
    get forwardStable() { return this.source.inlineSuggestions.enableForwardStability ?? false; }
    get targetRange() {
        if (this.hint) {
            return this.hint.range;
        }
        if (this.action?.kind === 'edit') {
            return this.action.textReplacement.range;
        }
        else if (this.action?.kind === 'jumpTo') {
            return Range.fromPositions(this.action.position);
        }
        throw new BugIndicatingError('InlineSuggestionItem: Either hint or action must be set');
    }
    get semanticId() { return this.hash; }
    get gutterMenuLinkAction() { return this._sourceInlineCompletion.gutterMenuLinkAction; }
    get command() { return this._sourceInlineCompletion.command; }
    get supportsRename() { return this._data.supportsRename; }
    get warning() { return this._sourceInlineCompletion.warning; }
    get showInlineEditMenu() { return !!this._sourceInlineCompletion.showInlineEditMenu; }
    get hash() {
        return hashInlineSuggestionAction(this.action);
    }
    /** @deprecated */
    get shownCommand() { return this._sourceInlineCompletion.shownCommand; }
    get requestUuid() { return this._data.context.requestUuid; }
    get partialAccepts() { return this._data.partialAccepts; }
    /**
     * A reference to the original inline completion this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    get _sourceInlineCompletion() { return this._data.sourceInlineCompletion; }
    addRef() {
        this.identity.addRef();
        this.source.addRef();
    }
    removeRef() {
        this.identity.removeRef();
        this.source.removeRef();
    }
    reportInlineEditShown(commandService, viewKind, viewData, model, timeWhenShown) {
        const insertText = this.action?.kind === 'edit' ? this.action.textReplacement.text : ''; // TODO@hediet support insertText === undefined
        this._data.reportInlineEditShown(commandService, insertText, viewKind, viewData, this.computeEditKind(model), timeWhenShown);
    }
    reportPartialAccept(acceptedCharacters, info, partialAcceptance) {
        this._data.reportPartialAccept(acceptedCharacters, info, partialAcceptance);
    }
    reportEndOfLife(reason) {
        this._data.reportEndOfLife(reason);
    }
    setEndOfLifeReason(reason) {
        this._data.setEndOfLifeReason(reason);
    }
    setIsPreceeded(item) {
        this._data.setIsPreceeded(item.partialAccepts);
    }
    setNotShownReasonIfNotSet(reason) {
        this._data.setNotShownReason(reason);
    }
    /**
     * Avoid using this method. Instead introduce getters for the needed properties.
    */
    getSourceCompletion() {
        return this._sourceInlineCompletion;
    }
    setRenameProcessingInfo(info) {
        this._data.setRenameProcessingInfo(info);
    }
    withAction(action) {
        return this._data.withAction(action);
    }
    addPerformanceMarker(marker) {
        this._data.addPerformanceMarker(marker);
    }
}
export class InlineSuggestionIdentity {
    constructor() {
        this._onDispose = observableSignal(this);
        this.onDispose = this._onDispose;
        this._jumpedTo = observableValue(this, false);
        this._refCount = 1;
        this.id = 'InlineCompletionIdentity' + InlineSuggestionIdentity.idCounter++;
    }
    static { this.idCounter = 0; }
    get jumpedTo() {
        return this._jumpedTo;
    }
    addRef() {
        this._refCount++;
    }
    removeRef() {
        this._refCount--;
        if (this._refCount === 0) {
            this._onDispose.trigger(undefined);
        }
    }
    setJumpTo(tx) {
        this._jumpedTo.set(true, tx);
    }
}
export class InlineSuggestHint {
    static create(hint) {
        return new InlineSuggestHint(Range.lift(hint.range), hint.content, hint.style);
    }
    constructor(range, content, style) {
        this.range = range;
        this.content = content;
        this.style = style;
    }
    withEdit(edit, positionOffsetTransformer) {
        const offsetRange = new OffsetRange(positionOffsetTransformer.getOffset(this.range.getStartPosition()), positionOffsetTransformer.getOffset(this.range.getEndPosition()));
        const newOffsetRange = applyEditsToRanges([offsetRange], edit)[0];
        if (!newOffsetRange) {
            return undefined;
        }
        const newRange = positionOffsetTransformer.getRange(newOffsetRange);
        return new InlineSuggestHint(newRange, this.content, this.style);
    }
}
export class InlineCompletionItem extends InlineSuggestionItemBase {
    static create(data, textModel, action) {
        const identity = new InlineSuggestionIdentity();
        const transformer = getPositionOffsetTransformerFromTextModel(textModel);
        const insertText = action.insertText.replace(/\r\n|\r|\n/g, textModel.getEOL());
        const edit = reshapeInlineCompletion(new StringReplacement(transformer.getOffsetRange(action.range), insertText), textModel);
        const trimmedEdit = edit.removeCommonSuffixAndPrefix(textModel.getValue());
        const textEdit = transformer.getTextReplacement(edit);
        const displayLocation = data.hint ? InlineSuggestHint.create(data.hint) : undefined;
        return new InlineCompletionItem(edit, trimmedEdit, textEdit, textEdit.range, action.snippetInfo, data.additionalTextEdits, data, identity, displayLocation);
    }
    constructor(_edit, _trimmedEdit, _textEdit, _originalRange, snippetInfo, additionalTextEdits, data, identity, displayLocation) {
        super(data, identity, displayLocation);
        this._edit = _edit;
        this._trimmedEdit = _trimmedEdit;
        this._textEdit = _textEdit;
        this._originalRange = _originalRange;
        this.snippetInfo = snippetInfo;
        this.additionalTextEdits = additionalTextEdits;
        this.isInlineEdit = false;
    }
    get action() {
        return {
            kind: 'edit',
            textReplacement: this.getSingleTextEdit(),
            snippetInfo: this.snippetInfo,
            stringEdit: new StringEdit([this._trimmedEdit]),
            uri: undefined,
            alternativeAction: undefined,
        };
    }
    get hash() {
        return JSON.stringify(this._trimmedEdit.toJson());
    }
    getSingleTextEdit() { return this._textEdit; }
    withIdentity(identity) {
        return new InlineCompletionItem(this._edit, this._trimmedEdit, this._textEdit, this._originalRange, this.snippetInfo, this.additionalTextEdits, this._data, identity, this.hint);
    }
    withEdit(textModelEdit, textModel) {
        const newEditRange = applyEditsToRanges([this._edit.replaceRange], textModelEdit);
        if (newEditRange.length === 0) {
            return undefined;
        }
        const newEdit = new StringReplacement(newEditRange[0], this._textEdit.text);
        const positionOffsetTransformer = getPositionOffsetTransformerFromTextModel(textModel);
        const newTextEdit = positionOffsetTransformer.getTextReplacement(newEdit);
        let newDisplayLocation = this.hint;
        if (newDisplayLocation) {
            newDisplayLocation = newDisplayLocation.withEdit(textModelEdit, positionOffsetTransformer);
            if (!newDisplayLocation) {
                return undefined;
            }
        }
        const trimmedEdit = newEdit.removeCommonSuffixAndPrefix(textModel.getValue());
        return new InlineCompletionItem(newEdit, trimmedEdit, newTextEdit, this._originalRange, this.snippetInfo, this.additionalTextEdits, this._data, this.identity, newDisplayLocation);
    }
    canBeReused(model, position) {
        // TODO@hediet I believe this can be simplified to `return true;`, as applying an edit should kick out this suggestion.
        const updatedRange = this._textEdit.range;
        const result = !!updatedRange
            && updatedRange.containsPosition(position)
            && this.isVisible(model, position)
            && TextLength.ofRange(updatedRange).isGreaterThanOrEqualTo(TextLength.ofRange(this._originalRange));
        return result;
    }
    isVisible(model, cursorPosition) {
        const singleTextEdit = this.getSingleTextEdit();
        return inlineCompletionIsVisible(singleTextEdit, this._originalRange, model, cursorPosition);
    }
    computeEditKind(model) {
        return computeEditKind(new StringEdit([this._edit]), model);
    }
    get editRange() { return this.getSingleTextEdit().range; }
    get insertText() { return this.getSingleTextEdit().text; }
}
export class InlineEditItem extends InlineSuggestionItemBase {
    static create(data, textModel, shouldDiffEdit = true) {
        let action;
        let edits = [];
        if (data.action?.kind === 'edit') {
            const offsetEdit = shouldDiffEdit ? getDiffedStringEdit(textModel, data.action.range, data.action.insertText) : getStringEdit(textModel, data.action.range, data.action.insertText); // TODO compute async
            const text = new TextModelText(textModel);
            const textEdit = TextEdit.fromStringEdit(offsetEdit, text);
            const singleTextEdit = offsetEdit.isEmpty() ? new TextReplacement(new Range(1, 1, 1, 1), '') : textEdit.toReplacement(text); // FIXME: .toReplacement() can throw because offsetEdit is empty because we get an empty diff in getStringEdit after diffing
            edits = offsetEdit.replacements.map(edit => {
                const replacedRange = Range.fromPositions(textModel.getPositionAt(edit.replaceRange.start), textModel.getPositionAt(edit.replaceRange.endExclusive));
                const replacedText = textModel.getValueInRange(replacedRange);
                return SingleUpdatedNextEdit.create(edit, replacedText);
            });
            action = {
                kind: 'edit',
                snippetInfo: data.action.snippetInfo,
                stringEdit: offsetEdit,
                textReplacement: singleTextEdit,
                uri: data.action.uri,
                alternativeAction: data.action.alternativeAction,
            };
        }
        else if (data.action?.kind === 'jumpTo') {
            action = {
                kind: 'jumpTo',
                position: data.action.position,
                offset: textModel.getOffsetAt(data.action.position),
                uri: data.action.uri,
            };
        }
        else {
            action = undefined;
            if (!data.hint) {
                throw new BugIndicatingError('InlineEditItem: action is undefined and no hint is provided');
            }
        }
        const identity = new InlineSuggestionIdentity();
        const hint = data.hint ? InlineSuggestHint.create(data.hint) : undefined;
        return new InlineEditItem(action, data, identity, edits, hint, false, textModel.getVersionId());
    }
    constructor(_action, data, identity, _edits, hint, _lastChangePartOfInlineEdit = false, _inlineEditModelVersion) {
        super(data, identity, hint);
        this._action = _action;
        this._edits = _edits;
        this._lastChangePartOfInlineEdit = _lastChangePartOfInlineEdit;
        this._inlineEditModelVersion = _inlineEditModelVersion;
        this.snippetInfo = undefined;
        this.additionalTextEdits = [];
        this.isInlineEdit = true;
    }
    get updatedEditModelVersion() { return this._inlineEditModelVersion; }
    // public get updatedEdit(): StringEdit { return this._edit; }
    get action() {
        return this._action;
    }
    withIdentity(identity) {
        return new InlineEditItem(this._action, this._data, identity, this._edits, this.hint, this._lastChangePartOfInlineEdit, this._inlineEditModelVersion);
    }
    canBeReused(model, position) {
        // TODO@hediet I believe this can be simplified to `return true;`, as applying an edit should kick out this suggestion.
        return this._lastChangePartOfInlineEdit && this.updatedEditModelVersion === model.getVersionId();
    }
    withEdit(textModelChanges, textModel) {
        const edit = this._applyTextModelChanges(textModelChanges, this._edits, textModel);
        return edit;
    }
    _applyTextModelChanges(textModelChanges, edits, textModel) {
        const positionOffsetTransformer = getPositionOffsetTransformerFromTextModel(textModel);
        let lastChangePartOfInlineEdit = false;
        let inlineEditModelVersion = this._inlineEditModelVersion;
        let newAction;
        if (this.action?.kind === 'edit') { // TODO What about rename?
            edits = edits.map(innerEdit => innerEdit.applyTextModelChanges(textModelChanges));
            if (edits.some(edit => edit.edit === undefined)) {
                return undefined; // change is invalid, so we will have to drop the completion
            }
            const newTextModelVersion = textModel.getVersionId();
            lastChangePartOfInlineEdit = edits.some(edit => edit.lastChangeUpdatedEdit);
            if (lastChangePartOfInlineEdit) {
                inlineEditModelVersion = newTextModelVersion ?? -1;
            }
            if (newTextModelVersion === null || inlineEditModelVersion + 20 < newTextModelVersion) {
                return undefined; // the completion has been ignored for a while, remove it
            }
            edits = edits.filter(innerEdit => !innerEdit.edit.isEmpty);
            if (edits.length === 0) {
                return undefined; // the completion has been typed by the user
            }
            const newEdit = new StringEdit(edits.map(edit => edit.edit));
            const newTextEdit = positionOffsetTransformer.getTextEdit(newEdit).toReplacement(new TextModelText(textModel));
            newAction = {
                kind: 'edit',
                textReplacement: newTextEdit,
                snippetInfo: this.snippetInfo,
                stringEdit: newEdit,
                uri: this.action.uri,
                alternativeAction: this.action.alternativeAction,
            };
        }
        else if (this.action?.kind === 'jumpTo') {
            const jumpToOffset = this.action.offset;
            const newJumpToOffset = textModelChanges.applyToOffsetOrUndefined(jumpToOffset);
            if (newJumpToOffset === undefined) {
                return undefined;
            }
            const newJumpToPosition = positionOffsetTransformer.getPosition(newJumpToOffset);
            newAction = {
                kind: 'jumpTo',
                position: newJumpToPosition,
                offset: newJumpToOffset,
                uri: this.action.uri,
            };
        }
        else {
            newAction = undefined;
        }
        let newDisplayLocation = this.hint;
        if (newDisplayLocation) {
            newDisplayLocation = newDisplayLocation.withEdit(textModelChanges, positionOffsetTransformer);
            if (!newDisplayLocation) {
                return undefined;
            }
        }
        return new InlineEditItem(newAction, this._data, this.identity, edits, newDisplayLocation, lastChangePartOfInlineEdit, inlineEditModelVersion);
    }
    computeEditKind(model) {
        const edit = this.action?.kind === 'edit' ? this.action.stringEdit : undefined;
        if (!edit) {
            return undefined;
        }
        return computeEditKind(edit, model);
    }
}
function getDiffedStringEdit(textModel, editRange, replaceText) {
    const eol = textModel.getEOL();
    const editOriginalText = textModel.getValueInRange(editRange);
    const editReplaceText = replaceText.replace(/\r\n|\r|\n/g, eol);
    const diffAlgorithm = linesDiffComputers.getDefault();
    const lineDiffs = diffAlgorithm.computeDiff(splitLines(editOriginalText), splitLines(editReplaceText), {
        ignoreTrimWhitespace: false,
        computeMoves: false,
        extendToSubwords: true,
        maxComputationTimeMs: 50,
    });
    const innerChanges = lineDiffs.changes.flatMap(c => c.innerChanges ?? []);
    function addRangeToPos(pos, range) {
        const start = TextLength.fromPosition(range.getStartPosition());
        return TextLength.ofRange(range).createRange(start.addToPosition(pos));
    }
    const modifiedText = new StringText(editReplaceText);
    const offsetEdit = new StringEdit(innerChanges.map(c => {
        const rangeInModel = addRangeToPos(editRange.getStartPosition(), c.originalRange);
        const originalRange = getPositionOffsetTransformerFromTextModel(textModel).getOffsetRange(rangeInModel);
        const replaceText = modifiedText.getValueOfRange(c.modifiedRange);
        const edit = new StringReplacement(originalRange, replaceText);
        const originalText = textModel.getValueInRange(rangeInModel);
        return reshapeInlineEdit(edit, originalText, innerChanges.length, textModel);
    }));
    return offsetEdit;
}
function getStringEdit(textModel, editRange, replaceText) {
    return new StringEdit([new StringReplacement(getPositionOffsetTransformerFromTextModel(textModel).getOffsetRange(editRange), replaceText)]);
}
class SingleUpdatedNextEdit {
    static create(edit, replacedText) {
        const prefixLength = commonPrefixLength(edit.newText, replacedText);
        const suffixLength = commonSuffixLength(edit.newText, replacedText);
        const trimmedNewText = edit.newText.substring(prefixLength, edit.newText.length - suffixLength);
        return new SingleUpdatedNextEdit(edit, trimmedNewText, prefixLength, suffixLength);
    }
    get edit() { return this._edit; }
    get lastChangeUpdatedEdit() { return this._lastChangeUpdatedEdit; }
    constructor(_edit, _trimmedNewText, _prefixLength, _suffixLength, _lastChangeUpdatedEdit = false) {
        this._edit = _edit;
        this._trimmedNewText = _trimmedNewText;
        this._prefixLength = _prefixLength;
        this._suffixLength = _suffixLength;
        this._lastChangeUpdatedEdit = _lastChangeUpdatedEdit;
    }
    applyTextModelChanges(textModelChanges) {
        const c = this._clone();
        c._applyTextModelChanges(textModelChanges);
        return c;
    }
    _clone() {
        return new SingleUpdatedNextEdit(this._edit, this._trimmedNewText, this._prefixLength, this._suffixLength, this._lastChangeUpdatedEdit);
    }
    _applyTextModelChanges(textModelChanges) {
        this._lastChangeUpdatedEdit = false; // TODO @benibenj make immutable
        if (!this._edit) {
            throw new BugIndicatingError('UpdatedInnerEdits: No edit to apply changes to');
        }
        const result = this._applyChanges(this._edit, textModelChanges);
        if (!result) {
            this._edit = undefined;
            return;
        }
        this._edit = result.edit;
        this._lastChangeUpdatedEdit = result.editHasChanged;
    }
    _applyChanges(edit, textModelChanges) {
        let editStart = edit.replaceRange.start;
        let editEnd = edit.replaceRange.endExclusive;
        let editReplaceText = edit.newText;
        let editHasChanged = false;
        const shouldPreserveEditShape = this._prefixLength > 0 || this._suffixLength > 0;
        for (let i = textModelChanges.replacements.length - 1; i >= 0; i--) {
            const change = textModelChanges.replacements[i];
            // INSERTIONS (only support inserting at start of edit)
            const isInsertion = change.newText.length > 0 && change.replaceRange.isEmpty;
            if (isInsertion && !shouldPreserveEditShape && change.replaceRange.start === editStart && editReplaceText.startsWith(change.newText)) {
                editStart += change.newText.length;
                editReplaceText = editReplaceText.substring(change.newText.length);
                editEnd += change.newText.length;
                editHasChanged = true;
                continue;
            }
            if (isInsertion && shouldPreserveEditShape && change.replaceRange.start === editStart + this._prefixLength && this._trimmedNewText.startsWith(change.newText)) {
                editEnd += change.newText.length;
                editHasChanged = true;
                this._prefixLength += change.newText.length;
                this._trimmedNewText = this._trimmedNewText.substring(change.newText.length);
                continue;
            }
            // DELETIONS
            const isDeletion = change.newText.length === 0 && change.replaceRange.length > 0;
            if (isDeletion && change.replaceRange.start >= editStart + this._prefixLength && change.replaceRange.endExclusive <= editEnd - this._suffixLength) {
                // user deleted text IN-BETWEEN the deletion range
                editEnd -= change.replaceRange.length;
                editHasChanged = true;
                continue;
            }
            // user did exactly the edit
            if (change.equals(edit)) {
                editHasChanged = true;
                editStart = change.replaceRange.endExclusive;
                editReplaceText = '';
                continue;
            }
            // MOVE EDIT
            if (change.replaceRange.start > editEnd) {
                // the change happens after the completion range
                continue;
            }
            if (change.replaceRange.endExclusive < editStart) {
                // the change happens before the completion range
                editStart += change.newText.length - change.replaceRange.length;
                editEnd += change.newText.length - change.replaceRange.length;
                continue;
            }
            // The change intersects the completion, so we will have to drop the completion
            return undefined;
        }
        // the resulting edit is a noop as the original and new text are the same
        if (this._trimmedNewText.length === 0 && editStart + this._prefixLength === editEnd - this._suffixLength) {
            return { edit: new StringReplacement(new OffsetRange(editStart + this._prefixLength, editStart + this._prefixLength), ''), editHasChanged: true };
        }
        return { edit: new StringReplacement(new OffsetRange(editStart, editEnd), editReplaceText), editHasChanged };
    }
}
function reshapeInlineCompletion(edit, textModel) {
    // If the insertion is a multi line insertion starting on the next line
    // Move it forwards so that the multi line insertion starts on the current line
    const eol = textModel.getEOL();
    if (edit.replaceRange.isEmpty && edit.newText.includes(eol)) {
        edit = reshapeMultiLineInsertion(edit, textModel);
    }
    return edit;
}
function reshapeInlineEdit(edit, originalText, totalInnerEdits, textModel) {
    // TODO: EOL are not properly trimmed by the diffAlgorithm #12680
    const eol = textModel.getEOL();
    if (edit.newText.endsWith(eol) && originalText.endsWith(eol)) {
        edit = new StringReplacement(edit.replaceRange.deltaEnd(-eol.length), edit.newText.slice(0, -eol.length));
    }
    // INSERTION
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (totalInnerEdits === 1 && edit.replaceRange.isEmpty && edit.newText.includes(eol)) {
        const startPosition = textModel.getPositionAt(edit.replaceRange.start);
        const hasTextOnInsertionLine = textModel.getLineLength(startPosition.lineNumber) !== 0;
        if (hasTextOnInsertionLine) {
            edit = reshapeMultiLineInsertion(edit, textModel);
        }
    }
    // The diff algorithm extended a simple edit to the entire word
    // shrink it back to a simple edit if it is deletion/insertion only
    if (totalInnerEdits === 1) {
        const prefixLength = commonPrefixLength(originalText, edit.newText);
        const suffixLength = commonSuffixLength(originalText.slice(prefixLength), edit.newText.slice(prefixLength));
        // reshape it back to an insertion
        if (prefixLength + suffixLength === originalText.length) {
            return new StringReplacement(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), edit.newText.substring(prefixLength, edit.newText.length - suffixLength));
        }
        // reshape it back to a deletion
        if (prefixLength + suffixLength === edit.newText.length) {
            return new StringReplacement(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), '');
        }
    }
    return edit;
}
function reshapeMultiLineInsertion(edit, textModel) {
    if (!edit.replaceRange.isEmpty) {
        throw new BugIndicatingError('Unexpected original range');
    }
    if (edit.replaceRange.start === 0) {
        return edit;
    }
    const eol = textModel.getEOL();
    const startPosition = textModel.getPositionAt(edit.replaceRange.start);
    const startColumn = startPosition.column;
    const startLineNumber = startPosition.lineNumber;
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (startColumn === 1 && startLineNumber > 1 && edit.newText.endsWith(eol) && !edit.newText.startsWith(eol)) {
        return new StringReplacement(edit.replaceRange.delta(-1), eol + edit.newText.slice(0, -eol.length));
    }
    return edit;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lU3VnZ2VzdGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVTdWdnZXN0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQTZCLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUkzRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDaEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV0RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUV0SSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbkYsT0FBTyxFQUFnSCwyQkFBMkIsRUFBOEMsTUFBTSxpQ0FBaUMsQ0FBQztBQUV4TyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFMUUsT0FBTyxFQUFFLGVBQWUsRUFBNEIsTUFBTSxlQUFl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
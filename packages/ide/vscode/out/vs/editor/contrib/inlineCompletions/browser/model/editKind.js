const syntacticalChars = new Set([';', ',', '=', '+', '-', '*', '/', '{', '}', '(', ')', '[', ']', '<', '>', ':', '.', '!', '?', '&', '|', '^', '%', '@', '#', '~', '`', '\\', '\'', '"', '$']);
function isSyntacticalChar(char) {
    return syntacticalChars.has(char);
}
function isIdentifierChar(char) {
    return /[a-zA-Z0-9_]/.test(char);
}
function isWhitespaceChar(char) {
    return char === ' ' || char === '\t';
}
function analyzeTextShape(text) {
    const lines = text.split(/\r\n|\r|\n/);
    if (lines.length > 1) {
        return {
            kind: 'multiLine',
            lineCount: lines.length,
        };
    }
    const isSingleChar = text.length === 1;
    let singleCharKind;
    if (isSingleChar) {
        if (isSyntacticalChar(text)) {
            singleCharKind = 'syntactical';
        }
        else if (isIdentifierChar(text)) {
            singleCharKind = 'identifier';
        }
        else if (isWhitespaceChar(text)) {
            singleCharKind = 'whitespace';
        }
    }
    // Analyze whitespace patterns
    const whitespaceMatches = text.match(/[ \t]+/g) || [];
    const isMultipleWhitespace = whitespaceMatches.some(ws => ws.length > 1);
    const hasDuplicatedWhitespace = whitespaceMatches.some(ws => (ws.includes('  ') || ws.includes('\t\t')));
    // Analyze word patterns
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const isWord = words.length === 1 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(words[0]);
    const isMultipleWords = words.length > 1;
    return {
        kind: 'singleLine',
        isSingleCharacter: isSingleChar,
        singleCharacterKind: singleCharKind,
        isWord,
        isMultipleWords,
        isMultipleWhitespace,
        hasDuplicatedWhitespace,
    };
}
export class InlineSuggestionEditKind {
    constructor(edits) {
        this.edits = edits;
    }
    toString() {
        return JSON.stringify({ edits: this.edits });
    }
}
export function computeEditKind(edit, textModel, cursorPosition) {
    if (edit.replacements.length === 0) {
        // Empty edit - return undefined as there's no edit to classify
        return undefined;
    }
    return new InlineSuggestionEditKind(edit.replacements.map(rep => computeSingleEditKind(rep, textModel, cursorPosition)));
}
function countLines(text) {
    if (text.length === 0) {
        return 0;
    }
    return text.split(/\r\n|\r|\n/).length - 1;
}
function computeSingleEditKind(replacement, textModel, cursorPosition) {
    const replaceRange = replacement.replaceRange;
    const newText = replacement.newText;
    const deletedLength = replaceRange.length;
    const insertedLength = newText.length;
    const linesInserted = countLines(newText);
    const kind = replaceRange.isEmpty ? 'insert' : (newText.length === 0 ? 'delete' : 'replace');
    switch (kind) {
        case 'insert':
            return {
                operation: 'insert',
                properties: computeInsertProperties(replaceRange.start, newText, textModel, cursorPosition),
                charactersInserted: insertedLength,
                charactersDeleted: 0,
                linesInserted,
                linesDeleted: 0,
            };
        case 'delete': {
            const deletedText = textModel.getValue().substring(replaceRange.start, replaceRange.endExclusive);
            return {
                operation: 'delete',
                properties: computeDeleteProperties(replaceRange.start, replaceRange.endExclusive, textModel),
                charactersInserted: 0,
                charactersDeleted: deletedLength,
                linesInserted: 0,
                linesDeleted: countLines(deletedText),
            };
        }
        case 'replace': {
            const oldText = textModel.getValue().substring(replaceRange.start, replaceRange.endExclusive);
            return {
                operation: 'replace',
                properties: computeReplaceProperties(oldText, newText),
                charactersInserted: insertedLength,
                charactersDeleted: deletedLength,
                linesInserted,
                linesDeleted: countLines(oldText),
            };
        }
    }
}
function computeInsertProperties(offset, newText, textModel, cursorPosition) {
    const textShape = analyzeTextShape(newText);
    const insertPosition = textModel.getPositionAt(offset);
    const lineContent = textModel.getLineContent(insertPosition.lineNumber);
    const lineLength = lineContent.length;
    // Determine location shape
    let locationShape;
    const isLineEmpty = lineContent.trim().length === 0;
    const isAtEndOfLine = insertPosition.column > lineLength;
    const isAtStartOfLine = insertPosition.column === 1;
    if (isLineEmpty) {
        locationShape = 'emptyLine';
    }
    else if (isAtEndOfLine) {
        locationShape = 'endOfLine';
    }
    else if (isAtStartOfLine) {
        locationShape = 'startOfLine';
    }
    else {
        locationShape = 'middleOfLine';
    }
    // Compute relative to cursor if cursor position is provided
    let relativeToCursor;
    if (cursorPosition) {
        const cursorLine = cursorPosition.lineNumber;
        const insertLine = insertPosition.lineNumber;
        const cursorColumn = cursorPosition.column;
        const insertColumn = insertPosition.column;
        const atCursor = cursorLine === insertLine && cursorColumn === insertColumn;
        const beforeCursorOnSameLine = cursorLine === insertLine && insertColumn < cursorColumn;
        const afterCursorOnSameLine = cursorLine === insertLine && insertColumn > cursorColumn;
        const linesAbove = insertLine < cursorLine ? cursorLine - insertLine : undefined;
        const linesBelow = insertLine > cursorLine ? insertLine - cursorLine : undefined;
        relativeToCursor = {
            atCursor,
            beforeCursorOnSameLine,
            afterCursorOnSameLine,
            linesAbove,
            linesBelow,
        };
    }
    return {
        textShape,
        locationShape,
        relativeToCursor,
    };
}
function computeDeleteProperties(startOffset, endOffset, textModel) {
    const deletedText = textModel.getValue().substring(startOffset, endOffset);
    const textShape = analyzeTextShape(deletedText);
    const startPosition = textModel.getPositionAt(startOffset);
    const endPosition = textModel.getPositionAt(endOffset);
    // Check if delete is at end of line
    const lineContent = textModel.getLineContent(endPosition.lineNumber);
    const isAtEndOfLine = endPosition.column > lineContent.length;
    // Check if entire line content is deleted
    const deletesEntireLineContent = startPosition.lineNumber === endPosition.lineNumber &&
        startPosition.column === 1 &&
        endPosition.column > lineContent.length;
    return {
        textShape,
        isAtEndOfLine,
        deletesEntireLineContent,
    };
}
function computeReplaceProperties(oldText, newText) {
    const oldShape = analyzeTextShape(oldText);
    const newShape = analyzeTextShape(newText);
    const oldIsWord = oldShape.kind === 'singleLine' && oldShape.isWord;
    const newIsWord = newShape.kind === 'singleLine' && newShape.isWord;
    const isWordToWordReplacement = oldIsWord && newIsWord;
    const isAdditive = newText.length > oldText.length;
    const isSubtractive = newText.length < oldText.length;
    const isSingleLineToSingleLine = oldShape.kind === 'singleLine' && newShape.kind === 'singleLine';
    const isSingleLineToMultiLine = oldShape.kind === 'singleLine' && newShape.kind === 'multiLine';
    const isMultiLineToSingleLine = oldShape.kind === 'multiLine' && newShape.kind === 'singleLine';
    return {
        isWordToWordReplacement,
        isAdditive,
        isSubtractive,
        isSingleLineToSingleLine,
        isSingleLineToMultiLine,
        isMultiLineToSingleLine,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEtpbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9lZGl0S2luZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoTSxTQUFTLGlCQUFpQixDQUFDLElBQVk7SUFDdEMsT0FBTyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBWTtJQUNyQyxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBWTtJQUNyQyxPQUFPLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQztBQUN0QyxDQUFDO0FBcUJELFNBQVMsZ0JBQWdCLENBQUMsSUFBWTtJQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3ZDLElB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
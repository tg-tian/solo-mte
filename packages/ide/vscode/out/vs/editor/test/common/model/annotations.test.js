/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AnnotatedString, AnnotationsUpdate } from '../../../common/model/tokens/annotations.js';
import { OffsetRange } from '../../../common/core/ranges/offsetRange.js';
import { StringEdit } from '../../../common/core/edits/stringEdit.js';
// ============================================================================
// Visual Annotation Test Infrastructure
// ============================================================================
// This infrastructure allows representing annotations visually using brackets:
// - '[id:text]' marks an annotation with the given id covering 'text'
// - Plain text represents unannotated content
//
// Example: "Lorem [1:ipsum] dolor [2:sit] amet" represents:
//   - annotation "1" at offset 6-11 (content "ipsum")
//   - annotation "2" at offset 18-21 (content "sit")
//
// For updates:
// - '[id:text]' sets an annotation
// - '<id:text>' deletes an annotation in that range
// ============================================================================
/**
 * Parses a visual string representation into annotations.
 * The visual string uses '[id:text]' to mark annotation boundaries.
 * The id becomes the annotation value, and text is the annotated content.
 */
function parseVisualAnnotations(visual) {
    const annotations = [];
    let baseString = '';
    let i = 0;
    while (i < visual.length) {
        if (visual[i] === '[') {
            // Find the colon and closing bracket
            const colonIdx = visual.indexOf(':', i + 1);
            const closeIdx = visual.indexOf(']', colonIdx + 1);
            if (colonIdx === -1 || closeIdx === -1) {
                throw new Error(`Invalid annotation format at position ${i}`);
            }
            const id = visual.substring(i + 1, colonIdx);
            const text = visual.substring(colonIdx + 1, closeIdx);
            const startOffset = baseString.length;
            baseString += text;
            annotations.push({ range: new OffsetRange(startOffset, baseString.length), annotation: id });
            i = closeIdx + 1;
        }
        else {
            baseString += visual[i];
            i++;
        }
    }
    return { annotations, baseString };
}
/**
 * Converts annotations to a visual string representation.
 * Uses '[id:text]' to mark annotation boundaries.
 *
 * @param annotations - The annotations to visualize
 * @param baseString - The base string content
 */
function toVisualString(annotations, baseString) {
    if (annotations.length === 0) {
        return baseString;
    }
    // Sort annotations by start position
    const sortedAnnotations = [...annotations].sort((a, b) => a.range.start - b.range.start);
    // Build the visual representation
    let result = '';
    let pos = 0;
    for (const ann of sortedAnnotations) {
        // Add plain text before this annotation
        result += baseString.substring(pos, ann.range.start);
        // Add annotated content with id
        const annotatedText = baseString.substring(ann.range.start, ann.range.endExclusive);
        result += `[${ann.annotation}:${annotatedText}]`;
        pos = ann.range.endExclusive;
    }
    // Add remaining text after last annotation
    result += baseString.substring(pos);
    return result;
}
/**
 * Represents an AnnotatedString with its base string for visual testing.
 */
class VisualAnnotatedString {
    constructor(annotatedString, baseString) {
        this.annotatedString = annotatedString;
        this.baseString = baseString;
    }
    setAnnotations(update) {
        this.annotatedString.setAnnotations(update);
    }
    applyEdit(edit) {
        this.annotatedString.applyEdit(edit);
        this.baseString = edit.apply(this.baseString);
    }
    getAnnotationsIntersecting(range) {
        return this.annotatedString.getAnnotationsIntersecting(range);
    }
    getAllAnnotations() {
        return this.annotatedString.getAllAnnotations();
    }
    clone() {
        return new VisualAnnotatedString(this.annotatedString.clone(), this.baseString);
    }
}
/**
 * Creates a VisualAnnotatedString from a visual representation.
 */
function fromVisual(visual) {
    const { annotations, baseString } = parseVisualAnnotations(visual);
    return new VisualAnnotatedString(new AnnotatedString(annotations), baseString);
}
/**
 * Converts a VisualAnnotatedString to a visual representation.
 */
function toVisual(vas) {
    return toVisualString(vas.getAllAnnotations(), vas.baseString);
}
/**
 * Parses visual update annotations, where:
 * - '[id:text]' represents an annotation to set
 * - '<id:text>' represents an annotation to delete (range is tracked but annotation is undefined)
 */
function parseVisualUpdate(visual) {
    const updates = [];
    let baseString = '';
    let i = 0;
    while (i < visual.length) {
        if (visual[i] === '[') {
            // Set annotation: [id:text]
            const colonIdx = visual.indexOf(':', i + 1);
            const closeIdx = visual.indexOf(']', colonIdx + 1);
            if (colonIdx === -1 || closeIdx === -1) {
                throw new Error(`Invalid annotation format at position ${i}`);
            }
            const id = visual.substring(i + 1, colonIdx);
            const text = visual.substring(colonIdx + 1, closeIdx);
            const startOffset = baseString.length;
            baseString += text;
            updates.push({ range: new OffsetRange(startOffset, baseString.length), annotation: id });
            i = closeIdx + 1;
        }
        else if (visual[i] === '<') {
            // Delete annotation: <id:text>
            const colonIdx = visual.indexOf(':', i + 1);
            const closeIdx = visual.indexOf('>', colonIdx + 1);
            if (colonIdx === -1 || closeIdx === -1) {
                throw new Error(`Invalid delete format at position ${i}`);
            }
            const text = visual.substring(colonIdx + 1, closeIdx);
            const startOffset = baseString.length;
            baseString += text;
            updates.push({ range: new OffsetRange(startOffset, baseString.length), annotation: undefined });
            i = closeIdx + 1;
        }
        else {
            baseString += visual[i];
            i++;
        }
    }
    return { updates, baseString };
}
/**
 * Creates an AnnotationsUpdate from a visual representation.
 */
function updateFromVisual(...visuals) {
    const updates = [];
    for (const visual of visuals) {
        const { updates: parsedUpdates } = parseVisualUpdate(visual);
        updates.push(...parsedUpdates);
    }
    return AnnotationsUpdate.create(updates);
}
/**
 * Helper to create a StringEdit from visual notation.
 * Uses a pattern matching approach where:
 * - 'd' marks positions to delete
 * - 'i:text:' inserts 'text' at the marked position
 *
 * Simpler approach: just use offset-based helpers
 */
function editDelete(start, end) {
    return StringEdit.replace(new OffsetRange(start, end), '');
}
function editInsert(pos, text) {
    return StringEdit.insert(pos, text);
}
function editReplace(start, end, text) {
    return StringEdit.replace(new OffsetRange(start, end), text);
}
/**
 * Asserts that a VisualAnnotatedString matches the expected visual representation.
 * Only compares annotations, not the base string (since setAnnotations doesn't change the base string).
 */
function assertVisual(vas, expectedVisual) {
    const actual = toVisual(vas);
    const { annotations: expectedAnnotations } = parseVisualAnnotations(expectedVisual);
    const actualAnnotations = vas.getAllAnnotations();
    // Compare annotations for better error messages
    if (actualAnnotations.length !== expectedAnnotations.length) {
        assert.fail(`Annotation count mismatch.\n` +
            `  Expected: ${expectedVisual}\n` +
            `  Actual:   ${actual}\n` +
            `  Expected ${expectedAnnotations.length} annotations, got ${actualAnnotations.length}`);
    }
    for (let i = 0; i < actualAnnotations.length; i++) {
        const expected = expectedAnnotations[i];
        const actualAnn = actualAnnotations[i];
        if (actualAnn.range.start !== expected.range.start || actualAnn.range.endExclusive !== expected.range.endExclusive) {
            assert.fail(`Annotation ${i} range mismatch.\n` +
                `  Expected: (${expected.range.start}, ${expected.range.endExclusive})\n` +
                `  Actual:   (${actualAnn.range.start}, ${actualAnn.range.endExclusive})\n` +
                `  Expected visual: ${expectedVisual}\n` +
                `  Actual visual:   ${actual}`);
        }
        if (actualAnn.annotation !== expected.annotation) {
            assert.fail(`Annotation ${i} value mismatch.\n` +
                `  Expected: "${expected.annotation}"\n` +
                `  Actual:   "${actualAnn.annotation}"`);
        }
    }
}
/**
 * Helper to visualize the effect of an edit on annotations.
 * Returns both before and after states as visual strings.
 */
function visualizeEdit(beforeAnnotations, edit) {
    const vas = fromVisual(beforeAnnotations);
    const before = toVisual(vas);
    vas.applyEdit(edit);
    const after = toVisual(vas);
    return { before, after };
}
// ============================================================================
// Visual Annotations Test Suite
// ============================================================================
// These tests use a visual representation for better readability:
// - '[id:text]' marks annotated regions with id and content
// - Plain text represents unannotated content
// - '<id:text>' marks regions to delete (in updates)
//
// Example: "Lorem [1:ipsum] dolor [2:sit] amet" represents two annotations:
//          "1" at (6,11) covering "ipsum", "2" at (18,21) covering "sit"
// ============================================================================
suite('Annotations Suite', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('setAnnotations 1', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet]');
        vas.setAnnotations(updateFromVisual('[4:Lorem i]'));
        assertVisual(vas, '[4:Lorem i]psum [2:dolor] sit [3:amet]');
        vas.setAnnotations(updateFromVisual('Lorem ip[5:s]'));
        assertVisual(vas, '[4:Lorem i]p[5:s]um [2:dolor] sit [3:amet]');
    });
    test('setAnnotations 2', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet]');
        vas.setAnnotations(updateFromVisual('L<_:orem ipsum d>', '[4:Lorem ]'));
        assertVisual(vas, '[4:Lorem ]ipsum dolor sit [3:amet]');
        vas.setAnnotations(updateFromVisual('Lorem <_:ipsum dolor sit amet>', '[5:Lor]'));
        assertVisual(vas, '[5:Lor]em ipsum dolor sit amet');
        vas.setAnnotations(updateFromVisual('L[6:or]'));
        assertVisual(vas, 'L[6:or]em ipsum dolor sit amet');
    });
    test('setAnnotations 3', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet]');
        vas.setAnnotations(updateFromVisual('Lore[4:m ipsum dolor ]'));
        assertVisual(vas, 'Lore[4:m ipsum dolor ]sit [3:amet]');
        vas.setAnnotations(updateFromVisual('Lorem ipsum dolor sit [5:a]'));
        assertVisual(vas, 'Lore[4:m ipsum dolor ]sit [5:a]met');
    });
    test('getAnnotationsIntersecting 1', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet]');
        const result1 = vas.getAnnotationsIntersecting(new OffsetRange(0, 13));
        assert.strictEqual(result1.length, 2);
        assert.deepStrictEqual(result1.map(a => a.annotation), ['1', '2']);
        const result2 = vas.getAnnotationsIntersecting(new OffsetRange(0, 22));
        assert.strictEqual(result2.length, 3);
        assert.deepStrictEqual(result2.map(a => a.annotation), ['1', '2', '3']);
    });
    test('getAnnotationsIntersecting 2', () => {
        const vas = fromVisual('[1:Lorem] [2:i]p[3:s]');
        const result1 = vas.getAnnotationsIntersecting(new OffsetRange(5, 7));
        assert.strictEqual(result1.length, 2);
        assert.deepStrictEqual(result1.map(a => a.annotation), ['1', '2']);
        const result2 = vas.getAnnotationsIntersecting(new OffsetRange(5, 9));
        assert.strictEqual(result2.length, 3);
        assert.deepStrictEqual(result2.map(a => a.annotation), ['1', '2', '3']);
    });
    test('getAnnotationsIntersecting 3', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor]');
        const result1 = vas.getAnnotationsIntersecting(new OffsetRange(4, 13));
        assert.strictEqual(result1.length, 2);
        assert.deepStrictEqual(result1.map(a => a.annotation), ['1', '2']);
        vas.setAnnotations(updateFromVisual('[3:Lore]m[4: ipsu]'));
        assertVisual(vas, '[3:Lore]m[4: ipsu]m [2:dolor]');
        const result2 = vas.getAnnotationsIntersecting(new OffsetRange(7, 13));
        assert.strictEqual(result2.length, 2);
        assert.deepStrictEqual(result2.map(a => a.annotation), ['4', '2']);
    });
    test('getAnnotationsIntersecting 4', () => {
        const vas = fromVisual('[1:Lorem ipsum] sit');
        vas.setAnnotations(updateFromVisual('Lorem ipsum [2:sit]'));
        const result = vas.getAnnotationsIntersecting(new OffsetRange(2, 8));
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result.map(a => a.annotation), ['1']);
    });
    test('getAnnotationsIntersecting 5', () => {
        const vas = fromVisual('[1:Lorem ipsum] [2:dol] [3:or]');
        const result = vas.getAnnotationsIntersecting(new OffsetRange(1, 16));
        assert.strictEqual(result.length, 3);
        assert.deepStrictEqual(result.map(a => a.annotation), ['1', '2', '3']);
    });
    test('applyEdit 1 - deletion within annotation', () => {
        const result = visualizeEdit('[1:Lorem] ipsum [2:dolor] sit [3:amet]', editDelete(0, 3));
        assert.strictEqual(result.after, '[1:em] ipsum [2:dolor] sit [3:amet]');
    });
    test('applyEdit 2 - deletion and insertion within annotation', () => {
        const result = visualizeEdit('[1:Lorem] ipsum [2:dolor] sit [3:amet]', editReplace(1, 3, 'XXXXX'));
        assert.strictEqual(result.after, '[1:LXXXXXem] ipsum [2:dolor] sit [3:amet]');
    });
    test('applyEdit 3 - deletion across several annotations', () => {
        const result = visualizeEdit('[1:Lorem] ipsum [2:dolor] sit [3:amet]', editReplace(4, 22, 'XXXXX'));
        assert.strictEqual(result.after, '[1:LoreXXXXX][3:amet]');
    });
    test('applyEdit 4 - deletion between annotations', () => {
        const result = visualizeEdit('[1:Lorem ip]sum and [2:dolor] sit [3:amet]', editDelete(10, 12));
        assert.strictEqual(result.after, '[1:Lorem ip]suand [2:dolor] sit [3:amet]');
    });
    test('applyEdit 5 - deletion that covers annotation', () => {
        const result = visualizeEdit('[1:Lorem] ipsum [2:dolor] sit [3:amet]', editDelete(0, 5));
        assert.strictEqual(result.after, ' ipsum [2:dolor] sit [3:amet]');
    });
    test('applyEdit 6 - several edits', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet]');
        const edit = StringEdit.compose([
            StringEdit.replace(new OffsetRange(0, 6), ''),
            StringEdit.replace(new OffsetRange(6, 12), ''),
            StringEdit.replace(new OffsetRange(12, 17), '')
        ]);
        vas.applyEdit(edit);
        assertVisual(vas, 'ipsum sit [3:am]');
    });
    test('applyEdit 7 - several edits', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet]');
        const edit1 = StringEdit.replace(new OffsetRange(0, 3), 'XXXX');
        const edit2 = StringEdit.replace(new OffsetRange(0, 2), '');
        vas.applyEdit(edit1.compose(edit2));
        assertVisual(vas, '[1:XXem] ipsum [2:dolor] sit [3:amet]');
    });
    test('applyEdit 9 - insertion at end of annotation', () => {
        const result = visualizeEdit('[1:Lorem] ipsum [2:dolor] sit [3:amet]', editInsert(17, 'XXX'));
        assert.strictEqual(result.after, '[1:Lorem] ipsum [2:dolor]XXX sit [3:amet]');
    });
    test('applyEdit 10 - insertion in middle of annotation', () => {
        const result = visualizeEdit('[1:Lorem] ipsum [2:dolor] sit [3:amet]', editInsert(14, 'XXX'));
        assert.strictEqual(result.after, '[1:Lorem] ipsum [2:doXXXlor] sit [3:amet]');
    });
    test('applyEdit 11 - replacement consuming annotation', () => {
        const result = visualizeEdit('[1:L]o[2:rem] [3:i]', editReplace(1, 6, 'X'));
        assert.strictEqual(result.after, '[1:L]X[3:i]');
    });
    test('applyEdit 12 - multiple disjoint edits', () => {
        const vas = fromVisual('[1:Lorem] ipsum [2:dolor] sit [3:amet!] [4:done]');
        const edit = StringEdit.compose([
            StringEdit.insert(0, 'X'),
            StringEdit.delete(new OffsetRange(12, 13)),
            StringEdit.replace(new OffsetRange(21, 22), 'YY'),
            StringEdit.replace(new OffsetRange(28, 32), 'Z')
        ]);
        vas.applyEdit(edit);
        assertVisual(vas, 'X[1:Lorem] ipsum[2:dolor] sitYY[3:amet!]Z[4:e]');
    });
    test('applyEdit 13 - edit on the left border', () => {
        const result = visualizeEdit('lorem ipsum dolor[1: ]', editInsert(17, 'X'));
        assert.strictEqual(result.after, 'lorem ipsum dolorX[1: ]');
    });
    test('rebase', () => {
        const a = new VisualAnnotatedString(new AnnotatedString([{ range: new OffsetRange(2, 5), annotation: '1' }]), 'sitamet');
        const b = a.clone();
        const update = AnnotationsUpdate.create([{ range: new OffsetRange(4, 5), annotation: '2' }]);
        b.setAnnotations(update);
        const edit = StringEdit.replace(new OffsetRange(1, 6), 'XXX');
        a.applyEdit(edit);
        b.applyEdit(edit);
        update.rebase(edit);
        a.setAnnotations(update);
        assert.deepStrictEqual(a.getAllAnnotations(), b.getAllAnnotations());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYW5ub3RhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBa0MsTUFBTSw2Q0FBNkMsQ0FBQztBQUNqSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXRFLCtFQUErRTtBQUMvRSx3Q0FBd0M7QUFDeEMsK0VBQStFO0FBQy9FLCtFQUErRTtBQUMvRSxzRUFBc0U7QUFDdEUsOENBQThDO0FBQzlDLEVBQUU7QUFDRiw0REFBNEQ7QUFDNUQsc0RBQXNEO0FBQ3RELHFEQUFxRDtBQUNyRCxFQUFFO0FBQ0YsZUFBZTtBQUNmLG1DQUFtQztBQUNuQyxvREFBb0Q7QUFDcEQsK0VBQStFO0FBRS9FOzs7O0dBSUc7QUFDSCxTQUFTLHNCQUFzQixDQUFDLE1BQWM7SUFDN0MsTUFBTSxXQUFXLEdBQTBCLEVBQUUsQ0FBQztJQUM5QyxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRVYsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLHFDQUFxQztZQUNyQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdB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
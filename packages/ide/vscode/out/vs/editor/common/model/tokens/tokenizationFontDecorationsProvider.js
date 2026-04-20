/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../core/range.js';
import { LineFontChangingDecoration, LineHeightChangingDecoration } from '../decorationProvider.js';
import { Emitter } from '../../../../base/common/event.js';
import { classNameForFontTokenDecorations } from '../../languages/supports/tokenization.js';
import { Position } from '../../core/position.js';
import { AnnotatedString, AnnotationsUpdate } from './annotations.js';
import { OffsetRange } from '../../core/ranges/offsetRange.js';
import { offsetEditFromContentChanges } from '../textModelStringEdit.js';
export class TokenizationFontDecorationProvider extends Disposable {
    static { this.DECORATION_COUNT = 0; }
    constructor(textModel, tokenizationTextModelPart) {
        super();
        this.textModel = textModel;
        this.tokenizationTextModelPart = tokenizationTextModelPart;
        this._onDidChangeLineHeight = new Emitter();
        this.onDidChangeLineHeight = this._onDidChangeLineHeight.event;
        this._onDidChangeFont = new Emitter();
        this.onDidChangeFont = this._onDidChangeFont.event;
        this._fontAnnotatedString = new AnnotatedString();
        this._register(this.tokenizationTextModelPart.onDidChangeFontTokens(fontChanges => {
            const linesChanged = new Set();
            const fontTokenAnnotations = [];
            const affectedLineHeights = new Set();
            const affectedLineFonts = new Set();
            for (const annotation of fontChanges.changes.annotations) {
                const startPosition = this.textModel.getPositionAt(annotation.range.start);
                const endPosition = this.textModel.getPositionAt(annotation.range.endExclusive);
                if (startPosition.lineNumber !== endPosition.lineNumber) {
                    // The token should be always on a single line
                    continue;
                }
                const lineNumber = startPosition.lineNumber;
                let fontTokenAnnotation;
                if (annotation.annotation === undefined) {
                    fontTokenAnnotation = {
                        range: annotation.range,
                        annotation: undefined
                    };
                }
                else {
                    const decorationId = `tokenization-font-decoration-${TokenizationFontDecorationProvider.DECORATION_COUNT}`;
                    const fontTokenDecoration = {
                        fontToken: annotation.annotation,
                        decorationId
                    };
                    fontTokenAnnotation = {
                        range: annotation.range,
                        annotation: fontTokenDecoration
                    };
                    TokenizationFontDecorationProvider.DECORATION_COUNT++;
                    if (annotation.annotation.lineHeight) {
                        affectedLineHeights.add(new LineHeightChangingDecoration(0, decorationId, lineNumber, annotation.annotation.lineHeight));
                    }
                    affectedLineFonts.add(new LineFontChangingDecoration(0, decorationId, lineNumber));
                }
                fontTokenAnnotations.push(fontTokenAnnotation);
                if (!linesChanged.has(lineNumber)) {
                    // Signal the removal of the font tokenization decorations on the line number
                    const lineNumberStartOffset = this.textModel.getOffsetAt(new Position(lineNumber, 1));
                    const lineNumberEndOffset = this.textModel.getOffsetAt(new Position(lineNumber, this.textModel.getLineMaxColumn(lineNumber)));
                    const lineOffsetRange = new OffsetRange(lineNumberStartOffset, lineNumberEndOffset);
                    const lineAnnotations = this._fontAnnotatedString.getAnnotationsIntersecting(lineOffsetRange);
                    for (const annotation of lineAnnotations) {
                        const decorationId = annotation.annotation.decorationId;
                        affectedLineHeights.add(new LineHeightChangingDecoration(0, decorationId, lineNumber, null));
                        affectedLineFonts.add(new LineFontChangingDecoration(0, decorationId, lineNumber));
                    }
                    linesChanged.add(lineNumber);
                }
            }
            this._fontAnnotatedString.setAnnotations(AnnotationsUpdate.create(fontTokenAnnotations));
            this._onDidChangeLineHeight.fire(affectedLineHeights);
            this._onDidChangeFont.fire(affectedLineFonts);
        }));
    }
    handleDidChangeContent(change) {
        const edits = offsetEditFromContentChanges(change.changes);
        const deletedAnnotations = this._fontAnnotatedString.applyEdit(edits);
        if (deletedAnnotations.length === 0) {
            return;
        }
        /* We should fire line and font change events if decorations have been added or removed
         * No decorations are added on edit, but they can be removed */
        const affectedLineHeights = new Set();
        const affectedLineFonts = new Set();
        for (const deletedAnnotation of deletedAnnotations) {
            const startPosition = this.textModel.getPositionAt(deletedAnnotation.range.start);
            const lineNumber = startPosition.lineNumber;
            const decorationId = deletedAnnotation.annotation.decorationId;
            affectedLineHeights.add(new LineHeightChangingDecoration(0, decorationId, lineNumber, null));
            affectedLineFonts.add(new LineFontChangingDecoration(0, decorationId, lineNumber));
        }
        this._onDidChangeLineHeight.fire(affectedLineHeights);
        this._onDidChangeFont.fire(affectedLineFonts);
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations) {
        const startOffsetOfRange = this.textModel.getOffsetAt(range.getStartPosition());
        const endOffsetOfRange = this.textModel.getOffsetAt(range.getEndPosition());
        const annotations = this._fontAnnotatedString.getAnnotationsIntersecting(new OffsetRange(startOffsetOfRange, endOffsetOfRange));
        const decorations = [];
        for (const annotation of annotations) {
            const annotationStartPosition = this.textModel.getPositionAt(annotation.range.start);
            const annotationEndPosition = this.textModel.getPositionAt(annotation.range.endExclusive);
            const range = Range.fromPositions(annotationStartPosition, annotationEndPosition);
            const anno = annotation.annotation;
            const className = classNameForFontTokenDecorations(anno.fontToken.fontFamily ?? '', anno.fontToken.fontSize ?? '');
            const affectsFont = !!(anno.fontToken.fontFamily || anno.fontToken.fontSize);
            const id = anno.decorationId;
            decorations.push({
                id: id,
                options: {
                    description: 'FontOptionDecoration',
                    inlineClassName: className,
                    affectsFont
                },
                ownerId: 0,
                range
            });
        }
        return decorations;
    }
    getAllDecorations(ownerId, filterOutValidation) {
        return this.getDecorationsInRange(new Range(1, 1, this.textModel.getLineCount(), 1), ownerId, filterOutValidation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uRm9udERlY29yYXRpb25zUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90b2tlbnMvdG9rZW5pemF0aW9uRm9udERlY29yYXRpb25zUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1QyxPQUFPLEVBQXNCLDBCQUEwQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUF1QyxNQUFNLGtCQUFrQixDQUFDO0FBQzNHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQU96RSxNQUFNLE9BQU8sa0NBQW1DLFNBQVEsVUFBVTthQUVsRCxxQkFBZ0IsR0FBRyxDQUFDLEFBQUosQ0FBSztJQVVwQyxZQUNrQixTQUFxQixFQUNyQix5QkFBb0Q7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFIUyxjQUFTLEdBQVQsU0FBUyxDQUFZO1FBQ3JCLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBMkI7UUFWckQsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQXFDLENBQUM7UUFDM0UsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFz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
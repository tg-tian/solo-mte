/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { raceTimeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { LcsDiff, StringDiffSequence } from '../../../../../base/common/diff/diff.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IBulkEditService } from '../../../../browser/services/bulkEditService.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { EditSources } from '../../../../common/textModelEditSource.js';
import { hasProvider, rawRename } from '../../../rename/browser/rename.js';
import { renameSymbolCommandId } from '../controller/commandIds.js';
import { InlineSuggestionItem } from './inlineSuggestionItem.js';
import { Codicon } from '../../../../../base/common/codicons.js';
var RenameKind;
(function (RenameKind) {
    RenameKind["no"] = "no";
    RenameKind["yes"] = "yes";
    RenameKind["maybe"] = "maybe";
})(RenameKind || (RenameKind = {}));
(function (RenameKind) {
    function fromString(value) {
        switch (value) {
            case 'no': return RenameKind.no;
            case 'yes': return RenameKind.yes;
            case 'maybe': return RenameKind.maybe;
            default: return RenameKind.no;
        }
    }
    RenameKind.fromString = fromString;
})(RenameKind || (RenameKind = {}));
export class RenameInferenceEngine {
    constructor() {
    }
    inferRename(textModel, editRange, insertText, wordDefinition) {
        // Extend the edit range to full lines to capture prefix/suffix renames
        const extendedRange = new Range(editRange.startLineNumber, 1, editRange.endLineNumber, textModel.getLineMaxColumn(editRange.endLineNumber));
        const startDiff = editRange.startColumn - extendedRange.startColumn;
        const endDiff = extendedRange.endColumn - editRange.endColumn;
        const originalText = textModel.getValueInRange(extendedRange);
        const modifiedText = textModel.getValueInRange(new Range(extendedRange.startLineNumber, extendedRange.startColumn, extendedRange.startLineNumber, extendedRange.startColumn + startDiff)) +
            insertText +
            textModel.getValueInRange(new Range(extendedRange.endLineNumber, extendedRange.endColumn - endDiff, extendedRange.endLineNumber, extendedRange.endColumn));
        // console.log(`Original: ${originalText} \nmodified: ${modifiedText}`);
        const others = [];
        const renames = [];
        let oldName = undefined;
        let newName = undefined;
        let position = undefined;
        const nesOffset = textModel.getOffsetAt(extendedRange.getStartPosition());
        const { changes: originalChanges } = (new LcsDiff(new StringDiffSequence(originalText), new StringDiffSequence(modifiedText))).ComputeDiff(true);
        if (originalChanges.length === 0) {
            return undefined;
        }
        // Fold the changes to larger changes if the gap between two changes is a full word. This covers cases like renaming
        // `foo` to `abcfoobar`
        const changes = [];
        for (const change of originalChanges) {
            if (changes.length === 0) {
                changes.push(change);
                continue;
            }
            const lastChange = changes[changes.length - 1];
            const gapOriginalLength = change.originalStart - (lastChange.originalStart + lastChange.originalLength);
            if (gapOriginalLength > 0) {
                const gapStartOffset = nesOffset + lastChange.originalStart + lastChange.originalLength;
                const gapStartPos = textModel.getPositionAt(gapStartOffset);
                const wordRange = textModel.getWordAtPosition(gapStartPos);
                if (wordRange) {
                    const wordStartOffset = textModel.getOffsetAt(new Position(gapStartPos.lineNumber, wordRange.startColumn));
                    const wordEndOffset = textModel.getOffsetAt(new Position(gapStartPos.lineNumber, wordRange.endColumn));
                    const gapEndOffset = gapStartOffset + gapOriginalLength;
                    if (wordStartOffset <= gapStartOffset && gapEndOffset <= wordEndOffset && wordStartOffset <= gapEndOffset && gapEndOffset <= wordEndOffset) {
                        lastChange.originalLength = (change.originalStart + change.originalLength) - lastChange.originalStart;
                        lastChange.modifiedLength = (change.modifiedStart + change.modifiedLength) - lastChange.modifiedStart;
                        continue;
                    }
                }
            }
            changes.push(change);
        }
        let tokenDiff = 0;
        for (const change of changes) {
            const originalTextSegment = originalText.substring(change.originalStart, change.originalStart + change.originalLength);
            const insertedTextSegment = modifiedText.substring(change.modifiedStart, change.modifiedStart + change.modifiedLength);
            const startOffset = nesOffset + change.originalStart;
            const startPos = textModel.getPositionAt(startOffset);
            const endOffset = startOffset + change.originalLength;
            const endPos = textModel.getPositionAt(endOffset);
            const range = Range.fromPositions(startPos, endPos);
            const diff = insertedTextSegment.length - change.originalLength;
            // If the original text segment contains a whitespace character we don't consider this a rename since
            // identifiers in programming languages can't contain whitespace characters usually
            if (/\s/.test(originalTextSegment)) {
                others.push(new TextReplacement(range, insertedTextSegment));
                tokenDiff += diff;
                continue;
            }
            if (originalTextSegment.length > 0) {
                wordDefinition.lastIndex = 0;
                const match = wordDefinition.exec(originalTextSegment);
                if (match === null || match.index !== 0 || match[0].length !== originalTextSegment.length) {
                    others.push(new TextReplacement(range, insertedTextSegment));
                    tokenDiff += diff;
                    continue;
                }
            }
            // If the inserted text contains a whitespace character we don't consider this a rename since identifiers in
            // programming languages can't contain whitespace characters usually
            if (/\s/.test(insertedTextSegment)) {
                others.push(new TextReplacement(range, insertedTextSegment));
                tokenDiff += diff;
                continue;
            }
            if (insertedTextSegment.length > 0) {
                wordDefinition.lastIndex = 0;
                const match = wordDefinition.exec(insertedTextSegment);
                if (match === null || match.index !== 0 || match[0].length !== insertedTextSegment.length) {
                    others.push(new TextReplacement(range, insertedTextSegment));
                    tokenDiff += diff;
                    continue;
                }
            }
            const wordRange = textModel.getWordAtPosition(startPos);
            // If we don't have a word range at the start position of the current document then we
            // don't treat it as a rename assuming that the rename refactoring will fail as well since
            // there can't be an identifier at that position.
            if (wordRange === null) {
                others.push(new TextReplacement(range, insertedTextSegment));
                tokenDiff += diff;
                continue;
            }
            const originalStartColumn = change.originalStart + 1;
            const isInsertion = change.originalLength === 0 && change.modifiedLength > 0;
            let tokenInfo;
            // Word info is left aligned whereas token info is right aligned for insertions.
            // We prefer a suffix insertion for renames so we take the word range for the token info.
            if (isInsertion && originalStartColumn === wordRange.endColumn && wordRange.endColumn > wordRange.startColumn) {
                tokenInfo = this.getTokenAtPosition(textModel, new Position(startPos.lineNumber, wordRange.startColumn));
            }
            else {
                tokenInfo = this.getTokenAtPosition(textModel, startPos);
            }
            if (wordRange.startColumn !== tokenInfo.range.startColumn || wordRange.endColumn !== tokenInfo.range.endColumn) {
                others.push(new TextReplacement(range, insertedTextSegment));
                tokenDiff += diff;
                continue;
            }
            if (tokenInfo.type === 0 /* StandardTokenType.Other */) {
                let identifier = textModel.getValueInRange(tokenInfo.range);
                if (identifier.length === 0) {
                    others.push(new TextReplacement(range, insertedTextSegment));
                    tokenDiff += diff;
                    continue;
                }
                if (oldName === undefined) {
                    oldName = identifier;
                }
                else if (oldName !== identifier) {
                    others.push(new TextReplacement(range, insertedTextSegment));
                    tokenDiff += diff;
                    continue;
                }
                // We assume that the new name starts at the same position as the old name from a token range perspective.
                const tokenStartPos = textModel.getOffsetAt(tokenInfo.range.getStartPosition()) - nesOffset + tokenDiff;
                const tokenEndPos = textModel.getOffsetAt(tokenInfo.range.getEndPosition()) - nesOffset + tokenDiff;
                identifier = modifiedText.substring(tokenStartPos, tokenEndPos + diff);
                if (identifier.length === 0) {
                    others.push(new TextReplacement(range, insertedTextSegment));
                    tokenDiff += diff;
                    continue;
                }
                if (newName === undefined) {
                    newName = identifier;
                }
                else if (newName !== identifier) {
                    others.push(new TextReplacement(range, insertedTextSegment));
                    tokenDiff += diff;
                    continue;
                }
                if (position === undefined) {
                    position = tokenInfo.range.getStartPosition();
                }
                if (oldName !== undefined && newName !== undefined && oldName.length > 0 && newName.length > 0 && oldName !== newName) {
                    renames.push(new TextReplacement(tokenInfo.range, newName));
                }
                else {
                    renames.push(new TextReplacement(range, insertedTextSegment));
                }
                tokenDiff += diff;
            }
            else {
                others.push(new TextReplacement(range, insertedTextSegment));
                tokenDiff += insertedTextSegment.length - change.originalLength;
            }
        }
        if (oldName === undefined || newName === undefined || position === undefined || oldName.length === 0 || newName.length === 0 || oldName === newName) {
            return undefined;
        }
        wordDefinition.lastIndex = 0;
        let match = wordDefinition.exec(oldName);
        if (match === null || match.index !== 0 || match[0].length !== oldName.length) {
            return undefined;
        }
        wordDefinition.lastIndex = 0;
        match = wordDefinition.exec(newName);
        if (match === null || match.index !== 0 || match[0].length !== newName.length) {
            return undefined;
        }
        return {
            renames: { edits: renames, position, oldName, newName },
            others: { edits: others }
        };
    }
    getTokenAtPosition(textModel, position) {
        textModel.tokenization.tokenizeIfCheap(position.lineNumber);
        const tokens = textModel.tokenization.getLineTokens(position.lineNumber);
        const idx = tokens.findTokenIndexAtOffset(position.column - 1);
        return {
            type: tokens.getStandardTokenType(idx),
            range: new Range(position.lineNumber, 1 + tokens.getStartOffset(idx), position.lineNumber, 1 + tokens.getEndOffset(idx))
        };
    }
}
class RenameSymbolRunnable {
    constructor(languageFeaturesService, textModel, position, newName) {
        this._result = undefined;
        this._cancellationTokenSource = new CancellationTokenSource();
        this._promise = rawRename(languageFeaturesService.renameProvider, textModel, position, newName, this._cancellationTokenSource.token);
    }
    cancel() {
        this._cancellationTokenSource.cancel();
    }
    async getCount() {
        const result = await this.getResult();
        if (result === undefined) {
            return 0;
        }
        return result.edits.length;
    }
    async getWorkspaceEdit() {
        return this.getResult();
    }
    async getResult() {
        if (this._result === undefined) {
            this._result = await this._promise;
        }
        if (this._result.rejectReason) {
            return undefined;
        }
        return this._result;
    }
}
let RenameSymbolProcessor = class RenameSymbolProcessor extends Disposable {
    constructor(_commandService, _languageFeaturesService, _languageConfigurationService, bulkEditService) {
        super();
        this._commandService = _commandService;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._renameInferenceEngine = new RenameInferenceEngine();
        const self = this;
        this._register(CommandsRegistry.registerCommand(renameSymbolCommandId, async (_, textModel, position, newName, source, id) => {
            if (self._renameRunnable === undefined) {
                return;
            }
            let workspaceEdit;
            if (self._renameRunnable.id !== id) {
                self._renameRunnable.runnable.cancel();
                self._renameRunnable = undefined;
                const runnable = new RenameSymbolRunnable(self._languageFeaturesService, textModel, position, newName);
                workspaceEdit = await runnable.getWorkspaceEdit();
            }
            else {
                workspaceEdit = await self._renameRunnable.runnable.getWorkspaceEdit();
                self._renameRunnable = undefined;
            }
            if (workspaceEdit === undefined) {
                return;
            }
            bulkEditService.apply(workspaceEdit, { reason: source });
        }));
    }
    async proposeRenameRefactoring(textModel, suggestItem, context) {
        if (!suggestItem.supportsRename || suggestItem.action?.kind !== 'edit' || context.selectedSuggestionInfo) {
            return suggestItem;
        }
        if (!hasProvider(this._languageFeaturesService.renameProvider, textModel)) {
            return suggestItem;
        }
        const start = Date.now();
        const edit = suggestItem.action.textReplacement;
        const languageConfiguration = this._languageConfigurationService.getLanguageConfiguration(textModel.getLanguageId());
        // Check synchronously if a rename is possible
        const edits = this._renameInferenceEngine.inferRename(textModel, edit.range, edit.text, languageConfiguration.wordDefinition);
        if (edits === undefined || edits.renames.edits.length === 0) {
            return suggestItem;
        }
        const { oldName, newName, position, edits: renameEdits } = edits.renames;
        // Check asynchronously if a rename is possible
        let timedOut = false;
        const check = await raceTimeout(this.checkRenamePrecondition(suggestItem, textModel, position, oldName, newName), 100, () => { timedOut = true; });
        const renamePossible = check === RenameKind.yes || check === RenameKind.maybe;
        suggestItem.setRenameProcessingInfo({
            createdRename: renamePossible,
            duration: Date.now() - start,
            timedOut,
            droppedOtherEdits: renamePossible ? edits.others.edits.length : undefined,
            droppedRenameEdits: renamePossible ? renameEdits.length - 1 : undefined,
        });
        if (!renamePossible) {
            return suggestItem;
        }
        // Prepare the rename edits
        const id = suggestItem.identity.id;
        if (this._renameRunnable !== undefined) {
            this._renameRunnable.runnable.cancel();
            this._renameRunnable = undefined;
        }
        const runnable = new RenameSymbolRunnable(this._languageFeaturesService, textModel, position, newName);
        this._renameRunnable = { id, runnable };
        // Create alternative action
        const source = EditSources.inlineCompletionAccept({
            nes: suggestItem.isInlineEdit,
            requestUuid: suggestItem.requestUuid,
            providerId: suggestItem.source.provider.providerId,
            languageId: textModel.getLanguageId(),
            correlationId: suggestItem.getSourceCompletion().correlationId,
        });
        const command = {
            id: renameSymbolCommandId,
            title: localize('rename', "Rename"),
            arguments: [textModel, position, newName, source, id],
        };
        const alternativeAction = {
            label: localize('rename', "Rename"),
            icon: Codicon.replaceAll,
            command,
            count: runnable.getCount(),
        };
        const renameAction = {
            kind: 'edit',
            range: renameEdits[0].range,
            insertText: renameEdits[0].text,
            snippetInfo: suggestItem.snippetInfo,
            alternativeAction,
            uri: textModel.uri
        };
        return InlineSuggestionItem.create(suggestItem.withAction(renameAction), textModel, false);
    }
    async checkRenamePrecondition(suggestItem, textModel, position, oldName, newName) {
        // const result = await prepareRename(this._languageFeaturesService.renameProvider, textModel, position, CancellationToken.None);
        // if (result === undefined || result.rejectReason) {
        // 	return RenameKind.no;
        // }
        // return oldName === result.text ? RenameKind.yes : RenameKind.no;
        try {
            const result = await this._commandService.executeCommand('github.copilot.nes.prepareRename', textModel.uri, position, oldName, newName, suggestItem.requestUuid);
            if (result === undefined) {
                return RenameKind.no;
            }
            else {
                return RenameKind.fromString(result);
            }
        }
        catch (error) {
            return RenameKind.no;
        }
    }
};
RenameSymbolProcessor = __decorate([
    __param(0, ICommandService),
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageConfigurationService),
    __param(3, IBulkEditService)
], RenameSymbolProcessor);
export { RenameSymbolProcessor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lU3ltYm9sUHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvcmVuYW1lU3ltYm9sUHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFeEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFOUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBdUIsTUFBTSwyQ0FBMkMsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxxQkFB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
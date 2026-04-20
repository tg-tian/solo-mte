/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { AsyncIterableProducer } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { BugIndicatingError, onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { prefixedUuid } from '../../../../../base/common/uuid.js';
import { StringReplacement } from '../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletionEndOfLifeReasonKind } from '../../../../common/languages.js';
import { fixBracketsInLine } from '../../../../common/model/bracketPairsTextModelPart/fixBrackets.js';
import { SnippetParser, Text } from '../../../snippet/browser/snippetParser.js';
import { ErrorResult, getReadonlyEmptyArray } from '../utils.js';
import { groupByMap } from '../../../../../base/common/collections.js';
import { DirectedGraph } from './graph.js';
import { CachedFunction } from '../../../../../base/common/cache.js';
import { InlineCompletionViewKind } from '../view/inlineEdits/inlineEditsViewInterface.js';
import { isDefined } from '../../../../../base/common/types.js';
import { inlineCompletionIsVisible } from './inlineCompletionIsVisible.js';
import { EditDeltaInfo } from '../../../../common/textModelEditSource.js';
import { URI } from '../../../../../base/common/uri.js';
export function provideInlineCompletions(providers, position, model, context, requestInfo, languageConfigurationService) {
    const requestUuid = prefixedUuid('icr');
    const cancellationTokenSource = new CancellationTokenSource();
    let cancelReason = undefined;
    const contextWithUuid = { ...context, requestUuid: requestUuid };
    const defaultReplaceRange = getDefaultRange(position, model);
    const providersByGroupId = groupByMap(providers, p => p.groupId);
    const yieldsToGraph = DirectedGraph.from(providers, p => {
        return p.yieldsToGroupIds?.flatMap(groupId => providersByGroupId.get(groupId) ?? []) ?? [];
    });
    const { foundCycles } = yieldsToGraph.removeCycles();
    if (foundCycles.length > 0) {
        onUnexpectedExternalError(new Error(`Inline completions: cyclic yield-to dependency detected.`
            + ` Path: ${foundCycles.map(s => s.toString ? s.toString() : ('' + s)).join(' -> ')}`));
    }
    let runningCount = 0;
    const queryProvider = new CachedFunction(async (provider) => {
        try {
            runningCount++;
            if (cancellationTokenSource.token.isCancellationRequested) {
                return undefined;
            }
            const yieldsTo = yieldsToGraph.getOutgoing(provider);
            for (const p of yieldsTo) {
                // We know there is no cycle, so no recursion here
                const result = await queryProvider.get(p);
                if (result) {
                    for (const item of result.inlineSuggestions.items) {
                        if (item.isInlineEdit || typeof item.insertText !== 'string' && item.insertText !== undefined) {
                            return undefined;
                        }
                        if (item.insertText !== undefined) {
                            const t = new TextReplacement(Range.lift(item.range) ?? defaultReplaceRange, item.insertText);
                            if (inlineCompletionIsVisible(t, undefined, model, position)) {
                                return undefined;
                            }
                        }
                        // else: inline completion is not visible, so lets not block
                    }
                }
            }
            let result;
            const providerStartTime = Date.now();
            try {
                result = await provider.provideInlineCompletions(model, position, contextWithUuid, cancellationTokenSource.token);
            }
            catch (e) {
                onUnexpectedExternalError(e);
                return undefined;
            }
            const providerEndTime = Date.now();
            if (!result) {
                return undefined;
            }
            const data = [];
            const list = new InlineSuggestionList(result, data, provider);
            list.addRef();
            runWhenCancelled(cancellationTokenSource.token, () => {
                return list.removeRef(cancelReason);
            });
            if (cancellationTokenSource.token.isCancellationRequested) {
                return undefined; // The list is disposed now, so we cannot return the items!
            }
            for (const item of result.items) {
                const r = toInlineSuggestData(item, list, defaultReplaceRange, model, languageConfigurationService, contextWithUuid, requestInfo, { startTime: providerStartTime, endTime: providerEndTime });
                if (ErrorResult.is(r)) {
                    r.logError();
                    continue;
                }
                data.push(r);
            }
            return list;
        }
        finally {
            runningCount--;
        }
    });
    const inlineCompletionLists = AsyncIterableProducer.fromPromisesResolveOrder(providers.map(p => queryProvider.get(p))).filter(isDefined);
    return {
        contextWithUuid,
        get didAllProvidersReturn() { return runningCount === 0; },
        lists: inlineCompletionLists,
        cancelAndDispose: reason => {
            if (cancelReason !== undefined) {
                return;
            }
            cancelReason = reason;
            cancellationTokenSource.dispose(true);
        }
    };
}
/** If the token is eventually cancelled, this will not leak either. */
export function runWhenCancelled(token, callback) {
    if (token.isCancellationRequested) {
        callback();
        return Disposable.None;
    }
    else {
        const listener = token.onCancellationRequested(() => {
            listener.dispose();
            callback();
        });
        return { dispose: () => listener.dispose() };
    }
}
function toInlineSuggestData(inlineCompletion, source, defaultReplaceRange, textModel, languageConfigurationService, context, requestInfo, providerRequestInfo) {
    let action;
    const uri = inlineCompletion.uri ? URI.revive(inlineCompletion.uri) : undefined;
    if (inlineCompletion.jumpToPosition !== undefined) {
        action = {
            kind: 'jumpTo',
            position: Position.lift(inlineCompletion.jumpToPosition),
            uri,
        };
    }
    else if (inlineCompletion.insertText !== undefined) {
        let insertText;
        let snippetInfo;
        let range = inlineCompletion.range ? Range.lift(inlineCompletion.range) : defaultReplaceRange;
        if (typeof inlineCompletion.insertText === 'string') {
            insertText = inlineCompletion.insertText;
            if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
                insertText = closeBrackets(insertText, range.getStartPosition(), textModel, languageConfigurationService);
                // Modify range depending on if brackets are added or removed
                const diff = insertText.length - inlineCompletion.insertText.length;
                if (diff !== 0) {
                    range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
                }
            }
            snippetInfo = undefined;
        }
        else if ('snippet' in inlineCompletion.insertText) {
            const preBracketCompletionLength = inlineCompletion.insertText.snippet.length;
            if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
                inlineCompletion.insertText.snippet = closeBrackets(inlineCompletion.insertText.snippet, range.getStartPosition(), textModel, languageConfigurationService);
                // Modify range depending on if brackets are added or removed
                const diff = inlineCompletion.insertText.snippet.length - preBracketCompletionLength;
                if (diff !== 0) {
                    range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
                }
            }
            const snippet = new SnippetParser().parse(inlineCompletion.insertText.snippet);
            if (snippet.children.length === 1 && snippet.children[0] instanceof Text) {
                insertText = snippet.children[0].value;
                snippetInfo = undefined;
            }
            else {
                insertText = snippet.toString();
                snippetInfo = {
                    snippet: inlineCompletion.insertText.snippet,
                    range: range
                };
            }
        }
        else {
            assertNever(inlineCompletion.insertText);
        }
        action = {
            kind: 'edit',
            range,
            insertText,
            snippetInfo,
            uri,
            alternativeAction: undefined,
        };
    }
    else {
        action = undefined;
        if (!inlineCompletion.hint) {
            return ErrorResult.message('Inline completion has no insertText, jumpToPosition nor hint.');
        }
    }
    return new InlineSuggestData(action, inlineCompletion.hint, inlineCompletion.additionalTextEdits || getReadonlyEmptyArray(), inlineCompletion, source, context, inlineCompletion.isInlineEdit ?? false, inlineCompletion.supportsRename ?? false, requestInfo, providerRequestInfo, inlineCompletion.correlationId);
}
export class InlineSuggestData {
    get action() {
        return this._action;
    }
    constructor(_action, hint, additionalTextEdits, sourceInlineCompletion, source, context, isInlineEdit, supportsRename, _requestInfo, _providerRequestInfo, _correlationId) {
        this._action = _action;
        this.hint = hint;
        this.additionalTextEdits = additionalTextEdits;
        this.sourceInlineCompletion = sourceInlineCompletion;
        this.source = source;
        this.context = context;
        this.isInlineEdit = isInlineEdit;
        this.supportsRename = supportsRename;
        this._requestInfo = _requestInfo;
        this._providerRequestInfo = _providerRequestInfo;
        this._correlationId = _correlationId;
        this._didShow = false;
        this._timeUntilShown = undefined;
        this._timeUntilActuallyShown = undefined;
        this._showStartTime = undefined;
        this._shownDuration = 0;
        this._showUncollapsedStartTime = undefined;
        this._showUncollapsedDuration = 0;
        this._notShownReason = undefined;
        this._didReportEndOfLife = false;
        this._lastSetEndOfLifeReason = undefined;
        this._isPreceeded = false;
        this._partiallyAcceptedCount = 0;
        this._partiallyAcceptedSinceOriginal = { characters: 0, ratio: 0, count: 0 };
        this._renameInfo = undefined;
        this._editKind = undefined;
        this.performance = new InlineSuggestionsPerformance();
        this._viewData = { editorType: _requestInfo.editorType };
    }
    get showInlineEditMenu() { return this.sourceInlineCompletion.showInlineEditMenu ?? false; }
    get partialAccepts() { return this._partiallyAcceptedSinceOriginal; }
    async reportInlineEditShown(commandService, updatedInsertText, viewKind, viewData, editKind, timeWhenShown) {
        this.updateShownDuration(viewKind);
        if (this._didShow) {
            return;
        }
        this.addPerformanceMarker('shown');
        this._didShow = true;
        this._editKind = editKind;
        this._viewData.viewKind = viewKind;
        this._viewData.renderData = viewData;
        this._timeUntilShown = timeWhenShown - this._requestInfo.startTime;
        this._timeUntilActuallyShown = Date.now() - this._requestInfo.startTime;
        const editDeltaInfo = new EditDeltaInfo(viewData.lineCountModified, viewData.lineCountOriginal, viewData.characterCountModified, viewData.characterCountOriginal);
        this.source.provider.handleItemDidShow?.(this.source.inlineSuggestions, this.sourceInlineCompletion, updatedInsertText, editDeltaInfo);
        if (this.sourceInlineCompletion.shownCommand) {
            await commandService.executeCommand(this.sourceInlineCompletion.shownCommand.id, ...(this.sourceInlineCompletion.shownCommand.arguments || []));
        }
    }
    reportPartialAccept(acceptedCharacters, info, partialAcceptance) {
        this._partiallyAcceptedCount++;
        this._partiallyAcceptedSinceOriginal.characters += partialAcceptance.characters;
        this._partiallyAcceptedSinceOriginal.ratio = Math.min(this._partiallyAcceptedSinceOriginal.ratio + (1 - this._partiallyAcceptedSinceOriginal.ratio) * partialAcceptance.ratio, 1);
        this._partiallyAcceptedSinceOriginal.count += partialAcceptance.count;
        this.source.provider.handlePartialAccept?.(this.source.inlineSuggestions, this.sourceInlineCompletion, acceptedCharacters, info);
    }
    /**
     * Sends the end of life event to the provider.
     * If no reason is provided, the last set reason is used.
     * If no reason was set, the default reason is used.
    */
    reportEndOfLife(reason) {
        if (this._didReportEndOfLife) {
            return;
        }
        this._didReportEndOfLife = true;
        this.reportInlineEditHidden();
        if (!reason) {
            reason = this._lastSetEndOfLifeReason ?? { kind: InlineCompletionEndOfLifeReasonKind.Ignored, userTypingDisagreed: false, supersededBy: undefined };
        }
        if (reason.kind === InlineCompletionEndOfLifeReasonKind.Rejected && this.source.provider.handleRejection) {
            this.source.provider.handleRejection(this.source.inlineSuggestions, this.sourceInlineCompletion);
        }
        if (this.source.provider.handleEndOfLifetime) {
            const summary = {
                requestUuid: this.context.requestUuid,
                correlationId: this._correlationId,
                selectedSuggestionInfo: !!this.context.selectedSuggestionInfo,
                partiallyAccepted: this._partiallyAcceptedCount,
                partiallyAcceptedCountSinceOriginal: this._partiallyAcceptedSinceOriginal.count,
                partiallyAcceptedRatioSinceOriginal: this._partiallyAcceptedSinceOriginal.ratio,
                partiallyAcceptedCharactersSinceOriginal: this._partiallyAcceptedSinceOriginal.characters,
                shown: this._didShow,
                shownDuration: this._shownDuration,
                shownDurationUncollapsed: this._showUncollapsedDuration,
                editKind: this._editKind?.toString(),
                preceeded: this._isPreceeded,
                timeUntilShown: this._timeUntilShown,
                timeUntilActuallyShown: this._timeUntilActuallyShown,
                timeUntilProviderRequest: this._providerRequestInfo.startTime - this._requestInfo.startTime,
                timeUntilProviderResponse: this._providerRequestInfo.endTime - this._requestInfo.startTime,
                editorType: this._viewData.editorType,
                languageId: this._requestInfo.languageId,
                requestReason: this._requestInfo.reason,
                viewKind: this._viewData.viewKind,
                notShownReason: this._notShownReason,
                performanceMarkers: this.performance.toString(),
                renameCreated: this._renameInfo?.createdRename,
                renameDuration: this._renameInfo?.duration,
                renameTimedOut: this._renameInfo?.timedOut,
                renameDroppedOtherEdits: this._renameInfo?.droppedOtherEdits,
                renameDroppedRenameEdits: this._renameInfo?.droppedRenameEdits,
                typingInterval: this._requestInfo.typingInterval,
                typingIntervalCharacterCount: this._requestInfo.typingIntervalCharacterCount,
                skuPlan: this._requestInfo.sku?.plan,
                skuType: this._requestInfo.sku?.type,
                availableProviders: this._requestInfo.availableProviders.map(p => p.toString()).join(','),
                ...this._viewData.renderData?.getData(),
            };
            this.source.provider.handleEndOfLifetime(this.source.inlineSuggestions, this.sourceInlineCompletion, reason, summary);
        }
    }
    setIsPreceeded(partialAccepts) {
        this._isPreceeded = true;
        if (this._partiallyAcceptedSinceOriginal.characters !== 0 || this._partiallyAcceptedSinceOriginal.ratio !== 0 || this._partiallyAcceptedSinceOriginal.count !== 0) {
            console.warn('Expected partiallyAcceptedCountSinceOriginal to be { characters: 0, rate: 0, partialAcceptances: 0 } before setIsPreceeded.');
        }
        this._partiallyAcceptedSinceOriginal = partialAccepts;
    }
    setNotShownReason(reason) {
        this._notShownReason ??= reason;
    }
    /**
     * Sets the end of life reason, but does not send the event to the provider yet.
    */
    setEndOfLifeReason(reason) {
        this.reportInlineEditHidden();
        this._lastSetEndOfLifeReason = reason;
    }
    updateShownDuration(viewKind) {
        const timeNow = Date.now();
        if (!this._showStartTime) {
            this._showStartTime = timeNow;
        }
        const isCollapsed = viewKind === InlineCompletionViewKind.Collapsed;
        if (!isCollapsed && this._showUncollapsedStartTime === undefined) {
            this._showUncollapsedStartTime = timeNow;
        }
        if (isCollapsed && this._showUncollapsedStartTime !== undefined) {
            this._showUncollapsedDuration += timeNow - this._showUncollapsedStartTime;
        }
    }
    reportInlineEditHidden() {
        if (this._showStartTime === undefined) {
            return;
        }
        const timeNow = Date.now();
        this._shownDuration += timeNow - this._showStartTime;
        this._showStartTime = undefined;
        if (this._showUncollapsedStartTime === undefined) {
            return;
        }
        this._showUncollapsedDuration += timeNow - this._showUncollapsedStartTime;
        this._showUncollapsedStartTime = undefined;
    }
    setRenameProcessingInfo(info) {
        if (this._renameInfo) {
            throw new BugIndicatingError('Rename info has already been set.');
        }
        this._renameInfo = info;
    }
    withAction(action) {
        this._action = action;
        return this;
    }
    addPerformanceMarker(marker) {
        this.performance.mark(marker);
    }
}
class InlineSuggestionsPerformance {
    constructor() {
        this.markers = [];
        this.markers.push({ name: 'start', timeStamp: Date.now() });
    }
    mark(marker) {
        this.markers.push({ name: marker, timeStamp: Date.now() });
    }
    toString() {
        const deltas = [];
        for (let i = 1; i < this.markers.length; i++) {
            const delta = this.markers[i].timeStamp - this.markers[i - 1].timeStamp;
            deltas.push({ [this.markers[i].name]: delta });
        }
        return JSON.stringify(deltas);
    }
}
export var InlineCompletionEditorType;
(function (InlineCompletionEditorType) {
    InlineCompletionEditorType["TextEditor"] = "textEditor";
    InlineCompletionEditorType["DiffEditor"] = "diffEditor";
    InlineCompletionEditorType["Notebook"] = "notebook";
})(InlineCompletionEditorType || (InlineCompletionEditorType = {}));
/**
 * A ref counted pointer to the computed `InlineCompletions` and the `InlineCompletionsProvider` that
 * computed them.
 */
export class InlineSuggestionList {
    constructor(inlineSuggestions, inlineSuggestionsData, provider) {
        this.inlineSuggestions = inlineSuggestions;
        this.inlineSuggestionsData = inlineSuggestionsData;
        this.provider = provider;
        this.refCount = 0;
    }
    addRef() {
        this.refCount++;
    }
    removeRef(reason = { kind: 'other' }) {
        this.refCount--;
        if (this.refCount === 0) {
            for (const item of this.inlineSuggestionsData) {
                // Fallback if it has not been called before
                item.reportEndOfLife();
            }
            this.provider.disposeInlineCompletions(this.inlineSuggestions, reason);
        }
    }
}
function getDefaultRange(position, model) {
    const word = model.getWordAtPosition(position);
    const maxColumn = model.getLineMaxColumn(position.lineNumber);
    // By default, always replace up until the end of the current line.
    // This default might be subject to change!
    return word
        ? new Range(position.lineNumber, word.startColumn, position.lineNumber, maxColumn)
        : Range.fromPositions(position, position.with(undefined, maxColumn));
}
function closeBrackets(text, position, model, languageConfigurationService) {
    const currentLine = model.getLineContent(position.lineNumber);
    const edit = StringReplacement.replace(new OffsetRange(position.column - 1, currentLine.length), text);
    const proposedLineTokens = model.tokenization.tokenizeLinesAt(position.lineNumber, [edit.replace(currentLine)]);
    const textTokens = proposedLineTokens?.[0].sliceZeroCopy(edit.getRangeAfterReplace());
    if (!textTokens) {
        return text;
    }
    const fixedText = fixBracketsInLine(textTokens, languageConfigurationService);
    return fixedText;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvcHJvdmlkZUlubGluZUNvbXBsZXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUdsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUUsT0FBTyxFQUFtQyxtQ0FBbUMsRUFBa00sTUFBTSxpQ0FBaUMsQ0FBQztBQUd2VCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUscUJB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
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
var InlineCompletionsSource_1;
import { booleanComparator, compareBy, compareUndefinedSmallest, numberComparator } from '../../../../../base/common/arrays.js';
import { findLastMax } from '../../../../../base/common/arraysFind.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { equalsIfDefined, thisEqualsC } from '../../../../../base/common/equals.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { cloneAndChange } from '../../../../../base/common/objects.js';
import { derived, observableValue, recordChangesLazy, transaction } from '../../../../../base/common/observable.js';
// eslint-disable-next-line local/code-no-deep-import-of-internal
import { observableReducerSettable } from '../../../../../base/common/observableInternal/experimental/reducer.js';
import { isDefined, isObject } from '../../../../../base/common/types.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { DataChannelForwardingTelemetryService, forwardToChannelIf, isCopilotLikeExtension } from '../../../../../platform/dataChannel/browser/forwardingTelemetryService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import product from '../../../../../platform/product/common/product.js';
import { StringEdit } from '../../../../common/core/edits/stringEdit.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Command, InlineCompletionEndOfLifeReasonKind, InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { offsetEditFromContentChanges } from '../../../../common/model/textModelStringEdit.js';
import { formatRecordableLogEntry, StructuredLogger } from '../structuredLogger.js';
import { sendInlineCompletionsEndOfLifeTelemetry } from '../telemetry.js';
import { wait } from '../utils.js';
import { InlineSuggestionItem } from './inlineSuggestionItem.js';
import { provideInlineCompletions, runWhenCancelled } from './provideInlineCompletions.js';
import { RenameSymbolProcessor } from './renameSymbolProcessor.js';
let InlineCompletionsSource = class InlineCompletionsSource extends Disposable {
    static { InlineCompletionsSource_1 = this; }
    static { this._requestId = 0; }
    constructor(_textModel, _versionId, _debounceValue, _cursorPosition, _languageConfigurationService, _logService, _configurationService, _instantiationService, _contextKeyService) {
        super();
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._debounceValue = _debounceValue;
        this._cursorPosition = _cursorPosition;
        this._languageConfigurationService = _languageConfigurationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._updateOperation = this._register(new MutableDisposable());
        this._state = observableReducerSettable(this, {
            initial: () => ({
                inlineCompletions: InlineCompletionsState.createEmpty(),
                suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
            }),
            disposeFinal: (values) => {
                values.inlineCompletions.dispose();
                values.suggestWidgetInlineCompletions.dispose();
            },
            changeTracker: recordChangesLazy(() => ({ versionId: this._versionId })),
            update: (reader, previousValue, changes) => {
                const edit = StringEdit.compose(changes.changes.map(c => c.change ? offsetEditFromContentChanges(c.change.changes) : StringEdit.empty).filter(isDefined));
                if (edit.isEmpty()) {
                    return previousValue;
                }
                try {
                    return {
                        inlineCompletions: previousValue.inlineCompletions.createStateWithAppliedEdit(edit, this._textModel),
                        suggestWidgetInlineCompletions: previousValue.suggestWidgetInlineCompletions.createStateWithAppliedEdit(edit, this._textModel),
                    };
                }
                finally {
                    previousValue.inlineCompletions.dispose();
                    previousValue.suggestWidgetInlineCompletions.dispose();
                }
            }
        });
        this.inlineCompletions = this._state.map(this, v => v.inlineCompletions);
        this.suggestWidgetInlineCompletions = this._state.map(this, v => v.suggestWidgetInlineCompletions);
        this._completionsEnabled = undefined;
        this.clearOperationOnTextModelChange = derived(this, reader => {
            this._versionId.read(reader);
            this._updateOperation.clear();
            return undefined; // always constant
        });
        this._loadingCount = observableValue(this, 0);
        this.loading = this._loadingCount.map(this, v => v > 0);
        this._loggingEnabled = observableConfigValue('editor.inlineSuggest.logFetch', false, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._sendRequestData = observableConfigValue('editor.inlineSuggest.emptyResponseInformation', true, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._structuredFetchLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logFetch.commandId'));
        this._renameProcessor = this._store.add(this._instantiationService.createInstance(RenameSymbolProcessor));
        this.clearOperationOnTextModelChange.recomputeInitiallyAndOnChange(this._store);
        const enablementSetting = product.defaultChatAgent?.completionsEnablementSetting ?? undefined;
        if (enablementSetting) {
            this._updateCompletionsEnablement(enablementSetting);
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(enablementSetting)) {
                    this._updateCompletionsEnablement(enablementSetting);
                }
            }));
        }
        this._state.recomputeInitiallyAndOnChange(this._store);
    }
    _updateCompletionsEnablement(enalementSetting) {
        const result = this._configurationService.getValue(enalementSetting);
        if (!isObject(result)) {
            this._completionsEnabled = undefined;
        }
        else {
            this._completionsEnabled = result;
        }
    }
    _log(entry) {
        if (this._loggingEnabled.get()) {
            this._logService.info(formatRecordableLogEntry(entry));
        }
        this._structuredFetchLogger.log(entry);
    }
    fetch(providers, providersLabel, context, activeInlineCompletion, withDebounce, userJumpedToActiveCompletion, requestInfo) {
        const position = this._cursorPosition.get();
        const request = new UpdateRequest(position, context, this._textModel.getVersionId(), new Set(providers));
        const target = context.selectedSuggestionInfo ? this.suggestWidgetInlineCompletions.get() : this.inlineCompletions.get();
        if (this._updateOperation.value?.request.satisfies(request)) {
            return this._updateOperation.value.promise;
        }
        else if (target?.request?.satisfies(request)) {
            return Promise.resolve(true);
        }
        const updateOngoing = !!this._updateOperation.value;
        this._updateOperation.clear();
        const source = new CancellationTokenSource();
        const promise = (async () => {
            const store = new DisposableStore();
            this._loadingCount.set(this._loadingCount.get() + 1, undefined);
            let didDecrease = false;
            const decreaseLoadingCount = () => {
                if (!didDecrease) {
                    didDecrease = true;
                    this._loadingCount.set(this._loadingCount.get() - 1, undefined);
                }
            };
            const loadingReset = store.add(new RunOnceScheduler(() => decreaseLoadingCount(), 10 * 1000));
            loadingReset.schedule();
            const inlineSuggestionsProviders = providers.filter(p => p.providerId);
            const requestResponseInfo = new RequestResponseData(context, requestInfo, inlineSuggestionsProviders);
            try {
                const recommendedDebounceValue = this._debounceValue.get(this._textModel);
                const debounceValue = findLastMax(providers.map(p => p.debounceDelayMs), compareUndefinedSmallest(numberComparator)) ?? recommendedDebounceValue;
                // Debounce in any case if update is ongoing
                const shouldDebounce = updateOngoing || (withDebounce && context.triggerKind === InlineCompletionTriggerKind.Automatic);
                if (shouldDebounce) {
                    // This debounces the operation
                    await wait(debounceValue, source.token);
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                    requestResponseInfo.setNoSuggestionReasonIfNotSet('canceled:beforeFetch');
                    return false;
                }
                const requestId = InlineCompletionsSource_1._requestId++;
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    this._log({
                        sourceId: 'InlineCompletions.fetch',
                        kind: 'start',
                        requestId,
                        modelUri: this._textModel.uri,
                        modelVersion: this._textModel.getVersionId(),
                        context: { triggerKind: context.triggerKind, suggestInfo: context.selectedSuggestionInfo ? true : undefined },
                        time: Date.now(),
                        provider: providersLabel,
                    });
                }
                const startTime = new Date();
                const providerResult = provideInlineCompletions(providers, this._cursorPosition.get(), this._textModel, context, requestInfo, this._languageConfigurationService);
                runWhenCancelled(source.token, () => providerResult.cancelAndDispose({ kind: 'tokenCancellation' }));
                let shouldStopEarly = false;
                let producedSuggestion = false;
                const providerSuggestions = [];
                for await (const list of providerResult.lists) {
                    if (!list) {
                        continue;
                    }
                    list.addRef();
                    store.add(toDisposable(() => list.removeRef(list.inlineSuggestionsData.length === 0 ? { kind: 'empty' } : { kind: 'notTaken' })));
                    for (const item of list.inlineSuggestionsData) {
                        producedSuggestion = true;
                        if (!context.includeInlineEdits && (item.isInlineEdit || item.showInlineEditMenu)) {
                            item.setNotShownReason('notInlineEditRequested');
                            continue;
                        }
                        if (!context.includeInlineCompletions && !(item.isInlineEdit || item.showInlineEditMenu)) {
                            item.setNotShownReason('notInlineCompletionRequested');
                            continue;
                        }
                        item.addPerformanceMarker('providerReturned');
                        const i = InlineSuggestionItem.create(item, this._textModel);
                        item.addPerformanceMarker('itemCreated');
                        providerSuggestions.push(i);
                        // Stop after first visible inline completion
                        if (!i.isInlineEdit && !i.showInlineEditMenu && context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                            if (i.isVisible(this._textModel, this._cursorPosition.get())) {
                                shouldStopEarly = true;
                            }
                        }
                    }
                    if (shouldStopEarly) {
                        break;
                    }
                }
                providerSuggestions.forEach(s => s.addPerformanceMarker('providersResolved'));
                const suggestions = await Promise.all(providerSuggestions.map(async (s) => {
                    return this._renameProcessor.proposeRenameRefactoring(this._textModel, s, context);
                }));
                suggestions.forEach(s => s.addPerformanceMarker('renameProcessed'));
                providerResult.cancelAndDispose({ kind: 'lostRace' });
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    const didAllProvidersReturn = providerResult.didAllProvidersReturn;
                    let error = undefined;
                    if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                        error = 'canceled';
                    }
                    const result = suggestions.map(c => {
                        const comp = c.getSourceCompletion();
                        if (comp.doNotLog) {
                            return undefined;
                        }
                        const obj = {
                            insertText: comp.insertText,
                            range: comp.range,
                            additionalTextEdits: comp.additionalTextEdits,
                            uri: comp.uri,
                            command: comp.command,
                            gutterMenuLinkAction: comp.gutterMenuLinkAction,
                            shownCommand: comp.shownCommand,
                            completeBracketPairs: comp.completeBracketPairs,
                            isInlineEdit: comp.isInlineEdit,
                            showInlineEditMenu: comp.showInlineEditMenu,
                            showRange: comp.showRange,
                            warning: comp.warning,
                            hint: comp.hint,
                            supportsRename: comp.supportsRename,
                            correlationId: comp.correlationId,
                            jumpToPosition: comp.jumpToPosition,
                        };
                        return {
                            ...cloneAndChange(obj, v => {
                                if (Range.isIRange(v)) {
                                    return Range.lift(v).toString();
                                }
                                if (Position.isIPosition(v)) {
                                    return Position.lift(v).toString();
                                }
                                if (Command.is(v)) {
                                    return { $commandId: v.id };
                                }
                                return v;
                            }),
                            $providerId: c.source.provider.providerId?.toString(),
                        };
                    }).filter(result => result !== undefined);
                    this._log({ sourceId: 'InlineCompletions.fetch', kind: 'end', requestId, durationMs: (Date.now() - startTime.getTime()), error, result, time: Date.now(), didAllProvidersReturn });
                }
                requestResponseInfo.setRequestUuid(providerResult.contextWithUuid.requestUuid);
                if (producedSuggestion) {
                    requestResponseInfo.setHasProducedSuggestion();
                    if (suggestions.length > 0 && source.token.isCancellationRequested) {
                        suggestions.forEach(s => s.setNotShownReasonIfNotSet('canceled:whileAwaitingOtherProviders'));
                    }
                }
                else {
                    if (source.token.isCancellationRequested) {
                        requestResponseInfo.setNoSuggestionReasonIfNotSet('canceled:whileFetching');
                    }
                    else {
                        const completionsQuotaExceeded = this._contextKeyService.getContextKeyValue('completionsQuotaExceeded');
                        requestResponseInfo.setNoSuggestionReasonIfNotSet(completionsQuotaExceeded ? 'completionsQuotaExceeded' : 'noSuggestion');
                    }
                }
                const remainingTimeToWait = context.earliestShownDateTime - Date.now();
                if (remainingTimeToWait > 0) {
                    await wait(remainingTimeToWait, source.token);
                }
                suggestions.forEach(s => s.addPerformanceMarker('minShowDelayPassed'));
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId
                    || userJumpedToActiveCompletion.get() /* In the meantime the user showed interest for the active completion so dont hide it */) {
                    const notShownReason = source.token.isCancellationRequested ? 'canceled:afterMinShowDelay' :
                        this._store.isDisposed ? 'canceled:disposed' :
                            this._textModel.getVersionId() !== request.versionId ? 'canceled:documentChanged' :
                                userJumpedToActiveCompletion.get() ? 'canceled:userJumped' :
                                    'unknown';
                    suggestions.forEach(s => s.setNotShownReasonIfNotSet(notShownReason));
                    return false;
                }
                const endTime = new Date();
                this._debounceValue.update(this._textModel, endTime.getTime() - startTime.getTime());
                const cursorPosition = this._cursorPosition.get();
                this._updateOperation.clear();
                transaction(tx => {
                    /** @description Update completions with provider result */
                    const v = this._state.get();
                    if (context.selectedSuggestionInfo) {
                        this._state.set({
                            inlineCompletions: InlineCompletionsState.createEmpty(),
                            suggestWidgetInlineCompletions: v.suggestWidgetInlineCompletions.createStateWithAppliedResults(suggestions, request, this._textModel, cursorPosition, activeInlineCompletion),
                        }, tx);
                    }
                    else {
                        this._state.set({
                            inlineCompletions: v.inlineCompletions.createStateWithAppliedResults(suggestions, request, this._textModel, cursorPosition, activeInlineCompletion),
                            suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
                        }, tx);
                    }
                    v.inlineCompletions.dispose();
                    v.suggestWidgetInlineCompletions.dispose();
                });
            }
            finally {
                store.dispose();
                decreaseLoadingCount();
                this.sendInlineCompletionsRequestTelemetry(requestResponseInfo);
            }
            return true;
        })();
        const updateOperation = new UpdateOperation(request, source, promise);
        this._updateOperation.value = updateOperation;
        return promise;
    }
    clear(tx) {
        this._updateOperation.clear();
        const v = this._state.get();
        this._state.set({
            inlineCompletions: InlineCompletionsState.createEmpty(),
            suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty()
        }, tx);
        v.inlineCompletions.dispose();
        v.suggestWidgetInlineCompletions.dispose();
    }
    seedInlineCompletionsWithSuggestWidget() {
        const inlineCompletions = this.inlineCompletions.get();
        const suggestWidgetInlineCompletions = this.suggestWidgetInlineCompletions.get();
        if (!suggestWidgetInlineCompletions) {
            return;
        }
        transaction(tx => {
            /** @description Seed inline completions with (newer) suggest widget inline completions */
            if (!inlineCompletions || (suggestWidgetInlineCompletions.request?.versionId ?? -1) > (inlineCompletions.request?.versionId ?? -1)) {
                inlineCompletions?.dispose();
                const s = this._state.get();
                this._state.set({
                    inlineCompletions: suggestWidgetInlineCompletions.clone(),
                    suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
                }, tx);
                s.inlineCompletions.dispose();
                s.suggestWidgetInlineCompletions.dispose();
            }
            this.clearSuggestWidgetInlineCompletions(tx);
        });
    }
    sendInlineCompletionsRequestTelemetry(requestResponseInfo) {
        if (!this._sendRequestData.get() && !this._contextKeyService.getContextKeyValue('isRunningUnificationExperiment')) {
            return;
        }
        if (requestResponseInfo.requestUuid === undefined || requestResponseInfo.hasProducedSuggestion) {
            return;
        }
        if (!isCompletionsEnabled(this._completionsEnabled, this._textModel.getLanguageId())) {
            return;
        }
        if (!requestResponseInfo.providers.some(p => isCopilotLikeExtension(p.providerId?.extensionId))) {
            return;
        }
        const emptyEndOfLifeEvent = {
            opportunityId: requestResponseInfo.requestUuid,
            noSuggestionReason: requestResponseInfo.noSuggestionReason ?? 'unknown',
            extensionId: 'vscode-core',
            extensionVersion: '0.0.0',
            groupId: 'empty',
            shown: false,
            skuPlan: requestResponseInfo.requestInfo.sku?.plan,
            skuType: requestResponseInfo.requestInfo.sku?.type,
            editorType: requestResponseInfo.requestInfo.editorType,
            requestReason: requestResponseInfo.requestInfo.reason,
            typingInterval: requestResponseInfo.requestInfo.typingInterval,
            typingIntervalCharacterCount: requestResponseInfo.requestInfo.typingIntervalCharacterCount,
            languageId: requestResponseInfo.requestInfo.languageId,
            selectedSuggestionInfo: !!requestResponseInfo.context.selectedSuggestionInfo,
            availableProviders: requestResponseInfo.providers.map(p => p.providerId?.toString()).filter(isDefined).join(','),
            ...forwardToChannelIf(requestResponseInfo.providers.some(p => isCopilotLikeExtension(p.providerId?.extensionId))),
            timeUntilProviderRequest: undefined,
            timeUntilProviderResponse: undefined,
            viewKind: undefined,
            preceeded: undefined,
            superseded: undefined,
            reason: undefined,
            acceptedAlternativeAction: undefined,
            correlationId: undefined,
            shownDuration: undefined,
            shownDurationUncollapsed: undefined,
            timeUntilShown: undefined,
            partiallyAccepted: undefined,
            partiallyAcceptedCountSinceOriginal: undefined,
            partiallyAcceptedRatioSinceOriginal: undefined,
            partiallyAcceptedCharactersSinceOriginal: undefined,
            cursorColumnDistance: undefined,
            cursorLineDistance: undefined,
            lineCountOriginal: undefined,
            lineCountModified: undefined,
            characterCountOriginal: undefined,
            characterCountModified: undefined,
            disjointReplacements: undefined,
            sameShapeReplacements: undefined,
            longDistanceHintVisible: undefined,
            longDistanceHintDistance: undefined,
            notShownReason: undefined,
            renameCreated: false,
            renameDuration: undefined,
            renameTimedOut: false,
            renameDroppedOtherEdits: undefined,
            renameDroppedRenameEdits: undefined,
            performanceMarkers: undefined,
            editKind: undefined,
        };
        const dataChannel = this._instantiationService.createInstance(DataChannelForwardingTelemetryService);
        sendInlineCompletionsEndOfLifeTelemetry(dataChannel, emptyEndOfLifeEvent);
    }
    clearSuggestWidgetInlineCompletions(tx) {
        if (this._updateOperation.value?.request.context.selectedSuggestionInfo) {
            this._updateOperation.clear();
        }
    }
    cancelUpdate() {
        this._updateOperation.clear();
    }
};
InlineCompletionsSource = InlineCompletionsSource_1 = __decorate([
    __param(4, ILanguageConfigurationService),
    __param(5, ILogService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService),
    __param(8, IContextKeyService)
], InlineCompletionsSource);
export { InlineCompletionsSource };
class UpdateRequest {
    constructor(position, context, versionId, providers) {
        this.position = position;
        this.context = context;
        this.versionId = versionId;
        this.providers = providers;
    }
    satisfies(other) {
        return this.position.equals(other.position)
            && equalsIfDefined(this.context.selectedSuggestionInfo, other.context.selectedSuggestionInfo, thisEqualsC())
            && (other.context.triggerKind === InlineCompletionTriggerKind.Automatic
                || this.context.triggerKind === InlineCompletionTriggerKind.Explicit)
            && this.versionId === other.versionId
            && isSubset(other.providers, this.providers);
    }
    get isExplicitRequest() {
        return this.context.triggerKind === InlineCompletionTriggerKind.Explicit;
    }
}
class RequestResponseData {
    constructor(context, requestInfo, providers) {
        this.context = context;
        this.requestInfo = requestInfo;
        this.providers = providers;
        this.hasProducedSuggestion = false;
    }
    setRequestUuid(uuid) {
        this.requestUuid = uuid;
    }
    setNoSuggestionReasonIfNotSet(type) {
        this.noSuggestionReason ??= type;
    }
    setHasProducedSuggestion() {
        this.hasProducedSuggestion = true;
    }
}
function isSubset(set1, set2) {
    return [...set1].every(item => set2.has(item));
}
function isCompletionsEnabled(completionsEnablementObject, modeId = '*') {
    if (completionsEnablementObject === undefined) {
        return false; // default to disabled if setting is not available
    }
    if (typeof completionsEnablementObject[modeId] !== 'undefined') {
        return Boolean(completionsEnablementObject[modeId]); // go with setting if explicitly defined
    }
    return Boolean(completionsEnablementObject['*']); // fallback to global setting otherwise
}
class UpdateOperation {
    constructor(request, cancellationTokenSource, promise) {
        this.request = request;
        this.cancellationTokenSource = cancellationTokenSource;
        this.promise = promise;
    }
    dispose() {
        this.cancellationTokenSource.cancel();
    }
}
class InlineCompletionsState extends Disposable {
    static createEmpty() {
        return new InlineCompletionsState([], undefined);
    }
    constructor(inlineCompletions, request) {
        for (const inlineCompletion of inlineCompletions) {
            inlineCompletion.addRef();
        }
        super();
        this.inlineCompletions = inlineCompletions;
        this.request = request;
        this._register({
            dispose: () => {
                for (const inlineCompletion of this.inlineCompletions) {
                    inlineCompletion.removeRef();
                }
            }
        });
    }
    _findById(id) {
        return this.inlineCompletions.find(i => i.identity === id);
    }
    _findByHash(hash) {
        return this.inlineCompletions.find(i => i.hash === hash);
    }
    /**
     * Applies the edit on the state.
    */
    createStateWithAppliedEdit(edit, textModel) {
        const newInlineCompletions = this.inlineCompletions.map(i => i.withEdit(edit, textModel)).filter(isDefined);
        return new InlineCompletionsState(newInlineCompletions, this.request);
    }
    createStateWithAppliedResults(updatedSuggestions, request, textModel, cursorPosition, itemIdToPreserveAtTop) {
        let itemToPreserve = undefined;
        if (itemIdToPreserveAtTop) {
            const itemToPreserveCandidate = this._findById(itemIdToPreserveAtTop);
            if (itemToPreserveCandidate && itemToPreserveCandidate.canBeReused(textModel, request.position)) {
                itemToPreserve = itemToPreserveCandidate;
                const updatedItemToPreserve = updatedSuggestions.find(i => i.hash === itemToPreserveCandidate.hash);
                if (updatedItemToPreserve) {
                    updatedSuggestions = moveToFront(updatedItemToPreserve, updatedSuggestions);
                }
                else {
                    updatedSuggestions = [itemToPreserveCandidate, ...updatedSuggestions];
                }
            }
        }
        const preferInlineCompletions = itemToPreserve
            // itemToPreserve has precedence
            ? !itemToPreserve.isInlineEdit
            // Otherwise: prefer inline completion if there is a visible one
            : updatedSuggestions.some(i => !i.isInlineEdit && i.isVisible(textModel, cursorPosition));
        let updatedItems = [];
        for (const i of updatedSuggestions) {
            const oldItem = this._findByHash(i.hash);
            let item;
            if (oldItem && oldItem !== i) {
                item = i.withIdentity(oldItem.identity);
                i.setIsPreceeded(oldItem);
                oldItem.setEndOfLifeReason({ kind: InlineCompletionEndOfLifeReasonKind.Ignored, userTypingDisagreed: false, supersededBy: i.getSourceCompletion() });
            }
            else {
                item = i;
            }
            if (preferInlineCompletions !== item.isInlineEdit) {
                updatedItems.push(item);
            }
        }
        updatedItems.sort(compareBy(i => i.showInlineEditMenu, booleanComparator));
        updatedItems = distinctByKey(updatedItems, i => i.semanticId);
        return new InlineCompletionsState(updatedItems, request);
    }
    clone() {
        return new InlineCompletionsState(this.inlineCompletions, this.request);
    }
}
/** Keeps the first item in case of duplicates. */
function distinctByKey(items, key) {
    const seen = new Set();
    return items.filter(item => {
        const k = key(item);
        if (seen.has(k)) {
            return false;
        }
        seen.add(k);
        return true;
    });
}
function moveToFront(item, items) {
    const index = items.indexOf(item);
    if (index > -1) {
        return [item, ...items.slice(0, index), ...items.slice(index + 1)];
    }
    return items;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVDb21wbGV0aW9uc1NvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFNBQVMsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFvRCxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEssaUVBQWlFO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7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
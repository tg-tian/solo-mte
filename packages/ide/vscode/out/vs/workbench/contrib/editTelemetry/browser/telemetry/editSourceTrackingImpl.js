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
import { reverseOrder, compareBy, numberComparator, sumBy } from '../../../../../base/common/arrays.js';
import { IntervalTimer, TimeoutTimer } from '../../../../../base/common/async.js';
import { toDisposable, Disposable } from '../../../../../base/common/lifecycle.js';
import { mapObservableArrayCached, derived, observableSignal, runOnChange, autorun } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IUserAttentionService } from '../../../../services/userAttention/common/userAttentionService.js';
import { CreateSuggestionIdForChatOrInlineChatCaller, EditTelemetryReportEditArcForChatOrInlineChatSender, EditTelemetryReportInlineEditArcSender } from './arcTelemetrySender.js';
import { createDocWithJustReason } from '../helpers/documentWithAnnotatedEdits.js';
import { DocumentEditSourceTracker } from './editTracker.js';
import { sumByCategory } from '../helpers/utils.js';
import { ScmAdapter } from './scmAdapter.js';
import { IRandomService } from '../randomService.js';
let EditSourceTrackingImpl = class EditSourceTrackingImpl extends Disposable {
    constructor(_statsEnabled, _annotatedDocuments, _instantiationService) {
        super();
        this._statsEnabled = _statsEnabled;
        this._annotatedDocuments = _annotatedDocuments;
        this._instantiationService = _instantiationService;
        const scmBridge = this._instantiationService.createInstance(ScmAdapter);
        this._states = mapObservableArrayCached(this, this._annotatedDocuments.documents, (doc, store) => {
            return [doc.document, store.add(this._instantiationService.createInstance(TrackedDocumentInfo, doc, scmBridge, this._statsEnabled))];
        });
        this.docsState = this._states.map((entries) => new Map(entries));
        this.docsState.recomputeInitiallyAndOnChange(this._store);
    }
};
EditSourceTrackingImpl = __decorate([
    __param(2, IInstantiationService)
], EditSourceTrackingImpl);
export { EditSourceTrackingImpl };
let TrackedDocumentInfo = class TrackedDocumentInfo extends Disposable {
    constructor(_doc, _scm, _statsEnabled, _instantiationService, _telemetryService, _randomService, _userAttentionService) {
        super();
        this._doc = _doc;
        this._scm = _scm;
        this._statsEnabled = _statsEnabled;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._randomService = _randomService;
        this._userAttentionService = _userAttentionService;
        this._repo = derived(this, reader => this._scm.getRepo(_doc.document.uri, reader));
        const docWithJustReason = createDocWithJustReason(_doc.documentWithAnnotations, this._store);
        const longtermResetSignal = observableSignal('resetSignal');
        let longtermReason = 'closed';
        this.longtermTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            longtermResetSignal.read(reader);
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            const startFocusTime = this._userAttentionService.totalFocusTimeMs;
            const startTime = Date.now();
            reader.store.add(toDisposable(() => {
                // send long term document telemetry
                if (!t.isEmpty()) {
                    this.sendTelemetry('longterm', longtermReason, t, this._userAttentionService.totalFocusTimeMs - startFocusTime, Date.now() - startTime);
                }
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
        this._store.add(new IntervalTimer()).cancelAndSet(() => {
            // Reset after 10 hours
            longtermReason = '10hours';
            longtermResetSignal.trigger(undefined);
            longtermReason = 'closed';
        }, 10 * 60 * 60 * 1000);
        // Reset on branch change or commit
        this._store.add(autorun(reader => {
            const repo = this._repo.read(reader);
            if (repo) {
                reader.store.add(runOnChange(repo.headCommitHashObs, () => {
                    longtermReason = 'hashChange';
                    longtermResetSignal.trigger(undefined);
                    longtermReason = 'closed';
                }));
                reader.store.add(runOnChange(repo.headBranchNameObs, () => {
                    longtermReason = 'branchChange';
                    longtermResetSignal.trigger(undefined);
                    longtermReason = 'closed';
                }));
            }
        }));
        this._store.add(this._instantiationService.createInstance(EditTelemetryReportInlineEditArcSender, _doc.documentWithAnnotations, this._repo));
        this._store.add(this._instantiationService.createInstance(EditTelemetryReportEditArcForChatOrInlineChatSender, _doc.documentWithAnnotations, this._repo));
        this._store.add(this._instantiationService.createInstance(CreateSuggestionIdForChatOrInlineChatCaller, _doc.documentWithAnnotations));
        // Wall-clock time based 5-minute window tracker
        const resetSignal = observableSignal('resetSignal');
        this.windowedTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            if (!this._doc.isVisible.read(reader)) {
                return undefined;
            }
            resetSignal.read(reader);
            // Reset after 5 minutes of wall-clock time
            reader.store.add(new TimeoutTimer(() => {
                resetSignal.trigger(undefined);
            }, 5 * 60 * 1000));
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            const startFocusTime = this._userAttentionService.totalFocusTimeMs;
            const startTime = Date.now();
            reader.store.add(toDisposable(async () => {
                // send windowed document telemetry
                this.sendTelemetry('5minWindow', 'time', t, this._userAttentionService.totalFocusTimeMs - startFocusTime, Date.now() - startTime);
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
        // Focus time based 10-minute window tracker
        const focusResetSignal = observableSignal('focusResetSignal');
        this.windowedFocusTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            if (!this._doc.isVisible.read(reader)) {
                return undefined;
            }
            focusResetSignal.read(reader);
            // Reset after 10 minutes of accumulated focus time
            reader.store.add(this._userAttentionService.fireAfterGivenFocusTimePassed(10 * 60 * 1000, () => {
                focusResetSignal.trigger(undefined);
            }));
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            const startFocusTime = this._userAttentionService.totalFocusTimeMs;
            const startTime = Date.now();
            reader.store.add(toDisposable(async () => {
                // send focus-windowed document telemetry
                this.sendTelemetry('10minFocusWindow', 'time', t, this._userAttentionService.totalFocusTimeMs - startFocusTime, Date.now() - startTime);
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
    }
    async sendTelemetry(mode, trigger, t, focusTime, actualTime) {
        const ranges = t.getTrackedRanges();
        const keys = t.getAllKeys();
        if (keys.length === 0) {
            return;
        }
        const data = this.getTelemetryData(ranges);
        const statsUuid = this._randomService.generateUuid();
        const sums = sumByCategory(ranges, r => r.range.length, r => r.sourceKey);
        const entries = Object.entries(sums).filter(([key, value]) => value !== undefined);
        entries.sort(reverseOrder(compareBy(([key, value]) => value, numberComparator)));
        entries.length = mode === 'longterm' ? 30 : 10;
        for (const key of keys) {
            if (!sums[key]) {
                sums[key] = 0;
            }
        }
        for (const [key, value] of Object.entries(sums)) {
            if (value === undefined) {
                continue;
            }
            const repr = t.getRepresentative(key);
            const deltaModifiedCount = t.getTotalInsertedCharactersCount(key);
            this._telemetryService.publicLog2('editTelemetry.editSources.details', {
                mode,
                sourceKey: key,
                sourceKeyCleaned: repr.toKey(1, { $extensionId: false, $extensionVersion: false, $modelId: false }),
                extensionId: repr.props.$extensionId,
                extensionVersion: repr.props.$extensionVersion,
                modelId: repr.props.$modelId,
                trigger,
                languageId: this._doc.document.languageId.get(),
                statsUuid: statsUuid,
                modifiedCount: value,
                deltaModifiedCount: deltaModifiedCount,
                totalModifiedCount: data.totalModifiedCharactersInFinalState,
            });
        }
        const isTrackedByGit = await data.isTrackedByGit;
        this._telemetryService.publicLog2('editTelemetry.editSources.stats', {
            mode,
            languageId: this._doc.document.languageId.get(),
            statsUuid: statsUuid,
            nesModifiedCount: data.nesModifiedCount,
            inlineCompletionsCopilotModifiedCount: data.inlineCompletionsCopilotModifiedCount,
            inlineCompletionsNESModifiedCount: data.inlineCompletionsNESModifiedCount,
            otherAIModifiedCount: data.otherAIModifiedCount,
            unknownModifiedCount: data.unknownModifiedCount,
            userModifiedCount: data.userModifiedCount,
            ideModifiedCount: data.ideModifiedCount,
            totalModifiedCharacters: data.totalModifiedCharactersInFinalState,
            externalModifiedCount: data.externalModifiedCount,
            isTrackedByGit: isTrackedByGit ? 1 : 0,
            focusTime,
            actualTime,
            trigger,
        });
    }
    getTelemetryData(ranges) {
        const getEditCategory = (source) => {
            if (source.category === 'ai' && source.kind === 'nes') {
                return 'nes';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot') {
                return 'inlineCompletionsCopilot';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot-chat' && source.providerId === 'completions') {
                return 'inlineCompletionsCopilot';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot-chat' && source.providerId === 'nes') {
                return 'inlineCompletionsNES';
            }
            if (source.category === 'ai' && source.kind === 'completion') {
                return 'inlineCompletionsOther';
            }
            if (source.category === 'ai') {
                return 'otherAI';
            }
            if (source.category === 'user') {
                return 'user';
            }
            if (source.category === 'ide') {
                return 'ide';
            }
            if (source.category === 'external') {
                return 'external';
            }
            if (source.category === 'unknown') {
                return 'unknown';
            }
            return 'unknown';
        };
        const sums = sumByCategory(ranges, r => r.range.length, r => getEditCategory(r.source));
        const totalModifiedCharactersInFinalState = sumBy(ranges, r => r.range.length);
        return {
            nesModifiedCount: sums.nes ?? 0,
            inlineCompletionsCopilotModifiedCount: sums.inlineCompletionsCopilot ?? 0,
            inlineCompletionsNESModifiedCount: sums.inlineCompletionsNES ?? 0,
            otherAIModifiedCount: sums.otherAI ?? 0,
            userModifiedCount: sums.user ?? 0,
            ideModifiedCount: sums.ide ?? 0,
            unknownModifiedCount: sums.unknown ?? 0,
            externalModifiedCount: sums.external ?? 0,
            totalModifiedCharactersInFinalState,
            languageId: this._doc.document.languageId.get(),
            isTrackedByGit: this._repo.get()?.isIgnored(this._doc.document.uri),
        };
    }
};
TrackedDocumentInfo = __decorate([
    __param(3, IInstantiationService),
    __param(4, ITelemetryService),
    __param(5, IRandomService),
    __param(6, IUserAttentionService)
], TrackedDocumentInfo);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNvdXJjZVRyYWNraW5nSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0VGVsZW1ldHJ5L2Jyb3dzZXIvdGVsZW1ldHJ5L2VkaXRTb3VyY2VUcmFja2luZ0ltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxPQUFPLEVBQWUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBRTFHLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxtREFBbUQsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ25MLE9BQU8sRUFBRSx1QkFBdUIsRUFBYyxNQUFNLDBDQUEwQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSx5QkFBeUIsRUFBZSxNQUFNLGtCQUFrQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFrQixNQUFNLGlCQUFpQixDQUFDO0FBQzdELE9BQU8s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
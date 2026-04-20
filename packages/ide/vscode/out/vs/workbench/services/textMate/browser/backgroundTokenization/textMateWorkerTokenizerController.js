/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../amdX.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, keepObserved } from '../../../../../base/common/observable.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TokenizationStateStore } from '../../../../../editor/common/model/textModelTokens.js';
import { deserializeFontTokenOptions } from '../../../../../editor/common/textModelEvents.js';
import { ContiguousMultilineTokensBuilder } from '../../../../../editor/common/tokens/contiguousMultilineTokensBuilder.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { MonotonousIndexTransformer } from '../indexTransformer.js';
import { linesLengthEditFromModelContentChange } from '../../../../../editor/common/model/textModelStringEdit.js';
import { StringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../../editor/common/core/ranges/offsetRange.js';
import { AnnotationsUpdate } from '../../../../../editor/common/model/tokens/annotations.js';
export class TextMateWorkerTokenizerController extends Disposable {
    static { this._id = 0; }
    constructor(_model, _worker, _languageIdCodec, _backgroundTokenizationStore, _configurationService, _maxTokenizationLineLength) {
        super();
        this._model = _model;
        this._worker = _worker;
        this._languageIdCodec = _languageIdCodec;
        this._backgroundTokenizationStore = _backgroundTokenizationStore;
        this._configurationService = _configurationService;
        this._maxTokenizationLineLength = _maxTokenizationLineLength;
        this.controllerId = TextMateWorkerTokenizerController._id++;
        this._pendingChanges = [];
        this._states = new TokenizationStateStore();
        this._loggingEnabled = observableConfigValue('editor.experimental.asyncTokenizationLogging', false, this._configurationService);
        this._register(keepObserved(this._loggingEnabled));
        this._register(this._model.onDidChangeContent((e) => {
            if (this._shouldLog) {
                console.log('model change', {
                    fileName: this._model.uri.fsPath.split('\\').pop(),
                    changes: changesToString(e.changes),
                });
            }
            this._worker.$acceptModelChanged(this.controllerId, e);
            this._pendingChanges.push(e);
        }));
        this._register(this._model.onDidChangeLanguage((e) => {
            const languageId = this._model.getLanguageId();
            const encodedLanguageId = this._languageIdCodec.encodeLanguageId(languageId);
            this._worker.$acceptModelLanguageChanged(this.controllerId, languageId, encodedLanguageId);
        }));
        const languageId = this._model.getLanguageId();
        const encodedLanguageId = this._languageIdCodec.encodeLanguageId(languageId);
        this._worker.$acceptNewModel({
            uri: this._model.uri,
            versionId: this._model.getVersionId(),
            lines: this._model.getLinesContent(),
            EOL: this._model.getEOL(),
            languageId,
            encodedLanguageId,
            maxTokenizationLineLength: this._maxTokenizationLineLength.get(),
            controllerId: this.controllerId,
        });
        this._register(autorun(reader => {
            /** @description update maxTokenizationLineLength */
            const maxTokenizationLineLength = this._maxTokenizationLineLength.read(reader);
            this._worker.$acceptMaxTokenizationLineLength(this.controllerId, maxTokenizationLineLength);
        }));
    }
    dispose() {
        super.dispose();
        this._worker.$acceptRemovedModel(this.controllerId);
    }
    requestTokens(startLineNumber, endLineNumberExclusive) {
        this._worker.$retokenize(this.controllerId, startLineNumber, endLineNumberExclusive);
    }
    /**
     * This method is called from the worker through the worker host.
     */
    async setTokensAndStates(controllerId, versionId, rawTokens, fontTokens, stateDeltas) {
        if (this.controllerId !== controllerId) {
            // This event is for an outdated controller (the worker didn't receive the delete/create messages yet), ignore the event.
            return;
        }
        // _states state, change{k}, ..., change{versionId}, state delta base & rawTokens, change{j}, ..., change{m}, current renderer state
        //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                                ^^^^^^^^^^^^^^^^^^^^^^^^^
        //                | past changes                                                   | future states
        let tokens = ContiguousMultilineTokensBuilder.deserialize(new Uint8Array(rawTokens));
        const fontTokensUpdate = AnnotationsUpdate.deserialize(fontTokens, deserializeFontTokenOptions());
        if (this._shouldLog) {
            console.log('received background tokenization result', {
                fileName: this._model.uri.fsPath.split('\\').pop(),
                updatedTokenLines: tokens.map((t) => t.getLineRange()).join(' & '),
                updatedStateLines: stateDeltas.map((s) => new LineRange(s.startLineNumber, s.startLineNumber + s.stateDeltas.length).toString()).join(' & '),
            });
        }
        if (this._shouldLog) {
            const changes = this._pendingChanges.filter(c => c.versionId <= versionId).map(c => c.changes).map(c => changesToString(c)).join(' then ');
            console.log('Applying changes to local states', changes);
        }
        // Apply past changes to _states
        while (this._pendingChanges.length > 0 &&
            this._pendingChanges[0].versionId <= versionId) {
            const change = this._pendingChanges.shift();
            this._states.acceptChanges(change.changes);
        }
        if (this._pendingChanges.length > 0) {
            if (this._shouldLog) {
                const changes = this._pendingChanges.map(c => c.changes).map(c => changesToString(c)).join(' then ');
                console.log('Considering non-processed changes', changes);
            }
            const curToFutureTransformerTokens = MonotonousIndexTransformer.fromMany(this._pendingChanges.map((c) => linesLengthEditFromModelContentChange(c.changes)));
            // Filter tokens in lines that got changed in the future to prevent flickering
            // These tokens are recomputed anyway.
            const b = new ContiguousMultilineTokensBuilder();
            for (const t of tokens) {
                for (let i = t.startLineNumber; i <= t.endLineNumber; i++) {
                    const result = curToFutureTransformerTokens.transform(i - 1);
                    // If result is undefined, the current line got touched by an edit.
                    // The webworker will send us new tokens for all the new/touched lines after it received the edits.
                    if (result !== undefined) {
                        b.add(i, t.getLineTokens(i));
                    }
                }
            }
            tokens = b.finalize();
            // Apply future changes to tokens
            for (const change of this._pendingChanges) {
                for (const innerChanges of change.changes) {
                    for (let j = 0; j < tokens.length; j++) {
                        tokens[j].applyEdit(innerChanges.range, innerChanges.text);
                    }
                }
            }
            fontTokensUpdate.rebase(this._stringEditFromChanges(this._model, this._pendingChanges));
        }
        const curToFutureTransformerStates = MonotonousIndexTransformer.fromMany(this._pendingChanges.map((c) => linesLengthEditFromModelContentChange(c.changes)));
        if (!this._applyStateStackDiffFn || !this._initialState) {
            const { applyStateStackDiff, INITIAL } = await importAMDNodeModule('vscode-textmate', 'release/main.js');
            this._applyStateStackDiffFn = applyStateStackDiff;
            this._initialState = INITIAL;
        }
        // Apply state deltas to _states and _backgroundTokenizationStore
        for (const d of stateDeltas) {
            let prevState = d.startLineNumber <= 1 ? this._initialState : this._states.getEndState(d.startLineNumber - 1);
            for (let i = 0; i < d.stateDeltas.length; i++) {
                const delta = d.stateDeltas[i];
                let state;
                if (delta) {
                    state = this._applyStateStackDiffFn(prevState, delta);
                    this._states.setEndState(d.startLineNumber + i, state);
                }
                else {
                    state = this._states.getEndState(d.startLineNumber + i);
                }
                const offset = curToFutureTransformerStates.transform(d.startLineNumber + i - 1);
                if (offset !== undefined) {
                    // Only set the state if there is no future change in this line,
                    // as this might make consumers believe that the state/tokens are accurate
                    this._backgroundTokenizationStore.setEndState(offset + 1, state);
                }
                if (d.startLineNumber + i >= this._model.getLineCount() - 1) {
                    this._backgroundTokenizationStore.backgroundTokenizationFinished();
                }
                prevState = state;
            }
        }
        // First set states, then tokens, so that events fired from set tokens don't read invalid states
        this._backgroundTokenizationStore.setTokens(tokens);
        this._backgroundTokenizationStore.setFontInfo(fontTokensUpdate);
    }
    _stringEditFromChanges(model, pendingChanges) {
        const edits = [];
        for (const change of pendingChanges) {
            for (const innerChanges of change.changes) {
                const range = Range.lift(innerChanges.range);
                const text = innerChanges.text;
                const offsetEditStart = model.getOffsetAt(range.getStartPosition());
                const offsetEditEnd = model.getOffsetAt(range.getEndPosition());
                edits.push(StringEdit.replace(new OffsetRange(offsetEditStart, offsetEditEnd), text));
            }
        }
        return StringEdit.compose(edits);
    }
    get _shouldLog() { return this._loggingEnabled.get(); }
}
function changesToString(changes) {
    return changes.map(c => Range.lift(c.range).toString() + ' => ' + c.text).join(' & ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJUb2tlbml6ZXJDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL2JhY2tncm91bmRUb2tlbml6YXRpb24vdGV4dE1hdGVXb3JrZXJUb2tlbml6ZXJDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQWUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTlGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHbkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDL0YsT0FBTyxFQUFFLDJCQUEyQixFQUErQyxNQUFNLGlEQUFpRCxDQUFDO0FBRTNJLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRTNILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBR3BFLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUF5QixNQUFNLDBEQUEwRCxDQUFDO0FBRXBILE1B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
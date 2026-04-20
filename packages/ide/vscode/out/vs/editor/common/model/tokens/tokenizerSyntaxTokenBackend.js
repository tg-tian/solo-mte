/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MutableDisposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { countEOL } from '../../core/misc/eolCounter.js';
import { Position } from '../../core/position.js';
import { LineRange } from '../../core/ranges/lineRange.js';
import { TokenizationRegistry } from '../../languages.js';
import { ContiguousMultilineTokensBuilder } from '../../tokens/contiguousMultilineTokensBuilder.js';
import { ContiguousTokensStore } from '../../tokens/contiguousTokensStore.js';
import { TokenizerWithStateStoreAndTextModel, DefaultBackgroundTokenizer, TrackingTokenizationStateStore } from '../textModelTokens.js';
import { AbstractSyntaxTokenBackend, AttachedViewHandler } from './abstractSyntaxTokenBackend.js';
/** For TextMate */
export class TokenizerSyntaxTokenBackend extends AbstractSyntaxTokenBackend {
    constructor(languageIdCodec, textModel, getLanguageId, attachedViews) {
        super(languageIdCodec, textModel);
        this.getLanguageId = getLanguageId;
        this._tokenizer = null;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        this._defaultBackgroundTokenizer = null;
        this._backgroundTokenizer = this._register(new MutableDisposable());
        this._tokens = new ContiguousTokensStore(this._languageIdCodec);
        this._debugBackgroundTokenizer = this._register(new MutableDisposable());
        this._attachedViewStates = this._register(new DisposableMap());
        this._register(TokenizationRegistry.onDidChange((e) => {
            const languageId = this.getLanguageId();
            if (e.changedLanguages.indexOf(languageId) === -1) {
                return;
            }
            this.todo_resetTokenization();
        }));
        this.todo_resetTokenization();
        this._register(attachedViews.onDidChangeVisibleRanges(({ view, state }) => {
            if (state) {
                let existing = this._attachedViewStates.get(view);
                if (!existing) {
                    existing = new AttachedViewHandler(() => this.refreshRanges(existing.lineRanges));
                    this._attachedViewStates.set(view, existing);
                }
                existing.handleStateChange(state);
            }
            else {
                this._attachedViewStates.deleteAndDispose(view);
            }
        }));
    }
    todo_resetTokenization(fireTokenChangeEvent = true) {
        this._tokens.flush();
        this._debugBackgroundTokens?.flush();
        if (this._debugBackgroundStates) {
            this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
        }
        if (fireTokenChangeEvent) {
            this._onDidChangeTokens.fire({
                semanticTokensApplied: false,
                ranges: [
                    {
                        fromLineNumber: 1,
                        toLineNumber: this._textModel.getLineCount(),
                    },
                ],
            });
        }
        const initializeTokenization = () => {
            if (this._textModel.isTooLargeForTokenization()) {
                return [null, null];
            }
            const tokenizationSupport = TokenizationRegistry.get(this.getLanguageId());
            if (!tokenizationSupport) {
                return [null, null];
            }
            let initialState;
            try {
                initialState = tokenizationSupport.getInitialState();
            }
            catch (e) {
                onUnexpectedError(e);
                return [null, null];
            }
            return [tokenizationSupport, initialState];
        };
        const [tokenizationSupport, initialState] = initializeTokenization();
        if (tokenizationSupport && initialState) {
            this._tokenizer = new TokenizerWithStateStoreAndTextModel(this._textModel.getLineCount(), tokenizationSupport, this._textModel, this._languageIdCodec);
        }
        else {
            this._tokenizer = null;
        }
        this._backgroundTokenizer.clear();
        this._defaultBackgroundTokenizer = null;
        if (this._tokenizer) {
            const b = {
                setTokens: (tokens) => {
                    this.setTokens(tokens);
                },
                setFontInfo: (changes) => {
                    this.setFontInfo(changes);
                },
                backgroundTokenizationFinished: () => {
                    if (this._backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
                        // We already did a full tokenization and don't go back to progressing.
                        return;
                    }
                    const newState = 2 /* BackgroundTokenizationState.Completed */;
                    this._backgroundTokenizationState = newState;
                    this._onDidChangeBackgroundTokenizationState.fire();
                },
                setEndState: (lineNumber, state) => {
                    if (!this._tokenizer) {
                        return;
                    }
                    const firstInvalidEndStateLineNumber = this._tokenizer.store.getFirstInvalidEndStateLineNumber();
                    // Don't accept states for definitely valid states, the renderer is ahead of the worker!
                    if (firstInvalidEndStateLineNumber !== null && lineNumber >= firstInvalidEndStateLineNumber) {
                        this._tokenizer?.store.setEndState(lineNumber, state);
                    }
                },
            };
            if (tokenizationSupport && tokenizationSupport.createBackgroundTokenizer && !tokenizationSupport.backgroundTokenizerShouldOnlyVerifyTokens) {
                this._backgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, b);
            }
            if (!this._backgroundTokenizer.value && !this._textModel.isTooLargeForTokenization()) {
                this._backgroundTokenizer.value = this._defaultBackgroundTokenizer =
                    new DefaultBackgroundTokenizer(this._tokenizer, b);
                this._defaultBackgroundTokenizer.handleChanges();
            }
            if (tokenizationSupport?.backgroundTokenizerShouldOnlyVerifyTokens && tokenizationSupport.createBackgroundTokenizer) {
                this._debugBackgroundTokens = new ContiguousTokensStore(this._languageIdCodec);
                this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
                this._debugBackgroundTokenizer.clear();
                this._debugBackgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, {
                    setTokens: (tokens) => {
                        this._debugBackgroundTokens?.setMultilineTokens(tokens, this._textModel);
                    },
                    setFontInfo: (changes) => {
                        this.setFontInfo(changes);
                    },
                    backgroundTokenizationFinished() {
                        // NO OP
                    },
                    setEndState: (lineNumber, state) => {
                        this._debugBackgroundStates?.setEndState(lineNumber, state);
                    },
                });
            }
            else {
                this._debugBackgroundTokens = undefined;
                this._debugBackgroundStates = undefined;
                this._debugBackgroundTokenizer.value = undefined;
            }
        }
        this.refreshAllVisibleLineTokens();
    }
    handleDidChangeAttached() {
        this._defaultBackgroundTokenizer?.handleChanges();
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.todo_resetTokenization(false);
        }
        else if (!e.isEolChange) { // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength] = countEOL(c.text);
                this._tokens.acceptEdit(c.range, eolCount, firstLineLength);
                this._debugBackgroundTokens?.acceptEdit(c.range, eolCount, firstLineLength);
            }
            this._debugBackgroundStates?.acceptChanges(e.changes);
            if (this._tokenizer) {
                this._tokenizer.store.acceptChanges(e.changes);
            }
            this._defaultBackgroundTokenizer?.handleChanges();
        }
    }
    setTokens(tokens) {
        const { changes } = this._tokens.setMultilineTokens(tokens, this._textModel);
        if (changes.length > 0) {
            this._onDidChangeTokens.fire({ semanticTokensApplied: false, ranges: changes, });
        }
        return { changes: changes };
    }
    setFontInfo(changes) {
        this._onDidChangeFontTokens.fire({ changes });
    }
    refreshAllVisibleLineTokens() {
        const ranges = LineRange.joinMany([...this._attachedViewStates].map(([_, s]) => s.lineRanges));
        this.refreshRanges(ranges);
    }
    refreshRanges(ranges) {
        for (const range of ranges) {
            this.refreshRange(range.startLineNumber, range.endLineNumberExclusive - 1);
        }
    }
    refreshRange(startLineNumber, endLineNumber) {
        if (!this._tokenizer) {
            return;
        }
        startLineNumber = Math.max(1, Math.min(this._textModel.getLineCount(), startLineNumber));
        endLineNumber = Math.min(this._textModel.getLineCount(), endLineNumber);
        const builder = new ContiguousMultilineTokensBuilder();
        const { heuristicTokens } = this._tokenizer.tokenizeHeuristically(builder, startLineNumber, endLineNumber);
        const changedTokens = this.setTokens(builder.finalize());
        if (heuristicTokens) {
            // We overrode tokens with heuristically computed ones.
            // Because old states might get reused (thus stopping invalidation),
            // we have to explicitly request the tokens for the changed ranges again.
            for (const c of changedTokens.changes) {
                this._backgroundTokenizer.value?.requestTokens(c.fromLineNumber, c.toLineNumber + 1);
            }
        }
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    forceTokenization(lineNumber) {
        const builder = new ContiguousMultilineTokensBuilder();
        this._tokenizer?.updateTokensUntilLine(builder, lineNumber);
        this.setTokens(builder.finalize());
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    hasAccurateTokensForLine(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.isCheapToTokenize(lineNumber);
    }
    getLineTokens(lineNumber) {
        const lineText = this._textModel.getLineContent(lineNumber);
        const result = this._tokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
        if (this._debugBackgroundTokens && this._debugBackgroundStates && this._tokenizer) {
            if (this._debugBackgroundStates.getFirstInvalidEndStateLineNumberOrMax() > lineNumber && this._tokenizer.store.getFirstInvalidEndStateLineNumberOrMax() > lineNumber) {
                const backgroundResult = this._debugBackgroundTokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
                if (!result.equals(backgroundResult) && this._debugBackgroundTokenizer.value?.reportMismatchingTokens) {
                    this._debugBackgroundTokenizer.value.reportMismatchingTokens(lineNumber);
                }
            }
        }
        return result;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        if (!this._tokenizer) {
            return 0 /* StandardTokenType.Other */;
        }
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        this.forceTokenization(position.lineNumber);
        return this._tokenizer.getTokenTypeIfInsertingCharacter(position, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        if (!this._tokenizer) {
            return null;
        }
        this.forceTokenization(lineNumber);
        return this._tokenizer.tokenizeLinesAt(lineNumber, lines);
    }
    get hasTokens() {
        return this._tokens.hasTokens;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyU3ludGF4VG9rZW5CYWNrZW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5zL3Rva2VuaXplclN5bnRheFRva2VuQmFja2VuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTNELE9BQU8sRUFBa0Qsb0JBQW9CLEVBQXNELE1BQU0sb0JBQW9CLENBQUM7QUFLOUosT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHOUUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDeEksT0FBTyxFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUFpQixNQUFNLGlDQUFpQyxDQUFDO0FBRWpILG1CQUFtQjtBQUNuQixNQUFNLE9BQU8sMkJBQTRCLFNBQVEsMEJBQTBCO0lBaUIxRSxZQUNDLGVBQWlDLEVBQ2pDLFNBQW9CLEVBQ0gsYUFBMkIsRUFDNUMsYUFBNEI7UUFFNUIsS0FBSyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUhq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
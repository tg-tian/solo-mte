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
import { ILogService } from '../../../../../platform/log/common/log.js';
const MIN_BOOTSTRAP_TOTAL_TIME = 250;
const LARGE_BOOTSTRAP_MIN_TOTAL_TIME = 500;
const MAX_INTERVAL_TIME = 250;
const LARGE_UPDATE_MAX_INTERVAL_TIME = 1000;
const WORDS_FOR_LARGE_CHUNK = 10;
const MIN_UPDATES_FOR_STABLE_RATE = 2;
/**
 * Estimates the loading rate of a chat response stream so that we can try to match the rendering rate to
 * the rate at which text is actually produced by the model. This can only be an estimate for various reasons-
 * reasoning summaries don't represent real generated tokens, we don't have full visibility into tool calls,
 * some model providers send text in large chunks rather than a steady stream, e.g. Gemini, we don't know about
 * latency between agent requests, etc.
 *
 * When the first text is received, we don't know how long it actually took to generate. So we apply an assumed
 * minimum time, until we have received enough data to make a stable estimate. This is the "bootstrap" phase.
 *
 * Since we don't have visibility into when the model started generated tool call args, or when the client was running
 * a tool, we ignore long pauses. The ignore period is longer for large chunks, since those naturally take longer
 * to generate anyway.
 *
 * After that, the word load rate is estimated using the words received since the end of the bootstrap phase.
 */
let ChatStreamStatsTracker = class ChatStreamStatsTracker {
    constructor(logService) {
        this.logService = logService;
        const start = Date.now();
        this._data = {
            totalTime: 0,
            lastUpdateTime: start,
            impliedWordLoadRate: 0,
            lastWordCount: 0,
            firstMarkdownTime: undefined,
            bootstrapActive: true,
            wordCountAtBootstrapExit: undefined,
            updatesWithNewWords: 0
        };
        this._publicData = { impliedWordLoadRate: 0, lastWordCount: 0 };
    }
    get data() {
        return this._publicData;
    }
    get internalData() {
        return this._data;
    }
    update(totals) {
        const { totalWordCount: wordCount } = totals;
        if (wordCount === this._data.lastWordCount) {
            this.trace('Update- no new words');
            return undefined;
        }
        const now = Date.now();
        const newWords = wordCount - this._data.lastWordCount;
        const hadNoWordsBeforeUpdate = this._data.lastWordCount === 0;
        let firstMarkdownTime = this._data.firstMarkdownTime;
        let wordCountAtBootstrapExit = this._data.wordCountAtBootstrapExit;
        if (typeof firstMarkdownTime !== 'number' && wordCount > 0) {
            firstMarkdownTime = now;
        }
        const updatesWithNewWords = this._data.updatesWithNewWords + 1;
        if (hadNoWordsBeforeUpdate) {
            this._data.lastUpdateTime = now;
        }
        const intervalCap = newWords > WORDS_FOR_LARGE_CHUNK ? LARGE_UPDATE_MAX_INTERVAL_TIME : MAX_INTERVAL_TIME;
        const timeDiff = Math.min(now - this._data.lastUpdateTime, intervalCap);
        let totalTime = this._data.totalTime + timeDiff;
        const minBootstrapTotalTime = hadNoWordsBeforeUpdate && wordCount > WORDS_FOR_LARGE_CHUNK ? LARGE_BOOTSTRAP_MIN_TOTAL_TIME : MIN_BOOTSTRAP_TOTAL_TIME;
        let bootstrapActive = this._data.bootstrapActive;
        if (bootstrapActive) {
            const stableStartTime = firstMarkdownTime;
            const hasStableData = typeof stableStartTime === 'number'
                && updatesWithNewWords >= MIN_UPDATES_FOR_STABLE_RATE
                && wordCount >= WORDS_FOR_LARGE_CHUNK;
            if (hasStableData) {
                bootstrapActive = false;
                totalTime = Math.max(now - stableStartTime, timeDiff);
                wordCountAtBootstrapExit = this._data.lastWordCount;
                this.trace('Has stable data');
            }
            else {
                totalTime = Math.max(totalTime, minBootstrapTotalTime);
            }
        }
        const wordsSinceBootstrap = typeof wordCountAtBootstrapExit === 'number' ? Math.max(wordCount - wordCountAtBootstrapExit, 0) : wordCount;
        const effectiveTime = totalTime;
        const effectiveWordCount = bootstrapActive ? wordCount : wordsSinceBootstrap;
        const impliedWordLoadRate = effectiveTime > 0 ? effectiveWordCount / (effectiveTime / 1000) : 0;
        this._data = {
            totalTime,
            lastUpdateTime: now,
            impliedWordLoadRate,
            lastWordCount: wordCount,
            firstMarkdownTime,
            bootstrapActive,
            wordCountAtBootstrapExit,
            updatesWithNewWords
        };
        this._publicData = {
            impliedWordLoadRate,
            lastWordCount: wordCount
        };
        const traceWords = bootstrapActive ? wordCount : wordsSinceBootstrap;
        this.trace(`Update- got ${traceWords} words over last ${totalTime}ms = ${impliedWordLoadRate} words/s`);
        return this._data;
    }
    trace(message) {
        this.logService.trace(`ChatStreamStatsTracker#update: ${message}`);
    }
};
ChatStreamStatsTracker = __decorate([
    __param(0, ILogService)
], ChatStreamStatsTracker);
export { ChatStreamStatsTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0cmVhbVN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL21vZGVsL2NoYXRTdHJlYW1TdGF0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFvQnhFLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxDQUFDO0FBQ3JDLE1BQU0sOEJBQThCLEdBQUcsR0FBRyxDQUFDO0FBQzNDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sOEJBQThCLEdBQUcsSUFBSSxDQUFDO0FBQzVDLE1BQU0scUJBQXFCLEdBQUcsRUFBRSxDQUFDO0FBQ2pDLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxDQUFDO0FBRXRDOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNJLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBSWxDLFlBQytCLFVBQXVCO1FBQXZCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFFckQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUc7WUFDWixTQUFTLEVBQUUsQ0FBQztZQUNaLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLG1CQUFtQixFQUFFLENBQUM7WUFDdEIsYUFBYSxFQUFFLENBQUM7WUFDaEIsaUJBQWlCLEVBQUUsU0FBUztZQUM1QixlQUFlLEVBQUUsSUFBSTtZQUNyQix3QkFBd0IsRUFBRSxTQUFTO1lBQ25DLG1CQUFtQixFQUFFLENBQUM7U0FDdEIsQ0FBQztRQUNGLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ2pFLENB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
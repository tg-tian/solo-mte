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
import { WindowIntervalTimer } from '../../../../base/browser/dom.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { themeColorFromId, ThemeIcon } from '../../../../base/common/themables.js';
import { StableEditorScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import { LineSource, RenderOptions, renderLines } from '../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { LineRange } from '../../../../editor/common/core/ranges/lineRange.js';
import { Range } from '../../../../editor/common/core/range.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { countWords } from '../../chat/common/chatWordCounter.js';
import { ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, minimapInlineChatDiffInserted, overviewRulerInlineChatDiffInserted } from '../common/inlineChat.js';
import { assertType } from '../../../../base/common/types.js';
import { performAsyncTextEdit, asProgressiveEdit } from './utils.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Schemas } from '../../../../base/common/network.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DefaultChatTextEditor } from '../../chat/browser/codeBlockPart.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { ConflictActionsFactory } from '../../mergeEditor/browser/view/conflictActions.js';
import { observableValue } from '../../../../base/common/observable.js';
import { IMenuService, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { InlineDecoration } from '../../../../editor/common/viewModel/inlineDecorations.js';
import { EditSources } from '../../../../editor/common/textModelEditSource.js';
export var HunkAction;
(function (HunkAction) {
    HunkAction[HunkAction["Accept"] = 0] = "Accept";
    HunkAction[HunkAction["Discard"] = 1] = "Discard";
    HunkAction[HunkAction["MoveNext"] = 2] = "MoveNext";
    HunkAction[HunkAction["MovePrev"] = 3] = "MovePrev";
    HunkAction[HunkAction["ToggleDiff"] = 4] = "ToggleDiff";
})(HunkAction || (HunkAction = {}));
let LiveStrategy = class LiveStrategy {
    constructor(_session, _editor, _zone, _showOverlayToolbar, contextKeyService, _editorWorkerService, _menuService, _contextService, _textFileService, _instaService) {
        this._session = _session;
        this._editor = _editor;
        this._zone = _zone;
        this._showOverlayToolbar = _showOverlayToolbar;
        this._editorWorkerService = _editorWorkerService;
        this._menuService = _menuService;
        this._contextService = _contextService;
        this._textFileService = _textFileService;
        this._instaService = _instaService;
        this._decoInsertedText = ModelDecorationOptions.register({
            description: 'inline-modified-line',
            className: 'inline-chat-inserted-range-linehighlight',
            isWholeLine: true,
            overviewRuler: {
                position: OverviewRulerLane.Full,
                color: themeColorFromId(overviewRulerInlineChatDiffInserted),
            },
            minimap: {
                position: 1 /* MinimapPosition.Inline */,
                color: themeColorFromId(minimapInlineChatDiffInserted),
            }
        });
        this._decoInsertedTextRange = ModelDecorationOptions.register({
            description: 'inline-chat-inserted-range-linehighlight',
            className: 'inline-chat-inserted-range',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        this._store = new DisposableStore();
        this._onDidAccept = this._store.add(new Emitter());
        this._onDidDiscard = this._store.add(new Emitter());
        this._editCount = 0;
        this._hunkData = new Map();
        this.onDidAccept = this._onDidAccept.event;
        this.onDidDiscard = this._onDidDiscard.event;
        this._ctxCurrentChangeHasDiff = CTX_INLINE_CHAT_CHANGE_HAS_DIFF.bindTo(contextKeyService);
        this._ctxCurrentChangeShowsDiff = CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF.bindTo(contextKeyService);
        this._progressiveEditingDecorations = this._editor.createDecorationsCollection();
        this._lensActionsFactory = this._store.add(new ConflictActionsFactory(this._editor));
    }
    dispose() {
        this._resetDiff();
        this._store.dispose();
    }
    _resetDiff() {
        this._ctxCurrentChangeHasDiff.reset();
        this._ctxCurrentChangeShowsDiff.reset();
        this._zone.widget.updateStatus('');
        this._progressiveEditingDecorations.clear();
        for (const data of this._hunkData.values()) {
            data.remove();
        }
    }
    async apply() {
        this._resetDiff();
        if (this._editCount > 0) {
            this._editor.pushUndoStop();
        }
        await this._doApplyChanges(true);
    }
    cancel() {
        this._resetDiff();
        return this._session.hunkData.discardAll();
    }
    async makeChanges(edits, obs, undoStopBefore, metadata) {
        return this._makeChanges(edits, obs, undefined, undefined, undoStopBefore, metadata);
    }
    async makeProgressiveChanges(edits, obs, opts, undoStopBefore, metadata) {
        // add decorations once per line that got edited
        const progress = new Progress(edits => {
            const newLines = new Set();
            for (const edit of edits) {
                LineRange.fromRange(edit.range).forEach(line => newLines.add(line));
            }
            const existingRanges = this._progressiveEditingDecorations.getRanges().map(LineRange.fromRange);
            for (const existingRange of existingRanges) {
                existingRange.forEach(line => newLines.delete(line));
            }
            const newDecorations = [];
            for (const line of newLines) {
                newDecorations.push({ range: new Range(line, 1, line, Number.MAX_VALUE), options: this._decoInsertedText });
            }
            this._progressiveEditingDecorations.append(newDecorations);
        });
        return this._makeChanges(edits, obs, opts, progress, undoStopBefore, metadata);
    }
    async _makeChanges(edits, obs, opts, progress, undoStopBefore, metadata) {
        // push undo stop before first edit
        if (undoStopBefore) {
            this._editor.pushUndoStop();
        }
        this._editCount++;
        const editSource = EditSources.inlineChatApplyEdit({
            modelId: metadata.modelId,
            extensionId: metadata.extensionId,
            requestId: metadata.requestId,
            sessionId: undefined,
            languageId: this._session.textModelN.getLanguageId(),
        });
        if (opts) {
            // ASYNC
            const durationInSec = opts.duration / 1000;
            for (const edit of edits) {
                const wordCount = countWords(edit.text ?? '');
                const speed = wordCount / durationInSec;
                // console.log({ durationInSec, wordCount, speed: wordCount / durationInSec });
                const asyncEdit = asProgressiveEdit(new WindowIntervalTimer(this._zone.domNode), edit, speed, opts.token);
                await performAsyncTextEdit(this._session.textModelN, asyncEdit, progress, obs, editSource);
            }
        }
        else {
            // SYNC
            obs.start();
            this._session.textModelN.pushEditOperations(null, edits, (undoEdits) => {
                progress?.report(undoEdits);
                return null;
            }, undefined, editSource);
            obs.stop();
        }
    }
    performHunkAction(hunk, action) {
        const displayData = this._findDisplayData(hunk);
        if (!displayData) {
            // no hunks (left or not yet) found, make sure to
            // finish the sessions
            if (action === 0 /* HunkAction.Accept */) {
                this._onDidAccept.fire();
            }
            else if (action === 1 /* HunkAction.Discard */) {
                this._onDidDiscard.fire();
            }
            return;
        }
        if (action === 0 /* HunkAction.Accept */) {
            displayData.acceptHunk();
        }
        else if (action === 1 /* HunkAction.Discard */) {
            displayData.discardHunk();
        }
        else if (action === 2 /* HunkAction.MoveNext */) {
            displayData.move(true);
        }
        else if (action === 3 /* HunkAction.MovePrev */) {
            displayData.move(false);
        }
        else if (action === 4 /* HunkAction.ToggleDiff */) {
            displayData.toggleDiff?.();
        }
    }
    _findDisplayData(hunkInfo) {
        let result;
        if (hunkInfo) {
            // use context hunk (from tool/buttonbar)
            result = this._hunkData.get(hunkInfo);
        }
        if (!result && this._zone.position) {
            // find nearest from zone position
            const zoneLine = this._zone.position.lineNumber;
            let distance = Number.MAX_SAFE_INTEGER;
            for (const candidate of this._hunkData.values()) {
                if (candidate.hunk.getState() !== 0 /* HunkState.Pending */) {
                    continue;
                }
                const hunkRanges = candidate.hunk.getRangesN();
                if (hunkRanges.length === 0) {
                    // bogous hunk
                    continue;
                }
                const myDistance = zoneLine <= hunkRanges[0].startLineNumber
                    ? hunkRanges[0].startLineNumber - zoneLine
                    : zoneLine - hunkRanges[0].endLineNumber;
                if (myDistance < distance) {
                    distance = myDistance;
                    result = candidate;
                }
            }
        }
        if (!result) {
            // fallback: first hunk that is pending
            result = Iterable.first(Iterable.filter(this._hunkData.values(), candidate => candidate.hunk.getState() === 0 /* HunkState.Pending */));
        }
        return result;
    }
    async renderChanges() {
        this._progressiveEditingDecorations.clear();
        const renderHunks = () => {
            let widgetData;
            changeDecorationsAndViewZones(this._editor, (decorationsAccessor, viewZoneAccessor) => {
                const keysNow = new Set(this._hunkData.keys());
                widgetData = undefined;
                for (const hunkData of this._session.hunkData.getInfo()) {
                    keysNow.delete(hunkData);
                    const hunkRanges = hunkData.getRangesN();
                    let data = this._hunkData.get(hunkData);
                    if (!data) {
                        // first time -> create decoration
                        const decorationIds = [];
                        for (let i = 0; i < hunkRanges.length; i++) {
                            decorationIds.push(decorationsAccessor.addDecoration(hunkRanges[i], i === 0
                                ? this._decoInsertedText
                                : this._decoInsertedTextRange));
                        }
                        const acceptHunk = () => {
                            hunkData.acceptChanges();
                            renderHunks();
                        };
                        const discardHunk = () => {
                            hunkData.discardChanges();
                            renderHunks();
                        };
                        // original view zone
                        const mightContainNonBasicASCII = this._session.textModel0.mightContainNonBasicASCII();
                        const mightContainRTL = this._session.textModel0.mightContainRTL();
                        const renderOptions = RenderOptions.fromEditor(this._editor);
                        const originalRange = hunkData.getRanges0()[0];
                        const source = new LineSource(LineRange.fromRangeInclusive(originalRange).mapToLineArray(l => this._session.textModel0.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                        const domNode = document.createElement('div');
                        domNode.className = 'inline-chat-original-zone2';
                        const result = renderLines(source, renderOptions, [new InlineDecoration(new Range(originalRange.startLineNumber, 1, originalRange.startLineNumber, 1), '', 0 /* InlineDecorationType.Regular */)], domNode);
                        const viewZoneData = {
                            afterLineNumber: -1,
                            heightInLines: result.heightInLines,
                            domNode,
                            ordinal: 50000 + 2 // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                        };
                        const toggleDiff = () => {
                            const scrollState = StableEditorScrollState.capture(this._editor);
                            changeDecorationsAndViewZones(this._editor, (_decorationsAccessor, viewZoneAccessor) => {
                                assertType(data);
                                if (!data.diffViewZoneId) {
                                    const [hunkRange] = hunkData.getRangesN();
                                    viewZoneData.afterLineNumber = hunkRange.startLineNumber - 1;
                                    data.diffViewZoneId = viewZoneAccessor.addZone(viewZoneData);
                                }
                                else {
                                    viewZoneAccessor.removeZone(data.diffViewZoneId);
                                    data.diffViewZoneId = undefined;
                                }
                            });
                            this._ctxCurrentChangeShowsDiff.set(typeof data?.diffViewZoneId === 'string');
                            scrollState.restore(this._editor);
                        };
                        let lensActions;
                        const lensActionsViewZoneIds = [];
                        if (this._showOverlayToolbar && hunkData.getState() === 0 /* HunkState.Pending */) {
                            lensActions = new DisposableStore();
                            const menu = this._menuService.createMenu(MENU_INLINE_CHAT_ZONE, this._contextService);
                            const makeActions = () => {
                                const actions = [];
                                const tuples = menu.getActions({ arg: hunkData });
                                for (const [, group] of tuples) {
                                    for (const item of group) {
                                        if (item instanceof MenuItemAction) {
                                            let text = item.label;
                                            if (item.id === ACTION_TOGGLE_DIFF) {
                                                text = item.checked ? 'Hide Changes' : 'Show Changes';
                                            }
                                            else if (ThemeIcon.isThemeIcon(item.item.icon)) {
                                                text = `$(${item.item.icon.id}) ${text}`;
                                            }
                                            actions.push({
                                                text,
                                                tooltip: item.tooltip,
                                                action: async () => item.run(),
                                            });
                                        }
                                    }
                                }
                                return actions;
                            };
                            const obs = observableValue(this, makeActions());
                            lensActions.add(menu.onDidChange(() => obs.set(makeActions(), undefined)));
                            lensActions.add(menu);
                            lensActions.add(this._lensActionsFactory.createWidget(viewZoneAccessor, hunkRanges[0].startLineNumber - 1, obs, lensActionsViewZoneIds));
                        }
                        const remove = () => {
                            changeDecorationsAndViewZones(this._editor, (decorationsAccessor, viewZoneAccessor) => {
                                assertType(data);
                                for (const decorationId of data.decorationIds) {
                                    decorationsAccessor.removeDecoration(decorationId);
                                }
                                if (data.diffViewZoneId) {
                                    viewZoneAccessor.removeZone(data.diffViewZoneId);
                                }
                                data.decorationIds = [];
                                data.diffViewZoneId = undefined;
                                data.lensActionsViewZoneIds?.forEach(viewZoneAccessor.removeZone);
                                data.lensActionsViewZoneIds = undefined;
                            });
                            lensActions?.dispose();
                        };
                        const move = (next) => {
                            const keys = Array.from(this._hunkData.keys());
                            const idx = keys.indexOf(hunkData);
                            const nextIdx = (idx + (next ? 1 : -1) + keys.length) % keys.length;
                            if (nextIdx !== idx) {
                                const nextData = this._hunkData.get(keys[nextIdx]);
                                this._zone.updatePositionAndHeight(nextData?.position);
                                renderHunks();
                            }
                        };
                        const zoneLineNumber = this._zone.position?.lineNumber ?? this._editor.getPosition().lineNumber;
                        const myDistance = zoneLineNumber <= hunkRanges[0].startLineNumber
                            ? hunkRanges[0].startLineNumber - zoneLineNumber
                            : zoneLineNumber - hunkRanges[0].endLineNumber;
                        data = {
                            hunk: hunkData,
                            decorationIds,
                            diffViewZoneId: '',
                            diffViewZone: viewZoneData,
                            lensActionsViewZoneIds,
                            distance: myDistance,
                            position: hunkRanges[0].getStartPosition().delta(-1),
                            acceptHunk,
                            discardHunk,
                            toggleDiff: !hunkData.isInsertion() ? toggleDiff : undefined,
                            remove,
                            move,
                        };
                        this._hunkData.set(hunkData, data);
                    }
                    else if (hunkData.getState() !== 0 /* HunkState.Pending */) {
                        data.remove();
                    }
                    else {
                        // update distance and position based on modifiedRange-decoration
                        const zoneLineNumber = this._zone.position?.lineNumber ?? this._editor.getPosition().lineNumber;
                        const modifiedRangeNow = hunkRanges[0];
                        data.position = modifiedRangeNow.getStartPosition().delta(-1);
                        data.distance = zoneLineNumber <= modifiedRangeNow.startLineNumber
                            ? modifiedRangeNow.startLineNumber - zoneLineNumber
                            : zoneLineNumber - modifiedRangeNow.endLineNumber;
                    }
                    if (hunkData.getState() === 0 /* HunkState.Pending */ && (!widgetData || data.distance < widgetData.distance)) {
                        widgetData = data;
                    }
                }
                for (const key of keysNow) {
                    const data = this._hunkData.get(key);
                    if (data) {
                        this._hunkData.delete(key);
                        data.remove();
                    }
                }
            });
            if (widgetData) {
                this._zone.reveal(widgetData.position);
                // const mode = this._configService.getValue<'on' | 'off' | 'auto'>(InlineChatConfigKeys.AccessibleDiffView);
                // if (mode === 'on' || mode === 'auto' && this._accessibilityService.isScreenReaderOptimized()) {
                // 	this._zone.widget.showAccessibleHunk(this._session, widgetData.hunk);
                // }
                this._ctxCurrentChangeHasDiff.set(Boolean(widgetData.toggleDiff));
            }
            else if (this._hunkData.size > 0) {
                // everything accepted or rejected
                let oneAccepted = false;
                for (const hunkData of this._session.hunkData.getInfo()) {
                    if (hunkData.getState() === 1 /* HunkState.Accepted */) {
                        oneAccepted = true;
                        break;
                    }
                }
                if (oneAccepted) {
                    this._onDidAccept.fire();
                }
                else {
                    this._onDidDiscard.fire();
                }
            }
            return widgetData;
        };
        return renderHunks()?.position;
    }
    getWholeRangeDecoration() {
        // don't render the blue in live mode
        return [];
    }
    async _doApplyChanges(ignoreLocal) {
        const untitledModels = [];
        const editor = this._instaService.createInstance(DefaultChatTextEditor);
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response?.response) {
                continue;
            }
            for (const item of request.response.response.value) {
                if (item.kind !== 'textEditGroup') {
                    continue;
                }
                if (ignoreLocal && isEqual(item.uri, this._session.textModelN.uri)) {
                    continue;
                }
                await editor.apply(request.response, item, undefined);
                if (item.uri.scheme === Schemas.untitled) {
                    const untitled = this._textFileService.untitled.get(item.uri);
                    if (untitled) {
                        untitledModels.push(untitled);
                    }
                }
            }
        }
        for (const untitledModel of untitledModels) {
            if (!untitledModel.isDisposed()) {
                await untitledModel.resolve();
                await untitledModel.save({ reason: 1 /* SaveReason.EXPLICIT */ });
            }
        }
    }
};
LiveStrategy = __decorate([
    __param(4, IContextKeyService),
    __param(5, IEditorWorkerService),
    __param(6, IMenuService),
    __param(7, IContextKeyService),
    __param(8, ITextFileService),
    __param(9, IInstantiationService)
], LiveStrategy);
export { LiveStrategy };
function changeDecorationsAndViewZones(editor, callback) {
    editor.changeDecorations(decorationsAccessor => {
        editor.changeViewZones(viewZoneAccessor => {
            callback(decorationsAccessor, viewZoneAccessor);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFN0cmF0ZWdpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRTdHJhdGVnaWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLDRGQUE0RixDQUFDO0FBRXBKLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFaEUsT0FBTyxFQUFnRyxpQkFBaUIsRUFBMEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3TCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSwr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
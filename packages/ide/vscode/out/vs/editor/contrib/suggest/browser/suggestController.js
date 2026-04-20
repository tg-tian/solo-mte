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
var SuggestController_1;
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, dispose, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType, isObject } from '../../../../base/common/types.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ProviderId } from '../../../common/languages.js';
import { SnippetController2 } from '../../snippet/browser/snippetController2.js';
import { SnippetParser } from '../../snippet/browser/snippetParser.js';
import { ISuggestMemoryService } from './suggestMemory.js';
import { WordContextKey } from './wordContextKey.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Context as SuggestContext, suggestWidgetStatusbarMenu } from './suggest.js';
import { SuggestAlternatives } from './suggestAlternatives.js';
import { CommitCharacterController } from './suggestCommitCharacters.js';
import { SuggestModel } from './suggestModel.js';
import { OvertypingCapturer } from './suggestOvertypingCapturer.js';
import { SuggestWidget } from './suggestWidget.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { basename, extname } from '../../../../base/common/resources.js';
import { hash } from '../../../../base/common/hash.js';
import { WindowIdleValue, getWindow } from '../../../../base/browser/dom.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { EditSources } from '../../../common/textModelEditSource.js';
// sticky suggest widget which doesn't disappear on focus out and such
const _sticky = false;
class LineSuffix {
    constructor(_model, _position) {
        this._model = _model;
        this._position = _position;
        this._decorationOptions = ModelDecorationOptions.register({
            description: 'suggest-line-suffix',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
        });
        // spy on what's happening right of the cursor. two cases:
        // 1. end of line -> check that it's still end of line
        // 2. mid of line -> add a marker and compute the delta
        const maxColumn = _model.getLineMaxColumn(_position.lineNumber);
        if (maxColumn !== _position.column) {
            const offset = _model.getOffsetAt(_position);
            const end = _model.getPositionAt(offset + 1);
            _model.changeDecorations(accessor => {
                if (this._marker) {
                    accessor.removeDecoration(this._marker);
                }
                this._marker = accessor.addDecoration(Range.fromPositions(_position, end), this._decorationOptions);
            });
        }
    }
    dispose() {
        if (this._marker && !this._model.isDisposed()) {
            this._model.changeDecorations(accessor => {
                accessor.removeDecoration(this._marker);
                this._marker = undefined;
            });
        }
    }
    delta(position) {
        if (this._model.isDisposed() || this._position.lineNumber !== position.lineNumber) {
            // bail out early if things seems fishy
            return 0;
        }
        // read the marker (in case suggest was triggered at line end) or compare
        // the cursor to the line end.
        if (this._marker) {
            const range = this._model.getDecorationRange(this._marker);
            const end = this._model.getOffsetAt(range.getStartPosition());
            return end - this._model.getOffsetAt(position);
        }
        else {
            return this._model.getLineMaxColumn(position.lineNumber) - position.column;
        }
    }
}
var InsertFlags;
(function (InsertFlags) {
    InsertFlags[InsertFlags["None"] = 0] = "None";
    InsertFlags[InsertFlags["NoBeforeUndoStop"] = 1] = "NoBeforeUndoStop";
    InsertFlags[InsertFlags["NoAfterUndoStop"] = 2] = "NoAfterUndoStop";
    InsertFlags[InsertFlags["KeepAlternativeSuggestions"] = 4] = "KeepAlternativeSuggestions";
    InsertFlags[InsertFlags["AlternativeOverwriteConfig"] = 8] = "AlternativeOverwriteConfig";
})(InsertFlags || (InsertFlags = {}));
let SuggestController = class SuggestController {
    static { SuggestController_1 = this; }
    static { this.ID = 'editor.contrib.suggestController'; }
    static get(editor) {
        return editor.getContribution(SuggestController_1.ID);
    }
    get onWillInsertSuggestItem() { return this._onWillInsertSuggestItem.event; }
    constructor(editor, _memoryService, _commandService, _contextKeyService, _instantiationService, _logService, _telemetryService) {
        this._memoryService = _memoryService;
        this._commandService = _commandService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._lineSuffix = new MutableDisposable();
        this._toDispose = new DisposableStore();
        this._selectors = new PriorityRegistry(s => s.priority);
        this._onWillInsertSuggestItem = new Emitter();
        this._wantsForceRenderingAbove = false;
        this.editor = editor;
        this.model = _instantiationService.createInstance(SuggestModel, this.editor);
        // default selector
        this._selectors.register({
            priority: 0,
            select: (model, pos, items) => this._memoryService.select(model, pos, items)
        });
        // context key: update insert/replace mode
        const ctxInsertMode = SuggestContext.InsertMode.bindTo(_contextKeyService);
        ctxInsertMode.set(editor.getOption(134 /* EditorOption.suggest */).insertMode);
        this._toDispose.add(this.model.onDidTrigger(() => ctxInsertMode.set(editor.getOption(134 /* EditorOption.suggest */).insertMode)));
        this.widget = this._toDispose.add(new WindowIdleValue(getWindow(editor.getDomNode()), () => {
            const widget = this._instantiationService.createInstance(SuggestWidget, this.editor);
            this._toDispose.add(widget);
            this._toDispose.add(widget.onDidSelect(item => this._insertSuggestion(item, 0 /* InsertFlags.None */), this));
            // Wire up logic to accept a suggestion on certain characters
            const commitCharacterController = new CommitCharacterController(this.editor, widget, this.model, item => this._insertSuggestion(item, 2 /* InsertFlags.NoAfterUndoStop */));
            this._toDispose.add(commitCharacterController);
            // Wire up makes text edit context key
            const ctxMakesTextEdit = SuggestContext.MakesTextEdit.bindTo(this._contextKeyService);
            const ctxHasInsertAndReplace = SuggestContext.HasInsertAndReplaceRange.bindTo(this._contextKeyService);
            const ctxCanResolve = SuggestContext.CanResolve.bindTo(this._contextKeyService);
            this._toDispose.add(toDisposable(() => {
                ctxMakesTextEdit.reset();
                ctxHasInsertAndReplace.reset();
                ctxCanResolve.reset();
            }));
            this._toDispose.add(widget.onDidFocus(({ item }) => {
                // (ctx: makesTextEdit)
                const position = this.editor.getPosition();
                const startColumn = item.editStart.column;
                const endColumn = position.column;
                let value = true;
                if (this.editor.getOption(1 /* EditorOption.acceptSuggestionOnEnter */) === 'smart'
                    && this.model.state === 2 /* State.Auto */
                    && !item.completion.additionalTextEdits
                    && !(item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */)
                    && endColumn - startColumn === item.completion.insertText.length) {
                    const oldText = this.editor.getModel().getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn,
                        endLineNumber: position.lineNumber,
                        endColumn
                    });
                    value = oldText !== item.completion.insertText;
                }
                ctxMakesTextEdit.set(value);
                // (ctx: hasInsertAndReplaceRange)
                ctxHasInsertAndReplace.set(!Position.equals(item.editInsertEnd, item.editReplaceEnd));
                // (ctx: canResolve)
                ctxCanResolve.set(Boolean(item.provider.resolveCompletionItem) || Boolean(item.completion.documentation) || item.completion.detail !== item.completion.label);
            }));
            if (this._wantsForceRenderingAbove) {
                widget.forceRenderingAbove();
            }
            return widget;
        }));
        // Wire up text overtyping capture
        this._overtypingCapturer = this._toDispose.add(new WindowIdleValue(getWindow(editor.getDomNode()), () => {
            return this._toDispose.add(new OvertypingCapturer(this.editor, this.model));
        }));
        this._alternatives = this._toDispose.add(new WindowIdleValue(getWindow(editor.getDomNode()), () => {
            return this._toDispose.add(new SuggestAlternatives(this.editor, this._contextKeyService));
        }));
        this._toDispose.add(_instantiationService.createInstance(WordContextKey, editor));
        this._toDispose.add(this.model.onDidTrigger(e => {
            this.widget.value.showTriggered(e.auto, e.shy ? 250 : 50);
            this._lineSuffix.value = new LineSuffix(this.editor.getModel(), e.position);
        }));
        this._toDispose.add(this.model.onDidSuggest(e => {
            if (e.triggerOptions.shy) {
                return;
            }
            let index = -1;
            for (const selector of this._selectors.itemsOrderedByPriorityDesc) {
                index = selector.select(this.editor.getModel(), this.editor.getPosition(), e.completionModel.items);
                if (index !== -1) {
                    break;
                }
            }
            if (index === -1) {
                index = 0;
            }
            if (this.model.state === 0 /* State.Idle */) {
                // selecting an item can "pump" out selection/cursor change events
                // which can cancel suggest halfway through this function. therefore
                // we need to check again and bail if the session has been canceled
                return;
            }
            let noFocus = false;
            if (e.triggerOptions.auto) {
                // don't "focus" item when configured to do
                const options = this.editor.getOption(134 /* EditorOption.suggest */);
                if (options.selectionMode === 'never' || options.selectionMode === 'always') {
                    // simple: always or never
                    noFocus = options.selectionMode === 'never';
                }
                else if (options.selectionMode === 'whenTriggerCharacter') {
                    // on with trigger character
                    noFocus = e.triggerOptions.triggerKind !== 1 /* CompletionTriggerKind.TriggerCharacter */;
                }
                else if (options.selectionMode === 'whenQuickSuggestion') {
                    // without trigger character or when refiltering
                    noFocus = e.triggerOptions.triggerKind === 1 /* CompletionTriggerKind.TriggerCharacter */ && !e.triggerOptions.refilter;
                }
            }
            this.widget.value.showSuggestions(e.completionModel, index, e.isFrozen, e.triggerOptions.auto, noFocus);
        }));
        this._toDispose.add(this.model.onDidCancel(e => {
            if (!e.retrigger) {
                this.widget.value.hideWidget();
            }
        }));
        this._toDispose.add(this.editor.onDidBlurEditorWidget(() => {
            if (!_sticky) {
                this.model.cancel();
                this.model.clear();
            }
        }));
        // Manage the acceptSuggestionsOnEnter context key
        const acceptSuggestionsOnEnter = SuggestContext.AcceptSuggestionsOnEnter.bindTo(_contextKeyService);
        const updateFromConfig = () => {
            const acceptSuggestionOnEnter = this.editor.getOption(1 /* EditorOption.acceptSuggestionOnEnter */);
            acceptSuggestionsOnEnter.set(acceptSuggestionOnEnter === 'on' || acceptSuggestionOnEnter === 'smart');
        };
        this._toDispose.add(this.editor.onDidChangeConfiguration(() => updateFromConfig()));
        updateFromConfig();
    }
    dispose() {
        this._alternatives.dispose();
        this._toDispose.dispose();
        this.widget.dispose();
        this.model.dispose();
        this._lineSuffix.dispose();
        this._onWillInsertSuggestItem.dispose();
    }
    _insertSuggestion(event, flags) {
        if (!event || !event.item) {
            this._alternatives.value.reset();
            this.model.cancel();
            this.model.clear();
            return;
        }
        if (!this.editor.hasModel()) {
            return;
        }
        const snippetController = SnippetController2.get(this.editor);
        if (!snippetController) {
            return;
        }
        this._onWillInsertSuggestItem.fire({ item: event.item });
        const model = this.editor.getModel();
        const modelVersionNow = model.getAlternativeVersionId();
        const { item } = event;
        //
        const tasks = [];
        const cts = new CancellationTokenSource();
        // pushing undo stops *before* additional text edits and
        // *after* the main edit
        if (!(flags & 1 /* InsertFlags.NoBeforeUndoStop */)) {
            this.editor.pushUndoStop();
        }
        // compute overwrite[Before|After] deltas BEFORE applying extra edits
        const info = this.getOverwriteInfo(item, Boolean(flags & 8 /* InsertFlags.AlternativeOverwriteConfig */));
        // keep item in memory
        this._memoryService.memorize(model, this.editor.getPosition(), item);
        const isResolved = item.isResolved;
        // telemetry data points: duration of command execution, info about async additional edits (-1=n/a, -2=none, 1=success, 0=failed)
        let _commandExectionDuration = -1;
        let _additionalEditsAppliedAsync = -1;
        if (Array.isArray(item.completion.additionalTextEdits)) {
            // cancel -> stops all listening and closes widget
            this.model.cancel();
            // sync additional edits
            const scrollState = StableEditorScrollState.capture(this.editor);
            this.editor.executeEdits('suggestController.additionalTextEdits.sync', item.completion.additionalTextEdits.map(edit => {
                let range = Range.lift(edit.range);
                if (range.startLineNumber === item.position.lineNumber && range.startColumn > item.position.column) {
                    // shift additional edit when it is "after" the completion insertion position
                    const columnDelta = this.editor.getPosition().column - item.position.column;
                    const startColumnDelta = columnDelta;
                    const endColumnDelta = Range.spansMultipleLines(range) ? 0 : columnDelta;
                    range = new Range(range.startLineNumber, range.startColumn + startColumnDelta, range.endLineNumber, range.endColumn + endColumnDelta);
                }
                return EditOperation.replaceMove(range, edit.text);
            }));
            scrollState.restoreRelativeVerticalPositionOfCursor(this.editor);
        }
        else if (!isResolved) {
            // async additional edits
            const sw = new StopWatch();
            let position;
            const docListener = model.onDidChangeContent(e => {
                if (e.isFlush) {
                    cts.cancel();
                    docListener.dispose();
                    return;
                }
                for (const change of e.changes) {
                    const thisPosition = Range.getEndPosition(change.range);
                    if (!position || Position.isBefore(thisPosition, position)) {
                        position = thisPosition;
                    }
                }
            });
            const oldFlags = flags;
            flags |= 2 /* InsertFlags.NoAfterUndoStop */;
            let didType = false;
            const typeListener = this.editor.onWillType(() => {
                typeListener.dispose();
                didType = true;
                if (!(oldFlags & 2 /* InsertFlags.NoAfterUndoStop */)) {
                    this.editor.pushUndoStop();
                }
            });
            tasks.push(item.resolve(cts.token).then(() => {
                if (!item.completion.additionalTextEdits || cts.token.isCancellationRequested) {
                    return undefined;
                }
                if (position && item.completion.additionalTextEdits.some(edit => Position.isBefore(position, Range.getStartPosition(edit.range)))) {
                    return false;
                }
                if (didType) {
                    this.editor.pushUndoStop();
                }
                const scrollState = StableEditorScrollState.capture(this.editor);
                this.editor.executeEdits('suggestController.additionalTextEdits.async', item.completion.additionalTextEdits.map(edit => EditOperation.replaceMove(Range.lift(edit.range), edit.text)));
                scrollState.restoreRelativeVerticalPositionOfCursor(this.editor);
                if (didType || !(oldFlags & 2 /* InsertFlags.NoAfterUndoStop */)) {
                    this.editor.pushUndoStop();
                }
                return true;
            }).then(applied => {
                this._logService.trace('[suggest] async resolving of edits DONE (ms, applied?)', sw.elapsed(), applied);
                _additionalEditsAppliedAsync = applied === true ? 1 : applied === false ? 0 : -2;
            }).finally(() => {
                docListener.dispose();
                typeListener.dispose();
            }));
        }
        let { insertText } = item.completion;
        if (!(item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */)) {
            insertText = SnippetParser.escape(insertText);
        }
        // cancel -> stops all listening and closes widget
        this.model.cancel();
        snippetController.insert(insertText, {
            overwriteBefore: info.overwriteBefore,
            overwriteAfter: info.overwriteAfter,
            undoStopBefore: false,
            undoStopAfter: false,
            adjustWhitespace: !(item.completion.insertTextRules & 1 /* CompletionItemInsertTextRule.KeepWhitespace */),
            clipboardText: event.model.clipboardText,
            overtypingCapturer: this._overtypingCapturer.value,
            reason: EditSources.suggest({ providerId: ProviderId.fromExtensionId(item.extensionId?.value) }),
        });
        if (!(flags & 2 /* InsertFlags.NoAfterUndoStop */)) {
            this.editor.pushUndoStop();
        }
        if (item.completion.command) {
            if (item.completion.command.id === TriggerSuggestAction.id) {
                // retigger
                this.model.trigger({ auto: true, retrigger: true });
            }
            else {
                // exec command, done
                const sw = new StopWatch();
                tasks.push(this._commandService.executeCommand(item.completion.command.id, ...(item.completion.command.arguments ? [...item.completion.command.arguments] : [])).catch(e => {
                    if (item.completion.extensionId) {
                        onUnexpectedExternalError(e);
                    }
                    else {
                        onUnexpectedError(e);
                    }
                }).finally(() => {
                    _commandExectionDuration = sw.elapsed();
                }));
            }
        }
        if (flags & 4 /* InsertFlags.KeepAlternativeSuggestions */) {
            this._alternatives.value.set(event, next => {
                // cancel resolving of additional edits
                cts.cancel();
                // this is not so pretty. when inserting the 'next'
                // suggestion we undo until we are at the state at
                // which we were before inserting the previous suggestion...
                while (model.canUndo()) {
                    if (modelVersionNow !== model.getAlternativeVersionId()) {
                        model.undo();
                    }
                    this._insertSuggestion(next, 1 /* InsertFlags.NoBeforeUndoStop */ | 2 /* InsertFlags.NoAfterUndoStop */ | (flags & 8 /* InsertFlags.AlternativeOverwriteConfig */ ? 8 /* InsertFlags.AlternativeOverwriteConfig */ : 0));
                    break;
                }
            });
        }
        this._alertCompletionItem(item);
        // clear only now - after all tasks are done
        Promise.all(tasks).finally(() => {
            this._reportSuggestionAcceptedTelemetry(item, model, isResolved, _commandExectionDuration, _additionalEditsAppliedAsync, event.index, event.model.items);
            this.model.clear();
            cts.dispose();
        });
    }
    _reportSuggestionAcceptedTelemetry(item, model, itemResolved, commandExectionDuration, additionalEditsAppliedAsync, index, completionItems) {
        if (Math.random() > 0.0001) { // 0.01%
            return;
        }
        const labelMap = new Map();
        for (let i = 0; i < Math.min(30, completionItems.length); i++) {
            const label = completionItems[i].textLabel;
            if (labelMap.has(label)) {
                labelMap.get(label).push(i);
            }
            else {
                labelMap.set(label, [i]);
            }
        }
        const firstIndexArray = labelMap.get(item.textLabel);
        const hasDuplicates = firstIndexArray && firstIndexArray.length > 1;
        const firstIndex = hasDuplicates ? firstIndexArray[0] : -1;
        this._telemetryService.publicLog2('suggest.acceptedSuggestion', {
            extensionId: item.extensionId?.value ?? 'unknown',
            providerId: item.provider._debugDisplayName ?? 'unknown',
            kind: item.completion.kind,
            basenameHash: hash(basename(model.uri)).toString(16),
            languageId: model.getLanguageId(),
            fileExtension: extname(model.uri),
            resolveInfo: !item.provider.resolveCompletionItem ? -1 : itemResolved ? 1 : 0,
            resolveDuration: item.resolveDuration,
            commandDuration: commandExectionDuration,
            additionalEditsAsync: additionalEditsAppliedAsync,
            index,
            firstIndex,
        });
    }
    getOverwriteInfo(item, toggleMode) {
        assertType(this.editor.hasModel());
        let replace = this.editor.getOption(134 /* EditorOption.suggest */).insertMode === 'replace';
        if (toggleMode) {
            replace = !replace;
        }
        const overwriteBefore = item.position.column - item.editStart.column;
        const overwriteAfter = (replace ? item.editReplaceEnd.column : item.editInsertEnd.column) - item.position.column;
        const columnDelta = this.editor.getPosition().column - item.position.column;
        const suffixDelta = this._lineSuffix.value ? this._lineSuffix.value.delta(this.editor.getPosition()) : 0;
        return {
            overwriteBefore: overwriteBefore + columnDelta,
            overwriteAfter: overwriteAfter + suffixDelta
        };
    }
    _alertCompletionItem(item) {
        if (isNonEmptyArray(item.completion.additionalTextEdits)) {
            const msg = nls.localize('aria.alert.snippet', "Accepting '{0}' made {1} additional edits", item.textLabel, item.completion.additionalTextEdits.length);
            alert(msg);
        }
    }
    triggerSuggest(onlyFrom, auto, noFilter) {
        if (this.editor.hasModel()) {
            this.model.trigger({
                auto: auto ?? false,
                completionOptions: { providerFilter: onlyFrom, kindFilter: noFilter ? new Set() : undefined }
            });
            this.editor.revealPosition(this.editor.getPosition(), 0 /* ScrollType.Smooth */);
            this.editor.focus();
        }
    }
    triggerSuggestAndAcceptBest(arg) {
        if (!this.editor.hasModel()) {
            return;
        }
        const positionNow = this.editor.getPosition();
        const fallback = () => {
            if (positionNow.equals(this.editor.getPosition())) {
                this._commandService.executeCommand(arg.fallback);
            }
        };
        const makesTextEdit = (item) => {
            if (item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */ || item.completion.additionalTextEdits) {
                // snippet, other editor -> makes edit
                return true;
            }
            const position = this.editor.getPosition();
            const startColumn = item.editStart.column;
            const endColumn = position.column;
            if (endColumn - startColumn !== item.completion.insertText.length) {
                // unequal lengths -> makes edit
                return true;
            }
            const textNow = this.editor.getModel().getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn,
                endLineNumber: position.lineNumber,
                endColumn
            });
            // unequal text -> makes edit
            return textNow !== item.completion.insertText;
        };
        Event.once(this.model.onDidTrigger)(_ => {
            // wait for trigger because only then the cancel-event is trustworthy
            const listener = [];
            Event.any(this.model.onDidTrigger, this.model.onDidCancel)(() => {
                // retrigger or cancel -> try to type default text
                dispose(listener);
                fallback();
            }, undefined, listener);
            this.model.onDidSuggest(({ completionModel }) => {
                dispose(listener);
                if (completionModel.items.length === 0) {
                    fallback();
                    return;
                }
                const index = this._memoryService.select(this.editor.getModel(), this.editor.getPosition(), completionModel.items);
                const item = completionModel.items[index];
                if (!makesTextEdit(item)) {
                    fallback();
                    return;
                }
                this.editor.pushUndoStop();
                this._insertSuggestion({ index, item, model: completionModel }, 4 /* InsertFlags.KeepAlternativeSuggestions */ | 1 /* InsertFlags.NoBeforeUndoStop */ | 2 /* InsertFlags.NoAfterUndoStop */);
            }, undefined, listener);
        });
        this.model.trigger({ auto: false, shy: true });
        this.editor.revealPosition(positionNow, 0 /* ScrollType.Smooth */);
        this.editor.focus();
    }
    acceptSelectedSuggestion(keepAlternativeSuggestions, alternativeOverwriteConfig) {
        const item = this.widget.value.getFocusedItem();
        let flags = 0;
        if (keepAlternativeSuggestions) {
            flags |= 4 /* InsertFlags.KeepAlternativeSuggestions */;
        }
        if (alternativeOverwriteConfig) {
            flags |= 8 /* InsertFlags.AlternativeOverwriteConfig */;
        }
        this._insertSuggestion(item, flags);
    }
    acceptNextSuggestion() {
        this._alternatives.value.next();
    }
    acceptPrevSuggestion() {
        this._alternatives.value.prev();
    }
    cancelSuggestWidget() {
        this.model.cancel();
        this.model.clear();
        this.widget.value.hideWidget();
    }
    focusSuggestion() {
        this.widget.value.focusSelected();
    }
    selectNextSuggestion() {
        this.widget.value.selectNext();
    }
    selectNextPageSuggestion() {
        this.widget.value.selectNextPage();
    }
    selectLastSuggestion() {
        this.widget.value.selectLast();
    }
    selectPrevSuggestion() {
        this.widget.value.selectPrevious();
    }
    selectPrevPageSuggestion() {
        this.widget.value.selectPreviousPage();
    }
    selectFirstSuggestion() {
        this.widget.value.selectFirst();
    }
    toggleSuggestionDetails() {
        this.widget.value.toggleDetails();
    }
    toggleExplainMode() {
        this.widget.value.toggleExplainMode();
    }
    toggleSuggestionFocus() {
        this.widget.value.toggleDetailsFocus();
    }
    resetWidgetSize() {
        this.widget.value.resetPersistedSize();
    }
    forceRenderingAbove() {
        if (this.widget.isInitialized) {
            this.widget.value.forceRenderingAbove();
        }
        else {
            // Defer this until the widget is created
            this._wantsForceRenderingAbove = true;
        }
    }
    stopForceRenderingAbove() {
        if (this.widget.isInitialized) {
            this.widget.value.stopForceRenderingAbove();
        }
        else {
            this._wantsForceRenderingAbove = false;
        }
    }
    registerSelector(selector) {
        return this._selectors.register(selector);
    }
};
SuggestController = SuggestController_1 = __decorate([
    __param(1, ISuggestMemoryService),
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, ILogService),
    __param(6, ITelemetryService)
], SuggestController);
export { SuggestController };
class PriorityRegistry {
    constructor(prioritySelector) {
        this.prioritySelector = prioritySelector;
        this._items = new Array();
    }
    register(value) {
        if (this._items.indexOf(value) !== -1) {
            throw new Error('Value is already registered');
        }
        this._items.push(value);
        this._items.sort((s1, s2) => this.prioritySelector(s2) - this.prioritySelector(s1));
        return {
            dispose: () => {
                const idx = this._items.indexOf(value);
                if (idx >= 0) {
                    this._items.splice(idx, 1);
                }
            }
        };
    }
    get itemsOrderedByPriorityDesc() {
        return this._items;
    }
}
export class TriggerSuggestAction extends EditorAction {
    static { this.id = 'editor.action.triggerSuggest'; }
    constructor() {
        super({
            id: TriggerSuggestAction.id,
            label: nls.localize2('suggest.trigger.label', "Trigger Suggest"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasCompletionItemProvider, SuggestContext.Visible.toNegated()),
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [512 /* KeyMod.Alt */ | 9 /* KeyCode.Escape */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor, args) {
        const controller = SuggestController.get(editor);
        if (!controller) {
            return;
        }
        let auto;
        if (args && typeof args === 'object') {
            if (args.auto === true) {
                auto = true;
            }
        }
        controller.triggerSuggest(undefined, auto, undefined);
    }
}
registerEditorContribution(SuggestController.ID, SuggestController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(TriggerSuggestAction);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 90;
const SuggestCommand = EditorCommand.bindToContribution(SuggestController.get);
registerEditorCommand(new SuggestCommand({
    id: 'acceptSelectedSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion),
    handler(x) {
        x.acceptSelectedSuggestion(true, false);
    },
    kbOpts: [{
            // normal tab
            primary: 2 /* KeyCode.Tab */,
            kbExpr: ContextKeyExpr.and(SuggestContext.Visible, EditorContextKeys.textInputFocus),
            weight,
        }, {
            // accept on enter has special rules
            primary: 3 /* KeyCode.Enter */,
            kbExpr: ContextKeyExpr.and(SuggestContext.Visible, EditorContextKeys.textInputFocus, SuggestContext.AcceptSuggestionsOnEnter, SuggestContext.MakesTextEdit),
            weight,
        }],
    menuOpts: [{
            menuId: suggestWidgetStatusbarMenu,
            title: nls.localize('accept.insert', "Insert"),
            group: 'left',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.HasFocusedSuggestion, SuggestContext.HasInsertAndReplaceRange.toNegated())
        }, {
            menuId: suggestWidgetStatusbarMenu,
            title: nls.localize('accept.insert', "Insert"),
            group: 'left',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.HasFocusedSuggestion, SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('insert'))
        }, {
            menuId: suggestWidgetStatusbarMenu,
            title: nls.localize('accept.replace', "Replace"),
            group: 'left',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.HasFocusedSuggestion, SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('replace'))
        }]
}));
registerEditorCommand(new SuggestCommand({
    id: 'acceptAlternativeSelectedSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, EditorContextKeys.textInputFocus, SuggestContext.HasFocusedSuggestion),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
        secondary: [1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */],
    },
    handler(x) {
        x.acceptSelectedSuggestion(false, true);
    },
    menuOpts: [{
            menuId: suggestWidgetStatusbarMenu,
            group: 'left',
            order: 2,
            when: ContextKeyExpr.and(SuggestContext.HasFocusedSuggestion, SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('insert')),
            title: nls.localize('accept.replace', "Replace")
        }, {
            menuId: suggestWidgetStatusbarMenu,
            group: 'left',
            order: 2,
            when: ContextKeyExpr.and(SuggestContext.HasFocusedSuggestion, SuggestContext.HasInsertAndReplaceRange, SuggestContext.InsertMode.isEqualTo('replace')),
            title: nls.localize('accept.insert', "Insert")
        }]
}));
// continue to support the old command
CommandsRegistry.registerCommandAlias('acceptSelectedSuggestionOnEnter', 'acceptSelectedSuggestion');
registerEditorCommand(new SuggestCommand({
    id: 'hideSuggestWidget',
    precondition: SuggestContext.Visible,
    handler: x => x.cancelSuggestWidget(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectNextSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: c => c.selectNextSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 18 /* KeyCode.DownArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
        mac: { primary: 18 /* KeyCode.DownArrow */, secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */] }
    },
    menuOpts: {
        menuId: suggestWidgetStatusbarMenu,
        group: 'left',
        order: 0,
        when: SuggestContext.HasFocusedSuggestion.toNegated(),
        title: nls.localize('focus.suggestion', "Select")
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectNextPageSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: c => c.selectNextPageSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 12 /* KeyCode.PageDown */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */]
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectLastSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: c => c.selectLastSuggestion()
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectPrevSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: c => c.selectPrevSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 16 /* KeyCode.UpArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
        mac: { primary: 16 /* KeyCode.UpArrow */, secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */] }
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectPrevPageSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: c => c.selectPrevPageSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 11 /* KeyCode.PageUp */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */]
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'selectFirstSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, ContextKeyExpr.or(SuggestContext.MultipleSuggestions, SuggestContext.HasFocusedSuggestion.negate())),
    handler: c => c.selectFirstSuggestion()
}));
registerEditorCommand(new SuggestCommand({
    id: 'focusSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion.negate()),
    handler: x => x.focusSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] }
    },
}));
registerEditorCommand(new SuggestCommand({
    id: 'focusAndAcceptSuggestion',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion.negate()),
    handler: c => {
        c.focusSuggestion();
        c.acceptSelectedSuggestion(true, false);
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'toggleSuggestionDetails',
    precondition: ContextKeyExpr.and(SuggestContext.Visible, SuggestContext.HasFocusedSuggestion),
    handler: x => x.toggleSuggestionDetails(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] }
    },
    menuOpts: [{
            menuId: suggestWidgetStatusbarMenu,
            group: 'right',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.DetailsVisible, SuggestContext.CanResolve),
            title: nls.localize('detail.more', "Show Less")
        }, {
            menuId: suggestWidgetStatusbarMenu,
            group: 'right',
            order: 1,
            when: ContextKeyExpr.and(SuggestContext.DetailsVisible.toNegated(), SuggestContext.CanResolve),
            title: nls.localize('detail.less', "Show More")
        }]
}));
registerEditorCommand(new SuggestCommand({
    id: 'toggleExplainMode',
    precondition: SuggestContext.Visible,
    handler: x => x.toggleExplainMode(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'toggleSuggestionFocus',
    precondition: SuggestContext.Visible,
    handler: x => x.toggleSuggestionFocus(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */ }
    }
}));
//#region tab completions
registerEditorCommand(new SuggestCommand({
    id: 'insertBestCompletion',
    precondition: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.equals('config.editor.tabCompletion', 'on'), WordContextKey.AtEnd, SuggestContext.Visible.toNegated(), SuggestAlternatives.OtherSuggestions.toNegated(), SnippetController2.InSnippetMode.toNegated()),
    handler: (x, arg) => {
        x.triggerSuggestAndAcceptBest(isObject(arg) ? { fallback: 'tab', ...arg } : { fallback: 'tab' });
    },
    kbOpts: {
        weight,
        primary: 2 /* KeyCode.Tab */
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'insertNextSuggestion',
    precondition: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.equals('config.editor.tabCompletion', 'on'), SuggestAlternatives.OtherSuggestions, SuggestContext.Visible.toNegated(), SnippetController2.InSnippetMode.toNegated()),
    handler: x => x.acceptNextSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2 /* KeyCode.Tab */
    }
}));
registerEditorCommand(new SuggestCommand({
    id: 'insertPrevSuggestion',
    precondition: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.equals('config.editor.tabCompletion', 'on'), SuggestAlternatives.OtherSuggestions, SuggestContext.Visible.toNegated(), SnippetController2.InSnippetMode.toNegated()),
    handler: x => x.acceptPrevSuggestion(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */
    }
}));
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'suggestWidgetCopy',
            precondition: SuggestContext.DetailsFocused,
            kbOpts: {
                weight: weight + 10,
                kbExpr: SuggestContext.DetailsFocused,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */] }
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        getWindow(editor.getDomNode()).document.execCommand('copy');
    }
}());
registerEditorAction(class extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.resetSuggestSize',
            label: nls.localize2('suggest.reset.label', "Reset Suggest Widget Size"),
            precondition: undefined
        });
    }
    run(_accessor, editor) {
        SuggestController.get(editor)?.resetWidgetSize();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakYsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQW1DLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLDBCQUEwQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBRS9NLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0RSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8s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
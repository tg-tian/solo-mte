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
var TextModel_1;
import { ArrayQueue, pushMany } from '../../../base/common/arrays.js';
import { SetWithKey } from '../../../base/common/collections.js';
import { Color } from '../../../base/common/color.js';
import { BugIndicatingError, illegalArgument, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, MutableDisposable, combinedDisposable } from '../../../base/common/lifecycle.js';
import { listenStream } from '../../../base/common/stream.js';
import * as strings from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { isDark } from '../../../platform/theme/common/theme.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { countEOL } from '../core/misc/eolCounter.js';
import { normalizeIndentation } from '../core/misc/indentation.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/misc/textModelDefaults.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { ILanguageService } from '../languages/language.js';
import { ILanguageConfigurationService } from '../languages/languageConfigurationRegistry.js';
import * as model from '../model.js';
import { EditSources } from '../textModelEditSource.js';
import { InternalModelContentChangeEvent, LineInjectedText, ModelFontChanged, ModelFontChangedEvent, ModelInjectedTextChangedEvent, ModelLineHeightChanged, ModelLineHeightChangedEvent, ModelRawContentChangedEvent, ModelRawEOLChanged, ModelRawFlush, ModelRawLineChanged, ModelRawLinesDeleted, ModelRawLinesInserted } from '../textModelEvents.js';
import { BracketPairsTextModelPart } from './bracketPairsTextModelPart/bracketPairsImpl.js';
import { ColorizedBracketPairsDecorationProvider } from './bracketPairsTextModelPart/colorizedBracketPairsDecorationProvider.js';
import { EditStack } from './editStack.js';
import { GuidesTextModelPart } from './guidesTextModelPart.js';
import { guessIndentation } from './indentationGuesser.js';
import { IntervalNode, IntervalTree, recomputeMaxEnd } from './intervalTree.js';
import { PieceTreeTextBuffer } from './pieceTreeTextBuffer/pieceTreeTextBuffer.js';
import { PieceTreeTextBufferBuilder } from './pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { SearchParams, TextModelSearch } from './textModelSearch.js';
import { AttachedViews } from './tokens/abstractSyntaxTokenBackend.js';
import { TokenizationFontDecorationProvider } from './tokens/tokenizationFontDecorationsProvider.js';
import { LineFontChangingDecoration, LineHeightChangingDecoration } from './decorationProvider.js';
import { TokenizationTextModelPart } from './tokens/tokenizationTextModelPart.js';
export function createTextBufferFactory(text) {
    const builder = new PieceTreeTextBufferBuilder();
    builder.acceptChunk(text);
    return builder.finish();
}
export function createTextBufferFactoryFromStream(stream) {
    return new Promise((resolve, reject) => {
        const builder = new PieceTreeTextBufferBuilder();
        let done = false;
        listenStream(stream, {
            onData: chunk => {
                builder.acceptChunk((typeof chunk === 'string') ? chunk : chunk.toString());
            },
            onError: error => {
                if (!done) {
                    done = true;
                    reject(error);
                }
            },
            onEnd: () => {
                if (!done) {
                    done = true;
                    resolve(builder.finish());
                }
            }
        });
    });
}
export function createTextBufferFactoryFromSnapshot(snapshot) {
    const builder = new PieceTreeTextBufferBuilder();
    let chunk;
    while (typeof (chunk = snapshot.read()) === 'string') {
        builder.acceptChunk(chunk);
    }
    return builder.finish();
}
export function createTextBuffer(value, defaultEOL) {
    let factory;
    if (typeof value === 'string') {
        factory = createTextBufferFactory(value);
    }
    else if (model.isITextSnapshot(value)) {
        factory = createTextBufferFactoryFromSnapshot(value);
    }
    else {
        factory = value;
    }
    return factory.create(defaultEOL);
}
let MODEL_ID = 0;
const LIMIT_FIND_COUNT = 999;
const LONG_LINE_BOUNDARY = 10000;
const LINE_HEIGHT_CEILING = 300;
class TextModelSnapshot {
    constructor(source) {
        this._source = source;
        this._eos = false;
    }
    read() {
        if (this._eos) {
            return null;
        }
        const result = [];
        let resultCnt = 0;
        let resultLength = 0;
        do {
            const tmp = this._source.read();
            if (tmp === null) {
                // end-of-stream
                this._eos = true;
                if (resultCnt === 0) {
                    return null;
                }
                else {
                    return result.join('');
                }
            }
            if (tmp.length > 0) {
                result[resultCnt++] = tmp;
                resultLength += tmp.length;
            }
            if (resultLength >= 64 * 1024) {
                return result.join('');
            }
        } while (true);
    }
}
const invalidFunc = () => { throw new Error(`Invalid change accessor`); };
var StringOffsetValidationType;
(function (StringOffsetValidationType) {
    /**
     * Even allowed in surrogate pairs
     */
    StringOffsetValidationType[StringOffsetValidationType["Relaxed"] = 0] = "Relaxed";
    /**
     * Not allowed in surrogate pairs
     */
    StringOffsetValidationType[StringOffsetValidationType["SurrogatePairs"] = 1] = "SurrogatePairs";
})(StringOffsetValidationType || (StringOffsetValidationType = {}));
let TextModel = class TextModel extends Disposable {
    static { TextModel_1 = this; }
    static { this._MODEL_SYNC_LIMIT = 50 * 1024 * 1024; } // 50 MB,  // used in tests
    static { this.LARGE_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; } // 20 MB;
    static { this.LARGE_FILE_LINE_COUNT_THRESHOLD = 300 * 1000; } // 300K lines
    static { this.LARGE_FILE_HEAP_OPERATION_THRESHOLD = 256 * 1024 * 1024; } // 256M characters, usually ~> 512MB memory usage
    static { this.DEFAULT_CREATION_OPTIONS = {
        isForSimpleWidget: false,
        tabSize: EDITOR_MODEL_DEFAULTS.tabSize,
        indentSize: EDITOR_MODEL_DEFAULTS.indentSize,
        insertSpaces: EDITOR_MODEL_DEFAULTS.insertSpaces,
        detectIndentation: false,
        defaultEOL: 1 /* model.DefaultEndOfLine.LF */,
        trimAutoWhitespace: EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
        largeFileOptimizations: EDITOR_MODEL_DEFAULTS.largeFileOptimizations,
        bracketPairColorizationOptions: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions,
    }; }
    static resolveOptions(textBuffer, options) {
        if (options.detectIndentation) {
            const guessedIndentation = guessIndentation(textBuffer, options.tabSize, options.insertSpaces);
            return new model.TextModelResolvedOptions({
                tabSize: guessedIndentation.tabSize,
                indentSize: 'tabSize', // TODO@Alex: guess indentSize independent of tabSize
                insertSpaces: guessedIndentation.insertSpaces,
                trimAutoWhitespace: options.trimAutoWhitespace,
                defaultEOL: options.defaultEOL,
                bracketPairColorizationOptions: options.bracketPairColorizationOptions,
            });
        }
        return new model.TextModelResolvedOptions(options);
    }
    get onDidChangeLanguage() { return this._tokenizationTextModelPart.onDidChangeLanguage; }
    get onDidChangeLanguageConfiguration() { return this._tokenizationTextModelPart.onDidChangeLanguageConfiguration; }
    get onDidChangeTokens() { return this._tokenizationTextModelPart.onDidChangeTokens; }
    get onDidChangeOptions() { return this._onDidChangeOptions.event; }
    get onDidChangeAttached() { return this._onDidChangeAttached.event; }
    get onDidChangeLineHeight() { return this._onDidChangeLineHeight.event; }
    get onDidChangeFont() { return this._onDidChangeFont.event; }
    onDidChangeContent(listener) {
        return this._eventEmitter.slowEvent((e) => listener(e.contentChangedEvent));
    }
    onDidChangeContentOrInjectedText(listener) {
        return combinedDisposable(this._eventEmitter.fastEvent(e => listener(e)), this._onDidChangeInjectedText.event(e => listener(e)));
    }
    _isDisposing() { return this.__isDisposing; }
    get tokenization() { return this._tokenizationTextModelPart; }
    get bracketPairs() { return this._bracketPairs; }
    get guides() { return this._guidesTextModelPart; }
    constructor(source, languageIdOrSelection, creationOptions, associatedResource = null, _undoRedoService, _languageService, _languageConfigurationService, instantiationService) {
        super();
        this._undoRedoService = _undoRedoService;
        this._languageService = _languageService;
        this._languageConfigurationService = _languageConfigurationService;
        this.instantiationService = instantiationService;
        //#region Events
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidChangeDecorations = this._register(new DidChangeDecorationsEmitter((affectedInjectedTextLines, affectedLineHeights, affectedFontLines) => this.handleBeforeFireDecorationsChangedEvent(affectedInjectedTextLines, affectedLineHeights, affectedFontLines)));
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this._onDidChangeOptions = this._register(new Emitter());
        this._onDidChangeAttached = this._register(new Emitter());
        this._onDidChangeInjectedText = this._register(new Emitter());
        this._onDidChangeLineHeight = this._register(new Emitter());
        this._onDidChangeFont = this._register(new Emitter());
        this._eventEmitter = this._register(new DidChangeContentEmitter());
        this._languageSelectionListener = this._register(new MutableDisposable());
        this._deltaDecorationCallCnt = 0;
        this._attachedViews = new AttachedViews();
        // Generate a new unique model id
        MODEL_ID++;
        this.id = '$model' + MODEL_ID;
        this.isForSimpleWidget = creationOptions.isForSimpleWidget;
        if (typeof associatedResource === 'undefined' || associatedResource === null) {
            this._associatedResource = URI.parse('inmemory://model/' + MODEL_ID);
        }
        else {
            this._associatedResource = associatedResource;
        }
        this._attachedEditorCount = 0;
        const { textBuffer, disposable } = createTextBuffer(source, creationOptions.defaultEOL);
        this._buffer = textBuffer;
        this._bufferDisposable = disposable;
        const bufferLineCount = this._buffer.getLineCount();
        const bufferTextLength = this._buffer.getValueLengthInRange(new Range(1, 1, bufferLineCount, this._buffer.getLineLength(bufferLineCount) + 1), 0 /* model.EndOfLinePreference.TextDefined */);
        // !!! Make a decision in the ctor and permanently respect this decision !!!
        // If a model is too large at construction time, it will never get tokenized,
        // under no circumstances.
        if (creationOptions.largeFileOptimizations) {
            this._isTooLargeForTokenization = ((bufferTextLength > TextModel_1.LARGE_FILE_SIZE_THRESHOLD)
                || (bufferLineCount > TextModel_1.LARGE_FILE_LINE_COUNT_THRESHOLD));
            this._isTooLargeForHeapOperation = bufferTextLength > TextModel_1.LARGE_FILE_HEAP_OPERATION_THRESHOLD;
        }
        else {
            this._isTooLargeForTokenization = false;
            this._isTooLargeForHeapOperation = false;
        }
        this._options = TextModel_1.resolveOptions(this._buffer, creationOptions);
        const languageId = (typeof languageIdOrSelection === 'string' ? languageIdOrSelection : languageIdOrSelection.languageId);
        if (typeof languageIdOrSelection !== 'string') {
            this._languageSelectionListener.value = languageIdOrSelection.onDidChange(() => this._setLanguage(languageIdOrSelection.languageId));
        }
        this._bracketPairs = this._register(new BracketPairsTextModelPart(this, this._languageConfigurationService));
        this._guidesTextModelPart = this._register(new GuidesTextModelPart(this, this._languageConfigurationService));
        this._decorationProvider = this._register(new ColorizedBracketPairsDecorationProvider(this));
        this._tokenizationTextModelPart = this.instantiationService.createInstance(TokenizationTextModelPart, this, this._bracketPairs, languageId, this._attachedViews);
        this._fontTokenDecorationsProvider = this._register(new TokenizationFontDecorationProvider(this, this._tokenizationTextModelPart));
        this._isTooLargeForSyncing = (bufferTextLength > TextModel_1._MODEL_SYNC_LIMIT);
        this._versionId = 1;
        this._alternativeVersionId = 1;
        this._initialUndoRedoSnapshot = null;
        this._isDisposed = false;
        this.__isDisposing = false;
        this._instanceId = strings.singleLetterHash(MODEL_ID);
        this._lastDecorationId = 0;
        this._decorations = Object.create(null);
        this._decorationsTree = new DecorationsTrees();
        this._commandManager = new EditStack(this, this._undoRedoService);
        this._isUndoing = false;
        this._isRedoing = false;
        this._trimAutoWhitespaceLines = null;
        this._register(this._decorationProvider.onDidChange(() => {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._onDidChangeDecorations.fire();
            this._onDidChangeDecorations.endDeferredEmit();
        }));
        this._register(this._fontTokenDecorationsProvider.onDidChangeLineHeight((affectedLineHeights) => {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._onDidChangeDecorations.fire();
            this._fireOnDidChangeLineHeight(affectedLineHeights);
            this._onDidChangeDecorations.endDeferredEmit();
        }));
        this._register(this._fontTokenDecorationsProvider.onDidChangeFont((affectedFontLines) => {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._onDidChangeDecorations.fire();
            this._fireOnDidChangeFont(affectedFontLines);
            this._onDidChangeDecorations.endDeferredEmit();
        }));
        this._languageService.requestRichLanguageFeatures(languageId);
        this._register(this._languageConfigurationService.onDidChange(e => {
            this._bracketPairs.handleLanguageConfigurationServiceChange(e);
            this._tokenizationTextModelPart.handleLanguageConfigurationServiceChange(e);
        }));
    }
    dispose() {
        this.__isDisposing = true;
        this._onWillDispose.fire();
        this._tokenizationTextModelPart.dispose();
        this._isDisposed = true;
        super.dispose();
        this._bufferDisposable.dispose();
        this.__isDisposing = false;
        // Manually release reference to previous text buffer to avoid large leaks
        // in case someone leaks a TextModel reference
        const emptyDisposedTextBuffer = new PieceTreeTextBuffer([], '', '\n', false, false, true, true);
        emptyDisposedTextBuffer.dispose();
        this._buffer = emptyDisposedTextBuffer;
        this._bufferDisposable = Disposable.None;
    }
    _hasListeners() {
        return (this._onWillDispose.hasListeners()
            || this._onDidChangeDecorations.hasListeners()
            || this._tokenizationTextModelPart._hasListeners()
            || this._onDidChangeOptions.hasListeners()
            || this._onDidChangeAttached.hasListeners()
            || this._onDidChangeInjectedText.hasListeners()
            || this._onDidChangeLineHeight.hasListeners()
            || this._onDidChangeFont.hasListeners()
            || this._eventEmitter.hasListeners());
    }
    _assertNotDisposed() {
        if (this._isDisposed) {
            throw new BugIndicatingError('Model is disposed!');
        }
    }
    equalsTextBuffer(other) {
        this._assertNotDisposed();
        return this._buffer.equals(other);
    }
    getTextBuffer() {
        this._assertNotDisposed();
        return this._buffer;
    }
    _emitContentChangedEvent(rawChange, change) {
        if (this.__isDisposing) {
            // Do not confuse listeners by emitting any event after disposing
            return;
        }
        this._tokenizationTextModelPart.handleDidChangeContent(change);
        this._bracketPairs.handleDidChangeContent(change);
        this._fontTokenDecorationsProvider.handleDidChangeContent(change);
        this._eventEmitter.fire(new InternalModelContentChangeEvent(rawChange, change));
    }
    setValue(value, reason = EditSources.setValue()) {
        this._assertNotDisposed();
        if (value === null || value === undefined) {
            throw illegalArgument();
        }
        const { textBuffer, disposable } = createTextBuffer(value, this._options.defaultEOL);
        this._setValueFromTextBuffer(textBuffer, disposable, reason);
    }
    _createContentChanged2(range, rangeOffset, rangeLength, rangeEndPosition, text, isUndoing, isRedoing, isFlush, isEolChange, reason) {
        return {
            changes: [{
                    range: range,
                    rangeOffset: rangeOffset,
                    rangeLength: rangeLength,
                    text: text,
                }],
            eol: this._buffer.getEOL(),
            isEolChange: isEolChange,
            versionId: this.getVersionId(),
            isUndoing: isUndoing,
            isRedoing: isRedoing,
            isFlush: isFlush,
            detailedReasons: [reason],
            detailedReasonsChangeLengths: [1],
        };
    }
    _setValueFromTextBuffer(textBuffer, textBufferDisposable, reason) {
        this._assertNotDisposed();
        const oldFullModelRange = this.getFullModelRange();
        const oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
        const endLineNumber = this.getLineCount();
        const endColumn = this.getLineMaxColumn(endLineNumber);
        this._buffer = textBuffer;
        this._bufferDisposable.dispose();
        this._bufferDisposable = textBufferDisposable;
        this._increaseVersionId();
        // Destroy all my decorations
        this._decorations = Object.create(null);
        this._decorationsTree = new DecorationsTrees();
        // Destroy my edit history and settings
        this._commandManager.clear();
        this._trimAutoWhitespaceLines = null;
        this._emitContentChangedEvent(new ModelRawContentChangedEvent([
            new ModelRawFlush()
        ], this._versionId, false, false), this._createContentChanged2(new Range(1, 1, endLineNumber, endColumn), 0, oldModelValueLength, new Position(endLineNumber, endColumn), this.getValue(), false, false, true, false, reason));
    }
    setEOL(eol) {
        this._assertNotDisposed();
        const newEOL = (eol === 1 /* model.EndOfLineSequence.CRLF */ ? '\r\n' : '\n');
        if (this._buffer.getEOL() === newEOL) {
            // Nothing to do
            return;
        }
        const oldFullModelRange = this.getFullModelRange();
        const oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
        const endLineNumber = this.getLineCount();
        const endColumn = this.getLineMaxColumn(endLineNumber);
        this._onBeforeEOLChange();
        this._buffer.setEOL(newEOL);
        this._increaseVersionId();
        this._onAfterEOLChange();
        this._emitContentChangedEvent(new ModelRawContentChangedEvent([
            new ModelRawEOLChanged()
        ], this._versionId, false, false), this._createContentChanged2(new Range(1, 1, endLineNumber, endColumn), 0, oldModelValueLength, new Position(endLineNumber, endColumn), this.getValue(), false, false, false, true, EditSources.eolChange()));
    }
    _onBeforeEOLChange() {
        // Ensure all decorations get their `range` set.
        this._decorationsTree.ensureAllNodesHaveRanges(this);
    }
    _onAfterEOLChange() {
        // Transform back `range` to offsets
        const versionId = this.getVersionId();
        const allDecorations = this._decorationsTree.collectNodesPostOrder();
        for (let i = 0, len = allDecorations.length; i < len; i++) {
            const node = allDecorations[i];
            const range = node.range; // the range is defined due to `_onBeforeEOLChange`
            const delta = node.cachedAbsoluteStart - node.start;
            const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
            const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
            node.cachedAbsoluteStart = startOffset;
            node.cachedAbsoluteEnd = endOffset;
            node.cachedVersionId = versionId;
            node.start = startOffset - delta;
            node.end = endOffset - delta;
            recomputeMaxEnd(node);
        }
    }
    onBeforeAttached() {
        this._attachedEditorCount++;
        if (this._attachedEditorCount === 1) {
            this._tokenizationTextModelPart.handleDidChangeAttached();
            this._onDidChangeAttached.fire(undefined);
        }
        return this._attachedViews.attachView();
    }
    onBeforeDetached(view) {
        this._attachedEditorCount--;
        if (this._attachedEditorCount === 0) {
            this._tokenizationTextModelPart.handleDidChangeAttached();
            this._onDidChangeAttached.fire(undefined);
        }
        this._attachedViews.detachView(view);
    }
    isAttachedToEditor() {
        return this._attachedEditorCount > 0;
    }
    getAttachedEditorCount() {
        return this._attachedEditorCount;
    }
    isTooLargeForSyncing() {
        return this._isTooLargeForSyncing;
    }
    isTooLargeForTokenization() {
        return this._isTooLargeForTokenization;
    }
    isTooLargeForHeapOperation() {
        return this._isTooLargeForHeapOperation;
    }
    isDisposed() {
        return this._isDisposed;
    }
    isDominatedByLongLines() {
        this._assertNotDisposed();
        if (this.isTooLargeForTokenization()) {
            // Cannot word wrap huge files anyways, so it doesn't really matter
            return false;
        }
        let smallLineCharCount = 0;
        let longLineCharCount = 0;
        const lineCount = this._buffer.getLineCount();
        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            const lineLength = this._buffer.getLineLength(lineNumber);
            if (lineLength >= LONG_LINE_BOUNDARY) {
                longLineCharCount += lineLength;
            }
            else {
                smallLineCharCount += lineLength;
            }
        }
        return (longLineCharCount > smallLineCharCount);
    }
    get uri() {
        return this._associatedResource;
    }
    //#region Options
    getOptions() {
        this._assertNotDisposed();
        return this._options;
    }
    getFormattingOptions() {
        return {
            tabSize: this._options.indentSize,
            insertSpaces: this._options.insertSpaces
        };
    }
    updateOptions(_newOpts) {
        this._assertNotDisposed();
        const tabSize = (typeof _newOpts.tabSize !== 'undefined') ? _newOpts.tabSize : this._options.tabSize;
        const indentSize = (typeof _newOpts.indentSize !== 'undefined') ? _newOpts.indentSize : this._options.originalIndentSize;
        const insertSpaces = (typeof _newOpts.insertSpaces !== 'undefined') ? _newOpts.insertSpaces : this._options.insertSpaces;
        const trimAutoWhitespace = (typeof _newOpts.trimAutoWhitespace !== 'undefined') ? _newOpts.trimAutoWhitespace : this._options.trimAutoWhitespace;
        const bracketPairColorizationOptions = (typeof _newOpts.bracketColorizationOptions !== 'undefined') ? _newOpts.bracketColorizationOptions : this._options.bracketPairColorizationOptions;
        const newOpts = new model.TextModelResolvedOptions({
            tabSize: tabSize,
            indentSize: indentSize,
            insertSpaces: insertSpaces,
            defaultEOL: this._options.defaultEOL,
            trimAutoWhitespace: trimAutoWhitespace,
            bracketPairColorizationOptions,
        });
        if (this._options.equals(newOpts)) {
            return;
        }
        const e = this._options.createChangeEvent(newOpts);
        this._options = newOpts;
        this._bracketPairs.handleDidChangeOptions(e);
        this._decorationProvider.handleDidChangeOptions(e);
        this._onDidChangeOptions.fire(e);
    }
    detectIndentation(defaultInsertSpaces, defaultTabSize) {
        this._assertNotDisposed();
        const guessedIndentation = guessIndentation(this._buffer, defaultTabSize, defaultInsertSpaces);
        this.updateOptions({
            insertSpaces: guessedIndentation.insertSpaces,
            tabSize: guessedIndentation.tabSize,
            indentSize: guessedIndentation.tabSize, // TODO@Alex: guess indentSize independent of tabSize
        });
    }
    normalizeIndentation(str) {
        this._assertNotDisposed();
        return normalizeIndentation(str, this._options.indentSize, this._options.insertSpaces);
    }
    //#endregion
    //#region Reading
    getVersionId() {
        this._assertNotDisposed();
        return this._versionId;
    }
    mightContainRTL() {
        return this._buffer.mightContainRTL();
    }
    mightContainUnusualLineTerminators() {
        return this._buffer.mightContainUnusualLineTerminators();
    }
    removeUnusualLineTerminators(selections = null) {
        const matches = this.findMatches(strings.UNUSUAL_LINE_TERMINATORS.source, false, true, false, null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        this._buffer.resetMightContainUnusualLineTerminators();
        this.pushEditOperations(selections, matches.map(m => ({ range: m.range, text: null })), () => null);
    }
    mightContainNonBasicASCII() {
        return this._buffer.mightContainNonBasicASCII();
    }
    getAlternativeVersionId() {
        this._assertNotDisposed();
        return this._alternativeVersionId;
    }
    getInitialUndoRedoSnapshot() {
        this._assertNotDisposed();
        return this._initialUndoRedoSnapshot;
    }
    getOffsetAt(rawPosition) {
        this._assertNotDisposed();
        const position = this._validatePosition(rawPosition.lineNumber, rawPosition.column, 0 /* StringOffsetValidationType.Relaxed */);
        return this._buffer.getOffsetAt(position.lineNumber, position.column);
    }
    getPositionAt(rawOffset) {
        this._assertNotDisposed();
        const offset = (Math.min(this._buffer.getLength(), Math.max(0, rawOffset)));
        return this._buffer.getPositionAt(offset);
    }
    _increaseVersionId() {
        this._versionId = this._versionId + 1;
        this._alternativeVersionId = this._versionId;
    }
    _overwriteVersionId(versionId) {
        this._versionId = versionId;
    }
    _overwriteAlternativeVersionId(newAlternativeVersionId) {
        this._alternativeVersionId = newAlternativeVersionId;
    }
    _overwriteInitialUndoRedoSnapshot(newInitialUndoRedoSnapshot) {
        this._initialUndoRedoSnapshot = newInitialUndoRedoSnapshot;
    }
    getValue(eol, preserveBOM = false) {
        this._assertNotDisposed();
        if (this.isTooLargeForHeapOperation()) {
            throw new BugIndicatingError('Operation would exceed heap memory limits');
        }
        const fullModelRange = this.getFullModelRange();
        const fullModelValue = this.getValueInRange(fullModelRange, eol);
        if (preserveBOM) {
            return this._buffer.getBOM() + fullModelValue;
        }
        return fullModelValue;
    }
    createSnapshot(preserveBOM = false) {
        return new TextModelSnapshot(this._buffer.createSnapshot(preserveBOM));
    }
    getValueLength(eol, preserveBOM = false) {
        this._assertNotDisposed();
        const fullModelRange = this.getFullModelRange();
        const fullModelValue = this.getValueLengthInRange(fullModelRange, eol);
        if (preserveBOM) {
            return this._buffer.getBOM().length + fullModelValue;
        }
        return fullModelValue;
    }
    getValueInRange(rawRange, eol = 0 /* model.EndOfLinePreference.TextDefined */) {
        this._assertNotDisposed();
        return this._buffer.getValueInRange(this.validateRange(rawRange), eol);
    }
    getValueLengthInRange(rawRange, eol = 0 /* model.EndOfLinePreference.TextDefined */) {
        this._assertNotDisposed();
        return this._buffer.getValueLengthInRange(this.validateRange(rawRange), eol);
    }
    getCharacterCountInRange(rawRange, eol = 0 /* model.EndOfLinePreference.TextDefined */) {
        this._assertNotDisposed();
        return this._buffer.getCharacterCountInRange(this.validateRange(rawRange), eol);
    }
    getLineCount() {
        this._assertNotDisposed();
        return this._buffer.getLineCount();
    }
    getLineContent(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineContent(lineNumber);
    }
    getLineLength(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineLength(lineNumber);
    }
    getLinesContent() {
        this._assertNotDisposed();
        if (this.isTooLargeForHeapOperation()) {
            throw new BugIndicatingError('Operation would exceed heap memory limits');
        }
        return this._buffer.getLinesContent();
    }
    getEOL() {
        this._assertNotDisposed();
        return this._buffer.getEOL();
    }
    getEndOfLineSequence() {
        this._assertNotDisposed();
        return (this._buffer.getEOL() === '\n'
            ? 0 /* model.EndOfLineSequence.LF */
            : 1 /* model.EndOfLineSequence.CRLF */);
    }
    getLineMinColumn(lineNumber) {
        this._assertNotDisposed();
        return 1;
    }
    getLineMaxColumn(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineLength(lineNumber) + 1;
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineFirstNonWhitespaceColumn(lineNumber);
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        this._assertNotDisposed();
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._buffer.getLineLastNonWhitespaceColumn(lineNumber);
    }
    /**
     * Validates `range` is within buffer bounds, but allows it to sit in between surrogate pairs, etc.
     * Will try to not allocate if possible.
     */
    _validateRangeRelaxedNoAllocations(range) {
        const linesCount = this._buffer.getLineCount();
        const initialStartLineNumber = range.startLineNumber;
        const initialStartColumn = range.startColumn;
        let startLineNumber = Math.floor((typeof initialStartLineNumber === 'number' && !isNaN(initialStartLineNumber)) ? initialStartLineNumber : 1);
        let startColumn = Math.floor((typeof initialStartColumn === 'number' && !isNaN(initialStartColumn)) ? initialStartColumn : 1);
        if (startLineNumber < 1) {
            startLineNumber = 1;
            startColumn = 1;
        }
        else if (startLineNumber > linesCount) {
            startLineNumber = linesCount;
            startColumn = this.getLineMaxColumn(startLineNumber);
        }
        else {
            if (startColumn <= 1) {
                startColumn = 1;
            }
            else {
                const maxColumn = this.getLineMaxColumn(startLineNumber);
                if (startColumn >= maxColumn) {
                    startColumn = maxColumn;
                }
            }
        }
        const initialEndLineNumber = range.endLineNumber;
        const initialEndColumn = range.endColumn;
        let endLineNumber = Math.floor((typeof initialEndLineNumber === 'number' && !isNaN(initialEndLineNumber)) ? initialEndLineNumber : 1);
        let endColumn = Math.floor((typeof initialEndColumn === 'number' && !isNaN(initialEndColumn)) ? initialEndColumn : 1);
        if (endLineNumber < 1) {
            endLineNumber = 1;
            endColumn = 1;
        }
        else if (endLineNumber > linesCount) {
            endLineNumber = linesCount;
            endColumn = this.getLineMaxColumn(endLineNumber);
        }
        else {
            if (endColumn <= 1) {
                endColumn = 1;
            }
            else {
                const maxColumn = this.getLineMaxColumn(endLineNumber);
                if (endColumn >= maxColumn) {
                    endColumn = maxColumn;
                }
            }
        }
        if (initialStartLineNumber === startLineNumber
            && initialStartColumn === startColumn
            && initialEndLineNumber === endLineNumber
            && initialEndColumn === endColumn
            && range instanceof Range
            && !(range instanceof Selection)) {
            return range;
        }
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    _isValidPosition(lineNumber, column, validationType) {
        if (typeof lineNumber !== 'number' || typeof column !== 'number') {
            return false;
        }
        if (isNaN(lineNumber) || isNaN(column)) {
            return false;
        }
        if (lineNumber < 1 || column < 1) {
            return false;
        }
        if ((lineNumber | 0) !== lineNumber || (column | 0) !== column) {
            return false;
        }
        const lineCount = this._buffer.getLineCount();
        if (lineNumber > lineCount) {
            return false;
        }
        if (column === 1) {
            return true;
        }
        const maxColumn = this.getLineMaxColumn(lineNumber);
        if (column > maxColumn) {
            return false;
        }
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            // !!At this point, column > 1
            const charCodeBefore = this._buffer.getLineCharCode(lineNumber, column - 2);
            if (strings.isHighSurrogate(charCodeBefore)) {
                return false;
            }
        }
        return true;
    }
    _validatePosition(_lineNumber, _column, validationType) {
        const lineNumber = Math.floor((typeof _lineNumber === 'number' && !isNaN(_lineNumber)) ? _lineNumber : 1);
        const column = Math.floor((typeof _column === 'number' && !isNaN(_column)) ? _column : 1);
        const lineCount = this._buffer.getLineCount();
        if (lineNumber < 1) {
            return new Position(1, 1);
        }
        if (lineNumber > lineCount) {
            return new Position(lineCount, this.getLineMaxColumn(lineCount));
        }
        if (column <= 1) {
            return new Position(lineNumber, 1);
        }
        const maxColumn = this.getLineMaxColumn(lineNumber);
        if (column >= maxColumn) {
            return new Position(lineNumber, maxColumn);
        }
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            // If the position would end up in the middle of a high-low surrogate pair,
            // we move it to before the pair
            // !!At this point, column > 1
            const charCodeBefore = this._buffer.getLineCharCode(lineNumber, column - 2);
            if (strings.isHighSurrogate(charCodeBefore)) {
                return new Position(lineNumber, column - 1);
            }
        }
        return new Position(lineNumber, column);
    }
    validatePosition(position) {
        const validationType = 1 /* StringOffsetValidationType.SurrogatePairs */;
        this._assertNotDisposed();
        // Avoid object allocation and cover most likely case
        if (position instanceof Position) {
            if (this._isValidPosition(position.lineNumber, position.column, validationType)) {
                return position;
            }
        }
        return this._validatePosition(position.lineNumber, position.column, validationType);
    }
    isValidRange(range) {
        return this._isValidRange(range, 1 /* StringOffsetValidationType.SurrogatePairs */);
    }
    _isValidRange(range, validationType) {
        const startLineNumber = range.startLineNumber;
        const startColumn = range.startColumn;
        const endLineNumber = range.endLineNumber;
        const endColumn = range.endColumn;
        if (!this._isValidPosition(startLineNumber, startColumn, 0 /* StringOffsetValidationType.Relaxed */)) {
            return false;
        }
        if (!this._isValidPosition(endLineNumber, endColumn, 0 /* StringOffsetValidationType.Relaxed */)) {
            return false;
        }
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            const charCodeBeforeStart = (startColumn > 1 ? this._buffer.getLineCharCode(startLineNumber, startColumn - 2) : 0);
            const charCodeBeforeEnd = (endColumn > 1 && endColumn <= this._buffer.getLineLength(endLineNumber) ? this._buffer.getLineCharCode(endLineNumber, endColumn - 2) : 0);
            const startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
            const endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);
            if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
                return true;
            }
            return false;
        }
        return true;
    }
    validateRange(_range) {
        const validationType = 1 /* StringOffsetValidationType.SurrogatePairs */;
        this._assertNotDisposed();
        // Avoid object allocation and cover most likely case
        if ((_range instanceof Range) && !(_range instanceof Selection)) {
            if (this._isValidRange(_range, validationType)) {
                return _range;
            }
        }
        const start = this._validatePosition(_range.startLineNumber, _range.startColumn, 0 /* StringOffsetValidationType.Relaxed */);
        const end = this._validatePosition(_range.endLineNumber, _range.endColumn, 0 /* StringOffsetValidationType.Relaxed */);
        const startLineNumber = start.lineNumber;
        const startColumn = start.column;
        const endLineNumber = end.lineNumber;
        const endColumn = end.column;
        if (validationType === 1 /* StringOffsetValidationType.SurrogatePairs */) {
            const charCodeBeforeStart = (startColumn > 1 ? this._buffer.getLineCharCode(startLineNumber, startColumn - 2) : 0);
            const charCodeBeforeEnd = (endColumn > 1 && endColumn <= this._buffer.getLineLength(endLineNumber) ? this._buffer.getLineCharCode(endLineNumber, endColumn - 2) : 0);
            const startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
            const endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);
            if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
                return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
            }
            if (startLineNumber === endLineNumber && startColumn === endColumn) {
                // do not expand a collapsed range, simply move it to a valid location
                return new Range(startLineNumber, startColumn - 1, endLineNumber, endColumn - 1);
            }
            if (startInsideSurrogatePair && endInsideSurrogatePair) {
                // expand range at both ends
                return new Range(startLineNumber, startColumn - 1, endLineNumber, endColumn + 1);
            }
            if (startInsideSurrogatePair) {
                // only expand range at the start
                return new Range(startLineNumber, startColumn - 1, endLineNumber, endColumn);
            }
            // only expand range at the end
            return new Range(startLineNumber, startColumn, endLineNumber, endColumn + 1);
        }
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    modifyPosition(rawPosition, offset) {
        this._assertNotDisposed();
        const candidate = this.getOffsetAt(rawPosition) + offset;
        return this.getPositionAt(Math.min(this._buffer.getLength(), Math.max(0, candidate)));
    }
    getFullModelRange() {
        this._assertNotDisposed();
        const lineCount = this.getLineCount();
        return new Range(1, 1, lineCount, this.getLineMaxColumn(lineCount));
    }
    findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount) {
        return this._buffer.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
    }
    findMatches(searchString, rawSearchScope, isRegex, matchCase, wordSeparators, captureMatches, limitResultCount = LIMIT_FIND_COUNT) {
        this._assertNotDisposed();
        let searchRanges = null;
        if (rawSearchScope !== null && typeof rawSearchScope !== 'boolean') {
            if (!Array.isArray(rawSearchScope)) {
                rawSearchScope = [rawSearchScope];
            }
            if (rawSearchScope.every((searchScope) => Range.isIRange(searchScope))) {
                searchRanges = rawSearchScope.map((searchScope) => this.validateRange(searchScope));
            }
        }
        if (searchRanges === null) {
            searchRanges = [this.getFullModelRange()];
        }
        searchRanges = searchRanges.sort((d1, d2) => d1.startLineNumber - d2.startLineNumber || d1.startColumn - d2.startColumn);
        const uniqueSearchRanges = [];
        uniqueSearchRanges.push(searchRanges.reduce((prev, curr) => {
            if (Range.areIntersecting(prev, curr)) {
                return prev.plusRange(curr);
            }
            uniqueSearchRanges.push(prev);
            return curr;
        }));
        let matchMapper;
        if (!isRegex && searchString.indexOf('\n') < 0) {
            // not regex, not multi line
            const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                return [];
            }
            matchMapper = (searchRange) => this.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
        }
        else {
            matchMapper = (searchRange) => TextModelSearch.findMatches(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchRange, captureMatches, limitResultCount);
        }
        return uniqueSearchRanges.map(matchMapper).reduce((arr, matches) => arr.concat(matches), []);
    }
    findNextMatch(searchString, rawSearchStart, isRegex, matchCase, wordSeparators, captureMatches) {
        this._assertNotDisposed();
        const searchStart = this.validatePosition(rawSearchStart);
        if (!isRegex && searchString.indexOf('\n') < 0) {
            const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                return null;
            }
            const lineCount = this.getLineCount();
            let searchRange = new Range(searchStart.lineNumber, searchStart.column, lineCount, this.getLineMaxColumn(lineCount));
            let ret = this.findMatchesLineByLine(searchRange, searchData, captureMatches, 1);
            TextModelSearch.findNextMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
            if (ret.length > 0) {
                return ret[0];
            }
            searchRange = new Range(1, 1, searchStart.lineNumber, this.getLineMaxColumn(searchStart.lineNumber));
            ret = this.findMatchesLineByLine(searchRange, searchData, captureMatches, 1);
            if (ret.length > 0) {
                return ret[0];
            }
            return null;
        }
        return TextModelSearch.findNextMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
    }
    findPreviousMatch(searchString, rawSearchStart, isRegex, matchCase, wordSeparators, captureMatches) {
        this._assertNotDisposed();
        const searchStart = this.validatePosition(rawSearchStart);
        return TextModelSearch.findPreviousMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
    }
    //#endregion
    //#region Editing
    pushStackElement() {
        this._commandManager.pushStackElement();
    }
    popStackElement() {
        this._commandManager.popStackElement();
    }
    pushEOL(eol) {
        const currentEOL = (this.getEOL() === '\n' ? 0 /* model.EndOfLineSequence.LF */ : 1 /* model.EndOfLineSequence.CRLF */);
        if (currentEOL === eol) {
            return;
        }
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            if (this._initialUndoRedoSnapshot === null) {
                this._initialUndoRedoSnapshot = this._undoRedoService.createSnapshot(this.uri);
            }
            this._commandManager.pushEOL(eol);
        }
        finally {
            this._eventEmitter.endDeferredEmit();
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _validateEditOperation(rawOperation) {
        if (rawOperation instanceof model.ValidAnnotatedEditOperation) {
            return rawOperation;
        }
        const validatedRange = this.validateRange(rawOperation.range);
        // Normalize edit when replacement text ends with lone CR
        // and the range ends right before a CRLF in the buffer.
        // We strip the trailing CR from the replacement text.
        let opText = rawOperation.text;
        if (opText) {
            const endsWithLoneCR = (opText.length > 0 && opText.charCodeAt(opText.length - 1) === 13 /* CharCode.CarriageReturn */);
            const removeTrailingCR = (this.getEOL() === '\r\n' && endsWithLoneCR && validatedRange.endColumn === this.getLineMaxColumn(validatedRange.endLineNumber));
            if (removeTrailingCR) {
                opText = opText.substring(0, opText.length - 1);
            }
        }
        return new model.ValidAnnotatedEditOperation(rawOperation.identifier || null, validatedRange, opText, rawOperation.forceMoveMarkers || false, rawOperation.isAutoWhitespaceEdit || false, rawOperation._isTracked || false);
    }
    _validateEditOperations(rawOperations) {
        const result = [];
        for (let i = 0, len = rawOperations.length; i < len; i++) {
            result[i] = this._validateEditOperation(rawOperations[i]);
        }
        return result;
    }
    edit(edit, options) {
        this.pushEditOperations(null, edit.replacements.map(r => ({ range: r.range, text: r.text })), null);
    }
    pushEditOperations(beforeCursorState, editOperations, cursorStateComputer, group, reason) {
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            return this._pushEditOperations(beforeCursorState, this._validateEditOperations(editOperations), cursorStateComputer, group, reason);
        }
        finally {
            this._eventEmitter.endDeferredEmit();
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _pushEditOperations(beforeCursorState, editOperations, cursorStateComputer, group, reason) {
        if (this._options.trimAutoWhitespace && this._trimAutoWhitespaceLines) {
            // Go through each saved line number and insert a trim whitespace edit
            // if it is safe to do so (no conflicts with other edits).
            const incomingEdits = editOperations.map((op) => {
                return {
                    range: this.validateRange(op.range),
                    text: op.text
                };
            });
            // Sometimes, auto-formatters change ranges automatically which can cause undesired auto whitespace trimming near the cursor
            // We'll use the following heuristic: if the edits occur near the cursor, then it's ok to trim auto whitespace
            let editsAreNearCursors = true;
            if (beforeCursorState) {
                for (let i = 0, len = beforeCursorState.length; i < len; i++) {
                    const sel = beforeCursorState[i];
                    let foundEditNearSel = false;
                    for (let j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
                        const editRange = incomingEdits[j].range;
                        const selIsAbove = editRange.startLineNumber > sel.endLineNumber;
                        const selIsBelow = sel.startLineNumber > editRange.endLineNumber;
                        if (!selIsAbove && !selIsBelow) {
                            foundEditNearSel = true;
                            break;
                        }
                    }
                    if (!foundEditNearSel) {
                        editsAreNearCursors = false;
                        break;
                    }
                }
            }
            if (editsAreNearCursors) {
                for (let i = 0, len = this._trimAutoWhitespaceLines.length; i < len; i++) {
                    const trimLineNumber = this._trimAutoWhitespaceLines[i];
                    const maxLineColumn = this.getLineMaxColumn(trimLineNumber);
                    let allowTrimLine = true;
                    for (let j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
                        const editRange = incomingEdits[j].range;
                        const editText = incomingEdits[j].text;
                        if (trimLineNumber < editRange.startLineNumber || trimLineNumber > editRange.endLineNumber) {
                            // `trimLine` is completely outside this edit
                            continue;
                        }
                        // At this point:
                        //   editRange.startLineNumber <= trimLine <= editRange.endLineNumber
                        if (trimLineNumber === editRange.startLineNumber && editRange.startColumn === maxLineColumn
                            && editRange.isEmpty() && editText && editText.length > 0 && editText.charAt(0) === '\n') {
                            // This edit inserts a new line (and maybe other text) after `trimLine`
                            continue;
                        }
                        if (trimLineNumber === editRange.startLineNumber && editRange.startColumn === 1
                            && editRange.isEmpty() && editText && editText.length > 0 && editText.charAt(editText.length - 1) === '\n') {
                            // This edit inserts a new line (and maybe other text) before `trimLine`
                            continue;
                        }
                        // Looks like we can't trim this line as it would interfere with an incoming edit
                        allowTrimLine = false;
                        break;
                    }
                    if (allowTrimLine) {
                        const trimRange = new Range(trimLineNumber, 1, trimLineNumber, maxLineColumn);
                        editOperations.push(new model.ValidAnnotatedEditOperation(null, trimRange, null, false, false, false));
                    }
                }
            }
            this._trimAutoWhitespaceLines = null;
        }
        if (this._initialUndoRedoSnapshot === null) {
            this._initialUndoRedoSnapshot = this._undoRedoService.createSnapshot(this.uri);
        }
        return this._commandManager.pushEditOperation(beforeCursorState, editOperations, cursorStateComputer, group, reason);
    }
    _applyUndo(changes, eol, resultingAlternativeVersionId, resultingSelection) {
        const edits = changes.map((change) => {
            const rangeStart = this.getPositionAt(change.newPosition);
            const rangeEnd = this.getPositionAt(change.newEnd);
            return {
                range: new Range(rangeStart.lineNumber, rangeStart.column, rangeEnd.lineNumber, rangeEnd.column),
                text: change.oldText
            };
        });
        this._applyUndoRedoEdits(edits, eol, true, false, resultingAlternativeVersionId, resultingSelection);
    }
    _applyRedo(changes, eol, resultingAlternativeVersionId, resultingSelection) {
        const edits = changes.map((change) => {
            const rangeStart = this.getPositionAt(change.oldPosition);
            const rangeEnd = this.getPositionAt(change.oldEnd);
            return {
                range: new Range(rangeStart.lineNumber, rangeStart.column, rangeEnd.lineNumber, rangeEnd.column),
                text: change.newText
            };
        });
        this._applyUndoRedoEdits(edits, eol, false, true, resultingAlternativeVersionId, resultingSelection);
    }
    _applyUndoRedoEdits(edits, eol, isUndoing, isRedoing, resultingAlternativeVersionId, resultingSelection) {
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            this._isUndoing = isUndoing;
            this._isRedoing = isRedoing;
            this.applyEdits(edits, false);
            this.setEOL(eol);
            this._overwriteAlternativeVersionId(resultingAlternativeVersionId);
        }
        finally {
            this._isUndoing = false;
            this._isRedoing = false;
            this._eventEmitter.endDeferredEmit(resultingSelection);
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    applyEdits(rawOperations, computeUndoEdits, reason) {
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            this._eventEmitter.beginDeferredEmit();
            const operations = this._validateEditOperations(rawOperations);
            return this._doApplyEdits(operations, computeUndoEdits ?? false, reason ?? EditSources.applyEdits());
        }
        finally {
            this._eventEmitter.endDeferredEmit();
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _doApplyEdits(rawOperations, computeUndoEdits, reason) {
        const oldLineCount = this._buffer.getLineCount();
        const result = this._buffer.applyEdits(rawOperations, this._options.trimAutoWhitespace, computeUndoEdits);
        const newLineCount = this._buffer.getLineCount();
        const contentChanges = result.changes;
        this._trimAutoWhitespaceLines = result.trimAutoWhitespaceLineNumbers;
        if (contentChanges.length !== 0) {
            // We do a first pass to update decorations
            // because we want to read decorations in the second pass
            // where we will emit content change events
            // and we want to read the final decorations
            for (let i = 0, len = contentChanges.length; i < len; i++) {
                const change = contentChanges[i];
                this._decorationsTree.acceptReplace(change.rangeOffset, change.rangeLength, change.text.length, change.forceMoveMarkers);
            }
            const rawContentChanges = [];
            this._increaseVersionId();
            let lineCount = oldLineCount;
            for (let i = 0, len = contentChanges.length; i < len; i++) {
                const change = contentChanges[i];
                const [eolCount] = countEOL(change.text);
                this._onDidChangeDecorations.fire();
                const startLineNumber = change.range.startLineNumber;
                const endLineNumber = change.range.endLineNumber;
                const deletingLinesCnt = endLineNumber - startLineNumber;
                const insertingLinesCnt = eolCount;
                const editingLinesCnt = Math.min(deletingLinesCnt, insertingLinesCnt);
                const changeLineCountDelta = (insertingLinesCnt - deletingLinesCnt);
                const currentEditStartLineNumber = newLineCount - lineCount - changeLineCountDelta + startLineNumber;
                const firstEditLineNumber = currentEditStartLineNumber;
                const lastInsertedLineNumber = currentEditStartLineNumber + insertingLinesCnt;
                const decorationsWithInjectedTextInEditedRange = this._decorationsTree.getInjectedTextInInterval(this, this.getOffsetAt(new Position(firstEditLineNumber, 1)), this.getOffsetAt(new Position(lastInsertedLineNumber, this.getLineMaxColumn(lastInsertedLineNumber))), 0);
                const injectedTextInEditedRange = LineInjectedText.fromDecorations(decorationsWithInjectedTextInEditedRange);
                const injectedTextInEditedRangeQueue = new ArrayQueue(injectedTextInEditedRange);
                for (let j = editingLinesCnt; j >= 0; j--) {
                    const editLineNumber = startLineNumber + j;
                    const currentEditLineNumber = currentEditStartLineNumber + j;
                    injectedTextInEditedRangeQueue.takeFromEndWhile(r => r.lineNumber > currentEditLineNumber);
                    const decorationsInCurrentLine = injectedTextInEditedRangeQueue.takeFromEndWhile(r => r.lineNumber === currentEditLineNumber);
                    rawContentChanges.push(new ModelRawLineChanged(editLineNumber, this.getLineContent(currentEditLineNumber), decorationsInCurrentLine));
                }
                if (editingLinesCnt < deletingLinesCnt) {
                    // Must delete some lines
                    const spliceStartLineNumber = startLineNumber + editingLinesCnt;
                    rawContentChanges.push(new ModelRawLinesDeleted(spliceStartLineNumber + 1, endLineNumber));
                }
                if (editingLinesCnt < insertingLinesCnt) {
                    const injectedTextInEditedRangeQueue = new ArrayQueue(injectedTextInEditedRange);
                    // Must insert some lines
                    const spliceLineNumber = startLineNumber + editingLinesCnt;
                    const cnt = insertingLinesCnt - editingLinesCnt;
                    const fromLineNumber = newLineCount - lineCount - cnt + spliceLineNumber + 1;
                    const injectedTexts = [];
                    const newLines = [];
                    for (let i = 0; i < cnt; i++) {
                        const lineNumber = fromLineNumber + i;
                        newLines[i] = this.getLineContent(lineNumber);
                        injectedTextInEditedRangeQueue.takeWhile(r => r.lineNumber < lineNumber);
                        injectedTexts[i] = injectedTextInEditedRangeQueue.takeWhile(r => r.lineNumber === lineNumber);
                    }
                    rawContentChanges.push(new ModelRawLinesInserted(spliceLineNumber + 1, startLineNumber + insertingLinesCnt, newLines, injectedTexts));
                }
                lineCount += changeLineCountDelta;
            }
            this._emitContentChangedEvent(new ModelRawContentChangedEvent(rawContentChanges, this.getVersionId(), this._isUndoing, this._isRedoing), {
                changes: contentChanges,
                eol: this._buffer.getEOL(),
                isEolChange: false,
                versionId: this.getVersionId(),
                isUndoing: this._isUndoing,
                isRedoing: this._isRedoing,
                isFlush: false,
                detailedReasons: [reason],
                detailedReasonsChangeLengths: [contentChanges.length],
            });
        }
        return (result.reverseEdits === null ? undefined : result.reverseEdits);
    }
    undo() {
        return this._undoRedoService.undo(this.uri);
    }
    canUndo() {
        return this._undoRedoService.canUndo(this.uri);
    }
    redo() {
        return this._undoRedoService.redo(this.uri);
    }
    canRedo() {
        return this._undoRedoService.canRedo(this.uri);
    }
    //#endregion
    //#region Decorations
    handleBeforeFireDecorationsChangedEvent(affectedInjectedTextLines, affectedLineHeights, affectedFontLines) {
        // This is called before the decoration changed event is fired.
        if (affectedInjectedTextLines && affectedInjectedTextLines.size > 0) {
            const affectedLines = Array.from(affectedInjectedTextLines);
            const lineChangeEvents = affectedLines.map(lineNumber => new ModelRawLineChanged(lineNumber, this.getLineContent(lineNumber), this._getInjectedTextInLine(lineNumber)));
            this._onDidChangeInjectedText.fire(new ModelInjectedTextChangedEvent(lineChangeEvents));
        }
        this._fireOnDidChangeLineHeight(affectedLineHeights);
        this._fireOnDidChangeFont(affectedFontLines);
    }
    _fireOnDidChangeLineHeight(affectedLineHeights) {
        if (affectedLineHeights && affectedLineHeights.size > 0) {
            const affectedLines = Array.from(affectedLineHeights);
            const lineHeightChangeEvent = affectedLines.map(specialLineHeightChange => new ModelLineHeightChanged(specialLineHeightChange.ownerId, specialLineHeightChange.decorationId, specialLineHeightChange.lineNumber, specialLineHeightChange.lineHeight));
            this._onDidChangeLineHeight.fire(new ModelLineHeightChangedEvent(lineHeightChangeEvent));
        }
    }
    _fireOnDidChangeFont(affectedFontLines) {
        if (affectedFontLines && affectedFontLines.size > 0) {
            const affectedLines = Array.from(affectedFontLines);
            const fontChangeEvent = affectedLines.map(fontChange => new ModelFontChanged(fontChange.ownerId, fontChange.lineNumber));
            this._onDidChangeFont.fire(new ModelFontChangedEvent(fontChangeEvent));
        }
    }
    changeDecorations(callback, ownerId = 0) {
        this._assertNotDisposed();
        try {
            this._onDidChangeDecorations.beginDeferredEmit();
            return this._changeDecorations(ownerId, callback);
        }
        finally {
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    _changeDecorations(ownerId, callback) {
        const changeAccessor = {
            addDecoration: (range, options) => {
                return this._deltaDecorationsImpl(ownerId, [], [{ range: range, options: options }])[0];
            },
            changeDecoration: (id, newRange) => {
                this._changeDecorationImpl(ownerId, id, newRange);
            },
            changeDecorationOptions: (id, options) => {
                this._changeDecorationOptionsImpl(ownerId, id, _normalizeOptions(options));
            },
            removeDecoration: (id) => {
                this._deltaDecorationsImpl(ownerId, [id], []);
            },
            deltaDecorations: (oldDecorations, newDecorations) => {
                if (oldDecorations.length === 0 && newDecorations.length === 0) {
                    // nothing to do
                    return [];
                }
                return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
            }
        };
        let result = null;
        try {
            result = callback(changeAccessor);
        }
        catch (e) {
            onUnexpectedError(e);
        }
        // Invalidate change accessor
        changeAccessor.addDecoration = invalidFunc;
        changeAccessor.changeDecoration = invalidFunc;
        changeAccessor.changeDecorationOptions = invalidFunc;
        changeAccessor.removeDecoration = invalidFunc;
        changeAccessor.deltaDecorations = invalidFunc;
        return result;
    }
    deltaDecorations(oldDecorations, newDecorations, ownerId = 0) {
        this._assertNotDisposed();
        if (!oldDecorations) {
            oldDecorations = [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            // nothing to do
            return [];
        }
        try {
            this._deltaDecorationCallCnt++;
            if (this._deltaDecorationCallCnt > 1) {
                console.warn(`Invoking deltaDecorations recursively could lead to leaking decorations.`);
                onUnexpectedError(new Error(`Invoking deltaDecorations recursively could lead to leaking decorations.`));
            }
            this._onDidChangeDecorations.beginDeferredEmit();
            return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
        }
        finally {
            this._onDidChangeDecorations.endDeferredEmit();
            this._deltaDecorationCallCnt--;
        }
    }
    _getTrackedRange(id) {
        return this.getDecorationRange(id);
    }
    _setTrackedRange(id, newRange, newStickiness) {
        const node = (id ? this._decorations[id] : null);
        if (!node) {
            if (!newRange) {
                // node doesn't exist, the request is to delete => nothing to do
                return null;
            }
            // node doesn't exist, the request is to set => add the tracked range
            return this._deltaDecorationsImpl(0, [], [{ range: newRange, options: TRACKED_RANGE_OPTIONS[newStickiness] }], true)[0];
        }
        if (!newRange) {
            // node exists, the request is to delete => delete node
            this._decorationsTree.delete(node);
            delete this._decorations[node.id];
            return null;
        }
        // node exists, the request is to set => change the tracked range and its options
        const range = this._validateRangeRelaxedNoAllocations(newRange);
        const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
        this._decorationsTree.delete(node);
        node.reset(this.getVersionId(), startOffset, endOffset, range);
        node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
        this._decorationsTree.insert(node);
        return node.id;
    }
    removeAllDecorationsWithOwnerId(ownerId) {
        if (this._isDisposed) {
            return;
        }
        const nodes = this._decorationsTree.collectNodesFromOwner(ownerId);
        for (let i = 0, len = nodes.length; i < len; i++) {
            const node = nodes[i];
            this._decorationsTree.delete(node);
            delete this._decorations[node.id];
        }
    }
    getDecorationOptions(decorationId) {
        const node = this._decorations[decorationId];
        if (!node) {
            return null;
        }
        return node.options;
    }
    getDecorationRange(decorationId) {
        const node = this._decorations[decorationId];
        if (!node) {
            return null;
        }
        return this._decorationsTree.getNodeRange(this, node);
    }
    getLineDecorations(lineNumber, ownerId = 0, filterOutValidation = false, filterFontDecorations = false) {
        if (lineNumber < 1 || lineNumber > this.getLineCount()) {
            return [];
        }
        return this.getLinesDecorations(lineNumber, lineNumber, ownerId, filterOutValidation, filterFontDecorations);
    }
    getLinesDecorations(_startLineNumber, _endLineNumber, ownerId = 0, filterOutValidation = false, filterFontDecorations = false, onlyMarginDecorations = false) {
        const lineCount = this.getLineCount();
        const startLineNumber = Math.min(lineCount, Math.max(1, _startLineNumber));
        const endLineNumber = Math.min(lineCount, Math.max(1, _endLineNumber));
        const endColumn = this.getLineMaxColumn(endLineNumber);
        const range = new Range(startLineNumber, 1, endLineNumber, endColumn);
        const decorations = this._getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMarginDecorations);
        pushMany(decorations, this._decorationProvider.getDecorationsInRange(range, ownerId, filterOutValidation));
        pushMany(decorations, this._fontTokenDecorationsProvider.getDecorationsInRange(range, ownerId, filterOutValidation));
        return decorations;
    }
    getDecorationsInRange(range, ownerId = 0, filterOutValidation = false, filterFontDecorations = false, onlyMinimapDecorations = false, onlyMarginDecorations = false) {
        const validatedRange = this.validateRange(range);
        const decorations = this._getDecorationsInRange(validatedRange, ownerId, filterOutValidation, filterFontDecorations, onlyMarginDecorations);
        pushMany(decorations, this._decorationProvider.getDecorationsInRange(validatedRange, ownerId, filterOutValidation, onlyMinimapDecorations));
        pushMany(decorations, this._fontTokenDecorationsProvider.getDecorationsInRange(validatedRange, ownerId, filterOutValidation, onlyMinimapDecorations));
        return decorations;
    }
    getOverviewRulerDecorations(ownerId = 0, filterOutValidation = false, filterFontDecorations = false) {
        return this._decorationsTree.getAll(this, ownerId, filterOutValidation, filterFontDecorations, true, false);
    }
    getInjectedTextDecorations(ownerId = 0) {
        return this._decorationsTree.getAllInjectedText(this, ownerId);
    }
    getCustomLineHeightsDecorations(ownerId = 0) {
        return this._decorationsTree.getAllCustomLineHeights(this, ownerId);
    }
    _getInjectedTextInLine(lineNumber) {
        const startOffset = this._buffer.getOffsetAt(lineNumber, 1);
        const endOffset = startOffset + this._buffer.getLineLength(lineNumber);
        const result = this._decorationsTree.getInjectedTextInInterval(this, startOffset, endOffset, 0);
        return LineInjectedText.fromDecorations(result).filter(t => t.lineNumber === lineNumber);
    }
    getFontDecorationsInRange(range, ownerId = 0) {
        const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
        return this._decorationsTree.getFontDecorationsInInterval(this, startOffset, endOffset, ownerId);
    }
    getAllDecorations(ownerId = 0, filterOutValidation = false, filterFontDecorations = false) {
        let result = this._decorationsTree.getAll(this, ownerId, filterOutValidation, filterFontDecorations, false, false);
        result = result.concat(this._decorationProvider.getAllDecorations(ownerId, filterOutValidation));
        result = result.concat(this._fontTokenDecorationsProvider.getAllDecorations(ownerId, filterOutValidation));
        return result;
    }
    getAllMarginDecorations(ownerId = 0) {
        return this._decorationsTree.getAll(this, ownerId, false, false, false, true);
    }
    _getDecorationsInRange(filterRange, filterOwnerId, filterOutValidation, filterFontDecorations, onlyMarginDecorations) {
        const startOffset = this._buffer.getOffsetAt(filterRange.startLineNumber, filterRange.startColumn);
        const endOffset = this._buffer.getOffsetAt(filterRange.endLineNumber, filterRange.endColumn);
        return this._decorationsTree.getAllInInterval(this, startOffset, endOffset, filterOwnerId, filterOutValidation, filterFontDecorations, onlyMarginDecorations);
    }
    getRangeAt(start, end) {
        return this._buffer.getRangeAt(start, end - start);
    }
    _changeDecorationImpl(ownerId, decorationId, _range) {
        const node = this._decorations[decorationId];
        if (!node) {
            return;
        }
        if (node.options.after) {
            const oldRange = this.getDecorationRange(decorationId);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(oldRange.endLineNumber);
        }
        if (node.options.before) {
            const oldRange = this.getDecorationRange(decorationId);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(oldRange.startLineNumber);
        }
        if (node.options.lineHeight !== null) {
            const oldRange = this.getDecorationRange(decorationId);
            this._onDidChangeDecorations.recordLineAffectedByLineHeightChange(ownerId, decorationId, oldRange.startLineNumber, null);
        }
        if (node.options.affectsFont) {
            const oldRange = this.getDecorationRange(decorationId);
            this._onDidChangeDecorations.recordLineAffectedByFontChange(ownerId, node.id, oldRange.startLineNumber);
        }
        const range = this._validateRangeRelaxedNoAllocations(_range);
        const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
        this._decorationsTree.delete(node);
        node.reset(this.getVersionId(), startOffset, endOffset, range);
        this._decorationsTree.insert(node);
        this._onDidChangeDecorations.checkAffectedAndFire(node.options);
        if (node.options.after) {
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.endLineNumber);
        }
        if (node.options.before) {
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.startLineNumber);
        }
        if (node.options.lineHeight !== null) {
            this._onDidChangeDecorations.recordLineAffectedByLineHeightChange(ownerId, decorationId, range.startLineNumber, node.options.lineHeight);
        }
        if (node.options.affectsFont) {
            this._onDidChangeDecorations.recordLineAffectedByFontChange(ownerId, node.id, range.startLineNumber);
        }
    }
    _changeDecorationOptionsImpl(ownerId, decorationId, options) {
        const node = this._decorations[decorationId];
        if (!node) {
            return;
        }
        const nodeWasInOverviewRuler = (node.options.overviewRuler && node.options.overviewRuler.color ? true : false);
        const nodeIsInOverviewRuler = (options.overviewRuler && options.overviewRuler.color ? true : false);
        this._onDidChangeDecorations.checkAffectedAndFire(node.options);
        this._onDidChangeDecorations.checkAffectedAndFire(options);
        if (node.options.after || options.after) {
            const nodeRange = this._decorationsTree.getNodeRange(this, node);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.endLineNumber);
        }
        if (node.options.before || options.before) {
            const nodeRange = this._decorationsTree.getNodeRange(this, node);
            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.startLineNumber);
        }
        if (node.options.lineHeight !== null || options.lineHeight !== null) {
            const nodeRange = this._decorationsTree.getNodeRange(this, node);
            this._onDidChangeDecorations.recordLineAffectedByLineHeightChange(ownerId, decorationId, nodeRange.startLineNumber, options.lineHeight);
        }
        if (node.options.affectsFont || options.affectsFont) {
            const nodeRange = this._decorationsTree.getNodeRange(this, node);
            this._onDidChangeDecorations.recordLineAffectedByFontChange(ownerId, decorationId, nodeRange.startLineNumber);
        }
        const movedInOverviewRuler = nodeWasInOverviewRuler !== nodeIsInOverviewRuler;
        const changedWhetherInjectedText = isOptionsInjectedText(options) !== isNodeInjectedText(node);
        if (movedInOverviewRuler || changedWhetherInjectedText) {
            this._decorationsTree.delete(node);
            node.setOptions(options);
            this._decorationsTree.insert(node);
        }
        else {
            node.setOptions(options);
        }
    }
    _deltaDecorationsImpl(ownerId, oldDecorationsIds, newDecorations, suppressEvents = false) {
        const versionId = this.getVersionId();
        const oldDecorationsLen = oldDecorationsIds.length;
        let oldDecorationIndex = 0;
        const newDecorationsLen = newDecorations.length;
        let newDecorationIndex = 0;
        this._onDidChangeDecorations.beginDeferredEmit();
        try {
            const result = new Array(newDecorationsLen);
            while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {
                let node = null;
                if (oldDecorationIndex < oldDecorationsLen) {
                    // (1) get ourselves an old node
                    let decorationId;
                    do {
                        decorationId = oldDecorationsIds[oldDecorationIndex++];
                        node = this._decorations[decorationId];
                    } while (!node && oldDecorationIndex < oldDecorationsLen);
                    // (2) remove the node from the tree (if it exists)
                    if (node) {
                        if (node.options.after) {
                            const nodeRange = this._decorationsTree.getNodeRange(this, node);
                            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.endLineNumber);
                        }
                        if (node.options.before) {
                            const nodeRange = this._decorationsTree.getNodeRange(this, node);
                            this._onDidChangeDecorations.recordLineAffectedByInjectedText(nodeRange.startLineNumber);
                        }
                        if (node.options.lineHeight !== null) {
                            const nodeRange = this._decorationsTree.getNodeRange(this, node);
                            this._onDidChangeDecorations.recordLineAffectedByLineHeightChange(ownerId, decorationId, nodeRange.startLineNumber, null);
                        }
                        if (node.options.affectsFont) {
                            const nodeRange = this._decorationsTree.getNodeRange(this, node);
                            this._onDidChangeDecorations.recordLineAffectedByFontChange(ownerId, decorationId, nodeRange.startLineNumber);
                        }
                        this._decorationsTree.delete(node);
                        if (!suppressEvents) {
                            this._onDidChangeDecorations.checkAffectedAndFire(node.options);
                        }
                    }
                }
                if (newDecorationIndex < newDecorationsLen) {
                    // (3) create a new node if necessary
                    if (!node) {
                        const internalDecorationId = (++this._lastDecorationId);
                        const decorationId = `${this._instanceId};${internalDecorationId}`;
                        node = new IntervalNode(decorationId, 0, 0);
                        this._decorations[decorationId] = node;
                    }
                    // (4) initialize node
                    const newDecoration = newDecorations[newDecorationIndex];
                    const range = this._validateRangeRelaxedNoAllocations(newDecoration.range);
                    const options = _normalizeOptions(newDecoration.options);
                    const startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
                    const endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
                    node.ownerId = ownerId;
                    node.reset(versionId, startOffset, endOffset, range);
                    node.setOptions(options);
                    if (node.options.after) {
                        this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.endLineNumber);
                    }
                    if (node.options.before) {
                        this._onDidChangeDecorations.recordLineAffectedByInjectedText(range.startLineNumber);
                    }
                    if (node.options.lineHeight !== null) {
                        this._onDidChangeDecorations.recordLineAffectedByLineHeightChange(ownerId, node.id, range.startLineNumber, node.options.lineHeight);
                    }
                    if (node.options.affectsFont) {
                        this._onDidChangeDecorations.recordLineAffectedByFontChange(ownerId, node.id, range.startLineNumber);
                    }
                    if (!suppressEvents) {
                        this._onDidChangeDecorations.checkAffectedAndFire(options);
                    }
                    this._decorationsTree.insert(node);
                    result[newDecorationIndex] = node.id;
                    newDecorationIndex++;
                }
                else {
                    if (node) {
                        delete this._decorations[node.id];
                    }
                }
            }
            return result;
        }
        finally {
            this._onDidChangeDecorations.endDeferredEmit();
        }
    }
    //#endregion
    //#region Tokenization
    // TODO move them to the tokenization part.
    getLanguageId() {
        return this.tokenization.getLanguageId();
    }
    setLanguage(languageIdOrSelection, source) {
        if (typeof languageIdOrSelection === 'string') {
            this._languageSelectionListener.clear();
            this._setLanguage(languageIdOrSelection, source);
        }
        else {
            this._languageSelectionListener.value = languageIdOrSelection.onDidChange(() => this._setLanguage(languageIdOrSelection.languageId, source));
            this._setLanguage(languageIdOrSelection.languageId, source);
        }
    }
    _setLanguage(languageId, source) {
        this.tokenization.setLanguageId(languageId, source);
        this._languageService.requestRichLanguageFeatures(languageId);
    }
    getLanguageIdAtPosition(lineNumber, column) {
        return this.tokenization.getLanguageIdAtPosition(lineNumber, column);
    }
    getWordAtPosition(position) {
        return this._tokenizationTextModelPart.getWordAtPosition(position);
    }
    getWordUntilPosition(position) {
        return this._tokenizationTextModelPart.getWordUntilPosition(position);
    }
    //#endregion
    normalizePosition(position, affinity) {
        return position;
    }
    /**
     * Gets the column at which indentation stops at a given line.
     * @internal
    */
    getLineIndentColumn(lineNumber) {
        // Columns start with 1.
        return indentOfLine(this.getLineContent(lineNumber)) + 1;
    }
    toString() {
        return `TextModel(${this.uri.toString()})`;
    }
};
TextModel = TextModel_1 = __decorate([
    __param(4, IUndoRedoService),
    __param(5, ILanguageService),
    __param(6, ILanguageConfigurationService),
    __param(7, IInstantiationService)
], TextModel);
export { TextModel };
export function indentOfLine(line) {
    let indent = 0;
    for (const c of line) {
        if (c === ' ' || c === '\t') {
            indent++;
        }
        else {
            break;
        }
    }
    return indent;
}
//#region Decorations
function isNodeInOverviewRuler(node) {
    return (node.options.overviewRuler && node.options.overviewRuler.color ? true : false);
}
function isOptionsInjectedText(options) {
    return !!options.after || !!options.before;
}
function isNodeInjectedText(node) {
    return !!node.options.after || !!node.options.before;
}
class DecorationsTrees {
    constructor() {
        this._decorationsTree0 = new IntervalTree();
        this._decorationsTree1 = new IntervalTree();
        this._injectedTextDecorationsTree = new IntervalTree();
    }
    ensureAllNodesHaveRanges(host) {
        this.getAll(host, 0, false, false, false, false);
    }
    _ensureNodesHaveRanges(host, nodes) {
        for (const node of nodes) {
            if (node.range === null) {
                node.range = host.getRangeAt(node.cachedAbsoluteStart, node.cachedAbsoluteEnd);
            }
        }
        return nodes;
    }
    getAllInInterval(host, start, end, filterOwnerId, filterOutValidation, filterFontDecorations, onlyMarginDecorations) {
        const versionId = host.getVersionId();
        const result = this._intervalSearch(start, end, filterOwnerId, filterOutValidation, filterFontDecorations, versionId, onlyMarginDecorations);
        return this._ensureNodesHaveRanges(host, result);
    }
    _intervalSearch(start, end, filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations) {
        const r0 = this._decorationsTree0.intervalSearch(start, end, filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
        const r1 = this._decorationsTree1.intervalSearch(start, end, filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
        const r2 = this._injectedTextDecorationsTree.intervalSearch(start, end, filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
        return r0.concat(r1).concat(r2);
    }
    getInjectedTextInInterval(host, start, end, filterOwnerId) {
        const versionId = host.getVersionId();
        const result = this._injectedTextDecorationsTree.intervalSearch(start, end, filterOwnerId, false, false, versionId, false);
        return this._ensureNodesHaveRanges(host, result).filter((i) => i.options.showIfCollapsed || !i.range.isEmpty());
    }
    getFontDecorationsInInterval(host, start, end, filterOwnerId) {
        const versionId = host.getVersionId();
        const decorations = this._decorationsTree0.intervalSearch(start, end, filterOwnerId, false, false, versionId, false);
        return this._ensureNodesHaveRanges(host, decorations).filter((i) => i.options.affectsFont);
    }
    getAllInjectedText(host, filterOwnerId) {
        const versionId = host.getVersionId();
        const result = this._injectedTextDecorationsTree.search(filterOwnerId, false, false, versionId, false);
        return this._ensureNodesHaveRanges(host, result).filter((i) => i.options.showIfCollapsed || !i.range.isEmpty());
    }
    getAllCustomLineHeights(host, filterOwnerId) {
        const versionId = host.getVersionId();
        const result = this._search(filterOwnerId, false, false, false, versionId, false);
        return this._ensureNodesHaveRanges(host, result).filter((i) => typeof i.options.lineHeight === 'number');
    }
    getAll(host, filterOwnerId, filterOutValidation, filterFontDecorations, overviewRulerOnly, onlyMarginDecorations) {
        const versionId = host.getVersionId();
        const result = this._search(filterOwnerId, filterOutValidation, filterFontDecorations, overviewRulerOnly, versionId, onlyMarginDecorations);
        return this._ensureNodesHaveRanges(host, result);
    }
    _search(filterOwnerId, filterOutValidation, filterFontDecorations, overviewRulerOnly, cachedVersionId, onlyMarginDecorations) {
        if (overviewRulerOnly) {
            return this._decorationsTree1.search(filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
        }
        else {
            const r0 = this._decorationsTree0.search(filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
            const r1 = this._decorationsTree1.search(filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
            const r2 = this._injectedTextDecorationsTree.search(filterOwnerId, filterOutValidation, filterFontDecorations, cachedVersionId, onlyMarginDecorations);
            return r0.concat(r1).concat(r2);
        }
    }
    collectNodesFromOwner(ownerId) {
        const r0 = this._decorationsTree0.collectNodesFromOwner(ownerId);
        const r1 = this._decorationsTree1.collectNodesFromOwner(ownerId);
        const r2 = this._injectedTextDecorationsTree.collectNodesFromOwner(ownerId);
        return r0.concat(r1).concat(r2);
    }
    collectNodesPostOrder() {
        const r0 = this._decorationsTree0.collectNodesPostOrder();
        const r1 = this._decorationsTree1.collectNodesPostOrder();
        const r2 = this._injectedTextDecorationsTree.collectNodesPostOrder();
        return r0.concat(r1).concat(r2);
    }
    insert(node) {
        if (isNodeInjectedText(node)) {
            this._injectedTextDecorationsTree.insert(node);
        }
        else if (isNodeInOverviewRuler(node)) {
            this._decorationsTree1.insert(node);
        }
        else {
            this._decorationsTree0.insert(node);
        }
    }
    delete(node) {
        if (isNodeInjectedText(node)) {
            this._injectedTextDecorationsTree.delete(node);
        }
        else if (isNodeInOverviewRuler(node)) {
            this._decorationsTree1.delete(node);
        }
        else {
            this._decorationsTree0.delete(node);
        }
    }
    getNodeRange(host, node) {
        const versionId = host.getVersionId();
        if (node.cachedVersionId !== versionId) {
            this._resolveNode(node, versionId);
        }
        if (node.range === null) {
            node.range = host.getRangeAt(node.cachedAbsoluteStart, node.cachedAbsoluteEnd);
        }
        return node.range;
    }
    _resolveNode(node, cachedVersionId) {
        if (isNodeInjectedText(node)) {
            this._injectedTextDecorationsTree.resolveNode(node, cachedVersionId);
        }
        else if (isNodeInOverviewRuler(node)) {
            this._decorationsTree1.resolveNode(node, cachedVersionId);
        }
        else {
            this._decorationsTree0.resolveNode(node, cachedVersionId);
        }
    }
    acceptReplace(offset, length, textLength, forceMoveMarkers) {
        this._decorationsTree0.acceptReplace(offset, length, textLength, forceMoveMarkers);
        this._decorationsTree1.acceptReplace(offset, length, textLength, forceMoveMarkers);
        this._injectedTextDecorationsTree.acceptReplace(offset, length, textLength, forceMoveMarkers);
    }
}
function cleanClassName(className) {
    return className.replace(/[^a-z0-9\-_]/gi, ' ');
}
class DecorationOptions {
    constructor(options) {
        this.color = options.color || '';
        this.darkColor = options.darkColor || '';
    }
}
export class ModelDecorationOverviewRulerOptions extends DecorationOptions {
    constructor(options) {
        super(options);
        this._resolvedColor = null;
        this.position = (typeof options.position === 'number' ? options.position : model.OverviewRulerLane.Center);
    }
    getColor(theme) {
        if (!this._resolvedColor) {
            if (isDark(theme.type) && this.darkColor) {
                this._resolvedColor = this._resolveColor(this.darkColor, theme);
            }
            else {
                this._resolvedColor = this._resolveColor(this.color, theme);
            }
        }
        return this._resolvedColor;
    }
    invalidateCachedColor() {
        this._resolvedColor = null;
    }
    _resolveColor(color, theme) {
        if (typeof color === 'string') {
            return color;
        }
        const c = color ? theme.getColor(color.id) : null;
        if (!c) {
            return '';
        }
        return c.toString();
    }
}
export class ModelDecorationGlyphMarginOptions {
    constructor(options) {
        this.position = options?.position ?? model.GlyphMarginLane.Center;
        this.persistLane = options?.persistLane;
    }
}
export class ModelDecorationMinimapOptions extends DecorationOptions {
    constructor(options) {
        super(options);
        this.position = options.position;
        this.sectionHeaderStyle = options.sectionHeaderStyle ?? null;
        this.sectionHeaderText = options.sectionHeaderText ?? null;
    }
    getColor(theme) {
        if (!this._resolvedColor) {
            if (isDark(theme.type) && this.darkColor) {
                this._resolvedColor = this._resolveColor(this.darkColor, theme);
            }
            else {
                this._resolvedColor = this._resolveColor(this.color, theme);
            }
        }
        return this._resolvedColor;
    }
    invalidateCachedColor() {
        this._resolvedColor = undefined;
    }
    _resolveColor(color, theme) {
        if (typeof color === 'string') {
            return Color.fromHex(color);
        }
        return theme.getColor(color.id);
    }
}
export class ModelDecorationInjectedTextOptions {
    static from(options) {
        if (options instanceof ModelDecorationInjectedTextOptions) {
            return options;
        }
        return new ModelDecorationInjectedTextOptions(options);
    }
    constructor(options) {
        this.content = options.content || '';
        this.tokens = options.tokens ?? null;
        this.inlineClassName = options.inlineClassName || null;
        this.inlineClassNameAffectsLetterSpacing = options.inlineClassNameAffectsLetterSpacing || false;
        this.attachedData = options.attachedData || null;
        this.cursorStops = options.cursorStops || null;
    }
}
export class ModelDecorationOptions {
    static register(options) {
        return new ModelDecorationOptions(options);
    }
    static createDynamic(options) {
        return new ModelDecorationOptions(options);
    }
    constructor(options) {
        this.description = options.description;
        this.blockClassName = options.blockClassName ? cleanClassName(options.blockClassName) : null;
        this.blockDoesNotCollapse = options.blockDoesNotCollapse ?? null;
        this.blockIsAfterEnd = options.blockIsAfterEnd ?? null;
        this.blockPadding = options.blockPadding ?? null;
        this.stickiness = options.stickiness || 0 /* model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */;
        this.zIndex = options.zIndex || 0;
        this.className = options.className ? cleanClassName(options.className) : null;
        this.shouldFillLineOnLineBreak = options.shouldFillLineOnLineBreak ?? null;
        this.hoverMessage = options.hoverMessage || null;
        this.glyphMarginHoverMessage = options.glyphMarginHoverMessage || null;
        this.lineNumberHoverMessage = options.lineNumberHoverMessage || null;
        this.isWholeLine = options.isWholeLine || false;
        this.lineHeight = options.lineHeight ? Math.min(options.lineHeight, LINE_HEIGHT_CEILING) : null;
        this.fontSize = options.fontSize || null;
        this.affectsFont = !!options.fontSize || !!options.fontFamily || !!options.fontWeight || !!options.fontStyle;
        this.showIfCollapsed = options.showIfCollapsed || false;
        this.collapseOnReplaceEdit = options.collapseOnReplaceEdit || false;
        this.overviewRuler = options.overviewRuler ? new ModelDecorationOverviewRulerOptions(options.overviewRuler) : null;
        this.minimap = options.minimap ? new ModelDecorationMinimapOptions(options.minimap) : null;
        this.glyphMargin = options.glyphMarginClassName ? new ModelDecorationGlyphMarginOptions(options.glyphMargin) : null;
        this.glyphMarginClassName = options.glyphMarginClassName ? cleanClassName(options.glyphMarginClassName) : null;
        this.linesDecorationsClassName = options.linesDecorationsClassName ? cleanClassName(options.linesDecorationsClassName) : null;
        this.lineNumberClassName = options.lineNumberClassName ? cleanClassName(options.lineNumberClassName) : null;
        this.linesDecorationsTooltip = options.linesDecorationsTooltip ? strings.htmlAttributeEncodeValue(options.linesDecorationsTooltip) : null;
        this.firstLineDecorationClassName = options.firstLineDecorationClassName ? cleanClassName(options.firstLineDecorationClassName) : null;
        this.marginClassName = options.marginClassName ? cleanClassName(options.marginClassName) : null;
        this.inlineClassName = options.inlineClassName ? cleanClassName(options.inlineClassName) : null;
        this.inlineClassNameAffectsLetterSpacing = options.inlineClassNameAffectsLetterSpacing || false;
        this.beforeContentClassName = options.beforeContentClassName ? cleanClassName(options.beforeContentClassName) : null;
        this.afterContentClassName = options.afterContentClassName ? cleanClassName(options.afterContentClassName) : null;
        this.after = options.after ? ModelDecorationInjectedTextOptions.from(options.after) : null;
        this.before = options.before ? ModelDecorationInjectedTextOptions.from(options.before) : null;
        this.hideInCommentTokens = options.hideInCommentTokens ?? false;
        this.hideInStringTokens = options.hideInStringTokens ?? false;
        this.textDirection = options.textDirection ?? null;
    }
}
ModelDecorationOptions.EMPTY = ModelDecorationOptions.register({ description: 'empty' });
/**
 * The order carefully matches the values of the enum.
 */
const TRACKED_RANGE_OPTIONS = [
    ModelDecorationOptions.register({ description: 'tracked-range-always-grows-when-typing-at-edges', stickiness: 0 /* model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */ }),
    ModelDecorationOptions.register({ description: 'tracked-range-never-grows-when-typing-at-edges', stickiness: 1 /* model.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */ }),
    ModelDecorationOptions.register({ description: 'tracked-range-grows-only-when-typing-before', stickiness: 2 /* model.TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */ }),
    ModelDecorationOptions.register({ description: 'tracked-range-grows-only-when-typing-after', stickiness: 3 /* model.TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */ }),
];
function _normalizeOptions(options) {
    if (options instanceof ModelDecorationOptions) {
        return options;
    }
    return ModelDecorationOptions.createDynamic(options);
}
class DidChangeDecorationsEmitter extends Disposable {
    constructor(handleBeforeFire) {
        super();
        this.handleBeforeFire = handleBeforeFire;
        this._actual = this._register(new Emitter());
        this.event = this._actual.event;
        this._affectedInjectedTextLines = null;
        this._affectedLineHeights = null;
        this._affectedFontLines = null;
        this._deferredCnt = 0;
        this._shouldFireDeferred = false;
        this._affectsMinimap = false;
        this._affectsOverviewRuler = false;
        this._affectsGlyphMargin = false;
        this._affectsLineNumber = false;
    }
    hasListeners() {
        return this._actual.hasListeners();
    }
    beginDeferredEmit() {
        this._deferredCnt++;
    }
    endDeferredEmit() {
        this._deferredCnt--;
        if (this._deferredCnt === 0) {
            if (this._shouldFireDeferred) {
                this.doFire();
            }
            this._affectedInjectedTextLines?.clear();
            this._affectedInjectedTextLines = null;
            this._affectedLineHeights?.clear();
            this._affectedLineHeights = null;
            this._affectedFontLines?.clear();
            this._affectedFontLines = null;
        }
    }
    recordLineAffectedByInjectedText(lineNumber) {
        if (!this._affectedInjectedTextLines) {
            this._affectedInjectedTextLines = new Set();
        }
        this._affectedInjectedTextLines.add(lineNumber);
    }
    recordLineAffectedByLineHeightChange(ownerId, decorationId, lineNumber, lineHeight) {
        if (!this._affectedLineHeights) {
            this._affectedLineHeights = new SetWithKey([], LineHeightChangingDecoration.toKey);
        }
        this._affectedLineHeights.add(new LineHeightChangingDecoration(ownerId, decorationId, lineNumber, lineHeight));
    }
    recordLineAffectedByFontChange(ownerId, decorationId, lineNumber) {
        if (!this._affectedFontLines) {
            this._affectedFontLines = new SetWithKey([], LineFontChangingDecoration.toKey);
        }
        this._affectedFontLines.add(new LineFontChangingDecoration(ownerId, decorationId, lineNumber));
    }
    checkAffectedAndFire(options) {
        this._affectsMinimap ||= !!options.minimap?.position;
        this._affectsOverviewRuler ||= !!options.overviewRuler?.color;
        this._affectsGlyphMargin ||= !!options.glyphMarginClassName;
        this._affectsLineNumber ||= !!options.lineNumberClassName;
        this.tryFire();
    }
    fire() {
        this._affectsMinimap = true;
        this._affectsOverviewRuler = true;
        this._affectsGlyphMargin = true;
        this.tryFire();
    }
    tryFire() {
        if (this._deferredCnt === 0) {
            this.doFire();
        }
        else {
            this._shouldFireDeferred = true;
        }
    }
    doFire() {
        this.handleBeforeFire(this._affectedInjectedTextLines, this._affectedLineHeights, this._affectedFontLines);
        const event = {
            affectsMinimap: this._affectsMinimap,
            affectsOverviewRuler: this._affectsOverviewRuler,
            affectsGlyphMargin: this._affectsGlyphMargin,
            affectsLineNumber: this._affectsLineNumber,
        };
        this._shouldFireDeferred = false;
        this._affectsMinimap = false;
        this._affectsOverviewRuler = false;
        this._affectsGlyphMargin = false;
        this._actual.fire(event);
    }
}
//#endregion
class DidChangeContentEmitter extends Disposable {
    constructor() {
        super();
        /**
         * Both `fastEvent` and `slowEvent` work the same way and contain the same events, but first we invoke `fastEvent` and then `slowEvent`.
         */
        this._fastEmitter = this._register(new Emitter());
        this.fastEvent = this._fastEmitter.event;
        this._slowEmitter = this._register(new Emitter());
        this.slowEvent = this._slowEmitter.event;
        this._deferredCnt = 0;
        this._deferredEvent = null;
    }
    hasListeners() {
        return (this._fastEmitter.hasListeners()
            || this._slowEmitter.hasListeners());
    }
    beginDeferredEmit() {
        this._deferredCnt++;
    }
    endDeferredEmit(resultingSelection = null) {
        this._deferredCnt--;
        if (this._deferredCnt === 0) {
            if (this._deferredEvent !== null) {
                this._deferredEvent.rawContentChangedEvent.resultingSelection = resultingSelection;
                const e = this._deferredEvent;
                this._deferredEvent = null;
                this._fastEmitter.fire(e);
                this._slowEmitter.fire(e);
            }
        }
    }
    fire(e) {
        if (this._deferredCnt > 0) {
            if (this._deferredEvent) {
                this._deferredEvent = this._deferredEvent.merge(e);
            }
            else {
                this._deferredEvent = e;
            }
            return;
        }
        this._fastEmitter.fire(e);
        this._slowEmitter.fire(e);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdGV4dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFHM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQTRDLE1BQU0sK0NBQStDLENBQUM7QUFHM0gsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFFLE9B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
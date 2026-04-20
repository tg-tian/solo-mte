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
import { equals as arraysEqual } from '../../../../../base/common/arrays.js';
import { findFirst, findLast, findLastIdx } from '../../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../../base/common/assert.js';
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mapsStrictEqualIgnoreOrder, ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { equals as objectsEqual } from '../../../../../base/common/objects.js';
import { constObservable, derived, derivedOpts, ObservablePromise, observableSignalFromEvent, observableValue, observableValueOpts, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { emptySessionEntryDiff } from '../../common/chatEditingService.js';
import { FileOperationType } from './chatEditingOperations.js';
import { ChatEditingSnapshotTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
import { createSnapshot as createNotebookSnapshot, restoreSnapshot as restoreNotebookSnapshot } from './notebook/chatEditingModifiedNotebookSnapshot.js';
const START_REQUEST_EPOCH = '$$start';
const STOP_ID_EPOCH_PREFIX = '__epoch_';
/**
 * Implementation of the checkpoint-based timeline system.
 *
 * Invariants:
 * - There is at most one checkpoint or operation per epoch
 * - _checkpoints and _operations are always sorted in ascending order by epoch
 * - _currentEpoch being equal to the epoch of an operation means that
 *   operation is _not_ currently applied
 */
let ChatEditingCheckpointTimelineImpl = class ChatEditingCheckpointTimelineImpl {
    constructor(chatSessionResource, _delegate, _notebookEditorModelResolverService, _notebookService, _instantiationService, _modelService, _textModelService, _editorWorkerService, _configurationService) {
        this.chatSessionResource = chatSessionResource;
        this._delegate = _delegate;
        this._notebookEditorModelResolverService = _notebookEditorModelResolverService;
        this._notebookService = _notebookService;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._editorWorkerService = _editorWorkerService;
        this._configurationService = _configurationService;
        this._epochCounter = 0;
        this._checkpoints = observableValue(this, []);
        this._currentEpoch = observableValue(this, 0);
        this._operations = observableValueOpts({ equalsFn: () => false }, []); // mutable
        this._fileBaselines = new Map(); // key: `${uri}::${requestId}`
        this._refCountedDiffs = new Map();
        /** Gets the checkpoint, if any, we can 'undo' to. */
        this._willUndoToCheckpoint = derived(reader => {
            const currentEpoch = this._currentEpoch.read(reader);
            const checkpoints = this._checkpoints.read(reader);
            if (checkpoints.length < 2 || currentEpoch <= checkpoints[1].epoch) {
                return undefined;
            }
            const operations = this._operations.read(reader);
            // Undo either to right before the current request...
            const currentCheckpointIdx = findLastIdx(checkpoints, cp => cp.epoch < currentEpoch);
            const startOfRequest = currentCheckpointIdx === -1 ? undefined : findLast(checkpoints, cp => cp.undoStopId === undefined, currentCheckpointIdx);
            // Or to the checkpoint before the last operation in this request
            const previousOperation = findLast(operations, op => op.epoch < currentEpoch);
            const previousCheckpoint = previousOperation && findLast(checkpoints, cp => cp.epoch < previousOperation.epoch);
            if (!startOfRequest) {
                return previousCheckpoint;
            }
            if (!previousCheckpoint) {
                return startOfRequest;
            }
            // Special case: if we're undoing the first edit operation, undo the entire request
            if (!operations.some(op => op.epoch > startOfRequest.epoch && op.epoch < previousCheckpoint.epoch)) {
                return startOfRequest;
            }
            return previousCheckpoint.epoch > startOfRequest.epoch ? previousCheckpoint : startOfRequest;
        });
        this.canUndo = this._willUndoToCheckpoint.map(cp => !!cp);
        /**
         * Gets the epoch we'll redo this. Unlike undo this doesn't only use checkpoints
         * because we could potentially redo to a 'tip' operation that's not checkpointed yet.
         */
        this._willRedoToEpoch = derived(reader => {
            const currentEpoch = this._currentEpoch.read(reader);
            const operations = this._operations.read(reader);
            const checkpoints = this._checkpoints.read(reader);
            const maxEncounteredEpoch = Math.max(operations.at(-1)?.epoch || 0, checkpoints.at(-1)?.epoch || 0);
            if (currentEpoch > maxEncounteredEpoch) {
                return undefined;
            }
            // Find the next edit operation that would be applied...
            const nextOperation = operations.find(op => op.epoch >= currentEpoch);
            const nextCheckpoint = nextOperation && checkpoints.find(op => op.epoch > nextOperation.epoch);
            // And figure out where we're going if we're navigating across request
            // 1. If there is no next request or if the next target checkpoint is in
            //    the next request, navigate there.
            // 2. Otherwise, navigate to the end of the next request.
            const currentCheckpoint = findLast(checkpoints, cp => cp.epoch < currentEpoch);
            if (currentCheckpoint && nextOperation && currentCheckpoint.requestId !== nextOperation.requestId) {
                const startOfNextRequestIdx = findLastIdx(checkpoints, (cp, i) => cp.undoStopId === undefined && (checkpoints[i - 1]?.requestId === currentCheckpoint.requestId));
                const startOfNextRequest = startOfNextRequestIdx === -1 ? undefined : checkpoints[startOfNextRequestIdx];
                if (startOfNextRequest && nextOperation.requestId !== startOfNextRequest.requestId) {
                    const requestAfterTheNext = findFirst(checkpoints, op => op.undoStopId === undefined, startOfNextRequestIdx + 1);
                    if (requestAfterTheNext) {
                        return requestAfterTheNext.epoch;
                    }
                }
            }
            return Math.min(nextCheckpoint?.epoch || Infinity, (maxEncounteredEpoch + 1));
        });
        this.canRedo = this._willRedoToEpoch.map(e => !!e);
        this.requestDisablement = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, objectsEqual) }, reader => {
            const currentEpoch = this._currentEpoch.read(reader);
            const operations = this._operations.read(reader);
            const checkpoints = this._checkpoints.read(reader);
            const maxEncounteredEpoch = Math.max(operations.at(-1)?.epoch || 0, checkpoints.at(-1)?.epoch || 0);
            if (currentEpoch > maxEncounteredEpoch) {
                return []; // common case -- nothing undone
            }
            const lastAppliedOperation = findLast(operations, op => op.epoch < currentEpoch)?.epoch || 0;
            const lastAppliedRequest = findLast(checkpoints, cp => cp.epoch < currentEpoch && cp.undoStopId === undefined)?.epoch || 0;
            const stopDisablingAtEpoch = Math.max(lastAppliedOperation, lastAppliedRequest);
            const disablement = new Map();
            // Go through the checkpoints and disable any until the one that contains the last applied operation.
            // Subtle: the request will first make a checkpoint with an 'undefined' undo
            // stop, and in this loop we'll "automatically" disable the entire request when
            // we reach that checkpoint.
            for (let i = checkpoints.length - 1; i >= 0; i--) {
                const { undoStopId, requestId, epoch } = checkpoints[i];
                if (epoch <= stopDisablingAtEpoch) {
                    break;
                }
                if (requestId) {
                    disablement.set(requestId, undoStopId);
                }
            }
            return [...disablement].map(([requestId, afterUndoStop]) => ({ requestId, afterUndoStop }));
        });
        this.createCheckpoint(undefined, undefined, 'Initial State', 'Starting point before any edits');
    }
    createCheckpoint(requestId, undoStopId, label, description) {
        const existingCheckpoints = this._checkpoints.get();
        const existing = existingCheckpoints.find(c => c.undoStopId === undoStopId && c.requestId === requestId);
        if (existing) {
            return existing.checkpointId;
        }
        const { checkpoints, operations } = this._getVisibleOperationsAndCheckpoints();
        const checkpointId = generateUuid();
        const epoch = this.incrementEpoch();
        checkpoints.push({
            checkpointId,
            requestId,
            undoStopId,
            epoch,
            label,
            description
        });
        transaction(tx => {
            this._checkpoints.set(checkpoints, tx);
            this._operations.set(operations, tx);
            this._currentEpoch.set(epoch + 1, tx);
        });
        return checkpointId;
    }
    async undoToLastCheckpoint() {
        const checkpoint = this._willUndoToCheckpoint.get();
        if (checkpoint) {
            await this.navigateToCheckpoint(checkpoint.checkpointId);
        }
    }
    async redoToNextCheckpoint() {
        const targetEpoch = this._willRedoToEpoch.get();
        if (targetEpoch) {
            await this._navigateToEpoch(targetEpoch);
        }
    }
    navigateToCheckpoint(checkpointId) {
        const targetCheckpoint = this._getCheckpoint(checkpointId);
        if (!targetCheckpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }
        if (targetCheckpoint.undoStopId === undefined) {
            // If we're navigating to the start of a request, we want to restore the file
            // to whatever baseline we captured, _not_ the result state from the prior request
            // because there may have been user changes in the meantime. But we still want
            // to set the epoch marking that checkpoint as having been undone (the second
            // arg below) so that disablement works and so it's discarded if appropriate later.
            return this._navigateToEpoch(targetCheckpoint.epoch + 1, targetCheckpoint.epoch);
        }
        else {
            return this._navigateToEpoch(targetCheckpoint.epoch + 1);
        }
    }
    getContentURIAtStop(requestId, fileURI, stopId) {
        return ChatEditingSnapshotTextModelContentProvider.getSnapshotFileURI(this.chatSessionResource, requestId, stopId, fileURI.path);
    }
    async _navigateToEpoch(restoreToEpoch, navigateToEpoch = restoreToEpoch) {
        const currentEpoch = this._currentEpoch.get();
        if (currentEpoch !== restoreToEpoch) {
            const urisToRestore = await this._applyFileSystemOperations(currentEpoch, restoreToEpoch);
            // Reconstruct content for files affected by operations in the range
            await this._reconstructAllFileContents(restoreToEpoch, urisToRestore);
        }
        // Update current epoch
        this._currentEpoch.set(navigateToEpoch, undefined);
    }
    _getCheckpoint(checkpointId) {
        return this._checkpoints.get().find(c => c.checkpointId === checkpointId);
    }
    incrementEpoch() {
        return this._epochCounter++;
    }
    recordFileOperation(operation) {
        const { currentEpoch, checkpoints, operations } = this._getVisibleOperationsAndCheckpoints();
        if (operation.epoch < currentEpoch) {
            throw new Error(`Cannot record operation at epoch ${operation.epoch} when current epoch is ${currentEpoch}`);
        }
        operations.push(operation);
        transaction(tx => {
            this._checkpoints.set(checkpoints, tx);
            this._operations.set(operations, tx);
            this._currentEpoch.set(operation.epoch + 1, tx);
        });
    }
    _getVisibleOperationsAndCheckpoints() {
        const currentEpoch = this._currentEpoch.get();
        const checkpoints = this._checkpoints.get();
        const operations = this._operations.get();
        return {
            currentEpoch,
            checkpoints: checkpoints.filter(c => c.epoch < currentEpoch),
            operations: operations.filter(op => op.epoch < currentEpoch)
        };
    }
    recordFileBaseline(baseline) {
        const key = this._getBaselineKey(baseline.uri, baseline.requestId);
        this._fileBaselines.set(key, baseline);
    }
    _getFileBaseline(uri, requestId) {
        const key = this._getBaselineKey(uri, requestId);
        return this._fileBaselines.get(key);
    }
    hasFileBaseline(uri, requestId) {
        const key = this._getBaselineKey(uri, requestId);
        return this._fileBaselines.has(key) || this._operations.get().some(op => op.type === FileOperationType.Create && op.requestId === requestId && isEqual(uri, op.uri));
    }
    async getContentAtStop(requestId, contentURI, stopId) {
        let toEpoch;
        if (stopId?.startsWith(STOP_ID_EPOCH_PREFIX)) {
            toEpoch = Number(stopId.slice(STOP_ID_EPOCH_PREFIX.length));
        }
        else {
            toEpoch = this._checkpoints.get().find(c => c.requestId === requestId && c.undoStopId === stopId)?.epoch;
        }
        // The content URI doesn't preserve the original scheme or authority. Look through
        // to find the operation that touched that path to get its actual URI
        const fileURI = this._getTimelineCanonicalUriForPath(contentURI);
        if (!toEpoch || !fileURI) {
            return '';
        }
        const baseline = await this._findBestBaselineForFile(fileURI, toEpoch, requestId);
        if (!baseline) {
            return '';
        }
        const operations = this._getFileOperationsInRange(fileURI, baseline.epoch, toEpoch);
        const replayed = await this._replayOperations(baseline, operations);
        return replayed.exists ? replayed.content : undefined;
    }
    _getTimelineCanonicalUriForPath(contentURI) {
        for (const it of [this._fileBaselines.values(), this._operations.get()]) {
            for (const thing of it) {
                if (thing.uri.path === contentURI.path) {
                    return thing.uri;
                }
            }
        }
        return undefined;
    }
    /**
     * Creates a callback that is invoked when data at the stop changes. This
     * will not fire initially and may be debounced internally.
     */
    onDidChangeContentsAtStop(requestId, contentURI, stopId, callback) {
        // The only case where we have data that updates is if we have an epoch pointer that's
        // after our know epochs (e.g. pointing to the end file state after all operations).
        // If this isn't the case, abort.
        if (!stopId || !stopId.startsWith(STOP_ID_EPOCH_PREFIX)) {
            return Disposable.None;
        }
        const target = Number(stopId.slice(STOP_ID_EPOCH_PREFIX.length));
        if (target <= this._epochCounter) {
            return Disposable.None; // already finalized
        }
        const store = new DisposableStore();
        const scheduler = store.add(new ThrottledDelayer(500));
        store.add(Event.fromObservableLight(this._operations)(() => {
            scheduler.trigger(async () => {
                if (this._operations.get().at(-1)?.epoch >= target) {
                    store.dispose();
                }
                const content = await this.getContentAtStop(requestId, contentURI, stopId);
                if (content !== undefined) {
                    callback(content);
                }
            });
        }));
        return store;
    }
    _getCheckpointBeforeEpoch(epoch, reader) {
        return findLast(this._checkpoints.read(reader), c => c.epoch <= epoch);
    }
    async _reconstructFileState(uri, targetEpoch) {
        const targetCheckpoint = this._getCheckpointBeforeEpoch(targetEpoch);
        if (!targetCheckpoint) {
            throw new Error(`Checkpoint for epoch ${targetEpoch} not found`);
        }
        // Find the most appropriate baseline for this file
        const baseline = await this._findBestBaselineForFile(uri, targetEpoch, targetCheckpoint.requestId || '');
        if (!baseline) {
            // File doesn't exist at this checkpoint
            return {
                exists: false,
                uri,
            };
        }
        // Get operations that affect this file from baseline to target checkpoint
        const operations = this._getFileOperationsInRange(uri, baseline.epoch, targetEpoch);
        // Replay operations to reconstruct state
        return this._replayOperations(baseline, operations);
    }
    getStateForPersistence() {
        return {
            checkpoints: this._checkpoints.get(),
            currentEpoch: this._currentEpoch.get(),
            fileBaselines: [...this._fileBaselines],
            operations: this._operations.get(),
            epochCounter: this._epochCounter,
        };
    }
    restoreFromState(state, tx) {
        this._checkpoints.set(state.checkpoints, tx);
        this._currentEpoch.set(state.currentEpoch, tx);
        this._operations.set(state.operations.slice(), tx);
        this._epochCounter = state.epochCounter;
        this._fileBaselines.clear();
        for (const [key, baseline] of state.fileBaselines) {
            this._fileBaselines.set(key, baseline);
        }
    }
    getCheckpointIdForRequest(requestId, undoStopId) {
        const checkpoints = this._checkpoints.get();
        return checkpoints.find(c => c.requestId === requestId && c.undoStopId === undoStopId)?.checkpointId;
    }
    async _reconstructAllFileContents(targetEpoch, filesToReconstruct) {
        await Promise.all(Array.from(filesToReconstruct).map(async (uri) => {
            const reconstructedState = await this._reconstructFileState(uri, targetEpoch);
            if (reconstructedState.exists) {
                await this._delegate.setContents(reconstructedState.uri, reconstructedState.content, reconstructedState.telemetryInfo);
            }
        }));
    }
    _getBaselineKey(uri, requestId) {
        return `${uri.toString()}::${requestId}`;
    }
    async _findBestBaselineForFile(uri, epoch, requestId) {
        // First, iterate backwards through operations before the target checkpoint
        // to see if the file was created/re-created more recently than any baseline
        let currentRequestId = requestId;
        const operations = this._operations.get();
        for (let i = operations.length - 1; i >= 0; i--) {
            const operation = operations[i];
            if (operation.epoch > epoch) {
                continue;
            }
            // If the file was just created, use that as its updated baseline
            if (operation.type === FileOperationType.Create && isEqual(operation.uri, uri)) {
                return {
                    uri: operation.uri,
                    requestId: operation.requestId,
                    content: operation.initialContent,
                    epoch: operation.epoch,
                    telemetryInfo: operation.telemetryInfo,
                };
            }
            // If the file was renamed to this URI, use its old contents as the baseline
            if (operation.type === FileOperationType.Rename && isEqual(operation.newUri, uri)) {
                const prev = await this._findBestBaselineForFile(operation.oldUri, operation.epoch, operation.requestId);
                if (!prev) {
                    return undefined;
                }
                const operations = this._getFileOperationsInRange(operation.oldUri, prev.epoch, operation.epoch);
                const replayed = await this._replayOperations(prev, operations);
                return {
                    uri: uri,
                    epoch: operation.epoch,
                    content: replayed.exists ? replayed.content : '',
                    requestId: operation.requestId,
                    telemetryInfo: prev.telemetryInfo,
                    notebookViewType: replayed.exists ? replayed.notebookViewType : undefined,
                };
            }
            // When the request ID changes, check if we have a baseline for the current request
            if (currentRequestId && operation.requestId !== currentRequestId) {
                const baseline = this._getFileBaseline(uri, currentRequestId);
                if (baseline) {
                    return baseline;
                }
            }
            currentRequestId = operation.requestId;
        }
        // Check the final request ID for a baseline
        return this._getFileBaseline(uri, currentRequestId);
    }
    _getFileOperationsInRange(uri, fromEpoch, toEpoch) {
        return this._operations.get().filter(op => {
            const cellUri = CellUri.parse(op.uri);
            return op.epoch >= fromEpoch &&
                op.epoch < toEpoch &&
                (isEqual(op.uri, uri) || (cellUri && isEqual(cellUri.notebook, uri)));
        }).sort((a, b) => a.epoch - b.epoch);
    }
    async _replayOperations(baseline, operations) {
        let currentState = {
            exists: true,
            content: baseline.content,
            uri: baseline.uri,
            telemetryInfo: baseline.telemetryInfo,
        };
        if (baseline.notebookViewType) {
            currentState.notebook = await this._notebookEditorModelResolverService.createUntitledNotebookTextModel(baseline.notebookViewType);
            if (baseline.content) {
                restoreNotebookSnapshot(currentState.notebook, baseline.content);
            }
        }
        for (const operation of operations) {
            currentState = await this._applyOperationToState(currentState, operation, baseline.telemetryInfo);
        }
        if (currentState.exists && currentState.notebook) {
            const info = await this._notebookService.withNotebookDataProvider(currentState.notebook.viewType);
            currentState.content = createNotebookSnapshot(currentState.notebook, info.serializer.options, this._configurationService);
            currentState.notebook.dispose();
        }
        return currentState;
    }
    async _applyOperationToState(state, operation, telemetryInfo) {
        switch (operation.type) {
            case FileOperationType.Create: {
                if (state.exists && state.notebook) {
                    state.notebook.dispose();
                }
                let notebook;
                if (operation.notebookViewType) {
                    notebook = await this._notebookEditorModelResolverService.createUntitledNotebookTextModel(operation.notebookViewType);
                    if (operation.initialContent) {
                        restoreNotebookSnapshot(notebook, operation.initialContent);
                    }
                }
                return {
                    exists: true,
                    content: operation.initialContent,
                    uri: operation.uri,
                    telemetryInfo,
                    notebookViewType: operation.notebookViewType,
                    notebook,
                };
            }
            case FileOperationType.Delete:
                if (state.exists && state.notebook) {
                    state.notebook.dispose();
                }
                return {
                    exists: false,
                    uri: operation.uri
                };
            case FileOperationType.Rename:
                return {
                    ...state,
                    uri: operation.newUri
                };
            case FileOperationType.TextEdit: {
                if (!state.exists) {
                    throw new Error('Cannot apply text edits to non-existent file');
                }
                const nbCell = operation.cellIndex !== undefined && state.notebook?.cells.at(operation.cellIndex);
                if (nbCell) {
                    const newContent = this._applyTextEditsToContent(nbCell.getValue(), operation.edits);
                    state.notebook.applyEdits([{
                            editType: 1 /* CellEditType.Replace */,
                            index: operation.cellIndex,
                            count: 1,
                            cells: [{ cellKind: nbCell.cellKind, language: nbCell.language, mime: nbCell.language, source: newContent, outputs: nbCell.outputs }]
                        }], true, undefined, () => undefined, undefined);
                    return state;
                }
                // Apply text edits using a temporary text model
                return {
                    ...state,
                    content: this._applyTextEditsToContent(state.content, operation.edits)
                };
            }
            case FileOperationType.NotebookEdit:
                if (!state.exists) {
                    throw new Error('Cannot apply notebook edits to non-existent file');
                }
                if (!state.notebook) {
                    throw new Error('Cannot apply notebook edits to non-notebook file');
                }
                state.notebook.applyEdits(operation.cellEdits.slice(), true, undefined, () => undefined, undefined);
                return state;
            default:
                assertNever(operation);
        }
    }
    async _applyFileSystemOperations(fromEpoch, toEpoch) {
        const isMovingForward = toEpoch > fromEpoch;
        const operations = this._operations.get().filter(op => {
            if (isMovingForward) {
                return op.epoch >= fromEpoch && op.epoch < toEpoch;
            }
            else {
                return op.epoch < fromEpoch && op.epoch >= toEpoch;
            }
        }).sort((a, b) => isMovingForward ? a.epoch - b.epoch : b.epoch - a.epoch);
        // Apply file system operations in the correct direction
        const urisToRestore = new ResourceSet();
        for (const operation of operations) {
            await this._applyFileSystemOperation(operation, isMovingForward, urisToRestore);
        }
        return urisToRestore;
    }
    async _applyFileSystemOperation(operation, isMovingForward, urisToRestore) {
        switch (operation.type) {
            case FileOperationType.Create:
                if (isMovingForward) {
                    await this._delegate.createFile(operation.uri, operation.initialContent);
                    urisToRestore.add(operation.uri);
                }
                else {
                    await this._delegate.deleteFile(operation.uri);
                    urisToRestore.delete(operation.uri);
                }
                break;
            case FileOperationType.Delete:
                if (isMovingForward) {
                    await this._delegate.deleteFile(operation.uri);
                    urisToRestore.delete(operation.uri);
                }
                else {
                    await this._delegate.createFile(operation.uri, operation.finalContent);
                    urisToRestore.add(operation.uri);
                }
                break;
            case FileOperationType.Rename:
                if (isMovingForward) {
                    await this._delegate.renameFile(operation.oldUri, operation.newUri);
                    urisToRestore.delete(operation.oldUri);
                    urisToRestore.add(operation.newUri);
                }
                else {
                    await this._delegate.renameFile(operation.newUri, operation.oldUri);
                    urisToRestore.delete(operation.newUri);
                    urisToRestore.add(operation.oldUri);
                }
                break;
            // Text and notebook edits don't affect file system structure
            case FileOperationType.TextEdit:
            case FileOperationType.NotebookEdit:
                urisToRestore.add(CellUri.parse(operation.uri)?.notebook ?? operation.uri);
                break;
            default:
                assertNever(operation);
        }
    }
    _applyTextEditsToContent(content, edits) {
        // Use the example pattern provided by the user
        const makeModel = (uri, contents) => this._instantiationService.createInstance(TextModel, contents, '', this._modelService.getCreationOptions('', uri, true), uri);
        // Create a temporary URI for the model
        const tempUri = URI.from({ scheme: 'temp', path: `/temp-${Date.now()}.txt` });
        const model = makeModel(tempUri, content);
        try {
            // Apply edits
            model.applyEdits(edits.map(edit => ({
                range: {
                    startLineNumber: edit.range.startLineNumber,
                    startColumn: edit.range.startColumn,
                    endLineNumber: edit.range.endLineNumber,
                    endColumn: edit.range.endColumn
                },
                text: edit.text
            })));
            return model.getValue();
        }
        finally {
            model.dispose();
        }
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        const epochs = derivedOpts({ equalsFn: (a, b) => a.start === b.start && a.end === b.end }, reader => {
            const checkpoints = this._checkpoints.read(reader);
            const startIndex = checkpoints.findIndex(c => c.requestId === requestId && c.undoStopId === stopId);
            return { start: checkpoints[startIndex], end: checkpoints[startIndex + 1] };
        });
        return this._getEntryDiffBetweenEpochs(uri, `s\0${requestId}\0${stopId}`, epochs);
    }
    /** Gets the epoch bounds of the request. If stopRequestId is undefined, gets ONLY the single request's bounds */
    _getRequestEpochBounds(startRequestId, stopRequestId) {
        return derivedOpts({ equalsFn: (a, b) => a.start === b.start && a.end === b.end }, reader => {
            const checkpoints = this._checkpoints.read(reader);
            const startIndex = checkpoints.findIndex(c => c.requestId === startRequestId);
            const start = startIndex === -1 ? checkpoints[0] : checkpoints[startIndex];
            let end;
            if (stopRequestId === undefined) {
                end = findFirst(checkpoints, c => c.requestId !== startRequestId, startIndex + 1);
            }
            else {
                end = checkpoints.find(c => c.requestId === stopRequestId)
                    || findFirst(checkpoints, c => c.requestId !== startRequestId, startIndex + 1)
                    || checkpoints[checkpoints.length - 1];
            }
            return { start, end };
        });
    }
    getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId) {
        return this._getEntryDiffBetweenEpochs(uri, `r\0${startRequestId}\0${stopRequestId}`, this._getRequestEpochBounds(startRequestId, stopRequestId));
    }
    _getEntryDiffBetweenEpochs(uri, cacheKey, epochs) {
        const key = `${uri.toString()}\0${cacheKey}`;
        let obs = this._refCountedDiffs.get(key);
        if (!obs) {
            obs = this._getEntryDiffBetweenEpochsInner(uri, epochs, () => this._refCountedDiffs.delete(key));
            this._refCountedDiffs.set(key, obs);
        }
        return obs;
    }
    _getEntryDiffBetweenEpochsInner(uri, epochs, onLastObserverRemoved) {
        const modelRefsPromise = derived(this, (reader) => {
            const { start, end } = epochs.read(reader);
            if (!start) {
                return undefined;
            }
            const store = reader.store.add(new DisposableStore());
            const originalURI = this.getContentURIAtStop(start.requestId || START_REQUEST_EPOCH, uri, STOP_ID_EPOCH_PREFIX + start.epoch);
            const modifiedURI = this.getContentURIAtStop(end?.requestId || start.requestId || START_REQUEST_EPOCH, uri, STOP_ID_EPOCH_PREFIX + (end?.epoch || Number.MAX_SAFE_INTEGER));
            const promise = Promise.all([
                this._textModelService.createModelReference(originalURI),
                this._textModelService.createModelReference(modifiedURI),
            ]).then(refs => {
                if (store.isDisposed) {
                    refs.forEach(r => r.dispose());
                }
                else {
                    refs.forEach(r => store.add(r));
                }
                return {
                    refs: refs.map(r => ({
                        model: r.object.textEditorModel,
                        onChange: observableSignalFromEvent(this, r.object.textEditorModel.onDidChangeContent.bind(r.object.textEditorModel)),
                    })),
                    isFinal: !!end,
                };
            }).catch((error) => {
                return { refs: [], isFinal: true, error };
            });
            return {
                originalURI,
                modifiedURI,
                promise: new ObservablePromise(promise),
            };
        });
        const diff = derived(reader => {
            const modelsData = modelRefsPromise.read(reader);
            if (!modelsData) {
                return;
            }
            const { originalURI, modifiedURI, promise } = modelsData;
            const promiseData = promise?.promiseResult.read(reader);
            if (!promiseData?.data) {
                return { originalURI, modifiedURI, promise: undefined };
            }
            const { refs, isFinal, error } = promiseData.data;
            if (error) {
                return { originalURI, modifiedURI, promise: new ObservablePromise(Promise.resolve(emptySessionEntryDiff(originalURI, modifiedURI))) };
            }
            refs.forEach(m => m.onChange.read(reader)); // re-read when contents change
            return { originalURI, modifiedURI, promise: new ObservablePromise(this._computeDiff(originalURI, modifiedURI, !!isFinal)) };
        });
        return derivedOpts({ onLastObserverRemoved }, reader => {
            const result = diff.read(reader);
            if (!result) {
                return undefined;
            }
            const promised = result.promise?.promiseResult.read(reader);
            if (promised?.data) {
                return promised.data;
            }
            if (promised?.error) {
                return emptySessionEntryDiff(result.originalURI, result.modifiedURI);
            }
            return { ...emptySessionEntryDiff(result.originalURI, result.modifiedURI), isBusy: true };
        });
    }
    _computeDiff(originalUri, modifiedUri, isFinal) {
        return this._editorWorkerService.computeDiff(originalUri, modifiedUri, { ignoreTrimWhitespace: false, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced').then((diff) => {
            const entryDiff = {
                originalURI: originalUri,
                modifiedURI: modifiedUri,
                identical: !!diff?.identical,
                isFinal,
                quitEarly: !diff || diff.quitEarly,
                added: 0,
                removed: 0,
                isBusy: false,
            };
            if (diff) {
                for (const change of diff.changes) {
                    entryDiff.removed += change.original.endLineNumberExclusive - change.original.startLineNumber;
                    entryDiff.added += change.modified.endLineNumberExclusive - change.modified.startLineNumber;
                }
            }
            return entryDiff;
        });
    }
    hasEditsInRequest(requestId, reader) {
        for (const value of this._fileBaselines.values()) {
            if (value.requestId === requestId) {
                return true;
            }
        }
        for (const operation of this._operations.read(reader)) {
            if (operation.requestId === requestId) {
                return true;
            }
        }
        return false;
    }
    getDiffsForFilesInRequest(requestId) {
        const boundsObservable = this._getRequestEpochBounds(requestId);
        const startEpochs = derivedOpts({ equalsFn: mapsStrictEqualIgnoreOrder }, reader => {
            const uris = new ResourceMap();
            for (const value of this._fileBaselines.values()) {
                if (value.requestId === requestId) {
                    uris.set(value.uri, value.epoch);
                }
            }
            const bounds = boundsObservable.read(reader);
            for (const operation of this._operations.read(reader)) {
                if (operation.epoch < bounds.start.epoch) {
                    continue;
                }
                if (bounds.end && operation.epoch >= bounds.end.epoch) {
                    break;
                }
                if (operation.type === FileOperationType.Create) {
                    uris.set(operation.uri, 0);
                }
            }
            return uris;
        });
        return this._getDiffsForFilesAtEpochs(startEpochs, boundsObservable.map(b => b.end));
    }
    _getDiffsForFilesAtEpochs(startEpochs, endCheckpointObs) {
        // URIs are never removed from the set and we never adjust baselines backwards
        // (history is immutable) so we can easily cache to avoid regenerating diffs when new files are added
        const prevDiffs = new ResourceMap();
        let prevEndCheckpoint = undefined;
        const perFileDiffs = derived(this, reader => {
            const checkpoints = this._checkpoints.read(reader);
            const firstCheckpoint = checkpoints[0];
            if (!firstCheckpoint) {
                return [];
            }
            const endCheckpoint = endCheckpointObs.read(reader);
            if (endCheckpoint !== prevEndCheckpoint) {
                prevDiffs.clear();
                prevEndCheckpoint = endCheckpoint;
            }
            const uris = startEpochs.read(reader);
            const diffs = [];
            for (const [uri, epoch] of uris) {
                const obs = prevDiffs.get(uri) ?? this._getEntryDiffBetweenEpochs(uri, `e\0${epoch}\0${endCheckpoint?.epoch}`, constObservable({ start: checkpoints.findLast(cp => cp.epoch <= epoch) || firstCheckpoint, end: endCheckpoint }));
                prevDiffs.set(uri, obs);
                diffs.push(obs);
            }
            return diffs;
        });
        return perFileDiffs.map((diffs, reader) => {
            return diffs.flatMap(d => d.read(reader)).filter(isDefined);
        });
    }
    getDiffsForFilesInSession() {
        const startEpochs = derivedOpts({ equalsFn: mapsStrictEqualIgnoreOrder }, reader => {
            const uris = new ResourceMap();
            for (const baseline of this._fileBaselines.values()) {
                uris.set(baseline.uri, Math.min(baseline.epoch, uris.get(baseline.uri) ?? Number.MAX_SAFE_INTEGER));
            }
            for (const operation of this._operations.read(reader)) {
                if (operation.type === FileOperationType.Create) {
                    uris.set(operation.uri, 0);
                }
            }
            return uris;
        });
        return this._getDiffsForFilesAtEpochs(startEpochs, constObservable(undefined));
    }
    getDiffForSession() {
        const fileDiffs = this.getDiffsForFilesInSession();
        return derived(reader => {
            const diffs = fileDiffs.read(reader);
            let added = 0;
            let removed = 0;
            for (const diff of diffs) {
                added += diff.added;
                removed += diff.removed;
            }
            return { added, removed };
        });
    }
};
ChatEditingCheckpointTimelineImpl = __decorate([
    __param(2, INotebookEditorModelResolverService),
    __param(3, INotebookService),
    __param(4, IInstantiationService),
    __param(5, IModelService),
    __param(6, ITextModelService),
    __param(7, IEditorWorkerService),
    __param(8, IConfigurationService)
], ChatEditingCheckpointTimelineImpl);
export { ChatEditingCheckpointTimelineImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdDaGVja3BvaW50VGltZWxpbmVJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0NoZWNrcG9pbnRUaW1lbGluZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbkcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBc0MsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RPLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFXLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLEdBQUcs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
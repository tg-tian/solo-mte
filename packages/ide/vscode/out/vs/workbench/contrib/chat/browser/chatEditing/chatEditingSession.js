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
var ChatEditingSession_1;
import { DeferredPromise, Sequencer, SequencerByKey, timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { derived, observableValue, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { hasKey } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { chatEditingSessionIsReady, getMultiDiffSourceUri } from '../../common/chatEditingService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ChatEditingCheckpointTimelineImpl } from './chatEditingCheckpointTimelineImpl.js';
import { ChatEditingModifiedDocumentEntry } from './chatEditingModifiedDocumentEntry.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingModifiedNotebookEntry } from './chatEditingModifiedNotebookEntry.js';
import { FileOperationType } from './chatEditingOperations.js';
import { ChatEditingSessionStorage } from './chatEditingSessionStorage.js';
import { ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
var NotExistBehavior;
(function (NotExistBehavior) {
    NotExistBehavior[NotExistBehavior["Create"] = 0] = "Create";
    NotExistBehavior[NotExistBehavior["Abort"] = 1] = "Abort";
})(NotExistBehavior || (NotExistBehavior = {}));
class ThrottledSequencer extends Sequencer {
    constructor(_minDuration, _maxOverallDelay) {
        super();
        this._minDuration = _minDuration;
        this._maxOverallDelay = _maxOverallDelay;
        this._size = 0;
    }
    queue(promiseTask) {
        this._size += 1;
        const noDelay = this._size * this._minDuration > this._maxOverallDelay;
        return super.queue(async () => {
            try {
                const p1 = promiseTask();
                const p2 = noDelay
                    ? Promise.resolve(undefined)
                    : timeout(this._minDuration, CancellationToken.None);
                const [result] = await Promise.all([p1, p2]);
                return result;
            }
            finally {
                this._size -= 1;
            }
        });
    }
}
function createOpeningEditCodeBlock(uri, isNotebook, undoStopId) {
    return [
        {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        },
        {
            kind: 'codeblockUri',
            uri,
            isEdit: true,
            undoStopId
        },
        {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        },
        isNotebook
            ? {
                kind: 'notebookEdit',
                uri,
                edits: [],
                done: false,
                isExternalEdit: true
            }
            : {
                kind: 'textEdit',
                uri,
                edits: [],
                done: false,
                isExternalEdit: true
            },
    ];
}
let ChatEditingSession = ChatEditingSession_1 = class ChatEditingSession extends Disposable {
    get state() {
        return this._state;
    }
    get requestDisablement() {
        return this._timeline.requestDisablement;
    }
    get onDidDispose() {
        this._assertNotDisposed();
        return this._onDidDispose.event;
    }
    constructor(chatSessionResource, isGlobalEditingSession, _lookupExternalEntry, transferFrom, _instantiationService, _modelService, _languageService, _textModelService, _bulkEditService, _editorGroupsService, _editorService, _notebookService, _accessibilitySignalService, _logService, configurationService) {
        super();
        this.chatSessionResource = chatSessionResource;
        this.isGlobalEditingSession = isGlobalEditingSession;
        this._lookupExternalEntry = _lookupExternalEntry;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._textModelService = _textModelService;
        this._bulkEditService = _bulkEditService;
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._notebookService = _notebookService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._logService = _logService;
        this.configurationService = configurationService;
        this._state = observableValue(this, 0 /* ChatEditingSessionState.Initial */);
        /**
         * Contains the contents of a file when the AI first began doing edits to it.
         */
        this._initialFileContents = new ResourceMap();
        this._baselineCreationLocks = new SequencerByKey();
        this._streamingEditLocks = new SequencerByKey();
        /**
         * Tracks active external edit operations.
         * Key is operationId, value contains the operation state.
         */
        this._externalEditOperations = new Map();
        this._entriesObs = observableValue(this, []);
        this.entries = derived(reader => {
            const state = this._state.read(reader);
            if (state === 3 /* ChatEditingSessionState.Disposed */ || state === 0 /* ChatEditingSessionState.Initial */) {
                return [];
            }
            else {
                return this._entriesObs.read(reader);
            }
        });
        this._onDidDispose = new Emitter();
        this._timeline = this._instantiationService.createInstance(ChatEditingCheckpointTimelineImpl, chatSessionResource, this._getTimelineDelegate());
        this.canRedo = this._timeline.canRedo.map((hasHistory, reader) => hasHistory && this._state.read(reader) === 2 /* ChatEditingSessionState.Idle */);
        this.canUndo = this._timeline.canUndo.map((hasHistory, reader) => hasHistory && this._state.read(reader) === 2 /* ChatEditingSessionState.Idle */);
        this._init(transferFrom);
    }
    _getTimelineDelegate() {
        return {
            createFile: (uri, content) => {
                return this._bulkEditService.apply({
                    edits: [{
                            newResource: uri,
                            options: {
                                overwrite: true,
                                contents: content ? Promise.resolve(VSBuffer.fromString(content)) : undefined,
                            },
                        }],
                });
            },
            deleteFile: async (uri) => {
                const entries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, uri));
                this._entriesObs.set(entries, undefined);
                await this._bulkEditService.apply({ edits: [{ oldResource: uri, options: { ignoreIfNotExists: true } }] });
            },
            renameFile: async (fromUri, toUri) => {
                const entries = this._entriesObs.get();
                const previousEntry = entries.find(e => isEqual(e.modifiedURI, fromUri));
                if (previousEntry) {
                    const newEntry = await this._getOrCreateModifiedFileEntry(toUri, 0 /* NotExistBehavior.Create */, previousEntry.telemetryInfo, this._getCurrentTextOrNotebookSnapshot(previousEntry));
                    previousEntry.dispose();
                    this._entriesObs.set(entries.map(e => e === previousEntry ? newEntry : e), undefined);
                }
            },
            setContents: async (uri, content, telemetryInfo) => {
                const entry = await this._getOrCreateModifiedFileEntry(uri, 0 /* NotExistBehavior.Create */, telemetryInfo);
                if (entry instanceof ChatEditingModifiedNotebookEntry) {
                    await entry.restoreModifiedModelFromSnapshot(content);
                }
                else {
                    await entry.acceptAgentEdits(uri, [{ range: new Range(1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), text: content }], true, undefined);
                }
            }
        };
    }
    async _init(transferFrom) {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionResource);
        let restoredSessionState;
        if (transferFrom instanceof ChatEditingSession_1) {
            restoredSessionState = transferFrom._getStoredState(this.chatSessionResource);
        }
        else {
            restoredSessionState = await storage.restoreState().catch(err => {
                this._logService.error(`Error restoring chat editing session state for ${this.chatSessionResource}`, err);
                return undefined;
            });
            if (this._store.isDisposed) {
                return; // disposed while restoring
            }
        }
        if (restoredSessionState) {
            for (const [uri, content] of restoredSessionState.initialFileContents) {
                this._initialFileContents.set(uri, content);
            }
            if (restoredSessionState.timeline) {
                transaction(tx => this._timeline.restoreFromState(restoredSessionState.timeline, tx));
            }
            await this._initEntries(restoredSessionState.recentSnapshot);
        }
        this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
    }
    _getEntry(uri) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
    }
    getEntry(uri) {
        return this._getEntry(uri);
    }
    readEntry(uri, reader) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.read(reader).find(e => isEqual(e.modifiedURI, uri));
    }
    storeState() {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionResource);
        return storage.storeState(this._getStoredState());
    }
    _getStoredState(sessionResource = this.chatSessionResource) {
        const entries = new ResourceMap();
        for (const entry of this._entriesObs.get()) {
            entries.set(entry.modifiedURI, entry.createSnapshot(sessionResource, undefined, undefined));
        }
        const state = {
            initialFileContents: this._initialFileContents,
            timeline: this._timeline.getStateForPersistence(),
            recentSnapshot: { entries, stopId: undefined },
        };
        return state;
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        return this._timeline.getEntryDiffBetweenStops(uri, requestId, stopId);
    }
    getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId) {
        return this._timeline.getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId);
    }
    getDiffsForFilesInSession() {
        return this._timeline.getDiffsForFilesInSession();
    }
    getDiffForSession() {
        return this._timeline.getDiffForSession();
    }
    getDiffsForFilesInRequest(requestId) {
        return this._timeline.getDiffsForFilesInRequest(requestId);
    }
    hasEditsInRequest(requestId, reader) {
        return this._timeline.hasEditsInRequest(requestId, reader);
    }
    createSnapshot(requestId, undoStop) {
        const label = undoStop ? `Request ${requestId} - Stop ${undoStop}` : `Request ${requestId}`;
        this._timeline.createCheckpoint(requestId, undoStop, label);
    }
    async getSnapshotContents(requestId, uri, stopId) {
        const content = await this._timeline.getContentAtStop(requestId, uri, stopId);
        return typeof content === 'string' ? VSBuffer.fromString(content) : content;
    }
    async getSnapshotModel(requestId, undoStop, snapshotUri) {
        await this._baselineCreationLocks.peek(snapshotUri.path);
        const content = await this._timeline.getContentAtStop(requestId, snapshotUri, undoStop);
        if (content === undefined) {
            return null;
        }
        const contentStr = typeof content === 'string' ? content : content.toString();
        const model = this._modelService.createModel(contentStr, this._languageService.createByFilepathOrFirstLine(snapshotUri), snapshotUri, false);
        const store = new DisposableStore();
        store.add(model.onWillDispose(() => store.dispose()));
        store.add(this._timeline.onDidChangeContentsAtStop(requestId, snapshotUri, undoStop, c => model.setValue(c)));
        return model;
    }
    getSnapshotUri(requestId, uri, stopId) {
        return this._timeline.getContentURIAtStop(requestId, uri, stopId);
    }
    async restoreSnapshot(requestId, stopId) {
        const checkpointId = this._timeline.getCheckpointIdForRequest(requestId, stopId);
        if (checkpointId) {
            await this._timeline.navigateToCheckpoint(checkpointId);
        }
    }
    _assertNotDisposed() {
        if (this._state.get() === 3 /* ChatEditingSessionState.Disposed */) {
            throw new BugIndicatingError(`Cannot access a disposed editing session`);
        }
    }
    async accept(...uris) {
        if (await this._operateEntry('accept', uris)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
        }
    }
    async reject(...uris) {
        if (await this._operateEntry('reject', uris)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
        }
    }
    async _operateEntry(action, uris) {
        this._assertNotDisposed();
        const applicableEntries = this._entriesObs.get()
            .filter(e => uris.length === 0 || uris.some(u => isEqual(u, e.modifiedURI)))
            .filter(e => !e.isCurrentlyBeingModifiedBy.get())
            .filter(e => e.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        if (applicableEntries.length === 0) {
            return 0;
        }
        // Perform all I/O operations in parallel, each resolving to a state transition callback
        const method = action === 'accept' ? 'acceptDeferred' : 'rejectDeferred';
        const transitionCallbacks = await Promise.all(applicableEntries.map(entry => entry[method]().catch(err => {
            this._logService.error(`Error calling ${method} on entry ${entry.modifiedURI}`, err);
        })));
        // Execute all state transitions atomically in a single transaction
        transaction(tx => {
            transitionCallbacks.forEach(callback => callback?.(tx));
        });
        return applicableEntries.length;
    }
    async show(previousChanges) {
        this._assertNotDisposed();
        if (this._editorPane) {
            if (this._editorPane.isVisible()) {
                return;
            }
            else if (this._editorPane.input) {
                await this._editorGroupsService.activeGroup.openEditor(this._editorPane.input, { pinned: true, activation: EditorActivation.ACTIVATE });
                return;
            }
        }
        const input = MultiDiffEditorInput.fromResourceMultiDiffEditorInput({
            multiDiffSource: getMultiDiffSourceUri(this, previousChanges),
            label: localize('multiDiffEditorInput.name', "Suggested Edits")
        }, this._instantiationService);
        this._editorPane = await this._editorGroupsService.activeGroup.openEditor(input, { pinned: true, activation: EditorActivation.ACTIVATE });
    }
    async stop(clearState = false) {
        this._stopPromise ??= Promise.allSettled([this._performStop(), this.storeState()]).then(() => { });
        await this._stopPromise;
        if (clearState) {
            await this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionResource).clearState();
        }
    }
    async _performStop() {
        // Close out all open files
        const schemes = [AbstractChatEditingModifiedFileEntry.scheme, ChatEditingTextModelContentProvider.scheme];
        await Promise.allSettled(this._editorGroupsService.groups.flatMap(async (g) => {
            return g.editors.map(async (e) => {
                if ((e instanceof MultiDiffEditorInput && e.initialResources?.some(r => r.originalUri && schemes.indexOf(r.originalUri.scheme) !== -1))
                    || (e instanceof DiffEditorInput && e.original.resource && schemes.indexOf(e.original.resource.scheme) !== -1)) {
                    await g.closeEditor(e);
                }
            });
        }));
    }
    dispose() {
        this._assertNotDisposed();
        dispose(this._entriesObs.get());
        super.dispose();
        this._state.set(3 /* ChatEditingSessionState.Disposed */, undefined);
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
    get isDisposed() {
        return this._state.get() === 3 /* ChatEditingSessionState.Disposed */;
    }
    startStreamingEdits(resource, responseModel, inUndoStop) {
        const completePromise = new DeferredPromise();
        const startPromise = new DeferredPromise();
        // Sequence all edits made this this resource in this streaming edits instance,
        // and also sequence the resource overall in the rare (currently invalid?) case
        // that edits are made in parallel to the same resource,
        const sequencer = new ThrottledSequencer(15, 1000);
        sequencer.queue(() => startPromise.p);
        // Lock around creating the baseline so we don't fail to resolve models
        // in the edit pills if they render quickly
        this._baselineCreationLocks.queue(resource.path, () => startPromise.p);
        this._streamingEditLocks.queue(resource.toString(), async () => {
            await chatEditingSessionIsReady(this);
            if (!this.isDisposed) {
                await this._acceptStreamingEditsStart(responseModel, inUndoStop, resource);
            }
            startPromise.complete();
            return completePromise.p;
        });
        let didComplete = false;
        return {
            pushText: (edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, isLastEdits, responseModel);
                    }
                });
            },
            pushNotebookCellText: (cell, edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(cell, edits, isLastEdits, responseModel);
                    }
                });
            },
            pushNotebook: (edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, isLastEdits, responseModel);
                    }
                });
            },
            complete: () => {
                if (didComplete) {
                    return;
                }
                didComplete = true;
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, [], true, responseModel);
                        await this._resolve(responseModel.requestId, inUndoStop, resource);
                        completePromise.complete();
                    }
                });
            },
        };
    }
    async startExternalEdits(responseModel, operationId, resources, undoStopId) {
        const snapshots = new ResourceMap();
        const acquiredLockPromises = [];
        const releaseLockPromises = [];
        const progress = [];
        const telemetryInfo = this._getTelemetryInfoForModel(responseModel);
        await chatEditingSessionIsReady(this);
        // Acquire locks for each resource and take snapshots
        for (const resource of resources) {
            const releaseLock = new DeferredPromise();
            releaseLockPromises.push(releaseLock);
            const acquiredLock = new DeferredPromise();
            acquiredLockPromises.push(acquiredLock);
            this._streamingEditLocks.queue(resource.toString(), async () => {
                if (this.isDisposed) {
                    acquiredLock.complete();
                    return;
                }
                const entry = await this._getOrCreateModifiedFileEntry(resource, 1 /* NotExistBehavior.Abort */, telemetryInfo);
                if (entry) {
                    await this._acceptStreamingEditsStart(responseModel, undoStopId, resource);
                }
                const notebookUri = CellUri.parse(resource)?.notebook || resource;
                progress.push(...createOpeningEditCodeBlock(resource, this._notebookService.hasSupportedNotebooks(notebookUri), undoStopId));
                // Save to disk to ensure disk state is current before external edits
                await entry?.save();
                // Take snapshot of current state
                snapshots.set(resource, entry && this._getCurrentTextOrNotebookSnapshot(entry));
                entry?.startExternalEdit();
                acquiredLock.complete();
                // Wait for the lock to be released by stopExternalEdits
                return releaseLock.p;
            });
        }
        await Promise.all(acquiredLockPromises.map(p => p.p));
        this.createSnapshot(responseModel.requestId, undoStopId);
        // Store the operation state
        this._externalEditOperations.set(operationId, {
            responseModel,
            snapshots,
            undoStopId,
            releaseLocks: () => releaseLockPromises.forEach(p => p.complete())
        });
        return progress;
    }
    async stopExternalEdits(responseModel, operationId) {
        const operation = this._externalEditOperations.get(operationId);
        if (!operation) {
            this._logService.warn(`stopExternalEdits called for unknown operation ${operationId}`);
            return [];
        }
        this._externalEditOperations.delete(operationId);
        const progress = [];
        try {
            // For each resource, compute the diff and create edit parts
            for (const [resource, beforeSnapshot] of operation.snapshots) {
                let entry = this._getEntry(resource);
                // Files that did not exist on disk before may not exist in our working
                // set yet. Create those if that's the case.
                if (!entry && beforeSnapshot === undefined) {
                    entry = await this._getOrCreateModifiedFileEntry(resource, 1 /* NotExistBehavior.Abort */, this._getTelemetryInfoForModel(responseModel), '');
                    if (entry) {
                        entry.startExternalEdit();
                        entry.acceptStreamingEditsStart(responseModel, operation.undoStopId, undefined);
                    }
                }
                if (!entry) {
                    continue;
                }
                // Reload from disk to ensure in-memory model is in sync with file system
                await entry.revertToDisk();
                // Take new snapshot after external changes
                const afterSnapshot = this._getCurrentTextOrNotebookSnapshot(entry);
                // Compute edits from the snapshots
                let edits = [];
                if (beforeSnapshot === undefined) {
                    this._timeline.recordFileOperation({
                        type: FileOperationType.Create,
                        uri: resource,
                        requestId: responseModel.requestId,
                        epoch: this._timeline.incrementEpoch(),
                        initialContent: afterSnapshot,
                        telemetryInfo: entry.telemetryInfo,
                    });
                }
                else {
                    edits = await entry.computeEditsFromSnapshots(beforeSnapshot, afterSnapshot);
                    this._recordEditOperations(entry, resource, edits, responseModel);
                }
                progress.push(entry instanceof ChatEditingModifiedNotebookEntry ? {
                    kind: 'notebookEdit',
                    uri: resource,
                    edits: edits,
                    done: true,
                    isExternalEdit: true
                } : {
                    kind: 'textEdit',
                    uri: resource,
                    edits: edits,
                    done: true,
                    isExternalEdit: true
                });
                // Mark as no longer being modified
                await entry.acceptStreamingEditsEnd();
                // Clear external edit mode
                entry.stopExternalEdit();
            }
        }
        finally {
            // Release all the locks
            operation.releaseLocks();
            const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), k => !operation.snapshots.has(URI.parse(k)));
            if (!hasOtherTasks) {
                this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
            }
        }
        return progress;
    }
    async undoInteraction() {
        await this._timeline.undoToLastCheckpoint();
    }
    async redoInteraction() {
        await this._timeline.redoToNextCheckpoint();
    }
    _recordEditOperations(entry, resource, edits, responseModel) {
        // Determine if these are text edits or notebook edits
        const isNotebookEdits = edits.length > 0 && hasKey(edits[0], { cells: true });
        if (isNotebookEdits) {
            // Record notebook edit operation
            const notebookEdits = edits;
            this._timeline.recordFileOperation({
                type: FileOperationType.NotebookEdit,
                uri: resource,
                requestId: responseModel.requestId,
                epoch: this._timeline.incrementEpoch(),
                cellEdits: notebookEdits
            });
        }
        else {
            let cellIndex;
            if (entry instanceof ChatEditingModifiedNotebookEntry) {
                const cellUri = CellUri.parse(resource);
                if (cellUri) {
                    const i = entry.getIndexOfCellHandle(cellUri.handle);
                    if (i !== -1) {
                        cellIndex = i;
                    }
                }
            }
            const textEdits = edits;
            this._timeline.recordFileOperation({
                type: FileOperationType.TextEdit,
                uri: resource,
                requestId: responseModel.requestId,
                epoch: this._timeline.incrementEpoch(),
                edits: textEdits,
                cellIndex,
            });
        }
    }
    _getCurrentTextOrNotebookSnapshot(entry) {
        if (entry instanceof ChatEditingModifiedNotebookEntry) {
            return entry.getCurrentSnapshot();
        }
        else if (entry instanceof ChatEditingModifiedDocumentEntry) {
            return entry.getCurrentContents();
        }
        else {
            throw new Error(`unknown entry type for ${entry.modifiedURI}`);
        }
    }
    async _acceptStreamingEditsStart(responseModel, undoStop, resource) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, 0 /* NotExistBehavior.Create */, this._getTelemetryInfoForModel(responseModel));
        // Record file baseline if this is the first edit for this file in this request
        if (!this._timeline.hasFileBaseline(resource, responseModel.requestId)) {
            this._timeline.recordFileBaseline({
                uri: resource,
                requestId: responseModel.requestId,
                content: this._getCurrentTextOrNotebookSnapshot(entry),
                epoch: this._timeline.incrementEpoch(),
                telemetryInfo: entry.telemetryInfo,
                notebookViewType: entry instanceof ChatEditingModifiedNotebookEntry ? entry.viewType : undefined,
            });
        }
        transaction((tx) => {
            this._state.set(1 /* ChatEditingSessionState.StreamingEdits */, tx);
            entry.acceptStreamingEditsStart(responseModel, undoStop, tx);
            // Note: Individual edit operations will be recorded by the file entries
        });
        return entry;
    }
    async _initEntries({ entries }) {
        // Reset all the files which are modified in this session state
        // but which are not found in the snapshot
        for (const entry of this._entriesObs.get()) {
            const snapshotEntry = entries.get(entry.modifiedURI);
            if (!snapshotEntry) {
                await entry.resetToInitialContent();
                entry.dispose();
            }
        }
        const entriesArr = [];
        // Restore all entries from the snapshot
        for (const snapshotEntry of entries.values()) {
            const entry = await this._getOrCreateModifiedFileEntry(snapshotEntry.resource, 1 /* NotExistBehavior.Abort */, snapshotEntry.telemetryInfo);
            if (entry) {
                const restoreToDisk = snapshotEntry.state === 0 /* ModifiedFileEntryState.Modified */;
                await entry.restoreFromSnapshot(snapshotEntry, restoreToDisk);
                entriesArr.push(entry);
            }
        }
        this._entriesObs.set(entriesArr, undefined);
    }
    async _acceptEdits(resource, textEdits, isLastEdits, responseModel) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, 0 /* NotExistBehavior.Create */, this._getTelemetryInfoForModel(responseModel));
        // Record edit operations in the timeline if there are actual edits
        if (textEdits.length > 0) {
            this._recordEditOperations(entry, resource, textEdits, responseModel);
        }
        await entry.acceptAgentEdits(resource, textEdits, isLastEdits, responseModel);
    }
    _getTelemetryInfoForModel(responseModel) {
        // Make these getters because the response result is not available when the file first starts to be edited
        return new class {
            get agentId() { return responseModel.agent?.id; }
            get modelId() { return responseModel.request?.modelId; }
            get modeId() { return responseModel.request?.modeInfo?.modeId; }
            get command() { return responseModel.slashCommand?.name; }
            get sessionResource() { return responseModel.session.sessionResource; }
            get requestId() { return responseModel.requestId; }
            get result() { return responseModel.result; }
            get applyCodeBlockSuggestionId() { return responseModel.request?.modeInfo?.applyCodeBlockSuggestionId; }
            get feature() {
                if (responseModel.session.initialLocation === ChatAgentLocation.Chat) {
                    return 'sideBarChat';
                }
                else if (responseModel.session.initialLocation === ChatAgentLocation.EditorInline) {
                    return 'inlineChat';
                }
                return undefined;
            }
        };
    }
    async _resolve(requestId, undoStop, resource) {
        const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), k => k !== resource.toString());
        if (!hasOtherTasks) {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
        const entry = this._getEntry(resource);
        if (!entry) {
            return;
        }
        // Create checkpoint for this edit completion
        const label = undoStop ? `Request ${requestId} - Stop ${undoStop}` : `Request ${requestId}`;
        this._timeline.createCheckpoint(requestId, undoStop, label);
        return entry.acceptStreamingEditsEnd();
    }
    async _getOrCreateModifiedFileEntry(resource, ifNotExists, telemetryInfo, _initialContent) {
        resource = CellUri.parse(resource)?.notebook ?? resource;
        const existingEntry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, resource));
        if (existingEntry) {
            if (telemetryInfo.requestId !== existingEntry.telemetryInfo.requestId) {
                existingEntry.updateTelemetryInfo(telemetryInfo);
            }
            return existingEntry;
        }
        let entry;
        const existingExternalEntry = this._lookupExternalEntry(resource);
        if (existingExternalEntry) {
            entry = existingExternalEntry;
            if (telemetryInfo.requestId !== entry.telemetryInfo.requestId) {
                entry.updateTelemetryInfo(telemetryInfo);
            }
        }
        else {
            const initialContent = _initialContent ?? this._initialFileContents.get(resource);
            // This gets manually disposed in .dispose() or in .restoreSnapshot()
            const maybeEntry = await this._createModifiedFileEntry(resource, telemetryInfo, ifNotExists, initialContent);
            if (!maybeEntry) {
                return undefined;
            }
            entry = maybeEntry;
            if (initialContent === undefined) {
                this._initialFileContents.set(resource, entry.initialContent);
            }
        }
        // If an entry is deleted e.g. reverting a created file,
        // remove it from the entries and don't show it in the working set anymore
        // so that it can be recreated e.g. through retry
        const listener = entry.onDidDelete(() => {
            const newEntries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, entry.modifiedURI));
            this._entriesObs.set(newEntries, undefined);
            this._editorService.closeEditors(this._editorService.findEditors(entry.modifiedURI));
            if (!existingExternalEntry) {
                // don't dispose entries that are not yours!
                entry.dispose();
            }
            this._store.delete(listener);
        });
        this._store.add(listener);
        const entriesArr = [...this._entriesObs.get(), entry];
        this._entriesObs.set(entriesArr, undefined);
        return entry;
    }
    async _createModifiedFileEntry(resource, telemetryInfo, ifNotExists, initialContent) {
        const multiDiffEntryDelegate = {
            collapse: (transaction) => this._collapse(resource, transaction),
            recordOperation: (operation) => {
                operation.epoch = this._timeline.incrementEpoch();
                this._timeline.recordFileOperation(operation);
            },
        };
        const notebookUri = CellUri.parse(resource)?.notebook || resource;
        const doCreate = async (chatKind) => {
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(notebookUri, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, this._instantiationService);
            }
            else {
                const ref = await this._textModelService.createModelReference(resource);
                return this._instantiationService.createInstance(ChatEditingModifiedDocumentEntry, ref, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent);
            }
        };
        try {
            return await doCreate(1 /* ChatEditKind.Modified */);
        }
        catch (err) {
            if (ifNotExists === 1 /* NotExistBehavior.Abort */) {
                return undefined;
            }
            // this file does not exist yet, create it and try again
            await this._bulkEditService.apply({ edits: [{ newResource: resource }] });
            if (this.configurationService.getValue('accessibility.openChatEditedFiles')) {
                this._editorService.openEditor({ resource, options: { inactive: true, preserveFocus: true, pinned: true } });
            }
            // Record file creation operation
            this._timeline.recordFileOperation({
                type: FileOperationType.Create,
                uri: resource,
                requestId: telemetryInfo.requestId,
                epoch: this._timeline.incrementEpoch(),
                initialContent: initialContent || '',
                telemetryInfo,
            });
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(resource, multiDiffEntryDelegate, telemetryInfo, 0 /* ChatEditKind.Created */, initialContent, this._instantiationService);
            }
            else {
                return await doCreate(0 /* ChatEditKind.Created */);
            }
        }
    }
    _collapse(resource, transaction) {
        const multiDiffItem = this._editorPane?.findDocumentDiffItem(resource);
        if (multiDiffItem) {
            this._editorPane?.viewModel?.items.get().find((documentDiffItem) => isEqual(documentDiffItem.originalUri, multiDiffItem.originalUri) &&
                isEqual(documentDiffItem.modifiedUri, multiDiffItem.modifiedUri))
                ?.collapsed.set(true, transaction);
        }
    }
};
ChatEditingSession = ChatEditingSession_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, ITextModelService),
    __param(8, IBulkEditService),
    __param(9, IEditorGroupsService),
    __param(10, IEditorService),
    __param(11, INotebookService),
    __param(12, IAccessibilitySignalService),
    __param(13, ILogService),
    __param(14, IConfigurationService)
], ChatEditingSession);
export { ChatEditingSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ1Nlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQVMsU0FBUyxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQXNDLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNySSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQs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
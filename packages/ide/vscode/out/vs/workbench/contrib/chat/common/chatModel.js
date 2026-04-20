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
var ChatModel_1;
import { asArray } from '../../../../base/common/arrays.js';
import { softAssertNever } from '../../../../base/common/assert.js';
import { VSBuffer, decodeHex, encodeHex } from '../../../../base/common/buffer.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { revive } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { equals } from '../../../../base/common/objects.js';
import { autorun, autorunSelfDisposable, derived, observableFromEvent, observableSignalFromEvent, observableValue, observableValueOpts } from '../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import { URI, isUriComponents } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { migrateLegacyTerminalToolSpecificData } from './chat.js';
import { IChatAgentService, reviveSerializedAgent } from './chatAgents.js';
import { IChatEditingService, editEntriesToMultiDiffData } from './chatEditingService.js';
import { ChatRequestTextPart, reviveParsedChatRequest } from './chatParserTypes.js';
import { ChatResponseClearToPreviousToolInvocationReason, IChatService, IChatToolInvocation, isIUsedContext } from './chatService.js';
import { LocalChatSessionUri } from './chatUri.js';
import { ChatAgentLocation, ChatModeKind } from './constants.js';
export const CHAT_ATTACHABLE_IMAGE_MIME_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
};
export function getAttachableImageExtension(mimeType) {
    return Object.entries(CHAT_ATTACHABLE_IMAGE_MIME_TYPES).find(([_, value]) => value === mimeType)?.[0];
}
export function isCellTextEditOperation(value) {
    const candidate = value;
    return !!candidate && !!candidate.edit && !!candidate.uri && URI.isUri(candidate.uri);
}
export function isCellTextEditOperationArray(value) {
    return value.some(isCellTextEditOperation);
}
const nonHistoryKinds = new Set(['toolInvocation', 'toolInvocationSerialized', 'undoStop', 'prepareToolInvocation']);
function isChatProgressHistoryResponseContent(content) {
    return !nonHistoryKinds.has(content.kind);
}
export function toChatHistoryContent(content) {
    return content.filter(isChatProgressHistoryResponseContent);
}
export const defaultChatResponseModelChangeReason = { reason: 'other' };
export class ChatRequestModel {
    get session() {
        return this._session;
    }
    get attempt() {
        return this._attempt;
    }
    get variableData() {
        return this._variableData;
    }
    set variableData(v) {
        this._variableData = v;
    }
    get confirmation() {
        return this._confirmation;
    }
    get locationData() {
        return this._locationData;
    }
    get attachedContext() {
        return this._attachedContext;
    }
    get editedFileEvents() {
        return this._editedFileEvents;
    }
    constructor(params) {
        this.shouldBeBlocked = false;
        this._session = params.session;
        this.message = params.message;
        this._variableData = params.variableData;
        this.timestamp = params.timestamp;
        this._attempt = params.attempt ?? 0;
        this.modeInfo = params.modeInfo;
        this._confirmation = params.confirmation;
        this._locationData = params.locationData;
        this._attachedContext = params.attachedContext;
        this.isCompleteAddedRequest = params.isCompleteAddedRequest ?? false;
        this.modelId = params.modelId;
        this.id = params.restoredId ?? 'request_' + generateUuid();
        this._editedFileEvents = params.editedFileEvents;
        this.userSelectedTools = params.userSelectedTools;
    }
    adoptTo(session) {
        this._session = session;
    }
}
class AbstractResponse {
    get value() {
        return this._responseParts;
    }
    constructor(value) {
        /**
         * A stringified representation of response data which might be presented to a screenreader or used when copying a response.
         */
        this._responseRepr = '';
        /**
         * Just the markdown content of the response, used for determining the rendering rate of markdown
         */
        this._markdownContent = '';
        this._responseParts = value;
        this._updateRepr();
    }
    toString() {
        return this._responseRepr;
    }
    /**
     * _Just_ the content of markdown parts in the response
     */
    getMarkdown() {
        return this._markdownContent;
    }
    _updateRepr() {
        this._responseRepr = this.partsToRepr(this._responseParts);
        this._markdownContent = this._responseParts.map(part => {
            if (part.kind === 'inlineReference') {
                return this.inlineRefToRepr(part);
            }
            else if (part.kind === 'markdownContent' || part.kind === 'markdownVuln') {
                return part.content.value;
            }
            else {
                return '';
            }
        })
            .filter(s => s.length > 0)
            .join('');
    }
    partsToRepr(parts) {
        const blocks = [];
        let currentBlockSegments = [];
        let hasEditGroupsAfterLastClear = false;
        for (const part of parts) {
            let segment;
            switch (part.kind) {
                case 'clearToPreviousToolInvocation':
                    currentBlockSegments = [];
                    blocks.length = 0;
                    hasEditGroupsAfterLastClear = false; // Reset edit groups flag when clearing
                    continue;
                case 'treeData':
                case 'progressMessage':
                case 'codeblockUri':
                case 'extensions':
                case 'pullRequest':
                case 'undoStop':
                case 'prepareToolInvocation':
                case 'elicitation2':
                case 'elicitationSerialized':
                case 'thinking':
                case 'multiDiffData':
                case 'mcpServersStarting':
                    // Ignore
                    continue;
                case 'toolInvocation':
                case 'toolInvocationSerialized':
                    // Include tool invocations in the copy text
                    segment = this.getToolInvocationText(part);
                    break;
                case 'inlineReference':
                    segment = { text: this.inlineRefToRepr(part) };
                    break;
                case 'command':
                    segment = { text: part.command.title, isBlock: true };
                    break;
                case 'textEditGroup':
                case 'notebookEditGroup':
                    // Mark that we have edit groups after the last clear
                    hasEditGroupsAfterLastClear = true;
                    // Skip individual edit groups to avoid duplication
                    continue;
                case 'confirmation':
                    if (part.message instanceof MarkdownString) {
                        segment = { text: `${part.title}\n${part.message.value}`, isBlock: true };
                        break;
                    }
                    segment = { text: `${part.title}\n${part.message}`, isBlock: true };
                    break;
                case 'markdownContent':
                case 'markdownVuln':
                case 'progressTask':
                case 'progressTaskSerialized':
                case 'warning':
                    segment = { text: part.content.value };
                    break;
                default:
                    // Ignore any unknown/obsolete parts, but assert that all are handled:
                    softAssertNever(part);
                    continue;
            }
            if (segment.isBlock) {
                if (currentBlockSegments.length) {
                    blocks.push(currentBlockSegments.join(''));
                    currentBlockSegments = [];
                }
                blocks.push(segment.text);
            }
            else {
                currentBlockSegments.push(segment.text);
            }
        }
        if (currentBlockSegments.length) {
            blocks.push(currentBlockSegments.join(''));
        }
        // Add consolidated edit summary at the end if there were any edit groups after the last clear
        if (hasEditGroupsAfterLastClear) {
            blocks.push(localize('editsSummary', "Made changes."));
        }
        return blocks.join('\n\n');
    }
    inlineRefToRepr(part) {
        if ('uri' in part.inlineReference) {
            return this.uriToRepr(part.inlineReference.uri);
        }
        return 'name' in part.inlineReference
            ? '`' + part.inlineReference.name + '`'
            : this.uriToRepr(part.inlineReference);
    }
    getToolInvocationText(toolInvocation) {
        // Extract the message and input details
        let message = '';
        let input = '';
        if (toolInvocation.pastTenseMessage) {
            message = typeof toolInvocation.pastTenseMessage === 'string'
                ? toolInvocation.pastTenseMessage
                : toolInvocation.pastTenseMessage.value;
        }
        else {
            message = typeof toolInvocation.invocationMessage === 'string'
                ? toolInvocation.invocationMessage
                : toolInvocation.invocationMessage.value;
        }
        // Handle different types of tool invocations
        if (toolInvocation.toolSpecificData) {
            if (toolInvocation.toolSpecificData.kind === 'terminal') {
                message = 'Ran terminal command';
                const terminalData = migrateLegacyTerminalToolSpecificData(toolInvocation.toolSpecificData);
                input = terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
            }
        }
        // Format the tool invocation text
        let text = message;
        if (input) {
            text += `: ${input}`;
        }
        // For completed tool invocations, also include the result details if available
        if (toolInvocation.kind === 'toolInvocationSerialized' || (toolInvocation.kind === 'toolInvocation' && IChatToolInvocation.isComplete(toolInvocation))) {
            const resultDetails = IChatToolInvocation.resultDetails(toolInvocation);
            if (resultDetails && 'input' in resultDetails) {
                const resultPrefix = toolInvocation.kind === 'toolInvocationSerialized' || IChatToolInvocation.isComplete(toolInvocation) ? 'Completed' : 'Errored';
                text += `\n${resultPrefix} with input: ${resultDetails.input}`;
            }
        }
        return { text, isBlock: true };
    }
    uriToRepr(uri) {
        if (uri.scheme === Schemas.http || uri.scheme === Schemas.https) {
            return uri.toString(false);
        }
        return basename(uri);
    }
}
/** A view of a subset of a response */
class ResponseView extends AbstractResponse {
    constructor(_response, undoStop) {
        let idx = _response.value.findIndex(v => v.kind === 'undoStop' && v.id === undoStop);
        // Undo stops are inserted before `codeblockUri`'s, which are preceeded by a
        // markdownContent containing the opening code fence. Adjust the index
        // backwards to avoid a buggy response if it looked like this happened.
        if (_response.value[idx + 1]?.kind === 'codeblockUri' && _response.value[idx - 1]?.kind === 'markdownContent') {
            idx--;
        }
        super(idx === -1 ? _response.value.slice() : _response.value.slice(0, idx));
        this.undoStop = undoStop;
    }
}
export class Response extends AbstractResponse {
    get onDidChangeValue() {
        return this._onDidChangeValue.event;
    }
    constructor(value) {
        super(asArray(value).map((v) => ('kind' in v ? v :
            isMarkdownString(v) ? { content: v, kind: 'markdownContent' } :
                { kind: 'treeData', treeData: v })));
        this._onDidChangeValue = new Emitter();
        this._citations = [];
    }
    dispose() {
        this._onDidChangeValue.dispose();
    }
    clear() {
        this._responseParts = [];
        this._updateRepr(true);
    }
    clearToPreviousToolInvocation(message) {
        // look through the response parts and find the last tool invocation, then slice the response parts to that point
        let lastToolInvocationIndex = -1;
        for (let i = this._responseParts.length - 1; i >= 0; i--) {
            const part = this._responseParts[i];
            if (part.kind === 'toolInvocation' || part.kind === 'toolInvocationSerialized') {
                lastToolInvocationIndex = i;
                break;
            }
        }
        if (lastToolInvocationIndex !== -1) {
            this._responseParts = this._responseParts.slice(0, lastToolInvocationIndex + 1);
        }
        else {
            this._responseParts = [];
        }
        if (message) {
            this._responseParts.push({ kind: 'warning', content: new MarkdownString(message) });
        }
        this._updateRepr(true);
    }
    updateContent(progress, quiet) {
        if (progress.kind === 'clearToPreviousToolInvocation') {
            if (progress.reason === ChatResponseClearToPreviousToolInvocationReason.CopyrightContentRetry) {
                this.clearToPreviousToolInvocation(localize('copyrightContentRetry', "Response cleared due to possible match to public code, retrying with modified prompt."));
            }
            else if (progress.reason === ChatResponseClearToPreviousToolInvocationReason.FilteredContentRetry) {
                this.clearToPreviousToolInvocation(localize('filteredContentRetry', "Response cleared due to content safety filters, retrying with modified prompt."));
            }
            else {
                this.clearToPreviousToolInvocation();
            }
            return;
        }
        else if (progress.kind === 'markdownContent') {
            // last response which is NOT a text edit group because we do want to support heterogenous streaming but not have
            // the MD be chopped up by text edit groups (and likely other non-renderable parts)
            const lastResponsePart = this._responseParts
                .filter(p => p.kind !== 'textEditGroup')
                .at(-1);
            if (!lastResponsePart || lastResponsePart.kind !== 'markdownContent' || !canMergeMarkdownStrings(lastResponsePart.content, progress.content)) {
                // The last part can't be merged with- not markdown, or markdown with different permissions
                this._responseParts.push(progress);
            }
            else {
                // Don't modify the current object, since it's being diffed by the renderer
                const idx = this._responseParts.indexOf(lastResponsePart);
                this._responseParts[idx] = { ...lastResponsePart, content: appendMarkdownString(lastResponsePart.content, progress.content) };
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'thinking') {
            // tries to split thinking chunks if it is an array. only while certain models give us array chunks.
            const lastResponsePart = this._responseParts
                .filter(p => p.kind !== 'textEditGroup')
                .at(-1);
            const lastText = lastResponsePart && lastResponsePart.kind === 'thinking'
                ? (Array.isArray(lastResponsePart.value) ? lastResponsePart.value.join('') : (lastResponsePart.value || ''))
                : '';
            const currText = Array.isArray(progress.value) ? progress.value.join('') : (progress.value || '');
            const isEmpty = (s) => s.length === 0;
            // Do not merge if either the current or last thinking chunk is empty; empty chunks separate thinking
            if (!lastResponsePart
                || lastResponsePart.kind !== 'thinking'
                || isEmpty(currText)
                || isEmpty(lastText)
                || !canMergeMarkdownStrings(new MarkdownString(lastText), new MarkdownString(currText))) {
                this._responseParts.push(progress);
            }
            else {
                const idx = this._responseParts.indexOf(lastResponsePart);
                this._responseParts[idx] = {
                    ...lastResponsePart,
                    value: appendMarkdownString(new MarkdownString(lastText), new MarkdownString(currText)).value
                };
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'textEdit' || progress.kind === 'notebookEdit') {
            // If the progress.uri is a cell Uri, its possible its part of the inline chat.
            // Old approach of notebook inline chat would not start and end with notebook Uri, so we need to check for old approach.
            const useOldApproachForInlineNotebook = progress.uri.scheme === Schemas.vscodeNotebookCell && !this._responseParts.find(part => part.kind === 'notebookEditGroup');
            // merge edits for the same file no matter when they come in
            const notebookUri = useOldApproachForInlineNotebook ? undefined : CellUri.parse(progress.uri)?.notebook;
            const uri = notebookUri ?? progress.uri;
            let found = false;
            const groupKind = progress.kind === 'textEdit' && !notebookUri ? 'textEditGroup' : 'notebookEditGroup';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const edits = groupKind === 'textEditGroup' ? progress.edits : progress.edits.map(edit => TextEdit.isTextEdit(edit) ? { uri: progress.uri, edit } : edit);
            const isExternalEdit = progress.isExternalEdit;
            for (let i = 0; !found && i < this._responseParts.length; i++) {
                const candidate = this._responseParts[i];
                if (candidate.kind === groupKind && !candidate.done && isEqual(candidate.uri, uri)) {
                    candidate.edits.push(edits);
                    candidate.done = progress.done;
                    found = true;
                }
            }
            if (!found) {
                this._responseParts.push({
                    kind: groupKind,
                    uri,
                    edits: groupKind === 'textEditGroup' ? [edits] : edits,
                    done: progress.done,
                    isExternalEdit,
                });
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'progressTask') {
            // Add a new resolving part
            const responsePosition = this._responseParts.push(progress) - 1;
            this._updateRepr(quiet);
            const disp = progress.onDidAddProgress(() => {
                this._updateRepr(false);
            });
            progress.task?.().then((content) => {
                // Stop listening for progress updates once the task settles
                disp.dispose();
                // Replace the resolving part's content with the resolved response
                if (typeof content === 'string') {
                    this._responseParts[responsePosition].content = new MarkdownString(content);
                }
                this._updateRepr(false);
            });
        }
        else if (progress.kind === 'toolInvocation') {
            autorunSelfDisposable(reader => {
                progress.state.read(reader); // update repr when state changes
                this._updateRepr(false);
                if (IChatToolInvocation.isComplete(progress, reader)) {
                    reader.dispose();
                }
            });
            this._responseParts.push(progress);
            this._updateRepr(quiet);
        }
        else {
            this._responseParts.push(progress);
            this._updateRepr(quiet);
        }
    }
    addCitation(citation) {
        this._citations.push(citation);
        this._updateRepr();
    }
    _updateRepr(quiet) {
        super._updateRepr();
        if (!this._onDidChangeValue) {
            return; // called from parent constructor
        }
        this._responseRepr += this._citations.length ? '\n\n' + getCodeCitationsMessage(this._citations) : '';
        if (!quiet) {
            this._onDidChangeValue.fire();
        }
    }
}
export class ChatResponseModel extends Disposable {
    get shouldBeBlocked() {
        return this._shouldBeBlocked;
    }
    get request() {
        return this.session.getRequests().find(r => r.id === this.requestId);
    }
    get session() {
        return this._session;
    }
    get shouldBeRemovedOnSend() {
        return this._shouldBeRemovedOnSend;
    }
    get isComplete() {
        return this._modelState.get().value !== 0 /* ResponseModelState.Pending */ && this._modelState.get().value !== 4 /* ResponseModelState.NeedsInput */;
    }
    get timestamp() {
        return this._timestamp;
    }
    set shouldBeRemovedOnSend(disablement) {
        this._shouldBeRemovedOnSend = disablement;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    get isCanceled() {
        return this._modelState.get().value === 2 /* ResponseModelState.Cancelled */;
    }
    get completedAt() {
        const state = this._modelState.get();
        if (state.value === 1 /* ResponseModelState.Complete */ || state.value === 2 /* ResponseModelState.Cancelled */ || state.value === 3 /* ResponseModelState.Failed */) {
            return state.completedAt;
        }
        return undefined;
    }
    get state() {
        const state = this._modelState.get().value;
        if (state === 1 /* ResponseModelState.Complete */ && !!this._result?.errorDetails && this.result?.errorDetails?.code !== 'canceled') {
            // This check covers sessions created in previous vscode versions which saved a failed response as 'Complete'
            return 3 /* ResponseModelState.Failed */;
        }
        return state;
    }
    get vote() {
        return this._vote;
    }
    get voteDownReason() {
        return this._voteDownReason;
    }
    get followups() {
        return this._followups;
    }
    get entireResponse() {
        return this._finalizedResponse || this._response;
    }
    get result() {
        return this._result;
    }
    get username() {
        return this.session.responderUsername;
    }
    get avatarIcon() {
        return this.session.responderAvatarIcon;
    }
    get agent() {
        return this._agent;
    }
    get slashCommand() {
        return this._slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._agentOrSlashCommandDetected ?? false;
    }
    get usedContext() {
        return this._usedContext;
    }
    get contentReferences() {
        return Array.from(this._contentReferences);
    }
    get codeCitations() {
        return this._codeCitations;
    }
    get progressMessages() {
        return this._progressMessages;
    }
    get isStale() {
        return this._isStale;
    }
    get response() {
        const undoStop = this._shouldBeRemovedOnSend?.afterUndoStop;
        if (!undoStop) {
            return this._finalizedResponse || this._response;
        }
        if (this._responseView?.undoStop !== undoStop) {
            this._responseView = new ResponseView(this._response, undoStop);
        }
        return this._responseView;
    }
    get codeBlockInfos() {
        return this._codeBlockInfos;
    }
    constructor(params) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._modelState = observableValue(this, { value: 0 /* ResponseModelState.Pending */ });
        this._shouldBeBlocked = false;
        this._contentReferences = [];
        this._codeCitations = [];
        this._progressMessages = [];
        this._isStale = false;
        this._session = params.session;
        this._agent = params.agent;
        this._slashCommand = params.slashCommand;
        this.requestId = params.requestId;
        this._timestamp = params.timestamp || Date.now();
        if (params.modelState) {
            this._modelState.set(params.modelState, undefined);
        }
        this._timeSpentWaitingAccumulator = params.timeSpentWaiting || 0;
        this._vote = params.vote;
        this._voteDownReason = params.voteDownReason;
        this._result = params.result;
        this._followups = params.followups ? [...params.followups] : undefined;
        this.isCompleteAddedRequest = params.isCompleteAddedRequest ?? false;
        this._shouldBeRemovedOnSend = params.shouldBeRemovedOnSend;
        this._shouldBeBlocked = params.shouldBeBlocked ?? false;
        // If we are creating a response with some existing content, consider it stale
        this._isStale = Array.isArray(params.responseContent) && (params.responseContent.length !== 0 || isMarkdownString(params.responseContent) && params.responseContent.value.length !== 0);
        this._response = this._register(new Response(params.responseContent));
        this._codeBlockInfos = params.codeBlockInfos ? [...params.codeBlockInfos] : undefined;
        const signal = observableSignalFromEvent(this, this.onDidChange);
        const _pendingInfo = signal.map((_value, r) => {
            signal.read(r);
            for (const part of this._response.value) {
                if (part.kind === 'toolInvocation' && part.state.read(r).type === 0 /* IChatToolInvocation.StateKind.WaitingForConfirmation */) {
                    const title = part.confirmationMessages?.title;
                    return title ? (isMarkdownString(title) ? title.value : title) : undefined;
                }
                if (part.kind === 'confirmation' && !part.isUsed) {
                    return part.title;
                }
                if (part.kind === 'elicitation2' && part.state.read(r) === "pending" /* ElicitationState.Pending */) {
                    const title = part.title;
                    return isMarkdownString(title) ? title.value : title;
                }
            }
            return undefined;
        });
        const _startedWaitingAt = _pendingInfo.map(p => !!p).map(p => p ? Date.now() : undefined);
        this.isPendingConfirmation = _startedWaitingAt.map((waiting, r) => waiting ? { startedWaitingAt: waiting, detail: _pendingInfo.read(r) } : undefined);
        this.isInProgress = signal.map((_value, r) => {
            signal.read(r);
            return !_pendingInfo.read(r)
                && !this.shouldBeRemovedOnSend
                && (this._modelState.read(r).value === 0 /* ResponseModelState.Pending */ || this._modelState.read(r).value === 4 /* ResponseModelState.NeedsInput */);
        });
        this._register(this._response.onDidChangeValue(() => this._onDidChange.fire(defaultChatResponseModelChangeReason)));
        this.id = params.restoredId ?? 'response_' + generateUuid();
        this._register(this._session.onDidChange((e) => {
            if (e.kind === 'setCheckpoint') {
                const isDisabled = e.disabledResponseIds.has(this.id);
                const didChange = this._shouldBeBlocked === isDisabled;
                this._shouldBeBlocked = isDisabled;
                if (didChange) {
                    this._onDidChange.fire(defaultChatResponseModelChangeReason);
                }
            }
        }));
        let lastStartedWaitingAt = undefined;
        this.confirmationAdjustedTimestamp = derived(reader => {
            const pending = this.isPendingConfirmation.read(reader);
            if (pending) {
                this._modelState.set({ value: 4 /* ResponseModelState.NeedsInput */ }, undefined);
                if (!lastStartedWaitingAt) {
                    lastStartedWaitingAt = pending.startedWaitingAt;
                }
            }
            else if (lastStartedWaitingAt) {
                // Restore state to Pending if it was set to NeedsInput by this observable
                if (this._modelState.read(reader).value === 4 /* ResponseModelState.NeedsInput */) {
                    this._modelState.set({ value: 0 /* ResponseModelState.Pending */ }, undefined);
                }
                this._timeSpentWaitingAccumulator += Date.now() - lastStartedWaitingAt;
                lastStartedWaitingAt = undefined;
            }
            return this._timestamp + this._timeSpentWaitingAccumulator;
        }).recomputeInitiallyAndOnChange(this._store);
    }
    initializeCodeBlockInfos(codeBlockInfo) {
        if (this._codeBlockInfos) {
            throw new BugIndicatingError('Code block infos have already been initialized');
        }
        this._codeBlockInfos = [...codeBlockInfo];
    }
    /**
     * Apply a progress update to the actual response content.
     */
    updateContent(responsePart, quiet) {
        this._response.updateContent(responsePart, quiet);
    }
    /**
     * Adds an undo stop at the current position in the stream.
     */
    addUndoStop(undoStop) {
        this._onDidChange.fire({ reason: 'undoStop', id: undoStop.id });
        this._response.updateContent(undoStop, true);
    }
    /**
     * Apply one of the progress updates that are not part of the actual response content.
     */
    applyReference(progress) {
        if (progress.kind === 'usedContext') {
            this._usedContext = progress;
        }
        else if (progress.kind === 'reference') {
            this._contentReferences.push(progress);
            this._onDidChange.fire(defaultChatResponseModelChangeReason);
        }
    }
    applyCodeCitation(progress) {
        this._codeCitations.push(progress);
        this._response.addCitation(progress);
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setAgent(agent, slashCommand) {
        this._agent = agent;
        this._slashCommand = slashCommand;
        this._agentOrSlashCommandDetected = !agent.isDefault || !!slashCommand;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setResult(result) {
        this._result = result;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    complete() {
        // No-op if it's already complete
        if (this.isComplete) {
            return;
        }
        if (this._result?.errorDetails?.responseIsRedacted) {
            this._response.clear();
        }
        // Canceled sessions can be considered 'Complete'
        const state = !!this._result?.errorDetails && this._result.errorDetails.code !== 'canceled' ? 3 /* ResponseModelState.Failed */ : 1 /* ResponseModelState.Complete */;
        this._modelState.set({ value: state, completedAt: Date.now() }, undefined);
        this._onDidChange.fire({ reason: 'completedRequest' });
    }
    cancel() {
        this._modelState.set({ value: 2 /* ResponseModelState.Cancelled */, completedAt: Date.now() }, undefined);
        this._onDidChange.fire({ reason: 'completedRequest' });
    }
    setFollowups(followups) {
        this._followups = followups;
        this._onDidChange.fire(defaultChatResponseModelChangeReason); // Fire so that command followups get rendered on the row
    }
    setVote(vote) {
        this._vote = vote;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setVoteDownReason(reason) {
        this._voteDownReason = reason;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setEditApplied(edit, editCount) {
        if (!this.response.value.includes(edit)) {
            return false;
        }
        if (!edit.state) {
            return false;
        }
        edit.state.applied = editCount; // must not be edit.edits.length
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
        return true;
    }
    adoptTo(session) {
        this._session = session;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    finalizeUndoState() {
        this._finalizedResponse = this.response;
        this._responseView = undefined;
        this._shouldBeRemovedOnSend = undefined;
    }
    toJSON() {
        const modelState = this._modelState.get();
        const pendingConfirmation = this.isPendingConfirmation.get();
        return {
            responseId: this.id,
            result: this.result,
            responseMarkdownInfo: this.codeBlockInfos?.map(info => ({ suggestionId: info.suggestionId })),
            followups: this.followups,
            modelState: modelState.value === 0 /* ResponseModelState.Pending */ || modelState.value === 4 /* ResponseModelState.NeedsInput */ ? { value: 2 /* ResponseModelState.Cancelled */, completedAt: Date.now() } : modelState,
            vote: this.vote,
            voteDownReason: this.voteDownReason,
            slashCommand: this.slashCommand,
            usedContext: this.usedContext,
            contentReferences: this.contentReferences,
            codeCitations: this.codeCitations,
            timestamp: this._timestamp,
            timeSpentWaiting: (pendingConfirmation ? Date.now() - pendingConfirmation.startedWaitingAt : 0) + this._timeSpentWaitingAccumulator,
        };
    }
}
/**
 * Normalize chat data from storage to the current format.
 * TODO- ChatModel#_deserialize and reviveSerializedAgent also still do some normalization and maybe that should be done in here too.
 */
export function normalizeSerializableChatData(raw) {
    normalizeOldFields(raw);
    if (!('version' in raw)) {
        return {
            version: 3,
            ...raw,
            lastMessageDate: raw.creationDate,
            customTitle: undefined,
        };
    }
    if (raw.version === 2) {
        return {
            ...raw,
            version: 3,
            customTitle: raw.computedTitle
        };
    }
    return raw;
}
function normalizeOldFields(raw) {
    // Fill in fields that very old chat data may be missing
    if (!raw.sessionId) {
        raw.sessionId = generateUuid();
    }
    if (!raw.creationDate) {
        raw.creationDate = getLastYearDate();
    }
    if ('version' in raw && (raw.version === 2 || raw.version === 3)) {
        if (!raw.lastMessageDate) {
            // A bug led to not porting creationDate properly, and that was copied to lastMessageDate, so fix that up if missing.
            raw.lastMessageDate = getLastYearDate();
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, local/code-no-any-casts
    if (raw.initialLocation === 'editing-session') {
        raw.initialLocation = ChatAgentLocation.Chat;
    }
}
function getLastYearDate() {
    const lastYearDate = new Date();
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
    return lastYearDate.getTime();
}
export function isExportableSessionData(obj) {
    return !!obj &&
        Array.isArray(obj.requests) &&
        typeof obj.responderUsername === 'string';
}
export function isSerializableSessionData(obj) {
    const data = obj;
    return isExportableSessionData(obj) &&
        typeof data.creationDate === 'number' &&
        typeof data.sessionId === 'string' &&
        obj.requests.every((request) => !request.usedContext /* for backward compat allow missing usedContext */ || isIUsedContext(request.usedContext));
}
export var ChatRequestRemovalReason;
(function (ChatRequestRemovalReason) {
    /**
     * "Normal" remove
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Removal"] = 0] = "Removal";
    /**
     * Removed because the request will be resent
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Resend"] = 1] = "Resend";
    /**
     * Remove because the request is moving to another model
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Adoption"] = 2] = "Adoption";
})(ChatRequestRemovalReason || (ChatRequestRemovalReason = {}));
/**
 * Internal implementation of IInputModel
 */
class InputModel {
    constructor(initialState) {
        this._state = observableValueOpts({ debugName: 'inputModelState', equalsFn: equals }, initialState);
        this.state = this._state;
    }
    setState(state) {
        const current = this._state.get();
        this._state.set({
            // If current is undefined, provide defaults for required fields
            attachments: [],
            mode: { id: 'agent', kind: ChatModeKind.Agent },
            selectedModel: undefined,
            inputText: '',
            selections: [],
            contrib: {},
            ...current,
            ...state
        }, undefined);
    }
    clearState() {
        this._state.set(undefined, undefined);
    }
    toJSON() {
        const value = this.state.get();
        if (!value) {
            return undefined;
        }
        return {
            contrib: value.contrib,
            attachments: value.attachments,
            mode: value.mode,
            selectedModel: value.selectedModel ? {
                identifier: value.selectedModel.identifier,
                metadata: value.selectedModel.metadata
            } : undefined,
            inputText: value.inputText,
            selections: value.selections
        };
    }
}
let ChatModel = ChatModel_1 = class ChatModel extends Disposable {
    static getDefaultTitle(requests) {
        const firstRequestMessage = requests.at(0)?.message ?? '';
        const message = typeof firstRequestMessage === 'string' ?
            firstRequestMessage :
            firstRequestMessage.text;
        return message.split('\n')[0].substring(0, 200);
    }
    get contributedChatSession() {
        return this._contributedChatSession;
    }
    setContributedChatSession(session) {
        this._contributedChatSession = session;
    }
    /** @deprecated Use {@link sessionResource} instead */
    get sessionId() {
        return this._sessionId;
    }
    get sessionResource() {
        return this._sessionResource;
    }
    get hasRequests() {
        return this._requests.length > 0;
    }
    get lastRequest() {
        return this._requests.at(-1);
    }
    get timestamp() {
        return this._timestamp;
    }
    get timing() {
        const lastResponse = this._requests.at(-1)?.response;
        return {
            startTime: this._timestamp,
            endTime: lastResponse?.completedAt ?? lastResponse?.timestamp
        };
    }
    get lastMessageDate() {
        return this._lastMessageDate;
    }
    get _defaultAgent() {
        return this.chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, ChatModeKind.Ask);
    }
    get responderUsername() {
        return this._defaultAgent?.fullName ??
            this._initialResponderUsername ?? '';
    }
    get responderAvatarIcon() {
        return this._defaultAgent?.metadata.themeIcon ??
            this._initialResponderAvatarIconUri;
    }
    get isImported() {
        return this._isImported;
    }
    get customTitle() {
        return this._customTitle;
    }
    get title() {
        return this._customTitle || ChatModel_1.getDefaultTitle(this._requests);
    }
    get hasCustomTitle() {
        return this._customTitle !== undefined;
    }
    get editingSession() {
        return this._editingSession;
    }
    get initialLocation() {
        return this._initialLocation;
    }
    get canUseTools() {
        return this._canUseTools;
    }
    get willKeepAlive() {
        return !this._disableBackgroundKeepAlive;
    }
    constructor(initialData, initialModelProps, logService, chatAgentService, chatEditingService, chatService) {
        super();
        this.logService = logService;
        this.chatAgentService = chatAgentService;
        this.chatEditingService = chatEditingService;
        this.chatService = chatService;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._isImported = false;
        this._canUseTools = true;
        this.currentEditedFileEvents = new ResourceMap();
        this._checkpoint = undefined;
        const isValidExportedData = isExportableSessionData(initialData);
        const isValidFullData = isValidExportedData && isSerializableSessionData(initialData);
        if (initialData && !isValidExportedData) {
            this.logService.warn(`ChatModel#constructor: Loaded malformed session data: ${JSON.stringify(initialData)}`);
        }
        this._isImported = !!initialData && isValidExportedData && !isValidFullData;
        this._sessionId = (isValidFullData && initialData.sessionId) || initialModelProps.sessionId || generateUuid();
        this._sessionResource = initialModelProps.resource ?? LocalChatSessionUri.forSession(this._sessionId);
        this._disableBackgroundKeepAlive = initialModelProps.disableBackgroundKeepAlive ?? false;
        this._requests = initialData ? this._deserialize(initialData) : [];
        this._timestamp = (isValidFullData && initialData.creationDate) || Date.now();
        this._lastMessageDate = (isValidFullData && initialData.lastMessageDate) || this._timestamp;
        this._customTitle = isValidFullData ? initialData.customTitle : undefined;
        // Initialize input model from serialized data (undefined for new chats)
        const serializedInputState = initialModelProps.inputState || (isValidFullData && initialData.inputState ? initialData.inputState : undefined);
        this.inputModel = new InputModel(serializedInputState && {
            attachments: serializedInputState.attachments,
            mode: serializedInputState.mode,
            selectedModel: serializedInputState.selectedModel && {
                identifier: serializedInputState.selectedModel.identifier,
                metadata: serializedInputState.selectedModel.metadata
            },
            contrib: serializedInputState.contrib,
            inputText: serializedInputState.inputText,
            selections: serializedInputState.selections
        });
        this._initialResponderUsername = initialData?.responderUsername;
        this._initialResponderAvatarIconUri = isUriComponents(initialData?.responderAvatarIconUri) ? URI.revive(initialData.responderAvatarIconUri) : initialData?.responderAvatarIconUri;
        this._initialLocation = initialData?.initialLocation ?? initialModelProps.initialLocation;
        this._canUseTools = initialModelProps.canUseTools;
        this.lastRequestObs = observableFromEvent(this, this.onDidChange, () => this._requests.at(-1));
        this._register(autorun(reader => {
            const request = this.lastRequestObs.read(reader);
            if (!request?.response) {
                return;
            }
            reader.store.add(request.response.onDidChange(async (ev) => {
                if (ev.reason === 'completedRequest' && this._editingSession) {
                    if (request === this._requests.at(-1)
                        && request.session.sessionResource.scheme !== Schemas.vscodeLocalChatSession
                        && this._editingSession.hasEditsInRequest(request.id)) {
                        const diffs = this._editingSession.getDiffsForFilesInRequest(request.id);
                        request.response?.updateContent(editEntriesToMultiDiffData(diffs), true);
                    }
                    this._onDidChange.fire({ kind: 'completedRequest', request });
                }
            }));
        }));
        this.requestInProgress = this.lastRequestObs.map((request, r) => {
            return request?.response?.isInProgress.read(r) ?? false;
        });
        this.requestNeedsInput = this.lastRequestObs.map((request, r) => {
            const pendingInfo = request?.response?.isPendingConfirmation.read(r);
            if (!pendingInfo) {
                return undefined;
            }
            return {
                title: this.title,
                detail: pendingInfo.detail,
            };
        });
        // Retain a reference to itself when a request is in progress, so the ChatModel stays alive in the background
        // only while running a request. TODO also keep it alive for 5min or so so we don't have to dispose/restore too often?
        if (this.initialLocation === ChatAgentLocation.Chat && !initialModelProps.disableBackgroundKeepAlive) {
            const selfRef = this._register(new MutableDisposable());
            this._register(autorun(r => {
                const inProgress = this.requestInProgress.read(r);
                const needsInput = this.requestNeedsInput.read(r);
                const shouldStayAlive = inProgress || !!needsInput;
                if (shouldStayAlive && !selfRef.value) {
                    selfRef.value = chatService.getActiveSessionReference(this._sessionResource);
                }
                else if (!shouldStayAlive && selfRef.value) {
                    selfRef.clear();
                }
            }));
        }
    }
    startEditingSession(isGlobalEditingSession, transferFromSession) {
        const session = this._editingSession ??= this._register(transferFromSession
            ? this.chatEditingService.transferEditingSession(this, transferFromSession)
            : isGlobalEditingSession
                ? this.chatEditingService.startOrContinueGlobalEditingSession(this)
                : this.chatEditingService.createEditingSession(this));
        if (!this._disableBackgroundKeepAlive) {
            // todo@connor4312: hold onto a reference so background sessions don't
            // trigger early disposal. This will be cleaned up with the globalization of edits.
            const selfRef = this._register(new MutableDisposable());
            this._register(autorun(r => {
                const hasModified = session.entries.read(r).some(e => e.state.read(r) === 0 /* ModifiedFileEntryState.Modified */);
                if (hasModified && !selfRef.value) {
                    selfRef.value = this.chatService.getActiveSessionReference(this._sessionResource);
                }
                else if (!hasModified && selfRef.value) {
                    selfRef.clear();
                }
            }));
        }
        this._register(autorun(reader => {
            this._setDisabledRequests(session.requestDisablement.read(reader));
        }));
    }
    notifyEditingAction(action) {
        const state = action.outcome === 'accepted' ? ChatRequestEditedFileEventKind.Keep :
            action.outcome === 'rejected' ? ChatRequestEditedFileEventKind.Undo :
                action.outcome === 'userModified' ? ChatRequestEditedFileEventKind.UserModification : null;
        if (state === null) {
            return;
        }
        if (!this.currentEditedFileEvents.has(action.uri) || this.currentEditedFileEvents.get(action.uri)?.eventKind === ChatRequestEditedFileEventKind.Keep) {
            this.currentEditedFileEvents.set(action.uri, { eventKind: state, uri: action.uri });
        }
    }
    _deserialize(obj) {
        const requests = obj.requests;
        if (!Array.isArray(requests)) {
            this.logService.error(`Ignoring malformed session data: ${JSON.stringify(obj)}`);
            return [];
        }
        try {
            return requests.map((raw) => {
                const parsedRequest = typeof raw.message === 'string'
                    ? this.getParsedRequestFromString(raw.message)
                    : reviveParsedChatRequest(raw.message);
                // Old messages don't have variableData, or have it in the wrong (non-array) shape
                const variableData = this.reviveVariableData(raw.variableData);
                const request = new ChatRequestModel({
                    session: this,
                    message: parsedRequest,
                    variableData,
                    timestamp: raw.timestamp ?? -1,
                    restoredId: raw.requestId,
                    confirmation: raw.confirmation,
                    editedFileEvents: raw.editedFileEvents,
                    modelId: raw.modelId,
                });
                request.shouldBeRemovedOnSend = raw.isHidden ? { requestId: raw.requestId } : raw.shouldBeRemovedOnSend;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, local/code-no-any-casts
                if (raw.response || raw.result || raw.responseErrorDetails) {
                    const agent = (raw.agent && 'metadata' in raw.agent) ? // Check for the new format, ignore entries in the old format
                        reviveSerializedAgent(raw.agent) : undefined;
                    // Port entries from old format
                    const result = 'responseErrorDetails' in raw ?
                        // eslint-disable-next-line local/code-no-dangerous-type-assertions
                        { errorDetails: raw.responseErrorDetails } : raw.result;
                    request.response = new ChatResponseModel({
                        responseContent: raw.response ?? [new MarkdownString(raw.response)],
                        session: this,
                        agent,
                        slashCommand: raw.slashCommand,
                        requestId: request.id,
                        modelState: raw.modelState || { value: raw.isCanceled ? 2 /* ResponseModelState.Cancelled */ : 1 /* ResponseModelState.Complete */, completedAt: 'lastMessageDate' in obj ? obj.lastMessageDate : Date.now() },
                        vote: raw.vote,
                        timestamp: raw.timestamp,
                        voteDownReason: raw.voteDownReason,
                        result,
                        followups: raw.followups,
                        restoredId: raw.responseId,
                        timeSpentWaiting: raw.timeSpentWaiting,
                        shouldBeBlocked: request.shouldBeBlocked,
                        codeBlockInfos: raw.responseMarkdownInfo?.map(info => ({ suggestionId: info.suggestionId })),
                    });
                    request.response.shouldBeRemovedOnSend = raw.isHidden ? { requestId: raw.requestId } : raw.shouldBeRemovedOnSend;
                    if (raw.usedContext) { // @ulugbekna: if this's a new vscode sessions, doc versions are incorrect anyway?
                        request.response.applyReference(revive(raw.usedContext));
                    }
                    raw.contentReferences?.forEach(r => request.response.applyReference(revive(r)));
                    raw.codeCitations?.forEach(c => request.response.applyCodeCitation(revive(c)));
                }
                return request;
            });
        }
        catch (error) {
            this.logService.error('Failed to parse chat data', error);
            return [];
        }
    }
    reviveVariableData(raw) {
        const variableData = raw && Array.isArray(raw.variables)
            ? raw :
            { variables: [] };
        variableData.variables = variableData.variables.map((v) => {
            // Old variables format
            if (v && 'values' in v && Array.isArray(v.values)) {
                return {
                    kind: 'generic',
                    id: v.id ?? '',
                    name: v.name,
                    value: v.values[0]?.value,
                    range: v.range,
                    modelDescription: v.modelDescription,
                    references: v.references
                };
            }
            else {
                return v;
            }
        });
        return variableData;
    }
    getParsedRequestFromString(message) {
        // TODO These offsets won't be used, but chat replies need to go through the parser as well
        const parts = [new ChatRequestTextPart(new OffsetRange(0, message.length), { startColumn: 1, startLineNumber: 1, endColumn: 1, endLineNumber: 1 }, message)];
        return {
            text: message,
            parts
        };
    }
    getRequests() {
        return this._requests;
    }
    resetCheckpoint() {
        for (const request of this._requests) {
            request.shouldBeBlocked = false;
        }
    }
    setCheckpoint(requestId) {
        let checkpoint;
        let checkpointIndex = -1;
        if (requestId !== undefined) {
            this._requests.forEach((request, index) => {
                if (request.id === requestId) {
                    checkpointIndex = index;
                    checkpoint = request;
                    request.shouldBeBlocked = true;
                }
            });
            if (!checkpoint) {
                return; // Invalid request ID
            }
        }
        const disabledRequestIds = new Set();
        const disabledResponseIds = new Set();
        for (let i = this._requests.length - 1; i >= 0; i -= 1) {
            const request = this._requests[i];
            if (this._checkpoint && !checkpoint) {
                request.shouldBeBlocked = false;
            }
            else if (checkpoint && i >= checkpointIndex) {
                request.shouldBeBlocked = true;
                disabledRequestIds.add(request.id);
                if (request.response) {
                    disabledResponseIds.add(request.response.id);
                }
            }
            else if (checkpoint && i < checkpointIndex) {
                request.shouldBeBlocked = false;
            }
        }
        this._checkpoint = checkpoint;
        this._onDidChange.fire({
            kind: 'setCheckpoint',
            disabledRequestIds,
            disabledResponseIds
        });
    }
    get checkpoint() {
        return this._checkpoint;
    }
    _setDisabledRequests(requestIds) {
        this._requests.forEach((request) => {
            const shouldBeRemovedOnSend = requestIds.find(r => r.requestId === request.id);
            request.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            if (request.response) {
                request.response.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            }
        });
        this._onDidChange.fire({ kind: 'setHidden' });
    }
    addRequest(message, variableData, attempt, modeInfo, chatAgent, slashCommand, confirmation, locationData, attachments, isCompleteAddedRequest, modelId, userSelectedTools, id) {
        const editedFileEvents = [...this.currentEditedFileEvents.values()];
        this.currentEditedFileEvents.clear();
        const request = new ChatRequestModel({
            restoredId: id,
            session: this,
            message,
            variableData,
            timestamp: Date.now(),
            attempt,
            modeInfo,
            confirmation,
            locationData,
            attachedContext: attachments,
            isCompleteAddedRequest,
            modelId,
            editedFileEvents: editedFileEvents.length ? editedFileEvents : undefined,
            userSelectedTools,
        });
        request.response = new ChatResponseModel({
            responseContent: [],
            session: this,
            agent: chatAgent,
            slashCommand,
            requestId: request.id,
            isCompleteAddedRequest,
            codeBlockInfos: undefined,
        });
        this._requests.push(request);
        this._lastMessageDate = Date.now();
        this._onDidChange.fire({ kind: 'addRequest', request });
        return request;
    }
    setCustomTitle(title) {
        this._customTitle = title;
        this._onDidChange.fire({ kind: 'setCustomTitle', title });
    }
    updateRequest(request, variableData) {
        request.variableData = variableData;
        this._onDidChange.fire({ kind: 'changedRequest', request });
    }
    adoptRequest(request) {
        // this doesn't use `removeRequest` because it must not dispose the request object
        const oldOwner = request.session;
        const index = oldOwner._requests.findIndex((candidate) => candidate.id === request.id);
        if (index === -1) {
            return;
        }
        oldOwner._requests.splice(index, 1);
        request.adoptTo(this);
        request.response?.adoptTo(this);
        this._requests.push(request);
        oldOwner._onDidChange.fire({ kind: 'removeRequest', requestId: request.id, responseId: request.response?.id, reason: 2 /* ChatRequestRemovalReason.Adoption */ });
        this._onDidChange.fire({ kind: 'addRequest', request });
    }
    acceptResponseProgress(request, progress, quiet) {
        if (!request.response) {
            request.response = new ChatResponseModel({
                responseContent: [],
                session: this,
                requestId: request.id,
                codeBlockInfos: undefined,
            });
        }
        if (request.response.isComplete) {
            throw new Error('acceptResponseProgress: Adding progress to a completed response');
        }
        if (progress.kind === 'usedContext' || progress.kind === 'reference') {
            request.response.applyReference(progress);
        }
        else if (progress.kind === 'codeCitation') {
            request.response.applyCodeCitation(progress);
        }
        else if (progress.kind === 'move') {
            this._onDidChange.fire({ kind: 'move', target: progress.uri, range: progress.range });
        }
        else if (progress.kind === 'codeblockUri' && progress.isEdit) {
            request.response.addUndoStop({ id: progress.undoStopId ?? generateUuid(), kind: 'undoStop' });
            request.response.updateContent(progress, quiet);
        }
        else if (progress.kind === 'progressTaskResult') {
            // Should have been handled upstream, not sent to model
            this.logService.error(`Couldn't handle progress: ${JSON.stringify(progress)}`);
        }
        else {
            request.response.updateContent(progress, quiet);
        }
    }
    removeRequest(id, reason = 0 /* ChatRequestRemovalReason.Removal */) {
        const index = this._requests.findIndex(request => request.id === id);
        const request = this._requests[index];
        if (index !== -1) {
            this._onDidChange.fire({ kind: 'removeRequest', requestId: request.id, responseId: request.response?.id, reason });
            this._requests.splice(index, 1);
            request.response?.dispose();
        }
    }
    cancelRequest(request) {
        if (request.response) {
            request.response.cancel();
        }
    }
    setResponse(request, result) {
        if (!request.response) {
            request.response = new ChatResponseModel({
                responseContent: [],
                session: this,
                requestId: request.id,
                codeBlockInfos: undefined,
            });
        }
        request.response.setResult(result);
    }
    setFollowups(request, followups) {
        if (!request.response) {
            // Maybe something went wrong?
            return;
        }
        request.response.setFollowups(followups);
    }
    setResponseModel(request, response) {
        request.response = response;
        this._onDidChange.fire({ kind: 'addResponse', response });
    }
    toExport() {
        return {
            responderUsername: this.responderUsername,
            responderAvatarIconUri: this.responderAvatarIcon,
            initialLocation: this.initialLocation,
            requests: this._requests.map((r) => {
                const message = {
                    ...r.message,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    parts: r.message.parts.map((p) => p && 'toJSON' in p ? p.toJSON() : p)
                };
                const agent = r.response?.agent;
                const agentJson = agent && 'toJSON' in agent ? agent.toJSON() :
                    agent ? { ...agent } : undefined;
                return {
                    requestId: r.id,
                    message,
                    variableData: r.variableData,
                    response: r.response ?
                        r.response.entireResponse.value.map(item => {
                            // Keeping the shape of the persisted data the same for back compat
                            if (item.kind === 'treeData') {
                                return item.treeData;
                            }
                            else if (item.kind === 'markdownContent') {
                                return item.content;
                            }
                            else {
                                // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
                                return item; // TODO
                            }
                        })
                        : undefined,
                    shouldBeRemovedOnSend: r.shouldBeRemovedOnSend,
                    agent: agentJson,
                    timestamp: r.timestamp,
                    confirmation: r.confirmation,
                    editedFileEvents: r.editedFileEvents,
                    modelId: r.modelId,
                    ...r.response?.toJSON(),
                };
            }),
        };
    }
    toJSON() {
        return {
            version: 3,
            ...this.toExport(),
            sessionId: this.sessionId,
            creationDate: this._timestamp,
            lastMessageDate: this._lastMessageDate,
            customTitle: this._customTitle,
            hasPendingEdits: !!(this._editingSession?.entries.get().some(e => e.state.get() === 0 /* ModifiedFileEntryState.Modified */)),
            inputState: this.inputModel.toJSON(),
        };
    }
    dispose() {
        this._requests.forEach(r => r.response?.dispose());
        this._onDidDispose.fire();
        super.dispose();
    }
};
ChatModel = ChatModel_1 = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentService),
    __param(4, IChatEditingService),
    __param(5, IChatService)
], ChatModel);
export { ChatModel };
export function updateRanges(variableData, diff) {
    return {
        variables: variableData.variables.map(v => ({
            ...v,
            range: v.range && {
                start: v.range.start - diff,
                endExclusive: v.range.endExclusive - diff
            }
        }))
    };
}
export function canMergeMarkdownStrings(md1, md2) {
    if (md1.baseUri && md2.baseUri) {
        const baseUriEquals = md1.baseUri.scheme === md2.baseUri.scheme
            && md1.baseUri.authority === md2.baseUri.authority
            && md1.baseUri.path === md2.baseUri.path
            && md1.baseUri.query === md2.baseUri.query
            && md1.baseUri.fragment === md2.baseUri.fragment;
        if (!baseUriEquals) {
            return false;
        }
    }
    else if (md1.baseUri || md2.baseUri) {
        return false;
    }
    return equals(md1.isTrusted, md2.isTrusted) &&
        md1.supportHtml === md2.supportHtml &&
        md1.supportThemeIcons === md2.supportThemeIcons;
}
export function appendMarkdownString(md1, md2) {
    const appendedValue = typeof md2 === 'string' ? md2 : md2.value;
    return {
        value: md1.value + appendedValue,
        isTrusted: md1.isTrusted,
        supportThemeIcons: md1.supportThemeIcons,
        supportHtml: md1.supportHtml,
        baseUri: md1.baseUri
    };
}
export function getCodeCitationsMessage(citations) {
    if (citations.length === 0) {
        return '';
    }
    const licenseTypes = citations.reduce((set, c) => set.add(c.license), new Set());
    const label = licenseTypes.size === 1 ?
        localize('codeCitation', "Similar code found with 1 license type", licenseTypes.size) :
        localize('codeCitations', "Similar code found with {0} license types", licenseTypes.size);
    return label;
}
export var ChatRequestEditedFileEventKind;
(function (ChatRequestEditedFileEventKind) {
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Keep"] = 1] = "Keep";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Undo"] = 2] = "Undo";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["UserModification"] = 3] = "UserModification";
})(ChatRequestEditedFileEventKind || (ChatRequestEditedFileEventKind = {}));
/** URI for a resource embedded in a chat request/response */
export var ChatResponseResource;
(function (ChatResponseResource) {
    ChatResponseResource.scheme = 'vscode-chat-response-resource';
    function createUri(sessionResource, toolCallId, index, basename) {
        return URI.from({
            scheme: ChatResponseResource.scheme,
            authority: encodeHex(VSBuffer.fromString(sessionResource.toString())),
            path: `/tool/${toolCallId}/${index}` + (basename ? `/${basename}` : ''),
        });
    }
    ChatResponseResource.createUri = createUri;
    function parseUri(uri) {
        if (uri.scheme !== ChatResponseResource.scheme) {
            return undefined;
        }
        const parts = uri.path.split('/');
        if (parts.length < 5) {
            return undefined;
        }
        const [, kind, toolCallId, index] = parts;
        if (kind !== 'tool') {
            return undefined;
        }
        let sessionResource;
        try {
            sessionResource = URI.parse(decodeHex(uri.authority).toString());
        }
        catch (e) {
            if (e instanceof SyntaxError) { // pre-1.108 local session ID
                sessionResource = LocalChatSessionUri.forSession(uri.authority);
            }
            else {
                throw e;
            }
        }
        return {
            sessionResource,
            toolCallId: toolCallId,
            index: Number(index),
        };
    }
    ChatResponseResource.parseUri = parseUri;
})(ChatResponseResource || (ChatResponseResource = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFtQixjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMzRyxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBZSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25NLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHekUsT0FBTyxFQUFFLEdBQUcs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
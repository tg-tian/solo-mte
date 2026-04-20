/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunSelfDisposable } from '../../../../base/common/observable.js';
import { hasKey } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export function isIDocumentContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'uri' in obj && obj.uri instanceof URI &&
        'version' in obj && typeof obj.version === 'number' &&
        'ranges' in obj && Array.isArray(obj.ranges) && obj.ranges.every(Range.isIRange));
}
export function isIUsedContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'documents' in obj &&
        Array.isArray(obj.documents) &&
        obj.documents.every(isIDocumentContext));
}
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export var ChatResponseClearToPreviousToolInvocationReason;
(function (ChatResponseClearToPreviousToolInvocationReason) {
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["NoReason"] = 0] = "NoReason";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["FilteredContentRetry"] = 1] = "FilteredContentRetry";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["CopyrightContentRetry"] = 2] = "CopyrightContentRetry";
})(ChatResponseClearToPreviousToolInvocationReason || (ChatResponseClearToPreviousToolInvocationReason = {}));
export class ChatMultiDiffData {
    constructor(opts) {
        this.kind = 'multiDiffData';
        this.readOnly = opts.readOnly;
        this.collapsed = opts.collapsed;
        this.multiDiffData = opts.multiDiffData;
    }
    toJSON() {
        return {
            kind: this.kind,
            multiDiffData: hasKey(this.multiDiffData, { title: true }) ? this.multiDiffData : this.multiDiffData.get(),
            collapsed: this.collapsed,
            readOnly: this.readOnly,
        };
    }
}
export var ElicitationState;
(function (ElicitationState) {
    ElicitationState["Pending"] = "pending";
    ElicitationState["Accepted"] = "accepted";
    ElicitationState["Rejected"] = "rejected";
})(ElicitationState || (ElicitationState = {}));
export var ToolConfirmKind;
(function (ToolConfirmKind) {
    ToolConfirmKind[ToolConfirmKind["Denied"] = 0] = "Denied";
    ToolConfirmKind[ToolConfirmKind["ConfirmationNotNeeded"] = 1] = "ConfirmationNotNeeded";
    ToolConfirmKind[ToolConfirmKind["Setting"] = 2] = "Setting";
    ToolConfirmKind[ToolConfirmKind["LmServicePerTool"] = 3] = "LmServicePerTool";
    ToolConfirmKind[ToolConfirmKind["UserAction"] = 4] = "UserAction";
    ToolConfirmKind[ToolConfirmKind["Skipped"] = 5] = "Skipped";
})(ToolConfirmKind || (ToolConfirmKind = {}));
export var IChatToolInvocation;
(function (IChatToolInvocation) {
    let StateKind;
    (function (StateKind) {
        StateKind[StateKind["WaitingForConfirmation"] = 0] = "WaitingForConfirmation";
        StateKind[StateKind["Executing"] = 1] = "Executing";
        StateKind[StateKind["WaitingForPostApproval"] = 2] = "WaitingForPostApproval";
        StateKind[StateKind["Completed"] = 3] = "Completed";
        StateKind[StateKind["Cancelled"] = 4] = "Cancelled";
    })(StateKind = IChatToolInvocation.StateKind || (IChatToolInvocation.StateKind = {}));
    function executionConfirmedOrDenied(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            if (invocation.isConfirmed === undefined || typeof invocation.isConfirmed === 'boolean') {
                return { type: invocation.isConfirmed ? 4 /* ToolConfirmKind.UserAction */ : 0 /* ToolConfirmKind.Denied */ };
            }
            return invocation.isConfirmed;
        }
        const state = invocation.state.read(reader);
        if (state.type === 0 /* StateKind.WaitingForConfirmation */) {
            return undefined; // don't know yet
        }
        if (state.type === 4 /* StateKind.Cancelled */) {
            return { type: state.reason };
        }
        return state.confirmed;
    }
    IChatToolInvocation.executionConfirmedOrDenied = executionConfirmedOrDenied;
    function awaitConfirmation(invocation, token) {
        const reason = executionConfirmedOrDenied(invocation);
        if (reason) {
            return Promise.resolve(reason);
        }
        const store = new DisposableStore();
        return new Promise(resolve => {
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve({ type: 0 /* ToolConfirmKind.Denied */ });
                }));
            }
            store.add(autorun(reader => {
                const reason = executionConfirmedOrDenied(invocation, reader);
                if (reason) {
                    store.dispose();
                    resolve(reason);
                }
            }));
        }).finally(() => {
            store.dispose();
        });
    }
    IChatToolInvocation.awaitConfirmation = awaitConfirmation;
    function postApprovalConfirmedOrDenied(invocation, reader) {
        const state = invocation.state.read(reader);
        if (state.type === 3 /* StateKind.Completed */) {
            return state.postConfirmed || { type: 1 /* ToolConfirmKind.ConfirmationNotNeeded */ };
        }
        if (state.type === 4 /* StateKind.Cancelled */) {
            return { type: state.reason };
        }
        return undefined;
    }
    function confirmWith(invocation, reason) {
        const state = invocation?.state.get();
        if (state?.type === 0 /* StateKind.WaitingForConfirmation */ || state?.type === 2 /* StateKind.WaitingForPostApproval */) {
            state.confirm(reason);
            return true;
        }
        return false;
    }
    IChatToolInvocation.confirmWith = confirmWith;
    function awaitPostConfirmation(invocation, token) {
        const reason = postApprovalConfirmedOrDenied(invocation);
        if (reason) {
            return Promise.resolve(reason);
        }
        const store = new DisposableStore();
        return new Promise(resolve => {
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve({ type: 0 /* ToolConfirmKind.Denied */ });
                }));
            }
            store.add(autorun(reader => {
                const reason = postApprovalConfirmedOrDenied(invocation, reader);
                if (reason) {
                    store.dispose();
                    resolve(reason);
                }
            }));
        }).finally(() => {
            store.dispose();
        });
    }
    IChatToolInvocation.awaitPostConfirmation = awaitPostConfirmation;
    function resultDetails(invocation, reader) {
        if (invocation.kind === 'toolInvocationSerialized') {
            return invocation.resultDetails;
        }
        const state = invocation.state.read(reader);
        if (state.type === 3 /* StateKind.Completed */ || state.type === 2 /* StateKind.WaitingForPostApproval */) {
            return state.resultDetails;
        }
        return undefined;
    }
    IChatToolInvocation.resultDetails = resultDetails;
    function isComplete(invocation, reader) {
        if ('isComplete' in invocation) { // serialized
            return true; // always cancelled or complete
        }
        const state = invocation.state.read(reader);
        return state.type === 3 /* StateKind.Completed */ || state.type === 4 /* StateKind.Cancelled */;
    }
    IChatToolInvocation.isComplete = isComplete;
})(IChatToolInvocation || (IChatToolInvocation = {}));
export class ChatMcpServersStarting {
    get isEmpty() {
        const s = this.state.get();
        return !s.working && s.serversRequiringInteraction.length === 0;
    }
    constructor(state) {
        this.state = state;
        this.kind = 'mcpServersStarting';
        this.didStartServerIds = [];
    }
    wait() {
        return new Promise(resolve => {
            autorunSelfDisposable(reader => {
                const s = this.state.read(reader);
                if (!s.working) {
                    reader.dispose();
                    resolve(s);
                }
            });
        });
    }
    toJSON() {
        return { kind: 'mcpServersStarting', didStartServerIds: this.didStartServerIds };
    }
}
export function isChatFollowup(obj) {
    return (!!obj &&
        obj.kind === 'reply' &&
        typeof obj.message === 'string' &&
        typeof obj.agentId === 'string');
}
export var ChatAgentVoteDirection;
(function (ChatAgentVoteDirection) {
    ChatAgentVoteDirection[ChatAgentVoteDirection["Down"] = 0] = "Down";
    ChatAgentVoteDirection[ChatAgentVoteDirection["Up"] = 1] = "Up";
})(ChatAgentVoteDirection || (ChatAgentVoteDirection = {}));
export var ChatAgentVoteDownReason;
(function (ChatAgentVoteDownReason) {
    ChatAgentVoteDownReason["IncorrectCode"] = "incorrectCode";
    ChatAgentVoteDownReason["DidNotFollowInstructions"] = "didNotFollowInstructions";
    ChatAgentVoteDownReason["IncompleteCode"] = "incompleteCode";
    ChatAgentVoteDownReason["MissingContext"] = "missingContext";
    ChatAgentVoteDownReason["PoorlyWrittenOrFormatted"] = "poorlyWrittenOrFormatted";
    ChatAgentVoteDownReason["RefusedAValidRequest"] = "refusedAValidRequest";
    ChatAgentVoteDownReason["OffensiveOrUnsafe"] = "offensiveOrUnsafe";
    ChatAgentVoteDownReason["Other"] = "other";
    ChatAgentVoteDownReason["WillReportIssue"] = "willReportIssue";
})(ChatAgentVoteDownReason || (ChatAgentVoteDownReason = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    // Keyboard shortcut or context menu
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export var ResponseModelState;
(function (ResponseModelState) {
    ResponseModelState[ResponseModelState["Pending"] = 0] = "Pending";
    ResponseModelState[ResponseModelState["Complete"] = 1] = "Complete";
    ResponseModelState[ResponseModelState["Cancelled"] = 2] = "Cancelled";
    ResponseModelState[ResponseModelState["Failed"] = 3] = "Failed";
    ResponseModelState[ResponseModelState["NeedsInput"] = 4] = "NeedsInput";
})(ResponseModelState || (ResponseModelState = {}));
export const IChatService = createDecorator('IChatService');
export const KEYWORD_ACTIVIATION_SETTING_ID = 'accessibility.voice.keywordActivation';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQXdCLE1BQU0sdUNBQXVDLENBQUM7QUFFN0csT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSXhFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQW1CN0YsTUFBTSxDQUFOLElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN6QixtREFBUSxDQUFBO0lBQ1IseURBQVcsQ0FBQTtJQUNYLHFEQUFTLENBQUE7QUFDVixDQUFDLEVBSlcsY0FBYyxLQUFkLGNBQWMsUUFJekI7QUFrQ0QsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVk7SUFDOUMsT0FBTyxDQUNOLENBQUMsQ0FBQyxHQUFHO1FBQ0wsT0FBTyxHQUFHLEtBQUssUUFBUTtRQUN2QixLQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLFlBQVksR0FBRztRQUN0QyxTQUFTLElBQUksR0FBRyxJQUFJLE9BQU8sR0FBRyxDQUFDLE9BQU8sS0FBSyxRQUFRO1FBQ25ELFFBQVEsSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEs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
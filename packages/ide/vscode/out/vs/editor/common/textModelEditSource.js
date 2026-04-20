/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sumBy } from '../../base/common/arrays.js';
import { prefixedUuid } from '../../base/common/uuid.js';
import { LineEdit } from './core/edits/lineEdit.js';
import { TextLength } from './core/text/textLength.js';
const privateSymbol = Symbol('TextModelEditSource');
export class TextModelEditSource {
    constructor(metadata, _privateCtorGuard) {
        this.metadata = metadata;
    }
    toString() {
        return `${this.metadata.source}`;
    }
    getType() {
        const metadata = this.metadata;
        switch (metadata.source) {
            case 'cursor':
                return metadata.kind;
            case 'inlineCompletionAccept':
                return metadata.source + (metadata.$nes ? ':nes' : '');
            case 'unknown':
                return metadata.name || 'unknown';
            default:
                return metadata.source;
        }
    }
    /**
     * Converts the metadata to a key string.
     * Only includes properties/values that have `level` many `$` prefixes or less.
    */
    toKey(level, filter = {}) {
        const metadata = this.metadata;
        const keys = Object.entries(metadata).filter(([key, value]) => {
            const filterVal = filter[key];
            if (filterVal !== undefined) {
                return filterVal;
            }
            const prefixCount = (key.match(/\$/g) || []).length;
            return prefixCount <= level && value !== undefined && value !== null && value !== '';
        }).map(([key, value]) => `${key}:${value}`);
        return keys.join('-');
    }
    get props() {
        // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
        return this.metadata;
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createEditSource(metadata) {
    // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
    return new TextModelEditSource(metadata, privateSymbol);
}
export function isAiEdit(source) {
    switch (source.metadata.source) {
        case 'inlineCompletionAccept':
        case 'inlineCompletionPartialAccept':
        case 'inlineChat.applyEdits':
        case 'Chat.applyEdits':
            return true;
    }
    return false;
}
export function isUserEdit(source) {
    switch (source.metadata.source) {
        case 'cursor':
            return source.metadata.kind === 'type';
    }
    return false;
}
export const EditSources = {
    unknown(data) {
        return createEditSource({
            source: 'unknown',
            name: data.name,
        });
    },
    rename: (oldName, newName) => createEditSource({ source: 'rename', $$$oldName: oldName, $$$newName: newName }),
    chatApplyEdits(data) {
        return createEditSource({
            source: 'Chat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
            $extensionId: data.extensionId?.extensionId,
            $extensionVersion: data.extensionId?.version,
            $$languageId: data.languageId,
            $$sessionId: data.sessionId,
            $$requestId: data.requestId,
            $$mode: data.mode,
            $$codeBlockSuggestionId: data.codeBlockSuggestionId,
        });
    },
    chatUndoEdits: () => createEditSource({ source: 'Chat.undoEdits' }),
    chatReset: () => createEditSource({ source: 'Chat.reset' }),
    inlineCompletionAccept(data) {
        return createEditSource({
            source: 'inlineCompletionAccept',
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$correlationId: data.correlationId,
            $$requestUuid: data.requestUuid,
            $$languageId: data.languageId,
        });
    },
    inlineCompletionPartialAccept(data) {
        return createEditSource({
            source: 'inlineCompletionPartialAccept',
            type: data.type,
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$correlationId: data.correlationId,
            $$requestUuid: data.requestUuid,
            $$languageId: data.languageId,
        });
    },
    inlineChatApplyEdit(data) {
        return createEditSource({
            source: 'inlineChat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
            $extensionId: data.extensionId?.extensionId,
            $extensionVersion: data.extensionId?.version,
            $$sessionId: data.sessionId,
            $$requestId: data.requestId,
            $$languageId: data.languageId,
        });
    },
    reloadFromDisk: () => createEditSource({ source: 'reloadFromDisk' }),
    cursor(data) {
        return createEditSource({
            source: 'cursor',
            kind: data.kind,
            detailedSource: data.detailedSource,
        });
    },
    setValue: () => createEditSource({ source: 'setValue' }),
    eolChange: () => createEditSource({ source: 'eolChange' }),
    applyEdits: () => createEditSource({ source: 'applyEdits' }),
    snippet: () => createEditSource({ source: 'snippet' }),
    suggest: (data) => createEditSource({ source: 'suggest', ...toProperties(data.providerId) }),
    codeAction: (data) => createEditSource({ source: 'codeAction', $kind: data.kind, ...toProperties(data.providerId) })
};
function toProperties(version) {
    if (!version) {
        return {};
    }
    return {
        $extensionId: version.extensionId,
        $extensionVersion: version.extensionVersion,
        $providerId: version.providerId,
    };
}
function avoidPathRedaction(str) {
    if (str === undefined) {
        return undefined;
    }
    // To avoid false-positive file path redaction.
    return str.replaceAll('/', '|');
}
export class EditDeltaInfo {
    static fromText(text) {
        const linesAdded = TextLength.ofText(text).lineCount;
        const charsAdded = text.length;
        return new EditDeltaInfo(linesAdded, 0, charsAdded, 0);
    }
    /** @internal */
    static fromEdit(edit, originalString) {
        const lineEdit = LineEdit.fromStringEdit(edit, originalString);
        const linesAdded = sumBy(lineEdit.replacements, r => r.newLines.length);
        const linesRemoved = sumBy(lineEdit.replacements, r => r.lineRange.length);
        const charsAdded = sumBy(edit.replacements, r => r.getNewLength());
        const charsRemoved = sumBy(edit.replacements, r => r.replaceRange.length);
        return new EditDeltaInfo(linesAdded, linesRemoved, charsAdded, charsRemoved);
    }
    static tryCreate(linesAdded, linesRemoved, charsAdded, charsRemoved) {
        if (linesAdded === undefined || linesRemoved === undefined || charsAdded === undefined || charsRemoved === undefined) {
            return undefined;
        }
        return new EditDeltaInfo(linesAdded, linesRemoved, charsAdded, charsRemoved);
    }
    constructor(linesAdded, linesRemoved, charsAdded, charsRemoved) {
        this.linesAdded = linesAdded;
        this.linesRemoved = linesRemoved;
        this.charsAdded = charsAdded;
        this.charsRemoved = charsRemoved;
    }
}
export var EditSuggestionId;
(function (EditSuggestionId) {
    /**
     * Use AiEditTelemetryServiceImpl to create a new id!
    */
    function newId(genPrefixedUuid) {
        const id = genPrefixedUuid ? genPrefixedUuid('sgt') : prefixedUuid('sgt');
        return toEditIdentity(id);
    }
    EditSuggestionId.newId = newId;
})(EditSuggestionId || (EditSuggestionId = {}));
function toEditIdentity(id) {
    return id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRWRpdFNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3RleHRNb2RlbEVkaXRTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR3ZELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBRXBELE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFDaUIsUUFBc0MsRUFDdEQsaUJBQXVDO1FBRHZCLGFBQVEsR0FBUixRQUFRLENBQThCO0lBRW5ELENBQUM7SUFFRSxRQUFRO1FBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVNLE9BQU87UUFDYixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLFFBQVEsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLEtBQUssUUFBUTtnQkFDWixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDdEIsS0FBSyx3QkFBd0I7Z0JBQzVCLE9BQU8sUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEQsS0FBSyxTQUFTO2dCQUNiLE9BQU8sUUFBUSxDQUFDLElBQUksSUFBSSxTQUFTLENBQUM7WUFDbkM7Z0JBQ0MsT0FBTyxR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
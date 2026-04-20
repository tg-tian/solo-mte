import { isWindows } from '../../../../base/common/platform.js';
import { Mimes } from '../../../../base/common/mime.js';
import { LogLevel } from '../../../../platform/log/common/log.js';
import { generateUuid } from '../../../../base/common/uuid.js';
export function ensureClipboardGetsEditorSelection(e, context, logService, isFirefox) {
    const viewModel = context.viewModel;
    const options = context.configuration.options;
    let id = undefined;
    if (logService.getLevel() === LogLevel.Trace) {
        id = generateUuid();
    }
    const { dataToCopy, storedMetadata } = generateDataToCopyAndStoreInMemory(viewModel, options, id, isFirefox);
    // !!!!!
    // This is a workaround for what we think is an Electron bug where
    // execCommand('copy') does not always work (it does not fire a clipboard event)
    // !!!!!
    // We signal that we have executed a copy command
    CopyOptions.electronBugWorkaroundCopyEventHasFired = true;
    e.preventDefault();
    if (e.clipboardData) {
        ClipboardEventUtils.setTextData(e.clipboardData, dataToCopy.text, dataToCopy.html, storedMetadata);
    }
    logService.trace('ensureClipboardGetsEditorSelection with id : ', id, ' with text.length: ', dataToCopy.text.length);
}
export function generateDataToCopyAndStoreInMemory(viewModel, options, id, isFirefox) {
    const emptySelectionClipboard = options.get(45 /* EditorOption.emptySelectionClipboard */);
    const copyWithSyntaxHighlighting = options.get(31 /* EditorOption.copyWithSyntaxHighlighting */);
    const selections = viewModel.getCursorStates().map(cursorState => cursorState.modelState.selection);
    const dataToCopy = getDataToCopy(viewModel, selections, emptySelectionClipboard, copyWithSyntaxHighlighting);
    const storedMetadata = {
        version: 1,
        id,
        isFromEmptySelection: dataToCopy.isFromEmptySelection,
        multicursorText: dataToCopy.multicursorText,
        mode: dataToCopy.mode
    };
    InMemoryClipboardMetadataManager.INSTANCE.set(
    // When writing "LINE\r\n" to the clipboard and then pasting,
    // Firefox pastes "LINE\n", so let's work around this quirk
    (isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text), storedMetadata);
    return { dataToCopy, storedMetadata };
}
function getDataToCopy(viewModel, modelSelections, emptySelectionClipboard, copyWithSyntaxHighlighting) {
    const rawTextToCopy = viewModel.getPlainTextToCopy(modelSelections, emptySelectionClipboard, isWindows);
    const newLineCharacter = viewModel.model.getEOL();
    const isFromEmptySelection = (emptySelectionClipboard && modelSelections.length === 1 && modelSelections[0].isEmpty());
    const multicursorText = (Array.isArray(rawTextToCopy) ? rawTextToCopy : null);
    const text = (Array.isArray(rawTextToCopy) ? rawTextToCopy.join(newLineCharacter) : rawTextToCopy);
    let html = undefined;
    let mode = null;
    if (CopyOptions.forceCopyWithSyntaxHighlighting || (copyWithSyntaxHighlighting && text.length < 65536)) {
        const richText = viewModel.getRichTextToCopy(modelSelections, emptySelectionClipboard);
        if (richText) {
            html = richText.html;
            mode = richText.mode;
        }
    }
    const dataToCopy = {
        isFromEmptySelection,
        multicursorText,
        text,
        html,
        mode
    };
    return dataToCopy;
}
export function computePasteData(e, context, logService) {
    e.preventDefault();
    if (!e.clipboardData) {
        return;
    }
    let [text, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
    logService.trace('computePasteData with id : ', metadata?.id, ' with text.length: ', text.length);
    if (!text) {
        return;
    }
    PasteOptions.electronBugWorkaroundPasteEventHasFired = true;
    metadata = metadata || InMemoryClipboardMetadataManager.INSTANCE.get(text);
    return getPasteDataFromMetadata(text, metadata, context);
}
export function getPasteDataFromMetadata(text, metadata, context) {
    let pasteOnNewLine = false;
    let multicursorText = null;
    let mode = null;
    if (metadata) {
        const options = context.configuration.options;
        const emptySelectionClipboard = options.get(45 /* EditorOption.emptySelectionClipboard */);
        pasteOnNewLine = emptySelectionClipboard && !!metadata.isFromEmptySelection;
        multicursorText = typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null;
        mode = metadata.mode;
    }
    return { text, pasteOnNewLine, multicursorText, mode };
}
/**
 * Every time we write to the clipboard, we record a bit of extra metadata here.
 * Every time we read from the cipboard, if the text matches our last written text,
 * we can fetch the previous metadata.
 */
export class InMemoryClipboardMetadataManager {
    static { this.INSTANCE = new InMemoryClipboardMetadataManager(); }
    constructor() {
        this._lastState = null;
    }
    set(lastCopiedValue, data) {
        this._lastState = { lastCopiedValue, data };
    }
    get(pastedText) {
        if (this._lastState && this._lastState.lastCopiedValue === pastedText) {
            // match!
            return this._lastState.data;
        }
        this._lastState = null;
        return null;
    }
}
export const CopyOptions = {
    forceCopyWithSyntaxHighlighting: false,
    electronBugWorkaroundCopyEventHasFired: false
};
export const PasteOptions = {
    electronBugWorkaroundPasteEventHasFired: false
};
export const ClipboardEventUtils = {
    getTextData(clipboardData) {
        const text = clipboardData.getData(Mimes.text);
        let metadata = null;
        const rawmetadata = clipboardData.getData('vscode-editor-data');
        if (typeof rawmetadata === 'string') {
            try {
                metadata = JSON.parse(rawmetadata);
                if (metadata.version !== 1) {
                    metadata = null;
                }
            }
            catch (err) {
                // no problem!
            }
        }
        if (text.length === 0 && metadata === null && clipboardData.files.length > 0) {
            // no textual data pasted, generate text from file names
            const files = Array.prototype.slice.call(clipboardData.files, 0);
            return [files.map(file => file.name).join('\n'), null];
        }
        return [text, metadata];
    },
    setTextData(clipboardData, text, html, metadata) {
        clipboardData.setData(Mimes.text, text);
        if (typeof html === 'string') {
            clipboardData.setData('text/html', html);
        }
        clipboardData.setData('vscode-editor-data', JSON.stringify(metadata));
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9jbGlwYm9hcmRVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE9BQU8sRUFBZSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsTUFBTSxVQUFVLGtDQUFrQyxDQUFDLENBQWlCLEVBQUUsT0FBb0IsRUFBRSxVQUF1QixFQUFFLFNBQWtCO0lBQ3RJLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDcEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7SUFDOUMsSUFBSSxFQUFFLEdBQXVCLFNBQVMsQ0FBQztJQUN2QyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDOUMsRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxNQUFNLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxHQUFHLGtDQUFrQyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRTdHLFFBQVE7SUFDUixrRUFBa0U7SUFDbEUsZ0ZBQWdGO0lBQ2hGLFFBQVE7SUFDUixpREFBaUQ7SUFDakQsV0FBVyxDQUFDLHNDQUFzQyxHQUFHLElBQUksQ0FBQztJQUUxRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDbkIsSUFBSSxDQUFDLENBQUMs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
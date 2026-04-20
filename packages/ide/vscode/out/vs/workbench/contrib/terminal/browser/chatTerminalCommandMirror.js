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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITerminalService } from './terminal.js';
import { DetachedProcessInfo } from './detachedTerminal.js';
import { TERMINAL_BACKGROUND_COLOR } from '../common/terminalColorRegistry.js';
import { PANEL_BACKGROUND } from '../../../common/theme.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../base/common/color.js';
function getChatTerminalBackgroundColor(theme, contextKeyService, storedBackground) {
    if (storedBackground) {
        const color = Color.fromHex(storedBackground);
        if (color) {
            return color;
        }
    }
    const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR);
    if (terminalBackground) {
        return terminalBackground;
    }
    const isInEditor = ChatContextKeys.inChatEditor.getValue(contextKeyService);
    return theme.getColor(isInEditor ? editorBackground : PANEL_BACKGROUND);
}
/**
 * Base class for detached terminal mirrors.
 * Handles attaching to containers and managing the detached terminal instance.
 */
class DetachedTerminalMirror extends Disposable {
    _setDetachedTerminal(detachedTerminal) {
        this._detachedTerminal = detachedTerminal.then(terminal => this._register(terminal));
    }
    async _getTerminal() {
        if (!this._detachedTerminal) {
            throw new Error('Detached terminal not initialized');
        }
        return this._detachedTerminal;
    }
    async _attachToContainer(container) {
        const terminal = await this._getTerminal();
        container.classList.add('chat-terminal-output-terminal');
        const needsAttach = this._attachedContainer !== container || container.firstChild === null;
        if (needsAttach) {
            terminal.attachToElement(container);
            this._attachedContainer = container;
        }
        return terminal;
    }
}
export async function getCommandOutputSnapshot(xtermTerminal, command, log) {
    const executedMarker = command.executedMarker;
    const endMarker = command.endMarker;
    if (!endMarker || endMarker.isDisposed) {
        return undefined;
    }
    if (!executedMarker || executedMarker.isDisposed) {
        const raw = xtermTerminal.raw;
        const buffer = raw.buffer.active;
        const offsets = [
            -(buffer.baseY + buffer.cursorY),
            -buffer.baseY,
            0
        ];
        let startMarker;
        for (const offset of offsets) {
            startMarker = raw.registerMarker(offset);
            if (startMarker) {
                break;
            }
        }
        if (!startMarker || startMarker.isDisposed) {
            return { text: '', lineCount: 0 };
        }
        const startLine = startMarker.line;
        let text;
        try {
            text = await xtermTerminal.getRangeAsVT(startMarker, endMarker, true);
        }
        catch (error) {
            log?.('fallback', error);
            return undefined;
        }
        finally {
            startMarker.dispose();
        }
        if (!text) {
            return { text: '', lineCount: 0 };
        }
        const endLine = endMarker.line - 1;
        const lineCount = Math.max(endLine - startLine + 1, 0);
        return { text, lineCount };
    }
    const startLine = executedMarker.line;
    const endLine = endMarker.line - 1;
    const lineCount = Math.max(endLine - startLine + 1, 0);
    let text;
    try {
        text = await xtermTerminal.getRangeAsVT(executedMarker, endMarker, true);
    }
    catch (error) {
        log?.('primary', error);
        return undefined;
    }
    if (!text) {
        return { text: '', lineCount: 0 };
    }
    return { text, lineCount };
}
/**
 * Mirrors a terminal command's output into a detached terminal instance.
 * Used in the chat terminal tool progress part to show command output for example.
 */
let DetachedTerminalCommandMirror = class DetachedTerminalCommandMirror extends DetachedTerminalMirror {
    constructor(_xtermTerminal, _command, _terminalService, _contextKeyService) {
        super();
        this._xtermTerminal = _xtermTerminal;
        this._command = _command;
        this._terminalService = _terminalService;
        this._contextKeyService = _contextKeyService;
        const processInfo = this._register(new DetachedProcessInfo({ initialCwd: '' }));
        this._setDetachedTerminal(this._terminalService.createDetachedTerminal({
            cols: this._xtermTerminal.raw.cols,
            rows: 10,
            readonly: true,
            processInfo,
            disableOverviewRuler: true,
            colorProvider: {
                getBackgroundColor: theme => getChatTerminalBackgroundColor(theme, this._contextKeyService),
            },
        }));
    }
    async attach(container) {
        await this._attachToContainer(container);
    }
    async renderCommand() {
        const vt = await getCommandOutputSnapshot(this._xtermTerminal, this._command);
        if (!vt) {
            return undefined;
        }
        if (!vt.text) {
            return { lineCount: 0 };
        }
        const detached = await this._getTerminal();
        detached.xterm.clearBuffer();
        detached.xterm.clearSearchDecorations?.();
        await new Promise(resolve => {
            detached.xterm.write(vt.text, () => resolve());
        });
        return { lineCount: vt.lineCount };
    }
};
DetachedTerminalCommandMirror = __decorate([
    __param(2, ITerminalService),
    __param(3, IContextKeyService)
], DetachedTerminalCommandMirror);
export { DetachedTerminalCommandMirror };
/**
 * Mirrors a terminal output snapshot into a detached terminal instance.
 * Used when the terminal has been disposed of but we still want to show the output.
 */
let DetachedTerminalSnapshotMirror = class DetachedTerminalSnapshotMirror extends DetachedTerminalMirror {
    constructor(output, _getTheme, _terminalService, _contextKeyService) {
        super();
        this._getTheme = _getTheme;
        this._terminalService = _terminalService;
        this._contextKeyService = _contextKeyService;
        this._dirty = true;
        this._output = output;
        const processInfo = this._register(new DetachedProcessInfo({ initialCwd: '' }));
        this._setDetachedTerminal(this._terminalService.createDetachedTerminal({
            cols: 80,
            rows: 10,
            readonly: true,
            processInfo,
            disableOverviewRuler: true,
            colorProvider: {
                getBackgroundColor: theme => {
                    const storedBackground = this._getTheme()?.background;
                    return getChatTerminalBackgroundColor(theme, this._contextKeyService, storedBackground);
                }
            }
        }));
    }
    setOutput(output) {
        this._output = output;
        this._dirty = true;
    }
    async attach(container) {
        await this._attachToContainer(container);
        this._container = container;
        this._applyTheme(container);
    }
    async render() {
        const output = this._output;
        if (!output) {
            return undefined;
        }
        if (!this._dirty) {
            return { lineCount: this._lastRenderedLineCount ?? output.lineCount };
        }
        const terminal = await this._getTerminal();
        terminal.xterm.clearBuffer();
        terminal.xterm.clearSearchDecorations?.();
        if (this._container) {
            this._applyTheme(this._container);
        }
        const text = output.text ?? '';
        const lineCount = output.lineCount ?? this._estimateLineCount(text);
        if (!text) {
            this._dirty = false;
            this._lastRenderedLineCount = lineCount;
            return { lineCount: 0 };
        }
        await new Promise(resolve => terminal.xterm.write(text, resolve));
        this._dirty = false;
        this._lastRenderedLineCount = lineCount;
        return { lineCount };
    }
    _estimateLineCount(text) {
        if (!text) {
            return 0;
        }
        const sanitized = text.replace(/\r/g, '');
        const segments = sanitized.split('\n');
        const count = sanitized.endsWith('\n') ? segments.length - 1 : segments.length;
        return Math.max(count, 1);
    }
    _applyTheme(container) {
        const theme = this._getTheme();
        if (!theme) {
            container.style.removeProperty('background-color');
            container.style.removeProperty('color');
            return;
        }
        if (theme.background) {
            container.style.backgroundColor = theme.background;
        }
        if (theme.foreground) {
            container.style.color = theme.foreground;
        }
    }
};
DetachedTerminalSnapshotMirror = __decorate([
    __param(2, ITerminalService),
    __param(3, IContextKeyService)
], DetachedTerminalSnapshotMirror);
export { DetachedTerminalSnapshotMirror };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRlcm1pbmFsQ29tbWFuZE1pcnJvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL2NoYXRUZXJtaW5hbENvbW1hbmRNaXJyb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0MsTUFBTSxlQUFlLENBQUM7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFNUQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUl6RCxTQUFTLDhCQUE4QixDQUFDLEtBQWtCLEVBQUUsaUJBQXFDLEVBQUUsZ0JBQXlCO0lBQzNILElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDOUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNyRSxJ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
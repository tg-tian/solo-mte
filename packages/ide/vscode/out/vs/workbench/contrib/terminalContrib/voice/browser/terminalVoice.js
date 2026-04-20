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
var TerminalVoiceSession_1;
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isNumber } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { SpeechTimeoutDefault } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { ISpeechService, SpeechToTextStatus } from '../../../speech/common/speechService.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
const symbolMap = {
    'Ampersand': '&',
    'ampersand': '&',
    'Dollar': '$',
    'dollar': '$',
    'Percent': '%',
    'percent': '%',
    'Asterisk': '*',
    'asterisk': '*',
    'Plus': '+',
    'plus': '+',
    'Equals': '=',
    'equals': '=',
    'Exclamation': '!',
    'exclamation': '!',
    'Slash': '/',
    'slash': '/',
    'Backslash': '\\',
    'backslash': '\\',
    'Dot': '.',
    'dot': '.',
    'Period': '.',
    'period': '.',
    'Quote': '\'',
    'quote': '\'',
    'double quote': '"',
    'Double quote': '"',
};
let TerminalVoiceSession = class TerminalVoiceSession extends Disposable {
    static { TerminalVoiceSession_1 = this; }
    static { this._instance = undefined; }
    static getInstance(instantiationService) {
        if (!TerminalVoiceSession_1._instance) {
            TerminalVoiceSession_1._instance = instantiationService.createInstance(TerminalVoiceSession_1);
        }
        return TerminalVoiceSession_1._instance;
    }
    constructor(_speechService, _terminalService, _configurationService, contextKeyService) {
        super();
        this._speechService = _speechService;
        this._terminalService = _terminalService;
        this._configurationService = _configurationService;
        this._input = '';
        this._register(this._terminalService.onDidChangeActiveInstance(() => this.stop()));
        this._register(this._terminalService.onDidDisposeInstance(() => this.stop()));
        this._disposables = this._register(new DisposableStore());
        this._terminalDictationInProgress = TerminalContextKeys.terminalDictationInProgress.bindTo(contextKeyService);
    }
    async start() {
        this.stop();
        let voiceTimeout = this._configurationService.getValue("accessibility.voice.speechTimeout" /* AccessibilityVoiceSettingId.SpeechTimeout */);
        if (!isNumber(voiceTimeout) || voiceTimeout < 0) {
            voiceTimeout = SpeechTimeoutDefault;
        }
        this._acceptTranscriptionScheduler = this._disposables.add(new RunOnceScheduler(() => {
            this._sendText();
            this.stop();
        }, voiceTimeout));
        this._cancellationTokenSource = new CancellationTokenSource();
        this._register(toDisposable(() => this._cancellationTokenSource?.dispose(true)));
        const session = await this._speechService.createSpeechToTextSession(this._cancellationTokenSource?.token, 'terminal');
        this._disposables.add(session.onDidChange((e) => {
            if (this._cancellationTokenSource?.token.isCancellationRequested) {
                return;
            }
            switch (e.status) {
                case SpeechToTextStatus.Started:
                    this._terminalDictationInProgress.set(true);
                    if (!this._decoration) {
                        this._createDecoration();
                    }
                    break;
                case SpeechToTextStatus.Recognizing: {
                    this._updateInput(e);
                    this._renderGhostText(e);
                    this._updateDecoration();
                    if (voiceTimeout > 0) {
                        this._acceptTranscriptionScheduler.cancel();
                    }
                    break;
                }
                case SpeechToTextStatus.Recognized:
                    this._updateInput(e);
                    // Send text immediately like editor dictation
                    this._sendText();
                    // Clear ghost text and input for next recognition
                    this._ghostText?.dispose();
                    this._ghostText = undefined;
                    this._ghostTextMarker?.dispose();
                    this._ghostTextMarker = undefined;
                    // Update decoration position for next recognition
                    this._updateDecoration();
                    this._input = '';
                    break;
                case SpeechToTextStatus.Stopped:
                    this.stop();
                    break;
            }
        }));
    }
    stop(send) {
        this._setInactive();
        if (send) {
            this._acceptTranscriptionScheduler.cancel();
            this._sendText();
        }
        this._ghostText = undefined;
        this._decoration?.dispose();
        this._decoration = undefined;
        this._marker?.dispose();
        this._marker = undefined;
        this._ghostTextMarker = undefined;
        this._cancellationTokenSource?.cancel();
        this._disposables.clear();
        this._input = '';
        this._terminalDictationInProgress.reset();
    }
    _sendText() {
        this._terminalService.activeInstance?.sendText(this._input, false);
        alert(localize('terminalVoiceTextInserted', '{0} inserted', this._input));
    }
    _updateInput(e) {
        if (e.text) {
            let input = e.text.replaceAll(/[.,?;!]/g, '');
            for (const symbol of Object.entries(symbolMap)) {
                input = input.replace(new RegExp('\\b' + symbol[0] + '\\b'), symbol[1]);
            }
            this._input = ' ' + input;
        }
    }
    _createDecoration() {
        const activeInstance = this._terminalService.activeInstance;
        const xterm = activeInstance?.xterm?.raw;
        if (!xterm) {
            return;
        }
        const onFirstLine = xterm.buffer.active.cursorY === 0;
        // Calculate x position based on current cursor position and input length
        const inputLength = this._input.length;
        const xPosition = xterm.buffer.active.cursorX + inputLength;
        this._marker = activeInstance.registerMarker(onFirstLine ? 0 : -1);
        if (!this._marker) {
            return;
        }
        this._decoration = xterm.registerDecoration({
            marker: this._marker,
            layer: 'top',
            x: xPosition,
        });
        if (!this._decoration) {
            this._marker.dispose();
            this._marker = undefined;
            return;
        }
        this._decoration.onRender((e) => {
            e.classList.add(...ThemeIcon.asClassNameArray(Codicon.micFilled), 'terminal-voice', 'recording');
            e.style.transform = onFirstLine ? 'translate(10px, -2px)' : 'translate(-6px, -5px)';
        });
    }
    _updateDecoration() {
        // Dispose the old decoration and recreate it at the new position
        this._decoration?.dispose();
        this._marker?.dispose();
        this._decoration = undefined;
        this._marker = undefined;
        this._createDecoration();
    }
    _setInactive() {
        this._decoration?.element?.classList.remove('recording');
    }
    _renderGhostText(e) {
        this._ghostText?.dispose();
        const text = e.text;
        if (!text) {
            return;
        }
        const activeInstance = this._terminalService.activeInstance;
        const xterm = activeInstance?.xterm?.raw;
        if (!xterm) {
            return;
        }
        this._ghostTextMarker = activeInstance.registerMarker();
        if (!this._ghostTextMarker) {
            return;
        }
        this._disposables.add(this._ghostTextMarker);
        const onFirstLine = xterm.buffer.active.cursorY === 0;
        this._ghostText = xterm.registerDecoration({
            marker: this._ghostTextMarker,
            layer: 'top',
            x: onFirstLine ? xterm.buffer.active.cursorX + 4 : xterm.buffer.active.cursorX + 1,
        });
        if (this._ghostText) {
            this._disposables.add(this._ghostText);
        }
        this._ghostText?.onRender((e) => {
            e.classList.add('terminal-voice-progress-text');
            e.textContent = text;
            e.style.width = (xterm.cols - xterm.buffer.active.cursorX) / xterm.cols * 100 + '%';
        });
    }
};
TerminalVoiceSession = TerminalVoiceSession_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, ITerminalService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService)
], TerminalVoiceSession);
export { TerminalVoiceSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxWb2ljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvdm9pY2UvYnJvd3Nlci90ZXJtaW5hbFZvaWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBbUQsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU5SSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHckYsTUFBTSxTQUFTLEdBQThCO0lBQzVDLFdB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
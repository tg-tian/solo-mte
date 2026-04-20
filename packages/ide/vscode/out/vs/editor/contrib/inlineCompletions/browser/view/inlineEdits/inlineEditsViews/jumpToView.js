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
import { n } from '../../../../../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { RunOnceScheduler } from '../../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, DebugLocation, derived, observableFromEvent } from '../../../../../../../base/common/observable.js';
import { OS } from '../../../../../../../base/common/platform.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { defaultKeybindingLabelStyles } from '../../../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { Range } from '../../../../../../common/core/range.js';
import { inlineSuggestCommitId } from '../../../controller/commandIds.js';
import { getEditorBlendedColor, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorPrimaryBorder, inlineEditIndicatorPrimaryForeground } from '../theme.js';
import { rectToProps } from '../utils/utils.js';
let JumpToView = class JumpToView extends Disposable {
    constructor(_editor, options, _data, _themeService, _keybindingService, _contextKeyService) {
        super();
        this._editor = _editor;
        this._data = _data;
        this._themeService = _themeService;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this._styles = derived(this, reader => ({
            background: getEditorBlendedColor(inlineEditIndicatorPrimaryBackground, this._themeService).read(reader).toString(),
            foreground: getEditorBlendedColor(inlineEditIndicatorPrimaryForeground, this._themeService).read(reader).toString(),
            border: getEditorBlendedColor(inlineEditIndicatorPrimaryBorder, this._themeService).read(reader).toString(),
        }));
        this._pos = derived(this, reader => {
            return this._editor.observePosition(derived(reader => this._data.read(reader)?.jumpToPosition || null), reader.store);
        }).flatten();
        this._layout = derived(this, reader => {
            const data = this._data.read(reader);
            if (!data) {
                return undefined;
            }
            const position = data.jumpToPosition;
            const lineHeight = this._editor.observeLineHeightForLine(constObservable(position.lineNumber)).read(reader);
            const scrollLeft = this._editor.scrollLeft.read(reader);
            const point = this._pos.read(reader);
            if (!point) {
                return undefined;
            }
            const layout = this._editor.layoutInfo.read(reader);
            const widgetRect = Rect.fromLeftTopWidthHeight(point.x + layout.contentLeft + 2 - scrollLeft, point.y, 100, lineHeight);
            return {
                widgetRect,
            };
        });
        this._blink = animateFixedValues([
            { value: true, durationMs: 600 },
            { value: false, durationMs: 600 },
        ]);
        this._widget = n.div({
            class: 'inline-edit-jump-to-widget',
            style: {
                position: 'absolute',
                display: this._layout.map(l => l ? 'flex' : 'none'),
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                ...rectToProps(reader => this._layout.read(reader)?.widgetRect),
            }
        }, derived(reader => {
            if (this._data.read(reader) === undefined) {
                return [];
            }
            // Main content container with rounded border
            return n.div({
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 4px',
                    height: '100%',
                    backgroundColor: this._styles.map(s => s.background),
                    ['--vscodeIconForeground']: this._styles.map(s => s.foreground),
                    border: this._styles.map(s => `1px solid ${s.border}`),
                    borderRadius: '3px',
                    boxSizing: 'border-box',
                    fontSize: '11px',
                    color: this._styles.map(s => s.foreground),
                }
            }, [
                this._style === 'cursor' ?
                    n.elem('div', {
                        style: {
                            borderLeft: '2px solid',
                            height: 14,
                            opacity: this._blink.map(b => b ? '0' : '1'),
                        }
                    }) :
                    [
                        derived(() => n.elem('div', {}, keybindingLabel(this._keybinding))),
                        n.elem('div', { style: { lineHeight: this._layout.map(l => l?.widgetRect.height), marginTop: '-2px' } }, ['to jump',])
                    ],
            ]);
        }));
        this._style = options.style;
        this._keybinding = this._getKeybinding(inlineSuggestCommitId);
        const widget = this._widget.keepUpdated(this._store);
        this._register(this._editor.createOverlayWidget({
            domNode: widget.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(this._editor.setDecorations(derived(reader => {
            const data = this._data.read(reader);
            if (!data) {
                return [];
            }
            // use injected text at position
            return [{
                    range: Range.fromPositions(data.jumpToPosition, data.jumpToPosition),
                    options: {
                        description: 'inline-edit-jump-to-decoration',
                        inlineClassNameAffectsLetterSpacing: true,
                        showIfCollapsed: true,
                        after: {
                            content: this._style === 'label' ? '          ' : '  ',
                        }
                    },
                }];
        })));
    }
    _getKeybinding(commandId, debugLocation = DebugLocation.ofCaller()) {
        if (!commandId) {
            return constObservable(undefined);
        }
        return observableFromEvent(this, this._contextKeyService.onDidChangeContext, () => this._keybindingService.lookupKeybinding(commandId), debugLocation);
        // TODO: use contextkeyservice to use different renderings
    }
};
JumpToView = __decorate([
    __param(3, IThemeService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], JumpToView);
export { JumpToView };
function animateFixedValues(values, debugLocation = DebugLocation.ofCaller()) {
    let idx = 0;
    return observableFromEvent(undefined, (l) => {
        idx = 0;
        const timer = new RunOnceScheduler(() => {
            idx = (idx + 1) % values.length;
            l(null);
            timer.schedule(values[idx].durationMs);
        }, 0);
        timer.schedule(0);
        return timer;
    }, () => {
        return values[idx].value;
    }, debugLocation);
}
function keybindingLabel(keybinding) {
    return derived(_reader => n.div({
        style: {},
        ref: elem => {
            const keybindingLabel = _reader.store.add(new KeybindingLabel(elem, OS, {
                disableTitle: true,
                ...defaultKeybindingLabelStyles,
                keybindingLabelShadow: undefined,
                keybindingLabelForeground: asCssVariable(inlineEditIndicatorPrimaryForeground),
                keybindingLabelBackground: 'transparent',
                keybindingLabelBorder: asCssVariable(inlineEditIndicatorPrimaryForeground),
                keybindingLabelBottomBorder: undefined,
            }));
            _reader.store.add(autorun(reader => {
                keybindingLabel.set(keybinding.read(reader));
            }));
        }
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianVtcFRvVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9qdW1wVG9WaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwSixPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbkcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDNUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFF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
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
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import * as lifecycle from '../../../../base/common/lifecycle.js';
import { URI as uri } from '../../../../base/common/uri.js';
import { EditorCommand, registerEditorCommand } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { CompletionOptions, provideSuggestionItems } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { defaultButtonStyles, defaultSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { hasNativeContextMenu } from '../../../../platform/window/common/window.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, CONTEXT_IN_BREAKPOINT_WIDGET, DEBUG_SCHEME, IDebugService } from '../common/debug.js';
import './media/breakpointWidget.css';
const $ = dom.$;
const IPrivateBreakpointWidgetService = createDecorator('privateBreakpointWidgetService');
const DECORATION_KEY = 'breakpointwidgetdecoration';
function isPositionInCurlyBracketBlock(input) {
    const model = input.getModel();
    const bracketPairs = model.bracketPairs.getBracketPairsInRange(Range.fromPositions(input.getPosition()));
    return bracketPairs.some(p => p.openingBracketInfo.bracketText === '{');
}
function createDecorations(theme, placeHolder) {
    const transparentForeground = theme.getColor(editorForeground)?.transparent(0.4);
    return [{
            range: {
                startLineNumber: 0,
                endLineNumber: 0,
                startColumn: 0,
                endColumn: 1
            },
            renderOptions: {
                after: {
                    contentText: placeHolder,
                    color: transparentForeground ? transparentForeground.toString() : undefined
                }
            }
        }];
}
let BreakpointWidget = class BreakpointWidget extends ZoneWidget {
    constructor(editor, lineNumber, column, context, contextViewService, debugService, themeService, instantiationService, modelService, codeEditorService, _configurationService, languageFeaturesService, keybindingService, labelService, textModelService, hoverService) {
        super(editor, { showFrame: true, showArrow: false, frameWidth: 1, isAccessible: true });
        this.lineNumber = lineNumber;
        this.column = column;
        this.contextViewService = contextViewService;
        this.debugService = debugService;
        this.themeService = themeService;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.codeEditorService = codeEditorService;
        this._configurationService = _configurationService;
        this.languageFeaturesService = languageFeaturesService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
        this.textModelService = textModelService;
        this.hoverService = hoverService;
        this.conditionInput = '';
        this.hitCountInput = '';
        this.logMessageInput = '';
        this.store = new lifecycle.DisposableStore();
        const model = this.editor.getModel();
        if (model) {
            const uri = model.uri;
            const breakpoints = this.debugService.getModel().getBreakpoints({ lineNumber: this.lineNumber, column: this.column, uri });
            this.breakpoint = breakpoints.length ? breakpoints[0] : undefined;
        }
        if (context === undefined) {
            if (this.breakpoint && !this.breakpoint.condition && !this.breakpoint.hitCondition && this.breakpoint.logMessage) {
                this.context = 2 /* Context.LOG_MESSAGE */;
            }
            else if (this.breakpoint && !this.breakpoint.condition && this.breakpoint.hitCondition) {
                this.context = 1 /* Context.HIT_COUNT */;
            }
            else if (this.breakpoint && this.breakpoint.triggeredBy) {
                this.context = 3 /* Context.TRIGGER_POINT */;
            }
            else {
                this.context = 0 /* Context.CONDITION */;
            }
        }
        else {
            this.context = context;
        }
        this.store.add(this.debugService.getModel().onDidChangeBreakpoints(e => {
            if (this.breakpoint && e && e.removed && e.removed.indexOf(this.breakpoint) >= 0) {
                this.dispose();
            }
        }));
        this.store.add(this.codeEditorService.registerDecorationType('breakpoint-widget', DECORATION_KEY, {}));
        this.create();
    }
    get placeholder() {
        const acceptString = this.keybindingService.lookupKeybinding(AcceptBreakpointWidgetInputAction.ID)?.getLabel() || 'Enter';
        const closeString = this.keybindingService.lookupKeybinding(CloseBreakpointWidgetCommand.ID)?.getLabel() || 'Escape';
        switch (this.context) {
            case 2 /* Context.LOG_MESSAGE */:
                return nls.localize('breakpointWidgetLogMessagePlaceholder', "Message to log when breakpoint is hit. Expressions within {} are interpolated. '{0}' to accept, '{1}' to cancel.", acceptString, closeString);
            case 1 /* Context.HIT_COUNT */:
                return nls.localize('breakpointWidgetHitCountPlaceholder', "Break when hit count condition is met. '{0}' to accept, '{1}' to cancel.", acceptString, closeString);
            default:
                return nls.localize('breakpointWidgetExpressionPlaceholder', "Break when expression evaluates to true. '{0}' to accept, '{1}' to cancel.", acceptString, closeString);
        }
    }
    getInputValue(breakpoint) {
        switch (this.context) {
            case 2 /* Context.LOG_MESSAGE */:
                return breakpoint && breakpoint.logMessage ? breakpoint.logMessage : this.logMessageInput;
            case 1 /* Context.HIT_COUNT */:
                return breakpoint && breakpoint.hitCondition ? breakpoint.hitCondition : this.hitCountInput;
            default:
                return breakpoint && breakpoint.condition ? breakpoint.condition : this.conditionInput;
        }
    }
    rememberInput() {
        if (this.context !== 3 /* Context.TRIGGER_POINT */) {
            const value = this.input.getModel().getValue();
            switch (this.context) {
                case 2 /* Context.LOG_MESSAGE */:
                    this.logMessageInput = value;
                    break;
                case 1 /* Context.HIT_COUNT */:
                    this.hitCountInput = value;
                    break;
                default:
                    this.conditionInput = value;
            }
        }
    }
    setInputMode() {
        if (this.editor.hasModel()) {
            // Use plaintext language for log messages, otherwise respect underlying editor language #125619
            const languageId = this.context === 2 /* Context.LOG_MESSAGE */ ? PLAINTEXT_LANGUAGE_ID : this.editor.getModel().getLanguageId();
            this.input.getModel().setLanguage(languageId);
        }
    }
    show(rangeOrPos) {
        const lineNum = this.input.getModel().getLineCount();
        super.show(rangeOrPos, lineNum + 1);
    }
    fitHeightToContent() {
        const lineNum = this.input.getModel().getLineCount();
        this._relayout(lineNum + 1);
    }
    _fillContainer(container) {
        this.setCssClass('breakpoint-widget');
        const selectBox = this.store.add(new SelectBox([
            { text: nls.localize('expression', "Expression") },
            { text: nls.localize('hitCount', "Hit Count") },
            { text: nls.localize('logMessage', "Log Message") },
            { text: nls.localize('triggeredBy', "Wait for Breakpoint") },
        ], this.context, this.contextViewService, defaultSelectBoxStyles, { ariaLabel: nls.localize('breakpointType', 'Breakpoint Type'), useCustomDrawn: !hasNativeContextMenu(this._configurationService) }));
        this.selectContainer = $('.breakpoint-select-container');
        selectBox.render(dom.append(container, this.selectContainer));
        this.store.add(selectBox.onDidSelect(e => {
            this.rememberInput();
            this.context = e.index;
            this.updateContextInput();
        }));
        this.createModesInput(container);
        this.inputContainer = $('.inputContainer');
        this.store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.inputContainer, this.placeholder));
        this.createBreakpointInput(dom.append(container, this.inputContainer));
        this.input.getModel().setValue(this.getInputValue(this.breakpoint));
        this.store.add(this.input.getModel().onDidChangeContent(() => {
            this.fitHeightToContent();
        }));
        this.input.setPosition({ lineNumber: 1, column: this.input.getModel().getLineMaxColumn(1) });
        this.createTriggerBreakpointInput(container);
        this.updateContextInput();
        // Due to an electron bug we have to do the timeout, otherwise we do not get focus
        setTimeout(() => this.focusInput(), 150);
    }
    createModesInput(container) {
        const modes = this.debugService.getModel().getBreakpointModes('source');
        if (modes.length <= 1) {
            return;
        }
        const sb = this.selectModeBox = new SelectBox([
            { text: nls.localize('bpMode', 'Mode'), isDisabled: true },
            ...modes.map(mode => ({ text: mode.label, description: mode.description })),
        ], modes.findIndex(m => m.mode === this.breakpoint?.mode) + 1, this.contextViewService, defaultSelectBoxStyles, { useCustomDrawn: !hasNativeContextMenu(this._configurationService) });
        this.store.add(sb);
        this.store.add(sb.onDidSelect(e => {
            this.modeInput = modes[e.index - 1];
        }));
        const modeWrapper = $('.select-mode-container');
        const selectionWrapper = $('.select-box-container');
        dom.append(modeWrapper, selectionWrapper);
        sb.render(selectionWrapper);
        dom.append(container, modeWrapper);
    }
    createTriggerBreakpointInput(container) {
        const breakpoints = this.debugService.getModel().getBreakpoints().filter(bp => bp !== this.breakpoint && !bp.logMessage);
        const breakpointOptions = [
            { text: nls.localize('noTriggerByBreakpoint', 'None'), isDisabled: true },
            ...breakpoints.map(bp => ({
                text: `${this.labelService.getUriLabel(bp.uri, { relative: true })}: ${bp.lineNumber}`,
                description: nls.localize('triggerByLoading', 'Loading...')
            })),
        ];
        const index = breakpoints.findIndex((bp) => this.breakpoint?.triggeredBy === bp.getId());
        for (const [i, bp] of breakpoints.entries()) {
            this.textModelService.createModelReference(bp.uri).then(ref => {
                try {
                    breakpointOptions[i + 1].description = ref.object.textEditorModel.getLineContent(bp.lineNumber).trim();
                }
                finally {
                    ref.dispose();
                }
            }).catch(() => {
                breakpointOptions[i + 1].description = nls.localize('noBpSource', 'Could not load source.');
            });
        }
        const selectBreakpointBox = this.selectBreakpointBox = this.store.add(new SelectBox(breakpointOptions, index + 1, this.contextViewService, defaultSelectBoxStyles, { ariaLabel: nls.localize('selectBreakpoint', 'Select breakpoint'), useCustomDrawn: !hasNativeContextMenu(this._configurationService) }));
        this.store.add(selectBreakpointBox.onDidSelect(e => {
            if (e.index === 0) {
                this.triggeredByBreakpointInput = undefined;
            }
            else {
                this.triggeredByBreakpointInput = breakpoints[e.index - 1];
            }
        }));
        this.selectBreakpointContainer = $('.select-breakpoint-container');
        this.store.add(dom.addDisposableListener(this.selectBreakpointContainer, dom.EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(9 /* KeyCode.Escape */)) {
                this.close(false);
            }
        }));
        const selectionWrapper = $('.select-box-container');
        dom.append(this.selectBreakpointContainer, selectionWrapper);
        selectBreakpointBox.render(selectionWrapper);
        dom.append(container, this.selectBreakpointContainer);
        const closeButton = new Button(this.selectBreakpointContainer, defaultButtonStyles);
        closeButton.label = nls.localize('ok', "OK");
        this.store.add(closeButton.onDidClick(() => this.close(true)));
        this.store.add(closeButton);
    }
    updateContextInput() {
        if (this.context === 3 /* Context.TRIGGER_POINT */) {
            this.inputContainer.hidden = true;
            this.selectBreakpointContainer.hidden = false;
        }
        else {
            this.inputContainer.hidden = false;
            this.selectBreakpointContainer.hidden = true;
            this.setInputMode();
            const value = this.getInputValue(this.breakpoint);
            this.input.getModel().setValue(value);
            this.focusInput();
        }
    }
    _doLayout(heightInPixel, widthInPixel) {
        this.heightInPx = heightInPixel;
        this.input.layout({ height: heightInPixel, width: widthInPixel - 113 });
        this.centerInputVertically();
    }
    _onWidth(widthInPixel) {
        if (typeof this.heightInPx === 'number') {
            this._doLayout(this.heightInPx, widthInPixel);
        }
    }
    createBreakpointInput(container) {
        const scopedInstatiationService = this.instantiationService.createChild(new ServiceCollection([IPrivateBreakpointWidgetService, this]));
        this.store.add(scopedInstatiationService);
        const options = this.createEditorOptions();
        const codeEditorWidgetOptions = getSimpleCodeEditorWidgetOptions();
        this.input = scopedInstatiationService.createInstance(CodeEditorWidget, container, options, codeEditorWidgetOptions);
        CONTEXT_IN_BREAKPOINT_WIDGET.bindTo(this.input.contextKeyService).set(true);
        const model = this.modelService.createModel('', null, uri.parse(`${DEBUG_SCHEME}:${this.editor.getId()}:breakpointinput`), true);
        if (this.editor.hasModel()) {
            model.setLanguage(this.editor.getModel().getLanguageId());
        }
        this.input.setModel(model);
        this.setInputMode();
        this.store.add(model);
        const setDecorations = () => {
            const value = this.input.getModel().getValue();
            const decorations = !!value ? [] : createDecorations(this.themeService.getColorTheme(), this.placeholder);
            this.input.setDecorationsByType('breakpoint-widget', DECORATION_KEY, decorations);
        };
        this.store.add(this.input.getModel().onDidChangeContent(() => setDecorations()));
        this.store.add(this.themeService.onDidColorThemeChange(() => setDecorations()));
        this.store.add(this.languageFeaturesService.completionProvider.register({ scheme: DEBUG_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'breakpointWidget',
            provideCompletionItems: (model, position, _context, token) => {
                let suggestionsPromise;
                const underlyingModel = this.editor.getModel();
                if (underlyingModel && (this.context === 0 /* Context.CONDITION */ || (this.context === 2 /* Context.LOG_MESSAGE */ && isPositionInCurlyBracketBlock(this.input)))) {
                    suggestionsPromise = provideSuggestionItems(this.languageFeaturesService.completionProvider, underlyingModel, new Position(this.lineNumber, 1), new CompletionOptions(undefined, new Set().add(28 /* CompletionItemKind.Snippet */)), _context, token).then(suggestions => {
                        let overwriteBefore = 0;
                        if (this.context === 0 /* Context.CONDITION */) {
                            overwriteBefore = position.column - 1;
                        }
                        else {
                            // Inside the currly brackets, need to count how many useful characters are behind the position so they would all be taken into account
                            const value = this.input.getModel().getValue();
                            while ((position.column - 2 - overwriteBefore >= 0) && value[position.column - 2 - overwriteBefore] !== '{' && value[position.column - 2 - overwriteBefore] !== ' ') {
                                overwriteBefore++;
                            }
                        }
                        return {
                            suggestions: suggestions.items.map(s => {
                                s.completion.range = Range.fromPositions(position.delta(0, -overwriteBefore), position);
                                return s.completion;
                            })
                        };
                    });
                }
                else {
                    suggestionsPromise = Promise.resolve({ suggestions: [] });
                }
                return suggestionsPromise;
            }
        }));
        this.store.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.fontSize') || e.affectsConfiguration('editor.lineHeight')) {
                this.input.updateOptions(this.createEditorOptions());
                this.centerInputVertically();
            }
        }));
    }
    createEditorOptions() {
        const editorConfig = this._configurationService.getValue('editor');
        const options = getSimpleEditorOptions(this._configurationService);
        options.fontSize = editorConfig.fontSize;
        options.fontFamily = editorConfig.fontFamily;
        options.lineHeight = editorConfig.lineHeight;
        options.fontLigatures = editorConfig.fontLigatures;
        options.ariaLabel = this.placeholder;
        return options;
    }
    centerInputVertically() {
        if (this.container && typeof this.heightInPx === 'number') {
            const lineHeight = this.input.getOption(75 /* EditorOption.lineHeight */);
            const lineNum = this.input.getModel().getLineCount();
            const newTopMargin = (this.heightInPx - lineNum * lineHeight) / 2;
            this.inputContainer.style.marginTop = newTopMargin + 'px';
        }
    }
    close(success) {
        if (success) {
            // if there is already a breakpoint on this location - remove it.
            let condition = undefined;
            let hitCondition = undefined;
            let logMessage = undefined;
            let triggeredBy = undefined;
            let mode = undefined;
            let modeLabel = undefined;
            this.rememberInput();
            if (this.conditionInput || this.context === 0 /* Context.CONDITION */) {
                condition = this.conditionInput;
            }
            if (this.hitCountInput || this.context === 1 /* Context.HIT_COUNT */) {
                hitCondition = this.hitCountInput;
            }
            if (this.logMessageInput || this.context === 2 /* Context.LOG_MESSAGE */) {
                logMessage = this.logMessageInput;
            }
            if (this.selectModeBox) {
                mode = this.modeInput?.mode;
                modeLabel = this.modeInput?.label;
            }
            if (this.context === 3 /* Context.TRIGGER_POINT */) {
                // currently, trigger points don't support additional conditions:
                condition = undefined;
                hitCondition = undefined;
                logMessage = undefined;
                triggeredBy = this.triggeredByBreakpointInput?.getId();
            }
            if (this.breakpoint) {
                const data = new Map();
                data.set(this.breakpoint.getId(), {
                    condition,
                    hitCondition,
                    logMessage,
                    triggeredBy,
                    mode,
                    modeLabel,
                });
                this.debugService.updateBreakpoints(this.breakpoint.originalUri, data, false).then(undefined, onUnexpectedError);
            }
            else {
                const model = this.editor.getModel();
                if (model) {
                    this.debugService.addBreakpoints(model.uri, [{
                            lineNumber: this.lineNumber,
                            column: this.column,
                            enabled: true,
                            condition,
                            hitCondition,
                            logMessage,
                            triggeredBy,
                            mode,
                            modeLabel,
                        }]);
                }
            }
        }
        this.dispose();
    }
    focusInput() {
        if (this.context === 3 /* Context.TRIGGER_POINT */) {
            this.selectBreakpointBox.focus();
        }
        else {
            this.input.focus();
        }
    }
    dispose() {
        super.dispose();
        this.input.dispose();
        lifecycle.dispose(this.store);
        setTimeout(() => this.editor.focus(), 0);
    }
};
BreakpointWidget = __decorate([
    __param(4, IContextViewService),
    __param(5, IDebugService),
    __param(6, IThemeService),
    __param(7, IInstantiationService),
    __param(8, IModelService),
    __param(9, ICodeEditorService),
    __param(10, IConfigurationService),
    __param(11, ILanguageFeaturesService),
    __param(12, IKeybindingService),
    __param(13, ILabelService),
    __param(14, ITextModelService),
    __param(15, IHoverService)
], BreakpointWidget);
export { BreakpointWidget };
class AcceptBreakpointWidgetInputAction extends EditorCommand {
    static { this.ID = 'breakpointWidget.action.acceptInput'; }
    constructor() {
        super({
            id: AcceptBreakpointWidgetInputAction.ID,
            precondition: CONTEXT_BREAKPOINT_WIDGET_VISIBLE,
            kbOpts: {
                kbExpr: CONTEXT_IN_BREAKPOINT_WIDGET,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    runEditorCommand(accessor, editor) {
        accessor.get(IPrivateBreakpointWidgetService).close(true);
    }
}
class CloseBreakpointWidgetCommand extends EditorCommand {
    static { this.ID = 'closeBreakpointWidget'; }
    constructor() {
        super({
            id: CloseBreakpointWidgetCommand.ID,
            precondition: CONTEXT_BREAKPOINT_WIDGET_VISIBLE,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 9 /* KeyCode.Escape */,
                secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    runEditorCommand(accessor, editor, args) {
        const debugContribution = editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID);
        if (debugContribution) {
            // if focus is in outer editor we need to use the debug contribution to close
            return debugContribution.closeBreakpointWidget();
        }
        accessor.get(IPrivateBreakpointWidgetService).close(false);
    }
}
registerEditorCommand(new AcceptBreakpointWidgetInputAction());
registerEditorCommand(new CloseBreakpointWidgetCommand());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2JyZWFrcG9pbnRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFxQixTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFNUQsT0FBTyxFQUFFLGFBQWEsRUFBb0IscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUVwRyxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTdGLE9BQU8sRUFBRSx3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
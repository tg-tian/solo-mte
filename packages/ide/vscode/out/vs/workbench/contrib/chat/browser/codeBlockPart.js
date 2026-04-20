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
import './codeBlockPart.css';
import * as dom from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { DiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../editor/common/config/fontInfo.js';
import { Range } from '../../../../editor/common/core/range.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { TextModelText } from '../../../../editor/common/model/textModelText.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { DefaultModelSHA1Computer } from '../../../../editor/common/services/modelService.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { BracketMatchingController } from '../../../../editor/contrib/bracketMatching/browser/bracketMatching.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { GotoDefinitionAtPositionEditorContribution } from '../../../../editor/contrib/gotoSymbol/browser/link/goToDefinitionAtPosition.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { ViewportSemanticTokensContribution } from '../../../../editor/contrib/semanticTokens/browser/viewportSemanticTokens.js';
import { SmartSelectController } from '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import { WordHighlighterContribution } from '../../../../editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ResourceLabel } from '../../../browser/labels.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { InspectEditorTokensController } from '../../codeEditor/browser/inspectEditorTokens/inspectEditorTokens.js';
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { emptyProgressRunner, IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
const $ = dom.$;
/**
 * Special markdown code block language id used to render a local file.
 *
 * The text of the code path should be a {@link LocalFileCodeBlockData} json object.
 */
export const localFileLanguageId = 'vscode-local-file';
export function parseLocalFileData(text) {
    let data;
    try {
        data = JSON.parse(text);
    }
    catch (e) {
        throw new Error('Could not parse code block local file data');
    }
    let uri;
    try {
        uri = URI.revive(data?.uri);
    }
    catch (e) {
        throw new Error('Invalid code block local file data URI');
    }
    let range;
    if (data.range) {
        // Note that since this is coming from extensions, position are actually zero based and must be converted.
        range = new Range(data.range.startLineNumber + 1, data.range.startColumn + 1, data.range.endLineNumber + 1, data.range.endColumn + 1);
    }
    return { uri, range };
}
const defaultCodeblockPadding = 10;
let CodeBlockPart = class CodeBlockPart extends Disposable {
    get verticalPadding() {
        return this.currentCodeBlockData?.renderOptions?.verticalPadding ?? defaultCodeblockPadding;
    }
    constructor(editorOptions, menuId, delegate, overflowWidgetsDomNode, isSimpleWidget = false, instantiationService, contextKeyService, modelService, configurationService, accessibilityService) {
        super();
        this.editorOptions = editorOptions;
        this.menuId = menuId;
        this.isSimpleWidget = isSimpleWidget;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this.currentScrollWidth = 0;
        this.isDisposed = false;
        this.element = $('.interactive-result-code-block');
        this.resourceContextKey = this._register(instantiationService.createInstance(ResourceContextKey));
        this.contextKeyService = this._register(contextKeyService.createScoped(this.element));
        const scopedInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        const editorElement = dom.append(this.element, $('.interactive-result-editor'));
        this.editor = this.createEditor(scopedInstantiationService, editorElement, {
            ...getSimpleEditorOptions(this.configurationService),
            readOnly: true,
            lineNumbers: 'off',
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            lineDecorationsWidth: 8,
            dragAndDrop: false,
            padding: { top: this.verticalPadding, bottom: this.verticalPadding },
            mouseWheelZoom: false,
            scrollbar: {
                vertical: 'hidden',
                alwaysConsumeMouseWheel: false
            },
            definitionLinkOpensInPeek: false,
            gotoLocation: {
                multiple: 'goto',
                multipleDeclarations: 'goto',
                multipleDefinitions: 'goto',
                multipleImplementations: 'goto',
            },
            ariaLabel: localize('chat.codeBlockHelp', 'Code block'),
            overflowWidgetsDomNode,
            tabFocusMode: true,
            ...this.getEditorOptionsFromConfig(),
        });
        const toolbarElement = dom.append(this.element, $('.interactive-result-code-block-toolbar'));
        const editorScopedService = this.editor.contextKeyService.createScoped(toolbarElement);
        const editorScopedInstantiationService = this._register(scopedInstantiationService.createChild(new ServiceCollection([IContextKeyService, editorScopedService])));
        this.toolbar = this._register(editorScopedInstantiationService.createInstance(MenuWorkbenchToolBar, toolbarElement, menuId, {
            menuOptions: {
                shouldForwardArgs: true
            }
        }));
        const vulnsContainer = dom.append(this.element, $('.interactive-result-vulns'));
        const vulnsHeaderElement = dom.append(vulnsContainer, $('.interactive-result-vulns-header', undefined));
        this.vulnsButton = this._register(new Button(vulnsHeaderElement, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined,
            supportIcons: true
        }));
        this.vulnsListElement = dom.append(vulnsContainer, $('ul.interactive-result-vulns-list'));
        this._register(this.vulnsButton.onDidClick(() => {
            const element = this.currentCodeBlockData.element;
            element.vulnerabilitiesListExpanded = !element.vulnerabilitiesListExpanded;
            this.vulnsButton.label = this.getVulnerabilitiesLabel();
            this.element.classList.toggle('chat-vulnerabilities-collapsed', !element.vulnerabilitiesListExpanded);
            this._onDidChangeContentHeight.fire();
            // this.updateAriaLabel(collapseButton.element, referencesLabel, element.usedReferencesExpanded);
        }));
        this._register(this.toolbar.onDidChangeDropdownVisibility(e => {
            toolbarElement.classList.toggle('force-visibility', e);
        }));
        this._configureForScreenReader();
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this._configureForScreenReader()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectedKeys.has("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                this._configureForScreenReader();
            }
        }));
        this._register(this.editorOptions.onDidChange(() => {
            this.editor.updateOptions(this.getEditorOptionsFromConfig());
        }));
        this._register(this.editor.onDidScrollChange(e => {
            this.currentScrollWidth = e.scrollWidth;
        }));
        this._register(this.editor.onDidContentSizeChange(e => {
            if (e.contentHeightChanged) {
                this._onDidChangeContentHeight.fire();
            }
        }));
        this._register(this.editor.onDidBlurEditorWidget(() => {
            this.element.classList.remove('focused');
            WordHighlighterContribution.get(this.editor)?.stopHighlighting();
            this.clearWidgets();
        }));
        this._register(this.editor.onDidFocusEditorWidget(() => {
            this.element.classList.add('focused');
            WordHighlighterContribution.get(this.editor)?.restoreViewState(true);
        }));
        this._register(Event.any(this.editor.onDidChangeModel, this.editor.onDidChangeModelContent)(() => {
            if (this.currentCodeBlockData) {
                this.updateContexts(this.currentCodeBlockData);
            }
        }));
        // Parent list scrolled
        if (delegate.onDidScroll) {
            this._register(delegate.onDidScroll(e => {
                this.clearWidgets();
            }));
        }
    }
    dispose() {
        this.isDisposed = true;
        super.dispose();
    }
    get uri() {
        return this.editor.getModel()?.uri;
    }
    createEditor(instantiationService, parent, options) {
        return this._register(instantiationService.createInstance(CodeEditorWidget, parent, options, {
            isSimpleWidget: this.isSimpleWidget,
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                MenuPreventer.ID,
                SelectionClipboardContributionID,
                ContextMenuController.ID,
                WordHighlighterContribution.ID,
                ViewportSemanticTokensContribution.ID,
                BracketMatchingController.ID,
                SmartSelectController.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                MessageController.ID,
                GotoDefinitionAtPositionEditorContribution.ID,
                SuggestController.ID,
                SnippetController2.ID,
                ColorDetector.ID,
                LinkDetector.ID,
                InspectEditorTokensController.ID,
            ])
        }));
    }
    focus() {
        this.editor.focus();
    }
    updatePaddingForLayout() {
        // scrollWidth = "the width of the content that needs to be scrolled"
        // contentWidth = "the width of the area where content is displayed"
        const horizontalScrollbarVisible = this.currentScrollWidth > this.editor.getLayoutInfo().contentWidth;
        const scrollbarHeight = this.editor.getLayoutInfo().horizontalScrollbarHeight;
        const bottomPadding = horizontalScrollbarVisible ?
            Math.max(this.verticalPadding - scrollbarHeight, 2) :
            this.verticalPadding;
        this.editor.updateOptions({ padding: { top: this.verticalPadding, bottom: bottomPadding } });
    }
    _configureForScreenReader() {
        const toolbarElt = this.toolbar.getElement();
        if (this.accessibilityService.isScreenReaderOptimized()) {
            toolbarElt.style.display = 'block';
        }
        else {
            toolbarElt.style.display = '';
        }
    }
    getEditorOptionsFromConfig() {
        return {
            wordWrap: this.editorOptions.configuration.resultEditor.wordWrap,
            fontLigatures: this.editorOptions.configuration.resultEditor.fontLigatures,
            bracketPairColorization: this.editorOptions.configuration.resultEditor.bracketPairColorization,
            fontFamily: this.editorOptions.configuration.resultEditor.fontFamily === 'default' ?
                EDITOR_FONT_DEFAULTS.fontFamily :
                this.editorOptions.configuration.resultEditor.fontFamily,
            fontSize: this.editorOptions.configuration.resultEditor.fontSize,
            fontWeight: this.editorOptions.configuration.resultEditor.fontWeight,
            lineHeight: this.editorOptions.configuration.resultEditor.lineHeight,
            ...this.currentCodeBlockData?.renderOptions?.editorOptions,
        };
    }
    layout(width) {
        const contentHeight = this.getContentHeight();
        let height = contentHeight;
        if (this.currentCodeBlockData?.renderOptions?.maxHeightInLines) {
            height = Math.min(contentHeight, this.editor.getOption(75 /* EditorOption.lineHeight */) * this.currentCodeBlockData?.renderOptions?.maxHeightInLines);
        }
        const editorBorder = 2;
        width = width - editorBorder - (this.currentCodeBlockData?.renderOptions?.reserveWidth ?? 0);
        this.editor.layout({ width: isRequestVM(this.currentCodeBlockData?.element) ? width * 0.9 : width, height });
        this.updatePaddingForLayout();
    }
    getContentHeight() {
        if (this.currentCodeBlockData?.range) {
            const lineCount = this.currentCodeBlockData.range.endLineNumber - this.currentCodeBlockData.range.startLineNumber + 1;
            const lineHeight = this.editor.getOption(75 /* EditorOption.lineHeight */);
            return lineCount * lineHeight;
        }
        return this.editor.getContentHeight();
    }
    async render(data, width) {
        this.currentCodeBlockData = data;
        if (data.parentContextKeyService) {
            this.contextKeyService.updateParent(data.parentContextKeyService);
        }
        if (this.getEditorOptionsFromConfig().wordWrap === 'on') {
            // Initialize the editor with the new proper width so that getContentHeight
            // will be computed correctly in the next call to layout()
            this.layout(width);
        }
        const didUpdate = await this.updateEditor(data);
        if (!didUpdate || this.isDisposed || this.currentCodeBlockData !== data) {
            return;
        }
        this.editor.updateOptions({
            ...this.getEditorOptionsFromConfig(),
        });
        if (!this.editor.getOption(8 /* EditorOption.ariaLabel */)) {
            // Don't override the ariaLabel if it was set by the editor options
            this.editor.updateOptions({
                ariaLabel: localize('chat.codeBlockLabel', "Code block {0}", data.codeBlockIndex + 1),
            });
        }
        this.layout(width);
        this.toolbar.setAriaLabel(localize('chat.codeBlockToolbarLabel', "Code block {0}", data.codeBlockIndex + 1));
        if (data.renderOptions?.hideToolbar) {
            dom.hide(this.toolbar.getElement());
        }
        else {
            dom.show(this.toolbar.getElement());
        }
        if (data.vulns?.length && isResponseVM(data.element)) {
            dom.clearNode(this.vulnsListElement);
            this.element.classList.remove('no-vulns');
            this.element.classList.toggle('chat-vulnerabilities-collapsed', !data.element.vulnerabilitiesListExpanded);
            dom.append(this.vulnsListElement, ...data.vulns.map(v => $('li', undefined, $('span.chat-vuln-title', undefined, v.title), ' ' + v.description)));
            this.vulnsButton.label = this.getVulnerabilitiesLabel();
        }
        else {
            this.element.classList.add('no-vulns');
        }
        this._onDidChangeContentHeight.fire();
    }
    reset() {
        this.clearWidgets();
        this.currentCodeBlockData = undefined;
    }
    clearWidgets() {
        ContentHoverController.get(this.editor)?.hideContentHover();
        GlyphHoverController.get(this.editor)?.hideGlyphHover();
    }
    async updateEditor(data) {
        const textModel = await data.textModel;
        if (this.isDisposed || this.currentCodeBlockData !== data || !textModel || textModel.isDisposed()) {
            return false;
        }
        this.editor.setModel(textModel);
        if (data.range) {
            this.editor.setSelection(data.range);
            this.editor.revealRangeInCenter(data.range, 1 /* ScrollType.Immediate */);
        }
        this.updateContexts(data);
        return true;
    }
    getVulnerabilitiesLabel() {
        if (!this.currentCodeBlockData || !this.currentCodeBlockData.vulns) {
            return '';
        }
        const referencesLabel = this.currentCodeBlockData.vulns.length > 1 ?
            localize('vulnerabilitiesPlural', "{0} vulnerabilities", this.currentCodeBlockData.vulns.length) :
            localize('vulnerabilitiesSingular', "{0} vulnerability", 1);
        const icon = (element) => element.vulnerabilitiesListExpanded ? Codicon.chevronDown : Codicon.chevronRight;
        return `${referencesLabel} $(${icon(this.currentCodeBlockData.element).id})`;
    }
    updateContexts(data) {
        const textModel = this.editor.getModel();
        if (!textModel) {
            return;
        }
        this.toolbar.context = {
            code: textModel.getTextBuffer().getValueInRange(data.range ?? textModel.getFullModelRange(), 0 /* EndOfLinePreference.TextDefined */),
            codeBlockIndex: data.codeBlockIndex,
            element: data.element,
            languageId: textModel.getLanguageId(),
            codemapperUri: data.codemapperUri,
            chatSessionResource: data.chatSessionResource
        };
        this.resourceContextKey.set(textModel.uri);
    }
};
CodeBlockPart = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IModelService),
    __param(8, IConfigurationService),
    __param(9, IAccessibilityService)
], CodeBlockPart);
export { CodeBlockPart };
let ChatCodeBlockContentProvider = class ChatCodeBlockContentProvider extends Disposable {
    constructor(textModelService, _modelService) {
        super();
        this._modelService = _modelService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.vscodeChatCodeBlock, this));
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        return this._modelService.createModel('', null, resource);
    }
};
ChatCodeBlockContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], ChatCodeBlockContentProvider);
export { ChatCodeBlockContentProvider };
// long-lived object that sits in the DiffPool and that gets reused
let CodeCompareBlockPart = class CodeCompareBlockPart extends Disposable {
    constructor(options, menuId, delegate, overflowWidgetsDomNode, isSimpleWidget = false, instantiationService, contextKeyService, modelService, configurationService, accessibilityService, labelService, openerService) {
        super();
        this.options = options;
        this.menuId = menuId;
        this.isSimpleWidget = isSimpleWidget;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.labelService = labelService;
        this.openerService = openerService;
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this._lastDiffEditorViewModel = this._store.add(new MutableDisposable());
        this.currentScrollWidth = 0;
        this.currentHorizontalPadding = 0;
        this.element = $('.interactive-result-code-block');
        this.element.classList.add('compare');
        this.messageElement = dom.append(this.element, $('.message'));
        this.messageElement.setAttribute('role', 'status');
        this.messageElement.tabIndex = 0;
        this.contextKeyService = this._register(contextKeyService.createScoped(this.element));
        const scopedInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService], [IEditorProgressService, new class {
                show(_total, _delay) {
                    return emptyProgressRunner;
                }
                async showWhile(promise, _delay) {
                    await promise;
                }
            }])));
        const editorHeader = this.editorHeader = dom.append(this.element, $('.interactive-result-header.show-file-icons'));
        const editorElement = dom.append(this.element, $('.interactive-result-editor'));
        this.diffEditor = this.createDiffEditor(scopedInstantiationService, editorElement, {
            ...getSimpleEditorOptions(this.configurationService),
            lineNumbers: 'on',
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            lineDecorationsWidth: 12,
            dragAndDrop: false,
            padding: { top: defaultCodeblockPadding, bottom: defaultCodeblockPadding },
            mouseWheelZoom: false,
            scrollbar: {
                vertical: 'hidden',
                alwaysConsumeMouseWheel: false
            },
            definitionLinkOpensInPeek: false,
            gotoLocation: {
                multiple: 'goto',
                multipleDeclarations: 'goto',
                multipleDefinitions: 'goto',
                multipleImplementations: 'goto',
            },
            ariaLabel: localize('chat.codeBlockHelp', 'Code block'),
            overflowWidgetsDomNode,
            ...this.getEditorOptionsFromConfig(),
        });
        this.resourceLabel = this._register(scopedInstantiationService.createInstance(ResourceLabel, editorHeader, { supportIcons: true }));
        const editorScopedService = this.diffEditor.getModifiedEditor().contextKeyService.createScoped(editorHeader);
        const editorScopedInstantiationService = this._register(scopedInstantiationService.createChild(new ServiceCollection([IContextKeyService, editorScopedService])));
        this.toolbar = this._register(editorScopedInstantiationService.createInstance(MenuWorkbenchToolBar, editorHeader, menuId, {
            menuOptions: {
                shouldForwardArgs: true
            }
        }));
        this._configureForScreenReader();
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this._configureForScreenReader()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectedKeys.has("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                this._configureForScreenReader();
            }
        }));
        this._register(this.options.onDidChange(() => {
            this.diffEditor.updateOptions(this.getEditorOptionsFromConfig());
        }));
        this._register(this.diffEditor.getModifiedEditor().onDidScrollChange(e => {
            this.currentScrollWidth = e.scrollWidth;
        }));
        this._register(this.diffEditor.onDidContentSizeChange(e => {
            if (e.contentHeightChanged) {
                this._onDidChangeContentHeight.fire();
            }
        }));
        this._register(this.diffEditor.getModifiedEditor().onDidBlurEditorWidget(() => {
            this.element.classList.remove('focused');
            WordHighlighterContribution.get(this.diffEditor.getModifiedEditor())?.stopHighlighting();
            this.clearWidgets();
        }));
        this._register(this.diffEditor.getModifiedEditor().onDidFocusEditorWidget(() => {
            this.element.classList.add('focused');
            WordHighlighterContribution.get(this.diffEditor.getModifiedEditor())?.restoreViewState(true);
        }));
        // Parent list scrolled
        if (delegate.onDidScroll) {
            this._register(delegate.onDidScroll(e => {
                this.clearWidgets();
            }));
        }
    }
    get uri() {
        return this.diffEditor.getModifiedEditor().getModel()?.uri;
    }
    createDiffEditor(instantiationService, parent, options) {
        const widgetOptions = {
            isSimpleWidget: this.isSimpleWidget,
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                MenuPreventer.ID,
                SelectionClipboardContributionID,
                ContextMenuController.ID,
                WordHighlighterContribution.ID,
                ViewportSemanticTokensContribution.ID,
                BracketMatchingController.ID,
                SmartSelectController.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                GotoDefinitionAtPositionEditorContribution.ID,
            ])
        };
        return this._register(instantiationService.createInstance(DiffEditorWidget, parent, {
            scrollbar: { useShadows: false, alwaysConsumeMouseWheel: false, ignoreHorizontalScrollbarInContentHeight: true, },
            renderMarginRevertIcon: false,
            diffCodeLens: false,
            scrollBeyondLastLine: false,
            stickyScroll: { enabled: false },
            originalAriaLabel: localize('original', 'Original'),
            modifiedAriaLabel: localize('modified', 'Modified'),
            diffAlgorithm: 'advanced',
            readOnly: false,
            isInEmbeddedEditor: true,
            useInlineViewWhenSpaceIsLimited: true,
            experimental: {
                useTrueInlineView: true,
            },
            renderSideBySideInlineBreakpoint: 300,
            renderOverviewRuler: false,
            compactMode: true,
            hideUnchangedRegions: { enabled: true, contextLineCount: 1 },
            renderGutterMenu: false,
            lineNumbersMinChars: 1,
            ...options
        }, { originalEditor: widgetOptions, modifiedEditor: widgetOptions }));
    }
    focus() {
        this.diffEditor.focus();
    }
    updatePaddingForLayout() {
        // scrollWidth = "the width of the content that needs to be scrolled"
        // contentWidth = "the width of the area where content is displayed"
        const horizontalScrollbarVisible = this.currentScrollWidth > this.diffEditor.getModifiedEditor().getLayoutInfo().contentWidth;
        const scrollbarHeight = this.diffEditor.getModifiedEditor().getLayoutInfo().horizontalScrollbarHeight;
        const bottomPadding = horizontalScrollbarVisible ?
            Math.max(defaultCodeblockPadding - scrollbarHeight, 2) :
            defaultCodeblockPadding;
        this.diffEditor.updateOptions({ padding: { top: defaultCodeblockPadding, bottom: bottomPadding } });
    }
    _configureForScreenReader() {
        const toolbarElt = this.toolbar.getElement();
        if (this.accessibilityService.isScreenReaderOptimized()) {
            toolbarElt.style.display = 'block';
            toolbarElt.ariaLabel = localize('chat.codeBlock.toolbar', 'Code block toolbar');
        }
        else {
            toolbarElt.style.display = '';
        }
    }
    getEditorOptionsFromConfig() {
        return {
            wordWrap: this.options.configuration.resultEditor.wordWrap,
            fontLigatures: this.options.configuration.resultEditor.fontLigatures,
            bracketPairColorization: this.options.configuration.resultEditor.bracketPairColorization,
            fontFamily: this.options.configuration.resultEditor.fontFamily === 'default' ?
                EDITOR_FONT_DEFAULTS.fontFamily :
                this.options.configuration.resultEditor.fontFamily,
            fontSize: this.options.configuration.resultEditor.fontSize,
            fontWeight: this.options.configuration.resultEditor.fontWeight,
            lineHeight: this.options.configuration.resultEditor.lineHeight,
        };
    }
    layout(width) {
        const editorBorder = 2;
        const toolbar = dom.getTotalHeight(this.editorHeader);
        const content = this.diffEditor.getModel()
            ? this.diffEditor.getContentHeight()
            : dom.getTotalHeight(this.messageElement);
        const dimension = new dom.Dimension(width - editorBorder - this.currentHorizontalPadding * 2, toolbar + content);
        this.element.style.height = `${dimension.height}px`;
        this.element.style.width = `${dimension.width}px`;
        this.diffEditor.layout(dimension.with(undefined, content - editorBorder));
        this.updatePaddingForLayout();
    }
    async render(data, width, token) {
        this.currentHorizontalPadding = data.horizontalPadding || 0;
        if (data.parentContextKeyService) {
            this.contextKeyService.updateParent(data.parentContextKeyService);
        }
        if (this.options.configuration.resultEditor.wordWrap === 'on') {
            // Initialize the editor with the new proper width so that getContentHeight
            // will be computed correctly in the next call to layout()
            this.layout(width);
        }
        await this.updateEditor(data, token);
        this.layout(width);
        this.diffEditor.updateOptions({
            ariaLabel: localize('chat.compareCodeBlockLabel', "Code Edits"),
            readOnly: !!data.isReadOnly,
        });
        this.resourceLabel.element.setFile(data.edit.uri, {
            fileKind: FileKind.FILE,
            fileDecorations: { colors: true, badges: false }
        });
        this._onDidChangeContentHeight.fire();
    }
    reset() {
        this.clearWidgets();
    }
    clearWidgets() {
        ContentHoverController.get(this.diffEditor.getOriginalEditor())?.hideContentHover();
        ContentHoverController.get(this.diffEditor.getModifiedEditor())?.hideContentHover();
        GlyphHoverController.get(this.diffEditor.getOriginalEditor())?.hideGlyphHover();
        GlyphHoverController.get(this.diffEditor.getModifiedEditor())?.hideGlyphHover();
    }
    async updateEditor(data, token) {
        if (!isResponseVM(data.element)) {
            return;
        }
        const isEditApplied = Boolean(data.edit.state?.applied ?? 0);
        ChatContextKeys.editApplied.bindTo(this.contextKeyService).set(isEditApplied);
        this.element.classList.toggle('no-diff', isEditApplied);
        if (isEditApplied) {
            assertType(data.edit.state?.applied);
            const uriLabel = this.labelService.getUriLabel(data.edit.uri, { relative: true, noPrefix: true });
            let template;
            if (data.edit.state.applied === 1) {
                template = localize('chat.edits.1', "Applied 1 change in [[``{0}``]]", uriLabel);
            }
            else if (data.edit.state.applied < 0) {
                template = localize('chat.edits.rejected', "Edits in [[``{0}``]] have been rejected", uriLabel);
            }
            else {
                template = localize('chat.edits.N', "Applied {0} changes in [[``{1}``]]", data.edit.state.applied, uriLabel);
            }
            const message = renderFormattedText(template, {
                renderCodeSegments: true,
                actionHandler: {
                    callback: () => {
                        this.openerService.open(data.edit.uri, { fromUserGesture: true, allowCommands: false });
                    },
                    disposables: this._store,
                }
            });
            dom.reset(this.messageElement, message);
        }
        const diffData = await data.diffData;
        if (!isEditApplied && diffData) {
            const viewModel = this.diffEditor.createViewModel({
                original: diffData.original,
                modified: diffData.modified
            });
            await viewModel.waitForDiff();
            if (token.isCancellationRequested) {
                return;
            }
            const listener = Event.any(diffData.original.onWillDispose, diffData.modified.onWillDispose)(() => {
                // this a bit weird and basically duplicates https://github.com/microsoft/vscode/blob/7cbcafcbcc88298cfdcd0238018fbbba8eb6853e/src/vs/editor/browser/widget/diffEditor/diffEditorWidget.ts#L328
                // which cannot call `setModel(null)` without first complaining
                this.diffEditor.setModel(null);
            });
            this.diffEditor.setModel(viewModel);
            this._lastDiffEditorViewModel.value = combinedDisposable(listener, viewModel);
        }
        else {
            this.diffEditor.setModel(null);
            this._lastDiffEditorViewModel.value = undefined;
            this._onDidChangeContentHeight.fire();
        }
        this.toolbar.context = {
            edit: data.edit,
            element: data.element,
            diffEditor: this.diffEditor,
        };
    }
};
CodeCompareBlockPart = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IModelService),
    __param(8, IConfigurationService),
    __param(9, IAccessibilityService),
    __param(10, ILabelService),
    __param(11, IOpenerService)
], CodeCompareBlockPart);
export { CodeCompareBlockPart };
let DefaultChatTextEditor = class DefaultChatTextEditor {
    constructor(modelService, editorService, dialogService) {
        this.modelService = modelService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this._sha1 = new DefaultModelSHA1Computer();
    }
    async apply(response, item, diffEditor) {
        if (!response.response.value.includes(item)) {
            // bogous item
            return;
        }
        if (item.state?.applied) {
            // already applied
            return;
        }
        if (!diffEditor) {
            for (const candidate of this.editorService.listDiffEditors()) {
                if (!candidate.getContainerDomNode().isConnected) {
                    continue;
                }
                const model = candidate.getModel();
                if (!model || !isEqual(model.original.uri, item.uri) || model.modified.uri.scheme !== Schemas.vscodeChatCodeCompareBlock) {
                    diffEditor = candidate;
                    break;
                }
            }
        }
        const edits = diffEditor
            ? await this._applyWithDiffEditor(diffEditor, item)
            : await this._apply(item);
        response.setEditApplied(item, edits);
    }
    async _applyWithDiffEditor(diffEditor, item) {
        const model = diffEditor.getModel();
        if (!model) {
            return 0;
        }
        const diff = diffEditor.getDiffComputationResult();
        if (!diff || diff.identical) {
            return 0;
        }
        if (!await this._checkSha1(model.original, item)) {
            return 0;
        }
        const modified = new TextModelText(model.modified);
        const edits = diff.changes2.map(i => i.toRangeMapping().toTextEdit(modified).toSingleEditOperation());
        model.original.pushStackElement();
        model.original.pushEditOperations(null, edits, () => null);
        model.original.pushStackElement();
        return edits.length;
    }
    async _apply(item) {
        const ref = await this.modelService.createModelReference(item.uri);
        try {
            if (!await this._checkSha1(ref.object.textEditorModel, item)) {
                return 0;
            }
            ref.object.textEditorModel.pushStackElement();
            let total = 0;
            for (const group of item.edits) {
                const edits = group.map(TextEdit.asEditOperation);
                ref.object.textEditorModel.pushEditOperations(null, edits, () => null);
                total += edits.length;
            }
            ref.object.textEditorModel.pushStackElement();
            return total;
        }
        finally {
            ref.dispose();
        }
    }
    async _checkSha1(model, item) {
        if (item.state?.sha1 && this._sha1.computeSHA1(model) && this._sha1.computeSHA1(model) !== item.state.sha1) {
            const result = await this.dialogService.confirm({
                message: localize('interactive.compare.apply.confirm', "The original file has been modified."),
                detail: localize('interactive.compare.apply.confirm.detail', "Do you want to apply the changes anyway?"),
            });
            if (!result.confirmed) {
                return false;
            }
        }
        return true;
    }
    discard(response, item) {
        if (!response.response.value.includes(item)) {
            // bogous item
            return;
        }
        if (item.state?.applied) {
            // already applied
            return;
        }
        response.setEditApplied(item, -1);
    }
};
DefaultChatTextEditor = __decorate([
    __param(0, ITextModelService),
    __param(1, ICodeEditorService),
    __param(2, IDialogService)
], DefaultChatTextEditor);
export { DefaultChatTextEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29kZUJsb2NrUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHFCQUFxQixDQUFDO0FBRTdCLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBR3BFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNEIsTUFBTSxrRUFBa0UsQ0FBQztBQUM5SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUVwRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUM1SSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUM1RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN4RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDakksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDcEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUUvRCxPQUFPLEVBQTBCLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUkvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV0RyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBc0JoQjs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsbUJBQW1CLENBQUM7QUFHdkQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVk7SUFPOUMsSUFBSSxJQUErQixDQUFDO0lBQ3BDLElBQUksQ0FBQztRQUNKLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxJQUFJLEdBQVEsQ0FBQztJQUNiLElBQUksQ0FBQztRQUNKLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxLQUF5QixDQUFDO0lBQzlCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hCLDBHQUEwRztRQUMxRyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdkksQ0FBQztJQUVELE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUM7QUFDdkIsQ0FBQztBQW9CRCxNQUFNLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztBQUM1QixJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFjLFNBQVEsVUFBVTtJQW9CNUMsSUFBWSxlQUFlO1FBQzFCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxlQUFlLElBQUksdUJBQXVCLENBQUM7SUFDN0YsQ0FBQztJQUVELFlBQ2tCLGFBQWdDLEVBQ3hDLE1BQWMsRUFDdkIsUUFBK0IsRUFDL0Isc0JBQStDLEVBQzlCLGlCQUEwQixLQUFLLEVBQ3pCLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDMUMsWUFBOEMsRUFDdEMsb0JBQTRELEVBQzVELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQVhTLGtCQUFhLEdBQWIsYUFBYSxDQUFtQjtRQUN4QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBR04sbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBR2QsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDckIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBakNqRSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNuRSw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBWXhFLHVCQUFrQixHQUFHLENBQUMsQ0FBQztRQUV2QixlQUFVLEdBQUcsS0FBSyxDQUFDO1FBcUIxQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBRW5ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pKLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxhQUFhLEVBQUU7WUFDMUUsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7WUFDcEQsUUFBUSxFQUFFLElBQUk7WUFDZCxXQUFXLEVBQUUsS0FBSztZQUNsQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG9CQUFvQixFQUFFLEtBQUs7WUFDM0Isb0JBQW9CLEVBQUUsQ0FBQztZQUN2QixXQUFXLEVBQUUsS0FBSztZQUNsQixPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNwRSxjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUU7Z0JBQ1YsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLHVCQUF1QixFQUFFLEtBQUs7YUFDOUI7WUFDRCx5QkFBeUIsRUFBRSxLQUFLO1lBQ2hDLFlBQVksRUFBRTtnQkFDYixRQUFRLEVBQUUsTUFBTTtnQkFDaEIsb0JBQW9CLEVBQUUsTUFBTTtnQkFDNUIsbUJBQW1CLEVBQUUsTUFBTTtnQkFDM0IsdUJBQXVCLEVBQUUsTUFBTTthQUMvQjtZQUNELFNBQVMsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDO1lBQ3ZELHNCQUFzQjtZQUN0QixZQUFZLEVBQUUsSUFBSTtZQUNsQixHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRTtTQUNwQyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQztRQUM3RixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEssSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFO1lBQzNILFdBQVcsRUFBRTtnQkFDWixpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztRQUNoRixNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxrQ0FBa0MsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtZQUNoRSxnQkFBZ0IsRUFBRSxTQUFTO1lBQzNCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLGdCQUFnQixFQUFFLFNBQVM7WUFDM0IscUJBQXFCLEVBQUUsU0FBUztZQUNoQyx5QkFBeUIsRUFBRSxTQUFTO1lBQ3BDLHlCQUF5QixFQUFFLFNBQVM7WUFDcEMsOEJBQThCLEVBQUUsU0FBUztZQUN6QyxlQUFlLEVBQUUsU0FBUztZQUMxQixZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO1FBRTFGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQy9DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBcUIsQ0FBQyxPQUFpQyxDQUFDO1lBQzdFLE9BQU8sQ0FBQywyQkFBMkIsR0FBRyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztZQUMzRSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUN0RyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEMsaUdBQWlHO1FBQ2xHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDN0QsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZFLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdGQUFzQyxFQUFFLENBQUM7Z0JBQzlELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUNyRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2pFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRTtZQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUNuQyxDQUFDLEdBQUcsRUFBRTtZQUNOLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDaEQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSix1QkFBdUI7UUFDdkIsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQztJQUNwQyxDQUFDO0lBRU8sWUFBWSxDQUFDLG9CQUEyQyxFQUFFLE1BQW1CLEVBQUUsT0FBNkM7UUFDbkksT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFO1lBQzVGLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNuQyxhQUFhLEVBQUUsd0JBQXdCLENBQUMsMEJBQTBCLENBQUM7Z0JBQ2xFLGFBQWEsQ0FBQyxFQUFFO2dCQUNoQixnQ0FBZ0M7Z0JBQ2hDLHFCQUFxQixDQUFDLEVBQUU7Z0JBRXhCLDJCQUEyQixDQUFDLEVBQUU7Z0JBQzlCLGtDQUFrQyxDQUFDLEVBQUU7Z0JBQ3JDLHlCQUF5QixDQUFDLEVBQUU7Z0JBQzVCLHFCQUFxQixDQUFDLEVBQUU7Z0JBQ3hCLHNCQUFzQixDQUFDLEVBQUU7Z0JBQ3pCLG9CQUFvQixDQUFDLEVBQUU7Z0JBQ3ZCLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ3BCLDBDQUEwQyxDQUFDLEVBQUU7Z0JBQzdDLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ3BCLGtCQUFrQixDQUFDLEVBQUU7Z0JBQ3JCLGFBQWEsQ0FBQyxFQUFFO2dCQUNoQixZQUFZLENBQUMsRUFBRTtnQkFFZiw2QkFBNkIsQ0FBQyxFQUFFO2FBQ2hDLENBQUM7U0FDRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLHFFQUFxRTtRQUNyRSxvRUFBb0U7UUFDcEUsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDdEcsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQztRQUM5RSxNQUFNLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsZUFBZSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM5RixDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDN0MsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQ3pELFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUNwQyxDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxPQUFPO1lBQ04sUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRO1lBQ2hFLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYTtZQUMxRSx1QkFBdUIsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsdUJBQXVCO1lBQzlGLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNuRixvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVU7WUFDekQsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRO1lBQ2hFLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVTtZQUNwRSxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVU7WUFDcEUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLGFBQWE7U0FDMUQsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYTtRQUNuQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUU5QyxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUM7UUFDM0IsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLENBQUM7WUFDaEUsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxrQ0FBeUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDL0ksQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztRQUN2QixLQUFLLEdBQUcsS0FBSyxHQUFHLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdGLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzdHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1lBQ3RILE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQztZQUNsRSxPQUFPLFNBQVMsR0FBRyxVQUFVLENBQUM7UUFDL0IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQW9CLEVBQUUsS0FBYTtRQUMvQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDekQsMkVBQTJFO1lBQzNFLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6RSxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1lBQ3pCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixFQUFFO1NBQ3BDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsZ0NBQXdCLEVBQUUsQ0FBQztZQUNwRCxtRUFBbUU7WUFDbkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUM7Z0JBQ3pCLFNBQVMsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7YUFDckYsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDckMsQ0FBQzthQUFNLENBQUM7WUFDUCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQzNHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsSixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUN6RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLENBQUM7SUFDdkMsQ0FBQztJQUVPLFlBQVk7UUFDbkIsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVELG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxFQUFFLENBQUM7SUFDekQsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBb0I7UUFDOUMsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEtBQUssSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ25HLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLCtCQUF1QixDQUFDO1FBQ25FLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BFLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ25FLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbEcsUUFBUSxDQUFDLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBK0IsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQ25JLE9BQU8sR0FBRyxlQUFlLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFpQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7SUFDeEcsQ0FBQztJQUVPLGNBQWMsQ0FBQyxJQUFvQjtRQUMxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHO1lBQ3RCLElBQUksRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksU0FBUyxDQUFDLGlCQUFpQixFQUFFLDBDQUFrQztZQUM3SCxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFVBQVUsRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFO1lBQ3JDLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsbUJBQW1CO1NBQ1gsQ0FBQztRQUNwQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0QsQ0FBQTtBQWpXWSxhQUFhO0lBOEJ2QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FsQ1gsYUFBYSxDQWlXekI7O0FBRU0sSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBRTNELFlBQ29CLGdCQUFtQyxFQUN0QixhQUE0QjtRQUU1RCxLQUFLLEVBQUUsQ0FBQztRQUZ3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUc1RCxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0QsQ0FBQTtBQWpCWSw0QkFBNEI7SUFHdEMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtHQUpILDRCQUE0QixDQWlCeEM7O0FBK0JELG1FQUFtRTtBQUM1RCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFnQm5ELFlBQ2tCLE9BQTBCLEVBQ2xDLE1BQWMsRUFDdkIsUUFBK0IsRUFDL0Isc0JBQStDLEVBQzlCLGlCQUEwQixLQUFLLEVBQ3pCLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDMUMsWUFBOEMsRUFDdEMsb0JBQTRELEVBQzVELG9CQUE0RCxFQUNwRSxZQUE0QyxFQUMzQyxhQUE4QztRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQWJTLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBQ2xDLFdBQU0sR0FBTixNQUFNLENBQVE7UUFHTixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFHZCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNyQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDMUIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBM0I1Qyw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNuRSw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBVS9ELDZCQUF3QixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLHVCQUFrQixHQUFHLENBQUMsQ0FBQztRQUN2Qiw2QkFBd0IsR0FBRyxDQUFDLENBQUM7UUFpQnBDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFFakMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxpQkFBaUIsQ0FDdkcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFDNUMsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJO2dCQUU1QixJQUFJLENBQUMsTUFBZSxFQUFFLE1BQWdCO29CQUNyQyxPQUFPLG1CQUFtQixDQUFDO2dCQUM1QixDQUFDO2dCQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBeUIsRUFBRSxNQUFlO29CQUN6RCxNQUFNLE9BQU8sQ0FBQztnQkFDZixDQUFDO2FBQ0QsQ0FBQyxDQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLDRDQUE0QyxDQUFDLENBQUMsQ0FBQztRQUNuSCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsRUFBRSxhQUFhLEVBQUU7WUFDbEYsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7WUFDcEQsV0FBVyxFQUFFLElBQUk7WUFDakIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLG9CQUFvQixFQUFFLEVBQUU7WUFDeEIsV0FBVyxFQUFFLEtBQUs7WUFDbEIsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRTtZQUMxRSxjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUU7Z0JBQ1YsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLHVCQUF1QixFQUFFLEtBQUs7YUFDOUI7WUFDRCx5QkFBeUIsRUFBRSxLQUFLO1lBQ2hDLFlBQVksRUFBRTtnQkFDYixRQUFRLEVBQUUsTUFBTTtnQkFDaEIsb0JBQW9CLEVBQUUsTUFBTTtnQkFDNUIsbUJBQW1CLEVBQUUsTUFBTTtnQkFDM0IsdUJBQXVCLEVBQUUsTUFBTTthQUMvQjtZQUNELFNBQVMsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDO1lBQ3ZELHNCQUFzQjtZQUN0QixHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRTtTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBJLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RyxNQUFNLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xLLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRTtZQUN6SCxXQUFXLEVBQUU7Z0JBQ1osaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25ILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdkUsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsZ0ZBQXNDLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDbEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4RSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pELElBQUksQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUM3RSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUM7WUFDekYsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBR0osdUJBQXVCO1FBQ3ZCLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQztJQUM1RCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsb0JBQTJDLEVBQUUsTUFBbUIsRUFBRSxPQUE2QztRQUN2SSxNQUFNLGFBQWEsR0FBNkI7WUFDL0MsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSx3QkFBd0IsQ0FBQywwQkFBMEIsQ0FBQztnQkFDbEUsYUFBYSxDQUFDLEVBQUU7Z0JBQ2hCLGdDQUFnQztnQkFDaEMscUJBQXFCLENBQUMsRUFBRTtnQkFFeEIsMkJBQTJCLENBQUMsRUFBRTtnQkFDOUIsa0NBQWtDLENBQUMsRUFBRTtnQkFDckMseUJBQXlCLENBQUMsRUFBRTtnQkFDNUIscUJBQXFCLENBQUMsRUFBRTtnQkFDeEIsc0JBQXNCLENBQUMsRUFBRTtnQkFDekIsb0JBQW9CLENBQUMsRUFBRTtnQkFDdkIsMENBQTBDLENBQUMsRUFBRTthQUM3QyxDQUFDO1NBQ0YsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFO1lBQ25GLFNBQVMsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsS0FBSyxFQUFFLHdDQUF3QyxFQUFFLElBQUksR0FBRztZQUNqSCxzQkFBc0IsRUFBRSxLQUFLO1lBQzdCLFlBQVksRUFBRSxLQUFLO1lBQ25CLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsWUFBWSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtZQUNoQyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztZQUNuRCxpQkFBaUIsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztZQUNuRCxhQUFhLEVBQUUsVUFBVTtZQUN6QixRQUFRLEVBQUUsS0FBSztZQUNmLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsK0JBQStCLEVBQUUsSUFBSTtZQUNyQyxZQUFZLEVBQUU7Z0JBQ2IsaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtZQUNELGdDQUFnQyxFQUFFLEdBQUc7WUFDckMsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixXQUFXLEVBQUUsSUFBSTtZQUNqQixvQkFBb0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFO1lBQzVELGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QixHQUFHLE9BQU87U0FDVixFQUFFLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLHFFQUFxRTtRQUNyRSxvRUFBb0U7UUFDcEUsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDLFlBQVksQ0FBQztRQUM5SCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUMsYUFBYSxFQUFFLENBQUMseUJBQXlCLENBQUM7UUFDdEcsTUFBTSxhQUFhLEdBQUcsMEJBQTBCLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsR0FBRyxDQUFDLHVCQUF1QixHQUFHLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELHVCQUF1QixDQUFDO1FBQ3pCLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzdDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZQUN6RCxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDbkMsVUFBVSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNqRixDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxPQUFPO1lBQ04sUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRO1lBQzFELGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYTtZQUNwRSx1QkFBdUIsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsdUJBQXVCO1lBQ3hGLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RSxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVU7WUFDbkQsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRO1lBQzFELFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVTtZQUM5RCxVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVU7U0FDOUQsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYTtRQUNuQixNQUFNLFlBQVksR0FBRyxDQUFDLENBQUM7UUFFdkIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDekMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7WUFDcEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBQ2pILElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQztRQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxTQUFTLENBQUMsS0FBSyxJQUFJLENBQUM7UUFDbEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUdELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBMkIsRUFBRSxLQUFhLEVBQUUsS0FBd0I7UUFDaEYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLENBQUM7UUFFNUQsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0QsMkVBQTJFO1lBQzNFLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDN0IsU0FBUyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxZQUFZLENBQUM7WUFDL0QsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVTtTQUMzQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDakQsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1lBQ3ZCLGVBQWUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtTQUNoRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVPLFlBQVk7UUFDbkIsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUM7UUFDcEYsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUM7UUFDcEYsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBQ2hGLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQztJQUNqRixDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUEyQixFQUFFLEtBQXdCO1FBRS9FLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTdELGVBQWUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUU5RSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXhELElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRXJDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUVsRyxJQUFJLFFBQWdCLENBQUM7WUFDckIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLGlDQUFpQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLFFBQVEsR0FBRyxRQUFRLENBQUMscUJBQXFCLEVBQUUseUNBQXlDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakcsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM5RyxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxFQUFFO2dCQUM3QyxrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixhQUFhLEVBQUU7b0JBQ2QsUUFBUSxFQUFFLEdBQUcsRUFBRTt3QkFDZCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7b0JBQ3pGLENBQUM7b0JBQ0QsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNO2lCQUN4QjthQUNELENBQUMsQ0FBQztZQUVILEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDO1FBRXJDLElBQUksQ0FBQyxhQUFhLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7Z0JBQ2pELFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUTtnQkFDM0IsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO2FBQzNCLENBQUMsQ0FBQztZQUVILE1BQU0sU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRTlCLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25DLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsRUFBRTtnQkFDakcsK0xBQStMO2dCQUMvTCwrREFBK0Q7Z0JBQy9ELElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFL0UsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztZQUNoRCxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHO1lBQ3RCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDYyxDQUFDO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBdFZZLG9CQUFvQjtJQXNCOUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxjQUFjLENBQUE7R0E1Qkosb0JBQW9CLENBc1ZoQzs7QUFFTSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQUlqQyxZQUNvQixZQUFnRCxFQUMvQyxhQUFrRCxFQUN0RCxhQUE4QztRQUYxQixpQkFBWSxHQUFaLFlBQVksQ0FBbUI7UUFDOUIsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBQ3JDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUw5QyxVQUFLLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO0lBTXBELENBQUM7SUFFTCxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQXFELEVBQUUsSUFBd0IsRUFBRSxVQUFtQztRQUUvSCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDN0MsY0FBYztZQUNkLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLGtCQUFrQjtZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsRCxTQUFTO2dCQUNWLENBQUM7Z0JBQ0QsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLDBCQUEwQixFQUFFLENBQUM7b0JBQzFILFVBQVUsR0FBRyxTQUFTLENBQUM7b0JBQ3ZCLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsVUFBVTtZQUN2QixDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQztZQUNuRCxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNCLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBdUIsRUFBRSxJQUF3QjtRQUNuRixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDN0IsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBR0QsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEQsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFFdEcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRCxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFbEMsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQXdCO1FBQzVDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDO1lBRUosSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxPQUFPLENBQUMsQ0FBQztZQUNWLENBQUM7WUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNkLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNoQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDbEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkUsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDdkIsQ0FBQztZQUNELEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDOUMsT0FBTyxLQUFLLENBQUM7UUFFZCxDQUFDO2dCQUFTLENBQUM7WUFDVixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBaUIsRUFBRSxJQUF3QjtRQUNuRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUcsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDL0MsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxzQ0FBc0MsQ0FBQztnQkFDOUYsTUFBTSxFQUFFLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSwwQ0FBMEMsQ0FBQzthQUN4RyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN2QixPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQXFELEVBQUUsSUFBd0I7UUFDdEYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzdDLGNBQWM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUN6QixrQkFBa0I7WUFDbEIsT0FBTztRQUNSLENBQUM7UUFFRCxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FHRCxDQUFBO0FBeEhZLHFCQUFxQjtJQUsvQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxjQUFjLENBQUE7R0FQSixxQkFBcUIsQ0F3SGpDIn0=
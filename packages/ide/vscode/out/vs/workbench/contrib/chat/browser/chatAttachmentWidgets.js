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
import { $ } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Codicon } from '../../../../base/common/codicons.js';
import * as event from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, dirname } from '../../../../base/common/path.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData } from '../../../../platform/dnd/browser/dnd.js';
import { registerOpenEditorListeners } from '../../../../platform/editor/browser/editor.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { FolderThemeIcon, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { revealInSideBarCommand } from '../../files/browser/fileActions.contribution.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { toHistoryItemHoverContent } from '../../scm/browser/scmHistory.js';
import { getHistoryItemEditorTitle } from '../../scm/browser/util.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
import { PromptFileVariableKind } from '../common/chatVariableEntries.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { getCleanPromptName } from '../common/promptSyntax/config/promptFileLocations.js';
const commonHoverOptions = {
    style: 1 /* HoverStyle.Pointer */,
    position: {
        hoverPosition: 2 /* HoverPosition.BELOW */
    },
    trapFocus: true,
};
const commonHoverLifecycleOptions = {
    groupId: 'chat-attachments',
};
let AbstractChatAttachmentWidget = class AbstractChatAttachmentWidget extends Disposable {
    get onDidDelete() {
        return this._onDidDelete.event;
    }
    get onDidOpen() {
        return this._onDidOpen.event;
    }
    constructor(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService, terminalService) {
        super();
        this.attachment = attachment;
        this.options = options;
        this.currentLanguageModel = currentLanguageModel;
        this.commandService = commandService;
        this.openerService = openerService;
        this.terminalService = terminalService;
        this._onDidDelete = this._register(new event.Emitter());
        this._onDidOpen = this._register(new event.Emitter());
        this.element = dom.append(container, $('.chat-attached-context-attachment.show-file-icons'));
        this.attachClearButton();
        this.label = contextResourceLabels.create(this.element, { supportIcons: true, hoverTargetOverride: this.element });
        this._register(this.label);
        this.element.tabIndex = 0;
        this.element.role = 'button';
        // Add middle-click support for removal
        this._register(dom.addDisposableListener(this.element, dom.EventType.AUXCLICK, (e) => {
            if (e.button === 1 /* Middle Button */ && this.options.supportsDeletion && !this.attachment.range) {
                e.preventDefault();
                e.stopPropagation();
                this._onDidDelete.fire(e);
            }
        }));
    }
    modelSupportsVision() {
        return modelSupportsVision(this.currentLanguageModel);
    }
    attachClearButton() {
        if (this.attachment.range || !this.options.supportsDeletion) {
            // no clear button for attachments with ranges because range means
            // referenced from prompt
            return;
        }
        const clearButton = new Button(this.element, {
            supportIcons: true,
            hoverDelegate: createInstantHoverDelegate(),
            title: localize('chat.attachment.clearButton', "Remove from context")
        });
        clearButton.element.tabIndex = -1;
        clearButton.icon = Codicon.close;
        this._register(clearButton);
        this._register(event.Event.once(clearButton.onDidClick)((e) => {
            this._onDidDelete.fire(e);
        }));
        this._register(dom.addStandardDisposableListener(this.element, dom.EventType.KEY_DOWN, e => {
            if (e.keyCode === 1 /* KeyCode.Backspace */ || e.keyCode === 20 /* KeyCode.Delete */) {
                this._onDidDelete.fire(e.browserEvent);
            }
        }));
    }
    addResourceOpenHandlers(resource, range) {
        this.element.style.cursor = 'pointer';
        this._register(registerOpenEditorListeners(this.element, async (options) => {
            if (this.attachment.kind === 'directory') {
                await this.openResource(resource, options, true);
            }
            else {
                await this.openResource(resource, options, false, range);
            }
        }));
    }
    async openResource(resource, openOptions, isDirectory, range) {
        if (isDirectory) {
            // Reveal Directory in explorer
            this.commandService.executeCommand(revealInSideBarCommand.id, resource);
            return;
        }
        if (resource.scheme === Schemas.vscodeTerminal) {
            this.terminalService?.openResource(resource);
            return;
        }
        // Open file in editor
        const openTextEditorOptions = range ? { selection: range } : undefined;
        const options = {
            fromUserGesture: true,
            openToSide: openOptions.openToSide,
            editorOptions: {
                ...openTextEditorOptions,
                ...openOptions.editorOptions
            },
        };
        await this.openerService.open(resource, options);
        this._onDidOpen.fire();
        this.element.focus();
    }
};
AbstractChatAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, ITerminalService)
], AbstractChatAttachmentWidget);
function modelSupportsVision(currentLanguageModel) {
    return currentLanguageModel?.metadata.capabilities?.vision ?? false;
}
let FileAttachmentWidget = class FileAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, correspondingContentReference, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, themeService, hoverService, languageModelsService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        const fileBasename = basename(resource.path);
        const fileDirname = dirname(resource.path);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        let ariaLabel = range ? localize('chat.fileAttachmentWithRange', "Attached file, {0}, line {1} to line {2}", friendlyName, range.startLineNumber, range.endLineNumber) : localize('chat.fileAttachment', "Attached file, {0}", friendlyName);
        if (attachment.omittedState === 2 /* OmittedState.Full */) {
            ariaLabel = localize('chat.omittedFileAttachment', "Omitted this file: {0}", attachment.name);
            this.renderOmittedWarning(friendlyName, ariaLabel);
        }
        else {
            const fileOptions = { hidePath: true, title: correspondingContentReference?.options?.status?.description };
            this.label.setFile(resource, attachment.kind === 'file' ? {
                ...fileOptions,
                fileKind: FileKind.FILE,
                range,
            } : {
                ...fileOptions,
                fileKind: FileKind.FOLDER,
                icon: !this.themeService.getFileIconTheme().hasFolderIcons ? FolderThemeIcon : undefined
            });
        }
        this.element.ariaLabel = ariaLabel;
        this.instantiationService.invokeFunction(accessor => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
        });
        this.addResourceOpenHandlers(resource, range);
    }
    renderOmittedWarning(friendlyName, ariaLabel) {
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-warning'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, friendlyName);
        this.element.appendChild(pillIcon);
        this.element.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        this.element.classList.add('warning');
        hoverElement.textContent = localize('chat.fileAttachmentHover', "{0} does not support this file type.", this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name : this.currentLanguageModel ?? 'This model');
        this._register(this.hoverService.setupDelayedHover(this.element, {
            ...commonHoverOptions,
            content: hoverElement,
        }, commonHoverLifecycleOptions));
    }
};
FileAttachmentWidget = __decorate([
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, IThemeService),
    __param(11, IHoverService),
    __param(12, ILanguageModelsService),
    __param(13, IInstantiationService)
], FileAttachmentWidget);
export { FileAttachmentWidget };
let TerminalCommandAttachmentWidget = class TerminalCommandAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, hoverService, terminalService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService, terminalService);
        this.hoverService = hoverService;
        this.terminalService = terminalService;
        const ariaLabel = localize('chat.terminalCommand', "Terminal command, {0}", attachment.command);
        const clickHandler = () => this.openResource(attachment.resource, { editorOptions: { preserveFocus: true } }, false, undefined);
        this._register(createTerminalCommandElements(this.element, attachment, ariaLabel, this.hoverService, clickHandler));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, async (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                await clickHandler();
            }
        }));
    }
};
TerminalCommandAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, IHoverService),
    __param(8, ITerminalService)
], TerminalCommandAttachmentWidget);
export { TerminalCommandAttachmentWidget };
var TerminalConstants;
(function (TerminalConstants) {
    TerminalConstants[TerminalConstants["MaxAttachmentOutputLineCount"] = 5] = "MaxAttachmentOutputLineCount";
    TerminalConstants[TerminalConstants["MaxAttachmentOutputLineLength"] = 80] = "MaxAttachmentOutputLineLength";
})(TerminalConstants || (TerminalConstants = {}));
function createTerminalCommandElements(element, attachment, ariaLabel, hoverService, clickHandler) {
    const disposable = new DisposableStore();
    element.ariaLabel = ariaLabel;
    element.style.cursor = 'pointer';
    const terminalIconSpan = dom.$('span');
    terminalIconSpan.classList.add(...ThemeIcon.asClassNameArray(Codicon.terminal));
    const pillIcon = dom.$('div.chat-attached-context-pill', {}, terminalIconSpan);
    const textLabel = dom.$('span.chat-attached-context-custom-text', {}, attachment.command);
    element.appendChild(pillIcon);
    element.appendChild(textLabel);
    disposable.add(dom.addDisposableListener(element, dom.EventType.CLICK, e => {
        e.preventDefault();
        e.stopPropagation();
        clickHandler();
    }));
    disposable.add(hoverService.setupDelayedHover(element, () => getHoverContent(ariaLabel, attachment), commonHoverLifecycleOptions));
    return disposable;
}
function getHoverContent(ariaLabel, attachment) {
    {
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        const commandTitle = dom.$('div', {}, typeof attachment.exitCode === 'number'
            ? localize('chat.terminalCommandHoverCommandTitleExit', "Command: {0}, exit code: {1}", attachment.command, attachment.exitCode)
            : localize('chat.terminalCommandHoverCommandTitle', "Command"));
        commandTitle.classList.add('attachment-additional-info');
        const commandBlock = dom.$('pre.chat-terminal-command-block');
        hoverElement.append(commandTitle, commandBlock);
        if (attachment.output && attachment.output.trim().length > 0) {
            const outputTitle = dom.$('div', {}, localize('chat.terminalCommandHoverOutputTitle', "Output:"));
            outputTitle.classList.add('attachment-additional-info');
            const outputBlock = dom.$('pre.chat-terminal-command-output');
            const fullOutputLines = attachment.output.split('\n');
            const hoverOutputLines = [];
            for (const line of fullOutputLines) {
                if (hoverOutputLines.length >= 5 /* TerminalConstants.MaxAttachmentOutputLineCount */) {
                    hoverOutputLines.push('...');
                    break;
                }
                const trimmed = line.trim();
                if (trimmed.length === 0) {
                    continue;
                }
                if (trimmed.length > 80 /* TerminalConstants.MaxAttachmentOutputLineLength */) {
                    hoverOutputLines.push(`${trimmed.slice(0, 80 /* TerminalConstants.MaxAttachmentOutputLineLength */)}...`);
                }
                else {
                    hoverOutputLines.push(trimmed);
                }
            }
            outputBlock.textContent = hoverOutputLines.join('\n');
            hoverElement.append(outputTitle, outputBlock);
        }
        return {
            ...commonHoverOptions,
            content: hoverElement,
        };
    }
}
let ImageAttachmentWidget = class ImageAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, hoverService, languageModelsService, instantiationService, labelService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.labelService = labelService;
        let ariaLabel;
        if (attachment.omittedState === 2 /* OmittedState.Full */) {
            ariaLabel = localize('chat.omittedImageAttachment', "Omitted this image: {0}", attachment.name);
        }
        else if (attachment.omittedState === 1 /* OmittedState.Partial */) {
            ariaLabel = localize('chat.partiallyOmittedImageAttachment', "Partially omitted this image: {0}", attachment.name);
        }
        else {
            ariaLabel = localize('chat.imageAttachment', "Attached image, {0}", attachment.name);
        }
        const ref = attachment.references?.[0]?.reference;
        resource = ref && URI.isUri(ref) ? ref : undefined;
        const clickHandler = async () => {
            if (resource) {
                await this.openResource(resource, { editorOptions: { preserveFocus: true } }, false, undefined);
            }
        };
        const currentLanguageModelName = this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name ?? this.currentLanguageModel.identifier : 'Current model';
        const fullName = resource ? this.labelService.getUriLabel(resource) : (attachment.fullName || attachment.name);
        this._register(createImageElements(resource, attachment.name, fullName, this.element, attachment.value, this.hoverService, ariaLabel, currentLanguageModelName, clickHandler, this.currentLanguageModel, attachment.omittedState));
        if (resource) {
            this.addResourceOpenHandlers(resource, undefined);
            instantiationService.invokeFunction(accessor => {
                this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
            });
        }
    }
};
ImageAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IHoverService),
    __param(9, ILanguageModelsService),
    __param(10, IInstantiationService),
    __param(11, ILabelService)
], ImageAttachmentWidget);
export { ImageAttachmentWidget };
function createImageElements(resource, name, fullName, element, buffer, hoverService, ariaLabel, currentLanguageModelName, clickHandler, currentLanguageModel, omittedState) {
    const disposable = new DisposableStore();
    if (omittedState === 1 /* OmittedState.Partial */) {
        element.classList.add('partial-warning');
    }
    element.ariaLabel = ariaLabel;
    element.style.position = 'relative';
    if (resource) {
        element.style.cursor = 'pointer';
        disposable.add(dom.addDisposableListener(element, 'click', clickHandler));
    }
    const supportsVision = modelSupportsVision(currentLanguageModel);
    const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$(supportsVision ? 'span.codicon.codicon-file-media' : 'span.codicon.codicon-warning'));
    const textLabel = dom.$('span.chat-attached-context-custom-text', {}, name);
    element.appendChild(pillIcon);
    element.appendChild(textLabel);
    const hoverElement = dom.$('div.chat-attached-context-hover');
    hoverElement.setAttribute('aria-label', ariaLabel);
    if ((!supportsVision && currentLanguageModel) || omittedState === 2 /* OmittedState.Full */) {
        element.classList.add('warning');
        hoverElement.textContent = localize('chat.imageAttachmentHover', "{0} does not support images.", currentLanguageModelName ?? 'This model');
        disposable.add(hoverService.setupDelayedHover(element, {
            content: hoverElement,
            style: 1 /* HoverStyle.Pointer */,
        }));
    }
    else {
        disposable.add(hoverService.setupDelayedHover(element, {
            content: hoverElement,
            style: 1 /* HoverStyle.Pointer */,
        }));
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const pillImg = dom.$('img.chat-attached-context-pill-image', { src: url, alt: '' });
        const pill = dom.$('div.chat-attached-context-pill', {}, pillImg);
        // eslint-disable-next-line no-restricted-syntax
        const existingPill = element.querySelector('.chat-attached-context-pill');
        if (existingPill) {
            existingPill.replaceWith(pill);
        }
        const hoverImage = dom.$('img.chat-attached-context-image', { src: url, alt: '' });
        const imageContainer = dom.$('div.chat-attached-context-image-container', {}, hoverImage);
        hoverElement.appendChild(imageContainer);
        if (resource) {
            const urlContainer = dom.$('a.chat-attached-context-url', {}, omittedState === 1 /* OmittedState.Partial */ ? localize('chat.imageAttachmentWarning', "This GIF was partially omitted - current frame will be sent.") : fullName);
            const separator = dom.$('div.chat-attached-context-url-separator');
            disposable.add(dom.addDisposableListener(urlContainer, 'click', () => clickHandler()));
            hoverElement.append(separator, urlContainer);
        }
        hoverImage.onload = () => { URL.revokeObjectURL(url); };
        hoverImage.onerror = () => {
            // reset to original icon on error or invalid image
            const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-file-media'));
            const pill = dom.$('div.chat-attached-context-pill', {}, pillIcon);
            // eslint-disable-next-line no-restricted-syntax
            const existingPill = element.querySelector('.chat-attached-context-pill');
            if (existingPill) {
                existingPill.replaceWith(pill);
            }
        };
    }
    return disposable;
}
let PasteAttachmentWidget = class PasteAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, hoverService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        const ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        this.element.ariaLabel = ariaLabel;
        const classNames = ['file-icon', `${attachment.language}-lang-file-icon`];
        let resource;
        let range;
        if (attachment.copiedFrom) {
            resource = attachment.copiedFrom.uri;
            range = attachment.copiedFrom.range;
            const filename = basename(resource.path);
            this.label.setLabel(filename, undefined, { extraClasses: classNames });
        }
        else {
            this.label.setLabel(attachment.fileName, undefined, { extraClasses: classNames });
        }
        this.element.appendChild(dom.$('span.attachment-additional-info', {}, `Pasted ${attachment.pastedLines}`));
        this.element.style.position = 'relative';
        const sourceUri = attachment.copiedFrom?.uri;
        const hoverContent = new MarkdownString(`${sourceUri ? this.instantiationService.invokeFunction(accessor => accessor.get(ILabelService).getUriLabel(sourceUri, { relative: true })) : attachment.fileName}\n\n---\n\n\`\`\`${attachment.language}\n\n${attachment.code}\n\`\`\``);
        this._register(this.hoverService.setupDelayedHover(this.element, {
            ...commonHoverOptions,
            content: hoverContent,
        }, commonHoverLifecycleOptions));
        const copiedFromResource = attachment.copiedFrom?.uri;
        if (copiedFromResource) {
            this._register(this.instantiationService.invokeFunction(hookUpResourceAttachmentDragAndContextMenu, this.element, copiedFromResource));
            this.addResourceOpenHandlers(copiedFromResource, range);
        }
    }
};
PasteAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, IHoverService),
    __param(8, IInstantiationService)
], PasteAttachmentWidget);
export { PasteAttachmentWidget };
let DefaultChatAttachmentWidget = class DefaultChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, correspondingContentReference, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, contextKeyService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        const attachmentLabel = attachment.fullName ?? attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id})\u00A0${attachmentLabel}` : attachmentLabel;
        this.label.setLabel(withIcon, correspondingContentReference?.options?.status?.description);
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        if (attachment.kind === 'diagnostic') {
            if (attachment.filterUri) {
                resource = attachment.filterUri ? URI.revive(attachment.filterUri) : undefined;
                range = attachment.filterRange;
            }
            else {
                this.element.style.cursor = 'pointer';
                this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, () => {
                    this.commandService.executeCommand('workbench.panel.markers.view.focus');
                }));
            }
        }
        if (attachment.kind === 'symbol') {
            const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            this._register(this.instantiationService.invokeFunction(hookUpSymbolAttachmentDragAndContextMenu, this.element, scopedContextKeyService, { ...attachment, kind: attachment.symbolKind }, MenuId.ChatInputSymbolAttachmentContext));
        }
        if (resource) {
            this.addResourceOpenHandlers(resource, range);
        }
    }
};
DefaultChatAttachmentWidget = __decorate([
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, IContextKeyService),
    __param(11, IInstantiationService)
], DefaultChatAttachmentWidget);
export { DefaultChatAttachmentWidget };
let PromptFileAttachmentWidget = class PromptFileAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, labelService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.hintElement = dom.append(this.element, dom.$('span.prompt-type'));
        this.updateLabel(attachment);
        this.instantiationService.invokeFunction(accessor => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, attachment.value));
        });
        this.addResourceOpenHandlers(attachment.value, undefined);
    }
    updateLabel(attachment) {
        const resource = attachment.value;
        const fileBasename = basename(resource.path);
        const fileDirname = dirname(resource.path);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const isPrompt = attachment.id.startsWith(PromptFileVariableKind.PromptFile);
        const ariaLabel = isPrompt
            ? localize('chat.promptAttachment', "Prompt file, {0}", friendlyName)
            : localize('chat.instructionsAttachment', "Instructions attachment, {0}", friendlyName);
        const typeLabel = isPrompt
            ? localize('prompt', "Prompt")
            : localize('instructions', "Instructions");
        const title = this.labelService.getUriLabel(resource) + (attachment.originLabel ? `\n${attachment.originLabel}` : '');
        //const { topError } = this.promptFile;
        this.element.classList.remove('warning', 'error');
        // if there are some errors/warning during the process of resolving
        // attachment references (including all the nested child references),
        // add the issue details in the hover title for the attachment, one
        // error/warning at a time because there is a limited space available
        // if (topError) {
        // 	const { errorSubject: subject } = topError;
        // 	const isError = (subject === 'root');
        // 	this.element.classList.add((isError) ? 'error' : 'warning');
        // 	const severity = (isError)
        // 		? localize('error', "Error")
        // 		: localize('warning', "Warning");
        // 	title += `\n[${severity}]: ${topError.localizedMessage}`;
        // }
        const fileWithoutExtension = getCleanPromptName(resource);
        this.label.setFile(URI.file(fileWithoutExtension), {
            fileKind: FileKind.FILE,
            hidePath: true,
            range: undefined,
            title,
            icon: ThemeIcon.fromId(Codicon.bookmark.id),
            extraClasses: [],
        });
        this.hintElement.innerText = typeLabel;
        this.element.ariaLabel = ariaLabel;
    }
};
PromptFileAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, ILabelService),
    __param(8, IInstantiationService)
], PromptFileAttachmentWidget);
export { PromptFileAttachmentWidget };
let PromptTextAttachmentWidget = class PromptTextAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, preferencesService, hoverService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        if (attachment.settingId) {
            const openSettings = () => preferencesService.openSettings({ jsonEditor: false, query: `@id:${attachment.settingId}` });
            this.element.style.cursor = 'pointer';
            this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, async (e) => {
                dom.EventHelper.stop(e, true);
                openSettings();
            }));
            this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, async (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                    dom.EventHelper.stop(e, true);
                    openSettings();
                }
            }));
        }
        this.label.setLabel(localize('instructions.label', 'Additional Instructions'), undefined, undefined);
        this._register(hoverService.setupDelayedHover(this.element, {
            ...commonHoverOptions,
            content: attachment.value,
        }, commonHoverLifecycleOptions));
    }
};
PromptTextAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, IPreferencesService),
    __param(8, IHoverService)
], PromptTextAttachmentWidget);
export { PromptTextAttachmentWidget };
let ToolSetOrToolItemAttachmentWidget = class ToolSetOrToolItemAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, toolsService, commandService, openerService, hoverService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        const toolOrToolSet = Iterable.find(toolsService.getTools(), tool => tool.id === attachment.id) ?? Iterable.find(toolsService.toolSets.get(), toolSet => toolSet.id === attachment.id);
        let name = attachment.name;
        const icon = attachment.icon ?? Codicon.tools;
        if (toolOrToolSet instanceof ToolSet) {
            name = toolOrToolSet.referenceName;
        }
        else if (toolOrToolSet) {
            name = toolOrToolSet.toolReferenceName ?? name;
        }
        this.label.setLabel(`$(${icon.id})\u00A0${name}`, undefined);
        this.element.style.cursor = 'pointer';
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", name);
        let hoverContent;
        if (toolOrToolSet instanceof ToolSet) {
            hoverContent = localize('toolset', "{0} - {1}", toolOrToolSet.description ?? toolOrToolSet.referenceName, toolOrToolSet.source.label);
        }
        else if (toolOrToolSet) {
            hoverContent = localize('tool', "{0} - {1}", toolOrToolSet.userDescription ?? toolOrToolSet.modelDescription, toolOrToolSet.source.label);
        }
        if (hoverContent) {
            this._register(hoverService.setupDelayedHover(this.element, {
                ...commonHoverOptions,
                content: hoverContent,
            }, commonHoverLifecycleOptions));
        }
    }
};
ToolSetOrToolItemAttachmentWidget = __decorate([
    __param(5, ILanguageModelToolsService),
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IHoverService)
], ToolSetOrToolItemAttachmentWidget);
export { ToolSetOrToolItemAttachmentWidget };
let NotebookCellOutputChatAttachmentWidget = class NotebookCellOutputChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, hoverService, languageModelsService, notebookService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.notebookService = notebookService;
        this.instantiationService = instantiationService;
        switch (attachment.mimeType) {
            case 'application/vnd.code.notebook.error': {
                this.renderErrorOutput(resource, attachment);
                break;
            }
            case 'image/png':
            case 'image/jpeg':
            case 'image/svg': {
                this.renderImageOutput(resource, attachment);
                break;
            }
            default: {
                this.renderGenericOutput(resource, attachment);
            }
        }
        this.instantiationService.invokeFunction(accessor => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
        });
        this.addResourceOpenHandlers(resource, undefined);
    }
    getAriaLabel(attachment) {
        return localize('chat.NotebookImageAttachment', "Attached Notebook output, {0}", attachment.name);
    }
    renderErrorOutput(resource, attachment) {
        const attachmentLabel = attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id})\u00A0${attachmentLabel}` : attachmentLabel;
        const buffer = this.getOutputItem(resource, attachment)?.data.buffer ?? new Uint8Array();
        let title = undefined;
        try {
            const error = JSON.parse(new TextDecoder().decode(buffer));
            if (error.name && error.message) {
                title = `${error.name}: ${error.message}`;
            }
        }
        catch {
            //
        }
        this.label.setLabel(withIcon, undefined, { title });
        this.element.ariaLabel = this.getAriaLabel(attachment);
    }
    renderGenericOutput(resource, attachment) {
        this.element.ariaLabel = this.getAriaLabel(attachment);
        this.label.setFile(resource, { hidePath: true, icon: ThemeIcon.fromId('output') });
    }
    renderImageOutput(resource, attachment) {
        let ariaLabel;
        if (attachment.omittedState === 2 /* OmittedState.Full */) {
            ariaLabel = localize('chat.omittedNotebookImageAttachment', "Omitted this Notebook ouput: {0}", attachment.name);
        }
        else if (attachment.omittedState === 1 /* OmittedState.Partial */) {
            ariaLabel = localize('chat.partiallyOmittedNotebookImageAttachment', "Partially omitted this Notebook output: {0}", attachment.name);
        }
        else {
            ariaLabel = this.getAriaLabel(attachment);
        }
        const clickHandler = async () => await this.openResource(resource, { editorOptions: { preserveFocus: true } }, false, undefined);
        const currentLanguageModelName = this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name ?? this.currentLanguageModel.identifier : undefined;
        const buffer = this.getOutputItem(resource, attachment)?.data.buffer ?? new Uint8Array();
        this._register(createImageElements(resource, attachment.name, attachment.name, this.element, buffer, this.hoverService, ariaLabel, currentLanguageModelName, clickHandler, this.currentLanguageModel, attachment.omittedState));
    }
    getOutputItem(resource, attachment) {
        const parsedInfo = CellUri.parseCellOutputUri(resource);
        if (!parsedInfo || typeof parsedInfo.cellHandle !== 'number' || typeof parsedInfo.outputIndex !== 'number') {
            return undefined;
        }
        const notebook = this.notebookService.getNotebookTextModel(parsedInfo.notebook);
        if (!notebook) {
            return undefined;
        }
        const cell = notebook.cells.find(c => c.handle === parsedInfo.cellHandle);
        if (!cell) {
            return undefined;
        }
        const output = cell.outputs.length > parsedInfo.outputIndex ? cell.outputs[parsedInfo.outputIndex] : undefined;
        return output?.outputs.find(o => o.mime === attachment.mimeType);
    }
};
NotebookCellOutputChatAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IHoverService),
    __param(9, ILanguageModelsService),
    __param(10, INotebookService),
    __param(11, IInstantiationService)
], NotebookCellOutputChatAttachmentWidget);
export { NotebookCellOutputChatAttachmentWidget };
let ElementChatAttachmentWidget = class ElementChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, editorService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        const ariaLabel = localize('chat.elementAttachment', "Attached element, {0}", attachment.name);
        this.element.ariaLabel = ariaLabel;
        this.element.style.position = 'relative';
        this.element.style.cursor = 'pointer';
        const attachmentLabel = attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id})\u00A0${attachmentLabel}` : attachmentLabel;
        this.label.setLabel(withIcon, undefined, { title: localize('chat.clickToViewContents', "Click to view the contents of: {0}", attachmentLabel) });
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, async () => {
            const content = attachment.value?.toString() || '';
            await editorService.openEditor({
                resource: undefined,
                contents: content,
                options: {
                    pinned: true
                }
            });
        }));
    }
};
ElementChatAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, IEditorService)
], ElementChatAttachmentWidget);
export { ElementChatAttachmentWidget };
let SCMHistoryItemAttachmentWidget = class SCMHistoryItemAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, markdownRendererService, hoverService, openerService, themeService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.label.setLabel(attachment.name, undefined);
        this.element.style.cursor = 'pointer';
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        const { content, disposables } = toHistoryItemHoverContent(markdownRendererService, attachment.historyItem, false);
        this._store.add(hoverService.setupDelayedHover(this.element, {
            ...commonHoverOptions,
            content,
        }, commonHoverLifecycleOptions));
        this._store.add(disposables);
        this._store.add(dom.addDisposableListener(this.element, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            this._openAttachment(attachment);
        }));
        this._store.add(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                this._openAttachment(attachment);
            }
        }));
    }
    async _openAttachment(attachment) {
        await this.commandService.executeCommand('_workbench.openMultiDiffEditor', {
            title: getHistoryItemEditorTitle(attachment.historyItem), multiDiffSourceUri: attachment.value
        });
    }
};
SCMHistoryItemAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IMarkdownRendererService),
    __param(7, IHoverService),
    __param(8, IOpenerService),
    __param(9, IThemeService)
], SCMHistoryItemAttachmentWidget);
export { SCMHistoryItemAttachmentWidget };
let SCMHistoryItemChangeAttachmentWidget = class SCMHistoryItemChangeAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, hoverService, markdownRendererService, openerService, themeService, editorService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.editorService = editorService;
        const nameSuffix = `\u00A0$(${Codicon.gitCommit.id})${attachment.historyItem.displayId ?? attachment.historyItem.id}`;
        this.label.setFile(attachment.value, { fileKind: FileKind.FILE, hidePath: true, nameSuffix });
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        const { content, disposables } = toHistoryItemHoverContent(markdownRendererService, attachment.historyItem, false);
        this._store.add(hoverService.setupDelayedHover(this.element, {
            ...commonHoverOptions, content,
        }, commonHoverLifecycleOptions));
        this._store.add(disposables);
        this.addResourceOpenHandlers(attachment.value, undefined);
    }
    async openResource(resource, options, isDirectory, range) {
        const attachment = this.attachment;
        const historyItem = attachment.historyItem;
        await this.editorService.openEditor({
            resource,
            label: `${basename(resource.path)} (${historyItem.displayId ?? historyItem.id})`,
            options: { ...options.editorOptions }
        }, options.openToSide ? SIDE_GROUP : undefined);
    }
};
SCMHistoryItemChangeAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IHoverService),
    __param(7, IMarkdownRendererService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IEditorService)
], SCMHistoryItemChangeAttachmentWidget);
export { SCMHistoryItemChangeAttachmentWidget };
let SCMHistoryItemChangeRangeAttachmentWidget = class SCMHistoryItemChangeRangeAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, commandService, openerService, editorService) {
        super(attachment, options, container, contextResourceLabels, currentLanguageModel, commandService, openerService);
        this.editorService = editorService;
        const historyItemStartId = attachment.historyItemChangeStart.historyItem.displayId ?? attachment.historyItemChangeStart.historyItem.id;
        const historyItemEndId = attachment.historyItemChangeEnd.historyItem.displayId ?? attachment.historyItemChangeEnd.historyItem.id;
        const nameSuffix = `\u00A0$(${Codicon.gitCommit.id})${historyItemStartId}..${historyItemEndId}`;
        this.label.setFile(attachment.value, { fileKind: FileKind.FILE, hidePath: true, nameSuffix });
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        this.addResourceOpenHandlers(attachment.value, undefined);
    }
    async openResource(resource, options, isDirectory, range) {
        const attachment = this.attachment;
        const historyItemChangeStart = attachment.historyItemChangeStart;
        const historyItemChangeEnd = attachment.historyItemChangeEnd;
        const originalUriTitle = `${basename(historyItemChangeStart.uri.fsPath)} (${historyItemChangeStart.historyItem.displayId ?? historyItemChangeStart.historyItem.id})`;
        const modifiedUriTitle = `${basename(historyItemChangeEnd.uri.fsPath)} (${historyItemChangeEnd.historyItem.displayId ?? historyItemChangeEnd.historyItem.id})`;
        await this.editorService.openEditor({
            original: { resource: historyItemChangeStart.uri },
            modified: { resource: historyItemChangeEnd.uri },
            label: `${originalUriTitle} ↔ ${modifiedUriTitle}`,
            options: { ...options.editorOptions }
        }, options.openToSide ? SIDE_GROUP : undefined);
    }
};
SCMHistoryItemChangeRangeAttachmentWidget = __decorate([
    __param(5, ICommandService),
    __param(6, IOpenerService),
    __param(7, IEditorService)
], SCMHistoryItemChangeRangeAttachmentWidget);
export { SCMHistoryItemChangeRangeAttachmentWidget };
export function hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource) {
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const store = new DisposableStore();
    // Context
    const scopedContextKeyService = store.add(contextKeyService.createScoped(widget));
    store.add(setResourceContext(accessor, scopedContextKeyService, resource));
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', e => {
        instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [resource], e));
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, MenuId.ChatInputResourceAttachmentContext, resource));
    return store;
}
export function hookUpSymbolAttachmentDragAndContextMenu(accessor, widget, scopedContextKeyService, attachment, contextMenuId) {
    const instantiationService = accessor.get(IInstantiationService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const textModelService = accessor.get(ITextModelService);
    const store = new DisposableStore();
    // Context
    store.add(setResourceContext(accessor, scopedContextKeyService, attachment.value.uri));
    const chatResourceContext = chatAttachmentResourceContextKey.bindTo(scopedContextKeyService);
    chatResourceContext.set(attachment.value.uri.toString());
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', e => {
        instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [{ resource: attachment.value.uri, selection: attachment.value.range }], e));
        fillInSymbolsDragData([{
                fsPath: attachment.value.uri.fsPath,
                range: attachment.value.range,
                name: attachment.name,
                kind: attachment.kind,
            }], e);
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    const providerContexts = [
        [EditorContextKeys.hasDefinitionProvider.bindTo(scopedContextKeyService), languageFeaturesService.definitionProvider],
        [EditorContextKeys.hasReferenceProvider.bindTo(scopedContextKeyService), languageFeaturesService.referenceProvider],
        [EditorContextKeys.hasImplementationProvider.bindTo(scopedContextKeyService), languageFeaturesService.implementationProvider],
        [EditorContextKeys.hasTypeDefinitionProvider.bindTo(scopedContextKeyService), languageFeaturesService.typeDefinitionProvider],
    ];
    const updateContextKeys = async () => {
        const modelRef = await textModelService.createModelReference(attachment.value.uri);
        try {
            const model = modelRef.object.textEditorModel;
            for (const [contextKey, registry] of providerContexts) {
                contextKey.set(registry.has(model));
            }
        }
        finally {
            modelRef.dispose();
        }
    };
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, contextMenuId, attachment.value, updateContextKeys));
    return store;
}
function setResourceContext(accessor, scopedContextKeyService, resource) {
    const fileService = accessor.get(IFileService);
    const languageService = accessor.get(ILanguageService);
    const modelService = accessor.get(IModelService);
    const resourceContextKey = new ResourceContextKey(scopedContextKeyService, fileService, languageService, modelService);
    resourceContextKey.set(resource);
    return resourceContextKey;
}
function addBasicContextMenu(accessor, widget, scopedContextKeyService, menuId, arg, updateContextKeys) {
    const contextMenuService = accessor.get(IContextMenuService);
    const menuService = accessor.get(IMenuService);
    return dom.addDisposableListener(widget, dom.EventType.CONTEXT_MENU, async (domEvent) => {
        const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
        dom.EventHelper.stop(domEvent, true);
        try {
            await updateContextKeys?.();
        }
        catch (e) {
            console.error(e);
        }
        contextMenuService.showContextMenu({
            contextKeyService: scopedContextKeyService,
            getAnchor: () => event,
            getActions: () => {
                const menu = menuService.getMenuActions(menuId, scopedContextKeyService, { arg });
                return getFlatContextMenuActions(menu);
            },
        });
    });
}
export const chatAttachmentResourceContextKey = new RawContextKey('chatAttachmentResource', undefined, { type: 'URI', description: localize('resource', "The full value of the chat attachment resource, including scheme and path") });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudFdpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRXZHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxpQkFB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
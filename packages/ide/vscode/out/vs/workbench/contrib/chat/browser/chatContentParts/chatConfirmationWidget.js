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
import * as dom from '../../../../../base/browser/dom.js';
import { Button, ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { renderFileWidgets } from '../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
import { ChatMarkdownContentPart } from './chatMarkdownContentPart.js';
import './media/chatConfirmationWidget.css';
let ChatQueryTitlePart = class ChatQueryTitlePart extends Disposable {
    get title() {
        return this._title;
    }
    set title(value) {
        this._title = value;
        const next = this._renderer.render(this.toMdString(value), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        });
        const previousEl = this._renderedTitle.value?.element;
        if (previousEl?.parentElement) {
            previousEl.replaceWith(next.element);
        }
        else {
            this.element.appendChild(next.element); // unreachable?
        }
        this._renderedTitle.value = next;
    }
    constructor(element, _title, subtitle, _renderer) {
        super();
        this.element = element;
        this._title = _title;
        this._renderer = _renderer;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._renderedTitle = this._register(new MutableDisposable());
        element.classList.add('chat-query-title-part');
        this._renderedTitle.value = _renderer.render(this.toMdString(_title), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        });
        element.append(this._renderedTitle.value.element);
        if (subtitle) {
            const str = this.toMdString(subtitle);
            const renderedTitle = this._register(_renderer.render(str, {
                asyncRenderCallback: () => this._onDidChangeHeight.fire(),
            }));
            const wrapper = document.createElement('small');
            wrapper.appendChild(renderedTitle.element);
            element.append(wrapper);
        }
    }
    toMdString(value) {
        if (typeof value === 'string') {
            return new MarkdownString('', { supportThemeIcons: true }).appendText(value);
        }
        else {
            return new MarkdownString(value.value, { supportThemeIcons: true, isTrusted: value.isTrusted });
        }
    }
};
ChatQueryTitlePart = __decorate([
    __param(3, IMarkdownRendererService)
], ChatQueryTitlePart);
export { ChatQueryTitlePart };
let BaseSimpleChatConfirmationWidget = class BaseSimpleChatConfirmationWidget extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidChangeHeight() { return this._onDidChangeHeight.event; }
    get domNode() {
        return this._domNode;
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    constructor(context, options, instantiationService, _markdownRendererService, contextMenuService, contextKeyService) {
        super();
        this.context = context;
        this.instantiationService = instantiationService;
        this._markdownRendererService = _markdownRendererService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        const { title, subtitle, message, buttons } = options;
        const elements = dom.h('.chat-confirmation-widget-container@container', [
            dom.h('.chat-confirmation-widget@root', [
                dom.h('.chat-confirmation-widget-title@title'),
                dom.h('.chat-confirmation-widget-message-container', [
                    dom.h('.chat-confirmation-widget-message@message'),
                    dom.h('.chat-buttons-container@buttonsContainer', [
                        dom.h('.chat-buttons@buttons'),
                        dom.h('.chat-toolbar@toolbar'),
                    ]),
                ]),
            ]),
        ]);
        configureAccessibilityContainer(elements.container, title, message);
        this._domNode = elements.root;
        const titlePart = this._register(instantiationService.createInstance(ChatQueryTitlePart, elements.title, title, subtitle));
        this._register(titlePart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.messageElement = elements.message;
        // Create buttons
        buttons.forEach(buttonData => {
            const buttonOptions = { ...defaultButtonStyles, secondary: buttonData.isSecondary, title: buttonData.tooltip, disabled: buttonData.disabled };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(elements.buttons, {
                    ...buttonOptions,
                    contextMenuProvider: contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map(action => {
                        if (action instanceof Separator) {
                            return action;
                        }
                        return this._register(new Action(action.label, action.label, undefined, !action.disabled, () => {
                            this._onDidClick.fire(action);
                            return Promise.resolve();
                        }));
                    }),
                });
            }
            else {
                button = new Button(elements.buttons, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
            if (buttonData.onDidChangeDisablement) {
                this._register(buttonData.onDidChangeDisablement(disabled => button.enabled = !disabled));
            }
        });
        // Create toolbar if actions are provided
        if (options?.toolbarData) {
            const overlay = contextKeyService.createOverlay([
                ['chatConfirmationPartType', options.toolbarData.partType],
                ['chatConfirmationPartSource', options.toolbarData.partSource],
            ]);
            const nestedInsta = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, overlay])));
            const toolbar = this._register(nestedInsta.createInstance(MenuWorkbenchToolBar, elements.toolbar, MenuId.ChatConfirmationMenu, {
                // buttonConfigProvider: () => ({ showLabel: false, showIcon: true }),
                menuOptions: {
                    arg: options.toolbarData.arg,
                    shouldForwardArgs: true,
                }
            }));
            this._register(toolbar.onDidChangeMenuItems(() => this._onDidChangeHeight.fire()));
        }
    }
    renderMessage(element) {
        this.messageElement.append(element);
    }
};
BaseSimpleChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService)
], BaseSimpleChatConfirmationWidget);
/** @deprecated Use ChatConfirmationWidget instead */
let SimpleChatConfirmationWidget = class SimpleChatConfirmationWidget extends BaseSimpleChatConfirmationWidget {
    constructor(context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService) {
        super(context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService);
        this.updateMessage(options.message);
    }
    updateMessage(message) {
        this._renderedMessage?.remove();
        const renderedMessage = this._register(this._markdownRendererService.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element);
        this._renderedMessage = renderedMessage.element;
    }
};
SimpleChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService)
], SimpleChatConfirmationWidget);
export { SimpleChatConfirmationWidget };
let BaseChatConfirmationWidget = class BaseChatConfirmationWidget extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidChangeHeight() { return this._onDidChangeHeight.event; }
    get domNode() {
        return this._domNode;
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    get codeblocksPartId() {
        return this.markdownContentPart.value?.codeblocksPartId;
    }
    get codeblocks() {
        return this.markdownContentPart.value?.codeblocks;
    }
    constructor(_context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService, chatMarkdownAnchorService) {
        super();
        this._context = _context;
        this.instantiationService = instantiationService;
        this.markdownRendererService = markdownRendererService;
        this.contextMenuService = contextMenuService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        this.markdownContentPart = this._register(new MutableDisposable());
        const { title, subtitle, message, buttons, icon } = options;
        const elements = dom.h('.chat-confirmation-widget-container@container', [
            dom.h('.chat-confirmation-widget2@root', [
                dom.h('.chat-confirmation-widget-title', [
                    dom.h('.chat-title@title'),
                    dom.h('.chat-toolbar-container@buttonsContainer', [
                        dom.h('.chat-toolbar@toolbar'),
                    ]),
                ]),
                dom.h('.chat-confirmation-widget-message@message'),
                dom.h('.chat-confirmation-widget-buttons', [
                    dom.h('.chat-buttons@buttons'),
                ]),
            ]),
        ]);
        configureAccessibilityContainer(elements.container, title, message);
        this._domNode = elements.root;
        this._buttonsDomNode = elements.buttons;
        const titlePart = this._register(instantiationService.createInstance(ChatQueryTitlePart, elements.title, new MarkdownString(icon ? `$(${icon.id}) ${typeof title === 'string' ? title : title.value}` : typeof title === 'string' ? title : title.value), subtitle));
        this._register(titlePart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.messageElement = elements.message;
        this.updateButtons(buttons);
        // Create toolbar if actions are provided
        if (options?.toolbarData) {
            const overlay = contextKeyService.createOverlay([
                ['chatConfirmationPartType', options.toolbarData.partType],
                ['chatConfirmationPartSource', options.toolbarData.partSource],
            ]);
            const nestedInsta = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, overlay])));
            this._register(nestedInsta.createInstance(MenuWorkbenchToolBar, elements.toolbar, MenuId.ChatConfirmationMenu, {
                // buttonConfigProvider: () => ({ showLabel: false, showIcon: true }),
                menuOptions: {
                    arg: options.toolbarData.arg,
                    shouldForwardArgs: true,
                }
            }));
        }
    }
    updateButtons(buttons) {
        while (this._buttonsDomNode.children.length > 0) {
            this._buttonsDomNode.children[0].remove();
        }
        for (const buttonData of buttons) {
            const buttonOptions = { ...defaultButtonStyles, secondary: buttonData.isSecondary, title: buttonData.tooltip, disabled: buttonData.disabled };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(this._buttonsDomNode, {
                    ...buttonOptions,
                    contextMenuProvider: this.contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map(action => {
                        if (action instanceof Separator) {
                            return action;
                        }
                        return this._register(new Action(action.label, action.label, undefined, !action.disabled, () => {
                            this._onDidClick.fire(action);
                            return Promise.resolve();
                        }));
                    }),
                });
            }
            else {
                button = new Button(this._buttonsDomNode, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
            if (buttonData.onDidChangeDisablement) {
                this._register(buttonData.onDidChangeDisablement(disabled => button.enabled = !disabled));
            }
        }
    }
    renderMessage(element) {
        this.markdownContentPart.clear();
        if (!dom.isHTMLElement(element)) {
            const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, {
                kind: 'markdownContent',
                content: typeof element === 'string' ? new MarkdownString().appendMarkdown(element) : element
            }, this._context, this._context.editorPool, false, this._context.codeBlockStartIndex, this.markdownRendererService, undefined, this._context.currentWidth(), this._context.codeBlockModelCollection, {
                allowInlineDiffs: true,
                horizontalPadding: 6,
            }));
            renderFileWidgets(part.domNode, this.instantiationService, this.chatMarkdownAnchorService, this._store);
            this._register(part.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            this.markdownContentPart.value = part;
            element = part.domNode;
        }
        for (const child of this.messageElement.children) {
            child.remove();
        }
        this.messageElement.append(element);
    }
};
BaseChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IChatMarkdownAnchorService)
], BaseChatConfirmationWidget);
let ChatConfirmationWidget = class ChatConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService, chatMarkdownAnchorService) {
        super(context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService, chatMarkdownAnchorService);
        this.renderMessage(options.message);
    }
    updateMessage(message) {
        this._renderedMessage?.remove();
        const renderedMessage = this._register(this.markdownRendererService.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element);
        this._renderedMessage = renderedMessage.element;
    }
};
ChatConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IChatMarkdownAnchorService)
], ChatConfirmationWidget);
export { ChatConfirmationWidget };
let ChatCustomConfirmationWidget = class ChatCustomConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService, chatMarkdownAnchorService) {
        super(context, options, instantiationService, markdownRendererService, contextMenuService, contextKeyService, chatMarkdownAnchorService);
        this.renderMessage(options.message);
    }
};
ChatCustomConfirmationWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IMarkdownRendererService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IChatMarkdownAnchorService)
], ChatCustomConfirmationWidget);
export { ChatCustomConfirmationWidget };
function configureAccessibilityContainer(container, title, message) {
    container.tabIndex = 0;
    const titleAsString = typeof title === 'string' ? title : title.value;
    const messageAsString = typeof message === 'string' ? message : message && 'value' in message ? message.value : message && 'textContent' in message ? message.textContent : '';
    container.setAttribute('aria-label', localize('chat.confirmationWidget.ariaLabel', "Chat Confirmation Dialog {0} {1}", titleAsString, messageAsString));
    container.classList.add('chat-confirmation-widget-container');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29uZmlybWF0aW9uV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFFMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBMkIsTUFBTSxpREFBaUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxt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
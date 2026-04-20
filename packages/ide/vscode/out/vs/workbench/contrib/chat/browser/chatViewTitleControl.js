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
var ChatViewTitleControl_1;
import './media/chatViewTitleControl.css';
import { addDisposableListener, EventType, h } from '../../../../base/browser/dom.js';
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { Gesture, EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ChatConfiguration } from '../common/constants.js';
import { AgentSessionProviders, getAgentSessionProviderIcon } from './agentSessions/agentSessions.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { AgentSessionsPicker } from './agentSessions/agentSessionsPicker.js';
let ChatViewTitleControl = class ChatViewTitleControl extends Disposable {
    static { ChatViewTitleControl_1 = this; }
    static { this.DEFAULT_TITLE = localize('chat', "Chat"); }
    static { this.PICK_AGENT_SESSION_ACTION_ID = 'workbench.action.chat.pickAgentSession'; }
    constructor(container, delegate, configurationService, instantiationService) {
        super();
        this.container = container;
        this.delegate = delegate;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.title = undefined;
        this.titleLabel = this._register(new MutableDisposable());
        this.modelDisposables = this._register(new MutableDisposable());
        this.lastKnownHeight = 0;
        this.render(this.container);
        this.registerListeners();
        this.registerActions();
    }
    registerListeners() {
        // Update on configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ChatViewTitleEnabled)) {
                this.doUpdate();
            }
        }));
    }
    registerActions() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: ChatViewTitleControl_1.PICK_AGENT_SESSION_ACTION_ID,
                    title: localize('chat.pickAgentSession', "Pick Agent Session"),
                    f1: false,
                    menu: [{
                            id: MenuId.ChatViewSessionTitleNavigationToolbar,
                            group: 'navigation',
                            order: 2
                        }]
                });
            }
            async run(accessor) {
                const instantiationService = accessor.get(IInstantiationService);
                const agentSessionsPicker = instantiationService.createInstance(AgentSessionsPicker);
                await agentSessionsPicker.pickAgentSession();
            }
        }));
    }
    render(parent) {
        const elements = h('div.chat-view-title-container', [
            h('div.chat-view-title-navigation-toolbar@navigationToolbar'),
            h('span.chat-view-title-icon@icon'),
            h('div.chat-view-title-actions-toolbar@actionsToolbar'),
        ]);
        // Toolbar on the left
        this.navigationToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, elements.navigationToolbar, MenuId.ChatViewSessionTitleNavigationToolbar, {
            actionViewItemProvider: (action) => {
                if (action.id === ChatViewTitleControl_1.PICK_AGENT_SESSION_ACTION_ID) {
                    this.titleLabel.value = new ChatViewTitleLabel(action);
                    this.titleLabel.value.updateTitle(this.title ?? ChatViewTitleControl_1.DEFAULT_TITLE, this.getIcon());
                    return this.titleLabel.value;
                }
                return undefined;
            },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            menuOptions: { shouldForwardArgs: true }
        }));
        // Actions toolbar on the right
        this.actionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, elements.actionsToolbar, MenuId.ChatViewSessionTitleToolbar, {
            menuOptions: { shouldForwardArgs: true },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */
        }));
        // Title controls
        this.titleContainer = elements.root;
        this._register(Gesture.addTarget(this.titleContainer));
        for (const eventType of [TouchEventType.Tap, EventType.CLICK]) {
            this._register(addDisposableListener(this.titleContainer, eventType, () => {
                this.delegate.focusChat();
            }));
        }
        parent.appendChild(this.titleContainer);
    }
    update(model) {
        this.model = model;
        this.modelDisposables.value = model?.onDidChange(e => {
            if (e.kind === 'setCustomTitle' || e.kind === 'addRequest') {
                this.doUpdate();
            }
        });
        this.doUpdate();
    }
    doUpdate() {
        const markdownTitle = new MarkdownString(this.model?.title ?? '');
        this.title = renderAsPlaintext(markdownTitle);
        this.updateTitle(this.title ?? ChatViewTitleControl_1.DEFAULT_TITLE);
        const context = this.model && {
            $mid: 19 /* MarshalledId.ChatViewContext */,
            sessionResource: this.model.sessionResource
        };
        if (this.navigationToolbar) {
            this.navigationToolbar.context = context;
        }
        if (this.actionsToolbar) {
            this.actionsToolbar.context = context;
        }
    }
    updateTitle(title) {
        if (!this.titleContainer) {
            return;
        }
        this.titleContainer.classList.toggle('visible', this.shouldRender());
        this.titleLabel.value?.updateTitle(title, this.getIcon());
        const currentHeight = this.getHeight();
        if (currentHeight !== this.lastKnownHeight) {
            this.lastKnownHeight = currentHeight;
            this._onDidChangeHeight.fire();
        }
    }
    getIcon() {
        const sessionType = this.model?.contributedChatSession?.chatSessionType;
        switch (sessionType) {
            case AgentSessionProviders.Background:
            case AgentSessionProviders.Cloud:
                return getAgentSessionProviderIcon(sessionType);
        }
        return undefined;
    }
    shouldRender() {
        if (!this.isEnabled()) {
            return false; // title hidden via setting
        }
        return !!this.model?.title; // we need a chat showing and not being empty
    }
    isEnabled() {
        return this.configurationService.getValue(ChatConfiguration.ChatViewTitleEnabled) === true;
    }
    getHeight() {
        if (!this.titleContainer || this.titleContainer.style.display === 'none') {
            return 0;
        }
        return this.titleContainer.offsetHeight;
    }
};
ChatViewTitleControl = ChatViewTitleControl_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IInstantiationService)
], ChatViewTitleControl);
export { ChatViewTitleControl };
class ChatViewTitleLabel extends ActionViewItem {
    constructor(action, options) {
        super(null, action, { ...options, icon: false, label: true });
        this.titleLabel = undefined;
        this.titleIcon = undefined;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-view-title-action-item');
        this.label?.classList.add('chat-view-title-label-container');
        this.titleIcon = this.label?.appendChild(h('span').root);
        this.titleLabel = this.label?.appendChild(h('span.chat-view-title-label').root);
        this.updateLabel();
        this.updateIcon();
    }
    updateTitle(title, icon) {
        this.title = title;
        this.icon = icon;
        this.updateLabel();
        this.updateIcon();
    }
    updateLabel() {
        if (!this.titleLabel) {
            return;
        }
        if (this.title) {
            this.titleLabel.textContent = this.title;
        }
        else {
            this.titleLabel.textContent = '';
        }
    }
    updateIcon() {
        if (!this.titleIcon) {
            return;
        }
        if (this.icon) {
            this.titleIcon.className = ThemeIcon.asClassName(this.icon);
        }
        else {
            this.titleIcon.className = '';
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdUaXRsZUNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRWaWV3VGl0bGVDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXNCLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0csT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBR3JILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFB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
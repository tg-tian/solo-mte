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
import { raceCancellablePromises, timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IEditorGroupsService, isEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatService } from '../common/chatService.js';
import { ChatViewId, ChatViewPaneTarget, IQuickChatService, isIChatViewViewContext } from './chat.js';
import { ChatEditor } from './chatEditor.js';
import { ChatEditorInput } from './chatEditorInput.js';
let ChatWidgetService = class ChatWidgetService extends Disposable {
    constructor(editorGroupsService, viewsService, quickChatService, layoutService, editorService, chatService) {
        super();
        this.editorGroupsService = editorGroupsService;
        this.viewsService = viewsService;
        this.quickChatService = quickChatService;
        this.layoutService = layoutService;
        this.editorService = editorService;
        this.chatService = chatService;
        this._widgets = [];
        this._lastFocusedWidget = undefined;
        this._onDidAddWidget = this._register(new Emitter());
        this.onDidAddWidget = this._onDidAddWidget.event;
        this._onDidBackgroundSession = this._register(new Emitter());
        this.onDidBackgroundSession = this._onDidBackgroundSession.event;
    }
    get lastFocusedWidget() {
        return this._lastFocusedWidget;
    }
    getAllWidgets() {
        return this._widgets;
    }
    getWidgetsByLocations(location) {
        return this._widgets.filter(w => w.location === location);
    }
    getWidgetByInputUri(uri) {
        return this._widgets.find(w => isEqual(w.input.inputUri, uri));
    }
    getWidgetBySessionResource(sessionResource) {
        return this._widgets.find(w => isEqual(w.viewModel?.sessionResource, sessionResource));
    }
    async revealWidget(preserveFocus) {
        const last = this.lastFocusedWidget;
        if (last && await this.reveal(last, preserveFocus)) {
            return last;
        }
        return (await this.viewsService.openView(ChatViewId, !preserveFocus))?.widget;
    }
    async reveal(widget, preserveFocus) {
        if (widget.viewModel?.sessionResource) {
            const alreadyOpenWidget = await this.revealSessionIfAlreadyOpen(widget.viewModel.sessionResource, { preserveFocus });
            if (alreadyOpenWidget) {
                return true;
            }
        }
        if (isIChatViewViewContext(widget.viewContext)) {
            const view = await this.viewsService.openView(widget.viewContext.viewId, !preserveFocus);
            if (!preserveFocus) {
                view?.focus();
            }
            return !!view;
        }
        return false;
    }
    async openSession(sessionResource, target, options) {
        // Reveal if already open unless instructed otherwise
        if (typeof target === 'undefined' || options?.revealIfOpened) {
            const alreadyOpenWidget = await this.revealSessionIfAlreadyOpen(sessionResource, options);
            if (alreadyOpenWidget) {
                return alreadyOpenWidget;
            }
        }
        else {
            await this.prepareSessionForMove(sessionResource, target);
        }
        // Load this session in chat view
        if (target === ChatViewPaneTarget) {
            const chatView = await this.viewsService.openView(ChatViewId, !options?.preserveFocus);
            if (chatView) {
                await chatView.loadSession(sessionResource);
                if (!options?.preserveFocus) {
                    chatView.focusInput();
                }
            }
            return chatView?.widget;
        }
        // Open in chat editor
        const pane = await this.editorService.openEditor({
            resource: sessionResource,
            options: {
                ...options,
                revealIfOpened: options?.revealIfOpened ?? true // always try to reveal if already opened unless explicitly told not to
            }
        }, target);
        return pane instanceof ChatEditor ? pane.widget : undefined;
    }
    async revealSessionIfAlreadyOpen(sessionResource, options) {
        // Already open in chat view?
        const chatView = this.viewsService.getViewWithId(ChatViewId);
        if (chatView?.widget.viewModel?.sessionResource && isEqual(chatView.widget.viewModel.sessionResource, sessionResource)) {
            const view = await this.viewsService.openView(ChatViewId, !options?.preserveFocus);
            if (!options?.preserveFocus) {
                view?.focus();
            }
            return chatView.widget;
        }
        // Already open in an editor?
        const existingEditor = this.findExistingChatEditorByUri(sessionResource);
        if (existingEditor) {
            const existingEditorWindowId = existingEditor.group.windowId;
            // focus transfer to other documents is async. If we depend on the focus
            // being synchronously transferred in consuming code, this can fail, so
            // wait for it to propagate
            const isGroupActive = () => dom.getWindow(this.layoutService.activeContainer).vscodeWindowId === existingEditorWindowId;
            let ensureFocusTransfer;
            if (!isGroupActive()) {
                ensureFocusTransfer = raceCancellablePromises([
                    timeout(500),
                    Event.toPromise(Event.once(Event.filter(this.layoutService.onDidChangeActiveContainer, isGroupActive))),
                ]);
            }
            const pane = await existingEditor.group.openEditor(existingEditor.editor, options);
            await ensureFocusTransfer;
            return pane instanceof ChatEditor ? pane.widget : undefined;
        }
        // Already open in quick chat?
        if (isEqual(sessionResource, this.quickChatService.sessionResource)) {
            this.quickChatService.focus();
            return undefined;
        }
        return undefined;
    }
    async prepareSessionForMove(sessionResource, target) {
        const existingWidget = this.getWidgetBySessionResource(sessionResource);
        if (existingWidget) {
            const existingEditor = isIChatViewViewContext(existingWidget.viewContext) ?
                undefined :
                this.findExistingChatEditorByUri(sessionResource);
            if (isIChatViewViewContext(existingWidget.viewContext) && target === ChatViewPaneTarget) {
                return;
            }
            if (!isIChatViewViewContext(existingWidget.viewContext) && target !== ChatViewPaneTarget && existingEditor && this.isSameEditorTarget(existingEditor.group.id, target)) {
                return;
            }
            if (existingEditor) {
                // widget.clear() on an editor leaves behind an empty chat editor
                await this.editorService.closeEditor({ editor: existingEditor.editor, groupId: existingEditor.group.id }, { preserveFocus: true });
            }
            else {
                await existingWidget.clear();
            }
        }
    }
    findExistingChatEditorByUri(sessionUri) {
        for (const group of this.editorGroupsService.groups) {
            for (const editor of group.editors) {
                if (editor instanceof ChatEditorInput && isEqual(editor.sessionResource, sessionUri)) {
                    return { editor, group };
                }
            }
        }
        return undefined;
    }
    isSameEditorTarget(currentGroupId, target) {
        return typeof target === 'number' && target === currentGroupId ||
            target === ACTIVE_GROUP && this.editorGroupsService.activeGroup?.id === currentGroupId ||
            isEditorGroup(target) && target.id === currentGroupId;
    }
    setLastFocusedWidget(widget) {
        if (widget === this._lastFocusedWidget) {
            return;
        }
        this._lastFocusedWidget = widget;
    }
    register(newWidget) {
        if (this._widgets.some(widget => widget === newWidget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        this._widgets.push(newWidget);
        this._onDidAddWidget.fire(newWidget);
        return combinedDisposable(newWidget.onDidFocus(() => this.setLastFocusedWidget(newWidget)), newWidget.onDidChangeViewModel(({ previousSessionResource, currentSessionResource }) => {
            if (!previousSessionResource || (currentSessionResource && isEqual(previousSessionResource, currentSessionResource))) {
                return;
            }
            // Timeout to ensure it wasn't just moving somewhere else
            void timeout(200).then(() => {
                if (!this.getWidgetBySessionResource(previousSessionResource) && this.chatService.getSession(previousSessionResource)) {
                    this._onDidBackgroundSession.fire(previousSessionResource);
                }
            });
        }), toDisposable(() => this._widgets.splice(this._widgets.indexOf(newWidget), 1)));
    }
};
ChatWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IViewsService),
    __param(2, IQuickChatService),
    __param(3, ILayoutService),
    __param(4, IEditorService),
    __param(5, IChatService)
], ChatWidgetService);
export { ChatWidgetService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRXaWRnZXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUF1QixNQUFNLCtEQUErRCxDQUFDO0FBQ2xJLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDM0gsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFtQyxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN2SSxPQUFPLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlCQUFpQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUdoRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlC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
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
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableResourceMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorunDelta, autorunIterableDelta } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IChatService } from '../common/chatService.js';
import { IChatWidgetService } from './chat.js';
/**
 * Observes all live chat models and triggers OS notifications when any model
 * transitions to needing input (confirmation/elicitation).
 */
let ChatWindowNotifier = class ChatWindowNotifier extends Disposable {
    static { this.ID = 'workbench.contrib.chatWindowNotifier'; }
    constructor(_chatService, _chatWidgetService, _hostService, _configurationService) {
        super();
        this._chatService = _chatService;
        this._chatWidgetService = _chatWidgetService;
        this._hostService = _hostService;
        this._configurationService = _configurationService;
        this._activeNotifications = this._register(new DisposableResourceMap());
        const modelTrackers = this._register(new DisposableResourceMap());
        this._register(autorunIterableDelta(reader => this._chatService.chatModels.read(reader), ({ addedValues, removedValues }) => {
            for (const model of addedValues) {
                modelTrackers.set(model.sessionResource, this._trackModel(model));
            }
            for (const model of removedValues) {
                modelTrackers.deleteAndDispose(model.sessionResource);
            }
        }));
    }
    _trackModel(model) {
        return autorunDelta(model.requestNeedsInput, ({ lastValue, newValue }) => {
            const currentNeedsInput = !!newValue;
            const previousNeedsInput = !!lastValue;
            // Only notify on transition from false -> true
            if (!previousNeedsInput && currentNeedsInput && newValue) {
                this._notifyIfNeeded(model.sessionResource, newValue);
            }
            else if (previousNeedsInput && !currentNeedsInput) {
                // Clear any active notification for this session when input is no longer needed
                this._clearNotification(model.sessionResource);
            }
        });
    }
    async _notifyIfNeeded(sessionResource, info) {
        // Check configuration
        if (!this._configurationService.getValue('chat.notifyWindowOnConfirmation')) {
            return;
        }
        // Find the widget to determine the target window
        const widget = this._chatWidgetService.getWidgetBySessionResource(sessionResource);
        const targetWindow = widget ? dom.getWindow(widget.domNode) : mainWindow;
        // Only notify if window doesn't have focus
        if (targetWindow.document.hasFocus()) {
            return;
        }
        // Clear any existing notification for this session
        this._clearNotification(sessionResource);
        // Focus window in notify mode (flash taskbar/dock)
        await this._hostService.focus(targetWindow, { mode: 1 /* FocusMode.Notify */ });
        // Create OS notification
        const notificationTitle = info.title ? localize('chatTitle', "Chat: {0}", info.title) : localize('chat.untitledChat', "Untitled Chat");
        const notification = await dom.triggerNotification(notificationTitle, {
            detail: info.detail ?? localize('notificationDetail', "Approval needed to continue.")
        });
        if (notification) {
            const disposables = new DisposableStore();
            this._activeNotifications.set(sessionResource, disposables);
            disposables.add(notification);
            // Handle notification click - focus window and reveal chat
            disposables.add(Event.once(notification.onClick)(async () => {
                await this._hostService.focus(targetWindow, { mode: 2 /* FocusMode.Force */ });
                const widget = await this._chatWidgetService.openSession(sessionResource);
                widget?.focusInput();
                this._clearNotification(sessionResource);
            }));
            // Clear notification when window gains focus
            disposables.add(this._hostService.onDidChangeFocus(focus => {
                if (focus) {
                    this._clearNotification(sessionResource);
                }
            }));
        }
    }
    _clearNotification(sessionResource) {
        this._activeNotifications.deleteAndDispose(sessionResource);
    }
};
ChatWindowNotifier = __decorate([
    __param(0, IChatService),
    __param(1, IChatWidgetService),
    __param(2, IHostService),
    __param(3, IConfigurationService)
], ChatWindowNotifier);
export { ChatWindowNotifier };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpbmRvd05vdGlmaWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0V2luZG93Tm90aWZpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUcsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUduRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7YUFFakMsT0FBRSxHQUFHLHNDQUFzQyxBQUF6QyxDQUEwQztJQUk1RCxZQUNlLFlBQTJDLEVBQ3JDLGtCQUF1RCxFQUM3RCxZQUEyQyxFQUNsQyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFMdUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDcEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFv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
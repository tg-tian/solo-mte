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
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { getChatSessionType } from '../../common/chatUri.js';
let LocalAgentsSessionsProvider = class LocalAgentsSessionsProvider extends Disposable {
    static { this.ID = 'workbench.contrib.localAgentsSessionsProvider'; }
    constructor(chatService, chatSessionsService) {
        super();
        this.chatService = chatService;
        this.chatSessionsService = chatSessionsService;
        this.chatSessionType = localChatSessionType;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeChatSessionItems = this._register(new Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._register(this.chatSessionsService.registerChatSessionItemProvider(this));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.chatSessionsService.registerChatModelChangeListeners(this.chatService, Schemas.vscodeLocalChatSession, () => this._onDidChangeChatSessionItems.fire()));
        this._register(this.chatSessionsService.onDidChangeSessionItems(sessionType => {
            if (sessionType === this.chatSessionType) {
                this._onDidChange.fire();
            }
        }));
        this._register(this.chatService.onDidDisposeSession(e => {
            const session = e.sessionResource.filter(resource => getChatSessionType(resource) === this.chatSessionType);
            if (session.length > 0) {
                this._onDidChangeChatSessionItems.fire();
            }
        }));
    }
    async provideChatSessionItems(token) {
        const sessions = [];
        const sessionsByResource = new ResourceSet();
        for (const sessionDetail of await this.chatService.getLiveSessionItems()) {
            const editorSession = this.toChatSessionItem(sessionDetail);
            if (!editorSession) {
                continue;
            }
            sessionsByResource.add(sessionDetail.sessionResource);
            sessions.push(editorSession);
        }
        if (!token.isCancellationRequested) {
            const history = await this.getHistoryItems();
            sessions.push(...history.filter(historyItem => !sessionsByResource.has(historyItem.resource)));
        }
        return sessions;
    }
    async getHistoryItems() {
        try {
            const historyItems = await this.chatService.getHistorySessionItems();
            return coalesce(historyItems.map(history => this.toChatSessionItem(history)));
        }
        catch (error) {
            return [];
        }
    }
    toChatSessionItem(chat) {
        const model = this.chatService.getSession(chat.sessionResource);
        let description;
        if (model) {
            if (!model.hasRequests) {
                return undefined; // ignore sessions without requests
            }
            description = this.chatSessionsService.getInProgressSessionDescription(model);
        }
        return {
            resource: chat.sessionResource,
            provider: this,
            label: chat.title,
            description,
            status: model ? this.modelToStatus(model) : this.chatResponseStateToStatus(chat.lastResponseState),
            iconPath: Codicon.chatSparkle,
            timing: chat.timing,
            changes: chat.stats ? {
                insertions: chat.stats.added,
                deletions: chat.stats.removed,
                files: chat.stats.fileCount,
            } : undefined
        };
    }
    modelToStatus(model) {
        if (model.requestInProgress.get()) {
            return 2 /* ChatSessionStatus.InProgress */;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest?.response) {
            if (lastRequest.response.state === 4 /* ResponseModelState.NeedsInput */) {
                return 3 /* ChatSessionStatus.NeedsInput */;
            }
            else if (lastRequest.response.isCanceled || lastRequest.response.result?.errorDetails?.code === 'canceled') {
                return 1 /* ChatSessionStatus.Completed */;
            }
            else if (lastRequest.response.result?.errorDetails) {
                return 0 /* ChatSessionStatus.Failed */;
            }
            else if (lastRequest.response.isComplete) {
                return 1 /* ChatSessionStatus.Completed */;
            }
            else {
                return 2 /* ChatSessionStatus.InProgress */;
            }
        }
        return undefined;
    }
    chatResponseStateToStatus(state) {
        switch (state) {
            case 2 /* ResponseModelState.Cancelled */:
            case 1 /* ResponseModelState.Complete */:
                return 1 /* ChatSessionStatus.Completed */;
            case 3 /* ResponseModelState.Failed */:
                return 0 /* ChatSessionStatus.Failed */;
            case 0 /* ResponseModelState.Pending */:
                return 2 /* ChatSessionStatus.InProgress */;
            case 4 /* ResponseModelState.NeedsInput */:
                return 3 /* ChatSessionStatus.NeedsInput */;
        }
    }
};
LocalAgentsSessionsProvider = __decorate([
    __param(0, IChatService),
    __param(1, IChatSessionsService)
], LocalAgentsSessionsProvider);
export { LocalAgentsSessionsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxBZ2VudFNlc3Npb25zUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FnZW50U2Vzc2lvbnMvbG9jYWxBZ2VudFNlc3Npb25zUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHaEUsT0FBTyxFQUFlLFlBQVksRUFBc0IsTUFBTSw2QkFBNkIsQ0FBQztBQUM1RixPQUFPLEVBQWlFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEssT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFNdEQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO2FBRTFDLE9BQUUsR0FBRywrQ0FBK0MsQUFBbEQsQ0FBbUQ7SUFVckUsWUFDZSxXQUEwQyxFQUNsQyxtQkFBMEQ7UUFFaEYsS0FBSyxFQUFFLENBQUM7UUFIdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDakIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQVZ4RSxvQkFBZSxHQUFHLG9CQUFvQixDQUFDO1FBRS9CLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMs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
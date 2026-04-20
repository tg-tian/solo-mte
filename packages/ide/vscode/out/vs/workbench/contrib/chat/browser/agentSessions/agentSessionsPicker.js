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
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow } from '../../../../../base/common/date.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { openSession } from './agentSessionsOpener.js';
import { isLocalAgentSessionItem } from './agentSessionsModel.js';
import { IAgentSessionsService } from './agentSessionsService.js';
import { AgentSessionsSorter, groupAgentSessions } from './agentSessionsViewer.js';
import { AGENT_SESSION_DELETE_ACTION_ID, AGENT_SESSION_RENAME_ACTION_ID } from './agentSessions.js';
const archiveButton = {
    iconClass: ThemeIcon.asClassName(Codicon.archive),
    tooltip: localize('archiveSession', "Archive")
};
const unarchiveButton = {
    iconClass: ThemeIcon.asClassName(Codicon.inbox),
    tooltip: localize('unarchiveSession', "Unarchive")
};
const renameButton = {
    iconClass: ThemeIcon.asClassName(Codicon.edit),
    tooltip: localize('renameSession', "Rename")
};
const deleteButton = {
    iconClass: ThemeIcon.asClassName(Codicon.trash),
    tooltip: localize('deleteSession', "Delete")
};
let AgentSessionsPicker = class AgentSessionsPicker {
    constructor(agentSessionsService, quickInputService, instantiationService, commandService) {
        this.agentSessionsService = agentSessionsService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.sorter = new AgentSessionsSorter();
    }
    async pickAgentSession() {
        const disposables = new DisposableStore();
        const picker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        picker.items = this.createPickerItems();
        picker.canAcceptInBackground = true;
        picker.placeholder = localize('chatAgentPickerPlaceholder', "Search agent sessions by name");
        disposables.add(picker.onDidAccept(e => {
            const pick = picker.selectedItems[0];
            if (pick) {
                this.instantiationService.invokeFunction(openSession, pick.session, {
                    sideBySide: e.inBackground,
                    editorOptions: {
                        preserveFocus: e.inBackground,
                        pinned: false
                    }
                });
            }
            if (!e.inBackground) {
                picker.hide();
            }
        }));
        disposables.add(picker.onDidTriggerItemButton(async (e) => {
            const session = e.item.session;
            let reopenResolved = false;
            if (e.button === renameButton) {
                reopenResolved = true;
                await this.commandService.executeCommand(AGENT_SESSION_RENAME_ACTION_ID, session);
            }
            else if (e.button === deleteButton) {
                reopenResolved = true;
                await this.commandService.executeCommand(AGENT_SESSION_DELETE_ACTION_ID, session);
            }
            else {
                const newArchivedState = !session.isArchived();
                session.setArchived(newArchivedState);
            }
            if (reopenResolved) {
                await this.agentSessionsService.model.resolve(session.providerType);
                this.pickAgentSession();
            }
            else {
                picker.items = this.createPickerItems();
            }
        }));
        disposables.add(picker.onDidHide(() => disposables.dispose()));
        picker.show();
    }
    createPickerItems() {
        const sessions = this.agentSessionsService.model.sessions.sort(this.sorter.compare.bind(this.sorter));
        const items = [];
        const groupedSessions = groupAgentSessions(sessions);
        for (const group of groupedSessions.values()) {
            if (group.sessions.length > 0) {
                items.push({ type: 'separator', label: group.label });
                items.push(...group.sessions.map(session => this.toPickItem(session)));
            }
        }
        return items;
    }
    toPickItem(session) {
        const descriptionText = typeof session.description === 'string' ? session.description : session.description ? renderAsPlaintext(session.description) : undefined;
        const timeAgo = fromNow(session.timing.endTime || session.timing.startTime);
        const descriptionParts = [descriptionText, session.providerLabel, timeAgo].filter(part => !!part);
        const description = descriptionParts.join(' • ');
        const buttons = [];
        if (isLocalAgentSessionItem(session)) {
            buttons.push(renameButton);
            buttons.push(deleteButton);
        }
        buttons.push(session.isArchived() ? unarchiveButton : archiveButton);
        return {
            id: session.resource.toString(),
            label: session.label,
            tooltip: session.tooltip,
            description,
            iconClass: ThemeIcon.asClassName(session.icon),
            buttons,
            session
        };
    }
};
AgentSessionsPicker = __decorate([
    __param(0, IAgentSessionsService),
    __param(1, IQuickInputService),
    __param(2, IInstantiationService),
    __param(3, ICommandService)
], AgentSessionsPicker);
export { AgentSessionsPicker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc1BpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBcUIsa0JBQWtCLEVBQXVDLE1BQU0seURBQXlELENBQUM7QUFDckosT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBaUIsdUJBQXVCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQU1wRyxNQUFNLGFBQWEsR0FBc0I7SUFDeEMs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
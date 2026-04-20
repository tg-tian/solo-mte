/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IChatStatusItemService = createDecorator('chatStatusItemService');
class ChatStatusItemService {
    constructor() {
        this._entries = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    setOrUpdateEntry(entry) {
        const isUpdate = this._entries.has(entry.id);
        this._entries.set(entry.id, entry);
        if (isUpdate) {
            this._onDidChange.fire({ entry });
        }
    }
    deleteEntry(id) {
        this._entries.delete(id);
    }
    getEntries() {
        return this._entries.values();
    }
}
registerSingleton(IChatStatusItemService, ChatStatusItemService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1c0l0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U3RhdHVzL2NoYXRTdGF0dXNJdGVtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUVoRyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUM7QUF5QnZHLE1BQU0scUJBQXFCO0lBQTNCO1FBR2tCLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztRQUU5QyxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUE4QixDQUFDO1FBQ2pFLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7SUFpQmhELENBQUM7SUFmQSxnQkFBZ0IsQ0FBQyxLQUFzQjtRQUN0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQVU7UUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDL0IsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLG9DQUE0QixDQUFDIn0=
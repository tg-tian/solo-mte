/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceSet } from '../../../../base/common/map.js';
import { chatEditingSessionIsReady } from './chatEditingService.js';
export function checkModeOption(mode, option) {
    if (option === undefined) {
        return undefined;
    }
    if (typeof option === 'function') {
        return option(mode);
    }
    return option;
}
/**
 * @deprecated This is the old API shape, we should support this for a while before removing it so
 * we don't break existing chats
 */
export function migrateLegacyTerminalToolSpecificData(data) {
    if ('command' in data) {
        data = {
            kind: 'terminal',
            commandLine: {
                original: data.command,
                toolEdited: undefined,
                userEdited: undefined
            },
            language: data.language
        };
    }
    return data;
}
export async function awaitStatsForSession(model) {
    if (!model.editingSession) {
        return undefined;
    }
    await chatEditingSessionIsReady(model.editingSession);
    await Promise.all(model.editingSession.entries.get().map(entry => entry.getDiffInfo?.()));
    const diffs = model.editingSession.entries.get();
    const reduceResult = diffs.reduce((acc, diff) => {
        acc.fileUris.add(diff.originalURI);
        acc.added += diff.linesAdded?.get() ?? 0;
        acc.removed += diff.linesRemoved?.get() ?? 0;
        return acc;
    }, { fileUris: new ResourceSet(), added: 0, removed: 0 });
    if (reduceResult.fileUris.size > 0 && (reduceResult.added > 0 || reduceResult.removed > 0)) {
        return {
            fileCount: reduceResult.fileUris.size,
            added: reduceResult.added,
            removed: reduceResult.removed
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUtwRSxNQUFNLFVBQVUsZUFBZSxDQUFDLElBQWtCLEVBQUUsTUFBK0Q7SUFDbEgsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDMUIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELElBQUksT0FBTyxNQUFNLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxxQ0FBcUMsQ0FBQyxJQUE2RTtJQUNsSSxJQUFJLFNBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixJQUFJLEdBQUc7WUFDTixJQUFJLEVBQUUsVUFBVTtZQUNoQixXQUFXLEVBQUU7Z0JBQ1osUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUN0QixVQUFVLEVBQUUsU0FBUztnQkFDckIsVUFBVSxFQUFFLFNBQVM7YUFDckI7WUFDRCxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7U0FDbUIsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxLQUFpQjtJQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzNCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0RCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTFGLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2pELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDL0MsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLEdBQUcsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsR0FBRyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLFdBQVcsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFMUQsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDNUYsT0FBTztZQUNOLFNBQVMsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDckMsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLO1lBQ3pCLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztTQUM3QixDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUMifQ==
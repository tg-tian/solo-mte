/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../../base/common/async.js';
import { MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
/**
 * Sets up a recreating start marker which is resilient to prompts that clear/re-render (eg. transient
 * or powerlevel10k style prompts). The marker is recreated at the cursor position whenever the
 * existing marker is disposed. The caller is responsible for adding the startMarker to the store.
 */
export function setupRecreatingStartMarker(xterm, startMarker, fire, store, log) {
    const markerListener = new MutableDisposable();
    const recreateStartMarker = () => {
        if (store.isDisposed) {
            return;
        }
        const marker = xterm.raw.registerMarker();
        startMarker.value = marker ?? undefined;
        fire(marker);
        if (!marker) {
            markerListener.clear();
            return;
        }
        markerListener.value = marker.onDispose(() => {
            log?.('Start marker was disposed, recreating');
            recreateStartMarker();
        });
    };
    recreateStartMarker();
    store.add(toDisposable(() => {
        markerListener.dispose();
        startMarker.clear();
        fire(undefined);
    }));
    store.add(startMarker);
}
export function createAltBufferPromise(xterm, store, log) {
    const deferred = new DeferredPromise();
    const complete = () => {
        if (!deferred.isSettled) {
            log?.('Detected alternate buffer entry');
            deferred.complete();
        }
    };
    if (xterm.raw.buffer.active === xterm.raw.buffer.alternate) {
        complete();
    }
    else {
        store.add(xterm.raw.buffer.onBufferChange(() => {
            if (xterm.raw.buffer.active === xterm.raw.buffer.alternate) {
                complete();
            }
        }));
    }
    return deferred.p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyYXRlZ3lIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL2V4ZWN1dGVTdHJhdGVneS9zdHJhdGVneUhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBbUIsaUJBQWlCLEVBQUUsWUFBWSxFQUFvQixNQUFNLDRDQUE0QyxDQUFDO0FBR2hJOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLEtBQThELEVBQzlELFdBQTRDLEVBQzVDLElBQWdELEVBQ2hELEtBQXNCLEVBQ3RCLEdBQStCO0lBRS9CLE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQWlCLEVBQWUsQ0FBQztJQUM1RCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtRQUNoQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDMUMsV0FBVyxDQUFDLEtBQUssR0FBRyxNQUFNLElBQUksU0FBUyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNiLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUNELGNBQWMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDNUMsR0FBRyxFQUFFLENBQUMsdUNBQXVDLENBQUMsQ0FBQztZQUMvQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBQ0YsbUJBQW1CLEVBQUUsQ0FBQztJQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7UUFDM0IsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3pCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNKLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsS0FBMEgsRUFDMUgsS0FBc0IsRUFDdEIsR0FBK0I7SUFFL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQztJQUM3QyxNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7UUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6QixHQUFHLEVBQUUsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3pDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQixDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUQsUUFBUSxFQUFFLENBQUM7SUFDWixDQUFDO1NBQU0sQ0FBQztRQUNQLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRTtZQUM5QyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDNUQsUUFBUSxFQUFFLENBQUM7WUFDWixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyJ9
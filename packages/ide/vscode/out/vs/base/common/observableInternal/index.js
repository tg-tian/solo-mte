/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// This is a facade for the observable implementation. Only import from here!
export { observableValueOpts } from './observables/observableValueOpts.js';
export { autorun, autorunDelta, autorunHandleChanges, autorunOpts, autorunWithStore, autorunWithStoreHandleChanges, autorunIterableDelta, autorunSelfDisposable } from './reactions/autorun.js';
export { disposableObservableValue } from './observables/observableValue.js';
export { derived, derivedDisposable, derivedHandleChanges, derivedOpts, derivedWithSetter, derivedWithStore } from './observables/derived.js';
export { ObservableLazy, ObservableLazyPromise, ObservablePromise, PromiseResult, } from './utils/promise.js';
export { derivedWithCancellationToken, waitForState } from './utils/utilsCancellation.js';
export { debouncedObservable, debouncedObservable2, derivedObservableWithCache, derivedObservableWithWritableCache, keepObserved, mapObservableArrayCached, observableFromPromise, recomputeInitiallyAndOnChange, signalFromObservable, wasEventTriggeredRecently, isObservable, } from './utils/utils.js';
export { recordChanges, recordChangesLazy } from './changeTracker.js';
export { constObservable } from './observables/constObservable.js';
export { observableSignal } from './observables/observableSignal.js';
export { observableFromEventOpts } from './observables/observableFromEvent.js';
export { observableSignalFromEvent } from './observables/observableSignalFromEvent.js';
export { asyncTransaction, globalTransaction, subtransaction, transaction, TransactionImpl } from './transaction.js';
export { observableFromValueWithChangeEvent, ValueWithChangeEventFromObservable } from './utils/valueWithChangeEvent.js';
export { runOnChange, runOnChangeWithCancellationToken, runOnChangeWithStore } from './utils/runOnChange.js';
export { derivedConstOnceDefined, latestChangedValue } from './experimental/utils.js';
export { observableFromEvent } from './observables/observableFromEvent.js';
export { observableValue } from './observables/observableValue.js';
export { ObservableSet } from './set.js';
export { ObservableMap } from './map.js';
export { DebugLocation } from './debugLocation.js';
import { addLogger, setLogObservableFn } from './logging/logging.js';
import { ConsoleObservableLogger, logObservableToConsole } from './logging/consoleObservableLogger.js';
import { DevToolsLogger } from './logging/debugger/devToolsLogger.js';
import { env } from '../process.js';
import { _setDebugGetObservableGraph } from './observables/baseObservable.js';
import { debugGetObservableGraph } from './logging/debugGetDependencyGraph.js';
_setDebugGetObservableGraph(debugGetObservableGraph);
setLogObservableFn(logObservableToConsole);
// Remove "//" in the next line to enable logging
const enableLogging = false;
if (enableLogging) {
    addLogger(new ConsoleObservableLogger());
}
if (env && env['VSCODE_DEV_DEBUG_OBSERVABLES']) {
    // To debug observables you also need the extension "ms-vscode.debug-value-editor"
    addLogger(DevToolsLogger.getInstance());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZFQUE2RTtBQUU3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsNkJBQTZCLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVoTSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTlJLE9BQU8sRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDOUcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFGLE9BQU8sRUFDTixtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSwwQkFBMEIsRUFDckUsa0NBQWtDLEVBQUUsWUFBWSxFQUFFLHdCQUF3QixFQUFFLHFCQUFxQixFQUNqRyw2QkFBNkIsRUFDN0Isb0JBQW9CLEVBQUUseUJBQXlCLEVBQy9DLFlBQVksR0FDWixNQUFNLGtCQUFrQixDQUFDO0FBRTFCLE9BQU8sRUFBNEMsYUFBYSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDaEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBMEIsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNySCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6SCxPQUFPLEVBQUUsV0FBVyxFQUFFLGdDQUFnQyxFQUFFLG9CQUFvQixFQUF3QixNQUFNLHdCQUF3QixDQUFDO0FBQ25JLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELE9BQU8sRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNwQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRSwyQkFBMkIsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3JELGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFFM0MsaURBQWlEO0FBQ2pELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FFekI7QUFFRixJQUFJLGFBQWEsRUFBRSxDQUFDO0lBQ25CLFNBQVMsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQztJQUNoRCxrRkFBa0Y7SUFDbEYsU0FBUyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLENBQUMifQ==
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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, debouncedObservable, derived, ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IDebugService } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
var PickerMode;
(function (PickerMode) {
    PickerMode["Main"] = "main";
    PickerMode["Expression"] = "expression";
})(PickerMode || (PickerMode = {}));
let DebugSessionContextPick = class DebugSessionContextPick {
    constructor(debugService) {
        this.debugService = debugService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.debugSession', 'Debug Session...');
        this.icon = Codicon.debug;
        this.ordinal = -200;
    }
    isEnabled() {
        // Only enabled when there's a focused session that is stopped (paused)
        const viewModel = this.debugService.getViewModel();
        const focusedSession = viewModel.focusedSession;
        return !!focusedSession && focusedSession.state === 2 /* State.Stopped */;
    }
    asPicker(_widget) {
        const store = new DisposableStore();
        const mode = observableValue('debugPicker.mode', "main" /* PickerMode.Main */);
        const query = observableValue('debugPicker.query', '');
        const picksObservable = this.createPicksObservable(mode, query, store);
        return {
            placeholder: localize('selectDebugData', 'Select debug data to attach'),
            picks: (_queryObs, token) => {
                // Connect the external query observable to our internal one
                store.add(autorun(reader => {
                    query.set(_queryObs.read(reader), undefined);
                }));
                const cts = new CancellationTokenSource(token);
                store.add(toDisposable(() => cts.dispose(true)));
                return picksObservable;
            },
            goBack: () => {
                if (mode.get() === "expression" /* PickerMode.Expression */) {
                    mode.set("main" /* PickerMode.Main */, undefined);
                    return true; // Stay in picker
                }
                return false; // Go back to main context menu
            },
            dispose: () => store.dispose(),
        };
    }
    createPicksObservable(mode, query, store) {
        const debouncedQuery = debouncedObservable(query, 300);
        return derived(reader => {
            const currentMode = mode.read(reader);
            if (currentMode === "expression" /* PickerMode.Expression */) {
                return this.getExpressionPicks(debouncedQuery, store);
            }
            else {
                return this.getMainPicks(mode);
            }
        }).flatten();
    }
    getMainPicks(mode) {
        // Return an observable that resolves to the main picks
        const promise = derived(_reader => {
            return new ObservablePromise(this.buildMainPicks(mode));
        });
        return promise.map((value, reader) => {
            const result = value.promiseResult.read(reader);
            return { picks: result?.data || [], busy: result === undefined };
        });
    }
    async buildMainPicks(mode) {
        const picks = [];
        const viewModel = this.debugService.getViewModel();
        const stackFrame = viewModel.focusedStackFrame;
        const session = viewModel.focusedSession;
        if (!session || !stackFrame) {
            return picks;
        }
        // Add "Expression Value..." option at the top
        picks.push({
            label: localize('expressionValue', 'Expression Value...'),
            iconClass: ThemeIcon.asClassName(Codicon.symbolVariable),
            asAttachment: () => {
                // Switch to expression mode
                mode.set("expression" /* PickerMode.Expression */, undefined);
                return 'noop';
            },
        });
        // Add watch expressions section
        const watches = this.debugService.getModel().getWatchExpressions();
        if (watches.length > 0) {
            picks.push({ type: 'separator', label: localize('watchExpressions', 'Watch Expressions') });
            for (const watch of watches) {
                picks.push({
                    label: watch.name,
                    description: watch.value,
                    iconClass: ThemeIcon.asClassName(Codicon.eye),
                    asAttachment: () => createDebugAttachments(stackFrame, createDebugVariableEntry(watch)),
                });
            }
        }
        // Add scopes and their variables
        let scopes = [];
        try {
            scopes = await stackFrame.getScopes();
        }
        catch {
            // Ignore errors when fetching scopes
        }
        for (const scope of scopes) {
            // Include variables from non-expensive scopes
            if (scope.expensive && !scope.childrenHaveBeenLoaded) {
                continue;
            }
            picks.push({ type: 'separator', label: scope.name });
            try {
                const variables = await scope.getChildren();
                if (variables.length > 1) {
                    picks.push({
                        label: localize('allVariablesInScope', 'All variables in {0}', scope.name),
                        iconClass: ThemeIcon.asClassName(Codicon.symbolNamespace),
                        asAttachment: () => createDebugAttachments(stackFrame, createScopeEntry(scope, variables)),
                    });
                }
                for (const variable of variables) {
                    picks.push({
                        label: variable.name,
                        description: formatVariableDescription(variable),
                        iconClass: ThemeIcon.asClassName(Codicon.symbolVariable),
                        asAttachment: () => createDebugAttachments(stackFrame, createDebugVariableEntry(variable)),
                    });
                }
            }
            catch {
                // Ignore errors when fetching variables
            }
        }
        return picks;
    }
    getExpressionPicks(query, _store) {
        const promise = derived((reader) => {
            const queryValue = query.read(reader);
            const cts = new CancellationTokenSource();
            reader.store.add(toDisposable(() => cts.dispose(true)));
            return new ObservablePromise(this.evaluateExpression(queryValue, cts.token));
        });
        return promise.map((value, r) => {
            const result = value.promiseResult.read(r);
            return { picks: result?.data || [], busy: result === undefined };
        });
    }
    async evaluateExpression(expression, token) {
        if (!expression.trim()) {
            return [{
                    label: localize('typeExpression', 'Type an expression to evaluate...'),
                    disabled: true,
                    asAttachment: () => 'noop',
                }];
        }
        const viewModel = this.debugService.getViewModel();
        const session = viewModel.focusedSession;
        const stackFrame = viewModel.focusedStackFrame;
        if (!session || !stackFrame) {
            return [{
                    label: localize('noDebugSession', 'No active debug session'),
                    disabled: true,
                    asAttachment: () => 'noop',
                }];
        }
        try {
            const response = await session.evaluate(expression, stackFrame.frameId, 'watch');
            if (token.isCancellationRequested) {
                return [];
            }
            if (response?.body) {
                const resultValue = response.body.result;
                const resultType = response.body.type;
                return [{
                        label: expression,
                        description: formatExpressionResult(resultValue, resultType),
                        iconClass: ThemeIcon.asClassName(Codicon.symbolVariable),
                        asAttachment: () => createDebugAttachments(stackFrame, {
                            kind: 'debugVariable',
                            id: `debug-expression:${expression}`,
                            name: expression,
                            fullName: expression,
                            icon: Codicon.debug,
                            value: resultValue,
                            expression: expression,
                            type: resultType,
                            modelDescription: formatModelDescription(expression, resultValue, resultType),
                        }),
                    }];
            }
            else {
                return [{
                        label: expression,
                        description: localize('noResult', 'No result'),
                        disabled: true,
                        asAttachment: () => 'noop',
                    }];
            }
        }
        catch (err) {
            return [{
                    label: expression,
                    description: err instanceof Error ? err.message : localize('evaluationError', 'Evaluation error'),
                    disabled: true,
                    asAttachment: () => 'noop',
                }];
        }
    }
};
DebugSessionContextPick = __decorate([
    __param(0, IDebugService)
], DebugSessionContextPick);
function createDebugVariableEntry(expression) {
    return {
        kind: 'debugVariable',
        id: `debug-variable:${expression.getId()}`,
        name: expression.name,
        fullName: expression.name,
        icon: Codicon.debug,
        value: expression.value,
        expression: expression.name,
        type: expression.type,
        modelDescription: formatModelDescription(expression.name, expression.value, expression.type),
    };
}
function createPausedLocationEntry(stackFrame) {
    const uri = stackFrame.source.uri;
    let range = Range.lift(stackFrame.range);
    if (range.isEmpty()) {
        range = range.setEndPosition(range.startLineNumber + 1, 1);
    }
    return {
        kind: 'file',
        value: { uri, range },
        id: `debug-paused-location:${uri.toString()}:${range.startLineNumber}`,
        name: basename(uri),
        modelDescription: 'The debugger is currently paused at this location',
    };
}
function createDebugAttachments(stackFrame, variableEntry) {
    return [
        createPausedLocationEntry(stackFrame),
        variableEntry,
    ];
}
function createScopeEntry(scope, variables) {
    const variablesSummary = variables.map(v => `${v.name}: ${v.value}`).join('\n');
    return {
        kind: 'debugVariable',
        id: `debug-scope:${scope.name}`,
        name: `Scope: ${scope.name}`,
        fullName: `Scope: ${scope.name}`,
        icon: Codicon.debug,
        value: variablesSummary,
        expression: scope.name,
        type: 'scope',
        modelDescription: `Debug scope "${scope.name}" with ${variables.length} variables:\n${variablesSummary}`,
    };
}
function formatVariableDescription(expression) {
    const value = expression.value;
    const type = expression.type;
    if (type && value) {
        return `${type}: ${value}`;
    }
    return value || type || '';
}
function formatExpressionResult(value, type) {
    if (type && value) {
        return `${type}: ${value}`;
    }
    return value || type || '';
}
function formatModelDescription(name, value, type) {
    let description = `Debug variable "${name}"`;
    if (type) {
        description += ` of type ${type}`;
    }
    description += ` with value: ${value}`;
    return description;
}
let DebugChatContextContribution = class DebugChatContextContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chat.debugChatContextContribution'; }
    constructor(contextPickService, instantiationService) {
        super();
        this._register(contextPickService.registerChatContextItem(instantiationService.createInstance(DebugSessionContextPick)));
    }
};
DebugChatContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService)
], DebugChatContextContribution);
export { DebugChatContextContribution };
// Context menu action: Add variable to chat
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.action.addVariableToChat',
            title: localize('addToChat', 'Add to Chat'),
            f1: false,
            menu: {
                id: MenuId.DebugVariablesContext,
                group: 'z_commands',
                order: 110,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const debugService = accessor.get(IDebugService);
        const widget = await chatWidgetService.revealWidget();
        if (!widget) {
            return;
        }
        // Context is the variable from the variables view
        const entry = createDebugVariableEntryFromContext(context);
        if (entry) {
            const stackFrame = debugService.getViewModel().focusedStackFrame;
            if (stackFrame) {
                widget.attachmentModel.addContext(createPausedLocationEntry(stackFrame));
            }
            widget.attachmentModel.addContext(entry);
        }
    }
});
// Context menu action: Add watch expression to chat
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.action.addWatchExpressionToChat',
            title: localize('addToChat', 'Add to Chat'),
            f1: false,
            menu: {
                id: MenuId.DebugWatchContext,
                group: 'z_commands',
                order: 110,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const debugService = accessor.get(IDebugService);
        const widget = await chatWidgetService.revealWidget();
        if (!context || !widget) {
            return;
        }
        // Context is the expression (watch expression or variable under it)
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        if (stackFrame) {
            widget.attachmentModel.addContext(createPausedLocationEntry(stackFrame));
        }
        widget.attachmentModel.addContext(createDebugVariableEntry(context));
    }
});
// Context menu action: Add scope to chat
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.action.addScopeToChat',
            title: localize('addToChat', 'Add to Chat'),
            f1: false,
            menu: {
                id: MenuId.DebugScopesContext,
                group: 'z_commands',
                order: 1,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const debugService = accessor.get(IDebugService);
        const widget = await chatWidgetService.revealWidget();
        if (!context || !widget) {
            return;
        }
        // Get the actual scope and its variables
        const viewModel = debugService.getViewModel();
        const stackFrame = viewModel.focusedStackFrame;
        if (!stackFrame) {
            return;
        }
        try {
            const scopes = await stackFrame.getScopes();
            const scope = scopes.find(s => s.name === context.scope.name);
            if (scope) {
                const variables = await scope.getChildren();
                widget.attachmentModel.addContext(createPausedLocationEntry(stackFrame));
                widget.attachmentModel.addContext(createScopeEntry(scope, variables));
            }
        }
        catch {
            // Ignore errors
        }
    }
});
function isVariablesContext(context) {
    return typeof context === 'object' && context !== null && 'variable' in context && 'sessionId' in context;
}
function createDebugVariableEntryFromContext(context) {
    // The context can be either a Variable directly, or an IVariablesContext object
    if (context instanceof Variable) {
        return createDebugVariableEntry(context);
    }
    // Handle IVariablesContext format from the variables view
    if (isVariablesContext(context)) {
        const variable = context.variable;
        return {
            kind: 'debugVariable',
            id: `debug-variable:${variable.name}`,
            name: variable.name,
            fullName: variable.evaluateName ?? variable.name,
            icon: Codicon.debug,
            value: variable.value,
            expression: variable.evaluateName ?? variable.name,
            type: variable.type,
            modelDescription: formatModelDescription(variable.evaluateName || variable.name, variable.value, variable.type),
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDaGF0SW50ZWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0NoYXRJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFvQyxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwSyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBRXJILE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdFLE9BQU8sRUFBK0QsdUJBQXVCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwSixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGFBQWEsRUFBMkMs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
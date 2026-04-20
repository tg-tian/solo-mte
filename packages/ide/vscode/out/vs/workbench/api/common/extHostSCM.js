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
/* eslint-disable local/code-no-native-private */
import { URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { debounce } from '../../../base/common/decorators.js';
import { DisposableMap, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { asPromise } from '../../../base/common/async.js';
import { MainContext } from './extHost.protocol.js';
import { sortedDiff, equals } from '../../../base/common/arrays.js';
import { comparePaths } from '../../../base/common/comparers.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { MarkdownString, SourceControlInputBoxValidationType } from './extHostTypeConverters.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { Schemas } from '../../../base/common/network.js';
import { isLinux } from '../../../base/common/platform.js';
import { structuralEquals } from '../../../base/common/equals.js';
import { Iterable } from '../../../base/common/iterator.js';
function isUri(thing) {
    return thing instanceof URI;
}
function uriEquals(a, b) {
    if (a.scheme === Schemas.file && b.scheme === Schemas.file && isLinux) {
        return a.toString() === b.toString();
    }
    return a.toString().toLowerCase() === b.toString().toLowerCase();
}
function getIconResource(decorations) {
    if (!decorations) {
        return undefined;
    }
    else if (typeof decorations.iconPath === 'string') {
        return URI.file(decorations.iconPath);
    }
    else if (URI.isUri(decorations.iconPath)) {
        return decorations.iconPath;
    }
    else if (ThemeIcon.isThemeIcon(decorations.iconPath)) {
        return decorations.iconPath;
    }
    else {
        return undefined;
    }
}
function getHistoryItemIconDto(icon) {
    if (!icon) {
        return undefined;
    }
    else if (URI.isUri(icon)) {
        return icon;
    }
    else if (ThemeIcon.isThemeIcon(icon)) {
        return icon;
    }
    else {
        const iconDto = icon;
        return { light: iconDto.light, dark: iconDto.dark };
    }
}
function toSCMHistoryItemDto(historyItem) {
    const authorIcon = getHistoryItemIconDto(historyItem.authorIcon);
    const tooltip = Array.isArray(historyItem.tooltip)
        ? MarkdownString.fromMany(historyItem.tooltip)
        : historyItem.tooltip ? MarkdownString.from(historyItem.tooltip) : undefined;
    const references = historyItem.references?.map(r => ({
        ...r, icon: getHistoryItemIconDto(r.icon)
    }));
    return { ...historyItem, authorIcon, references, tooltip };
}
function toSCMHistoryItemRefDto(historyItemRef) {
    return historyItemRef ? { ...historyItemRef, icon: getHistoryItemIconDto(historyItemRef.icon) } : undefined;
}
function compareResourceThemableDecorations(a, b) {
    if (!a.iconPath && !b.iconPath) {
        return 0;
    }
    else if (!a.iconPath) {
        return -1;
    }
    else if (!b.iconPath) {
        return 1;
    }
    const aPath = typeof a.iconPath === 'string' ? a.iconPath : URI.isUri(a.iconPath) ? a.iconPath.fsPath : a.iconPath.id;
    const bPath = typeof b.iconPath === 'string' ? b.iconPath : URI.isUri(b.iconPath) ? b.iconPath.fsPath : b.iconPath.id;
    return comparePaths(aPath, bPath);
}
function compareResourceStatesDecorations(a, b) {
    let result = 0;
    if (a.strikeThrough !== b.strikeThrough) {
        return a.strikeThrough ? 1 : -1;
    }
    if (a.faded !== b.faded) {
        return a.faded ? 1 : -1;
    }
    if (a.tooltip !== b.tooltip) {
        return (a.tooltip || '').localeCompare(b.tooltip || '');
    }
    result = compareResourceThemableDecorations(a, b);
    if (result !== 0) {
        return result;
    }
    if (a.light && b.light) {
        result = compareResourceThemableDecorations(a.light, b.light);
    }
    else if (a.light) {
        return 1;
    }
    else if (b.light) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.dark && b.dark) {
        result = compareResourceThemableDecorations(a.dark, b.dark);
    }
    else if (a.dark) {
        return 1;
    }
    else if (b.dark) {
        return -1;
    }
    return result;
}
function compareCommands(a, b) {
    if (a.command !== b.command) {
        return a.command < b.command ? -1 : 1;
    }
    if (a.title !== b.title) {
        return a.title < b.title ? -1 : 1;
    }
    if (a.tooltip !== b.tooltip) {
        if (a.tooltip !== undefined && b.tooltip !== undefined) {
            return a.tooltip < b.tooltip ? -1 : 1;
        }
        else if (a.tooltip !== undefined) {
            return 1;
        }
        else if (b.tooltip !== undefined) {
            return -1;
        }
    }
    if (a.arguments === b.arguments) {
        return 0;
    }
    else if (!a.arguments) {
        return -1;
    }
    else if (!b.arguments) {
        return 1;
    }
    else if (a.arguments.length !== b.arguments.length) {
        return a.arguments.length - b.arguments.length;
    }
    for (let i = 0; i < a.arguments.length; i++) {
        const aArg = a.arguments[i];
        const bArg = b.arguments[i];
        if (aArg === bArg) {
            continue;
        }
        if (isUri(aArg) && isUri(bArg) && uriEquals(aArg, bArg)) {
            continue;
        }
        return aArg < bArg ? -1 : 1;
    }
    return 0;
}
function compareResourceStates(a, b) {
    let result = comparePaths(a.resourceUri.fsPath, b.resourceUri.fsPath, true);
    if (result !== 0) {
        return result;
    }
    if (a.command && b.command) {
        result = compareCommands(a.command, b.command);
    }
    else if (a.command) {
        return 1;
    }
    else if (b.command) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.decorations && b.decorations) {
        result = compareResourceStatesDecorations(a.decorations, b.decorations);
    }
    else if (a.decorations) {
        return 1;
    }
    else if (b.decorations) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.multiFileDiffEditorModifiedUri && b.multiFileDiffEditorModifiedUri) {
        result = comparePaths(a.multiFileDiffEditorModifiedUri.fsPath, b.multiFileDiffEditorModifiedUri.fsPath, true);
    }
    else if (a.multiFileDiffEditorModifiedUri) {
        return 1;
    }
    else if (b.multiFileDiffEditorModifiedUri) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.multiDiffEditorOriginalUri && b.multiDiffEditorOriginalUri) {
        result = comparePaths(a.multiDiffEditorOriginalUri.fsPath, b.multiDiffEditorOriginalUri.fsPath, true);
    }
    else if (a.multiDiffEditorOriginalUri) {
        return 1;
    }
    else if (b.multiDiffEditorOriginalUri) {
        return -1;
    }
    return result;
}
function compareArgs(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
function commandEquals(a, b) {
    return a.command === b.command
        && a.title === b.title
        && a.tooltip === b.tooltip
        && (a.arguments && b.arguments ? compareArgs(a.arguments, b.arguments) : a.arguments === b.arguments);
}
function commandListEquals(a, b) {
    return equals(a, b, commandEquals);
}
export class ExtHostSCMInputBox {
    #proxy;
    #extHostDocuments;
    get value() {
        return this._value;
    }
    set value(value) {
        value = value ?? '';
        this.#proxy.$setInputBoxValue(this._sourceControlHandle, value);
        this.updateValue(value);
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(placeholder) {
        this.#proxy.$setInputBoxPlaceholder(this._sourceControlHandle, placeholder);
        this._placeholder = placeholder;
    }
    get validateInput() {
        checkProposedApiEnabled(this._extension, 'scmValidation');
        return this._validateInput;
    }
    set validateInput(fn) {
        checkProposedApiEnabled(this._extension, 'scmValidation');
        if (fn && typeof fn !== 'function') {
            throw new Error(`[${this._extension.identifier.value}]: Invalid SCM input box validation function`);
        }
        this._validateInput = fn;
        this.#proxy.$setValidationProviderIsEnabled(this._sourceControlHandle, !!fn);
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(enabled) {
        enabled = !!enabled;
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        this.#proxy.$setInputBoxEnablement(this._sourceControlHandle, enabled);
    }
    get visible() {
        return this._visible;
    }
    set visible(visible) {
        visible = !!visible;
        if (this._visible === visible) {
            return;
        }
        this._visible = visible;
        this.#proxy.$setInputBoxVisibility(this._sourceControlHandle, visible);
    }
    get document() {
        checkProposedApiEnabled(this._extension, 'scmTextDocument');
        return this.#extHostDocuments.getDocument(this._documentUri);
    }
    constructor(_extension, _extHostDocuments, proxy, _sourceControlHandle, _documentUri) {
        this._extension = _extension;
        this._sourceControlHandle = _sourceControlHandle;
        this._documentUri = _documentUri;
        this._value = '';
        this._onDidChange = new Emitter();
        this._placeholder = '';
        this._enabled = true;
        this._visible = true;
        this.#extHostDocuments = _extHostDocuments;
        this.#proxy = proxy;
    }
    showValidationMessage(message, type) {
        checkProposedApiEnabled(this._extension, 'scmValidation');
        this.#proxy.$showValidationMessage(this._sourceControlHandle, message, SourceControlInputBoxValidationType.from(type));
    }
    $onInputBoxValueChange(value) {
        this.updateValue(value);
    }
    updateValue(value) {
        this._value = value;
        this._onDidChange.fire(value);
    }
}
class ExtHostSourceControlResourceGroup {
    static { this._handlePool = 0; }
    get disposed() { return this._disposed; }
    get id() { return this._id; }
    get label() { return this._label; }
    set label(label) {
        this._label = label;
        this._proxy.$updateGroupLabel(this._sourceControlHandle, this.handle, label);
    }
    get contextValue() {
        return this._contextValue;
    }
    set contextValue(contextValue) {
        this._contextValue = contextValue;
        this._proxy.$updateGroup(this._sourceControlHandle, this.handle, this.features);
    }
    get hideWhenEmpty() { return this._hideWhenEmpty; }
    set hideWhenEmpty(hideWhenEmpty) {
        this._hideWhenEmpty = hideWhenEmpty;
        this._proxy.$updateGroup(this._sourceControlHandle, this.handle, this.features);
    }
    get features() {
        return {
            contextValue: this.contextValue,
            hideWhenEmpty: this.hideWhenEmpty
        };
    }
    get resourceStates() { return [...this._resourceStates]; }
    set resourceStates(resources) {
        this._resourceStates = [...resources];
        this._onDidUpdateResourceStates.fire();
    }
    constructor(_proxy, _commands, _sourceControlHandle, _id, _label, multiDiffEditorEnableViewChanges, _extension) {
        this._proxy = _proxy;
        this._commands = _commands;
        this._sourceControlHandle = _sourceControlHandle;
        this._id = _id;
        this._label = _label;
        this.multiDiffEditorEnableViewChanges = multiDiffEditorEnableViewChanges;
        this._extension = _extension;
        this._resourceHandlePool = 0;
        this._resourceStates = [];
        this._resourceStatesMap = new Map();
        this._resourceStatesCommandsMap = new Map();
        this._resourceStatesDisposablesMap = new Map();
        this._onDidUpdateResourceStates = new Emitter();
        this.onDidUpdateResourceStates = this._onDidUpdateResourceStates.event;
        this._disposed = false;
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        this._handlesSnapshot = [];
        this._resourceSnapshot = [];
        this._contextValue = undefined;
        this._hideWhenEmpty = undefined;
        this.handle = ExtHostSourceControlResourceGroup._handlePool++;
    }
    getResourceState(handle) {
        return this._resourceStatesMap.get(handle);
    }
    $executeResourceCommand(handle, preserveFocus) {
        const command = this._resourceStatesCommandsMap.get(handle);
        if (!command) {
            return Promise.resolve(undefined);
        }
        return asPromise(() => this._commands.executeCommand(command.command, ...(command.arguments || []), preserveFocus));
    }
    _takeResourceStateSnapshot() {
        const snapshot = [...this._resourceStates].sort(compareResourceStates);
        const diffs = sortedDiff(this._resourceSnapshot, snapshot, compareResourceStates);
        const splices = diffs.map(diff => {
            const toInsert = diff.toInsert.map(r => {
                const handle = this._resourceHandlePool++;
                this._resourceStatesMap.set(handle, r);
                const sourceUri = r.resourceUri;
                let command;
                if (r.command) {
                    if (r.command.command === 'vscode.open' || r.command.command === 'vscode.diff' || r.command.command === 'vscode.changes') {
                        const disposables = new DisposableStore();
                        command = this._commands.converter.toInternal(r.command, disposables);
                        this._resourceStatesDisposablesMap.set(handle, disposables);
                    }
                    else {
                        this._resourceStatesCommandsMap.set(handle, r.command);
                    }
                }
                const hasScmMultiDiffEditorProposalEnabled = isProposedApiEnabled(this._extension, 'scmMultiDiffEditor');
                const multiFileDiffEditorOriginalUri = hasScmMultiDiffEditorProposalEnabled ? r.multiDiffEditorOriginalUri : undefined;
                const multiFileDiffEditorModifiedUri = hasScmMultiDiffEditorProposalEnabled ? r.multiFileDiffEditorModifiedUri : undefined;
                const icon = getIconResource(r.decorations);
                const lightIcon = r.decorations && getIconResource(r.decorations.light) || icon;
                const darkIcon = r.decorations && getIconResource(r.decorations.dark) || icon;
                const icons = [lightIcon, darkIcon];
                const tooltip = (r.decorations && r.decorations.tooltip) || '';
                const strikeThrough = r.decorations && !!r.decorations.strikeThrough;
                const faded = r.decorations && !!r.decorations.faded;
                const contextValue = r.contextValue || '';
                const rawResource = [handle, sourceUri, icons, tooltip, strikeThrough, faded, contextValue, command, multiFileDiffEditorOriginalUri, multiFileDiffEditorModifiedUri];
                return { rawResource, handle };
            });
            return { start: diff.start, deleteCount: diff.deleteCount, toInsert };
        });
        const rawResourceSplices = splices
            .map(({ start, deleteCount, toInsert }) => [start, deleteCount, toInsert.map(i => i.rawResource)]);
        const reverseSplices = splices.reverse();
        for (const { start, deleteCount, toInsert } of reverseSplices) {
            const handles = toInsert.map(i => i.handle);
            const handlesToDelete = this._handlesSnapshot.splice(start, deleteCount, ...handles);
            for (const handle of handlesToDelete) {
                this._resourceStatesMap.delete(handle);
                this._resourceStatesCommandsMap.delete(handle);
                this._resourceStatesDisposablesMap.get(handle)?.dispose();
                this._resourceStatesDisposablesMap.delete(handle);
            }
        }
        this._resourceSnapshot = snapshot;
        return rawResourceSplices;
    }
    dispose() {
        this._disposed = true;
        this._onDidDispose.fire();
    }
}
class ExtHostSourceControl {
    static { this._handlePool = 0; }
    #proxy;
    get id() {
        return this._id;
    }
    get label() {
        return this._label;
    }
    get rootUri() {
        return this._rootUri;
    }
    get contextValue() {
        checkProposedApiEnabled(this._extension, 'scmProviderOptions');
        return this._contextValue;
    }
    set contextValue(contextValue) {
        checkProposedApiEnabled(this._extension, 'scmProviderOptions');
        if (this._contextValue === contextValue) {
            return;
        }
        this._contextValue = contextValue;
        this.#proxy.$updateSourceControl(this.handle, { contextValue });
    }
    get inputBox() { return this._inputBox; }
    get count() {
        return this._count;
    }
    set count(count) {
        if (this._count === count) {
            return;
        }
        this._count = count;
        this.#proxy.$updateSourceControl(this.handle, { count });
    }
    get quickDiffProvider() {
        return this._quickDiffProvider;
    }
    set quickDiffProvider(quickDiffProvider) {
        this._quickDiffProvider = quickDiffProvider;
        let quickDiffLabel = undefined;
        if (isProposedApiEnabled(this._extension, 'quickDiffProvider')) {
            quickDiffLabel = quickDiffProvider?.label;
        }
        this.#proxy.$updateSourceControl(this.handle, { hasQuickDiffProvider: !!quickDiffProvider, quickDiffLabel });
    }
    get secondaryQuickDiffProvider() {
        checkProposedApiEnabled(this._extension, 'quickDiffProvider');
        return this._secondaryQuickDiffProvider;
    }
    set secondaryQuickDiffProvider(secondaryQuickDiffProvider) {
        checkProposedApiEnabled(this._extension, 'quickDiffProvider');
        this._secondaryQuickDiffProvider = secondaryQuickDiffProvider;
        const secondaryQuickDiffLabel = secondaryQuickDiffProvider?.label;
        this.#proxy.$updateSourceControl(this.handle, { hasSecondaryQuickDiffProvider: !!secondaryQuickDiffProvider, secondaryQuickDiffLabel });
    }
    get historyProvider() {
        checkProposedApiEnabled(this._extension, 'scmHistoryProvider');
        return this._historyProvider;
    }
    set historyProvider(historyProvider) {
        checkProposedApiEnabled(this._extension, 'scmHistoryProvider');
        this._historyProvider = historyProvider;
        this._historyProviderDisposable.value = new DisposableStore();
        this.#proxy.$updateSourceControl(this.handle, { hasHistoryProvider: !!historyProvider });
        if (historyProvider) {
            this._historyProviderDisposable.value.add(historyProvider.onDidChangeCurrentHistoryItemRefs(() => {
                const historyItemRef = toSCMHistoryItemRefDto(historyProvider?.currentHistoryItemRef);
                const historyItemRemoteRef = toSCMHistoryItemRefDto(historyProvider?.currentHistoryItemRemoteRef);
                const historyItemBaseRef = toSCMHistoryItemRefDto(historyProvider?.currentHistoryItemBaseRef);
                this.#proxy.$onDidChangeHistoryProviderCurrentHistoryItemRefs(this.handle, historyItemRef, historyItemRemoteRef, historyItemBaseRef);
            }));
            this._historyProviderDisposable.value.add(historyProvider.onDidChangeHistoryItemRefs((e) => {
                if (e.added.length === 0 && e.modified.length === 0 && e.removed.length === 0) {
                    return;
                }
                const added = e.added.map(ref => ({ ...ref, icon: getHistoryItemIconDto(ref.icon) }));
                const modified = e.modified.map(ref => ({ ...ref, icon: getHistoryItemIconDto(ref.icon) }));
                const removed = e.removed.map(ref => ({ ...ref, icon: getHistoryItemIconDto(ref.icon) }));
                this.#proxy.$onDidChangeHistoryProviderHistoryItemRefs(this.handle, { added, modified, removed, silent: e.silent });
            }));
        }
    }
    get artifactProvider() {
        checkProposedApiEnabled(this._extension, 'scmArtifactProvider');
        return this._artifactProvider;
    }
    set artifactProvider(artifactProvider) {
        checkProposedApiEnabled(this._extension, 'scmArtifactProvider');
        this._artifactProvider = artifactProvider;
        this._artifactProviderDisposable.value = new DisposableStore();
        this.#proxy.$updateSourceControl(this.handle, { hasArtifactProvider: !!artifactProvider });
        if (artifactProvider) {
            this._artifactProviderDisposable.value.add(artifactProvider.onDidChangeArtifacts((groups) => {
                if (groups.length !== 0) {
                    this.#proxy.$onDidChangeArtifacts(this.handle, groups);
                }
            }));
        }
    }
    get commitTemplate() {
        return this._commitTemplate;
    }
    set commitTemplate(commitTemplate) {
        if (commitTemplate === this._commitTemplate) {
            return;
        }
        this._commitTemplate = commitTemplate;
        this.#proxy.$updateSourceControl(this.handle, { commitTemplate });
    }
    get acceptInputCommand() {
        return this._acceptInputCommand;
    }
    set acceptInputCommand(acceptInputCommand) {
        this._acceptInputDisposables.value = new DisposableStore();
        this._acceptInputCommand = acceptInputCommand;
        const internal = this._commands.converter.toInternal(acceptInputCommand, this._acceptInputDisposables.value);
        this.#proxy.$updateSourceControl(this.handle, { acceptInputCommand: internal });
    }
    get actionButton() {
        checkProposedApiEnabled(this._extension, 'scmActionButton');
        return this._actionButton;
    }
    set actionButton(actionButton) {
        checkProposedApiEnabled(this._extension, 'scmActionButton');
        // We have to do this check before converting the command to it's internal
        // representation since that would always create a command with a unique
        // identifier
        if (structuralEquals(this._actionButton, actionButton)) {
            return;
        }
        // In order to prevent disposing the action button command that are still rendered in the UI
        // until the next UI update, we ensure to dispose them after the update has been completed.
        const oldActionButtonDisposables = this._actionButtonDisposables;
        this._actionButtonDisposables = new DisposableStore();
        this._actionButton = actionButton;
        const actionButtonDto = actionButton !== undefined ?
            {
                command: {
                    ...this._commands.converter.toInternal(actionButton.command, this._actionButtonDisposables),
                    shortTitle: actionButton.command.shortTitle
                },
                secondaryCommands: actionButton.secondaryCommands?.map(commandGroup => {
                    return commandGroup.map(command => this._commands.converter.toInternal(command, this._actionButtonDisposables));
                }),
                enabled: actionButton.enabled
            } : null;
        this.#proxy.$updateSourceControl(this.handle, { actionButton: actionButtonDto })
            .finally(() => oldActionButtonDisposables.dispose());
    }
    get statusBarCommands() {
        return this._statusBarCommands;
    }
    set statusBarCommands(statusBarCommands) {
        if (this._statusBarCommands && statusBarCommands && commandListEquals(this._statusBarCommands, statusBarCommands)) {
            return;
        }
        // In order to prevent disposing status bar commands that are still rendered in the UI
        // until the next UI update, we ensure to dispose them after the update has been completed.
        const oldStatusBarDisposables = this._statusBarDisposables;
        this._statusBarDisposables = new DisposableStore();
        this._statusBarCommands = statusBarCommands;
        const internal = (statusBarCommands || []).map(c => this._commands.converter.toInternal(c, this._statusBarDisposables));
        this.#proxy.$updateSourceControl(this.handle, { statusBarCommands: internal })
            .finally(() => oldStatusBarDisposables.dispose());
    }
    get selected() {
        return this._selected;
    }
    constructor(_extension, _extHostDocuments, proxy, _commands, _id, _label, _rootUri, _iconPath, _parent) {
        this._extension = _extension;
        this._commands = _commands;
        this._id = _id;
        this._label = _label;
        this._rootUri = _rootUri;
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        this._groups = new Map();
        this._contextValue = undefined;
        this._count = undefined;
        this._quickDiffProvider = undefined;
        this._secondaryQuickDiffProvider = undefined;
        this._historyProviderDisposable = new MutableDisposable();
        this._artifactProviderDisposable = new MutableDisposable();
        this._commitTemplate = undefined;
        this._acceptInputDisposables = new MutableDisposable();
        this._acceptInputCommand = undefined;
        // We know what we're doing here:
        // eslint-disable-next-line local/code-no-potentially-unsafe-disposables
        this._actionButtonDisposables = new DisposableStore();
        // We know what we're doing here:
        // eslint-disable-next-line local/code-no-potentially-unsafe-disposables
        this._statusBarDisposables = new DisposableStore();
        this._statusBarCommands = undefined;
        this._selected = false;
        this._onDidChangeSelection = new Emitter();
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._artifactCommandsDisposables = new DisposableMap();
        this.handle = ExtHostSourceControl._handlePool++;
        this.createdResourceGroups = new Map();
        this.updatedResourceGroups = new Set();
        this.#proxy = proxy;
        const inputBoxDocumentUri = URI.from({
            scheme: Schemas.vscodeSourceControl,
            path: `${_id}/scm${this.handle}/input`,
            query: _rootUri ? `rootUri=${encodeURIComponent(_rootUri.toString())}` : undefined
        });
        this._inputBox = new ExtHostSCMInputBox(_extension, _extHostDocuments, this.#proxy, this.handle, inputBoxDocumentUri);
        this.#proxy.$registerSourceControl(this.handle, _parent?.handle, _id, _label, _rootUri, getHistoryItemIconDto(_iconPath), inputBoxDocumentUri);
        this.onDidDisposeParent = _parent ? _parent.onDidDispose : Event.None;
    }
    createResourceGroup(id, label, options) {
        const multiDiffEditorEnableViewChanges = isProposedApiEnabled(this._extension, 'scmMultiDiffEditor') && options?.multiDiffEditorEnableViewChanges === true;
        const group = new ExtHostSourceControlResourceGroup(this.#proxy, this._commands, this.handle, id, label, multiDiffEditorEnableViewChanges, this._extension);
        const disposable = Event.once(group.onDidDispose)(() => this.createdResourceGroups.delete(group));
        this.createdResourceGroups.set(group, disposable);
        this.eventuallyAddResourceGroups();
        return group;
    }
    eventuallyAddResourceGroups() {
        const groups = [];
        const splices = [];
        for (const [group, disposable] of this.createdResourceGroups) {
            disposable.dispose();
            const updateListener = group.onDidUpdateResourceStates(() => {
                this.updatedResourceGroups.add(group);
                this.eventuallyUpdateResourceStates();
            });
            Event.once(group.onDidDispose)(() => {
                this.updatedResourceGroups.delete(group);
                updateListener.dispose();
                this._groups.delete(group.handle);
                this.#proxy.$unregisterGroup(this.handle, group.handle);
            });
            groups.push([group.handle, group.id, group.label, group.features, group.multiDiffEditorEnableViewChanges]);
            const snapshot = group._takeResourceStateSnapshot();
            if (snapshot.length > 0) {
                splices.push([group.handle, snapshot]);
            }
            this._groups.set(group.handle, group);
        }
        this.#proxy.$registerGroups(this.handle, groups, splices);
        this.createdResourceGroups.clear();
    }
    eventuallyUpdateResourceStates() {
        const splices = [];
        this.updatedResourceGroups.forEach(group => {
            const snapshot = group._takeResourceStateSnapshot();
            if (snapshot.length === 0) {
                return;
            }
            splices.push([group.handle, snapshot]);
        });
        if (splices.length > 0) {
            this.#proxy.$spliceResourceStates(this.handle, splices);
        }
        this.updatedResourceGroups.clear();
    }
    getResourceGroup(handle) {
        return this._groups.get(handle);
    }
    setSelectionState(selected) {
        this._selected = selected;
        this._onDidChangeSelection.fire(selected);
    }
    async provideArtifacts(group, token) {
        const commandsDisposables = new DisposableStore();
        const artifacts = await this.artifactProvider?.provideArtifacts(group, token);
        const artifactsDto = artifacts?.map(artifact => ({
            ...artifact,
            icon: getHistoryItemIconDto(artifact.icon),
            command: artifact.command ? this._commands.converter.toInternal(artifact.command, commandsDisposables) : undefined
        }));
        this._artifactCommandsDisposables.get(group)?.dispose();
        this._artifactCommandsDisposables.set(group, commandsDisposables);
        return artifactsDto;
    }
    dispose() {
        this._acceptInputDisposables.dispose();
        this._actionButtonDisposables.dispose();
        this._statusBarDisposables.dispose();
        this._historyProviderDisposable.dispose();
        this._artifactProviderDisposable.dispose();
        this._artifactCommandsDisposables.dispose();
        this._groups.forEach(group => group.dispose());
        this.#proxy.$unregisterSourceControl(this.handle);
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
}
__decorate([
    debounce(100)
], ExtHostSourceControl.prototype, "eventuallyAddResourceGroups", null);
__decorate([
    debounce(100)
], ExtHostSourceControl.prototype, "eventuallyUpdateResourceStates", null);
let ExtHostSCM = class ExtHostSCM {
    get onDidChangeActiveProvider() { return this._onDidChangeActiveProvider.event; }
    constructor(mainContext, _commands, _extHostDocuments, logService) {
        this._commands = _commands;
        this._extHostDocuments = _extHostDocuments;
        this.logService = logService;
        this._sourceControls = new Map();
        this._sourceControlsByExtension = new ExtensionIdentifierMap();
        this._onDidChangeActiveProvider = new Emitter();
        this._proxy = mainContext.getProxy(MainContext.MainThreadSCM);
        this._telemetry = mainContext.getProxy(MainContext.MainThreadTelemetry);
        _commands.registerArgumentProcessor({
            processArgument: arg => {
                if (arg && arg.$mid === 3 /* MarshalledId.ScmResource */) {
                    const sourceControl = this._sourceControls.get(arg.sourceControlHandle);
                    if (!sourceControl) {
                        return arg;
                    }
                    const group = sourceControl.getResourceGroup(arg.groupHandle);
                    if (!group) {
                        return arg;
                    }
                    return group.getResourceState(arg.handle);
                }
                else if (arg && arg.$mid === 4 /* MarshalledId.ScmResourceGroup */) {
                    const sourceControl = this._sourceControls.get(arg.sourceControlHandle);
                    if (!sourceControl) {
                        return arg;
                    }
                    return sourceControl.getResourceGroup(arg.groupHandle);
                }
                else if (arg && arg.$mid === 5 /* MarshalledId.ScmProvider */) {
                    const sourceControl = this._sourceControls.get(arg.handle);
                    if (!sourceControl) {
                        return arg;
                    }
                    return sourceControl;
                }
                return arg;
            }
        });
    }
    createSourceControl(extension, id, label, rootUri, iconPath, parent) {
        this.logService.trace('ExtHostSCM#createSourceControl', extension.identifier.value, id, label, rootUri);
        this._telemetry.$publicLog2('api/scm/createSourceControl', {
            extensionId: extension.identifier.value,
        });
        const parentSourceControl = parent ? Iterable.find(this._sourceControls.values(), s => s === parent) : undefined;
        const sourceControl = new ExtHostSourceControl(extension, this._extHostDocuments, this._proxy, this._commands, id, label, rootUri, iconPath, parentSourceControl);
        this._sourceControls.set(sourceControl.handle, sourceControl);
        const sourceControls = this._sourceControlsByExtension.get(extension.identifier) || [];
        sourceControls.push(sourceControl);
        this._sourceControlsByExtension.set(extension.identifier, sourceControls);
        return sourceControl;
    }
    // Deprecated
    getLastInputBox(extension) {
        this.logService.trace('ExtHostSCM#getLastInputBox', extension.identifier.value);
        const sourceControls = this._sourceControlsByExtension.get(extension.identifier);
        const sourceControl = sourceControls && sourceControls[sourceControls.length - 1];
        return sourceControl && sourceControl.inputBox;
    }
    $provideOriginalResource(sourceControlHandle, uriComponents, token) {
        const uri = URI.revive(uriComponents);
        this.logService.trace('ExtHostSCM#$provideOriginalResource', sourceControlHandle, uri.toString());
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl || !sourceControl.quickDiffProvider || !sourceControl.quickDiffProvider.provideOriginalResource) {
            return Promise.resolve(null);
        }
        return asPromise(() => sourceControl.quickDiffProvider.provideOriginalResource(uri, token))
            .then(r => r || null);
    }
    $provideSecondaryOriginalResource(sourceControlHandle, uriComponents, token) {
        const uri = URI.revive(uriComponents);
        this.logService.trace('ExtHostSCM#$provideSecondaryOriginalResource', sourceControlHandle, uri.toString());
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl || !sourceControl.secondaryQuickDiffProvider || !sourceControl.secondaryQuickDiffProvider.provideOriginalResource) {
            return Promise.resolve(null);
        }
        return asPromise(() => sourceControl.secondaryQuickDiffProvider.provideOriginalResource(uri, token))
            .then(r => r || null);
    }
    $onInputBoxValueChange(sourceControlHandle, value) {
        this.logService.trace('ExtHostSCM#$onInputBoxValueChange', sourceControlHandle);
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl) {
            return Promise.resolve(undefined);
        }
        sourceControl.inputBox.$onInputBoxValueChange(value);
        return Promise.resolve(undefined);
    }
    $executeResourceCommand(sourceControlHandle, groupHandle, handle, preserveFocus) {
        this.logService.trace('ExtHostSCM#$executeResourceCommand', sourceControlHandle, groupHandle, handle);
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl) {
            return Promise.resolve(undefined);
        }
        const group = sourceControl.getResourceGroup(groupHandle);
        if (!group) {
            return Promise.resolve(undefined);
        }
        return group.$executeResourceCommand(handle, preserveFocus);
    }
    $validateInput(sourceControlHandle, value, cursorPosition) {
        this.logService.trace('ExtHostSCM#$validateInput', sourceControlHandle);
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl) {
            return Promise.resolve(undefined);
        }
        if (!sourceControl.inputBox.validateInput) {
            return Promise.resolve(undefined);
        }
        return asPromise(() => sourceControl.inputBox.validateInput(value, cursorPosition)).then(result => {
            if (!result) {
                return Promise.resolve(undefined);
            }
            const message = MarkdownString.fromStrict(result.message);
            if (!message) {
                return Promise.resolve(undefined);
            }
            return Promise.resolve([message, result.type]);
        });
    }
    $setSelectedSourceControl(selectedSourceControlHandle) {
        this.logService.trace('ExtHostSCM#$setSelectedSourceControl', selectedSourceControlHandle);
        if (selectedSourceControlHandle !== undefined) {
            this._sourceControls.get(selectedSourceControlHandle)?.setSelectionState(true);
        }
        if (this._selectedSourceControlHandle !== undefined) {
            this._sourceControls.get(this._selectedSourceControlHandle)?.setSelectionState(false);
        }
        this._selectedSourceControlHandle = selectedSourceControlHandle;
        return Promise.resolve(undefined);
    }
    async $resolveHistoryItem(sourceControlHandle, historyItemId, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const historyItem = await historyProvider?.resolveHistoryItem(historyItemId, token);
            return historyItem ? toSCMHistoryItemDto(historyItem) : undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$resolveHistoryItem', err);
            return undefined;
        }
    }
    async $resolveHistoryItemChatContext(sourceControlHandle, historyItemId, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const chatContext = await historyProvider?.resolveHistoryItemChatContext(historyItemId, token);
            return chatContext ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$resolveHistoryItemChatContext', err);
            return undefined;
        }
    }
    async $resolveHistoryItemChangeRangeChatContext(sourceControlHandle, historyItemId, historyItemParentId, path, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const chatContext = await historyProvider?.resolveHistoryItemChangeRangeChatContext?.(historyItemId, historyItemParentId, path, token);
            return chatContext ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$resolveHistoryItemChangeRangeChatContext', err);
            return undefined;
        }
    }
    async $resolveHistoryItemRefsCommonAncestor(sourceControlHandle, historyItemRefs, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const ancestor = await historyProvider?.resolveHistoryItemRefsCommonAncestor(historyItemRefs, token);
            return ancestor ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$resolveHistoryItemRefsCommonAncestor', err);
            return undefined;
        }
    }
    async $provideHistoryItemRefs(sourceControlHandle, historyItemRefs, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const refs = await historyProvider?.provideHistoryItemRefs(historyItemRefs, token);
            return refs?.map(ref => ({ ...ref, icon: getHistoryItemIconDto(ref.icon) })) ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideHistoryItemRefs', err);
            return undefined;
        }
    }
    async $provideHistoryItems(sourceControlHandle, options, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const historyItems = await historyProvider?.provideHistoryItems(options, token);
            return historyItems?.map(item => toSCMHistoryItemDto(item)) ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideHistoryItems', err);
            return undefined;
        }
    }
    async $provideHistoryItemChanges(sourceControlHandle, historyItemId, historyItemParentId, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const changes = await historyProvider?.provideHistoryItemChanges(historyItemId, historyItemParentId, token);
            return changes ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideHistoryItemChanges', err);
            return undefined;
        }
    }
    async $provideArtifactGroups(sourceControlHandle, token) {
        try {
            const artifactProvider = this._sourceControls.get(sourceControlHandle)?.artifactProvider;
            const groups = await artifactProvider?.provideArtifactGroups(token);
            return groups?.map(group => ({
                ...group,
                icon: getHistoryItemIconDto(group.icon)
            }));
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideArtifactGroups', err);
            return undefined;
        }
    }
    async $provideArtifacts(sourceControlHandle, group, token) {
        try {
            const sourceControl = this._sourceControls.get(sourceControlHandle);
            return sourceControl?.provideArtifacts(group, token);
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideArtifacts', err);
            return undefined;
        }
    }
};
ExtHostSCM = __decorate([
    __param(3, ILogService)
], ExtHostSCM);
export { ExtHostSCM };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNDTS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U0NNLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTFELE9BQU8sRUFBRSxXQUFXLEVBQXNTLE1BQU0sdUJBQXVCLENBQUM7QUFDeFYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUVsSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2pHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFF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
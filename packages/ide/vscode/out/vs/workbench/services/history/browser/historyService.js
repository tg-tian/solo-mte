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
var HistoryService_1, EditorNavigationStack_1;
import { localize } from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorResourceAccessor, SideBySideEditor, isResourceEditorInput, isEditorInput, isSideBySideEditorInput, EditorCloseContext, isEditorPaneWithSelection } from '../../../common/editor.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IHistoryService } from '../common/history.js';
import { FileChangesEvent, IFileService, FILES_EXCLUDE_CONFIG, FileOperationEvent } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Disposable, DisposableStore, DisposableMap } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { getExcludes, SEARCH_EXCLUDE_CONFIG } from '../../search/common/search.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { coalesce, remove } from '../../../../base/common/arrays.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { addDisposableListener, EventType, EventHelper, WindowIdleValue } from '../../../../base/browser/dom.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { Schemas } from '../../../../base/common/network.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { IPathService } from '../../path/common/pathService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { mainWindow } from '../../../../base/browser/window.js';
let HistoryService = class HistoryService extends Disposable {
    static { HistoryService_1 = this; }
    static { this.MOUSE_NAVIGATION_SETTING = 'workbench.editor.mouseBackForwardToNavigate'; }
    static { this.NAVIGATION_SCOPE_SETTING = 'workbench.editor.navigationScope'; }
    constructor(editorService, editorGroupService, contextService, storageService, configurationService, fileService, workspacesService, instantiationService, layoutService, contextKeyService, logService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.contextService = contextService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.workspacesService = workspacesService;
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.contextKeyService = contextKeyService;
        this.logService = logService;
        this.activeEditorListeners = this._register(new DisposableStore());
        this.lastActiveEditor = undefined;
        //#endregion
        //#region Editor History Navigation (limit: 50)
        this._onDidChangeEditorNavigationStack = this._register(new Emitter());
        this.onDidChangeEditorNavigationStack = this._onDidChangeEditorNavigationStack.event;
        this.defaultScopedEditorNavigationStack = undefined;
        this.editorGroupScopedNavigationStacks = new Map();
        this.editorScopedNavigationStacks = new Map();
        this.editorNavigationScope = 0 /* GoScope.DEFAULT */;
        //#endregion
        //#region Navigation: Next/Previous Used Editor
        this.recentlyUsedEditorsStack = undefined;
        this.recentlyUsedEditorsStackIndex = 0;
        this.recentlyUsedEditorsInGroupStack = undefined;
        this.recentlyUsedEditorsInGroupStackIndex = 0;
        this.navigatingInRecentlyUsedEditorsStack = false;
        this.navigatingInRecentlyUsedEditorsInGroupStack = false;
        this.recentlyClosedEditors = [];
        this.ignoreEditorCloseEvent = false;
        this.history = undefined;
        this.editorHistoryListeners = this._register(new DisposableMap());
        this.resourceExcludeMatcher = this._register(new WindowIdleValue(mainWindow, () => {
            const matcher = this._register(this.instantiationService.createInstance(ResourceGlobMatcher, root => getExcludes(root ? this.configurationService.getValue({ resource: root }) : this.configurationService.getValue()) || Object.create(null), event => event.affectsConfiguration(FILES_EXCLUDE_CONFIG) || event.affectsConfiguration(SEARCH_EXCLUDE_CONFIG)));
            this._register(matcher.onExpressionChange(() => this.removeExcludedFromHistory()));
            return matcher;
        }));
        this.editorHelper = this.instantiationService.createInstance(EditorHelper);
        this.canNavigateBackContextKey = (new RawContextKey('canNavigateBack', false, localize('canNavigateBack', "Whether it is possible to navigate back in editor history"))).bindTo(this.contextKeyService);
        this.canNavigateForwardContextKey = (new RawContextKey('canNavigateForward', false, localize('canNavigateForward', "Whether it is possible to navigate forward in editor history"))).bindTo(this.contextKeyService);
        this.canNavigateBackInNavigationsContextKey = (new RawContextKey('canNavigateBackInNavigationLocations', false, localize('canNavigateBackInNavigationLocations', "Whether it is possible to navigate back in editor navigation locations history"))).bindTo(this.contextKeyService);
        this.canNavigateForwardInNavigationsContextKey = (new RawContextKey('canNavigateForwardInNavigationLocations', false, localize('canNavigateForwardInNavigationLocations', "Whether it is possible to navigate forward in editor navigation locations history"))).bindTo(this.contextKeyService);
        this.canNavigateToLastNavigationLocationContextKey = (new RawContextKey('canNavigateToLastNavigationLocation', false, localize('canNavigateToLastNavigationLocation', "Whether it is possible to navigate to the last editor navigation location"))).bindTo(this.contextKeyService);
        this.canNavigateBackInEditsContextKey = (new RawContextKey('canNavigateBackInEditLocations', false, localize('canNavigateBackInEditLocations', "Whether it is possible to navigate back in editor edit locations history"))).bindTo(this.contextKeyService);
        this.canNavigateForwardInEditsContextKey = (new RawContextKey('canNavigateForwardInEditLocations', false, localize('canNavigateForwardInEditLocations', "Whether it is possible to navigate forward in editor edit locations history"))).bindTo(this.contextKeyService);
        this.canNavigateToLastEditLocationContextKey = (new RawContextKey('canNavigateToLastEditLocation', false, localize('canNavigateToLastEditLocation', "Whether it is possible to navigate to the last editor edit location"))).bindTo(this.contextKeyService);
        this.canReopenClosedEditorContextKey = (new RawContextKey('canReopenClosedEditor', false, localize('canReopenClosedEditor', "Whether it is possible to reopen the last closed editor"))).bindTo(this.contextKeyService);
        this.registerListeners();
        // if the service is created late enough that an editor is already opened
        // make sure to trigger the onActiveEditorChanged() to track the editor
        // properly (fixes https://github.com/microsoft/vscode/issues/59908)
        if (this.editorService.activeEditorPane) {
            this.onDidActiveEditorChange();
        }
    }
    registerListeners() {
        // Mouse back/forward support
        this.registerMouseNavigationListener();
        // Editor changes
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.editorService.onDidOpenEditorFail(event => this.remove(event.editor)));
        this._register(this.editorService.onDidCloseEditor(event => this.onDidCloseEditor(event)));
        this._register(this.editorService.onDidMostRecentlyActiveEditorsChange(() => this.handleEditorEventInRecentEditorsStack()));
        // Editor group changes
        this._register(this.editorGroupService.onDidRemoveGroup(e => this.onDidRemoveGroup(e)));
        // File changes
        this._register(this.fileService.onDidFilesChange(event => this.onDidFilesChange(event)));
        this._register(this.fileService.onDidRunOperation(event => this.onDidFilesChange(event)));
        // Storage
        this._register(this.storageService.onWillSaveState(() => this.saveState()));
        // Configuration
        this.registerEditorNavigationScopeChangeListener();
        // Context keys
        this._register(this.onDidChangeEditorNavigationStack(() => this.updateContextKeys()));
        this._register(this.editorGroupService.onDidChangeActiveGroup(() => this.updateContextKeys()));
    }
    onDidCloseEditor(e) {
        this.handleEditorCloseEventInHistory(e);
        this.handleEditorCloseEventInReopen(e);
    }
    registerMouseNavigationListener() {
        const mouseBackForwardSupportListener = this._register(new DisposableStore());
        const handleMouseBackForwardSupport = () => {
            mouseBackForwardSupportListener.clear();
            if (this.configurationService.getValue(HistoryService_1.MOUSE_NAVIGATION_SETTING)) {
                this._register(Event.runAndSubscribe(this.layoutService.onDidAddContainer, ({ container, disposables }) => {
                    const eventDisposables = disposables.add(new DisposableStore());
                    eventDisposables.add(addDisposableListener(container, EventType.MOUSE_DOWN, e => this.onMouseDownOrUp(e, true)));
                    eventDisposables.add(addDisposableListener(container, EventType.MOUSE_UP, e => this.onMouseDownOrUp(e, false)));
                    mouseBackForwardSupportListener.add(eventDisposables);
                }, { container: this.layoutService.mainContainer, disposables: this._store }));
            }
        };
        this._register(this.configurationService.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(HistoryService_1.MOUSE_NAVIGATION_SETTING)) {
                handleMouseBackForwardSupport();
            }
        }));
        handleMouseBackForwardSupport();
    }
    onMouseDownOrUp(event, isMouseDown) {
        // Support to navigate in history when mouse buttons 4/5 are pressed
        // We want to trigger this on mouse down for a faster experience
        // but we also need to prevent mouse up from triggering the default
        // which is to navigate in the browser history.
        switch (event.button) {
            case 3:
                EventHelper.stop(event);
                if (isMouseDown) {
                    this.goBack();
                }
                break;
            case 4:
                EventHelper.stop(event);
                if (isMouseDown) {
                    this.goForward();
                }
                break;
        }
    }
    onDidRemoveGroup(group) {
        this.handleEditorGroupRemoveInNavigationStacks(group);
    }
    onDidActiveEditorChange() {
        const activeEditorGroup = this.editorGroupService.activeGroup;
        const activeEditorPane = activeEditorGroup.activeEditorPane;
        if (this.lastActiveEditor && this.editorHelper.matchesEditorIdentifier(this.lastActiveEditor, activeEditorPane)) {
            return; // return if the active editor is still the same
        }
        // Remember as last active editor (can be undefined if none opened)
        this.lastActiveEditor = activeEditorPane?.input ? { editor: activeEditorPane.input, groupId: activeEditorPane.group.id } : undefined;
        // Dispose old listeners
        this.activeEditorListeners.clear();
        // Handle editor change unless the editor is transient. In that case
        // setup a listener to see if the transient editor becomes non-transient
        // (https://github.com/microsoft/vscode/issues/211769)
        if (!activeEditorPane?.group.isTransient(activeEditorPane.input)) {
            this.handleActiveEditorChange(activeEditorGroup, activeEditorPane);
        }
        else {
            this.logService.trace(`[History]: ignoring transient editor change until becoming non-transient (editor: ${activeEditorPane.input?.resource?.toString()}})`);
            const transientListener = activeEditorGroup.onDidModelChange(e => {
                if (e.kind === 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */ && e.editor === activeEditorPane.input && !activeEditorPane.group.isTransient(activeEditorPane.input)) {
                    transientListener.dispose();
                    this.handleActiveEditorChange(activeEditorGroup, activeEditorPane);
                }
            });
            this.activeEditorListeners.add(transientListener);
        }
        // Listen to selection changes unless the editor is transient
        if (isEditorPaneWithSelection(activeEditorPane)) {
            this.activeEditorListeners.add(activeEditorPane.onDidChangeSelection(e => {
                if (!activeEditorPane.group.isTransient(activeEditorPane.input)) {
                    this.handleActiveEditorSelectionChangeEvent(activeEditorGroup, activeEditorPane, e);
                }
                else {
                    this.logService.trace(`[History]: ignoring transient editor selection change (editor: ${activeEditorPane.input?.resource?.toString()}})`);
                }
            }));
        }
        // Context keys
        this.updateContextKeys();
    }
    onDidFilesChange(event) {
        // External file changes (watcher)
        if (event instanceof FileChangesEvent) {
            if (event.gotDeleted()) {
                this.remove(event);
            }
        }
        // Internal file changes (e.g. explorer)
        else {
            // Delete
            if (event.isOperation(1 /* FileOperation.DELETE */)) {
                this.remove(event);
            }
            // Move
            else if (event.isOperation(2 /* FileOperation.MOVE */) && event.target.isFile) {
                this.move(event);
            }
        }
    }
    handleActiveEditorChange(group, editorPane) {
        this.handleActiveEditorChangeInHistory(editorPane);
        this.handleActiveEditorChangeInNavigationStacks(group, editorPane);
    }
    handleActiveEditorSelectionChangeEvent(group, editorPane, event) {
        this.handleActiveEditorSelectionChangeInNavigationStacks(group, editorPane, event);
    }
    move(event) {
        this.moveInHistory(event);
        this.moveInEditorNavigationStacks(event);
    }
    remove(arg1) {
        this.removeFromHistory(arg1);
        this.removeFromEditorNavigationStacks(arg1);
        this.removeFromRecentlyClosedEditors(arg1);
        this.removeFromRecentlyOpened(arg1);
    }
    removeFromRecentlyOpened(arg1) {
        let resource = undefined;
        if (isEditorInput(arg1)) {
            resource = EditorResourceAccessor.getOriginalUri(arg1);
        }
        else if (arg1 instanceof FileChangesEvent) {
            // Ignore for now (recently opened are most often out of workspace files anyway for which there are no file events)
        }
        else {
            resource = arg1.resource;
        }
        if (resource) {
            this.workspacesService.removeRecentlyOpened([resource]);
        }
    }
    clear() {
        // History
        this.clearRecentlyOpened();
        // Navigation (next, previous)
        this.clearEditorNavigationStacks();
        // Recently closed editors
        this.recentlyClosedEditors = [];
        // Context Keys
        this.updateContextKeys();
    }
    updateContextKeys() {
        this.contextKeyService.bufferChangeEvents(() => {
            const activeStack = this.getStack();
            this.canNavigateBackContextKey.set(activeStack.canGoBack(0 /* GoFilter.NONE */));
            this.canNavigateForwardContextKey.set(activeStack.canGoForward(0 /* GoFilter.NONE */));
            this.canNavigateBackInNavigationsContextKey.set(activeStack.canGoBack(2 /* GoFilter.NAVIGATION */));
            this.canNavigateForwardInNavigationsContextKey.set(activeStack.canGoForward(2 /* GoFilter.NAVIGATION */));
            this.canNavigateToLastNavigationLocationContextKey.set(activeStack.canGoLast(2 /* GoFilter.NAVIGATION */));
            this.canNavigateBackInEditsContextKey.set(activeStack.canGoBack(1 /* GoFilter.EDITS */));
            this.canNavigateForwardInEditsContextKey.set(activeStack.canGoForward(1 /* GoFilter.EDITS */));
            this.canNavigateToLastEditLocationContextKey.set(activeStack.canGoLast(1 /* GoFilter.EDITS */));
            this.canReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
        });
    }
    registerEditorNavigationScopeChangeListener() {
        const handleEditorNavigationScopeChange = () => {
            // Ensure to start fresh when setting changes
            this.disposeEditorNavigationStacks();
            // Update scope
            const configuredScope = this.configurationService.getValue(HistoryService_1.NAVIGATION_SCOPE_SETTING);
            if (configuredScope === 'editorGroup') {
                this.editorNavigationScope = 1 /* GoScope.EDITOR_GROUP */;
            }
            else if (configuredScope === 'editor') {
                this.editorNavigationScope = 2 /* GoScope.EDITOR */;
            }
            else {
                this.editorNavigationScope = 0 /* GoScope.DEFAULT */;
            }
        };
        this._register(this.configurationService.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(HistoryService_1.NAVIGATION_SCOPE_SETTING)) {
                handleEditorNavigationScopeChange();
            }
        }));
        handleEditorNavigationScopeChange();
    }
    getStack(group = this.editorGroupService.activeGroup, editor = group.activeEditor) {
        switch (this.editorNavigationScope) {
            // Per Editor
            case 2 /* GoScope.EDITOR */: {
                if (!editor) {
                    return new NoOpEditorNavigationStacks();
                }
                let stacksForGroup = this.editorScopedNavigationStacks.get(group.id);
                if (!stacksForGroup) {
                    stacksForGroup = new Map();
                    this.editorScopedNavigationStacks.set(group.id, stacksForGroup);
                }
                let stack = stacksForGroup.get(editor)?.stack;
                if (!stack) {
                    const disposable = new DisposableStore();
                    stack = disposable.add(this.instantiationService.createInstance(EditorNavigationStacks, 2 /* GoScope.EDITOR */));
                    disposable.add(stack.onDidChange(() => this._onDidChangeEditorNavigationStack.fire()));
                    stacksForGroup.set(editor, { stack, disposable });
                }
                return stack;
            }
            // Per Editor Group
            case 1 /* GoScope.EDITOR_GROUP */: {
                let stack = this.editorGroupScopedNavigationStacks.get(group.id)?.stack;
                if (!stack) {
                    const disposable = new DisposableStore();
                    stack = disposable.add(this.instantiationService.createInstance(EditorNavigationStacks, 1 /* GoScope.EDITOR_GROUP */));
                    disposable.add(stack.onDidChange(() => this._onDidChangeEditorNavigationStack.fire()));
                    this.editorGroupScopedNavigationStacks.set(group.id, { stack, disposable });
                }
                return stack;
            }
            // Global
            case 0 /* GoScope.DEFAULT */: {
                if (!this.defaultScopedEditorNavigationStack) {
                    this.defaultScopedEditorNavigationStack = this._register(this.instantiationService.createInstance(EditorNavigationStacks, 0 /* GoScope.DEFAULT */));
                    this._register(this.defaultScopedEditorNavigationStack.onDidChange(() => this._onDidChangeEditorNavigationStack.fire()));
                }
                return this.defaultScopedEditorNavigationStack;
            }
        }
    }
    goForward(filter) {
        return this.getStack().goForward(filter);
    }
    goBack(filter) {
        return this.getStack().goBack(filter);
    }
    goPrevious(filter) {
        return this.getStack().goPrevious(filter);
    }
    goLast(filter) {
        return this.getStack().goLast(filter);
    }
    handleActiveEditorChangeInNavigationStacks(group, editorPane) {
        this.getStack(group, editorPane?.input).handleActiveEditorChange(editorPane);
    }
    handleActiveEditorSelectionChangeInNavigationStacks(group, editorPane, event) {
        this.getStack(group, editorPane.input).handleActiveEditorSelectionChange(editorPane, event);
    }
    handleEditorCloseEventInHistory(e) {
        const editors = this.editorScopedNavigationStacks.get(e.groupId);
        if (editors) {
            const editorStack = editors.get(e.editor);
            if (editorStack) {
                editorStack.disposable.dispose();
                editors.delete(e.editor);
            }
            if (editors.size === 0) {
                this.editorScopedNavigationStacks.delete(e.groupId);
            }
        }
    }
    handleEditorGroupRemoveInNavigationStacks(group) {
        // Global
        this.defaultScopedEditorNavigationStack?.remove(group.id);
        // Editor groups
        const editorGroupStack = this.editorGroupScopedNavigationStacks.get(group.id);
        if (editorGroupStack) {
            editorGroupStack.disposable.dispose();
            this.editorGroupScopedNavigationStacks.delete(group.id);
        }
    }
    clearEditorNavigationStacks() {
        this.withEachEditorNavigationStack(stack => stack.clear());
    }
    removeFromEditorNavigationStacks(arg1) {
        this.withEachEditorNavigationStack(stack => stack.remove(arg1));
    }
    moveInEditorNavigationStacks(event) {
        this.withEachEditorNavigationStack(stack => stack.move(event));
    }
    withEachEditorNavigationStack(fn) {
        // Global
        if (this.defaultScopedEditorNavigationStack) {
            fn(this.defaultScopedEditorNavigationStack);
        }
        // Per editor group
        for (const [, entry] of this.editorGroupScopedNavigationStacks) {
            fn(entry.stack);
        }
        // Per editor
        for (const [, entries] of this.editorScopedNavigationStacks) {
            for (const [, entry] of entries) {
                fn(entry.stack);
            }
        }
    }
    disposeEditorNavigationStacks() {
        // Global
        this.defaultScopedEditorNavigationStack?.dispose();
        this.defaultScopedEditorNavigationStack = undefined;
        // Per Editor group
        for (const [, stack] of this.editorGroupScopedNavigationStacks) {
            stack.disposable.dispose();
        }
        this.editorGroupScopedNavigationStacks.clear();
        // Per Editor
        for (const [, stacks] of this.editorScopedNavigationStacks) {
            for (const [, stack] of stacks) {
                stack.disposable.dispose();
            }
        }
        this.editorScopedNavigationStacks.clear();
    }
    openNextRecentlyUsedEditor(groupId) {
        const [stack, index] = this.ensureRecentlyUsedStack(index => index - 1, groupId);
        return this.doNavigateInRecentlyUsedEditorsStack(stack[index], groupId);
    }
    openPreviouslyUsedEditor(groupId) {
        const [stack, index] = this.ensureRecentlyUsedStack(index => index + 1, groupId);
        return this.doNavigateInRecentlyUsedEditorsStack(stack[index], groupId);
    }
    async doNavigateInRecentlyUsedEditorsStack(editorIdentifier, groupId) {
        if (editorIdentifier) {
            const acrossGroups = typeof groupId !== 'number' || !this.editorGroupService.getGroup(groupId);
            if (acrossGroups) {
                this.navigatingInRecentlyUsedEditorsStack = true;
            }
            else {
                this.navigatingInRecentlyUsedEditorsInGroupStack = true;
            }
            const group = this.editorGroupService.getGroup(editorIdentifier.groupId) ?? this.editorGroupService.activeGroup;
            try {
                await group.openEditor(editorIdentifier.editor);
            }
            finally {
                if (acrossGroups) {
                    this.navigatingInRecentlyUsedEditorsStack = false;
                }
                else {
                    this.navigatingInRecentlyUsedEditorsInGroupStack = false;
                }
            }
        }
    }
    ensureRecentlyUsedStack(indexModifier, groupId) {
        let editors;
        let index;
        const group = typeof groupId === 'number' ? this.editorGroupService.getGroup(groupId) : undefined;
        // Across groups
        if (!group) {
            editors = this.recentlyUsedEditorsStack || this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
            index = this.recentlyUsedEditorsStackIndex;
        }
        // Within group
        else {
            editors = this.recentlyUsedEditorsInGroupStack || group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).map(editor => ({ groupId: group.id, editor }));
            index = this.recentlyUsedEditorsInGroupStackIndex;
        }
        // Adjust index
        let newIndex = indexModifier(index);
        if (newIndex < 0) {
            newIndex = 0;
        }
        else if (newIndex > editors.length - 1) {
            newIndex = editors.length - 1;
        }
        // Remember index and editors
        if (!group) {
            this.recentlyUsedEditorsStack = editors;
            this.recentlyUsedEditorsStackIndex = newIndex;
        }
        else {
            this.recentlyUsedEditorsInGroupStack = editors;
            this.recentlyUsedEditorsInGroupStackIndex = newIndex;
        }
        return [editors, newIndex];
    }
    handleEditorEventInRecentEditorsStack() {
        // Drop all-editors stack unless navigating in all editors
        if (!this.navigatingInRecentlyUsedEditorsStack) {
            this.recentlyUsedEditorsStack = undefined;
            this.recentlyUsedEditorsStackIndex = 0;
        }
        // Drop in-group-editors stack unless navigating in group
        if (!this.navigatingInRecentlyUsedEditorsInGroupStack) {
            this.recentlyUsedEditorsInGroupStack = undefined;
            this.recentlyUsedEditorsInGroupStackIndex = 0;
        }
    }
    //#endregion
    //#region File: Reopen Closed Editor (limit: 20)
    static { this.MAX_RECENTLY_CLOSED_EDITORS = 20; }
    handleEditorCloseEventInReopen(event) {
        if (this.ignoreEditorCloseEvent) {
            return; // blocked
        }
        const { editor, context } = event;
        if (context === EditorCloseContext.REPLACE || context === EditorCloseContext.MOVE) {
            return; // ignore if editor was replaced or moved
        }
        if (!editor.canReopen()) {
            return; // only editors that can be reopened
        }
        const untypedEditor = editor.toUntyped();
        if (!untypedEditor) {
            return; // we need a untyped editor to restore from going forward
        }
        const associatedResources = [];
        const editorResource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH });
        if (URI.isUri(editorResource)) {
            associatedResources.push(editorResource);
        }
        else if (editorResource) {
            associatedResources.push(...coalesce([editorResource.primary, editorResource.secondary]));
        }
        // Remove from list of recently closed before...
        this.removeFromRecentlyClosedEditors(editor);
        // ...adding it as last recently closed
        this.recentlyClosedEditors.push({
            editorId: editor.editorId,
            editor: untypedEditor,
            resource: EditorResourceAccessor.getOriginalUri(editor),
            associatedResources,
            index: event.index,
            sticky: event.sticky
        });
        // Bounding
        if (this.recentlyClosedEditors.length > HistoryService_1.MAX_RECENTLY_CLOSED_EDITORS) {
            this.recentlyClosedEditors.shift();
        }
        // Context
        this.canReopenClosedEditorContextKey.set(true);
    }
    async reopenLastClosedEditor() {
        // Open editor if we have one
        const lastClosedEditor = this.recentlyClosedEditors.pop();
        let reopenClosedEditorPromise = undefined;
        if (lastClosedEditor) {
            reopenClosedEditorPromise = this.doReopenLastClosedEditor(lastClosedEditor);
        }
        // Update context
        this.canReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
        return reopenClosedEditorPromise;
    }
    async doReopenLastClosedEditor(lastClosedEditor) {
        const options = { pinned: true, sticky: lastClosedEditor.sticky, index: lastClosedEditor.index, ignoreError: true };
        // Special sticky handling: remove the index property from options
        // if that would result in sticky state to not preserve or apply
        // wrongly.
        if ((lastClosedEditor.sticky && !this.editorGroupService.activeGroup.isSticky(lastClosedEditor.index)) ||
            (!lastClosedEditor.sticky && this.editorGroupService.activeGroup.isSticky(lastClosedEditor.index))) {
            options.index = undefined;
        }
        // Re-open editor unless already opened
        let editorPane = undefined;
        if (!this.editorGroupService.activeGroup.contains(lastClosedEditor.editor)) {
            // Fix for https://github.com/microsoft/vscode/issues/107850
            // If opening an editor fails, it is possible that we get
            // another editor-close event as a result. But we really do
            // want to ignore that in our list of recently closed editors
            //  to prevent endless loops.
            this.ignoreEditorCloseEvent = true;
            try {
                editorPane = await this.editorService.openEditor({
                    ...lastClosedEditor.editor,
                    options: {
                        ...lastClosedEditor.editor.options,
                        ...options
                    }
                });
            }
            finally {
                this.ignoreEditorCloseEvent = false;
            }
        }
        // If no editor was opened, try with the next one
        if (!editorPane) {
            // Fix for https://github.com/microsoft/vscode/issues/67882
            // If opening of the editor fails, make sure to try the next one
            // but make sure to remove this one from the list to prevent
            // endless loops.
            remove(this.recentlyClosedEditors, lastClosedEditor);
            // Try with next one
            this.reopenLastClosedEditor();
        }
    }
    removeFromRecentlyClosedEditors(arg1) {
        this.recentlyClosedEditors = this.recentlyClosedEditors.filter(recentlyClosedEditor => {
            if (isEditorInput(arg1) && recentlyClosedEditor.editorId !== arg1.editorId) {
                return true; // keep: different editor identifiers
            }
            if (recentlyClosedEditor.resource && this.editorHelper.matchesFile(recentlyClosedEditor.resource, arg1)) {
                return false; // remove: editor matches directly
            }
            if (recentlyClosedEditor.associatedResources.some(associatedResource => this.editorHelper.matchesFile(associatedResource, arg1))) {
                return false; // remove: an associated resource matches
            }
            return true; // keep
        });
        // Update context
        this.canReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
    }
    //#endregion
    //#region Go to: Recently Opened Editor (limit: 200, persisted)
    static { this.MAX_HISTORY_ITEMS = 200; }
    static { this.HISTORY_STORAGE_KEY = 'history.entries'; }
    handleActiveEditorChangeInHistory(editorPane) {
        // Ensure we have not configured to exclude input and don't track invalid inputs
        const editor = editorPane?.input;
        if (!editor || editor.isDisposed() || !this.includeInHistory(editor)) {
            return;
        }
        // Remove any existing entry and add to the beginning
        this.removeFromHistory(editor);
        this.addToHistory(editor);
    }
    addToHistory(editor, insertFirst = true) {
        this.ensureHistoryLoaded(this.history);
        const historyInput = this.editorHelper.preferResourceEditorInput(editor);
        if (!historyInput) {
            return;
        }
        // Insert based on preference
        if (insertFirst) {
            this.history.unshift(historyInput);
        }
        else {
            this.history.push(historyInput);
        }
        // Respect max entries setting
        if (this.history.length > HistoryService_1.MAX_HISTORY_ITEMS) {
            this.editorHelper.clearOnEditorDispose(this.history.pop(), this.editorHistoryListeners);
        }
        // React to editor input disposing
        if (isEditorInput(editor)) {
            this.editorHelper.onEditorDispose(editor, () => this.updateHistoryOnEditorDispose(historyInput), this.editorHistoryListeners);
        }
    }
    updateHistoryOnEditorDispose(editor) {
        if (isEditorInput(editor)) {
            // Any non side-by-side editor input gets removed directly on dispose
            if (!isSideBySideEditorInput(editor)) {
                this.removeFromHistory(editor);
            }
            // Side-by-side editors get special treatment: we try to distill the
            // possibly untyped resource inputs from both sides to be able to
            // offer these entries from the history to the user still unless
            // they are excluded.
            else {
                const resourceInputs = [];
                const sideInputs = editor.primary.matches(editor.secondary) ? [editor.primary] : [editor.primary, editor.secondary];
                for (const sideInput of sideInputs) {
                    const candidateResourceInput = this.editorHelper.preferResourceEditorInput(sideInput);
                    if (isResourceEditorInput(candidateResourceInput) && this.includeInHistory(candidateResourceInput)) {
                        resourceInputs.push(candidateResourceInput);
                    }
                }
                // Insert the untyped resource inputs where our disposed
                // side-by-side editor input is in the history stack
                this.replaceInHistory(editor, ...resourceInputs);
            }
        }
        else {
            // Remove any editor that should not be included in history
            if (!this.includeInHistory(editor)) {
                this.removeFromHistory(editor);
            }
        }
    }
    includeInHistory(editor) {
        if (isEditorInput(editor)) {
            return true; // include any non files
        }
        return !this.resourceExcludeMatcher.value.matches(editor.resource);
    }
    removeExcludedFromHistory() {
        this.ensureHistoryLoaded(this.history);
        this.history = this.history.filter(entry => {
            const include = this.includeInHistory(entry);
            // Cleanup any listeners associated with the input when removing from history
            if (!include) {
                this.editorHelper.clearOnEditorDispose(entry, this.editorHistoryListeners);
            }
            return include;
        });
    }
    moveInHistory(event) {
        if (event.isOperation(2 /* FileOperation.MOVE */)) {
            const removed = this.removeFromHistory(event);
            if (removed) {
                this.addToHistory({ resource: event.target.resource });
            }
        }
    }
    removeFromHistory(arg1) {
        let removed = false;
        this.ensureHistoryLoaded(this.history);
        this.history = this.history.filter(entry => {
            const matches = this.editorHelper.matchesEditor(arg1, entry);
            // Cleanup any listeners associated with the input when removing from history
            if (matches) {
                this.editorHelper.clearOnEditorDispose(arg1, this.editorHistoryListeners);
                removed = true;
            }
            return !matches;
        });
        return removed;
    }
    replaceInHistory(editor, ...replacements) {
        this.ensureHistoryLoaded(this.history);
        let replaced = false;
        const newHistory = [];
        for (const entry of this.history) {
            // Entry matches and is going to be disposed + replaced
            if (this.editorHelper.matchesEditor(editor, entry)) {
                // Cleanup any listeners associated with the input when replacing from history
                this.editorHelper.clearOnEditorDispose(editor, this.editorHistoryListeners);
                // Insert replacements but only once
                if (!replaced) {
                    newHistory.push(...replacements);
                    replaced = true;
                }
            }
            // Entry does not match, but only add it if it didn't match
            // our replacements already
            else if (!replacements.some(replacement => this.editorHelper.matchesEditor(replacement, entry))) {
                newHistory.push(entry);
            }
        }
        // If the target editor to replace was not found, make sure to
        // insert the replacements to the end to ensure we got them
        if (!replaced) {
            newHistory.push(...replacements);
        }
        this.history = newHistory;
    }
    clearRecentlyOpened() {
        this.history = [];
        this.editorHistoryListeners.clearAndDisposeAll();
    }
    getHistory() {
        this.ensureHistoryLoaded(this.history);
        return this.history;
    }
    ensureHistoryLoaded(history) {
        if (!this.history) {
            // Until history is loaded, it is just empty
            this.history = [];
            // We want to seed history from opened editors
            // too as well as previous stored state, so we
            // need to wait for the editor groups being ready
            if (this.editorGroupService.isReady) {
                this.loadHistory();
            }
            else {
                (async () => {
                    await this.editorGroupService.whenReady;
                    this.loadHistory();
                })();
            }
        }
    }
    loadHistory() {
        // Init as empty before adding - since we are about to
        // populate the history from opened editors, we capture
        // the right order here.
        this.history = [];
        // All stored editors from previous session
        const storedEditorHistory = this.loadHistoryFromStorage();
        // All restored editors from previous session
        // in reverse editor from least to most recently
        // used.
        const openedEditorsLru = [...this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)].reverse();
        // We want to merge the opened editors from the last
        // session with the stored editors from the last
        // session. Because not all editors can be serialised
        // we want to make sure to include all opened editors
        // too.
        // Opened editors should always be first in the history
        const handledEditors = new Set();
        // Add all opened editors first
        for (const { editor } of openedEditorsLru) {
            if (!this.includeInHistory(editor)) {
                continue;
            }
            // Make sure to skip duplicates from the editors LRU
            if (editor.resource) {
                const historyEntryId = `${editor.resource.toString()}/${editor.editorId}`;
                if (handledEditors.has(historyEntryId)) {
                    continue; // already added
                }
                handledEditors.add(historyEntryId);
            }
            // Add into history
            this.addToHistory(editor);
        }
        // Add remaining from storage if not there already
        // We check on resource and `editorId` (from `override`)
        // to figure out if the editor has been already added.
        for (const editor of storedEditorHistory) {
            const historyEntryId = `${editor.resource.toString()}/${editor.options?.override}`;
            if (!handledEditors.has(historyEntryId) &&
                this.includeInHistory(editor)) {
                handledEditors.add(historyEntryId);
                this.addToHistory(editor, false /* at the end */);
            }
        }
    }
    loadHistoryFromStorage() {
        const entries = [];
        const entriesRaw = this.storageService.get(HistoryService_1.HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (entriesRaw) {
            try {
                const entriesParsed = JSON.parse(entriesRaw);
                for (const entryParsed of entriesParsed) {
                    if (!entryParsed.editor || !entryParsed.editor.resource) {
                        continue; // unexpected data format
                    }
                    try {
                        entries.push({
                            ...entryParsed.editor,
                            resource: typeof entryParsed.editor.resource === 'string' ?
                                URI.parse(entryParsed.editor.resource) : //  from 1.67.x: URI is stored efficiently as URI.toString()
                                URI.from(entryParsed.editor.resource) // until 1.66.x: URI was stored very verbose as URI.toJSON()
                        });
                    }
                    catch (error) {
                        onUnexpectedError(error); // do not fail entire history when one entry fails
                    }
                }
            }
            catch (error) {
                onUnexpectedError(error); // https://github.com/microsoft/vscode/issues/99075
            }
        }
        return entries;
    }
    saveState() {
        if (!this.history) {
            return; // nothing to save because history was not used
        }
        const entries = [];
        for (const editor of this.history) {
            if (isEditorInput(editor) || !isResourceEditorInput(editor)) {
                continue; // only save resource editor inputs
            }
            entries.push({
                editor: {
                    ...editor,
                    resource: editor.resource.toString()
                }
            });
        }
        this.storageService.store(HistoryService_1.HISTORY_STORAGE_KEY, JSON.stringify(entries), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    //#endregion
    //#region Last Active Workspace/File
    getLastActiveWorkspaceRoot(schemeFilter, authorityFilter) {
        // No Folder: return early
        const folders = this.contextService.getWorkspace().folders;
        if (folders.length === 0) {
            return undefined;
        }
        // Single Folder: return early
        if (folders.length === 1) {
            const resource = folders[0].uri;
            if ((!schemeFilter || resource.scheme === schemeFilter) && (!authorityFilter || resource.authority === authorityFilter)) {
                return resource;
            }
            return undefined;
        }
        // Multiple folders: find the last active one
        for (const input of this.getHistory()) {
            if (isEditorInput(input)) {
                continue;
            }
            if (schemeFilter && input.resource.scheme !== schemeFilter) {
                continue;
            }
            if (authorityFilter && input.resource.authority !== authorityFilter) {
                continue;
            }
            const resourceWorkspace = this.contextService.getWorkspaceFolder(input.resource);
            if (resourceWorkspace) {
                return resourceWorkspace.uri;
            }
        }
        // Fallback to first workspace matching scheme filter if any
        for (const folder of folders) {
            const resource = folder.uri;
            if ((!schemeFilter || resource.scheme === schemeFilter) && (!authorityFilter || resource.authority === authorityFilter)) {
                return resource;
            }
        }
        return undefined;
    }
    getLastActiveFile(filterByScheme, filterByAuthority) {
        for (const input of this.getHistory()) {
            let resource;
            if (isEditorInput(input)) {
                resource = EditorResourceAccessor.getOriginalUri(input, { filterByScheme });
            }
            else {
                resource = input.resource;
            }
            if (resource && resource.scheme === filterByScheme && (!filterByAuthority || resource.authority === filterByAuthority)) {
                return resource;
            }
        }
        return undefined;
    }
    //#endregion
    dispose() {
        super.dispose();
        for (const [, stack] of this.editorGroupScopedNavigationStacks) {
            stack.disposable.dispose();
        }
        for (const [, editors] of this.editorScopedNavigationStacks) {
            for (const [, stack] of editors) {
                stack.disposable.dispose();
            }
        }
        for (const [, listener] of this.editorHistoryListeners) {
            listener.dispose();
        }
    }
};
HistoryService = HistoryService_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IFileService),
    __param(6, IWorkspacesService),
    __param(7, IInstantiationService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IContextKeyService),
    __param(10, ILogService)
], HistoryService);
export { HistoryService };
registerSingleton(IHistoryService, HistoryService, 0 /* InstantiationType.Eager */);
class EditorSelectionState {
    constructor(editorIdentifier, selection, reason) {
        this.editorIdentifier = editorIdentifier;
        this.selection = selection;
        this.reason = reason;
    }
    justifiesNewNavigationEntry(other) {
        if (this.editorIdentifier.groupId !== other.editorIdentifier.groupId) {
            return true; // different group
        }
        if (!this.editorIdentifier.editor.matches(other.editorIdentifier.editor)) {
            return true; // different editor
        }
        if (!this.selection || !other.selection) {
            return true; // unknown selections
        }
        const result = this.selection.compare(other.selection);
        if (result === 2 /* EditorPaneSelectionCompareResult.SIMILAR */ && (other.reason === 4 /* EditorPaneSelectionChangeReason.NAVIGATION */ || other.reason === 5 /* EditorPaneSelectionChangeReason.JUMP */)) {
            // let navigation sources win even if the selection is `SIMILAR`
            // (e.g. "Go to definition" should add a history entry)
            return true;
        }
        return result === 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
    }
}
let EditorNavigationStacks = class EditorNavigationStacks extends Disposable {
    constructor(scope, instantiationService) {
        super();
        this.scope = scope;
        this.instantiationService = instantiationService;
        this.selectionsStack = this._register(this.instantiationService.createInstance(EditorNavigationStack, 0 /* GoFilter.NONE */, this.scope));
        this.editsStack = this._register(this.instantiationService.createInstance(EditorNavigationStack, 1 /* GoFilter.EDITS */, this.scope));
        this.navigationsStack = this._register(this.instantiationService.createInstance(EditorNavigationStack, 2 /* GoFilter.NAVIGATION */, this.scope));
        this.stacks = [
            this.selectionsStack,
            this.editsStack,
            this.navigationsStack
        ];
        this.onDidChange = Event.any(this.selectionsStack.onDidChange, this.editsStack.onDidChange, this.navigationsStack.onDidChange);
    }
    canGoForward(filter) {
        return this.getStack(filter).canGoForward();
    }
    goForward(filter) {
        return this.getStack(filter).goForward();
    }
    canGoBack(filter) {
        return this.getStack(filter).canGoBack();
    }
    goBack(filter) {
        return this.getStack(filter).goBack();
    }
    goPrevious(filter) {
        return this.getStack(filter).goPrevious();
    }
    canGoLast(filter) {
        return this.getStack(filter).canGoLast();
    }
    goLast(filter) {
        return this.getStack(filter).goLast();
    }
    getStack(filter = 0 /* GoFilter.NONE */) {
        switch (filter) {
            case 0 /* GoFilter.NONE */: return this.selectionsStack;
            case 1 /* GoFilter.EDITS */: return this.editsStack;
            case 2 /* GoFilter.NAVIGATION */: return this.navigationsStack;
        }
    }
    handleActiveEditorChange(editorPane) {
        // Always send to selections navigation stack
        this.selectionsStack.notifyNavigation(editorPane);
    }
    handleActiveEditorSelectionChange(editorPane, event) {
        const previous = this.selectionsStack.current;
        // Always send to selections navigation stack
        this.selectionsStack.notifyNavigation(editorPane, event);
        // Check for edits
        if (event.reason === 3 /* EditorPaneSelectionChangeReason.EDIT */) {
            this.editsStack.notifyNavigation(editorPane, event);
        }
        // Check for navigations
        //
        // Note: ignore if selections navigation stack is navigating because
        // in that case we do not want to receive repeated entries in
        // the navigation stack.
        else if ((event.reason === 4 /* EditorPaneSelectionChangeReason.NAVIGATION */ || event.reason === 5 /* EditorPaneSelectionChangeReason.JUMP */) &&
            !this.selectionsStack.isNavigating()) {
            // A "JUMP" navigation selection change always has a source and
            // target. As such, we add the previous entry of the selections
            // navigation stack so that our navigation stack receives both
            // entries unless the user is currently navigating.
            if (event.reason === 5 /* EditorPaneSelectionChangeReason.JUMP */ && !this.navigationsStack.isNavigating()) {
                if (previous) {
                    this.navigationsStack.addOrReplace(previous.groupId, previous.editor, previous.selection);
                }
            }
            this.navigationsStack.notifyNavigation(editorPane, event);
        }
    }
    clear() {
        for (const stack of this.stacks) {
            stack.clear();
        }
    }
    remove(arg1) {
        for (const stack of this.stacks) {
            stack.remove(arg1);
        }
    }
    move(event) {
        for (const stack of this.stacks) {
            stack.move(event);
        }
    }
};
EditorNavigationStacks = __decorate([
    __param(1, IInstantiationService)
], EditorNavigationStacks);
class NoOpEditorNavigationStacks {
    constructor() {
        this.onDidChange = Event.None;
    }
    canGoForward() { return false; }
    async goForward() { }
    canGoBack() { return false; }
    async goBack() { }
    async goPrevious() { }
    canGoLast() { return false; }
    async goLast() { }
    handleActiveEditorChange() { }
    handleActiveEditorSelectionChange() { }
    clear() { }
    remove() { }
    move() { }
    dispose() { }
}
let EditorNavigationStack = class EditorNavigationStack extends Disposable {
    static { EditorNavigationStack_1 = this; }
    static { this.MAX_STACK_SIZE = 50; }
    get current() {
        return this.stack[this.index];
    }
    set current(entry) {
        if (entry) {
            this.stack[this.index] = entry;
        }
    }
    constructor(filter, scope, instantiationService, editorService, editorGroupService, logService) {
        super();
        this.filter = filter;
        this.scope = scope;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.mapEditorToDisposable = this._register(new DisposableMap());
        this.mapGroupToDisposable = this._register(new DisposableMap);
        this.stack = [];
        this.index = -1;
        this.previousIndex = -1;
        this.navigating = false;
        this.currentSelectionState = undefined;
        this.editorHelper = instantiationService.createInstance(EditorHelper);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.onDidChange(() => this.traceStack()));
        this._register(this.logService.onDidChangeLogLevel(() => this.traceStack()));
        this._register(this.editorGroupService.onDidRemoveGroup(group => {
            this.mapGroupToDisposable.deleteAndDispose(group.id);
        }));
    }
    traceStack() {
        if (this.logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        const entryLabels = [];
        for (const entry of this.stack) {
            if (typeof entry.selection?.log === 'function') {
                entryLabels.push(`- group: ${entry.groupId}, editor: ${entry.editor.resource?.toString()}, selection: ${entry.selection.log()}`);
            }
            else {
                entryLabels.push(`- group: ${entry.groupId}, editor: ${entry.editor.resource?.toString()}, selection: <none>`);
            }
        }
        if (entryLabels.length === 0) {
            this.trace(`index: ${this.index}, navigating: ${this.isNavigating()}: <empty>`);
        }
        else {
            this.trace(`index: ${this.index}, navigating: ${this.isNavigating()}
${entryLabels.join('\n')}
			`);
        }
    }
    trace(msg, editor = null, event) {
        if (this.logService.getLevel() !== LogLevel.Trace) {
            return;
        }
        let filterLabel;
        switch (this.filter) {
            case 0 /* GoFilter.NONE */:
                filterLabel = 'global';
                break;
            case 1 /* GoFilter.EDITS */:
                filterLabel = 'edits';
                break;
            case 2 /* GoFilter.NAVIGATION */:
                filterLabel = 'navigation';
                break;
        }
        let scopeLabel;
        switch (this.scope) {
            case 0 /* GoScope.DEFAULT */:
                scopeLabel = 'default';
                break;
            case 1 /* GoScope.EDITOR_GROUP */:
                scopeLabel = 'editorGroup';
                break;
            case 2 /* GoScope.EDITOR */:
                scopeLabel = 'editor';
                break;
        }
        if (editor !== null) {
            this.logService.trace(`[History stack ${filterLabel}-${scopeLabel}]: ${msg} (editor: ${editor?.resource?.toString()}, event: ${this.traceEvent(event)})`);
        }
        else {
            this.logService.trace(`[History stack ${filterLabel}-${scopeLabel}]: ${msg}`);
        }
    }
    traceEvent(event) {
        if (!event) {
            return '<none>';
        }
        switch (event.reason) {
            case 3 /* EditorPaneSelectionChangeReason.EDIT */: return 'edit';
            case 4 /* EditorPaneSelectionChangeReason.NAVIGATION */: return 'navigation';
            case 5 /* EditorPaneSelectionChangeReason.JUMP */: return 'jump';
            case 1 /* EditorPaneSelectionChangeReason.PROGRAMMATIC */: return 'programmatic';
            case 2 /* EditorPaneSelectionChangeReason.USER */: return 'user';
        }
    }
    registerGroupListeners(groupId) {
        if (!this.mapGroupToDisposable.has(groupId)) {
            const group = this.editorGroupService.getGroup(groupId);
            if (group) {
                this.mapGroupToDisposable.set(groupId, group.onWillMoveEditor(e => this.onWillMoveEditor(e)));
            }
        }
    }
    onWillMoveEditor(e) {
        this.trace('onWillMoveEditor()', e.editor);
        if (this.scope === 1 /* GoScope.EDITOR_GROUP */) {
            return; // ignore move events if our scope is group based
        }
        for (const entry of this.stack) {
            if (entry.groupId !== e.groupId) {
                continue; // not in the group that reported the event
            }
            if (!this.editorHelper.matchesEditor(e.editor, entry.editor)) {
                continue; // not the editor this event is about
            }
            // Update to target group
            entry.groupId = e.target;
        }
    }
    //#region Stack Mutation
    notifyNavigation(editorPane, event) {
        this.trace('notifyNavigation()', editorPane?.input, event);
        const isSelectionAwareEditorPane = isEditorPaneWithSelection(editorPane);
        const hasValidEditor = editorPane?.input && !editorPane.input.isDisposed();
        // Treat editor changes that happen as part of stack navigation specially
        // we do not want to add a new stack entry as a matter of navigating the
        // stack but we need to keep our currentEditorSelectionState up to date
        // with the navigtion that occurs.
        if (this.navigating) {
            this.trace(`notifyNavigation() ignoring (navigating)`, editorPane?.input, event);
            if (isSelectionAwareEditorPane && hasValidEditor) {
                this.trace('notifyNavigation() updating current selection state', editorPane?.input, event);
                this.currentSelectionState = new EditorSelectionState({ groupId: editorPane.group.id, editor: editorPane.input }, editorPane.getSelection(), event?.reason);
            }
            else {
                this.trace('notifyNavigation() dropping current selection state', editorPane?.input, event);
                this.currentSelectionState = undefined; // we navigated to a non-selection aware or disposed editor
            }
        }
        // Normal navigation not part of stack navigation
        else {
            this.trace(`notifyNavigation() not ignoring`, editorPane?.input, event);
            // Navigation inside selection aware editor
            if (isSelectionAwareEditorPane && hasValidEditor) {
                this.onSelectionAwareEditorNavigation(editorPane.group.id, editorPane.input, editorPane.getSelection(), event);
            }
            // Navigation to non-selection aware or disposed editor
            else {
                this.currentSelectionState = undefined; // at this time we have no active selection aware editor
                if (hasValidEditor) {
                    this.onNonSelectionAwareEditorNavigation(editorPane.group.id, editorPane.input);
                }
            }
        }
    }
    onSelectionAwareEditorNavigation(groupId, editor, selection, event) {
        if (this.current?.groupId === groupId && !selection && this.editorHelper.matchesEditor(this.current.editor, editor)) {
            return; // do not push same editor input again of same group if we have no valid selection
        }
        this.trace('onSelectionAwareEditorNavigation()', editor, event);
        const stateCandidate = new EditorSelectionState({ groupId, editor }, selection, event?.reason);
        // Add to stack if we dont have a current state or this new state justifies a push
        if (!this.currentSelectionState || this.currentSelectionState.justifiesNewNavigationEntry(stateCandidate)) {
            this.doAdd(groupId, editor, stateCandidate.selection);
        }
        // Otherwise we replace the current stack entry with this one
        else {
            this.doReplace(groupId, editor, stateCandidate.selection);
        }
        // Update our current navigation editor state
        this.currentSelectionState = stateCandidate;
    }
    onNonSelectionAwareEditorNavigation(groupId, editor) {
        if (this.current?.groupId === groupId && this.editorHelper.matchesEditor(this.current.editor, editor)) {
            return; // do not push same editor input again of same group
        }
        this.trace('onNonSelectionAwareEditorNavigation()', editor);
        this.doAdd(groupId, editor);
    }
    doAdd(groupId, editor, selection) {
        if (!this.navigating) {
            this.addOrReplace(groupId, editor, selection);
        }
    }
    doReplace(groupId, editor, selection) {
        if (!this.navigating) {
            this.addOrReplace(groupId, editor, selection, true /* force replace */);
        }
    }
    addOrReplace(groupId, editorCandidate, selection, forceReplace) {
        // Ensure we listen to changes in group
        this.registerGroupListeners(groupId);
        // Check whether to replace an existing entry or not
        let replace = false;
        if (this.current) {
            if (forceReplace) {
                replace = true; // replace if we are forced to
            }
            else if (this.shouldReplaceStackEntry(this.current, { groupId, editor: editorCandidate, selection })) {
                replace = true; // replace if the group & input is the same and selection indicates as such
            }
        }
        const editor = this.editorHelper.preferResourceEditorInput(editorCandidate);
        if (!editor) {
            return;
        }
        if (replace) {
            this.trace('replace()', editor);
        }
        else {
            this.trace('add()', editor);
        }
        const newStackEntry = { groupId, editor, selection };
        // Replace at current position
        const removedEntries = [];
        if (replace) {
            if (this.current) {
                removedEntries.push(this.current);
            }
            this.current = newStackEntry;
        }
        // Add to stack at current position
        else {
            // If we are not at the end of history, we remove anything after
            if (this.stack.length > this.index + 1) {
                for (let i = this.index + 1; i < this.stack.length; i++) {
                    removedEntries.push(this.stack[i]);
                }
                this.stack = this.stack.slice(0, this.index + 1);
            }
            // Insert entry at index
            this.stack.splice(this.index + 1, 0, newStackEntry);
            // Check for limit
            if (this.stack.length > EditorNavigationStack_1.MAX_STACK_SIZE) {
                removedEntries.push(this.stack.shift()); // remove first
                if (this.previousIndex >= 0) {
                    this.previousIndex--;
                }
            }
            else {
                this.setIndex(this.index + 1, true /* skip event, we fire it later */);
            }
        }
        // Clear editor listeners from removed entries
        for (const removedEntry of removedEntries) {
            this.editorHelper.clearOnEditorDispose(removedEntry.editor, this.mapEditorToDisposable);
        }
        // Remove this from the stack unless the stack input is a resource
        // that can easily be restored even when the input gets disposed
        if (isEditorInput(editor)) {
            this.editorHelper.onEditorDispose(editor, () => this.remove(editor), this.mapEditorToDisposable);
        }
        // Event
        this._onDidChange.fire();
    }
    shouldReplaceStackEntry(entry, candidate) {
        if (entry.groupId !== candidate.groupId) {
            return false; // different group
        }
        if (!this.editorHelper.matchesEditor(entry.editor, candidate.editor)) {
            return false; // different editor
        }
        if (!entry.selection) {
            return true; // always replace when we have no specific selection yet
        }
        if (!candidate.selection) {
            return false; // otherwise, prefer to keep existing specific selection over new unspecific one
        }
        // Finally, replace when selections are considered identical
        return entry.selection.compare(candidate.selection) === 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
    }
    move(event) {
        if (event.isOperation(2 /* FileOperation.MOVE */)) {
            for (const entry of this.stack) {
                if (this.editorHelper.matchesEditor(event, entry.editor)) {
                    entry.editor = { resource: event.target.resource };
                }
            }
        }
    }
    remove(arg1) {
        const previousStackSize = this.stack.length;
        // Remove all stack entries that match `arg1`
        this.stack = this.stack.filter(entry => {
            const matches = typeof arg1 === 'number' ? entry.groupId === arg1 : this.editorHelper.matchesEditor(arg1, entry.editor);
            // Cleanup any listeners associated with the input when removing
            if (matches) {
                this.editorHelper.clearOnEditorDispose(entry.editor, this.mapEditorToDisposable);
            }
            return !matches;
        });
        if (previousStackSize === this.stack.length) {
            return; // nothing removed
        }
        // Given we just removed entries, we need to make sure
        // to remove entries that are now identical and next
        // to each other to prevent no-op navigations.
        this.flatten();
        // Reset indeces
        this.index = this.stack.length - 1;
        this.previousIndex = -1;
        // Clear group listener
        if (typeof arg1 === 'number') {
            this.mapGroupToDisposable.deleteAndDispose(arg1);
        }
        // Event
        this._onDidChange.fire();
    }
    flatten() {
        const flattenedStack = [];
        let previousEntry = undefined;
        for (const entry of this.stack) {
            if (previousEntry && this.shouldReplaceStackEntry(entry, previousEntry)) {
                continue; // skip over entry when it is considered the same
            }
            previousEntry = entry;
            flattenedStack.push(entry);
        }
        this.stack = flattenedStack;
    }
    clear() {
        this.index = -1;
        this.previousIndex = -1;
        this.stack.splice(0);
        this.mapEditorToDisposable.clearAndDisposeAll();
        this.mapGroupToDisposable.clearAndDisposeAll();
    }
    dispose() {
        this.clear();
        super.dispose();
    }
    //#endregion
    //#region Navigation
    canGoForward() {
        return this.stack.length > this.index + 1;
    }
    async goForward() {
        const navigated = await this.maybeGoCurrent();
        if (navigated) {
            return;
        }
        if (!this.canGoForward()) {
            return;
        }
        this.setIndex(this.index + 1);
        return this.navigate();
    }
    canGoBack() {
        return this.index > 0;
    }
    async goBack() {
        const navigated = await this.maybeGoCurrent();
        if (navigated) {
            return;
        }
        if (!this.canGoBack()) {
            return;
        }
        this.setIndex(this.index - 1);
        return this.navigate();
    }
    async goPrevious() {
        const navigated = await this.maybeGoCurrent();
        if (navigated) {
            return;
        }
        // If we never navigated, just go back
        if (this.previousIndex === -1) {
            return this.goBack();
        }
        // Otherwise jump to previous stack entry
        this.setIndex(this.previousIndex);
        return this.navigate();
    }
    canGoLast() {
        return this.stack.length > 0;
    }
    async goLast() {
        if (!this.canGoLast()) {
            return;
        }
        this.setIndex(this.stack.length - 1);
        return this.navigate();
    }
    async maybeGoCurrent() {
        // When this navigation stack works with a specific
        // filter where not every selection change is added
        // to the stack, we want to first reveal the current
        // selection before attempting to navigate in the
        // stack.
        if (this.filter === 0 /* GoFilter.NONE */) {
            return false; // only applies when  we are a filterd stack
        }
        if (this.isCurrentSelectionActive()) {
            return false; // we are at the current navigation stop
        }
        // Go to current selection
        await this.navigate();
        return true;
    }
    isCurrentSelectionActive() {
        if (!this.current?.selection) {
            return false; // we need a current selection
        }
        const pane = this.editorService.activeEditorPane;
        if (!isEditorPaneWithSelection(pane)) {
            return false; // we need an active editor pane with selection support
        }
        if (pane.group.id !== this.current.groupId) {
            return false; // we need matching groups
        }
        if (!pane.input || !this.editorHelper.matchesEditor(pane.input, this.current.editor)) {
            return false; // we need matching editors
        }
        const paneSelection = pane.getSelection();
        if (!paneSelection) {
            return false; // we need a selection to compare with
        }
        return paneSelection.compare(this.current.selection) === 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
    }
    setIndex(newIndex, skipEvent) {
        this.previousIndex = this.index;
        this.index = newIndex;
        // Event
        if (!skipEvent) {
            this._onDidChange.fire();
        }
    }
    async navigate() {
        this.navigating = true;
        try {
            if (this.current) {
                await this.doNavigate(this.current);
            }
        }
        finally {
            this.navigating = false;
        }
    }
    doNavigate(location) {
        let options = Object.create(null);
        // Apply selection if any
        if (location.selection) {
            options = location.selection.restore(options);
        }
        if (isEditorInput(location.editor)) {
            return this.editorService.openEditor(location.editor, options, location.groupId);
        }
        return this.editorService.openEditor({
            ...location.editor,
            options: {
                ...location.editor.options,
                ...options
            }
        }, location.groupId);
    }
    isNavigating() {
        return this.navigating;
    }
};
EditorNavigationStack = EditorNavigationStack_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, ILogService)
], EditorNavigationStack);
export { EditorNavigationStack };
let EditorHelper = class EditorHelper {
    constructor(uriIdentityService, lifecycleService, fileService, pathService) {
        this.uriIdentityService = uriIdentityService;
        this.lifecycleService = lifecycleService;
        this.fileService = fileService;
        this.pathService = pathService;
    }
    preferResourceEditorInput(editor) {
        const resource = EditorResourceAccessor.getOriginalUri(editor);
        // For now, only prefer well known schemes that we control to prevent
        // issues such as https://github.com/microsoft/vscode/issues/85204
        // from being used as resource inputs
        // resource inputs survive editor disposal and as such are a lot more
        // durable across editor changes and restarts
        const hasValidResourceEditorInputScheme = resource?.scheme === Schemas.file ||
            resource?.scheme === Schemas.vscodeRemote ||
            resource?.scheme === Schemas.vscodeUserData ||
            resource?.scheme === this.pathService.defaultUriScheme;
        // Scheme is valid: prefer the untyped input
        // over the typed input if possible to keep
        // the entry across restarts
        if (hasValidResourceEditorInputScheme) {
            if (isEditorInput(editor)) {
                const untypedInput = editor.toUntyped();
                if (isResourceEditorInput(untypedInput)) {
                    return untypedInput;
                }
            }
            return editor;
        }
        // Scheme is invalid: allow the editor input
        // for as long as it is not disposed
        else {
            return isEditorInput(editor) ? editor : undefined;
        }
    }
    matchesEditor(arg1, inputB) {
        if (arg1 instanceof FileChangesEvent || arg1 instanceof FileOperationEvent) {
            if (isEditorInput(inputB)) {
                return false; // we only support this for `IResourceEditorInputs` that are file based
            }
            if (arg1 instanceof FileChangesEvent) {
                return arg1.contains(inputB.resource, 2 /* FileChangeType.DELETED */);
            }
            return this.matchesFile(inputB.resource, arg1);
        }
        if (isEditorInput(arg1)) {
            if (isEditorInput(inputB)) {
                return arg1.matches(inputB);
            }
            return this.matchesFile(inputB.resource, arg1);
        }
        if (isEditorInput(inputB)) {
            return this.matchesFile(arg1.resource, inputB);
        }
        return arg1 && inputB && this.uriIdentityService.extUri.isEqual(arg1.resource, inputB.resource);
    }
    matchesFile(resource, arg2) {
        if (arg2 instanceof FileChangesEvent) {
            return arg2.contains(resource, 2 /* FileChangeType.DELETED */);
        }
        if (arg2 instanceof FileOperationEvent) {
            return this.uriIdentityService.extUri.isEqualOrParent(resource, arg2.resource);
        }
        if (isEditorInput(arg2)) {
            const inputResource = arg2.resource;
            if (!inputResource) {
                return false;
            }
            if (this.lifecycleService.phase >= 3 /* LifecyclePhase.Restored */ && !this.fileService.hasProvider(inputResource)) {
                return false; // make sure to only check this when workbench has restored (for https://github.com/microsoft/vscode/issues/48275)
            }
            return this.uriIdentityService.extUri.isEqual(inputResource, resource);
        }
        return this.uriIdentityService.extUri.isEqual(arg2?.resource, resource);
    }
    matchesEditorIdentifier(identifier, editorPane) {
        if (!editorPane?.group) {
            return false;
        }
        if (identifier.groupId !== editorPane.group.id) {
            return false;
        }
        return editorPane.input ? identifier.editor.matches(editorPane.input) : false;
    }
    onEditorDispose(editor, listener, mapEditorToDispose) {
        const toDispose = Event.once(editor.onWillDispose)(() => listener());
        let disposables = mapEditorToDispose.get(editor);
        if (!disposables) {
            disposables = new DisposableStore();
            mapEditorToDispose.set(editor, disposables);
        }
        disposables.add(toDispose);
    }
    clearOnEditorDispose(editor, mapEditorToDispose) {
        if (!isEditorInput(editor)) {
            return; // only supported when passing in an actual editor input
        }
        mapEditorToDispose.deleteAndDispose(editor);
    }
};
EditorHelper = __decorate([
    __param(0, IUriIdentityService),
    __param(1, ILifecycleService),
    __param(2, IFileService),
    __param(3, IPathService)
], EditorHelper);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2hpc3RvcnkvYnJvd3Nlci9oaXN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQWtDLHNCQUFzQixFQUFvRCxnQkFBZ0IsRUFBdUIscUJBQXFCLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixFQUFFLGtCQUFrQixFQUEyRix5QkFBeUIsRUFBeUcsTUFBTSwyQkFBMkIsQ0FBQztBQUUxZSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFxQixlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFrQixvQkFBb0IsRUFBRSxrQkFBa0IsRUFBaUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNySyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFX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
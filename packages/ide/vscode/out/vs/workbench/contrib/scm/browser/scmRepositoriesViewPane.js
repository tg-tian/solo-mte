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
var ArtifactGroupRenderer_1, ArtifactRenderer_1;
import './media/scm.css';
import { localize } from '../../../../nls.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ISCMService, ISCMViewService } from '../common/scm.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { RepositoryActionRunner, RepositoryRenderer } from './scmRepositoryRenderer.js';
import { collectContextMenuActions, connectPrimaryMenu, getActionViewItemProvider, isSCMArtifactGroupTreeElement, isSCMArtifactNode, isSCMArtifactTreeElement, isSCMRepository } from './util.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { autorun, observableSignalFromEvent, runOnChange } from '../../../../base/common/observable.js';
import { Sequencer, Throttler } from '../../../../base/common/async.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { SCMViewService } from './scmViewService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { URI } from '../../../../base/common/uri.js';
import { basename } from '../../../../base/common/resources.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { fromNow } from '../../../../base/common/date.js';
class ListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId(element) {
        if (isSCMRepository(element)) {
            return RepositoryRenderer.TEMPLATE_ID;
        }
        else if (isSCMArtifactGroupTreeElement(element)) {
            return ArtifactGroupRenderer.TEMPLATE_ID;
        }
        else if (isSCMArtifactTreeElement(element) || isSCMArtifactNode(element)) {
            return ArtifactRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
let ArtifactGroupRenderer = class ArtifactGroupRenderer {
    static { ArtifactGroupRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'artifactGroup'; }
    get templateId() { return ArtifactGroupRenderer_1.TEMPLATE_ID; }
    constructor(actionViewItemProvider, _contextMenuService, _contextKeyService, _keybindingService, _menuService, _commandService, _scmViewService, _telemetryService) {
        this.actionViewItemProvider = actionViewItemProvider;
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._telemetryService = _telemetryService;
    }
    renderTemplate(container) {
        const element = append(container, $('.scm-artifact-group'));
        const icon = append(element, $('.icon'));
        const label = new IconLabel(element, { supportIcons: false });
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, { actionViewItemProvider: this.actionViewItemProvider }, this._menuService, this._contextKeyService, this._contextMenuService, this._keybindingService, this._commandService, this._telemetryService);
        return { icon, label, actionBar, elementDisposables: new DisposableStore(), templateDisposable: combinedDisposable(label, actionBar) };
    }
    renderElement(node, index, templateData) {
        const provider = node.element.repository.provider;
        const artifactGroup = node.element.artifactGroup;
        templateData.icon.className = ThemeIcon.isThemeIcon(artifactGroup.icon)
            ? `icon ${ThemeIcon.asClassName(artifactGroup.icon)}`
            : '';
        templateData.label.setLabel(artifactGroup.name);
        const repositoryMenus = this._scmViewService.menus.getRepositoryMenus(provider);
        templateData.elementDisposables.add(connectPrimaryMenu(repositoryMenus.getArtifactGroupMenu(artifactGroup), primary => {
            templateData.actionBar.setActions(primary);
        }, 'inline', provider));
        templateData.actionBar.context = artifactGroup;
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(element, index, templateData, details) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
    }
};
ArtifactGroupRenderer = ArtifactGroupRenderer_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, ICommandService),
    __param(6, ISCMViewService),
    __param(7, ITelemetryService)
], ArtifactGroupRenderer);
let ArtifactRenderer = class ArtifactRenderer {
    static { ArtifactRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'artifact'; }
    get templateId() { return ArtifactRenderer_1.TEMPLATE_ID; }
    constructor(actionViewItemProvider, _contextMenuService, _contextKeyService, _keybindingService, _menuService, _commandService, _scmViewService, _telemetryService) {
        this.actionViewItemProvider = actionViewItemProvider;
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._telemetryService = _telemetryService;
    }
    renderTemplate(container) {
        const element = append(container, $('.scm-artifact'));
        const icon = append(element, $('.icon'));
        const label = new IconLabel(element, { supportIcons: false });
        const timestampContainer = append(element, $('.timestamp-container'));
        const timestamp = append(timestampContainer, $('.timestamp'));
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, { actionViewItemProvider: this.actionViewItemProvider }, this._menuService, this._contextKeyService, this._contextMenuService, this._keybindingService, this._commandService, this._telemetryService);
        return { icon, label, timestampContainer, timestamp, actionBar, elementDisposables: new DisposableStore(), templateDisposable: combinedDisposable(label, actionBar) };
    }
    renderElement(nodeOrElement, index, templateData) {
        const artifactOrFolder = nodeOrElement.element;
        // Label
        if (isSCMArtifactTreeElement(artifactOrFolder)) {
            // Artifact
            const artifactGroup = artifactOrFolder.group;
            const artifact = artifactOrFolder.artifact;
            const artifactIcon = artifact.icon ?? artifactOrFolder.group.icon;
            templateData.icon.className = ThemeIcon.isThemeIcon(artifactIcon)
                ? `icon ${ThemeIcon.asClassName(artifactIcon)}`
                : '';
            const artifactLabel = artifactGroup.supportsFolders
                ? artifact.name.split('/').pop() ?? artifact.name
                : artifact.name;
            templateData.label.setLabel(artifactLabel, artifact.description);
            templateData.timestamp.textContent = artifact.timestamp ? fromNow(artifact.timestamp) : '';
            templateData.timestampContainer.classList.toggle('duplicate', artifactOrFolder.hideTimestamp);
            templateData.timestampContainer.style.display = '';
        }
        else if (isSCMArtifactNode(artifactOrFolder)) {
            // Folder
            templateData.icon.className = `icon ${ThemeIcon.asClassName(Codicon.folder)}`;
            templateData.label.setLabel(basename(artifactOrFolder.uri));
            templateData.timestamp.textContent = '';
            templateData.timestampContainer.classList.remove('duplicate');
            templateData.timestampContainer.style.display = 'none';
        }
        // Actions
        this._renderActionBar(artifactOrFolder, templateData);
    }
    renderCompressedElements(node, index, templateData, details) {
        const compressed = node.element;
        const artifactOrFolder = compressed.elements[compressed.elements.length - 1];
        // Label
        if (isSCMArtifactTreeElement(artifactOrFolder)) {
            // Artifact
            const artifact = artifactOrFolder.artifact;
            const artifactIcon = artifact.icon ?? artifactOrFolder.group.icon;
            templateData.icon.className = ThemeIcon.isThemeIcon(artifactIcon)
                ? `icon ${ThemeIcon.asClassName(artifactIcon)}`
                : '';
            templateData.label.setLabel(artifact.name, artifact.description);
            templateData.timestamp.textContent = artifact.timestamp ? fromNow(artifact.timestamp) : '';
            templateData.timestampContainer.classList.toggle('duplicate', artifactOrFolder.hideTimestamp);
            templateData.timestampContainer.style.display = '';
        }
        else if (isSCMArtifactNode(artifactOrFolder)) {
            // Folder
            templateData.icon.className = `icon ${ThemeIcon.asClassName(Codicon.folder)}`;
            templateData.label.setLabel(artifactOrFolder.uri.fsPath.substring(1));
            templateData.timestamp.textContent = '';
            templateData.timestampContainer.classList.remove('duplicate');
            templateData.timestampContainer.style.display = 'none';
        }
        // Actions
        this._renderActionBar(artifactOrFolder, templateData);
    }
    _renderActionBar(artifactOrFolder, templateData) {
        if (isSCMArtifactTreeElement(artifactOrFolder)) {
            const artifact = artifactOrFolder.artifact;
            const provider = artifactOrFolder.repository.provider;
            const repositoryMenus = this._scmViewService.menus.getRepositoryMenus(provider);
            templateData.elementDisposables.add(connectPrimaryMenu(repositoryMenus.getArtifactMenu(artifactOrFolder.group, artifact), primary => {
                templateData.actionBar.setActions(primary);
            }, 'inline', provider));
            templateData.actionBar.context = artifact;
        }
        else if (ResourceTree.isResourceNode(artifactOrFolder)) {
            templateData.actionBar.setActions([]);
            templateData.actionBar.context = undefined;
        }
    }
    disposeElement(element, index, templateData, details) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
    }
};
ArtifactRenderer = ArtifactRenderer_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, ICommandService),
    __param(6, ISCMViewService),
    __param(7, ITelemetryService)
], ArtifactRenderer);
let RepositoryTreeDataSource = class RepositoryTreeDataSource extends Disposable {
    constructor(scmViewService) {
        super();
        this.scmViewService = scmViewService;
    }
    async getChildren(inputOrElement) {
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            const parentId = isSCMRepository(inputOrElement)
                ? inputOrElement.provider.id
                : undefined;
            const repositories = this.scmViewService.repositories
                .filter(r => r.provider.parentId === parentId);
            return repositories;
        }
        // Explorer mode
        if (inputOrElement instanceof SCMViewService) {
            // Get all top level repositories
            const repositories = this.scmViewService.repositories
                .filter(r => r.provider.parentId === undefined);
            // Check whether there are any child repositories
            if (repositories.length !== this.scmViewService.repositories.length) {
                for (const repository of repositories) {
                    const childRepositories = this.scmViewService.repositories
                        .filter(r => r.provider.parentId === repository.provider.id);
                    if (childRepositories.length === 0) {
                        continue;
                    }
                    // Insert child repositories right after the parent
                    const repositoryIndex = repositories.indexOf(repository);
                    repositories.splice(repositoryIndex + 1, 0, ...childRepositories);
                }
            }
            return repositories;
        }
        else if (isSCMRepository(inputOrElement)) {
            const artifactGroups = await inputOrElement.provider.artifactProvider.get()?.provideArtifactGroups() ?? [];
            return artifactGroups.map(group => ({
                repository: inputOrElement,
                artifactGroup: group,
                type: 'artifactGroup'
            }));
        }
        else if (isSCMArtifactGroupTreeElement(inputOrElement)) {
            const repository = inputOrElement.repository;
            const artifacts = await repository.provider.artifactProvider.get()?.provideArtifacts(inputOrElement.artifactGroup.id) ?? [];
            if (inputOrElement.artifactGroup.supportsFolders) {
                // Resource tree for artifacts
                const artifactsTree = new ResourceTree(inputOrElement);
                for (let index = 0; index < artifacts.length; index++) {
                    const artifact = artifacts[index];
                    const artifactUri = URI.from({ scheme: 'scm-artifact', path: artifact.name });
                    const artifactDirectory = artifact.id.lastIndexOf('/') > 0
                        ? artifact.id.substring(0, artifact.id.lastIndexOf('/'))
                        : artifact.id;
                    const prevArtifact = index > 0 ? artifacts[index - 1] : undefined;
                    const prevArtifactDirectory = prevArtifact && prevArtifact.id.lastIndexOf('/') > 0
                        ? prevArtifact.id.substring(0, prevArtifact.id.lastIndexOf('/'))
                        : prevArtifact?.id;
                    const hideTimestamp = index > 0 &&
                        artifact.timestamp !== undefined &&
                        prevArtifact?.timestamp !== undefined &&
                        artifactDirectory === prevArtifactDirectory &&
                        fromNow(prevArtifact.timestamp) === fromNow(artifact.timestamp);
                    artifactsTree.add(artifactUri, {
                        repository,
                        group: inputOrElement.artifactGroup,
                        artifact,
                        hideTimestamp,
                        type: 'artifact'
                    });
                }
                return Iterable.map(artifactsTree.root.children, node => node.element ?? node);
            }
            // Flat list of artifacts
            return artifacts.map((artifact, index, artifacts) => ({
                repository,
                group: inputOrElement.artifactGroup,
                artifact,
                hideTimestamp: index > 0 &&
                    artifact.timestamp !== undefined &&
                    artifacts[index - 1].timestamp !== undefined &&
                    fromNow(artifacts[index - 1].timestamp) === fromNow(artifact.timestamp),
                type: 'artifact'
            }));
        }
        else if (isSCMArtifactNode(inputOrElement)) {
            return Iterable.map(inputOrElement.children, node => node.element && node.childrenCount === 0 ? node.element : node);
        }
        return [];
    }
    hasChildren(inputOrElement) {
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            const parentId = isSCMRepository(inputOrElement)
                ? inputOrElement.provider.id
                : undefined;
            const repositories = this.scmViewService.repositories
                .filter(r => r.provider.parentId === parentId);
            return repositories.length > 0;
        }
        // Explorer mode
        if (inputOrElement instanceof SCMViewService) {
            return this.scmViewService.repositories.length > 0;
        }
        else if (isSCMRepository(inputOrElement)) {
            return true;
        }
        else if (isSCMArtifactGroupTreeElement(inputOrElement)) {
            return true;
        }
        else if (isSCMArtifactTreeElement(inputOrElement)) {
            return false;
        }
        else if (isSCMArtifactNode(inputOrElement)) {
            return inputOrElement.childrenCount > 0;
        }
        else {
            return false;
        }
    }
};
RepositoryTreeDataSource = __decorate([
    __param(0, ISCMViewService)
], RepositoryTreeDataSource);
class RepositoryTreeIdentityProvider {
    getId(element) {
        if (isSCMRepository(element)) {
            return `repo:${element.provider.id}`;
        }
        else if (isSCMArtifactGroupTreeElement(element)) {
            return `artifactGroup:${element.repository.provider.id}/${element.artifactGroup.id}`;
        }
        else if (isSCMArtifactTreeElement(element)) {
            return `artifact:${element.repository.provider.id}/${element.group.id}/${element.artifact.id}`;
        }
        else if (isSCMArtifactNode(element)) {
            return `artifactFolder:${element.context.repository.provider.id}/${element.context.artifactGroup.id}/${element.uri.fsPath}`;
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
class RepositoriesTreeCompressionDelegate {
    isIncompressible(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.childrenCount > 1;
        }
        else {
            return true;
        }
    }
}
let SCMRepositoriesViewPane = class SCMRepositoriesViewPane extends ViewPane {
    constructor(options, scmService, scmViewService, keybindingService, contextMenuService, commandService, instantiationService, viewDescriptorService, contextKeyService, configurationService, openerService, themeService, hoverService, storageService) {
        super({ ...options, titleMenuId: MenuId.SCMSourceControlTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.commandService = commandService;
        this.storageService = storageService;
        this.treeOperationSequencer = new Sequencer();
        this.updateChildrenThrottler = new Throttler();
        this.visibilityDisposables = new DisposableStore();
        this.repositoryDisposables = new DisposableMap();
        this.visibleCountObs = observableConfigValue('scm.repositories.visible', 10, this.configurationService);
        this.providerCountBadgeObs = observableConfigValue('scm.providerCountBadge', 'hidden', this.configurationService);
        this.storageService.onWillSaveState(() => {
            this.storeTreeViewState();
        }, this, this._store);
        this._register(this.updateChildrenThrottler);
    }
    renderBody(container) {
        super.renderBody(container);
        const treeContainer = append(container, $('.scm-view.scm-repositories-view'));
        // scm.providerCountBadge setting
        this._register(autorun(reader => {
            const providerCountBadge = this.providerCountBadgeObs.read(reader);
            treeContainer.classList.toggle('hide-provider-counts', providerCountBadge === 'hidden');
            treeContainer.classList.toggle('auto-provider-counts', providerCountBadge === 'auto');
        }));
        const viewState = this.loadTreeViewState();
        this.createTree(treeContainer, viewState);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (!visible) {
                this.visibilityDisposables.clear();
                return;
            }
            this.treeOperationSequencer.queue(async () => {
                // Initial rendering
                await this.tree.setInput(this.scmViewService, viewState);
                // scm.repositories.visible setting
                this.visibilityDisposables.add(autorun(reader => {
                    const visibleCount = this.visibleCountObs.read(reader);
                    this.updateBodySize(this.tree.contentHeight, visibleCount);
                }));
                // scm.repositories.explorer setting
                this.visibilityDisposables.add(runOnChange(this.scmViewService.explorerEnabledConfig, async () => {
                    await this.updateChildren();
                    this.updateBodySize(this.tree.contentHeight);
                    // If we only have one repository, expand it
                    if (this.scmViewService.repositories.length === 1) {
                        await this.treeOperationSequencer.queue(() => this.tree.expand(this.scmViewService.repositories[0]));
                    }
                }));
                // Update tree selection
                const onDidChangeVisibleRepositoriesSignal = observableSignalFromEvent(this, this.scmViewService.onDidChangeVisibleRepositories);
                this.visibilityDisposables.add(autorun(async (reader) => {
                    onDidChangeVisibleRepositoriesSignal.read(reader);
                    await this.treeOperationSequencer.queue(() => this.updateTreeSelection());
                }));
                // Add/Remove event handlers
                this.scmService.onDidAddRepository(this.onDidAddRepository, this, this.visibilityDisposables);
                this.scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.visibilityDisposables);
                for (const repository of this.scmService.repositories) {
                    this.onDidAddRepository(repository);
                }
                // Expand repository if there is only one
                this.visibilityDisposables.add(autorun(async (reader) => {
                    const explorerEnabledConfig = this.scmViewService.explorerEnabledConfig.read(reader);
                    const didFinishLoadingRepositories = this.scmViewService.didFinishLoadingRepositories.read(reader);
                    if (viewState === undefined && explorerEnabledConfig && didFinishLoadingRepositories && this.scmViewService.repositories.length === 1) {
                        await this.treeOperationSequencer.queue(() => this.tree.expand(this.scmViewService.repositories[0]));
                    }
                }));
            });
        }, this, this._store);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    createTree(container, viewState) {
        this.treeIdentityProvider = new RepositoryTreeIdentityProvider();
        this.treeDataSource = this.instantiationService.createInstance(RepositoryTreeDataSource);
        this._register(this.treeDataSource);
        this.tree = this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'SCM Repositories', container, new ListDelegate(), new RepositoriesTreeCompressionDelegate(), [
            this.instantiationService.createInstance(RepositoryRenderer, MenuId.SCMSourceControlInline, getActionViewItemProvider(this.instantiationService)),
            this.instantiationService.createInstance(ArtifactGroupRenderer, getActionViewItemProvider(this.instantiationService)),
            this.instantiationService.createInstance(ArtifactRenderer, getActionViewItemProvider(this.instantiationService))
        ], this.treeDataSource, {
            identityProvider: this.treeIdentityProvider,
            horizontalScrolling: false,
            collapseByDefault: (e) => {
                if (this.scmViewService.explorerEnabledConfig.get() === false) {
                    if (isSCMRepository(e) && e.provider.parentId === undefined) {
                        return false;
                    }
                    return true;
                }
                // Explorer mode
                if (viewState?.expanded && (isSCMRepository(e) || isSCMArtifactGroupTreeElement(e) || isSCMArtifactTreeElement(e))) {
                    // Only expand repositories/artifact groups/artifacts that were expanded before
                    return viewState.expanded.indexOf(this.treeIdentityProvider.getId(e)) === -1;
                }
                else if (isSCMArtifactNode(e)) {
                    // Only expand artifact folders as they are compressed by default
                    return !(e.childrenCount === 1 && Iterable.first(e.children)?.element === undefined);
                }
                else {
                    return true;
                }
            },
            compressionEnabled: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            multipleSelectionSupport: this.scmViewService.selectionModeConfig.get() === 'multiple',
            expandOnDoubleClick: true,
            expandOnlyOnTwistieClick: true,
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isSCMRepository(element)) {
                        return element.provider.label;
                    }
                    else if (isSCMArtifactGroupTreeElement(element)) {
                        return element.artifactGroup.name;
                    }
                    else if (isSCMArtifactTreeElement(element)) {
                        return element.artifact.name;
                    }
                    else {
                        return '';
                    }
                },
                getWidgetAriaLabel() {
                    return localize('scm', "Source Control Repositories");
                }
            }
        });
        this._register(this.tree);
        this._register(autorun(reader => {
            const selectionMode = this.scmViewService.selectionModeConfig.read(reader);
            this.tree.updateOptions({ multipleSelectionSupport: selectionMode === 'multiple' });
        }));
        this._register(this.tree.onDidOpen(this.onTreeDidOpen, this));
        this._register(this.tree.onDidChangeSelection(this.onTreeSelectionChange, this));
        this._register(this.tree.onDidChangeFocus(this.onTreeDidChangeFocus, this));
        this._register(this.tree.onDidFocus(this.onDidTreeFocus, this));
        this._register(this.tree.onContextMenu(this.onTreeContextMenu, this));
        this._register(this.tree.onDidChangeContentHeight(this.onTreeContentHeightChange, this));
    }
    async onDidAddRepository(repository) {
        const disposables = new DisposableStore();
        // Artifact group changed
        disposables.add(autorun(async (reader) => {
            const explorerEnabled = this.scmViewService.explorerEnabledConfig.read(reader);
            const artifactsProvider = repository.provider.artifactProvider.read(reader);
            if (!explorerEnabled || !artifactsProvider) {
                return;
            }
            reader.store.add(artifactsProvider.onDidChangeArtifacts(async (groups) => {
                await this.updateRepository(repository);
            }));
        }));
        // HistoryItemRef changed
        disposables.add(autorun(async (reader) => {
            const historyProvider = repository.provider.historyProvider.read(reader);
            if (!historyProvider) {
                return;
            }
            reader.store.add(runOnChange(historyProvider.historyItemRef, async () => {
                await this.updateRepository(repository);
            }));
        }));
        await this.updateRepository(repository);
        this.repositoryDisposables.set(repository, disposables);
    }
    async onDidRemoveRepository(repository) {
        await this.updateRepository(repository);
        this.repositoryDisposables.deleteAndDispose(repository);
    }
    onTreeDidOpen(e) {
        if (!e.element || !isSCMArtifactTreeElement(e.element) || !e.element.artifact.command) {
            return;
        }
        this.commandService.executeCommand(e.element.artifact.command.id, e.element.repository.provider, e.element.artifact);
    }
    onTreeContextMenu(e) {
        if (!e.element) {
            return;
        }
        if (isSCMRepository(e.element)) {
            // Repository
            const provider = e.element.provider;
            const menus = this.scmViewService.menus.getRepositoryMenus(provider);
            const menu = menus.getRepositoryContextMenu(e.element);
            const actions = collectContextMenuActions(menu);
            const disposables = new DisposableStore();
            const actionRunner = new RepositoryActionRunner(() => {
                return this.getTreeSelection();
            });
            disposables.add(actionRunner);
            disposables.add(actionRunner.onWillRun(() => this.tree.domFocus()));
            this.contextMenuService.showContextMenu({
                actionRunner,
                getAnchor: () => e.anchor,
                getActions: () => actions,
                getActionsContext: () => provider,
                onHide: () => disposables.dispose()
            });
        }
        else if (isSCMArtifactTreeElement(e.element)) {
            // Artifact
            const provider = e.element.repository.provider;
            const artifact = e.element.artifact;
            const menus = this.scmViewService.menus.getRepositoryMenus(provider);
            const menu = menus.getArtifactMenu(e.element.group, artifact);
            const actions = collectContextMenuActions(menu, provider);
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                getActionsContext: () => artifact
            });
        }
    }
    onTreeSelectionChange(e) {
        if (e.browserEvent && e.elements.length > 0) {
            const scrollTop = this.tree.scrollTop;
            if (e.elements.every(e => isSCMRepository(e))) {
                this.scmViewService.visibleRepositories = e.elements;
            }
            else if (e.elements.every(e => isSCMArtifactGroupTreeElement(e) || isSCMArtifactTreeElement(e))) {
                this.scmViewService.visibleRepositories = e.elements.map(e => e.repository);
            }
            this.tree.scrollTop = scrollTop;
        }
    }
    onTreeDidChangeFocus(e) {
        if (e.browserEvent && e.elements.length > 0) {
            if (isSCMRepository(e.elements[0])) {
                this.scmViewService.focus(e.elements[0]);
            }
        }
    }
    onDidTreeFocus() {
        const focused = this.tree.getFocus();
        if (focused.length > 0) {
            if (isSCMRepository(focused[0])) {
                this.scmViewService.focus(focused[0]);
            }
            else if (isSCMArtifactGroupTreeElement(focused[0]) || isSCMArtifactTreeElement(focused[0])) {
                this.scmViewService.focus(focused[0].repository);
            }
        }
    }
    onTreeContentHeightChange(height) {
        this.updateBodySize(height);
        // Refresh the selection
        this.treeOperationSequencer.queue(() => this.updateTreeSelection());
    }
    async updateChildren(element) {
        return this.updateChildrenThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            if (element && this.tree.hasNode(element)) {
                await this.tree.updateChildren(element, true);
            }
            else {
                await this.tree.updateChildren(undefined, true);
            }
        }));
    }
    async expand(element) {
        await this.treeOperationSequencer.queue(() => this.tree.expand(element, true));
    }
    async updateRepository(repository) {
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            if (repository.provider.parentId === undefined) {
                await this.updateChildren();
                return;
            }
            await this.updateParentRepository(repository);
        }
        // Explorer mode
        await this.updateChildren();
    }
    async updateParentRepository(repository) {
        const parentRepository = this.scmViewService.repositories
            .find(r => r.provider.id === repository.provider.parentId);
        if (!parentRepository) {
            return;
        }
        await this.updateChildren(parentRepository);
        await this.expand(parentRepository);
    }
    updateBodySize(contentHeight, visibleCount) {
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            return;
        }
        if (this.scmViewService.explorerEnabledConfig.get() === false) {
            visibleCount = visibleCount ?? this.visibleCountObs.get();
            const empty = this.scmViewService.repositories.length === 0;
            const size = Math.min(contentHeight / 22, visibleCount) * 22;
            this.minimumBodySize = visibleCount === 0 ? 22 : size;
            this.maximumBodySize = visibleCount === 0 ? Number.POSITIVE_INFINITY : empty ? Number.POSITIVE_INFINITY : size;
        }
        else {
            this.minimumBodySize = 120;
            this.maximumBodySize = Number.POSITIVE_INFINITY;
        }
    }
    async updateTreeSelection() {
        const oldSelection = this.getTreeSelection();
        const oldSet = new Set(oldSelection);
        const set = new Set(this.scmViewService.visibleRepositories);
        const added = new Set(Iterable.filter(set, r => !oldSet.has(r)));
        const removed = new Set(Iterable.filter(oldSet, r => !set.has(r)));
        if (added.size === 0 && removed.size === 0) {
            return;
        }
        const selection = oldSelection.filter(repo => !removed.has(repo));
        for (const repo of this.scmViewService.repositories) {
            if (added.has(repo)) {
                selection.push(repo);
            }
        }
        const visibleSelection = selection
            .filter(s => this.tree.hasNode(s));
        this.tree.setSelection(visibleSelection);
        if (visibleSelection.length > 0 && !this.tree.getFocus().includes(visibleSelection[0])) {
            this.tree.setAnchor(visibleSelection[0]);
            this.tree.setFocus([visibleSelection[0]]);
        }
    }
    getTreeSelection() {
        return this.tree.getSelection()
            .map(e => {
            if (isSCMRepository(e)) {
                return e;
            }
            else if (isSCMArtifactGroupTreeElement(e) || isSCMArtifactTreeElement(e)) {
                return e.repository;
            }
            else if (isSCMArtifactNode(e)) {
                return e.context.repository;
            }
            else {
                throw new Error('Invalid tree element');
            }
        });
    }
    loadTreeViewState() {
        const storageViewState = this.storageService.get('scm.repositoriesViewState', 1 /* StorageScope.WORKSPACE */);
        if (!storageViewState) {
            return undefined;
        }
        try {
            const treeViewState = JSON.parse(storageViewState);
            return treeViewState;
        }
        catch {
            return undefined;
        }
    }
    storeTreeViewState() {
        if (this.tree) {
            this.storageService.store('scm.repositoriesViewState', JSON.stringify(this.tree.getViewState()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    dispose() {
        this.visibilityDisposables.dispose();
        super.dispose();
    }
};
SCMRepositoriesViewPane = __decorate([
    __param(1, ISCMService),
    __param(2, ISCMViewService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, ICommandService),
    __param(6, IInstantiationService),
    __param(7, IViewDescriptorService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, IOpenerService),
    __param(11, IThemeService),
    __param(12, IHoverService),
    __param(13, IStorageService)
], SCMRepositoriesViewPane);
export { SCMRepositoriesViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtUmVwb3NpdG9yaWVzVmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtUmVwb3NpdG9yaWVzVmlld1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQW9CLE1BQU0sMENBQTBDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUc1RCxPQUFPLEVBQWMsa0NBQWtDLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsSCxPQUFPLEVBQWtCLFdBQVcsRUFBRSxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDbkksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxN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
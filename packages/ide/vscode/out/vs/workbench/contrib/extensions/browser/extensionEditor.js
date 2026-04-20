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
var ExtensionEditor_1;
import { $, append, hide, setParentFlowTo, show } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { CheckboxActionViewItem } from '../../../../base/browser/ui/toggle/toggle.js';
import { Action } from '../../../../base/common/actions.js';
import * as arrays from '../../../../base/common/arrays.js';
import { Cache } from '../../../../base/common/cache.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { isNative } from '../../../../base/common/platform.js';
import { isUndefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/extensionEditor.css';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { localize } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { computeSize, IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { buttonForeground, buttonHoverBackground, editorBackground, textLinkActiveForeground, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ExtensionFeaturesTab } from './extensionFeaturesTab.js';
import { ButtonWithDropDownExtensionAction, ClearLanguageAction, DisableDropDownAction, EnableDropDownAction, ButtonWithDropdownExtensionActionViewItem, DropDownExtensionAction, ExtensionEditorManageExtensionAction, ExtensionStatusAction, ExtensionStatusLabelAction, InstallAnotherVersionAction, InstallDropdownAction, InstallingLabelAction, LocalInstallAction, MigrateDeprecatedExtensionAction, ExtensionRuntimeStateAction, RemoteInstallAction, SetColorThemeAction, SetFileIconThemeAction, SetLanguageAction, SetProductIconThemeAction, ToggleAutoUpdateForExtensionAction, UninstallAction, UpdateAction, WebInstallAction, TogglePreReleaseExtensionAction, } from './extensionsActions.js';
import { Delegate } from './extensionsList.js';
import { ExtensionData, ExtensionsGridView, ExtensionsTree, getExtensions } from './extensionsViewer.js';
import { ExtensionRecommendationWidget, ExtensionStatusWidget, ExtensionWidget, InstallCountWidget, RatingsWidget, RemoteBadgeWidget, SponsorWidget, PublisherWidget, onClick, ExtensionKindIndicatorWidget, ExtensionIconWidget } from './extensionsWidgets.js';
import { ExtensionContainers, IExtensionsWorkbenchService } from '../common/extensions.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument } from '../../markdown/browser/markdownDocumentRenderer.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from '../../webview/browser/webview.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ShowCurrentReleaseNotesActionId } from '../../update/common/update.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { fromNow } from '../../../../base/common/date.js';
class NavBar extends Disposable {
    get onChange() { return this._onChange.event; }
    get currentId() { return this._currentId; }
    constructor(container) {
        super();
        this._onChange = this._register(new Emitter());
        this._currentId = null;
        const element = append(container, $('.navbar'));
        this.actions = [];
        this.actionbar = this._register(new ActionBar(element));
    }
    push(id, label, tooltip) {
        const action = new Action(id, label, undefined, true, () => this.update(id, true));
        action.tooltip = tooltip;
        this.actions.push(action);
        this.actionbar.push(action);
        if (this.actions.length === 1) {
            this.update(id);
        }
    }
    clear() {
        this.actions = dispose(this.actions);
        this.actionbar.clear();
    }
    switch(id) {
        const action = this.actions.find(action => action.id === id);
        if (action) {
            action.run();
            return true;
        }
        return false;
    }
    update(id, focus) {
        this._currentId = id;
        this._onChange.fire({ id, focus: !!focus });
        this.actions.forEach(a => a.checked = a.id === id);
    }
}
var WebviewIndex;
(function (WebviewIndex) {
    WebviewIndex[WebviewIndex["Readme"] = 0] = "Readme";
    WebviewIndex[WebviewIndex["Changelog"] = 1] = "Changelog";
})(WebviewIndex || (WebviewIndex = {}));
const CONTEXT_SHOW_PRE_RELEASE_VERSION = new RawContextKey('showPreReleaseVersion', false);
class ExtensionWithDifferentGalleryVersionWidget extends ExtensionWidget {
    constructor() {
        super(...arguments);
        this._gallery = null;
    }
    get gallery() { return this._gallery; }
    set gallery(gallery) {
        if (this.extension && gallery && !areSameExtensions(this.extension.identifier, gallery.identifier)) {
            return;
        }
        this._gallery = gallery;
        this.update();
    }
}
class VersionWidget extends ExtensionWithDifferentGalleryVersionWidget {
    constructor(container, hoverService) {
        super();
        this.element = append(container, $('code.version', undefined, 'pre-release'));
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, localize('extension version', "Extension Version")));
        this.render();
    }
    render() {
        if (this.extension?.preRelease) {
            show(this.element);
        }
        else {
            hide(this.element);
        }
    }
}
let ExtensionEditor = class ExtensionEditor extends EditorPane {
    static { ExtensionEditor_1 = this; }
    static { this.ID = 'workbench.editor.extension'; }
    constructor(group, telemetryService, instantiationService, extensionsWorkbenchService, extensionGalleryService, themeService, notificationService, openerService, extensionRecommendationsService, storageService, extensionService, webviewService, languageService, contextMenuService, contextKeyService, hoverService) {
        super(ExtensionEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionGalleryService = extensionGalleryService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.extensionService = extensionService;
        this.webviewService = webviewService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this._scopedContextKeyService = this._register(new MutableDisposable());
        // Some action bar items use a webview whose vertical scroll position we track in this map
        this.initialScrollProgress = new Map();
        // Spot when an ExtensionEditor instance gets reused for a different extension, in which case the vertical scroll positions must be zeroed
        this.currentIdentifier = '';
        this.layoutParticipants = [];
        this.contentDisposables = this._register(new DisposableStore());
        this.transientDisposables = this._register(new DisposableStore());
        this.activeElement = null;
        this.extensionReadme = null;
        this.extensionChangelog = null;
        this.extensionManifest = null;
    }
    get scopedContextKeyService() {
        return this._scopedContextKeyService.value;
    }
    createEditor(parent) {
        const root = append(parent, $('.extension-editor'));
        this._scopedContextKeyService.value = this.contextKeyService.createScoped(root);
        this._scopedContextKeyService.value.createKey('inExtensionEditor', true);
        this.showPreReleaseVersionContextKey = CONTEXT_SHOW_PRE_RELEASE_VERSION.bindTo(this._scopedContextKeyService.value);
        root.tabIndex = 0; // this is required for the focus tracker on the editor
        root.style.outline = 'none';
        root.setAttribute('role', 'document');
        const header = append(root, $('.header'));
        const iconContainer = append(header, $('.icon-container'));
        const iconWidget = this.instantiationService.createInstance(ExtensionIconWidget, iconContainer);
        const remoteBadge = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, true);
        const details = append(header, $('.details'));
        const title = append(details, $('.title'));
        const name = append(title, $('span.name.clickable', { role: 'heading', tabIndex: 0 }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), name, localize('name', "Extension name")));
        const versionWidget = new VersionWidget(title, this.hoverService);
        const preview = append(title, $('span.preview'));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), preview, localize('preview', "Preview")));
        preview.textContent = localize('preview', "Preview");
        const builtin = append(title, $('span.builtin'));
        builtin.textContent = localize('builtin', "Built-in");
        const subtitle = append(details, $('.subtitle'));
        const subTitleEntryContainers = [];
        const publisherContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(publisherContainer);
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, publisherContainer, false);
        const extensionKindContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(extensionKindContainer);
        const extensionKindWidget = this.instantiationService.createInstance(ExtensionKindIndicatorWidget, extensionKindContainer, false);
        const installCountContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(installCountContainer);
        const installCountWidget = this.instantiationService.createInstance(InstallCountWidget, installCountContainer, false);
        const ratingsContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(ratingsContainer);
        const ratingsWidget = this.instantiationService.createInstance(RatingsWidget, ratingsContainer, false);
        const sponsorContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(sponsorContainer);
        const sponsorWidget = this.instantiationService.createInstance(SponsorWidget, sponsorContainer);
        const widgets = [
            iconWidget,
            remoteBadge,
            versionWidget,
            publisherWidget,
            extensionKindWidget,
            installCountWidget,
            ratingsWidget,
            sponsorWidget,
        ];
        const description = append(details, $('.description'));
        const installAction = this.instantiationService.createInstance(InstallDropdownAction);
        const actions = [
            this.instantiationService.createInstance(ExtensionRuntimeStateAction),
            this.instantiationService.createInstance(ExtensionStatusLabelAction),
            this.instantiationService.createInstance(UpdateAction, true),
            this.instantiationService.createInstance(SetColorThemeAction),
            this.instantiationService.createInstance(SetFileIconThemeAction),
            this.instantiationService.createInstance(SetProductIconThemeAction),
            this.instantiationService.createInstance(SetLanguageAction),
            this.instantiationService.createInstance(ClearLanguageAction),
            this.instantiationService.createInstance(EnableDropDownAction),
            this.instantiationService.createInstance(DisableDropDownAction),
            this.instantiationService.createInstance(RemoteInstallAction, false),
            this.instantiationService.createInstance(LocalInstallAction),
            this.instantiationService.createInstance(WebInstallAction),
            installAction,
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(ButtonWithDropDownExtensionAction, 'extensions.uninstall', UninstallAction.UninstallClass, [
                [
                    this.instantiationService.createInstance(MigrateDeprecatedExtensionAction, false),
                    this.instantiationService.createInstance(UninstallAction),
                    this.instantiationService.createInstance(InstallAnotherVersionAction, null, true),
                ]
            ]),
            this.instantiationService.createInstance(TogglePreReleaseExtensionAction),
            this.instantiationService.createInstance(ToggleAutoUpdateForExtensionAction),
            new ExtensionEditorManageExtensionAction(this.scopedContextKeyService || this.contextKeyService, this.instantiationService),
        ];
        const actionsAndStatusContainer = append(details, $('.actions-status-container'));
        const extensionActionBar = this._register(new ActionBar(actionsAndStatusContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof DropDownExtensionAction) {
                    return action.createActionViewItem(options);
                }
                if (action instanceof ButtonWithDropDownExtensionAction) {
                    return new ButtonWithDropdownExtensionActionViewItem(action, {
                        ...options,
                        icon: true,
                        label: true,
                        menuActionsOrProvider: { getActions: () => action.menuActions },
                        menuActionClassNames: action.menuActionClassNames
                    }, this.contextMenuService);
                }
                if (action instanceof ToggleAutoUpdateForExtensionAction) {
                    return new CheckboxActionViewItem(undefined, action, { ...options, icon: true, label: true, checkboxStyles: defaultCheckboxStyles });
                }
                return undefined;
            },
            focusOnlyEnabledItems: true
        }));
        extensionActionBar.push(actions, { icon: true, label: true });
        extensionActionBar.setFocusable(true);
        // update focusable elements when the enablement of an action changes
        this._register(Event.any(...actions.map(a => Event.filter(a.onDidChange, e => e.enabled !== undefined)))(() => {
            extensionActionBar.setFocusable(false);
            extensionActionBar.setFocusable(true);
        }));
        const otherExtensionContainers = [];
        const extensionStatusAction = this.instantiationService.createInstance(ExtensionStatusAction);
        const extensionStatusWidget = this._register(this.instantiationService.createInstance(ExtensionStatusWidget, append(actionsAndStatusContainer, $('.status')), extensionStatusAction));
        otherExtensionContainers.push(extensionStatusAction, new class extends ExtensionWidget {
            render() {
                actionsAndStatusContainer.classList.toggle('list-layout', this.extension?.state === 1 /* ExtensionState.Installed */);
            }
        }());
        const recommendationWidget = this.instantiationService.createInstance(ExtensionRecommendationWidget, append(details, $('.recommendation')));
        widgets.push(recommendationWidget);
        this._register(Event.any(extensionStatusWidget.onDidRender, recommendationWidget.onDidRender)(() => {
            if (this.dimension) {
                this.layout(this.dimension);
            }
        }));
        const extensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets, ...otherExtensionContainers]);
        for (const disposable of [...actions, ...widgets, ...otherExtensionContainers, extensionContainers]) {
            this._register(disposable);
        }
        const onError = Event.chain(extensionActionBar.onDidRun, $ => $.map(({ error }) => error)
            .filter(error => !!error));
        this._register(onError(this.onError, this));
        const body = append(root, $('.body'));
        const navbar = new NavBar(body);
        const content = append(body, $('.content'));
        content.id = generateUuid(); // An id is needed for the webview parent flow to
        this.template = {
            builtin,
            content,
            description,
            header,
            name,
            navbar,
            preview,
            actionsAndStatusContainer,
            extensionActionBar,
            set extension(extension) {
                extensionContainers.extension = extension;
                let lastNonEmptySubtitleEntryContainer;
                for (const subTitleEntryElement of subTitleEntryContainers) {
                    subTitleEntryElement.classList.remove('last-non-empty');
                    if (subTitleEntryElement.children.length > 0) {
                        lastNonEmptySubtitleEntryContainer = subTitleEntryElement;
                    }
                }
                if (lastNonEmptySubtitleEntryContainer) {
                    lastNonEmptySubtitleEntryContainer.classList.add('last-non-empty');
                }
            },
            set gallery(gallery) {
                versionWidget.gallery = gallery;
            },
            set manifest(manifest) {
                installAction.manifest = manifest;
            }
        };
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this.updatePreReleaseVersionContext();
        if (this.template) {
            await this.render(input.extension, this.template, !!options?.preserveFocus);
        }
    }
    setOptions(options) {
        const currentOptions = this.options;
        super.setOptions(options);
        this.updatePreReleaseVersionContext();
        if (this.input && this.template && currentOptions?.showPreReleaseVersion !== options?.showPreReleaseVersion) {
            this.render(this.input.extension, this.template, !!options?.preserveFocus);
            return;
        }
        if (options?.tab) {
            this.template?.navbar.switch(options.tab);
        }
    }
    updatePreReleaseVersionContext() {
        let showPreReleaseVersion = this.options?.showPreReleaseVersion;
        if (isUndefined(showPreReleaseVersion)) {
            showPreReleaseVersion = !!this.input.extension.gallery?.properties.isPreReleaseVersion;
        }
        this.showPreReleaseVersionContextKey?.set(showPreReleaseVersion);
    }
    async openTab(tab) {
        if (!this.input || !this.template) {
            return;
        }
        if (this.template.navbar.switch(tab)) {
            return;
        }
        // Fallback to Readme tab if ExtensionPack tab does not exist
        if (tab === "extensionPack" /* ExtensionEditorTab.ExtensionPack */) {
            this.template.navbar.switch("readme" /* ExtensionEditorTab.Readme */);
        }
    }
    async getGalleryVersionToShow(extension, preRelease) {
        if (extension.resourceExtension) {
            return null;
        }
        if (extension.local?.source === 'resource') {
            return null;
        }
        if (isUndefined(preRelease)) {
            return null;
        }
        if (preRelease === extension.gallery?.properties.isPreReleaseVersion) {
            return null;
        }
        if (preRelease && !extension.hasPreReleaseVersion) {
            return null;
        }
        if (!preRelease && !extension.hasReleaseVersion) {
            return null;
        }
        return (await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease, hasPreRelease: extension.hasPreReleaseVersion }], CancellationToken.None))[0] || null;
    }
    async render(extension, template, preserveFocus) {
        this.activeElement = null;
        this.transientDisposables.clear();
        const token = this.transientDisposables.add(new CancellationTokenSource()).token;
        const gallery = await this.getGalleryVersionToShow(extension, this.options?.showPreReleaseVersion);
        if (token.isCancellationRequested) {
            return;
        }
        this.extensionReadme = new Cache(() => gallery ? this.extensionGalleryService.getReadme(gallery, token) : extension.getReadme(token));
        this.extensionChangelog = new Cache(() => gallery ? this.extensionGalleryService.getChangelog(gallery, token) : extension.getChangelog(token));
        this.extensionManifest = new Cache(() => gallery ? this.extensionGalleryService.getManifest(gallery, token) : extension.getManifest(token));
        template.extension = extension;
        template.gallery = gallery;
        template.manifest = null;
        template.name.textContent = extension.displayName;
        template.name.classList.toggle('clickable', !!extension.url);
        template.name.classList.toggle('deprecated', !!extension.deprecationInfo);
        template.preview.style.display = extension.preview ? 'inherit' : 'none';
        template.builtin.style.display = extension.isBuiltin ? 'inherit' : 'none';
        template.description.textContent = extension.description;
        if (extension.url) {
            this.transientDisposables.add(onClick(template.name, () => this.openerService.open(URI.parse(extension.url))));
        }
        const manifest = await this.extensionManifest.get().promise;
        if (token.isCancellationRequested) {
            return;
        }
        if (manifest) {
            template.manifest = manifest;
        }
        this.renderNavbar(extension, manifest, template, preserveFocus);
        // report telemetry
        const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
        let recommendationsData = {};
        if (extRecommendations[extension.identifier.id.toLowerCase()]) {
            recommendationsData = { recommendationReason: extRecommendations[extension.identifier.id.toLowerCase()].reasonId };
        }
        /* __GDPR__
        "extensionGallery:openExtension" : {
            "owner": "sandy081",
            "recommendationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
        */
        this.telemetryService.publicLog('extensionGallery:openExtension', { ...extension.telemetryData, ...recommendationsData });
    }
    renderNavbar(extension, manifest, template, preserveFocus) {
        template.content.innerText = '';
        template.navbar.clear();
        if (this.currentIdentifier !== extension.identifier.id) {
            this.initialScrollProgress.clear();
            this.currentIdentifier = extension.identifier.id;
        }
        template.navbar.push("readme" /* ExtensionEditorTab.Readme */, localize('details', "Details"), localize('detailstooltip', "Extension details, rendered from the extension's 'README.md' file"));
        if (manifest) {
            template.navbar.push("features" /* ExtensionEditorTab.Features */, localize('features', "Features"), localize('featurestooltip', "Lists features contributed by this extension"));
        }
        if (extension.hasChangelog()) {
            template.navbar.push("changelog" /* ExtensionEditorTab.Changelog */, localize('changelog', "Changelog"), localize('changelogtooltip', "Extension update history, rendered from the extension's 'CHANGELOG.md' file"));
        }
        if (extension.dependencies.length) {
            template.navbar.push("dependencies" /* ExtensionEditorTab.Dependencies */, localize('dependencies', "Dependencies"), localize('dependenciestooltip', "Lists extensions this extension depends on"));
        }
        if (manifest && manifest.extensionPack?.length && !this.shallRenderAsExtensionPack(manifest)) {
            template.navbar.push("extensionPack" /* ExtensionEditorTab.ExtensionPack */, localize('extensionpack', "Extension Pack"), localize('extensionpacktooltip', "Lists extensions those will be installed together with this extension"));
        }
        if (this.options?.tab) {
            template.navbar.switch(this.options.tab);
        }
        if (template.navbar.currentId) {
            this.onNavbarChange(extension, { id: template.navbar.currentId, focus: !preserveFocus }, template);
        }
        template.navbar.onChange(e => this.onNavbarChange(extension, e, template), this, this.transientDisposables);
    }
    clearInput() {
        this.contentDisposables.clear();
        this.transientDisposables.clear();
        super.clearInput();
    }
    focus() {
        super.focus();
        this.activeElement?.focus();
    }
    showFind() {
        this.activeWebview?.showFind();
    }
    runFindAction(previous) {
        this.activeWebview?.runFindAction(previous);
    }
    get activeWebview() {
        if (!this.activeElement || !this.activeElement.runFindAction) {
            return undefined;
        }
        return this.activeElement;
    }
    onNavbarChange(extension, { id, focus }, template) {
        this.contentDisposables.clear();
        template.content.innerText = '';
        this.activeElement = null;
        if (id) {
            const cts = new CancellationTokenSource();
            this.contentDisposables.add(toDisposable(() => cts.dispose(true)));
            this.open(id, extension, template, cts.token)
                .then(activeElement => {
                if (cts.token.isCancellationRequested) {
                    return;
                }
                this.activeElement = activeElement;
                if (focus) {
                    this.focus();
                }
            });
        }
    }
    open(id, extension, template, token) {
        // Setup common container structure for all tabs
        const details = append(template.content, $('.details'));
        const contentContainer = append(details, $('.content-container'));
        const additionalDetailsContainer = append(details, $('.additional-details-container'));
        const layout = () => details.classList.toggle('narrow', this.dimension && this.dimension.width < 500);
        layout();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        // Render additional details synchronously to avoid flicker
        this.renderAdditionalDetails(additionalDetailsContainer, extension);
        switch (id) {
            case "readme" /* ExtensionEditorTab.Readme */: return this.openDetails(extension, contentContainer, token);
            case "features" /* ExtensionEditorTab.Features */: return this.openFeatures(extension, contentContainer, token);
            case "changelog" /* ExtensionEditorTab.Changelog */: return this.openChangelog(extension, contentContainer, token);
            case "dependencies" /* ExtensionEditorTab.Dependencies */: return this.openExtensionDependencies(extension, contentContainer, token);
            case "extensionPack" /* ExtensionEditorTab.ExtensionPack */: return this.openExtensionPack(extension, contentContainer, token);
        }
        return Promise.resolve(null);
    }
    async openMarkdown(extension, cacheResult, noContentCopy, container, webviewIndex, title, token) {
        try {
            const body = await this.renderMarkdown(extension, cacheResult, container, token);
            if (token.isCancellationRequested) {
                return Promise.resolve(null);
            }
            const webview = this.contentDisposables.add(this.webviewService.createWebviewOverlay({
                title,
                options: {
                    enableFindWidget: true,
                    tryRestoreScrollPosition: true,
                    disableServiceWorker: true,
                },
                contentOptions: {},
                extension: undefined,
            }));
            webview.initialScrollProgress = this.initialScrollProgress.get(webviewIndex) || 0;
            webview.claim(this, this.window, this.scopedContextKeyService);
            setParentFlowTo(webview.container, container);
            webview.layoutWebviewOverElement(container);
            webview.setHtml(body);
            webview.claim(this, this.window, undefined);
            this.contentDisposables.add(webview.onDidFocus(() => this._onDidFocus?.fire()));
            this.contentDisposables.add(webview.onDidScroll(() => this.initialScrollProgress.set(webviewIndex, webview.initialScrollProgress)));
            const removeLayoutParticipant = arrays.insert(this.layoutParticipants, {
                layout: () => {
                    webview.layoutWebviewOverElement(container);
                }
            });
            this.contentDisposables.add(toDisposable(removeLayoutParticipant));
            let isDisposed = false;
            this.contentDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.contentDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since syntax highlighting of code blocks may have changed
                const body = await this.renderMarkdown(extension, cacheResult, container);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    webview.setHtml(body);
                }
            }));
            this.contentDisposables.add(webview.onDidClickLink(link => {
                if (!link) {
                    return;
                }
                // Only allow links with specific schemes
                if (matchesScheme(link, Schemas.http) || matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.mailto)) {
                    this.openerService.open(link);
                }
                else if (matchesScheme(link, Schemas.command) && extension.type === 0 /* ExtensionType.System */) {
                    this.openerService.open(link, {
                        allowCommands: [
                            ShowCurrentReleaseNotesActionId
                        ]
                    });
                }
            }));
            return webview;
        }
        catch (e) {
            const p = append(container, $('p.nocontent'));
            p.textContent = noContentCopy;
            return p;
        }
    }
    async renderMarkdown(extension, cacheResult, container, token) {
        const contents = await this.loadContents(() => cacheResult, container);
        if (token?.isCancellationRequested) {
            return '';
        }
        const allowedLinkProtocols = [Schemas.http, Schemas.https, Schemas.mailto];
        const content = await renderMarkdownDocument(contents, this.extensionService, this.languageService, {
            sanitizerConfig: {
                allowedLinkProtocols: {
                    override: extension.type === 0 /* ExtensionType.System */
                        ? [...allowedLinkProtocols, Schemas.command]
                        : allowedLinkProtocols
                }
            }
        }, token);
        if (token?.isCancellationRequested) {
            return '';
        }
        return this.renderBody(content);
    }
    renderBody(body) {
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; script-src 'none'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}

					/* prevent scroll-to-top button from blocking the body text */
					body {
						padding-bottom: 75px;
					}

					#scroll-to-top {
						position: fixed;
						width: 32px;
						height: 32px;
						right: 25px;
						bottom: 25px;
						background-color: var(--vscode-button-secondaryBackground);
						border-color: var(--vscode-button-border);
						border-radius: 50%;
						cursor: pointer;
						box-shadow: 1px 1px 1px rgba(0,0,0,.25);
						outline: none;
						display: flex;
						justify-content: center;
						align-items: center;
					}

					#scroll-to-top:hover {
						background-color: var(--vscode-button-secondaryHoverBackground);
						box-shadow: 2px 2px 2px rgba(0,0,0,.25);
					}

					body.vscode-high-contrast #scroll-to-top {
						border-width: 2px;
						border-style: solid;
						box-shadow: none;
					}

					#scroll-to-top span.icon::before {
						content: "";
						display: block;
						background: var(--vscode-button-secondaryForeground);
						/* Chevron up icon */
						webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						-webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						width: 16px;
						height: 16px;
					}
					${css}
				</style>
			</head>
			<body>
				<a id="scroll-to-top" role="button" aria-label="scroll to top" href="#"><span class="icon"></span></a>
				${body}
			</body>
		</html>`;
    }
    async openDetails(extension, contentContainer, token) {
        let activeElement = null;
        const manifest = await this.extensionManifest.get().promise;
        if (manifest && manifest.extensionPack?.length && this.shallRenderAsExtensionPack(manifest)) {
            activeElement = await this.openExtensionPackReadme(extension, manifest, contentContainer, token);
        }
        else {
            activeElement = await this.openMarkdown(extension, this.extensionReadme.get(), localize('noReadme', "No README available."), contentContainer, 0 /* WebviewIndex.Readme */, localize('Readme title', "Readme"), token);
        }
        return activeElement;
    }
    shallRenderAsExtensionPack(manifest) {
        return !!(manifest.categories?.some(category => category.toLowerCase() === 'extension packs'));
    }
    async openExtensionPackReadme(extension, manifest, container, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        const extensionPackReadme = append(container, $('div', { class: 'extension-pack-readme' }));
        extensionPackReadme.style.margin = '0 auto';
        extensionPackReadme.style.maxWidth = '882px';
        const extensionPack = append(extensionPackReadme, $('div', { class: 'extension-pack' }));
        const packCount = manifest.extensionPack.length;
        const headerHeight = 37; // navbar height
        const contentMinHeight = 200; // minimum height for readme content
        const layout = () => {
            extensionPackReadme.classList.remove('one-row', 'two-rows', 'three-rows', 'more-rows');
            const availableHeight = container.clientHeight;
            const availableForPack = Math.max(availableHeight - headerHeight - contentMinHeight, 0);
            let rowClass = 'one-row';
            if (availableForPack >= 302 && packCount > 6) {
                rowClass = 'more-rows';
            }
            else if (availableForPack >= 282 && packCount > 4) {
                rowClass = 'three-rows';
            }
            else if (availableForPack >= 200 && packCount > 2) {
                rowClass = 'two-rows';
            }
            else {
                rowClass = 'one-row';
            }
            extensionPackReadme.classList.add(rowClass);
        };
        layout();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        const extensionPackHeader = append(extensionPack, $('div.header'));
        extensionPackHeader.textContent = localize('extension pack', "Extension Pack ({0})", manifest.extensionPack.length);
        const extensionPackContent = append(extensionPack, $('div', { class: 'extension-pack-content' }));
        extensionPackContent.setAttribute('tabindex', '0');
        const readmeContent = append(extensionPackReadme, $('div.readme-content'));
        await Promise.all([
            this.renderExtensionPack(manifest, extensionPackContent, token),
            this.openMarkdown(extension, this.extensionReadme.get(), localize('noReadme', "No README available."), readmeContent, 0 /* WebviewIndex.Readme */, localize('Readme title', "Readme"), token),
        ]);
        return { focus: () => extensionPackContent.focus() };
    }
    renderAdditionalDetails(container, extension) {
        const content = $('div', { class: 'additional-details-content', tabindex: '0' });
        const scrollableContent = new DomScrollableElement(content, {});
        const layout = () => scrollableContent.scanDomNode();
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(this.instantiationService.createInstance(AdditionalDetailsWidget, content, extension));
        append(container, scrollableContent.getDomNode());
        scrollableContent.scanDomNode();
    }
    async openChangelog(extension, contentContainer, token) {
        const activeElement = await this.openMarkdown(extension, this.extensionChangelog.get(), localize('noChangelog', "No Changelog available."), contentContainer, 1 /* WebviewIndex.Changelog */, localize('Changelog title', "Changelog"), token);
        return activeElement;
    }
    async openFeatures(extension, contentContainer, token) {
        const manifest = await this.loadContents(() => this.extensionManifest.get(), contentContainer);
        if (token.isCancellationRequested) {
            return null;
        }
        if (!manifest) {
            return null;
        }
        const extensionFeaturesTab = this.contentDisposables.add(this.instantiationService.createInstance(ExtensionFeaturesTab, manifest, this.options?.feature));
        const featureLayout = () => extensionFeaturesTab.layout(contentContainer.clientHeight, contentContainer.clientWidth);
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout: featureLayout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        append(contentContainer, extensionFeaturesTab.domNode);
        featureLayout();
        return extensionFeaturesTab.domNode;
    }
    openExtensionDependencies(extension, contentContainer, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        if (arrays.isFalsyOrEmpty(extension.dependencies)) {
            append(contentContainer, $('p.nocontent')).textContent = localize('noDependencies', "No Dependencies");
            return Promise.resolve(contentContainer);
        }
        const content = $('div', { class: 'subcontent' });
        const scrollableContent = new DomScrollableElement(content, {});
        append(contentContainer, scrollableContent.getDomNode());
        this.contentDisposables.add(scrollableContent);
        const dependenciesTree = this.instantiationService.createInstance(ExtensionsTree, new ExtensionData(extension, null, extension => extension.dependencies || [], this.extensionsWorkbenchService), content, {
            listBackground: editorBackground
        });
        const depLayout = () => {
            scrollableContent.scanDomNode();
            const scrollDimensions = scrollableContent.getScrollDimensions();
            dependenciesTree.layout(scrollDimensions.height);
        };
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout: depLayout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(dependenciesTree);
        scrollableContent.scanDomNode();
        return Promise.resolve({ focus() { dependenciesTree.domFocus(); } });
    }
    async openExtensionPack(extension, contentContainer, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        const manifest = await this.loadContents(() => this.extensionManifest.get(), contentContainer);
        if (token.isCancellationRequested) {
            return null;
        }
        if (!manifest) {
            return null;
        }
        return this.renderExtensionPack(manifest, contentContainer, token);
    }
    async renderExtensionPack(manifest, parent, token) {
        if (token.isCancellationRequested) {
            return null;
        }
        const content = $('div', { class: 'subcontent' });
        const scrollableContent = new DomScrollableElement(content, { useShadows: false });
        append(parent, scrollableContent.getDomNode());
        const extensionsGridView = this.instantiationService.createInstance(ExtensionsGridView, content, new Delegate());
        const extensions = await getExtensions(manifest.extensionPack, this.extensionsWorkbenchService);
        extensionsGridView.setExtensions(extensions);
        scrollableContent.scanDomNode();
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(extensionsGridView);
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout: () => scrollableContent.scanDomNode() })));
        return content;
    }
    loadContents(loadingTask, container) {
        container.classList.add('loading');
        const result = this.contentDisposables.add(loadingTask());
        const onDone = () => container.classList.remove('loading');
        result.promise.then(onDone, onDone);
        return result.promise;
    }
    layout(dimension) {
        this.dimension = dimension;
        this.layoutParticipants.forEach(p => p.layout());
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        this.notificationService.error(err);
    }
};
ExtensionEditor = ExtensionEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IExtensionsWorkbenchService),
    __param(4, IExtensionGalleryService),
    __param(5, IThemeService),
    __param(6, INotificationService),
    __param(7, IOpenerService),
    __param(8, IExtensionRecommendationsService),
    __param(9, IStorageService),
    __param(10, IExtensionService),
    __param(11, IWebviewService),
    __param(12, ILanguageService),
    __param(13, IContextMenuService),
    __param(14, IContextKeyService),
    __param(15, IHoverService)
], ExtensionEditor);
export { ExtensionEditor };
let AdditionalDetailsWidget = class AdditionalDetailsWidget extends Disposable {
    constructor(container, extension, hoverService, openerService, userDataProfilesService, remoteAgentService, fileService, uriIdentityService, extensionsWorkbenchService, extensionGalleryManifestService) {
        super();
        this.container = container;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.userDataProfilesService = userDataProfilesService;
        this.remoteAgentService = remoteAgentService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.disposables = this._register(new DisposableStore());
        this.render(extension);
        this._register(this.extensionsWorkbenchService.onChange(e => {
            if (e && areSameExtensions(e.identifier, extension.identifier) && e.server === extension.server) {
                this.render(e);
            }
        }));
    }
    render(extension) {
        this.container.innerText = '';
        this.disposables.clear();
        if (extension.local) {
            this.renderInstallInfo(this.container, extension.local);
        }
        if (extension.gallery) {
            this.renderMarketplaceInfo(this.container, extension);
        }
        this.renderCategories(this.container, extension);
        this.renderExtensionResources(this.container, extension);
    }
    renderCategories(container, extension) {
        if (extension.categories.length) {
            const categoriesContainer = append(container, $('.categories-container.additional-details-element'));
            append(categoriesContainer, $('.additional-details-title', undefined, localize('categories', "Categories")));
            const categoriesElement = append(categoriesContainer, $('.categories'));
            this.extensionGalleryManifestService.getExtensionGalleryManifest()
                .then(manifest => {
                const hasCategoryFilter = manifest?.capabilities.extensionQuery.filtering?.some(({ name }) => name === "Category" /* FilterType.Category */);
                for (const category of extension.categories) {
                    const categoryElement = append(categoriesElement, $('span.category', { tabindex: '0' }, category));
                    if (hasCategoryFilter) {
                        categoryElement.classList.add('clickable');
                        this.disposables.add(onClick(categoryElement, () => this.extensionsWorkbenchService.openSearch(`@category:"${category}"`)));
                    }
                }
            });
        }
    }
    renderExtensionResources(container, extension) {
        const resources = [];
        if (extension.repository) {
            try {
                resources.push([localize('repository', "Repository"), ThemeIcon.fromId(Codicon.repo.id), URI.parse(extension.repository)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.supportUrl) {
            try {
                resources.push([localize('issues', "Issues"), ThemeIcon.fromId(Codicon.issues.id), URI.parse(extension.supportUrl)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.licenseUrl) {
            try {
                resources.push([localize('license', "License"), ThemeIcon.fromId(Codicon.linkExternal.id), URI.parse(extension.licenseUrl)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.publisherUrl) {
            resources.push([extension.publisherDisplayName, ThemeIcon.fromId(Codicon.linkExternal.id), extension.publisherUrl]);
        }
        if (extension.url) {
            resources.push([localize('Marketplace', "Marketplace"), ThemeIcon.fromId(Codicon.linkExternal.id), URI.parse(extension.url)]);
        }
        if (resources.length || extension.publisherSponsorLink) {
            const extensionResourcesContainer = append(container, $('.resources-container.additional-details-element'));
            append(extensionResourcesContainer, $('.additional-details-title', undefined, localize('resources', "Resources")));
            const resourcesElement = append(extensionResourcesContainer, $('.resources'));
            for (const [label, icon, uri] of resources) {
                const resourceElement = append(resourcesElement, $('.resource'));
                append(resourceElement, $(ThemeIcon.asCSSSelector(icon)));
                append(resourceElement, $('a', { tabindex: '0' }, label));
                this.disposables.add(onClick(resourceElement, () => this.openerService.open(uri)));
                this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), resourceElement, uri.toString()));
            }
        }
    }
    renderInstallInfo(container, extension) {
        const installInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(installInfoContainer, $('.additional-details-title', undefined, localize('Install Info', "Installation")));
        const installInfo = append(installInfoContainer, $('.more-info'));
        append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', "Identifier")), $('code', undefined, extension.identifier.id)));
        if (extension.type !== 0 /* ExtensionType.System */) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', "Version")), $('code', undefined, extension.manifest.version)));
        }
        if (extension.installedTimestamp) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last updated', "Last Updated")), $('div', {
                'title': new Date(extension.installedTimestamp).toString()
            }, fromNow(extension.installedTimestamp, true, true, true))));
        }
        if (!extension.isBuiltin && extension.source !== 'gallery') {
            const element = $('div', undefined, extension.source === 'vsix' ? localize('vsix', "VSIX") : localize('other', "Local"));
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('source', "Source")), element));
            if (isNative && extension.source === 'resource' && extension.location.scheme === Schemas.file) {
                element.classList.add('link');
                element.title = extension.location.fsPath;
                this.disposables.add(onClick(element, () => this.openerService.open(extension.location, { openExternal: true })));
            }
        }
        if (extension.size) {
            const element = $('div', undefined, ByteSize.formatSize(extension.size));
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', { title: localize('size when installed', "Size when installed") }, localize('size', "Size")), element));
            if (isNative && extension.location.scheme === Schemas.file) {
                element.classList.add('link');
                element.title = extension.location.fsPath;
                this.disposables.add(onClick(element, () => this.openerService.open(extension.location, { openExternal: true })));
            }
        }
        this.getCacheLocation(extension).then(cacheLocation => {
            if (!cacheLocation) {
                return;
            }
            computeSize(cacheLocation, this.fileService).then(cacheSize => {
                if (!cacheSize) {
                    return;
                }
                const element = $('div', undefined, ByteSize.formatSize(cacheSize));
                append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', { title: localize('disk space used', "Cache size") }, localize('cache size', "Cache")), element));
                if (isNative && extension.location.scheme === Schemas.file) {
                    element.classList.add('link');
                    element.title = cacheLocation.fsPath;
                    this.disposables.add(onClick(element, () => this.openerService.open(cacheLocation.with({ scheme: Schemas.file }), { openExternal: true })));
                }
            });
        });
    }
    async getCacheLocation(extension) {
        let extensionCacheLocation = this.uriIdentityService.extUri.joinPath(this.userDataProfilesService.defaultProfile.globalStorageHome, extension.identifier.id.toLowerCase());
        if (extension.location.scheme === Schemas.vscodeRemote) {
            const environment = await this.remoteAgentService.getEnvironment();
            if (!environment) {
                return undefined;
            }
            extensionCacheLocation = this.uriIdentityService.extUri.joinPath(environment.globalStorageHome, extension.identifier.id.toLowerCase());
        }
        return extensionCacheLocation;
    }
    renderMarketplaceInfo(container, extension) {
        const gallery = extension.gallery;
        const moreInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(moreInfoContainer, $('.additional-details-title', undefined, localize('Marketplace Info', "Marketplace")));
        const moreInfo = append(moreInfoContainer, $('.more-info'));
        if (gallery) {
            if (!extension.local) {
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', "Identifier")), $('code', undefined, extension.identifier.id)));
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', "Version")), $('code', undefined, gallery.version)));
            }
            append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('published', "Published")), $('div', {
                'title': new Date(gallery.releaseDate).toString()
            }, fromNow(gallery.releaseDate, true, true, true))), $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last released', "Last Released")), $('div', {
                'title': new Date(gallery.lastUpdated).toString()
            }, fromNow(gallery.lastUpdated, true, true, true))));
        }
    }
};
AdditionalDetailsWidget = __decorate([
    __param(2, IHoverService),
    __param(3, IOpenerService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteAgentService),
    __param(6, IFileService),
    __param(7, IUriIdentityService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionGalleryManifestService)
], AdditionalDetailsWidget);
const contextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', ExtensionEditor.ID), EditorContextKeys.focus.toNegated());
registerAction2(class ShowExtensionEditorFindAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.showfind',
            title: localize('find', "Find"),
            keybinding: {
                when: contextKeyExpr,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
            }
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.showFind();
    }
});
registerAction2(class StartExtensionEditorFindNextAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.findNext',
            title: localize('find next', "Find Next"),
            keybinding: {
                when: ContextKeyExpr.and(contextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.runFindAction(false);
    }
});
registerAction2(class StartExtensionEditorFindPreviousAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.findPrevious',
            title: localize('find previous', "Find Previous"),
            keybinding: {
                when: ContextKeyExpr.and(contextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.runFindAction(true);
    }
});
registerThemingParticipant((theme, collector) => {
    const link = theme.getColor(textLinkForeground);
    if (link) {
        collector.addRule(`.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource { color: ${link}; }`);
        collector.addRule(`.monaco-workbench .extension-editor .content .feature-contributions a { color: ${link}; }`);
    }
    const activeLink = theme.getColor(textLinkActiveForeground);
    if (activeLink) {
        collector.addRule(`.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource:hover,
			.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource:active { color: ${activeLink}; }`);
        collector.addRule(`.monaco-workbench .extension-editor .content .feature-contributions a:hover,
			.monaco-workbench .extension-editor .content .feature-contributions a:active { color: ${activeLink}; }`);
    }
    const buttonHoverBackgroundColor = theme.getColor(buttonHoverBackground);
    if (buttonHoverBackgroundColor) {
        collector.addRule(`.monaco-workbench .extension-editor .content > .details > .additional-details-container .categories-container > .categories > .category.clickable:hover { background-color: ${buttonHoverBackgroundColor}; border-color: ${buttonHoverBackgroundColor}; }`);
    }
    const buttonForegroundColor = theme.getColor(buttonForeground);
    if (buttonForegroundColor) {
        collector.addRule(`.monaco-workbench .extension-editor .content > .details > .additional-details-container .categories-container > .categories > .category.clickable:hover { color: ${buttonForegroundColor}; }`);
    }
});
function getExtensionEditor(accessor) {
    const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
    if (activeEditorPane instanceof ExtensionEditor) {
        return activeEditorPane;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25FZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQWEsTUFBTSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQWUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3SCxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9B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RCxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUM7Z0JBQ0osU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1SCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFBLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUM7Z0JBQ0osU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0SCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFBLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUM7Z0JBQ0osU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5SCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFBLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxZ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
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
var GettingStartedPage_1;
import { $, addDisposableListener, append, clearNode, reset } from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { coalesce, equals } from '../../../../base/common/arrays.js';
import { Delayer, Throttler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { OS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/gettingStarted.css';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { firstSessionDateStorageKey, ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultButtonStyles, defaultKeybindingLabelStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspacesService, isRecentFolder, isRecentWorkspace } from '../../../../platform/workspaces/common/workspaces.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { OpenFileFolderAction, OpenFolderAction, OpenFolderViaWorkspaceAction } from '../../../browser/actions/workspaceActions.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import './gettingStartedColors.js';
import { GettingStartedDetailsRenderer } from './gettingStartedDetailsRenderer.js';
import { gettingStartedCheckedCodicon, gettingStartedUncheckedCodicon } from './gettingStartedIcons.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { IWalkthroughsService, hiddenEntriesConfigurationKey, parseDescription } from './gettingStartedService.js';
import { restoreWalkthroughsConfigurationKey } from './startupPage.js';
import { startEntries } from '../common/gettingStartedContent.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { GettingStartedIndexList } from './gettingStartedList.js';
import { AccessibleViewAction } from '../../accessibility/browser/accessibleViewActions.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
const SLIDE_TRANSITION_TIME_MS = 250;
const configurationKey = 'workbench.startupEditor';
export const allWalkthroughsHiddenContext = new RawContextKey('allWalkthroughsHidden', false);
export const inWelcomeContext = new RawContextKey('inWelcome', false);
const parsedStartEntries = startEntries.map((e, i) => ({
    command: e.content.command,
    description: e.description,
    icon: { type: 'icon', icon: e.icon },
    id: e.id,
    order: i,
    title: e.title,
    when: ContextKeyExpr.deserialize(e.when) ?? ContextKeyExpr.true()
}));
const REDUCED_MOTION_KEY = 'workbench.welcomePage.preferReducedMotion';
let GettingStartedPage = class GettingStartedPage extends EditorPane {
    static { GettingStartedPage_1 = this; }
    static { this.ID = 'gettingStartedPage'; }
    get editorInput() {
        return this._input;
    }
    constructor(group, commandService, productService, keybindingService, gettingStartedService, configurationService, telemetryService, languageService, fileService, openerService, themeService, storageService, extensionService, instantiationService, notificationService, groupsService, contextService, quickInputService, workspacesService, labelService, hostService, webviewService, workspaceContextService, accessibilityService, markdownRendererService) {
        super(GettingStartedPage_1.ID, group, telemetryService, themeService, storageService);
        this.commandService = commandService;
        this.productService = productService;
        this.keybindingService = keybindingService;
        this.gettingStartedService = gettingStartedService;
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.groupsService = groupsService;
        this.quickInputService = quickInputService;
        this.workspacesService = workspacesService;
        this.labelService = labelService;
        this.hostService = hostService;
        this.webviewService = webviewService;
        this.workspaceContextService = workspaceContextService;
        this.accessibilityService = accessibilityService;
        this.markdownRendererService = markdownRendererService;
        this.inProgressScroll = Promise.resolve();
        this.dispatchListeners = new DisposableStore();
        this.stepDisposables = new DisposableStore();
        this.detailsPageDisposables = new DisposableStore();
        this.mediaDisposables = new DisposableStore();
        this.buildSlideThrottle = new Throttler();
        this.showFeaturedWalkthrough = true;
        this.currentMediaComponent = undefined;
        this.currentMediaType = undefined;
        this.container = $('.gettingStartedContainer', {
            role: 'document',
            tabindex: 0,
            'aria-label': localize('welcomeAriaLabel', "Overview of how to get up to speed with your editor.")
        });
        this.stepMediaComponent = $('.getting-started-media');
        this.stepMediaComponent.id = generateUuid();
        this.categoriesSlideDisposables = this._register(new DisposableStore());
        this.detailsRenderer = new GettingStartedDetailsRenderer(this.fileService, this.notificationService, this.extensionService, this.languageService);
        this.contextService = this._register(contextService.createScoped(this.container));
        inWelcomeContext.bindTo(this.contextService).set(true);
        this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        this._register(this.dispatchListeners);
        this.buildSlideThrottle = new Throttler();
        const rerender = () => {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
            if (this.currentWalkthrough) {
                const existingSteps = this.currentWalkthrough.steps.map(step => step.id);
                const newCategory = this.gettingStartedCategories.find(category => this.currentWalkthrough?.id === category.id);
                if (newCategory) {
                    const newSteps = newCategory.steps.map(step => step.id);
                    if (!equals(newSteps, existingSteps)) {
                        this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
                    }
                }
            }
            else {
                this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
            }
        };
        this._register(this.gettingStartedService.onDidAddWalkthrough(rerender));
        this._register(this.gettingStartedService.onDidRemoveWalkthrough(rerender));
        this.recentlyOpened = this.workspacesService.getRecentlyOpened();
        this._register(workspacesService.onDidChangeRecentlyOpened(() => {
            this.recentlyOpened = workspacesService.getRecentlyOpened();
            this.refreshRecentlyOpened();
        }));
        this._register(this.gettingStartedService.onDidChangeWalkthrough(category => {
            const ourCategory = this.gettingStartedCategories.find(c => c.id === category.id);
            if (!ourCategory) {
                return;
            }
            ourCategory.title = category.title;
            ourCategory.description = category.description;
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelectorAll(`[x-category-title-for="${category.id}"]`).forEach(step => step.innerText = ourCategory.title);
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelectorAll(`[x-category-description-for="${category.id}"]`).forEach(step => step.innerText = ourCategory.description);
        }));
        this._register(this.gettingStartedService.onDidProgressStep(step => {
            const category = this.gettingStartedCategories.find(c => c.id === step.category);
            if (!category) {
                throw Error('Could not find category with ID: ' + step.category);
            }
            const ourStep = category.steps.find(_step => _step.id === step.id);
            if (!ourStep) {
                throw Error('Could not find step with ID: ' + step.id);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            if (!ourStep.done && stats.stepsComplete === stats.stepsTotal - 1) {
                this.hideCategory(category.id);
            }
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(REDUCED_MOTION_KEY)) {
                    this.container.classList.toggle('animatable', this.shouldAnimate());
                }
            }));
            ourStep.done = step.done;
            if (category.id === this.currentWalkthrough?.id) {
                // eslint-disable-next-line no-restricted-syntax
                const badgeelements = assertReturnsDefined(this.window.document.querySelectorAll(`[data-done-step-id="${step.id}"]`));
                badgeelements.forEach(badgeelement => {
                    if (step.done) {
                        badgeelement.setAttribute('aria-checked', 'true');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'true');
                        badgeelement.classList.remove(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.classList.add('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepDone', "Checkbox for Step {0}: Completed", step.title));
                    }
                    else {
                        badgeelement.setAttribute('aria-checked', 'false');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'false');
                        badgeelement.classList.remove('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.classList.add(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepNotDone', "Checkbox for Step {0}: Not completed", step.title));
                    }
                });
            }
            this.updateCategoryProgress();
        }));
        this._register(this.storageService.onWillSaveState((e) => {
            if (e.reason !== WillSaveStateReason.SHUTDOWN) {
                return;
            }
            if (this.workspaceContextService.getWorkspace().folders.length !== 0) {
                return;
            }
            if (!this.editorInput || !this.currentWalkthrough || !this.editorInput.selectedCategory || !this.editorInput.selectedStep) {
                return;
            }
            const editorPane = this.groupsService.activeGroup.activeEditorPane;
            if (!(editorPane instanceof GettingStartedPage_1)) {
                return;
            }
            // Save the state of the walkthrough so we can restore it on reload
            const restoreData = { folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id, category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
            this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }));
    }
    // remove when 'workbench.welcomePage.preferReducedMotion' deprecated
    shouldAnimate() {
        if (this.configurationService.getValue(REDUCED_MOTION_KEY)) {
            return false;
        }
        if (this.accessibilityService.isMotionReduced()) {
            return false;
        }
        return true;
    }
    getWalkthroughCompletionStats(walkthrough) {
        const activeSteps = walkthrough.steps.filter(s => this.contextService.contextMatchesRules(s.when));
        return {
            stepsComplete: activeSteps.filter(s => s.done).length,
            stepsTotal: activeSteps.length,
        };
    }
    async setInput(newInput, options, context, token) {
        await super.setInput(newInput, options, context, token);
        const selectedCategory = options?.selectedCategory ?? newInput.selectedCategory;
        const selectedStep = options?.selectedStep ?? newInput.selectedStep;
        await this.applyInput({ ...options, selectedCategory, selectedStep });
    }
    async setOptions(options) {
        super.setOptions(options);
        if (!this.editorInput) {
            return;
        }
        if (this.editorInput.selectedCategory !== options?.selectedCategory ||
            this.editorInput.selectedStep !== options?.selectedStep) {
            await this.applyInput(options);
        }
    }
    async applyInput(options) {
        if (!this.editorInput) {
            return;
        }
        this.editorInput.showTelemetryNotice = options?.showTelemetryNotice ?? true;
        this.editorInput.selectedCategory = options?.selectedCategory;
        this.editorInput.selectedStep = options?.selectedStep;
        this.container.classList.remove('animatable');
        await this.buildCategoriesSlide();
        if (this.shouldAnimate()) {
            setTimeout(() => this.container.classList.add('animatable'), 0);
        }
    }
    async makeCategoryVisibleWhenAvailable(categoryID, stepId) {
        this.scrollToCategory(categoryID, stepId);
    }
    registerDispatchListeners() {
        this.dispatchListeners.clear();
        // eslint-disable-next-line no-restricted-syntax
        this.container.querySelectorAll('[x-dispatch]').forEach(element => {
            const dispatch = element.getAttribute('x-dispatch') ?? '';
            let command, argument;
            if (dispatch.startsWith('openLink:https')) {
                [command, argument] = ['openLink', dispatch.replace('openLink:', '')];
            }
            else {
                [command, argument] = dispatch.split(':');
            }
            if (command) {
                this.dispatchListeners.add(addDisposableListener(element, 'click', (e) => {
                    e.stopPropagation();
                    this.runDispatchCommand(command, argument);
                }));
                this.dispatchListeners.add(addDisposableListener(element, 'keyup', (e) => {
                    const keyboardEvent = new StandardKeyboardEvent(e);
                    e.stopPropagation();
                    switch (keyboardEvent.keyCode) {
                        case 3 /* KeyCode.Enter */:
                        case 10 /* KeyCode.Space */:
                            this.runDispatchCommand(command, argument);
                            return;
                    }
                }));
            }
        });
    }
    async runDispatchCommand(command, argument) {
        this.commandService.executeCommand('workbench.action.keepEditor');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command, argument, walkthroughId: this.currentWalkthrough?.id });
        switch (command) {
            case 'scrollPrev': {
                this.scrollPrev();
                break;
            }
            case 'skip': {
                this.runSkip();
                break;
            }
            case 'showMoreRecents': {
                this.commandService.executeCommand(OpenRecentAction.ID);
                break;
            }
            case 'seeAllWalkthroughs': {
                await this.openWalkthroughSelector();
                break;
            }
            case 'openFolder': {
                if (this.contextService.contextMatchesRules(ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace')))) {
                    this.commandService.executeCommand(OpenFolderViaWorkspaceAction.ID);
                }
                else {
                    this.commandService.executeCommand('workbench.action.files.openFolder');
                }
                break;
            }
            case 'selectCategory': {
                this.scrollToCategory(argument);
                this.gettingStartedService.markWalkthroughOpened(argument);
                break;
            }
            case 'selectStartEntry': {
                const selected = startEntries.find(e => e.id === argument);
                if (selected) {
                    this.runStepCommand(selected.content.command);
                }
                else {
                    throw Error('could not find start entry with id: ' + argument);
                }
                break;
            }
            case 'hideCategory': {
                this.hideCategory(argument);
                break;
            }
            // Use selectTask over selectStep to keep telemetry consistant:https://github.com/microsoft/vscode/issues/122256
            case 'selectTask': {
                this.selectStep(argument);
                break;
            }
            case 'toggleStepCompletion': {
                this.toggleStepCompletion(argument);
                break;
            }
            case 'allDone': {
                this.markAllStepsComplete();
                break;
            }
            case 'nextSection': {
                const next = this.currentWalkthrough?.next;
                if (next) {
                    this.prevWalkthrough = this.currentWalkthrough;
                    this.scrollToCategory(next);
                }
                else {
                    console.error('Error scrolling to next section of', this.currentWalkthrough);
                }
                break;
            }
            case 'openLink': {
                this.openerService.open(argument);
                break;
            }
            default: {
                console.error('Dispatch to', command, argument, 'not defined');
                break;
            }
        }
    }
    hideCategory(categoryId) {
        const selectedCategory = this.gettingStartedCategories.find(category => category.id === categoryId);
        if (!selectedCategory) {
            throw Error('Could not find category with ID ' + categoryId);
        }
        this.setHiddenCategories([...this.getHiddenCategories().add(categoryId)]);
        this.gettingStartedList?.rerender();
    }
    markAllStepsComplete() {
        if (this.currentWalkthrough) {
            this.currentWalkthrough?.steps.forEach(step => {
                if (!step.done) {
                    this.gettingStartedService.progressStep(step.id);
                }
            });
            this.hideCategory(this.currentWalkthrough?.id);
            this.scrollPrev();
        }
        else {
            throw Error('No walkthrough opened');
        }
    }
    toggleStepCompletion(argument) {
        const stepToggle = assertReturnsDefined(this.currentWalkthrough?.steps.find(step => step.id === argument));
        if (stepToggle.done) {
            this.gettingStartedService.deprogressStep(argument);
        }
        else {
            this.gettingStartedService.progressStep(argument);
        }
    }
    async openWalkthroughSelector() {
        const selection = await this.quickInputService.pick(this.gettingStartedCategories
            .filter(c => this.contextService.contextMatchesRules(c.when))
            .map(x => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        })), { canPickMany: false, matchOnDescription: true, matchOnDetail: true, title: localize('pickWalkthroughs', "Open Walkthrough...") });
        if (selection) {
            this.runDispatchCommand('selectCategory', selection.id);
        }
    }
    getHiddenCategories() {
        return new Set(JSON.parse(this.storageService.get(hiddenEntriesConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
    }
    setHiddenCategories(hidden) {
        this.storageService.store(hiddenEntriesConfigurationKey, JSON.stringify(hidden), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async buildMediaComponent(stepId, forceRebuild = false) {
        if (!this.currentWalkthrough) {
            throw Error('no walkthrough selected');
        }
        const stepToExpand = assertReturnsDefined(this.currentWalkthrough.steps.find(step => step.id === stepId));
        if (!forceRebuild && this.currentMediaComponent === stepId) {
            return;
        }
        this.currentMediaComponent = stepId;
        this.stepDisposables.clear();
        this.stepDisposables.add({
            dispose: () => {
                this.currentMediaComponent = undefined;
            }
        });
        if (this.currentMediaType !== stepToExpand.media.type) {
            this.mediaDisposables.clear();
            this.currentMediaType = stepToExpand.media.type;
            this.mediaDisposables.add(toDisposable(() => {
                this.currentMediaType = undefined;
            }));
            clearNode(this.stepMediaComponent);
            if (stepToExpand.media.type === 'svg') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ title: undefined, options: { disableServiceWorker: true }, contentOptions: {}, extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'markdown') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ options: {}, contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true }, title: '', extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'video') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ options: {}, contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true }, title: '', extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
        }
        if (stepToExpand.media.type === 'image') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const mediaElement = $('img');
            clearNode(this.stepMediaComponent);
            this.stepMediaComponent.appendChild(mediaElement);
            mediaElement.setAttribute('alt', media.altText);
            this.updateMediaSourceForColorMode(mediaElement, media.path);
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => node.href)).flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(() => this.updateMediaSourceForColorMode(mediaElement, media.path)));
        }
        else if (stepToExpand.media.type === 'svg') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            this.webview.setHtml(await this.detailsRenderer.renderSVG(media.path));
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const body = await this.detailsRenderer.renderSVG(media.path);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => node.href)).flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.webview.onDidClickLink(link => {
                if (matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.http) || (matchesScheme(link, Schemas.command))) {
                    this.openerService.open(link, { allowCommands: true });
                }
            }));
        }
        else if (stepToExpand.media.type === 'markdown') {
            this.stepsContent.classList.remove('image');
            this.stepsContent.classList.add('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const rawHTML = await this.detailsRenderer.renderMarkdown(media.path, media.base);
            this.webview.setHtml(rawHTML);
            const serializedContextKeyExprs = rawHTML.match(/checked-on=\"([^'][^"]*)\"/g)?.map(attr => attr.slice('checked-on="'.length, -1)
                .replace(/&#39;/g, '\'')
                .replace(/&amp;/g, '&'));
            const postTrueKeysMessage = () => {
                const enabledContextKeys = serializedContextKeyExprs?.filter(expr => this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(expr)));
                if (enabledContextKeys) {
                    this.webview.postMessage({
                        enabledContextKeys
                    });
                }
            };
            if (serializedContextKeyExprs) {
                const contextKeyExprs = coalesce(serializedContextKeyExprs.map(expr => ContextKeyExpr.deserialize(expr)));
                const watchingKeys = new Set(contextKeyExprs.flatMap(expr => expr.keys()));
                this.stepDisposables.add(this.contextService.onDidChangeContext(e => {
                    if (e.affectsSome(watchingKeys)) {
                        postTrueKeysMessage();
                    }
                }));
            }
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.webview.onDidClickLink(link => {
                if (matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.http) || (matchesScheme(link, Schemas.command))) {
                    const toSide = link.startsWith('command:toSide:');
                    if (toSide) {
                        link = link.replace('command:toSide:', 'command:');
                        this.focusSideEditorGroup();
                    }
                    this.openerService.open(link, { allowCommands: true, openToSide: toSide });
                }
            }));
            if (rawHTML.indexOf('<code>') >= 0) {
                // Render again when Theme changes since syntax highlighting of code blocks may have changed
                this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                    const body = await this.detailsRenderer.renderMarkdown(media.path, media.base);
                    if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                        this.webview.setHtml(body);
                        postTrueKeysMessage();
                    }
                }));
            }
            const layoutDelayer = new Delayer(50);
            this.layoutMarkdown = () => {
                layoutDelayer.trigger(() => {
                    this.webview.postMessage({ layoutMeNow: true });
                });
            };
            this.stepDisposables.add(layoutDelayer);
            this.stepDisposables.add({ dispose: () => this.layoutMarkdown = undefined });
            postTrueKeysMessage();
            this.stepDisposables.add(this.webview.onMessage(async (e) => {
                const message = e.message;
                if (message.startsWith('command:')) {
                    this.openerService.open(message, { allowCommands: true });
                }
                else if (message.startsWith('setTheme:')) {
                    const themeId = message.slice('setTheme:'.length);
                    const theme = (await this.themeService.getColorThemes()).find(theme => theme.settingsId === themeId);
                    if (theme) {
                        this.themeService.setColorTheme(theme.id, 2 /* ConfigurationTarget.USER */);
                    }
                }
                else {
                    console.error('Unexpected message', message);
                }
            }));
        }
        else if (stepToExpand.media.type === 'video') {
            this.stepsContent.classList.add('video');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('image');
            const media = stepToExpand.media;
            const themeType = this.themeService.getColorTheme().type;
            const videoPath = media.path[themeType];
            const videoPoster = media.poster ? media.poster[themeType] : undefined;
            const altText = media.altText ? media.altText : localize('videoAltText', "Video for {0}", stepToExpand.title);
            const rawHTML = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
            this.webview.setHtml(rawHTML);
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const themeType = this.themeService.getColorTheme().type;
                const videoPath = media.path[themeType];
                const videoPoster = media.poster ? media.poster[themeType] : undefined;
                const body = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
        }
    }
    async selectStepLoose(id) {
        if (!this.editorInput) {
            return;
        }
        // Allow passing in id with a category appended or with just the id of the step
        if (id.startsWith(`${this.editorInput.selectedCategory}#`)) {
            this.selectStep(id);
        }
        else {
            const toSelect = this.editorInput.selectedCategory + '#' + id;
            this.selectStep(toSelect);
        }
    }
    provideScreenReaderUpdate() {
        if (this.configurationService.getValue("accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */)) {
            const kbLabel = this.keybindingService.lookupKeybinding(AccessibleViewAction.id)?.getAriaLabel();
            return kbLabel ? localize('acessibleViewHint', "Inspect this in the accessible view ({0}).\n", kbLabel) : localize('acessibleViewHintNoKbOpen', "Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.\n");
        }
        return '';
    }
    async selectStep(id, delayFocus = true) {
        if (!this.editorInput) {
            return;
        }
        if (id) {
            // eslint-disable-next-line no-restricted-syntax
            let stepElement = this.container.querySelector(`[data-step-id="${id}"]`);
            if (!stepElement) {
                // Selected an element that is not in-context, just fallback to whatever.
                // eslint-disable-next-line no-restricted-syntax
                stepElement = this.container.querySelector(`[data-step-id]`);
                if (!stepElement) {
                    // No steps around... just ignore.
                    return;
                }
                id = assertReturnsDefined(stepElement.getAttribute('data-step-id'));
            }
            // eslint-disable-next-line no-restricted-syntax
            stepElement.parentElement?.querySelectorAll('.expanded').forEach(node => {
                if (node.getAttribute('data-step-id') !== id) {
                    node.classList.remove('expanded');
                    node.setAttribute('aria-expanded', 'false');
                    // eslint-disable-next-line no-restricted-syntax
                    const codiconElement = node.querySelector('.codicon');
                    if (codiconElement) {
                        codiconElement.removeAttribute('tabindex');
                    }
                }
            });
            setTimeout(() => stepElement.focus(), delayFocus && this.shouldAnimate() ? SLIDE_TRANSITION_TIME_MS : 0);
            this.editorInput.selectedStep = id;
            stepElement.classList.add('expanded');
            stepElement.setAttribute('aria-expanded', 'true');
            this.buildMediaComponent(id, true);
            // eslint-disable-next-line no-restricted-syntax
            const codiconElement = stepElement.querySelector('.codicon');
            if (codiconElement) {
                codiconElement.setAttribute('tabindex', '0');
            }
            this.gettingStartedService.progressByEvent('stepSelected:' + id);
            const step = this.currentWalkthrough?.steps?.find(step => step.id === id);
            if (step) {
                stepElement.setAttribute('aria-label', `${this.provideScreenReaderUpdate()} ${step.title}`);
            }
        }
        else {
            this.editorInput.selectedStep = undefined;
        }
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateMediaSourceForColorMode(element, sources) {
        const themeType = this.themeService.getColorTheme().type;
        const src = sources[themeType].toString(true).replace(/ /g, '%20');
        element.srcset = src.toLowerCase().endsWith('.svg') ? src : (src + ' 1.5x');
    }
    createEditor(parent) {
        if (this.detailsPageScrollbar) {
            this.detailsPageScrollbar.dispose();
        }
        if (this.categoriesPageScrollbar) {
            this.categoriesPageScrollbar.dispose();
        }
        this.categoriesSlide = $('.gettingStartedSlideCategories.gettingStartedSlide');
        const prevButton = $('button.prev-button.button-link', { 'x-dispatch': 'scrollPrev' }, $('span.scroll-button.codicon.codicon-chevron-left'), $('span.moreText', {}, localize('goBack', "Go Back")));
        this.stepsSlide = $('.gettingStartedSlideDetails.gettingStartedSlide', {}, prevButton);
        this.stepsContent = $('.gettingStartedDetailsContent', {});
        this.detailsPageScrollbar = this._register(new DomScrollableElement(this.stepsContent, { className: 'full-height-scrollable', vertical: 2 /* ScrollbarVisibility.Hidden */ }));
        this.categoriesPageScrollbar = this._register(new DomScrollableElement(this.categoriesSlide, { className: 'full-height-scrollable categoriesScrollbar', vertical: 2 /* ScrollbarVisibility.Hidden */ }));
        this.stepsSlide.appendChild(this.detailsPageScrollbar.getDomNode());
        const gettingStartedPage = $('.gettingStarted', {}, this.categoriesPageScrollbar.getDomNode(), this.stepsSlide);
        this.container.appendChild(gettingStartedPage);
        this.categoriesPageScrollbar.scanDomNode();
        this.detailsPageScrollbar.scanDomNode();
        parent.appendChild(this.container);
    }
    async buildCategoriesSlide() {
        this.categoriesSlideDisposables.clear();
        const showOnStartupCheckbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'getting-started-checkbox',
            isChecked: this.configurationService.getValue(configurationKey) === 'welcomePage',
            title: localize('checkboxTitle', "When checked, this page will be shown on startup."),
            ...defaultToggleStyles
        });
        showOnStartupCheckbox.domNode.id = 'showOnStartup';
        const showOnStartupLabel = $('label.caption', { for: 'showOnStartup' }, localize('welcomePage.showOnStartup', "Show welcome page on startup"));
        const onShowOnStartupChanged = () => {
            if (showOnStartupCheckbox.checked) {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'showOnStartupChecked', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.configurationService.updateValue(configurationKey, 'welcomePage');
            }
            else {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'showOnStartupUnchecked', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.configurationService.updateValue(configurationKey, 'none');
            }
        };
        this.categoriesSlideDisposables.add(showOnStartupCheckbox);
        this.categoriesSlideDisposables.add(showOnStartupCheckbox.onChange(() => {
            onShowOnStartupChanged();
        }));
        this.categoriesSlideDisposables.add(addDisposableListener(showOnStartupLabel, 'click', () => {
            showOnStartupCheckbox.checked = !showOnStartupCheckbox.checked;
            onShowOnStartupChanged();
        }));
        const header = $('.header', {}, $('h1.product-name.caption', {}, this.productService.nameLong), $('p.subtitle.description', {}, localize({ key: 'gettingStarted.editingEvolved', comment: ['Shown as subtitle on the Welcome page.'] }, "Editing evolved")));
        const leftColumn = $('.categories-column.categories-column-left', {});
        const rightColumn = $('.categories-column.categories-column-right', {});
        const startList = this.buildStartList();
        const recentList = this.buildRecentlyOpenedList();
        const gettingStartedList = this.buildGettingStartedWalkthroughsList();
        const footer = $('.footer', {}, $('p.showOnStartup', {}, showOnStartupCheckbox.domNode, showOnStartupLabel));
        const layoutLists = () => {
            if (gettingStartedList.itemCount) {
                this.container.classList.remove('noWalkthroughs');
                reset(rightColumn, gettingStartedList.getDomElement());
            }
            else {
                this.container.classList.add('noWalkthroughs');
                reset(rightColumn);
            }
            setTimeout(() => this.categoriesPageScrollbar?.scanDomNode(), 50);
            layoutRecentList();
        };
        const layoutRecentList = () => {
            if (this.container.classList.contains('noWalkthroughs')) {
                recentList.setLimit(10);
                reset(leftColumn, startList.getDomElement());
                reset(rightColumn, recentList.getDomElement());
            }
            else {
                recentList.setLimit(5);
                reset(leftColumn, startList.getDomElement(), recentList.getDomElement());
            }
        };
        gettingStartedList.onDidChange(layoutLists);
        layoutLists();
        reset(this.categoriesSlide, $('.gettingStartedCategoriesContainer', {}, header, leftColumn, rightColumn, footer));
        this.categoriesPageScrollbar?.scanDomNode();
        this.updateCategoryProgress();
        this.registerDispatchListeners();
        const editorInput = this.editorInput;
        if (editorInput?.selectedCategory) {
            this.currentWalkthrough = this.gettingStartedCategories.find(category => category.id === editorInput.selectedCategory);
            if (!this.currentWalkthrough) {
                this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
                this.currentWalkthrough = this.gettingStartedCategories.find(category => category.id === editorInput.selectedCategory);
                if (this.currentWalkthrough) {
                    this.buildCategorySlide(editorInput.selectedCategory, editorInput.selectedStep);
                    this.setSlide('details');
                    return;
                }
            }
            else {
                this.buildCategorySlide(editorInput.selectedCategory, editorInput.selectedStep);
                this.setSlide('details');
                return;
            }
        }
        if (this.editorInput?.showTelemetryNotice && this.productService.openToWelcomeMainPage) {
            const telemetryNotice = $('p.telemetry-notice');
            this.buildTelemetryFooter(telemetryNotice);
            footer.appendChild(telemetryNotice);
        }
        else if (!this.productService.openToWelcomeMainPage && this.showFeaturedWalkthrough && this.storageService.isNew(-1 /* StorageScope.APPLICATION */)) {
            const firstSessionDateString = this.storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */) || new Date().toUTCString();
            const daysSinceFirstSession = ((+new Date()) - (+new Date(firstSessionDateString))) / 1000 / 60 / 60 / 24;
            const fistContentBehaviour = daysSinceFirstSession < 1 ? 'openToFirstCategory' : 'index';
            if (fistContentBehaviour === 'openToFirstCategory') {
                const first = this.gettingStartedCategories.filter(c => !c.when || this.contextService.contextMatchesRules(c.when))[0];
                if (first && this.editorInput) {
                    this.currentWalkthrough = first;
                    this.editorInput.selectedCategory = this.currentWalkthrough?.id;
                    this.editorInput.walkthroughPageTitle = this.currentWalkthrough.walkthroughPageTitle;
                    this.buildCategorySlide(this.editorInput.selectedCategory, undefined);
                    this.setSlide('details', true /* firstLaunch */);
                    return;
                }
            }
        }
        this.setSlide('categories');
    }
    buildRecentlyOpenedList() {
        const renderRecent = (recent) => {
            let fullPath;
            let windowOpenable;
            let resourceUri;
            if (isRecentFolder(recent)) {
                windowOpenable = { folderUri: recent.folderUri };
                fullPath = recent.label || this.labelService.getWorkspaceLabel(recent.folderUri, { verbose: 2 /* Verbosity.LONG */ });
                resourceUri = recent.folderUri;
            }
            else {
                fullPath = recent.label || this.labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
                windowOpenable = { workspaceUri: recent.workspace.configPath };
                resourceUri = recent.workspace.configPath;
            }
            const { name, parentPath } = splitRecentLabel(fullPath);
            const li = $('li');
            const link = $('button.button-link');
            link.innerText = name;
            link.title = fullPath;
            link.setAttribute('aria-label', localize('welcomePage.openFolderWithPath', "Open folder {0} with path {1}", name, parentPath));
            link.addEventListener('click', e => {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'openRecent', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.hostService.openWindow([windowOpenable], {
                    forceNewWindow: e.ctrlKey || e.metaKey,
                    remoteAuthority: recent.remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
                });
                e.preventDefault();
                e.stopPropagation();
            });
            li.appendChild(link);
            const span = $('span');
            span.classList.add('path');
            span.classList.add('detail');
            span.innerText = parentPath;
            span.title = fullPath;
            li.appendChild(span);
            const deleteButton = $('a.codicon.codicon-close.hide-category-button.recently-opened-delete-button', {
                'tabindex': 0,
                'role': 'button',
                'title': localize('welcomePage.removeRecent', "Remove from Recently Opened"),
                'aria-label': localize('welcomePage.removeRecentAriaLabel', "Remove {0} from Recently Opened", name),
            });
            const handleDelete = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.workspacesService.removeRecentlyOpened([resourceUri]);
            };
            deleteButton.addEventListener('click', handleDelete);
            deleteButton.addEventListener('keydown', async (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.keyCode === 3 /* KeyCode.Enter */ || event.keyCode === 10 /* KeyCode.Space */) {
                    await handleDelete(e);
                }
            });
            li.appendChild(deleteButton);
            return li;
        };
        if (this.recentlyOpenedList) {
            this.recentlyOpenedList.dispose();
        }
        const recentlyOpenedList = this.recentlyOpenedList = new GettingStartedIndexList({
            title: localize('recent', "Recent"),
            klass: 'recently-opened',
            limit: 5,
            empty: $('.empty-recent', {}, localize('noRecents', "You have no recent folders,"), $('button.button-link', { 'x-dispatch': 'openFolder' }, localize('openFolder', "open a folder")), localize('toStart', "to start.")),
            more: $('.more', {}, $('button.button-link', {
                'x-dispatch': 'showMoreRecents',
                title: localize('show more recents', "Show All Recent Folders {0}", this.getKeybindingLabel(OpenRecentAction.ID))
            }, localize('showAll', "More..."))),
            renderElement: renderRecent,
            contextService: this.contextService
        });
        recentlyOpenedList.onDidChange(() => this.registerDispatchListeners());
        this.recentlyOpened.then(({ workspaces }) => {
            const workspacesWithID = this.filterRecentlyOpened(workspaces);
            const updateEntries = () => {
                recentlyOpenedList.setEntries(workspacesWithID);
            };
            updateEntries();
            recentlyOpenedList.register(this.labelService.onDidChangeFormatters(() => updateEntries()));
        }).catch(onUnexpectedError);
        return recentlyOpenedList;
    }
    filterRecentlyOpened(workspaces) {
        return workspaces
            .filter(recent => !this.workspaceContextService.isCurrentWorkspace(isRecentWorkspace(recent) ? recent.workspace : recent.folderUri))
            .map(recent => ({ ...recent, id: isRecentWorkspace(recent) ? recent.workspace.id : recent.folderUri.toString() }));
    }
    refreshRecentlyOpened() {
        if (!this.recentlyOpenedList) {
            return;
        }
        this.recentlyOpened.then(({ workspaces }) => {
            const workspacesWithID = this.filterRecentlyOpened(workspaces);
            this.recentlyOpenedList?.setEntries(workspacesWithID);
        }).catch(onUnexpectedError);
    }
    buildStartList() {
        const renderStartEntry = (entry) => $('li', {}, $('button.button-link', {
            'x-dispatch': 'selectStartEntry:' + entry.id,
            title: entry.description + ' ' + this.getKeybindingLabel(entry.command),
        }, this.iconWidgetFor(entry), $('span', {}, entry.title)));
        if (this.startList) {
            this.startList.dispose();
        }
        const startList = this.startList = new GettingStartedIndexList({
            title: localize('start', "Start"),
            klass: 'start-container',
            limit: 10,
            renderElement: renderStartEntry,
            rankElement: e => -e.order,
            contextService: this.contextService
        });
        startList.setEntries(parsedStartEntries);
        startList.onDidChange(() => this.registerDispatchListeners());
        return startList;
    }
    buildGettingStartedWalkthroughsList() {
        const renderGetttingStaredWalkthrough = (category) => {
            const renderNewBadge = (category.newItems || category.newEntry) && !category.isFeatured;
            const newBadge = $('.new-badge', {});
            if (category.newEntry) {
                reset(newBadge, $('.new-category', {}, localize('new', "New")));
            }
            else if (category.newItems) {
                reset(newBadge, $('.new-items', {}, localize({ key: 'newItems', comment: ['Shown when a list of items has changed based on an update from a remote source'] }, "Updated")));
            }
            const featuredBadge = $('.featured-badge', {});
            const descriptionContent = $('.description-content', {});
            if (category.isFeatured && this.showFeaturedWalkthrough) {
                reset(featuredBadge, $('.featured', {}, $('span.featured-icon.codicon.codicon-star-full')));
                reset(descriptionContent, ...renderLabelWithIcons(category.description));
            }
            const titleContent = $('h3.category-title.max-lines-3', { 'x-category-title-for': category.id });
            reset(titleContent, ...renderLabelWithIcons(category.title));
            return $('button.getting-started-category' + (category.isFeatured && this.showFeaturedWalkthrough ? '.featured' : ''), {
                'x-dispatch': 'selectCategory:' + category.id,
                'title': category.description
            }, featuredBadge, $('.main-content', {}, this.iconWidgetFor(category), titleContent, renderNewBadge ? newBadge : $('.no-badge'), $('a.codicon.codicon-close.hide-category-button', {
                'tabindex': 0,
                'x-dispatch': 'hideCategory:' + category.id,
                'title': localize('close', "Hide"),
                'role': 'button',
                'aria-label': localize('closeAriaLabel', "Hide"),
            })), descriptionContent, $('.category-progress', { 'x-data-category-id': category.id, }, $('.progress-bar-outer', { 'role': 'progressbar' }, $('.progress-bar-inner'))));
        };
        if (this.gettingStartedList) {
            this.gettingStartedList.dispose();
        }
        const rankWalkthrough = (e) => {
            let rank = e.order;
            if (e.isFeatured) {
                rank += 7;
            }
            if (e.newEntry) {
                rank += 3;
            }
            if (e.newItems) {
                rank += 2;
            }
            if (e.recencyBonus) {
                rank += 4 * e.recencyBonus;
            }
            if (this.getHiddenCategories().has(e.id)) {
                rank = null;
            }
            return rank;
        };
        const gettingStartedList = this.gettingStartedList = new GettingStartedIndexList({
            title: localize('walkthroughs', "Walkthroughs"),
            klass: 'getting-started',
            limit: 5,
            footer: $('span.button-link.see-all-walkthroughs', { 'x-dispatch': 'seeAllWalkthroughs', 'tabindex': 0 }, localize('showAll', "More...")),
            renderElement: renderGetttingStaredWalkthrough,
            rankElement: rankWalkthrough,
            contextService: this.contextService,
        });
        gettingStartedList.onDidChange(() => {
            const hidden = this.getHiddenCategories();
            const someWalkthroughsHidden = hidden.size || gettingStartedList.itemCount < this.gettingStartedCategories.filter(c => this.contextService.contextMatchesRules(c.when)).length;
            this.container.classList.toggle('someWalkthroughsHidden', !!someWalkthroughsHidden);
            this.registerDispatchListeners();
            allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
            this.updateCategoryProgress();
        });
        gettingStartedList.setEntries(this.gettingStartedCategories);
        allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
        return gettingStartedList;
    }
    layout(size) {
        this.detailsScrollbar?.scanDomNode();
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.startList?.layout(size);
        this.gettingStartedList?.layout(size);
        this.recentlyOpenedList?.layout(size);
        if (this.editorInput?.selectedStep && this.currentMediaType) {
            this.mediaDisposables.clear();
            this.stepDisposables.clear();
            this.buildMediaComponent(this.editorInput.selectedStep);
        }
        this.layoutMarkdown?.();
        this.container.classList.toggle('height-constrained', size.height <= 600);
        this.container.classList.toggle('width-constrained', size.width <= 400);
        this.container.classList.toggle('width-semi-constrained', size.width <= 950);
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateCategoryProgress() {
        // eslint-disable-next-line no-restricted-syntax
        this.window.document.querySelectorAll('.category-progress').forEach(element => {
            const categoryID = element.getAttribute('x-data-category-id');
            const category = this.gettingStartedCategories.find(c => c.id === categoryID);
            if (!category) {
                throw Error('Could not find category with ID ' + categoryID);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            // eslint-disable-next-line no-restricted-syntax
            const bar = assertReturnsDefined(element.querySelector('.progress-bar-inner'));
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuenow', '' + stats.stepsComplete);
            bar.setAttribute('aria-valuemax', '' + stats.stepsTotal);
            const progress = (stats.stepsComplete / stats.stepsTotal) * 100;
            bar.style.width = `${progress}%`;
            element.parentElement.classList.toggle('no-progress', stats.stepsComplete === 0);
            if (stats.stepsTotal === stats.stepsComplete) {
                bar.title = localize('gettingStarted.allStepsComplete', "All {0} steps complete!", stats.stepsComplete);
            }
            else {
                bar.title = localize('gettingStarted.someStepsComplete', "{0} of {1} steps complete", stats.stepsComplete, stats.stepsTotal);
            }
        });
    }
    async scrollToCategory(categoryID, stepId) {
        if (!this.gettingStartedCategories.some(c => c.id === categoryID)) {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        }
        const ourCategory = this.gettingStartedCategories.find(c => c.id === categoryID);
        if (!ourCategory) {
            throw Error('Could not find category with ID: ' + categoryID);
        }
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            if (!this.editorInput) {
                return;
            }
            reset(this.stepsContent);
            this.editorInput.selectedCategory = categoryID;
            this.editorInput.selectedStep = stepId;
            this.editorInput.walkthroughPageTitle = ourCategory.walkthroughPageTitle;
            this.currentWalkthrough = ourCategory;
            this.buildCategorySlide(categoryID, stepId);
            this.setSlide('details');
        });
    }
    iconWidgetFor(category) {
        const widget = category.icon.type === 'icon' ? $(ThemeIcon.asCSSSelector(category.icon.icon)) : $('img.category-icon', { src: category.icon.path });
        widget.classList.add('icon-widget');
        return widget;
    }
    focusSideEditorGroup() {
        const fullSize = this.groupsService.getPart(this.group).contentDimension;
        if (!fullSize || fullSize.width <= 700 || this.container.classList.contains('width-constrained') || this.container.classList.contains('width-semi-constrained')) {
            return;
        }
        if (this.groupsService.count === 1) {
            const editorGroupSplitDirection = preferredSideBySideGroupDirection(this.configurationService);
            const sideGroup = this.groupsService.addGroup(this.groupsService.groups[0], editorGroupSplitDirection);
            this.groupsService.activateGroup(sideGroup);
        }
        const nonGettingStartedGroup = this.groupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).find(group => !(group.activeEditor instanceof GettingStartedInput));
        if (nonGettingStartedGroup) {
            this.groupsService.activateGroup(nonGettingStartedGroup);
            nonGettingStartedGroup.focus();
        }
    }
    runStepCommand(href) {
        const isCommand = href.startsWith('command:');
        const toSide = href.startsWith('command:toSide:');
        const command = href.replace(/command:(toSide:)?/, 'command:');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
        if (toSide) {
            this.focusSideEditorGroup();
        }
        if (isCommand) {
            const commandURI = URI.parse(command);
            // execute as command
            let args = [];
            try {
                args = parse(decodeURIComponent(commandURI.query));
            }
            catch {
                // ignore and retry
                try {
                    args = parse(commandURI.query);
                }
                catch {
                    // ignore error
                }
            }
            if (!Array.isArray(args)) {
                args = [args];
            }
            // If a step is requesting the OpenFolder action to be executed in an empty workspace...
            if ((commandURI.path === OpenFileFolderAction.ID.toString() ||
                commandURI.path === OpenFolderAction.ID.toString()) &&
                this.workspaceContextService.getWorkspace().folders.length === 0) {
                const selectedStepIndex = this.currentWalkthrough?.steps.findIndex(step => step.id === this.editorInput?.selectedStep);
                // and there are a few more steps after this step which are yet to be completed...
                if (selectedStepIndex !== undefined &&
                    selectedStepIndex > -1 &&
                    this.currentWalkthrough?.steps.slice(selectedStepIndex + 1).some(step => !step.done)) {
                    const restoreData = { folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id, category: this.editorInput?.selectedCategory, step: this.editorInput?.selectedStep };
                    // save state to restore after reload
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            this.commandService.executeCommand(commandURI.path, ...args).then(result => {
                const toOpen = result?.openFolder;
                if (toOpen) {
                    if (!URI.isUri(toOpen)) {
                        console.warn('Warn: Running walkthrough command', href, 'yielded non-URI `openFolder` result', toOpen, '. It will be disregarded.');
                        return;
                    }
                    const restoreData = { folder: toOpen.toString(), category: this.editorInput?.selectedCategory, step: this.editorInput?.selectedStep };
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                    this.hostService.openWindow([{ folderUri: toOpen }]);
                }
            });
        }
        else {
            this.openerService.open(command, { allowCommands: true });
        }
        if (!isCommand && (href.startsWith('https://') || href.startsWith('http://'))) {
            this.gettingStartedService.progressByEvent('onLink:' + href);
        }
    }
    buildMarkdownDescription(container, text) {
        while (container.firstChild) {
            container.firstChild.remove();
        }
        for (const linkedText of text) {
            if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                const node = linkedText.nodes[0];
                const buttonContainer = append(container, $('.button-container'));
                const button = new Button(buttonContainer, { title: node.title, supportIcons: true, ...defaultButtonStyles });
                const isCommand = node.href.startsWith('command:');
                const command = node.href.replace(/command:(toSide:)?/, 'command:');
                button.label = node.label;
                button.onDidClick(e => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.runStepCommand(node.href);
                }, null, this.detailsPageDisposables);
                if (isCommand) {
                    const keybinding = this.getKeyBinding(command);
                    if (keybinding) {
                        const shortcutMessage = $('span.shortcut-message', {}, localize('gettingStarted.keyboardTip', 'Tip: Use keyboard shortcut '));
                        container.appendChild(shortcutMessage);
                        const label = new KeybindingLabel(shortcutMessage, OS, { ...defaultKeybindingLabelStyles });
                        label.set(keybinding);
                        this.detailsPageDisposables.add(label);
                    }
                }
                this.detailsPageDisposables.add(button);
            }
            else {
                const p = append(container, $('p'));
                for (const node of linkedText.nodes) {
                    if (typeof node === 'string') {
                        const labelWithIcon = renderLabelWithIcons(node);
                        for (const element of labelWithIcon) {
                            if (typeof element === 'string') {
                                p.appendChild(renderFormattedText(element, { renderCodeSegments: true }, $('span')));
                            }
                            else {
                                p.appendChild(element);
                            }
                        }
                    }
                    else {
                        const nodeWithTitle = matchesScheme(node.href, Schemas.http) || matchesScheme(node.href, Schemas.https) ? { ...node, title: node.href } : node;
                        const link = this.instantiationService.createInstance(Link, p, nodeWithTitle, { opener: (href) => this.runStepCommand(href) });
                        this.detailsPageDisposables.add(link);
                    }
                }
            }
        }
        return container;
    }
    clearInput() {
        this.stepDisposables.clear();
        super.clearInput();
    }
    buildCategorySlide(categoryID, selectedStep) {
        if (!this.editorInput) {
            return;
        }
        if (this.detailsScrollbar) {
            this.detailsScrollbar.dispose();
        }
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            // Remove internal extension id specifier from exposed id's
            this.extensionService.activateByEvent(`onWalkthrough:${categoryID.replace(/[^#]+#/, '')}`);
        });
        this.detailsPageDisposables.clear();
        this.mediaDisposables.clear();
        const category = this.gettingStartedCategories.find(category => category.id === categoryID);
        if (!category) {
            throw Error('could not find category with ID ' + categoryID);
        }
        const descriptionContainer = $('.category-description.description.max-lines-3', { 'x-category-description-for': category.id });
        this.buildMarkdownDescription(descriptionContainer, parseDescription(category.description));
        const categoryDescriptorComponent = $('.getting-started-category', {}, $('.category-description-container', {}, $('h2.category-title.max-lines-3', { 'x-category-title-for': category.id }, ...renderLabelWithIcons(category.title)), descriptionContainer));
        const stepListContainer = $('.step-list-container');
        this.detailsPageDisposables.add(addDisposableListener(stepListContainer, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            const currentStepIndex = () => category.steps.findIndex(e => e.id === this.editorInput?.selectedStep);
            if (event.keyCode === 16 /* KeyCode.UpArrow */) {
                const toExpand = category.steps.filter((step, index) => index < currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand.length) {
                    this.selectStep(toExpand[toExpand.length - 1].id, false);
                }
            }
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                const toExpand = category.steps.find((step, index) => index > currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand) {
                    this.selectStep(toExpand.id, false);
                }
            }
        }));
        let renderedSteps = undefined;
        const contextKeysToWatch = new Set(category.steps.flatMap(step => step.when.keys()));
        const buildStepList = () => {
            category.steps.sort((a, b) => a.order - b.order);
            const toRender = category.steps
                .filter(step => this.contextService.contextMatchesRules(step.when));
            if (equals(renderedSteps, toRender, (a, b) => a.id === b.id)) {
                return;
            }
            renderedSteps = toRender;
            reset(stepListContainer, ...renderedSteps
                .map(step => {
                const codicon = $('.codicon' + (step.done ? '.complete' + ThemeIcon.asCSSSelector(gettingStartedCheckedCodicon) : ThemeIcon.asCSSSelector(gettingStartedUncheckedCodicon)), {
                    'data-done-step-id': step.id,
                    'x-dispatch': 'toggleStepCompletion:' + step.id,
                    'role': 'checkbox',
                    'aria-checked': step.done ? 'true' : 'false',
                    'aria-label': step.done
                        ? localize('stepDone', "Checkbox for Step {0}: Completed", step.title)
                        : localize('stepNotDone', "Checkbox for Step {0}: Not completed", step.title),
                });
                const container = $('.step-description-container', { 'x-step-description-for': step.id });
                this.buildMarkdownDescription(container, step.description);
                const stepTitle = $('h3.step-title.max-lines-3', { 'x-step-title-for': step.id });
                reset(stepTitle, ...renderLabelWithIcons(step.title));
                const stepDescription = $('.step-container', {}, stepTitle, container);
                if (step.media.type === 'image') {
                    stepDescription.appendChild($('.image-description', { 'aria-label': localize('imageShowing', "Image showing {0}", step.media.altText) }));
                }
                else if (step.media.type === 'video') {
                    stepDescription.appendChild($('.video-description', { 'aria-label': localize('videoShowing', "Video showing {0}", step.media.altText) }));
                }
                return $('button.getting-started-step', {
                    'x-dispatch': 'selectTask:' + step.id,
                    'data-step-id': step.id,
                    'aria-expanded': 'false',
                    'aria-checked': step.done ? 'true' : 'false',
                    'role': 'button',
                }, codicon, stepDescription);
            }));
        };
        buildStepList();
        this.detailsPageDisposables.add(this.contextService.onDidChangeContext(e => {
            if (e.affectsSome(contextKeysToWatch) && this.currentWalkthrough && this.editorInput) {
                buildStepList();
                this.registerDispatchListeners();
                this.selectStep(this.editorInput.selectedStep, false);
            }
        }));
        const showNextCategory = this.gettingStartedCategories.find(_category => _category.id === category.next);
        const stepsContainer = $('.getting-started-detail-container', { 'role': 'list' }, stepListContainer, $('.done-next-container', {}, $('button.button-link.all-done', { 'x-dispatch': 'allDone' }, $('span.codicon.codicon-check-all'), localize('allDone', "Mark Done")), ...(showNextCategory
            ? [$('button.button-link.next', { 'x-dispatch': 'nextSection' }, localize('nextOne', "Next Section"), $('span.codicon.codicon-arrow-right'))]
            : [])));
        this.detailsScrollbar = this._register(new DomScrollableElement(stepsContainer, { className: 'steps-container' }));
        const stepListComponent = this.detailsScrollbar.getDomNode();
        const categoryFooter = $('.getting-started-footer');
        if (this.editorInput.showTelemetryNotice && getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */ && this.productService.enableTelemetry) {
            this.buildTelemetryFooter(categoryFooter);
        }
        reset(this.stepsContent, categoryDescriptorComponent, stepListComponent, this.stepMediaComponent, categoryFooter);
        const toExpand = category.steps.find(step => this.contextService.contextMatchesRules(step.when) && !step.done) ?? category.steps[0];
        this.selectStep(selectedStep ?? toExpand.id, !selectedStep);
        this.detailsScrollbar.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.registerDispatchListeners();
    }
    buildTelemetryFooter(parent) {
        const privacyStatementCopy = localize('privacy statement', "privacy statement");
        const privacyStatementButton = `[${privacyStatementCopy}](command:workbench.action.openPrivacyStatementUrl)`;
        const optOutCopy = localize('optOut', "opt out");
        const optOutButton = `[${optOutCopy}](command:settings.filterByTelemetry)`;
        const text = localize({ key: 'footer', comment: ['fist substitution is "vs code", second is "privacy statement", third is "opt out".'] }, "{0} collects usage data. Read our {1} and learn how to {2}.", this.productService.nameShort, privacyStatementButton, optOutButton);
        const renderedContents = this.detailsPageDisposables.add(this.markdownRendererService.render({ value: text, isTrusted: true }));
        parent.append(renderedContents.element);
    }
    getKeybindingLabel(command) {
        command = command.replace(/^command:/, '');
        const label = this.keybindingService.lookupKeybinding(command)?.getLabel();
        if (!label) {
            return '';
        }
        else {
            return `(${label})`;
        }
    }
    getKeyBinding(command) {
        command = command.replace(/^command:/, '');
        return this.keybindingService.lookupKeybinding(command);
    }
    async scrollPrev() {
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            if (this.prevWalkthrough && this.prevWalkthrough !== this.currentWalkthrough) {
                this.currentWalkthrough = this.prevWalkthrough;
                this.prevWalkthrough = undefined;
                this.makeCategoryVisibleWhenAvailable(this.currentWalkthrough.id);
            }
            else {
                this.currentWalkthrough = undefined;
                if (this.editorInput) {
                    this.editorInput.selectedCategory = undefined;
                    this.editorInput.selectedStep = undefined;
                    this.editorInput.showTelemetryNotice = false;
                    this.editorInput.walkthroughPageTitle = undefined;
                }
                if (this.gettingStartedCategories.length !== this.gettingStartedList?.itemCount) {
                    // extensions may have changed in the time since we last displayed the walkthrough list
                    // rebuild the list
                    this.buildCategoriesSlide();
                }
                this.selectStep(undefined);
                this.setSlide('categories');
                this.container.focus();
            }
        });
    }
    runSkip() {
        this.commandService.executeCommand('workbench.action.closeActiveEditor');
    }
    escape() {
        if (this.editorInput?.selectedCategory) {
            this.scrollPrev();
        }
        else {
            this.runSkip();
        }
    }
    setSlide(toEnable, firstLaunch = false) {
        // eslint-disable-next-line no-restricted-syntax
        const slideManager = assertReturnsDefined(this.container.querySelector('.gettingStarted'));
        if (toEnable === 'categories') {
            slideManager.classList.remove('showDetails');
            slideManager.classList.add('showCategories');
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.prev-button.button-link').style.display = 'none';
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.gettingStartedSlideDetails').querySelectorAll('button').forEach(button => button.disabled = true);
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('button').forEach(button => button.disabled = false);
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('input').forEach(button => button.disabled = false);
        }
        else {
            slideManager.classList.add('showDetails');
            slideManager.classList.remove('showCategories');
            // eslint-disable-next-line no-restricted-syntax
            const prevButton = this.container.querySelector('.prev-button.button-link');
            prevButton.style.display = this.editorInput?.showWelcome || this.prevWalkthrough ? 'block' : 'none';
            // eslint-disable-next-line no-restricted-syntax
            const moreTextElement = prevButton.querySelector('.moreText');
            moreTextElement.textContent = firstLaunch ? localize('welcome', "Welcome") : localize('goBack', "Go Back");
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.gettingStartedSlideDetails').querySelectorAll('button').forEach(button => button.disabled = false);
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('button').forEach(button => button.disabled = true);
            // eslint-disable-next-line no-restricted-syntax
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('input').forEach(button => button.disabled = true);
        }
    }
    focus() {
        super.focus();
        const active = this.container.ownerDocument.activeElement;
        let parent = this.container.parentElement;
        while (parent && parent !== active) {
            parent = parent.parentElement;
        }
        if (parent) {
            // Only set focus if there is no other focued element outside this chain.
            // This prevents us from stealing back focus from other focused elements such as quick pick due to delayed load.
            this.container.focus();
        }
    }
};
GettingStartedPage = GettingStartedPage_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IProductService),
    __param(3, IKeybindingService),
    __param(4, IWalkthroughsService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, ILanguageService),
    __param(8, IFileService),
    __param(9, IOpenerService),
    __param(10, IWorkbenchThemeService),
    __param(11, IStorageService),
    __param(12, IExtensionService),
    __param(13, IInstantiationService),
    __param(14, INotificationService),
    __param(15, IEditorGroupsService),
    __param(16, IContextKeyService),
    __param(17, IQuickInputService),
    __param(18, IWorkspacesService),
    __param(19, ILabelService),
    __param(20, IHostService),
    __param(21, IWebviewService),
    __param(22, IWorkspaceContextService),
    __param(23, IAccessibilityService),
    __param(24, IMarkdownRendererService)
], GettingStartedPage);
export { GettingStartedPage };
export class GettingStartedInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return JSON.stringify({ selectedCategory: editorInput.selectedCategory, selectedStep: editorInput.selectedStep });
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction(accessor => {
            try {
                const { selectedCategory, selectedStep } = JSON.parse(serializedEditorInput);
                return new GettingStartedInput({ selectedCategory, selectedStep });
            }
            catch { }
            return new GettingStartedInput({});
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQWEscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVyRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NB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
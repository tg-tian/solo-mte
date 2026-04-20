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
var ModelNameColumnRenderer_1, MultiplierColumnRenderer_1, TokenLimitsColumnRenderer_1, ActionsColumnRenderer_1, ChatModelsWidget_1;
import './media/chatModelsWidget.css';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageModelsService } from '../../../chat/common/languageModels.js';
import { localize } from '../../../../../nls.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../../platform/list/browser/listService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { toAction, Action, Separator, SubmenuAction } from '../../../../../base/common/actions.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatModelsViewModel, SEARCH_SUGGESTIONS, isVendorEntry, isGroupEntry } from './chatModelsViewModel.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { SuggestEnabledInput } from '../../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { Delayer } from '../../../../../base/common/async.js';
import { settingsTextInputBorder } from '../../../preferences/common/settingsEditorColorRegistry.js';
import { IChatEntitlementService, ChatEntitlement } from '../../../../services/chat/common/chatEntitlementService.js';
import { DropdownMenuActionViewItem } from '../../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { ToolBar } from '../../../../../base/browser/ui/toolbar/toolbar.js';
import { preferencesClearInputIcon } from '../../../preferences/browser/preferencesIcons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { CONTEXT_MODELS_SEARCH_FOCUS } from '../../common/constants.js';
const $ = DOM.$;
const HEADER_HEIGHT = 30;
const VENDOR_ROW_HEIGHT = 30;
const MODEL_ROW_HEIGHT = 26;
export function getModelHoverContent(model) {
    const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    markdown.appendMarkdown(`**${model.metadata.name}**`);
    if (model.metadata.id !== model.metadata.version) {
        markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${model.metadata.id}@${model.metadata.version}_&nbsp;</span>`);
    }
    else {
        markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${model.metadata.id}_&nbsp;</span>`);
    }
    markdown.appendText(`\n`);
    if (model.metadata.statusIcon && model.metadata.tooltip) {
        if (model.metadata.statusIcon) {
            markdown.appendMarkdown(`$(${model.metadata.statusIcon.id})&nbsp;`);
        }
        markdown.appendMarkdown(`${model.metadata.tooltip}`);
        markdown.appendText(`\n`);
    }
    if (model.metadata.detail) {
        markdown.appendMarkdown(`${localize('models.cost', 'Multiplier')}: `);
        markdown.appendMarkdown(model.metadata.detail);
        markdown.appendText(`\n`);
    }
    if (model.metadata.maxInputTokens || model.metadata.maxOutputTokens) {
        markdown.appendMarkdown(`${localize('models.contextSize', 'Context Size')}: `);
        let addSeparator = false;
        if (model.metadata.maxInputTokens) {
            markdown.appendMarkdown(`$(arrow-down) ${formatTokenCount(model.metadata.maxInputTokens)} (${localize('models.input', 'Input')})`);
            addSeparator = true;
        }
        if (model.metadata.maxOutputTokens) {
            if (addSeparator) {
                markdown.appendText(`  |  `);
            }
            markdown.appendMarkdown(`$(arrow-up) ${formatTokenCount(model.metadata.maxOutputTokens)} (${localize('models.output', 'Output')})`);
        }
        markdown.appendText(`\n`);
    }
    if (model.metadata.capabilities) {
        markdown.appendMarkdown(`${localize('models.capabilities', 'Capabilities')}: `);
        if (model.metadata.capabilities?.toolCalling) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize('models.toolCalling', 'Tools')}_&nbsp;</span>`);
        }
        if (model.metadata.capabilities?.vision) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize('models.vision', 'Vision')}_&nbsp;</span>`);
        }
        if (model.metadata.capabilities?.agentMode) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${localize('models.agentMode', 'Agent Mode')}_&nbsp;</span>`);
        }
        for (const editTool of model.metadata.capabilities.editTools ?? []) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${editTool}_&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
    }
    return markdown;
}
class ModelsFilterAction extends Action {
    constructor() {
        super('workbench.models.filter', localize('filter', "Filter"), ThemeIcon.asClassName(Codicon.filter));
    }
    async run() {
    }
}
function toggleFilter(currentQuery, query, alternativeQueries = []) {
    const allQueries = [query, ...alternativeQueries];
    const isChecked = allQueries.some(q => currentQuery.includes(q));
    if (!isChecked) {
        const trimmedQuery = currentQuery.trim();
        return trimmedQuery ? `${trimmedQuery} ${query}` : query;
    }
    else {
        let queryWithRemovedFilter = currentQuery;
        for (const q of allQueries) {
            queryWithRemovedFilter = queryWithRemovedFilter.replace(q, '');
        }
        return queryWithRemovedFilter.replace(/\s+/g, ' ').trim();
    }
}
let ModelsSearchFilterDropdownMenuActionViewItem = class ModelsSearchFilterDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, searchWidget, viewModel, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.searchWidget = searchWidget;
        this.viewModel = viewModel;
    }
    createGroupByAction(grouping, label) {
        return {
            id: `groupBy.${grouping}`,
            label,
            class: undefined,
            enabled: true,
            tooltip: localize('groupByTooltip', "Group by {0}", label),
            checked: this.viewModel.groupBy === grouping,
            run: () => {
                this.viewModel.groupBy = grouping;
            }
        };
    }
    createProviderAction(vendor, displayName) {
        const query = `@provider:"${displayName}"`;
        const currentQuery = this.searchWidget.getValue();
        const isChecked = currentQuery.includes(query) || currentQuery.includes(`@provider:${vendor}`);
        return {
            id: `provider-${vendor}`,
            label: displayName,
            tooltip: localize('filterByProvider', "Filter by {0}", displayName),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch(query, [`@provider:${vendor}`])
        };
    }
    createCapabilityAction(capability, label) {
        const query = `@capability:${capability}`;
        const currentQuery = this.searchWidget.getValue();
        const isChecked = currentQuery.includes(query);
        return {
            id: `capability-${capability}`,
            label,
            tooltip: localize('filterByCapability', "Filter by {0}", label),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch(query)
        };
    }
    createVisibleAction(visible, label) {
        const query = `@visible:${visible}`;
        const oppositeQuery = `@visible:${!visible}`;
        const currentQuery = this.searchWidget.getValue();
        const isChecked = currentQuery.includes(query);
        return {
            id: `visible-${visible}`,
            label,
            tooltip: localize('filterByVisible', "Filter by {0}", label),
            class: undefined,
            enabled: true,
            checked: isChecked,
            run: () => this.toggleFilterAndSearch(query, [oppositeQuery])
        };
    }
    toggleFilterAndSearch(query, alternativeQueries = []) {
        const currentQuery = this.searchWidget.getValue();
        const newQuery = toggleFilter(currentQuery, query, alternativeQueries);
        this.searchWidget.setValue(newQuery);
        this.searchWidget.focus();
    }
    getActions() {
        const actions = [];
        // Visibility filters
        actions.push(this.createVisibleAction(true, localize('filter.visible', 'Visible')));
        actions.push(this.createVisibleAction(false, localize('filter.hidden', 'Hidden')));
        // Capability filters
        actions.push(new Separator());
        actions.push(this.createCapabilityAction('tools', localize('capability.tools', 'Tools')), this.createCapabilityAction('vision', localize('capability.vision', 'Vision')), this.createCapabilityAction('agent', localize('capability.agent', 'Agent Mode')));
        // Provider filters - only show providers with configured models
        const configuredVendors = this.viewModel.getConfiguredVendors();
        if (configuredVendors.length > 1) {
            actions.push(new Separator());
            actions.push(...configuredVendors.map(vendor => this.createProviderAction(vendor.vendor, vendor.vendorDisplayName)));
        }
        // Group By
        actions.push(new Separator());
        const groupByActions = [];
        groupByActions.push(this.createGroupByAction("vendor" /* ChatModelGroup.Vendor */, localize('groupBy.provider', 'Provider')));
        groupByActions.push(this.createGroupByAction("visibility" /* ChatModelGroup.Visibility */, localize('groupBy.visibility', 'Visibility')));
        actions.push(new SubmenuAction('groupBy', localize('groupBy', "Group By"), groupByActions));
        return actions;
    }
};
ModelsSearchFilterDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService)
], ModelsSearchFilterDropdownMenuActionViewItem);
class Delegate {
    constructor() {
        this.headerRowHeight = HEADER_HEIGHT;
    }
    getHeight(element) {
        return isVendorEntry(element) || isGroupEntry(element) ? VENDOR_ROW_HEIGHT : MODEL_ROW_HEIGHT;
    }
}
class ModelsTableColumnRenderer {
    renderElement(element, index, templateData) {
        templateData.elementDisposables.clear();
        const isVendor = isVendorEntry(element);
        const isGroup = isGroupEntry(element);
        templateData.container.classList.add('models-table-column');
        templateData.container.parentElement.classList.toggle('models-vendor-row', isVendor || isGroup);
        templateData.container.parentElement.classList.toggle('models-model-row', !isVendor && !isGroup);
        templateData.container.parentElement.classList.toggle('model-hidden', !isVendor && !isGroup && !element.modelEntry.metadata.isUserSelectable);
        if (isVendor) {
            this.renderVendorElement(element, index, templateData);
        }
        else if (isGroup) {
            this.renderGroupElement(element, index, templateData);
        }
        else {
            this.renderModelElement(element, index, templateData);
        }
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.disposables.dispose();
    }
}
class GutterColumnRenderer extends ModelsTableColumnRenderer {
    static { this.TEMPLATE_ID = 'gutter'; }
    constructor(viewModel) {
        super();
        this.viewModel = viewModel;
        this.templateId = GutterColumnRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('models-gutter-column');
        const actionBar = disposables.add(new ActionBar(container));
        return {
            listRowElement: container.parentElement?.parentElement ?? null,
            container,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        this.renderCollapsableElement(entry, templateData);
    }
    renderGroupElement(entry, index, templateData) {
        this.renderCollapsableElement(entry, templateData);
    }
    renderCollapsableElement(entry, templateData) {
        if (templateData.listRowElement) {
            templateData.listRowElement.setAttribute('aria-expanded', entry.collapsed ? 'false' : 'true');
        }
        const label = entry.collapsed ? localize('expand', 'Expand') : localize('collapse', 'Collapse');
        const toggleCollapseAction = {
            id: 'toggleCollapse',
            label,
            tooltip: label,
            enabled: true,
            class: ThemeIcon.asClassName(entry.collapsed ? Codicon.chevronRight : Codicon.chevronDown),
            run: () => this.viewModel.toggleCollapsed(entry)
        };
        templateData.actionBar.push(toggleCollapseAction, { icon: true, label: false });
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry } = entry;
        const isVisible = modelEntry.metadata.isUserSelectable ?? false;
        const toggleVisibilityAction = toAction({
            id: 'toggleVisibility',
            label: isVisible ? localize('models.hide', 'Hide') : localize('models.show', 'Show'),
            class: `model-visibility-toggle ${isVisible ? `${ThemeIcon.asClassName(Codicon.eye)} model-visible` : `${ThemeIcon.asClassName(Codicon.eyeClosed)} model-hidden`}`,
            tooltip: isVisible ? localize('models.visible', 'Hide in the chat model picker') : localize('models.hidden', 'Show in the chat model picker'),
            checked: !isVisible,
            run: async () => this.viewModel.toggleVisibility(entry)
        });
        templateData.actionBar.push(toggleVisibilityAction, { icon: true, label: false });
    }
}
let ModelNameColumnRenderer = class ModelNameColumnRenderer extends ModelsTableColumnRenderer {
    static { ModelNameColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'modelName'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = ModelNameColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const nameContainer = DOM.append(container, $('.model-name-container'));
        const nameLabel = disposables.add(new HighlightedLabel(DOM.append(nameContainer, $('.model-name'))));
        const statusIcon = DOM.append(nameContainer, $('.model-status-icon'));
        const actionBar = disposables.add(new ActionBar(DOM.append(nameContainer, $('.model-name-actions'))));
        return {
            container,
            statusIcon,
            nameLabel,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.statusIcon);
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        templateData.nameLabel.set(entry.vendorEntry.vendorDisplayName, undefined);
    }
    renderGroupElement(entry, index, templateData) {
        templateData.nameLabel.set(entry.label, undefined);
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry, modelNameMatches } = entry;
        templateData.statusIcon.className = 'model-status-icon';
        if (modelEntry.metadata.statusIcon) {
            templateData.statusIcon.classList.add(...ThemeIcon.asClassNameArray(modelEntry.metadata.statusIcon));
            templateData.statusIcon.style.display = '';
        }
        else {
            templateData.statusIcon.style.display = 'none';
        }
        templateData.nameLabel.set(modelEntry.metadata.name, modelNameMatches);
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        markdown.appendMarkdown(`**${entry.modelEntry.metadata.name}**`);
        if (entry.modelEntry.metadata.id !== entry.modelEntry.metadata.version) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${entry.modelEntry.metadata.id}@${entry.modelEntry.metadata.version}_&nbsp;</span>`);
        }
        else {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">&nbsp;_${entry.modelEntry.metadata.id}_&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
        if (entry.modelEntry.metadata.statusIcon && entry.modelEntry.metadata.tooltip) {
            if (entry.modelEntry.metadata.statusIcon) {
                markdown.appendMarkdown(`$(${entry.modelEntry.metadata.statusIcon.id})&nbsp;`);
            }
            markdown.appendMarkdown(`${entry.modelEntry.metadata.tooltip}`);
            markdown.appendText(`\n`);
        }
        if (!entry.modelEntry.metadata.isUserSelectable) {
            markdown.appendMarkdown(`\n\n${localize('models.userSelectable', 'This model is hidden in the chat model picker')}`);
        }
        templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
            content: markdown,
            appearance: {
                compact: true,
                skipFadeInAnimation: true,
            }
        })));
    }
};
ModelNameColumnRenderer = ModelNameColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], ModelNameColumnRenderer);
let MultiplierColumnRenderer = class MultiplierColumnRenderer extends ModelsTableColumnRenderer {
    static { MultiplierColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'multiplier'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = MultiplierColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const multiplierElement = DOM.append(container, $('.model-multiplier'));
        return {
            container,
            multiplierElement,
            disposables,
            elementDisposables
        };
    }
    renderVendorElement(entry, index, templateData) {
        templateData.multiplierElement.textContent = '';
    }
    renderGroupElement(entry, index, templateData) {
        templateData.multiplierElement.textContent = '';
    }
    renderModelElement(entry, index, templateData) {
        const multiplierText = (entry.modelEntry.metadata.detail && entry.modelEntry.metadata.detail.trim().toLowerCase() !== entry.modelEntry.vendor.trim().toLowerCase()) ? entry.modelEntry.metadata.detail : '-';
        templateData.multiplierElement.textContent = multiplierText;
        if (multiplierText !== '-') {
            templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
                content: localize('multiplier.tooltip', "Every chat message counts {0} towards your premium model request quota", multiplierText),
                appearance: {
                    compact: true,
                    skipFadeInAnimation: true
                }
            })));
        }
    }
};
MultiplierColumnRenderer = MultiplierColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], MultiplierColumnRenderer);
let TokenLimitsColumnRenderer = class TokenLimitsColumnRenderer extends ModelsTableColumnRenderer {
    static { TokenLimitsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'tokenLimits'; }
    constructor(hoverService) {
        super();
        this.hoverService = hoverService;
        this.templateId = TokenLimitsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const tokenLimitsElement = DOM.append(container, $('.model-token-limits'));
        return {
            container,
            tokenLimitsElement,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.tokenLimitsElement);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
    }
    renderGroupElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry } = entry;
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        if (modelEntry.metadata.maxInputTokens || modelEntry.metadata.maxOutputTokens) {
            let addSeparator = false;
            markdown.appendMarkdown(`${localize('models.contextSize', 'Context Size')}: `);
            if (modelEntry.metadata.maxInputTokens) {
                const inputDiv = DOM.append(templateData.tokenLimitsElement, $('.token-limit-item'));
                DOM.append(inputDiv, $('span.codicon.codicon-arrow-down'));
                const inputText = DOM.append(inputDiv, $('span'));
                inputText.textContent = formatTokenCount(modelEntry.metadata.maxInputTokens);
                markdown.appendMarkdown(`$(arrow-down) ${modelEntry.metadata.maxInputTokens} (${localize('models.input', 'Input')})`);
                addSeparator = true;
            }
            if (modelEntry.metadata.maxOutputTokens) {
                const outputDiv = DOM.append(templateData.tokenLimitsElement, $('.token-limit-item'));
                DOM.append(outputDiv, $('span.codicon.codicon-arrow-up'));
                const outputText = DOM.append(outputDiv, $('span'));
                outputText.textContent = formatTokenCount(modelEntry.metadata.maxOutputTokens);
                if (addSeparator) {
                    markdown.appendText(`  |  `);
                }
                markdown.appendMarkdown(`$(arrow-up) ${modelEntry.metadata.maxOutputTokens} (${localize('models.output', 'Output')})`);
            }
        }
        templateData.elementDisposables.add(this.hoverService.setupDelayedHoverAtMouse(templateData.container, () => ({
            content: markdown,
            appearance: {
                compact: true,
                skipFadeInAnimation: true,
            }
        })));
    }
};
TokenLimitsColumnRenderer = TokenLimitsColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], TokenLimitsColumnRenderer);
class CapabilitiesColumnRenderer extends ModelsTableColumnRenderer {
    constructor() {
        super(...arguments);
        this.templateId = CapabilitiesColumnRenderer.TEMPLATE_ID;
        this._onDidClickCapability = new Emitter();
        this.onDidClickCapability = this._onDidClickCapability.event;
    }
    static { this.TEMPLATE_ID = 'capabilities'; }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('model-capability-column');
        const metadataRow = DOM.append(container, $('.model-capabilities'));
        return {
            container,
            metadataRow,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        DOM.clearNode(templateData.metadataRow);
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
    }
    renderGroupElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        const { modelEntry, capabilityMatches } = entry;
        if (modelEntry.metadata.capabilities?.toolCalling) {
            templateData.elementDisposables.add(this.createCapabilityButton(templateData.metadataRow, capabilityMatches?.includes('toolCalling') || false, localize('models.tools', 'Tools'), 'tools'));
        }
        if (modelEntry.metadata.capabilities?.vision) {
            templateData.elementDisposables.add(this.createCapabilityButton(templateData.metadataRow, capabilityMatches?.includes('vision') || false, localize('models.vision', 'Vision'), 'vision'));
        }
    }
    createCapabilityButton(container, isActive, label, capability) {
        const disposables = new DisposableStore();
        const buttonContainer = DOM.append(container, $('.model-badge-container'));
        const button = disposables.add(new Button(buttonContainer, { secondary: true }));
        button.element.classList.add('model-capability');
        button.element.classList.toggle('active', isActive);
        button.label = label;
        disposables.add(button.onDidClick(() => this._onDidClickCapability.fire(capability)));
        return disposables;
    }
}
let ActionsColumnRenderer = class ActionsColumnRenderer extends ModelsTableColumnRenderer {
    static { ActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(viewModel, commandService) {
        super();
        this.viewModel = viewModel;
        this.commandService = commandService;
        this.templateId = ActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const parent = DOM.append(container, $('.actions-column'));
        const actionBar = disposables.add(new ActionBar(parent));
        return {
            container,
            actionBar,
            disposables,
            elementDisposables
        };
    }
    renderElement(entry, index, templateData) {
        templateData.actionBar.clear();
        super.renderElement(entry, index, templateData);
    }
    renderVendorElement(entry, index, templateData) {
        if (entry.vendorEntry.managementCommand) {
            const { vendorEntry } = entry;
            const action = toAction({
                id: 'manageVendor',
                label: localize('models.manageProvider', 'Manage {0}...', entry.vendorEntry.vendorDisplayName),
                class: ThemeIcon.asClassName(Codicon.gear),
                run: async () => {
                    await this.commandService.executeCommand(vendorEntry.managementCommand, vendorEntry.vendor);
                    this.viewModel.refresh();
                }
            });
            templateData.actionBar.push(action, { icon: true, label: false });
        }
    }
    renderGroupElement(entry, index, templateData) {
    }
    renderModelElement(entry, index, templateData) {
        // Visibility action moved to name column
    }
};
ActionsColumnRenderer = ActionsColumnRenderer_1 = __decorate([
    __param(1, ICommandService)
], ActionsColumnRenderer);
class ProviderColumnRenderer extends ModelsTableColumnRenderer {
    constructor() {
        super(...arguments);
        this.templateId = ProviderColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'provider'; }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        const providerElement = DOM.append(container, $('.model-provider'));
        return {
            container,
            providerElement,
            disposables,
            elementDisposables
        };
    }
    renderVendorElement(entry, index, templateData) {
        templateData.providerElement.textContent = '';
    }
    renderGroupElement(entry, index, templateData) {
        templateData.providerElement.textContent = '';
    }
    renderModelElement(entry, index, templateData) {
        templateData.providerElement.textContent = entry.modelEntry.vendorDisplayName;
    }
}
function formatTokenCount(count) {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    else if (count >= 1000) {
        return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
}
let ChatModelsWidget = class ChatModelsWidget extends Disposable {
    static { ChatModelsWidget_1 = this; }
    static { this.NUM_INSTANCES = 0; }
    constructor(languageModelsService, instantiationService, extensionService, contextMenuService, chatEntitlementService, editorProgressService, commandService, contextKeyService) {
        super();
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        this.extensionService = extensionService;
        this.contextMenuService = contextMenuService;
        this.chatEntitlementService = chatEntitlementService;
        this.editorProgressService = editorProgressService;
        this.commandService = commandService;
        this.dropdownActions = [];
        this.tableDisposables = this._register(new DisposableStore());
        this.searchFocusContextKey = CONTEXT_MODELS_SEARCH_FOCUS.bindTo(contextKeyService);
        this.delayedFiltering = new Delayer(200);
        this.viewModel = this._register(this.instantiationService.createInstance(ChatModelsViewModel));
        this.element = DOM.$('.models-widget');
        this.create(this.element);
        const loadingPromise = this.extensionService.whenInstalledExtensionsRegistered().then(() => this.viewModel.refresh());
        this.editorProgressService.showWhile(loadingPromise, 300);
    }
    create(container) {
        const searchAndButtonContainer = DOM.append(container, $('.models-search-and-button-container'));
        const placeholder = localize('Search.FullTextSearchPlaceholder', "Type to search...");
        const searchContainer = DOM.append(searchAndButtonContainer, $('.models-search-container'));
        this.searchWidget = this._register(this.instantiationService.createInstance(SuggestEnabledInput, 'chatModelsWidget.searchbox', searchContainer, {
            triggerCharacters: ['@', ':'],
            provideResults: (query) => {
                const providerSuggestions = this.viewModel.getVendors().map(v => `@provider:"${v.displayName}"`);
                const allSuggestions = [
                    ...providerSuggestions,
                    ...SEARCH_SUGGESTIONS.CAPABILITIES,
                    ...SEARCH_SUGGESTIONS.VISIBILITY,
                ];
                if (!query.trim()) {
                    return allSuggestions;
                }
                const queryParts = query.split(/\s/g);
                const lastPart = queryParts[queryParts.length - 1];
                if (lastPart.startsWith('@provider:')) {
                    return providerSuggestions;
                }
                else if (lastPart.startsWith('@capability:')) {
                    return SEARCH_SUGGESTIONS.CAPABILITIES;
                }
                else if (lastPart.startsWith('@visible:')) {
                    return SEARCH_SUGGESTIONS.VISIBILITY;
                }
                else if (lastPart.startsWith('@')) {
                    return allSuggestions;
                }
                return [];
            }
        }, placeholder, `chatModelsWidget:searchinput:${ChatModelsWidget_1.NUM_INSTANCES++}`, {
            placeholderText: placeholder,
            styleOverrides: {
                inputBorder: settingsTextInputBorder
            },
            focusContextKey: this.searchFocusContextKey,
        }));
        const filterAction = this._register(new ModelsFilterAction());
        const clearSearchAction = this._register(new Action('workbench.models.clearSearch', localize('clearSearch', "Clear Search"), ThemeIcon.asClassName(preferencesClearInputIcon), false, () => {
            this.searchWidget.setValue('');
            this.searchWidget.focus();
        }));
        const collapseAllAction = this._register(new Action('workbench.models.collapseAll', localize('collapseAll', "Collapse All"), ThemeIcon.asClassName(Codicon.collapseAll), false, () => {
            this.viewModel.collapseAll();
        }));
        collapseAllAction.enabled = this.viewModel.viewModelEntries.some(e => isVendorEntry(e) || isGroupEntry(e));
        this._register(this.viewModel.onDidChange(() => collapseAllAction.enabled = this.viewModel.viewModelEntries.some(e => isVendorEntry(e) || isGroupEntry(e))));
        this._register(this.searchWidget.onInputDidChange(() => {
            clearSearchAction.enabled = !!this.searchWidget.getValue();
            this.filterModels();
        }));
        this.searchActionsContainer = DOM.append(searchContainer, $('.models-search-actions'));
        const actions = [clearSearchAction, collapseAllAction, filterAction];
        const toolBar = this._register(new ToolBar(this.searchActionsContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === filterAction.id) {
                    return this.instantiationService.createInstance(ModelsSearchFilterDropdownMenuActionViewItem, action, options, this.searchWidget, this.viewModel);
                }
                return undefined;
            },
            getKeyBinding: () => undefined
        }));
        toolBar.setActions(actions);
        // Add padding to input box for toolbar
        this.searchWidget.inputWidget.getContainerDomNode().style.paddingRight = `${DOM.getTotalWidth(this.searchActionsContainer) + 12}px`;
        this.addButtonContainer = DOM.append(searchAndButtonContainer, $('.section-title-actions'));
        const buttonOptions = {
            ...defaultButtonStyles,
            supportIcons: true,
        };
        this.addButton = this._register(new Button(this.addButtonContainer, buttonOptions));
        this.addButton.label = `$(${Codicon.add.id}) ${localize('models.enableModelProvider', 'Add Models...')}`;
        this.addButton.element.classList.add('models-add-model-button');
        this.addButton.enabled = false;
        this._register(this.addButton.onDidClick((e) => {
            if (this.dropdownActions.length > 0) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => this.addButton.element,
                    getActions: () => this.dropdownActions,
                });
            }
        }));
        // Table container
        this.tableContainer = DOM.append(container, $('.models-table-container'));
        // Create table
        this.createTable();
        this._register(this.viewModel.onDidChangeGrouping(() => this.createTable()));
    }
    createTable() {
        this.tableDisposables.clear();
        DOM.clearNode(this.tableContainer);
        const gutterColumnRenderer = this.instantiationService.createInstance(GutterColumnRenderer, this.viewModel);
        const modelNameColumnRenderer = this.instantiationService.createInstance(ModelNameColumnRenderer);
        const costColumnRenderer = this.instantiationService.createInstance(MultiplierColumnRenderer);
        const tokenLimitsColumnRenderer = this.instantiationService.createInstance(TokenLimitsColumnRenderer);
        const capabilitiesColumnRenderer = this.instantiationService.createInstance(CapabilitiesColumnRenderer);
        const actionsColumnRenderer = this.instantiationService.createInstance(ActionsColumnRenderer, this.viewModel);
        const providerColumnRenderer = this.instantiationService.createInstance(ProviderColumnRenderer);
        this.tableDisposables.add(capabilitiesColumnRenderer.onDidClickCapability(capability => {
            const currentQuery = this.searchWidget.getValue();
            const query = `@capability:${capability}`;
            const newQuery = toggleFilter(currentQuery, query);
            this.searchWidget.setValue(newQuery);
            this.searchWidget.focus();
        }));
        const columns = [
            {
                label: '',
                tooltip: '',
                weight: 0.05,
                minimumWidth: 40,
                maximumWidth: 40,
                templateId: GutterColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('modelName', 'Name'),
                tooltip: '',
                weight: 0.35,
                minimumWidth: 200,
                templateId: ModelNameColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            }
        ];
        if (this.viewModel.groupBy === "visibility" /* ChatModelGroup.Visibility */) {
            columns.push({
                label: localize('provider', 'Provider'),
                tooltip: '',
                weight: 0.15,
                minimumWidth: 100,
                templateId: ProviderColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            });
        }
        columns.push({
            label: localize('tokenLimits', 'Context Size'),
            tooltip: '',
            weight: 0.1,
            minimumWidth: 140,
            templateId: TokenLimitsColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        }, {
            label: localize('capabilities', 'Capabilities'),
            tooltip: '',
            weight: 0.25,
            minimumWidth: 180,
            templateId: CapabilitiesColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        }, {
            label: localize('cost', 'Multiplier'),
            tooltip: '',
            weight: 0.05,
            minimumWidth: 60,
            templateId: MultiplierColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        }, {
            label: '',
            tooltip: '',
            weight: 0.05,
            minimumWidth: 64,
            maximumWidth: 64,
            templateId: ActionsColumnRenderer.TEMPLATE_ID,
            project(row) { return row; }
        });
        this.table = this.tableDisposables.add(this.instantiationService.createInstance(WorkbenchTable, 'ModelsWidget', this.tableContainer, new Delegate(), columns, [
            gutterColumnRenderer,
            modelNameColumnRenderer,
            costColumnRenderer,
            tokenLimitsColumnRenderer,
            capabilitiesColumnRenderer,
            actionsColumnRenderer,
            providerColumnRenderer
        ], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel: (e) => {
                    if (isVendorEntry(e)) {
                        return localize('vendor.ariaLabel', '{0} Models', e.vendorEntry.vendorDisplayName);
                    }
                    else if (isGroupEntry(e)) {
                        return e.id === 'visible' ? localize('visible.ariaLabel', 'Visible Models') : localize('hidden.ariaLabel', 'Hidden Models');
                    }
                    const ariaLabels = [];
                    ariaLabels.push(localize('model.name', '{0} from {1}', e.modelEntry.metadata.name, e.modelEntry.vendorDisplayName));
                    if (e.modelEntry.metadata.maxInputTokens && e.modelEntry.metadata.maxOutputTokens) {
                        ariaLabels.push(localize('model.contextSize', 'Context size: {0} input tokens and {1} output tokens', formatTokenCount(e.modelEntry.metadata.maxInputTokens), formatTokenCount(e.modelEntry.metadata.maxOutputTokens)));
                    }
                    if (e.modelEntry.metadata.capabilities) {
                        ariaLabels.push(localize('model.capabilities', 'Capabilities: {0}', Object.keys(e.modelEntry.metadata.capabilities).join(', ')));
                    }
                    const multiplierText = (e.modelEntry.metadata.detail && e.modelEntry.metadata.detail.trim().toLowerCase() !== e.modelEntry.vendor.trim().toLowerCase()) ? e.modelEntry.metadata.detail : '-';
                    if (multiplierText !== '-') {
                        ariaLabels.push(localize('multiplier.tooltip', "Every chat message counts {0} towards your premium model request quota", multiplierText));
                    }
                    if (e.modelEntry.metadata.isUserSelectable) {
                        ariaLabels.push(localize('model.visible', 'This model is visible in the chat model picker'));
                    }
                    else {
                        ariaLabels.push(localize('model.hidden', 'This model is hidden in the chat model picker'));
                    }
                    return ariaLabels.join('. ');
                },
                getWidgetAriaLabel: () => localize('modelsTable.ariaLabel', 'Language Models')
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: true,
            alwaysConsumeMouseWheel: false,
        }));
        this.tableDisposables.add(this.table.onContextMenu(e => {
            if (!e.element) {
                return;
            }
            const entry = e.element;
            if (isVendorEntry(entry) && entry.vendorEntry.managementCommand) {
                const actions = [
                    toAction({
                        id: 'manageVendor',
                        label: localize('models.manageProvider', 'Manage {0}...', entry.vendorEntry.vendorDisplayName),
                        run: async () => {
                            await this.commandService.executeCommand(entry.vendorEntry.managementCommand, entry.vendorEntry.vendor);
                            await this.viewModel.refresh();
                        }
                    })
                ];
                this.contextMenuService.showContextMenu({
                    getAnchor: () => e.anchor,
                    getActions: () => actions
                });
            }
        }));
        this.table.splice(0, this.table.length, this.viewModel.viewModelEntries);
        this.tableDisposables.add(this.viewModel.onDidChange(({ at, removed, added }) => {
            this.table.splice(at, removed, added);
            if (this.viewModel.selectedEntry) {
                const selectedEntryIndex = this.viewModel.viewModelEntries.indexOf(this.viewModel.selectedEntry);
                this.table.setFocus([selectedEntryIndex]);
                this.table.setSelection([selectedEntryIndex]);
            }
            const vendors = this.viewModel.getVendors();
            const configuredVendors = new Set(this.viewModel.getConfiguredVendors().map(cv => cv.vendor));
            const vendorsWithoutModels = vendors.filter(v => !configuredVendors.has(v.vendor));
            const hasPlan = this.chatEntitlementService.entitlement !== ChatEntitlement.Unknown && this.chatEntitlementService.entitlement !== ChatEntitlement.Available;
            this.addButton.enabled = hasPlan && vendorsWithoutModels.length > 0;
            this.dropdownActions = vendorsWithoutModels.map(vendor => toAction({
                id: `enable-${vendor.vendor}`,
                label: vendor.displayName,
                run: async () => {
                    await this.enableProvider(vendor.vendor);
                }
            }));
        }));
        this.tableDisposables.add(this.table.onDidOpen(async ({ element, browserEvent }) => {
            if (!element) {
                return;
            }
            if (isVendorEntry(element) || isGroupEntry(element)) {
                this.viewModel.toggleCollapsed(element);
            }
            else if (!DOM.isMouseEvent(browserEvent) || browserEvent.detail === 2) {
                this.viewModel.toggleVisibility(element);
            }
        }));
        this.tableDisposables.add(this.table.onDidChangeSelection(e => this.viewModel.selectedEntry = e.elements[0]));
        this.tableDisposables.add(this.table.onDidBlur(() => {
            if (this.viewModel.shouldRefilter()) {
                this.viewModel.filter(this.searchWidget.getValue());
            }
        }));
        this.layout(this.element.clientHeight, this.element.clientWidth);
    }
    filterModels() {
        this.delayedFiltering.trigger(() => {
            this.viewModel.filter(this.searchWidget.getValue());
        });
    }
    async enableProvider(vendorId) {
        await this.languageModelsService.selectLanguageModels({ vendor: vendorId }, true);
        await this.viewModel.refresh();
    }
    layout(height, width) {
        width = width - 24;
        this.searchWidget.layout(new DOM.Dimension(width - this.searchActionsContainer.clientWidth - this.addButtonContainer.clientWidth - 8, 22));
        const tableHeight = height - 40;
        this.tableContainer.style.height = `${tableHeight}px`;
        this.table.layout(tableHeight, width);
    }
    focusSearch() {
        this.searchWidget.focus();
    }
    search(filter) {
        this.focusSearch();
        this.searchWidget.setValue(filter);
    }
    clearSearch() {
        this.searchWidget.setValue('');
    }
    render() {
        if (this.viewModel.shouldRefilter()) {
            this.viewModel.filter(this.searchWidget.getValue());
        }
    }
};
ChatModelsWidget = ChatModelsWidget_1 = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, IInstantiationService),
    __param(2, IExtensionService),
    __param(3, IContextMenuService),
    __param(4, IChatEntitlementService),
    __param(5, IEditorProgressService),
    __param(6, ICommandService),
    __param(7, IContextKeyService)
], ChatModelsWidget);
export { ChatModelsWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsc1dpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdE1hbmFnZW1lbnQvY2hhdE1vZGVsc1dpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sRUFB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
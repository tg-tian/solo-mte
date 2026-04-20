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
import * as dom from '../../../../base/browser/dom.js';
import * as paths from '../../../../base/common/path.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ResourceMarkers, Marker, RelatedInformation, MarkerTableItem } from './markersModel.js';
import Messages from './messages.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { dispose, Disposable, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { QuickFixAction, QuickFixActionViewItem } from './markersViewActions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import { FilterOptions } from './markersFilterOptions.js';
import { Emitter } from '../../../../base/common/event.js';
import { isUndefinedOrNull } from '../../../../base/common/types.js';
import { Action, toAction } from '../../../../base/common/actions.js';
import { localize } from '../../../../nls.js';
import { createCancelablePromise, Delayer } from '../../../../base/common/async.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Range } from '../../../../editor/common/core/range.js';
import { applyCodeAction, ApplyCodeActionReason, getCodeActions } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind, CodeActionTriggerSource } from '../../../../editor/contrib/codeAction/common/types.js';
import { IEditorService, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MarkersContextKeys } from '../common/markers.js';
import { unsupportedSchemas } from '../../../../platform/markers/common/markerService.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import Severity from '../../../../base/common/severity.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let MarkersWidgetAccessibilityProvider = class MarkersWidgetAccessibilityProvider {
    constructor(labelService) {
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('problemsView', "Problems View");
    }
    getAriaLabel(element) {
        if (element instanceof ResourceMarkers) {
            const path = this.labelService.getUriLabel(element.resource, { relative: true }) || element.resource.fsPath;
            return Messages.MARKERS_TREE_ARIA_LABEL_RESOURCE(element.markers.length, element.name, paths.dirname(path));
        }
        if (element instanceof Marker || element instanceof MarkerTableItem) {
            return Messages.MARKERS_TREE_ARIA_LABEL_MARKER(element);
        }
        if (element instanceof RelatedInformation) {
            return Messages.MARKERS_TREE_ARIA_LABEL_RELATED_INFORMATION(element.raw);
        }
        return null;
    }
};
MarkersWidgetAccessibilityProvider = __decorate([
    __param(0, ILabelService)
], MarkersWidgetAccessibilityProvider);
export { MarkersWidgetAccessibilityProvider };
var TemplateId;
(function (TemplateId) {
    TemplateId["ResourceMarkers"] = "rm";
    TemplateId["Marker"] = "m";
    TemplateId["RelatedInformation"] = "ri";
})(TemplateId || (TemplateId = {}));
export class VirtualDelegate {
    static { this.LINE_HEIGHT = 22; }
    constructor(markersViewState) {
        this.markersViewState = markersViewState;
    }
    getHeight(element) {
        if (element instanceof Marker) {
            const viewModel = this.markersViewState.getViewModel(element);
            const noOfLines = !viewModel || viewModel.multiline ? element.lines.length : 1;
            return noOfLines * VirtualDelegate.LINE_HEIGHT;
        }
        return VirtualDelegate.LINE_HEIGHT;
    }
    getTemplateId(element) {
        if (element instanceof ResourceMarkers) {
            return "rm" /* TemplateId.ResourceMarkers */;
        }
        else if (element instanceof Marker) {
            return "m" /* TemplateId.Marker */;
        }
        else {
            return "ri" /* TemplateId.RelatedInformation */;
        }
    }
}
var FilterDataType;
(function (FilterDataType) {
    FilterDataType[FilterDataType["ResourceMarkers"] = 0] = "ResourceMarkers";
    FilterDataType[FilterDataType["Marker"] = 1] = "Marker";
    FilterDataType[FilterDataType["RelatedInformation"] = 2] = "RelatedInformation";
})(FilterDataType || (FilterDataType = {}));
export class ResourceMarkersRenderer {
    constructor(labels, onDidChangeRenderNodeCount) {
        this.labels = labels;
        this.renderedNodes = new Map();
        this.disposables = new DisposableStore();
        this.templateId = "rm" /* TemplateId.ResourceMarkers */;
        onDidChangeRenderNodeCount(this.onDidChangeRenderNodeCount, this, this.disposables);
    }
    renderTemplate(container) {
        const resourceLabelContainer = dom.append(container, dom.$('.resource-label-container'));
        const resourceLabel = this.labels.create(resourceLabelContainer, { supportHighlights: true });
        const badgeWrapper = dom.append(container, dom.$('.count-badge-wrapper'));
        const count = new CountBadge(badgeWrapper, {}, defaultCountBadgeStyles);
        return { count, resourceLabel };
    }
    renderElement(node, _, templateData) {
        const resourceMarkers = node.element;
        const uriMatches = node.filterData && node.filterData.uriMatches || [];
        templateData.resourceLabel.setFile(resourceMarkers.resource, { matches: uriMatches });
        this.updateCount(node, templateData);
        const nodeRenders = this.renderedNodes.get(resourceMarkers) ?? [];
        this.renderedNodes.set(resourceMarkers, [...nodeRenders, templateData]);
    }
    disposeElement(node, index, templateData) {
        const nodeRenders = this.renderedNodes.get(node.element) ?? [];
        const nodeRenderIndex = nodeRenders.findIndex(nodeRender => templateData === nodeRender);
        if (nodeRenderIndex < 0) {
            throw new Error('Disposing unknown resource marker');
        }
        if (nodeRenders.length === 1) {
            this.renderedNodes.delete(node.element);
        }
        else {
            nodeRenders.splice(nodeRenderIndex, 1);
        }
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.count.dispose();
    }
    onDidChangeRenderNodeCount(node) {
        const nodeRenders = this.renderedNodes.get(node.element);
        if (!nodeRenders) {
            return;
        }
        nodeRenders.forEach(nodeRender => this.updateCount(node, nodeRender));
    }
    updateCount(node, templateData) {
        templateData.count.setCount(node.children.reduce((r, n) => r + (n.visible ? 1 : 0), 0));
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class FileResourceMarkersRenderer extends ResourceMarkersRenderer {
}
let MarkerRenderer = class MarkerRenderer {
    constructor(markersViewState, hoverService, instantiationService, openerService) {
        this.markersViewState = markersViewState;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.templateId = "m" /* TemplateId.Marker */;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.markerWidget = new MarkerWidget(container, this.markersViewState, this.hoverService, this.openerService, this.instantiationService);
        return data;
    }
    renderElement(node, _, templateData) {
        templateData.markerWidget.render(node.element, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.markerWidget.dispose();
    }
};
MarkerRenderer = __decorate([
    __param(1, IHoverService),
    __param(2, IInstantiationService),
    __param(3, IOpenerService)
], MarkerRenderer);
export { MarkerRenderer };
const expandedIcon = registerIcon('markers-view-multi-line-expanded', Codicon.chevronUp, localize('expandedIcon', 'Icon indicating that multiple lines are shown in the markers view.'));
const collapsedIcon = registerIcon('markers-view-multi-line-collapsed', Codicon.chevronDown, localize('collapsedIcon', 'Icon indicating that multiple lines are collapsed in the markers view.'));
const toggleMultilineAction = 'problems.action.toggleMultiline';
class ToggleMultilineActionViewItem extends ActionViewItem {
    render(container) {
        super.render(container);
        this.updateExpandedAttribute();
    }
    updateClass() {
        super.updateClass();
        this.updateExpandedAttribute();
    }
    updateExpandedAttribute() {
        this.element?.setAttribute('aria-expanded', `${this._action.class === ThemeIcon.asClassName(expandedIcon)}`);
    }
}
class MarkerWidget extends Disposable {
    constructor(parent, markersViewModel, _hoverService, _openerService, _instantiationService) {
        super();
        this.parent = parent;
        this.markersViewModel = markersViewModel;
        this._hoverService = _hoverService;
        this._openerService = _openerService;
        this.disposables = this._register(new DisposableStore());
        this.actionBar = this._register(new ActionBar(dom.append(parent, dom.$('.actions')), {
            actionViewItemProvider: (action, options) => action.id === QuickFixAction.ID ? _instantiationService.createInstance(QuickFixActionViewItem, action, options) : undefined
        }));
        // wrap the icon in a container that get the icon color as foreground color. That way, if the
        // list view does not have a specific color for the icon (=the color variable is invalid) it
        // falls back to the foreground color of container (inherit)
        this.iconContainer = dom.append(parent, dom.$(''));
        this.icon = dom.append(this.iconContainer, dom.$(''));
        this.messageAndDetailsContainer = dom.append(parent, dom.$('.marker-message-details-container'));
        this.messageAndDetailsContainerHover = this._register(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.messageAndDetailsContainer, ''));
    }
    render(element, filterData) {
        this.actionBar.clear();
        this.disposables.clear();
        dom.clearNode(this.messageAndDetailsContainer);
        this.iconContainer.className = `marker-icon ${Severity.toString(MarkerSeverity.toSeverity(element.marker.severity))}`;
        this.icon.className = `codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(element.marker.severity))}`;
        this.renderQuickfixActionbar(element);
        this.renderMessageAndDetails(element, filterData);
        this.disposables.add(dom.addDisposableListener(this.parent, dom.EventType.MOUSE_OVER, () => this.markersViewModel.onMarkerMouseHover(element)));
        this.disposables.add(dom.addDisposableListener(this.parent, dom.EventType.MOUSE_LEAVE, () => this.markersViewModel.onMarkerMouseLeave(element)));
    }
    renderQuickfixActionbar(marker) {
        const viewModel = this.markersViewModel.getViewModel(marker);
        if (viewModel) {
            const quickFixAction = viewModel.quickFixAction;
            this.actionBar.push([quickFixAction], { icon: true, label: false });
            this.iconContainer.classList.toggle('quickFix', quickFixAction.enabled);
            quickFixAction.onDidChange(({ enabled }) => {
                if (!isUndefinedOrNull(enabled)) {
                    this.iconContainer.classList.toggle('quickFix', enabled);
                }
            }, this, this.disposables);
            quickFixAction.onShowQuickFixes(() => {
                const quickFixActionViewItem = this.actionBar.viewItems[0];
                if (quickFixActionViewItem) {
                    quickFixActionViewItem.showQuickFixes();
                }
            }, this, this.disposables);
        }
    }
    renderMultilineActionbar(marker, parent) {
        const multilineActionbar = this.disposables.add(new ActionBar(dom.append(parent, dom.$('.multiline-actions')), {
            actionViewItemProvider: (action, options) => {
                if (action.id === toggleMultilineAction) {
                    return new ToggleMultilineActionViewItem(undefined, action, { ...options, icon: true });
                }
                return undefined;
            }
        }));
        this.disposables.add(multilineActionbar);
        const viewModel = this.markersViewModel.getViewModel(marker);
        const multiline = viewModel && viewModel.multiline;
        const action = this.disposables.add(new Action(toggleMultilineAction));
        action.enabled = !!viewModel && marker.lines.length > 1;
        action.tooltip = multiline ? localize('single line', "Show message in single line") : localize('multi line', "Show message in multiple lines");
        action.class = ThemeIcon.asClassName(multiline ? expandedIcon : collapsedIcon);
        action.run = () => { if (viewModel) {
            viewModel.multiline = !viewModel.multiline;
        } return Promise.resolve(); };
        multilineActionbar.push([action], { icon: true, label: false });
    }
    renderMessageAndDetails(element, filterData) {
        const { marker, lines } = element;
        const viewState = this.markersViewModel.getViewModel(element);
        const multiline = !viewState || viewState.multiline;
        const lineMatches = filterData && filterData.lineMatches || [];
        this.messageAndDetailsContainerHover.update(element.marker.message);
        const lineElements = [];
        for (let index = 0; index < (multiline ? lines.length : 1); index++) {
            const lineElement = dom.append(this.messageAndDetailsContainer, dom.$('.marker-message-line'));
            const messageElement = dom.append(lineElement, dom.$('.marker-message'));
            const highlightedLabel = this.disposables.add(new HighlightedLabel(messageElement));
            highlightedLabel.set(lines[index].length > 1000 ? `${lines[index].substring(0, 1000)}...` : lines[index], lineMatches[index]);
            if (lines[index] === '') {
                lineElement.style.height = `${VirtualDelegate.LINE_HEIGHT}px`;
            }
            lineElements.push(lineElement);
        }
        this.renderDetails(marker, filterData, lineElements[0]);
        this.renderMultilineActionbar(element, lineElements[0]);
    }
    renderDetails(marker, filterData, parent) {
        parent.classList.add('details-container');
        if (marker.source || marker.code) {
            const source = this.disposables.add(new HighlightedLabel(dom.append(parent, dom.$('.marker-source'))));
            const sourceMatches = filterData && filterData.sourceMatches || [];
            source.set(marker.source, sourceMatches);
            if (marker.code) {
                if (typeof marker.code === 'string') {
                    const code = this.disposables.add(new HighlightedLabel(dom.append(parent, dom.$('.marker-code'))));
                    const codeMatches = filterData && filterData.codeMatches || [];
                    code.set(marker.code, codeMatches);
                }
                else {
                    const container = dom.$('.marker-code');
                    const code = this.disposables.add(new HighlightedLabel(container));
                    const link = marker.code.target.toString(true);
                    this.disposables.add(new Link(parent, { href: link, label: container, title: link }, undefined, this._hoverService, this._openerService));
                    const codeMatches = filterData && filterData.codeMatches || [];
                    code.set(marker.code.value, codeMatches);
                }
            }
        }
        const lnCol = dom.append(parent, dom.$('span.marker-line'));
        lnCol.textContent = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(marker.startLineNumber, marker.startColumn);
    }
}
let RelatedInformationRenderer = class RelatedInformationRenderer {
    constructor(labelService) {
        this.labelService = labelService;
        this.templateId = "ri" /* TemplateId.RelatedInformation */;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        dom.append(container, dom.$('.actions'));
        dom.append(container, dom.$('.icon'));
        data.resourceLabel = new HighlightedLabel(dom.append(container, dom.$('.related-info-resource')));
        data.lnCol = dom.append(container, dom.$('span.marker-line'));
        const separator = dom.append(container, dom.$('span.related-info-resource-separator'));
        separator.textContent = ':';
        separator.style.paddingRight = '4px';
        data.description = new HighlightedLabel(dom.append(container, dom.$('.marker-description')));
        return data;
    }
    renderElement(node, _, templateData) {
        const relatedInformation = node.element.raw;
        const uriMatches = node.filterData && node.filterData.uriMatches || [];
        const messageMatches = node.filterData && node.filterData.messageMatches || [];
        const resourceLabelTitle = this.labelService.getUriLabel(relatedInformation.resource, { relative: true });
        templateData.resourceLabel.set(basename(relatedInformation.resource), uriMatches, resourceLabelTitle);
        templateData.lnCol.textContent = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(relatedInformation.startLineNumber, relatedInformation.startColumn);
        templateData.description.set(relatedInformation.message, messageMatches, relatedInformation.message);
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.description.dispose();
    }
};
RelatedInformationRenderer = __decorate([
    __param(0, ILabelService)
], RelatedInformationRenderer);
export { RelatedInformationRenderer };
export class Filter {
    constructor(options) {
        this.options = options;
    }
    filter(element, parentVisibility) {
        if (element instanceof ResourceMarkers) {
            return this.filterResourceMarkers(element);
        }
        else if (element instanceof Marker) {
            return this.filterMarker(element, parentVisibility);
        }
        else {
            return this.filterRelatedInformation(element, parentVisibility);
        }
    }
    filterResourceMarkers(resourceMarkers) {
        if (unsupportedSchemas.has(resourceMarkers.resource.scheme)) {
            return false;
        }
        // Filter resource by pattern first (globs)
        // Excludes pattern
        if (this.options.excludesMatcher.matches(resourceMarkers.resource)) {
            return false;
        }
        // Includes pattern
        if (this.options.includesMatcher.matches(resourceMarkers.resource)) {
            return true;
        }
        // Fiter by text. Do not apply negated filters on resources instead use exclude patterns
        if (this.options.textFilter.text && !this.options.textFilter.negate) {
            const uriMatches = FilterOptions._filter(this.options.textFilter.text, basename(resourceMarkers.resource));
            if (uriMatches) {
                return { visibility: true, data: { type: 0 /* FilterDataType.ResourceMarkers */, uriMatches: uriMatches || [] } };
            }
        }
        return 2 /* TreeVisibility.Recurse */;
    }
    filterMarker(marker, parentVisibility) {
        const matchesSeverity = this.options.showErrors && MarkerSeverity.Error === marker.marker.severity ||
            this.options.showWarnings && MarkerSeverity.Warning === marker.marker.severity ||
            this.options.showInfos && MarkerSeverity.Info === marker.marker.severity;
        if (!matchesSeverity) {
            return false;
        }
        // Check source filters if present
        if (!this.options.matchesSourceFilters(marker.marker.source)) {
            return false;
        }
        if (!this.options.textFilter.text) {
            return true;
        }
        const lineMatches = [];
        for (const line of marker.lines) {
            const lineMatch = FilterOptions._messageFilter(this.options.textFilter.text, line);
            lineMatches.push(lineMatch || []);
        }
        const sourceMatches = marker.marker.source ? FilterOptions._filter(this.options.textFilter.text, marker.marker.source) : undefined;
        const codeMatches = marker.marker.code ? FilterOptions._filter(this.options.textFilter.text, typeof marker.marker.code === 'string' ? marker.marker.code : marker.marker.code.value) : undefined;
        const matched = sourceMatches || codeMatches || lineMatches.some(lineMatch => lineMatch.length > 0);
        // Matched and not negated
        if (matched && !this.options.textFilter.negate) {
            return { visibility: true, data: { type: 1 /* FilterDataType.Marker */, lineMatches, sourceMatches: sourceMatches || [], codeMatches: codeMatches || [] } };
        }
        // Matched and negated - exclude it only if parent visibility is not set
        if (matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return false;
        }
        // Not matched and negated - include it only if parent visibility is not set
        if (!matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return true;
        }
        return parentVisibility;
    }
    filterRelatedInformation(relatedInformation, parentVisibility) {
        if (!this.options.textFilter.text) {
            return true;
        }
        const uriMatches = FilterOptions._filter(this.options.textFilter.text, basename(relatedInformation.raw.resource));
        const messageMatches = FilterOptions._messageFilter(this.options.textFilter.text, paths.basename(relatedInformation.raw.message));
        const matched = uriMatches || messageMatches;
        // Matched and not negated
        if (matched && !this.options.textFilter.negate) {
            return { visibility: true, data: { type: 2 /* FilterDataType.RelatedInformation */, uriMatches: uriMatches || [], messageMatches: messageMatches || [] } };
        }
        // Matched and negated - exclude it only if parent visibility is not set
        if (matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return false;
        }
        // Not matched and negated - include it only if parent visibility is not set
        if (!matched && this.options.textFilter.negate && parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return true;
        }
        return parentVisibility;
    }
}
let MarkerViewModel = class MarkerViewModel extends Disposable {
    constructor(marker, modelService, instantiationService, editorService, languageFeaturesService) {
        super();
        this.marker = marker;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.languageFeaturesService = languageFeaturesService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.modelPromise = null;
        this.codeActionsPromise = null;
        this._multiline = true;
        this._quickFixAction = null;
        this._register(toDisposable(() => {
            if (this.modelPromise) {
                this.modelPromise.cancel();
            }
            if (this.codeActionsPromise) {
                this.codeActionsPromise.cancel();
            }
        }));
    }
    get multiline() {
        return this._multiline;
    }
    set multiline(value) {
        if (this._multiline !== value) {
            this._multiline = value;
            this._onDidChange.fire();
        }
    }
    get quickFixAction() {
        if (!this._quickFixAction) {
            this._quickFixAction = this._register(this.instantiationService.createInstance(QuickFixAction, this.marker));
        }
        return this._quickFixAction;
    }
    showLightBulb() {
        this.setQuickFixes(true);
    }
    async setQuickFixes(waitForModel) {
        const codeActions = await this.getCodeActions(waitForModel);
        this.quickFixAction.quickFixes = codeActions ? this.toActions(codeActions) : [];
        this.quickFixAction.autoFixable(!!codeActions && codeActions.hasAutoFix);
    }
    getCodeActions(waitForModel) {
        if (this.codeActionsPromise !== null) {
            return this.codeActionsPromise;
        }
        return this.getModel(waitForModel)
            .then(model => {
            if (model) {
                if (!this.codeActionsPromise) {
                    this.codeActionsPromise = createCancelablePromise(cancellationToken => {
                        return getCodeActions(this.languageFeaturesService.codeActionProvider, model, new Range(this.marker.range.startLineNumber, this.marker.range.startColumn, this.marker.range.endLineNumber, this.marker.range.endColumn), {
                            type: 1 /* CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.ProblemsView, filter: { include: CodeActionKind.QuickFix }
                        }, Progress.None, cancellationToken).then(actions => {
                            return this._register(actions);
                        });
                    });
                }
                return this.codeActionsPromise;
            }
            return null;
        });
    }
    toActions(codeActions) {
        return codeActions.validActions.map(item => toAction({
            id: item.action.command ? item.action.command.id : item.action.title,
            label: item.action.title,
            run: async () => {
                await this.openFileAtMarker(this.marker);
                return await this.instantiationService.invokeFunction(applyCodeAction, item, ApplyCodeActionReason.FromProblemsView);
            }
        }));
    }
    openFileAtMarker(element) {
        const { resource, selection } = { resource: element.resource, selection: element.range };
        return this.editorService.openEditor({
            resource,
            options: {
                selection,
                preserveFocus: true,
                pinned: false,
                revealIfVisible: true
            },
        }, ACTIVE_GROUP).then(() => undefined);
    }
    getModel(waitForModel) {
        const model = this.modelService.getModel(this.marker.resource);
        if (model) {
            return Promise.resolve(model);
        }
        if (waitForModel) {
            if (!this.modelPromise) {
                this.modelPromise = createCancelablePromise(cancellationToken => {
                    return new Promise((c) => {
                        this._register(this.modelService.onModelAdded(model => {
                            if (isEqual(model.uri, this.marker.resource)) {
                                c(model);
                            }
                        }));
                    });
                });
            }
            return this.modelPromise;
        }
        return Promise.resolve(null);
    }
};
MarkerViewModel = __decorate([
    __param(1, IModelService),
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, ILanguageFeaturesService)
], MarkerViewModel);
export { MarkerViewModel };
let MarkersViewModel = class MarkersViewModel extends Disposable {
    constructor(multiline = true, viewMode = "tree" /* MarkersViewMode.Tree */, contextKeyService, instantiationService) {
        super();
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeViewMode = this._register(new Emitter());
        this.onDidChangeViewMode = this._onDidChangeViewMode.event;
        this.markersViewStates = new Map();
        this.markersPerResource = new Map();
        this.bulkUpdate = false;
        this.hoveredMarker = null;
        this.hoverDelayer = new Delayer(300);
        this._multiline = true;
        this._viewMode = "tree" /* MarkersViewMode.Tree */;
        this._multiline = multiline;
        this._viewMode = viewMode;
        this.viewModeContextKey = MarkersContextKeys.MarkersViewModeContextKey.bindTo(this.contextKeyService);
        this.viewModeContextKey.set(viewMode);
    }
    add(marker) {
        if (!this.markersViewStates.has(marker.id)) {
            const viewModel = this.instantiationService.createInstance(MarkerViewModel, marker);
            const disposables = [viewModel];
            viewModel.multiline = this.multiline;
            viewModel.onDidChange(() => {
                if (!this.bulkUpdate) {
                    this._onDidChange.fire(marker);
                }
            }, this, disposables);
            this.markersViewStates.set(marker.id, { viewModel, disposables });
            const markers = this.markersPerResource.get(marker.resource.toString()) || [];
            markers.push(marker);
            this.markersPerResource.set(marker.resource.toString(), markers);
        }
    }
    remove(resource) {
        const markers = this.markersPerResource.get(resource.toString()) || [];
        for (const marker of markers) {
            const value = this.markersViewStates.get(marker.id);
            if (value) {
                dispose(value.disposables);
            }
            this.markersViewStates.delete(marker.id);
            if (this.hoveredMarker === marker) {
                this.hoveredMarker = null;
            }
        }
        this.markersPerResource.delete(resource.toString());
    }
    getViewModel(marker) {
        const value = this.markersViewStates.get(marker.id);
        return value ? value.viewModel : null;
    }
    onMarkerMouseHover(marker) {
        this.hoveredMarker = marker;
        this.hoverDelayer.trigger(() => {
            if (this.hoveredMarker) {
                const model = this.getViewModel(this.hoveredMarker);
                if (model) {
                    model.showLightBulb();
                }
            }
        });
    }
    onMarkerMouseLeave(marker) {
        if (this.hoveredMarker === marker) {
            this.hoveredMarker = null;
        }
    }
    get multiline() {
        return this._multiline;
    }
    set multiline(value) {
        let changed = false;
        if (this._multiline !== value) {
            this._multiline = value;
            changed = true;
        }
        this.bulkUpdate = true;
        this.markersViewStates.forEach(({ viewModel }) => {
            if (viewModel.multiline !== value) {
                viewModel.multiline = value;
                changed = true;
            }
        });
        this.bulkUpdate = false;
        if (changed) {
            this._onDidChange.fire(undefined);
        }
    }
    get viewMode() {
        return this._viewMode;
    }
    set viewMode(value) {
        if (this._viewMode === value) {
            return;
        }
        this._viewMode = value;
        this._onDidChangeViewMode.fire(value);
        this.viewModeContextKey.set(value);
    }
    dispose() {
        this.markersViewStates.forEach(({ disposables }) => dispose(disposables));
        this.markersViewStates.clear();
        this.markersPerResource.clear();
        super.dispose();
    }
};
MarkersViewModel = __decorate([
    __param(2, IContextKeyService),
    __param(3, IInstantiationService)
], MarkersViewModel);
export { MarkersViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1RyZWVWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNUcmVlVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDcEcsT0FBTyxFQUFXLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFpQixlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoSCxPQUFPLFFBQVEsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBZSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2SCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSxh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
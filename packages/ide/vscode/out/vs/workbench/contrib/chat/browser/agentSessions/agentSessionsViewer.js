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
var AgentSessionRenderer_1, AgentSessionSectionRenderer_1;
import './media/agentsessionsviewer.css';
import { h } from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { getAgentChangesSummary, hasValidDiff, isAgentSession, isAgentSessionSection, isAgentSessionsModel, isSessionInProgressStatus } from './agentSessionsModel.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { allowedChatMarkdownHtmlTags } from '../chatContentMarkdownRenderer.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IntervalTimer } from '../../../../../base/common/async.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
let AgentSessionRenderer = class AgentSessionRenderer {
    static { AgentSessionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'agent-session'; }
    constructor(options, markdownRendererService, productService, hoverService, instantiationService, contextKeyService) {
        this.options = options;
        this.markdownRendererService = markdownRendererService;
        this.productService = productService;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = AgentSessionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposable = disposables.add(new DisposableStore());
        const elements = h('div.agent-session-item@item', [
            h('div.agent-session-icon-col', [
                h('div.agent-session-icon@icon')
            ]),
            h('div.agent-session-main-col', [
                h('div.agent-session-title-row', [
                    h('div.agent-session-title@title'),
                    h('div.agent-session-title-toolbar@titleToolbar'),
                ]),
                h('div.agent-session-details-row', [
                    h('div.agent-session-diff-container@diffContainer', [
                        h('span.agent-session-diff-files@filesSpan'),
                        h('span.agent-session-diff-added@addedSpan'),
                        h('span.agent-session-diff-removed@removedSpan')
                    ]),
                    h('div.agent-session-badge@badge'),
                    h('div.agent-session-description@description'),
                    h('div.agent-session-status@status')
                ])
            ])
        ]);
        const contextKeyService = disposables.add(this.contextKeyService.createScoped(elements.item));
        const scopedInstantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const titleToolbar = disposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, elements.titleToolbar, MenuId.AgentSessionItemToolbar, {
            menuOptions: { shouldForwardArgs: true },
        }));
        container.appendChild(elements.item);
        return {
            element: elements.item,
            icon: elements.icon,
            title: disposables.add(new IconLabel(elements.title, { supportHighlights: true, supportIcons: true })),
            titleToolbar,
            diffContainer: elements.diffContainer,
            diffFilesSpan: elements.filesSpan,
            diffAddedSpan: elements.addedSpan,
            diffRemovedSpan: elements.removedSpan,
            badge: elements.badge,
            description: elements.description,
            status: elements.status,
            contextKeyService,
            elementDisposable,
            disposables
        };
    }
    renderElement(session, index, template, details) {
        // Clear old state
        template.elementDisposable.clear();
        template.diffFilesSpan.textContent = '';
        template.diffAddedSpan.textContent = '';
        template.diffRemovedSpan.textContent = '';
        template.badge.textContent = '';
        template.description.textContent = '';
        // Archived
        template.element.classList.toggle('archived', session.element.isArchived());
        // Icon
        template.icon.className = `agent-session-icon ${ThemeIcon.asClassName(this.getIcon(session.element))}`;
        // Title
        const markdownTitle = new MarkdownString(session.element.label);
        template.title.setLabel(renderAsPlaintext(markdownTitle), undefined, { matches: createMatches(session.filterData) });
        // Title Actions - Update context keys
        ChatContextKeys.isArchivedAgentSession.bindTo(template.contextKeyService).set(session.element.isArchived());
        ChatContextKeys.isReadAgentSession.bindTo(template.contextKeyService).set(session.element.isRead());
        ChatContextKeys.agentSessionType.bindTo(template.contextKeyService).set(session.element.providerType);
        template.titleToolbar.context = session.element;
        // Diff information
        let hasDiff = false;
        const { changes: diff } = session.element;
        if (!isSessionInProgressStatus(session.element.status) && diff && hasValidDiff(diff)) {
            if (this.renderDiff(session, template)) {
                hasDiff = true;
            }
        }
        template.diffContainer.classList.toggle('has-diff', hasDiff);
        // Badge
        let hasBadge = false;
        if (!isSessionInProgressStatus(session.element.status)) {
            hasBadge = this.renderBadge(session, template);
        }
        template.badge.classList.toggle('has-badge', hasBadge);
        // Description (unless diff is shown)
        if (!hasDiff) {
            this.renderDescription(session, template, hasBadge);
        }
        // Status
        this.renderStatus(session, template);
        // Hover
        this.renderHover(session, template);
    }
    renderBadge(session, template) {
        const badge = session.element.badge;
        if (badge) {
            this.renderMarkdownOrText(badge, template.badge, template.elementDisposable);
        }
        return !!badge;
    }
    renderMarkdownOrText(content, container, disposables) {
        if (typeof content === 'string') {
            container.textContent = content;
        }
        else {
            disposables.add(this.markdownRendererService.render(content, {
                sanitizerConfig: {
                    replaceWithPlaintext: true,
                    allowedTags: {
                        override: allowedChatMarkdownHtmlTags,
                    },
                    allowedLinkSchemes: { augment: [this.productService.urlProtocol] }
                },
            }, container));
        }
    }
    renderDiff(session, template) {
        const diff = getAgentChangesSummary(session.element.changes);
        if (!diff) {
            return false;
        }
        if (diff.files > 0) {
            template.diffFilesSpan.textContent = diff.files === 1 ? localize('diffFile', "1 file") : localize('diffFiles', "{0} files", diff.files);
        }
        if (diff.insertions >= 0 /* render even `0` for more homogeneity */) {
            template.diffAddedSpan.textContent = `+${diff.insertions}`;
        }
        if (diff.deletions >= 0 /* render even `0` for more homogeneity */) {
            template.diffRemovedSpan.textContent = `-${diff.deletions}`;
        }
        return true;
    }
    getIcon(session) {
        if (session.status === 2 /* AgentSessionStatus.InProgress */) {
            return Codicon.sessionInProgress;
        }
        if (session.status === 3 /* AgentSessionStatus.NeedsInput */) {
            return Codicon.report;
        }
        if (session.status === 0 /* AgentSessionStatus.Failed */) {
            return Codicon.error;
        }
        if (!session.isRead() && !session.isArchived()) {
            return Codicon.circleFilled;
        }
        return Codicon.circleSmallFilled;
    }
    renderDescription(session, template, hasBadge) {
        const description = session.element.description;
        if (description) {
            this.renderMarkdownOrText(description, template.description, template.elementDisposable);
        }
        // Fallback to state label
        else {
            if (session.element.status === 2 /* AgentSessionStatus.InProgress */) {
                template.description.textContent = localize('chat.session.status.inProgress', "Working...");
            }
            else if (session.element.status === 3 /* AgentSessionStatus.NeedsInput */) {
                template.description.textContent = localize('chat.session.status.needsInput', "Input needed.");
            }
            else if (hasBadge && session.element.status === 1 /* AgentSessionStatus.Completed */) {
                template.description.textContent = ''; // no description if completed and has badge
            }
            else if (session.element.timing.finishedOrFailedTime &&
                session.element.timing.inProgressTime &&
                session.element.timing.finishedOrFailedTime > session.element.timing.inProgressTime) {
                const duration = this.toDuration(session.element.timing.inProgressTime, session.element.timing.finishedOrFailedTime, false);
                template.description.textContent = session.element.status === 0 /* AgentSessionStatus.Failed */ ?
                    localize('chat.session.status.failedAfter', "Failed after {0}.", duration ?? '1s') :
                    localize('chat.session.status.completedAfter', "Completed in {0}.", duration ?? '1s');
            }
            else {
                template.description.textContent = session.element.status === 0 /* AgentSessionStatus.Failed */ ?
                    localize('chat.session.status.failed', "Failed") :
                    localize('chat.session.status.completed', "Completed");
            }
        }
    }
    toDuration(startTime, endTime, useFullTimeWords) {
        const elapsed = Math.round((endTime - startTime) / 1000) * 1000;
        if (elapsed < 1000) {
            return undefined;
        }
        return getDurationString(elapsed, useFullTimeWords);
    }
    renderStatus(session, template) {
        const getStatus = (session) => {
            let timeLabel;
            if (session.status === 2 /* AgentSessionStatus.InProgress */ && session.timing.inProgressTime) {
                timeLabel = this.toDuration(session.timing.inProgressTime, Date.now(), false);
            }
            if (!timeLabel) {
                timeLabel = fromNow(session.timing.endTime || session.timing.startTime);
            }
            return `${session.providerLabel} • ${timeLabel}`;
        };
        template.status.textContent = getStatus(session.element);
        const timer = template.elementDisposable.add(new IntervalTimer());
        timer.cancelAndSet(() => template.status.textContent = getStatus(session.element), session.element.status === 2 /* AgentSessionStatus.InProgress */ ? 1000 /* every second */ : 60 * 1000 /* every minute */);
    }
    renderHover(session, template) {
        template.elementDisposable.add(this.hoverService.setupDelayedHover(template.element, () => ({
            content: this.buildTooltip(session.element),
            style: 1 /* HoverStyle.Pointer */,
            position: {
                hoverPosition: this.options.getHoverPosition()
            }
        }), { groupId: 'agent.sessions' }));
    }
    buildTooltip(session) {
        const lines = [];
        // Title
        lines.push(`**${session.label}**`);
        // Tooltip (from provider)
        if (session.tooltip) {
            const tooltip = typeof session.tooltip === 'string' ? session.tooltip : session.tooltip.value;
            lines.push(tooltip);
        }
        else {
            // Description
            if (session.description) {
                const description = typeof session.description === 'string' ? session.description : session.description.value;
                lines.push(description);
            }
            // Badge
            if (session.badge) {
                const badge = typeof session.badge === 'string' ? session.badge : session.badge.value;
                lines.push(badge);
            }
        }
        // Details line: Status • Provider • Duration/Time
        const details = [];
        // Status
        details.push(toStatusLabel(session.status));
        // Provider
        details.push(session.providerLabel);
        // Duration or start time
        if (session.timing.finishedOrFailedTime && session.timing.inProgressTime) {
            const duration = this.toDuration(session.timing.inProgressTime, session.timing.finishedOrFailedTime, true);
            if (duration) {
                details.push(duration);
            }
        }
        else {
            details.push(fromNow(session.timing.startTime, true, true));
        }
        lines.push(details.join(' • '));
        // Diff information
        const diff = getAgentChangesSummary(session.changes);
        if (diff && hasValidDiff(session.changes)) {
            const diffParts = [];
            if (diff.files > 0) {
                diffParts.push(diff.files === 1 ? localize('tooltip.file', "1 file") : localize('tooltip.files', "{0} files", diff.files));
            }
            if (diff.insertions > 0) {
                diffParts.push(`+${diff.insertions}`);
            }
            if (diff.deletions > 0) {
                diffParts.push(`-${diff.deletions}`);
            }
            if (diffParts.length > 0) {
                lines.push(`$(diff) ${diffParts.join(', ')}`);
            }
        }
        // Archived status
        if (session.isArchived()) {
            lines.push(`$(archive) ${localize('tooltip.archived', "Archived")}`);
        }
        return new MarkdownString(lines.join('\n\n'), { supportThemeIcons: true });
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since session is incompressible');
    }
    disposeElement(element, index, template, details) {
        template.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
AgentSessionRenderer = AgentSessionRenderer_1 = __decorate([
    __param(1, IMarkdownRendererService),
    __param(2, IProductService),
    __param(3, IHoverService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], AgentSessionRenderer);
export { AgentSessionRenderer };
function toStatusLabel(status) {
    let statusLabel;
    switch (status) {
        case 3 /* AgentSessionStatus.NeedsInput */:
            statusLabel = localize('agentSessionNeedsInput', "Needs Input");
            break;
        case 2 /* AgentSessionStatus.InProgress */:
            statusLabel = localize('agentSessionInProgress', "In Progress");
            break;
        case 0 /* AgentSessionStatus.Failed */:
            statusLabel = localize('agentSessionFailed', "Failed");
            break;
        default:
            statusLabel = localize('agentSessionCompleted', "Completed");
    }
    return statusLabel;
}
let AgentSessionSectionRenderer = class AgentSessionSectionRenderer {
    static { AgentSessionSectionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'agent-session-section'; }
    constructor(instantiationService, contextKeyService) {
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = AgentSessionSectionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elements = h('div.agent-session-section@container', [
            h('span.agent-session-section-label@label'),
            h('div.agent-session-section-toolbar@toolbar')
        ]);
        const contextKeyService = disposables.add(this.contextKeyService.createScoped(elements.container));
        const scopedInstantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const toolbar = disposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, elements.toolbar, MenuId.AgentSessionSectionToolbar, {
            menuOptions: { shouldForwardArgs: true },
        }));
        container.appendChild(elements.container);
        return {
            container: elements.container,
            label: elements.label,
            toolbar,
            contextKeyService,
            disposables
        };
    }
    renderElement(element, index, template, details) {
        // Label
        template.label.textContent = element.element.label;
        // Toolbar
        ChatContextKeys.agentSessionSection.bindTo(template.contextKeyService).set(element.element.section);
        template.toolbar.context = element.element;
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since section header is incompressible');
    }
    disposeElement(element, index, template, details) {
        // noop
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
AgentSessionSectionRenderer = AgentSessionSectionRenderer_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService)
], AgentSessionSectionRenderer);
export { AgentSessionSectionRenderer };
//#endregion
export class AgentSessionsListDelegate {
    static { this.ITEM_HEIGHT = 52; }
    static { this.SECTION_HEIGHT = 26; }
    getHeight(element) {
        if (isAgentSessionSection(element)) {
            return AgentSessionsListDelegate.SECTION_HEIGHT;
        }
        return AgentSessionsListDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (isAgentSessionSection(element)) {
            return AgentSessionSectionRenderer.TEMPLATE_ID;
        }
        return AgentSessionRenderer.TEMPLATE_ID;
    }
}
export class AgentSessionsAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('agentSessions', "Agent Sessions");
    }
    getAriaLabel(element) {
        if (isAgentSessionSection(element)) {
            return localize('agentSessionSectionAriaLabel', "{0} sessions section", element.label);
        }
        return localize('agentSessionItemAriaLabel', "{0} session {1} ({2}), created {3}", element.providerLabel, element.label, toStatusLabel(element.status), new Date(element.timing.startTime).toLocaleString());
    }
}
export class AgentSessionsDataSource {
    constructor(filter, sorter) {
        this.filter = filter;
        this.sorter = sorter;
    }
    hasChildren(element) {
        // Sessions model
        if (isAgentSessionsModel(element)) {
            return true;
        }
        // Sessions	section
        else if (isAgentSessionSection(element)) {
            return element.sessions.length > 0;
        }
        // Session element
        else {
            return false;
        }
    }
    getChildren(element) {
        // Sessions model
        if (isAgentSessionsModel(element)) {
            // Apply filter if configured
            let filteredSessions = element.sessions.filter(session => !this.filter?.exclude(session));
            // Apply sorter unless we group into sections or we are to limit results
            const limitResultsCount = this.filter?.limitResults?.();
            if (!this.filter?.groupResults?.() || typeof limitResultsCount === 'number') {
                filteredSessions.sort(this.sorter.compare.bind(this.sorter));
            }
            // Apply limiter if configured (requires sorting)
            if (typeof limitResultsCount === 'number') {
                filteredSessions = filteredSessions.slice(0, limitResultsCount);
            }
            // Callback results count
            this.filter?.notifyResults?.(filteredSessions.length);
            // Group sessions into sections if enabled
            if (this.filter?.groupResults?.()) {
                return this.groupSessionsIntoSections(filteredSessions);
            }
            // Otherwise return flat sorted list
            return filteredSessions;
        }
        // Sessions	section
        else if (isAgentSessionSection(element)) {
            return element.sessions;
        }
        // Session element
        else {
            return [];
        }
    }
    groupSessionsIntoSections(sessions) {
        const result = [];
        const sortedSessions = sessions.sort(this.sorter.compare.bind(this.sorter));
        const groupedSessions = groupAgentSessions(sortedSessions);
        for (const { sessions, section, label } of groupedSessions.values()) {
            if (sessions.length === 0) {
                continue;
            }
            result.push({ section, label, sessions });
        }
        return result;
    }
}
const DAY_THRESHOLD = 24 * 60 * 60 * 1000;
const WEEK_THRESHOLD = 7 * DAY_THRESHOLD;
export const AgentSessionSectionLabels = {
    ["inProgress" /* AgentSessionSection.InProgress */]: localize('agentSessions.inProgressSection', "In Progress"),
    ["today" /* AgentSessionSection.Today */]: localize('agentSessions.todaySection', "Today"),
    ["yesterday" /* AgentSessionSection.Yesterday */]: localize('agentSessions.yesterdaySection', "Yesterday"),
    ["week" /* AgentSessionSection.Week */]: localize('agentSessions.weekSection', "Last Week"),
    ["older" /* AgentSessionSection.Older */]: localize('agentSessions.olderSection', "Older"),
    ["archived" /* AgentSessionSection.Archived */]: localize('agentSessions.archivedSection', "Archived"),
};
export function groupAgentSessions(sessions) {
    const now = Date.now();
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - DAY_THRESHOLD;
    const weekThreshold = now - WEEK_THRESHOLD;
    const inProgressSessions = [];
    const todaySessions = [];
    const yesterdaySessions = [];
    const weekSessions = [];
    const olderSessions = [];
    const archivedSessions = [];
    for (const session of sessions) {
        if (isSessionInProgressStatus(session.status)) {
            inProgressSessions.push(session);
        }
        else if (session.isArchived()) {
            archivedSessions.push(session);
        }
        else {
            const sessionTime = session.timing.endTime || session.timing.startTime;
            if (sessionTime >= startOfToday) {
                todaySessions.push(session);
            }
            else if (sessionTime >= startOfYesterday) {
                yesterdaySessions.push(session);
            }
            else if (sessionTime >= weekThreshold) {
                weekSessions.push(session);
            }
            else {
                olderSessions.push(session);
            }
        }
    }
    return new Map([
        ["inProgress" /* AgentSessionSection.InProgress */, { section: "inProgress" /* AgentSessionSection.InProgress */, label: AgentSessionSectionLabels["inProgress" /* AgentSessionSection.InProgress */], sessions: inProgressSessions }],
        ["today" /* AgentSessionSection.Today */, { section: "today" /* AgentSessionSection.Today */, label: AgentSessionSectionLabels["today" /* AgentSessionSection.Today */], sessions: todaySessions }],
        ["yesterday" /* AgentSessionSection.Yesterday */, { section: "yesterday" /* AgentSessionSection.Yesterday */, label: AgentSessionSectionLabels["yesterday" /* AgentSessionSection.Yesterday */], sessions: yesterdaySessions }],
        ["week" /* AgentSessionSection.Week */, { section: "week" /* AgentSessionSection.Week */, label: AgentSessionSectionLabels["week" /* AgentSessionSection.Week */], sessions: weekSessions }],
        ["older" /* AgentSessionSection.Older */, { section: "older" /* AgentSessionSection.Older */, label: AgentSessionSectionLabels["older" /* AgentSessionSection.Older */], sessions: olderSessions }],
        ["archived" /* AgentSessionSection.Archived */, { section: "archived" /* AgentSessionSection.Archived */, label: AgentSessionSectionLabels["archived" /* AgentSessionSection.Archived */], sessions: archivedSessions }],
    ]);
}
export class AgentSessionsIdentityProvider {
    getId(element) {
        if (isAgentSessionSection(element)) {
            return `section-${element.section}`;
        }
        if (isAgentSession(element)) {
            return element.resource.toString();
        }
        return 'agent-sessions-id';
    }
}
export class AgentSessionsCompressionDelegate {
    isIncompressible(element) {
        return true;
    }
}
export class AgentSessionsSorter {
    constructor(options) {
        this.options = options;
    }
    compare(sessionA, sessionB) {
        // Input Needed
        const aNeedsInput = sessionA.status === 3 /* AgentSessionStatus.NeedsInput */;
        const bNeedsInput = sessionB.status === 3 /* AgentSessionStatus.NeedsInput */;
        if (aNeedsInput && !bNeedsInput) {
            return -1; // a (needs input) comes before b (other)
        }
        if (!aNeedsInput && bNeedsInput) {
            return 1; // a (other) comes after b (needs input)
        }
        // In Progress
        const aInProgress = sessionA.status === 2 /* AgentSessionStatus.InProgress */;
        const bInProgress = sessionB.status === 2 /* AgentSessionStatus.InProgress */;
        if (aInProgress && !bInProgress) {
            return -1; // a (in-progress) comes before b (finished)
        }
        if (!aInProgress && bInProgress) {
            return 1; // a (finished) comes after b (in-progress)
        }
        // Archived
        const aArchived = sessionA.isArchived();
        const bArchived = sessionB.isArchived();
        if (!aArchived && bArchived) {
            return -1; // a (non-archived) comes before b (archived)
        }
        if (aArchived && !bArchived) {
            return 1; // a (archived) comes after b (non-archived)
        }
        // Before we compare by time, allow override
        const override = this.options?.overrideCompare?.(sessionA, sessionB);
        if (typeof override === 'number') {
            return override;
        }
        //Sort by end or start time (most recent first)
        return (sessionB.timing.endTime || sessionB.timing.startTime) - (sessionA.timing.endTime || sessionA.timing.startTime);
    }
}
export class AgentSessionsKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (isAgentSessionSection(element)) {
            return element.label;
        }
        return element.label;
    }
    getCompressedNodeKeyboardNavigationLabel(elements) {
        return undefined; // not enabled
    }
}
let AgentSessionsDragAndDrop = class AgentSessionsDragAndDrop extends Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
    }
    onDragStart(data, originalEvent) {
        const elements = data.getData().filter(e => isAgentSession(e));
        const uris = coalesce(elements.map(e => e.resource));
        this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, uris, originalEvent));
    }
    getDragURI(element) {
        if (isAgentSessionSection(element)) {
            return null; // section headers are not draggable
        }
        return element.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        const sessions = elements.filter(e => isAgentSession(e));
        if (sessions.length === 1) {
            return sessions[0].label;
        }
        return localize('agentSessions.dragLabel', "{0} agent sessions", sessions.length);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return false;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
};
AgentSessionsDragAndDrop = __decorate([
    __param(0, IInstantiationService)
], AgentSessionsDragAndDrop);
export { AgentSessionsDragAndDrop };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFPakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRyxPQUFPLEVBQTJDLHNCQUFzQixFQUFFLFlBQVksRUFBNEQsY0FBYyxFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDMVEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FB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
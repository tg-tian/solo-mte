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
import { $, append, EventType, addDisposableListener, EventHelper, disposableWindowInterval, getWindow } from '../../../../../base/browser/dom.js';
import { Gesture, EventType as TouchEventType } from '../../../../../base/browser/touch.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Checkbox } from '../../../../../base/browser/ui/toggle/toggle.js';
import { toAction } from '../../../../../base/common/actions.js';
import { cancelOnDispose } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { safeIntl } from '../../../../../base/common/date.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { MutableDisposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { parseLinkedText } from '../../../../../base/common/linkedText.js';
import { language } from '../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isObject } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { IInlineCompletionsService } from '../../../../../editor/browser/services/inlineCompletionsService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IHoverService, nativeHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { Link } from '../../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles, defaultCheckboxStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { DomWidget } from '../../../../../platform/domWidget/browser/domWidget.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IChatEntitlementService, ChatEntitlement } from '../../../../services/chat/common/chatEntitlementService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { isNewUser, isCompletionsEnabled } from './chatStatus.js';
import { IChatStatusItemService } from './chatStatusItemService.js';
import product from '../../../../../platform/product/common/product.js';
import { contrastBorder, inputValidationErrorBorder, inputValidationInfoBorder, inputValidationWarningBorder, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../../base/common/color.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatViewId } from '../chat.js';
const defaultChat = product.defaultChatAgent;
const gaugeForeground = registerColor('gauge.foreground', {
    dark: inputValidationInfoBorder,
    light: inputValidationInfoBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeForeground', "Gauge foreground color."));
registerColor('gauge.background', {
    dark: transparent(gaugeForeground, 0.3),
    light: transparent(gaugeForeground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeBackground', "Gauge background color."));
registerColor('gauge.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeBorder', "Gauge border color."));
const gaugeWarningForeground = registerColor('gauge.warningForeground', {
    dark: inputValidationWarningBorder,
    light: inputValidationWarningBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeWarningForeground', "Gauge warning foreground color."));
registerColor('gauge.warningBackground', {
    dark: transparent(gaugeWarningForeground, 0.3),
    light: transparent(gaugeWarningForeground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeWarningBackground', "Gauge warning background color."));
const gaugeErrorForeground = registerColor('gauge.errorForeground', {
    dark: inputValidationErrorBorder,
    light: inputValidationErrorBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeErrorForeground', "Gauge error foreground color."));
registerColor('gauge.errorBackground', {
    dark: transparent(gaugeErrorForeground, 0.3),
    light: transparent(gaugeErrorForeground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeErrorBackground', "Gauge error background color."));
let ChatStatusDashboard = class ChatStatusDashboard extends DomWidget {
    constructor(chatEntitlementService, chatStatusItemService, commandService, configurationService, editorService, hoverService, languageService, openerService, telemetryService, textResourceConfigurationService, inlineCompletionsService, chatSessionsService, markdownRendererService, languageFeaturesService, quickInputService, viewService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.chatStatusItemService = chatStatusItemService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.hoverService = hoverService;
        this.languageService = languageService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.inlineCompletionsService = inlineCompletionsService;
        this.chatSessionsService = chatSessionsService;
        this.markdownRendererService = markdownRendererService;
        this.languageFeaturesService = languageFeaturesService;
        this.quickInputService = quickInputService;
        this.viewService = viewService;
        this.element = $('div.chat-status-bar-entry-tooltip');
        this.dateFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
        this.dateTimeFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        this.quotaPercentageFormatter = safeIntl.NumberFormat(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
        this.quotaOverageFormatter = safeIntl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        this.render();
    }
    render() {
        const token = cancelOnDispose(this._store);
        let needsSeparator = false;
        const addSeparator = (label, action) => {
            if (needsSeparator) {
                this.element.appendChild($('hr'));
            }
            if (label || action) {
                this.renderHeader(this.element, this._store, label ?? '', action);
            }
            needsSeparator = true;
        };
        // Quota Indicator
        const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota, resetDate, resetDateHasTime } = this.chatEntitlementService.quotas;
        if (chatQuota || completionsQuota || premiumChatQuota) {
            addSeparator(localize('usageTitle', "Copilot Usage"), toAction({
                id: 'workbench.action.manageCopilot',
                label: localize('quotaLabel', "Manage Chat"),
                tooltip: localize('quotaTooltip', "Manage Chat"),
                class: ThemeIcon.asClassName(Codicon.settings),
                run: () => this.runCommandAndClose(() => this.openerService.open(URI.parse(defaultChat.manageSettingsUrl))),
            }));
            const completionsQuotaIndicator = completionsQuota && (completionsQuota.total > 0 || completionsQuota.unlimited) ? this.createQuotaIndicator(this.element, this._store, completionsQuota, localize('completionsLabel', "Inline Suggestions"), false) : undefined;
            const chatQuotaIndicator = chatQuota && (chatQuota.total > 0 || chatQuota.unlimited) ? this.createQuotaIndicator(this.element, this._store, chatQuota, localize('chatsLabel', "Chat messages"), false) : undefined;
            const premiumChatQuotaIndicator = premiumChatQuota && (premiumChatQuota.total > 0 || premiumChatQuota.unlimited) ? this.createQuotaIndicator(this.element, this._store, premiumChatQuota, localize('premiumChatsLabel', "Premium requests"), true) : undefined;
            if (resetDate) {
                this.element.appendChild($('div.description', undefined, localize('limitQuota', "Allowance resets {0}.", resetDateHasTime ? this.dateTimeFormatter.value.format(new Date(resetDate)) : this.dateFormatter.value.format(new Date(resetDate)))));
            }
            if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && (Number(chatQuota?.percentRemaining) <= 25 || Number(completionsQuota?.percentRemaining) <= 25)) {
                const upgradeProButton = this._store.add(new Button(this.element, { ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate, secondary: this.canUseChat() /* use secondary color when chat can still be used */ }));
                upgradeProButton.label = localize('upgradeToCopilotPro', "Upgrade to GitHub Copilot Pro");
                this._store.add(upgradeProButton.onDidClick(() => this.runCommandAndClose('workbench.action.chat.upgradePlan')));
            }
            (async () => {
                await this.chatEntitlementService.update(token);
                if (token.isCancellationRequested) {
                    return;
                }
                const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota } = this.chatEntitlementService.quotas;
                if (completionsQuota) {
                    completionsQuotaIndicator?.(completionsQuota);
                }
                if (chatQuota) {
                    chatQuotaIndicator?.(chatQuota);
                }
                if (premiumChatQuota) {
                    premiumChatQuotaIndicator?.(premiumChatQuota);
                }
            })();
        }
        // Anonymous Indicator
        else if (this.chatEntitlementService.anonymous && this.chatEntitlementService.sentiment.installed) {
            addSeparator(localize('anonymousTitle', "Copilot Usage"));
            this.createQuotaIndicator(this.element, this._store, localize('quotaLimited', "Limited"), localize('completionsLabel', "Inline Suggestions"), false);
            this.createQuotaIndicator(this.element, this._store, localize('quotaLimited', "Limited"), localize('chatsLabel', "Chat messages"), false);
        }
        // Chat sessions
        {
            const inProgress = this.chatSessionsService.getInProgress();
            if (inProgress.some(item => item.count > 0)) {
                addSeparator(localize('chatAgentSessionsTitle', "Agent Sessions"), toAction({
                    id: 'workbench.view.chat.status.sessions',
                    label: localize('viewChatSessionsLabel', "View Agent Sessions"),
                    tooltip: localize('viewChatSessionsTooltip', "View Agent Sessions"),
                    class: ThemeIcon.asClassName(Codicon.eye),
                    run: () => {
                        this.viewService.openView(ChatViewId, true);
                        this.hoverService.hideHover(true);
                    }
                }));
                for (const { displayName, count } of inProgress) {
                    if (count > 0) {
                        const text = localize('inProgressChatSession', "$(loading~spin) {0} in progress", displayName);
                        const chatSessionsElement = this.element.appendChild($('div.description'));
                        const parts = renderLabelWithIcons(text);
                        chatSessionsElement.append(...parts);
                    }
                }
            }
        }
        // Contributions
        {
            for (const item of this.chatStatusItemService.getEntries()) {
                addSeparator();
                const itemDisposables = this._store.add(new MutableDisposable());
                let rendered = this.renderContributedChatStatusItem(item);
                itemDisposables.value = rendered.disposables;
                this.element.appendChild(rendered.element);
                this._store.add(this.chatStatusItemService.onDidChange(e => {
                    if (e.entry.id === item.id) {
                        const previousElement = rendered.element;
                        rendered = this.renderContributedChatStatusItem(e.entry);
                        itemDisposables.value = rendered.disposables;
                        previousElement.replaceWith(rendered.element);
                    }
                }));
            }
        }
        // Settings
        {
            const chatSentiment = this.chatEntitlementService.sentiment;
            addSeparator(localize('inlineSuggestions', "Inline Suggestions"), chatSentiment.installed && !chatSentiment.disabled && !chatSentiment.untrusted ? toAction({
                id: 'workbench.action.openChatSettings',
                label: localize('settingsLabel', "Settings"),
                tooltip: localize('settingsTooltip', "Open Settings"),
                class: ThemeIcon.asClassName(Codicon.settingsGear),
                run: () => this.runCommandAndClose(() => this.commandService.executeCommand('workbench.action.openSettings', { query: `@id:${defaultChat.completionsEnablementSetting} @id:${defaultChat.nextEditSuggestionsSetting}` })),
            }) : undefined);
            this.createSettings(this.element, this._store);
        }
        // Model Selection
        {
            const providers = this.languageFeaturesService.inlineCompletionsProvider.allNoModel();
            const provider = providers.find(p => p.modelInfo && p.modelInfo.models.length > 0);
            if (provider) {
                const modelInfo = provider.modelInfo;
                const currentModel = modelInfo.models.find(m => m.id === modelInfo.currentModelId);
                if (currentModel) {
                    const modelContainer = this.element.appendChild($('div.model-selection'));
                    modelContainer.appendChild($('span.model-text', undefined, localize('modelLabel', "Model: {0}", currentModel.name)));
                    const actionBar = modelContainer.appendChild($('div.model-action-bar'));
                    const toolbar = this._store.add(new ActionBar(actionBar, { hoverDelegate: nativeHoverDelegate }));
                    toolbar.push([toAction({
                            id: 'workbench.action.selectInlineCompletionsModel',
                            label: localize('selectModel', "Select Model"),
                            tooltip: localize('selectModel', "Select Model"),
                            class: ThemeIcon.asClassName(Codicon.gear),
                            run: async () => {
                                await this.showModelPicker(provider);
                            }
                        })], { icon: true, label: false });
                }
            }
        }
        // Completions Snooze
        if (this.canUseChat()) {
            const snooze = append(this.element, $('div.snooze-completions'));
            this.createCompletionsSnooze(snooze, localize('settings.snooze', "Snooze"), this._store);
        }
        // New to Chat / Signed out
        {
            const newUser = isNewUser(this.chatEntitlementService);
            const anonymousUser = this.chatEntitlementService.anonymous;
            const disabled = this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted;
            const signedOut = this.chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (newUser || signedOut || disabled) {
                addSeparator();
                let descriptionText;
                let descriptionClass = '.description';
                if (newUser && anonymousUser) {
                    descriptionText = new MarkdownString(localize({ key: 'activeDescriptionAnonymous', comment: ['{Locked="]({2})"}', '{Locked="]({3})"}'] }, "By continuing with {0} Copilot, you agree to {1}'s [Terms]({2}) and [Privacy Statement]({3})", defaultChat.provider.default.name, defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl), { isTrusted: true });
                    descriptionClass = `${descriptionClass}.terms`;
                }
                else if (newUser) {
                    descriptionText = localize('activateDescription', "Set up Copilot to use AI features.");
                }
                else if (anonymousUser) {
                    descriptionText = localize('enableMoreDescription', "Sign in to enable more Copilot AI features.");
                }
                else if (disabled) {
                    descriptionText = localize('enableDescription', "Enable Copilot to use AI features.");
                }
                else {
                    descriptionText = localize('signInDescription', "Sign in to use Copilot AI features.");
                }
                let buttonLabel;
                if (newUser) {
                    buttonLabel = localize('enableAIFeatures', "Use AI Features");
                }
                else if (anonymousUser) {
                    buttonLabel = localize('enableMoreAIFeatures', "Enable more AI Features");
                }
                else if (disabled) {
                    buttonLabel = localize('enableCopilotButton', "Enable AI Features");
                }
                else {
                    buttonLabel = localize('signInToUseAIFeatures', "Sign in to use AI Features");
                }
                let commandId;
                if (newUser && anonymousUser) {
                    commandId = 'workbench.action.chat.triggerSetupAnonymousWithoutDialog';
                }
                else {
                    commandId = 'workbench.action.chat.triggerSetup';
                }
                if (typeof descriptionText === 'string') {
                    this.element.appendChild($(`div${descriptionClass}`, undefined, descriptionText));
                }
                else {
                    this.element.appendChild($(`div${descriptionClass}`, undefined, this._store.add(this.markdownRendererService.render(descriptionText)).element));
                }
                const button = this._store.add(new Button(this.element, { ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate }));
                button.label = buttonLabel;
                this._store.add(button.onDidClick(() => this.runCommandAndClose(commandId)));
            }
        }
    }
    canUseChat() {
        if (!this.chatEntitlementService.sentiment.installed || this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted) {
            return false; // chat not installed or not enabled
        }
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Unknown || this.chatEntitlementService.entitlement === ChatEntitlement.Available) {
            return this.chatEntitlementService.anonymous; // signed out or not-yet-signed-up users can only use Chat if anonymous access is allowed
        }
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && this.chatEntitlementService.quotas.chat?.percentRemaining === 0 && this.chatEntitlementService.quotas.completions?.percentRemaining === 0) {
            return false; // free user with no quota left
        }
        return true;
    }
    renderHeader(container, disposables, label, action) {
        const header = container.appendChild($('div.header', undefined, label ?? ''));
        if (action) {
            const toolbar = disposables.add(new ActionBar(header, { hoverDelegate: nativeHoverDelegate }));
            toolbar.push([action], { icon: true, label: false });
        }
    }
    renderContributedChatStatusItem(item) {
        const disposables = new DisposableStore();
        const itemElement = $('div.contribution');
        const headerLabel = typeof item.label === 'string' ? item.label : item.label.label;
        const headerLink = typeof item.label === 'string' ? undefined : item.label.link;
        this.renderHeader(itemElement, disposables, headerLabel, headerLink ? toAction({
            id: 'workbench.action.openChatStatusItemLink',
            label: localize('learnMore', "Learn More"),
            tooltip: localize('learnMore', "Learn More"),
            class: ThemeIcon.asClassName(Codicon.linkExternal),
            run: () => this.runCommandAndClose(() => this.openerService.open(URI.parse(headerLink))),
        }) : undefined);
        const itemBody = itemElement.appendChild($('div.body'));
        const description = itemBody.appendChild($('span.description'));
        this.renderTextPlus(description, item.description, disposables);
        if (item.detail) {
            const detail = itemBody.appendChild($('div.detail-item'));
            this.renderTextPlus(detail, item.detail, disposables);
        }
        return { element: itemElement, disposables };
    }
    renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                target.append(...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this.hoverService, this.openerService));
            }
        }
    }
    runCommandAndClose(commandOrFn, ...args) {
        if (typeof commandOrFn === 'function') {
            commandOrFn(...args);
        }
        else {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: commandOrFn, from: 'chat-status' });
            this.commandService.executeCommand(commandOrFn, ...args);
        }
        this.hoverService.hideHover(true);
    }
    createQuotaIndicator(container, disposables, quota, label, supportsOverage) {
        const quotaValue = $('span.quota-value');
        const quotaBit = $('div.quota-bit');
        const overageLabel = $('span.overage-label');
        const quotaIndicator = container.appendChild($('div.quota-indicator', undefined, $('div.quota-label', undefined, $('span', undefined, label), quotaValue), $('div.quota-bar', undefined, quotaBit), $('div.description', undefined, overageLabel)));
        if (supportsOverage && (this.chatEntitlementService.entitlement === ChatEntitlement.Pro || this.chatEntitlementService.entitlement === ChatEntitlement.ProPlus)) {
            const manageOverageButton = disposables.add(new Button(quotaIndicator, { ...defaultButtonStyles, secondary: true, hoverDelegate: nativeHoverDelegate }));
            manageOverageButton.label = localize('enableAdditionalUsage', "Manage paid premium requests");
            disposables.add(manageOverageButton.onDidClick(() => this.runCommandAndClose(() => this.openerService.open(URI.parse(defaultChat.manageOverageUrl)))));
        }
        const update = (quota) => {
            quotaIndicator.classList.remove('error');
            quotaIndicator.classList.remove('warning');
            let usedPercentage;
            if (typeof quota === 'string' || quota.unlimited) {
                usedPercentage = 0;
            }
            else {
                usedPercentage = Math.max(0, 100 - quota.percentRemaining);
            }
            if (typeof quota === 'string') {
                quotaValue.textContent = quota;
            }
            else if (quota.unlimited) {
                quotaValue.textContent = localize('quotaUnlimited', "Included");
            }
            else if (quota.overageCount) {
                quotaValue.textContent = localize('quotaDisplayWithOverage', "+{0} requests", this.quotaOverageFormatter.value.format(quota.overageCount));
            }
            else {
                quotaValue.textContent = localize('quotaDisplay', "{0}%", this.quotaPercentageFormatter.value.format(usedPercentage));
            }
            quotaBit.style.width = `${usedPercentage}%`;
            if (usedPercentage >= 90) {
                quotaIndicator.classList.add('error');
            }
            else if (usedPercentage >= 75) {
                quotaIndicator.classList.add('warning');
            }
            if (supportsOverage) {
                if (typeof quota !== 'string' && quota?.overageEnabled) {
                    overageLabel.textContent = localize('additionalUsageEnabled', "Additional paid premium requests enabled.");
                }
                else {
                    overageLabel.textContent = localize('additionalUsageDisabled', "Additional paid premium requests disabled.");
                }
            }
            else {
                overageLabel.textContent = '';
            }
        };
        update(quota);
        return update;
    }
    createSettings(container, disposables) {
        const modeId = this.editorService.activeTextEditorLanguageId;
        const settings = container.appendChild($('div.settings'));
        // --- Inline Suggestions
        {
            const globalSetting = append(settings, $('div.setting'));
            this.createInlineSuggestionsSetting(globalSetting, localize('settings.codeCompletions.allFiles', "All files"), '*', disposables);
            if (modeId) {
                const languageSetting = append(settings, $('div.setting'));
                this.createInlineSuggestionsSetting(languageSetting, localize('settings.codeCompletions.language', "{0}", this.languageService.getLanguageName(modeId) ?? modeId), modeId, disposables);
            }
        }
        // --- Next edit suggestions
        {
            const setting = append(settings, $('div.setting'));
            this.createNextEditSuggestionsSetting(setting, localize('settings.nextEditSuggestions', "Next edit suggestions"), this.getCompletionsSettingAccessor(modeId), disposables);
        }
        return settings;
    }
    createSetting(container, settingIdsToReEvaluate, label, accessor, disposables) {
        const checkbox = disposables.add(new Checkbox(label, Boolean(accessor.readSetting()), { ...defaultCheckboxStyles }));
        container.appendChild(checkbox.domNode);
        const settingLabel = append(container, $('span.setting-label', undefined, label));
        disposables.add(Gesture.addTarget(settingLabel));
        [EventType.CLICK, TouchEventType.Tap].forEach(eventType => {
            disposables.add(addDisposableListener(settingLabel, eventType, e => {
                if (checkbox?.enabled) {
                    EventHelper.stop(e, true);
                    checkbox.checked = !checkbox.checked;
                    accessor.writeSetting(checkbox.checked);
                    checkbox.focus();
                }
            }));
        });
        disposables.add(checkbox.onChange(() => {
            accessor.writeSetting(checkbox.checked);
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (settingIdsToReEvaluate.some(id => e.affectsConfiguration(id))) {
                checkbox.checked = Boolean(accessor.readSetting());
            }
        }));
        if (!this.canUseChat()) {
            container.classList.add('disabled');
            checkbox.disable();
            checkbox.checked = false;
        }
        return checkbox;
    }
    createInlineSuggestionsSetting(container, label, modeId, disposables) {
        this.createSetting(container, [defaultChat.completionsEnablementSetting], label, this.getCompletionsSettingAccessor(modeId), disposables);
    }
    getCompletionsSettingAccessor(modeId = '*') {
        const settingId = defaultChat.completionsEnablementSetting;
        return {
            readSetting: () => isCompletionsEnabled(this.configurationService, modeId),
            writeSetting: (value) => {
                this.telemetryService.publicLog2('chatStatus.settingChanged', {
                    settingIdentifier: settingId,
                    settingMode: modeId,
                    settingEnablement: value ? 'enabled' : 'disabled'
                });
                let result = this.configurationService.getValue(settingId);
                if (!isObject(result)) {
                    result = Object.create(null);
                }
                return this.configurationService.updateValue(settingId, { ...result, [modeId]: value });
            }
        };
    }
    createNextEditSuggestionsSetting(container, label, completionsSettingAccessor, disposables) {
        const nesSettingId = defaultChat.nextEditSuggestionsSetting;
        const completionsSettingId = defaultChat.completionsEnablementSetting;
        const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const checkbox = this.createSetting(container, [nesSettingId, completionsSettingId], label, {
            readSetting: () => completionsSettingAccessor.readSetting() && this.textResourceConfigurationService.getValue(resource, nesSettingId),
            writeSetting: (value) => {
                this.telemetryService.publicLog2('chatStatus.settingChanged', {
                    settingIdentifier: nesSettingId,
                    settingEnablement: value ? 'enabled' : 'disabled'
                });
                return this.textResourceConfigurationService.updateValue(resource, nesSettingId, value);
            }
        }, disposables);
        // enablement of NES depends on completions setting
        // so we have to update our checkbox state accordingly
        if (!completionsSettingAccessor.readSetting()) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(completionsSettingId)) {
                if (completionsSettingAccessor.readSetting() && this.canUseChat()) {
                    checkbox.enable();
                    container.classList.remove('disabled');
                }
                else {
                    checkbox.disable();
                    container.classList.add('disabled');
                }
            }
        }));
    }
    createCompletionsSnooze(container, label, disposables) {
        const isEnabled = () => {
            const completionsEnabled = isCompletionsEnabled(this.configurationService);
            const completionsEnabledActiveLanguage = isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId);
            return completionsEnabled || completionsEnabledActiveLanguage;
        };
        const button = disposables.add(new Button(container, { disabled: !isEnabled(), ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate, secondary: true }));
        const timerDisplay = container.appendChild($('span.snooze-label'));
        const actionBar = container.appendChild($('div.snooze-action-bar'));
        const toolbar = disposables.add(new ActionBar(actionBar, { hoverDelegate: nativeHoverDelegate }));
        const cancelAction = toAction({
            id: 'workbench.action.cancelSnoozeStatusBarLink',
            label: localize('cancelSnooze', "Cancel Snooze"),
            run: () => this.inlineCompletionsService.cancelSnooze(),
            class: ThemeIcon.asClassName(Codicon.stopCircle)
        });
        const update = (isEnabled) => {
            container.classList.toggle('disabled', !isEnabled);
            toolbar.clear();
            const timeLeftMs = this.inlineCompletionsService.snoozeTimeLeft;
            if (!isEnabled || timeLeftMs <= 0) {
                timerDisplay.textContent = localize('completions.snooze5minutesTitle', "Hide suggestions for 5 min");
                timerDisplay.title = '';
                button.label = label;
                button.setTitle(localize('completions.snooze5minutes', "Hide inline suggestions for 5 min"));
                return true;
            }
            const timeLeftSeconds = Math.ceil(timeLeftMs / 1000);
            const minutes = Math.floor(timeLeftSeconds / 60);
            const seconds = timeLeftSeconds % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} ${localize('completions.remainingTime', "remaining")}`;
            timerDisplay.title = localize('completions.snoozeTimeDescription', "Inline suggestions are hidden for the remaining duration");
            button.label = localize('completions.plus5min', "+5 min");
            button.setTitle(localize('completions.snoozeAdditional5minutes', "Snooze additional 5 min"));
            toolbar.push([cancelAction], { icon: true, label: false });
            return false;
        };
        // Update every second if there's time remaining
        const timerDisposables = disposables.add(new DisposableStore());
        function updateIntervalTimer() {
            timerDisposables.clear();
            const enabled = isEnabled();
            if (update(enabled)) {
                return;
            }
            timerDisposables.add(disposableWindowInterval(getWindow(container), () => update(enabled), 1000));
        }
        updateIntervalTimer();
        disposables.add(button.onDidClick(() => {
            this.inlineCompletionsService.snooze();
            update(isEnabled());
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(defaultChat.completionsEnablementSetting)) {
                button.enabled = isEnabled();
            }
            updateIntervalTimer();
        }));
        disposables.add(this.inlineCompletionsService.onDidChangeIsSnoozing(e => {
            updateIntervalTimer();
        }));
    }
    async showModelPicker(provider) {
        if (!provider.modelInfo || !provider.setModelId) {
            return;
        }
        const modelInfo = provider.modelInfo;
        const items = modelInfo.models.map(model => ({
            id: model.id,
            label: model.name,
            description: model.id === modelInfo.currentModelId ? localize('currentModel.description', "Currently selected") : undefined,
            picked: model.id === modelInfo.currentModelId
        }));
        const selected = await this.quickInputService.pick(items, {
            placeHolder: localize('selectModelFor', "Select a model for {0}", provider.displayName || 'inline completions'),
            canPickMany: false
        });
        if (selected && selected.id && selected.id !== modelInfo.currentModelId) {
            await provider.setModelId(selected.id);
        }
        this.hoverService.hideHover(true);
    }
};
ChatStatusDashboard = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IChatStatusItemService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IEditorService),
    __param(5, IHoverService),
    __param(6, ILanguageService),
    __param(7, IOpenerService),
    __param(8, ITelemetryService),
    __param(9, ITextResourceConfigurationService),
    __param(10, IInlineCompletionsService),
    __param(11, IChatSessionsService),
    __param(12, IMarkdownRendererService),
    __param(13, ILanguageFeaturesService),
    __param(14, IQuickInputService),
    __param(15, IViewsService)
], ChatStatusDashboard);
export { ChatStatusDashboard };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1c0Rhc2hib2FyZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFN0YXR1cy9jaGF0U3RhdHVzRGFzaGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsd0JBQXdCLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkosT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0UsT0FBTyxFQUFXLFFBQVEsRUFBdUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUs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
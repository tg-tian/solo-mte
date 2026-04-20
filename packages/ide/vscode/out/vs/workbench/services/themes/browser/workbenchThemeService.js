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
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkbenchThemeService, ExtensionData, ThemeSettings, ThemeSettingDefaults, COLOR_THEME_DARK_INITIAL_COLORS, COLOR_THEME_LIGHT_INITIAL_COLORS } from '../common/workbenchThemeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as errors from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ColorThemeData } from '../common/colorThemeData.js';
import { Extensions as ThemingExtensions } from '../../../../platform/theme/common/themeService.js';
import { Emitter } from '../../../../base/common/event.js';
import { registerFileIconThemeSchemas } from '../common/fileIconThemeSchema.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { FileIconThemeData, FileIconThemeLoader } from './fileIconThemeData.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import * as resources from '../../../../base/common/resources.js';
import { registerColorThemeSchemas } from '../common/colorThemeSchema.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { getRemoteAuthority } from '../../../../platform/remote/common/remoteHosts.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { ThemeRegistry, registerColorThemeExtensionPoint, registerFileIconThemeExtensionPoint, registerProductIconThemeExtensionPoint } from '../common/themeExtensionPoints.js';
import { updateColorThemeConfigurationSchemas, updateFileIconThemeConfigurationSchemas, ThemeConfiguration, updateProductIconThemeConfigurationSchemas } from '../common/themeConfiguration.js';
import { ProductIconThemeData, DEFAULT_PRODUCT_ICON_THEME_ID } from './productIconThemeData.js';
import { registerProductIconThemeSchemas } from '../common/productIconThemeSchema.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
import { IHostColorSchemeService } from '../common/hostColorSchemeService.js';
import { RunOnceScheduler, Sequencer } from '../../../../base/common/async.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { asCssVariableName, getColorRegistry } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariableName as asSizeCssVariableName, getSizeRegistry, sizeValueToCss } from '../../../../platform/theme/common/sizeRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { mainWindow } from '../../../../base/browser/window.js';
// implementation
const defaultThemeExtensionId = 'vscode-theme-defaults';
const DEFAULT_FILE_ICON_THEME_ID = 'vscode.vscode-theme-seti-vs-seti';
const fileIconsEnabledClass = 'file-icons-enabled';
const colorThemeRulesClassName = 'contributedColorTheme';
const fileIconThemeRulesClassName = 'contributedFileIconTheme';
const productIconThemeRulesClassName = 'contributedProductIconTheme';
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
function validateThemeId(theme) {
    // migrations
    switch (theme) {
        case ThemeTypeSelector.VS: return `vs ${defaultThemeExtensionId}-themes-light_vs-json`;
        case ThemeTypeSelector.VS_DARK: return `vs-dark ${defaultThemeExtensionId}-themes-dark_vs-json`;
        case ThemeTypeSelector.HC_BLACK: return `hc-black ${defaultThemeExtensionId}-themes-hc_black-json`;
        case ThemeTypeSelector.HC_LIGHT: return `hc-light ${defaultThemeExtensionId}-themes-hc_light-json`;
    }
    return theme;
}
const colorThemesExtPoint = registerColorThemeExtensionPoint();
const fileIconThemesExtPoint = registerFileIconThemeExtensionPoint();
const productIconThemesExtPoint = registerProductIconThemeExtensionPoint();
let WorkbenchThemeService = class WorkbenchThemeService extends Disposable {
    constructor(extensionService, storageService, configurationService, telemetryService, environmentService, fileService, extensionResourceLoaderService, layoutService, logService, hostColorService, userDataInitializationService, languageService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
        this.hostColorService = hostColorService;
        this.userDataInitializationService = userDataInitializationService;
        this.languageService = languageService;
        this.themeExtensionsActivated = new Map();
        this.container = layoutService.mainContainer;
        this.settings = new ThemeConfiguration(configurationService, hostColorService);
        this.colorThemeRegistry = this._register(new ThemeRegistry(colorThemesExtPoint, ColorThemeData.fromExtensionTheme));
        this.colorThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentColorTheme.bind(this)));
        this.onColorThemeChange = new Emitter({ leakWarningThreshold: 400 });
        this.currentColorTheme = ColorThemeData.createUnloadedTheme('');
        this.colorThemeSequencer = new Sequencer();
        this.fileIconThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentFileIconTheme.bind(this)));
        this.fileIconThemeRegistry = this._register(new ThemeRegistry(fileIconThemesExtPoint, FileIconThemeData.fromExtensionTheme, true, FileIconThemeData.noIconTheme));
        this.fileIconThemeLoader = new FileIconThemeLoader(extensionResourceLoaderService, languageService);
        this.onFileIconThemeChange = new Emitter({ leakWarningThreshold: 400 });
        this.currentFileIconTheme = FileIconThemeData.createUnloadedTheme('');
        this.fileIconThemeSequencer = new Sequencer();
        this.productIconThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentProductIconTheme.bind(this)));
        this.productIconThemeRegistry = this._register(new ThemeRegistry(productIconThemesExtPoint, ProductIconThemeData.fromExtensionTheme, true, ProductIconThemeData.defaultTheme));
        this.onProductIconThemeChange = new Emitter();
        this.currentProductIconTheme = ProductIconThemeData.createUnloadedTheme('');
        this.productIconThemeSequencer = new Sequencer();
        this._register(this.onDidColorThemeChange(theme => getColorRegistry().notifyThemeUpdate(theme)));
        // In order to avoid paint flashing for tokens, because
        // themes are loaded asynchronously, we need to initialize
        // a color theme document with good defaults until the theme is loaded
        let themeData = ColorThemeData.fromStorageData(this.storageService);
        const colorThemeSetting = this.settings.colorTheme;
        if (themeData && colorThemeSetting !== themeData.settingsId) {
            themeData = undefined;
        }
        const defaultColorMap = colorThemeSetting === ThemeSettingDefaults.COLOR_THEME_LIGHT ? COLOR_THEME_LIGHT_INITIAL_COLORS : colorThemeSetting === ThemeSettingDefaults.COLOR_THEME_DARK ? COLOR_THEME_DARK_INITIAL_COLORS : undefined;
        if (!themeData) {
            const initialColorTheme = environmentService.options?.initialColorTheme;
            if (initialColorTheme) {
                themeData = ColorThemeData.createUnloadedThemeForThemeType(initialColorTheme.themeType, initialColorTheme.colors ?? defaultColorMap);
            }
        }
        if (!themeData) {
            const colorScheme = this.settings.getPreferredColorScheme() ?? (isWeb ? ColorScheme.LIGHT : ColorScheme.DARK);
            themeData = ColorThemeData.createUnloadedThemeForThemeType(colorScheme, defaultColorMap);
        }
        themeData.setCustomizations(this.settings);
        this.applyTheme(themeData, undefined, true);
        const fileIconData = FileIconThemeData.fromStorageData(this.storageService);
        if (fileIconData) {
            this.applyAndSetFileIconTheme(fileIconData, true);
        }
        const productIconData = ProductIconThemeData.fromStorageData(this.storageService);
        if (productIconData) {
            this.applyAndSetProductIconTheme(productIconData, true);
        }
        extensionService.whenInstalledExtensionsRegistered().then(_ => {
            this.installConfigurationListener();
            this.installPreferredSchemeListener();
            this.installRegistryListeners();
            this.initialize().catch(errors.onUnexpectedError);
        });
        const codiconStyleSheet = createStyleSheet();
        codiconStyleSheet.id = 'codiconStyles';
        const iconsStyleSheet = this._register(getIconsStyleSheet(this));
        function updateAll() {
            codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
        }
        const delayer = this._register(new RunOnceScheduler(updateAll, 0));
        this._register(iconsStyleSheet.onDidChange(() => delayer.schedule()));
        delayer.schedule();
    }
    initialize() {
        const extDevLocs = this.environmentService.extensionDevelopmentLocationURI;
        const extDevLoc = extDevLocs && extDevLocs.length === 1 ? extDevLocs[0] : undefined; // in dev mode, switch to a theme provided by the extension under dev.
        const initializeColorTheme = async () => {
            const devThemes = this.colorThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                const matchedColorTheme = devThemes.find(theme => theme.type === this.currentColorTheme.type);
                return this.setColorTheme(matchedColorTheme ? matchedColorTheme.id : devThemes[0].id, undefined);
            }
            let theme = this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, undefined);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                // try to get the theme again, now with a fallback to the default themes
                const fallbackTheme = this.currentColorTheme.type === ColorScheme.LIGHT ? ThemeSettingDefaults.COLOR_THEME_LIGHT : ThemeSettingDefaults.COLOR_THEME_DARK;
                theme = this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, fallbackTheme);
            }
            return this.setColorTheme(theme && theme.id, undefined);
        };
        const initializeFileIconTheme = async () => {
            const devThemes = this.fileIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                return this.setFileIconTheme(devThemes[0].id, 8 /* ConfigurationTarget.MEMORY */);
            }
            let theme = this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                theme = this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
            }
            return this.setFileIconTheme(theme ? theme.id : DEFAULT_FILE_ICON_THEME_ID, undefined);
        };
        const initializeProductIconTheme = async () => {
            const devThemes = this.productIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                return this.setProductIconTheme(devThemes[0].id, 8 /* ConfigurationTarget.MEMORY */);
            }
            let theme = this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                theme = this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
            }
            return this.setProductIconTheme(theme ? theme.id : DEFAULT_PRODUCT_ICON_THEME_ID, undefined);
        };
        return Promise.all([initializeColorTheme(), initializeFileIconTheme(), initializeProductIconTheme()]);
    }
    installConfigurationListener() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ThemeSettings.COLOR_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_DARK_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_LIGHT_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_HC_DARK_THEME)
                || e.affectsConfiguration(ThemeSettings.PREFERRED_HC_LIGHT_THEME)
                || e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME)
                || e.affectsConfiguration(ThemeSettings.DETECT_HC)
                || e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME)) {
                this.restoreColorTheme();
            }
            if (e.affectsConfiguration(ThemeSettings.FILE_ICON_THEME)) {
                this.restoreFileIconTheme();
            }
            if (e.affectsConfiguration(ThemeSettings.PRODUCT_ICON_THEME)) {
                this.restoreProductIconTheme();
            }
            if (this.currentColorTheme) {
                let hasColorChanges = false;
                if (e.affectsConfiguration(ThemeSettings.COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomColors(this.settings.colorCustomizations);
                    hasColorChanges = true;
                }
                if (e.affectsConfiguration(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomTokenColors(this.settings.tokenColorCustomizations);
                    hasColorChanges = true;
                }
                if (e.affectsConfiguration(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomSemanticTokenColors(this.settings.semanticTokenColorCustomizations);
                    hasColorChanges = true;
                }
                if (hasColorChanges) {
                    this.updateDynamicCSSRules(this.currentColorTheme);
                    this.onColorThemeChange.fire(this.currentColorTheme);
                }
            }
        }));
    }
    installRegistryListeners() {
        let prevColorId = undefined;
        // update settings schema setting for theme specific settings
        this._register(this.colorThemeRegistry.onDidChange(async (event) => {
            updateColorThemeConfigurationSchemas(event.themes);
            if (await this.restoreColorTheme()) { // checks if theme from settings exists and is set
                // restore theme
                if (this.currentColorTheme.settingsId === ThemeSettingDefaults.COLOR_THEME_DARK && !types.isUndefined(prevColorId) && await this.colorThemeRegistry.findThemeById(prevColorId)) {
                    await this.setColorTheme(prevColorId, 'auto');
                    prevColorId = undefined;
                }
                else if (event.added.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
                    await this.reloadCurrentColorTheme();
                }
            }
            else if (event.removed.some(t => t.settingsId === this.currentColorTheme.settingsId)) {
                // current theme is no longer available
                prevColorId = this.currentColorTheme.id;
                const defaultTheme = this.colorThemeRegistry.findThemeBySettingsId(ThemeSettingDefaults.COLOR_THEME_DARK);
                await this.setColorTheme(defaultTheme, 'auto');
            }
        }));
        let prevFileIconId = undefined;
        this._register(this._register(this.fileIconThemeRegistry.onDidChange(async (event) => {
            updateFileIconThemeConfigurationSchemas(event.themes);
            if (await this.restoreFileIconTheme()) { // checks if theme from settings exists and is set
                // restore theme
                if (this.currentFileIconTheme.id === DEFAULT_FILE_ICON_THEME_ID && !types.isUndefined(prevFileIconId) && this.fileIconThemeRegistry.findThemeById(prevFileIconId)) {
                    await this.setFileIconTheme(prevFileIconId, 'auto');
                    prevFileIconId = undefined;
                }
                else if (event.added.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
                    await this.reloadCurrentFileIconTheme();
                }
            }
            else if (event.removed.some(t => t.settingsId === this.currentFileIconTheme.settingsId)) {
                // current theme is no longer available
                prevFileIconId = this.currentFileIconTheme.id;
                await this.setFileIconTheme(DEFAULT_FILE_ICON_THEME_ID, 'auto');
            }
        })));
        let prevProductIconId = undefined;
        this._register(this.productIconThemeRegistry.onDidChange(async (event) => {
            updateProductIconThemeConfigurationSchemas(event.themes);
            if (await this.restoreProductIconTheme()) { // checks if theme from settings exists and is set
                // restore theme
                if (this.currentProductIconTheme.id === DEFAULT_PRODUCT_ICON_THEME_ID && !types.isUndefined(prevProductIconId) && this.productIconThemeRegistry.findThemeById(prevProductIconId)) {
                    await this.setProductIconTheme(prevProductIconId, 'auto');
                    prevProductIconId = undefined;
                }
                else if (event.added.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
                    await this.reloadCurrentProductIconTheme();
                }
            }
            else if (event.removed.some(t => t.settingsId === this.currentProductIconTheme.settingsId)) {
                // current theme is no longer available
                prevProductIconId = this.currentProductIconTheme.id;
                await this.setProductIconTheme(DEFAULT_PRODUCT_ICON_THEME_ID, 'auto');
            }
        }));
        this._register(this.languageService.onDidChange(() => this.reloadCurrentFileIconTheme()));
        return Promise.all([this.getColorThemes(), this.getFileIconThemes(), this.getProductIconThemes()]).then(([ct, fit, pit]) => {
            updateColorThemeConfigurationSchemas(ct);
            updateFileIconThemeConfigurationSchemas(fit);
            updateProductIconThemeConfigurationSchemas(pit);
        });
    }
    // preferred scheme handling
    installPreferredSchemeListener() {
        this._register(this.hostColorService.onDidChangeColorScheme(() => {
            if (this.settings.isDetectingColorScheme()) {
                this.restoreColorTheme();
            }
        }));
    }
    getColorTheme() {
        return this.currentColorTheme;
    }
    async getColorThemes() {
        return this.colorThemeRegistry.getThemes();
    }
    getPreferredColorScheme() {
        return this.settings.getPreferredColorScheme();
    }
    async getMarketplaceColorThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.colorThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    get onDidColorThemeChange() {
        return this.onColorThemeChange.event;
    }
    setColorTheme(themeIdOrTheme, settingsTarget) {
        return this.colorThemeSequencer.queue(async () => {
            return this.internalSetColorTheme(themeIdOrTheme, settingsTarget);
        });
    }
    async internalSetColorTheme(themeIdOrTheme, settingsTarget) {
        if (!themeIdOrTheme) {
            return null;
        }
        const themeId = types.isString(themeIdOrTheme) ? validateThemeId(themeIdOrTheme) : themeIdOrTheme.id;
        if (this.currentColorTheme.isLoaded && themeId === this.currentColorTheme.id) {
            if (settingsTarget !== 'preview') {
                this.currentColorTheme.toStorage(this.storageService);
            }
            return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
        }
        let themeData = this.colorThemeRegistry.findThemeById(themeId);
        if (!themeData) {
            if (themeIdOrTheme instanceof ColorThemeData) {
                themeData = themeIdOrTheme;
            }
            else {
                return null;
            }
        }
        try {
            await themeData.ensureLoaded(this.extensionResourceLoaderService);
            themeData.setCustomizations(this.settings);
            return this.applyTheme(themeData, settingsTarget);
        }
        catch (error) {
            throw new Error(nls.localize('error.cannotloadtheme', "Unable to load {0}: {1}", themeData.location?.toString(), error.message));
        }
    }
    reloadCurrentColorTheme() {
        return this.colorThemeSequencer.queue(async () => {
            try {
                const theme = this.colorThemeRegistry.findThemeBySettingsId(this.currentColorTheme.settingsId) || this.currentColorTheme;
                await theme.reload(this.extensionResourceLoaderService);
                theme.setCustomizations(this.settings);
                await this.applyTheme(theme, undefined, false);
            }
            catch (error) {
                this.logService.info('Unable to reload {0}: {1}', this.currentColorTheme.location?.toString());
            }
        });
    }
    async restoreColorTheme() {
        return this.colorThemeSequencer.queue(async () => {
            const settingId = this.settings.colorTheme;
            const theme = this.colorThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentColorTheme.settingsId) {
                    await this.internalSetColorTheme(theme.id, undefined);
                }
                else if (theme !== this.currentColorTheme) {
                    await theme.ensureLoaded(this.extensionResourceLoaderService);
                    theme.setCustomizations(this.settings);
                    await this.applyTheme(theme, undefined, true);
                }
                return true;
            }
            return false;
        });
    }
    updateDynamicCSSRules(themeData) {
        const cssRules = new Set();
        const ruleCollector = {
            addRule: (rule) => {
                if (!cssRules.has(rule)) {
                    cssRules.add(rule);
                }
            }
        };
        ruleCollector.addRule(`.monaco-workbench { forced-color-adjust: none; }`);
        themingRegistry.getThemingParticipants().forEach(p => p(themeData, ruleCollector, this.environmentService));
        const colorVariables = [];
        for (const item of getColorRegistry().getColors()) {
            const color = themeData.getColor(item.id, true);
            if (color) {
                colorVariables.push(`${asCssVariableName(item.id)}: ${color.toString()};`);
            }
        }
        const sizeVariables = [];
        for (const item of getSizeRegistry().getSizes()) {
            const sizeValue = getSizeRegistry().resolveDefaultSize(item.id, themeData);
            if (sizeValue) {
                sizeVariables.push(`${asSizeCssVariableName(item.id)}: ${sizeValueToCss(sizeValue)};`);
            }
        }
        ruleCollector.addRule(`.monaco-workbench { ${(colorVariables.concat(sizeVariables)).join('\n')} }`);
        _applyRules([...cssRules].join('\n'), colorThemeRulesClassName);
    }
    applyTheme(newTheme, settingsTarget, silent = false) {
        this.updateDynamicCSSRules(newTheme);
        if (this.currentColorTheme.id) {
            this.container.classList.remove(...this.currentColorTheme.classNames);
        }
        else {
            this.container.classList.remove(ThemeTypeSelector.VS, ThemeTypeSelector.VS_DARK, ThemeTypeSelector.HC_BLACK, ThemeTypeSelector.HC_LIGHT);
        }
        this.container.classList.add(...newTheme.classNames);
        this.currentColorTheme.clearCaches();
        this.currentColorTheme = newTheme;
        if (!this.colorThemingParticipantChangeListener) {
            this.colorThemingParticipantChangeListener = themingRegistry.onThemingParticipantAdded(_ => this.updateDynamicCSSRules(this.currentColorTheme));
        }
        this.colorThemeWatcher.update(newTheme);
        this.sendTelemetry(newTheme.id, newTheme.extensionData, 'color');
        if (silent) {
            return Promise.resolve(null);
        }
        this.onColorThemeChange.fire(this.currentColorTheme);
        // remember theme data for a quick restore
        if (newTheme.isLoaded && settingsTarget !== 'preview') {
            newTheme.toStorage(this.storageService);
        }
        return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
    }
    sendTelemetry(themeId, themeData, themeType) {
        if (themeData) {
            const key = themeType + themeData.extensionId;
            if (!this.themeExtensionsActivated.get(key)) {
                this.telemetryService.publicLog2('activatePlugin', {
                    id: themeData.extensionId,
                    name: themeData.extensionName,
                    isBuiltin: themeData.extensionIsBuiltin,
                    publisherDisplayName: themeData.extensionPublisher,
                    themeId: themeId
                });
                this.themeExtensionsActivated.set(key, true);
            }
        }
    }
    async getFileIconThemes() {
        return this.fileIconThemeRegistry.getThemes();
    }
    getFileIconTheme() {
        return this.currentFileIconTheme;
    }
    get onDidFileIconThemeChange() {
        return this.onFileIconThemeChange.event;
    }
    async setFileIconTheme(iconThemeOrId, settingsTarget) {
        return this.fileIconThemeSequencer.queue(async () => {
            return this.internalSetFileIconTheme(iconThemeOrId, settingsTarget);
        });
    }
    async internalSetFileIconTheme(iconThemeOrId, settingsTarget) {
        if (iconThemeOrId === undefined) {
            iconThemeOrId = '';
        }
        const themeId = types.isString(iconThemeOrId) ? iconThemeOrId : iconThemeOrId.id;
        if (themeId !== this.currentFileIconTheme.id || !this.currentFileIconTheme.isLoaded) {
            let newThemeData = this.fileIconThemeRegistry.findThemeById(themeId);
            if (!newThemeData && iconThemeOrId instanceof FileIconThemeData) {
                newThemeData = iconThemeOrId;
            }
            if (!newThemeData) {
                newThemeData = FileIconThemeData.noIconTheme;
            }
            await newThemeData.ensureLoaded(this.fileIconThemeLoader);
            this.applyAndSetFileIconTheme(newThemeData); // updates this.currentFileIconTheme
        }
        const themeData = this.currentFileIconTheme;
        // remember theme data for a quick restore
        if (themeData.isLoaded && settingsTarget !== 'preview' && (!themeData.location || !getRemoteAuthority(themeData.location))) {
            themeData.toStorage(this.storageService);
        }
        await this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTarget);
        return themeData;
    }
    async getMarketplaceFileIconThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.fileIconThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    async reloadCurrentFileIconTheme() {
        return this.fileIconThemeSequencer.queue(async () => {
            await this.currentFileIconTheme.reload(this.fileIconThemeLoader);
            this.applyAndSetFileIconTheme(this.currentFileIconTheme);
        });
    }
    async restoreFileIconTheme() {
        return this.fileIconThemeSequencer.queue(async () => {
            const settingId = this.settings.fileIconTheme;
            const theme = this.fileIconThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentFileIconTheme.settingsId) {
                    await this.internalSetFileIconTheme(theme.id, undefined);
                }
                else if (theme !== this.currentFileIconTheme) {
                    await theme.ensureLoaded(this.fileIconThemeLoader);
                    this.applyAndSetFileIconTheme(theme, true);
                }
                return true;
            }
            return false;
        });
    }
    applyAndSetFileIconTheme(iconThemeData, silent = false) {
        this.currentFileIconTheme = iconThemeData;
        _applyRules(iconThemeData.styleSheetContent, fileIconThemeRulesClassName);
        if (iconThemeData.id) {
            this.container.classList.add(fileIconsEnabledClass);
        }
        else {
            this.container.classList.remove(fileIconsEnabledClass);
        }
        this.fileIconThemeWatcher.update(iconThemeData);
        if (iconThemeData.id) {
            this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'fileIcon');
        }
        if (!silent) {
            this.onFileIconThemeChange.fire(this.currentFileIconTheme);
        }
    }
    async getProductIconThemes() {
        return this.productIconThemeRegistry.getThemes();
    }
    getProductIconTheme() {
        return this.currentProductIconTheme;
    }
    get onDidProductIconThemeChange() {
        return this.onProductIconThemeChange.event;
    }
    async setProductIconTheme(iconThemeOrId, settingsTarget) {
        return this.productIconThemeSequencer.queue(async () => {
            return this.internalSetProductIconTheme(iconThemeOrId, settingsTarget);
        });
    }
    async internalSetProductIconTheme(iconThemeOrId, settingsTarget) {
        if (iconThemeOrId === undefined) {
            iconThemeOrId = '';
        }
        const themeId = types.isString(iconThemeOrId) ? iconThemeOrId : iconThemeOrId.id;
        if (themeId !== this.currentProductIconTheme.id || !this.currentProductIconTheme.isLoaded) {
            let newThemeData = this.productIconThemeRegistry.findThemeById(themeId);
            if (!newThemeData && iconThemeOrId instanceof ProductIconThemeData) {
                newThemeData = iconThemeOrId;
            }
            if (!newThemeData) {
                newThemeData = ProductIconThemeData.defaultTheme;
            }
            await newThemeData.ensureLoaded(this.extensionResourceLoaderService, this.logService);
            this.applyAndSetProductIconTheme(newThemeData); // updates this.currentProductIconTheme
        }
        const themeData = this.currentProductIconTheme;
        // remember theme data for a quick restore
        if (themeData.isLoaded && settingsTarget !== 'preview' && (!themeData.location || !getRemoteAuthority(themeData.location))) {
            themeData.toStorage(this.storageService);
        }
        await this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTarget);
        return themeData;
    }
    async getMarketplaceProductIconThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.productIconThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    async reloadCurrentProductIconTheme() {
        return this.productIconThemeSequencer.queue(async () => {
            await this.currentProductIconTheme.reload(this.extensionResourceLoaderService, this.logService);
            this.applyAndSetProductIconTheme(this.currentProductIconTheme);
        });
    }
    async restoreProductIconTheme() {
        return this.productIconThemeSequencer.queue(async () => {
            const settingId = this.settings.productIconTheme;
            const theme = this.productIconThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentProductIconTheme.settingsId) {
                    await this.internalSetProductIconTheme(theme.id, undefined);
                }
                else if (theme !== this.currentProductIconTheme) {
                    await theme.ensureLoaded(this.extensionResourceLoaderService, this.logService);
                    this.applyAndSetProductIconTheme(theme, true);
                }
                return true;
            }
            return false;
        });
    }
    applyAndSetProductIconTheme(iconThemeData, silent = false) {
        this.currentProductIconTheme = iconThemeData;
        _applyRules(iconThemeData.styleSheetContent, productIconThemeRulesClassName);
        this.productIconThemeWatcher.update(iconThemeData);
        if (iconThemeData.id) {
            this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'productIcon');
        }
        if (!silent) {
            this.onProductIconThemeChange.fire(this.currentProductIconTheme);
        }
    }
};
WorkbenchThemeService = __decorate([
    __param(0, IExtensionService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, IBrowserWorkbenchEnvironmentService),
    __param(5, IFileService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IWorkbenchLayoutService),
    __param(8, ILogService),
    __param(9, IHostColorSchemeService),
    __param(10, IUserDataInitializationService),
    __param(11, ILanguageService)
], WorkbenchThemeService);
export { WorkbenchThemeService };
class ThemeFileWatcher {
    constructor(fileService, environmentService, onUpdate) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.onUpdate = onUpdate;
        this.watcherDisposables = new DisposableStore();
    }
    update(theme) {
        if (!resources.isEqual(theme.location, this.watchedLocation)) {
            this.watchedLocation = undefined;
            this.watcherDisposables.clear();
            if (theme.location && (theme.watch || this.environmentService.isExtensionDevelopment)) {
                this.watchedLocation = theme.location;
                this.watcherDisposables.add(this.fileService.watch(theme.location));
                this.watcherDisposables.add(this.fileService.onDidFilesChange(e => {
                    if (this.watchedLocation && e.contains(this.watchedLocation, 0 /* FileChangeType.UPDATED */)) {
                        this.onUpdate();
                    }
                }));
            }
        }
    }
    dispose() {
        this.watcherDisposables.dispose();
        this.watchedLocation = undefined;
    }
}
function _applyRules(styleSheetContent, rulesClassName) {
    // eslint-disable-next-line no-restricted-syntax
    const themeStyles = mainWindow.document.head.getElementsByClassName(rulesClassName);
    if (themeStyles.length === 0) {
        const elStyle = createStyleSheet();
        elStyle.className = rulesClassName;
        elStyle.textContent = styleSheetContent;
    }
    else {
        themeStyles[0].textContent = styleSheetContent;
    }
}
registerColorThemeSchemas();
registerFileIconThemeSchemas();
registerProductIconThemeSchemas();
// The WorkbenchThemeService should stay eager as the constructor restores the
// last used colors / icons from storage. This needs to happen as quickly as possible
// for a flicker-free startup experience.
registerSingleton(IWorkbenchThemeService, WorkbenchThemeService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvYnJvd3Nlci93b3JrYmVuY2hUaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBaUQsYUFBYSxFQUFFLGFBQWEsRUFBa0Qsb0JBQW9CLEVBQUUsK0JBQStCLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsUyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUF1QixNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQWUsVUFBVSxJQUFJLGlCQUFpQixFQUFvQixNQUFNLG1EQUFtRCxDQUFDO0FBQ25JLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRixPQUFPLEVBQWUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFD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
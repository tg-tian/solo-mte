/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../base/common/path.js';
import * as Json from '../../../../base/common/json.js';
import { Color } from '../../../../base/common/color.js';
import { ExtensionData, THEME_SCOPE_CLOSE_PAREN, THEME_SCOPE_OPEN_PAREN, themeScopeRegex, THEME_SCOPE_WILDCARD } from './workbenchThemeService.js';
import { convertSettings } from './themeCompatibility.js';
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import * as resources from '../../../../base/common/resources.js';
import { Extensions as ColorRegistryExtensions, editorBackground, editorForeground, DEFAULT_COLOR_CONFIG_VALUE } from '../../../../platform/theme/common/colorRegistry.js';
import { getThemeTypeSelector } from '../../../../platform/theme/common/themeService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { parse as parsePList } from './plistParser.js';
import { TokenStyle, SemanticTokenRule, getTokenClassificationRegistry, parseClassifierString } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
import { createMatchers } from './textMateScopeMatcher.js';
import { ColorScheme, ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
import { toStandardTokenType } from '../../../../editor/common/languages/supports/tokenization.js';
const colorRegistry = Registry.as(ColorRegistryExtensions.ColorContribution);
const tokenClassificationRegistry = getTokenClassificationRegistry();
const tokenGroupToScopesMap = {
    comments: ['comment', 'punctuation.definition.comment'],
    strings: ['string', 'meta.embedded.assembly'],
    keywords: ['keyword - keyword.operator', 'keyword.control', 'storage', 'storage.type'],
    numbers: ['constant.numeric'],
    types: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
    functions: ['entity.name.function', 'support.function'],
    variables: ['variable', 'entity.name.variable']
};
export class ColorThemeData {
    static { this.STORAGE_KEY = 'colorThemeData'; }
    constructor(id, label, settingsId) {
        this.themeTokenColors = [];
        this.customTokenColors = [];
        this.colorMap = {};
        this.customColorMap = {};
        this.semanticTokenRules = [];
        this.customSemanticTokenRules = [];
        this.textMateThemingRules = undefined; // created on demand
        this.tokenColorIndex = undefined; // created on demand
        this.tokenFontIndex = undefined; // created on demand
        this.id = id;
        this.label = label;
        this.settingsId = settingsId;
        this.isLoaded = false;
    }
    get semanticHighlighting() {
        if (this.customSemanticHighlighting !== undefined) {
            return this.customSemanticHighlighting;
        }
        if (this.customSemanticHighlightingDeprecated !== undefined) {
            return this.customSemanticHighlightingDeprecated;
        }
        return !!this.themeSemanticHighlighting;
    }
    get tokenColors() {
        if (!this.textMateThemingRules) {
            const result = [];
            // the default rule (scope empty) is always the first rule. Ignore all other default rules.
            const foreground = this.getColor(editorForeground) || this.getDefault(editorForeground);
            const background = this.getColor(editorBackground) || this.getDefault(editorBackground);
            result.push({
                settings: {
                    foreground: normalizeColor(foreground),
                    background: normalizeColor(background)
                }
            });
            let hasDefaultTokens = false;
            function addRule(rule) {
                if (rule.scope && rule.settings) {
                    if (rule.scope === 'token.info-token') {
                        hasDefaultTokens = true;
                    }
                    const ruleSettings = rule.settings;
                    result.push({
                        scope: rule.scope, settings: {
                            foreground: normalizeColor(ruleSettings.foreground),
                            background: normalizeColor(ruleSettings.background),
                            fontStyle: ruleSettings.fontStyle,
                            fontSize: ruleSettings.fontSize,
                            fontFamily: ruleSettings.fontFamily,
                            lineHeight: ruleSettings.lineHeight
                        }
                    });
                }
            }
            this.themeTokenColors.forEach(addRule);
            // Add the custom colors after the theme colors
            // so that they will override them
            this.customTokenColors.forEach(addRule);
            if (!hasDefaultTokens) {
                defaultThemeColors[this.type].forEach(addRule);
            }
            this.textMateThemingRules = result;
        }
        return this.textMateThemingRules;
    }
    getColor(colorId, useDefault) {
        const customColor = this.customColorMap[colorId];
        if (customColor instanceof Color) {
            return customColor;
        }
        if (customColor === undefined) { /* !== DEFAULT_COLOR_CONFIG_VALUE */
            const color = this.colorMap[colorId];
            if (color !== undefined) {
                return color;
            }
        }
        if (useDefault !== false) {
            return this.getDefault(colorId);
        }
        return undefined;
    }
    getTokenStyle(type, modifiers, language, useDefault = true, definitions = {}) {
        const result = {
            foreground: undefined,
            bold: undefined,
            underline: undefined,
            strikethrough: undefined,
            italic: undefined
        };
        const score = {
            foreground: -1,
            bold: -1,
            underline: -1,
            strikethrough: -1,
            italic: -1,
            fontFamily: -1,
            fontSize: -1,
            lineHeight: -1
        };
        function _processStyle(matchScore, style, definition) {
            if (style.foreground && score.foreground <= matchScore) {
                score.foreground = matchScore;
                result.foreground = style.foreground;
                definitions.foreground = definition;
            }
            for (const p of ['bold', 'underline', 'strikethrough', 'italic']) {
                const property = p;
                const info = style[property];
                if (info !== undefined) {
                    if (score[property] <= matchScore) {
                        score[property] = matchScore;
                        result[property] = info;
                        definitions[property] = definition;
                    }
                }
            }
        }
        function _processSemanticTokenRule(rule) {
            const matchScore = rule.selector.match(type, modifiers, language);
            if (matchScore >= 0) {
                _processStyle(matchScore, rule.style, rule);
            }
        }
        this.semanticTokenRules.forEach(_processSemanticTokenRule);
        this.customSemanticTokenRules.forEach(_processSemanticTokenRule);
        let hasUndefinedStyleProperty = false;
        for (const k in score) {
            const key = k;
            if (score[key] === -1) {
                hasUndefinedStyleProperty = true;
            }
            else {
                score[key] = Number.MAX_VALUE; // set it to the max, so it won't be replaced by a default
            }
        }
        if (hasUndefinedStyleProperty) {
            for (const rule of tokenClassificationRegistry.getTokenStylingDefaultRules()) {
                const matchScore = rule.selector.match(type, modifiers, language);
                if (matchScore >= 0) {
                    let style;
                    if (rule.defaults.scopesToProbe) {
                        style = this.resolveScopes(rule.defaults.scopesToProbe);
                        if (style) {
                            _processStyle(matchScore, style, rule.defaults.scopesToProbe);
                        }
                    }
                    if (!style && useDefault !== false) {
                        const tokenStyleValue = rule.defaults[this.type];
                        style = this.resolveTokenStyleValue(tokenStyleValue);
                        if (style) {
                            _processStyle(matchScore, style, tokenStyleValue);
                        }
                    }
                }
            }
        }
        return TokenStyle.fromData(result);
    }
    /**
     * @param tokenStyleValue Resolve a tokenStyleValue in the context of a theme
     */
    resolveTokenStyleValue(tokenStyleValue) {
        if (tokenStyleValue === undefined) {
            return undefined;
        }
        else if (typeof tokenStyleValue === 'string') {
            const { type, modifiers, language } = parseClassifierString(tokenStyleValue, '');
            return this.getTokenStyle(type, modifiers, language);
        }
        else if (typeof tokenStyleValue === 'object') {
            return tokenStyleValue;
        }
        return undefined;
    }
    getTokenColorIndex() {
        // collect all colors that tokens can have
        if (!this.tokenColorIndex) {
            const index = new TokenColorIndex();
            this.tokenColors.forEach(rule => {
                index.add(rule.settings.foreground);
                index.add(rule.settings.background);
            });
            this.semanticTokenRules.forEach(r => index.add(r.style.foreground));
            tokenClassificationRegistry.getTokenStylingDefaultRules().forEach(r => {
                const defaultColor = r.defaults[this.type];
                if (defaultColor && typeof defaultColor === 'object') {
                    index.add(defaultColor.foreground);
                }
            });
            this.customSemanticTokenRules.forEach(r => index.add(r.style.foreground));
            this.tokenColorIndex = index;
        }
        return this.tokenColorIndex;
    }
    getTokenFontIndex() {
        if (!this.tokenFontIndex) {
            const index = new TokenFontIndex();
            this.tokenColors.forEach(r => index.add(r.settings.fontFamily, r.settings.fontSize, r.settings.lineHeight));
            this.tokenFontIndex = index;
        }
        return this.tokenFontIndex;
    }
    get tokenColorMap() {
        return this.getTokenColorIndex().asArray();
    }
    get tokenFontMap() {
        return this.getTokenFontIndex().asArray();
    }
    getTokenStyleMetadata(typeWithLanguage, modifiers, defaultLanguage, useDefault = true, definitions = {}) {
        const { type, language } = parseClassifierString(typeWithLanguage, defaultLanguage);
        const style = this.getTokenStyle(type, modifiers, language, useDefault, definitions);
        if (!style) {
            return undefined;
        }
        return {
            foreground: this.getTokenColorIndex().get(style.foreground),
            bold: style.bold,
            underline: style.underline,
            strikethrough: style.strikethrough,
            italic: style.italic,
        };
    }
    getTokenStylingRuleScope(rule) {
        if (this.customSemanticTokenRules.indexOf(rule) !== -1) {
            return 'setting';
        }
        if (this.semanticTokenRules.indexOf(rule) !== -1) {
            return 'theme';
        }
        return undefined;
    }
    getDefault(colorId) {
        return colorRegistry.resolveDefaultColor(colorId, this);
    }
    resolveScopes(scopes, definitions) {
        if (!this.themeTokenScopeMatchers) {
            this.themeTokenScopeMatchers = this.themeTokenColors.map(getScopeMatcher);
        }
        if (!this.customTokenScopeMatchers) {
            this.customTokenScopeMatchers = this.customTokenColors.map(getScopeMatcher);
        }
        for (const scope of scopes) {
            let foreground = undefined;
            let fontStyle = undefined;
            let foregroundScore = -1;
            let fontStyleScore = -1;
            let fontStyleThemingRule = undefined;
            let foregroundThemingRule = undefined;
            function findTokenStyleForScopeInScopes(scopeMatchers, themingRules) {
                for (let i = 0; i < scopeMatchers.length; i++) {
                    const score = scopeMatchers[i](scope);
                    if (score >= 0) {
                        const themingRule = themingRules[i];
                        const settings = themingRules[i].settings;
                        if (score >= foregroundScore && settings.foreground) {
                            foreground = settings.foreground;
                            foregroundScore = score;
                            foregroundThemingRule = themingRule;
                        }
                        if (score >= fontStyleScore && types.isString(settings.fontStyle)) {
                            fontStyle = settings.fontStyle;
                            fontStyleScore = score;
                            fontStyleThemingRule = themingRule;
                        }
                    }
                }
            }
            findTokenStyleForScopeInScopes(this.themeTokenScopeMatchers, this.themeTokenColors);
            findTokenStyleForScopeInScopes(this.customTokenScopeMatchers, this.customTokenColors);
            if (foreground !== undefined || fontStyle !== undefined) {
                if (definitions) {
                    definitions.foreground = foregroundThemingRule;
                    definitions.bold = definitions.italic = definitions.underline = definitions.strikethrough = fontStyleThemingRule;
                    definitions.scope = scope;
                }
                return TokenStyle.fromSettings(foreground, fontStyle);
            }
        }
        return undefined;
    }
    defines(colorId) {
        const customColor = this.customColorMap[colorId];
        if (customColor instanceof Color) {
            return true;
        }
        return customColor === undefined /* !== DEFAULT_COLOR_CONFIG_VALUE */ && this.colorMap.hasOwnProperty(colorId);
    }
    setCustomizations(settings) {
        this.setCustomColors(settings.colorCustomizations);
        this.setCustomTokenColors(settings.tokenColorCustomizations);
        this.setCustomSemanticTokenColors(settings.semanticTokenColorCustomizations);
    }
    setCustomColors(colors) {
        this.customColorMap = {};
        this.overwriteCustomColors(colors);
        const themeSpecificColors = this.getThemeSpecificColors(colors);
        if (types.isObject(themeSpecificColors)) {
            this.overwriteCustomColors(themeSpecificColors);
        }
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
        this.customTokenScopeMatchers = undefined;
    }
    overwriteCustomColors(colors) {
        for (const id in colors) {
            const colorVal = colors[id];
            if (colorVal === DEFAULT_COLOR_CONFIG_VALUE) {
                this.customColorMap[id] = DEFAULT_COLOR_CONFIG_VALUE;
            }
            else if (typeof colorVal === 'string') {
                this.customColorMap[id] = Color.fromHex(colorVal);
            }
        }
    }
    setCustomTokenColors(customTokenColors) {
        this.customTokenColors = [];
        this.customSemanticHighlightingDeprecated = undefined;
        // first add the non-theme specific settings
        this.addCustomTokenColors(customTokenColors);
        // append theme specific settings. Last rules will win.
        const themeSpecificTokenColors = this.getThemeSpecificColors(customTokenColors);
        if (types.isObject(themeSpecificTokenColors)) {
            this.addCustomTokenColors(themeSpecificTokenColors);
        }
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
        this.customTokenScopeMatchers = undefined;
    }
    setCustomSemanticTokenColors(semanticTokenColors) {
        this.customSemanticTokenRules = [];
        this.customSemanticHighlighting = undefined;
        if (semanticTokenColors) {
            this.customSemanticHighlighting = semanticTokenColors.enabled;
            if (semanticTokenColors.rules) {
                this.readSemanticTokenRules(semanticTokenColors.rules);
            }
            const themeSpecificColors = this.getThemeSpecificColors(semanticTokenColors);
            if (types.isObject(themeSpecificColors)) {
                if (themeSpecificColors.enabled !== undefined) {
                    this.customSemanticHighlighting = themeSpecificColors.enabled;
                }
                if (themeSpecificColors.rules) {
                    this.readSemanticTokenRules(themeSpecificColors.rules);
                }
            }
        }
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
    }
    isThemeScope(key) {
        return key.charAt(0) === THEME_SCOPE_OPEN_PAREN && key.charAt(key.length - 1) === THEME_SCOPE_CLOSE_PAREN;
    }
    isThemeScopeMatch(themeId) {
        const themeIdFirstChar = themeId.charAt(0);
        const themeIdLastChar = themeId.charAt(themeId.length - 1);
        const themeIdPrefix = themeId.slice(0, -1);
        const themeIdInfix = themeId.slice(1, -1);
        const themeIdSuffix = themeId.slice(1);
        return themeId === this.settingsId
            || (this.settingsId.includes(themeIdInfix) && themeIdFirstChar === THEME_SCOPE_WILDCARD && themeIdLastChar === THEME_SCOPE_WILDCARD)
            || (this.settingsId.startsWith(themeIdPrefix) && themeIdLastChar === THEME_SCOPE_WILDCARD)
            || (this.settingsId.endsWith(themeIdSuffix) && themeIdFirstChar === THEME_SCOPE_WILDCARD);
    }
    getThemeSpecificColors(colors) {
        let themeSpecificColors;
        for (const key in colors) {
            const scopedColors = colors[key];
            if (this.isThemeScope(key) && scopedColors instanceof Object && !Array.isArray(scopedColors)) {
                const themeScopeList = key.match(themeScopeRegex) || [];
                for (const themeScope of themeScopeList) {
                    const themeId = themeScope.substring(1, themeScope.length - 1);
                    if (this.isThemeScopeMatch(themeId)) {
                        if (!themeSpecificColors) {
                            themeSpecificColors = {};
                        }
                        const scopedThemeSpecificColors = scopedColors;
                        for (const subkey in scopedThemeSpecificColors) {
                            const originalColors = themeSpecificColors[subkey];
                            const overrideColors = scopedThemeSpecificColors[subkey];
                            if (Array.isArray(originalColors) && Array.isArray(overrideColors)) {
                                themeSpecificColors[subkey] = originalColors.concat(overrideColors);
                            }
                            else if (overrideColors) {
                                themeSpecificColors[subkey] = overrideColors;
                            }
                        }
                    }
                }
            }
        }
        return themeSpecificColors;
    }
    readSemanticTokenRules(tokenStylingRuleSection) {
        for (const key in tokenStylingRuleSection) {
            if (!this.isThemeScope(key)) { // still do this test until experimental settings are gone
                try {
                    const rule = readSemanticTokenRule(key, tokenStylingRuleSection[key]);
                    if (rule) {
                        this.customSemanticTokenRules.push(rule);
                    }
                }
                catch (e) {
                    // invalid selector, ignore
                }
            }
        }
    }
    addCustomTokenColors(customTokenColors) {
        // Put the general customizations such as comments, strings, etc. first so that
        // they can be overridden by specific customizations like "string.interpolated"
        for (const tokenGroup in tokenGroupToScopesMap) {
            const group = tokenGroup; // TS doesn't type 'tokenGroup' properly
            const value = customTokenColors[group];
            if (value) {
                const settings = typeof value === 'string' ? { foreground: value } : value;
                const scopes = tokenGroupToScopesMap[group];
                for (const scope of scopes) {
                    this.customTokenColors.push({ scope, settings });
                }
            }
        }
        // specific customizations
        if (Array.isArray(customTokenColors.textMateRules)) {
            for (const rule of customTokenColors.textMateRules) {
                if (rule.scope && rule.settings) {
                    this.customTokenColors.push(rule);
                }
            }
        }
        if (customTokenColors.semanticHighlighting !== undefined) {
            this.customSemanticHighlightingDeprecated = customTokenColors.semanticHighlighting;
        }
    }
    ensureLoaded(extensionResourceLoaderService) {
        return !this.isLoaded ? this.load(extensionResourceLoaderService) : Promise.resolve(undefined);
    }
    reload(extensionResourceLoaderService) {
        return this.load(extensionResourceLoaderService);
    }
    load(extensionResourceLoaderService) {
        if (!this.location) {
            return Promise.resolve(undefined);
        }
        this.themeTokenColors = [];
        this.clearCaches();
        const result = {
            colors: {},
            textMateRules: [],
            semanticTokenRules: [],
            semanticHighlighting: false
        };
        return _loadColorTheme(extensionResourceLoaderService, this.location, result).then(_ => {
            this.isLoaded = true;
            this.semanticTokenRules = result.semanticTokenRules;
            this.colorMap = result.colors;
            this.themeTokenColors = result.textMateRules;
            this.themeSemanticHighlighting = result.semanticHighlighting;
        });
    }
    clearCaches() {
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
        this.themeTokenScopeMatchers = undefined;
        this.customTokenScopeMatchers = undefined;
    }
    toStorage(storageService) {
        const colorMapData = {};
        for (const key in this.colorMap) {
            colorMapData[key] = Color.Format.CSS.formatHexA(this.colorMap[key], true);
        }
        // no need to persist custom colors, they will be taken from the settings
        const value = JSON.stringify({
            id: this.id,
            label: this.label,
            settingsId: this.settingsId,
            themeTokenColors: this.themeTokenColors.map(tc => ({ settings: tc.settings, scope: tc.scope })), // don't persist names
            semanticTokenRules: this.semanticTokenRules.map(SemanticTokenRule.toJSONObject),
            extensionData: ExtensionData.toJSONObject(this.extensionData),
            themeSemanticHighlighting: this.themeSemanticHighlighting,
            colorMap: colorMapData,
            watch: this.watch
        });
        // roam persisted color theme colors. Don't enable for icons as they contain references to fonts and images.
        storageService.store(ColorThemeData.STORAGE_KEY, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    get themeTypeSelector() {
        return this.classNames[0];
    }
    get classNames() {
        return this.id.split(' ');
    }
    get type() {
        switch (this.themeTypeSelector) {
            case ThemeTypeSelector.VS: return ColorScheme.LIGHT;
            case ThemeTypeSelector.HC_BLACK: return ColorScheme.HIGH_CONTRAST_DARK;
            case ThemeTypeSelector.HC_LIGHT: return ColorScheme.HIGH_CONTRAST_LIGHT;
            default: return ColorScheme.DARK;
        }
    }
    // constructors
    static createUnloadedThemeForThemeType(themeType, colorMap) {
        return ColorThemeData.createUnloadedTheme(getThemeTypeSelector(themeType), colorMap);
    }
    static createUnloadedTheme(id, colorMap) {
        const themeData = new ColorThemeData(id, '', '__' + id);
        themeData.isLoaded = false;
        themeData.themeTokenColors = [];
        themeData.watch = false;
        if (colorMap) {
            for (const id in colorMap) {
                themeData.colorMap[id] = Color.fromHex(colorMap[id]);
            }
        }
        return themeData;
    }
    static createLoadedEmptyTheme(id, settingsId) {
        const themeData = new ColorThemeData(id, '', settingsId);
        themeData.isLoaded = true;
        themeData.themeTokenColors = [];
        themeData.watch = false;
        return themeData;
    }
    static fromStorageData(storageService) {
        const input = storageService.get(ColorThemeData.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!input) {
            return undefined;
        }
        try {
            const data = JSON.parse(input);
            const theme = new ColorThemeData('', '', '');
            for (const key in data) {
                switch (key) {
                    case 'colorMap': {
                        const colorMapData = data[key];
                        for (const id in colorMapData) {
                            theme.colorMap[id] = Color.fromHex(colorMapData[id]);
                        }
                        break;
                    }
                    case 'themeTokenColors':
                    case 'id':
                    case 'label':
                    case 'settingsId':
                    case 'watch':
                    case 'themeSemanticHighlighting':
                        // eslint-disable-next-line local/code-no-any-casts
                        theme[key] = data[key];
                        break;
                    case 'semanticTokenRules': {
                        const rulesData = data[key];
                        if (Array.isArray(rulesData)) {
                            for (const d of rulesData) {
                                const rule = SemanticTokenRule.fromJSONObject(tokenClassificationRegistry, d);
                                if (rule) {
                                    theme.semanticTokenRules.push(rule);
                                }
                            }
                        }
                        break;
                    }
                    case 'location':
                        // ignore, no longer restore
                        break;
                    case 'extensionData':
                        theme.extensionData = ExtensionData.fromJSONObject(data.extensionData);
                        break;
                }
            }
            if (!theme.id || !theme.settingsId) {
                return undefined;
            }
            return theme;
        }
        catch (e) {
            return undefined;
        }
    }
    static fromExtensionTheme(theme, colorThemeLocation, extensionData) {
        const baseTheme = theme['uiTheme'] || 'vs-dark';
        const themeSelector = toCSSSelector(extensionData.extensionId, theme.path);
        const id = `${baseTheme} ${themeSelector}`;
        const label = theme.label || basename(theme.path);
        const settingsId = theme.id || label;
        const themeData = new ColorThemeData(id, label, settingsId);
        themeData.description = theme.description;
        themeData.watch = theme._watch === true;
        themeData.location = colorThemeLocation;
        themeData.extensionData = extensionData;
        themeData.isLoaded = false;
        return themeData;
    }
}
function toCSSSelector(extensionId, path) {
    if (path.startsWith('./')) {
        path = path.substr(2);
    }
    let str = `${extensionId}-${path}`;
    //remove all characters that are not allowed in css
    str = str.replace(/[^_a-zA-Z0-9-]/g, '-');
    if (str.charAt(0).match(/[0-9-]/)) {
        str = '_' + str;
    }
    return str;
}
async function _loadColorTheme(extensionResourceLoaderService, themeLocation, result) {
    if (resources.extname(themeLocation) === '.json') {
        const content = await extensionResourceLoaderService.readExtensionResource(themeLocation);
        const errors = [];
        const contentValue = Json.parse(content, errors);
        if (errors.length > 0) {
            return Promise.reject(new Error(nls.localize('error.cannotparsejson', "Problems parsing JSON theme file: {0}", errors.map(e => getParseErrorMessage(e.error)).join(', '))));
        }
        else if (Json.getNodeType(contentValue) !== 'object') {
            return Promise.reject(new Error(nls.localize('error.invalidformat', "Invalid format for JSON theme file: Object expected.")));
        }
        if (contentValue.include) {
            await _loadColorTheme(extensionResourceLoaderService, resources.joinPath(resources.dirname(themeLocation), contentValue.include), result);
        }
        if (Array.isArray(contentValue.settings)) {
            convertSettings(contentValue.settings, result);
            return null;
        }
        result.semanticHighlighting = result.semanticHighlighting || contentValue.semanticHighlighting;
        const colors = contentValue.colors;
        if (colors) {
            if (typeof colors !== 'object') {
                return Promise.reject(new Error(nls.localize({ key: 'error.invalidformat.colors', comment: ['{0} will be replaced by a path. Values in quotes should not be translated.'] }, "Problem parsing color theme file: {0}. Property 'colors' is not of type 'object'.", themeLocation.toString())));
            }
            // new JSON color themes format
            for (const colorId in colors) {
                const colorVal = colors[colorId];
                if (colorVal === DEFAULT_COLOR_CONFIG_VALUE) { // ignore colors that are set to to default
                    delete result.colors[colorId];
                }
                else if (typeof colorVal === 'string') {
                    result.colors[colorId] = Color.fromHex(colors[colorId]);
                }
            }
        }
        const tokenColors = contentValue.tokenColors;
        if (tokenColors) {
            if (Array.isArray(tokenColors)) {
                result.textMateRules.push(...tokenColors);
            }
            else if (typeof tokenColors === 'string') {
                await _loadSyntaxTokens(extensionResourceLoaderService, resources.joinPath(resources.dirname(themeLocation), tokenColors), result);
            }
            else {
                return Promise.reject(new Error(nls.localize({ key: 'error.invalidformat.tokenColors', comment: ['{0} will be replaced by a path. Values in quotes should not be translated.'] }, "Problem parsing color theme file: {0}. Property 'tokenColors' should be either an array specifying colors or a path to a TextMate theme file", themeLocation.toString())));
            }
        }
        const semanticTokenColors = contentValue.semanticTokenColors;
        if (semanticTokenColors && typeof semanticTokenColors === 'object') {
            for (const key in semanticTokenColors) {
                try {
                    const rule = readSemanticTokenRule(key, semanticTokenColors[key]);
                    if (rule) {
                        result.semanticTokenRules.push(rule);
                    }
                }
                catch (e) {
                    return Promise.reject(new Error(nls.localize({ key: 'error.invalidformat.semanticTokenColors', comment: ['{0} will be replaced by a path. Values in quotes should not be translated.'] }, "Problem parsing color theme file: {0}. Property 'semanticTokenColors' contains a invalid selector", themeLocation.toString())));
                }
            }
        }
    }
    else {
        return _loadSyntaxTokens(extensionResourceLoaderService, themeLocation, result);
    }
}
function _loadSyntaxTokens(extensionResourceLoaderService, themeLocation, result) {
    return extensionResourceLoaderService.readExtensionResource(themeLocation).then(content => {
        try {
            const contentValue = parsePList(content);
            const settings = contentValue.settings;
            if (!Array.isArray(settings)) {
                return Promise.reject(new Error(nls.localize('error.plist.invalidformat', "Problem parsing tmTheme file: {0}. 'settings' is not array.")));
            }
            convertSettings(settings, result);
            return Promise.resolve(null);
        }
        catch (e) {
            return Promise.reject(new Error(nls.localize('error.cannotparse', "Problems parsing tmTheme file: {0}", e.message)));
        }
    }, error => {
        return Promise.reject(new Error(nls.localize('error.cannotload', "Problems loading tmTheme file {0}: {1}", themeLocation.toString(), error.message)));
    });
}
const defaultThemeColors = {
    'light': [
        { scope: 'token.info-token', settings: { foreground: '#316bcd' } },
        { scope: 'token.warn-token', settings: { foreground: '#cd9731' } },
        { scope: 'token.error-token', settings: { foreground: '#cd3131' } },
        { scope: 'token.debug-token', settings: { foreground: '#800080' } }
    ],
    'dark': [
        { scope: 'token.info-token', settings: { foreground: '#6796e6' } },
        { scope: 'token.warn-token', settings: { foreground: '#cd9731' } },
        { scope: 'token.error-token', settings: { foreground: '#f44747' } },
        { scope: 'token.debug-token', settings: { foreground: '#b267e6' } }
    ],
    'hcLight': [
        { scope: 'token.info-token', settings: { foreground: '#316bcd' } },
        { scope: 'token.warn-token', settings: { foreground: '#cd9731' } },
        { scope: 'token.error-token', settings: { foreground: '#cd3131' } },
        { scope: 'token.debug-token', settings: { foreground: '#800080' } }
    ],
    'hcDark': [
        { scope: 'token.info-token', settings: { foreground: '#6796e6' } },
        { scope: 'token.warn-token', settings: { foreground: '#008000' } },
        { scope: 'token.error-token', settings: { foreground: '#FF0000' } },
        { scope: 'token.debug-token', settings: { foreground: '#b267e6' } }
    ]
};
const noMatch = (_scope) => -1;
function nameMatcher(identifiers, scopes) {
    if (scopes.length < identifiers.length) {
        return -1;
    }
    let score = undefined;
    const every = identifiers.every((identifier) => {
        for (let i = scopes.length - 1; i >= 0; i--) {
            if (scopesAreMatching(scopes[i], identifier)) {
                score = (i + 1) * 0x10000 + identifier.length;
                return true;
            }
        }
        return false;
    });
    return every && score !== undefined ? score : -1;
}
function scopesAreMatching(thisScopeName, scopeName) {
    if (!thisScopeName) {
        return false;
    }
    if (thisScopeName === scopeName) {
        return true;
    }
    const len = scopeName.length;
    return thisScopeName.length > len && thisScopeName.substr(0, len) === scopeName && thisScopeName[len] === '.';
}
function getScopeMatcher(rule) {
    const ruleScope = rule.scope;
    if (!ruleScope || !rule.settings) {
        return noMatch;
    }
    const matchers = [];
    if (Array.isArray(ruleScope)) {
        for (const rs of ruleScope) {
            createMatchers(rs, nameMatcher, matchers);
        }
    }
    else {
        createMatchers(ruleScope, nameMatcher, matchers);
    }
    if (matchers.length === 0) {
        return noMatch;
    }
    return (scope) => {
        let max = matchers[0].matcher(scope);
        for (let i = 1; i < matchers.length; i++) {
            max = Math.max(max, matchers[i].matcher(scope));
        }
        return max;
    };
}
function readSemanticTokenRule(selectorString, settings) {
    const selector = tokenClassificationRegistry.parseTokenSelector(selectorString);
    let style;
    if (typeof settings === 'string') {
        style = TokenStyle.fromSettings(settings, undefined);
    }
    else if (isSemanticTokenColorizationSetting(settings)) {
        style = TokenStyle.fromSettings(settings.foreground, settings.fontStyle, settings.bold, settings.underline, settings.strikethrough, settings.italic);
    }
    if (style) {
        return { selector, style };
    }
    return undefined;
}
function isSemanticTokenColorizationSetting(style) {
    return style && (types.isString(style.foreground) || types.isString(style.fontStyle) || types.isBoolean(style.italic)
        || types.isBoolean(style.underline) || types.isBoolean(style.strikethrough) || types.isBoolean(style.bold));
}
export function findMetadata(colorThemeData, captureNames, languageId, bracket) {
    let metadata = 0;
    metadata |= (languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
    const definitions = {};
    const tokenStyle = colorThemeData.resolveScopes([captureNames], definitions);
    if (captureNames.length > 0) {
        const standardToken = toStandardTokenType(captureNames[captureNames.length - 1]);
        metadata |= (standardToken << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */);
    }
    const fontStyle = definitions.foreground?.settings.fontStyle || definitions.bold?.settings.fontStyle;
    if (fontStyle?.includes('italic')) {
        metadata |= 1 /* FontStyle.Italic */ | 2048 /* MetadataConsts.ITALIC_MASK */;
    }
    if (fontStyle?.includes('bold')) {
        metadata |= 2 /* FontStyle.Bold */ | 4096 /* MetadataConsts.BOLD_MASK */;
    }
    if (fontStyle?.includes('underline')) {
        metadata |= 4 /* FontStyle.Underline */ | 8192 /* MetadataConsts.UNDERLINE_MASK */;
    }
    if (fontStyle?.includes('strikethrough')) {
        metadata |= 8 /* FontStyle.Strikethrough */ | 16384 /* MetadataConsts.STRIKETHROUGH_MASK */;
    }
    const foreground = tokenStyle?.foreground;
    const tokenStyleForeground = (foreground !== undefined) ? colorThemeData.getTokenColorIndex().get(foreground) : 1 /* ColorId.DefaultForeground */;
    metadata |= tokenStyleForeground << 15 /* MetadataConsts.FOREGROUND_OFFSET */;
    if (bracket) {
        metadata |= 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
    }
    return metadata;
}
class TokenColorIndex {
    constructor() {
        this._lastColorId = 0;
        this._id2color = [];
        this._color2id = Object.create(null);
    }
    add(color) {
        color = normalizeColor(color);
        if (color === undefined) {
            return 0;
        }
        let value = this._color2id[color];
        if (value) {
            return value;
        }
        value = ++this._lastColorId;
        this._color2id[color] = value;
        this._id2color[value] = color;
        return value;
    }
    get(color) {
        color = normalizeColor(color);
        if (color === undefined) {
            return 0;
        }
        const value = this._color2id[color];
        if (value) {
            return value;
        }
        console.log(`Color ${color} not in index.`);
        return 0;
    }
    asArray() {
        return this._id2color.slice(0);
    }
}
class TokenFontIndex {
    constructor() {
        this._lastFontId = 0;
        this._id2font = [];
        this._font2id = new Map();
    }
    add(fontFamily, fontSize, lineHeight) {
        const font = { fontFamily, fontSize, lineHeight };
        let value = this._font2id.get(font);
        if (value) {
            return value;
        }
        value = ++this._lastFontId;
        this._font2id.set(font, value);
        this._id2font[value] = font;
        return value;
    }
    get(font) {
        const value = this._font2id.get(font);
        if (value) {
            return value;
        }
        return 0;
    }
    asArray() {
        return this._id2font.slice(0);
    }
}
function normalizeColor(color) {
    if (!color) {
        return undefined;
    }
    if (typeof color !== 'string') {
        color = Color.Format.CSS.formatHexA(color, true);
    }
    const len = color.length;
    if (color.charCodeAt(0) !== 35 /* CharCode.Hash */ || (len !== 4 && len !== 5 && len !== 7 && len !== 9)) {
        return undefined;
    }
    const result = [35 /* CharCode.Hash */];
    for (let i = 1; i < len; i++) {
        const upper = hexUpper(color.charCodeAt(i));
        if (!upper) {
            return undefined;
        }
        result.push(upper);
        if (len === 4 || len === 5) {
            result.push(upper);
        }
    }
    if (result.length === 9 && result[7] === 70 /* CharCode.F */ && result[8] === 70 /* CharCode.F */) {
        result.length = 7;
    }
    return String.fromCharCode(...result);
}
function hexUpper(charCode) {
    if (charCode >= 48 /* CharCode.Digit0 */ && charCode <= 57 /* CharCode.Digit9 */ || charCode >= 65 /* CharCode.A */ && charCode <= 70 /* CharCode.F */) {
        return charCode;
    }
    else if (charCode >= 97 /* CharCode.a */ && charCode <= 102 /* CharCode.f */) {
        return charCode - 97 /* CharCode.a */ + 65 /* CharCode.A */;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JUaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vY29sb3JUaGVtZURhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQXFSLHVCQUF1QixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RhLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMxRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUFtQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzVNLE9BQU8sRUFBa0Msb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFcEYsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFjLDhCQUE4QixFQUFtQyxx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QUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNsRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbkUsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO0tBQ25FO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNsRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbkUsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO0tBQ25FO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNsRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbkUsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO0tB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
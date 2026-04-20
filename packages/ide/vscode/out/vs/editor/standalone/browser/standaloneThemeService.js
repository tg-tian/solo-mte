/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import { addMatchMediaChangeListener } from '../../../base/browser/browser.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { TokenizationRegistry } from '../../common/languages.js';
import { TokenMetadata } from '../../common/encodedTokenAttributes.js';
import { TokenTheme, generateTokensCSSForColorMap } from '../../common/languages/supports/tokenization.js';
import { hc_black, hc_light, vs, vs_dark } from '../common/themes.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { asCssVariableName, Extensions } from '../../../platform/theme/common/colorRegistry.js';
import { Extensions as ThemingExtensions } from '../../../platform/theme/common/themeService.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ColorScheme, isDark, isHighContrast } from '../../../platform/theme/common/theme.js';
import { getIconsStyleSheet, UnthemedProductIconTheme } from '../../../platform/theme/browser/iconsStyleSheet.js';
import { mainWindow } from '../../../base/browser/window.js';
export const VS_LIGHT_THEME_NAME = 'vs';
export const VS_DARK_THEME_NAME = 'vs-dark';
export const HC_BLACK_THEME_NAME = 'hc-black';
export const HC_LIGHT_THEME_NAME = 'hc-light';
const colorRegistry = Registry.as(Extensions.ColorContribution);
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
class StandaloneTheme {
    constructor(name, standaloneThemeData) {
        this.semanticHighlighting = false;
        this.themeData = standaloneThemeData;
        const base = standaloneThemeData.base;
        if (name.length > 0) {
            if (isBuiltinTheme(name)) {
                this.id = name;
            }
            else {
                this.id = base + ' ' + name;
            }
            this.themeName = name;
        }
        else {
            this.id = base;
            this.themeName = base;
        }
        this.colors = null;
        this.defaultColors = Object.create(null);
        this._tokenTheme = null;
    }
    get label() {
        return this.themeName;
    }
    get base() {
        return this.themeData.base;
    }
    notifyBaseUpdated() {
        if (this.themeData.inherit) {
            this.colors = null;
            this._tokenTheme = null;
        }
    }
    getColors() {
        if (!this.colors) {
            const colors = new Map();
            for (const id in this.themeData.colors) {
                colors.set(id, Color.fromHex(this.themeData.colors[id]));
            }
            if (this.themeData.inherit) {
                const baseData = getBuiltinRules(this.themeData.base);
                for (const id in baseData.colors) {
                    if (!colors.has(id)) {
                        colors.set(id, Color.fromHex(baseData.colors[id]));
                    }
                }
            }
            this.colors = colors;
        }
        return this.colors;
    }
    getColor(colorId, useDefault) {
        const color = this.getColors().get(colorId);
        if (color) {
            return color;
        }
        if (useDefault !== false) {
            return this.getDefault(colorId);
        }
        return undefined;
    }
    getDefault(colorId) {
        let color = this.defaultColors[colorId];
        if (color) {
            return color;
        }
        color = colorRegistry.resolveDefaultColor(colorId, this);
        this.defaultColors[colorId] = color;
        return color;
    }
    defines(colorId) {
        return this.getColors().has(colorId);
    }
    get type() {
        switch (this.base) {
            case VS_LIGHT_THEME_NAME: return ColorScheme.LIGHT;
            case HC_BLACK_THEME_NAME: return ColorScheme.HIGH_CONTRAST_DARK;
            case HC_LIGHT_THEME_NAME: return ColorScheme.HIGH_CONTRAST_LIGHT;
            default: return ColorScheme.DARK;
        }
    }
    get tokenTheme() {
        if (!this._tokenTheme) {
            let rules = [];
            let encodedTokensColors = [];
            if (this.themeData.inherit) {
                const baseData = getBuiltinRules(this.themeData.base);
                rules = baseData.rules;
                if (baseData.encodedTokensColors) {
                    encodedTokensColors = baseData.encodedTokensColors;
                }
            }
            // Pick up default colors from `editor.foreground` and `editor.background` if available
            const editorForeground = this.themeData.colors['editor.foreground'];
            const editorBackground = this.themeData.colors['editor.background'];
            if (editorForeground || editorBackground) {
                const rule = { token: '' };
                if (editorForeground) {
                    rule.foreground = editorForeground;
                }
                if (editorBackground) {
                    rule.background = editorBackground;
                }
                rules.push(rule);
            }
            rules = rules.concat(this.themeData.rules);
            if (this.themeData.encodedTokensColors) {
                encodedTokensColors = this.themeData.encodedTokensColors;
            }
            this._tokenTheme = TokenTheme.createFromRawTokenTheme(rules, encodedTokensColors);
        }
        return this._tokenTheme;
    }
    getTokenStyleMetadata(type, modifiers, modelLanguage) {
        // use theme rules match
        const style = this.tokenTheme._match([type].concat(modifiers).join('.'));
        const metadata = style.metadata;
        const foreground = TokenMetadata.getForeground(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        return {
            foreground: foreground,
            italic: Boolean(fontStyle & 1 /* FontStyle.Italic */),
            bold: Boolean(fontStyle & 2 /* FontStyle.Bold */),
            underline: Boolean(fontStyle & 4 /* FontStyle.Underline */),
            strikethrough: Boolean(fontStyle & 8 /* FontStyle.Strikethrough */)
        };
    }
    get tokenColorMap() {
        return [];
    }
    get tokenFontMap() {
        return [];
    }
}
function isBuiltinTheme(themeName) {
    return (themeName === VS_LIGHT_THEME_NAME
        || themeName === VS_DARK_THEME_NAME
        || themeName === HC_BLACK_THEME_NAME
        || themeName === HC_LIGHT_THEME_NAME);
}
function getBuiltinRules(builtinTheme) {
    switch (builtinTheme) {
        case VS_LIGHT_THEME_NAME:
            return vs;
        case VS_DARK_THEME_NAME:
            return vs_dark;
        case HC_BLACK_THEME_NAME:
            return hc_black;
        case HC_LIGHT_THEME_NAME:
            return hc_light;
    }
}
function newBuiltInTheme(builtinTheme) {
    const themeData = getBuiltinRules(builtinTheme);
    return new StandaloneTheme(builtinTheme, themeData);
}
export class StandaloneThemeService extends Disposable {
    constructor() {
        super();
        this._onColorThemeChange = this._register(new Emitter());
        this.onDidColorThemeChange = this._onColorThemeChange.event;
        this._onFileIconThemeChange = this._register(new Emitter());
        this.onDidFileIconThemeChange = this._onFileIconThemeChange.event;
        this._onProductIconThemeChange = this._register(new Emitter());
        this.onDidProductIconThemeChange = this._onProductIconThemeChange.event;
        this._environment = Object.create(null);
        this._builtInProductIconTheme = new UnthemedProductIconTheme();
        this._autoDetectHighContrast = true;
        this._knownThemes = new Map();
        this._knownThemes.set(VS_LIGHT_THEME_NAME, newBuiltInTheme(VS_LIGHT_THEME_NAME));
        this._knownThemes.set(VS_DARK_THEME_NAME, newBuiltInTheme(VS_DARK_THEME_NAME));
        this._knownThemes.set(HC_BLACK_THEME_NAME, newBuiltInTheme(HC_BLACK_THEME_NAME));
        this._knownThemes.set(HC_LIGHT_THEME_NAME, newBuiltInTheme(HC_LIGHT_THEME_NAME));
        const iconsStyleSheet = this._register(getIconsStyleSheet(this));
        this._codiconCSS = iconsStyleSheet.getCSS();
        this._themeCSS = '';
        this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
        this._globalStyleElement = null;
        this._styleElements = [];
        this._colorMapOverride = null;
        this.setTheme(VS_LIGHT_THEME_NAME);
        this._onOSSchemeChanged();
        this._register(iconsStyleSheet.onDidChange(() => {
            this._codiconCSS = iconsStyleSheet.getCSS();
            this._updateCSS();
        }));
        addMatchMediaChangeListener(mainWindow, '(forced-colors: active)', () => {
            // Update theme selection for auto-detecting high contrast
            this._onOSSchemeChanged();
        });
    }
    registerEditorContainer(domNode) {
        if (dom.isInShadowDOM(domNode)) {
            return this._registerShadowDomContainer(domNode);
        }
        return this._registerRegularEditorContainer();
    }
    _registerRegularEditorContainer() {
        if (!this._globalStyleElement) {
            this._globalStyleElement = domStylesheetsJs.createStyleSheet(undefined, style => {
                style.className = 'monaco-colors';
                style.textContent = this._allCSS;
            });
            this._styleElements.push(this._globalStyleElement);
        }
        return Disposable.None;
    }
    _registerShadowDomContainer(domNode) {
        const styleElement = domStylesheetsJs.createStyleSheet(domNode, style => {
            style.className = 'monaco-colors';
            style.textContent = this._allCSS;
        });
        this._styleElements.push(styleElement);
        return {
            dispose: () => {
                for (let i = 0; i < this._styleElements.length; i++) {
                    if (this._styleElements[i] === styleElement) {
                        this._styleElements.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    defineTheme(themeName, themeData) {
        if (!/^[a-z0-9\-]+$/i.test(themeName)) {
            throw new Error('Illegal theme name!');
        }
        if (!isBuiltinTheme(themeData.base) && !isBuiltinTheme(themeName)) {
            throw new Error('Illegal theme base!');
        }
        // set or replace theme
        this._knownThemes.set(themeName, new StandaloneTheme(themeName, themeData));
        if (isBuiltinTheme(themeName)) {
            this._knownThemes.forEach(theme => {
                if (theme.base === themeName) {
                    theme.notifyBaseUpdated();
                }
            });
        }
        if (this._theme.themeName === themeName) {
            this.setTheme(themeName); // refresh theme
        }
    }
    getColorTheme() {
        return this._theme;
    }
    setColorMapOverride(colorMapOverride) {
        this._colorMapOverride = colorMapOverride;
        this._updateThemeOrColorMap();
    }
    setTheme(themeName) {
        let theme;
        if (this._knownThemes.has(themeName)) {
            theme = this._knownThemes.get(themeName);
        }
        else {
            theme = this._knownThemes.get(VS_LIGHT_THEME_NAME);
        }
        this._updateActualTheme(theme);
    }
    _updateActualTheme(desiredTheme) {
        if (!desiredTheme || this._theme === desiredTheme) {
            // Nothing to do
            return;
        }
        this._theme = desiredTheme;
        this._updateThemeOrColorMap();
    }
    _onOSSchemeChanged() {
        if (this._autoDetectHighContrast) {
            const wantsHighContrast = mainWindow.matchMedia(`(forced-colors: active)`).matches;
            if (wantsHighContrast !== isHighContrast(this._theme.type)) {
                // switch to high contrast or non-high contrast but stick to dark or light
                let newThemeName;
                if (isDark(this._theme.type)) {
                    newThemeName = wantsHighContrast ? HC_BLACK_THEME_NAME : VS_DARK_THEME_NAME;
                }
                else {
                    newThemeName = wantsHighContrast ? HC_LIGHT_THEME_NAME : VS_LIGHT_THEME_NAME;
                }
                this._updateActualTheme(this._knownThemes.get(newThemeName));
            }
        }
    }
    setAutoDetectHighContrast(autoDetectHighContrast) {
        this._autoDetectHighContrast = autoDetectHighContrast;
        this._onOSSchemeChanged();
    }
    _updateThemeOrColorMap() {
        const cssRules = [];
        const hasRule = {};
        const ruleCollector = {
            addRule: (rule) => {
                if (!hasRule[rule]) {
                    cssRules.push(rule);
                    hasRule[rule] = true;
                }
            }
        };
        themingRegistry.getThemingParticipants().forEach(p => p(this._theme, ruleCollector, this._environment));
        const colorVariables = [];
        for (const item of colorRegistry.getColors()) {
            const color = this._theme.getColor(item.id, true);
            if (color) {
                colorVariables.push(`${asCssVariableName(item.id)}: ${color.toString()};`);
            }
        }
        ruleCollector.addRule(`.monaco-editor, .monaco-diff-editor, .monaco-component { ${colorVariables.join('\n')} }`);
        const colorMap = this._colorMapOverride || this._theme.tokenTheme.getColorMap();
        ruleCollector.addRule(generateTokensCSSForColorMap(colorMap));
        // If the OS has forced-colors active, disable forced color adjustment for
        // Monaco editor elements so that VS Code's built-in high contrast themes
        // (hc-black / hc-light) are used instead of the OS forcing system colors.
        ruleCollector.addRule(`.monaco-editor, .monaco-diff-editor, .monaco-component { forced-color-adjust: none; }`);
        this._themeCSS = cssRules.join('\n');
        this._updateCSS();
        TokenizationRegistry.setColorMap(colorMap);
        this._onColorThemeChange.fire(this._theme);
    }
    _updateCSS() {
        this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
        this._styleElements.forEach(styleElement => styleElement.textContent = this._allCSS);
    }
    getFileIconTheme() {
        return {
            hasFileIcons: false,
            hasFolderIcons: false,
            hidesExplorerArrows: false
        };
    }
    getProductIconTheme() {
        return this._builtInProductIconTheme;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVUaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQWEsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEYsT0FBTyxFQUFtQixVQUFVLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUU1SCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBbUIsVUFBVSxFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxVQUFVLElBQUksaUJBQWlCLEVBQTJHLE1BQU0sZ0RBQWdELENBQUM7QUFDMU0sT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlG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
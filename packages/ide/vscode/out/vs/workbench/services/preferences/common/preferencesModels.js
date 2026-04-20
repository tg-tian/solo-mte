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
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { visit } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, OVERRIDE_PROPERTY_REGEX } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { SettingMatchType } from './preferences.js';
import { FOLDER_SCOPES, WORKSPACE_SCOPES } from '../../configuration/common/configuration.js';
import { createValidator } from './preferencesValidation.js';
export const nullRange = { startLineNumber: -1, startColumn: -1, endLineNumber: -1, endColumn: -1 };
function isNullRange(range) { return range.startLineNumber === -1 && range.startColumn === -1 && range.endLineNumber === -1 && range.endColumn === -1; }
class AbstractSettingsModel extends EditorModel {
    constructor() {
        super(...arguments);
        this._currentResultGroups = new Map();
    }
    updateResultGroup(id, resultGroup) {
        if (resultGroup) {
            this._currentResultGroups.set(id, resultGroup);
        }
        else {
            this._currentResultGroups.delete(id);
        }
        this.removeDuplicateResults();
        return this.update();
    }
    /**
     * Remove duplicates between result groups, preferring results in earlier groups
     */
    removeDuplicateResults() {
        const settingKeys = new Set();
        [...this._currentResultGroups.keys()]
            .sort((a, b) => this._currentResultGroups.get(a).order - this._currentResultGroups.get(b).order)
            .forEach(groupId => {
            const group = this._currentResultGroups.get(groupId);
            group.result.filterMatches = group.result.filterMatches.filter(s => !settingKeys.has(s.setting.key));
            group.result.filterMatches.forEach(s => settingKeys.add(s.setting.key));
        });
    }
    filterSettings(filter, groupFilter, settingMatcher) {
        const allGroups = this.filterGroups;
        const filterMatches = [];
        for (const group of allGroups) {
            const groupMatched = groupFilter(group);
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    const settingMatchResult = settingMatcher(setting, group);
                    if (groupMatched || settingMatchResult) {
                        filterMatches.push({
                            setting,
                            matches: settingMatchResult && settingMatchResult.matches,
                            matchType: settingMatchResult?.matchType ?? SettingMatchType.None,
                            keyMatchScore: settingMatchResult?.keyMatchScore ?? 0,
                            score: settingMatchResult?.score ?? 0
                        });
                    }
                }
            }
        }
        return filterMatches;
    }
    getPreference(key) {
        for (const group of this.settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (key === setting.key) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    collectMetadata(groups) {
        const metadata = Object.create(null);
        let hasMetadata = false;
        groups.forEach(g => {
            if (g.result.metadata) {
                metadata[g.id] = g.result.metadata;
                hasMetadata = true;
            }
        });
        return hasMetadata ? metadata : null;
    }
    get filterGroups() {
        return this.settingsGroups;
    }
}
export class SettingsEditorModel extends AbstractSettingsModel {
    constructor(reference, _configurationTarget) {
        super();
        this._configurationTarget = _configurationTarget;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this.settingsModel = reference.object.textEditorModel;
        this._register(this.onWillDispose(() => reference.dispose()));
        this._register(this.settingsModel.onDidChangeContent(() => {
            this._settingsGroups = undefined;
            this._onDidChangeGroups.fire();
        }));
    }
    get uri() {
        return this.settingsModel.uri;
    }
    get configurationTarget() {
        return this._configurationTarget;
    }
    get settingsGroups() {
        if (!this._settingsGroups) {
            this.parse();
        }
        return this._settingsGroups;
    }
    get content() {
        return this.settingsModel.getValue();
    }
    isSettingsProperty(property, previousParents) {
        return previousParents.length === 0; // Settings is root
    }
    parse() {
        this._settingsGroups = parse(this.settingsModel, (property, previousParents) => this.isSettingsProperty(property, previousParents));
    }
    update() {
        const resultGroups = [...this._currentResultGroups.values()];
        if (!resultGroups.length) {
            return undefined;
        }
        // Transform resultGroups into IFilterResult - ISetting ranges are already correct here
        const filteredSettings = [];
        const matches = [];
        resultGroups.forEach(group => {
            group.result.filterMatches.forEach(filterMatch => {
                filteredSettings.push(filterMatch.setting);
                if (filterMatch.matches) {
                    matches.push(...filterMatch.matches);
                }
            });
        });
        let filteredGroup;
        const modelGroup = this.settingsGroups[0]; // Editable model has one or zero groups
        if (modelGroup) {
            filteredGroup = {
                id: modelGroup.id,
                range: modelGroup.range,
                sections: [{
                        settings: filteredSettings
                    }],
                title: modelGroup.title,
                titleRange: modelGroup.titleRange,
                order: modelGroup.order,
                extensionInfo: modelGroup.extensionInfo
            };
        }
        const metadata = this.collectMetadata(resultGroups);
        return {
            allGroups: this.settingsGroups,
            filteredGroups: filteredGroup ? [filteredGroup] : [],
            matches,
            metadata: metadata ?? undefined
        };
    }
}
let Settings2EditorModel = class Settings2EditorModel extends AbstractSettingsModel {
    constructor(_defaultSettings, configurationService) {
        super();
        this._defaultSettings = _defaultSettings;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this.additionalGroups = [];
        this.dirty = false;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.source === 7 /* ConfigurationTarget.DEFAULT */) {
                this.dirty = true;
                this._onDidChangeGroups.fire();
            }
        }));
        this._register(Registry.as(Extensions.Configuration).onDidSchemaChange(e => {
            this.dirty = true;
            this._onDidChangeGroups.fire();
        }));
    }
    /** Doesn't include the "Commonly Used" group */
    get filterGroups() {
        return this.settingsGroups.slice(1);
    }
    get settingsGroups() {
        const groups = this._defaultSettings.getSettingsGroups(this.dirty);
        this.dirty = false;
        return [...groups, ...this.additionalGroups];
    }
    /** For programmatically added groups outside of registered configurations */
    setAdditionalGroups(groups) {
        this.additionalGroups = groups;
    }
    update() {
        throw new Error('Not supported');
    }
};
Settings2EditorModel = __decorate([
    __param(1, IConfigurationService)
], Settings2EditorModel);
export { Settings2EditorModel };
function parse(model, isSettingsProperty) {
    const settings = [];
    let overrideSetting = null;
    let currentProperty = null;
    let currentParent = [];
    const previousParents = [];
    let settingsPropertyIndex = -1;
    const range = {
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0
    };
    function onValue(value, offset, length) {
        if (Array.isArray(currentParent)) {
            currentParent.push(value);
        }
        else if (currentProperty) {
            currentParent[currentProperty] = value;
        }
        if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
            // settings value started
            const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting.overrides[overrideSetting.overrides.length - 1];
            if (setting) {
                const valueStartPosition = model.getPositionAt(offset);
                const valueEndPosition = model.getPositionAt(offset + length);
                setting.value = value;
                setting.valueRange = {
                    startLineNumber: valueStartPosition.lineNumber,
                    startColumn: valueStartPosition.column,
                    endLineNumber: valueEndPosition.lineNumber,
                    endColumn: valueEndPosition.column
                };
                setting.range = Object.assign(setting.range, {
                    endLineNumber: valueEndPosition.lineNumber,
                    endColumn: valueEndPosition.column
                });
            }
        }
    }
    const visitor = {
        onObjectBegin: (offset, length) => {
            if (isSettingsProperty(currentProperty, previousParents)) {
                // Settings started
                settingsPropertyIndex = previousParents.length;
                const position = model.getPositionAt(offset);
                range.startLineNumber = position.lineNumber;
                range.startColumn = position.column;
            }
            const object = {};
            onValue(object, offset, length);
            currentParent = object;
            currentProperty = null;
            previousParents.push(currentParent);
        },
        onObjectProperty: (name, offset, length) => {
            currentProperty = name;
            if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
                // setting started
                const settingStartPosition = model.getPositionAt(offset);
                const setting = {
                    description: [],
                    descriptionIsMarkdown: false,
                    key: name,
                    keyRange: {
                        startLineNumber: settingStartPosition.lineNumber,
                        startColumn: settingStartPosition.column + 1,
                        endLineNumber: settingStartPosition.lineNumber,
                        endColumn: settingStartPosition.column + length
                    },
                    range: {
                        startLineNumber: settingStartPosition.lineNumber,
                        startColumn: settingStartPosition.column,
                        endLineNumber: 0,
                        endColumn: 0
                    },
                    value: null,
                    valueRange: nullRange,
                    descriptionRanges: [],
                    overrides: [],
                    overrideOf: overrideSetting ?? undefined,
                };
                if (previousParents.length === settingsPropertyIndex + 1) {
                    settings.push(setting);
                    if (OVERRIDE_PROPERTY_REGEX.test(name)) {
                        overrideSetting = setting;
                    }
                }
                else {
                    overrideSetting.overrides.push(setting);
                }
            }
        },
        onObjectEnd: (offset, length) => {
            currentParent = previousParents.pop();
            if (settingsPropertyIndex !== -1 && (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null))) {
                // setting ended
                const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting.overrides[overrideSetting.overrides.length - 1];
                if (setting) {
                    const valueEndPosition = model.getPositionAt(offset + length);
                    setting.valueRange = Object.assign(setting.valueRange, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                    setting.range = Object.assign(setting.range, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                }
                if (previousParents.length === settingsPropertyIndex + 1) {
                    overrideSetting = null;
                }
            }
            if (previousParents.length === settingsPropertyIndex) {
                // settings ended
                const position = model.getPositionAt(offset);
                range.endLineNumber = position.lineNumber;
                range.endColumn = position.column;
                settingsPropertyIndex = -1;
            }
        },
        onArrayBegin: (offset, length) => {
            const array = [];
            onValue(array, offset, length);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: (offset, length) => {
            currentParent = previousParents.pop();
            if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
                // setting value ended
                const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting.overrides[overrideSetting.overrides.length - 1];
                if (setting) {
                    const valueEndPosition = model.getPositionAt(offset + length);
                    setting.valueRange = Object.assign(setting.valueRange, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                    setting.range = Object.assign(setting.range, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column
                    });
                }
            }
        },
        onLiteralValue: onValue,
        onError: (error) => {
            const setting = settings[settings.length - 1];
            if (setting && (isNullRange(setting.range) || isNullRange(setting.keyRange) || isNullRange(setting.valueRange))) {
                settings.pop();
            }
        }
    };
    if (!model.isDisposed()) {
        visit(model.getValue(), visitor);
    }
    return settings.length > 0 ? [{
            id: model.isDisposed() ? '' : model.id,
            sections: [
                {
                    settings
                }
            ],
            title: '',
            titleRange: nullRange,
            range
        }] : [];
}
export class WorkspaceConfigurationEditorModel extends SettingsEditorModel {
    constructor() {
        super(...arguments);
        this._configurationGroups = [];
    }
    get configurationGroups() {
        return this._configurationGroups;
    }
    parse() {
        super.parse();
        this._configurationGroups = parse(this.settingsModel, (property, previousParents) => previousParents.length === 0);
    }
    isSettingsProperty(property, previousParents) {
        return property === 'settings' && previousParents.length === 1;
    }
}
export class DefaultSettings extends Disposable {
    constructor(_mostCommonlyUsedSettingsKeys, target, configurationService) {
        super();
        this._mostCommonlyUsedSettingsKeys = _mostCommonlyUsedSettingsKeys;
        this.target = target;
        this.configurationService = configurationService;
        this._settingsByName = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.source === 7 /* ConfigurationTarget.DEFAULT */) {
                this.reset();
                this._onDidChange.fire();
            }
        }));
    }
    getContent(forceUpdate = false) {
        if (!this._content || forceUpdate) {
            this.initialize();
        }
        return this._content;
    }
    getContentWithoutMostCommonlyUsed(forceUpdate = false) {
        if (!this._contentWithoutMostCommonlyUsed || forceUpdate) {
            this.initialize();
        }
        return this._contentWithoutMostCommonlyUsed;
    }
    getSettingsGroups(forceUpdate = false) {
        if (!this._allSettingsGroups || forceUpdate) {
            this.initialize();
        }
        return this._allSettingsGroups;
    }
    initialize() {
        this._allSettingsGroups = this.parse();
        this._content = this.toContent(this._allSettingsGroups, 0);
        this._contentWithoutMostCommonlyUsed = this.toContent(this._allSettingsGroups, 1);
    }
    reset() {
        this._content = undefined;
        this._contentWithoutMostCommonlyUsed = undefined;
        this._allSettingsGroups = undefined;
    }
    parse() {
        const settingsGroups = this.getRegisteredGroups();
        this.initAllSettingsMap(settingsGroups);
        const mostCommonlyUsed = this.getMostCommonlyUsedSettings();
        return [mostCommonlyUsed, ...settingsGroups];
    }
    getRegisteredGroups() {
        const registry = Registry.as(Extensions.Configuration);
        const allConfigurations = { ...registry.getConfigurationProperties() };
        const excludedConfigurations = registry.getExcludedConfigurationProperties();
        for (const policyKey of this.configurationService.keys().policy ?? []) {
            const policyConfiguration = excludedConfigurations[policyKey];
            if (policyConfiguration) {
                allConfigurations[policyKey] = policyConfiguration;
            }
        }
        const groups = this.removeEmptySettingsGroups(this.parseProperties(allConfigurations).sort(this.compareGroups));
        return this.sortGroups(groups);
    }
    sortGroups(groups) {
        groups.forEach(group => {
            group.sections.forEach(section => {
                section.settings.sort((a, b) => a.key.localeCompare(b.key));
            });
        });
        return groups;
    }
    initAllSettingsMap(allSettingsGroups) {
        this._settingsByName = new Map();
        for (const group of allSettingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    this._settingsByName.set(setting.key, setting);
                }
            }
        }
    }
    getMostCommonlyUsedSettings() {
        const settings = coalesce(this._mostCommonlyUsedSettingsKeys.map(key => {
            const setting = this._settingsByName.get(key);
            if (setting) {
                return {
                    description: setting.description,
                    key: setting.key,
                    value: setting.value,
                    keyRange: nullRange,
                    range: nullRange,
                    valueRange: nullRange,
                    overrides: [],
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                    type: setting.type,
                    enum: setting.enum,
                    enumDescriptions: setting.enumDescriptions,
                    descriptionRanges: []
                };
            }
            return null;
        }));
        return {
            id: 'mostCommonlyUsed',
            range: nullRange,
            title: nls.localize('commonlyUsed', "Commonly Used"),
            titleRange: nullRange,
            sections: [
                {
                    settings
                }
            ]
        };
    }
    parseProperties(properties) {
        const result = [];
        const byTitle = new Map();
        const byId = new Map();
        for (const [key, property] of Object.entries(properties)) {
            if (!property.section) {
                continue;
            }
            let settingsGroup;
            if (property.section.title) {
                const groups = byTitle.get(property.section.title);
                if (groups) {
                    const extensionId = property.section.extensionInfo?.id;
                    settingsGroup = groups.find(g => g.extensionInfo?.id === extensionId);
                }
            }
            if (!settingsGroup && property.section.id) {
                const groups = byId.get(property.section.id);
                if (groups) {
                    const extensionId = property.section.extensionInfo?.id;
                    settingsGroup = groups.find(g => g.extensionInfo?.id === extensionId && !g.title);
                }
                if (settingsGroup && !settingsGroup?.title && property.section.title) {
                    settingsGroup.title = property.section.title;
                    const byTitleGroups = byTitle.get(property.section.title);
                    if (byTitleGroups) {
                        byTitleGroups.push(settingsGroup);
                    }
                    else {
                        byTitle.set(property.section.title, [settingsGroup]);
                    }
                }
            }
            if (!settingsGroup) {
                settingsGroup = { sections: [{ title: property.section.title, settings: [] }], id: property.section.id || '', title: property.section.title ?? '', titleRange: nullRange, order: property.section.order, range: nullRange, extensionInfo: property.source };
                result.push(settingsGroup);
                if (property.section.title) {
                    const byTitleGroups = byTitle.get(property.section.title);
                    if (byTitleGroups) {
                        byTitleGroups.push(settingsGroup);
                    }
                    else {
                        byTitle.set(property.section.title, [settingsGroup]);
                    }
                }
                if (property.section.id) {
                    const byIdGroups = byId.get(property.section.id);
                    if (byIdGroups) {
                        byIdGroups.push(settingsGroup);
                    }
                    else {
                        byId.set(property.section.id, [settingsGroup]);
                    }
                }
            }
            const setting = this.parseSetting(key, property);
            if (setting) {
                settingsGroup.sections[0].settings.push(setting);
            }
        }
        return result;
    }
    removeEmptySettingsGroups(settingsGroups) {
        const result = [];
        for (const settingsGroup of settingsGroups) {
            settingsGroup.sections = settingsGroup.sections.filter(section => section.settings.length > 0);
            if (settingsGroup.sections.length) {
                result.push(settingsGroup);
            }
        }
        return result;
    }
    parseSetting(key, prop) {
        if (!this.matchesScope(prop)) {
            return undefined;
        }
        const value = prop.default;
        let description = (prop.markdownDescription || prop.description || '');
        if (typeof description !== 'string') {
            description = '';
        }
        const descriptionLines = description.split('\n');
        const overrides = OVERRIDE_PROPERTY_REGEX.test(key) ? this.parseOverrideSettings(prop.default) : [];
        let listItemType;
        if (prop.type === 'array' && prop.items && !Array.isArray(prop.items) && prop.items.type) {
            if (prop.items.enum) {
                listItemType = 'enum';
            }
            else if (!Array.isArray(prop.items.type)) {
                listItemType = prop.items.type;
            }
        }
        const objectProperties = prop.type === 'object' ? prop.properties : undefined;
        const objectPatternProperties = prop.type === 'object' ? prop.patternProperties : undefined;
        const objectAdditionalProperties = prop.type === 'object' ? prop.additionalProperties : undefined;
        let enumToUse = prop.enum;
        let enumDescriptions = prop.markdownEnumDescriptions ?? prop.enumDescriptions;
        let enumDescriptionsAreMarkdown = !!prop.markdownEnumDescriptions;
        if (listItemType === 'enum' && !Array.isArray(prop.items)) {
            enumToUse = prop.items.enum;
            enumDescriptions = prop.items.markdownEnumDescriptions ?? prop.items.enumDescriptions;
            enumDescriptionsAreMarkdown = !!prop.items.markdownEnumDescriptions;
        }
        let allKeysAreBoolean = false;
        if (prop.type === 'object' && !prop.additionalProperties && prop.properties && Object.keys(prop.properties).length) {
            allKeysAreBoolean = Object.keys(prop.properties).every(key => {
                return prop.properties[key].type === 'boolean';
            });
        }
        let isLanguageTagSetting = false;
        if (OVERRIDE_PROPERTY_REGEX.test(key)) {
            isLanguageTagSetting = true;
        }
        let defaultValueSource;
        if (!isLanguageTagSetting) {
            const registeredConfigurationProp = prop;
            if (registeredConfigurationProp && registeredConfigurationProp.defaultValueSource) {
                defaultValueSource = registeredConfigurationProp.defaultValueSource;
            }
        }
        if (!enumToUse && (prop.enumItemLabels || enumDescriptions || enumDescriptionsAreMarkdown)) {
            console.error(`The setting ${key} has enum-related fields, but doesn't have an enum field. This setting may render improperly in the Settings editor.`);
        }
        return {
            key,
            value,
            description: descriptionLines,
            descriptionIsMarkdown: !!prop.markdownDescription,
            range: nullRange,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionRanges: [],
            overrides,
            scope: prop.scope,
            type: prop.type,
            arrayItemType: listItemType,
            objectProperties,
            objectPatternProperties,
            objectAdditionalProperties,
            enum: enumToUse,
            enumDescriptions: enumDescriptions,
            enumDescriptionsAreMarkdown: enumDescriptionsAreMarkdown,
            enumItemLabels: prop.enumItemLabels,
            uniqueItems: prop.uniqueItems,
            tags: prop.tags,
            disallowSyncIgnore: prop.disallowSyncIgnore,
            restricted: prop.restricted,
            extensionInfo: prop.source,
            deprecationMessage: prop.markdownDeprecationMessage || prop.deprecationMessage,
            deprecationMessageIsMarkdown: !!prop.markdownDeprecationMessage,
            validator: createValidator(prop),
            allKeysAreBoolean,
            editPresentation: prop.editPresentation,
            order: prop.order,
            nonLanguageSpecificDefaultValueSource: defaultValueSource,
            isLanguageTagSetting,
            categoryLabel: prop.source?.id === prop.section?.id ? prop.title : prop.section?.id
        };
    }
    parseOverrideSettings(overrideSettings) {
        return Object.keys(overrideSettings).map((key) => ({
            key,
            value: overrideSettings[key],
            description: [],
            descriptionIsMarkdown: false,
            range: nullRange,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionRanges: [],
            overrides: []
        }));
    }
    matchesScope(property) {
        if (!property.scope) {
            return true;
        }
        if (this.target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return FOLDER_SCOPES.indexOf(property.scope) !== -1;
        }
        if (this.target === 5 /* ConfigurationTarget.WORKSPACE */) {
            return WORKSPACE_SCOPES.indexOf(property.scope) !== -1;
        }
        return true;
    }
    compareGroups(c1, c2) {
        if (typeof c1?.order !== 'number') {
            return 1;
        }
        if (typeof c2?.order !== 'number') {
            return -1;
        }
        if (c1.order === c2.order) {
            const title1 = c1.title || '';
            const title2 = c2.title || '';
            return title1.localeCompare(title2);
        }
        return c1.order - c2.order;
    }
    toContent(settingsGroups, startIndex) {
        const builder = new SettingsContentBuilder();
        for (let i = startIndex; i < settingsGroups.length; i++) {
            builder.pushGroup(settingsGroups[i], i === startIndex, i === settingsGroups.length - 1);
        }
        return builder.getContent();
    }
}
export class DefaultSettingsEditorModel extends AbstractSettingsModel {
    constructor(_uri, reference, defaultSettings) {
        super();
        this._uri = _uri;
        this.defaultSettings = defaultSettings;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this._register(defaultSettings.onDidChange(() => this._onDidChangeGroups.fire()));
        this._model = reference.object.textEditorModel;
        this._register(this.onWillDispose(() => reference.dispose()));
    }
    get uri() {
        return this._uri;
    }
    get target() {
        return this.defaultSettings.target;
    }
    get settingsGroups() {
        return this.defaultSettings.getSettingsGroups();
    }
    get filterGroups() {
        // Don't look at "commonly used" for filter
        return this.settingsGroups.slice(1);
    }
    update() {
        if (this._model.isDisposed()) {
            return undefined;
        }
        // Grab current result groups, only render non-empty groups
        const resultGroups = [...this._currentResultGroups.values()]
            .sort((a, b) => a.order - b.order);
        const nonEmptyResultGroups = resultGroups.filter(group => group.result.filterMatches.length);
        const startLine = this.settingsGroups.at(-1).range.endLineNumber + 2;
        const { settingsGroups: filteredGroups, matches } = this.writeResultGroups(nonEmptyResultGroups, startLine);
        const metadata = this.collectMetadata(resultGroups);
        return resultGroups.length ?
            {
                allGroups: this.settingsGroups,
                filteredGroups,
                matches,
                metadata: metadata ?? undefined
            } :
            undefined;
    }
    /**
     * Translate the ISearchResultGroups to text, and write it to the editor model
     */
    writeResultGroups(groups, startLine) {
        const contentBuilderOffset = startLine - 1;
        const builder = new SettingsContentBuilder(contentBuilderOffset);
        const settingsGroups = [];
        const matches = [];
        if (groups.length) {
            builder.pushLine(',');
            groups.forEach(resultGroup => {
                const settingsGroup = this.getGroup(resultGroup);
                settingsGroups.push(settingsGroup);
                matches.push(...this.writeSettingsGroupToBuilder(builder, settingsGroup, resultGroup.result.filterMatches));
            });
        }
        // note: 1-indexed line numbers here
        const groupContent = builder.getContent() + '\n';
        const groupEndLine = this._model.getLineCount();
        const cursorPosition = new Selection(startLine, 1, startLine, 1);
        const edit = {
            text: groupContent,
            forceMoveMarkers: true,
            range: new Range(startLine, 1, groupEndLine, 1)
        };
        this._model.pushEditOperations([cursorPosition], [edit], () => [cursorPosition]);
        // Force tokenization now - otherwise it may be slightly delayed, causing a flash of white text
        const tokenizeTo = Math.min(startLine + 60, this._model.getLineCount());
        this._model.tokenization.forceTokenization(tokenizeTo);
        return { matches, settingsGroups };
    }
    writeSettingsGroupToBuilder(builder, settingsGroup, filterMatches) {
        filterMatches = filterMatches
            .map(filteredMatch => {
            // Fix match ranges to offset from setting start line
            return {
                setting: filteredMatch.setting,
                score: filteredMatch.score,
                matchType: filteredMatch.matchType,
                keyMatchScore: filteredMatch.keyMatchScore,
                matches: filteredMatch.matches && filteredMatch.matches.map(match => {
                    return new Range(match.startLineNumber - filteredMatch.setting.range.startLineNumber, match.startColumn, match.endLineNumber - filteredMatch.setting.range.startLineNumber, match.endColumn);
                })
            };
        });
        builder.pushGroup(settingsGroup);
        // builder has rewritten settings ranges, fix match ranges
        const fixedMatches = filterMatches
            .map(m => m.matches || [])
            .flatMap((settingMatches, i) => {
            const setting = settingsGroup.sections[0].settings[i];
            return settingMatches.map(range => {
                return new Range(range.startLineNumber + setting.range.startLineNumber, range.startColumn, range.endLineNumber + setting.range.startLineNumber, range.endColumn);
            });
        });
        return fixedMatches;
    }
    copySetting(setting) {
        return {
            description: setting.description,
            scope: setting.scope,
            type: setting.type,
            enum: setting.enum,
            enumDescriptions: setting.enumDescriptions,
            key: setting.key,
            value: setting.value,
            range: setting.range,
            overrides: [],
            overrideOf: setting.overrideOf,
            tags: setting.tags,
            deprecationMessage: setting.deprecationMessage,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionIsMarkdown: undefined,
            descriptionRanges: []
        };
    }
    getPreference(key) {
        for (const group of this.settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (setting.key === key) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    getGroup(resultGroup) {
        return {
            id: resultGroup.id,
            range: nullRange,
            title: resultGroup.label,
            titleRange: nullRange,
            sections: [
                {
                    settings: resultGroup.result.filterMatches.map(m => this.copySetting(m.setting))
                }
            ]
        };
    }
}
class SettingsContentBuilder {
    get lineCountWithOffset() {
        return this._contentByLines.length + this._rangeOffset;
    }
    get lastLine() {
        return this._contentByLines[this._contentByLines.length - 1] || '';
    }
    constructor(_rangeOffset = 0) {
        this._rangeOffset = _rangeOffset;
        this._contentByLines = [];
    }
    pushLine(...lineText) {
        this._contentByLines.push(...lineText);
    }
    pushGroup(settingsGroups, isFirst, isLast) {
        this._contentByLines.push(isFirst ? '[{' : '{');
        const lastSetting = this._pushGroup(settingsGroups, '  ');
        if (lastSetting) {
            // Strip the comma from the last setting
            const lineIdx = lastSetting.range.endLineNumber - this._rangeOffset;
            const content = this._contentByLines[lineIdx - 2];
            this._contentByLines[lineIdx - 2] = content.substring(0, content.length - 1);
        }
        this._contentByLines.push(isLast ? '}]' : '},');
    }
    _pushGroup(group, indent) {
        let lastSetting = null;
        const groupStart = this.lineCountWithOffset + 1;
        for (const section of group.sections) {
            if (section.title) {
                this.addDescription([section.title], indent, this._contentByLines);
            }
            if (section.settings.length) {
                for (const setting of section.settings) {
                    this.pushSetting(setting, indent);
                    lastSetting = setting;
                }
            }
        }
        group.range = { startLineNumber: groupStart, startColumn: 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length };
        return lastSetting;
    }
    getContent() {
        return this._contentByLines.join('\n');
    }
    pushSetting(setting, indent) {
        const settingStart = this.lineCountWithOffset + 1;
        this.pushSettingDescription(setting, indent);
        let preValueContent = indent;
        const keyString = JSON.stringify(setting.key);
        preValueContent += keyString;
        setting.keyRange = { startLineNumber: this.lineCountWithOffset + 1, startColumn: preValueContent.indexOf(setting.key) + 1, endLineNumber: this.lineCountWithOffset + 1, endColumn: setting.key.length };
        preValueContent += ': ';
        const valueStart = this.lineCountWithOffset + 1;
        this.pushValue(setting, preValueContent, indent);
        setting.valueRange = { startLineNumber: valueStart, startColumn: preValueContent.length + 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length + 1 };
        this._contentByLines[this._contentByLines.length - 1] += ',';
        this._contentByLines.push('');
        setting.range = { startLineNumber: settingStart, startColumn: 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length };
    }
    pushSettingDescription(setting, indent) {
        const fixSettingLink = (line) => line.replace(/`#(.*)#`/g, (match, settingName) => `\`${settingName}\``);
        setting.descriptionRanges = [];
        const descriptionPreValue = indent + '// ';
        const deprecationMessageLines = setting.deprecationMessage?.split(/\n/g) ?? [];
        for (let line of [...deprecationMessageLines, ...setting.description]) {
            line = fixSettingLink(line);
            this._contentByLines.push(descriptionPreValue + line);
            setting.descriptionRanges.push({ startLineNumber: this.lineCountWithOffset, startColumn: this.lastLine.indexOf(line) + 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length });
        }
        if (setting.enum && setting.enumDescriptions?.some(desc => !!desc)) {
            setting.enumDescriptions.forEach((desc, i) => {
                const displayEnum = escapeInvisibleChars(String(setting.enum[i]));
                const line = desc ?
                    `${displayEnum}: ${fixSettingLink(desc)}` :
                    displayEnum;
                const lines = line.split(/\n/g);
                lines[0] = ' - ' + lines[0];
                this._contentByLines.push(...lines.map(l => `${indent}// ${l}`));
                setting.descriptionRanges.push({ startLineNumber: this.lineCountWithOffset, startColumn: this.lastLine.indexOf(line) + 1, endLineNumber: this.lineCountWithOffset, endColumn: this.lastLine.length });
            });
        }
    }
    pushValue(setting, preValueConent, indent) {
        const valueString = JSON.stringify(setting.value, null, indent);
        if (valueString && (typeof setting.value === 'object')) {
            if (setting.overrides && setting.overrides.length) {
                this._contentByLines.push(preValueConent + ' {');
                for (const subSetting of setting.overrides) {
                    this.pushSetting(subSetting, indent + indent);
                    this._contentByLines.pop();
                }
                const lastSetting = setting.overrides[setting.overrides.length - 1];
                const content = this._contentByLines[lastSetting.range.endLineNumber - 2];
                this._contentByLines[lastSetting.range.endLineNumber - 2] = content.substring(0, content.length - 1);
                this._contentByLines.push(indent + '}');
            }
            else {
                const mulitLineValue = valueString.split('\n');
                this._contentByLines.push(preValueConent + mulitLineValue[0]);
                for (let i = 1; i < mulitLineValue.length; i++) {
                    this._contentByLines.push(indent + mulitLineValue[i]);
                }
            }
        }
        else {
            this._contentByLines.push(preValueConent + valueString);
        }
    }
    addDescription(description, indent, result) {
        for (const line of description) {
            result.push(indent + '// ' + line);
        }
    }
}
class RawSettingsContentBuilder extends SettingsContentBuilder {
    constructor(indent = '\t') {
        super(0);
        this.indent = indent;
    }
    pushGroup(settingsGroups) {
        this._pushGroup(settingsGroups, this.indent);
    }
}
export class DefaultRawSettingsEditorModel extends Disposable {
    constructor(defaultSettings) {
        super();
        this.defaultSettings = defaultSettings;
        this._content = null;
        this._onDidContentChanged = this._register(new Emitter());
        this.onDidContentChanged = this._onDidContentChanged.event;
        this._register(defaultSettings.onDidChange(() => {
            this._content = null;
            this._onDidContentChanged.fire();
        }));
    }
    get content() {
        if (this._content === null) {
            const builder = new RawSettingsContentBuilder();
            builder.pushLine('{');
            for (const settingsGroup of this.defaultSettings.getRegisteredGroups()) {
                builder.pushGroup(settingsGroup);
            }
            builder.pushLine('}');
            this._content = builder.getContent();
        }
        return this._content;
    }
}
function escapeInvisibleChars(enumValue) {
    return enumValue && enumValue
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
export function defaultKeybindingsContents(keybindingService) {
    const defaultsHeader = '// ' + nls.localize('defaultKeybindingsHeader', "Override key bindings by placing them into your key bindings file.");
    return defaultsHeader + '\n' + keybindingService.getDefaultKeybindingsContent();
}
let DefaultKeybindingsEditorModel = class DefaultKeybindingsEditorModel {
    constructor(_uri, keybindingService) {
        this._uri = _uri;
        this.keybindingService = keybindingService;
    }
    get uri() {
        return this._uri;
    }
    get content() {
        if (!this._content) {
            this._content = defaultKeybindingsContents(this.keybindingService);
        }
        return this._content;
    }
    getPreference() {
        return null;
    }
    dispose() {
        // Not disposable
    }
};
DefaultKeybindingsEditorModel = __decorate([
    __param(1, IKeybindingService)
], DefaultKeybindingsEditorModel);
export { DefaultKeybindingsEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlc01vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0sc0NBQXNDLENBQUM7QUFFOUUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUl4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQXVELFVBQVUsRUFBc0YsdUJBQXVCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNsUSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sRUFBNkssZ0JBQWdCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvTixPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTdELE1B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
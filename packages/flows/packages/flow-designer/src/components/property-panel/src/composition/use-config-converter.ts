import { ref, computed } from 'vue';
import type { PropertyPanelConfig, PropertyItem } from '@farris/flow-devkit';
import type { PropertyConverter, EditorConfig } from '@farris/ui-vue';
import type { ElementPropertyConfig, PropertyEntity } from './types';

export function useConfigConverter() {

    const propertyEditorMap = new Map<string, EditorConfig>([
        ['string', { type: 'input-group', enableClear: false }],
        ['boolean', {
            "type": "combo-list",
            "textField": "name",
            "valueField": "value",
            "idField": "value",
            "enableClear": false,
            "editable": false,
            "data": [{
                "value": true,
                "name": "是"
            }, {
                "value": false,
                "name": "否"
            }]
        }],
        ['enum', { "type": "combo-list", "maxHeight": 128, "enableClear": false, "editable": false }],
        ['array', { "type": "button-edit" }],
        ['number', { "type": "number-spinner", "placeholder": "" }],
        ['events-editor', { "type": "events-editor", hide: true }],
    ]);

    function tryGetPropertyConverter(
        propertySchema: Record<string, any>,
        categoryConverter?: PropertyConverter | string,
    ): PropertyConverter | null {
        const $converter = propertySchema['$converter'] || categoryConverter;
        if (typeof $converter === 'string') {
            return null;
        }
        return $converter || null;
    }

    function convertBoolean2Function(value: any, defaultValue: boolean) {
        if (typeof value === 'boolean') {
            return () => Boolean(value);
        }
        return () => defaultValue;
    }

    function getPropertyEntities(
        propertiesInCategory: Record<string, PropertyItem>,
        propertyConfigMap: Record<string, PropertyEntity>,
        propertyData: Record<string, any>,
        categoryConverter?: PropertyConverter | string,
    ): PropertyEntity[] {
        const propertyEntities = Object.keys(propertiesInCategory).map<PropertyEntity>((propertyKey: string) => {
            const updateCount = ref(1);
            const propertyID = propertyKey;
            const propertySchema = propertiesInCategory[propertyKey];
            const propertyName = propertySchema.title;
            const propertyType = propertySchema.type;
            const defaultEditor = propertyEditorMap.get(propertyType) || { type: 'input-group', enableClear: false };
            const editor = propertySchema.editor
                ? Object.assign({}, defaultEditor, propertySchema.editor) as EditorConfig
                : Object.assign({}, defaultEditor);
            const visible = convertBoolean2Function(propertySchema.visible, true);
            const readonly = convertBoolean2Function(propertySchema.readonly, false);
            editor.readonly = editor.readonly === undefined ? readonly() : editor.readonly;
            const cascadeConfig = propertySchema.type === 'cascade'
                ? getPropertyEntities(propertySchema.properties || {}, propertyConfigMap, propertyData, categoryConverter)
                : [];
            const hideCascadeTitle = true;
            const converter = tryGetPropertyConverter(propertySchema, categoryConverter);
            const propertyValue = computed({
                get() {
                    if (updateCount.value) {
                        if (converter && converter.convertFrom) {
                            return converter.convertFrom(propertyData, propertyKey, undefined as any);
                        }
                        const editingSchemaValue = propertyData[propertyKey];
                        if (Object.prototype.hasOwnProperty.call(propertySchema, 'defaultValue') && (
                            editingSchemaValue === undefined || editingSchemaValue === ''
                        )) {
                            return propertySchema['type'] === 'boolean' ? propertySchema['defaultValue'] : (propertySchema['defaultValue'] || '');
                        } else {
                            return editingSchemaValue;
                        }
                    }
                    return null;
                },
                set(newValue) {
                    updateCount.value += 1;
                    if (converter && converter.convertTo) {
                        converter.convertTo(propertyData, propertyKey, newValue, undefined as any);
                    } else {
                        propertyData[propertyKey] = newValue;
                    }
                }
            });
            const { refreshPanelAfterChanged, description, isExpand, parentPropertyID } = propertySchema;
            const propertyEntity = {
                propertyID, propertyName, propertyType, propertyValue, editor, visible, readonly,
                cascadeConfig, hideCascadeTitle, refreshPanelAfterChanged, description, isExpand, parentPropertyID,
            };
            propertyConfigMap[propertyID] = propertyEntity;
            return propertyEntity;
        });
        return propertyEntities;
    }

    function convertPropertyConfig(
        propertyConfig: PropertyPanelConfig,
        propertyData: Record<string, any>,
    ): ElementPropertyConfig[] {
        if (!propertyConfig?.categories) {
            return [];
        }
        const propertyConfigMap: Record<string, PropertyEntity> = {};
        const elementPropertyConfigs: ElementPropertyConfig[] = [];
        Object.keys(propertyConfig.categories).map((categoryId: string) => {
            const propertyCategory = propertyConfig.categories[categoryId];
            const categoryName = propertyCategory?.title;
            const tabId = propertyCategory?.tabId;
            const tabName = propertyCategory?.tabName;
            const hide = propertyCategory?.hide;
            const hideTitle = propertyCategory?.hideTitle;
            const properties = getPropertyEntities(
                propertyCategory.properties || {}, propertyConfigMap, propertyData, propertyCategory.$converter
            );
            const { setPropertyRelates } = propertyCategory;
            const parentPropertyID = propertyCategory?.parentPropertyID;
            elementPropertyConfigs.push({
                categoryId,
                categoryName,
                tabId,
                tabName,
                hide,
                properties,
                hideTitle,
                setPropertyRelates,
                parentPropertyID,
            });
        });
        return elementPropertyConfigs;
    }

    return { convertPropertyConfig };
}

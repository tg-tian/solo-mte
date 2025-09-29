import { Ref, ref } from 'vue';
import { cloneDeep } from 'lodash-es';
import { FormSchema, FormSchemaEntity, FormSchemaEntityField } from './../../../types/entity-schema';
import { HierarchyItem } from '@farris/ui-vue';
import { SchemaPropName } from './prop-name';

export function useSchemaChangeset() {

    /** 新增字段树表绑定数据 */
    const addedTreeData: Ref<HierarchyItem[]> = ref([]);

    /** 删除字段树表绑定数据 */
    const deletedTreeData: Ref<HierarchyItem[]> = ref([]);

    /** 变更字段左侧树绑定数据 */
    const changeLeftTreeData: Ref<HierarchyItem[]> = ref([]);

    /** 选中的新增字段 */
    const addSelected = ref({});

    /** 选中的删除字段 */
    const deleteSelected = ref({});

    const addedFields = ref({});

    /** 新增的表 */
    const addedTable: Ref<any[]> = ref([]);

    /** 删除的表 */
    const deletedTable: Ref<string[]> = ref([]);

    /**  旧schema */
    const currentSchemaEntities: Ref<FormSchemaEntity[]> = ref([]);

    /** 新schema */
    const targetSchemaEntities: Ref<FormSchemaEntity[]> = ref([]);

    /** 平铺的变更集合 */
    const changeList: Ref<any> = ref([]);

    /**  变更集合 */
    const changeContrast = ref({});

    /** 选中的变更集合 */
    const changeSelected = ref({});

    /** 字段的全选 */
    const selectedAll = ref({});

    /** 变更字段类型和编辑器类型的字段集合，用于页面中提示用户进行全选操作 */
    const changeFieldTypeEditorTypeList: Ref<string[]> = ref([]);

    /** 变更字段类型，但编辑器类型不变的字段集合，用于页面中提示用户进行全选操作 */
    const changeFieldTypeList: Ref<string[]> = ref([]);

    /**  变更复杂字段类型的字段集合，用于页面中提示用户将会删除已有控件，需要手动添加 */
    const changeComplexFieldTypeList: Ref<string[]> = ref([]);

    /** 全选变更checkbox */
    let selectAllChange = false;

    /**  变更字段左侧树选中节点id */
    let selectedTreeKey = '';

    /** 是否显示变更列表 */
    let showChangeContrast = false;

    function init(currentFormSchema: FormSchema, targetFormSchema: FormSchema) {
        addSelected.value = {};
        deleteSelected.value = {};
        addedTreeData.value = [];
        deletedTreeData.value = [];
        addedFields.value = {};

        currentSchemaEntities.value = cloneDeep(currentFormSchema.entities);
        targetSchemaEntities.value = targetFormSchema.entities;


        changeSelected.value = {};
        changeLeftTreeData.value = [];
        changeContrast.value = {};
        changeList.value = [];

        showChangeContrast = false;
        selectedTreeKey = '';

        addedTable.value = [];

        selectAllChange = false;
        selectedAll.value = {};
        changeFieldTypeEditorTypeList.value = [];
        changeComplexFieldTypeList.value = [];

    }

    /**
     * 对比实体基本信息(code、name)的差异，
     * @param oldEntity 现有实体
     * @param newEntity 新实体
     */
    function constractEntityBasicObject(oldEntity: FormSchemaEntity, newEntity: FormSchemaEntity): boolean {

        const diffTree: any[] = [];
        Object.keys(oldEntity).forEach(propCode => {
            if (propCode !== 'type') {
                if (oldEntity[propCode] !== newEntity[propCode]) {
                    const data = {
                        isEntity: true,
                        entityId: oldEntity.id,
                        propPath: propCode,
                        fieldId: oldEntity.id,
                        propCode,
                        propName: SchemaPropName.getName(propCode),
                        oldValue: oldEntity[propCode],
                        newValue: newEntity[propCode]
                    };
                    diffTree.push({ selectable: true, data, children: [] });
                    changeList.value.push(data);
                }
            } else {
                const oldType = oldEntity.type;
                const newType = newEntity.type;
                ['name', 'displayName'].forEach(typePropCode => {
                    if (oldType[typePropCode] !== newType[typePropCode]) {
                        const data = {
                            isEntity: true,
                            entityId: oldEntity.id,
                            propPath: `type.${typePropCode}`,
                            fieldId: oldEntity.id,
                            propCode: typePropCode,
                            propName: `类型${SchemaPropName.getName(typePropCode)}`,
                            oldValue: oldType[typePropCode],
                            newValue: newType[typePropCode]
                        };
                        diffTree.push({ selectable: true, data, children: [] });
                        changeList.value.push(data);
                    }
                });

            }
        });

        changeContrast.value[oldEntity.id] = diffTree;
        changeSelected.value[oldEntity.id] = {};
        selectedAll.value[oldEntity.id] = false;

        return diffTree.length > 0;

    }

    function contrastBasicProp(oldValue, newValue, fieldId, path, selectable = true): HierarchyItem[] {
        const diffTree: HierarchyItem[] = [];
        Object.keys(oldValue).forEach(propCode => {
            if (typeof (oldValue[propCode]) !== 'object' && typeof (oldValue[propCode]) !== 'undefined') {
                // 为了适配默认值属性int和string之间的差异，故不采用!==
                // eslint-disable-next-line eqeqeq
                if (oldValue[propCode] != newValue[propCode]) {
                    const data = {
                        propPath: path + propCode, fieldId, propCode, propName: SchemaPropName.getName(propCode),
                        oldValue: oldValue[propCode], newValue: newValue[propCode] === undefined ? '无' : newValue[propCode]
                    };
                    diffTree.push({ selectable, data, children: [] });
                    changeList.value.push(data);
                }
            }
        });

        return diffTree;
    }

    function sortJsonByKey(jsonData) {
        const newkey = Object.keys(jsonData).sort();
        const newObj = {};
        // tslint:disable-next-line:prefer-for-of
        for (const key of newkey) {
            newObj[key] = jsonData[key];
        }
        return newObj;
    }

    function compareJsonByString(json1: any, json2: any): boolean {
        const sortedJson1 = sortJsonByKey(json1);
        const sortedJson2 = sortJsonByKey(json2);
        return JSON.stringify(sortedJson1) === JSON.stringify(sortedJson2);
    }

    /**
     * 枚举数组的禁用属性是后面追加的，为避免现有表单大面积对比出差异，这里增加特殊判断：若枚举值都是disabled=false，则认为不需要更新，也不需要通知用户变更
     */
    function checkEnumValuesChanged(oldEnumValues: any[], newEnumValues: any[]) {
        if (oldEnumValues.length !== newEnumValues.length) {
            return true;
        }

        // 若旧枚举值没有禁用属性，但新枚举值有，说明是首次更新枚举特性。
        if (!Object.prototype.hasOwnProperty.call(oldEnumValues[0], 'disabled') &&
            Object.prototype.hasOwnProperty.call(newEnumValues[0], 'disabled')
        ) {
            const newEnumValueCopy = cloneDeep(newEnumValues);
            newEnumValueCopy.map(v => { if (!v.disabled) { delete v.disabled; } });
            return JSON.stringify(oldEnumValues) !== JSON.stringify(newEnumValueCopy);
        }
        return JSON.stringify(oldEnumValues) !== JSON.stringify(newEnumValues);
    }

    /**
     *  对比属性差异
     * @param oldValue
     * @param newValue
     * @param fieldId
     * @param path
     */
    function contrastObject(oldValue, newValue, fieldId, path) {
        const diffTree: HierarchyItem[] = [], propPath = path ? path + '.' : '', childLeftTree: HierarchyItem[] = [];
        let deletedFields: HierarchyItem[] = [];
        // 遍历基础属性
        const basicDiff = contrastBasicProp(oldValue, newValue, fieldId, propPath);
        if (basicDiff && basicDiff.length > 0) {
            diffTree.push(...basicDiff);
        }

        // 新增属性
        Object.keys(newValue).forEach(propCode => {
            if (propCode === 'editor') {
                return;
            }
            if (!Object.keys(oldValue).includes(propCode)) {
                const data = {
                    propPath: propPath + propCode,
                    fieldId,
                    propCode,
                    propName: SchemaPropName.getName(propCode),
                    newValue: newValue[propCode],
                    oldValue: '无'
                };
                diffTree.push({ selectable: true, data, children: [] });
                changeList.value.push(data);
            }
        });


        if (oldValue.type && newValue.type) {
            const oldType = oldValue.type; const newType = newValue.type;
            // 类型变化后将type和editor整体覆盖，不再向下对比差异
            if (oldType.$type !== newType.$type) {
                // 排除类型变化，但编辑器不变的场景：日期和日期时间类型对应的控件类型都是DateBox
                if (!(oldValue.editor && newValue.editor && oldValue.editor.$type === newValue.editor.$type)) {
                    const type = {
                        propPath: propPath + 'type', fieldId, propCode: 'type', propName: SchemaPropName.getName('type'),
                        oldValue: oldType, newValue: newType
                    };
                    const editor = {
                        propPath: propPath + 'editor',
                        fieldId,
                        propCode: 'editor',
                        propName: SchemaPropName.getName('editor'),
                        oldValue: oldValue.editor === undefined ? '无' : oldValue.editor,
                        newValue: newValue.editor
                    };
                    diffTree.push({ selectable: true, data: type, isObject: true, children: [] });
                    diffTree.push({ selectable: true, data: editor, isObject: true, children: [] });
                    changeList.value.push(type);
                    changeList.value.push(editor);

                    changeContrast.value[oldValue.id] = diffTree;
                    changeSelected.value[oldValue.id] = {};
                    selectedAll.value[oldValue.id] = false;

                    changeFieldTypeEditorTypeList.value.push(oldValue.id);
                    return { leftTree: { data: { ...oldValue } }, deletedFields };
                }
                changeFieldTypeList.value.push(oldValue.id);

            } else if (oldType.name !== newType.name) {
                // 复杂类型字段，更换了引用的对象
                const complexTypeDiff = {
                    propPath: propPath + 'type',
                    propCode: 'type',
                    propName: SchemaPropName.getName('type'),
                    fieldId,
                    oldValue: oldType,
                    newValue: newType,
                    oldValueShowName: oldType.displayName || oldType.name,
                    newValueShowName: newType.displayName
                };
                diffTree.push({ selectable: true, data: complexTypeDiff, isObject: true, children: [] });
                changeList.value.push(complexTypeDiff);
                changeContrast.value[oldValue.id] = diffTree;
                changeSelected.value[oldValue.id] = {};
                selectedAll.value[oldValue.id] = false;
                changeComplexFieldTypeList.value.push(oldValue.id);
                return { leftTree: { data: { ...oldValue } }, deletedFields };
            } else if (oldValue.multiLanguage !== newValue.multiLanguage) {
                // 类型不变，但编辑器需要改变---目前场景：修改多语属性，但要排除现有表单新增多语为false的场景
                if (!(oldValue.multiLanguage === undefined && newValue.multiLanguage === false)) {
                    if (!compareJsonByString(oldType, newType)) {
                        const type = {
                            propPath: propPath + 'type', fieldId, propCode: 'type', propName: SchemaPropName.getName('type'),
                            oldValue: oldType, newValue: newType
                        };
                        diffTree.push({ selectable: true, data: type, isObject: true, children: [] });
                        changeList.value.push(type);
                    }

                    const editor = {
                        propPath: propPath + 'editor',
                        fieldId,
                        propCode: 'editor',
                        propName: SchemaPropName.getName('editor'),
                        oldValue: oldValue.editor,
                        newValue: newValue.editor
                    };
                    diffTree.push({ selectable: true, data: editor, isObject: true, children: [] });
                    changeList.value.push(editor);

                    changeContrast.value[oldValue.id] = diffTree;
                    changeSelected.value[oldValue.id] = {};
                    selectedAll.value[oldValue.id] = false;

                    changeFieldTypeEditorTypeList.value.push(oldValue.id);
                    return { leftTree: { data: { ...oldValue } }, deletedFields };
                }

            }

            const typeDiff = contrastBasicProp(oldType, newType, fieldId, propPath + 'type.');
            if (oldType.valueType && newType.valueType) {
                const valueTypeDiff = contrastBasicProp(oldType.valueType, newType.valueType, fieldId, propPath + 'type.valueType.');
                if (valueTypeDiff && valueTypeDiff.length > 0) {
                    typeDiff.push({
                        selectable: false, children: valueTypeDiff, expanded: true,
                        data: {
                            propPath: propPath + 'type.valueType', fieldId, propCode: 'valueType',
                            propName: SchemaPropName.getName('valueType')
                        }
                    });
                }
            }
            if (oldType.enumValues && newType.enumValues && checkEnumValuesChanged(oldType.enumValues, newType.enumValues)) {
                const data = {
                    propPath: propPath + 'type.enumValues', fieldId, propCode: 'enumValues',
                    propName: SchemaPropName.getName('enumValues'), oldValue: oldType.enumValues, newValue: newType.enumValues
                };
                typeDiff.push({ selectable: true, data, isObject: true, children: [] });
                changeList.value.push(data);

            }
            if (oldType.fields) {
                oldType.fields.forEach(oldEle => {
                    const newEle = newType.fields.find(f => f.id === oldEle.id);
                    if (!newEle) {
                        // 已删除字段
                        deletedFields.push({ data: oldEle, selectable: true, children: [] });
                        deleteSelected.value[oldEle.id] = true;
                    } else {
                        const { leftTree: eleLeftTree, deletedFields: deletedChildFields } = contrastObject(oldEle, newEle, oldEle.id, '');
                        if (eleLeftTree) {
                            childLeftTree.push(eleLeftTree);
                        }
                        if (deletedChildFields.length > 0) {
                            deletedFields.push(...deletedChildFields);
                        }
                    }
                });
            }
            if (typeDiff && typeDiff.length > 0) {
                diffTree.push({
                    selectable: false, children: typeDiff, expanded: true,
                    data: {
                        propPath: propPath + 'type',
                        fieldId,
                        propCode: 'type',
                        propName: SchemaPropName.getName('type')
                    }
                });
            }
        }

        // 编辑器属性整体更新
        if (oldValue.editor && newValue.editor) {
            const editorDiff = contrastBasicProp(oldValue.editor, newValue.editor, fieldId, propPath + 'editor.', false);
            if (editorDiff && editorDiff.length > 0) {
                const data = {
                    propPath: propPath + 'editor',
                    fieldId,
                    propCode: 'editor',
                    propName: SchemaPropName.getName('editor'),
                    oldValue: oldValue.editor,
                    newValue: newValue.editor
                };
                diffTree.push({ selectable: true, data, isObject: true, children: [] });
                changeList.value.push(data);
            }
        }

        let leftTree;

        // 字段本身变化
        if (diffTree.length > 0 || childLeftTree.length > 0) {
            changeContrast.value[oldValue.id] = diffTree;
            changeSelected.value[oldValue.id] = {};
            leftTree = { data: { ...oldValue } };
            selectedAll.value[oldValue.id] = false;
            if (childLeftTree.length > 0) {
                leftTree['children'] = childLeftTree;
                leftTree['expanded'] = true;
            }
        }

        if (deletedFields.length > 0) {
            deletedFields = [{ data: { ...oldValue }, children: deletedFields, selectable: false, expanded: true }];
        }

        return { leftTree, deletedFields };
    }

    /**
     * 获取已删除字段、变更字段
     * @param currentSchemaEntities
     * @param targetSchemaEntities
     */
    function recursiveOldSchema(currentSchemaEntities: FormSchemaEntity[], targetSchemaEntities: FormSchemaEntity[]) {
        if (!currentSchemaEntities || currentSchemaEntities.length === 0 || !targetSchemaEntities) {
            return;
        }
        currentSchemaEntities.forEach(entity => {
            const newEntity = targetSchemaEntities.find(e => e.id === entity.id);
            if (!newEntity) { // 删除表
                deletedTreeData.value.push({ id: entity.id, data: entity, selectable: true, children: [], expanded: true });
                deletedTable.value.push(entity.id);
                deleteSelected.value[entity.id] = true;
                return;
            }

            // 表的信息变更（编号、名称）
            const isEntityChanged = constractEntityBasicObject(entity, newEntity);

            const deletedFields: HierarchyItem[] = [];
            const otherFields: HierarchyItem[] = [];
            entity.type.fields.forEach(field => {
                const newField = newEntity.type.fields.find(f => f.id === field.id);
                if (!newField) { // 已删除字段
                    deletedFields.push({ data: field, selectable: true, children: [] });
                    deleteSelected.value[field.id] = true;
                } else {
                    // 对比字段属性差异
                    const { leftTree, deletedFields: deletedChildFields } = contrastObject(field, newField, field.id, '');
                    if (leftTree) {
                        otherFields.push(leftTree);
                    }
                    if (deletedChildFields.length > 0) {
                        deletedFields.push(...deletedChildFields);
                    }
                }
            });
            if (deletedFields.length > 0) {
                deletedTreeData.value.push({ data: entity, selectable: false, children: deletedFields, expanded: true });
            }
            if (otherFields.length > 0) {
                changeLeftTreeData.value.push({ data: entity, children: otherFields, expanded: true });
            } else if (isEntityChanged) {
                changeLeftTreeData.value.push({ data: entity, children: [], expanded: true });
            }

            if (entity.type.entities && entity.type.entities.length > 0) {
                recursiveOldSchema(entity.type.entities, newEntity.type.entities as FormSchemaEntity[]);
            }
        });
    }

    function recursiveField(newFields: FormSchemaEntityField[], oldFields: FormSchemaEntityField[], parentId) {
        const added: HierarchyItem[] = [];
        newFields.forEach(newField => {
            if (!oldFields) {
                added.push({ data: newField, selectable: true, children: [] });
                addSelected.value[newField.id] = true;
                addedFields.value[parentId].push(newField);
                return;
            }
            const oldField = oldFields.find(f => f.id === newField.id);
            if (!oldField) {
                added.push({ data: newField, selectable: true, children: [] });
                addSelected.value[newField.id] = true;
                addedFields.value[parentId].push(newField);
                return;
            }
            // 字段类型相同，并且有下级字段：遍历下级字段
            if (oldField.type.name === newField.type.name && newField.type.fields) {
                addedFields.value[newField.id] = [];
                const childAddedFields = recursiveField(newField.type.fields, oldField.type.fields as FormSchemaEntityField[], newField.id);
                if (childAddedFields.length > 0) {
                    added.push({ data: newField, selectable: false, children: childAddedFields, expanded: true });
                }
            }
        });
        return added;
    }

    /**
     * 获取新增字段
     * @param oldSchemaEntities
     * @param newSchemaEntities
     */
    function recursiveNewSchema(oldSchemaEntities: FormSchemaEntity[], newSchemaEntities: FormSchemaEntity[], parentEntityId: string = '') {
        if (!oldSchemaEntities || !newSchemaEntities || newSchemaEntities.length === 0) {
            return;
        }
        newSchemaEntities.forEach(entity => {
            const oldEntity = oldSchemaEntities.find(e => e.id === entity.id);
            if (!oldEntity) { // 新增表
                addSelected.value[entity.id] = true;
                addedTreeData.value.push({ data: entity, selectable: true, children: [], expanded: true });
                addedTable.value.push({ parentEntityId, entity });
                return;
            }
            addedFields.value[entity.id] = [];
            const added = recursiveField(entity.type.fields, oldEntity.type.fields, entity.id);

            const { type, ...basicEntity } = entity;
            if (added.length > 0) {
                addedTreeData.value.push({ data: basicEntity, selectable: false, children: added, expanded: true });
            }
            if (entity.type.entities && entity.type.entities.length > 0) {
                const oldChildEntities = oldEntity && oldEntity.type ? oldEntity.type.entities : [];
                recursiveNewSchema(oldChildEntities as FormSchemaEntity[], entity.type.entities, entity.id);
            }
        });
    }

    function show(currentFormSchema: FormSchema, targetFormSchema: FormSchema) {
        init(currentFormSchema, targetFormSchema);
        recursiveOldSchema(currentSchemaEntities.value, targetSchemaEntities.value);
        recursiveNewSchema(currentSchemaEntities.value, targetSchemaEntities.value);
    }

    return {
        addSelected,
        addedTreeData,
        changeContrast,
        changeComplexFieldTypeList,
        changeFieldTypeEditorTypeList,
        changeFieldTypeList,
        changeLeftTreeData,
        changeList,
        changeSelected,
        deleteSelected,
        deletedTreeData,
        selectedAll,
        show,
        addedTable,
        deletedTable,
        addedFields
    };
}

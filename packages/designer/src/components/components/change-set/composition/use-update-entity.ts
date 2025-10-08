import { cloneDeep, set } from "lodash-es";
import { FormSchemaEntity, FormSchemaEntityField, UseFormSchema } from "../../../../components/types";
import { ChangeSetProps } from "../change-set.props";

export function useUpdateEntity(
    props: ChangeSetProps,
    useSchemaChangesetComposition: any
) {
    const addSelected = useSchemaChangesetComposition.addSelected.value;
    const deleteSelected = useSchemaChangesetComposition.deleteSelected.value;
    const changeSelected = useSchemaChangesetComposition.changeSelected.value;
    const addedTable = useSchemaChangesetComposition.addedTable.value;
    const deletedTable = useSchemaChangesetComposition.deletedTable.value;
    const addedFields = useSchemaChangesetComposition.addedFields.value;
    const changeList = useSchemaChangesetComposition.changeList.value;


    /**
     * 检查是否需要更新，若没有选中字段则不提示“更新成功”
     */
    function checkIsNeedUpdate(): boolean {
        const deleteSelectedData = Object.keys(deleteSelected).filter(value => deleteSelected[value]);
        if (deleteSelectedData.length > 0) {
            return true;
        }
        const addSelectedData = Object.keys(addSelected).filter(value => addSelected[value]);
        if (addSelectedData.length > 0) {
            return true;
        }

        const changeSelectedData = Object.keys(changeSelected).filter(fieldId => {
            const changeset = Object.keys(changeSelected[fieldId]).filter(propKey => changeSelected[fieldId][propKey]);
            if (changeset.length > 0) {
                return true;
            }
            return false;
        });
        if (changeSelectedData.length > 0) {
            return true;
        }
        return false;
    }
    /**
     * 处理同步实体的变更
     */
    function handleChangesetEntity(currrentEntity: FormSchemaEntity) {
        // 获取勾选的变更集
        const changeSelectedData = changeSelected[currrentEntity.id];
        const propPathSet: string[] = [];
        if (changeSelectedData) {
            Object.keys(changeSelectedData).forEach(key => {
                if (changeSelectedData[key]) {
                    propPathSet.push(key);
                }
            });

            // 根据propPath 更新字段属性值
            propPathSet.forEach(path => {
                const newValue = changeList.find(change => change.entityId === currrentEntity.id && change.propPath === path);
                set(currrentEntity, path, newValue.newValue);
            });
        }
    }
    /**
     * 处理同步实体中字段的变更
     */
    function handleChangesetField(currentFields: FormSchemaEntityField[]): any[] {
        currentFields = currentFields.filter(currentField => {
            // 已删除字段
            if (deleteSelected[currentField.id]) {
                return false;
            }
            return true;
        });
        currentFields.forEach(currentField => {
            // 获取勾选的变更集
            const changeSelectedData = changeSelected[currentField.id];
            const propPathSet: string[] = [];
            if (changeSelectedData) {
                Object.keys(changeSelectedData).forEach(key => {
                    if (changeSelectedData[key]) {
                        propPathSet.push(key);
                    }
                });
                // 根据propPath 更新字段属性值（若path中的路径不存在，则会创建相应属性并赋值；若新值为undefined，则会删除相应属性）
                propPathSet.forEach(path => {
                    const newValue = changeList.find(c => c.fieldId === currentField.id && c.propPath === path);
                    // 为适配页面显示，将不存在的属性写成了无，故此处再改回undefined
                    newValue.newValue = newValue.newValue === '无' ? undefined : newValue.newValue;
                    set(currentField, path, newValue.newValue);
                });
            }


            // 下级字段
            if (currentField.type.fields) {
                currentField.type.fields = handleChangesetField(currentField.type.fields);
            }

            // 新增下级字段
            const addedDownFields = addedFields[currentField.id];
            if (addedDownFields && addedDownFields.length > 0) {
                addedDownFields.forEach(field => {
                    if (addSelected[field.id] && currentField.type.fields) {
                        currentField.type.fields.push(field);
                    }
                });
            }
        });

        return currentFields;

    }
    function handleChangeSet(currentSchemaEntities: FormSchemaEntity[], targetSchemaEntities: FormSchemaEntity[]) {
        // 删除表
        if (deletedTable.length > 0) {
            currentSchemaEntities = currentSchemaEntities.filter(entity => !deleteSelected[entity.id]);
        }

        currentSchemaEntities.forEach(entity => {
            const newEntity = targetSchemaEntities.find(targetEntity => targetEntity.id === entity.id);
            if (!newEntity) {
                return;
            }
            handleChangesetEntity(entity);
            entity.type.fields = handleChangesetField(entity.type.fields);
            // 根节点下新增字段
            if (addedFields[entity.id] && addedFields[entity.id].length > 0) {
                addedFields[entity.id].forEach(field => {
                    if (addSelected[field.id]) {
                        entity.type.fields.push(field);
                    }
                });
            }
            // 处理子表
            if (entity.type.entities && entity.type.entities?.length > 0 && newEntity.type.entities) {
                entity.type.entities = handleChangeSet(entity.type.entities, newEntity.type.entities);
            }

            // 新增子表
            if (addedTable.length > 0) {
                const addedEntities = addedTable.filter(addTable => addTable.parentEntityId === entity.id);
                if (addedEntities && addedEntities.length) {
                    addedEntities.forEach(a => {
                        if (addSelected[a.entity.id]) {
                            entity.type.entities = entity.type.entities || [];
                            entity.type.entities.push(a.entity);
                        }
                    });
                }
            }
        });
        return currentSchemaEntities;

    }
    function updateEntity() {
        const { currentFormSchema } = props;

        // 直接覆盖extendProperties 节点
        currentFormSchema.extendProperties = props.targetFormSchema.extendProperties;

        // 应用变更集
        props.currentFormSchema.entities = cloneDeep(handleChangeSet(props.currentFormSchema?.entities, props.targetFormSchema?.entities));

        // 处理主对象变更的情况
        const addedRootEntity = addedTable.find(table => table.parentEntityId === '');
        if (addedRootEntity && addSelected[addedRootEntity.entity.id]) {
            props.currentFormSchema.entities.push(addedRootEntity.entity);
        }
    }
    return {
        checkIsNeedUpdate,
        updateEntity
    };
}

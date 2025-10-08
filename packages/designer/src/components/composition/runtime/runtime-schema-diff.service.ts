import { FormMetaDataModule, FormSchemaEntity, FormSchemaEntityField, UseSchemaService } from '../../types';

/**
 * 运行时定制：表单实体差异对比服务
 */
export class RuntimeSchemaDiffService {
    // 新添加的字段、子表
    addedTreeData: any[] = [];
    // 平铺的变更集合
    changeList = [];
    // 变更集合
    changeContrast = {};
    // 当前正在处理的entity
    currentSchemaEntity: FormSchemaEntity | undefined;
    // 需同步VO的changes
    changedMap = new Map();


    constructor(private schemaService: UseSchemaService) { }
    private initParams() {
        this.addedTreeData = [];
        this.changeList = [];
        this.changeContrast = {};
        this.currentSchemaEntity = undefined;
        this.changedMap = new Map();
    }
    /*
     * modified: Map<tableId, [{id: fieldId, propCode, preValue, curValue} ... ]>
     * addedMap: TreeNode[]: [{data: {id,name,code,label,primary?}, children: [字段信息 ...]} ... ]
    */
    public getChanges(previous: FormMetaDataModule, current: FormMetaDataModule): any {
        this.initParams();
        this.recursiveNewSchema(previous.entity[0].entities, current.entity[0].entities);
        this.setAddedTreeData();
        this.findEnumChanges(previous.viewmodels, current.viewmodels);
        return { addedFields: this.addedTreeData, modifiedFields: this.changeMapToObj(this.changedMap) };
    }
    /*
     * 获取新增字段/子表（内含字段）
     * @param oldSchemaEntities
     * @param newSchemaEntities
     * @param parentEntityId 暂时未用
     */
    private recursiveNewSchema(oldSchemaEntities: FormSchemaEntity[], newSchemaEntities: FormSchemaEntity[], parentEntityId: string = '') {
        if (!oldSchemaEntities || !newSchemaEntities || newSchemaEntities.length === 0) {
            return;
        }
        newSchemaEntities.forEach(entity => {
            const oldEntity = oldSchemaEntities.find(e => e.id === entity.id);
            if (!oldEntity) { // 新增表
                const children = entity.type.fields.map(field => {
                    return { data: field, selectable: true };
                });
                this.addedTreeData.push({ data: entity, selectable: true, children, expanded: true });
                return;
            }
            const added = this.recursiveField(entity.type.fields, oldEntity.type.fields, entity.id, entity.id);

            const { type, ...basicEntity } = entity;
            if (added.length > 0) {
                this.addedTreeData.push({ data: basicEntity, selectable: false, children: added, expanded: true });
            }
            if (entity.type.entities && entity.type.entities.length > 0) {
                const oldChildEntities = oldEntity?.type?.entities || [];
                this.recursiveNewSchema(oldChildEntities, entity.type.entities, entity.id);
            }
        });
    }

    private recursiveField(newFields: FormSchemaEntityField[], oldFields: FormSchemaEntityField[], parentId: string, entityId: string) {
        const added: any = [];
        newFields.forEach(newField => {
            if (!oldFields) {
                added.push({ data: newField, selectable: true });
                return;
            }
            const oldField = oldFields.find(f => f.id === newField.id);
            if (!oldField) {
                added.push({ data: newField, selectable: true });
                return;
            }
            // 比较默认值是否变化
            this.checkDefaultValueDiff(oldField, newField, entityId);

            // 字段类型相同，并且有下级字段：遍历下级字段
            if (oldField.type.name === newField.type.name && newField.type.fields) {
                const childAddedFields = this.recursiveField(newField.type.fields, oldField.type.fields || [], newField.id, entityId);
                if (childAddedFields.length > 0) {
                    added.push({ data: newField, selectable: false, children: childAddedFields, expanded: true });
                }
            }
        });
        return added;
    }

    /**
     * 对比schema字段默认值
     * @param oldField 旧字段
     * @param newField 新字段
     * @param entityId 字段所属实体id
     */
    private checkDefaultValueDiff(oldField: FormSchemaEntityField, newField: FormSchemaEntityField, entityId: string) {

        // 默认值存在表达式对象的场景，故转换成字段串后再比较
        let oldDefaultValue = oldField.defaultValue;
        oldDefaultValue = oldDefaultValue && typeof (oldDefaultValue) === 'object' ? JSON.stringify(oldDefaultValue) : oldDefaultValue;

        let newDefaultValue = newField.defaultValue;
        newDefaultValue = newDefaultValue && typeof (newDefaultValue) === 'object' ? JSON.stringify(newDefaultValue) : newDefaultValue;

        if (oldDefaultValue !== newDefaultValue) {
            this.setChangeMap(entityId, {
                id: newField.id,
                propCode: 'defaultValue',
                preValue: oldField.defaultValue,
                curValue: newField.defaultValue
            });
        }
    }
    private setAddedTreeData() {
        const addedTmp = this.addedTreeData.map(treeData => {
            // 寻找完整实体树对应表里的全部字段
            const elements = this.schemaService.getRtcSchemaFieldsByEntity(treeData.data.id);
            // 找到对应的表
            if (elements) {
                const children = treeData.children.map(addedField => {
                    // 判断新增字段是否已经在VO，BE上存在
                    const addedEle: any = Object.values(elements).find((ele: any) => ele.code === addedField.data.code);
                    // 如果存在， 把来源类型（Be，Vo）和源字段信息返回
                    if (addedEle) {
                        delete addedEle.schemaField;
                        addedField['sourceType'] = addedEle.type;
                        addedField['source'] = addedEle;
                    }
                    return addedField;
                });
                treeData.children = children;
            }
            // 如果没有找到对应表，证明是新增子表，直接返回
            return treeData;
        });
        this.addedTreeData = addedTmp;
    }

    private findEnumChanges(previous: any[], current: any[]) {

        let vmId: string;
        for (const currentVm of current) {
            // 如果无字段，略过
            if (!currentVm.fields || currentVm.fields.length === 0) {
                continue;
            }

            vmId = currentVm.id;
            const previousVm = previous.find(item => item.id === vmId);
            for (const field of currentVm.fields) {
                // 不是扩展字段，略过
                if (!field.fieldName.startsWith("ext_") || !field.fieldName.endsWith("_Lv9")) {
                    continue;
                }
                // 如果不是枚举字段，略过
                if (!this.isEnumField(field.id, vmId)) {
                    continue;
                }
                const cur_type = field.fieldSchema.type;
                // 如果没有修改枚举值，略过
                if (!cur_type || !cur_type.enumValues) {
                    continue;
                }
                let pre_field = {
                    fieldSchema: {
                        type: {
                            enumValues: []
                        }
                    }
                };

                if (previousVm) {
                    const index = previousVm.fields.findIndex(item => item.id === field.id);
                    if (index > -1) {
                        pre_field = previousVm.fields[index];
                    }
                }

                const pre_type = pre_field.fieldSchema.type;

                const pre_enumValue_string = pre_type ? JSON.stringify(pre_type.enumValues) : undefined;
                const cur_enumValue_string = JSON.stringify(cur_type.enumValues);
                // 如果枚举值没有变化，略过
                if (pre_enumValue_string === cur_enumValue_string) {
                    continue;
                }

                const tableInfo = this.schemaService.getTableInfoByViewModelId(vmId);
                const isAddedInSchema = tableInfo && this.isAddedInSchema(tableInfo.id, field.id);
                // 如果已经在schema中添加过，不需要添加到modify
                if (isAddedInSchema || !tableInfo) {
                    continue;
                }

                this.setChangeMap(tableInfo.id, {
                    id: field.id,
                    propCode: 'enumValue',
                    preValue: pre_type ? pre_type.enumValues : null,
                    curValue: cur_type.enumValues
                });
            }
        }
    }
    /**
     * 由于查找schema新增内容在前，查找viewModel变换在后
     * 调用时 this.addedTreeData 已经记录了新增信息
     * 新增过的内容，不需要放在modify内容中
    */
    private isAddedInSchema(tableId: string, fieldId: string): boolean {
        if (this.addedTreeData.length === 0) {
            return false;
        }
        const tableIndex = this.addedTreeData.findIndex(table => tableId === table.data.id);
        if (tableIndex < 0) {
            return false;
        }

        const fieldIndex = this.addedTreeData[tableIndex].children.findIndex(field => field.data.id === fieldId);
        return fieldIndex > -1;
    }

    private setChangeMap(tableId: string, changeItem: any) {
        if (this.changedMap.has(tableId)) {
            this.changedMap.get(tableId).push(changeItem);
        } else {
            this.changedMap.set(tableId, [changeItem]);
        }
    }

    private changeMapToObj(map: Map<string, any[]>) {
        const obj = {};
        map.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }

    private isEnumField(id: string, vmId: string) {
        const fieldInfo = this.schemaService.getFieldByIDAndVMID(id, vmId);
        if (fieldInfo?.schemaField && 'EnumType' === fieldInfo.schemaField.type.$type) {
            return true;
        } else {
            return false;
        }
    }
}

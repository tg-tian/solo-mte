import axios from "axios";
import { Ref, ref } from "vue";
import { FormSchema, FormSchemaEntity, FormSchemaEntityField, FormSchemaEntityField$Type, FormSchemaEntityFieldType$Type, FormSchemaEntityFieldTypeName, UseFormMetadata, UseFormSchema, UseSchemaService } from "../types";
import { DesignerMode } from "../types/designer-context";
import { MetadataService } from "./metadata.service";
import { cloneDeep } from 'lodash-es';

/**
 * 操作表单DOM Schema的工具类
 */
export function useSchemaService(
    metadataService: MetadataService,
    useFormSchema: UseFormSchema
): UseSchemaService {

    /** 表单更新schema产生的变更记录，用于控件同步自身属性。页面重刷结束后，依赖实体树组件将此属性重置为null */
    let entityChangeset: any;

    /** 运行时定制：打开表单时存储完整的字段信息 */
    const rtcSchemaFields: Ref<any> = ref();

    // 运行时定制：{实体ID:实体中新增的字段树节点集合}
    const rtcAddedTreeNodes: Ref<any> = ref({});

    // 运行时定制：平铺所有新增字段树节点（平铺关联带出字段）
    const rtcSerializedAddedTreeNodes: Ref<any> = ref([]);


    function getSchemaEntities(): FormSchemaEntity[] {
        const schema = useFormSchema.getSchemas();
        return schema?.entities || [];
    }

    /**
     * 获取表字段列表
     * @param entities 实体对象集合
     * @param bindTo 实体绑定路径
     */
    function getTableFieldsByBindTo(entities: FormSchemaEntity[], bindTo: string) {
        if (!entities || entities.length === 0) {
            return [];
        }
        const splitIndex = bindTo.indexOf('/');
        if (splitIndex > -1) {
            bindTo = bindTo.slice(splitIndex + 1, bindTo.length);
        }

        for (const entity of entities) {
            const entityType = entity.type;
            if (!entityType) {
                return [];
            }
            if (bindTo === '' || bindTo === entity.code || bindTo === entity.label) {
                return entityType.fields;
            }
            if (entityType.entities && entityType.entities.length > 0) {
                const fields = getTableFieldsByBindTo(entityType.entities, bindTo);
                if (fields) {
                    return fields;
                }
            }
        }
    }

    /**
     * 获取指定id的实体
     * @param entities 实体对象集合
     * @param id 实体id
     */
    function getEntityNodeById(entities: FormSchemaEntity[], id: string) {
        for (const entity of entities) {
            if (id === entity.id) {
                return entity;
            }
            const entityType = entity.type;
            if (!entityType) {
                return {};
            }
            if (entityType.entities && entityType.entities.length > 0) {
                const tagetEntity = getEntityNodeById(entityType.entities, id);
                if (tagetEntity) {
                    return tagetEntity;
                }
            }

        }

    }

    function extractFieldsFromEntityType(entityType: { fields?: FormSchemaEntityField[] }) {
        const fields: FormSchemaEntityField[] = [];
        if (entityType && entityType.fields && entityType.fields.length) {
            entityType.fields.forEach(field => {
                if (field.$type === 'SimpleField') {
                    fields.push(field);
                } else {
                    const extractedFields = extractFieldsFromEntityType(field.type);
                    if (extractedFields.length) {
                        extractedFields.forEach(extractedField => fields.push(extractedField));
                    }
                }
            });
        }
        return fields;
    }

    /**
     * 根据bindTo获取对应表信息
     * @param entities 实体
     * @param bindTo VM绑定
     */
    function _getTableBasicInfoByUri(entities: FormSchemaEntity[], bindTo: string, includeType?: boolean): any {
        if (!entities || entities.length === 0) {
            return;
        }
        const splitIndex = bindTo.indexOf('/');
        if (splitIndex > -1) {
            bindTo = bindTo.slice(splitIndex + 1, bindTo.length);
        }

        for (const entity of entities) {
            if (bindTo === '' || bindTo === entity.code || bindTo === entity.label) {
                const result = {
                    id: entity.id,
                    code: entity.code,
                    name: entity.name,
                    label: entity.label

                };
                if (includeType) {
                    result['type'] = entity.type;
                }
                return result;

            }
            const entityType = entity.type;

            if (entityType && entityType.entities && entityType.entities.length > 0) {
                const basicInfo = _getTableBasicInfoByUri(entityType.entities, bindTo, includeType);
                if (basicInfo) {
                    return basicInfo;
                }
            }
        }

    }

    /**
     * 根据bindTo获取对应表名
     * @param entities 实体对象集合
     * @param bindTo 绑定路径
     */
    function _getTableCodeByUri(entities: FormSchemaEntity[], bindTo: string): string | undefined {
        if (!entities || entities.length === 0) {
            return '';
        }
        const splitIndex = bindTo.indexOf('/');
        if (splitIndex > -1) {
            bindTo = bindTo.slice(splitIndex + 1, bindTo.length);
        }

        for (const entity of entities) {
            if (bindTo === '' || bindTo === entity.code || bindTo === entity.label) {
                return entity.code;
            }
            const entityType = entity.type;

            if (entityType && entityType.entities && entityType.entities.length > 0) {
                const label = _getTableCodeByUri(entityType.entities, bindTo);
                if (label) {
                    return label;
                }
            }
        }
    }

    /**
     * 根据VM id获取对应表名
     * @param viewModelId 实体模型标识
     */
    function getTableCodeByViewModelID(viewModelId) {
        const vm = useFormSchema.getViewModelById(viewModelId);

        const entities = getSchemaEntities();
        if (entities && entities.length > 0) {
            return _getTableCodeByUri(entities, vm?.bindTo || '');
        }
        return '';
    }

    /** entity.typ
     * 根据bindTo获取对应表名
     * @param entities 实体对象集合
     * @param bindTo 绑定路径
     */
    function _getTableLabelByUri(entities: FormSchemaEntity[], bindTo: string): string | undefined {
        if (!entities || entities.length === 0) {
            return;
        }
        const splitIndex = bindTo.indexOf('/');
        if (splitIndex > -1) {
            bindTo = bindTo.slice(splitIndex + 1, bindTo.length);
        }
        for (const entity of entities) {
            if (bindTo === '' || bindTo === entity.code || bindTo === entity.label) {
                return entity.label;
            }
            const entityType = entity.type;

            if (entityType && entityType.entities && entityType.entities.length > 0) {
                const label = _getTableLabelByUri(entityType.entities, bindTo);
                if (label) {
                    return label;
                }
            }
        }
    }

    /**
     * 根据bindTo获取对应表基本信息
     * @param viewModelId 数据模型标识
     */
    function getTableInfoByViewModelId(viewModelId: string): { id: string, code: string, name: string, label: string, type } | undefined {
        const vm = useFormSchema.getViewModelById(viewModelId);
        const entities = getSchemaEntities();
        if (entities && entities.length > 0) {
            return _getTableBasicInfoByUri(entities, vm?.bindTo || '');
        }
    }

    /**
     * 根据bindTo获取对应表信息
     * @param viewModelId 数据模型标识
     */
    function getTableByViewModelId(viewModelId: string): { id: string, code: string, name: string, label: string, type: any } | undefined {
        const vm = useFormSchema.getViewModelById(viewModelId);
        const entities = getSchemaEntities();
        if (entities && entities.length > 0) {
            return _getTableBasicInfoByUri(entities, vm?.bindTo || '', true);
        }
    }

    /**
     * 递归查询字段
     * @param fields 实体字段集合
     * @param refElementLabelPath 字段路径
     * @param id 字段标识
     */
    function getFieldInfoByID(fields: FormSchemaEntityField[], refElementLabelPath = '', id: string): {
        schemaField: FormSchemaEntityField, isRefElement: boolean, refElementLabelPath: string
    } {
        let element;
        let isRefElement = false;
        const parentLabel = refElementLabelPath ? refElementLabelPath + '.' : '';
        for (const field of fields) {
            if (field.id === id) {
                element = field;
                refElementLabelPath = parentLabel + field.label;
                isRefElement = parentLabel ? true : false;
                break;
            } else {
                // 关联字段/UDT字段
                if (field.type && field.type.fields && field.type.fields.length > 0) {
                    const childResult = getFieldInfoByID(field.type.fields, parentLabel + field.label, id);
                    if (childResult.schemaField) {
                        element = childResult.schemaField;
                        // eslint-disable-next-line prefer-destructuring
                        refElementLabelPath = childResult.refElementLabelPath;
                        // eslint-disable-next-line prefer-destructuring
                        isRefElement = childResult.isRefElement;
                        break;
                    }
                }
            }
        }
        return { schemaField: element, isRefElement, refElementLabelPath };
    }

    /**
     * 根据字段ID获取schema字段信息--用户旧表单适配
     */
    function getFieldByID(fieldId: string) {
        const entities = getSchemaEntities();
        if (!entities || entities.length === 0) {
            return;
        }
        const viewModels = useFormSchema.getViewModels();
        for (const viewModel of viewModels) {
            // if (viewModel.bindTo === '/' && !viewModel.parent) {
            //     continue;
            // }
            const fields = getTableFieldsByBindTo(entities, viewModel.bindTo);
            if (!fields) {
                continue;
            }
            const result = getFieldInfoByID(fields, '', fieldId);
            if (result && result.schemaField) {
                return result.schemaField;
            }
        }
    }

    /**
     * 递归查询字段
     * @param fields 实体字段集合
     * @param refElementLabelPath 字段路径
     * @param path 字段标识
     */
    function getFieldInfoByPath(fields: FormSchemaEntityField[], refElementLabelPath = '', path: string): {
        schemaField: FormSchemaEntityField, isRefElement: boolean, refElementLabelPath: string
    } {
        let element;
        let isRefElement = false;
        const parentLabel = refElementLabelPath ? refElementLabelPath + '.' : '';
        for (const field of fields) {
            if (field.path === path) {
                element = field;
                refElementLabelPath = parentLabel + field.label;
                isRefElement = parentLabel ? true : false;
                break;
            } else {
                // 关联字段/UDT字段
                if (field.type && field.type.fields && field.type.fields.length > 0) {
                    const childResult = getFieldInfoByID(field.type.fields, parentLabel + field.label, path);
                    if (childResult.schemaField) {
                        element = childResult.schemaField;
                        // eslint-disable-next-line prefer-destructuring
                        refElementLabelPath = childResult.refElementLabelPath;
                        // eslint-disable-next-line prefer-destructuring
                        isRefElement = childResult.isRefElement;
                        break;
                    }
                }
            }
        }
        return { schemaField: element, isRefElement, refElementLabelPath };
    }

    /**
    * 根据字段ID和ViewModelId获取字段信息（包括关联表字段）
    * 返回对象 {实体，是否关联字段，关联字段的dataField}
    * @param id 字段标识
    * @param viewModelId 视图模型标识
    */
    function getFieldByIDAndVMID(id: string, viewModelId: string): {
        schemaField: FormSchemaEntityField, isRefElement: boolean, refElementLabelPath: string
    } | undefined {
        const entities = getSchemaEntities();
        if (!entities || entities.length === 0) {
            return;
        }
        const vm = useFormSchema.getViewModelById(viewModelId);
        const fields = getTableFieldsByBindTo(entities, vm?.bindTo || '');
        if (!fields) {
            return;
        }

        const fieldInfo = getFieldInfoByID(fields, '', id);
        if (fieldInfo?.schemaField) {
            return fieldInfo;
        }
        // 若是运行时定制环境，从be或vo字段中查找
        if (useFormSchema.designerMode === DesignerMode.PC_RTC) {
            const rtcFieldNode = rtcSerializedAddedTreeNodes.value?.find(node => node.data?.id === id);
            if (rtcFieldNode) {
                return { schemaField: rtcFieldNode.data, isRefElement: false, refElementLabelPath: '' };
            }
        }
    }

    /**
     *  获取分级码字段（返回所有类型为HierarchyType的字段）
     * @param viewModelId VMID
     */
    function getTreeGridUdtFields(viewModelId: string): any[] {
        const entities = getSchemaEntities();
        if (!entities || entities.length === 0) {
            return [];
        }
        const viewModelDetail = useFormSchema.getViewModelById(viewModelId);
        const fields = getTableFieldsByBindTo(entities, viewModelDetail?.bindTo || '');
        const udtFields = [] as any;
        if (!fields) {
            return [];
        }
        for (const element of fields) {
            if (element.type && element.type.$type === 'HierarchyType') {
                udtFields.push({ key: element.label, value: element.name, field: element });
            }
        }
        return udtFields;
    }

    /**
     * 国际化：schema字段类型
     * @param fields 实体下的字段集合
     */
    function localizeFormSchema(schemaEntity: FormSchemaEntity) {

        const localizeSchemaFields = (fields: FormSchemaEntityField[]) => {
            fields.forEach(element => {

                // 字段类型名称
                // eslint-disable-next-line no-self-assign
                element.type.displayName = element.type.displayName;

                // 枚举类型名称
                if (element.type.name === FormSchemaEntityFieldTypeName.Enum && element.type.valueType && element.type.valueType.displayName) {
                    // eslint-disable-next-line no-self-assign
                    element.type.valueType.displayName = element.type.valueType.displayName;
                }
                // 关联表字段 / UDT字段
                if (element.type && element.type.fields && element.type.fields.length > 0) {
                    localizeSchemaFields(element.type.fields);
                }
            });
        };

        if (schemaEntity.type && schemaEntity.type.fields && schemaEntity.type.fields.length > 0) {
            localizeSchemaFields(schemaEntity.type.fields);
        }

        // 子表
        if (schemaEntity.type.entities && schemaEntity.type.entities.length > 0) {
            for (const childEntity of schemaEntity.type.entities) {
                localizeFormSchema(childEntity);
            }

        }
    }

    /**
     * VO 转化为表单schema
     * @param viewObjectId 视图对象标识
     */
    function convertViewObjectToEntitySchema(viewObjectId: string, sessionId: string) {
        // 1、schema.id 查询VO实体
        return metadataService.getRefMetadata('', viewObjectId).then(result => {
            if (result && result.data && result.data.content) {
                const viewObjectMetadataContent = JSON.parse(result.data.content);
                // 2、将VO实体转为schema
                const schemaUrl = '/api/dev/main/v1.0/designschema/create';
                return axios.post(schemaUrl, viewObjectMetadataContent)
                    .then((response: any) => {
                        const schema = response.data as FormSchema;
                        // 字段类型国际化
                        const mainSchemaEntity = schema.entities[0];
                        localizeFormSchema(mainSchemaEntity);
                        return schema;
                    });
            }
        });
    }

    /**
     * 获取指定VM下的所有字段
     * @param viewModelId 视图模型标识
     */
    function getFieldsByViewModelId(viewModelId: string): FormSchemaEntityField[] {
        const vm = useFormSchema.getViewModelById(viewModelId);
        if (!vm) {
            return [];
        }
        const entities = getSchemaEntities();
        if (!entities || entities.length === 0) {
            return [];
        }
        return getTableFieldsByBindTo(entities, vm.bindTo);
    }

    function getPrimaryField(): string {
        const entities = getSchemaEntities();
        if (!entities || entities.length === 0) {
            return '';

        }
        return entities[0].type.primary;
    }

    /**
     * 根据指定的字段key值，获取字段信息。例如获取key=bindingPath,值为xxx的字段
     * @param targetFieldKey 字段key
     * @param targetFieldValue 字段key值
     */
    function getSchemaField(targetFieldKey: string, targetFieldValue: string): FormSchemaEntityField | null {
        const entities = getSchemaEntities();
        let retField: FormSchemaEntityField | null = null;
        const getTargetFiled = (predicate: (element: FormSchemaEntityField) => boolean, fieldsArray: FormSchemaEntityField[]) => {
            fieldsArray.find((element: FormSchemaEntityField) => {
                const predicateResult = predicate(element);
                if (predicateResult) {
                    retField = element;
                    return true;
                } else {
                    if (element.type.fields) {
                        getTargetFiled(predicate, element.type.fields);
                    }
                }
                return false;
            });
        };
        entities.forEach((entitiesItem: FormSchemaEntity) => {
            getTargetFiled((field: FormSchemaEntityField) => field[targetFieldKey] === targetFieldValue, entitiesItem.type.fields);
        });

        return retField;
    }

    /**
     * 运行时定制场景：获取某实体下来源于be或vo的字段（不在当前表单entity内的字段）
     */
    function getRtcSchemaFieldsByEntity(targetEntityId: string, rtSchemaNode?: any) {
        if (!rtSchemaNode) {
            rtSchemaNode = rtcSchemaFields.value.mainNode;
        }
        if (rtSchemaNode?.id === targetEntityId) {
            return rtSchemaNode.elements;
        }
        if (rtSchemaNode?.childNodes) {

            if (rtSchemaNode.childNodes[targetEntityId]) {
                return rtSchemaNode.childNodes[targetEntityId].elements;
            }
            const childEntityIds = Object.keys(rtSchemaNode.childNodes);
            if (childEntityIds && childEntityIds.length) {
                for (const id of childEntityIds) {
                    const childElements = getRtcSchemaFieldsByEntity(targetEntityId, rtSchemaNode.childNodes[id]);
                    if (childElements) {
                        return childElements;
                    }
                }
            }
        }
    }

    /**
     * schema字段集合组装成树
     * @param fields schema字段集合
     */
    function assembleRtcFieldsToTree(fields: FormSchemaEntityField[], rtRelateParentSchemaField: any, entityId: string) {
        const treeData: any = [];
        fields.forEach(element => {
            // 关联表字段 / UDT字段
            let children = [];
            if (element.type && element.type.fields && element.type.fields.length > 0) {
                children = assembleRtcFieldsToTree(element.type.fields, rtRelateParentSchemaField, entityId);
            }
            const node = {
                data: element,
                children,
                draggable: children.length === 0,
                // 关联带出字段：记录父节点，用于添加schema节点
                rtRelateParentSchemaField: rtRelateParentSchemaField,
                entityId,
                nodeType: 'field'
            };
            treeData.push(node);

            rtcSerializedAddedTreeNodes.value.push(node);
        });
        return treeData;
    }
    /**
     * 运行时定制场景：合并来源于be和vo字段，返回完整的实体树结构
     */
    function assembleRtcSchemaTree(treeNodes: any[],) {
        if (!treeNodes || treeNodes.length === 0) {
            return;
        }
        for (const treeNode of treeNodes) {
            if (treeNode.nodeType !== 'entity' && treeNode.nodeType !== 'childEntity') {
                continue;
            }
            const schemaEntity = treeNode.data;
            if (schemaEntity?.type) {
                const currentSchemaFieldIds = schemaEntity.type.fields.map(field => field.id);
                const rtcSchemaFields = getRtcSchemaFieldsByEntity(schemaEntity.id);
                if (rtcSchemaFields) {
                    Object.keys(rtcSchemaFields).forEach(rtId => {
                        const rtElement = rtcSchemaFields[rtId];
                        if (!rtElement.schemaField || currentSchemaFieldIds.includes(rtElement.schemaField.id)) {
                            return;
                        }
                        // 新字段为关联字段
                        let childNodes = [];
                        if (rtElement.schemaField.$type === 'ComplexField' && rtElement.schemaField.type) {
                            childNodes = assembleRtcFieldsToTree(rtElement.schemaField.type.fields, rtElement.schemaField, schemaEntity.id);
                        }
                        // 新字段追加到树表：放在子表节点前面
                        const newFieldTreeNode = {
                            data: rtElement.schemaField,
                            children: childNodes,
                            draggable: childNodes.length === 0,
                            rtFieldSourceType: rtElement.type,
                            // rtFieldTag: rtElement.tag,
                            entityId: schemaEntity.id,
                            nodeType: 'field'
                        };
                        rtcSerializedAddedTreeNodes.value.push(newFieldTreeNode);

                        const childEntityIndex = treeNode.children.findIndex(c => c.nodeType === 'childEntity');
                        if (childEntityIndex > 0) {
                            treeNode.children.splice(childEntityIndex, 0, cloneDeep(newFieldTreeNode));
                        } else {
                            treeNode.children.push(cloneDeep(newFieldTreeNode));
                        }
                        if (!rtcAddedTreeNodes.value[schemaEntity.id]) {
                            rtcAddedTreeNodes.value[schemaEntity.id] = [];
                        }
                        rtcAddedTreeNodes.value[schemaEntity.id].push(newFieldTreeNode);

                    });
                }
            }
            if (treeNode.children && treeNode.children.length > 0) {
                assembleRtcSchemaTree(treeNode.children);

            }
        }
    }
    /**
     * 运行时定制：当表单使用be或vo的字段创建控件时，便将这个字段添加到表单实体中
     */
    function addRtcFieldsToSchemaEntity(schemaField: FormSchemaEntityField) {
        if (useFormSchema.designerMode === DesignerMode.PC_RTC && rtcSerializedAddedTreeNodes.value.length) {
            const rtcFieldNode = rtcSerializedAddedTreeNodes.value.find(node => node.data.id === schemaField.id);
            if (rtcFieldNode) {
                const { entityId } = rtcFieldNode;
                const addedField = rtcFieldNode.rtRelateParentSchemaField ? rtcFieldNode.rtRelateParentSchemaField : rtcFieldNode.data;
                const entities = getSchemaEntities();
                const entity = getEntityNodeById(entities, entityId);
                if (entity?.type?.fields && !entity.type.fields.find(field => field.id === addedField.id)) {
                    entity.type.fields.push(addedField);
                }
            }
        }
    }

    return {
        convertViewObjectToEntitySchema,
        getFieldByIDAndVMID,
        getFieldsByViewModelId,
        getTableInfoByViewModelId,
        getFieldByID,
        entityChangeset,
        getSchemaEntities,
        getPrimaryField,
        getRtcSchemaFieldsByEntity,
        assembleRtcSchemaTree,
        rtcAddedTreeNodes,
        rtcSchemaFields,
        rtcSerializedAddedTreeNodes,
        addRtcFieldsToSchemaEntity
    };

}

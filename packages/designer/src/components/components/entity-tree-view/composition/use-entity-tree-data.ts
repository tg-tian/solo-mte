import { FormSchemaEntity, FormSchemaEntityField, FormSchemaEntityField$Type, UseFormSchema, UseSchemaService } from "../../../types";
import { ref } from 'vue';
import { DesignerMode } from "../../../types/designer-context";
import { cloneDeep } from 'lodash-es';

export function UseEntityTreeData(useFormSchema: UseFormSchema, schemaService: UseSchemaService) {

    /** 树表绑定数据 */
    const treeViewData: any = ref([]);
    /** 平铺展示的树节点 */
    const serializedTreeData: any = ref([]);

    /** 当前实体编号集合 */
    const existedEntityCodes: any = ref([]);

    function getViewModelFieldsByEntity(entityPath: string): Map<string, boolean> {
        const fieldsMap = new Map<string, boolean>();
        if (!useFormSchema) {
            return fieldsMap;
        }
        const viewModels = useFormSchema.getViewModels();
        /** 记录每个字段出现了多少次 */
        const fieldsCountingMap = new Map<string, number>();

        // 可能多个视图模型绑定同一个实体
        const matchingViewModels = viewModels.filter(viewModel => viewModel.bindTo === entityPath);
        matchingViewModels.forEach(viewModel => {
            const component = useFormSchema.getComponentByViewModelId(viewModel.id);
            if (!component || !viewModel.fields?.length) {
                return;
            }

            viewModel.fields.forEach(field => {
                const count = fieldsCountingMap.has(field.id) ? (fieldsCountingMap.get(field.id) || 0) + 1 : 1;
                fieldsCountingMap.set(field.id, count);
            });
        });
        fieldsCountingMap.forEach((count, id) => {
            fieldsMap.set(id, true);
        });
        return fieldsMap;
    }
    /**
     * 将实体内的字段组装为树结构
     */
    function resolveFieldNodesInEntity(fields: FormSchemaEntityField[], parentNode: any, occupiedFieldsMap: Map<string, boolean>, entityId?: string) {
        const treeData: any = [];
        fields.forEach(field => {

            const fieldTreeData = {
                data: field,
                id: field.id,
                parent: parentNode && parentNode.id,
                isOccupied: occupiedFieldsMap?.has(field.id),
                collapse: true,
                draggable: true,
                children: [],
                nodeType: 'field',
                entityId
            };
            treeData.push(fieldTreeData);
            serializedTreeData.value.push(fieldTreeData);

            // 关联表字段 / UDT字段
            if (field.type && field.type.fields && field.type.fields.length > 0) {
                fieldTreeData.collapse = false;
                fieldTreeData.draggable = false;
                fieldTreeData.children = resolveFieldNodesInEntity(field.type.fields, field, occupiedFieldsMap, entityId);
            }
        });

        return treeData;
    }

    /**
     * 组装实体树绑定数据
     */
    function resolveEntityTreeData(entity: FormSchemaEntity, layer: number, parentNode: any, entityPath: string = '/') {
        const occupiedFieldsMap = getViewModelFieldsByEntity(entityPath);
        const entityTreeData: any = {
            data: entity,
            id: entity.id,
            nodeType: 'entity',
            parent: parentNode && parentNode.id,
            children: [],
            entityPath,
            collapse: false,
            draggable: true
        };
        serializedTreeData.value.push(entityTreeData);
        existedEntityCodes.value.push(entity.code);

        if (entity.type && entity.type.fields && entity.type.fields.length > 0) {
            entityTreeData.children = resolveFieldNodesInEntity(entity.type.fields, entity, occupiedFieldsMap, entity.id);
        }

        if (entity.type.entities && entity.type.entities.length > 0) {
            const childrenTreeData: any = [];
            entity.type.entities.forEach((childEntity: any) => {
                const childEntityPath = `${entityPath === '/' ? '' : entityPath}/${childEntity.label}`;
                const childTreeData = resolveEntityTreeData(childEntity, layer + 2, { id: entity.id }, childEntityPath);
                if (childTreeData) {
                    childrenTreeData.push(childTreeData);
                }

            });

            entityTreeData.children.push({
                id: `childEntity_${entity.id}`,
                data: { id: `childEntity_${entity.id}`, name: '子表' },
                parent: entity.id,
                nodeType: 'childEntity',
                collapse: false,
                draggable: false,
                children: childrenTreeData
            });
        }
        return entityTreeData;
    }
    /**
     * 合并运行时定制中来自be或vo的字段
     */
    function resolveRtcEntityTreeData() {

        if (useFormSchema.designerMode === DesignerMode.PC_RTC) {
            schemaService.rtcAddedTreeNodes.value = {};
            schemaService.rtcSerializedAddedTreeNodes.value = [];
            schemaService.assembleRtcSchemaTree(treeViewData.value);
            if (schemaService.rtcSerializedAddedTreeNodes.value?.length) {
                serializedTreeData.value = serializedTreeData.value.concat(cloneDeep(schemaService.rtcSerializedAddedTreeNodes.value));
            }
        }
    }

    /**
     * 刷新实体树时保留上次的树节点展开状态
     * @param currentTreeData 新的treeData
     * @param oldTreeData 旧的treeData
     */
    function assignExpandState(currentTreeData: any[], oldTreeData: any[]) {
        currentTreeData.map(currentTreeNode => {
            const oldTreeNode = oldTreeData.find(oldData => oldData.id === currentTreeNode.id);
            if (oldTreeNode) {
                currentTreeNode.collapse = oldTreeNode['__fv_collapse__'];
            }
        });
    }
    /**
     * 将树表body节点添加到拖拽框架
     */
    function appendTreeToDragulaContainer(dragulaInstance: any) {
        if (!dragulaInstance) {
            return;
        }
        const entityTreeElement = document.querySelector('.designer-schema-tree');
        if (!entityTreeElement) {
            return;
        }
        dragulaInstance.containers = dragulaInstance.containers.filter(
            (element: HTMLElement) => !element.className.includes('.fv-grid-data')
        );

        const entityTreeBody = entityTreeElement.querySelector('.fv-grid-data');
        if (entityTreeBody) {
            dragulaInstance.containers.push(entityTreeBody);
        }
    }
    /**
     * 为实体树行节点添加字段信息，方便后续拖拽时获取字段/实体表信息
     */
    function addDraggableClassToGridRow(entityTreeBody: HTMLElement) {
        Array.from(entityTreeBody.children).forEach(rowElement => {
            const elementClassList = Array.from(rowElement.classList || []);
            const idClass = elementClassList.find(className => className.startsWith('id='));
            if (!idClass) {
                return;
            }
            const nodeId = idClass.replace('id=', '');
            const treeNode = serializedTreeData.value.find(nodeData => nodeData.data?.id === nodeId);

            // 简单字段节点
            if (treeNode?.data?.$type === FormSchemaEntityField$Type.SimpleField) {
                rowElement.setAttribute('data-sourceType', 'field');
                rowElement.setAttribute('data-fieldId', nodeId);
                rowElement.setAttribute('data-category', 'input');
            }

            // 实体节点
            if (treeNode?.nodeType === 'entity') {
                rowElement.setAttribute('data-sourceType', 'entity');
                rowElement.setAttribute('data-fieldId', nodeId);
                rowElement.setAttribute('data-category', 'dataCollection');
            }
        });
    }
    /**
     * 设置实体树可拖拽
     */
    function setTreeDraggable() {
        const entityTreeElement = document.querySelector('.designer-schema-tree');
        if (!entityTreeElement) {
            return;
        }
        const entityTreeBody = entityTreeElement.querySelector('.fv-grid-data') as HTMLElement;
        if (!entityTreeBody) {
            return;
        }
        // body节点不接收拖拽进来的内容
        if (!entityTreeBody.className.includes('no-drop')) {
            entityTreeBody.className += ' no-drop';
        }
        // 配置tr节点拖拽相关属性
        if (entityTreeBody.children && entityTreeBody.children.length) {
            addDraggableClassToGridRow(entityTreeBody);
        }

    }
    return {
        resolveEntityTreeData, assignExpandState, setTreeDraggable, treeViewData, appendTreeToDragulaContainer,
        existedEntityCodes,
        resolveRtcEntityTreeData,
        serializedTreeData
    };
}

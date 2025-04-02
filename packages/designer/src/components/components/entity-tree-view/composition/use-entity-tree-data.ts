import { FormSchemaEntity, FormSchemaEntityField } from "../../../types";

export function UseEntityTreeData() {

    /**
     * 将实体内的字段组装为树结构
     */
    function resolveFieldNodesInEntity(fields: FormSchemaEntityField[], layer: number, parentNode: any, treeViewData: any[] = []) {
        fields.forEach(field => {

            const fieldTreeData = {
                data: field,
                id: field.id,
                name: field.name,
                expanded: true,
                layer,
                parent: parentNode && parentNode.id,
                hasChildren: false
            };
            treeViewData.push(fieldTreeData);
            // 关联表字段 / UDT字段
            if (field.type && field.type.fields && field.type.fields.length > 0) {
                fieldTreeData.hasChildren = true;
                resolveFieldNodesInEntity(field.type.fields, layer + 1, field, treeViewData);
            }
        });
    }

    /**
     * 组装实体树绑定数据
     */
    function resolveEntityTreeData(entity: FormSchemaEntity, layer: number, parentNode: any, treeViewData: any[] = []) {
        const entityTreeData = {
            data: entity,
            id: entity.id,
            name: entity.name,
            expanded: true,
            nodeType: 'entity',
            layer,
            parent: parentNode && parentNode.id,
            hasChildren: true
        };
        treeViewData.push(entityTreeData);

        if (entity.type && entity.type.fields && entity.type.fields.length > 0) {
            resolveFieldNodesInEntity(entity.type.fields, layer + 1, entity, treeViewData);
        }

        if (entity.type.entities && entity.type.entities.length > 0) {
            const childentityTreeData = {
                id: `childEntity_${entity.id}`,
                name: '子表',
                layer: layer + 1,
                parent: entity.id,
                hasChildren: true
            };
            treeViewData.push(childentityTreeData);

            entity.type.entities.forEach((childEntity: any) => {
                resolveEntityTreeData(childEntity, layer + 2, childentityTreeData, treeViewData);

            });
        }
    }

    return { resolveEntityTreeData };
}

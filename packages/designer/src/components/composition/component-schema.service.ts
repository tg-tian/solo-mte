import { SchemaService } from "@farris/ui-vue";
import { FormMetadataConverter } from './form-metadata-converter';
import { Ref } from 'vue';
import { cloneDeep } from 'lodash-es';

export function useComponentSchemaService(formSchema: Ref<any>): SchemaService {

    const componentSchemaMap = new Map<string, Record<string, any>>();
    const componentParentMap = new Map<string, string>();
    const formMetaDataConverter = new FormMetadataConverter();

    function closest(componentId: string, componentType: string): Record<string, any> | null {
        /**
         * 通过load构造的数据，只有root-component下的，没有其他几个component，
         * 此时输入控件对应的component的id就没有-ref
         */
        const currentComponent = componentSchemaMap.get(componentId) || componentSchemaMap.get(componentId + '-ref');
        if (currentComponent) {
            const parentId = componentParentMap.get(currentComponent.id) as string;
            const parentComponent = componentSchemaMap.get(parentId);
            if (parentComponent && parentComponent.type === componentType) {
                return parentComponent;
            }
            return closest(parentId, componentType);
        }
        return null;
    }

    function load(componentSchema: Record<string, any>) {
        if (componentSchema && componentSchema.id) {
            componentSchemaMap.set(componentSchema.id, componentSchema);
        }
        if (componentSchema && componentSchema.contents && componentSchema.contents.length) {
            (componentSchema.contents as Record<string, any>[]).forEach((childComponentSchema: Record<string, any>) => {
                load(childComponentSchema);
                componentParentMap.set(childComponentSchema.id, componentSchema.id);
            });
        }
    }

    function getSchemaById(string: any): Record<string, any> {
        return {};
    }

    function select(root: Record<string, any>, predicate: (child: Record<string, any>) => boolean): Record<string, any> {
        return {};
    }
    /**
     *  在获取属性值的时候能传递这个service，帮助判断类型
     * @param editorType 
     * @returns 
     */
    function getRealEditorType(editorType: string): string {
        return formMetaDataConverter.getRealEditorType(editorType);
    }

    function updateExpression(expressionItem: any) {
        if (!expressionItem || !formSchema || !formSchema.value || !formSchema.value.module) {
            return;
        }

        let expressions = formSchema.value.module.expressions || [];

        if (!expressionItem.rules || !expressionItem.rules.length) {
            expressions = expressions.filter(item => item.target !== expressionItem.target);
        } else {
            const index = expressions.findIndex(item => item.target === expressionItem.target);
            if (index === -1) {
                expressions.push(expressionItem);
            } else {
                expressions[index] = cloneDeep(expressionItem);
            }
        }

        formSchema.value.module.expressions = JSON.parse(JSON.stringify(expressions));
    }

    function getExpressionRuleValue(expressionId: any, rultType: string) {
        const { expressions } = formSchema.value.module;
        if (!expressions) {
            return  '';
        }
        const expressionItem = expressions.find(item => item.target === expressionId);
        if (!expressionItem) {
            return  '';
        }

        const ruleItem = expressionItem.rules.find(item => item.type === rultType);
        if (!ruleItem) {
            return  '';
        }

        return ruleItem;
    }

    return { closest, getSchemaById, load, select, getRealEditorType, updateExpression,
        getExpressionRuleValue
    };

}

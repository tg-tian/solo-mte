import { ref, watch, computed, reactive, type Ref, type Reactive } from 'vue';
import type { SetupContext } from 'vue';
import { JsonSchemaBasicType, type JsonSchema, type Parameter } from '@farris/flow-devkit/types';
import type { JsonSchemaEditorProps } from '../json-schema-editor.props';
import type { TreeNodeData } from './type';
import { JsonSchemaUtils, uuid } from '@farris/flow-devkit/utils';
import type { TTreeNodeModel } from '@farris/flow-devkit/third-party';
import { useNotify } from '@farris/flow-devkit/composition';

export interface UseData {
    params: Ref<Parameter[]>;
    allCodes: Ref<string[]>;
    allNames: Ref<string[]>;
    treeData: Ref<TreeNodeData[]>;
    couldCollapse: Ref<boolean>;
    expandedNodeValues: Ref<string[]>;
    detailExpandedNodeValues: Reactive<Set<string>>;
    onNodeExpand: (node: TTreeNodeModel) => void;
    expandNodeByValue: (nodeValue: string) => void;
    toggleNodeDetailPanel: (node: TTreeNodeModel) => void;
    isParamNameDuplicate: (name?: string) => boolean;
}

export function useData(props: JsonSchemaEditorProps, _context: SetupContext): UseData {

    const notify = useNotify();

    const params = computed(() => props.modelValue || []);

    const treeData = ref<TreeNodeData[]>([]);

    const allNodeValues = reactive(new Set<string>());

    const notExpandedNodeValues = reactive(new Set<string>());

    const expandedNodeValues = computed<string[]>(() => {
        const values: string[] = [];
        allNodeValues.forEach((nodeValue) => {
            if (!notExpandedNodeValues.has(nodeValue)) {
                values.push(nodeValue);
            }
        });
        return values;
    });

    const couldCollapse = computed<boolean>(() => {
        return params.value.some((param) => {
            const properties = JsonSchemaUtils.getObjectProperties(param.schema);
            return Array.isArray(properties) && properties.length > 0;
        });
    });

    function onNodeExpand(node: TTreeNodeModel): void {
        const nodeValue = node.value as string;
        if (!nodeValue) {
            return;
        }
        if (node.expanded) {
            notExpandedNodeValues.delete(nodeValue);
        } else {
            notExpandedNodeValues.add(nodeValue);
        }
    }

    function expandNodeByValue(nodeValue: string): void {
        notExpandedNodeValues.delete(nodeValue);
    }

    const allCodes = computed<string[]>(() => {
        return params.value.map(param => param.code);
    });

    const allNames = computed<string[]>(() => {
        return params.value.map(param => (param.name || '').trim() || param.code || '');
    });

    function isParamNameDuplicate(name?: string): boolean {
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
            return false;
        }
        const sames = allNames.value.filter((item) => item === trimmedName);
        return sames.length > 1;
    }

    const detailExpandedNodeValues = reactive(new Set<string>());

    function toggleNodeDetailPanel(node: TTreeNodeModel): void {
        const nodeValue = node.value as string;
        if (!nodeValue) {
            return;
        }
        const { parameter, schema } = (node.data as TreeNodeData).rowData;
        const paramName = schema ? '' : parameter.name;
        const isNameDuplicate = isParamNameDuplicate(paramName);
        const errorTip = isNameDuplicate ? `显示名称不可重复` : '';
        if (detailExpandedNodeValues.has(nodeValue)) {
            if (errorTip) {
                notify.error(errorTip);
            } else {
                detailExpandedNodeValues.delete(nodeValue);
            }
        } else {
            detailExpandedNodeValues.add(nodeValue);
        }
    }

    function ensureId(item: Parameter | JsonSchema): void {
        if (item && !item.id) {
            item.id = uuid();
        }
    }

    function transJsonSchema2TreeNodeData(param: Parameter, schema?: JsonSchema, level = 0): TreeNodeData[] {
        if (!schema) {
            return [];
        }
        if (schema.type === JsonSchemaBasicType.Array) {
            return transJsonSchema2TreeNodeData(param, schema.items, level);
        }
        if (schema.type === JsonSchemaBasicType.Object && Array.isArray(schema.properties)) {
            return schema.properties.map((property) => {
                ensureId(property);
                const nodeLabel = property.name || property.code;
                const nodeValue = property.id!;
                allNodeValues.add(nodeValue);
                return {
                    value: nodeValue,
                    label: nodeLabel,
                    text: nodeLabel,
                    rowData: {
                        type: 'schema',
                        level,
                        parameter: param,
                        schema: property,
                    },
                    children: transJsonSchema2TreeNodeData(param, property, level + 1),
                };
            });
        }
        return [];
    }

    function transParameter2TreeNodeData(param: Parameter): TreeNodeData {
        ensureId(param);
        const nodeLabel = param.name || param.code;
        const nodeValue = param.id!;
        allNodeValues.add(nodeValue);
        return {
            value: nodeValue,
            label: nodeLabel,
            text: nodeLabel,
            rowData: {
                type: 'param',
                level: 0,
                parameter: param,
            },
            children: transJsonSchema2TreeNodeData(param, param.schema, 1),
        };
    }

    function updateTreeNodeStatuses(): void {
        Array.from(notExpandedNodeValues).forEach((nodeValue) => {
            if (!allNodeValues.has(nodeValue)) {
                notExpandedNodeValues.delete(nodeValue);
            }
        });
        Array.from(detailExpandedNodeValues).forEach((nodeValue) => {
            if (!allNodeValues.has(nodeValue)) {
                detailExpandedNodeValues.delete(nodeValue);
            }
        });
        if (!props.hideDetailExpandButton && props.canEditName) {
            params.value.forEach((param) => {
                if (isParamNameDuplicate(param.name)) {
                    detailExpandedNodeValues.add(param.id!);
                }
            });
        }
    }

    function updateTreeData(parameters: Parameter[]): void {
        allNodeValues.clear();
        treeData.value = parameters.filter((param) => !!param).map(transParameter2TreeNodeData);
        updateTreeNodeStatuses();
    }

    watch(
        params,
        () => updateTreeData(params.value),
        { immediate: true },
    );

    return {
        params,
        allCodes,
        allNames,
        treeData,
        couldCollapse,
        expandedNodeValues,
        detailExpandedNodeValues,
        onNodeExpand,
        expandNodeByValue,
        toggleNodeDetailPanel,
        isParamNameDuplicate,
    };
}

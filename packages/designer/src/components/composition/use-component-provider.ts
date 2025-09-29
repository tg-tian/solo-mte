// import { wfBizprocessLookupComponent as WfBizProcessLookUp } from '@gsp-wf/wf-bizprocess-lookup-vue';
import { MappingEditor as FMappingEditor} from "@farris/ui-vue";
import { ParamConfig } from '../components/view-model-designer/method-manager/entity/param';
export type CallbackFn = (context?: any) => any;
export function useComponentProvider() {
    const mapFieldsDisplayFormatter = (items: []) => {
        if (items && items.length) {
            return items.map((item) => `${item['name']}[${item['bindingPath']}]`).join(',');
        }
        return '';
    };
    const externalParamterEditor = {
        bizDefKey: 'Custom',
        fieldMapping: 'Custom'
    };
    const externalComponents = {
        // todo: 使用componentMap把外部组件注册进来
        // jumphere
        bizDefKey: null,
        fieldMapping: FMappingEditor
    };
    const externalComponentProps = {
        bizDefKey: (parameter: ParamConfig, onChangeValue: CallbackFn, modelValue?: any) => {
            const bindingData = { id: parameter.value, name: parameter.value };
            return {
                id: 'work-flow-class' + parameter.value,
                key: 'work-flow-class' + parameter.value,
                title: '选择流程',
                multiSelect: false,
                bindingData,
                textField: 'id',
                editable: true,
                allowFreeInput: true,
                onAfterClear: () => {
                    parameter.value = '';
                    onChangeValue('');
                    // commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
                    // updateViewModel(commandsData.value);
                },
                onAfterConfirm: (e: any) => {
                    const value = e.items[0].id;
                    parameter.value = value;
                    onChangeValue(value);
                    // commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
                    // updateViewModel(commandsData.value);
                },
                onValueChange: (e: string) => {
                    parameter.value = e;
                    onChangeValue(e);
                }
            };
        },
        fieldMapping: (
            modelValue: string,
            parameter: ParamConfig,
             onChangeValue: CallbackFn, beforeOpen) => {
            return {
                modalWidth: 800,
                modalHeight: 600,
                editable: false,
                beforeOpen: beforeOpen,
                modelValue,
                fromData: {
                    editable: true,
                    formatter: (cell, data) => {
                        return `${data.raw['name']} [${data.raw['bindingPath']}]`;
                    },
                    idField: 'bindingPath',
                    textField: 'name',
                    valueField: 'bindingPath',
                    searchFields: ['name', 'bindingPath'],
                    // repositoryToken: FieldSelectorRepositoryToken,
                    // dataSource: fromDataSource,
                    displayFormatter: mapFieldsDisplayFormatter
                },
                toData: {
                    editable: false,
                    idField: 'bindingPath',
                    textField: 'name',
                    valueField: 'bindingPath',
                    searchFields: ['name', 'bindingPath'],
                    // dataSource: targetDataSource,
                    formatter: (cell, data) => {
                        return `${data.raw['name']} [${data.raw['bindingPath']}]`;
                    },
                    displayFormatter: mapFieldsDisplayFormatter
                },
                onMappingFieldsChanged: (value: string) => {
                    parameter.value = value;
                    onChangeValue(value);
                }
            };
        }
    };
    return {
        externalParamterEditor,
        externalComponents,
        externalComponentProps
    };
};

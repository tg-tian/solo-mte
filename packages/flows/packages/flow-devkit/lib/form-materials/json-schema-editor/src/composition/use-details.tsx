import { type JsonSchemaEditorProps, COMPONENT_NAME } from '../json-schema-editor.props';
import { type TTreeNodeModel } from '@farris/flow-devkit/third-party';
import type { TreeNodeData, RowData } from './type';
import type { UseData } from './use-data';
import { useBem, ParameterUtils } from '@farris/flow-devkit/utils';
import { BasicTypeRefer, type EnumInputHelp } from '@farris/flow-devkit/types';
import { EnumInputHelpEditor } from '@farris/flow-devkit/form-materials';

export function useDetails(props: JsonSchemaEditorProps, useDataComposition: UseData) {

    const { bem } = useBem(COMPONENT_NAME);
    const {
        isParamNameDuplicate,
    } = useDataComposition;

    function renderErrorTip(errorTip?: string) {
        if (!errorTip) {
            return;
        }
        return (
            <div class="fvf-form-item-error" title={errorTip}>{errorTip}</div>
        );
    }

    function renderParamNameInput(rowData: RowData) {
        const { parameter } = rowData;
        const paramName = parameter.name || '';
        const isDuplicate = isParamNameDuplicate(paramName);
        const errorTip = isDuplicate ? `显示名称不可重复` : '';

        return <>
            <f-input-group
                modelValue={paramName}
                enableClear={true}
                placeholder={'请输入显示名称'}
                customClass={errorTip ? 'fvf-error-state' : undefined}
                onUpdate:modelValue={(newName: string) => {
                    parameter.name = newName;
                }}
            />
            {renderErrorTip(errorTip)}
        </>;
    }

    function renderParamDescriptionInput(rowData: RowData) {
        const { parameter, schema } = rowData;
        const description = schema ? schema.description : parameter.description;
        return (
            <f-input-group
                modelValue={description || ''}
                enableClear={true}
                placeholder={'请输入参数描述'}
                onUpdate:modelValue={(newDescription: string) => {
                    if (schema) {
                        schema.description = newDescription;
                    } else {
                        parameter.description = newDescription;
                    }
                }}
            />
        );
    }

    function renderInputHelp(rowData: RowData) {
        const { parameter, schema } = rowData;
        const showInputHelp = !schema && props.canEditInputHelp;
        if (!showInputHelp) {
            return;
        }
        const paramType = parameter.type;
        if (ParameterUtils.isSame(paramType, BasicTypeRefer.StringType)) {
            return (
                <div class={bem('field')}>
                    <div class={bem('field-label')} title="如果选项非空，则在“试运行面板”中通过下拉列表输入本参数">下拉选项</div>
                    <div class={bem('field-content')}>
                        <EnumInputHelpEditor
                            modelValue={parameter.inputHelp as EnumInputHelp}
                            onUpdate:modelValue={(newValue) => {
                                parameter.inputHelp = newValue;
                            }}
                        />
                    </div>
                </div>
            );
        }
    }

    function renderParamDetails(item: TTreeNodeModel) {
        const nodeData = item.data as TreeNodeData;
        const rowData = nodeData.rowData;
        const { schema } = rowData;

        const showNameField = !!props.canEditName && !schema;

        return (
            <div class={bem('param-details')}>
                {showNameField && (
                    <div class={bem('field')}>
                        <div class={bem('field-label')} title="参数的显示名称，用于在“试运行面板”中显示">显示名称</div>
                        <div class={bem('field-content')}>{renderParamNameInput(rowData)}</div>
                    </div>
                )}
                <div class={bem('field')}>
                    <div class={bem('field-label')} title="参数的描述，用于在“试运行面板”中显示">描述</div>
                    <div class={bem('field-content')}>{renderParamDescriptionInput(rowData)}</div>
                </div>
                {renderInputHelp(rowData)}
            </div>
        );
    }

    return {
        renderParamDetails,
        renderErrorTip,
    };
}

import { DataColumn, EditorConfig, FNotifyService } from "@farris/ui-vue";
import { FormVariable, FormVariableCategory, UseFormSchema } from "../../../../../components/types";
import { inject } from "vue";
import { useVariableDefaultValue } from "./use-variable-default-value";
import codeAndNameColumnFormatter from "../formatters/code-and-name-column-formatter";
import defaultValueColumnFormatter from "../formatters/default-value-column-formatter";
import typeColumnFormatter from "../formatters/type-column-formatter";
import codeAndNameHeaderFormatter from "../formatters/code-and-name-header-formatter";

/**
 * 获取表格配置
 */
export function useVariableDataGridOptions() {
    const useFormSchema = inject('useFormSchema') as UseFormSchema;
    const { showDefaultValueEditor } = useVariableDefaultValue();
    const notifyService: FNotifyService = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };

    /**
     * 表格列配置
     */
    const columns: DataColumn[] = [
        {
            field: 'code',
            title: "变量编号",
            dataType: 'string',
            width: 120,
            resizable: true,
            formatter: codeAndNameColumnFormatter,
            headerFormatter:codeAndNameHeaderFormatter
        },
        {
            field: 'name',
            title: "变量名称",
            dataType: 'string',
            width: 120,
            resizable: true,
            formatter: codeAndNameColumnFormatter,
            headerFormatter:codeAndNameHeaderFormatter
        },
        {
            field: 'type',
            title: '变量类型',
            dataType: 'enum',
            width: 120,
            resizable: true,
            formatter: typeColumnFormatter,
            editor: {
                type: 'combo-list',
                data: [
                    { id: 'String', name: '字符串' },
                    { id: 'Number', name: '数字' },
                    { id: 'Boolean', name: '布尔' },
                    { id: 'Date', name: '日期' },
                    { id: 'DateTime', name: '日期时间' },
                    { id: 'Text', name: '文本' },
                    { id: 'Object', name: '对象' },
                    { id: 'Array', name: '数组' }
                ],
            }
        },
        {
            field: 'value',
            title: "默认值",
            dataType: 'string',
            width: 120,
            resizable: true,
            formatter: defaultValueColumnFormatter,
        },
        {
            field: 'category',
            title: "变量分类",
            dataType: 'string',
            width: 120,
            resizable: true,
            formatter: {
                type: 'enum',
                data: [
                    { value: 'locale', name: '组件变量' },
                    { value: 'remote', name: '表单变量' },
                ],
            },
            editor: {
                type: "combo-list",
                valueField: 'id',
                textField: 'name',
                data: [
                    { id: 'locale', name: '组件变量' },
                    { id: 'remote', name: '表单变量' },
                ]
            }
        },
        {
            field: 'sourceName',
            title: '来源',
            dataType: 'string',
            width: 120,
            resizable: true,
            editor: {
                type: "input-group",
            }
        }
    ];

    function getColumns() {
        return columns;
    }

    /**
     * 获取数字类变量的编辑器配置
     * @param variable 
     * @returns 
     */
    function getNumberVariableEditor(variable: FormVariable): EditorConfig {
        const editorConfig: EditorConfig = {
            type: 'number-spinner',
            precision: 2,
            max: 100000000,
            nullable: true
        };

        const schemas = useFormSchema.getSchemas();
        // 1、组件变量需要设置精度
        const needSetPrecision = schemas && variable.category === FormVariableCategory.remote;
        if (!needSetPrecision) {
            return editorConfig;
        }

        // 2、从表单Schema中查找变量      
        const variablesInSchemas = schemas.variables || [];
        const variablesInSchema = variablesInSchemas.find(variablesInSchema => variablesInSchema.id === variable.id);

        // 3、设置编辑器的精度
        if (variablesInSchema && variablesInSchema.type) {
            editorConfig.precision = variablesInSchema.type.precision;
        }

        return editorConfig;
    }

    function checkBeforeUpdateColumnEditor(cell: any): boolean {
        // 修改默认值列前，需要更新编辑器
        const { field } = cell.column;
        const needUpdateEditor = field === 'value';
        return needUpdateEditor;
    }

    /**
     * 更新默认值列的编辑器
     * @param cell 
     * @returns 
     */
    function updateDefaultValueColumnEditor(cell: any) {
        // 1、检查是否需要更新编辑器
        const checkPassed = checkBeforeUpdateColumnEditor(cell);
        if (!checkPassed) {
            return;
        }
        
        // 2、更新编辑器
        const variable: FormVariable = cell.row.raw;
        const defaultValueColumn = columns.find(column => column.field === 'value') as DataColumn;
        const variableType = variable.type;
        switch (variableType) {
            case 'Number': {
                defaultValueColumn.editor = getNumberVariableEditor(variable);
                break;
            }
            case 'Date': {
                defaultValueColumn.editor = {
                    type: 'date-picker'
                };
                break;
            }
            case 'DateTime': {
                defaultValueColumn.editor = {
                    type: 'date-picker',
                    showTime: true,
                    displayFormat: 'yyyy-MM-dd HH:mm:ss',
                    valueFormat: 'yyyy-MM-dd HH:mm:ss'
                };
                break;
            }
            case 'Boolean': {
                defaultValueColumn.editor = {
                    type: "combo-list",
                    enableClear: true,
                    valueField: 'id',
                    textField: 'name',
                    data: [
                        { id: true, name: '是' },
                        { id: false, name: '否' },
                    ]
                };
                break;
            }
            case 'Object': {
                defaultValueColumn.editor = {
                    type: 'input-group',
                    groupText: '<i class="f-icon f-icon-lookup"></i>',
                    editable: false,
                    showClear: true,
                    showButtonWhenDisabled: true,
                    onClickHandle: (e) => {
                        showDefaultValueEditor(variable, cell);
                    }
                };
                break;
            }
            case 'Array': {
                defaultValueColumn.editor = {
                    type: 'input-group',
                    groupText: '<i class="f-icon f-icon-lookup"></i>',
                    editable: false,
                    showClear: true,
                    showButtonWhenDisabled: true,
                    onClickHandle: (e) => {
                        showDefaultValueEditor(variable, cell);
                    }
                };
                break;
            }
            default: {
                defaultValueColumn.editor = {
                    type: 'input-group'
                };
            }
        }
    }

    /**
     * 获取单元格状态，是否可以修改
     * @param cell 
     * @returns 
     */
    function getCellState(cell: any) {
        const variable: FormVariable = cell.row.raw;
        const { field } = cell.column;

        switch (field) {
            case 'code':
            case 'name':
            case 'type': {
                // 组件变量的编号、名称、类型可以修改
                const canEditCell = variable.category === FormVariableCategory.locale;
                return canEditCell;
            }
            case 'category':
            case 'sourceName':{
                // 变量的来源、分类不可以修改
                return false;
            }
            default: {
                return true;
            }
        }
    }

    return {
        getColumns,
        updateDefaultValueColumnEditor,
        getCellState
    };
}

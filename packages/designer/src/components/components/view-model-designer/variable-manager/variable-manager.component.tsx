import { SetupContext, defineComponent, ref, inject } from "vue";
import { FDataGrid, FLoadingService } from "@farris/ui-vue";
import { variableManagerProps, VariableManagerProps } from "./variable-manager.props";
import './variable-manager.scss';
import { useVariableData } from "./composition/use-variable-data";
import { FormVariable, UseFormSchema } from "../../../../components/types";
import { useVariableDataGridOptions } from "./composition/use-variable-datagrid-options";
import { useVariableDefaultValue } from "./composition/use-variable-default-value";
import { DesignerMode } from "../../../../components/types/designer-context";

export default defineComponent({
    name: 'FVariableManager',
    props: variableManagerProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: VariableManagerProps, context: SetupContext) {
        const loadingService: FLoadingService | any = inject<FLoadingService>('FLoadingService');
        const useFormSchemaComposition: any = inject('useFormSchema') as UseFormSchema;
        /** 表格实例 */
        const gridComponentInstance = ref<any>();
        /** 列配置 */
        const columnOption = {
            fitColumns: true,
            fitMode: 'percentage'
        };
        /** 选择行配置 */
        const selectionOption = {
            enableSelectRow: true,
            multiSelect: true,
            showCheckbox: true,
            showSelectAll: true
        };
        /** 表格配置相关方法 */
        const { getColumns, updateDefaultValueColumnEditor, getCellState } = useVariableDataGridOptions();
        /** 变量默认值相关方法 */
        const { clearDefaultValueWhenModifyType } = useVariableDefaultValue();
        /** 变量数据相关方法 */
        const { variableList, loadVariables, deleteVariables, addVariableToDataGrid, updateVariableToViewModel, refreshRemoteVariables, checkBeforeEndEditCell } = useVariableData(gridComponentInstance, loadingService);
        loadVariables();

        /**
         * 刷新变量列表
         */
        function refreshVariableManager() {
            loadVariables();
            gridComponentInstance.value.updateDataSource(variableList.value);
        }

        /**
         * 添加变量
         */
        function onAddVariable() {
            addVariableToDataGrid();
        }

        /**
         * 批量删除变量
         */
        function onDeleteVariables() {
            deleteVariables();
        }

        /**
         * 刷新表单变量
         */
        function onRefreshVariables() {
            refreshRemoteVariables();
        }

        /**
         * 单元格编辑前事件
         * @param cell 
         */
        function onBeforeEditCell(cell: any) {
            // 1、更新默认值单元格的编辑器
            updateDefaultValueColumnEditor(cell);

            // 2、判断当前单元格是否可编辑
            const canEditCell = getCellState(cell);
            return canEditCell;
        };

        /**
         * 单元格结束编辑前事件, 用于检查输入内容是否合法
         * @param data 
         * @returns 
         */
        function onBeforeEndEditCell(data: any): boolean {
            return checkBeforeEndEditCell(data);
        }

        /**
         * 单元格结束编辑事件
         * @param cell 
         */
        function onEndEditCell(cell: any) {
            const variable: FormVariable = cell.row.raw;
            // 1、修改类型列后，清空默认值
            clearDefaultValueWhenModifyType(cell);

            // 2、修改变量后，更新变量到视图模型
            const changedOject = {
                field: cell.column.field,
                value: cell.newValue,
            };
            updateVariableToViewModel(variable, changedOject);
        };

        context.expose({ refreshVariableManager });

        return () => {
            return (
                <div class="f-variable-designer">
                    <div class="f-utils-fill-flex-column view-model-variable-list" >
                        <div class="view-model-toolbar">
                            <div class="toolbar-item" onClick={onAddVariable}>
                                <div class="toolbar-item-icon toolbar-item-icon-add"></div>
                                <span class="toolbar-item-text"> 添加变量 </span>
                            </div>
                            <div class="toolbar-item-spilter"></div>
                            <div class="toolbar-item" onClick={onDeleteVariables}>
                                <div class="toolbar-item-icon toolbar-item-icon-delete"></div>
                                <span class="toolbar-item-text"> 移除变量 </span>
                            </div>
                            <div class="toolbar-item-spilter"></div>

                            {DesignerMode.PC_RTC !== useFormSchemaComposition.designerMode &&
                                <div class="toolbar-item" onClick={onRefreshVariables}>
                                    <div class="toolbar-item-icon toolbar-item-icon-refresh"></div>
                                    <span class="toolbar-item-text"> 刷新 </span>
                                </div>}
                        </div>
                        <div class="f-utils-fill border" style="border-radius: 8px;">
                            <FDataGrid
                                ref={gridComponentInstance}
                                columns={getColumns()}
                                data={variableList.value}
                                fit="true"
                                editable="true"
                                column-option={columnOption}
                                selection={selectionOption}
                                beforeEditCell={onBeforeEditCell}
                                beforeEndEditCell={onBeforeEndEditCell}
                                onEndEditCell={onEndEditCell}
                            >
                            </FDataGrid>
                        </div>
                    </div>
                </div >
            );
        };
    }
});

import { VisualData, VisualDataCell } from "@farris/ui-vue";
import { FormVariableTypes, FormVariableCategory } from "../../../../types";
import { JSX } from "vue/jsx-runtime";

/**
 * 变量类型列格式化器
 * 1、显示变量类型名称
 * 2、显示下拉图标
 */
export default function typeColumnFormatter(visualDataCell: VisualDataCell, visualDataRow: VisualData): () => JSX.Element {
    const { data: cellValue } = visualDataCell;
    const { category: variableCategory } = visualDataRow.raw;
    // 组件变量的单元格显示下拉图标
    const showDropDownIcon = variableCategory === FormVariableCategory.locale;

    /**
     * 格式化单元格数据
     * @returns 
     */
    function formatCellData(): string {
        let displayText = cellValue;

        // 1、获取变量类型信息
        const formVariableType = FormVariableTypes.find(vriableType => vriableType.value === cellValue);

        // 2、展示变量类型的名称
        if (formVariableType) {
            displayText = formVariableType.text;
        }

        return displayText;
    }

    return (
        <div className="cell-wrapper">
            <span className="shown-value" title={formatCellData()}>{formatCellData()}</span>
            {showDropDownIcon && <span className="f-icon f-icon-drop-down_line" />}
        </div>
    );

}

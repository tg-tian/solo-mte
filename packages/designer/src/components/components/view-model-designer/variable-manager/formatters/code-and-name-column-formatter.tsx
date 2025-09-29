import { VisualData, VisualDataCell } from "@farris/ui-vue";
import { FormVariableCategory } from "../../../../types";
import { JSX } from "vue/jsx-runtime";

/**
 * 变量编号和名称列格式化器
 * 1、显示编辑图标
 */
export default function codeAndNameColumnFormatter(visualDataCell: VisualDataCell, visualDataRow: VisualData): () => JSX.Element {
    const { data: displayText } = visualDataCell;
    const { category: variableCategory } = visualDataRow.raw;
    // 组件变量的单元格显示编辑图标
    const showEditIcon = variableCategory === FormVariableCategory.locale;

    return (
        <div className="cell-wrapper">
            <span className="shown-value" title={displayText}>{displayText}</span>
            {showEditIcon && <span className="f-icon f-icon-edit-cardview" />}
        </div>
    );

}

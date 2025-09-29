import { VisualData, VisualDataCell } from "@farris/ui-vue";
import { JSX } from "vue/jsx-runtime";

/**
 * 变量默认值列格式化器
 * 1、显示下拉图标
 */
export default function defaultValueColumnFormatter(visualDataCell: VisualDataCell, visualDataRow: VisualData): () => JSX.Element {
    const { data } = visualDataCell;

    /**
     * 格式化单元格数据
     * @returns 
     */
    function formatCellData(data: any): string {
        let displayText = data;
        // 1、如果默认值为布尔值，则转换为字符串
        if (typeof displayText === 'boolean') {
            data === true ? displayText = "是" : displayText = "否";
        }

        return displayText;
    }

    return (
        <div className="cell-wrapper">
            <span className="shown-value" title={formatCellData(data)}>{formatCellData(data)}</span>
            <span className="f-icon f-icon f-icon-edit-cardview" />
        </div>
    );

}

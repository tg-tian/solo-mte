import { HeaderCell } from "@farris/ui-vue";
import { VNode } from "vue";

/**
 * 变量编号和名称头部标题格式化器
 */
export default function codeAndNameHeaderFormatter(context: { headerCell: HeaderCell, headerCells: HeaderCell[], columnIndex: number }): VNode {
    const { title } = context.headerCell;

    return (
        <>
            <span class="text-danger">*</span>
            {title}
        </>
    );

}

import type { JSX } from "vue/jsx-runtime";

export interface UseNodePropertyPanel {

    /**
     * 打开属性面板
     * @description 选中节点并显示属性面板
     * @param nodeId 节点ID
     */
    open: (nodeId: string) => void;

    /** 关闭属性面板 */
    close: () => void;

    /** 渲染属性面板 */
    renderNodePropertyPanel: () => JSX.Element;
}

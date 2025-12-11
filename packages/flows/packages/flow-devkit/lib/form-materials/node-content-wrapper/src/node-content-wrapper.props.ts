import type { ExtractPropTypes } from 'vue';

export const nodeContentWrapperProps = {
    /**
     * 是否两栏布局
     * @description 默认启用，`字段名称列`和`字段内容列`
     */
    isTwoColumn: { type: Boolean, default: true },
};

export type NodeContentWrapperProps = ExtractPropTypes<typeof nodeContentWrapperProps>;

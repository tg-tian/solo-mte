import type { ExtractPropTypes, PropType } from 'vue';
import type { FlowRegistry, FlowMetadata } from '@farris/flow-devkit';

export type DesignerMode = 'full' | 'canvas';
export type BackgroundVariant = 'dots' | 'lines';

export const flowDesignerProps = {

    /** 设计器模式 */
    mode: { type: String as PropType<DesignerMode>, default: 'full' },

    /** 流程自定义内容 */
    flowRegistry: { type: Object as PropType<FlowRegistry> },

    /** 流程元数据 */
    flowMetadata: { type: Object as PropType<FlowMetadata> },

    /** 画布背景 */
    backgroundVariant: { type: String as PropType<BackgroundVariant>, default: 'dots' },

    /** 是否显示工具栏，`canvas`模式下默认隐藏 */
    showToolbar: { type: Boolean, default: undefined },

    /** 是否显示流程的属性面板，`canvas`模式下默认隐藏 */
    showFlowPropertyPanel: { type: Boolean, default: undefined },
};

export type FlowDesignerProps = ExtractPropTypes<typeof flowDesignerProps>;

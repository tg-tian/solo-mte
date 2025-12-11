import type { ExtractPropTypes, PropType } from 'vue';

export type PanelShowMode = 'panel' | 'sidebar';
export type PanelPosition = 'left' | 'right';

export const propertyPanelProps = {

    /** 面板宽度 */
    panelWidth: { type: String, default: '300px' },

    /** 是否隐藏头部区域 */
    hideHeader: { type: Boolean, default: false },

    /** 默认Tab的显示名称 */
    defaultTabName: { type: String },

    /** 面板显示的位置，默认在右侧 */
    position: { type: String as PropType<PanelPosition>, default: 'right' },

    /** 使用模式，支持`v-model:mode`语法糖 */
    mode: { type: String as PropType<PanelShowMode>, default: 'panel' },
};

export type PropertyPanelProps = ExtractPropTypes<typeof propertyPanelProps>;

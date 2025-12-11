import type { ExtractPropTypes, PropType } from 'vue';
import type { ElementPropertyConfig } from '../composition/types';

export const propertyPanelCategoryProps = {

    /** 某一分类下的属性配置 */
    category: { type: Object as PropType<ElementPropertyConfig>, default: {} },

    categoryKey: { type: String },

    propertyData: { type: Object, default: {} },

    valueChanged: { type: Function },

    triggerRefreshPanel: { type: Function },
};

export type PropertyPanelCategoryProps = ExtractPropTypes<typeof propertyPanelCategoryProps>;

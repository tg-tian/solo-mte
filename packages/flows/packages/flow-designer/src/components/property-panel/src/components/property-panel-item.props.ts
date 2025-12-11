import type { ExtractPropTypes, PropType } from 'vue';
import type { PropertyEntity, ElementPropertyConfig } from '../composition/types';

export const propertyPanelItemProps = {

    elementConfig: { type: Object as PropType<PropertyEntity>, default: {} },

    category: { type: Object as PropType<ElementPropertyConfig>, default: {} },
};

export type PropertyPanelItemProps = ExtractPropTypes<typeof propertyPanelItemProps>;

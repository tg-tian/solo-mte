import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import intentClassifierSchema from './schema/intent-classifier-editor.schema.json';

export interface IntentClass {
    categoryId: string;
    categoryName: string;
}

export const intentClassifierProps = {
    modelValue: {
        type: Array as PropType<IntentClass[]>,
        default: () => []
    },
};

export type IntentClassifierProps = ExtractPropTypes<typeof intentClassifierProps>;

export const propsResolver = createPropsResolver(intentClassifierProps, intentClassifierSchema);

import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import jsonSchemaEditorSchema from './schema/json-schema-editor.schema.json';
import type { Parameter, ParamValidateOptions } from '@farris/flow-devkit/types';

export const jsonSchemaEditorProps = {

    /** 绑定值，参数列表 */
    modelValue: { type: Array as PropType<Parameter[]> },

    /** 是否只读 */
    readonly: { type: Boolean, default: false },

    /** 校验选项 */
    validateOptions: { type: Object as PropType<ParamValidateOptions> },
};

export type JsonSchemaEditorProps = ExtractPropTypes<typeof jsonSchemaEditorProps>;

export const propsResolver = createPropsResolver(jsonSchemaEditorProps, jsonSchemaEditorSchema);

import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import jsonSchemaEditorSchema from './schema/json-schema-editor.schema.json';
import type { Parameter, ParamValidateOptions, ParamOperationOptions } from '@farris/flow-devkit/types';

export const COMPONENT_NAME = 'FvfJsonSchemaEditor';

export const jsonSchemaEditorProps = {

    /** 绑定值，参数列表 */
    modelValue: { type: Array as PropType<Parameter[]> },

    /** 是否只读 */
    readonly: { type: Boolean, default: false },

    /** 校验选项 */
    validateOptions: { type: Object as PropType<ParamValidateOptions> },

    /** 不显示`新增子项`按钮 */
    hideAddSubLevelButton: { type: Boolean, default: false },

    /** 不显示`展开详情`按钮 */
    hideDetailExpandButton: { type: Boolean, default: false },

    /** 是否编辑`显示名称`字段 */
    canEditName: { type: Boolean, default: false },

    /** 是否编辑`输入帮助设置`相关的字段 */
    canEditInputHelp: { type: Boolean, default: false },

    /** 操作控制选项 */
    operationOptions: { type: Object as PropType<ParamOperationOptions> },
};

export type JsonSchemaEditorProps = ExtractPropTypes<typeof jsonSchemaEditorProps>;

export const propsResolver = createPropsResolver(jsonSchemaEditorProps, jsonSchemaEditorSchema);

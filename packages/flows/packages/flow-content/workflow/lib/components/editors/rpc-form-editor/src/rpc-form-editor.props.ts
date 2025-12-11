import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import rpcFormEditorSchema from './schema/rpc-form-editor.schema.json';
import type { RpcFormParam } from './types';

export const rpcFormEditorProps = {
    /** 绑定值，表单参数列表 */
    modelValue: { type: Array as PropType<RpcFormParam[]> },

    /** 是否只读 */
    readonly: { type: Boolean, default: false },
};

export type RpcFormEditorProps = ExtractPropTypes<typeof rpcFormEditorProps>;

export const propsResolver = createPropsResolver(rpcFormEditorProps, rpcFormEditorSchema);
import { type ExtractPropTypes, type PropType } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import rpcSelectorSchema from './schema/rpc-selector.schema.json';

export interface RpcParam {
  su: string;
  serviceId: string;
  serviceName?: string;
  inputParams?: Array<{ name: string; type: string }>;
}

/**
 * RPC服务选择器的属性定义
 */
export const rpcSelectorProps = {
  modelValue: {
    type: Object as PropType<RpcParam | null>,
    default: null
  },
  nodeData: {
    type: [Object, Array, Function],
    required: true
  },
};

export type RpcSelectorProps = ExtractPropTypes<typeof rpcSelectorProps>;
export const propsResolver = createPropsResolver(rpcSelectorProps, rpcSelectorSchema);

import { defineComponent, computed, inject } from 'vue';
import { rpcFormEditorProps } from './rpc-form-editor.props';
import { useBem } from '@farris/flow-devkit';
import type { RpcFormParam } from './types';
import type { NodeData } from '@farris/flow-devkit';

import './rpc-form-editor.scss';

const name = 'FvfRpcFormEditor';

export default defineComponent({
  name,
  props: rpcFormEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const formParams = computed(() => {
      return props.modelValue || [];
    });

    // 尝试注入nodeData，如果失败则使用空对象
    const nodeData = inject<NodeData>('nodeData', {} as NodeData);

    function emitChange(newParams: RpcFormParam[]): void {
      context.emit('update:modelValue', newParams);
    }

    function onUpdateParamValue(paramIndex: number, newValue: string): void {
      const newParams = [...formParams.value];
      newParams[paramIndex] = { ...newParams[paramIndex], value: newValue };

      // 同时更新nodeData中的对应字段
      const param = newParams[paramIndex];
      if (param.label === 'serviceUnit' && nodeData) {
        nodeData.serviceUnit = newValue;
      } else if (param.label === 'serviceId' && nodeData) {
        nodeData.serviceId = newValue;
      }

      emitChange(newParams);
    }


    function renderParamItem(param: RpcFormParam, index: number) {
      return (
        <div class={bem('param')} key={index}>
          <div class={bem('label-item')} style="flex: 1">
            {param.label}
          </div>
          <div class={bem('input-item')} style="flex: 4">
            <f-input-group
              modelValue={param.value}
              enableClear={false}
              placeholder={`输入${param.label}`}
              readonly={props.readonly}
              onUpdate:modelValue={(newValue: string) => onUpdateParamValue(index, newValue)}
            ></f-input-group>
          </div>
        </div>
      );
    }

    function renderParams() {
      return formParams.value.map((param, index) => renderParamItem(param, index));
    }

    return () => (
      <div class={bem()}>
        {renderParams()}
      </div>
    );
  },
});

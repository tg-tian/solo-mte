import { defineComponent, computed } from 'vue';
import { paramTagListProps } from './param-tag-list.props';
import { useBem } from '@farris/flow-devkit/utils';
import type { Parameter } from '@farris/flow-devkit/types';

import './param-tag-list.scss';

const name = 'FvfParamTagList';

export default defineComponent({
  name,
  props: paramTagListProps,
  emits: [],
  setup(props) {
    const { bem } = useBem(name);
    const params = computed<Parameter[]>(() => props.params || []);

    function renderParamItem(param: Parameter) {
      const isUndefined = !param.code;
      const paramLabel = param.code || '未定义';
      return (
        <div class={[bem('item'), isUndefined && bem('item', 'undefined')]}>
          <span title={paramLabel}>{paramLabel}</span>
        </div>
      );
    }

    function renderParams() {
      if (params.value.length) {
        return params.value.map(renderParamItem);
      }
      const emptyTip = '未配置' + (props.fieldName || '');
      return (
        <div class={bem('empty')}>
          <span title={emptyTip}>{emptyTip}</span>
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {renderParams()}
      </div>
    );
  },
});

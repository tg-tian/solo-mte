import { defineComponent } from 'vue';
import { singleParamValueTagProps } from './single-param-value-tag.props';
import { useBem } from '@farris/flow-devkit/utils';
import { useValueExpression } from '@farris/flow-devkit/form-materials';

import './single-param-value-tag.scss';

const name = 'FvfSingleParamValueTag';

export default defineComponent({
  name,
  props: singleParamValueTagProps,
  emits: [],
  setup(props) {
    const { bem } = useBem(name);
    const { renderValueExpression } = useValueExpression({ showNodeIcon: false });

    function renderParamValue() {
      if (!props.value) {
        const emptyTip = '未配置' + (props.fieldName || '');
        return (
          <div class={bem('empty')}>
            <span title={emptyTip}>{emptyTip}</span>
          </div>
        );
      }
      return (
        <div class={bem('item')}>
          {renderValueExpression(props.value)}
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {renderParamValue()}
      </div>
    );
  },
});

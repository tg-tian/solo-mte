import { defineComponent, computed } from 'vue';
import { variableAssignListProps } from './variable-assign-list.props';
import { useBem } from '@farris/flow-devkit/utils';
import type { AssignValueExpr } from '@farris/flow-devkit/types';
import { useValueExpression } from '@farris/flow-devkit/form-materials';

import './variable-assign-list.scss';

const name = 'FvfVariableAssignList';

export default defineComponent({
  name,
  props: variableAssignListProps,
  emits: [],
  setup(props) {
    const { bem } = useBem(name);

    const expresses = computed<AssignValueExpr[]>(() => {
      return (props.expresses || []).filter(express => express.leftExpress);
    });
    const isEmpty = computed<boolean>(() => expresses.value.length === 0);

    const { renderValueExpression } = useValueExpression({ showNodeIcon: false });

    function renderPlaceholder() {
      return (
        <div class={bem('placeholder')}>{'未配置变量'}</div>
      );
    }

    function renderExpressItem(item: AssignValueExpr, index: number) {
      return (
        <div class={bem('item')} key={item.id || index}>
          <div class={bem('item-var')}>{renderValueExpression(item.leftExpress)}</div>
          <div class={bem('item-operator')}>{'覆盖'}</div>
        </div>
      );
    }

    function renderExpresses() {
      if (isEmpty.value) {
        return renderPlaceholder();
      }
      return (
        <div class={bem('list')}>
          {expresses.value.map(renderExpressItem)}
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {renderExpresses()}
      </div>
    );
  },
});

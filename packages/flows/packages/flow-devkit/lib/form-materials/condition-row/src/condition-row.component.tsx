import { defineComponent, computed } from 'vue';
import { conditionRowProps } from './condition-row.props';
import { useBem } from '@farris/flow-devkit/utils';
import type { ValueExpress, CompareOperatorType } from '@farris/flow-devkit/types';
import { ValueExpressionInput } from '@farris/flow-devkit/form-materials';
import { CompareOperator, CompareOperatorName } from '@farris/flow-devkit/types';

import './condition-row.scss';

const name = 'FvfConditionRow';

export default defineComponent({
  name,
  props: conditionRowProps,
  emits: ['update:modelValue'],
  setup(props) {
    const { bem } = useBem(name);
    const compareExpr = computed(() => props.modelValue!);

    const operatorData: { id: string, name: string }[] = [];

    function isSingleValueOperator(value?: CompareOperatorType): boolean {
      return value === CompareOperator.isEmpty || value === CompareOperator.notEmpty;
    }

    const hasRightValue = computed<boolean>(() => {
      return !isSingleValueOperator(compareExpr.value.operator);
    });

    function updateOperatorData(): void {
      operatorData.splice(0, operatorData.length);
      Object.keys(CompareOperator).forEach((key) => {
        const operator = CompareOperator[key as (keyof typeof CompareOperator)];
        const operatorName = CompareOperatorName[operator];
        operatorData.push({ id: operator, name: operatorName });
      });
    }
    updateOperatorData();

    function updateLeftValue(value: ValueExpress): void {
      compareExpr.value.leftExpress = value;
    }

    function updateRightValue(value: ValueExpress): void {
      compareExpr.value.rightExpress = value;
    }

    function updateOperator(value: CompareOperatorType): void {
      compareExpr.value.operator = value;
      if (isSingleValueOperator(value)) {
        compareExpr.value.rightExpress = undefined;
      }
    }

    return () => (
      <div class={bem()}>
        <div class={[bem('value-row'), bem('value-row', 'left')]}>
          <div class={bem('left-value')}>
            <ValueExpressionInput
              modelValue={compareExpr.value.leftExpress}
              placeholder={'请选择左值'}
              onUpdate:modelValue={updateLeftValue}
            ></ValueExpressionInput>
          </div>
        </div>
        <div class={[bem('value-row'), bem('value-row', 'right')]}>
          <div class={bem('operator')}>
            <f-combo-list
              data={operatorData}
              enableClear={false}
              placeholder={'比较符'}
              modelValue={compareExpr.value.operator}
              onUpdate:modelValue={updateOperator}
            />
          </div>
          <div class={bem('divider')}></div>
          <div class={bem('right-value')}>
            {hasRightValue.value ? (
              <ValueExpressionInput
                modelValue={compareExpr.value.rightExpress}
                placeholder={'请输入右值'}
                onUpdate:modelValue={updateRightValue}
              ></ValueExpressionInput>
            ) : (
              <div class={bem('empty-input')}>{'N/A'}</div>
            )}
          </div>
        </div>
      </div>
    );
  },
});

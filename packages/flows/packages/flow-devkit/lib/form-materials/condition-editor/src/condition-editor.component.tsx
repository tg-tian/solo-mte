import { defineComponent, computed, watch } from 'vue';
import { conditionEditorProps } from './condition-editor.props';
import { useBem, uuid, ValueExpressUtils } from '@farris/flow-devkit/utils';
import { LogicOperator, LogicOperatorName, type LogicOperatorType, type CompareExpr, CompareOperator } from '@farris/flow-devkit/types';
import { ConditionRow } from '@farris/flow-devkit/form-materials/condition-row';

import './condition-editor.scss';

const name = 'FvfConditionEditor';

export default defineComponent({
  name,
  props: conditionEditorProps,
  emits: ['update:modelValue', 'delete'],
  setup(props, context) {
    const { bem } = useBem(name);

    if (!props.modelValue) {
      return;
    }

    watch(
      () => props.modelValue?.expresses,
      () => {
        (props.modelValue?.expresses || []).forEach((express) => {
          if (!express.id) {
            express.id = uuid();
          }
        });
      },
      { immediate: true },
    );

    const operator = computed<LogicOperatorType>({
      get() {
        return props.modelValue?.operator || LogicOperator.and;
      },
      set(value: LogicOperatorType) {
        props.modelValue!.operator = value;
      }
    });

    const operatorName = computed<string>(() => {
      const opt = operator.value === LogicOperator.or ? LogicOperator.or : LogicOperator.and;
      return LogicOperatorName[opt];
    });

    const expresses = computed<CompareExpr[]>(() => {
      return (props.modelValue?.expresses || []) as CompareExpr[];
    });

    const isEmpty = computed<boolean>(() => expresses.value.length === 0);
    const isSingle = computed<boolean>(() => expresses.value.length === 1);

    function deleteConditionGroup(): void {
      context.emit('delete', props.modelValue);
    }

    function addCondition(): void {
      const newCondition = ValueExpressUtils.createCompareExpr();
      newCondition.id = uuid();
      const allConditions = [...expresses.value, newCondition];
      props.modelValue!.expresses = allConditions;
    }

    function deleteCondition(express: CompareExpr): void {
      const id = express.id;
      const allConditions = expresses.value.filter((item) => {
        return item && item.id && item.id !== id;
      });
      props.modelValue!.expresses = allConditions;
    }

    function switchOperator(): void {
      const newOperator = operator.value === LogicOperator.and ? LogicOperator.or : LogicOperator.and;
      operator.value = newOperator;
    }

    function renderToolbar() {
      return (
        <div class={[bem('toolbar'), (isSingle.value || isEmpty.value) && bem('toolbar', 'single')]}>
          <button class={['btn', 'btn-md', 'btn-icontext', 'btn-secondary', bem('add-condition')]} onClick={addCondition}>
            <i class="f-icon f-icon-add"></i>
            <span>{'添加条件'}</span>
          </button>
          {props.canDelete && (
            <div class={bem('delete-group')} onClick={deleteConditionGroup}>
              <i class="f-icon f-icon-enclosure_delete"></i>
              <span>{'移除'}</span>
            </div>
          )}
        </div>
      );
    }

    function renderLogicOperator() {
      return (
        <div class={bem('logic')}>
          <div class={bem('logic-border')}></div>
          <div class={bem('logic-switch')} onClick={switchOperator}>
            <span>{operatorName.value}</span>
            <i class={bem('logic-switch-icon')}></i>
          </div>
        </div>
      );
    }

    function validateCompareExpr(express: CompareExpr): string | undefined {
      if (!express.leftExpress) {
        return '左值不能为空';
      }
      if (!express.operator) {
        return '比较符不能为空';
      }
      if (express.operator !== CompareOperator.isEmpty && express.operator !== CompareOperator.notEmpty) {
        if (!express.rightExpress) {
          return '右值不能为空';
        }
      }
      return undefined;
    }

    function renderErrorTip(express: CompareExpr) {
      const errorTip = validateCompareExpr(express);
      if (!errorTip) {
        return;
      }
      return (
        <div class="fvf-form-item-error" title={errorTip}>{errorTip}</div>
      );
    }

    function renderConditionRow(express: CompareExpr) {
      return (
        <div class={bem('condition-item')}>
          <div class={bem('condition')}>
            <ConditionRow modelValue={express} />
            {renderErrorTip(express)}
          </div>
          <div class={bem('delete-condition')} onClick={() => deleteCondition(express)}>
            <i class="f-icon f-icon-enclosure_delete"></i>
          </div>
        </div>
      );
    }

    function renderConditionGroup() {
      return (
        <div class={[bem('condition-group'), isSingle.value && bem('condition-group', 'single')]}>
          {!isSingle.value && renderLogicOperator()}
          {expresses.value.map((express) => renderConditionRow(express))}
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {!isEmpty.value && renderConditionGroup()}
        {renderToolbar()}
      </div>
    );
  },
});

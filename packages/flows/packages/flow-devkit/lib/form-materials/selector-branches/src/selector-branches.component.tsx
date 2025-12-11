import { computed, defineComponent } from 'vue';
import { selectorBranchesProps } from './selector-branches.props';
import { useBem } from '@farris/flow-devkit/utils';
import type { SelectorBranch, LogicOperatorType, LogicExpr, CompareExpr, ValueExpress } from '@farris/flow-devkit/types';
import { CompareOperator, LogicOperator, LogicOperatorName } from '@farris/flow-devkit/types';
import { Port } from '@farris/flow-devkit/components';
import { useValueExpression, useCompareOperator } from '@farris/flow-devkit/form-materials';

import './selector-branches.scss';

const name = 'FvfSelectorBranches';

export default defineComponent({
  name,
  props: selectorBranchesProps,
  emits: [],
  setup(props) {
    const { bem } = useBem(name);
    const { renderValueExpression } = useValueExpression({ showNodeIcon: false });
    const { renderCompareOperator } = useCompareOperator();

    const branches = computed<SelectorBranch[]>(() => {
      return props.branches || [];
    });

    const hasMultipleBranches = computed<boolean>(() => branches.value.length > 2);

    const portStyle: Partial<CSSStyleDeclaration> = {
      right: `-14px`,
    };

    function getOperatorName(operator: LogicOperatorType): string {
      const opt = operator === LogicOperator.or ? LogicOperator.or : LogicOperator.and;
      return LogicOperatorName[opt];
    }

    function renderValueExpress(value?: ValueExpress) {
      return (
        <div class={bem('condition-value')}>
          {renderValueExpression(value)}
        </div>
      );
    }

    function renderOperator(express: CompareExpr) {
      return (
        <div class={bem('condition-operator')}>
          {express.leftExpress && renderCompareOperator(express.operator)}
        </div>
      );
    }

    function renderRightExpress(express: CompareExpr) {
      const operator = express.operator;
      if (operator === CompareOperator.isEmpty || operator === CompareOperator.notEmpty) {
        if (!express.leftExpress) {
          return;
        }
        return (
          <div class={[bem('condition-value'), bem('condition-value', 'empty')]}>{'Empty'}</div>
        );
      }
      return renderValueExpress(express.rightExpress);
    }

    function renderConditionItem(express: CompareExpr) {
      return (
        <div class={bem('condition')}>
          {renderValueExpress(express.leftExpress)}
          {renderOperator(express)}
          {renderRightExpress(express)}
        </div>
      );
    }

    function renderLogicOperator(operatorName: string) {
      return (
        <div class={bem('operator')}>
          <div class={bem('operator-line')}></div>
          <div class={bem('operator-text')}>{operatorName}</div>
        </div>
      );
    }

    function renderConditions(conditionExpr?: LogicExpr) {
      if (!conditionExpr || !conditionExpr.expresses || !conditionExpr.expresses.length) {
        return;
      }
      const expresses = conditionExpr.expresses as CompareExpr[];
      const operatorName = getOperatorName(conditionExpr.operator);
      return (
        <div class={bem('condition-group')}>
          {expresses.map((express, index) => (
            <>
              {renderConditionItem(express)}
              {(index < expresses.length - 1) && renderLogicOperator(operatorName)}
            </>
          ))}
        </div>
      );
    }

    function renderBranch(branch: SelectorBranch, index: number) {
      const isIfBranch = index === 0;
      const isElseBranch = !isIfBranch && !branch.conditionExpr;
      const label = isIfBranch ? '如果' : (isElseBranch ? '否则' : '否则如果');
      const shouldShowCase = !isElseBranch && hasMultipleBranches.value;
      const caseNumber = index + 1;
      const caseLabel = shouldShowCase ? `条件${caseNumber}` : '';

      return (
        <div class={bem('item')} key={branch.port}>
          <div class={bem('item-header')}>
            <span class={bem('item-case')}>{caseLabel}</span>
            <span class={bem('item-label')}>{label}</span>
            <Port
              id={branch.port}
              type="source"
              position="right"
              style={portStyle}
              removeAttachedEdgesOnUnmounted={true}
              sortIndex={index}
            />
          </div>
          <div class={bem('item-content')}>
            {renderConditions(branch.conditionExpr)}
          </div>
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {branches.value.map((branch, index) => renderBranch(branch, index))}
      </div>
    );
  },
});

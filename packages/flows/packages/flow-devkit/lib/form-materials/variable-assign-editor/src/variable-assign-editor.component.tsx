import { defineComponent, computed, watch } from 'vue';
import { variableAssignEditorProps } from './variable-assign-editor.props';
import { useBem, uuid, ValueExpressUtils } from '@farris/flow-devkit/utils';
import type { AssignValueExpr, ValueExpress } from '@farris/flow-devkit/types';
import { ValueExpressionInput } from '@farris/flow-devkit/form-materials';

import './variable-assign-editor.scss';

const name = 'FvfVariableAssignEditor';

export default defineComponent({
  name,
  props: variableAssignEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);

    watch(
      () => props.modelValue,
      () => {
        (props.modelValue || []).forEach((express) => {
          if (!express.id) {
            express.id = uuid();
          }
        });
      },
      { immediate: true },
    );

    const expresses = computed<AssignValueExpr[]>(() => {
      return Array.isArray(props.modelValue) ? props.modelValue : [];
    });

    function emitChange(newExpresses: AssignValueExpr[]): void {
      context.emit('update:modelValue', newExpresses);
    }

    function createNewAssignValueExpr(): AssignValueExpr {
      const express = ValueExpressUtils.createAssignValueExpr();
      express.id = uuid();
      return express;
    }

    function handleAdd(): void {
      const newExpress = createNewAssignValueExpr();
      const newExpresses = [...expresses.value, newExpress];
      emitChange(newExpresses);
    }

    function handleDelete(target: AssignValueExpr): void {
      const newExpresses = expresses.value.filter(express => express.id !== target.id);
      emitChange(newExpresses);
    }

    function onUpdateLeftExpress(target: AssignValueExpr, leftExpress: ValueExpress): void {
      target.leftExpress = leftExpress;
    }

    function onUpdateRightExpress(target: AssignValueExpr, rightExpress: ValueExpress): void {
      target.rightExpress = rightExpress;
    }

    function renderTitleRow() {
      return (
        <div class={bem('title-row')}>
          <div class={bem('title-item')} style="flex: 1">{'变量'}</div>
          <div class={[bem('title-item'), bem('operator-col')]}></div>
          <div class={bem('title-item')} style="flex: 1">{'值'}</div>
          <div class={bem('placeholder')}></div>
        </div>
      );
    }

    function renderExpressItem(express: AssignValueExpr) {
      return (
        <div class={bem('express')} key={express.id}>
          <div class={bem('express-item')} style="flex: 1">
            <ValueExpressionInput
              modelValue={express.leftExpress}
              placeholder={'请选择要赋值的变量'}
              onlyAllowWritableVariable={true}
              validateOptions={{ allowValueEmpty: false, fieldName: '变量' }}
              onUpdate:modelValue={(newValue) => onUpdateLeftExpress(express, newValue)}
            ></ValueExpressionInput>
          </div>
          <div class={[bem('express-item'), bem('operator-col')]}>
            <span class={bem('operator')}>{'='}</span>
          </div>
          <div class={bem('express-item')} style="flex: 1">
            <ValueExpressionInput
              modelValue={express.rightExpress}
              placeholder={'输入或引用变量值'}
              onUpdate:modelValue={(newValue) => onUpdateRightExpress(express, newValue)}
            ></ValueExpressionInput>
          </div>
          <div class={bem('delete-btn')} onClick={() => handleDelete(express)}>
            <i class="f-icon f-icon-enclosure_delete"></i>
          </div>
        </div>
      );
    }

    function renderExpresses() {
      return expresses.value.map(express => renderExpressItem(express));
    }

    function renderAddButton() {
      return (
        <div class={bem('btn-row')}>
          <f-button
            class={bem('add')}
            type="secondary"
            icon="f-icon-add"
            onClick={handleAdd}
          >新增</f-button>
          <div class={bem('placeholder')}></div>
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {renderTitleRow()}
        {renderExpresses()}
        {renderAddButton()}
      </div>
    );
  },
});

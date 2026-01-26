import { ref } from 'vue';
import { VALUE_EXPRESSION_INPUT_NAME, type ValueExpressionInputProps } from '../value-expression-input.props';
import type {
  ValueExpress,
  TypeRefer,
  StringConstExpr,
  NumberConstExpr,
  BoolConstExpr,
  StringsConstExpr,
  ValueExpressionResult,
} from '@farris/flow-devkit/types';
import { ValueExpressKind, BasicTypeRefer } from '@farris/flow-devkit/types';
import { ValueExpressUtils, ParameterUtils } from '@farris/flow-devkit/utils';
import { useBem } from '@farris/flow-devkit/utils';
import { JsonEditor } from '../components';

export function useConstTab(props: ValueExpressionInputProps) {
  const onlyAllowArrayType = props.onlyAllowArrayType;
  const { bem } = useBem(VALUE_EXPRESSION_INPUT_NAME);

  const inputType = ref<string>('string');

  const allInputType = {
    stringType: { id: 'string', text: '字符串' },
    numberType: { id: 'number', text: '数值' },
    booleanType: { id: 'boolean', text: '布尔' },
    stringsType: { id: 'strings', text: '字符串集合' },
  };

  const inputTypeOptions = onlyAllowArrayType ? [
    allInputType.stringsType,
  ] : [
    allInputType.stringType,
    allInputType.numberType,
    allInputType.booleanType,
    allInputType.stringsType,
  ];

  const stringValue = ref<string>('');
  const numberValue = ref<number>(0);
  const booleanValue = ref<boolean>();
  const jsonValue = ref<string>('[""]');

  const stringArraySchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "array",
    "items": {
      "type": "string",
    },
  }

  function getConstExpr(): ValueExpressionResult {
    switch (inputType.value) {
      case 'string':
        return {
          express: ValueExpressUtils.createStringConstExpr(stringValue.value),
          type: BasicTypeRefer.StringType,
        };
      case 'number':
        return {
          express: ValueExpressUtils.createNumberConstExpr(numberValue.value),
          type: BasicTypeRefer.NumberType,
        };
      case 'boolean':
        return {
          express: ValueExpressUtils.createBoolConstExpr(!!booleanValue.value),
          type: BasicTypeRefer.BooleanType,
        };
    }
    try {
      const stringList = JSON.parse(jsonValue.value);
      if (!Array.isArray(stringList)) {
        throw new Error();
      }
      stringList.forEach((item) => {
        if (typeof item !== 'string') {
          throw new Error();
        }
      });
      return {
        express: ValueExpressUtils.createStringsConstExpr(stringList),
        type: BasicTypeRefer.StringArrayType,
      };
    } catch {
      return { errorTip: '请输入合法的字符串集合' };
    }
  }

  function updateByParamType(type: TypeRefer): void {
    const typeID = ParameterUtils.getBasicTypeReferID(type);
    switch (typeID) {
      case 'StringType': {
        inputType.value = 'string';
        break;
      }
      case 'BooleanType': {
        inputType.value = 'boolean';
        return;
      }
      case 'IntegerType':
      case 'NumberType': {
        inputType.value = 'number';
        return;
      }
      case 'StringArrayType': {
        inputType.value = 'strings';
        jsonValue.value = '[""]';
        return;
      }
    }
  }

  function updateConstTab(currentValue?: ValueExpress, type?: TypeRefer): void {
    if (type) {
      updateByParamType(type);
    }
    const currentValueKind = currentValue?.kind;
    switch (currentValueKind) {
      case ValueExpressKind.stringConst: {
        inputType.value = 'string';
        stringValue.value = (currentValue as StringConstExpr).value || '';
        break;
      }
      case ValueExpressKind.numberConst: {
        inputType.value = 'number';
        numberValue.value = (currentValue as NumberConstExpr).value || 0;
        break;
      }
      case ValueExpressKind.boolConst: {
        inputType.value = 'boolean';
        booleanValue.value = (currentValue as BoolConstExpr).value;
        break;
      }
      case ValueExpressKind.stringsConst: {
        inputType.value = 'strings';
        const value = (currentValue as StringsConstExpr).value || [""];
        jsonValue.value = JSON.stringify(value);
        break;
      }
    }
    if (onlyAllowArrayType && (inputType.value !== 'strings' || !Array.isArray(jsonValue.value))) {
      inputType.value = 'strings';
      jsonValue.value = '[""]';
    }
  }

  function onUpdateInputType(newValue: string): void {
    inputType.value = newValue;
  }

  function onUpdateStringValue(payload: Event): void {
    stringValue.value = (payload.target as HTMLTextAreaElement).value;
  }

  function onUpdateNumberValue(newValue: number): void {
    numberValue.value = newValue;
  }

  function onUpdateJsonValue(newValue: string): void {
    jsonValue.value = newValue;
  }

  function renderRadioGroup() {
    if (onlyAllowArrayType) {
      return;
    }
    return (
      <f-radio-group
        options={inputTypeOptions}
        textField="text"
        valueField="id"
        modelValue={inputType.value}
        onUpdate:modelValue={onUpdateInputType}
      />
    );
  }

  function renderStringInput() {
    return (
      <textarea
        placeholder="请输入参数值"
        value={stringValue.value}
        onChange={onUpdateStringValue}
      ></textarea>
    );
  }

  function renderNumberInput() {
    return (
      <f-number-spinner
        type="number"
        modelValue={numberValue.value}
        onUpdate:modelValue={onUpdateNumberValue}
        placeholder="请输入数字"
        showButton={true}
        textAlign="left"
        step={1}
        showZero={true}
      />
    );
  }

  function renderBoolOptions(
    value: boolean | undefined,
    onChange: (newValue: boolean) => void,
  ) {
    return (
      <div class={bem('bool-opts')}>
        <div
          class={[bem('bool-opts-item'), value === true && bem('bool-opts-item', 'selected')]}
          onClick={() => onChange(true)}
        >True</div>
        <div
          class={[bem('bool-opts-item'), value === false && bem('bool-opts-item', 'selected')]}
          onClick={() => onChange(false)}
        >False</div>
      </div>
    );
  }

  function renderBooleanInput() {
    return renderBoolOptions(booleanValue.value, (newValue) => {
      booleanValue.value = newValue;
    });
  }

  function renderJsonInput() {
    return (
      <JsonEditor
        value={jsonValue.value}
        schema={stringArraySchema}
        onUpdate:value={onUpdateJsonValue}
      />
    );
  }

  function renderInputControls() {
    return (
      <>
        {inputType.value === 'string' && renderStringInput()}
        {inputType.value === 'number' && renderNumberInput()}
        {inputType.value === 'boolean' && renderBooleanInput()}
        {inputType.value === 'strings' && renderJsonInput()}
      </>
    );
  }

  function renderConstTab() {
    return (
      <div class={bem('const-tab')}>
        <div class={bem('const-tab-header')}>{renderRadioGroup()}</div>
        <div class={bem('const-tab-content')}>{renderInputControls()}</div>
      </div>
    );
  }

  return {
    getConstExpr,
    renderConstTab,
    updateConstTab,
  };
}

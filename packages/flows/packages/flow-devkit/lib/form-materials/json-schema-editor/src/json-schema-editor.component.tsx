import { defineComponent, computed, h, type CSSProperties } from 'vue';
import { jsonSchemaEditorProps, COMPONENT_NAME } from './json-schema-editor.props';
import { useBem, uuid, ParamValidateUtils, JsonSchemaUtils, ParameterUtils, InputHelpUtils } from '@farris/flow-devkit/utils';
import {
  TTree,
  type TTreeNodeModel,
  type TTreeNodeValue,
} from '@farris/flow-devkit/third-party';
import type { Parameter, TypeRefer, ParamValidateOptions, JsonSchema } from '@farris/flow-devkit/types';
import { BasicTypeRefer, JsonSchemaBasicType } from '@farris/flow-devkit/types';
import { TypeSelector, BasicTypeSelector } from '@farris/flow-devkit/form-materials';
import {
  useData,
  useDetails,
  useColumnsStyle,
  TreeCollapseWidth,
  ParamPaddingLeft,
  MAX_LEVEL,
  type RowData,
  type TreeNodeData,
} from './composition';

import './json-schema-editor.scss';

/**
 * @description
 * 常用于可视化配置节点的输出变量。
 * 用于编辑一个`Parameter[]`，主要编辑`参数名`和`参数类型`，不编辑`参数值`。
 */
export default defineComponent({
  name: COMPONENT_NAME,
  props: jsonSchemaEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(COMPONENT_NAME);
    const useDataComposition = useData(props, context as any);
    const {
      renderParamDetails,
      renderErrorTip,
    } = useDetails(props, useDataComposition);
    const {
      params,
      allCodes,
      treeData,
      couldCollapse,
      expandedNodeValues,
      detailExpandedNodeValues,
      onNodeExpand,
      expandNodeByValue,
      toggleNodeDetailPanel,
    } = useDataComposition;

    const hasAddSubLevelButtonColumn = computed<boolean>(() => {
      if (props.readonly || props.hideAddSubLevelButton) {
        return false;
      }
      return params.value.some((param) => JsonSchemaUtils.canEditJsonSchema(param.type) && !param.readOnly);
    });

    const hasDeleteButtonColumn = computed<boolean>(() => !props.readonly);

    const hasDetailExpandButtonColumn = computed<boolean>(() => {
      if (props.readonly || props.hideDetailExpandButton) {
        return false;
      }
      return params.value.some((param) => !param.readOnly);
    });

    function createNewParam(): Parameter {
      return {
        id: uuid(),
        code: '',
        description: '',
        type: BasicTypeRefer.StringType,
        required: false,
      };
    }

    function emitChange(newParams: Parameter[]): void {
      context.emit('update:modelValue', newParams);
    }

    function generateParameterSchemaByTypeRefer(type: TypeRefer, param?: Parameter): JsonSchema | undefined {
      const oldProperties = JsonSchemaUtils.getObjectProperties(param?.schema) || [];
      if (ParameterUtils.isSame(BasicTypeRefer.ObjectType, type)) {
        const schema = JsonSchemaUtils.createJsonSchemaByType(JsonSchemaBasicType.Object);
        schema.properties = oldProperties;
        return schema;
      } else if (ParameterUtils.isSame(BasicTypeRefer.ObjectArrayType, type)) {
        const schema = JsonSchemaUtils.createJsonSchemaByType(JsonSchemaBasicType.Array, JsonSchemaBasicType.Object);
        schema.items!.properties = oldProperties;
        return schema;
      } else {
        return undefined;
      }
    }

    function handleAddParam(): void {
      const newParam = createNewParam();
      const newParams = [...params.value, newParam];
      emitChange(newParams);
    }

    function handleAddSubLevelParam(rowData: RowData): void {
      const { parameter, schema } = rowData;
      if (!schema && !parameter.schema) {
        parameter.schema = generateParameterSchemaByTypeRefer(parameter.type);
      }
      const parentSchema = schema || parameter.schema;
      const properties = JsonSchemaUtils.getObjectProperties(parentSchema);
      if (!properties) {
        return;
      }
      properties.push(
        JsonSchemaUtils.createJsonSchemaByType(JsonSchemaBasicType.String)
      );
      const currentNodeValue = schema?.id || parameter.id;
      expandNodeByValue(currentNodeValue!);
      emitChange([...params.value]);
    }

    function handleDeleteParam(rowData: RowData): void {
      const { parameter, schema } = rowData;
      if (schema) {
        const parentObjectSchema = JsonSchemaUtils.getParentObjectSchema(parameter.schema, schema);
        if (!parentObjectSchema) {
          return;
        }
        parentObjectSchema.properties = parentObjectSchema.properties!.filter((property) => {
          return property.id !== schema.id;
        });
        emitChange([...params.value]);
      } else {
        const newParams = params.value.filter(param => param.id !== parameter.id);
        emitChange(newParams);
      }
    }

    function onUpdateParamCode(rowData: RowData, newCode: string): void {
      const { parameter, schema } = rowData;
      if (schema) {
        schema.code = newCode;
        schema.name = newCode;
      } else {
        parameter.code = newCode;
      }
      emitChange(params.value);
    }

    function onUpdateParamType(param: Parameter, newType: TypeRefer): void {
      param.type = newType;
      param.schema = generateParameterSchemaByTypeRefer(newType, param);
      param.inputHelp = InputHelpUtils.getInputHelp(newType);
      emitChange([...params.value]);
    }

    function onUpdateSchemaType(schema: JsonSchema, newType: string): void {
      JsonSchemaUtils.updateSchemaTypeBySelectorValue(schema, newType);
      emitChange([...params.value]);
    }

    function handleNodeExpand(_value: TTreeNodeValue[], context: { node: TTreeNodeModel }): void {
      const { node } = context;
      onNodeExpand(node);
    }

    function renderBtnPlaceholder() {
      return (
        <div class={bem('btn-placeholder')}></div>
      );
    }

    function renderTitleRow() {
      const columnsStyle = useColumnsStyle();
      const marginLeftValue = couldCollapse.value ? TreeCollapseWidth + ParamPaddingLeft : ParamPaddingLeft;
      const titleRowStyle: CSSProperties = {
        marginLeft: `${marginLeftValue}px`,
      };

      return (
        <div class={bem('title-row')} style={titleRowStyle}>
          <div class={bem('title-item')} style={columnsStyle.name}>参数名</div>
          <div class={bem('title-item')} style={columnsStyle.type}>类型</div>
          {hasDetailExpandButtonColumn.value && renderBtnPlaceholder()}
          {hasAddSubLevelButtonColumn.value && renderBtnPlaceholder()}
          {hasDeleteButtonColumn.value && renderBtnPlaceholder()}
        </div>
      );
    }

    function renderParamCodeInput(rowData: RowData, readonly: boolean) {
      const { parameter, schema } = rowData;
      const paramCode = schema ? schema.code : parameter.code;
      const parentObjectSchema = JsonSchemaUtils.getParentObjectSchema(parameter.schema, schema);
      const validateOptions: ParamValidateOptions = {
        ...props.validateOptions,
        getAllCodes: () => {
          if (!schema) {
            return allCodes.value;
          }
          return parentObjectSchema?.properties?.map(item => item.code) || [];
        },
      };
      const codeError = ParamValidateUtils.validateCode(paramCode, validateOptions);

      return <>
        <f-input-group
          modelValue={paramCode}
          enableClear={false}
          placeholder={'输入参数名'}
          readonly={readonly}
          customClass={codeError ? 'fvf-error-state' : undefined}
          onUpdate:modelValue={(newCode: string) => onUpdateParamCode(rowData, newCode)}
        />
        {renderErrorTip(codeError)}
      </>;
    }

    function renderParamTypeSelector(rowData: RowData, readonly: boolean) {
      const { parameter, schema, level } = rowData;
      if (!schema) {
        return (
          <TypeSelector
            modelValue={parameter.type}
            readonly={readonly}
            onUpdate:modelValue={(newType) => onUpdateParamType(parameter, newType)}
          />
        );
      }
      return (
        <BasicTypeSelector
          modelValue={JsonSchemaUtils.transSchemaType2SelectorValue(schema)}
          readonly={readonly}
          disableObjectOptions={level >= MAX_LEVEL}
          onUpdate:modelValue={(newType) => onUpdateSchemaType(schema, newType)}
        />
      );
    }

    function canAddSubLevel(rowData: RowData): boolean {
      const { parameter, schema } = rowData;
      if (schema) {
        return JsonSchemaUtils.canAddSubLevel(schema);
      }
      return JsonSchemaUtils.canEditJsonSchema(parameter.type);
    }

    function renderParamItem(_: typeof h, item: TTreeNodeModel) {
      const nodeData = item.data as TreeNodeData;
      const nodeValue = item.value as string;
      const rowData = nodeData.rowData;
      const { parameter, level } = rowData;
      const columnsStyle = useColumnsStyle(level);

      const isParamReadonly = props.readonly || parameter.readOnly === true;
      const showDetailExpandButton = !isParamReadonly && !props.hideDetailExpandButton;
      const showAddSubLevelButton = !isParamReadonly && !props.hideAddSubLevelButton && canAddSubLevel(rowData);
      const showDeleteButton = !isParamReadonly;
      const showDetail = showDetailExpandButton && detailExpandedNodeValues.has(nodeValue);

      return (
        <div class={[bem('param'), showDetail && bem('param', 'details')]}>
          <div class={bem('param-main')}>
            <div class={bem('input-item')} style={columnsStyle.name}>
              {renderParamCodeInput(rowData, isParamReadonly)}
            </div>
            <div class={bem('input-item')} style={columnsStyle.type}>
              {renderParamTypeSelector(rowData, isParamReadonly)}
            </div>
            {showDetailExpandButton ? (
              <div class={[bem('tool-btn'), showDetail && 'active']}
                title="展开详情"
                onClick={() => toggleNodeDetailPanel(item)}>
                <i class="f-icon f-icon-new-fullscreen app-font-14"></i>
              </div>
            ) : (hasDetailExpandButtonColumn.value && renderBtnPlaceholder())}
            {showAddSubLevelButton ? (
              <div class={bem('tool-btn')}
                title="新增子项"
                onClick={() => handleAddSubLevelParam(rowData)}>
                <i class="f-icon f-icon-list-new"></i>
              </div>
            ) : (hasAddSubLevelButtonColumn.value && renderBtnPlaceholder())}
            {showDeleteButton ? (
              <div class={bem('tool-btn')}
                title="删除"
                onClick={() => handleDeleteParam(rowData)}>
                <i class="f-icon f-icon-enclosure_delete"></i>
              </div>
            ) : (hasDeleteButtonColumn.value && renderBtnPlaceholder())}
          </div>
          {showDetail && renderParamDetails(item)}
        </div>
      );
    }

    function emptySlot() {
      return <></>;
    }

    function renderParams() {
      return (
        <TTree
          data={treeData.value}
          line={true}
          transition={false}
          hover={false}
          label={renderParamItem}
          expanded={expandedNodeValues.value}
          empty={emptySlot}
          onExpand={handleNodeExpand}
        ></TTree>
      );
    }

    function renderAddButton() {
      if (props.readonly) {
        return;
      }
      return (
        <div class={bem('btn-row')}>
          <f-button
            class={bem('add')}
            type="secondary"
            icon="f-icon-add"
            onClick={handleAddParam}
          >新增</f-button>
          {hasDeleteButtonColumn.value && renderBtnPlaceholder()}
        </div>
      );
    }

    const editorClass = computed(() => ({
      [bem()]: true,
      [bem('', 'could-collapse')]: couldCollapse.value,
    }));

    return () => (
      <div class={editorClass.value}>
        {renderTitleRow()}
        {renderParams()}
        {renderAddButton()}
      </div>
    );
  },
});

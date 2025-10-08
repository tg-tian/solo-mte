import { FNotifyService, FPropertyEditor } from '@farris/ui-vue';
import { DesignerMode, UseDesignerContext } from '../../../../components/types/designer-context';
import { defineComponent, inject, onBeforeMount, onMounted, ref, SetupContext } from 'vue';
import { modifyFieldProps, ModifyFieldProps } from './entity-tree-view.props';

/**
 * 维护字段属性
 */
export default defineComponent({
    name: 'FModifyField',
    props: modifyFieldProps,
    emits: ['cancel', 'submit'] as (string[] & ThisType<void>) | undefined,
    setup(props: ModifyFieldProps, context: SetupContext) {
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };
        // 获取当前设计器运行环境
        const designerContext = inject('designerContext') as UseDesignerContext;
        const designerMode = designerContext.designerMode as DesignerMode;

        /** 当前修改的字段 */
        const fieldNode = ref(props.fieldNode);
        /** 当前修改的字段名称 */
        const fieldName = ref(props.fieldNode.name);
        /** 字段名称是否有效 */
        const fieldNameValid = ref(true);
        /** 当前修改的默认值 */
        const fieldDefaultValue = ref(props.fieldNode.defaultValue);
        /** 默认值组件实例 */
        const defaultValueRef = ref();
        /** 是否支持修改默认值 */
        const canModifyDefaultValue = ref(true);

        /** 校验字段名称是否重复 */
        function checkFieldNameValid() {
            if (props.existedAllFields) {
                const names = props.existedAllFields.map(fieldNode => fieldNode.data.name);
                if (names.includes(fieldName.value) && fieldName.value !== fieldNode.value.name) {
                    fieldNameValid.value = false;
                } else {
                    fieldNameValid.value = true;
                }
            }
        }
        /** 获取字段的根节点。例如关联带出字段Company.Company_Name，此处返回的是关联的根字段节点Company */
        function getRootFieldNode() {
            if (props.existedAllFields) {
                let rootField = fieldNode.value;
                if (fieldNode.value.bindingPath?.includes('.')) {
                    const rootLabel = fieldNode.value.bindingPath.slice(0, fieldNode.value.bindingPath.indexOf('.'));
                    const rootNode = props.existedAllFields.find(node => node.parent === node.entityId && node.label === rootLabel);
                    if (rootNode?.data) {
                        rootField = rootNode.data;
                    }
                }
                return rootField;

            }
        }
        /**
         * 校验是否支持配置默认值
         */
        function checkShowDefaultValue() {

            // UDT字段以及UDT带出字段不支持配置默认值
            const rootField = getRootFieldNode();
            if (rootField?.type?.$type === 'ObjectType') {
                canModifyDefaultValue.value = false;
            }
            // 若当前实体表包含分级码类的udt，则整个实体表的字段都不支持默认值
            const fenjimaUdtField = props.existedAllFields?.find(field => field?.data?.$type === 'ComplexField' && field?.data?.type?.$type === 'HierarchyType');
            if (fenjimaUdtField) {
                canModifyDefaultValue.value = false;
            }

        }

        onBeforeMount(() => {
            checkShowDefaultValue();
        });
        function onCancel() {
            context.emit('cancel');
        }


        function onSubmit() {
            if (!fieldName.value) {
                notifyService.warning('字段名称不能为空');
                return;
            }
            if (!fieldNameValid.value) {
                notifyService.warning('字段名称重复');
                return;
            }
            if (defaultValueRef.value?.currentPropertyType === 'Expression' && !fieldDefaultValue.value?.value) {
                notifyService.warning('请填写默认值表达式');
                return;
            }
            context.emit('submit', {
                name: fieldName.value,
                defaultValue: fieldDefaultValue.value
            });

        }
        /** 渲染默认值编辑器 */
        function renderDefaultValueEditor() {
            const defaultValue = fieldDefaultValue.value?.type === 'expression' ? {
                type: 'Expression',
                value: fieldDefaultValue.value?.value
            } : fieldDefaultValue.value;
            const valueTypes = ['Custom', 'Expression'];
            const expressionConfig = {
                dialogTitle: '默认值编辑器',
                showMessage: false,
                showDataPanel: false,
                expressionInfo: {
                    expressionType: 'defaultValue',
                    targetId: fieldNode.value.id,
                    value: defaultValue?.value ? defaultValue.value : null
                }
            };

            function onDefaultValueChanged(newValue: any) {
                if (newValue?.type === 'Expression') {
                    fieldDefaultValue.value = {
                        type: 'expression',
                        value: newValue.expressionInfo?.value
                    };
                } else {
                    fieldDefaultValue.value = newValue;

                }
            }
            return <FPropertyEditor ref={defaultValueRef} v-model={defaultValue} propertyTypes={valueTypes}
                expressionConfig={expressionConfig} onValueChange={onDefaultValueChanged}>
            </FPropertyEditor>;
        }

        function onCopyBindingPath() {
            const textarea = document.createElement("textarea");
            textarea.value = fieldNode.value.bindingPath;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                const success = document.execCommand("copy");
                if (success) {
                    notifyService.success({ message: '字段绑定路径已复制到剪贴板' });
                } else {
                    notifyService.warning(`复制失败，请手动复制以下路径: ${fieldNode.value.bindingPath}`);
                }
            } catch (err) {
                notifyService.warning(`复制失败，请手动复制以下路径: ${fieldNode.value.bindingPath}`);
            }
            document.body.removeChild(textarea);
        }

        return () => {
            return <div class="h-100 d-flex flex-column flex-fill justify-content-between">
                <div class="farris-form-controls-inline p-3">
                    <div class="farris-group-wrap">
                        <div class="form-group farris-form-group">
                            <label class="col-form-label">
                                <span class="farris-label-text">字段名称</span>
                            </label>
                            <div class="farris-input-wrap">
                                <input class="form-control" type="text" v-model={fieldName.value} onKeyup={checkFieldNameValid} readonly={designerMode !== DesignerMode.PC_RTC} />
                                {fieldName.value && !fieldNameValid.value &&
                                    <div class="farris-feedback f-state-invalid" style="position: relative; top: 0;">
                                        <span class="f-feedback-message">名称已存在，请重新输入。</span>
                                    </div>}
                            </div>
                        </div>
                    </div>
                    <div class="farris-group-wrap">
                        <div class="form-group farris-form-group">
                            <label class="col-form-label">
                                <span class="farris-label-text">字段绑定路径</span>
                            </label>
                            <div class="farris-input-wrap position-relative">
                                <input class="form-control" type="text" v-model={fieldNode.value.bindingPath} readonly style="padding-right:32px" />
                                <span title="复制" onClick={onCopyBindingPath} style="position: absolute;right: 10px;top: 5px;color: #949cab;cursor:pointer"><i class="f-icon f-icon-copy"></i></span>
                            </div>
                        </div>
                    </div>
                    {designerMode === DesignerMode.PC_RTC && canModifyDefaultValue.value && <div class="farris-group-wrap">
                        <div class="form-group farris-form-group">
                            <label class="col-form-label">
                                <span class="farris-label-text">字段默认值</span>
                            </label>
                            <div class="farris-input-wrap">
                                {renderDefaultValueEditor()}
                            </div>
                        </div>
                    </div>}

                </div>
                {designerMode === DesignerMode.PC_RTC &&
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onClick={onCancel}>取消</button>
                        <button type="button" class="btn btn-primary" onClick={onSubmit}>确定</button>
                    </div>}
            </div >;
        };


    }
});

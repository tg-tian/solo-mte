/**
 * Copyright (c) 2020 - present, Inspur Genersoft Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { defineComponent, SetupContext, onMounted, reactive, ref } from 'vue';
import { fieldsGetterProps, FieldsGetterProps } from '../props/fields-getter.props';

export default defineComponent({
    name: 'FFieldsGetterDesign',
    props: fieldsGetterProps,
    emits: ['confirm', 'cancel'] as (string[] & ThisType<void>) | undefined,
    setup(props: FieldsGetterProps, context: SetupContext) {
        /** 编辑中的字段值 */
        const data = {};
        /** 字段错误提示映射，如果为空则说明没有错误 */
        const fieldErrorMap = reactive({});
        /** 初始化各个字段 */
        function init(): void {
            for (const field of props.fields) {
                data[field.code] = ref('');
                fieldErrorMap[field.code] = "";
            }
        }
        init();
        /** 处理取消按钮点击事件 */
        function cancelHandler(reject: boolean = false): void {
            context.emit('cancel');
        }
        function handleFieldError(error: string, fieldCode: string): void {
            fieldErrorMap[fieldCode] = error;
        }
        
        function verifyFieldValue(field) {
            let noError = true;
            let required = false;
            if (field.required) {
                if (typeof field.required === 'function') {
                    required = field.required(data);
                } else {
                    required = true;
                }
            }
            if (required && !data[field.code].value) {
                const errorInfo = `请填写${field.name}字段`;
                handleFieldError(errorInfo, field.code);
                noError = false;
            } else {
                handleFieldError("", field.code);
            }
            if (noError && field.validate && typeof field.validate === 'function') {
                let error = null;
                try {
                    error = field.validate(data[field.code].value);
                } catch (err) {
                    console.error('参数检验时出错', err);
                }
                if (error) {
                    handleFieldError(error, field.code);
                    noError = false;
                } else {
                    handleFieldError("", field.code);
                }
            }
            return noError;
        }
        /** 处理确定按钮点击事件 */
        function confirmHandler(): void {
            // 进行必填校验以及合法性检查
            let noError = true;
            for (const field of props.fields) {
                noError = verifyFieldValue(field);
                if(!noError){
                    break;
                }
            }
            if (noError) {
                const result={};
                for(const fieldCode in data){
                    result[fieldCode]=data[fieldCode].value;
                }
                context.emit('confirm', result);
            }
        }
        function handleFieldChange(event, fieldCode: string): void {
            const target = event.target as HTMLInputElement;
            data[fieldCode].value = target.value;
            const currentField = props.fields.find(item => item.code === fieldCode);
            verifyFieldValue(currentField);
        }
        onMounted(() => {

        });

        return () => {
            return (<div class="h-100 f-utils-flex-column">
                <div class="f-form-layout farris-form farris-form-controls-inline farris-form-auto">
                    {props.fields.map((field) => (
                        <div class="col-12 mb-2" key={field.code}>
                            <div class="farris-group-wrap">
                                <div class="form-group farris-form-group">
                                    <div class="col-form-label" style="width:80px;">
                                        <span class="farris-label-text" title={field.code}>{field.name}</span>
                                    </div>
                                    <div class="farris-input-wrap">
                                        <input
                                            type="text"
                                            placeholder={field.placeholder || ''}
                                            class={['form-control', { 'form-control-invalid': fieldErrorMap[field.code] }]}
                                            value={data[field.code].value}
                                            onInput={(event: Event) => handleFieldChange(event, field.code)}
                                        />
                                        <div class={['farris-feedback f-state-invalid', { 'd-none': !fieldErrorMap[field.code] }]} title={fieldErrorMap[field.code]}>
                                            {fieldErrorMap[field.code]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div class="modal-footer mt-auto">
                    <button name="cancel" type="button" class="btn btn-secondary" onClick={() => cancelHandler()}>取消</button>
                    <button name="accept" type="button" class="btn btn-primary" onClick={() => confirmHandler()}>确定</button>
                </div>
            </div>
            );
        };
    }
});

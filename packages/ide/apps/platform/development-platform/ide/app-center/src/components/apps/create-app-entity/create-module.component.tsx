import { defineComponent, ref } from "vue";
import { FDynamicForm, FDynamicFormGroup } from "@farris/ui-vue";
import { useCreateAppDomainModule } from './use-create-app-domain-module';
import { createModuleProps } from './create-module.props';

import './create-app-entity.css';

export default defineComponent({
    name: 'FCreateModule',
    props: createModuleProps,
    emits: [],
    setup(props: any, context) {
        const entityCode = ref('');
        const entityName = ref('');
        const { createModule } = useCreateAppDomainModule();

        function acceptToCreate(): Promise<{ success: boolean; code: string; name: string }> {
            return new Promise<{ success: boolean; code: string; name: string }>((resolve) => {
                // 验证必填字段
                if (!entityCode.value || !entityName.value) {
                    alert('请填写编号和名称');
                    resolve({ success: false, code: '', name: '' });
                    return;
                }
                createModule(entityCode.value, entityName.value, props.appDomainId).then(() => {
                    resolve({ success: true, code: entityCode.value, name: entityName.value });
                }).catch(() => {
                    resolve({ success: false, code: '', name: '' });
                });
            });
        }

        context.expose({ acceptToCreate });

        const requiredInputOptions = {
            type: 'input-group',
            required: true
        };

        const readonlyInputOptions = {
            type: 'input-group',
            readonly: true
        };

        return () => {
            return (
                <div class="f-create-app-entity">
                    <FDynamicForm class="f-form-layout farris-form farris-form-controls-inline">
                        <FDynamicFormGroup id="entity-code-input" class="col-12" label="编号" modelValue={entityCode.value} onUpdate:modelValue={(val: string) => entityCode.value = val} editor={requiredInputOptions}></FDynamicFormGroup>
                        <FDynamicFormGroup id="entity-name-input" class="col-12" label="名称" modelValue={entityName.value} onUpdate:modelValue={(val: string) => entityName.value = val} editor={requiredInputOptions}></FDynamicFormGroup>
                        <FDynamicFormGroup id="app-domain-input" class="col-12" label="所属应用域" modelValue={props.appDomainName} editor={readonlyInputOptions}></FDynamicFormGroup>
                    </FDynamicForm>
                </div>
            );
        };
    }
});

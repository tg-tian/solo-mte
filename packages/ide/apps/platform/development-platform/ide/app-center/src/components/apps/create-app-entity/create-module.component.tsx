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

        function acceptToCreate(): Promise<boolean> {
            return new Promise<boolean>((resolve) => {
                createModule(entityCode.value, entityName.value, props.appDomainId).then(() => {
                    resolve(true);
                }).catch(() => {
                    resolve(false);
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

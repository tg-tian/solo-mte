import { FDynamicForm, FDynamicFormGroup } from "@farris/ui-vue";
import { defineComponent, ref } from "vue";
import { AppWizardProps, appWizardProps } from "./app-wizard.props";
import { useCreateApp } from './composition/use-create-app';

import './app-wizard.css';

export default defineComponent({
    name: 'FAppWizard',
    props: appWizardProps,
    setup(props: AppWizardProps, context) {
        const appModuleName = ref(props.appModule.name);
        const appModuleId = ref(props.appModule.id);
        const appCode = ref('');
        const appName = ref('');
        const { createNewApp } = useCreateApp();

        const appGroupEditorOptions = {
            type: 'combo-list',
            idField: 'value',
            data: [],
            textField: 'name',
            valueField: 'value',
        };

        const requiredInputGroupOptions = {
            type: 'input-group',
            required: true
        };

        const readonlyInputGroupOptions = {
            type: 'input-group',
            readonly: true
        };

        function acceptToCreateNewApp() {
            return createNewApp(appCode.value, appName.value, appModuleId.value);
        }

        context.expose({ acceptToCreateNewApp });

        return () => {
            return (
                <div class="f-app-center-app-wizard">
                    <FDynamicForm class="f-form-layout farris-form farris-form-controls-inline">
                        <FDynamicFormGroup id="app-code-input-group" class="col-12" label="编号" v-model={appCode.value} editor={requiredInputGroupOptions}></FDynamicFormGroup>
                        <FDynamicFormGroup id="app-name-input-group" class="col-12" label="名称" v-model={appName.value} editor={requiredInputGroupOptions}></FDynamicFormGroup>
                        <FDynamicFormGroup id="app-group-combo-list" class="col-12" label="应用分组" editor={appGroupEditorOptions}></FDynamicFormGroup>
                        <FDynamicFormGroup id="app-module-input-group" class="col-12" label="所属模块" v-model={appModuleName.value} editor={readonlyInputGroupOptions}></FDynamicFormGroup>
                    </FDynamicForm>
                </div>
            );
        };
    }
});

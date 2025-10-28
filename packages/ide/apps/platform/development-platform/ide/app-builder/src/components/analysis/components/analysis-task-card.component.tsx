import { defineComponent, ref } from "vue";
import { FButton, FDynamicForm, FDynamicFormGroup, FStep } from "@farris/ui-vue";
import { analysisTaskCardProps, AnalysisTaskCardProps } from "./analysis-task-card.props";

export default defineComponent({
    name: 'FAppAnalysisTaskCard',
    props: analysisTaskCardProps,
    emits: ['change'],
    setup(props: AnalysisTaskCardProps, context) {

        const steps = ref([
            {
                id: '1',
                title: '配置选项',
                description: '正在审批'
            },
            {
                id: '2',
                title: '上传项目',
                description: '等待复核',
            }
        ]);

        const baseFrameworkOptions = {
            type: 'check-group',
            idField: 'value',
            data: [
                { name: '基础框架特性分析', value: 'commonOptions' }
            ]
        };

        const advanceFrameworkOptions = {
            type: 'check-group',
            idField: 'value',
            data: [
                { name: '依赖注入', value: 'injector' },
                { name: 'HTTP端点配置', value: 'httpEndPoint' },
            ]
        };

        const javaVersionEditorOptions = {
            type: 'combo-list',
            idField: 'value',
            data: [
                { name: '8', value: 'java8' },
                { name: '17', value: 'java17' },
            ],
            textField: 'name',
            valueField: 'value',
        };

        const persistenceFrameworkOptions = {
            type: 'check-group',
            idField: 'value',
            data: [
                { name: '持久化框架特性分析', value: 'persistenceOptions' }
            ]
        };

        function onCancel() {
            context.emit('change', 'cancel');
        }

        function onNext() {
            context.emit('change', 'next');
        }

        function onConfirm() {
            context.emit('change', 'confirm');
        }

        return () => {
            return (
                <div class="f-app-analysis-task-card">
                    <div class="task-card-banner">
                        <div class="task-card-icon"></div>
                        <div class="task-card-title">填写任务流程</div>
                    </div>
                    <div class="task-card-progress">
                        <FStep steps={steps.value}></FStep>
                    </div>
                    <div class="task-card-options">
                        <FDynamicForm class="f-form-layout farris-form f-app-analysis-form">
                            <FDynamicFormGroup id="task-name-input-group" class="col-12" label="任务名称" required={true}>
                            </FDynamicFormGroup>
                            <FDynamicFormGroup id="base-framework-check-group" class="col-12" editor={baseFrameworkOptions} required={true}>
                            </FDynamicFormGroup>
                            <FDynamicFormGroup id="advance-framework-check-group" class="col-12" editor={advanceFrameworkOptions} required={true}>
                            </FDynamicFormGroup>
                        </FDynamicForm>
                        <FDynamicForm class="f-form-layout farris-form f-app-analysis-form">
                            <FDynamicFormGroup id="java-version-combo-list" class="col-12" editor={javaVersionEditorOptions} label="Java版本" required={true}>
                            </FDynamicFormGroup>
                            <FDynamicFormGroup id="persistence-framework-check-group" class="col-12" editor={persistenceFrameworkOptions} required={true}>
                            </FDynamicFormGroup>
                        </FDynamicForm>
                    </div>
                    <div class="task-card-toolbar">
                        <div>
                            <FButton size="large" type="secondary" onClick={onCancel}>取消</FButton>
                            <FButton size="large" onClick={onNext}>下一步</FButton>
                            <FButton size="large" onClick={onConfirm} hidden>确定</FButton>
                        </div>
                    </div>
                </div>
            );
        };
    }
});

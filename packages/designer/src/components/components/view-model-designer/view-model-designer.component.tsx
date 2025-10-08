import { SetupContext, defineComponent, ref, computed, inject } from "vue";
import { viewModelDesignerProps, ViewModelDesignerProps } from "./view-model-designer.props";
import FMethodManager from '../../components/view-model-designer/method-manager/method-manager.component';
import FVariableManager from '../../components/view-model-designer/variable-manager/variable-manager.component';

import './view-model-designer.scss';
import { FNotifyService } from "@farris/ui-vue";
import { DesignerMode, UseDesignerContext } from "../../types/designer-context";

export default defineComponent({
    name: 'FViewModelDesigner',
    props: viewModelDesignerProps,
    emits: ['viewSource'],
    setup(props: ViewModelDesignerProps, context) {
        const methodManagerRef = ref();
        const variableManagerRef = ref();
        const designerContext = inject('designerContext') as UseDesignerContext;

        const selectedModelTab = ref('method');
        const modelTabClass = computed(() => (modelType: string) => {
            return { active: selectedModelTab.value === modelType };
        });
        const showTabContent = computed(() => (modelType: string) => {
            return selectedModelTab.value !== modelType;
        });
        function onChangeModelTab(modelType: string) {
            if (modelType === selectedModelTab.value) {
                return;
            }

            selectedModelTab.value = modelType;
        }
        /** 刷新模型页 */
        function refreshViewModelDesigner() {
            methodManagerRef.value?.refreshMethodManager();
            variableManagerRef.value?.refreshVariableManager();
        }
        context.expose({ refreshViewModelDesigner });

        return () => {
            return (
                <div class="f-view-model-designer">
                    <div class="f-utils-fill-flex-column">
                        <div class="view-model-navbar">
                            <div class="f-utils-fill-flex-row">
                                <ul class="nav">
                                    <li id="method" class={modelTabClass.value('method')} onClick={() => onChangeModelTab('method')}>
                                        <i class="fd-i-Family fd_pc-extend-setting mr-2"></i>方法
                                    </li>
                                    {designerContext.designerMode !== DesignerMode.PC_RTC &&
                                        <li id="variable" class={modelTabClass.value('variable')} onClick={() => onChangeModelTab('variable')}>
                                            <i class="fd-i-Family fd_pc-variable-setting mr-2"></i>变量
                                        </li>}
                                </ul>
                            </div>
                        </div>
                        <FMethodManager ref={methodManagerRef} hidden={showTabContent.value('method')}  onViewSource={($event)=> context.emit('viewSource', $event)}></FMethodManager>
                        <FVariableManager ref={variableManagerRef} hidden={showTabContent.value('variable')}></FVariableManager>
                    </div>
                </div>
            );
        };
    }
});

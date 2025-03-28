import { SetupContext, defineComponent, ref, computed } from "vue";
import { viewModelDesignerProps, ViewModelDesignerProps } from "./view-model-designer.props";
import FMethodManager from './method-manager/method-manager.component';

import './view-model-designer.scss';

export default defineComponent({
    name: 'FViewModelDesigner',
    props: viewModelDesignerProps,
    emits: [],
    setup(props: ViewModelDesignerProps, context) {
        const methodMangerRef = ref();
        const selectedModelTab = ref('method');
        const modelTabClass = computed(() => (modelType: string) => {
            return { active: selectedModelTab.value === modelType };
        });
        const showTabContent = computed(() => (modelType: string) => {
            return selectedModelTab.value !== modelType;
        });
        function onChangeModelTab(modelType: string) {
            selectedModelTab.value = modelType;
        }
        /** 刷新模型页 */
        function refreshViewModelDesigner() {
            methodMangerRef.value?.refreshMethodManager();
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
                                    <li id="variable" class={modelTabClass.value('variable')} onClick={() => onChangeModelTab('variable')}>
                                        <i class="fd-i-Family fd_pc-variable-setting mr-2"></i>变量
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <FMethodManager ref={methodMangerRef} hidden={showTabContent.value('method')}></FMethodManager>
                    </div>
                </div>
            );
        };
    }
});

import { SetupContext, defineComponent, ref, computed, inject, onBeforeMount } from "vue";
import { FNotifyService, FSplitter, FSplitterPane } from "@farris/ui-vue";
import { FormViewModel, UseFormSchema } from "../../../../types";
import { useViewModelNavigation } from "../../../view-model-designer/method-manager/composition/use-view-model-list";
import MonacoEditor from '../../../monaco-editor/monaco-editor.component';
import './custom-class-editor.scss';
import { CustomClassEditorProps, customClassEditorProps } from "./custom-class-editor.props";
import { useLocation } from "../../../../composition/use-location";

export default defineComponent({
    name: 'FCustomClassEditor',
    props: customClassEditorProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: CustomClassEditorProps, context: SetupContext) {
        const useFormSchema = inject('useFormSchema') as UseFormSchema;
        const notifyService = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };
        const formSchema = useFormSchema.getFormSchema();

        /** 生成视图模型导航数据 */
        const { resolveViewModelList } = useViewModelNavigation();
        const viewModelNavigation = resolveViewModelList();
        /** 当前视图模型 */
        const activeViewModel = ref(viewModelNavigation?.activeViewModel);
        /** 视图模型导航数据 */
        const viewModelNavgationData = ref(viewModelNavigation?.viewModelTabs);

        const cssEditorRef = ref();
        /** 自定义样式Dom */
        // formSchema.module.customClass ??= {}; // 在旧版本浏览器中不支持此语法
        formSchema.module.customClass = formSchema.module?.customClass || {};

        // const cssFilePath = ref(formSchema.module.customStyleFile || '');

        const { customClass } = formSchema.module;
        /** 当前编辑器内的样式代码 */
        const currentClassCode = ref();

        const { getUrlParam } = useLocation();

        /** 视图模型页签的样式 */
        const viewModelTabClass = computed(() => (viewModelTabId: string) => {
            const showActiceClass = activeViewModel.value?.id === viewModelTabId;
            return { 'f-listview-active': showActiceClass };
        });

        /**
         * 获取当前视图模型关联的组件内码
         * @returns 
         */
        function getCurrentComponentId(): string | undefined {
            const activeViewModelId = activeViewModel.value?.id;
            if (!activeViewModelId) {
                return;
            }
            const currentComponent = useFormSchema.getComponentByViewModelId(activeViewModelId);
            return currentComponent?.id;
        }

        /**
         * 保存自定义样式
         */
        function saveCustomClass() {
            const currentComponentId = getCurrentComponentId();
            if (!currentComponentId) {
                return;
            }

            const oldClassCode = customClass[currentComponentId];
            const newClassCode = cssEditorRef.value?.getContent();
            // 样式变化后，进行更新
            if (oldClassCode !== newClassCode) {
                customClass[currentComponentId] = newClassCode;
            }
        }

        /**
         * 设置当前的样式代码，以供编辑器显示
         */
        function updateCurrentClassCode() {
            const currentComponentId = getCurrentComponentId();
            if (!currentComponentId) {
                return;
            }
            currentClassCode.value = customClass[currentComponentId];
            cssEditorRef.value?.setContent(currentClassCode.value || '');
        }

        /**
         * 切换视图模型导航
         */
        function onChangeViewModelTab(nextViewModel: FormViewModel) {
            const lastViewModelId = activeViewModel.value?.id;
            const nextViewModelId = nextViewModel.id;

            // 1、点击当前页签，无需处理
            if (lastViewModelId === nextViewModelId) {
                return;
            }

            // 2、保存自定义样式
            saveCustomClass();

            // 3、更新当前选中的页签
            activeViewModel.value = nextViewModel;

            // 4、重新设置当前的样式代码
            updateCurrentClassCode();
        }

        // function getApplication() {
        //     const basePath = getUrlParam('id').split('/').filter(name => name);
        //     const app = basePath[0];
        //     const su = basePath[1];
        //     return {app, su};
        // }

        // function resetCssFilePath() {
        //     const { app, su} = getApplication();
        //     formSchema.module.application = app;
        //     formSchema.module.serviceUnit = su;
        // }

        onBeforeMount(() => {
            updateCurrentClassCode();
        });

        const updateWheelZoom = (isEnabled) => {
            cssEditorRef.value?.updateWheelZoom(isEnabled);
        };

        context.expose({
            saveCustomClass,
            updateWheelZoom
        });

        /**
         * 渲染左侧导航
         */
        function renderViewModelNavgation() {
            return <ul class="f-list-view-group">
                {
                    viewModelNavgationData.value?.map((viewModel: any) => {
                        return <div class={viewModelTabClass.value(viewModel.id)} onClick={() => onChangeViewModelTab(viewModel)}>
                            <div class="f-list-content">
                                <div class="f-template-listnav-row">
                                    <div class="list-nav-link" >
                                        <div class="treetable-lines treetable-lines-leaf">
                                            <div class="normal treetable-lines-border-color"></div>
                                        </div>
                                        <span class="nav-item-name" title={viewModel.componentId}>  {viewModel.name} </span>
                                    </div>
                                </div>
                            </div>
                        </div>;
                    })
                }
            </ul >;
        }

        return () => {
            return (
                <div class="f-custom-class-editor">
                    <FSplitter class="f-designer-page-content">
                        <FSplitterPane class="f-designer-page-content-nav" width={200} position="left" resizable={true} style="background: #fff">
                            <div class="view-model-list">
                                {renderViewModelNavgation()}
                            </div>
                        </FSplitterPane>
                        <FSplitterPane class="f-designer-page-content-main" position="center" style="margin-left: 3px;">
                            <MonacoEditor ref={cssEditorRef} v-model={currentClassCode.value} language={"scss"} isActive={props.isActive}></MonacoEditor>
                        </FSplitterPane>
                    </FSplitter>
                    {/* <div class="d-flex align-items-center px-2" style="height: 42px; display:none!important;">
                        <span style="width: 80px;">部署路径：</span>
                        <input type="text" class="form-control" v-model={cssFilePath.value} />
                        <button class="ml-2 btn btn-link" type="button" onClick={resetCssFilePath}>恢复默认</button>
                    </div> */}
                </div >
            );
        };
    }
});


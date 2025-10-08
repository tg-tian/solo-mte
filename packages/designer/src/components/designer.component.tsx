import { SetupContext, defineComponent, inject, ref, computed, provide, watch, onBeforeMount } from "vue";
import { DesignerProps, designerProps } from "./designer.props";
import { useFormSchema } from "./composition/use-form-schema";
import { FormMetadaDataDom, MetadataPathToken } from "./types";
import { FNotifyService, FLoadingService, FResponseToolbar } from '@farris/ui-vue';
import FDesigner from '../components/components/form-designer/form-designer.component';
import FViewModelDesigner from '../components/components/view-model-designer/view-model-designer.component';
import FFormSettings from './components/form-settings/form-settings.component';
import './designer.scss';
import { useFormCommandService } from "./composition/command.service";
import { useEventsEditor } from "./composition/use-events-editor";
import { useEventsEditorUtils } from "./composition/events-editor-utils";
import { useDesignViewModel } from "./composition/design-viewmodel.service";
import { useSchemaService } from "./composition/schema.service";
import { FormMetadataConverter } from "./composition/form-metadata-converter";
import FCodeViewDesign from "./components/code-view/components/code-view.component";
import useFormStateMachine from './composition/use-form-statemachine';
import { MetadataService } from "./composition/metadata.service";
import { DesignerMode, UseDesignerContext } from "./types/designer-context";

export default defineComponent({
    name: 'FDesigner',
    props: designerProps,
    components: {

    },
    emits: [],
    setup(props: DesignerProps) {
        const metadataLoaded = ref(false);
        const schema = ref<any>(props.schema);
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };
        const activeShowDesignerType = ref('formDesigner');
        const viewModelDesignerRef = ref();
        const formDesignerRef = ref();
        const loadingService: any = inject<FLoadingService>('FLoadingService');
        const messageBoxService: any = inject('FMessageBoxService');
        const currentViewType = ref('designer');
        const codeViewComponent = ref();
        const metadataService = new MetadataService();
        const designerContext = inject('designerContext') as UseDesignerContext;
        // 注册 formSchema服务
        const useFormSchemaComposition = useFormSchema();
        provide('useFormSchema', useFormSchemaComposition);
        useFormSchemaComposition.designerMode = designerContext.designerMode;
        const commandBuilderService = designerContext.useCommandBuilderService(useFormSchemaComposition);
        const useFormStateMachineComposition = useFormStateMachine(useFormSchemaComposition);
        provide('useFormStateMachine', useFormStateMachineComposition);
        
        // 操作表单DOM Schema的工具类
        const schemaService = useSchemaService(metadataService, useFormSchemaComposition);
        provide('schemaService', schemaService);
        // 操作表单设计时ViewModel的工具类
        const designViewModelService = useDesignViewModel(useFormSchemaComposition, schemaService);
        provide('designViewModelUtils', designViewModelService);
        designerContext.instances = { formDesigner: formDesignerRef };

        // 注册 命令服务
        const formCommandService = useFormCommandService(
            useFormSchemaComposition, 
            useFormStateMachineComposition, 
            loadingService, 
            commandBuilderService,
            designViewModelService,
            schemaService
        );
        provide('useFormCommand', formCommandService);
        // 注册事件编辑器服务
        const useEventsEditorService = useEventsEditor(formCommandService, useFormSchemaComposition);
        provide('useEventsEditor', useEventsEditorService);
        const eventsEditorUtils = useEventsEditorUtils(formCommandService, useFormSchemaComposition, useEventsEditorService);
        provide('eventsEditorUtils', eventsEditorUtils);
        // metadatFullPath
        const metadataPath: string = inject<string>(MetadataPathToken, '');
        // 控件创建服务
        const controlCreatorService = designerContext.useControlCreator(schemaService);
        provide('controlCreatorUtils', controlCreatorService);
        provide('formMetadataConverter', new FormMetadataConverter());
        const { eventBetweenDesignerAndCodeView } = commandBuilderService;
        const { useFormMetadataService } = designerContext;
        const useFormMetadataComposition = useFormMetadataService(props, useFormSchemaComposition, schemaService);
        const formBasicInfo = ref();
        onBeforeMount(() => {
            useFormMetadataComposition.queryMetadata().then((formSchema: FormMetadaDataDom) => {
                schema.value = formSchema;
                useFormMetadataComposition.queryFormTemplateRule(formSchema?.module).then(() => {
                    metadataLoaded.value = true;
                    // 加载命令=》虽然是异步，但是此处不需要异步串联
                    formCommandService.checkCommands();
                    // 赋值处理
                    designViewModelService.assembleDesignViewModel();
                    // 加载状态机
                    useFormStateMachineComposition.queryStateMachineMetadata();
                    // 加载控件属性过滤规则
                    if (designerContext.getPropertyFilterRule) {
                        designerContext.getPropertyFilterRule();
                    }
                    formBasicInfo.value = useFormSchemaComposition.getFormMetadataBasicInfo();
                });
            });
        });

        const showDesignerTypeItemClass = computed(() => (itemType: string) => {
            return {
                'active': itemType === activeShowDesignerType.value
            };
        });
        const showDesignerContent = computed(() => (itemType: string) => {
            return itemType !== activeShowDesignerType.value;
        });

        function onChangeShowDesignerType(itemType: string) {
            if (activeShowDesignerType.value === itemType) {
                return;
            }
            // 从代码编辑器切换到可视化页面
            formDesignerRef.value?.onChangeDesignerView('formDesigner');

            // 切换到模型时，触发模型页面的数据刷新
            if (itemType === 'viewModelDesigner') {
                viewModelDesignerRef.value?.refreshViewModelDesigner();
            }
            // 从模型切换到页面时，触发属性面板的更新
            if (activeShowDesignerType.value==='viewModelDesigner' &&itemType === 'formDesigner' && formDesignerRef.value?.reloadPropertyPanel) {
                formCommandService.checkCommands().then(() => {
                    formDesignerRef.value?.reloadPropertyPanel();
                });

            }
            activeShowDesignerType.value = itemType;
        }

        /**
         * 保存表单
         */
        function saveFormMetadata(needRunForm: boolean = false) {
            if (formDesignerRef.value && !formDesignerRef.value.prepareBeforeSaveForm()) {
                return;
            };

            const loadingInstance = loadingService?.show({ message: '保存中，请稍候...' });
            useFormMetadataComposition.saveFormMetadata().then(() => {
                !needRunForm && notifyService.success({ message: '表单保存成功' });
                loadingInstance.value.close();
                if (needRunForm && useFormMetadataComposition.runForm) {
                    useFormMetadataComposition.runForm(loadingService, messageBoxService, designerContext, metadataPath);
                }
            }, (error) => {
                messageBoxService.error(error?.response?.data?.Message || '表单保存失败');
                loadingInstance.value.close();
            });
        }

        /**
         * 工具栏配置
         */
        const designerToolbarItems = [
            { id: 'save', text: '保存', onClick: () => saveFormMetadata(false), class: 'btn-primary' },
            { id: 'run', text: '运行', onClick: () => saveFormMetadata(true) },
            { id: 'publish', text: designerContext.designerMode === DesignerMode.PC_RTC ? '发布菜单' : '复制部署路径', onClick: () => useFormMetadataComposition.publishMenu(messageBoxService, notifyService) }
        ];
        /** 
         * 切换设计器视图与代码视图
         */
        function onChangeDesignerView(viewType: string) {
            currentViewType.value = viewType;

            if (viewType === 'designer') {
                // 从代码编辑器切换到可视化页面
                formDesignerRef.value?.onChangeDesignerView('formDesigner');

                // 切换到模型时，触发模型页面的数据刷新
                if (activeShowDesignerType.value === 'viewModelDesigner') {
                    viewModelDesignerRef.value?.refreshViewModelDesigner();
                }
                // 切换到页面时，触发属性面板的更新
                if (activeShowDesignerType.value === 'formDesigner' && formDesignerRef.value?.reloadPropertyPanel) {
                    formCommandService.checkCommands().then(() => {
                        formDesignerRef.value?.reloadPropertyPanel();
                    });
                }
            }
        }
        /**
        * 向自定义构件添加ts代码方法
        */
        function openCodeViewWithNewMethod(data: any) {
            const { tsFilePathName: tsFilePath, methodCode, methodName, webComponentId, webCommandId } = data;
            if (tsFilePath) {

                // 触发刷新代码视图的文件树
                codeViewComponent.value.refreshNavTree(tsFilePath);

                // 触发打开新创建的ts代码编辑器
                codeViewComponent.value.open({ path: tsFilePath, webComponentId, webCommandId });

                // 触发新增方法
                codeViewComponent.value.sendNotification(tsFilePath, { eventName: 'AddNewMethod', eventPayload: { methodCode, methodName } }).subscribe(result => {
                    if (result && result.methodCode && result.methodName) {
                        formCommandService.bindNewMethodToControl(result.methodCode, result.methodName);
                    }
                });
                // 切换到代码视图
                currentViewType.value = 'codeEditor';
            }
        }
        // 代码编辑器保存的时候触发
        function onCodeViewSaveAll(results) {
            if (results) {
                const successes = results.filter(item => item.success);
                if (successes.length === results.length) {
                    notifyService.success({ message: '保存成功' });
                } else {
                    const failedResults = results.filter(item => !item.success);
                    let message = '';
                    failedResults.forEach(failedInfo => {
                        message += `<p>${failedInfo.name} ${failedInfo.tip}</p> `;
                    });
                    messageBoxService.error(message, '');
                }
            }
            formCommandService.checkCommands().then(() => {
                formDesignerRef.value?.reloadPropertyPanel();
            });
        }

        /**
         * 向自定义构件添加编排方法（webcmd）
         */
        function addNewMethodToWebCmd(data: any) {
            const { tsFilePathName: tsFilePath, command } = data;
            if (tsFilePath) {
                // 替换为web构件地址
                const webCmdFilePath = tsFilePath.replace('.ts', '.webcmd');

                // 触发刷新代码视图的文件树
                codeViewComponent.value.refreshNavTree(webCmdFilePath);

                // 触发打开web构件设计器
                codeViewComponent.value.open(webCmdFilePath);

                // 触发新增方法
                codeViewComponent.value.sendNotification(webCmdFilePath, { eventName: 'AddNewCmdMethod', eventPayload: { command } }).subscribe(result => {
                    if (result && result.methodCode && result.methodName) {

                        // 添加成功后，通知视图模型更新数据
                        commandBuilderService.eventBetweenDesignerAndCodeView.value = { eventName: 'afterAddNewCmdMethod', eventValue: result };
                    }
                });

                // 切换到代码视图
                currentViewType.value = 'codeEditor';
            }
        }

        function jumpToCodeView(data: any) {
            if (data) {
                codeViewComponent.value.openAndGoTo(data);
                // 切换到代码视图
                currentViewType.value = 'codeEditor';
            }
        }

        watch(eventBetweenDesignerAndCodeView, (newData) => {
            if (!newData || !newData.eventName) {
                return;
            }
            switch (newData.eventName) {
                case 'openCodeViewWithNewMethod': {
                    openCodeViewWithNewMethod(newData.eventValue);
                    break;
                }
                case 'addNewMethodToWebCmd': {
                    addNewMethodToWebCmd(newData.eventValue);
                    break;
                }
                case 'jumpToCodeView': {
                    jumpToCodeView(newData.eventValue);
                    break;
                }
            }
        });

        function onViewMethodSource(data: any) {
            if (!data) {
                return;
            }
            const { controller } = data;
            jumpToCodeView({
                command: {
                    handlerName: data.code,
                    name: data.name
                }, controller
            });
        }

        return () => {
            return (
                metadataLoaded.value ?
                    <div class="f-utils-absolute-all">
                        <div class={{ 'f-designer-page': true, 'd-none': currentViewType.value !== 'designer' }}>
                            <div class="f-designer-header">
                                <div class="view-type-panel">
                                    <div class="active"><div><span class="f-icon f-icon-perspective_view"></span>设计器 </div></div>
                                    <div onClick={() => onChangeDesignerView('codeEditor')}><div><span class="f-icon f-icon-source-code"></span>代码 </div></div>
                                </div>

                                <div class="show-type-panel border-left border-right">
                                    <div class="show-type-item" onClick={() => onChangeShowDesignerType('formDesigner')}> <div class={showDesignerTypeItemClass.value('formDesigner')}>页面</div> </div>
                                    <div class="show-type-item" onClick={() => onChangeShowDesignerType('viewModelDesigner')}><div class={showDesignerTypeItemClass.value('viewModelDesigner')}>模型</div></div>
                                    {designerContext.designerMode === 'PC' && <div class="show-type-item" onClick={() => onChangeShowDesignerType('formSetting')}><div class={showDesignerTypeItemClass.value('formSetting')}> 配置 </div></div>}
                                </div>
                                <FResponseToolbar customClass={"ml-auto col-6"} items={designerToolbarItems}></FResponseToolbar>
                            </div>
                            <FDesigner ref={formDesignerRef} schema={schema.value} hidden={showDesignerContent.value('formDesigner')}></FDesigner>
                            {/* <FFlowDesigner schema={schema.value} hidden={showDesignerContent.value('formDesigner')}></FFlowDesigner> */}
                            <FViewModelDesigner ref={viewModelDesignerRef} hidden={showDesignerContent.value('viewModelDesigner')} onViewSource={($event) => onViewMethodSource($event)}></FViewModelDesigner>
                            <FFormSettings hidden={showDesignerContent.value('formSetting')}></FFormSettings>
                        </div>
                        <div class={{ 'f-designer-page': true, 'd-none': currentViewType.value !== 'codeEditor' }}>
                            <FCodeViewDesign ref={codeViewComponent} designerMode={useFormSchemaComposition.designerMode} formBasicInfo={formBasicInfo.value} entryFilePath={metadataPath} usePresetConfigs={true} onChangeView={(type) => onChangeDesignerView(type)} onSaveAll={(datas) => onCodeViewSaveAll(datas)}></FCodeViewDesign>
                        </div>
                    </div>
                    : ''
            );
        };
    }
});

/* eslint-disable max-len */
import { SetupContext, defineComponent, inject, ref, computed, provide, watch, onBeforeMount } from "vue";
import { DesignerProps, designerProps } from "./designer.props";
import { useFormSchema } from "./composition/use-form-schema";
import { useFormMetadata } from "./composition/form-metadata.service";
import { FormMetadaDataDom } from "./types";
import { FNotifyService } from '@farris/ui-vue/components/notify';
import { FResponseToolbar } from "@farris/ui-vue/components/response-toolbar";
import FDesigner from './components/form-designer/form-designer.component';
import FFlowDesigner from './components/flow-designer/flow-designer.component';
import FViewModelDesigner from './components/view-model-designer/view-model-designer.component';
import FSetting from './components/form-settings/form-settings.component';

import './designer.scss';

export default defineComponent({
    name: 'FDesigner',
    props: designerProps,
    emits: [],
    setup(props: DesignerProps) {
        const metadataLoaded = ref(false);
        const schema = ref<any>(props.schema);
        const notifyService: any = new FNotifyService();
        const activeShowDesignerType = ref('formDesigner');
        const viewModelDesignerRef = ref();

        const useFormSchemaComposition = useFormSchema();
        provide('useFormSchema', useFormSchemaComposition);

        onBeforeMount(() => {
            const useFormMetadataComposition = useFormMetadata(props, useFormSchemaComposition);
            useFormMetadataComposition.queryMetadata().then((formSchema: FormMetadaDataDom) => {
                schema.value = formSchema;
                metadataLoaded.value = true;
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
            activeShowDesignerType.value = itemType;

            // 切换到模型时，触发模型页面的数据刷新
            if (itemType === 'viewModelDesigner') {
                viewModelDesignerRef.value?.refreshViewModelDesigner();
            }
        }

        const toolbarHandler = {
            save() {
                const schemaString = JSON.stringify(schema.value);
                window.localStorage.setItem('localSchema', schemaString);
                notifyService.info({ message: '页面模型保存成功' });
            },
            run() {
                window.open(`${window.location.origin}/#dynamic-view/preview-local`);
            }
        } as Record<string, () => void>;

        function executeMethod($event: MouseEvent, method: string) {
            const methodToBeExecuted = toolbarHandler[method];
            if (methodToBeExecuted) {
                methodToBeExecuted();
            }
        }

        const designerToolbarItems = [
            { id: 'save', text: '保存', onClick: executeMethod },
            { id: 'run', text: '运行', onClick: executeMethod, class: 'btn-primary' }
        ];

        return () => {
            return (
                metadataLoaded.value ?
                    <div class="f-designer-page" >
                        <div class="f-designer-header">
                            <div class="view-type-panel">
                                <div class="active"><div ><span class="f-icon f-icon-perspective_view"></span>设计器 </div></div>
                                <div><div><span class="f-icon f-icon-source-code"></span>代码 </div></div>
                            </div>

                            <div class="show-type-panel border-left border-right">
                                <div class="show-type-item" onClick={() => onChangeShowDesignerType('formDesigner')}> <div class={showDesignerTypeItemClass.value('formDesigner')}>页面</div> </div>
                                <div class="show-type-item" onClick={() => onChangeShowDesignerType('viewModelDesigner')}><div class={showDesignerTypeItemClass.value('viewModelDesigner')}>模型</div></div>
                                <div class="show-type-item" onClick={() => onChangeShowDesignerType('formSetting')}><div class={showDesignerTypeItemClass.value('formSetting')}> 配置 </div></div>
                            </div>
                            <FResponseToolbar class="ml-auto" items={designerToolbarItems}></FResponseToolbar>
                        </div>
                        <FDesigner schema={schema.value} hidden={showDesignerContent.value('formDesigner')}></FDesigner>
                        {/* <FFlowDesigner schema={schema.value} hidden={showDesignerContent.value('formDesigner')}></FFlowDesigner> */}
                        <FViewModelDesigner ref={viewModelDesignerRef} hidden={showDesignerContent.value('viewModelDesigner')}></FViewModelDesigner>
                        <FSetting hidden={showDesignerContent.value('formSetting')}></FSetting>
                    </div>
                    : ''
            );
        };
    }
});

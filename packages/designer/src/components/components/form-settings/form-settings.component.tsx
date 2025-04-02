import { SetupContext, defineComponent, inject, ref } from "vue";
import { formSettingsDesignerProps, FormSettingsDesignerProps } from "./form-settings.props";
import { UseFormSchema } from "../../types";
import { FMessageBoxService } from "@farris/ui-vue/components/message-box";
import { FNotifyService } from "@farris/ui-vue/components/notify";

import './form-settings.scss';

export default defineComponent({
    name: 'FFormSettings',
    props: formSettingsDesignerProps,
    emits: [],
    setup(props: FormSettingsDesignerProps) {
        const useFormSchema = inject('useFormSchema') as UseFormSchema;
        const formSchema = useFormSchema.getFormSchema();
        const options = ref(formSchema.options || {});
        const notifyService: any = new FNotifyService();
        const messageService: any = new FMessageBoxService();
        const radioEnumData = [
            { value: 'valid', name: '仅合法变更' },
            { value: 'entire', name: '全部变更' }
        ];

        // const rootViewModel: any = formSchema.module.viewmodels.find(v => !v.parent);

        if (notifyService) {
            notifyService.globalConfig = { position: 'top-center', timeout: 3000, showCloseButton: true };
        }

        /**
         * 修改卡片组件内输入控件的静态文本属性
         */
        function changeInputTextArea(componentSchema: any) {

            // TODO: 筛选输入类控件
            if (componentSchema.type === 'form-group') {
                componentSchema.isTextArea = options.value.enableTextArea;
                return;
            }
            componentSchema.contents && (componentSchema.contents as any[])
                .forEach((content: any) => changeInputTextArea(content));
        }

        /**
        * 刷新静态文本
        */
        function refreshInputTextArea() {
            if (!messageService || !messageService.question) {
                return;
            }
            messageService.question('输入类控件将启用静态文本属性，确定刷新？', undefined, () => {
                useFormSchema.getFormSchema().module.components.filter((component: any) =>
                    component.componentType.startsWith('form').forEach((formComponent: any) => changeInputTextArea(formComponent)));
                notifyService.success('刷新成功');

            });
        }

        return () => {
            // return (
            //     <div>
            //         <div class="f-designer-option-panel">
            //             <div class="f-section-header">
            //                 <div class="f-title">
            //                     <h4 class="f-title-text">静态文本</h4>
            //                 </div>
            //             </div>
            //             <small class="form-text text-muted">启用静态文本后输入类控件在只读状态下仅展示文本信息。</small>
            //             <div class="f-group-wrap">
            //                 <div class="form-group f-form-group">
            //                     <label class="col-form-label">
            //                         <span class="f-label-text">是否启用</span>
            //                     </label>
            //                     <div class="mr-4">
            //                         <f-switch size="small" v-model={options.value.enableTextArea}></f-switch>
            //                     </div>
            //                     <button class="badge badge-success cursor-pointer" onClick={refreshInputTextArea}>刷新</button>
            //                 </div>
            //             </div>
            //         </div>
            //         <div class="f-designer-option-panel">
            //             <div class="f-section-header">
            //                 <div class="f-title">
            //                     <h4 class="f-title-text">复用会话</h4>
            //                 </div>
            //             </div>
            //             <small class="form-text text-muted">在组合表单的使用场景中开启该设置后，多个表单可以共用一个会话。</small>
            //             <div class="f-group-wrap">
            //                 <div class="form-group f-form-group">
            //                     <label class="col-form-label">
            //                         <span class="f-label-text">是否启用</span>
            //                     </label>
            //                     <div class="mr-4">
            //                         <f-switch size="small" v-model={rootViewModel.enableUnifiedSession}></f-switch>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //         <div class="f-designer-option-panel">
            //             <div class="f-section-header">
            //                 <div class="f-title">
            //                     <h4 class="f-title-text">数据类型转换</h4>
            //                 </div>
            //             </div>
            //             <small class="form-text text-muted">启用数据类型转换后，表单变量和VO变量会被转换为对应的数据类型。</small>
            //             <div class="f-group-wrap">
            //                 <div class="form-group f-form-group">
            //                     <label class="col-form-label">
            //                         <span class="f-label-text">是否启用</span>
            //                     </label>
            //                     <div class="mr-4">
            //                         <f-switch size="small" v-model={options.value.paramTypeTransform}></f-switch>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //         <div class="f-designer-option-panel">
            //             <div class="f-section-header">
            //                 <div class="f-title">
            //                     <h4 class="f-title-text">变更集提交策略</h4>
            //                 </div>
            //             </div>
            //             <small class="form-text text-muted">变更提交策略是指表单数据发生变化时前端往后端提交变更集的策略。</small>
            //             <small class="form-text text-muted">仅合法变更策略是指仅提交校验通过的变更项，适用于大部分场景。全部变更策略是指提交所有数据变化到后端，适用于暂存场景。</small>
            //             <div class="f-group-wrap">
            //                 <div class="form-group f-form-group">
            //                     <f-radio-group enum-data={radioEnumData} v-model={options.value.changeSetPolicy}> </f-radio-group>
            //                 </div>
            //             </div>
            //         </div>
            //         <div class="f-designer-option-panel">
            //             <div class="f-section-header">
            //                 <div class="f-title">
            //                     <h4 class="f-title-text">服务器端变更检查</h4>
            //                 </div>
            //             </div>
            //             <small class="form-text text-muted">菜单或应用关闭前及取消变更时调用后端接口确认后端缓存中的数据是否已经保存并提示用户。</small>
            //             <small class="form-text text-muted">该特性依赖HasChanges接口，请确认已在Api接口文档中添加。</small>
            //             <div class="f-group-wrap">
            //                 <div class="form-group f-form-group">
            //                     <label class="col-form-label">
            //                         <span class="f-label-text">是否启用</span>
            //                     </label>
            //                     <div class="mr-4">
            //                         <f-switch size="small" v-model={options.value.enableServerSideChangeDetection}></f-switch>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //     </div>

            // );
        };
    }

});

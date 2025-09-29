import { SetupContext, defineComponent, inject, ref } from "vue";
import { formSettingsDesignerProps, FormSettingsDesignerProps } from "./form-settings.props";
import { UseFormSchema } from "../../types";
import { FCheckbox } from "@farris/ui-vue";

import './form-settings.scss';

export default defineComponent({
    name: 'FFormSettings',
    props: formSettingsDesignerProps,
    emits: [],
    setup(props: FormSettingsDesignerProps) {
        const useFormSchema = inject('useFormSchema') as UseFormSchema;
        const formBasicInfo = useFormSchema.getFormMetadataBasicInfo();
        const extendable = ref(formBasicInfo?.extendable || false);

        function onClickExtendable(checked: boolean) {
            formBasicInfo.extendable = extendable.value;
        }
        return () => {
            return (
                <div class="f-designer-settings">
                    <div class="f-designer-option-panel">
                        <div class="panel-title">
                            <span class="menu-item-icon fd-i-Family fd_pc-extend-setting"></span><h4 class="title-text">扩展配置</h4>
                        </div>
                        <div class="panel-main">
                            <FCheckbox v-model={extendable.value} onChangeValue={onClickExtendable}>允许在运行时定制扩展 </FCheckbox>
                            <small class="form-text text-muted">开启此选项后，可以在运行时定制扩展表单中进行扩展 (比如添加字段、子表等) 。</small>
                        </div>

                    </div>
                </div>

            );
        };
    }

});

import { computed, defineComponent, ref, watch } from "vue";
import { FNotifyService } from "@farris/ui-vue";
import { externalComponentProps, ExternalComponentProps } from "./external-component.props";
import { ExternalComponentSchema } from "../../composition/types";

export default defineComponent({
    name: 'FExternalComponent',
    props: externalComponentProps,
    emits: ['click', 'delete'] as (string[] & ThisType<void>) | undefined,
    setup(props: ExternalComponentProps, context) {
        const notifyService = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };
        /** 外部组件的Schema */
        const externalComponentSchema: ExternalComponentSchema = props.modelValue;
        const { componentType } = externalComponentSchema;
        /** 当前组件是否选中 */
        const isSelected = ref(props.isSelected);

        /** 删除按钮的样式 */
        const deleteButtonStyle = computed(() => {
            return {
                'top': '-24px',
                'right': '4px',
                'position': isSelected.value ? 'relative' : '',
                'display': isSelected.value ? 'flex' : 'none'
            };
        });

        /** 图片路径 */
        const imagePath = computed(() => {
            return componentType === 'Independence' ? './assets/images/independence-component.svg' : './assets/images/lookup-component.svg';
        });

        /**
         * 点击外部组件
         */
        function onClick() {
            context.emit('click', externalComponentSchema);
        }

        /**
         * 删除外部组件
         */
        function onDelete() {
            context.emit('delete', externalComponentSchema);
        }

        watch(
            () => props.isSelected,
            () => {
                isSelected.value = props.isSelected;
            }
        );


        function renderDeleteButton() {
            return (
                <div class="component-btn-group" style={deleteButtonStyle.value} data-noattach="true">
                    <div
                        role="button"
                        class="btn component-settings-button"
                        title="删除"
                        ref="removeComponent"
                        onClick={onDelete}>
                        <i class="f-icon f-icon-yxs_delete"></i>
                    </div>
                </div>
            );
        }

        function renderHidenComponent() {
            const { name } = externalComponentSchema;

            return (
                <div onClick={onClick} class={{
                    'f-external-component-box-container': true,
                    'f-external-component-box-selected': isSelected.value
                }}>
                    <div >
                        <div class="f-external-component-template-img-container" >
                            <img width="138px" height="109px" src={imagePath.value}></img>
                        </div>
                        <div class="f-external-component-template-text-container">
                            <div title={name}>{name}</div>
                        </div>
                    </div>
                </div>
            );
        }

        return () => {
            return (
                <div class="no-drag f-external-component">
                    {renderDeleteButton()}
                    {renderHidenComponent()}
                </div>
            );
        };
    }

});

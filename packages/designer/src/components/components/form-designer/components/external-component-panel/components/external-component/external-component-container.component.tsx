import { computed, onMounted, ref } from "vue";
import { useExternalComponentDragula } from "../../composition/use-external-component-dragula";
import FExternalComponent from './external-component.component';
import { ExternalComponentSchema, UseExternalComponent } from "../../composition/types";

export default function (
    externalComponentComposition: UseExternalComponent,
) {
    /** 外部组件的容器 */
    const componentContainerRef = ref();

    /** 拖拽相关方法 */
    const { initDragula, attachToDragulaContainer } = useExternalComponentDragula(externalComponentComposition);

    const externalComponents = externalComponentComposition.getComponents();
    const { isSelected } = externalComponentComposition;

    /** 存在外部组件 */
    const hasExternalComponents = computed(() => {
        return externalComponents.value.length > 0;
    });

    /**
     * 点击外部组件
     * @param selectedComponent 被点击的外部组件
     */
    function onClick(selectedComponent: ExternalComponentSchema) {
        externalComponentComposition.selectExternalComponent(selectedComponent);
    }

    /**
     * 删除外部组件
     */
    function onDelete(externalComponentSchema: ExternalComponentSchema) {
        externalComponentComposition.deleteComponent(externalComponentSchema);
    }

    onMounted(() => {
        initDragula(componentContainerRef.value);
        attachToDragulaContainer();
    });

    /**
     * 渲染外部组件
     */
    function renderComponent(externalComponentSchema: ExternalComponentSchema) {
        return (
            <FExternalComponent
                key={externalComponentSchema.id}
                v-model={externalComponentSchema}
                isSelected={isSelected.value(externalComponentSchema)}
                onClick={onClick}
                onDelete={onDelete}>
            </FExternalComponent>
        );
    }

    /**
     * 渲染外部组件所在的容器
     */
    function renderComponentContainer() {
        return (
            <div class="f-external-component-list-container no-drag">
                {externalComponents.value.map(renderComponent)}
            </div>
        );
    }

    /**
     * 渲染空容器
     */
    function renderEmptyContainer() {
        return (
            <div class="f-external-component-empty-container no-drag">
                <div class="f-external-component-empty-drap-text">
                    从右侧拖拽模板到这里
                </div>
            </div>
        );
    }

    return () => {
        return (
            <div ref={componentContainerRef} class={{
                "f-external-component-container": true,
                "f-external-component-white-background": hasExternalComponents.value,
                "f-external-component-empty-container-border": !hasExternalComponents.value
            }}>
                {hasExternalComponents.value ? renderComponentContainer() : renderEmptyContainer()}
            </div>
        );
    };

}

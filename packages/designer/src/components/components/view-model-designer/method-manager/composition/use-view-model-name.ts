import { inject } from "vue";
import { ComponentType, FormComponent, UseFormSchema } from "../../../../types";

export function useViewModelName() {

    const useFormSchema = inject('useFormSchema') as UseFormSchema;
    const formSchema = useFormSchema.getFormSchema();

    /**
     * 在根组件以及弹窗组件中定位ComponentRef节点及其父节点
     * @param componentId 组件id
     */
    function getComponentRefNode(componentId: string) {
        const rootCmp = formSchema.module.components.find(component => component.componentType === 'frame');
        let componentRefResult = useFormSchema.selectNodeAndParentNode(rootCmp, (item) => item.component === componentId, rootCmp);

        if (componentRefResult) {
            return componentRefResult;
        }

        const modalFrames = formSchema.module.components.filter(c => c.componentType === ComponentType.modalFrame);
        modalFrames && modalFrames.length && modalFrames.forEach((modalFrame: FormComponent) => {
            componentRefResult = useFormSchema.selectNodeAndParentNode(modalFrame, (item) => item.component === componentId, modalFrame);
            if (componentRefResult) {
                return componentRefResult;
            }
        });
    }

    function getDataGridComponentName(component: any) {
        const treeGrid = useFormSchema.selectNode(component, (item: any) => item.type === 'tree-grid');
        if (treeGrid) {
            return '树表格组件';
        }

        const componentRefResult = getComponentRefNode(component.id);
        if (!componentRefResult || !componentRefResult.parentNode) {
            return;
        }
        const componentRefParentContainer = componentRefResult.parentNode;

        // 列表组件取父层容器的标题:容器可能为标签页或者section
        if (componentRefParentContainer.type === 'tab-page' && componentRefParentContainer.title) {
            return componentRefParentContainer.title + '组件';
        }
        if (componentRefParentContainer.type === 'section' && componentRefParentContainer.mainTitle) {
            return componentRefParentContainer.mainTitle + '组件';
        }

        return '表格组件';
    }

    function getViewModelName(viewModelId: string, componentName: string) {
        const component = useFormSchema.getComponentByViewModelId(viewModelId);
        if (!component || component.fakeDel) {
            return;
        }
        switch (component.componentType) {
            case ComponentType.Frame: {
                return '根组件';
            }
            case ComponentType.dataGrid: {
                return getDataGridComponentName(component);
            }
            case ComponentType.uploader: {
                return '附件组件';
            }
            case ComponentType.listView: {
                return '列表视图组件';
            }
            case ComponentType.appointmentCalendar: {
                return '预约日历组件';
            }
            case ComponentType.modalFrame: {
                return '弹窗页面组件';
            }
            default: {
                // 卡片组件取内部section的标题
                if (component.componentType.startsWith('form')) {
                    const section = component.contents.find(content => content.type === 'section');
                    if (section && section.mainTitle) {
                        return section.mainTitle + '组件';
                    }

                }
            }
        }

        return componentName + '组件';
    }

    return {
        getViewModelName
    };
}

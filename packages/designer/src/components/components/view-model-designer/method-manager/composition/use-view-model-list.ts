import { inject } from 'vue';
import { ComponentType, FormViewModel, UseFormSchema } from '../../../../types';
import { useViewModelName } from './use-view-model-name';
import { UseDesignerContext } from '../../../../../components/types/designer-context';

/**
 * 按照组件引用顺序构造视图模型列表
 */
export function useViewModelNavigation() {

    const viewModelNameBuilder = useViewModelName();
    let componentListInModalFrame: any[] = [];
    const useFormSchema = inject('useFormSchema') as UseFormSchema;
    const designerContext = inject('designerContext') as UseDesignerContext;

    const formSchema = useFormSchema.getFormSchema();

    function getAllComponentIdsBySort(componentSchema: any, componentIdList: string[], isInModalFrame = false) {
        if (!componentSchema) {
            return componentIdList;
        }
        if (componentSchema.type === 'component-ref') {
            componentIdList.push(componentSchema.component);

            // 列表弹出编辑/侧边栏编辑：单独处理
            // const cmpNode = useFormSchema.getComponentById(componentSchema.component);
            // if (cmpNode && cmpNode.componentType === ComponentType.dataGrid) {
            //     const dataGrid = this.domService.selectNode(
            //         cmpNode, n => n.type === DgControl.DataGrid.type && n.enableEditByCard !== 'none' && n.modalComponentId
            //     );
            //     if (dataGrid) {
            //         const modalFrameCmp = useFormSchema.getComponentById(dataGrid.modalComponentId);
            //         componentIdList.push(dataGrid.modalComponentId);
            //         componentListInModalFrame.push(dataGrid.modalComponentId);
            //         getAllComponentIdsBySort(modalFrameCmp, componentIdList, true);
            //     }
            // }

            if (isInModalFrame) {
                componentListInModalFrame.push(componentSchema.component);
            }
        }

        if (!componentSchema.contents || componentSchema.contents.length === 0) {
            return componentIdList;
        }

        componentSchema.contents.forEach((content: any) => {
            getAllComponentIdsBySort(content, componentIdList, isInModalFrame);
        });

        return componentIdList;
    }

    /**
     * 按照组件引用的顺序排列ViewModel节点
     */
    function sortViewModels() {
        const pageComponents = designerContext.getPageComponents(useFormSchema);

        if (!pageComponents) {
            return [];
        }
        const componentIdList: string[] = [];
        const sortedViewModels: FormViewModel[] = [];

        pageComponents.forEach(pageComponent => {
            getAllComponentIdsBySort(pageComponent, componentIdList);

            const pageViewModel = useFormSchema.getViewModelById(pageComponent.viewModel);
            if (pageViewModel) {
                sortedViewModels.push(pageViewModel);
            }
        });

        const components = formSchema.module.components.filter(component => component.componentType !== ComponentType.Frame);
        componentIdList.forEach(componentId => {
            const targetComponent = components.find(component => component.id === componentId);
            if (targetComponent) {
                sortedViewModels.push(useFormSchema.getViewModelById(targetComponent.viewModel) as FormViewModel);
            }
        });
        return sortedViewModels;
    }

    function resolveViewModelList(activeViewModelId: string = ''): { viewModelTabs: any[]; activeViewModel: FormViewModel } | undefined {
        if (!formSchema?.module) {
            return;
        }
        componentListInModalFrame = [];
        const viewModelTabs: any[] = [];

        const viewModels = sortViewModels();
        viewModels.forEach(viewModel => {
            if (viewModel.fakeDel) {
                return;
            }
            const showName = viewModelNameBuilder.getViewModelName(viewModel.id, viewModel.name);
            if (showName) {
                const targetComponent = useFormSchema.getComponentByViewModelId(viewModel.id);

                viewModelTabs.push({
                    id: viewModel.id,
                    name: showName,
                    componentId: targetComponent?.id,
                    isInModalFrame: componentListInModalFrame.includes(targetComponent?.id)
                });
            }
        });
        let activeViewModelIndex = 0;
        if (activeViewModelId) {
            const index = viewModels.findIndex(viewModel => viewModel.id === activeViewModelId);
            if (index > 0) {
                activeViewModelIndex = index;
            }
        }
        return { viewModelTabs, activeViewModel: viewModels[activeViewModelIndex] };

    }

    return { resolveViewModelList };
}

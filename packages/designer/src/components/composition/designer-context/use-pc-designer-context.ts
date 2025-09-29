import { DesignerMode, UseDesignerContext } from "../../types/designer-context";
import ToolboxItems from '../../types/toolbox/pc-toolbox.json';
import { usePCControlCreator } from "../control-creator/use-pc-control-creator.service";
import SupportedControllers from '../../composition/command/supported-controllers/pc-supported-controller.json';
import { FormComponent, UseFormSchema } from "../../../components/types";
import ControllCategories from '../schema-repository/controller/pc-categories';
import { useFormMetadata } from "../form-metadata.service";
import { useCommandBuilderService as useCommandBuilder } from "../command-builder.service";

export function usePCDesignerContext(): UseDesignerContext {

    /** 设计器模式 */
    const designerMode: DesignerMode = DesignerMode.PC;

    /** 工具箱的数据 */
    const toolboxItems: any[] = ToolboxItems;

    /** 要注册的UI组件 */
    const componentsToRegister: any = null;

    /** 支持的控制器 */
    const supportedControllers: any = SupportedControllers;

    /** 控制器分类 */
    const controllCategories: any = ControllCategories;

    /** 控件创建服务 */
    const useControlCreator = usePCControlCreator;

    /** 表单元数据服务 */
    const useFormMetadataService = useFormMetadata;

    /** 表单构件元数据服务 */
    const useCommandBuilderService = useCommandBuilder;
    /**
     * 获取所有的页面组件
     * @returns 
     */
    function getPageComponents(useFormSchema: UseFormSchema): FormComponent[] {
        const pageComponents: FormComponent[] = [];
        const pageComponent = useFormSchema.getComponentById('root-component');
        if (pageComponent) {
            pageComponents.push(pageComponent);
        }
        return pageComponents;
    }

    return {
        designerMode,
        toolboxItems,
        componentsToRegister,
        supportedControllers,
        controllCategories,
        useControlCreator,
        getPageComponents,
        useFormMetadataService,
        useCommandBuilderService
    };
}

import { DesignerMode, UseDesignerContext } from "../../types/designer-context";
import ToolboxItems from '../../types/toolbox/mobile-toolbox.json';
import SupportedControllers from '../../composition/command/supported-controllers/mobile-supported-controller.json';

import {
    Component, PageContainer, PageHeaderContainer, PageBodyContainer, PageFooterContainer, Picker, NumberInput, Textarea, DatePicker, DateTimePicker, Lookup,
    ContentContainer, Card, FloatContainer, Navbar, ListView, Form, FormItem, InputGroup, Button, registerDesignerComponents, Switch, CheckboxGroup, RadioGroup,
    ButtonGroup,
} from '@farris/mobile-ui-vue';
import { useMobileControlCreator } from "../control-creator/use-mobile-control-creator";
import { FormComponent, UseFormSchema } from "../../../components/types";
import ControllCategories from '../schema-repository/controller/mobile-categories';
import axios from 'axios';
import { useFormMetadata } from "../form-metadata.service";
import { useCommandBuilderService as useCommandBuilder } from "../command-builder.service";

export function useMobileDesignerContext(): UseDesignerContext {

    /** 设计器模式 */
    const designerMode: DesignerMode = DesignerMode.Mobile;

    /** 工具箱的数据 */
    const toolboxItems: any[] = ToolboxItems;

    /** 要注册的UI组件 */
    const componentsToRegister: any[] = [
        Component, PageContainer, PageHeaderContainer, PageBodyContainer, PageFooterContainer,
        ContentContainer, Card, FloatContainer, Textarea, DatePicker, DateTimePicker, Lookup,
        Navbar, ListView, Picker, NumberInput, Switch, CheckboxGroup, RadioGroup,
        Form, FormItem, InputGroup,
        Button, ButtonGroup,
    ];
    registerDesignerComponents(componentsToRegister);

    /** 支持的控制器 */
    const supportedControllers: any = SupportedControllers;

    const controllCategories: any = ControllCategories;


    /** 控件创建服务 */
    const useControlCreator = useMobileControlCreator;

    /** 表单元数据服务 */
    const useFormMetadataService = useFormMetadata;

    /** 表单构件元数据服务 */
    const useCommandBuilderService = useCommandBuilder;

    /**
     * 获取所有的页面组件
     * @returns 
     */
    function getPageComponents(useFormSchema: UseFormSchema): FormComponent[] {
        const predicateFunction = (component: any) => component.componentType && component.componentType.toLowerCase() === 'page';
        const pageComponents = useFormSchema.getComponetsByPredicate(predicateFunction);
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

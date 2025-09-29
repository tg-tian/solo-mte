import { ElementPropertyConfig } from "@farris/ui-vue/components/property-panel";
import { DesignerProps } from "../designer.props";
import { FormComponent, UseControlCreator, UseFormMetadata, UseFormSchema, UseSchemaService } from "../types";
import { UseCommandBuilderService } from "./command";

/** 设计器模式 */
export enum DesignerMode {
    /** PC低代码设计器 */
    PC = 'PC',

    /** 移动设计器 */
    Mobile = 'Mobile',

    /** PC 运行时定制设计器 */
    PC_RTC = 'PC_RTC'
}

export interface UseDesignerContext {
    instances: Record<string, any>;
    designerMode: DesignerMode;
    toolboxItems: any[];
    componentsToRegister: any[];
    supportedControllers: any;
    controllCategories: any;
    useControlCreator: (schemaService: UseSchemaService) => UseControlCreator;
    getPageComponents: (useFormSchema: UseFormSchema) => FormComponent[];

    /** 查询元数据内容 */
    useFormMetadataService: (props: DesignerProps, useFormSchemaComposition: UseFormSchema, schemaService: UseSchemaService) => UseFormMetadata;

    /** 获取控件属性过滤规则 */
    getPropertyFilterRule?: () => void;
    /** 过滤控件属性配置 */
    filterPropertyEntity?: (propertyConfig: ElementPropertyConfig[], propertyData: any) => ElementPropertyConfig[];

    /** 校验支持删除控件 */
    checkCanDeleteControl?: (propertyData: any, needNotify?: boolean) => boolean;

    /** 设计器中新增控件的属性标识 */
    identifyForNewControl?: string;

    /** 为新创建的控件添加定制标识 */
    appendIdentifyForNewControl?: (propertyData: any) => void;

    /** 为新创建的方法添加定制标识 */
    appendIdentifyForNewCommand?: (propertyData: any) => void;

    /** 表单构件元数据服务 */
    useCommandBuilderService: (formSchemaService: UseFormSchema) => UseCommandBuilderService
}

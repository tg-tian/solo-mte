import { FormVariableCategory } from "./enums";

/**
 * dom Json ViewModel 节点中fields实体
 */
export interface FormViewModelField {
    type: string;

    id: string;

    // 字段bindingField
    fieldName: string;

    // 分组
    groupId: string;

    groupName: string;

    // 字段变更增量
    fieldSchema?: any;

    // 字段变化前后事件
    valueChanging?: string;

    valueChanged?: string;

    // 更新时机
    updateOn?: string;
}

/**
 * dom Json ViewModel 节点中states实体
 */
export interface FormVariable {
    id: string;

    code: string;

    name: string;

    value?: any;

    type: string;

    category: FormVariableCategory;

    sourceName?: string;
    
    viewModelId?: string;

    fields?: any[];
}

/**
 * vm 分页配置
 */
export interface FormViewModelPagination {
    enable: boolean;

    pageList?: string;

    pageSize?: number;
}

/**
 * dom Json ViewModel 节点实体
 */
export interface FormViewModel {
    id: string;

    code: string;

    name: string;

    fields: FormViewModelField[];

    commands: any[];

    states: FormVariable[];

    serviceRefs: any[];

    bindTo: string;

    parent?: string;

    enableUnifiedSession?: boolean;

    pagination?: FormViewModelPagination;

    stateMachine?: string;

    fakeDel?: boolean;

    /** 启用校验 */
    enableValidation?: boolean;

    /** 实体数据是否允许为空 */
    allowEmpty?: boolean;

    /** 针对子表弹出编辑器区域内的组件，记录所属的弹窗根组件 */
    parentModalViewModel?: string;

}


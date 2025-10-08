import { ComponentType, FormBindingType } from "./enums";

export interface FormStateMachine {
    /** 标识 */
    id: string;

    /** 状态机元数据编号 */
    code: string;

    /** 状态机元数据名称 */
    name: string;

    /** 状态机元数据id */
    uri: string;

    /** 状态机元数据命名空间 */
    nameSpace?: string;
}

/**
 * 表达式配置
 */
export interface FormExpressionConfig {
    id: string;

    /**
     * 表达式类型
     */
    type: string;

    /**
     * 表达式配置值
     */
    value: string;

    /**
     * 提示消息
     */
    message?: string;

    /**
     * 提示消息类型
     */
    messageType?: string;

}

/**
* 表达式配置
*/
export interface FormExpression {
    /** 控件id或字段id */
    target: string;

    rules: Array<FormExpressionConfig>;

    // 配置表达式的控件类型，字段类为'Field',按钮类为'Button'
    targetType?: string;
}

/**
 * Item类型数据
 */
export interface ItemData {
    value: string;

    name: string;
}

/**
 * 构件
 */
export interface FormWebCmd {
    id: string;

    code?: string;

    path: string;

    name: string;

    nameSpace?: string;

    /** 命令的引用： host：视图模型中命令的id；handler：构件中命令的编号 */
    refedHandlers?: Array<{ host: string; handler: string }>;

}

/**
 * Component节点
 */
export interface FormComponent {
    id: string;

    type: string;

    /**
     * 组件对应的ViewModel ID
     */
    viewModel: string;

    /**
     * 组件类型
     */
    componentType: ComponentType | any;

    /**
     * 组件内容
     */
    contents: any[];

    /**
     * 初始化事件
     */
    onInit?: string;

    /**
     * 视图加载后事件
     */
    afterViewInit?: string;

    /**
     * 组件展示类型：弹出式（modal，目前用于子表弹出卡片式编辑的场景）
     */
    showType?: string;

    /** 标记删除 */
    fakeDel?: boolean;

    /** 移动自定义样式 */
    customClass?: string;

    code?: string;
    name?: string;
    route?:any;
}

/**
 * DOM 控件binding实体
 */
export interface FormBinding {
    type: FormBindingType;

    path: string;

    field: string;

    fullPath: string;

    // 目前附件上传组件记录bindingPath
    bindingPath?: string;
}


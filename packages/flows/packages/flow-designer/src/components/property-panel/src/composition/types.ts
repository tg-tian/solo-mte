import type { EditorConfig } from "@farris/ui-vue";
import type { Ref } from "vue";

export interface KeyMap {
    key: any;
    value: any;
}

/** 属性实体 */
export interface PropertyEntity {
    /**
     * 属性ID
     */
    propertyID: string;

    /**
     * 属性显示的名称
     */
    propertyName?: string;

    /**
     * 属性的类型
     */
    propertyType: any;

    /**
     * 属性描述
     */
    description?: string;

    /**
     * 属性的默认值
     */
    defaultValue?: any;

    propertyValue?: Ref<any>;

    /**
     * 是否只读，默认false
     */
    readonly?: () => boolean;

    /**
     * 是否可见，默认true
     */
    visible: boolean | (() => boolean);

    /**
     * 最小值
     */
    min?: any;

    /**
     * 最大值
     */
    max?: any;

    /**
     * 数字类型属性的小数位数
     */
    decimals?: number;

    /**
     * 是否大数字
     */
    isBigNumber?: boolean;

    /**
     * 属性改变后是否需要刷新整个面板：用于属性有联动修改的场景
     */
    refreshPanelAfterChanged?: boolean;

    /**
     * 下拉框的枚举值
     */
    iterator?: KeyMap[];

    /**
     * 下拉多选类型：属性值的类型：string(多值以逗号分隔)/array(多值组装成数组)
     */
    multiSelectDataType?: string;

    /**
     * 文本控件限制输入的字符，支持字符和正则表达式
     */
    notAllowedChars?: any[];

    /**
     * 级联属性配置
     */
    cascadeConfig?: PropertyEntity[];

    /**
     * 级联属性是否默认收起
     */
    isExpand?: boolean;

    /**
     * 是否隐藏级联属性的头部
     */
    hideCascadeTitle?: boolean;

    /**
     * 模态框属性自定义编辑器参数
     */
    editorParams?: any;

    /** 模态框属性是否展示清除图标 */
    showClearButton?: boolean;

    /** 点击清除按钮后的方法，参数为清除前的属性值 */
    afterClickClearButton?(value: any): void;

    /** 点击清除按钮时是否需要弹窗确认 */
    showQuestionBeforeClear?: boolean;

    /** 点击清除按钮时弹窗确认的文案 */
    questionMessage?: string;

    editor?: EditorConfig;

    parentPropertyID?: string;
}

export interface ElementPropertyConfig {
    /**
     * 分类ID
     */
    categoryId: string;

    /**
     * 分类显示的名称
     */
    categoryName: string;

    /**
     * 分类是否隐藏，默认false
     */
    hide?: boolean;

    /**
     * 是否隐藏分类标题
     */
    hideTitle?: boolean;

    /**
     * 分类下的属性配置
     */
    properties: PropertyEntity[];

    /**
     * 是否启用级联特性，默认false
     */
    enableCascade?: boolean;

    /**
     * 属性值：分类启用级联特性时必填
     */
    propertyData?: any;

    /**
     * 父级属性ID：分类启用级联特性时必填
     */
    parentPropertyID?: string;

    /**
     * 属性关联关系，用于属性变更后修改其他属性配置或属性值
     */
    setPropertyRelates?: (changeObject: any, propertyData: any, parameters?: any) => void;

    /**
     * 分类以标签页展示时，标签页的ID。若只需平铺展示，则不需要传入。
     */
    tabId?: string;

    /**
     * 分类以标签页展示时，标签页的名称。若只需平铺展示，则不需要传入。
     */
    tabName?: string;

    status?: string;
}

/**
 * 属性变更集
 */
export interface PropertyChangeObject {
    /**
     * 属性ID
     */
    propertyID: string;

    /**
     * 变更后的属性值
     */
    propertyValue: any;

    /**
     *  属性所在分类ID
     */
    categoryId?: string;

    /**
     * 级联属性的父路径，以.分隔
     */
    propertyPath?: string;

    /**
     * 级联属性的父属性ID
     */
    parentPropertyID?: string;
};

/**
 * 属性变更实体类
 */
export interface FormPropertyChangeObject extends PropertyChangeObject {

    /** 属性变更后是否需要整体刷新表单 */
    needRefreshForm?: boolean;

    /** 属性变更后需要局部刷新的组件id */
    needRefreshedComponentId?: string;

    /** 是否需要刷新控件树 */
    needRefreshControlTree?: boolean;

    /** 是否需要刷新控件树 */
    needRefreshEntityTree?: boolean;

    /** 关联变更的属性集合，用于更新表单DOM属性 */
    relateChangeProps?: Array<{
        propertyID: string,
        propertyValue: any
    }>;

    /** 强关联的属性id：在当前属性变更后，页面自动定位到强关联的属性 */
    autoLocatedPropertyId?: string;
}

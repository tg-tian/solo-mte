import type { InjectionKey } from 'vue';
import type { EditorConfig, PropertyConverter } from '@farris/ui-vue';

/** 属性面板配置 */
export interface PropertyPanelConfig {
    type?: string;
    categories: { [categoryID: string]: PropertyCategory };
}

/** 属性分类 */
export interface PropertyCategory {

    /** 分类显示的名称 */
    title: string;

    /** 分类下的属性配置 */
    properties: { [propertyID: string]: PropertyItem };

    $converter?: string | PropertyConverter;

    /**
     * 属性关联关系
     * @description 用于在属性变更后修改其它属性配置或属性值
     */
    setPropertyRelates?: (changeObject: any, propertyData: any, parameters?: any) => void;

    /** 是否隐藏分类标题 */
    hideTitle?: boolean;

    /** 是否隐藏 */
    hide?: boolean;

    /**
     * 父级属性ID
     * @description 当分类启用级联特性时需要传入
     */
    parentPropertyID?: string;

    /**
     * 标签页的ID
     * @description 仅当需要以标签页的形式展示属性分类时传入，平铺展示时不需要传入
     */
    tabId?: string;

    /**
     * 标签页的名称
     * @description 仅当需要以标签页的形式展示属性分类时传入，平铺展示时不需要传入
     */
    tabName?: string;

    [key: string]: any;
}

type PropertyType = 'string' | 'boolean' | 'number' | 'enum' | 'array' | 'events-editor' | 'cascade' | (string & {});

type BuiltInEditorType = EditorConfig['type'];

interface PropertyEditorConfig extends Omit<EditorConfig, 'type'> {
    type: BuiltInEditorType | (string & {});
}

/** 属性条目 */
export interface PropertyItem {

    /**
     * 属性显示的名称
     * @description 如果为空则不显示标题
     */
    title?: string;

    /** 属性描述 */
    description?: string;

    /** 属性的类型 */
    type: PropertyType;

    /** 属性编辑器配置 */
    editor?: PropertyEditorConfig;

    $converter?: string | PropertyConverter;

    /** 是否可见 */
    visible?: boolean | any;

    /** 是否只读 */
    readonly?: boolean | any;

    /**
     * 属性变更后是否需要刷新整个面板
     * @description 用于属性有联动修改的场景
     */
    refreshPanelAfterChanged?: boolean;

    /**
     * 级联属性配置
     * @description 当`type`等于`"cascade"`时需要传入级联属性
     */
    properties?: { [propertyID: string]: PropertyItem };

    /**
     * 父级属性ID
     * @description 启用级联属性时需要传入
     */
    parentPropertyID?: string;

    /** 级联属性是否默认收起 */
    isExpand?: boolean;

    [key: string]: any;
}

export interface UsePropertyPanel {
    open(nodeId: string): void;
    close(): void;
}

export const PROPERTY_PANEL_KEY: InjectionKey<UsePropertyPanel> = Symbol('UsePropertyPanel');

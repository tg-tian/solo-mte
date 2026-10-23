import { DesignerMode, DesignerTerminal, UseDesignerContext } from "../../types/designer-context";
import ToolboxItems from '../../types/toolbox/pc-toolbox.json';
import { usePCControlCreator } from "../control-creator/use-pc-control-creator.service";
import SupportedControllers from '../../composition/command/supported-controllers/pc-supported-controller.json';
import { FormComponent, UseFormSchema } from "../../../components/types";
import ControllCategories from '../schema-repository/controller/pc-categories';
import { useFormMetadata } from "../form-metadata.service";
import { useCommandBuilderService as useCommandBuilder } from "../command-builder.service";
import { ElementPropertyConfig, PropertyEntity } from "@farris/ui-vue/components/property-panel";
import { CustomComponentConfig, loadDesignerConfig } from "../designer-config.service";
import { Ref, ref } from "vue";

/** 工具箱「自定义」分组标识 */
const CUSTOM_TOOLBOX_GROUP_TYPE = 'custom';

/** 自定义组件在工具箱中的固定图标，渲染为 fd_pc-kuozhankaifa */
const CUSTOM_TOOLBOX_ITEM_ICON = 'kuozhankaifa';

/** 需要把编辑器属性映射为 editor. 前缀的容器类型（与运行时定制的处理保持一致） */
const EDITOR_WRAPPER_TYPES = ['form-group', 'data-grid-column'];

/**
 * 工具箱数据（含运行期追加的「自定义」分组）。
 * 注意：工具箱组件只在首次渲染时读取一次，因此追加必须在设计器渲染前完成。
 */
const pcToolboxItems: any[] = ToolboxItems as any[];

/**
 * 把已启用的自定义组件追加到工具箱末尾的固定「自定义」分组。
 * 分组名称、图标、条目类别均为平台约定，不由使用者配置。
 */
export function mergeCustomComponentsIntoToolbox(components: CustomComponentConfig[]): void {
    if (!components?.length) {
        return;
    }
    if (pcToolboxItems.some((group) => group.type === CUSTOM_TOOLBOX_GROUP_TYPE)) {
        return;
    }
    pcToolboxItems.push({
        type: CUSTOM_TOOLBOX_GROUP_TYPE,
        name: '自定义',
        items: components.map((component) => ({
            id: component.id,
            type: component.type,
            name: component.name,
            icon: CUSTOM_TOOLBOX_ITEM_ICON,
            category: 'container'
        }))
    });
}

export function usePCDesignerContext(terminal: DesignerTerminal = DesignerTerminal.PC): UseDesignerContext {

    /** 设计器模式 */
    const designerMode: DesignerMode = DesignerMode.PC;

    /** 当前设计终端，由元数据类型（PC / 移动表单）决定 */
    const terminalRef: Ref<DesignerTerminal> = ref(terminal);

    /** 工具箱的数据 */
    const toolboxItems: any[] = pcToolboxItems;

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

    /** 属性黑名单：控件类型 -> 需要隐藏的属性路径 */
    let hiddenProperties: Record<string, string[]> = {};

    /**
     * 获取控件属性过滤规则（属性黑名单）。
     * 配置读取失败时降级为空黑名单，不影响设计器其余逻辑。
     */
    function getPropertyFilterRule() {
        return loadDesignerConfig().then((config) => {
            hiddenProperties = config?.hiddenProperties || {};
        });
    }

    /**
     * 计算属性路径，规则与运行时定制保持一致：
     * 分类父ID + 属性父ID + 属性ID；「外观」分类下的 class/style 补 appearance. 前缀
     */
    function resolvePropertyPath(category: ElementPropertyConfig, property: PropertyEntity): string {
        const categoryPrefix = category.parentPropertyID ? `${category.parentPropertyID}.` : '';
        let propertyPrefix = property.parentPropertyID ? `${property.parentPropertyID}.` : '';
        if (['class', 'style'].includes(property.propertyID) && !property.parentPropertyID && category.categoryId?.toLocaleLowerCase() === 'appearance') {
            propertyPrefix = 'appearance.';
        }
        return `${categoryPrefix}${propertyPrefix}${property.propertyID}`;
    }

    /**
     * 收集当前控件命中黑名单的属性路径集合。
     * 字段型控件的属性归属于其编辑器类型，因此需要把编辑器类型的黑名单一并纳入。
     */
    function collectHiddenPropertyIds(propertyData: any): Set<string> {
        const hiddenIds = new Set<string>();
        (hiddenProperties[propertyData?.type] || []).forEach((propertyId) => {
            if (propertyId) {
                hiddenIds.add(propertyId);
            }
        });

        if (EDITOR_WRAPPER_TYPES.includes(propertyData?.type) && propertyData?.editor) {
            (hiddenProperties[propertyData.editor.type] || []).forEach((propertyId) => {
                if (!propertyId) {
                    return;
                }
                // 编辑器属性可能带或不带 editor. 前缀，两种写法都纳入，避免静默失效
                hiddenIds.add(propertyId);
                hiddenIds.add(propertyId.includes('events.') ? propertyId.replace('events.', '') : `editor.${propertyId}`);
            });
        }

        return hiddenIds;
    }

    /**
     * 分类下没有可见属性时收起该分类
     */
    function hideEmptyCategory(category: ElementPropertyConfig) {
        if (category.hide) {
            return;
        }
        category.hide = !category.properties?.length;
        const visibleProperty = category.properties?.find((property) => property.visible !== false);
        if (!visibleProperty) {
            category.hide = true;
        }
    }

    /**
     * 按属性黑名单过滤属性配置
     */
    function filterPropertyEntity(propertyConfig: ElementPropertyConfig[], propertyData: any): ElementPropertyConfig[] {
        if (propertyData?.type === 'Module') {
            return propertyConfig;
        }
        if (!propertyConfig?.length || !propertyData) {
            return propertyConfig || [];
        }
        const hiddenIds = collectHiddenPropertyIds(propertyData);
        if (!hiddenIds.size) {
            return propertyConfig;
        }

        propertyConfig.forEach((category) => {
            if (!category.properties?.length) {
                return;
            }
            // 表达式与事件类属性不参与黑名单过滤
            if (category.categoryId === 'expressions' || category.categoryId?.includes('eventsEditor')) {
                return;
            }
            category.properties = category.properties.filter((property) => !hiddenIds.has(resolvePropertyPath(category, property)));
            hideEmptyCategory(category);
        });

        return propertyConfig;
    }

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
        terminalRef,
        toolboxItems,
        componentsToRegister,
        supportedControllers,
        controllCategories,
        useControlCreator,
        getPageComponents,
        useFormMetadataService,
        useCommandBuilderService,
        getPropertyFilterRule,
        filterPropertyEntity
    };
}

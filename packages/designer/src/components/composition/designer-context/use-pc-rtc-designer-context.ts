import { DesignerMode, UseDesignerContext } from "../../types/designer-context";
import ToolboxItems from '../../types/toolbox/pc-rtc-toolbox.json';
import { usePCControlCreator } from "../control-creator/use-pc-control-creator.service";
import SupportedControllers from '../../composition/command/supported-controllers/pc-supported-controller.json';
import { FormComponent, UseFormSchema } from "../../../components/types";
import ControllCategories from '../schema-repository/controller/pc-categories';
import { useRtcFormMetadata } from "../form-metadata-rtc.service";
import axios from "axios";
import { ElementPropertyConfig } from "@farris/ui-vue/components/property-panel";
import { FNotifyService } from "@farris/ui-vue";
import { useRtcCommandBuilderService as useRtcCommandBuilder } from "../command-builder-rtc.service";

export function usePCRtcDesignerContext(): UseDesignerContext {

    /** 设计器模式 */
    const designerMode: DesignerMode = DesignerMode.PC_RTC;

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
    const useFormMetadataService = useRtcFormMetadata;

    /** 控件属性过滤映射 */
    let controlPropertyRule: any = {};

    const notifyService = new FNotifyService();

    /** 运行时定制中新增控件的属性标识 */
    const identifyForNewControl = 'isRtcControl';

    /** 运行时定制中新增方法的属性标识 */
    const identifyForNewCommand = 'isRtcCommand';

    /** 表单构件元数据服务 */
    const useCommandBuilderService = useRtcCommandBuilder;
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

    /**
     * 获取运行时定制控件属性默认控制规则
     */
    function getPropertyFilterRule() {

        return axios.get('assets/rtc/property-rule.json?version=' + new Date().getTime()).then(response => {
            controlPropertyRule = response?.data || {};
        });

    }

    /**
     *  如果分类下没有属性或者所有属性都隐藏，则不展示分类
     */
    function checkIsHideCategory(cat: ElementPropertyConfig) {
        if (cat.hide) {
            return;
        }

        cat.hide = !cat.properties.length;

        const visibleProp = cat.properties.find(p => p.visible !== false);
        if (!visibleProp) {
            cat.hide = true;
        }
    }
    function filterCommandProperty(category: ElementPropertyConfig, allowedPropertyIds: string[]) {
        if (allowedPropertyIds && category.properties) {
            category.properties.forEach((eventInfo) => {
                const { initialData } = eventInfo.editor;
                // 已绑定事件
                initialData.boundEventsList = initialData.boundEventsList.filter((item) => {
                    return allowedPropertyIds.includes(item.boundEvents.label);
                });
                // 事件列表
                initialData.events = initialData.events.filter((item) => {
                    return allowedPropertyIds.includes(item.label);
                });

                // 动态事件
                const switchEvents = initialData.getEventList();
                switchEvents.events = switchEvents.events.filter((item) => {
                    return allowedPropertyIds.includes(item.label);
                });
                initialData.getEventList = () => {
                    return switchEvents;
                };

                category.hide = initialData.events.length === 0;
            });
        }
    }
    /**
     * 根据配置文件过滤属性
     */
    function filterPropertyEntity(propertyConfig: ElementPropertyConfig[], propertyData: any): ElementPropertyConfig[] {
        if (propertyData?.type === 'Module') {
            return propertyConfig;
        }
        if (!propertyConfig?.length || !propertyData || !controlPropertyRule[propertyData.type]?.length) {
            return propertyConfig || [];
        }
        let allowedPropertyIds = controlPropertyRule[propertyData.type];
        if (['form-group', 'data-grid-column'].includes(propertyData.type) && propertyData.editor) {
            const editorPropertyIds = controlPropertyRule[propertyData.editor.type];
            if (editorPropertyIds?.length) {
                allowedPropertyIds = allowedPropertyIds.concat(editorPropertyIds.map(propertyId =>
                    propertyId.includes('events') ? propertyId.replace('events.', '') : `editor.${propertyId}`));
            }

        }
        propertyConfig.forEach(category => {
            if (!category.properties?.length) {
                return;
            }

            // 表达式属性都展示，不屏蔽
            if (category.categoryId === 'expressions') {
                return;
            }
            // 过滤事件类属性
            if (category.categoryId.includes("eventsEditor")) {
                filterCommandProperty(category, allowedPropertyIds);
                return;
            }

            // 分类使用级联特性，属性ID要拼接父ID
            const categoryPrefix = category.parentPropertyID ? `${category.parentPropertyID}.` : '';
            category.properties = category.properties.filter(property => {
                let propertyPrefix = property.parentPropertyID ? `${property.parentPropertyID}.` : '';

                if (['class', 'style'].includes(property.propertyID) && !property.parentPropertyID && category.categoryId.toLocaleLowerCase() === 'appearance') {
                    propertyPrefix = 'appearance.';
                }
                const propertyPath = `${categoryPrefix}${propertyPrefix}${property.propertyID}`;

                return allowedPropertyIds.includes(propertyPath);
            });

            checkIsHideCategory(category);
        });
        propertyConfig = propertyConfig.filter(category => category.properties.length);
        return propertyConfig;
    }
    /**
     * 校验是否支持删除控件
     */
    function checkCanDeleteControl(propertyData: any, needNotify = true) {
        if (propertyData && !propertyData[identifyForNewControl]) {
            if (needNotify) {
                notifyService.warning({ position: 'top-center', message: '不允许删除基础表单的控件' });
            }
            return false;
        }

        return true;
    }
    /**
     * 为控件增加定制标识
     */
    function appendIdentifyForNewControl(propertyData: any) {
        if (propertyData) {
            propertyData[identifyForNewControl] = true;
        }
    }
    /**
     * 为方法增加定制标识
     */
    function appendIdentifyForNewCommand(command: any) {
        if (command) {
            command[identifyForNewCommand] = true;
        }
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
        getPropertyFilterRule,
        filterPropertyEntity,
        checkCanDeleteControl,
        identifyForNewControl,
        appendIdentifyForNewControl,
        appendIdentifyForNewCommand,
        useCommandBuilderService
    };
}

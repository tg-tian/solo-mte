import { DesignerHostService, ExternalLookupPropertyConfig } from "@farris/ui-vue";
import { ExternalComponentSchema } from "./types";
import { ModalProperty } from "@farris/ui-vue";

export function useExternalComponentProperty(designerHostService: DesignerHostService, propertyData: ExternalComponentSchema) {
    const componentId = 'root-component';
    const externalLookupPropertyConfig = new ExternalLookupPropertyConfig(componentId, designerHostService);
    let convertedPropertyData: any;

    /**
     * 获取弹窗的属性
     */
    function getModalPropertyConfig(): any {
        const propertyConfig = new ModalProperty(componentId, designerHostService);
        return propertyConfig.getPropertyConfig(propertyData);
    }

    function getBasePropertyConfig(): any {
        return {
            description: 'Basic Information',
            title: '基本信息',
            properties: {
                id: {
                    title: '标识',
                    type: 'string',
                    readonly: true
                },
                name: {
                    title: '名称',
                    type: 'string',
                    readonly: false
                }
            }
        };
    }

    function getConvertedPropertyData(): any {
        if (convertedPropertyData) {
            return convertedPropertyData;
        }

        if (propertyData.type === 'lookup') {
            convertedPropertyData = {
                id: propertyData.id,
                get name(): string {
                    return propertyData.name;
                },
                set name(value: string) {
                    propertyData.name = value;
                },
                type: 'form-group',
                editor: propertyData
            };
            externalLookupPropertyConfig.events.forEach(event => {
                Object.defineProperty(convertedPropertyData, event.label, {
                    get(): any {
                        return propertyData[event.label];
                    },
                    set(value: any) {
                        propertyData[event.label] = value;
                    },
                    enumerable: true,
                    configurable: true,
                });
            });
        } else {
            convertedPropertyData = propertyData;
        }

        return convertedPropertyData;
    }

    function getPropConfig(componentId: string) {
        let propertyConfig: any;

        if (propertyData.type === 'lookup') {
            const convertedPropertyData = getConvertedPropertyData();
            propertyConfig = externalLookupPropertyConfig.getPropertyConfig(convertedPropertyData);
        } else {
            propertyConfig = getModalPropertyConfig();
        }

        const basic = getBasePropertyConfig();
        propertyConfig.categories = { basic, ...propertyConfig.categories };
        return propertyConfig;
    }

    return {
        getPropConfig,
        getConvertedPropertyData
    };
}

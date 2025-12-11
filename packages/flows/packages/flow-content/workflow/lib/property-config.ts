import { BaseControlProperty, type PropertyPanelConfig } from '@farris/flow-devkit';

class FlowProperty extends BaseControlProperty {

    public getPropertyConfig(_flowData: any) {
        return this.propertyConfig;
    }
}

export function getPropertyPanelConfig(flowData: any): PropertyPanelConfig {
    const config = new FlowProperty();
    return config.getPropertyConfig(flowData);
}

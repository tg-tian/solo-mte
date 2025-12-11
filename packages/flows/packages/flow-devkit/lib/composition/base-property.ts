import type { PropertyPanelConfig } from '../types';

export class BaseControlProperty {

    protected propertyConfig: PropertyPanelConfig = {
        type: 'object',
        categories: {},
    };

}

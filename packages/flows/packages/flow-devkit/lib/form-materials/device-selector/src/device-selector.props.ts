import type { ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import deviceSelectorSchema from './schema/device-selector.schema.json';

export const DEVICE_SELECTOR_NAME = 'FvfDeviceSelector';

export const deviceSelectorProps = {
    /** 绑定值 */
    modelValue: { type: String, default: '' },

    /** 设备类型 */
    modelId: { type: String, default: '' },

    /** 设备类型名称 */
    modelName: { type: String, default: '' },
};

export type DeviceSelectorProps = ExtractPropTypes<typeof deviceSelectorProps>;

export const propsResolver = createPropsResolver(deviceSelectorProps, deviceSelectorSchema);

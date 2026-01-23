import { defineComponent, watch, computed } from 'vue';
import { deviceSelectorProps, DEVICE_SELECTOR_NAME } from './device-selector.props';
import { TSelect, type TdOptionProps } from '@farris/flow-devkit/third-party';
import { useDeviceInfo } from '@farris/flow-devkit/hooks';

import './device-selector.scss';

export default defineComponent({
  name: DEVICE_SELECTOR_NAME,
  props: deviceSelectorProps,
  emits: {
    'update:modelValue': (_newType: string) => {
      return true;
    },
  },
  setup(props, context) {
    const {
      getDeviceListByModelName,
      deviceName2DeviceList,
    } = useDeviceInfo();

    const selectOptions = computed<TdOptionProps[]>(() => {
      if (!props.modelName) {
        return [];
      }
      const deviceList = deviceName2DeviceList.get(props.modelName) || [];
      return deviceList.map((device) => ({
        value: device.deviceId,
        label: device.deviceName,
      }));
    });

    watch([
      () => props.modelName
    ], () => {
      if (props.modelName) {
        getDeviceListByModelName(props.modelName);
      }
    }, { immediate: true });

    function onChange(newValue: any): void {
      context.emit('update:modelValue', newValue);
    }

    return () => (
      <TSelect
        value={props.modelValue}
        options={selectOptions.value}
        clearable={false}
        size={'small'}
        popupProps={{
          overlayInnerClassName: 'larger-max-height',
        }}
        onChange={onChange}
      ></TSelect>
    );
  },
});

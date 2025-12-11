import { defineComponent, computed } from 'vue';
import { apiConfigProps } from './api-config.props';
import { useBem } from '@farris/flow-devkit';

import './api-config.scss';

const name = 'api-config';

export default defineComponent({
  name,
  props: apiConfigProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);

    const restFulService = computed(() => {
      return props.nodeData?.restFulService || {};
    });

    const requestType = computed(() => {
      return String(restFulService.value.requestType || 1);
    });

    const url = computed(() => {
      return restFulService.value.url || '';
    });

    function handleRequestTypeChange(newRequestType: string): void {
      restFulService.value.requestType = Number(newRequestType);
    }

    function handleUrlChange(newUrl: string): void {
      restFulService.value.url = newUrl;
    }

    return () => (
      <div class={bem()}>
        <div class={bem('request-type-row')}>
          <div class={bem('request-type-selector')}>
            <f-combo-list
              modelValue={requestType.value}
              data={[
                { text: 'GET', value: '1' },
                { text: 'POST', value: '2' },
                { text: 'PUT', value: '3' },
                { text: 'DELETE', value: '4' }
              ]}
              valueField="value"
              textField="text"
              enableClear={false}
              editable={false}
              onUpdate:modelValue={handleRequestTypeChange}
            />
          </div>
          <div class={bem('url-input')}>
            <f-textarea
              modelValue={url.value}
              placeholder={'请输入API URL，例如：https://api.example.com/users'}
              lineBreak={false}
              onUpdate:modelValue={handleUrlChange}
            />
          </div>
        </div>
      </div>
    );
  },
});

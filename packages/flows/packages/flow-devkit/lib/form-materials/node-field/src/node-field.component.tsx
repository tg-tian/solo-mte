import { defineComponent } from 'vue';
import { nodeFieldProps } from './node-field.props';
import { useBem } from '@farris/flow-devkit/utils';

import './node-field.scss';

const name = 'FvfNodeField';

export default defineComponent({
  name,
  props: nodeFieldProps,
  emits: [],
  setup(props, context) {
    const { bem } = useBem(name);

    return () => (
      <>
        <div class={[bem('label'), props.labelClass]}>{props.name}</div>
        <div class={[bem('content'), props.contentClass]}>{context.slots.default?.()}</div>
      </>
    );
  },
});

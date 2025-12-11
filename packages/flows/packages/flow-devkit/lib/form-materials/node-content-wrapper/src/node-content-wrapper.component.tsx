import { computed, defineComponent } from 'vue';
import { nodeContentWrapperProps } from './node-content-wrapper.props';
import { useBem } from '@farris/flow-devkit/utils';

import './node-content-wrapper.scss';

const name = 'FvfNodeContentWrapper';

export default defineComponent({
  name,
  props: nodeContentWrapperProps,
  emits: [],
  setup(props, context) {
    const { bem } = useBem(name);

    const contentWrapperClass = computed(() => ({
      [bem()]: true,
      [bem('', 'two-column')]: props.isTwoColumn,
    }));

    return () => (
      <div class={contentWrapperClass.value}>
        {context.slots.default?.()}
      </div>
    );
  },
});

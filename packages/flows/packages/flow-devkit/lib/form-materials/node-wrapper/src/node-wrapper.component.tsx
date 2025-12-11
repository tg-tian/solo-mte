import { defineComponent, computed, type CSSProperties } from 'vue';
import { nodeWrapperProps } from './node-wrapper.props';
import { useBem } from '@farris/flow-devkit/utils';
import { NodeHeader } from '@farris/flow-devkit/form-materials';

import './node-wrapper.scss';

const name = 'FvfNodeWrapper';

export default defineComponent({
  name,
  props: nodeWrapperProps,
  emits: [],
  setup(props, context) {
    const { bem } = useBem(name);

    const wrapperClass = computed(() => ({
      [bem()]: true,
      [bem('', 'selected')]: props.nodeProps?.selected,
    }));

    const width = computed<string | undefined>(() => {
      if (typeof props.width === 'string') {
        return props.width;
      }
      if (typeof props.width === 'number') {
        return `${props.width}px`;
      }
    });

    const wrapperStyle = computed<CSSProperties>(() => ({
      width: width.value || 'auto',
    }));

    function renderNodeHeader() {
      const nodeData = props.nodeProps?.data;
      if (!nodeData) {
        return;
      }
      return (
        <NodeHeader
          modelValue={nodeData.name}
          nodeData={nodeData}
        ></NodeHeader>
      );
    }

    return () => (
      <div class={wrapperClass.value} style={wrapperStyle.value}>
        {renderNodeHeader()}
        {context.slots.default?.()}
      </div>
    );
  },
});

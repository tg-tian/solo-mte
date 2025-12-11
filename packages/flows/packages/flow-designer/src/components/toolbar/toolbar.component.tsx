import { defineComponent, ref } from "vue";
import AddNode from './components/add-node.vue';
import ViewportSelect from './components/viewport.vue';
import { toolbarProps } from "./toolbar.props";
import { MiniMap } from '@vue-flow/minimap';
import { useLayout, useValidate, useVerifyDetailsPanel, useTrialRunPanel } from '@flow-designer/hooks';
import { useNotify } from '@farris/flow-devkit';
import { default as LayoutIcon } from './assets/toolbar/layout.svg';
import { default as ThumbnailIcon } from './assets/toolbar/thumbnail.svg';

import css from './toolbar.module.scss';

export default defineComponent({
  name: 'Toolbar',
  props: toolbarProps,
  emits: [],
  setup() {

    const { layoutAndFitView } = useLayout();

    const notifyService = useNotify();
    const { isFlowValid } = useValidate();
    const verifyDetailsPanel = useVerifyDetailsPanel();
    const { openTrialRunPanel } = useTrialRunPanel();

    const showMiniMap = ref<boolean>(false);

    function onTrialRun(): void {
      if (isFlowValid()) {
        openTrialRunPanel();
      } else {
        notifyService.error('请先解决错误列表中的问题再运行');
        verifyDetailsPanel.show();
      }
    }

    function renderMiniMap() {
      if (!showMiniMap.value) {
        return;
      }
      return (
        <div class={css['minimap-container']}>
          <MiniMap pannable zoomable />
        </div>
      );
    }

    return () => (
      <div class={css['tools']}>
        <div class={css['tools-wrap']}>
          {renderMiniMap()}
          <div class={css['tools-section']}>

            {/* 视口大小 */}
            <ViewportSelect />

            {/* 优化布局 */}
            <f-tooltip content="优化布局" placement="top" trigger="hover">
              <span class={css['tooltip-wrapper']} onClick={layoutAndFitView}>
                <img src={LayoutIcon} alt="优化布局" />
              </span>
            </f-tooltip>

            {/* 缩略图 */}
            <f-tooltip content="缩略图" placement="top" trigger="hover">
              <span
                class={[css['tooltip-wrapper'], showMiniMap.value && css['active']]}
                onClick={() => { showMiniMap.value = !showMiniMap.value }}
              >
                <img src={ThumbnailIcon} alt="缩略图" />
              </span>
            </f-tooltip>

            {/* 分隔符 */}
            <div class={css['divider']}></div>

            {/* 试运行按钮 */}
            <div
              class={css['trial-run-button']}
              onClick={onTrialRun}
            >
              <span class={`f-icon f-icon-play ${css['trial-run-icon']}`}></span>
              <span>试运行</span>
            </div>

            {/* 添加节点按钮 */}
            <AddNode />
          </div>
        </div>
      </div>
    );
  }
});

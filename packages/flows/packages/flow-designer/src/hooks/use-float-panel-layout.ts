import { ref } from "vue";

const currentRightFloatPanelId = ref<string>('');

/**
 * @todo 用于控制设计器上各个悬浮面板的显示状态，待优化
 */
export function useFloatPanelLayout() {

    return {
        currentRightFloatPanelId,
    };
}

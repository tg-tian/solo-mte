import { defineComponent, ref, computed } from 'vue';
import { userPromptEditorProps } from './user-prompt-editor.props';

import './user-prompt-editor.scss';

/**
 * 用户提示词编辑器
 */
export default defineComponent({
  name: 'UserPromptEditor',
  props: userPromptEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const modelValue = computed({
  get: () => props.modelValue,
  set: (value: string) => context.emit('update:modelValue', value)
});
    const isFullscreen = ref(false);

    // 计算是否显示错误提示
    const showError = computed(() => props.isRequired && !modelValue.value);


    /**
     * 处理全屏按钮点击
     */
    const handleFullscreenClick = () => {
      isFullscreen.value = !isFullscreen.value;
    };


    /**
     * 处理 ESC 键退出全屏
     */
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen.value) {
        isFullscreen.value = false;
      }
    };

    return () => (
      <>
        {/* 原始输入框，始终显示 */}
        <div class="user-prompt-editor-wrapper">
          <div class="editor-header">
            <span class="editor-title">{props.title}</span>
            <div class="editor-actions">
              <span
                class="fullscreen-btn"
                onClick={handleFullscreenClick}
                title="最大化"
              >
                <i class="f-icon f-icon-maximization"></i>
              </span>
            </div>
          </div>

          <f-textarea
            class="user-prompt-editor-textarea"
            modelValue={modelValue.value}
            placeholder={props.placeholder}
            resizable={true}
            lineBreak={false}
            onUpdate:modelValue={(value: string) => modelValue.value = value}
          ></f-textarea>

          {/* 必填提示 */}
          {showError.value && (
            <div class="user-prompt-editor-error-tip" title="用户提示词不能为空">
              用户提示词不能为空
            </div>
          )}
        </div>

        {/* 全屏弹窗，只在全屏时显示 */}
        {isFullscreen.value && (
          <div class="user-prompt-editor-modal-overlay" onKeydown={handleKeydown} tabindex="0">
            <div class="user-prompt-editor-modal">
              <div class="editor-header">
                <span class="editor-title">{props.title}</span>
                <div class="editor-actions">
                  <span
                    class="fullscreen-btn"
                    onClick={handleFullscreenClick}
                    title="缩小 (ESC)"
                  >
                    <i class="f-icon f-icon-minimize"></i>
                  </span>
                </div>
              </div>

              <f-textarea
                class="user-prompt-editor-textarea"
                modelValue={modelValue.value}
                placeholder={props.placeholder}
                resizable={false}
                lineBreak={false}
                onUpdate:modelValue={(value: string) => modelValue.value = value}
              ></f-textarea>
            </div>
          </div>
        )}
      </>
    );
  },
});

import { defineComponent, ref, computed } from 'vue';
import { systemPromptEditorProps } from './system-prompt-editor.props';
import { useModal } from './composition/use-modal';

import './system-prompt-editor.scss';

/**
 * 系统提示词编辑器
 */
export default defineComponent({
  name: 'SystemPromptEditor',
  props: systemPromptEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const modelValue = computed({
  get: () => props.modelValue,
  set: (value: string) => context.emit('update:modelValue', value)
});
    const isFullscreen = ref(false);

    
    /**
     * 处理选择模板后的回调
     */
    const handleSelectTemplate = (templateName: string) => {
      modelValue.value = templateName;
    };

    // 使用useModal钩子
    const { openModal } = useModal(props, context as any, handleSelectTemplate);

    /**
     * 处理提示词生成器按钮点击
     */
    const handlePromptGeneratorClick = () => {
      openModal();
    };

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
        <div class="system-prompt-editor-wrapper">
          <div class="editor-header">
            <span class="editor-title">系统提示词</span>
            <div class="editor-actions">
              <span class="prompt-generator-btn" onClick={handlePromptGeneratorClick}>
                模板导入
              </span>
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
            class="system-prompt-editor-textarea"
            modelValue={modelValue.value}
            placeholder="用于设定模型的角色、任务、示例、回复逻辑等，支持插入{{参数名词}}引用对应的参数值"
            resizable={true}
            lineBreak={false}
            onUpdate:modelValue={(value: string) => modelValue.value = value}
          ></f-textarea>
        </div>

        {/* 全屏弹窗，只在全屏时显示 */}
        {isFullscreen.value && (
          <div class="system-prompt-editor-modal-overlay" onKeydown={handleKeydown} tabindex="0">
            <div class="system-prompt-editor-modal">
              <div class="editor-header">
                <span class="editor-title">系统提示词</span>
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
                class="system-prompt-editor-textarea"
                modelValue={modelValue.value}
                placeholder="用于设定模型的角色、任务、示例、回复逻辑等，支持插入{{参数名词}}引用对应的参数值"
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

import { defineComponent, computed } from 'vue';
import { agentSelectorProps } from './agent-selector.props';
import './agent-selector.scss';
import { useModal } from './composition/use-modal';

/**
 * 智能体选择器
 * @description
 * 用于选择智能体，支持弹窗选择
 */
export default defineComponent({
  name: 'AgentSelector',
  props: agentSelectorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    // 获取 nodeData
    const nodeData = computed(() => props.nodeData);

    // 已选智能体列表
    const agentInfo = computed(() => {
      return {
        agentId: nodeData.value.agentId,
        agentCode: nodeData.value.agentCode,
      };
    });

    // 定义处理选择事件的回调函数
    function handleSelectionChange(selection: any) {
      console.log('selection', selection);
      if (selection && Array.isArray(selection)) {
        // 只取第一个选中的智能体（单选模式）
        const agent = selection[0];
        const agentId = agent.agentId;
        const agentCode = agent.agentName;

        if (agentId) {

          // 直接将智能体信息存储到 nodeData 层级
          nodeData.value.agentId = agentId;
          nodeData.value.agentCode = agentCode;

          // 发出更新事件
          context.emit('update:modelValue', agentCode);
        }
      }
    }


    // 将回调函数传递给useModal
    const { openModal } = useModal(props, context as any, handleSelectionChange);

    /**
     * 处理添加智能体按钮点击
     */
    function handleAddAgent() {
      // 打开弹窗，数据获取在useModal中处理
      openModal();
    }

    /**
     * 处理删除智能体
     */
    function handleRemoveAgent() {
        nodeData.value.agentId = '';
        nodeData.value.agentCode = '';

        // 发出更新事件
        context.emit('update:modelValue', '');
    }

    return () => (
      <div class="agent-selector-container">
        <div class="agent-header">
          <span class="agent-title">选择智能体</span>
          <div class="agent-controls">
            <div
              class="add-agent-btn"
              onClick={handleAddAgent}
              title="添加智能体"
            >
              +
            </div>
          </div>
        </div>

        <div class="agent-list">
          {agentInfo.value.agentCode === '' ? (
            <div class="no-agent">暂未选择智能体</div>
          ) : (
            <div class="agent-item">
                <span class="agent-name">{agentInfo.value.agentCode}</span>
                <div
                  class="remove-btn"
                  onClick={() => handleRemoveAgent()}
                  title="移除"
                >
                  ×
                </div>
              </div>
          )}
        </div>
      </div>
    );
  },
});

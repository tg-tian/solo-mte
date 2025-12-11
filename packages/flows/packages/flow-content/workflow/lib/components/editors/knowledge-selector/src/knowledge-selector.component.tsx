import { defineComponent, ref } from 'vue';
import { knowledgeSelectorProps } from './knowledge-selector.props';
import './knowledge-selector.scss';
import { useModal } from './composition/use-modal';

/**
 * 知识库选择器
 * @description
 * 用于选择和管理知识库，支持添加新的知识库并展示已选知识库列表。
 */
export default defineComponent({
  name: 'KnowledgeSelector',
  props: knowledgeSelectorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    // 已选知识库列表
    const knowledgeList = ref<Array<{ kbId: string; kbName: string }>>(props.modelValue);

    // 定义处理选择事件的回调函数
    function handleSelectionChange(selection: any) {
      if (selection && Array.isArray(selection)) {
        // 避免添加重复的知识库
        selection.forEach(kb => {
          // 兼容不同的字段名
          const kbId = kb.id || kb.kbId;
          const kbName = kb.name || kb.kbName;

          if (kbId && kbName) {
            const exists = knowledgeList.value.some(item => item.kbId === kbId);
            if (!exists) {
              knowledgeList.value.push({
                kbId: kbId,
                kbName: kbName
              });
            }
          }
        });

        // 发出更新事件
        context.emit('update:modelValue', knowledgeList.value);
      }
    }

    // 将回调函数传递给useModal
    const { openModal } = useModal(props, context as any, handleSelectionChange);

    /**
     * 处理添加知识库按钮点击
     */
    function handleAddKnowledge() {
      // 打开弹窗，数据获取在useModal中处理
      openModal();
    }

    
    /**
     * 处理删除知识库
     */
    function handleRemoveKnowledge(kbId: string) {
      const index = knowledgeList.value.findIndex(item => item.kbId === kbId);
      if (index > -1) {
        knowledgeList.value.splice(index, 1);
        context.emit('update:modelValue', knowledgeList.value);
      }
    }

    return () => (
      <div class="knowledge-selector-container">
        <div class="knowledge-header">
          <span class="knowledge-title">选择知识库</span>
          <div
            class="add-knowledge-btn"
            onClick={handleAddKnowledge}
            title="添加知识库"
          >
            +
          </div>
        </div>

        <div class="knowledge-list">
          {knowledgeList.value.length === 0 ? (
            <div class="no-knowledge">暂未选择知识库</div>
          ) : (
            knowledgeList.value.map((item) => (
              <div key={item.kbId} class="knowledge-item">
                <span class="knowledge-name">{item.kbName}</span>
                <div
                  class="remove-btn"
                  onClick={() => handleRemoveKnowledge(item.kbId)}
                  title="移除"
                >
                  ×
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
});

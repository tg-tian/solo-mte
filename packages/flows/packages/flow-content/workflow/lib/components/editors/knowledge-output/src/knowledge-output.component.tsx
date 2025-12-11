import { defineComponent, ref } from 'vue';
import { knowledgeOutputProps, KNOWLEDGE_OUTPUT_NAME, type KnowledgeOutputItem } from './knowledge-output.props';
import './knowledge-output.scss';

/**
 * 知识输出组件
 * @description
 * 用于展示和管理知识库输出内容的组件
 */
export default defineComponent({
  name: KNOWLEDGE_OUTPUT_NAME,
  props: knowledgeOutputProps,
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // 输出列表引用
    const outputList = ref<KnowledgeOutputItem[]>(props.modelValue || []);

    /**
     * 添加新的输出项
     */
    const handleAddOutput = () => {
      const newItem: KnowledgeOutputItem = {
        output: '',
        documentId: ''
      };
      outputList.value.push(newItem);
      emitUpdate();
    };

    /**
     * 删除输出项
     * @param index 要删除的项的索引
     */
    const handleRemoveOutput = (index: number) => {
      if (index >= 0 && index < outputList.value.length) {
        outputList.value.splice(index, 1);
        emitUpdate();
      }
    };

    /**
     * 更新输出内容
     * @param index 项的索引
     * @param field 字段名
     * @param value 新值
     */
    const handleUpdateField = (index: number, field: keyof KnowledgeOutputItem, value: string) => {
      if (index >= 0 && index < outputList.value.length) {
        outputList.value[index][field] = value;
        emitUpdate();
      }
    };

    /**
     * 触发更新事件
     */
    const emitUpdate = () => {
      emit('update:modelValue', [...outputList.value]);
    };

    return () => (
      <div class="knowledge-output-container">
        <div class="knowledge-output-header">
          <h3>知识输出配置</h3>
          <button
            class="add-output-btn"
            onClick={handleAddOutput}
            title="添加输出项"
          >
            + 添加输出
          </button>
        </div>

        <div class="knowledge-output-list">
          {outputList.value.map((item, index) => (
            <div key={index} class="knowledge-output-item">
              <div class="knowledge-output-row">
                <label class="output-label">输出内容:</label>
                <input
                  type="text"
                  class="output-input"
                  value={item.output}
                  onChange={(e) => handleUpdateField(index, 'output', (e.target as HTMLInputElement).value)}
                  placeholder="请输入输出内容"
                />
              </div>
              
              <div class="knowledge-output-row">
                <label class="output-label">文档ID:</label>
                <input
                  type="text"
                  class="output-input"
                  value={item.documentId}
                  onChange={(e) => handleUpdateField(index, 'documentId', (e.target as HTMLInputElement).value)}
                  placeholder="请输入文档ID"
                />
              </div>
              
              <button
                class="remove-output-btn"
                onClick={() => handleRemoveOutput(index)}
                title="移除输出项"
              >
                删除
              </button>
            </div>
          ))}
        </div>

        {outputList.value.length === 0 && (
          <div class="knowledge-output-empty">
            暂无输出项，请点击"添加输出"按钮添加
          </div>
        )}
      </div>
    );
  }
});
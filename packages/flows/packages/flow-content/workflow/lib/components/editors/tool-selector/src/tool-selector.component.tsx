import { defineComponent } from 'vue';
import { toolSelectorProps } from './tool-selector.props';
import './tool-selector.scss';
import { useModal } from './composition/use-modal';
import { post, get } from '@/api/request';
import { BasicTypeRefer } from '@farris/flow-devkit';

/**
 * 工具选择器
 * @description
 * 用于选择和管理工具，支持添加新的工具并展示已选工具列表。
 */
export default defineComponent({
  name: 'ToolSelector',
  props: toolSelectorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    // 获取 nodeData
    const nodeData = props.nodeData;

    // 获取工具配置信息
    async function fetchToolConfig(toolId: string) {
      try {
        const response = await get(`/runtime/sys/v1.0/aiToolBuilder/show/specialTool/${toolId}`);
        return response;
      } catch (error) {
        console.error('获取工具配置失败:', error);
        return null;
      }
    }

    // 调用debugParameter接口获取工具参数
    async function fetchToolParameters(toolId: string, resourceType: string, config?: any) {
      try {
        const requestData: any = {
          toolId: toolId,
          resourceType: resourceType
        };

        // 如果有config参数，直接添加到请求中
        if (config) {
          requestData.config = config;
        }

        const response = await post('/runtime/sys/v1.0/aiToolBuilder/tool/debugParameter', requestData);

        return response;
      } catch (error) {
        console.error('获取工具参数失败:', error);
        return null;
      }
    }

    // 定义处理选择事件的回调函数
    async function handleSelectionChange(selection: any) {
      if (selection && Array.isArray(selection) && selection.length > 0 && nodeData) {
        // 只取第一个选中的工具（单选模式）
        const tool = selection[0];

        const toolId =  tool.toolId
        const toolName = tool.toolName
        const resourceType = tool.resourceType || ''

        if (toolId && toolName) {
          // 直接将工具信息存储到 nodeData 层级
          nodeData.toolId = toolId;
          nodeData.toolName = toolName;

          // 发出更新事件，传递 toolId 作为 modelValue
          context.emit('update:modelValue', toolId);

          // 先调用show接口获取工具配置
          const toolConfig = await fetchToolConfig(toolId);

          // 解析config字符串为对象
          let configObj = null;
          if (toolConfig && toolConfig.config) {
            try {
              if (typeof toolConfig.config === 'string') {
                configObj = JSON.parse(toolConfig.config);
              } else {
                configObj = toolConfig.config;
              }
            } catch (error) {
              configObj = {};
            }
          }

          // 处理返回值类型
          if (configObj && configObj.returnValueType) {
            const returnType = configObj.returnValueType;
            let typeRefer = BasicTypeRefer.StringType; // 默认字符串类型

            if (typeof returnType === 'object' && returnType.typeEnum) {
              // 处理复杂类型对象
              const typeEnum = returnType.typeEnum.toLowerCase();
              switch (typeEnum) {
                case 'string':
                  typeRefer = BasicTypeRefer.StringType;
                  break;
                case 'number':
                case 'int':
                case 'integer':
                  typeRefer = BasicTypeRefer.NumberType;
                  break;
                case 'boolean':
                  typeRefer = BasicTypeRefer.BooleanType;
                  break;
                case 'array':
                case 'list':
                  typeRefer = BasicTypeRefer.StringArrayType; // 默认字符串数组
                  break;
                case 'map':
                case 'object':
                  typeRefer = BasicTypeRefer.ObjectType;
                  break;
                default:
                  // 无法匹配标准类型时，使用原始返回的类型信息
                  typeRefer = {
                    source: returnType.source || 'default',
                    typeId: returnType.typeId || returnType.typeEnum?.toLowerCase() || 'any',
                    typeCode: returnType.typeCode || returnType.typeEnum,
                    typeName: returnType.typeName || returnType.typeEnum,
                    kind: returnType.kind
                  };
              }
            } else if (typeof returnType === 'string') {
              // 处理简单字符串类型
              const returnTypeStr = returnType.toLowerCase();
              switch (returnTypeStr) {
                case 'string':
                  typeRefer = BasicTypeRefer.StringType;
                  break;
                case 'number':
                case 'int':
                case 'integer':
                  typeRefer = BasicTypeRefer.NumberType;
                  break;
                case 'boolean':
                  typeRefer = BasicTypeRefer.BooleanType;
                  break;
                case 'array':
                case 'list':
                  typeRefer = BasicTypeRefer.StringArrayType;
                  break;
                case 'map':
                case 'object':
                  typeRefer = BasicTypeRefer.ObjectType;
                  break;
                default:
                  typeRefer = BasicTypeRefer.StringType;
              }
            } else {
              // 如果没有typeEnum也不是字符串，使用原始类型信息
              typeRefer = {
                source: returnType.source || 'default',
                typeId: returnType.typeId || 'any',
                typeCode: returnType.typeCode || 'Unknown',
                typeName: returnType.typeName || 'Unknown',
                kind: returnType.kind
              };
            }

            // 创建输出参数
            const outputParam = {
              id: 'tool_return',
              code: 'result',
              description: '工具调用返回结果',
              type: typeRefer,
              required: false
            };

            // 更新nodeData的outputParams
            nodeData.outputParams = [outputParam];
          }

          // 调用debugParameter接口获取工具参数，传入原始config字符串
          if (resourceType) {
            const paramData = await fetchToolParameters(toolId, resourceType, toolConfig.config);
            if (paramData && typeof paramData === 'object') {
              // 获取对象的key作为输入参数
              const keys = Object.keys(paramData);

              // 构建inputParams数组
              const inputParams = keys.map((key, index) => ({
                id: `tool_param_${index}`,
                code: key,
                description: paramData[key] || `参数: ${key}`,
                type: BasicTypeRefer.StringType, // 默认类型，可根据实际情况调整
                required: false
              }));

              // 更新nodeData的inputParams
              nodeData.inputParams = inputParams;
            }
          }
        }
      }
    }

    // 将回调函数传递给useModal
    const { openModal } = useModal(props, context as any, handleSelectionChange);

    /**
     * 处理添加工具按钮点击
     */
    function handleAddTool() {
      // 打开弹窗，数据获取在useModal中处理
      openModal();
    }

    /**
     * 处理删除工具
     */
    function handleRemoveTool() {
      // 安全检查
      if (nodeData) {
        // 清理 nodeData 中的工具信息
        delete nodeData.toolId;
        delete nodeData.toolName;

        // 重置inputParams和outputParams为默认值
        nodeData.inputParams = [];
        delete nodeData.outputParams;
      }

      // 发出更新事件，传递空字符串
      context.emit('update:modelValue', '');
    }

    return () => (
      <div class="tool-selector-container">
        <div class="tool-header">
          <span class="tool-title">选择工具</span>
          <div
            class="add-tool-btn"
            onClick={handleAddTool}
            title="添加工具"
          >
            +
          </div>
        </div>

        <div class="tool-list">
          {!nodeData?.toolId ? (
            <div class="no-tool">暂未选择工具</div>
          ) : (
            <div class="tool-item">
              <span class="tool-name">{nodeData.toolName}</span>
              <div
                class="remove-btn"
                onClick={handleRemoveTool}
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

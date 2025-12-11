import { defineComponent } from 'vue';
import { mcpSelectorProps } from './mcp-selector.component.props';
import './mcp-selector.component.scss';
import { useModal } from './composition/use-modal';
import { BasicTypeRefer } from '@farris/flow-devkit';

export default defineComponent({
    name: 'MCPSelector',
    props: mcpSelectorProps,
    emits: ['update:modelValue'],
    setup(props, context) {
        const nodeData = props.nodeData;

        // 处理MCP工具选择
        async function handleSelectionChange(selection: any) {
            if (selection && Array.isArray(selection) && selection.length > 0 && nodeData) {
                const mcpTool = selection[0];

                if (mcpTool.mcpToolId && mcpTool.mcpToolName && mcpTool.mcpServerId && mcpTool.mcpServerName) {
                    // 更新节点数据
                    nodeData.mcpServerId = mcpTool.mcpServerId;
                    nodeData.mcpServerName = mcpTool.mcpServerName;
                    nodeData.mcpToolId = mcpTool.mcpToolId;
                    nodeData.mcpToolName = mcpTool.mcpToolName;
                    nodeData.mcpToolDesc = mcpTool.mcpToolDesc;

                    // 解析输入参数
                    const inputParams = parseInputParamsFromSchema(mcpTool.inputSchema);
                    nodeData.inputParams = inputParams;

                    // 发出更新事件
                    context.emit('update:modelValue', mcpTool.mcpToolId);
                }
            }
        }

        // 解析JSON Schema为输入参数
        function parseInputParamsFromSchema(schema: any): any[] {
            const params: any[] = [];

            if (schema && schema.properties) {
                Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
                    let paramType = BasicTypeRefer.StringType;

                    // 根据类型映射
                    switch (prop.type) {
                        case 'number':
                            paramType = BasicTypeRefer.NumberType;
                            break;
                        case 'boolean':
                            paramType = BasicTypeRefer.BooleanType;
                            break;
                        case 'array':
                            paramType = BasicTypeRefer.ArrayType;
                            break;
                        case 'object':
                            paramType = BasicTypeRefer.ObjectType;
                            break;
                        default:
                            paramType = BasicTypeRefer.StringType;
                    }

                    params.push({
                        code: key,
                        type: paramType,
                        description: prop.description || `参数: ${key}`,
                        required: schema.required?.includes(key) || false,
                    });
                });
            }

            // 如果没有参数，添加默认输入参数
            if (params.length === 0) {
                params.push({
                    code: 'input',
                    type: BasicTypeRefer.StringType,
                    description: '输入参数',
                });
            }

            return params;
        }

        // 将回调函数传递给useModal
        const { openModal } = useModal(props, context as any, handleSelectionChange);

        // 打开选择弹窗
        function handleOpenModal() {
            openModal();
        }

        // 移除当前选择的MCP工具
        function handleRemoveMCPTool() {
            if (nodeData) {
                delete nodeData.mcpServerId;
                delete nodeData.mcpServerName;
                delete nodeData.mcpToolId;
                delete nodeData.mcpToolName;
                delete nodeData.mcpToolDesc;

                // 恢复默认输入参数
                nodeData.inputParams = [
                    {
                        code: 'input',
                        type: BasicTypeRefer.StringType
                    }
                ];
            }

            context.emit('update:modelValue', '');
        }

        return () => (
            <div class="mcp-selector-container">
                <div class="mcp-header">
                    <span class="mcp-title">选择MCP工具</span>
                    <div class="add-mcp-btn" onClick={handleOpenModal} title="添加MCP工具">+</div>
                </div>
                <div class="mcp-list">
                    {!nodeData?.mcpToolId ? (
                        <div class="no-mcp">暂未选择MCP工具</div>
                    ) : (
                        <div class="mcp-item">
                            <div class="mcp-info">
                                <div class="mcp-name">{nodeData.mcpToolName}</div>
                                <div class="mcp-description">{nodeData.mcpServerName}</div>
                            </div>
                            <div class="remove-btn" onClick={handleRemoveMCPTool} title="移除">×</div>
                        </div>
                    )}
                </div>
            </div>
        );
    },
});

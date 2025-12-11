import { computed, defineComponent, ref } from 'vue';
import { rpcSelectorProps } from './rpc-selector.props';
import './rpc-selector.scss';
import { useModal } from './composition/use-modal';
import { BasicTypeRefer } from '@farris/flow-devkit';

/**
 * RPC服务选择器
 * @description
 * 用于选择RPC服务，支持单选模式。
 */
export default defineComponent({
  name: 'RpcSelector',
  props: rpcSelectorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    // 获取 nodeData
    const nodeData = props.nodeData as any;

    // 已选RPC服务
    const selectedRpc = computed(() => {
      return {
        su: nodeData.serviceUnit,
        serviceId: nodeData.serviceId,
      }
    });

    // 定义处理选择事件的回调函数
    function handleSelectionChange(selection: any) {
      if (selection && Array.isArray(selection) && selection.length > 0) {
        console.log('RPC Selector - selection:', selection);
        // 只取第一个选中的RPC服务（单选模式）
        const rpc = selection[0];
        const serviceId = rpc.serviceId;
        const su = rpc.su;

        if (serviceId && su) {
          // 检查是否有methodInfo信息（从表格2选择的具体方法）
          let inputParams = [];
          if (rpc.methodInfo?.parameters && Array.isArray(rpc.methodInfo.parameters) && rpc.methodInfo.parameters.length > 0) {
            // 从methodInfo.parameters中提取参数
            inputParams = rpc.methodInfo.parameters.map((param: any) => {
              // 直接保留原始参数信息，让后续转换逻辑处理类型
              return {
                name: param.name,
                type: param.type
              };
            });
          } else {
            nodeData.inputParams = []
          }

          // 处理返回值类型
          let outputParam = null;
          if (rpc.methodInfo && rpc.methodInfo.returnInfo && rpc.methodInfo.returnInfo.type) {
            const returnType = rpc.methodInfo.returnInfo.type;
            let typeRefer = BasicTypeRefer.StringType; // 默认字符串类型

            if (returnType.typeEnum) {
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
            } else {
              // 如果没有typeEnum，使用原始类型信息
              typeRefer = {
                source: returnType.source || 'default',
                typeId: returnType.typeId || 'any',
                typeCode: returnType.typeCode || 'Unknown',
                typeName: returnType.typeName || 'Unknown',
                kind: returnType.kind
              };
            }

            outputParam = {
              id: 'rpc_return',
              code: 'result',
              description: 'RPC调用返回结果',
              type: typeRefer,
              required: false
            };
          }

          const rpcData = {
            su: su,
            serviceId: serviceId,
            inputParams: inputParams,
            outputParam: outputParam
          };

          // 更新nodeData
          if (nodeData) {
            nodeData.serviceUnit = su;
            nodeData.serviceId = serviceId;
            nodeData.rpcServiceList = [rpcData];

            // 更新输入参数 - 转换为输入参数编辑器期望的格式
            if (inputParams.length > 0) {
              const convertedParams = inputParams.map((param: any, index: number) => {
                // 根据RPC参数类型映射到标准类型
                let typeRefer = BasicTypeRefer.StringType; // 默认字符串类型

                if (param.type && typeof param.type === 'object') {
                  // 处理复杂类型对象
                  if (param.type.typeEnum) {
                    const typeEnum = param.type.typeEnum.toLowerCase();
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
                        // 无法匹配标准类型时，使用原始类型信息
                        typeRefer = {
                          source: param.type.source || 'default',
                          typeId: param.type.typeId || param.type.typeEnum?.toLowerCase() || 'any',
                          typeCode: param.type.typeCode || param.type.typeEnum,
                          typeName: param.type.typeName || param.type.typeEnum,
                          kind: param.type.kind
                        };
                    }
                  } else {
                    // 如果没有typeEnum，使用原始类型信息
                    typeRefer = {
                      source: param.type.source || 'default',
                      typeId: param.type.typeId || 'any',
                      typeCode: param.type.typeCode || 'Unknown',
                      typeName: param.type.typeName || 'Unknown',
                      kind: param.type.kind
                    };
                  }
                } else {
                  // 处理简单字符串类型或空类型
                  const paramType = param.type ? String(param.type).toLowerCase() : 'string';
                  switch (paramType) {
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
                }

                return {
                  id: `rpc_param_${index}`,
                  code: param.name,
                  description: '',
                  type: typeRefer,
                  required: false
                };
              });
              nodeData.inputParams = convertedParams;
            }

            // 更新输出参数
            if (outputParam) {
              nodeData.outputParams = [outputParam];
            }

            console.log('更新nodeData完成:', nodeData);
          } else {
            console.log('nodeData为空，无法更新');
          }

          // 发出更新事件
          context.emit('update:modelValue', rpcData);
        }
      }
    }

    // 将回调函数传递给useModal
    const { openModal } = useModal(props, context as any, handleSelectionChange);

    /**
     * 处理添加RPC服务按钮点击
     */
    function handleAddRpc() {
      // 打开弹窗，数据获取在useModal中处理
      openModal();
    }

    /**
     * 处理删除RPC服务
     */
    function handleRemoveRpc() {

      // 清理nodeData
      if (nodeData) {
        delete nodeData.serviceUnit;
        delete nodeData.serviceId;
        delete nodeData.rpcServiceList;
        delete nodeData.outputParams;
      }

      // 发出更新事件
      context.emit('update:modelValue', null);
    }

    return () => (
      <div class="rpc-selector-container">
        <div class="rpc-header">
          <span class="rpc-title">选择RPC服务</span>
          <div
            class="add-rpc-btn"
            onClick={handleAddRpc}
            title="添加RPC服务"
          >
            +
          </div>
        </div>

        <div class="rpc-list">
          {!selectedRpc.value.su ? (
            <div class="no-rpc">暂未选择RPC服务</div>
          ) : (
            <div class="rpc-item">
              <div class="rpc-info">
                <div class="rpc-description">SU: {selectedRpc.value.su}</div>
                <div class="rpc-name">{selectedRpc.value.serviceId}</div>
              </div>
              <div
                class="remove-btn"
                onClick={handleRemoveRpc}
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

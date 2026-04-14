import { defineComponent, computed, ref, nextTick, inject } from 'vue';
import { nodeHeaderProps } from './node-header.props';
import { PROPERTY_PANEL_KEY, type NodeMetadata, type Parameter, type DebugParam } from '@farris/flow-devkit/types';
import { nodeRegistry, useNodeRenderScene, useFlow } from '@farris/flow-devkit/composition';
import { useBem, DebugParameterUtils } from '@farris/flow-devkit/utils';
import { TPopup } from '@farris/flow-devkit/third-party';
import { useNodeDebug } from '@farris/flow-devkit/composition';

import './node-header.scss';

const name = 'FvfNodeHeader';

export default defineComponent({
  name,
  props: nodeHeaderProps,
  emits: ['update:modelValue'],
  setup(props, _context) {
    const { isPropertyPanel, isNode } = useNodeRenderScene();
    const { removeNode, getAllNodes } = useFlow();
    const { bem } = useBem(name);
    const allNodes = getAllNodes();
    const debugHandler = useNodeDebug();
    const isNameEditable = ref(false);
    const isDescEditable = ref(false);
    const nodeName = ref('');
    const nodeDesc = ref('');

    const nameInputRef = ref();
    const descInputRef = ref();

    const nodeData = computed(() => props.nodeData!);
    const nodeType = computed<string>(() => nodeData.value?.kind || '');
    const nodeId = computed<string>(() => nodeData.value?.id || '');
    if (!nodeType.value || !nodeId.value) {
      return () => <></>;
    }

    const nodeMetadata = computed<NodeMetadata | undefined>(() => {
      return nodeRegistry.get(nodeType.value)?.metadata;
    });

    const canRename = computed<boolean>(() => nodeMetadata.value?.canRename !== false);
    const canCopy = computed<boolean>(() => nodeMetadata.value?.canCopy !== false && false);  // @todo 支持复制节点
    const canDelete = computed<boolean>(() => nodeMetadata.value?.deletable !== false);
    const canDebug = computed<boolean>(() => {
      const isNotStartOrEnd = !nodeMetadata.value?.isStartNode && !nodeMetadata.value?.isEndNode;
      const isDebuggable = nodeMetadata.value?.debuggable !== false;
      return isNotStartOrEnd && isDebuggable;
    });

    const shouldRenderRenameTip = computed<boolean>(() => {
      const sameNameNodes = allNodes.value.filter(n => n.data.name === nodeData.value.name);
      return sameNameNodes.length > 1 && canRename.value && isPropertyPanel;
    });
    const renameTip = `节点名称不可重复`;

    const shouldRenderMenu = computed<boolean>(() => {
      return canRename.value || canCopy.value || canDelete.value;
    });
    const shouldRenderDebug = computed<boolean>(() => {
      return canDebug.value; // 显示debug按钮
    });

    const icon = computed<string>(() => {
      const nodeDefinition = nodeRegistry.get(nodeType.value);
      const getNodeIconUrl = nodeDefinition?.getNodeIconUrl;
      return getNodeIconUrl?.(nodeData.value) || nodeMetadata.value?.icon || '';
    });

    const namePlaceholder = '节点';
    const descPlaceholder = '请在这里编辑节点描述...';
    const displayedName = computed<string>(() => {
      return nodeData.value.name || nodeMetadata.value?.label || '';
    });
    const displayedDescription = computed<string>(() => {
      return nodeData.value.description || nodeMetadata.value?.description || '';
    });

    function handleNameEditState(event: MouseEvent): void {
      event.stopPropagation();
      if (!canRename.value) {
        return;
      }
      isNameEditable.value = true;
      nodeName.value = displayedName.value;
      nextTick(() => {
        const inputEl = nameInputRef.value?.$el.querySelector('input');
        inputEl?.focus();
      });
    }

    function onNameInputChange(newValue: string): void {
      nodeName.value = newValue;
    }

    function changeName(name: string): void {
      nodeData.value.name = name;
    }

    function onNameInputBlur(): void {
      isNameEditable.value = false;
      const newName = nodeName.value.trim() || nodeMetadata.value?.label || '';
      changeName(newName);
    }

    function handleDescEditState(): void {
      isDescEditable.value = true;
      nodeDesc.value = displayedDescription.value;
      nextTick(() => {
        const textareaEl = descInputRef.value?.$el.querySelector('textarea');
        textareaEl?.focus();
      });
    }

    function onDescInputChange(newValue: string): void {
      nodeDesc.value = newValue;
    }

    function changeDescription(description: string): void {
      nodeData.value.description = description;
    }

    function onDescInputBlur(): void {
      isDescEditable.value = false;
      const newDesc = nodeDesc.value.trim() || nodeMetadata.value?.description || '';
      changeDescription(newDesc);
    }

    const usePropertyPanel = inject(PROPERTY_PANEL_KEY, null);

    function onClose(): void {
      if (usePropertyPanel) {
        usePropertyPanel.close();
      }
    }

    const isMenuVisible = ref<boolean>(false);

    function closePopover(): void {
      isMenuVisible.value = false;
    }

    function handleRename(event: MouseEvent) {
      closePopover();
      handleNameEditState(event);
    }

    function handleCopy() {
      closePopover();
    }

    function handleDelete() {
      closePopover();
      removeNode(nodeId.value);
    }

    function handleDebug() {
      if (!debugHandler) {
        return;
      }

      // 转换 Parameter[] 为 InputParam[] 格式
      const convertToInputParams = (parameters: Parameter[]): DebugParam[] => {
        if (!parameters || !Array.isArray(parameters)) {
          return [];
        }

        return parameters.map((param, index) => {
          const { type, multiple } = DebugParameterUtils.getDebugParamTypeInfo(param.type);
          return {
            name: param.code || `参数${index}`,
            label: param.code || `参数${index}`,
            type,
            multiple,
            value: param.value || '',
            required: param.required || false,
            description: param.description || '',
            raw: param,
          };
        });
      };

      // 调试时默认使用 input-params 的值作为输入参数
      let allInputParams = convertToInputParams(nodeData.value?.inputParams || []);

      // 获取节点特有的调试参数（如果有传入参数，则替换对应的input-params值）
      try {
        const nodeDefinition = nodeRegistry.get(nodeType.value);
        if (nodeDefinition?.getDebugParams) {
          const debugParams = nodeDefinition.getDebugParams(nodeData.value);
          const debugInputParams = convertToInputParams(debugParams);

          // 如果有调试参数，使用调试参数替换对应的input-params
          if (debugInputParams.length > 0) {
            allInputParams = debugInputParams;
          }
        }
      } catch (error) {
        // 静默处理调试参数获取失败
      }

      // 创建调试数据
      const currentNodeData = {
        nodeId: nodeId.value,
        nodeType: nodeType.value,
        nodeName: displayedName.value,
        nodeData: nodeData.value,
        inputParams: allInputParams
      };

      // 直接调用调试处理器
      debugHandler.openDebugDrawer(currentNodeData);
    }

    function renderMenuContent() {
      return (
        <div class={bem('menu-list')}>
          {canRename.value && (
            <div class={bem('menu-item')} onClick={handleRename}>重命名</div>
          )}
          {canCopy.value && (
            <div class={bem('menu-item')} onClick={handleCopy}>创建副本</div>
          )}
          {canDelete.value && (
            <div class={bem('menu-item')} onClick={handleDelete}>删除</div>
          )}
        </div>
      );
    }

    function renderMenu() {
      return (
        <TPopup
          visible={isMenuVisible.value}
          content={renderMenuContent}
          trigger="hover"
          placement="bottom-right"
          overlayInnerClassName={bem('menu-wrapper')}
          {...{ 'onUpdate:visible': (value: boolean) => { isMenuVisible.value = value } }}
        >
          <div class={bem('icon-btn')}>
            <i class="f-icon f-icon-more-horizontal"></i>
          </div>
        </TPopup>
      );
    }

    function renderDebugInfo() {
      return (
        <div class={bem('icon-btn')} onClick={handleDebug} title="Debug节点">
          <i class="f-icon f-icon-play"></i>
        </div>
      );
    }

    function renderCloseButton() {
      return (
        <div class={bem('icon-btn')} onClick={onClose}>
          <i class="f-icon f-icon-close"></i>
        </div>
      );
    }

    function renderTitleRow() {
      return (
        <div class={bem('title')}>
          <div class={bem('icon')}>
            {icon.value && (
              <img src={icon.value} />
            )}
          </div>
          <div class={bem('text')}>
            {!isNameEditable.value ? (
              <>
                <div
                  class={bem('text-name')}
                  onDblclick={handleNameEditState}
                  title={displayedName.value}
                >
                  <span>{displayedName.value || namePlaceholder}</span>
                </div>
                {shouldRenderRenameTip.value && (
                  <div
                    class={[bem('text-error'), 'fvf-form-item-error']}
                    title={renameTip}
                  >{renameTip}</div>
                )}
              </>
            ) : (
              <f-input-group
                ref={nameInputRef}
                modelValue={nodeName.value}
                enableClear={false}
                onUpdate:modelValue={onNameInputChange}
                onBlur={onNameInputBlur}
              ></f-input-group>
            )}
          </div>
          {shouldRenderDebug.value && renderDebugInfo()}
          {shouldRenderMenu.value && renderMenu()}
          {isPropertyPanel && renderCloseButton()}
        </div>
      );
    }

    function renderDescRow() {
      if (!isPropertyPanel) {
        return;
      }
      return (
        <div class={bem('desc')}>
          {!isDescEditable.value ? (
            <span
              class={bem('description')}
              onClick={handleDescEditState}
              title={displayedDescription.value}
            >{displayedDescription.value || descPlaceholder}</span>
          ) : (
            <f-input-group
              ref={descInputRef}
              type="textarea"
              modelValue={nodeDesc.value}
              showCount={true}
              maxLength={100}
              onUpdate:modelValue={onDescInputChange}
              onBlur={onDescInputBlur}
            ></f-input-group>
          )}
        </div>
      );
    }

    const nodeHeaderClass = computed(() => ({
      [bem()]: true,
      [bem('', 'node')]: isNode,
    }));

    return () => (
      <div class={nodeHeaderClass.value}>
        {renderTitleRow()}
        {renderDescRow()}
      </div>
    );
  },
});

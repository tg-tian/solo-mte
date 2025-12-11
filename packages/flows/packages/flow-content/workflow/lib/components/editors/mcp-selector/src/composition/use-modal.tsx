import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { inject, ref, type SetupContext } from 'vue';
import { fetchMCPCategories, fetchMCPServers, fetchMCPServerDetail } from '../api';

/**
 * MCP分类节点接口定义
 */
interface MCPCategoryNode {
  id: string;
  data: {
    id: string;
    name: string;
    parent: string;
    layer: number;
    collapse?: boolean; // 节点折叠状态，放在data对象内
  };
  hasChildren: boolean; // 是否有子节点
  children?: MCPCategoryNode[]; // 子节点数组
}

/**
 * 构建嵌套的树形数据结构
 * @param categories 平铺的分类节点数组
 * @returns 嵌套的树形数据结构
 */
function buildTreeStructure(categories: MCPCategoryNode[]): MCPCategoryNode[] {
  // 按ID建立映射
  const nodeMap = new Map<string, MCPCategoryNode>();

  // 创建所有节点的副本
  categories.forEach(item => {
    nodeMap.set(item.id, {
      ...item,
      children: [],
      data: { ...item.data }
    });
  });

  const rootNodes: MCPCategoryNode[] = [];

  // 构建父子关系
  categories.forEach(item => {
    const node = nodeMap.get(item.id)!;

    if (item.data.parent && nodeMap.has(item.data.parent)) {
      // 有父节点，添加到父节点的children中
      const parentNode = nodeMap.get(item.data.parent)!;
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push(node);
    } else {
      // 没有父节点或父节点不在当前数据中，作为根节点
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

/**
 * 排序分类数据，确保父节点在子节点之前
 */
function sortCategoriesByParentChild(categories: MCPCategoryNode[]): MCPCategoryNode[] {
  const result: MCPCategoryNode[] = [];
  const processed = new Set<string>();

  // 递归处理节点及其子节点
  function processNode(node: MCPCategoryNode) {
    if (processed.has(node.id)) return;

    // 先处理父节点
    if (node.parent && !processed.has(node.parent)) {
      const parentNode = categories.find(n => n.id === node.parent);
      if (parentNode) {
        processNode(parentNode);
      }
    }

    // 处理当前节点
    result.push(node);
    processed.add(node.id);

    // 处理子节点
    const children = categories.filter(n => n.parent === node.id);
    children.forEach(child => processNode(child));
  }

  // 处理所有根节点（没有父节点的节点）
  const rootNodes = categories.filter(n => !n.parent || n.parent === '');
  rootNodes.forEach(node => processNode(node));

  // 处理可能遗漏的节点
  categories.forEach(node => {
    if (!processed.has(node.id)) {
      result.push(node);
      processed.add(node.id);
    }
  });

  return result;
}

export function useModal(
    props: any,
    context: SetupContext,
    onSelect?: (selection: any) => void
) {
  const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
  const modalInstance = ref();
  const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);
  const selectedData = ref<any>();
  const tempSelectedTool = ref<any>();
  const TIP_SELECT_VAR = '请选择一个MCP工具';

  // 数据状态
  const treeData = ref<MCPCategoryNode[]>([]);
  const serverList = ref<any[]>([]);
  const filteredServerList = ref<any[]>([]);
  const expandedServers = ref<Set<string>>(new Set());
  const loadingServers = ref<boolean>(false);
  const selectedServerId = ref<string>('');
  const treeGridComponentInstance = ref<any>();
  const dataGridRef1 = ref<any>();
  const dataGridRef2 = ref<any>();
  const mcpFilterValue = ref('');

  // 表格列配置
  const serverColumns = [
    { title: '服务名称', field: 'mcpServerName', width: '100%' }
  ];

  const toolColumns = [
    { title: '工具名称', field: 'mcpToolName', width: '30%' },
    { title: '工具详情', field: 'mcpToolDesc', width: '70%' }
  ];

  function closeModal(): void {
    if (modalInstance.value) {
      modalInstance.value.destroy();
      modalInstance.value = null;
    }
  }

  function notify(message: string): void {
    if (notifyService) {
      notifyService.globalConfig.position = 'top-center';
      notifyService.globalConfig.showCloseButton = true;
      notifyService.globalConfig.timeout = 3000;
    }
    notifyService?.warning({ message });
  }

  function acceptCallback() {
    if (!selectedData.value || selectedData.value.length === 0) {
      notify(TIP_SELECT_VAR);
      return;
    }

    if (selectedData.value && onSelect) {
      onSelect(selectedData.value);
    }
    closeModal();
  }

  /**
   * MCP服务信息筛选处理
   */
  const onMcpFilterChange = (value: string) => {
    mcpFilterValue.value = value;
    if (!value || value.trim() === '') {
      filteredServerList.value = [...serverList.value];
    } else {
      const filterValue = value.toLowerCase().trim();
      filteredServerList.value = serverList.value.filter((item: any) =>
        item.mcpServerName && item.mcpServerName.toLowerCase().includes(filterValue)
      );
    }

    // 更新表格数据源并清除选中状态
    if (dataGridRef1.value) {
      dataGridRef1.value.updateDataSource(filteredServerList.value);
      dataGridRef1.value.clearSelection?.(); // 清除表格1的选中状态
    }

    // 清空右侧工具表格和选中状态
    selectedServerId.value = '';
    selectedData.value = [];
    tempSelectedTool.value = null;
    expandedServers.value.clear();

    if (dataGridRef2.value) {
      dataGridRef2.value.updateDataSource([]);
      dataGridRef2.value.clearSelection?.();
    }
  };

  function rejectCallback() {
    closeModal();
  }

  // 配置变量
  const rowNumberOption = {
    enable: false
  };

  const pageSize = ref(50);
  const pageIndex = ref(0);

  /** 树节点图标 */
  const treeNodeIconsData = {
      // 折叠状态
      fold: 'f-icon f-icon-folder text-info',
      // 展开状态
      unfold: 'f-icon f-icon-folder-open text-info',
      // 叶子节点
      leafnodes: 'f-icon f-icon-file text-info',
  };

  const gridSelectionOption = {
      enableSelectRow: true,
  };

  const selectionOption = {
    showCheckbox: false,
    multiSelect: false,
    enableSelectRow: true,
  };

  /**
   * 获取MCP分类列表
   */
  const getMCPCategoryList = async () => {
    try {
      const categories = await fetchMCPCategories();

      if (!categories || !Array.isArray(categories)) {
        treeData.value = [];
        return;
      }

      // 转换为 f-tree-grid 期望的格式
      const mcpCategories: MCPCategoryNode[] = categories.map(item => ({
        id: item.mcpCategoryId,
        data: {
          id: item.mcpCategoryId,
          name: item.mcpCategoryName,
          parent: item.parentId || '',
          layer: Number(item.categoryLevel),
          collapse: true, // 默认收起节点，放在data对象内
        },
        hasChildren: false, // 初始设为false，后面会更新
        children: []
      }))

      // 计算哪些节点有子节点
      mcpCategories.forEach(item => {
        const hasChildren = mcpCategories.some(child => child.data.parent === item.id);
        item.hasChildren = hasChildren;
      })

      // 构建嵌套的树形数据结构
      const treeStructuredData = buildTreeStructure(mcpCategories);

      treeData.value = treeStructuredData;

      // 更新组件数据源
      if (treeGridComponentInstance.value) {
        treeGridComponentInstance.value.updateDataSource(treeData.value);
      }
    } catch (error) {
      console.error('获取MCP分类列表失败:', error);
      treeData.value = [];
    }
  };

  /**
   * 获取MCP服务器列表
   */
  const getMCPServerList = async (params: any) => {
    try {
      loadingServers.value = true;
      const response = await fetchMCPServers(params);

      if (!response || !response.mcpServerInfoList) {
        serverList.value = [];
        expandedServers.value.clear();
        selectedServerId.value = '';
        selectedData.value = [];
        tempSelectedTool.value = null;
        loadingServers.value = false;

        // 清空右侧表格显示并清除选中状态
        if (dataGridRef1.value) {
          dataGridRef1.value.updateDataSource([]);
          dataGridRef1.value.clearSelection?.();
        }
        if (dataGridRef2.value) {
          dataGridRef2.value.updateDataSource([]);
          dataGridRef2.value.clearSelection?.();
        }
        return;
      }

      const servers = response.mcpServerInfoList;
      serverList.value = servers.map(server => ({
        ...server,
        tools: []
      }));

      // 预加载服务器详情
      for (const server of servers) {
        if (server.mcpServerId) {
          const detail = await fetchMCPServerDetail(server.mcpServerId);
          if (detail && detail.mcpToolList) {
            const serverItem = serverList.value.find(s => s.mcpServerId === server.mcpServerId);
            if (serverItem) {
              serverItem.tools = detail.mcpToolList;
              serverItem.toolCount = detail.mcpToolList.length;
            }
          }
        }
      }

      // 应用筛选
      if (!mcpFilterValue.value || mcpFilterValue.value.trim() === '') {
        filteredServerList.value = [...serverList.value];
      } else {
        const filterValue = mcpFilterValue.value.toLowerCase().trim();
        filteredServerList.value = serverList.value.filter((item: any) =>
          item.mcpServerName && item.mcpServerName.toLowerCase().includes(filterValue)
        );
      }

      // 手动刷新表格
      if (dataGridRef1.value) {
        dataGridRef1.value.updateDataSource(filteredServerList.value);
      }

      loadingServers.value = false;
    } catch (error) {
      serverList.value = [];
      filteredServerList.value = [];
      loadingServers.value = false;
    }
  };


  const onSelectionChange = function(dataItem: any) {
    /**
     * 递归收集节点及其所有子节点的ID
     * @param node 选中的节点
     * @returns 包含所有节点ID的数组
     */
    const collectAllNodeIds = (node: MCPCategoryNode): string[] => {
      const allIds: string[] = [node.id];

      // 如果节点有子节点，递归收集所有子节点ID
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          allIds.push(...collectAllNodeIds(child));
        });
      }

      return allIds;
    };

    // 处理选中的节点（可能是单个节点或数组）
    let allSelectedIds: string[] = [];

    if (Array.isArray(dataItem)) {
      // 如果是数组，处理每个节点
      dataItem.forEach(node => {
        allSelectedIds.push(...collectAllNodeIds(node));
      });
    } else if (dataItem) {
      // 如果是单个节点
      allSelectedIds = collectAllNodeIds(dataItem);
    }

      // 更新表格数据
    const params: {
      firstCategoryId: string | undefined;
      secondCategoryId: string | undefined;
      page: number;
      pageSize: number;
    } = {
      firstCategoryId: undefined,
      secondCategoryId: undefined,
      page: pageIndex.value,
      pageSize: pageSize.value,
    };

    // 根据选中的节点确定分类参数
    if (dataItem && dataItem.length > 0) {
      const selectedNode = dataItem[0];
      const layer = selectedNode.data?.layer;
      const parentId = selectedNode.data?.parent;

      if (layer === 1) {
        params.firstCategoryId = selectedNode.id;
      } else if (layer === 2 && parentId) {
        // 直接使用 data.parent 字段作为父节点ID
        params.firstCategoryId = parentId;
        params.secondCategoryId = selectedNode.id;
      }

      // 清空筛选框和选中状态
      mcpFilterValue.value = '';
      selectedData.value = [];
      tempSelectedTool.value = null;

      // 点击行，获取服务器列表
      getMCPServerList(params);
    } else {
      // 如果没有选中节点或选中为空，清空右侧表格数据
      serverList.value = [];
      filteredServerList.value = [];
      expandedServers.value.clear();
      selectedServerId.value = '';
      selectedData.value = [];
      tempSelectedTool.value = null;
      mcpFilterValue.value = '';

      // 手动刷新表格显示空数据并清除选中状态
      if (dataGridRef1.value) {
        dataGridRef1.value.updateDataSource([]);
        dataGridRef1.value.clearSelection?.();
      }
      if (dataGridRef2.value) {
        dataGridRef2.value.updateDataSource([]);
        dataGridRef2.value.clearSelection?.();
      }
    }
  }

  // 切换服务器展开/收起状态
  function toggleServer(serverId: string) {
    if (expandedServers.value.has(serverId)) {
      expandedServers.value.delete(serverId);
      selectedServerId.value = '';
    } else {
      expandedServers.value.add(serverId);
      selectedServerId.value = serverId;
    }

    // 刷新工具表格
    const selectedServer = serverList.value.find(s => s.mcpServerId === selectedServerId.value);
    const toolsData = selectedServer && expandedServers.value.has(selectedServerId.value)
      ? selectedServer.tools || []
      : [];

    if (dataGridRef2.value) {
      dataGridRef2.value.updateDataSource(toolsData);
    }
  }

  // 处理工具选择
  function handleToolSelection(serverId: string, tool: any) {
    const server = serverList.value.find(s => s.mcpServerId === serverId);
    if (server) {
      tempSelectedTool.value = {
        ...tool,
        mcpServerId: serverId,
        mcpServerName: server.mcpServerName,
      };
    }
  }

  // 确认选择
  function confirmSelection() {
    if (tempSelectedTool.value && onSelect) {
      onSelect([tempSelectedTool.value]);
      closeModal();
    } else {
      // 如果没有选择工具，显示提示
      notifyService.warning('请先选择一个MCP工具');
    }
  }

  function renderModalContent() {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        {/* 左侧分类 - 保持原来的tree-grid */}
        <div style={{ width: '200px', borderRight: '1px solid #e8e8e8', padding: '8px' }}>
          <f-tree-grid
              ref={treeGridComponentInstance}
              data={treeData.value}
              fit={true}
              show-tree-node-icons={true}
              tree-node-icons-data={treeNodeIconsData}
              row-number={rowNumberOption}
              columns={[
                { field: 'name', title: '分类名称', width: '100%', dataType: 'string' },
              ]}
              hierarchy={{
                autoCheckChildren: false,
                autoCheckParent: false,
                selectionRange: 'All',
                hasChildrenField: 'hasChildren',
                collapseField: 'collapse',
              }}
              collapseField='collapse'
              collapseTo={1}
              virtualized={true}
              selection={gridSelectionOption}
              onSelectionChange={onSelectionChange}
          ></f-tree-grid>
        </div>

        {/* 右侧表格区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' }}>
          {/* MCP服务信息 - 只显示服务名 */}
          <div style={{ height: '300px', marginBottom: '16px' }}>
            {/* MCP服务信息筛选框 */}
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', fontSize: '14px' }}>服务名称:</span>
              <input
                type="text"
                value={mcpFilterValue.value}
                onInput={(e: any) => onMcpFilterChange(e.target.value)}
                placeholder="请输入MCP服务信息进行筛选"
                style={{
                  width: '200px',
                  padding: '4px 8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>MCP服务信息</div>
            <f-data-grid
              ref={dataGridRef1}
              data={filteredServerList.value}
              columns={serverColumns}
              selectionOptions={selectionOption}
              onSelectionChange={(selection) => {
                if (selection && selection.length > 0) {
                  const selectedServer = selection[0];
                  selectedServerId.value = selectedServer.mcpServerId;
                  toggleServer(selectedServer.mcpServerId);
                }
              }}
              pagination={null}
              fit={true}
              rowNumber={{
                enable: true,
                width: 45,
                showEllipsis: true,
                heading: "序号",
              }}
            ></f-data-grid>
          </div>

          {/* MCP工具信息 - 显示工具名和工具详情 */}
          <div style={{ height: '300px', marginTop: '50px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>MCP工具信息</div>
            <f-data-grid
              ref={dataGridRef2}
              data={selectedServerId.value && expandedServers.value.has(selectedServerId.value)
                ? serverList.value.find(s => s.mcpServerId === selectedServerId.value)?.tools || []
                : []
              }
              columns={toolColumns}
              selectionOptions={selectionOption}
              onSelectionChange={(selection) => {
                if (selection && selection.length > 0) {
                  const selectedTool = selection[0];
                  const server = serverList.value.find(s => s.mcpServerId === selectedServerId.value);
                  if (server) {
                    tempSelectedTool.value = {
                      ...selectedTool,
                      mcpServerId: selectedServerId.value,
                      mcpServerName: server.mcpServerName,
                    };
                  }
                }
              }}
              pagination={null}
              fit={true}
              rowNumber={{
                enable: true,
                width: 45,
                showEllipsis: true,
                heading: "序号",
              }}
            ></f-data-grid>
          </div>
        </div>
      </div>
    )
  }

  function openModal() {
    // 清空所有数据
    treeData.value = [];
    serverList.value = [];
    filteredServerList.value = [];
    expandedServers.value.clear();
    loadingServers.value = false;
    selectedServerId.value = '';
    selectedData.value = [];
    mcpFilterValue.value = '';
    tempSelectedTool.value = null;

    // 获取MCP分类列表
    getMCPCategoryList();

    // 初始化tempSelectedTool为当前已选择的数据
    if (props.nodeData?.mcpToolId) {
      tempSelectedTool.value = {
        mcpToolId: props.nodeData.mcpToolId,
        mcpToolName: props.nodeData.mcpToolName,
        mcpServerId: props.nodeData.mcpServerId,
        mcpServerName: props.nodeData.mcpServerName,
        mcpToolDesc: props.nodeData.mcpToolDesc
      };
    } else {
      tempSelectedTool.value = null;
    }

    modalInstance.value = modalService.open({
      title: 'MCP工具选择',
      width: 900,
      height: 850, // 固定高度
      render: renderModalContent,
      buttons: [,{
        name: 'close',
        class: 'btn btn-secondary',
        handle: rejectCallback,
        text: '取消',
      },{
        name: 'confirm',
        class: 'btn btn-primary',
        handle: confirmSelection,
        text: '确定'
      }],
      draggable: true,
      resizeable: false, // 禁止调整大小，固定尺寸
      showMaxButton: false,
      showCloseButton: true,
      fitContent: false
    });
  }

  return {
    openModal,
    selectedData
  }
}

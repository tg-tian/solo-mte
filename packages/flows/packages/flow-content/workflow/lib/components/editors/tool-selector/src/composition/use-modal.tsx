import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { inject, ref, type SetupContext } from 'vue';
import { get, post } from '@/api/request';

/**
 * 工具分类节点接口定义
 */
interface CategoryNode {
  id: string;
  data: {
    id: string;
    name: string;
    parent: string;
    layer: number;
    collapse?: boolean; // 节点折叠状态，放在data对象内
  };
  hasChildren: boolean; // 是否有子节点
  children?: CategoryNode[]; // 子节点数组
}

export function useModal(
    props: any,
    context: SetupContext,
    onSelect?: (selection: any) => void,
    options?: {
      /** 是否在选中父节点时包含所有子节点的ID */
      includeChildrenOnSelect?: boolean;
    }
) {
  const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
  const modalInstance = ref();
  const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);
  const selectedData = ref<any>();
  const TIP_SELECT_VAR = '请选择一个工具';

  // 配置选项
  const config = {
    includeChildrenOnSelect: options?.includeChildrenOnSelect ?? true, // 默认包含子节点
  };

  // 数据状态
  const treeData = ref<CategoryNode[]>([]);
  const tableData = ref([]);
  const filteredTableData = ref([]);
  const treeGridComponentInstance = ref<any>();
  const dataGridRef = ref<any>();
  const toolFilterValue = ref('');

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
   * 工具名称筛选处理
   */
  const onToolFilterChange = (value: string) => {
    toolFilterValue.value = value;
    if (!value || value.trim() === '') {
      filteredTableData.value = [...tableData.value];
    } else {
      const filterValue = value.toLowerCase().trim();
      filteredTableData.value = tableData.value.filter((item: any) =>
        item.toolName && item.toolName.toLowerCase().includes(filterValue)
      );
    }

    // 更新表格数据源并清除选中状态
    if (dataGridRef.value) {
      dataGridRef.value.updateDataSource(filteredTableData.value);
      dataGridRef.value.clearSelection?.(); // 清除表格的选中状态
    }

    // 清空选中数据
    selectedData.value = [];
  };

  function rejectCallback() {
    closeModal();
  }

  const rowNumberOption = {
    enable: false
  }

  const selectionOption = {
    showCheckbox: false,
    multiSelect: false,
    enableSelectRow: true,
  }

  const columns = [
      { field: 'toolName', title: '工具名称', width: '25%', resizable: true, dataType: 'string' },
      { field: 'toolCode', title: '工具编号', width: '25%', resizable: true, dataType: 'string' },
      { field: 'funcName', title: '方法名称', width: '25%', resizable: true, dataType: 'string' },
      { field: 'resource', title: '来源', width: '25%', resizable: true, dataType: 'string' },
    ];

  const pageSize = ref(20);
  const pageIndex = ref(1);

  const pagination = ref({
    enable: true,
    size: pageSize.value,
    sizeLimits: [10, 20, 30, 50, 100],
  })

  function pageSizeChange(event: any) {
    pageSize.value = event.pageSize;
    pagination.value.size = event.pageSize;
    dataGridRef.value?.updateDataSource(tableData.value);
  }

  function pageIndexChange(event: any) {
    pageIndex.value = event.pageIndex;
  }

  /** 树节点图标 */
  const treeNodeIconsData = {
      // 折叠状态
      fold: 'f-icon f-icon-folder text-info',
      // 展开状态
      unfold: 'f-icon f-icon-folder-open text-info',
      // 叶子节点
      leafnodes: 'f-icon f-icon-file text-info',
  };

  const gridSelectionOption =  {
      enableSelectRow: true,
  };

  const rowOption = {
    customRowStatus: (visualData: any) => {
      // 确保有子节点的项默认折叠
      if (visualData.raw.layer === 1 && visualData.collapse === undefined) {
        visualData.collapse = true;
      }
      return visualData;
    }
  };

  /**
   * 获取工具分类列表
   */
  const getToolCategoryList = async () => {
    try {
      const res = await get('/runtime/bcc/v1.0/billcategory/billcategories');

      if (!res || !Array.isArray(res)) {
        treeData.value = [];
        return;
      }

      // 转换为 f-tree-grid 期望的格式
      const categories: CategoryNode[] = res.filter(item => item.hierarchyLevel === 1 || item.hierarchyLevel === 2).map(item => ({
        id: item.id,
        data: {
          id: item.id,
          name: item.name,
          parent: item.parentId || '',
          layer: item.hierarchyLevel,
          collapse: true, // 默认收起节点，放在data对象内
        },
        hasChildren: false, // 初始设为false，后面会更新
        children: []
      }))

      // 计算哪些节点有子节点
      categories.forEach(item => {
        const hasChildren = categories.some(child => child.data.parent === item.id);
        item.hasChildren = hasChildren;
      })

      // 构建嵌套的树形数据结构
      const treeStructuredData = buildTreeStructure(categories);

      treeData.value = treeStructuredData;

      // 更新组件数据源
      if (treeGridComponentInstance.value) {
        treeGridComponentInstance.value.updateDataSource(treeData.value);
        // 确保所有节点折叠
        setTimeout(() => {
          treeGridComponentInstance.value?.collapseTo(0);
        }, 100);
      }
    } catch (error) {
      console.error('获取工具分类列表失败:', error);
      treeData.value = [];
    }
  };

  const getToolList = async (params: any) => {
    const res = await post('/runtime/sys/v1.0/aiToolBuilder/filter/tool', params);
    tableData.value = res.filterTools || [];

    // 应用筛选
    if (!toolFilterValue.value || toolFilterValue.value.trim() === '') {
      filteredTableData.value = [...tableData.value];
    } else {
      const filterValue = toolFilterValue.value.toLowerCase().trim();
      filteredTableData.value = tableData.value.filter((item: any) =>
        item.toolName && item.toolName.toLowerCase().includes(filterValue)
      );
    }

    dataGridRef.value?.updateDataSource(filteredTableData.value);
  }

  const onSelectionChange = function(dataItem: any) {
    /**
     * 递归收集节点及其所有子节点的ID
     * @param node 选中的节点
     * @returns 包含所有节点ID的数组
     */
    const collectAllNodeIds = (node: CategoryNode): string[] => {
      const allIds: string[] = [node.id];

      // 如果配置了包含子节点，且有子节点，递归收集所有子节点ID
      if (config.includeChildrenOnSelect && node.children && node.children.length > 0) {
        node.children.forEach(child => {
          allIds.push(...collectAllNodeIds(child));
        });
      }

      return allIds;
    };

    /**
     * 只收集选中节点的ID，不包含子节点
     * @param nodes 选中的节点数组
     * @returns 包含选中节点ID的数组
     */
    const collectSelectedNodeIds = (nodes: any[]): string[] => {
      return nodes.map(node => node.id || node.data?.id).filter(id => id);
    };

    let allSelectedIds: string[] = [];

    if (Array.isArray(dataItem)) {
      // 如果是数组，处理每个节点
      if (config.includeChildrenOnSelect) {
        dataItem.forEach(node => {
          allSelectedIds.push(...collectAllNodeIds(node));
        });
      } else {
        allSelectedIds = collectSelectedNodeIds(dataItem);
      }
    } else if (dataItem) {
      // 如果是单个节点
      if (config.includeChildrenOnSelect) {
        allSelectedIds = collectAllNodeIds(dataItem);
      } else {
        allSelectedIds = [dataItem.id || dataItem.data?.id].filter(id => id);
      }
    }

    
    const params = {
      businessTypeIds: allSelectedIds,
      page: pageIndex.value - 1,
      pageSize: pageSize.value
    };

    // 清空筛选框和选中状态
    toolFilterValue.value = '';
    selectedData.value = [];

    // 点击行，获取工具列表
    getToolList(params);
  }

  /**
   * 按照父子关系排序分类节点，确保子节点紧跟在父节点后面
   * @param categories 原始分类节点数组
   * @returns 排序后的分类节点数组
   */
  function sortCategoriesByParentChild(categories: CategoryNode[]): CategoryNode[] {
    // 使用Map按parentId分组子节点，降低查找复杂度
    const childMap = new Map<string, CategoryNode[]>();

    // 预分组所有节点
    categories.forEach(category => {
      const parentId = category.parent || '';
      if (!childMap.has(parentId)) {
        childMap.set(parentId, []);
      }
      childMap.get(parentId)?.push(category);
    });

    // 存储最终排序结果
    const sortedData: CategoryNode[] = [];
    // 存储已处理的节点ID，避免重复处理
    const processedIds = new Set<string>();

    /**
     * 递归处理节点及其子节点
     * @param parentId 父节点ID
     */
    const processNode = (parentId: string) => {
      const nodes = childMap.get(parentId) || [];

      for (const node of nodes) {
        if (!processedIds.has(node.id)) {
          // 添加当前节点
          sortedData.push(node);
          processedIds.add(node.id);

          // 递归处理其子节点
          if (childMap.has(node.id)) {
            processNode(node.id);
          }
        }
      }
    };

    // 从根节点开始处理（parent为空的节点）
    processNode('');

    // 如果还有未处理的节点（可能存在孤立节点或环），将它们添加到末尾
    categories.forEach(node => {
      if (!processedIds.has(node.id)) {
        sortedData.push(node);
        processedIds.add(node.id);
      }
    });

    return sortedData;
  }

  function onTableSelectionChange(selection: Array<any>) {
    selectedData.value = selection;
  }

  /**
   * 构建嵌套的树形数据结构
   * @param categories 平铺的分类节点数组
   * @returns 嵌套的树形数据结构
   */
  function buildTreeStructure(categories: CategoryNode[]): CategoryNode[] {
    // 按ID建立映射
    const nodeMap = new Map<string, CategoryNode>();

    // 创建所有节点的副本
    categories.forEach(item => {
      nodeMap.set(item.id, {
        ...item,
        children: [],
        data: { ...item.data }
      });
    });

    const rootNodes: CategoryNode[] = [];

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

  function renderModalContent() {
    return (
      <div class="prompt-generator-content">
        <div class="fv-grid">
          <f-tree-grid
              ref={treeGridComponentInstance}
              data={treeData.value}
              fit={true}
              show-tree-node-icons={true}
              tree-node-icons-data={treeNodeIconsData}
              row-number={rowNumberOption}
              columns={[
                { field: 'name', title: '文件名', width: '100%', dataType: 'string' },
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
              row-option={rowOption}
              onSelectionChange={onSelectionChange}
          ></f-tree-grid>
        </div>
        <div class="fv-table">
          {/* 工具名称筛选框 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
            <span style={{ marginRight: '8px', fontSize: '14px' }}>工具名称:</span>
            <input
              type="text"
              value={toolFilterValue.value}
              onInput={(e: any) => onToolFilterChange(e.target.value)}
              placeholder="请输入工具名称进行筛选"
              style={{
                width: '200px',
                padding: '4px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e: any) => {
                e.target.style.borderColor = '#40a9ff';
                e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.2)';
              }}
              onBlur={(e: any) => {
                e.target.style.borderColor = '#d9d9d9';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <f-data-grid
            ref={dataGridRef}
            width={550}
            height={445}
            columns={columns}
            data={filteredTableData.value}
            fit={true}
            pagination={pagination.value}
            row-number={rowNumberOption}
            selection={selectionOption}
            onSelectionChange={onTableSelectionChange}
            onPageSizeChanged={pageSizeChange}
            onPageIndexChanged={pageIndexChange}
          ></f-data-grid>
        </div>
      </div>
    )
  }

  function openModal() {
    // 清空筛选状态
    toolFilterValue.value = '';

    // 获取工具分类列表
    getToolCategoryList();

    modalInstance.value = modalService.open({
      title: '工具选择',
      width: 800,
      height: 600,
      render: renderModalContent,
      buttons: [{
        name: 'cancel',
        class: 'btn btn-secondary',
        handle: rejectCallback,
        text: '取消',
      }, {
        name: 'confirm',
        class: 'btn btn-primary',
        handle: acceptCallback,
        text: '确定',
      }],
      draggable: true,
      resizeable: true,
      showMaxButton: false,
      showCloseButton: true,
      fitContent: false,
      opened: () => {
        // 模态框打开后确保节点折叠
        setTimeout(() => {
          if (treeGridComponentInstance.value) {
            treeGridComponentInstance.value.collapseTo(0);
          }
        }, 200);
      }
    });
  }

  return {
    openModal,
    selectedData
  }
}

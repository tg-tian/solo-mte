import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { inject, ref, type SetupContext } from 'vue';
import { get, post } from '@/api/request';

/**
 * 提示词分类节点接口定义
 */
interface CategoryNode {
  id: string;
  name: string;
  parent: string;
  layer: number;
}

export function useModal(
    props: any,
    context: SetupContext,
    onSelect?: (selection: string) => void
) {
  const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
  const modalInstance = ref();
  const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);
  const selectedData = ref<any>();
  const TIP_SELECT_VAR = '请选择一条系统提示词';

  // 数据状态
  const treeData = ref<CategoryNode[]>([]);
  const tableData = ref([]);
  const treeGridComponentInstance = ref<any>();
  const dataGridRef = ref<any>();

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
      onSelect(selectedData.value[0].content);
    }
    closeModal();
  }

  function rejectCallback() {
    closeModal();
  }

  const rowNumberOption = {
    enable: false
  }

  const selectionOption = {
    showCheckbox: true
  }

  const columns = [
      {
          title: '模板名称',
          field: 'name',
          width: '50%'
      },
     {
          title: '推荐模型',
          field: 'params',
          width: '50%'
      }
  ]

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

  /**
   * 获取提示词模板分类列表
   */
  const getPromptTemplateCategoryList = async () => {
    try {
      const res = await get('/runtime/bcc/v1.0/billcategory/billcategories');

      if (!res || !Array.isArray(res)) {
        treeData.value = [];
        return;
      }

      // 转换为标准格式
      const categories: CategoryNode[] = res.filter(item => item.hierarchyLevel === 1 || item.hierarchyLevel === 2).map(item => ({
        id: item.id,
        name: item.name,
        parent: item.parentId || '',
        layer: item.hierarchyLevel,
      }))

      // 使用独立的排序函数处理父子节点顺序
      const sortedData = sortCategoriesByParentChild(categories);

      treeData.value = sortedData;

      // 更新组件数据源
      if (treeGridComponentInstance.value) {
        treeGridComponentInstance.value.updateDataSource(treeData.value);
      }
    } catch (error) {
      console.error('获取提示词模板分类列表失败:', error);
      treeData.value = [];
    }
  };

  const getPromptTemplateList = async (params: any) => {
    const res = await post('/runtime/sys/v1.0/aiPromptBuilder/filter/prompt', params);
    tableData.value =  res.filterPrompts || []
    dataGridRef.value?.updateDataSource(tableData.value)
  }

  const onSelectionChange = function(dataItem: any) {
    // 收集所有选中节点及其子节点的id
    const collectAllChildIds = (nodes: any[], allNodes: CategoryNode[]) => {
      const allIds = new Set<string>();

      // 递归函数查找子节点
      const findChildren = (parentId: string) => {
        allIds.add(parentId);
        // 查找所有直接子节点
        const children = allNodes.filter(node => node.parent === parentId);
        // 递归处理每个子节点
        children.forEach(child => {
          findChildren(child.id);
        });
      };

      // 处理每个选中的节点
      nodes.forEach(node => {
        findChildren(node.id);
      });

      return Array.from(allIds);
    };

    // 获取所有树节点数据
    const allNodes = treeData.value;
    // 收集所有需要的id
    const allSelectedIds = collectAllChildIds(dataItem, allNodes);

    const params = {
      businessTypeIds: allSelectedIds,
      page: pageIndex.value - 1,
      pageSize: pageSize.value
    };

    // 点击行，获取提示词模板列表
    getPromptTemplateList(params);
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
              }}
              // collapseField='expanded'
              // collapseTo={1}
              virtualized={true}
              selection={gridSelectionOption}
              onSelectionChange={onSelectionChange}
          ></f-tree-grid>
        </div>
        <div class="fv-table">
          <f-data-grid
            ref={dataGridRef}
            width={550}
            height={495}
            columns={columns}
            data={tableData.value}
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
    // 获取提示词模板分类列表
    getPromptTemplateCategoryList();

    modalInstance.value = modalService.open({
      title: '提示词模板选择',
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
      showMaxButton: true,
      showCloseButton: true,
      fitContent: false,
    });
  }

  return {
    openModal,
    selectedData
  }
}

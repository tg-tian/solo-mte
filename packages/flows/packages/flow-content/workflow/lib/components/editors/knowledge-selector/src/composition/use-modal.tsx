import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { type KnowledgeSelectorProps } from '../knowledge-selector.props';
import { inject, ref, type SetupContext } from 'vue';
import { get, post } from '@/api/request';

/**
 * 知识库分类节点接口定义
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
    onSelect?: (selection: any) => void
) {
  const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
  const modalInstance = ref();
  const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);
  const selectedData = ref<any>();
  const TIP_SELECT_VAR = '请选择一个知识库';

  // 数据状态
  const treeData = ref<CategoryNode[]>([]);
  const tableData = ref([]);
  const filteredTableData = ref([]);
  const dataGridComponentInstance = ref<any>();
  const dataGridRef = ref<any>();

  // 分页状态
  const totalCount = ref(0);
  const currentPage = ref(0);
  const currentTagId = ref<string>('');
  const knowledgeFilterValue = ref('');

  function closeModal(): void {
    if (modalInstance.value) {
      tableData.value = [];
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
   * 知识库名称筛选处理
   */
  const onKnowledgeFilterChange = (value: string) => {
    knowledgeFilterValue.value = value;
    if (!value || value.trim() === '') {
      filteredTableData.value = [...tableData.value];
    } else {
      const filterValue = value.toLowerCase().trim();
      filteredTableData.value = tableData.value.filter((item: any) =>
        item.name && item.name.toLowerCase().includes(filterValue)
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
    // 复选框有bug，暂时不支持多选
    // showCheckbox: true,
    // checkOnSelect: true,
    // multiSelect: true,
    enableSelectRow: true,
  }

  const columns = [
      {
          title: '知识库名称',
          field: 'name',
          width: '50%'
      },
     {
          title: '知识库类型',
          field: 'dataType',
          width: '50%'
      }
  ]

  const pageSize = ref(20);
  const pageIndex = ref(1);

  const pagination = ref({
    enable: true,
    size: pageSize.value,
    sizeLimits: [20, 30, 50, 100],
    total: 0, // 总记录数
    index: 1, // 当前页码（从1开始）
  })

  function pageSizeChange(event: any) {
    pageSize.value = event.pageSize;
    currentPage.value = 0; // 重置到第一页
    pageIndex.value = 1;

    // 更新分页配置
    pagination.value = {
      ...pagination.value,
      size: event.pageSize,
      index: 1
    };

    // 重新加载数据
    if (currentTagId.value) {
      loadKnowledgeData(currentTagId.value);
    }
  }

  function pageIndexChange(event: any) {
    pageIndex.value = event.pageIndex;
    currentPage.value = event.pageIndex - 1; // 转换为0-based索引

    // 更新分页配置
    pagination.value = {
      ...pagination.value,
      index: event.pageIndex
    };

    // 重新加载数据
    if (currentTagId.value) {
      loadKnowledgeData(currentTagId.value);
    }
  }

  const gridSelectionOption =  {
      enableSelectRow: true,
  };

  /**
   * 获取知识库分类列表
   */
  const getKnowledgeCategoryList = async () => {
    try {
      const res = await get('/runtime/sys/v1.0/aiKbBuilder/show/allKbTag');

      if (!res || !Array.isArray(res)) {
        treeData.value = [];
        return;
      }

      // 直接使用一维数组，转换为标准格式
      treeData.value = res.map(item => ({
        id: item.tagId,
        name: item.tagName,
        parent: '',
        layer: 1,
      }));

      // 更新组件数据源
      if (dataGridComponentInstance.value) {
        dataGridComponentInstance.value.updateDataSource(treeData.value);
      }
    } catch (error) {
      console.error('获取知识库分类列表失败:', error);
      treeData.value = [];
    }
  };

  const getKnowledgeList = async (params: any) => {
    try {
      const res = await post('/runtime/sys/v1.0/aiKbBuilder/filter/kbInPage', params);

      // 更新表格数据
      tableData.value = res.filterKb.map((item: any) =>({...item, disabled: !item.canOperate})) || [];

      // 应用筛选
      if (!knowledgeFilterValue.value || knowledgeFilterValue.value.trim() === '') {
        filteredTableData.value = [...tableData.value];
      } else {
        const filterValue = knowledgeFilterValue.value.toLowerCase().trim();
        filteredTableData.value = tableData.value.filter((item: any) =>
          item.name && item.name.toLowerCase().includes(filterValue)
        );
      }

      // 更新分页信息
      if (res.pagination) {
        totalCount.value = res.pagination.totalCount;

        // 强制更新分页配置以确保响应式更新
        pagination.value = {
          ...pagination.value,
          total: res.pagination.totalCount, // 总记录数
          index: res.pagination.currentPage + 1, // 转换为1-based显示
        };

        // 同步内部状态
        currentPage.value = res.pagination.currentPage;
        pageIndex.value = res.pagination.currentPage + 1;
      }

      // 更新数据源
      dataGridRef.value?.updateDataSource(filteredTableData.value);
    } catch (error) {
      // 清空数据并保持分页状态
      tableData.value = [];
      filteredTableData.value = [];
      dataGridRef.value?.updateDataSource([]);
    }
  }

  /**
   * 加载知识库数据（带分页）
   */
  const loadKnowledgeData = async (tagId: string) => {
    currentTagId.value = tagId;

    const params = {
      tagId: tagId,
      page: currentPage.value, // 0-based索引
      pageSize: pageSize.value
    };

    await getKnowledgeList(params);
  }

  const onSelectionChange = function(dataItem: any) {
    if (!dataItem || dataItem.length === 0) {
      return;
    }

    // 直接使用选中的标签ID（一维数组，不需要处理父子关系）
    const selectedIds = dataItem.map((item: { id: any; }) => item.id);

    // 重置分页状态
    currentPage.value = 0;
    pageIndex.value = 1;

    // 重置分页配置
    pagination.value = {
      ...pagination.value,
      index: 1,
      total: 0 // 重置总记录数
    };

    // 清空筛选框和选中状态
    knowledgeFilterValue.value = '';
    selectedData.value = [];

    // 点击行，获取知识库列表
    loadKnowledgeData(selectedIds[0]);
  }


  function onTableSelectionChange(selection: Array<any>) {
    selectedData.value = selection;
  }

  function renderModalContent() {
    return (
      <div class="prompt-generator-content">
        <div class="fv-grid">
          <f-data-grid
              ref={dataGridComponentInstance}
              data={treeData.value}
              fit={true}
              columns={[
                { field: 'name', title: '分类', width: '100%', dataType: 'string' },
              ]}
              row-number={rowNumberOption}
              selection={gridSelectionOption}
              onSelectionChange={onSelectionChange}
          ></f-data-grid>
        </div>
        <div class="fv-table">
          {/* 知识库名称筛选框 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
            <span style={{ marginRight: '8px', fontSize: '14px' }}>知识库名称:</span>
            <input
              type="text"
              value={knowledgeFilterValue.value}
              onInput={(e: any) => onKnowledgeFilterChange(e.target.value)}
              placeholder="请输入知识库名称进行筛选"
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
            height={440}
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
    knowledgeFilterValue.value = '';

    // 获取知识库分类列表
    getKnowledgeCategoryList();

    modalInstance.value = modalService.open({
      title: '知识库选择',
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
    });
  }

  return {
    openModal,
    selectedData
  }
}

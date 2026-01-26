import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { inject, ref, type SetupContext } from 'vue';
import { get, post } from '@/api/request';

/**
 * 智能体分类节点接口定义
 */
interface AgentTagNode {
  id: string;
  name: string;
  tagId: string;
  tagName: string;
}

/**
 * 智能体节点接口定义
 */
interface AgentNode {
  agentId: string;
  agentName: string;
  agentCode: string;
  tagId?: string;
  createdOn?: string;
  canEdit?: boolean;
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
  const TIP_SELECT_AGENT = '请选择一个智能体';

  // 数据状态
  const tagData = ref<AgentTagNode[]>([]);
  const agentData = ref<AgentNode[]>([]);
  const filteredAgentData = ref<AgentNode[]>([]);
  const treeGridComponentInstance = ref<any>();
  const dataGridRef = ref<any>();
  const agentFilterValue = ref('');
  let agentDataTotal = 0;

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
      notify(TIP_SELECT_AGENT);
      return;
    }

    if (selectedData.value && onSelect) {
      onSelect(selectedData.value);
    }
    closeModal();
  }

  /**
   * 智能体名称筛选处理
   */
  const onAgentFilterChange = (value: string) => {

    agentFilterValue.value = value;

    if (!value || value.trim() === '') {
      fetchAgentList(currentTagId.value, '');
    } else {
      const filterValue = value.toLowerCase().trim();
       pagination.value = {
        ...pagination.value,
        index: 1
      };
      fetchAgentList(currentTagId.value, filterValue);
    }
    // 更新表格数据源并清除选中状态
    if (dataGridRef.value) {
      dataGridRef.value.clearSelection?.(); // 清除表格的选中状态
    }

    // 清空选中数据
    selectedData.value = [];
  };

  function rejectCallback() {
    closeModal();
  }

  const selectionOption = {
    showCheckbox: false,
    multiSelect: false,
    enableSelectRow: true,
  }

  const tagColumns = [
    { field: 'name', title: '分类名称', width: '100%', dataType: 'string' }
  ];

  const agentColumns = [
    { field: 'agentName', title: '智能体名称', width: '100%', resizable: true, dataType: 'string' }
  ];

  const pageSize = ref(20);
  const pageIndex = ref(1);

  const pagination = ref({
    enable: true,
    size: pageSize.value,
    sizeLimits: [10, 20, 30, 50, 100],
    total: 0, // 总记录数
    index: 1, // 当前页码（从1开始）
  })

  function pageSizeChange(event: any) {
    pageSize.value = event.pageSize;
    pageIndex.value = 1; // 重置到第一页

    // 更新分页配置
    pagination.value = {
      ...pagination.value,
      size: event.pageSize,
      index: 1
    };

    // 重新加载数据
    fetchAgentList(currentTagId.value);
  }

  function pageIndexChange(event: any) {
    pageIndex.value = event.pageIndex;

    // 更新分页配置
    pagination.value = {
      ...pagination.value,
      index: event.pageIndex
    };

    // 重新加载智能体数据
    fetchAgentList(currentTagId.value);
  }

  /**
   * 获取智能体分类列表
   */
  const fetchAgentTags = async () => {
    try {
      const res = await get('/runtime/sys/v1.0/aiAgentBuilder/show/allAgentTag');

      if (!res || !Array.isArray(res)) {
        tagData.value = [];
        return;
      }

      // 映射API数据到组件需要的格式，并添加"全部智能体"选项
      tagData.value = [
        { id: 'all', name: '全部智能体', tagId: 'all', tagName: '全部智能体' },
        ...res.map((item: any) => ({
          id: item.tagId,
          name: item.tagName,
          tagId: item.tagId,
          tagName: item.tagName
        }))
      ];

      // 更新组件数据源
      if (treeGridComponentInstance.value) {
        treeGridComponentInstance.value.updateDataSource(tagData.value);
      }
    } catch (error) {
      console.error('获取智能体分类列表失败:', error);
      tagData.value = [];
    }
  };

  /**
   * 左侧分类选择事件
   */
  const onTagSelectionChange = function(dataItem: any) {
    if (!dataItem || dataItem.length === 0) {
      return;
    }

    const selectedTag = dataItem[0];
    const tagId = selectedTag.id === 'all' ? null : selectedTag.id;

    // 更新当前选中的tagId
    currentTagId.value = tagId;

    // 清空筛选框和选中状态
    agentFilterValue.value = '';
    selectedData.value = [];
    // 更新分页配置
    pagination.value = {
      ...pagination.value,
      index: 1
    };

    // 获取该分类下的智能体列表
    fetchAgentList(tagId);
  };

  // 当前选中的tagId
  const currentTagId = ref<string | null>(null);

  /**
   * 获取当前语言
   */
  const getCurrentLang = () => {
    const langKey = localStorage.getItem('languageCode');
    if(langKey === 'zh-CHS') return 'cafMlcchs';
    if(langKey === 'en') return 'cafMlcen';
    if(langKey === 'zh-CHT') return 'cafMlccht';
    return 'cafMlcchs';
  }

  /**
   * 获取智能体列表
   */
  const fetchAgentList = async (tagId: string | null, agentName: string | null = null) => {
    try {
      const requestData: any = {
        startDateTime: "",
        endDateTime: "",
        orderCondition: "createdOn",
        orderType: "desc",
        tagId: tagId,
        agentName: agentName,
        page: pagination.value.index - 1,
        pageSize: pagination.value.size
      };

      const res = await post('/runtime/sys/v1.0/aiAgentBuilder/authFilter/agent', requestData);
      if (!res) {
        agentData.value = [];
        return;
      }

      // 更新分页配置
      pagination.value = {
        ...pagination.value,
        total: res.pagination.totalCount
      };

      agentDataTotal = res.pagination.totalCount;


      // 只展示canEdit为false的智能体
      // agentData.value = res.resultList.filter((agent: any) => agent.canEdit === false).map((agent: any) => {
      //   const currentLang = getCurrentLang();
      //   return {
      //     ...agent,
      //     agentName: agent.agentNameI18n?.[currentLang] || ''
      //   };
      // });
      agentData.value = res.resultList.map((agent: any) => {
        const currentLang = getCurrentLang();
        return {
          ...agent,
          agentName: agent.agentNameI18n?.[currentLang] || '',
          disabled: agent.canEdit
        };
      });

      // 应用筛选
      if (!agentFilterValue.value || agentFilterValue.value.trim() === '') {
        filteredAgentData.value = [...agentData.value];
      } else {
        const filterValue = agentFilterValue.value.toLowerCase().trim();
        filteredAgentData.value = agentData.value.filter((item: any) =>
          item.agentName && item.agentName.toLowerCase().includes(filterValue)
        );
      }

      // 更新组件数据源
      if (dataGridRef.value) {
        dataGridRef.value.updateDataSource(filteredAgentData.value);
      }
    } catch (error) {
      agentData.value = [];
      filteredAgentData.value = [];
    }
  };

  function onTableSelectionChange(selection: Array<any>) {
    selectedData.value = selection;
  }

  function renderModalContent() {
    return (
      <div class="prompt-generator-content">
        <div class="fv-grid">
          <f-tree-grid
            ref={treeGridComponentInstance}
            data={tagData.value}
            fit={true}
            selection={selectionOption}
            onSelectionChange={onTagSelectionChange}
            columns={tagColumns}
            virtualized={true}
            rowNumber={{
              enable: true,
              width: 45,
              showEllipsis: true,
              heading: "序号",
            }}
          ></f-tree-grid>
        </div>
        <div class="fv-table">
          {/* 智能体名称筛选框 */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
            <span style={{ marginRight: '8px', fontSize: '14px' }}>智能体名称:</span>
            <input
              type="text"
              value={agentFilterValue.value}
              onInput={(e: any) => onAgentFilterChange(e.target.value)}
              placeholder="请输入智能体名称进行筛选"
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
            columns={agentColumns}
            data={filteredAgentData.value}
            fit={true}
            pagination={pagination.value}
            selection={selectionOption}
            onSelectionChange={onTableSelectionChange}
            onPageSizeChanged={pageSizeChange}
            onPageIndexChanged={pageIndexChange}
            rowNumber={{
              enable: true,
              width: 45,
              showEllipsis: true,
              heading: "序号",
            }}
          ></f-data-grid>
        </div>
      </div>
    )
  }

  function openModal() {
    // 清空筛选状态
    agentFilterValue.value = '';

    // 获取智能体分类列表
    fetchAgentTags();

    modalInstance.value = modalService.open({
      title: '智能体选择',
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

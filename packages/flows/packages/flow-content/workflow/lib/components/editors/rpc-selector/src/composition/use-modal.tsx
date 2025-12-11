import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { type RpcSelectorProps } from '../rpc-selector.props';
import { inject, ref, type SetupContext } from 'vue';
import { get } from '@/api/request';

/**
 * 服务单元节点接口定义
 */
interface ServiceUnitNode {
  su: string;
  name: string;
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
  const TIP_SELECT_VAR = '请选择一个RPC服务';

  // 数据状态
  const treeData = ref<ServiceUnitNode[]>([]);
  const tableData1 = ref([]);
  const filteredTableData1 = ref([]);
  const tableData2 = ref([]);
  const dataGridComponentInstance1 = ref<any>();
  const dataGridComponentInstance2 = ref<any>();
  const dataGridRef1 = ref<any>();
  const dataGridRef2 = ref<any>();
  const serviceFilterValue = ref('');

  function closeModal() {
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

  /**
   * 服务名称筛选处理
   */
  const onServiceFilterChange = (value: string) => {
    serviceFilterValue.value = value;
    if (!value || value.trim() === '') {
      filteredTableData1.value = [...tableData1.value];
    } else {
      const filterValue = value.toLowerCase().trim();
      filteredTableData1.value = tableData1.value.filter((item: any) =>
        item.serviceName && item.serviceName.toLowerCase().includes(filterValue)
      );
    }

    // 更新表格数据源并清除选中状态
    if (dataGridRef1.value) {
      dataGridRef1.value.updateDataSource(filteredTableData1.value);
      dataGridRef1.value.clearSelection?.(); // 清除表格1的选中状态
    }

    // 清空表格2的数据和选中状态
    tableData2.value = [];
    selectedData.value = [];
    if (dataGridRef2.value) {
      dataGridRef2.value.updateDataSource([]);
      dataGridRef2.value.clearSelection?.(); // 清除表格2的选中状态
    }
  };

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

  function rejectCallback() {
    closeModal();
  }

  const rowNumberOption = {
    enable: false
  }

  const selectionOption = {
    enableSelectRow: true,
    enableMultiSelect: false,
  }

  // 表格1的列配置
  const columns1 = [
      {
          title: '服务名称',
          field: 'serviceName',
          width: 300,
          resizable: false,  // 禁用调整
          showTips: true
      },
     {
          title: '类名',
          field: 'className',
          width: 637,
          resizable: false,  // 固定宽度占满剩余空间
          showTips: true
     }
  ]

  // 表格2的列配置 - RPC方法信息
  const columns2 = [
      {
          title: '服务ID',
          field: 'serviceId',
          width: 937,      // 固定宽度，填满表格
          resizable: false, // 禁用调整
          showTips: true
      }
  ]


  /**
   * 左侧菜单选择事件
   */
  const onTreeSelectionChange = function(dataItem: any) {
    if (!dataItem || dataItem.length === 0) {
      return;
    }

    const selectedSu = dataItem[0].su;

    // 清空右侧表格数据
    tableData1.value = [];
    filteredTableData1.value = [];
    tableData2.value = [];
    selectedData.value = []; // 清空选择数据
    serviceFilterValue.value = ''; // 清空筛选框

    // 更新右侧表格组件
    if (dataGridRef1.value) {
      dataGridRef1.value.updateDataSource([]);
      dataGridRef1.value.clearSelection?.(); // 清除表格1的选中状态
    }
    if (dataGridRef2.value) {
      dataGridRef2.value.updateDataSource([]);
      dataGridRef2.value.clearSelection?.(); // 清除表格2的选中状态
    }

    // 获取该服务单元下的RPC服务列表
    getRpcServiceList(selectedSu);
  };

  /**
   * 表格1选择事件
   */
  const onTable1SelectionChange = function(dataItem: any) {
    if (!dataItem || dataItem.length === 0) {
      return;
    }
    console.log('RPC Selector - onTable1SelectionChange:', dataItem);

    // 根据表格1的选择更新表格2的数据，将RPC服务信息转换为方法信息格式
    const allMethods: any[] = [];

    dataItem.forEach((item: any) => {
      // 如果有methods数组，遍历每个method获取serviceId
      if (item.methods && Array.isArray(item.methods)) {
        allMethods.push(...item.methods.map((method: any) => ({
          id: method.id,
          serviceId: method.serviceId ,
          serviceName: item.serviceName ,
          className: item.className || '',
          su: item.su || '',
          methodInfo: method,
          ...method // 展开method的所有属性，确保不丢失任何信息
        })));
      }
    });

    tableData2.value = allMethods

    // 更新表格2组件，强制重新渲染
    if (dataGridRef2.value) {
      // 先清空，再更新，强制重新渲染
      dataGridRef2.value.updateDataSource([]);
      setTimeout(() => {
        dataGridRef2.value.updateDataSource(tableData2.value);
      }, 10);
    }
  };

  /**
   * 表格2选择事件 - 选择具体的方法
   */
  const onTable2SelectionChange = function(dataItem: any) {
    if (!dataItem || dataItem.length === 0) {
      return;
    }

    selectedData.value = dataItem;
  };

  function renderModalContent() {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        {/* 左侧菜单 */}
        <div style={{ width: '200px', borderRight: '1px solid #e8e8e8', padding: '8px' }}>
          <f-data-grid
            ref={dataGridComponentInstance1}
            data={treeData.value}
            columns={[
              { title: 'SU', field: 'su', width: '100%' }
            ]}
            selectionOptions={selectionOption}
            onSelectionChange={onTreeSelectionChange}
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

        {/* 右侧表格区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' }}>
          {/* 服务名称筛选框 - 放在最上方 */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', fontSize: '14px' }}>服务名称筛选:</span>
            <input
              type="text"
              value={serviceFilterValue.value}
              onInput={(e: any) => onServiceFilterChange(e.target.value)}
              placeholder="请输入服务名称进行筛选"
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

          {/* RPC服务信息 */}
          <div style={{ height: '280px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>RPC服务信息</div>
            <f-data-grid
              ref={dataGridRef1}
              data={filteredTableData1.value}
              columns={columns1}
              selectionOptions={selectionOption}
              onSelectionChange={onTable1SelectionChange}
              pagination={null}
              fit={true}
              columnOption={{
                fitColumns: false,
                resizeColumn: false
              }}
              rowNumber={{
                enable: true,
                width: 45,
                showEllipsis: true,
                heading: "序号",
              }}
            ></f-data-grid>
          </div>

          {/* RPC方法信息 */}
          <div style={{ height: '280px', marginTop: '12px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>RPC方法信息</div>
            <f-data-grid
              ref={dataGridRef2}
              data={tableData2.value}
              columns={columns2}
              selectionOptions={selectionOption}
              onSelectionChange={onTable2SelectionChange}
              pagination={null}
              fit={true}
              columnOption={{
                fitColumns: false,
                resizeColumn: false
              }}
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
    tableData1.value = [];
    filteredTableData1.value = [];
    tableData2.value = [];
    selectedData.value = [];
    serviceFilterValue.value = '';

    // 获取服务单元列表
    getServiceUnitList();

    modalInstance.value = modalService.open({
      title: 'RPC服务选择',
      width: 1200,
      height: 800,
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

  /**
   * 获取服务单元列表
   */
  const getServiceUnitList = async () => {
    try {
      const res = await get('/runtime/csb/v1.0/InternalServiceManage/findAllSu');

      if (!res) {
        treeData.value = [];
        return;
      }

      // 处理不同的数据格式
      let processedData: any[] = res || [];

      // 确保每个数据项都有正确的结构
      treeData.value = processedData.map(item => {
          return { su: item, name: item };
      }).sort((a, b) => a.name.localeCompare(b.name));

      // 更新组件数据源
      if (dataGridComponentInstance1.value) {
        dataGridComponentInstance1.value.updateDataSource(treeData.value);
      }
    } catch (error) {
      console.error('获取服务单元列表失败:', error);
      treeData.value = [];
    }
  };

  /**
   * 获取指定服务单元的RPC服务列表
   */
  const getRpcServiceList = async (su: string) => {
    try {
      const res = await get(`/runtime/csb/v1.0/InternalServiceManage/findAllRpcServiceBySu/${su}`);

      if (!res) {
        tableData1.value = [];
        // 确保表格组件更新空数据
        if (dataGridRef1.value) {
          dataGridRef1.value.updateDataSource([]);
        }
        return;
      }

      // 处理不同的数据格式
      let processedData: any[] = [];

      if (Array.isArray(res)) {
        processedData = res;
      } else if (typeof res === 'object') {
        // 如果返回的是对象，尝试提取数组
        if (res.data && Array.isArray(res.data)) {
          processedData = res.data;
        } else {
          // 尝试将对象的值转换为数组
          const values = Object.values(res);
          if (values.length > 0 && Array.isArray(values[0])) {
            processedData = values[0];
          } else {
            processedData = values;
          }
        }
      }

      // 确保每个数据项都有正确的结构，简化复杂字段
      tableData1.value = processedData.map(item => {
        if (typeof item === 'string') {
          return {
            serviceName: item,
            className: item,
            su: su,
            methods: []
          };
        }

        // 不再简化类名，保持完整显示
        let className = item.className || item.class || item.implementation || '';

        return {
          serviceName: item.serviceName || item.name || item.service || item.interfaceName || '',
          className: className,
          su: su,
          methods: item.methods || []
        };
      });

      // 更新组件数据源和筛选数据
      filteredTableData1.value = [...tableData1.value];
      if (dataGridRef1.value) {
        dataGridRef1.value.updateDataSource(filteredTableData1.value);
      }
    } catch (error) {
      tableData1.value = [];
      filteredTableData1.value = [];
      // 确保表格组件更新空数据
      if (dataGridRef1.value) {
        dataGridRef1.value.updateDataSource([]);
      }
      if (dataGridRef2.value) {
        dataGridRef2.value.updateDataSource([]);
      }
    }
  };

  return {
    openModal,
    selectedData
  }
}

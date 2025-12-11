import { inject, ref, type SetupContext, computed, watch, nextTick } from 'vue';
import { F_MODAL_SERVICE_TOKEN, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import { type TypeSelectorProps, TYPE_SELECTOR_NAME } from '../type-selector.props';
import { useBem, ParameterUtils } from '@farris/flow-devkit/utils';
import { useTypeProvider, useBillCategories, useBusinessObjects } from '@farris/flow-devkit/hooks';
import { TSelect } from '@farris/flow-devkit/third-party';
import { TypeQueryApi } from '@farris/flow-devkit/api';
import type { TypeRefer } from '@farris/flow-devkit/types';
import { useTypeDetails } from '@farris/flow-devkit/composition';

const BIZ_TYPE = 'bizType';
const BIZ_OBJECT = 'bizObject';

export function useModal(
  _props: TypeSelectorProps,
  context: SetupContext,
) {
  const { bem } = useBem(TYPE_SELECTOR_NAME);
  const { loadType } = useTypeDetails();
  const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN)!;
  const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
  const modalInstance = ref();

  const isArrayType = ref<boolean>(false);
  const { typeProviders, refreshTypeProviders } = useTypeProvider();
  const { billCategories, refreshBillCategories, loading: billCategoriesLoading } = useBillCategories();
  const { businessObjects, refreshBusinessObjects, loading: businessObjectsLoading } = useBusinessObjects();

  const currentTypeProvider = ref<string>('');
  const bizId = ref<string>('');

  const searchBarText = ref<string>('');

  const gridData = ref<TypeRefer[]>([]);
  const selectedType = ref<TypeRefer>();

  const filteredGridData = computed<TypeRefer[]>(() => {
    const searchKey = searchBarText.value.trim();
    if (!searchKey) {
      return gridData.value;
    }
    return gridData.value.filter(item => {
      return (item.typeName || '').indexOf(searchKey) >= 0 || (item.typeCode || '').indexOf(searchKey) >= 0;
    });
  });

  const typeProviderOptions = computed(() => {
    return typeProviders.value.map((typeProvider) => ({
      label: typeProvider.name,
      value: typeProvider.id,
      typeProvider,
    }));
  });

  function selectFirstTypeProvider(): void {
    if (typeProviderOptions.value.length) {
      currentTypeProvider.value = typeProviderOptions.value[0].value;
    } else {
      currentTypeProvider.value = '';
    }
  }

  watch(typeProviderOptions, () => {
    if (!currentTypeProvider.value && typeProviderOptions.value.length) {
      selectFirstTypeProvider();
    }
  });

  const selectedTypeProviderOption = computed(() => {
    const option = typeProviderOptions.value.find((item) => {
      return item.value === currentTypeProvider.value;
    });
    if (option) {
      return option.typeProvider;
    }
    return undefined;
  });

  watch(currentTypeProvider, () => {
    bizId.value = '';
    gridData.value = [];
    nextTick(() => {
      clearNavTreeSelection();
      forceUpdateNavTree();
    });
  });

  const navigationKind = computed<string>(() => {
    return selectedTypeProviderOption.value?.navigationKind || '';
  });

  const shouldRenderNavTree = computed<boolean>(() => {
    return navigationKind.value === BIZ_TYPE || navigationKind.value === BIZ_OBJECT;
  });

  function clearTypeGridSelection(): void {
    typeGridRef.value?.clearSelection();
    selectedType.value = undefined;
  }

  function initData(): void {
    isArrayType.value = false;
    bizId.value = '';
    selectedType.value = undefined;
    searchBarText.value = '';
    selectFirstTypeProvider();
  }

  function beforeOpenModal(): void {
    refreshTypeProviders();
    initData();
  }

  function afterCloseModal(): void {
    refreshBillCategories();
    refreshBusinessObjects();
  }

  function closeModal(): void {
    if (modalInstance.value) {
      modalInstance.value.destroy();
      modalInstance.value = null;
    }
    afterCloseModal();
  }

  function wrapWithArray(typeRefer: TypeRefer): TypeRefer {
    const newTypeRefer: TypeRefer = {
      source: "default",
      typeCode: 'Array',
      typeId: "list",
      typeName: "list",
      genericTypes: [typeRefer],
    };
    const newTypeCode = `Array<${typeRefer.typeCode || typeRefer.typeName || typeRefer.typeId}>`;
    newTypeRefer.typeCode = newTypeCode;
    newTypeRefer.typeName = newTypeCode;
    return newTypeRefer;
  }

  function acceptCallback() {
    if (!selectedType.value) {
      notifyService.warning({ message: '请选择数据！', position: 'top-center', showCloseButton: true, timeout: 3000 });
      return;
    }
    const newType = isArrayType.value ? wrapWithArray(selectedType.value) : selectedType.value;
    context.emit('update:modelValue', newType);
    loadType(newType);
    closeModal();
  }

  function rejectCallback() {
    closeModal();
  }

  const billCategoryTreeRef = ref();
  const businessObjectTreeRef = ref();
  const typeGridRef = ref();

  watch(billCategories, forceUpdateNavTree);
  watch(businessObjects, forceUpdateNavTree);
  watch(billCategoryTreeRef, forceUpdateNavTree);
  watch(businessObjectTreeRef, forceUpdateNavTree);

  function forceUpdateNavTree(): void {
    if (navigationKind.value === BIZ_TYPE) {
      billCategoryTreeRef.value?.updateDataSource(billCategories.value);
      nextTick(() => selectFirstNavItem());
      return;
    }
    if (navigationKind.value === BIZ_OBJECT) {
      businessObjectTreeRef.value?.updateDataSource(businessObjects.value);
      nextTick(() => selectFirstNavItem());
      return;
    }
  }

  function setTypeGridData(data: TypeRefer[]): void {
    typeGridRef.value?.updateDataSource(data);
  }

  watch(filteredGridData, () => {
    setTypeGridData(filteredGridData.value);
  });

  function onTypeProviderChange(provider: any) {
    currentTypeProvider.value = provider as string;
    clearTypeGridSelection();
  }

  function clearNavTreeSelection(): void {
    billCategoryTreeRef.value?.clearSelection();
    businessObjectTreeRef.value?.clearSelection();
  }

  function selectFirstNavItem(): void {
    if (navigationKind.value === BIZ_TYPE) {
      const treeInstance = billCategoryTreeRef.value;
      const data = billCategories.value;
      if (treeInstance && data[0]) {
        treeInstance.selectItemById(data[0].id);
        onNavTreeSelectionChange([data[0]]);
      }
      return;
    }
    if (navigationKind.value === BIZ_OBJECT) {
      const treeInstance = businessObjectTreeRef.value;
      const data = businessObjects.value;
      if (treeInstance && data[0]) {
        treeInstance.selectItemById(data[0].id);
        onNavTreeSelectionChange([data[0]]);
      }
      return;
    }
  }

  function onNavTreeSelectionChange(selectedItems: any[]): void {
    const selectedNode = selectedItems?.[0];
    if (!selectedNode) {
      return;
    }
    bizId.value = selectedNode.id;
    refreshTypeGridData();
    clearTypeGridSelection();
  }

  function onTypeGridSelectionChange(selectedItems: any[]): void {
    const selectedNode = selectedItems?.[0] as TypeRefer;
    if (!selectedNode) {
      return;
    }
    const typeRefer: TypeRefer = {
      source: selectedNode.source,
      typeId: selectedNode.typeId,
      typeCode: selectedNode.typeCode,
      typeName: selectedNode.typeName,
      genericTypes: selectedNode.genericTypes,
    };
    selectedType.value = typeRefer;
  }

  async function refreshTypeGridData() {
    setTypeGridData([]);
    if (!bizId.value || !currentTypeProvider.value) {
      return;
    }
    const result = await TypeQueryApi.getTypeReferByProviderAndBizId(currentTypeProvider.value, bizId.value).catch(() => null);
    if (!result) {
      return;
    }
    gridData.value = result.data || [];
    gridData.value.forEach((item, index) => {
      (item as any).id = `${ParameterUtils.getTypeReferIds(item).join('_')}_${index}`;
    });
  }

  function renderSearchBar() {
    return (
      <>
        <f-input-group
          customClass={bem('search')}
          modelValue={searchBarText.value}
          placeholder={'请输入编号或名称'}
          updateOn="change"
          onUpdate:modelValue={(newValue: string) => { searchBarText.value = newValue }}
        />
        <f-button class={bem('search-button')} onClick={refreshTypeGridData}>{'查询'}</f-button>
      </>
    );
  }

  function renderBillCategoryTree() {
    if (billCategoriesLoading.value) {
      return;
    }
    return (
      <f-tree-view
        ref={billCategoryTreeRef}
        fit={true}
        virtualized={true}
        hierarchy={{
          cascadeOption: {
            autoCheckChildren: false,
            autoCheckParent: false,
            selectionRange: 'All',
          },
          collapseTo: 10,
          parentIdField: 'parent',
        }}
        onSelectionChange={onNavTreeSelectionChange}
      ></f-tree-view>
    );
  }

  function renderBusinessObjectTree() {
    if (businessObjectsLoading.value) {
      return;
    }
    return (
      <f-tree-view
        ref={businessObjectTreeRef}
        fit={true}
        virtualized={true}
        hierarchy={{
          cascadeOption: {
            autoCheckChildren: false,
            autoCheckParent: false,
            selectionRange: 'All',
          },
          collapseTo: 10,
          parentIdField: 'parent',
        }}
        onSelectionChange={onNavTreeSelectionChange}
      ></f-tree-view>
    );
  }

  function renderNavTree() {
    if (navigationKind.value === BIZ_TYPE) {
      return renderBillCategoryTree();
    }
    if (navigationKind.value === BIZ_OBJECT) {
      return renderBusinessObjectTree();
    }
  }

  const typeGridColumns = [
    { field: 'typeCode', title: '类型编号', width: 200, resizable: true, dataType: 'string' },
    { field: 'typeName', title: '类型名称', width: 400, resizable: true, dataType: 'string' },
  ];

  function renderTypeGrid() {
    return (
      <f-data-grid
        ref={typeGridRef}
        idField="id"
        columns={typeGridColumns}
        summary={{ enable: false }}
        columnOption={{ fitColumns: true }}
        selection={{
          enableSelectRow: true,
          multiSelect: false,
          clearSelectionOnEmpty: true,
        }}
        rowNumber={{
          enable: true,
          width: 45,
          showEllipsis: true,
          heading: "序号",
        }}
        onSelectionChange={onTypeGridSelectionChange}
      />
    );
  }

  function renderTypeProviderSelect() {
    return (
      <TSelect
        class={bem('provider-select')}
        value={currentTypeProvider.value}
        options={typeProviderOptions.value}
        clearable={false}
        size={'small'}
        onChange={onTypeProviderChange}
      ></TSelect>
    );
  }

  function renderArrayCheckbox() {
    return (
      <f-checkbox
        customClass={bem('array-checkbox')}
        modelValue={isArrayType.value}
        trueValue={true}
        falseValue={false}
        onUpdate:modelValue={(newValue: boolean) => { isArrayType.value = newValue }}
      >{'数组'}</f-checkbox>
    );
  }

  function renderModalContent() {
    return (
      <div class={bem('modal')}>
        <div class={bem('modal-header')}>
          {renderArrayCheckbox()}
          {renderTypeProviderSelect()}
          {renderSearchBar()}
        </div>
        <div class={bem('modal-content')}>
          {shouldRenderNavTree.value && (
            <div class={bem('nav-tree')}>
              {renderNavTree()}
            </div>
          )}
          <div class={bem('type-grid')}>
            {renderTypeGrid()}
          </div>
        </div>
      </div>
    );
  }

  function openModal() {
    beforeOpenModal();
    modalInstance.value = modalService.open({
      title: '选择类型',
      width: 1000,
      height: 596,
      class: bem('modal-dialog'),
      maskClass: bem('modal-mask'),
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
      showCloseButton: false,
      fitContent: false,
    });
  }

  return {
    openModal,
  };
}

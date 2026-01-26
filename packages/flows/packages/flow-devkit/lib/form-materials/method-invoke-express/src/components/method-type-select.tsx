import { defineComponent, type PropType, computed, ref, inject, nextTick, watch } from "vue";
import { F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';
import { useBem } from '@farris/flow-devkit/utils';
import { TSelect } from "@farris/flow-devkit/third-party";
import type { TypeRefer, Type } from "@farris/flow-devkit/types";
import { useMethodTypes } from "@farris/flow-devkit/hooks";
import { useTypeDetails } from "@farris/flow-devkit/composition";

import './method-type-select.scss';

const COMPONENT_NAME = 'FvfMethodTypeSelect';

export default defineComponent({
  name: COMPONENT_NAME,
  props: {
    /** 当前选中值 */
    value: {
      type: Object as PropType<TypeRefer>,
    },
  },
  emits: {
    'update:value': (_methodType: TypeRefer, _methodCode?: string) => {
      return true;
    },
  },
  setup(props, context) {
    const { bem } = useBem(COMPONENT_NAME);

    const { methodTypes, mergedMethodTypes } = useMethodTypes();
    const { getFullTypeID } = useTypeDetails();

    const currentTypeRefer = computed<TypeRefer | undefined>(() => props.value);

    const currentMethodType = computed<Type | undefined>(() => {
      const targetSource = currentTypeRefer.value?.source;
      const targetTypeId = currentTypeRefer.value?.typeId;
      if (!targetSource || !targetTypeId) {
        return undefined;
      }
      return mergedMethodTypes.value.find((methodType) => {
        return methodType.source === targetSource && methodType.typeId === targetTypeId;
      });
    });

    const currentID = computed<string>(() => {
      return currentMethodType.value ? getFullTypeID(currentMethodType.value) : '';
    });

    const isCurrentTypeInDefaultTypes = computed<boolean>(() => {
      const currentType = currentMethodType.value;
      if (!currentType) {
        return true;
      }
      return methodTypes.value.findIndex((methodType) => {
        return methodType.source === currentType.source && methodType.typeId === currentType.typeId;
      }) >= 0;
    });

    const optionTypes = computed<Type[]>(() => {
      if (isCurrentTypeInDefaultTypes.value) {
        return methodTypes.value;
      }
      return [...methodTypes.value, currentMethodType.value!];
    });

    const options = computed(() => {
      return optionTypes.value.map((type) => ({
        label: type.name || type.code,
        value: getFullTypeID(type),
        type,
      }));
    });

    const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
    const popupVisible = ref<boolean>(false);

    const modalInstance = ref();
    const typeGridRef = ref();
    const methodGridRef = ref();

    const selectedType = ref<Type>();
    const selectedMethodCode = ref<string>();
    const methods = computed(() => selectedType.value?.methods || []);

    watch(methods, () => {
      methodGridRef.value?.updateDataSource(methods.value);
    }, { immediate: true });

    function handleSelectChange(type: TypeRefer, methodCode?: string): void {
      context.emit('update:value', type, methodCode);
    }

    function closeModal(): void {
      if (modalInstance.value) {
        modalInstance.value.destroy();
        modalInstance.value = null;
      }
    }

    function acceptCallback() {
      const newType = selectedType.value;
      if (newType) {
        handleSelectChange(newType, selectedMethodCode.value);
      }
      closeModal();
    }

    function rejectCallback() {
      closeModal();
    }

    function onTypeGridSelectionChange(selectedItems: any[]) {
      const selectedNode = selectedItems?.[0];
      if (selectedNode?.rawType) {
        selectedType.value = selectedNode.rawType;
      }
    }

    function onMethodGridSelectionChange(selectedItems: any[]) {
      const selectedNode = selectedItems?.[0];
      if (selectedNode?.code) {
        selectedMethodCode.value = selectedNode.code;
      }
    }

    const typeGridColumns = [
      { field: 'code', title: '类型编号', width: 100, resizable: true, dataType: 'string' },
      { field: 'name', title: '类型名称', width: 100, resizable: true, dataType: 'string' },
    ];
    const methodGridColumns = [
      { field: 'code', title: '函数编号', width: 100, resizable: true, dataType: 'string' },
      { field: 'name', title: '函数名称', width: 100, resizable: true, dataType: 'string' },
    ];

    const typeGridData = computed(() => {
      return mergedMethodTypes.value.map((methodType) => ({
        id: `${methodType.source} / ${methodType.typeId}`,
        code: methodType.code,
        name: methodType.name || methodType.code,
        rawType: methodType,
      }));
    });

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

    function renderMethodGrid() {
      return (
        <f-data-grid
          ref={methodGridRef}
          idField="code"
          columns={methodGridColumns}
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
          onSelectionChange={onMethodGridSelectionChange}
        />
      );
    }

    function renderModalContent() {
      return (
        <div class={bem('modal-content')}>
          <div class={bem('type-grid')}>{renderTypeGrid()}</div>
          <div class={bem('method-grid')}>{renderMethodGrid()}</div>
        </div>
      );
    }

    function openModal() {
      modalInstance.value = modalService.open({
        title: '选择类型',
        width: 800,
        height: 445,
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

    function openMoreTypeModal() {
      popupVisible.value = false;
      openModal();
      nextTick(() => {
        typeGridRef.value?.updateDataSource(typeGridData.value);
        methodGridRef.value?.updateDataSource([]);
        selectedType.value = undefined;
        selectedMethodCode.value = undefined;
      });
    }

    function renderPanelBottomContent() {
      return (
        <div class="fvf-type-selector__more-type">
          <f-button type="link" onClick={openMoreTypeModal}>{'更多类型'}</f-button>
        </div>
      );
    }

    return () => (
      <TSelect
        value={currentID.value}
        options={options.value}
        clearable={false}
        size={'small'}
        placeholder={'请选择类型'}
        popupVisible={popupVisible.value}
        onPopupVisibleChange={newValue => { popupVisible.value = newValue }}
        popupProps={{
          overlayInnerClassName: 'larger-max-height',
        }}
        panelBottomContent={renderPanelBottomContent}
        onChange={(_, { selectedOptions }) => handleSelectChange((selectedOptions[0] as any).type)}
      />
    );
  },
});

import { FModalService, FNotifyService, F_MODAL_SERVICE_TOKEN } from "@farris/ui-vue";
import {
  defineComponent,
  inject,
  ref,
  watch,
  Ref,
  onMounted,
} from "vue";
import { mockData, TemplateEntity } from "./entity";
import { templateBoxProps, TemplateBoxProps } from "./template-box.props";
import "./template-box.scss";
import FTemplateModal from "./template-modal.component";

export default defineComponent({
  name: "FTemplateBox",
  props: templateBoxProps,
  components: {},
  emits: [],
  setup(props: TemplateBoxProps) {
    const dragularCompostion = ref(props.dragula);
    const useFormSchema: any = inject("useFormSchema");
    const notifyService: any = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };

    const modalService: FModalService | null = inject(
      F_MODAL_SERVICE_TOKEN,
      null
    );
    const modalInstance = ref();
    /** 已选的模板列表 */
    const templateList: Ref<Array<TemplateEntity>> = ref([]);

    onMounted(() => {
      // mock数据
      // templateList.value = mockData;
    });

    // 关闭弹窗
    function closeModal() {
      if (modalInstance.value.close) {
        modalInstance.value.close();
      }
    }
    function onSelectedTemplate(templateData: any) {
      if (!templateData?.component || !templateData.index) {
        return;
      }
      if (templateList.value.find((item) => item.id === templateData.index)) {
        notifyService.warning('模板已添加，请勿重复操作');
        closeModal();
        return;
      }
      let templateSchema = templateData.component;
      if (typeof templateData.component === "string") {
        templateSchema = {
          type: "html-template",
          html: templateSchema,
        };
      }
      templateList.value.push({
        id: templateData.index,
        name: templateData.name,
        description: templateData.description,
        // 模板内容
        component: templateSchema,
      });

      useFormSchema["customTemplates"] = templateList.value;
      closeModal();
    }
    function renderModalComponent() {
      return () => (
        <>
          <FTemplateModal onSubmit={onSelectedTemplate}></FTemplateModal>
        </>
      );
    }
    /** 点击新增，打开模板页面 */
    function onAddBtnClicked() {
      if (!modalService) {
        return;
      }

      modalInstance.value = modalService.open({
        title: "模板库",
        width: 1200,
        height: 900,
        fitContent: false,
        showButtons: false,
        render: renderModalComponent(),
        enableEsc: false,
        draggable: true,
      });
    }

    /**
     * 将工具箱各容器添加到dragula的拖拽列表中
     */
    function attachToolboxToDragulaContainer(dragulaInstance: any) {
      if (!dragulaInstance) {
        return;
      }
      const templatePanels = document.getElementsByClassName("template-list");
      if (!templatePanels) {
        return;
      }

      dragulaInstance.containers = dragulaInstance.containers.filter(
        (element: HTMLElement) => !element.className.includes("template-list")
      );

      Array.from(templatePanels).forEach((panelElement) => {
        dragulaInstance.containers.push(panelElement);
      });
    }

    watch(
      () => props.dragula,
      (newValue: any) => {
        dragularCompostion.value = newValue;
        if (dragularCompostion.value?.getDragulaInstance) {
          attachToolboxToDragulaContainer(
            dragularCompostion.value?.getDragulaInstance()
          );
        }
      }
    );
    return () => {
      return (
        <div class="f-designer-template">
          <div class="f-tempalte-add-panel">
            <button
              class="btn btn-secondary w-100"
              style="height:30px"
              type="button"
              onClick={onAddBtnClicked}
            >
              <span class="f-icon f-icon-add"></span>新增模板
            </button>
          </div>
          <div class="template-list flex-fill mt-2">
            {templateList.value.map((template) => {
              return (
                <div
                  class="template-item drag-copy"
                  data-sourceType="control"
                  data-category="custom-template"
                  data-controlType={template.id}
                >
                  <div class="farrisControlIcon fd-i-Family fd_pc-html-template"></div>
                  <div>{template.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };
  },
});

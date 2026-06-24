import { FModalService, FNotifyService, F_MODAL_SERVICE_TOKEN } from "@farris/ui-vue";
import {
  defineComponent,
  inject,
  ref,
  watch,
  Ref,
  onMounted,
} from "vue";
import axios from "axios";
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
    /** 模板保存、查询url地址 */
    const templateUrl = '/api/platform/common/v1.0/widgets-template';

    onMounted(() => {
      loadSavedTemplates();
    });

    /** 从服务端加载已保存的模板 */
    async function loadSavedTemplates() {
      try {
        const response = await axios.get(`${templateUrl}/getTemplates`);
        const data = response.data;
        let templates: Array<TemplateEntity> = [];
        if (Array.isArray(data)) {
          templates = data;
        } else if (Array.isArray(data?.templates)) {
          templates = data.templates;
        } else if (Array.isArray(data?.data)) {
          templates = data.data;
        }
        templateList.value = templates;
        useFormSchema["customTemplates"] = templateList.value;
      } catch (error) {
        // console.error('加载模板失败', error);
        notifyService.warning('加载模板失败，请检查服务状态。');
      }
    }

    /** 保存全量模板到服务端 */
    async function saveTemplates() {
      try {
        await axios.post(`${templateUrl}/saveTemplates`, { templates: templateList.value });
      } catch (error) {
        // console.error('保存模板失败', error);
        notifyService.warning('保存模板失败，请检查服务状态。');
      }
    }

    // 关闭弹窗
    function closeModal() {
      if (modalInstance.value.close) {
        modalInstance.value.close();
      }
    }
    function onSelectedTemplate(templateData: any) {
      if (!templateData?.code_file || !templateData?.template_index) {
        notifyService.warning('模板内容加载失败或与当前表单设计器不兼容，请更换模板重试。');
        return;
      }
      if (templateList.value.find((item) => item.id === templateData.template_index)) {
        notifyService.warning('模板已添加，请勿重复操作。');
        closeModal();
        return;
      }
      let templateSchema = templateData.code_file;
      if (typeof templateSchema === "string") {
        templateSchema = {
          type: "html-template",
          html: templateSchema,
        };
      }
      templateList.value.push({
        id: templateData.template_index,
        name: templateData.name,
        description: templateData.template_description,
        // 模板内容
        component: templateSchema,
      });

      useFormSchema["customTemplates"] = templateList.value;
      saveTemplates();
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

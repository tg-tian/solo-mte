import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { TemplateModalProps, templateModalProps } from "./template-box.props";
import "./template-box.scss";
import axios from "axios";

export default defineComponent({
  name: "FTemplateModal",
  props: templateModalProps,
  components: {},
  emits: ["submit"],
  setup(props: TemplateModalProps, context) {
    const iframeRef = ref();

    /**
     * 查询单个模板内容
     */
    async function queryTemplateJsonById(templateId: string) {
      const url = `https://lctemplates.gitlink.org.cn/templates/${templateId}.json`;
      return await axios.get(url);
    }
    /**
     * 处理模板库的通讯事件
     */
    async function handleTemplateData(event: any) {
      if (event?.data) {
        const templateJson = await queryTemplateJsonById(event.data.id);
        context.emit("submit", templateJson?.data);
      }
    }
    onMounted(() => {
      window.addEventListener("message", handleTemplateData);
    });
    onUnmounted(() => {
      // 移除全局message监听
      window.removeEventListener("message", handleTemplateData);

      // 销毁iframe
      if (iframeRef.value) {
        iframeRef.value.src = "about:blank";
        iframeRef.value.remove();
      }
    });
    return () => {
      return (
        <iframe
          src="https://lctemplates.gitlink.org.cn/templates?iframe=1&schema=inBuilder&domain=通用"
          id="template-iframe"
          ref={iframeRef}
          width="100%"
          height="100%"
        ></iframe>
      );
    };
  },
});

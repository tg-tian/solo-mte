import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { TemplateModalProps, templateModalProps } from "./template-box.props";
import "./template-box.scss";

export default defineComponent({
  name: "FTemplateModal",
  props: templateModalProps,
  components: {},
  emits: ["submit"],
  setup(props: TemplateModalProps, context) {
    const iframeRef = ref();

    function handleTemplateData(event: any) {
      if (event?.data) {
        delete event.data.id;
        context.emit("submit", event.data);
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
          src="https://lctemplates.gitlink.org.cn/templates?iframe=1"
          id="template-iframe"
          ref={iframeRef}
          width="100%"
          height="100%"
        ></iframe>
      );
    };
  }
});

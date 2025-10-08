import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue";
import MonacoEditor from '../../../monaco-editor/monaco-editor.component';

export default defineComponent({
    name: 'array-and-object-code',
    props: {
        modelValue: { type: String, default: '' },
    },
    emits: [],
    setup(props, context) {
        const monacoContainerRef = ref();
        const monacoEditorRef = ref();
        const monacoContainerStyles = ref();

        const resizeObserver = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            monacoContainerStyles.value = {
                position: 'fixed',
                width: `${width - 1}px`,
                height: `${height}px`
            };
        });

        onMounted(() => {
            monacoContainerRef.value && resizeObserver.observe(monacoContainerRef.value.parentElement);
        });

        onBeforeUnmount(() => {
            if (resizeObserver && monacoContainerRef.value) {
                resizeObserver.unobserve(monacoContainerRef.value);
                resizeObserver.disconnect();
            }
        });

        function getContent() {
            return monacoEditorRef.value?.getContent();
        }

        context.expose({
            getContent
        });

        return () => {
            return (
                <div ref={monacoContainerRef} style={monacoContainerStyles.value} >
                    <MonacoEditor id="variable-array-and-object-editor" v-model={props.modelValue} ref={monacoEditorRef} language={"json"} ></MonacoEditor>
                </div>
            );

        };
    }
});

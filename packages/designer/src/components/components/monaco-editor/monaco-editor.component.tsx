import { defineComponent, watch, onBeforeUnmount, onMounted, ref, computed } from "vue";
import loader from "@monaco-editor/loader";
import { MonacoEditorProps, monacoEditorProps } from "./monaco-editor.props";

export default defineComponent({
    name: 'FMonacoEditor',
    props: monacoEditorProps,
    setup(props: MonacoEditorProps, context) {
        const editorContainer = ref();
        let editorInstance: any = null;
        const codeValues = ref(props.modelValue);

        async function getMonacoEditorConfig() {
            return fetch('assets/monaco-editor.config.json').then((config: Record<string, any>) => {
                return config.json();
            });
        }

        const editorOptions = {
            value: codeValues.value,
            language: props.language,
            theme: props.theme,
            folding: true,
            readOnly: props.readOnly,
            automaticLayout: true,
            mouseWheelZoom: true  // 启用滚轮缩放
        };

        async function initMonacoEditor() {
            if (editorContainer.value && !editorInstance) {
                const config = await getMonacoEditorConfig();
                const { vsPath } = config;
                loader.config({ paths: { vs: window.location.origin + vsPath } });
                loader.config({ "vs/nls": { availableLanguages: { "*": "zh-cn" } } });

                loader.init().then((monaco) => {
                    editorInstance = monaco.editor.create(editorContainer.value, {...editorOptions});
                    // 添加编辑器激活状态监听
                    // editorInstance.onDidFocusEditorWidget(() => {
                    //     editorInstance.updateOptions({ mouseWheelZoom: true });
                    // });
                    // editorInstance.onDidBlurEditorWidget(() => {
                    //     editorInstance.updateOptions({ mouseWheelZoom: false });
                    // });
                });
            }
        }

        watch(() => props.isActive, (newValue) => {
            editorInstance?.updateOptions({ mouseWheelZoom: newValue });
        });

        watch(() => props.modelValue, (newValue) => {
            codeValues.value = newValue;
            editorInstance?.setValue(newValue);
        });

        const resizeObserver = new ResizeObserver(entries => {
            editorInstance?.layout();
            editorInstance?.updateOptions({ theme: 'vs-dark' });
        });

        function getContent() {
            return editorInstance?.getValue();
        }

        onMounted(() => {
            initMonacoEditor();
            resizeObserver.observe(editorContainer.value);
        });

        onBeforeUnmount(() => {
            if (editorInstance) {
                editorInstance.dispose();
            }

            if (resizeObserver) {
                resizeObserver.unobserve(editorContainer.value);
                resizeObserver.disconnect();
            }
        });

        const setPosition = (controlId: string) => {
            if (!editorInstance || !controlId) {
                return;
            }
            // 查找匹配的文本
            const matches = editorInstance.getModel().findMatches(controlId, false, false, false, null, true);

            if (matches.length > 0) {
                // 获取第一个匹配项的位置
                const firstMatch = matches[0];
                const {range} = firstMatch;

                // 将光标定位到匹配的位置
                editorInstance.setPosition(range.getStartPosition());

                // 滚动到匹配的位置
                editorInstance.revealRangeInCenter(range);
            }
        };

        const setContent = (content: string) => {
            if (!editorInstance) {
                return;
            }
            editorInstance.setValue(content);
        };

        const updateWheelZoom = (isEnabled) => {
            editorInstance?.updateOptions({ mouseWheelZoom: isEnabled });
        };

        context.expose({ 
            getContent,
            setContent,
            setPosition,
            updateWheelZoom
        });

        return () => {
            return <div class="monaco-editor h-100 w-100" ref={editorContainer}></div>;
        };
    }
});

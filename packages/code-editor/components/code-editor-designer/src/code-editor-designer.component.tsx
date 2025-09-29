import { defineComponent, watch, onBeforeUnmount, onMounted, ref } from "vue";
import { CodeEditorDesigner, codeEditorDesigner } from "./code-editor-designer.props";
import "./code-editor-designer.scss";
import { IEditorOptions, IGlobalEditorOptions } from "../../code-editor/src/composition/types/monaco.interface";
import { ChangeInfo, IMethod } from "../../code-editor/src/composition/editor-core/libs/interfaces/declaration";
import FCodeEditor from "../../code-editor/src/code-editor.component";
export default defineComponent({
    name: 'FCodeEditorDesigner',
    props: codeEditorDesigner,
    setup(props: CodeEditorDesigner, context) {
        let filePath = '';
        const codeEditor = ref();
        /**
         * 打开文件
         * @param path - 文件路径
         * @param content - 文件内容
         */
        async function open(path: string, content?: string): Promise<void> {
            filePath = path;
            await codeEditor.value.open(path, content);
        }

        /**
         * 类新增方法片段
         * @param path 文件路径
         * @param method 方法结构描述
         * @param _class 类名，为空则默认第一个类
         */
        async function addMethod(path: string, method: IMethod, _class?: string): Promise<void> {
            await codeEditor.value.addMethod(path, method, _class);
        }

        /**
         * 获取文件解析结果
         * @param path - 文件路径
         * @param errorRecovery - 是否忽略语法错误并继续解析
         * @returns 文件内容及类结构，如果文件尚未打开则返回null
         */
        async function resolve(path: string, errorRecovery: boolean = false): Promise<{ content: string; hasFatalError?: boolean; classes?: IClass[]; }> {
            return await codeEditor.value.resolve(path, errorRecovery);
        }

        /**
         * 保存文件
         * @remarks
         * 将文件的changed属性设置为false，并且记录最后一次保存的文件内容，允许撤销修改
         * 如果文件尚未打开则静默失败
         * @param path - 文件路径
         * @param triggerChangedEvent - 是否触发内容变化事件（默认不触发，如果设置为true，则将触发Changed和OutlineChanged事件，当然，changed属性一定为false）
         */
        async function save(path: string, triggerChangedEvent: boolean = false): Promise<void> {
            await codeEditor.value.save(path, triggerChangedEvent);
        }

        /**
         * 关闭文件
         * @param path - 文件路径
         */
        function close(path: string): void {
            codeEditor.value.close(path);
        }

        /**
         * 监听内容变化事件
         * @remarks 注意：本方法的changeInfo中不会包含类结构信息，需要类结构信息需要订阅onOutlineChanged方法
         * @param fn 内容变化回调方法
         */
        async function onChanged(fn: (path: string, changeInfo: ChangeInfo) => void): Promise<void> {
            await codeEditor.value.onChanged(fn);
        }

        /**
         * 监听内容变化事件（该方法是经过防抖处理的）
         * @param fn 内容变化回调方法
         */
        async function onOutlineChanged(fn: (path: string, changeInfo: ChangeInfo) => void): Promise<void> {
            await codeEditor.value.onOutlineChanged(fn);
        }

        /**
         * 更改编辑器配置
         * @param path 文件路径
         * @param option 配置对象
         */
        async function updateOptions(path: string, newOptions: IEditorOptions & IGlobalEditorOptions): Promise<void> {
            await codeEditor.value.updateOptions(path, newOptions);
        }

        /**
         * 设置主题
         * @param isDarkTheme 是否深色主题
         */
        async function setTheme(isDarkTheme: boolean): Promise<void> {
            await codeEditor.value.setTheme(isDarkTheme);
        }

        /**
         * 定位当前光标位置
         * @param path 文件路径
         * @param className 类名
         * @param methodName 方法名
         */
        async function position(path: string, className: string, methodName: string): Promise<void> {
            await codeEditor.value.position(path, className, methodName);
        }
        context.expose({ save, open, addMethod, resolve, close, position, onOutlineChanged, onChanged, setTheme });
        return () => {
            return <div class="code-editor--wrapper" >
                <div class="code-editor--content">
                    <div class="code-editor--main">
                        <FCodeEditor ref={codeEditor} class="code-editor--monaco"></FCodeEditor>
                    </div>
                </div>
            </div>;
        };
    }
});

import { defineComponent, watch, onBeforeUnmount, onMounted, ref, onUnmounted } from "vue";
import { CodeEditorProps, codeEditorProps } from "./code-editor.props";
import "./code-editor.scss";
import { TSEditor, TSHooks } from "./composition/editor-core/ts/editor";
import { JavaEditor } from "./composition/editor-core/java/editor";
import { HighLightEditor } from "./composition/editor-core/other/editor";
import { highLightHooks, loadMonaco, tsHooks } from "./composition/hooks/hooks";
import { IEditorOptions, IGlobalEditorOptions, IStandaloneThemeData } from "./composition/types/monaco.interface";
import { TsFileLoaderService } from "./composition/hooks/ts-file-loader.service";
import { TsPackageLoaderService } from "./composition/hooks/ts-package-loader.service";
import { Events } from "./composition/editor-core/libs/enum";
import { ChangeInfo, IClass, IMethod } from "./composition/editor-core/libs/interfaces/declaration";
import { CodeEditor } from "./composition/editor-core/editor";
import { CompletionConfigManager } from "./composition/ai-completion/config/completion-config";
/** 加载并初始化monaco编辑器 */
let loadPromise: Promise<void>;
type DefineThemeFn = (themeName: string, themeData: IStandaloneThemeData) => void;

export default defineComponent({
    name: 'FCodeEditor',
    props: codeEditorProps,
    setup(props: CodeEditorProps, context) {
        const tsFileLoader = new TsFileLoaderService();
        const tsPackageLoader = new TsPackageLoaderService();
        let tsEditor: TSEditor;

        let javaEditor: JavaEditor;

        let otherEditor: HighLightEditor;

        const editorViewChild = ref();
        const wrapViewChild = ref();

        function init(): void {
            // 设置编辑器钩子函数
            tsHooks.loadTSFiles = tsFileLoader.load.bind(tsFileLoader);
            tsHooks.loadTSPackages = tsPackageLoader.load.bind(tsPackageLoader);
            tsHooks.getDtsManifest = tsPackageLoader.getDtsManifest.bind(tsPackageLoader);
            // 实例化各个语言的编辑器服务
            tsEditor = new TSEditor(editorViewChild.value, tsHooks as TSHooks);
            javaEditor = new JavaEditor(editorViewChild.value, highLightHooks);
            otherEditor = new HighLightEditor(editorViewChild.value, highLightHooks);
        }

        /** 在默认主题的基础上自定义样式 */
        async function defineCustomTheme(): Promise<void> {
            await loadPromise;
            const monaco: any = await loadMonaco();
            const defineTheme: DefineThemeFn = monaco && monaco.editor && monaco.editor.defineTheme;
            if (!defineTheme || typeof defineTheme !== 'function') {
                return;
            }
            defineTheme("vs", {
                base: 'vs',
                inherit: true,
                rules: [],
                colors: {
                    'editor.background': '#FFFFFF'
                }
            });
        }
        function initMonaco() {
            if (!loadPromise) {
                loadPromise = new Promise<void>((resolve) => {
                    const baseUrl = '/platform/common/web/assets/monaco';
                    const onGotAmdLoader: any = () => {
                        (window as any).require.config({
                            paths: { 'vs': `${baseUrl}/vs` },
                            'vs/nls': { 'availableLanguages': { '*': 'zh-cn' } }
                        });
                        init();
                        resolve();
                    };
                    // load AMD loader if necessary
                    if (!(window as any).require) {
                        const loaderScript: HTMLScriptElement = document.createElement('script');
                        loaderScript.type = 'text/javascript';
                        loaderScript.src = `${baseUrl}/vs/loader.js`;
                        loaderScript.addEventListener('load', onGotAmdLoader);
                        document.body.appendChild(loaderScript);
                    } else {
                        onGotAmdLoader();
                    }
                });
            }
            defineCustomTheme();
        }

        /**
         * 根据文件后缀判断使用哪个编辑器打开
         * @param path 文件路径
         * @returns 代码编辑器
         */
        function openWith(path: string): CodeEditor | null {
            if (!path) {
                return null;
            }
            // 对于ts和java文件，采用专门的编辑器进行编辑
            if (path.toLowerCase().endsWith(".ts")) {
                return tsEditor;
            }
            else if (path.toLowerCase().endsWith(".java")) {
                return javaEditor;
            }
            else {
                // 对于其它类型的文件，一律采用高亮编辑器进行编辑
                return otherEditor;
            }
        }

        /**
         * 打开文件
         * @param path - 文件路径
         * @param content - 文件内容
         */
        async function open(path: string, content?: string): Promise<void> {
            await loadPromise;
            const editor = openWith(path);
            if (!editor) {
                return;
            }
            await editor.open(path, content);
        }

        /**
         * 获取文件解析结果
         * @param path - 文件路径
         * @param errorRecovery - 是否忽略语法错误并继续解析
         * @returns 文件内容及类结构，如果文件尚未打开则返回null
         */
        async function resolve(path: string, errorRecovery: boolean = false): Promise<{ content: string; hasFatalError?: boolean; classes?: IClass[]; } | null> {
            await loadPromise;
            const editor = openWith(path);
            if (!editor) {
                return null;
            }
            return await editor.resolve(path, errorRecovery);
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
            await loadPromise;
            const editor = openWith(path);
            if (!editor) {
                return;
            }
            await editor.save(path, triggerChangedEvent);
        }

        /**
         * 类新增方法片段
         * @param path 文件路径
         * @param method 方法结构描述
         * @param _class 类名，为空则默认第一个类
         */
        async function addMethod(path: string, method: IMethod, _class?: string): Promise<void> {
            await loadPromise;
            const editor = openWith(path);
            if (!editor) {
                return;
            }
            await editor.addMethod(path, method, _class);
        }

        /**
         * 关闭文件
         * @param path - 文件路径
         */
        function close(path: string): void {
            // 当编辑器找不到对应的文件时会静默失败
            tsEditor && tsEditor.close(path, true);
            javaEditor && javaEditor.close(path, true);
            otherEditor && otherEditor.close(path, true);
        }

        /** 处理容器大小变化事件 */
        function handleContainerResize() {
            tsEditor && tsEditor.layout();
            javaEditor && javaEditor.layout();
            otherEditor && otherEditor.layout();
        };

        /**
         * 监听内容变化事件
         * @remarks 注意：本方法的changeInfo中不会包含类结构信息，需要类结构信息需要订阅onOutlineChanged方法
         * @param fn 内容变化回调方法
         */
        async function onChanged(fn: (path: string, changeInfo: ChangeInfo) => void): Promise<void> {
            await loadPromise;
            tsEditor && tsEditor.on(Events.Changed, fn);
            javaEditor && javaEditor.on(Events.Changed, fn);
            otherEditor && otherEditor.on(Events.Changed, fn);
        }

        /**
         * 监听内容变化事件（该方法是经过防抖处理的）
         * @param fn 内容变化回调方法
         */
        async function onOutlineChanged(fn: (path: string, changeInfo: ChangeInfo) => void): Promise<void> {
            await loadPromise;
            tsEditor && tsEditor.on(Events.OutlineChanged, fn);
            javaEditor && javaEditor.on(Events.OutlineChanged, fn);
            otherEditor && otherEditor.on(Events.OutlineChanged, fn);
        }

        /**
         * 更改编辑器配置
         * @param path 文件路径
         * @param option 配置对象
         */
        async function updateOptions(path: string, newOptions: IEditorOptions & IGlobalEditorOptions): Promise<void> {
            await loadPromise;
            const editor = openWith(path);
            if (!editor || !newOptions) {
                return;
            }
            const file = editor.getExistFile(path);
            file && file.instance && file.instance.updateOptions && file.instance.updateOptions(newOptions);
        }

        /**
         * 设置主题
         * @param isDarkTheme 是否深色主题
         */
        async function setTheme(isDarkTheme: boolean): Promise<void> {
            await loadPromise;
            tsEditor && tsEditor.setDark(isDarkTheme);
            javaEditor && javaEditor.setDark(isDarkTheme);
            otherEditor && otherEditor.setDark(isDarkTheme);
        }

        /**
         * 定位当前光标位置
         * @param path 文件路径
         * @param className 类名
         * @param methodName 方法名
         */
        async function position(path: string, className: string, methodName: string): Promise<void> {
            await loadPromise;
            const editor = openWith(path);
            if (!editor) {
                return;
            }
            editor.position(path, className, methodName);
        }
        /**
         * 初始化 AI 补全功能
         */
        async function initAICompletion() {
            if (!props.aiCompletion?.enabled) {
                return;
            }

            try {
                await loadPromise;
                await loadPromise;
                
                // 等待一小段时间确保编辑器实例已创建
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const config = CompletionConfigManager.create({
                    endpoint: props.aiCompletion.endpoint || '',
                    auth: props.aiCompletion.auth,
                    projectRoot: props.aiCompletion.projectRoot || '/',
                    enabled: true,
                    debounceDelay: props.aiCompletion.debounceDelay,
                    timeout: props.aiCompletion.timeout,
                    pollingTimeout: props.aiCompletion.pollingTimeout,
                    predictMode: props.aiCompletion.predictMode
                });

                // 验证配置
                const validation = CompletionConfigManager.validate(config);
                if (!validation.valid) {
                    return;
                }

                // 为所有编辑器启用补全
                if (tsEditor) {
                    await tsEditor.enableAICompletion(config);
                }
                if (javaEditor) {
                    await javaEditor.enableAICompletion(config);
                }
                if (otherEditor) {
                    await otherEditor.enableAICompletion(config);
                }
            } catch (error) {
                // 静默处理错误
            }
        }

        /**
         * 禁用 AI 补全功能
         */
        function disableAICompletion() {
            if (tsEditor) {
                tsEditor.disableAICompletion();
            }
            if (javaEditor) {
                javaEditor.disableAICompletion();
            }
            if (otherEditor) {
                otherEditor.disableAICompletion();
            }
        }

        // 监听 aiCompletion prop 变化
        watch(
            () => props.aiCompletion,
            async (newConfig, oldConfig) => {
                // 如果从启用变为禁用，先禁用
                if (oldConfig?.enabled && !newConfig?.enabled) {
                    disableAICompletion();
                    return;
                }

                // 如果启用，初始化补全功能
                if (newConfig?.enabled) {
                    await initAICompletion();
                }
            },
            { immediate: true, deep: true }
        );

        const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            if (entries.length) {
                handleContainerResize();
            }
        });
        onMounted(() => {
            initMonaco();
            observer.observe(editorViewChild.value);
            
            // 初始化补全功能（如果已启用）
            if (props.aiCompletion?.enabled) {
                // 延迟初始化，确保编辑器实例已创建
                if (loadPromise) {
                    loadPromise.then(() => {
                        setTimeout(() => {
                            initAICompletion();
                        }, 200);
                    }).catch(() => {
                        // 静默处理错误
                    });
                } else {
                    setTimeout(() => {
                        if (loadPromise) {
                            loadPromise.then(() => {
                                setTimeout(() => {
                                    initAICompletion();
                                }, 200);
                            });
                        }
                    }, 500);
                }
            }
        });
                       
        onUnmounted(() => {
            observer.disconnect();
            // 清理补全资源
            disableAICompletion();
        });
        context.expose({ position, updateOptions, setTheme, open, onOutlineChanged, onChanged, handleContainerResize, addMethod, save, resolve, close });

        return () => {
            return <div class="ide-code-editor" ref={wrapViewChild}>
                <div class="editor-container" ref={editorViewChild}></div>
            </div>;
        };
    }
});

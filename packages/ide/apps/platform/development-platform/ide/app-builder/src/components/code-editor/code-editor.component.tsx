import { defineComponent, onMounted, ref, type Ref, watch } from "vue";

type VSCodeModule = typeof import('../../../vs/workbench/workbench.web.main.internal.js');
let vscodeModulePromise: Promise<VSCodeModule> | null = null;

function loadVSCodeModule() {
    if (!vscodeModulePromise) {
        vscodeModulePromise = import('../../../vs/workbench/workbench.web.main.internal.js');
    }
    return vscodeModulePromise;
}

function appendStylesheetOnce(id: string, href: string): Promise<void> {
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    if (existing) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`加载样式失败: ${href}`));
        document.head.appendChild(link);
    });
}

function appendScriptOnce(id: string, src: string): Promise<void> {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
        document.head.appendChild(script);
    });
}

async function ensureVSCodeRuntimeAssets() {
    await Promise.all([
        appendStylesheetOnce('vscode-workbench-css', '/vscode/vs/workbench/workbench.web.main.internal.css'),
        appendScriptOnce('vscode-nls-messages', '/vscode/nls.messages.js'),
    ]);
}

export async function preloadVSCodeResources() {
    await ensureVSCodeRuntimeAssets();
    await loadVSCodeModule();
}

async function setServerRootDir(rootDir: string): Promise<void> {
    const res = await fetch('/__localfs/set-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootDir }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`set-root failed: ${err.error ?? res.statusText}`);
    }
}

export default defineComponent({
    name: 'FAppCodeEditor',
    props: {
        rootDir: {
            type: String,
            default: '',
        },
    },
    emits: [],
    setup(props, { expose }) {
        const initialized = ref(false);
        const vscodeContainerRef: Ref<HTMLDivElement | undefined> = ref();

        function ensureVsCodeFileRoot() {
            const g = globalThis as typeof globalThis & { _VSCODE_FILE_ROOT?: string };
            if (g._VSCODE_FILE_ROOT) {
                return;
            }
            const base = import.meta.env.BASE_URL ?? '/';
            const prefix = base.endsWith('/') ? base : `${base}/`;
            g._VSCODE_FILE_ROOT = new URL(`${prefix}vscode/`, window.location.href).href;
        }

        async function initializeVSCode(rootDir: string) {
            if (initialized.value) {
                return;
            }
            const container = vscodeContainerRef.value;
            if (!container) {
                return;
            }
            try {
                ensureVsCodeFileRoot();
                const preloadPromise = preloadVSCodeResources();
                const setRootPromise = rootDir ? setServerRootDir(rootDir) : Promise.resolve();
                await Promise.all([preloadPromise, setRootPromise]);
                if (rootDir) {
                    console.log(`[code-editor] 服务器根目录已设置为: ${rootDir}`);
                }
                const { create, URI } = await loadVSCodeModule();
                const localfsExtensionUri = URI.parse(
                    `${window.location.origin}/extensions/localfs-provider`
                );
                const options = {
                    workspaceProvider: {
                        workspace: { folderUri: URI.parse('localfs:///') },
                        trusted: true,
                        open: async (_workspace: unknown, _options: unknown) => true,
                    },
                    additionalBuiltinExtensions: [localfsExtensionUri],
                    resourceUriProvider: (uri: { scheme: string; path: string }) => {
                        if (uri.scheme === 'http' || uri.scheme === 'https') {
                            return uri;
                        }
                        const p = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;
                        const fullUrl = new URL(p, globalThis._VSCODE_FILE_ROOT).toString();
                        return URI.parse(fullUrl);
                    },
                    windowIndicator: {
                        label: '$(remote) Contacts',
                        tooltip: 'VS Code Web - Local FS',
                    },
                    configurationDefaults: {
                        'editor.fontSize': 14,
                        'editor.fontFamily': 'Consolas, "Courier New", monospace',
                        'workbench.tree.indent': 12,
                        'workbench.tree.renderIndentGuides': 'always',
                    },
                };
                create(container, options);
                initialized.value = true;
                console.log('VS Code工作台创建成功');
            } catch (error) {
                console.error('创建VS Code工作台失败:', error);
            }
        }

        expose({ initializeVSCode });

        onMounted(() => {
            // 兜底初始化：避免父组件在异步挂载阶段尚未拿到 ref 导致初始化丢失
            initializeVSCode(props.rootDir);
        });

        watch(
            () => props.rootDir,
            (rootDir) => {
                if (!initialized.value && rootDir) {
                    initializeVSCode(rootDir);
                }
            }
        );

        return () => {
            return <div ref={vscodeContainerRef} id="vscode-container" class="flex-fill"></div>
        };
    }
});

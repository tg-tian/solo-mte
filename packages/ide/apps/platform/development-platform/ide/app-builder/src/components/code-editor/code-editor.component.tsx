import { defineComponent, ref, type Ref } from "vue";
import { FSplitter, FSplitterPane } from "@farris/ui-vue";
import { create, URI } from '../../../vs/workbench/workbench.web.main.internal.js';

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
    props: {},
    emits: [],
    setup(props, { expose }) {
        const initialized = ref(false);
        const vscodeContainerRef: Ref<HTMLDivElement | undefined> = ref();

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
                if (rootDir) {
                    await setServerRootDir(rootDir);
                    console.log(`[code-editor] 服务器根目录已设置为: ${rootDir}`);
                }
                ensureVsCodeFileRoot();
                create(container, options);
                initialized.value = true;
                console.log('VS Code工作台创建成功');
            } catch (error) {
                console.error('创建VS Code工作台失败:', error);
            }
        }

        expose({ initializeVSCode });

        return () => {
            return <div ref={vscodeContainerRef} id="vscode-container" class="flex-fill"></div>
        };
    }
});

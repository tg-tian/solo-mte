import { defineComponent, ref, type Ref } from "vue";
import { FSplitter, FSplitterPane } from "@farris/ui-vue";
import { create, URI } from '../../../vs/workbench/workbench.web.main.internal.js';

export default defineComponent({
    name: 'FAppCodeEditor',
    props: {},
    emits: [],
    setup(props, { expose }) {
        const initialized = ref(false);
        const vscodeContainerRef: Ref<HTMLDivElement | undefined> = ref();

        // VSCode Server (REH) 的 authority，由 packages/ide/vscode/start-server.sh 启动
        // 开发期默认连本机 8000 端口；生产期可经同源反代，指向 window.location.host
        const env = (import.meta as any).env ?? {};
        const remoteAuthority: string = env.VITE_VSCODE_REMOTE_AUTHORITY || 'localhost:8000';

        function ensureVsCodeFileRoot() {
            const g = globalThis as typeof globalThis & { _VSCODE_FILE_ROOT?: string };
            if (g._VSCODE_FILE_ROOT) {
                return;
            }
            const base = import.meta.env.BASE_URL ?? '/';
            const prefix = base.endsWith('/') ? base : `${base}/`;
            g._VSCODE_FILE_ROOT = new URL(`${prefix}vscode/`, window.location.href).href;
        }

        async function ensureNlsMessagesLoaded() {
            const g = globalThis as typeof globalThis & {
                _VSCODE_NLS_MESSAGES?: unknown[];
            };
            if (Array.isArray(g._VSCODE_NLS_MESSAGES) && typeof g._VSCODE_NLS_MESSAGES[1879] === 'string') {
                return;
            }

            const fileRoot = (globalThis as typeof globalThis & { _VSCODE_FILE_ROOT?: string })._VSCODE_FILE_ROOT;
            if (!fileRoot) {
                return;
            }

            // workbench.web.main.internal 在启动 web worker 时依赖该全局变量传递本地化表。
            await import(/* @vite-ignore */ `${fileRoot}nls.messages.js`);
        }

        function buildOptions(rootDir: string) {
            // rootDir 由调用方传入，作为 server 端真实磁盘路径打开
            const folderUri = URI.from({
                scheme: 'vscode-remote',
                authority: remoteAuthority,
                path: rootDir || '/'
            });

            return {
                // 屏蔽内置 GitHub 认证扩展
                disableExtensions: ['vscode.github-authentication'],
                // 内置 product 含 defaultChatAgent（Copilot/GitHub），会触发 getAccounts('github') → 无 provider 则 5s 超时。
                // 通过 productConfiguration 覆盖为 null，ChatEntitlementService 会直接 return，不再请求 github 会话。
                // 开启 Remote 模式：workbench 走 WebSocket 连 server，
                // Extension Host 跑在 server 的 Node 进程里，可加载桌面版扩展
                remoteAuthority,
                // start-server.sh 默认 --without-connection-token，这里就不传
                connectionToken: undefined,

                workspaceProvider: {
                    workspace: { folderUri },
                    trusted: true,
                    open: async (_workspace: unknown, _options: unknown) => true,
                },

                // 不要设置 resourceUriProvider 并把 vscode-remote 原样返回：浏览器无法用 vscode-remote:
                // 作为 <img src> / fetch，扩展贡献的图标会报 CORS。默认由 RemoteAuthorities.rewrite 转为
                // http(s)://<remote>/…/vscode-remote-resource?path=… 由 server 提供内容。
                // 本地 workbench 静态资源仍依赖 ensureVsCodeFileRoot() 的 _VSCODE_FILE_ROOT（/vscode/）。

                windowIndicator: {
                    label: '$(remote) Contacts',
                    tooltip: `VS Code Remote - ${remoteAuthority}`,
                },

                configurationDefaults: {
                    'editor.fontSize': 14,
                    'editor.fontFamily': 'Consolas, "Courier New", monospace',
                    'workbench.tree.indent': 12,
                    'workbench.tree.renderIndentGuides': 'always',
                    // Node 21+ 自带全局 navigator；不开启时 VS Code 会用 getter 拦截并抛 PendingMigrationError，Cline 等扩展会误触
                    'extensions.supportNodeGlobalNavigator': true,
                },

                // Code-OSS / 自建 Web Workbench 未内置微软 Marketplace；通过 Open VSX 在扩展视图里搜索安装
                // （与桌面「正式版 VS Code」的 marketplace.visualstudio.com 不是同一套服务）
                productConfiguration: {
                    defaultChatAgent: null,
                    extensionsGallery: {
                        serviceUrl: 'https://open-vsx.org/vscode/gallery',
                        itemUrl: 'https://open-vsx.org/vscode/item',
                        resourceUrlTemplate:
                            'https://open-vsx.org/vscode/asset/{publisher}/{name}/{version}/Microsoft.VisualStudio.Services.VSIXPackage',
                    },
                } as Record<string, unknown>,
            };
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
                await ensureNlsMessagesLoaded();
                const options = buildOptions(rootDir);
                console.log(`[code-editor] 打开远端工作区: vscode-remote://${remoteAuthority}${rootDir || '/'}`);
                create(container, options);
                initialized.value = true;
                console.log('VS Code 工作台创建成功');
            } catch (error) {
                console.error('创建 VS Code 工作台失败:', error);
            }
        }

        expose({ initializeVSCode });

        return () => {
            return <div ref={vscodeContainerRef} id="vscode-container" class="f-admin-main f-page-main flex-fill"></div>
        };
    }
});

import { defineConfig, type ViteDevServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

function isWithinRoot(filePath: string, root: string): boolean {
    const sep = path.sep;
    const prefix = root.endsWith(sep) ? root : root + sep;
    return filePath === root || filePath.startsWith(prefix);
}

/**
 * Vite 插件：将 /extensions/** 下的静态文件直接返回（绕过 Vite 模块变换），
 * 确保 VS Code 的 Extension Host Worker 能正确加载扩展代码。
 * 依次查找多个根目录：public/extensions（如 localfs-provider）、内置扩展目录。
 */
function extensionPublicPassthrough(extensionRoots: string[]) {
    const roots = extensionRoots.map((r) => path.resolve(r));
    const MIME: Record<string, string> = {
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.woff2': 'font/woff2',
    };
    return {
        name: 'extension-public-passthrough',
        enforce: 'pre' as const,
        configureServer(server: ViteDevServer) {
            const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                const raw = req.url?.split('?')[0] ?? '';
                if (!raw.startsWith('/extensions/')) return next();
                const rel = decodeURIComponent(raw.slice('/extensions/'.length));

                const tryRoot = (i: number): void => {
                    if (i >= roots.length) return next();
                    const extRoot = roots[i];
                    const filePath = path.resolve(extRoot, rel);
                    if (!isWithinRoot(filePath, extRoot)) return tryRoot(i + 1);
                    fs.readFile(filePath, (err, data) => {
                        if (err) return tryRoot(i + 1);
                        const ext = path.extname(filePath).toLowerCase();
                        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.end(data);
                    });
                };
                tryRoot(0);
            };
            server.middlewares.stack.unshift({ route: '', handle: handler });
        },
    };
}

/**
 * Workbench 通过 amd 加载器（resolveAmdNodeModule）把 npm 包名解析成站点根路径
 * `/node_modules/&lt;pkg&gt;/&lt;subpath&gt;`，在浏览器里用 script/import 拉取。
 * 这与「是否部署整份 node_modules」无关：只是 **URL 形如** /node_modules/… 的静态资源。
 *
 * 开发：优先读 packages/ide/node_modules；生产可只部署 `public/node_modules`（由 sync-xterm-to-public 生成）。
 */
function nodeModulesPassthrough(nodeModulesRoots: string[]) {
    const roots = nodeModulesRoots.map((r) => path.resolve(r));
    const MIME: Record<string, string> = {
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json',
        '.wasm': 'application/wasm',
    };
    return {
        name: 'node-modules-passthrough',
        enforce: 'pre' as const,
        configureServer(server: ViteDevServer) {
            const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                const raw = req.url?.split('?')[0] ?? '';
                if (!raw.startsWith('/node_modules/')) return next();
                const rel = decodeURIComponent(raw.slice('/node_modules/'.length));

                const tryRoot = (i: number): void => {
                    if (i >= roots.length) return next();
                    const root = roots[i];
                    const rootPrefix = root + path.sep;
                    const filePath = path.resolve(root, rel);
                    if (!filePath.startsWith(rootPrefix)) return tryRoot(i + 1);
                    fs.readFile(filePath, (err, data) => {
                        if (err) return tryRoot(i + 1);
                        const ext = path.extname(filePath).toLowerCase();
                        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.end(data);
                    });
                };
                tryRoot(0);
            };
            server.middlewares.stack.unshift({ route: '', handle: handler });
        },
    };
}

/**
 * VS Code Web 会通过 import() 拉取 /vscode/** 下的 .js；这些文件在 public 里时，
 * Vite 会拒绝走模块管线（“should not be imported from source code”）。
 * 在开发服务器最前面直接按磁盘读出并返回，绕过该检查。
 */
function vscodePublicPassthrough(vscodeDir: string) {
    const root = path.resolve(vscodeDir);
    const rootPrefix = root + path.sep;
    const MIME: Record<string, string> = {
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.wasm': 'application/wasm',
        '.map': 'application/json',
        '.html': 'text/html; charset=utf-8',
        '.ttf': 'font/ttf',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.mp3': 'audio/mpeg',
        '.scm': 'text/plain; charset=utf-8',
    };

    return {
        name: 'vscode-public-passthrough',
        enforce: 'pre' as const,
        configureServer(server: ViteDevServer) {
            const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                const raw = req.url?.split('?')[0] ?? '';
                if (!raw.startsWith('/vscode/')) {
                    return next();
                }
                const rel = decodeURIComponent(raw.slice('/vscode/'.length));
                const filePath = path.resolve(root, rel);
                if (!filePath.startsWith(rootPrefix)) {
                    return next();
                }
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        return next();
                    }
                    const ext = path.extname(filePath).toLowerCase();
                    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
                    res.end(data);
                });
            };
            server.middlewares.stack.unshift({ route: '', handle: handler });
        },
    };
}

// https://vitejs.dev/config/
const ideBuiltinExtensionsDir = path.resolve(
    __dirname,
    'apps/platform/development-platform/ide/extensions'
);

export default defineConfig({
    plugins: [
        extensionPublicPassthrough([
            path.resolve(__dirname, 'public', 'extensions'),
            ideBuiltinExtensionsDir,
            // Remote server 内置扩展目录：须与 vscode/start-server.sh 的 builtin-extensions-dir 一致，否则 github-authentication 等在远端 404
            path.resolve(__dirname, 'vscode', 'extensions'),
        ]),
        nodeModulesPassthrough([
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, 'public', 'node_modules'),
        ]),
        vscodePublicPassthrough(path.resolve(__dirname, 'public/vscode')),
        vue(),
        vueJsx(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5174,
        proxy: {
            "/__localfs": {
                target: "http://localhost:3456",
                changeOrigin: true,
                secure: false
            },
            "/api": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false
            },
            '/api/dev/main/v1.0/lcm-log/ws': {
                target: 'ws://localhost:5200', // 后端 WebSocket 地址
                changeOrigin: true, // 允许跨域
                ws: true, // 启用 WebSocket 代理
            },
            "/platform": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false
            },
            /**
             * /apps 默认走运行时 (5200)；
             * 以 /apps/platform/development-platform 开头的 IDE 子应用页面与资源须由本机 Vite(5174) 处理，不能交给 5200。
             * 用 bypass 跳过代理：须 **返回 string**（会写回 req.url 并 next），由 Vite 处理。
             * 注意：当前 Vite 若 return false 会错误地执行 res.end(404)，把 404 当 chunk 写出并报错。
             */
            '/apps': {
                target: 'http://localhost:5200',
                changeOrigin: true,
                secure: false,
                bypass(req) {
                    const pathname = (req.url || '').split('?')[0] || '';
                    if (pathname.startsWith('/apps/platform/development-platform')) {
                        return req.url || '/';
                    }
                },
            },
            "/runtime": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false
            },
            "/devices": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
                secure: false
            },
            "/deviceShadows": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
                secure: false
            },
            "/providers": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
                secure: false
            },
            "/discoverDevices": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
                secure: false
            },
            "/system": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
                secure: false
            },
            "/ws": {
                target: "ws://127.0.0.1:3000",
                changeOrigin: true,
                ws: true,
                secure: false
            },
            "/workbench": {
                target: "http://127.0.0.1:8080",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/workbench/, "")
            },
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                appBoard: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-board/index.html'),
                appBuilder: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                appCenter: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html'),
                appPreview: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-preview/index.html'),
                appView: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-view/index.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../'),
            // 避免依赖预构建解析到已过期的 pnpm 物理路径（ENOENT index.es.js）
            '@ubml/common': path.resolve(__dirname, 'node_modules/@ubml/common'),
            // '@farris/ui-vue': resolve(__dirname, '../ui-vue'),
            // '@farris/farris-admin': resolve(__dirname, './src')
        }
    },
    optimizeDeps: {
        include: ['@ubml/common']
    }
});

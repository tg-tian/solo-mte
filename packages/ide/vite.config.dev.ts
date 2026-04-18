import { defineConfig, type ViteDevServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Vite 插件：将 /extensions/** 下的静态文件直接返回（绕过 Vite 模块变换），
 * 确保 VS Code 的 Extension Host Worker 能正确加载扩展代码。
 */
function extensionPublicPassthrough(publicDir: string) {
    const extRoot = path.resolve(publicDir, 'extensions');
    const MIME: Record<string, string> = {
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json',
    };
    return {
        name: 'extension-public-passthrough',
        enforce: 'pre' as const,
        configureServer(server: ViteDevServer) {
            const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                const raw = req.url?.split('?')[0] ?? '';
                if (!raw.startsWith('/extensions/')) return next();
                const rel = decodeURIComponent(raw.slice('/extensions/'.length));
                const filePath = path.resolve(extRoot, rel);
                if (!filePath.startsWith(extRoot)) return next();
                fs.readFile(filePath, (err, data) => {
                    if (err) return next();
                    const ext = path.extname(filePath).toLowerCase();
                    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(data);
                });
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
export default defineConfig({
    plugins: [
        extensionPublicPassthrough(path.resolve(__dirname, 'public')),
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
            "/ws": {
                target: "ws://127.0.0.1:3000",
                changeOrigin: true,
                ws: true,
                secure: false
            },
            "/workbench": {
                target: "http://127.0.0.1:8080",
                changeOrigin: true,
                secure: false
            },
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                appBuilder: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                appCenter: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html'),
                appPreview: path.resolve(__dirname, 'apps/platform/development-platform/ide/app-preview/index.html')
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

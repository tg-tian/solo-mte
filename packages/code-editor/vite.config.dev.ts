// / <reference types="vitest" />
import { defineConfig } from 'vite';
import type { InlineConfig } from 'vitest';
import type { UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

interface VitestConfigExport extends UserConfig {
    test: InlineConfig;
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx()],
    test: {
        // 启用类似 jest 的全局测试 API
        globals: true,
        // 使用 happy-dom 模拟 DOM
        // 这需要你安装 happy-dom 作为对等依赖（peer dependency）
        environment: 'happy-dom',
        include: ['']
        // include: ['**/*.spec.tsx']
    },
    resolve: {
        alias: {
        }
    },
    server: {
        proxy: {
            // AI 代码补全接口代理 - 需要放在 /api 之前，优先匹配
            "/api/predict": {
                target: "http://192.168.1.195:12000",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, '') // 移除 /api 前缀，直接转发到 /predict
            },
            "/api/get_results": {
                target: "http://192.168.1.195:12000",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, '') // 移除 /api 前缀，直接转发到 /get_results
            },
            // 其他 API 代理
            "/api": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false
            },
            "/platform": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false,
                ws: true // 支持 WebSocket
            }
        },
    }
} as VitestConfigExport);

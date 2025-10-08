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
            "/api": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false
            }
        },
    }
} as VitestConfigExport);

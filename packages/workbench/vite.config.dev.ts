import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [vue(), vueJsx()],
        server: {
            host: '0.0.0.0',
            port: 5173,
            proxy: {
                "/api": {
                    target: "http://localhost:5200",
                    changeOrigin: true,
                    secure: false
                },
                "/apps/platform/development-platform": {
                    target: "http://localhost:5174",
                    changeOrigin: true,
                    secure: false
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
                }
        }
        },
        build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                    domain: resolve(__dirname, 'apps/platform/domain-platform/customize/domain/index.html'),
                    scenario: resolve(__dirname, 'apps/platform/scenario-platform/customize/scenario/index.html'),
                    'device-model-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-model-list/index.html'),
                    'device-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-list/index.html'),
                    // 'node-type-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/node-type-list/index.html'),
                    'component-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-list/index.html')
                    // appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                    // appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html')
                }
            }
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/shared/src'),
                '@workbench': resolve(__dirname, '../')
            }
        }
    };
});

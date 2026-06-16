import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

const APP_ENTRIES = {
    main: resolve(__dirname, 'index.html'),
    appBoard: resolve(__dirname, 'apps/platform/development-platform/ide/app-board/index.html'),
    appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
    appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html'),
    appPreview: resolve(__dirname, 'apps/platform/development-platform/ide/app-preview/index.html'),
    appView: resolve(__dirname, 'apps/platform/development-platform/ide/app-view/index.html'),
};

// CSS 根据来源模块路径分配到对应子目录
const APP_CSS_DIRS = [
    'apps/platform/development-platform/ide/app-board',
    'apps/platform/development-platform/ide/app-builder',
    'apps/platform/development-platform/ide/app-center',
    'apps/platform/development-platform/ide/app-preview',
    'apps/platform/development-platform/ide/app-view',
];

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    build: {
        rollupOptions: {
            input: APP_ENTRIES,
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        const moduleId = (assetInfo as any).facadeModuleId || '';
                        for (const dir of APP_CSS_DIRS) {
                            if (moduleId.includes(dir)) {
                                return `${dir}/[name].[hash].[ext]`;
                            }
                        }
                    }
                    return 'assets/[name].[hash].[ext]';
                },
                chunkFileNames: 'apps/platform/development-platform/ide/[name].[hash].js',
                entryFileNames: 'apps/platform/development-platform/ide/[name].[hash].js',
            },
        },
    },
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: {
            '@': resolve(__dirname, '../'),
            '@ubml/common': resolve(__dirname, 'node_modules/@ubml/common'),
        },
    },
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                'apps/platform/development-platform/ide/app-builder/index': resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                'apps/platform/development-platform/ide/app-center/index': resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html')
            },
            output: {
                assetFileNames: '[name].[hash].[ext]',
                chunkFileNames: '[name].[hash].js',
                entryFileNames: '[name].[hash].js'
            }
        }
    },
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: {
            // "@farris/ui-vue": resolve(__dirname, './node_modules/@farris/ui-vue'),
        }
    }
});

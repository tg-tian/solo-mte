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
                'apps/platform/domain-platform/customize/domain/index': resolve(__dirname, 'apps/platform/domain-platform/customize/domain/index.html')
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
            '@': resolve(__dirname, '../')
        }
    }
});

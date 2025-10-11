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
                'apps/platform/domain-platform/customize/domain/index': resolve(__dirname, 'apps/platform/domain-platform/customize/domain/index.html'),
                'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-list/index': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-list/index.html'),
                'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-customize/index': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-customize/index.html'),
                'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-list/index': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-list/index.html'),
                'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-customize/index': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-customize/index.html')
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
            "@farris/ui-vue": resolve(__dirname, './node_modules/@farris/ui-vue'),
            '@farris/farris-admin': resolve(__dirname, './src/')
        }
    }
});

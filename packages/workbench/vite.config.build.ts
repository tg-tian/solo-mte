import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    build:{
        rollupOptions:{
            output:{
                assetFileNames:'[name].[hash].[ext]',
                chunkFileNames:'[name].[hash].js',
                entryFileNames:'[name].[hash].js'
            }
        }
    },
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: {
            '@farris/ui-vue/components': resolve(__dirname, './node_modules/@farris/ui-vue')
        }
    }
});

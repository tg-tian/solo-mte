import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';


// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: {
            // '@': resolve(__dirname, '../'),
            // '@farris/ui-vue': resolve(__dirname, '../ui-vue'),
            '@farris/ui-vue': resolve(__dirname, './node_modules/@farris/ui-vue'),
            '@farris/code-editor-vue': resolve(__dirname, '../code-editor')
        }
    }
});

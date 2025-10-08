import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx()],
    server: {
        // proxy: {
        //     "/api": {
        //         target: "http://localhost:5200",
        //         changeOrigin: true,
        //         secure: false
        //     }
        // }
    },
    resolve: {
        alias: {
            '@farris/ui-vue': resolve(__dirname, '../ui-vue'),
            '@farris/code-editor-vue': resolve(__dirname, '../code-editor')
        }
    }
});

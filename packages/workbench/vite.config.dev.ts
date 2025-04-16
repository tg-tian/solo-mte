import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:5200",
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
                domain: resolve(__dirname, 'apps/platform/domain-platform/customize/domain/index.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, '../'),
            '@farris/ui-vue': resolve(__dirname, '../ui-vue')
        }
    }
});

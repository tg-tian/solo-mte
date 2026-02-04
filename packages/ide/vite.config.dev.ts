import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx()],
    server: {
        host: '0.0.0.0',
        port: 5174,
        proxy: {
            "/api": {
                target: "http://localhost:5200",
                changeOrigin: true,
                secure: false
            },
            '/api/dev/main/v1.0/lcm-log/ws': {
                target: 'ws://localhost:5200', // 后端 WebSocket 地址
                changeOrigin: true, // 允许跨域
                ws: true, // 启用 WebSocket 代理
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
            },
            "/devices": {
                target: "http://139.196.239.110:3000",
                changeOrigin: true,
                secure: false
            },
            "/deviceShadows": {
                target: "http://139.196.239.110:3000",
                changeOrigin: true,
                secure: false
            },
            "/providers": {
                target: "http://139.196.239.110:3000",
                changeOrigin: true,
                secure: false
            },
            "/discoverDevices": {
                target: "http://139.196.239.110:3000",
                changeOrigin: true,
                secure: false
            },
            "/ws": {
                target: "ws://139.196.239.110:3000",
                changeOrigin: true,
                ws: true,
                secure: false
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html'),
                appPreview: resolve(__dirname, 'apps/platform/development-platform/ide/app-preview/index.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, '../'),
            // '@farris/ui-vue': resolve(__dirname, '../ui-vue'),
            // '@farris/farris-admin': resolve(__dirname, './src')
        }
    }
});

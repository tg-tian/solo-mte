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
    
    // 尝试从.env.development文件加载
    const envFile = resolve(__dirname, '.env.development');
    let envVars = env;
    if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf-8');
        const parsed = dotenv.parse(envContent);
        envVars = { ...env, ...parsed };
    }
    
    return {
        plugins: [vue(), vueJsx()],
        define: {
            'import.meta.env.VITE_BASE_PATH': JSON.stringify(envVars.VITE_BASE_PATH || 'http://139.196.147.52:8080'),
            'import.meta.env.VITE_BASE_API': JSON.stringify(envVars.VITE_BASE_API || '/api'),
            'import.meta.env.VITE_TEMPLATE_PATH': JSON.stringify(envVars.VITE_TEMPLATE_PATH || 'https://lctemplates.gitlink.org.cn'),
            'import.meta.env.VITE_DOMAIN_TEMPLATE_PATH': JSON.stringify(envVars.VITE_DOMAIN_TEMPLATE_PATH || 'https://registerapi.3as.cn'),
            'import.meta.env.VITE_SCENE_TEMPLATE_PATH': JSON.stringify(envVars.VITE_SCENE_TEMPLATE_PATH || 'https://registerapi.3as.cn'),
        },
        server: {
            proxy: {
                "/api": {
                    target: envVars.VITE_BASE_PATH || "http://139.196.147.52:8080",
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api/, '')
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
                    'device-type-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-list/index.html'),
                    'device-type-setting': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-setting/index.html'),
                    'device-model-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-model-list/index.html'),
                    'node-type-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/node-type-list/index.html'),
                    'component-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-list/index.html')
                    // appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                    // appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html')
                }
            }
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/meta-modeling-app/src'),
                '@workbench': resolve(__dirname, '../')
            }
        }
    };
});

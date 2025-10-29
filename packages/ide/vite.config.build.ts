import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    build: {
        rollupOptions: {
            input: {
                // main: resolve(__dirname, 'index.html'),
                'apps/platform/development-platform/ide/app-builder/index': resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                'apps/platform/development-platform/ide/app-center/index': resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html')
            },
            output: {
                assetFileNames: (assetInfo) => {
                    // 根据资源来源分别输出到不同目录
                    if (assetInfo.name?.endsWith('.css')) {
                        console.log(assetInfo);
                        // 通过 facadeModuleId 或 source 来判断样式来源
                        const moduleId = (assetInfo as any).facadeModuleId || '';
                        const source = assetInfo.source?.toString() || '';
                        
                        // 判断是否为 app-builder 的样式
                        if (moduleId.includes('app-builder') || source.includes('app-builder')) {
                            return 'apps/platform/development-platform/ide/app-builder/[name].[hash].[ext]';
                        }
                        
                        // 判断是否为 app-center 的样式
                        if (moduleId.includes('app-center') || source.includes('app-center')) {
                            return 'apps/platform/development-platform/ide/app-center/[name].[hash].[ext]';
                        }
                    }
                    
                    // 其他资源输出到 assets 目录
                    return 'assets/[name].[hash].[ext]';
                },
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

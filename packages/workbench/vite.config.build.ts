import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';

const ROLLUP_INPUT = {
    main: resolve(__dirname, 'index.html'),
    domain: resolve(__dirname, 'apps/platform/domain-platform/customize/domain/index.html'),
    scenario: resolve(__dirname, 'apps/platform/scenario-platform/customize/scenario/index.html'),
    'device-model-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-model-list/index.html'),
    'device-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-list/index.html'),
    'template-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/template-list/index.html'),
    'component-list': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-list/index.html'),
};

const BASE = '/apps/workbench/';

// https://vitejs.dev/config/
export default defineConfig({
    base: BASE,
    build: {
        outDir: resolve(__dirname, 'dist/apps/workbench'),
        rollupOptions: {
            input: ROLLUP_INPUT,
            output: {
                assetFileNames: 'assets/[name].[hash].[ext]',
                chunkFileNames: 'assets/[name].[hash].js',
                entryFileNames: 'assets/[name].[hash].js',
            },
        },
    },
    plugins: [
        vue(),
        vueJsx(),
        {
            name: 'html-base-prefix',
            enforce: 'pre',
            transformIndexHtml(html: string) {
                return html.replace(/(href|src)="\/(assets\/[^"]*|vite\.svg)"/g, `$1="${BASE}$2"`);
            },
        },
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/shared/src'),
            '@workbench': resolve(__dirname, '../'),
        },
    },
});

import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import strip from '@rollup/plugin-strip';

// 约定使用流程类型作为目录名称
const FLOW_TYPE = path.basename(__dirname);
const DEPLOY_PATH = '/web/platform/runtime/bcc/web/ai-flow/farris-flow-designer/flow-contents';
const DIST_DIR = './dist';
const OUT_DIR = fileURLToPath(new URL(`${DIST_DIR}${DEPLOY_PATH}/${FLOW_TYPE}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd());
  const apiTarget = env.VITE_API_TARGET || 'http://10.110.87.184:5500';

  return {
    plugins: [
      vue(),
      vueJsx(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./lib', import.meta.url)),
        '@flow-designer': fileURLToPath(new URL('../../flow-designer/src', import.meta.url)),
        '@farris/flow-designer': fileURLToPath(new URL('../../flow-designer/src', import.meta.url)),
        '@farris/flow-devkit': fileURLToPath(new URL('../../flow-devkit/lib', import.meta.url)),
        '@farris/x-ui/index.css': fileURLToPath(new URL('../../tmp-local-dependency/x-ui/index.css', import.meta.url)),
        '@farris/x-conversation/index.css': fileURLToPath(new URL('../../tmp-local-dependency/x-conversation/index.css', import.meta.url)),
      },
    },
    // 代理配置
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      minify: 'esbuild',
      emptyOutDir: true,
      lib: {
        entry: fileURLToPath(new URL('./lib/index.ts', import.meta.url)),
        name: undefined,
        fileName: 'index',
        formats: ['system'],
      },
      assetsInlineLimit: 0,
      cssCodeSplit: true,
      rollupOptions: {
        external: (id) => {
          const items = [
            "vue",
            "@farris/ui-vue",
            "@farris/flow-devkit",
          ];
          return !!items.find((item) => id.indexOf(item) === 0);
        },
        output: {
          entryFileNames: "index.js",
          exports: "named",
          globals: (id) => {
            const nameMap: Record<string, string> = {
              "vue": "Vue",
              "@farris/ui-vue": "FarrisUIVue",
              "@farris/flow-devkit": "FarrisFlowDevkit",
            };
            return nameMap[id];
          }
        },
        plugins: [
          strip({
            functions: ['console.log'],
            include: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
            exclude: [],
          }),
          visualizer({
            template: "sunburst",
            filename: process.cwd() + `/dist/visualizer.html`,
          }),
        ],
      },
      outDir: OUT_DIR,
      target: 'es2019',
    },
  };
});

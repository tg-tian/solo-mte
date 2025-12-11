import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import strip from '@rollup/plugin-strip';

const FILE_NAME = 'flow-devkit';
const DEPLOY_PATH = '/web/platform/common/web/@farris';
const DIST_DIR = './dist';
const OUT_DIR = fileURLToPath(new URL(`${DIST_DIR}${DEPLOY_PATH}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@farris/flow-devkit': path.resolve(__dirname, './lib')
    }
  },
  build: {
    minify: 'esbuild',
    lib: {
      entry: fileURLToPath(new URL('./lib/index.ts', import.meta.url)),
      name: undefined,
      fileName: FILE_NAME,
      formats: ['system'],
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      external: (id) => {
        const items = [
          "vue",
          "vue-demi",
          "@farris/ui-vue",
          "@vue-flow/core",
          "lodash-es",
          "lodash",
          "axios",
        ];
        return !!items.find((item) => id.indexOf(item) === 0);
      },
      output: {
        inlineDynamicImports: true,
        entryFileNames: `${FILE_NAME}.js`,
        exports: "named",
        globals: (id) => {
          const nameMap: Record<string, string> = {
            "vue": "Vue",
            "vue-demi": "VueDemi",
            "@farris/ui-vue": "FarrisUIVue",
            "@vue-flow/core": "VueFlowCore",
            "lodash-es": "LodashES",
            "lodash": "Lodash",
            "axios": "Axios",
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
    sourcemap: false,
    outDir: OUT_DIR,
    target: 'es2019',
  },
});

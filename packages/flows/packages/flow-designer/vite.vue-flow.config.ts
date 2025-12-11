import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

const FILE_NAME = 'vue-flow-core';
const DEPLOY_PATH = '/web/platform/common/web';
const DIST_DIR = './dist';
const OUT_DIR = fileURLToPath(new URL(`${DIST_DIR}${DEPLOY_PATH}`, import.meta.url));

const vueFlowEntry = path.resolve(
  __dirname,
  'node_modules/@vue-flow/core/dist/vue-flow-core.mjs',
);

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
  },
  build: {
    outDir: OUT_DIR,
    copyPublicDir: false,
    minify: 'esbuild',
    lib: {
      entry: vueFlowEntry,
      name: undefined,
      fileName: FILE_NAME,
      formats: ['system'],
    },
    cssCodeSplit: true,
    rollupOptions: {
      external: ['vue'],
      output: {
        entryFileNames: `${FILE_NAME}.js`,
        globals: {
          vue: 'Vue'
        },
        exports: 'named'
      }
    },
    target: 'es2019'
  }
});

import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

const FILE_NAME = 'vue-flow-background';
const DEPLOY_PATH = '/web/platform/common/web';
const DIST_DIR = './dist';
const OUT_DIR = fileURLToPath(new URL(`${DIST_DIR}${DEPLOY_PATH}`, import.meta.url));

const vueFlowEntry = path.resolve(
  __dirname,
  'node_modules/@vue-flow/background/dist/vue-flow-background.mjs',
);

export default defineConfig({
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
      external: ['vue', '@vue-flow/core'],
      output: {
        entryFileNames: `${FILE_NAME}.js`,
        globals: {
          'vue': 'Vue',
          '@vue-flow/core': 'VueFlowCore',
        },
        exports: 'named'
      }
    },
    target: 'es2019'
  }
});

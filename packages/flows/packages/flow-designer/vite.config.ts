import { defineConfig, type UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import fs from 'fs';
import strip from '@rollup/plugin-strip';

const FOLDER_NAME = 'farris-flow-designer';
const DEPLOY_PATH = '/web/platform/runtime/bcc/web/ai-flow';
const DIST_DIR = './dist';
const OUT_DIR = fileURLToPath(new URL(`${DIST_DIR}${DEPLOY_PATH}/${FOLDER_NAME}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const alias: Record<string, string> = {
    '@flow-designer': path.resolve(__dirname, './src'),
    '@/api': path.resolve(__dirname, './src/api'),
  };
  if (isDev) {
    alias['@farris/flow-devkit'] = path.resolve(__dirname, '../flow-devkit/lib');
  }

  return {
    plugins: [
      vue(),
      vueJsx(),
    ],
    base: './',
    resolve: {
      alias,
    },
    build: {
      outDir: OUT_DIR,
      assetsDir: "assets",
      minify: "esbuild",
      manifest: false,
      copyPublicDir: true,
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 10000,
      rollupOptions: {
        output: {
          format: "system",
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`,
          banner: `/*! Last Update Time: ${new Date().toLocaleString()} */`,
          preserveModules: false,
        },
        external: (id) => {
          const externals: string[] = [
            'vue',
            '@farris/ui-vue',
            '@farris/flow-devkit',
            '@vue-flow/core',
            '@vue-flow/background',
            'lodash-es',
            'lodash',
            'axios',
          ];
          return !!externals.find((item) => {
            return item && id.indexOf(item) === 0;
          });
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
          {
            name: 'generate-prod-html',
            closeBundle: async () => {
              const templatePath = path.join(__dirname, "index.prod.html");
              let htmlContent = await fs.promises.readFile(templatePath, 'utf-8');
              const version = new Date().getTime();
              htmlContent = htmlContent.replace('<%= version %>', version + '');
              await fs.promises.writeFile(path.join(OUT_DIR, 'index.html'), htmlContent);
            }
          }
        ],
      },
    },
  } as UserConfig;
});

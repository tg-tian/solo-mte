import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import fs from 'fs';
import strip from '@rollup/plugin-strip';

const FOLDER_NAME = 'farris-flow-management';
const DEPLOY_PATH = '/web/platform/runtime/bcc/web/ai-flow';
const DIST_DIR = './dist';
const OUT_DIR = fileURLToPath(new URL(`${DIST_DIR}${DEPLOY_PATH}/${FOLDER_NAME}`, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // 代理配置
  server: {
    proxy: {
      '^/(api|platform/runtime)': {
        target: 'http://10.110.87.184:5400',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: OUT_DIR,
    assetsDir: "assets",
    minify: "esbuild",
    manifest: false,
    copyPublicDir: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: "system",
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `assets/[name].[ext]`,
        banner: `/*! Last Update Time: ${new Date().toLocaleString()} */`,
        preserveModules: false,
      },
      external: (id) => {
        const externals: string[] = [
          'vue',
          '@farris/ui-vue',
          'lodash',
          'lodash-es',
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
});

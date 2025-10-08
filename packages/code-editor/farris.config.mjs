import { fileURLToPath, URL } from 'node:url';
// import banner from 'vite-plugin-banner';

// import { formatDate } from 'date-fns';

// const currentTime = () => formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');
const replaceUIVueComponentsPath = function () {
    return {
        name: 'replace-ui-vue-components-path',
        generateBundle(options, bundle) {
            for (const fileName in bundle) {
                const chunk = bundle[fileName];
                if (chunk.type === 'chunk') {
                    chunk.code = chunk.code.replace(/@farris\/ui-vue\/components/g, '@farris/ui-vue');
                }
            }
        }
    };
};
export default {
    format: "system",
    // 输出目录  App模式默认值 './dist' Lib模式 './lib'
    // outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    // 最小化 默认值 true
    minify: 'terser',
    terserOptions: {
        compress: {
            keep_classnames: true,
            keep_fnames: true,
            drop_console: true,
            drop_debugger: true,
        },
        mangle: false,
        format: {
            comments: /^!/
        }
    },
    // 外部依赖排除项 默认值 { include: [], exclude: [] }
    externals: {
        include: ['jsonp', 'echarts', 'lodash-es', 'lodash', 'axios', '@farris/ui-vue', 'vue', 'rxjs', 'rxjs/operators', 'vue-router', '@vue/shared', '@vueuse/core'],
        filter: (externals) => {
            return (id) => {
                return externals.find((item) => {
                    return item && id.indexOf(item) === 0;
                });
            };
        }
    },
    // 是否排除 package.json 中 dependencies和 peerDependencies 依赖的包; App模式默认值 false Lib模式默认值 true
    externalDependencies: false,
    // 路径别名 默认值 null
    alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        { find: "@farris/ui-vue", replacement: fileURLToPath(new URL('../ui-vue/components', import.meta.url)) },
        // { find: '@farris/vue-code-editor/components', replacement: fileURLToPath(new URL('../code-editor/components', import.meta.url)) }
    ],
    // 插件 默认值 [vue(), vueJsx()] 不要重复添加
    // plugins: [],
    // viteConfig 配置项
    viteConfig: {
        build: {
            outDir: "dist",
            assetsDir: "assets",
            rollupOptions: {
                output: {
                    entryFileNames: `assets/[name].js`,
                    chunkFileNames: `assets/[name].js`,
                    assetFileNames: `assets/[name].[ext]`
                },
                plugins: [replaceUIVueComponentsPath()]
            },
            manifest: false,

        }
    }
};

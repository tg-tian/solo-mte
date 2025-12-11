const { resolve } = require("path");
const { defineConfig } = require("vite");
const vue = require("@vitejs/plugin-vue");
const vueJsx = require("@vitejs/plugin-vue-jsx");

module.exports = function (options) {
    const { lib, outDir, minify = false, plugins = [] } = options;
    return defineConfig({
        configFile: false,
        publicDir: false,
        plugins: [
            vue(),
            vueJsx(),
            ...plugins
        ],
        resolve: {
            alias: [
                { find: "@flow-designer", replacement: resolve(__dirname, "../../src") },
                { find: "@/api", replacement: resolve(__dirname, "../../src/api") },
            ],
        },
        build: {
            lib,
            outDir,
            minify,
            rollupOptions: {
                external: (id) => {
                    const items = [
                        "vue",
                        "@farris/ui-vue",
                        "@farris/flow-devkit",
                        "@vue-flow/core",
                        "@vue-flow/background",
                        "lodash-es",
                        "lodash",
                        "axios",
                    ];
                    return items.find((item) => id.indexOf(item) === 0);
                },
                output: {
                    exports: "named",
                    globals: (id) => {
                        const nameMap = {
                            "vue": "Vue",
                            "@farris/ui-vue": "FarrisUIVue",
                            "@farris/flow-devkit": "FarrisFlowDevkit",
                            "@vue-flow/core": "VueFlowCore",
                            "@vue-flow/background": "VueFlowBackground",
                            "lodash-es": "LodashES",
                            "lodash": "Lodash",
                            "axios": "Axios",
                        };
                        return nameMap[id];
                    }
                },
            },
        },
    });
};

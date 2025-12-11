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
            alias: [{ find: "@farris/flow-devkit", replacement: resolve(__dirname, "../../lib") }],
        },
        build: {
            lib,
            outDir,
            minify,
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
                    return items.find((item) => id.indexOf(item) === 0);
                },
                output: {
                    exports: "named",
                    globals: (id) => {
                        const nameMap = {
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
            },
        },
    });
};

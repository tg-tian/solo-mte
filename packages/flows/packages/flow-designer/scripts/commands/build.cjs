const { resolve } = require("path");
const CWD = process.cwd();

const { build } = require("vite");
const dts = require("vite-plugin-dts").default;
const libCss = require("vite-plugin-libcss");

const buildViteConfig = require("./build-vite-config.cjs");
const createPackageJson = require("./create-package.cjs");
const copyLicense = require("./copy-license.cjs");

exports.build = async () => {

    const lib = {
        entry: resolve(CWD, "./src/index.ts"),
        name: "FarrisFlowDesigner",
        fileName: "flow-designer",
        formats: ["esm", "umd"],
    };

    const outDir = resolve(CWD, "./package");

    const plugins = [
        dts({
            entryRoot: "./src",
            outDir: resolve(CWD, "./package/types"),
            tsconfigPath: './tsconfig.build.json',
            exclude: [
                "node_modules/**",
                "./src/App.vue",
                "./src/main.ts"
            ],
        }),
        libCss(),
    ];

    const config = buildViteConfig({ lib, outDir, plugins });
    await build(config);

    await createPackageJson();
    await copyLicense();
};

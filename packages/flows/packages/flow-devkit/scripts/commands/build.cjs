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
        entry: resolve(CWD, "./lib/index.ts"),
        name: "FarrisFlowDevkit",
        fileName: "flow-devkit",
        formats: ["esm", "umd"],
    };

    const outDir = resolve(CWD, "./package");

    const plugins = [
        dts({
            entryRoot: "./lib",
            outDir: resolve(CWD, "./package/types"),
            tsconfigPath: './tsconfig.app.json',
            exclude: [
                "./src/**/*",
                "node_modules/**"
            ],
        }),
        libCss(),
    ];

    const config = buildViteConfig({ lib, outDir, plugins });
    await build(config);

    await createPackageJson();
    await copyLicense();
};

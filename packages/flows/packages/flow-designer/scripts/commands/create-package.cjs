const { omit } = require("lodash");
const { resolve } = require("path");
const fsExtra = require("fs-extra");
const packageJson = require("../../package.json");
const devkitPackageJson = require("../../../flow-devkit/package.json");

const CWD = process.cwd();

const distFileName = "flow-designer";

const createPackageJson = async () => {
    packageJson.version = packageJson.version;
    packageJson.private = false;
    packageJson.dependencies = omit(packageJson.dependencies, "");
    packageJson.peerDependencies["@farris/flow-devkit"] = `^${devkitPackageJson.version}`;
    packageJson.types = "./types/index.d.ts";
    packageJson.typings = "./types/index.d.ts";
    packageJson.module = `./${distFileName}.esm.js`;
    packageJson.main = `./${distFileName}.umd.cjs`;
    packageJson.style = `./${distFileName}.css`;
    const fileStr = JSON.stringify(
        omit(packageJson, "scripts", "devDependencies", "dependencies"),
        null,
        2
    );
    await fsExtra.outputFile(
        resolve(CWD, "./package", `package.json`),
        fileStr,
        "utf-8"
    );
};

module.exports = createPackageJson;

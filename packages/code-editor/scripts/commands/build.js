import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import { fileURLToPath } from 'url';
import { omit } from 'lodash-es';
import { defineConfig, build } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import dts from 'vite-plugin-dts';
import ts from 'typescript';
import { replace } from './replace-path.js';

const currentFileName = fileURLToPath(import.meta.url);
const currentDirectoryName = path.dirname(currentFileName);
const rootPath = path.resolve(currentDirectoryName, '../../');

const packageJsonPath = path.resolve(rootPath, 'package.json');
const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
const packageObject = JSON.parse(packageJsonContent);

const getVersion = () => {
    const versionNums = packageObject.version.split('.');
    return versionNums.map((num, index) => (index === versionNums.length - 1 ? +num + 1 : num)).join('.');
};
const packageVersion = packageObject.version;

const createPackageJson = async () => {
    packageObject.version = packageVersion;
    packageObject.main = './farris.code-editor-vue.umd.js';
    packageObject.module = './farris.code-editor-vue.esm.js';
    packageObject.style = './index.css';
    packageObject.dependencies = omit(packageObject.dependencies, 'vue');
    packageObject.types = './types/index.d.ts';
    const fileStr = JSON.stringify(omit(packageObject, 'scripts', 'devDependencies'), null, 2);
    await fsExtra.outputFile(path.resolve('./package', `package.json`), fileStr, 'utf-8');
};

const externals = ['vue', '@vueuse/core', '@vue/shared', 'bignumber.js',
    'lodash', 'lodash-es', 'echarts', '@farris/code-editor-vue/components'];

async function buildSeperately(componentName) {
    const tsEntry = `./components/${componentName}/index.ts`;
    if (fs.existsSync(tsEntry)) {
        const componentBuildOptions = await build(
            defineConfig({
                configFile: false,
                publicDir: false,
                plugins: [vue(), vueJsx(), replace((format, args) => `..${args[1]}/index.${format}.js`)],
                build: {
                    lib: {
                        entry: tsEntry,
                        name: componentName,
                        fileName: 'index',
                        formats: ['esm','umd']
                    },
                    outDir: `./package/components/${componentName}`,
                    rollupOptions: {
                        logLevel: 'silent',
                        external:
                            // ['vue', '@vueuse/core', '@vue/shared', 'bignumber.js',
                            //      'lodash', 'lodash-es', 'echarts']
                            (id) => {
                                return externals.find((item) => id.indexOf(item) === 0);
                            },
                        output: {
                            globals: {
                                vue: 'Vue',
                                '@vueuse/core': 'VueUseCore',
                                '@vue/shared': 'VueShared',
                                'bignumber.js': 'BigNumber',
                                'lodash-es': 'LodashES'
                            },
                            assetFileNames: ({ name, names, type }) => {
                                if (type === 'asset' && /\.(css)$/i.test(name)) {
                                    return 'index.[ext]';
                                }
                                if (type === 'asset' && /\.(css)$/i.test(names)) {
                                    return 'index.[ext]';
                                }
                                return '[name].[ext]';
                            }
                        }
                    }
                },
                resolve: {
                    alias: {
                        '@farris/code-editor-vue/components': path.resolve(rootPath, './components')
                    }
                }
            })
        );

        const packageContent = `{
        "name": "${componentName}",
        "version": "${packageVersion}",
        "main": "index.umd.js",
        "module": "index.esm.js",
        "style": "index.css",
        "types": "../types/${componentName}/index.d.ts"
    }`;
        fsExtra.outputFile(`./package/components/${componentName}/package.json`, packageContent, 'utf-8');
    }
}

const buildLibs = async () => {
    await build(
        defineConfig({
            configFile: false,
            publicDir: false,
            plugins: [
                vue(),
                vueJsx(),
                dts({
                    entryRoot: './components',
                    outputDir: `./package/types`,
                    noEmitOnError: false,
                    skipDiagnostics: false
                })
            ],
            build: {
                lib: {
                    entry: './components/index.ts',
                    name: 'CommandCodeEditor',
                    fileName: 'farris.code-editor-vue',
                    formats: ['esm', 'umd']
                },
                outDir: './package',
                rollupOptions: {
                    logLevel: 'silent',
                    external: ['vue', '@vueuse/core', '@vue/shared', 'bignumber.js', 'lodash', 'lodash-es', 'echarts'],
                    output: {
                        exports: "named",
                        globals: {
                            globals: {
                                vue: 'Vue',
                                '@vueuse/core': 'VueUseCore',
                                '@vue/shared': 'VueShared',
                                'bignumber.js': 'BigNumber',
                                'lodash-es': 'LodashES'
                            }
                        },
                        assetFileNames: ({ names, type, name }) => {
                            if (type === 'asset' && /\.(css)$/i.test(name)) {
                                return 'index.[ext]';
                            }
                            if (type === 'asset' && /\.(css)$/i.test(names)) {
                                return 'index.[ext]';
                            }
                            return '[name].[ext]';
                        }
                    }
                }
            },
            resolve: {
                alias: {
                    '@farris/code-editor-vue/components': path.resolve(rootPath, './components')
                }
            }
        })
    );

    await createPackageJson();
    const components = fs.readdirSync('./components').filter((name) => {
        const componentDir = path.resolve('./components', name);
        const isDir = fs.lstatSync(componentDir).isDirectory();
        // const ignore = isDir && fs.readdirSync(componentDir).includes('.buildignore');
        const ignore = false;
        return isDir && !ignore && (fs.readdirSync(componentDir).includes('index.ts') ||
            fs.readdirSync(componentDir).includes('style.ts'));
    });

    components.forEach((componentName) => {
        buildSeperately(componentName);
    });
};

export { buildLibs };

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

const APP_ENTRIES = {
    main: resolve(__dirname, 'index.html'),
    appBoard: resolve(__dirname, 'apps/platform/development-platform/ide/app-board/index.html'),
    appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
    appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html'),
    appPreview: resolve(__dirname, 'apps/platform/development-platform/ide/app-preview/index.html'),
    appView: resolve(__dirname, 'apps/platform/development-platform/ide/app-view/index.html'),
};

// CSS 根据来源模块路径分配到对应子目录
const APP_CSS_DIRS = [
    'apps/platform/development-platform/ide/app-board',
    'apps/platform/development-platform/ide/app-builder',
    'apps/platform/development-platform/ide/app-center',
    'apps/platform/development-platform/ide/app-preview',
    'apps/platform/development-platform/ide/app-view',
];

function copyDir(src: string, dest: string) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function findPnpmPackage(pkgName: string): string | null {
    // pnpm workspace: node_modules 在仓库根目录
    const pnpmDir = resolve(__dirname, '..', '..', 'node_modules', '.pnpm');
    if (!fs.existsSync(pnpmDir)) return null;
    for (const entry of fs.readdirSync(pnpmDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(pkgName + '@')) {
            const releaseDir = path.join(pnpmDir, entry.name, 'node_modules', pkgName, 'release');
            if (fs.existsSync(releaseDir)) return releaseDir;
        }
    }
    return null;
}

function copyVSCodeRuntimeAssets() {
    return {
        name: 'copy-vscode-runtime-assets',
        closeBundle() {
            const distDir = resolve(__dirname, 'dist');

            // 1. 复制内置扩展 (emmet, git-base, merge-conflict, github-authentication 等)
            const extensionRoots = [
                resolve(__dirname, 'apps/platform/development-platform/ide/extensions'),
                resolve(__dirname, 'vscode/extensions'),
            ];
            for (const extRoot of extensionRoots) {
                if (!fs.existsSync(extRoot)) continue;
                const destExt = path.join(distDir, 'extensions');
                for (const entry of fs.readdirSync(extRoot, { withFileTypes: true })) {
                    if (!entry.isDirectory()) continue;
                    const destSub = path.join(destExt, entry.name);
                    if (fs.existsSync(destSub)) continue; // 不覆盖 dist 中已有的
                    copyDir(path.join(extRoot, entry.name), destSub);
                }
            }

            // 修复 dist/browser 路径：部分扩展的 package.json 指向 dist/browser/，
            // 但实际编译产物在 out/ 或 out/browser/，创建 dist/browser/ 作为引用
            const extDir = path.join(distDir, 'extensions');
            if (fs.existsSync(extDir)) {
                for (const name of fs.readdirSync(extDir, { withFileTypes: true })) {
                    if (!name.isDirectory()) continue;
                    const extPath = path.join(extDir, name.name);
                    const distBrowser = path.join(extPath, 'dist', 'browser');
                    if (fs.existsSync(distBrowser)) continue; // 已有 dist/browser/

                    const pkgJsonPath = path.join(extPath, 'package.json');
                    if (!fs.existsSync(pkgJsonPath)) continue;
                    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                    const browser = pkgJson.browser;
                    if (!browser || !browser.startsWith('./dist/browser/')) continue;

                    const basename = browser.replace('./dist/browser/', '');
                    // 尝试在 out/browser/ 或 out/ 下找到目标文件
                    const candidates = [
                        path.join(extPath, 'out', 'browser', basename + '.js'),
                        path.join(extPath, 'out', basename + '.js'),
                    ];
                    let found = false;
                    for (const c of candidates) {
                        if (fs.existsSync(c)) {
                            fs.mkdirSync(distBrowser, { recursive: true });
                            const destFile = path.join(distBrowser, basename + '.js');
                            fs.copyFileSync(c, destFile);
                            // 也复制 .map 文件如果存在
                            if (fs.existsSync(c + '.map')) {
                                fs.copyFileSync(c + '.map', path.join(distBrowser, basename + '.js.map'));
                            }
                            console.log(`[copy-vscode-runtime-assets] 创建 ${path.relative(distDir, destFile)}`);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        console.warn(`[copy-vscode-runtime-assets] ${name.name}: browser=${browser} 但源文件不存在`);
                    }
                }
            }

            // 2. 从 pnpm store 复制 vscode-oniguruma 和 vscode-textmate
            const packages = ['vscode-oniguruma', 'vscode-textmate'];
            for (const pkg of packages) {
                const releaseDir = findPnpmPackage(pkg);
                if (!releaseDir) {
                    console.warn(`[copy-vscode-runtime-assets] 未找到 ${pkg}`);
                    continue;
                }
                const destPkg = path.join(distDir, 'node_modules', pkg, 'release');
                copyDir(releaseDir, destPkg);
            }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    build: {
        rollupOptions: {
            input: APP_ENTRIES,
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        const moduleId = (assetInfo as any).facadeModuleId || '';
                        for (const dir of APP_CSS_DIRS) {
                            if (moduleId.includes(dir)) {
                                return `${dir}/[name].[hash].[ext]`;
                            }
                        }
                    }
                    return 'assets/[name].[hash].[ext]';
                },
                chunkFileNames: 'apps/platform/development-platform/ide/[name].[hash].js',
                entryFileNames: 'apps/platform/development-platform/ide/[name].[hash].js',
            },
        },
    },
    plugins: [vue(), vueJsx(), copyVSCodeRuntimeAssets()],
    resolve: {
        alias: {
            '@': resolve(__dirname, '../'),
            '@ubml/common': resolve(__dirname, 'node_modules/@ubml/common'),
        },
    },
});

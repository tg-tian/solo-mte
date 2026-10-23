import * as uiVue from '@farris/ui-vue';

import { getEnabledCustomComponents, THIRD_PARTY_COMPONENTS_URL } from './designer-config.service';

/**
 * 自定义组件加载诊断结果。
 *
 * 自定义组件要能渲染到画布上，需依次满足三层条件：
 * 1. 宿主 `@farris/ui-vue` 提供 `useThirdComponent` —— 由它读取 `third-party-components.json`、
 *    通过 SystemJS 加载组件包，并写入 `window.F_THIRD_COMPONENTS`，再由 ui-vue 的设计时
 *    注册流程消费（把设计时组件注册进画布的 componentMap）；
 * 2. 运行环境提供 SystemJS —— 组件包以 `system` 格式构建；
 * 3. 组件包导出的成员名与 `designer-config.json` 中登记的 `module` 一致。
 *
 * 任一层不满足，表象都是「工具箱里有条目（条目只来自 designer-config.json），
 * 但拖到画布显示『未识别的组件』（画布按 type 在 componentMap 中查不到设计时组件）」。
 *
 * 设计器产物开启了 `drop_console`，console 输出会被剥离，因此诊断结果挂到 window 上，
 * 可在浏览器控制台执行 `window.__DESIGNER_CUSTOM_DIAG__` 查看。
 */
export interface CustomComponentLoadResult {
    /** 宿主 @farris/ui-vue 是否具备第三方组件加载能力 */
    hostLoader: 'available' | 'missing';
    /** 调用 useThirdComponent() 本身失败时的异常 */
    hostLoaderError?: string;
    /** 运行环境是否提供 SystemJS */
    systemJs: 'available' | 'missing';
    /** 已登记且启用的自定义组件数量 */
    enabledCount: number;
    /** 加载清单的探测结果（区分「清单缺失」与「组件加载失败」） */
    manifest?: { url: string; status?: number; count?: number; error?: string };
    /** 调用宿主加载能力的结果 */
    hostLoad?: { ok: boolean; loadedKeys?: string[]; error?: string };
    /** 逐个直连探测组件包：只看能否取到模块、导出哪些成员，不做注册 */
    probes: Array<{ url: string; module: string; ok: boolean; exports?: string[]; hasRegisterDesigner?: boolean; error?: string }>;
}

const DIAGNOSTIC_KEY = '__DESIGNER_CUSTOM_DIAG__';

/** 读取诊断结果，供排障使用 */
export function getCustomComponentDiagnostics(): CustomComponentLoadResult | undefined {
    return (window as any)[DIAGNOSTIC_KEY];
}

function readExportKeys(module: any): string[] | undefined {
    return module && typeof module === 'object' ? Object.keys(module) : undefined;
}

/**
 * 探测清单文件是否可达。
 * 用于区分「清单没投放（404）」与「清单存在但组件包加载失败」。
 */
async function probeManifest(url: string): Promise<{ url: string; status?: number; count?: number; error?: string }> {
    try {
        const response = await fetch(`${url}?v=${new Date().getTime()}`);
        if (!response.ok) {
            return { url, status: response.status };
        }
        const list = await response.json();
        return { url, status: response.status, count: Array.isArray(list) ? list.length : -1 };
    } catch (error) {
        return { url, error: String(error) };
    }
}

/**
 * 加载组件包模块。
 * 生产环境走 SystemJS；本地 dev（vite）没有 SystemJS 时退化为原生动态导入。
 */
async function importComponentModule(url: string): Promise<any> {
    const system = (window as any).System;
    if (system && typeof system.import === 'function') {
        return system.import(url);
    }
    return import(/* @vite-ignore */ url);
}

/**
 * 加载并注册自定义组件。
 *
 * 注册本身由宿主 ui-vue 完成（消费 `window.F_THIRD_COMPONENTS`），
 * 本方法负责触发加载，并把每一层的实际状态记录下来。
 */
export async function loadCustomComponents(): Promise<CustomComponentLoadResult> {
    const components = getEnabledCustomComponents();
    const system = (window as any).System;

    const result: CustomComponentLoadResult = {
        hostLoader: typeof (uiVue as any)?.useThirdComponent === 'function' ? 'available' : 'missing',
        systemJs: system && typeof system.import === 'function' ? 'available' : 'missing',
        enabledCount: components.length,
        probes: []
    };
    (window as any)[DIAGNOSTIC_KEY] = result;

    result.manifest = await probeManifest(THIRD_PARTY_COMPONENTS_URL);

    if (result.hostLoader === 'available') {
        let loadThirdComponents: ((configFilePath?: string) => Promise<any>) | undefined;
        try {
            loadThirdComponents = (uiVue as any).useThirdComponent()?.loadThirdComponents;
        } catch (error) {
            result.hostLoaderError = String(error);
        }

        if (typeof loadThirdComponents === 'function') {
            try {
                // 显式传入绝对地址，避免依赖 useFarrisConfig().basePath（它在组件上下文之外取不到注入值）
                const loaded = await loadThirdComponents(`${THIRD_PARTY_COMPONENTS_URL}?v=${new Date().getTime()}`);
                result.hostLoad = { ok: true, loadedKeys: readExportKeys(loaded) };
            } catch (error) {
                result.hostLoad = { ok: false, error: String(error) };
                console.error('[designer] 加载第三方组件失败', error);
            }
        }
    }

    for (const component of components) {
        const probe = { url: component.url, module: component.module, ok: false } as CustomComponentLoadResult['probes'][number];
        try {
            const module = await importComponentModule(component.url);
            const target = module ? module[component.module] : undefined;
            probe.ok = !!module;
            probe.exports = readExportKeys(module);
            probe.hasRegisterDesigner = typeof target?.registerDesigner === 'function';
        } catch (error) {
            probe.error = String(error);
        }
        result.probes.push(probe);
    }

    return result;
}

import { PropertyMetaControl } from '../types/designer-config';

/**
 * 随应用部署的静态属性清单地址。
 *
 * app-center 与 IDE 应用同源（都部署在 /apps/platform/development-platform/ide/ 下），
 * 该 JSON 由 `app-center/scan-control-property-meta.mjs` 扫描 @farris/ui-vue 源码产出，
 * 放到这个目录即可直接读取——dev 下由 Vite 本地服务，不经 `/platform/**` 代理。
 */
export const STATIC_PROPERTY_META_URL = '/apps/platform/development-platform/ide/control-property-meta.json';

/**
 * 解析属性清单 JSON。
 * 兼容 `[{ ... }]` 与 `{ controls: [{ ... }] }` 两种形态（扫描脚本产出的是后者）。
 */
export function importPropertyMeta(jsonText: string): PropertyMetaControl[] {
    const parsed = JSON.parse(jsonText);
    const controls = Array.isArray(parsed) ? parsed : parsed?.controls;
    if (!Array.isArray(controls)) {
        throw new Error('属性清单格式不正确');
    }
    return controls as PropertyMetaControl[];
}

/**
 * 读取随应用部署的静态属性清单。
 *
 * 读取失败（未投放、路径不对、格式损坏）时抛错，由调用方给出提示。
 */
export async function fetchStaticPropertyMeta(): Promise<PropertyMetaControl[]> {
    const response = await fetch(`${STATIC_PROPERTY_META_URL}?v=${new Date().getTime()}`);
    if (!response.ok) {
        throw new Error(`属性清单读取失败（HTTP ${response.status}）`);
    }
    const controls = importPropertyMeta(await response.text());
    if (!controls.length) {
        throw new Error('属性清单为空');
    }
    return controls;
}

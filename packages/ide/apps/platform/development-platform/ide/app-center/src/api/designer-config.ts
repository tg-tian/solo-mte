import axios from 'axios';
import { DesignerConfig, createEmptyConfig } from '../types/designer-config';

/** 站点根下的 renderer 目录 */
const RENDERER_BASE = '/platform/common/web/renderer';

/** 自定义组件包所在的子目录（配置文件不放这里） */
const COMPONENT_DIR = `${RENDERER_BASE}/third-party-components`;

/**
 * 平台自有配置（属性黑名单 + 自定义组件登记）。
 * 与 `third-party-components.json` 放在同一目录——压缩包里的两份 JSON 一次拷完即可。
 */
export const DESIGNER_CONFIG_URL = `${RENDERER_BASE}/designer-config.json`;

/** 第三方组件加载清单（@farris/ui-vue 约定，设计时与运行时共用；位置不可改） */
export const THIRD_PARTY_COMPONENTS_URL = `${RENDERER_BASE}/third-party-components.json`;

/** 自定义组件包存放目录，登记自定义组件时据此拼接 url */
export const COMPONENT_BASE_URL = `${COMPONENT_DIR}/`;

/** 设计器页面地址 */
export const DESIGNER_PAGE_URL = '/platform/common/web/farris-designer/index.html';

/** 配置文件的目标目录：`designer-config.json` 与 `third-party-components.json` 都放这里 */
export const RENDERER_DEPLOY_PATH = '<web>/platform/common/web/renderer/';

/** 自定义组件包的目标目录（仅用于提示） */
export const COMPONENT_DEPLOY_PATH = '<web>/platform/common/web/renderer/third-party-components/';

/**
 * 读取设计器配置。
 * 配置不存在（404）时返回 null，由调用方以空配置初始化。
 */
export async function fetchDesignerConfig(): Promise<DesignerConfig | null> {
    const response = await axios.get<DesignerConfig>(`${DESIGNER_CONFIG_URL}?v=${new Date().getTime()}`);
    const raw: any = response?.data;
    if (!raw || typeof raw !== 'object') {
        return createEmptyConfig();
    }
    return {
        hiddenProperties: raw.hiddenProperties && typeof raw.hiddenProperties === 'object' ? raw.hiddenProperties : {},
        customComponents: Array.isArray(raw.customComponents) ? raw.customComponents : []
    };
}

/**
 * 读取系统盘上现有的第三方组件加载清单。
 *
 * 该文件可能已包含**不由本页签管理**的既有条目（例如富文本编辑器组件），
 * 且条目可能带有额外字段（如 key）。生成新清单时必须原样保留这些条目，
 * 否则人工覆盖后会导致既有组件在设计时与运行时加载失败。
 */
export async function fetchExistingThirdPartyComponents(): Promise<any[]> {
    const response = await axios.get(`${THIRD_PARTY_COMPONENTS_URL}?v=${new Date().getTime()}`);
    const raw: any = response?.data;
    return Array.isArray(raw) ? raw : [];
}

/**
 * 由组件包文件名生成组件包地址
 */
export function resolveComponentUrl(fileName: string): string {
    const name = (fileName || '').trim();
    if (!name) {
        return '';
    }
    return name.startsWith('/') || /^https?:\/\//i.test(name) ? name : `${COMPONENT_BASE_URL}${name}`;
}

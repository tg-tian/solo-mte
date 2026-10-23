import axios from 'axios';

/**
 * 自定义组件登记项（designer-config.json 中 customComponents 的元素）
 */
export interface CustomComponentConfig {
    /** 唯一标识 */
    id: string;
    /** 工具箱中显示的名称 */
    name: string;
    /** 控件类型，同时作为属性可见性黑名单的 key */
    type: string;
    /** 组件包导出的模块名 */
    module: string;
    /** 组件包地址 */
    url: string;
    /** 是否启用 */
    enabled: boolean;
}

/**
 * 设计器配置（designer-config.json）
 */
export interface DesignerConfig {
    /** 属性黑名单：控件类型 -> 需要隐藏的属性路径 */
    hiddenProperties?: Record<string, string[]>;
    /** 自定义组件登记 */
    customComponents?: CustomComponentConfig[];
}

/**
 * 站点根下的设计器配置目录。
 * 说明：ui-vue 的 basePath 在本工程为空，因此该目录即站点根下的绝对路径。
 */
const RENDERER_BASE = '/platform/common/web/renderer';

/**
 * 平台自有配置（属性黑名单 + 自定义组件登记）。
 * 与 `third-party-components.json` 同目录，且与配置管理页（app-center）保持一致。
 */
export const DESIGNER_CONFIG_URL = `${RENDERER_BASE}/designer-config.json`;

/** 第三方组件加载清单（@farris/ui-vue 约定的固定位置，设计时与运行时共用；位置不可改） */
export const THIRD_PARTY_COMPONENTS_URL = `${RENDERER_BASE}/third-party-components.json`;

const EMPTY_CONFIG: DesignerConfig = { hiddenProperties: {}, customComponents: [] };

let configPromise: Promise<DesignerConfig> | undefined;

let cachedConfig: DesignerConfig = EMPTY_CONFIG;

/**
 * 归一化配置内容，非法结构一律降级为空配置
 */
function normalizeConfig(raw: any): DesignerConfig {
    if (!raw || typeof raw !== 'object') {
        return EMPTY_CONFIG;
    }

    const hiddenProperties: Record<string, string[]> = {};
    const rawHidden = raw.hiddenProperties;
    if (rawHidden && typeof rawHidden === 'object') {
        Object.keys(rawHidden).forEach((type) => {
            const propertyIds = rawHidden[type];
            if (Array.isArray(propertyIds)) {
                hiddenProperties[type] = propertyIds.filter((propertyId: any) => typeof propertyId === 'string' && !!propertyId);
            }
        });
    }

    const customComponents: CustomComponentConfig[] = Array.isArray(raw.customComponents)
        ? raw.customComponents.filter((item: any) => item && item.type && item.url && item.module)
        : [];

    return { hiddenProperties, customComponents };
}

/**
 * 读取设计器配置。请求失败或内容非法时降级为空配置，不向外抛错。
 */
export function loadDesignerConfig(): Promise<DesignerConfig> {
    if (!configPromise) {
        configPromise = axios
            .get(`${DESIGNER_CONFIG_URL}?v=${new Date().getTime()}`, { timeout: 10000 })
            .then((response) => {
                cachedConfig = normalizeConfig(response?.data);
                return cachedConfig;
            })
            .catch(() => {
                cachedConfig = EMPTY_CONFIG;
                return cachedConfig;
            });
    }
    return configPromise;
}

/**
 * 已加载的配置，未加载完成时返回空配置
 */
export function getDesignerConfig(): DesignerConfig {
    return cachedConfig;
}

/**
 * 已启用且信息完整的自定义组件，按登记顺序返回
 */
export function getEnabledCustomComponents(): CustomComponentConfig[] {
    return (cachedConfig.customComponents || []).filter((item) => item.enabled !== false);
}

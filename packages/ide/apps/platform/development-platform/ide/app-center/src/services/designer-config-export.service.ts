import { COMPONENT_DEPLOY_PATH, RENDERER_DEPLOY_PATH } from '../api/designer-config';
import { DesignerConfig } from '../types/designer-config';
import { createZip, downloadBlob } from '../utils/zip';

/** 配置包内的文件名 */
export const DESIGNER_CONFIG_FILE = 'designer-config.json';
export const THIRD_PARTY_COMPONENTS_FILE = 'third-party-components.json';
export const README_FILE = 'README.txt';

/**
 * 合并第三方组件加载清单。
 *
 * 生成规则：
 * 1. 原样保留 existing 中**不由本页签管理**的既有条目（含 key 等额外字段），
 *    系统盘上通常已有其他组件（如富文本编辑器 rich-text-editor）的数据，不得丢失；
 * 2. 追加已启用的自定义组件，格式为 { url, module }。
 *
 * 判定「由本页签管理」的依据是模块名或组件包地址与登记项一致。
 */
export function mergeThirdPartyComponents(existing: any[], config: DesignerConfig): any[] {
    const managedModules = new Set((config.customComponents || []).map((item) => item.module));
    const managedUrls = new Set((config.customComponents || []).map((item) => item.url));

    const preserved = (existing || []).filter((entry: any) => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        return !managedModules.has(entry.module) && !managedUrls.has(entry.url);
    });

    const generated = (config.customComponents || [])
        .filter((item) => item.enabled && item.url && item.module)
        .map((item) => ({ url: item.url, module: item.module }));

    return [...preserved, ...generated];
}

/**
 * 由配置派生 third-party-components.json 内容
 */
export function buildThirdPartyComponentsContent(config: DesignerConfig, existing: any[] = []): string {
    return JSON.stringify(mergeThirdPartyComponents(existing, config), null, 4);
}

/**
 * 派生配置包内的 README
 */
function buildReadmeContent(existingLoaded: boolean): string {
    const lines = [
        '设计器配置包投放说明',
        '',
        `1. 解压本压缩包，得到 ${DESIGNER_CONFIG_FILE} 与 ${THIRD_PARTY_COMPONENTS_FILE}；`,
        `2. 将这两个文件都覆盖到 ${RENDERER_DEPLOY_PATH}`,
        `3. 自定义组件包（*.system.js）拷贝到 ${COMPONENT_DEPLOY_PATH}；`,
        '4. 刷新表单设计器页面后配置生效。',
        '',
        '注意：' + THIRD_PARTY_COMPONENTS_FILE + ' 已保留系统盘上既有的第三方组件条目，覆盖时请勿手工清空。'
    ];
    if (!existingLoaded) {
        lines.push('');
        lines.push('【警告】生成时未能读取系统盘上现有的第三方组件清单，');
        lines.push('        本次生成的文件可能缺少既有条目，覆盖前请务必与现有文件核对合并。');
    }
    return lines.join('\n');
}

/**
 * 保存设计器配置的单一出口。
 *
 * 第一期实现为「前端导出配置压缩包 + 人工投放」；
 * 后续接入后端接口时，仅需在此处替换为 PUT /api/.../designer-config 调用，
 * 页面交互与配置结构保持不变。
 *
 * @param config 当前配置
 * @param existingThirdParty 系统盘上现有的第三方组件清单，用于保留既有条目
 * @param existingLoaded 是否成功读取到现有清单
 */
export function saveDesignerConfig(config: DesignerConfig, existingThirdParty: any[] = [], existingLoaded = false): void {
    const blob = createZip([
        { name: DESIGNER_CONFIG_FILE, content: JSON.stringify(config, null, 4) },
        { name: THIRD_PARTY_COMPONENTS_FILE, content: buildThirdPartyComponentsContent(config, existingThirdParty) },
        { name: README_FILE, content: buildReadmeContent(existingLoaded) }
    ]);
    downloadBlob(blob, 'designer-config.zip');
}

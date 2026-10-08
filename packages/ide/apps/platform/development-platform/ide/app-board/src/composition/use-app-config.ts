import axios from "axios";
import { AppConfigOptions, UseAppConfig } from "./type";

// import.meta.glob 在 Vite dev 模式下会动态扫描文件系统，运行时新增的 .config 文件能被发现；
// 但在 build 模式下，它会在构建时将匹配的文件打包进产物——如果构建时目录下没有 .config 文件，
// 结果就是空对象 {}，构建后再放入的 .config 文件无法被感知。
const scenarioConfigModules = import.meta.glob('../../*.config', {
    eager: true,
    query: '?raw',
    import: 'default'
}) as Record<string, string>;

export function useAppConfig(): UseAppConfig {
    // Farris Admin 全局配置对象资源地址
    const defaultConfigFileUrl = '/assets/app-config-default.json';
    const defaultTitle = 'SOLO - 场景低代码开发平台';

    // 全局配置对象
    const options: AppConfigOptions = {
        /** 功能菜单数据Url */
        appDataSourceUri: '',
        /** 应用标题 */
        appTitle: defaultTitle,
        /** 场景ID */
        sceneId: undefined,
    };

    function applyConfig(config: any) {
        if (!config) {
            return;
        }
        options.appDataSourceUri = config['appDataSourceUri'] || options.appDataSourceUri;
        options.appTitle = config?.sceneData?.name || options.appTitle || defaultTitle;
        const rawSceneId = config?.sceneData?.sceneId ?? config?.sceneData?.id;
        const normalizedSceneId = Number(rawSceneId);
        if (Number.isFinite(normalizedSceneId) && normalizedSceneId > 0) {
            options.sceneId = normalizedSceneId;
        }
    }

    // 从构建时 import.meta.glob 中查找第一个 .config 文件（dev 模式走这条路径）
    function findFirstScenarioConfig() {
        const matchedPaths = Object.keys(scenarioConfigModules)
            .filter((item) => item.toLowerCase().endsWith('.config'))
            .sort((a, b) => a.localeCompare(b, 'zh-CN'));

        if (!matchedPaths.length) {
            return null;
        }

        const rawContent = scenarioConfigModules[matchedPaths[0]];
        if (!rawContent) {
            return null;
        }

        try {
            return JSON.parse(rawContent);
        } catch (error) {
            console.warn('[app-board] 配置文件解析失败:', matchedPaths[0], error);
            return null;
        }
    }

    // build 后 import.meta.glob 无法发现部署时放入的 .config 文件，
    // 因此通过 HTTP 从服务端拉取配置文件作为补充（服务端需将 .config 文件放到对应路径下）
    async function loadScenarioConfigViaHTTP(): Promise<any> {
        // LCTechPark.config 是部署时放在 app-board 目录下的场景配置文件，
        // 包含 sceneData（场景ID、名称、坐标等）和 domainInfo
        const configUrl = '/apps/platform/development-platform/ide/LCTechPark.config';
        try {
            const response = await axios.get(configUrl, { responseType: 'text' });
            if (response.data) {
                console.log('[app-board] HTTP 加载场景配置:', configUrl);
                return JSON.parse(response.data);
            }
        } catch {
            console.log('[app-board] HTTP 场景配置加载失败，将使用默认配置');
        }
        return null;
    }

    async function initialize() {
        // ① 加载默认配置文件
        try {
            const defaultResponse = await axios.get(defaultConfigFileUrl);
            applyConfig(defaultResponse.data);
        } catch (error) {
            // 默认配置读取失败时保持 fallback 值，不影响后续流程
        }

        // ② 先尝试构建时已打包的 .config 文件（dev 模式下生效）
        let scenarioConfig = findFirstScenarioConfig();

        // ③ 构建产物中不存在 .config 文件时，通过 HTTP 从服务端加载
        if (!scenarioConfig) {
            scenarioConfig = await loadScenarioConfigViaHTTP();
        }

        // ④ 场景配置文件中的 sceneData 会覆盖默认值，提供 sceneId 等关键参数
        if (scenarioConfig) {
            applyConfig(scenarioConfig);
        }

        if (!options.appTitle) {
            options.appTitle = defaultTitle;
        }
        return options;
    }

    return { options, initialize };
}

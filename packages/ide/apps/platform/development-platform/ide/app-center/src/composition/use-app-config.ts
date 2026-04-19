import axios from "axios";
import { AppConfigOptions, UseAppConfig } from "./type";

const scenarioConfigModules = import.meta.glob('../../*.config', {
    eager: true,
    query: '?raw',
    import: 'default'
}) as Record<string, string>;

export function useAppConfig(): UseAppConfig {
    // Farris Admin 全局配置对象资源地址
    // 默认配置选项: 加载本地菜单和页面资源
    const defaultConfigFileUrl = '/assets/app-config-default.json';
    const defaultTitle = 'SOLO - 场景低代码开发平台';
    // inBuilder配置选项: 可加载UBML低代码产品发行版inBuilder的菜单和页面数据, 启动inBuilder运行环境后，即可使用此配置文件加载数据
    // const defaultConfigFileUrl = './assets/config-for-inBuilder.json';
    // 全局配置对象接口
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
            console.warn('[app-center] 配置文件解析失败:', matchedPaths[0], error);
            return null;
        }
    }

    async function initialize() {
        try {
            const defaultResponse = await axios.get(defaultConfigFileUrl);
            applyConfig(defaultResponse.data);
        } catch (error) {
            // ignore default config read failure and keep fallback values
        }

        const scenarioConfig = findFirstScenarioConfig();
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

import axios from "axios";
import { AppConfigOptions, UseAppConfig } from "./type";

export function useAppConfig(): UseAppConfig {
    // Farris Admin 全局配置对象资源地址
    const defaultConfigFileUrl = '/assets/app-config-default.json';
    const scenarioConfigFileUrl = '/apps/platform/development-platform/ide/app-center/scene.config';
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

    async function loadScenarioConfig(): Promise<any> {
        try {
            const response = await axios.get(`${scenarioConfigFileUrl}?t=${Date.now()}`, { responseType: 'text' });
            if (response.data) {
                console.log('[app-center] 加载场景配置:', scenarioConfigFileUrl);
                return JSON.parse(response.data);
            }
        } catch {
            console.log('[app-center] 场景配置加载失败，将使用默认配置');
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

        // ② 运行时从部署目录加载场景配置；文件不存在时保持默认配置
        const scenarioConfig = await loadScenarioConfig();

        // ③ 场景配置文件中的 sceneData 会覆盖默认值，提供 sceneId 等关键参数
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

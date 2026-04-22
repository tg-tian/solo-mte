import axios from "axios";
import { ConfigOptions, UseConfig } from "./types";

export function useConfig(): UseConfig {
    // Farris Admin 全局配置对象资源地址
    // 默认配置选项: 加载本地菜单和页面资源
    const defaultConfigFileUrl = './assets/config-default.json';
    // inBuilder配置选项: 可加载UBML低代码产品发行版inBuilder的菜单和页面数据, 启动inBuilder运行环境后，即可使用此配置文件加载数据
    // const defaultConfigFileUrl = './assets/config-for-inBuilder.json';
    // 全局配置对象接口
    const fallbackFunctionSourceUri = '/api/runtime/sys/v1.0/functions/funcGroups?funcType=4';
    const fallbackWorkAreaSourceUri = './assets/work-areas.json';

    const options: ConfigOptions = {
        /** 标题 */
        title: '',
        /** 缺省菜单页面地址 */
        emptyFunctionPage: '',
        /** 功能菜单数据Url */
        functionSourceUri: '',
        /** 初始预制工作区数据源 */
        residentWorkAreas: [],
        /** 初始预制菜单数据源 */
        residentFunctions: [],
        /** 解析功能菜单Url地址服务 */
        resolveFunctionUri: '',
        /** 解析工作区Url地址服务 */
        workAreaSourceUri: ''
    };

    function applyConfig(config: Record<string, any> | null | undefined) {
        if (!config) {
            return;
        }
        options.title = config['title'] || options.title;
        options.emptyFunctionPage = config['emptyFunctionPage'] || options.emptyFunctionPage;
        options.functionSourceUri = config['functionSourceUri'] || options.functionSourceUri;
        options.workAreaSourceUri = config['workAreaSourceUri'] || options.workAreaSourceUri;
        options.residentWorkAreas = config['residentWorkAreas'] || options.residentWorkAreas;
        options.residentFunctions = config['residentFunctions'] || options.residentFunctions;
        options.resolveFunctionUri = config['resolveFunctionUri'] || options.resolveFunctionUri;
    }

    function applyFallbacks() {
        if (!options.functionSourceUri) {
            options.functionSourceUri = fallbackFunctionSourceUri;
        }
        if (!options.workAreaSourceUri) {
            options.workAreaSourceUri = fallbackWorkAreaSourceUri;
        }
    }

    async function initialize() {
        try {
            const response = await axios.get(defaultConfigFileUrl);
            applyConfig(response.data);
        } catch {
            // ignore config read failure and continue with fallback defaults
        }
        applyFallbacks();
        return options;
    }

    return { options, initialize };
}

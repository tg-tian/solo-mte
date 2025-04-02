import axios from "axios";
import { ConfigOptions, UseConfig } from "./types";

export function useConfig(): UseConfig {
    // Farris Admin 全局配置对象资源地址
    // 默认配置选项: 加载本地菜单和页面资源
    const defaultConfigFileUrl = './assets/config-default.json';
    // inBuilder配置选项: 可加载UBML低代码产品发行版inBuilder的菜单和页面数据, 启动inBuilder运行环境后，即可使用此配置文件加载数据
    // const defaultConfigFileUrl = './assets/config-for-inBuilder.json';
    // 全局配置对象接口
    const options: ConfigOptions = {
        /** 缺省菜单页面地址 */
        emptyFunctionPage: '',
        /** 功能菜单数据Url */
        functionSourceUri: '',
        /** 初始预制菜单数据源 */
        residentFunctions: [],
        /** 解析功能菜单Url地址服务 */
        resolveFunctionUri: ''
    };

    function initialize() {
        return new Promise<ConfigOptions>((resolve, reject) => {
            axios.get(defaultConfigFileUrl).then((response) => {
                const config = response.data;
                if (config) {
                    options.emptyFunctionPage = config['emptyFunctionPage'] || options.emptyFunctionPage;
                    options.functionSourceUri = config['functionSourceUri'] || options.functionSourceUri;
                    options.residentFunctions = config['residentFunctions'] || options.residentFunctions;
                    options.resolveFunctionUri = config['resolveFunctionUri'] || options.resolveFunctionUri;
                }
                resolve(options);
            });
        });
    }

    return { options, initialize };
}

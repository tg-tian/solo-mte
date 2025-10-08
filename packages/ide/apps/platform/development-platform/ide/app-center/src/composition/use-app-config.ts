import axios from "axios";
import { AppConfigOptions, UseAppConfig } from "./type";

export function useAppConfig(): UseAppConfig {
    // Farris Admin 全局配置对象资源地址
    // 默认配置选项: 加载本地菜单和页面资源
    const defaultConfigFileUrl = '/assets/app-config-default.json';
    // inBuilder配置选项: 可加载UBML低代码产品发行版inBuilder的菜单和页面数据, 启动inBuilder运行环境后，即可使用此配置文件加载数据
    // const defaultConfigFileUrl = './assets/config-for-inBuilder.json';
    // 全局配置对象接口
    const options: AppConfigOptions = {
        /** 功能菜单数据Url */
        appDataSourceUri: '',
    };

    function initialize() {
        return new Promise<AppConfigOptions>((resolve, reject) => {
            axios.get(defaultConfigFileUrl).then((response) => {
                const config = response.data;
                if (config) {
                    options.appDataSourceUri = config['appDataSourceUri'] || options.appDataSourceUri;
                }
                resolve(options);
            });
        });
    }

    return { options, initialize };
}

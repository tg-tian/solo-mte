import axios from "axios";
import { UseConfig } from "./types";

export function useResolveFunctionUrl(config: UseConfig) {

    /**
     * 调用服务将获取指定标识功能菜单的页面地址
     * @param functionId 功能菜单标识
     * @returns 功能菜单页面Url地址
     */
    function resolve(functionId: string) {
        const { emptyFunctionPage, resolveFunctionUri } = config.options;
        const url = `${resolveFunctionUri}/${functionId}`;
        return new Promise<string>((resolve, reject) => {
            axios.get(url).then((response) => {
                const functionUrl = response.data.invokingConfig.url;
                resolve(functionUrl);
            }, (error) => {
                resolve(emptyFunctionPage);
            });
        });
    }

    return { resolve };
}

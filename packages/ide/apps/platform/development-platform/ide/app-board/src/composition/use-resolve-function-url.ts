import axios from "axios";
import { FunctionItem, UseConfig } from "./types";

export function useResolveFunctionUrl(config: UseConfig) {

    function fallbackResolveFunctionUri(item: FunctionItem): string {
        return `/apps/${item.appDomain}/${item.appModule}/${item.appGroup}/${item.code}/index.html`;
    }

    /**
     * 调用服务将获取指定标识功能菜单的页面地址
     * @param functionId 功能菜单标识
     * @returns 功能菜单页面Url地址
     */
    function resolve(functionItem: FunctionItem) {
        const { resolveFunctionUri } = config.options;
        const url = `${resolveFunctionUri}/${functionItem.id}`;
        return new Promise<string>((resolve) => {
            axios.get(url).then((response) => {
                const functionUrl = response.data.invokingConfig.url;
                resolve(functionUrl);
            }, () => {
                const fallbackFunctionUrl = fallbackResolveFunctionUri(functionItem);
                resolve(fallbackFunctionUrl);
            });
        });
    }

    return { resolve };
}

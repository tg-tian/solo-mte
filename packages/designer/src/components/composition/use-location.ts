export function useLocation() {
    function getUrlParam(key: string) {
        const URL = new URLSearchParams(location.search);
        return decodeURI(URL.get(key) || '');
    }

    /**
     * 获取url参数
     * @param variable 参数编号
     */
    function getHrefParam(key: string) {

        const queryParam = window.location.href.substring(window.location.href.indexOf('?') + 1);
        const queryVars = queryParam.split('&');
        for (const queryVar of queryVars) {
            const pair = queryVar.split('=');
            if (pair[0] === key) { return pair[1]; }
        }
    }
    return {
        getUrlParam,
        getHrefParam
    };
}

export class MenuUtils {

    private static FLOW_DESIGNER_MENU_ID: string = '';

    static {
        const urlParams = new URLSearchParams(window.location.search);
        const menuIdFromUrl = urlParams.get('flowDesignerMenuID') || '';
        MenuUtils.FLOW_DESIGNER_MENU_ID = menuIdFromUrl;
        if (!menuIdFromUrl) {
            console.error(`请在URL中拼接查询参数"flowDesignerMenuID"，值等于流程设计器菜单的ID`);
        }
    }

    /**
     * 在iGIX中打开一个菜单
     * @param menuID  菜单ID
     * @param params  给页面传递的参数
     * @param tabID   标签页ID，如果与已打开标签页的ID重复则切换到已打开的标签页，如果是新ID则打开新标签页
     * @param tabName 标题
     */
    public static openMenu(menuID: string, params: Map<string, string>, tabID: string, tabName?: string): void {
        const options = {
            tabId: tabID,
            funcId: menuID,
            appType: 'menu',
            queryStringParams: params,
            entityParams: params,
            appId: undefined,
            appEntrance: undefined,
            isReload: false,
            tabName: tabName || null
        };
        this.openMenuByRtf(options);
    }

    public static editFlowMetadata(flowMetadataID: string, flowName: string): void {
        if (!flowMetadataID) {
            return;
        }
        const defaultTitle = `流程编排设计器`;
        const tabTitle = flowName ? `${flowName} - ${defaultTitle}` : defaultTitle;
        this.openMenu(
            this.FLOW_DESIGNER_MENU_ID,
            new Map([['metadataId', flowMetadataID]]),
            `FarrisFlowDesigner_${flowMetadataID}`,
            tabTitle,
        );
    }

    private static isSameOrigin(environment: Window) {
        const host = window.location.host;
        try {
            if (environment && environment.location && typeof environment.location.host !== 'undefined') {
                return environment.location.host === host;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    private static getRtfService() {
        let env: any = window;
        while (!env['gspframeworkService'] && env !== window.top && this.isSameOrigin(env)) {
            env = env.parent;
        }
        return env['gspframeworkService'] && env['gspframeworkService']['rtf'] || {};
    }

    private static openMenuByRtf(options: any) {
        const rtfService = this.getRtfService();
        if (rtfService && rtfService.hasOwnProperty('func') && typeof rtfService['func']['openMenu'] === 'function') {
            rtfService.func.openMenu(options);
        }
    }

    private static addEventListener(
        eventName: string,
        handler: (event: any) => void,
        options: any,
    ) {
        const rtfService = this.getRtfService();
        if (rtfService && rtfService.hasOwnProperty('frmEvent') && typeof rtfService['frmEvent']['eventListener'] === 'function') {
            rtfService.frmEvent.eventListener(eventName, handler, options);
        }
    }

    public static listenTabSwitchEvent(handler: (event: any) => void, options: any): void {
        const eventName = 'funcSwitchEvent';
        this.addEventListener(eventName, handler, options);
    }

    private static parseQueryString(queryString: string): Record<string, any> {
        if (!queryString) {
            return {};
        }
        const pairs = queryString.slice(queryString.indexOf('?') + 1).split('&');
        return pairs.reduce((params, pair) => {
            const splitIndex = pair.indexOf('=');
            const key = pair.slice(0, splitIndex);
            const value = pair.slice(splitIndex + 1);
            return Object.assign(params, { [key]: decodeURIComponent(value) });
        }, {});
    }

    public static getQueryParams(): Record<string, any> {
        const search = window.location.search;
        return this.parseQueryString(search);
    }
}

export function useMenu() {

    function isSameOrigin(environment: Window) {
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

    function getRtfService() {
        let env = window as any;
        while (!env['gspframeworkService'] && env !== window.top && isSameOrigin(env)) {
            env = env.parent;
        }
        return env['gspframeworkService'] && env['gspframeworkService']['rtf'] || {};
    }

    function parseQueryString(queryString: string): Record<string, any> {
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

    function getQueryParams(): Record<string, any> {
        const search = window.location.search;
        return parseQueryString(search);
    }

    function closeMenu(): void {
        const params = getQueryParams();
        const rtfService = getRtfService();
        if (
            rtfService &&
            rtfService.hasOwnProperty('func') &&
            typeof rtfService['func']['close'] === 'function' &&
            params.tabId
        ) {
            rtfService.func.close(params);
        } else {
            window.parent.postMessage('closeFlowDesigner', '*');
        }
    }

    return {
        closeMenu,
    };
}

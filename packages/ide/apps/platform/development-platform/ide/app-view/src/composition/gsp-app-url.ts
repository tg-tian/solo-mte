/**
 * 将 gspapp 返回的应用入口地址与 appEntrance 组合为 iframe 可用的完整 URL。
 * 顶层 url 为应用 HTML 入口；appEntrance 为前端路由（常见于 hash 路由，如 index.html#/Contacts）。
 */
export function buildGspAppInvokeUrl(baseUrl: string, appEntrance: string): string {
    const base = (baseUrl || '').trim().replace(/\/+$/, '');
    const entrance = (appEntrance || '').trim().replace(/^\/+/, '');
    if (!base) {
        return entrance ? `#/${entrance}` : '';
    }
    if (!entrance) {
        return base;
    }
    const hashIndex = base.indexOf('#');
    const beforeHash = hashIndex === -1 ? base : base.slice(0, hashIndex);
    return `${beforeHash}#/${entrance}`;
}

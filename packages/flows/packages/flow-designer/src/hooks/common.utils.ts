export function syncObject(target: any, source: any): void {
    if (!target || typeof target !== 'object') {
        return;
    }
    Object.keys(target).forEach(key => {
        delete target[key];
    });
    if (source) {
        Object.assign(target, source);
    }
}

import axios from "axios";

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function useCreateAppDomainModule() {
    const createApiUri = '/api/runtime/sys/v1.0/business-objects/';

    function createAppDomain(code: string, name: string): Promise<boolean> {
        const id = generateUUID();
        const payload = {
            code,
            name,
            languageName: { 'zh-CHS': name },
            description: name,
            id,
            layer: 2,
            parentID: 'gscloud',
            sysInit: '0',
            isSysInit: false,
            isDetail: '0',
            sortOrder: 1
        };
        return new Promise<boolean>((resolve, reject) => {
            axios.post(createApiUri, payload).then(() => {
                resolve(true);
            }, () => {
                reject(false);
            });
        });
    }

    function createModule(code: string, name: string, appDomainId: string): Promise<boolean> {
        const id = generateUUID();
        const payload = {
            code,
            name,
            businessObjectName: name,
            languageName: { 'zh-CHS': name },
            description: name,
            id,
            layer: 3,
            parentID: appDomainId,
            sysInit: '0',
            isSysInit: false,
            isDetail: '0',
            sortOrder: 1
        };
        return new Promise<boolean>((resolve, reject) => {
            axios.post(createApiUri, payload).then(() => {
                resolve(true);
            }, () => {
                reject(false);
            });
        });
    }

    return { createAppDomain, createModule };
}

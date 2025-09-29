import axios from "axios";

export function useCreateApp() {
    const createNewAppApiUri = '/api/runtime/sys/v1.0/business-objects/';
    const defaultAppInfoPayload = {
        code: "",
        id: "",
        isDetail: "1",
        isSysInit: false,
        languageName: { 'zh-CHS': "" },
        layer: 4,
        name: "",
        parentID: "",
        sortOrder: 2,
        sysInit: "0",
    };

    function createNewApp(code: string, name: string, appModelId: string) {
        const id = Date.now().toString();
        const appInfoPayload = Object.assign({}, defaultAppInfoPayload, {
            id, code, name, languageName: { 'zh-CHS': name }, parentID: appModelId
        });
        return new Promise<boolean>((resolve, reject) => {
            axios.post(createNewAppApiUri, appInfoPayload).then((response) => {
                resolve(true);
            }, (error) => {
                reject();
            });
        });
    }

    return { createNewApp };
}

import axios from 'axios';
import { FNotifyService } from '@farris/ui-vue';
import { WorkspaceOptions } from '../../../composition/types';

export function UsePreview(){
    const notifyService: any = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };

     /**
     * @description 发布
     * @introduction post接口触发发布行为，ws负责接收发布状态
     */
    function publishFormMetadata(): Promise<{ result: boolean, error?: string; }> {
        return new Promise((resolve, reject) => {
            let wsType = 'ws:';
            if (location && location.protocol === 'https:') {
                wsType = 'wss:';
            }
            // const formMetadataBasicInfo = useFormSchemaComposition.getFormMetadataBasicInfo();
            const bizobjectID = '79e6a88d-d78a-1fb6-30de-46d3cafddce6';
            const relativePath = 'Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components';
            const fileName = 'Contacts.frm';
            const metadataId = '580a302f-513a-452b-a9dc-9816ffd02c09';
            const url = wsType + `//${location.host}/api/dev/main/v1.0/lcm-log/ws?token=${bizobjectID}`;
            // const publishStatusSocket = new WebSocket(url);

            // publishStatusSocket.onopen = (() => {
                const formMetadataBasicInfoUrl = relativePath + '/' + fileName;
                const metadataPathList = relativePath.split('/').filter(pathItem => pathItem);
                const boPath = metadataPathList[0] + '/' + metadataPathList[1] + '/' + metadataPathList[2];
                const api = `/api/dev/main/v1.0/repo-packages/publish?id=${bizobjectID}&path=${boPath}`;
                const requestHeader = {
                    "content-type": "application/json"
                };
                axios.post(api, { webParam: { runFormMetadataId: metadataId, runFormMetadataPath: formMetadataBasicInfoUrl } }, { headers: requestHeader }).then((response) => {
                    resolve({ result: true });
                });
            // });
            // publishStatusSocket.onerror = ((error: any) => {
            //     let errMessage = '解析异常，请重试';
            //     if (typeof (error.error) === 'string') {
            //         errMessage = error.error;
            //     }
            //     resolve({ result: false, error: errMessage });
            // });
            // publishStatusSocket.onmessage = ((event) => {
            //     // console.log(event);
            //     const progressInfoStr = event.data.match(/\{(.*)\}/)[0];
            //     const progressInfo = JSON.parse(progressInfoStr);

            //     if (progressInfo.process === 100) {
            //         publishStatusSocket.close();
            //         resolve({ result: true });
            //     } else {
            //         if (progressInfo.status === 1) {
            //             publishStatusSocket.close();
            //             resolve({ result: false, error: progressInfo.errorMsg });
            //         }
            //     }
            // });

        });
    }

    function preview(options: WorkspaceOptions) {
        // const loadingInstance = notifyService.show('运行中，请稍候...');
        // const metadataId = useFormSchemaComposition.getFormMetadataBasicInfo()?.id;
        // const relativePath = useFormSchemaComposition.getFormMetadataBasicInfo()?.relativePath;
        // const formCode = useFormSchemaComposition.getFormMetadataBasicInfo()?.code;
        const metadataId = '580a302f-513a-452b-a9dc-9816ffd02c09';
        const relativePath = 'Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components';
        const metadataPath = 'Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components/Contacts.frm';


        publishFormMetadata().then((publishInfo) => {
            if (publishInfo.result) {
                // loadingInstance.value.close();
                // const previewUrl = `${window.location.origin}/platform/common/web/renderer/index.html#/preview?metadataPath=${metadataPath}&projectPath=${relativePath}&baseMetadataId=${metadataId}`;
                const appPath = options.path;
                const appId = options.appId;
                const ws = options.workspaceId;
                const previewUrl = `/apps/platform/development-platform/ide/app-preview/index.html?path=${appPath}&appId=${appId}&ws=${ws}`;
                const windowProxy = window.open(previewUrl);
                if (!windowProxy) {
                    notifyService.error('运行失败，请调整浏览器安全设置后重试！');
                }
            } else {
                // loadingInstance.value.close();
                notifyService.error(publishInfo.error || '表单运行失败');
            }
        });

    }

    return {preview}

}
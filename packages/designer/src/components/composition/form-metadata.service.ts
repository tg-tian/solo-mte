import axios from 'axios';
import { mergeWith, omit } from 'lodash-es';
import { DesignerProps } from '../designer.props';
import { FormMetadaDataDom, MetadataDto, MetadataPathToken, UseFormSchema, UseFormMetadata, FormMetaDataModule } from '../types';
import { inject } from 'vue';
import { MetadataService } from './metadata.service';
import { FNotifyService } from "@farris/ui-vue";
import { DesignerMode, UseDesignerContext } from '../types/designer-context';

export function useFormMetadata(props: DesignerProps, useFormSchemaComposition: UseFormSchema): UseFormMetadata {

    function fetchLocalSchema(): Promise<any> {
        return new Promise((resolve, reject) => {
            const currentPath = window.location.hash;
            if (currentPath) {
                const loacalSchemaUrl = `/${currentPath.slice(1)}.json`;
                axios.get(loacalSchemaUrl).then((response) => {
                    const formSchema = response.data.Content.Contents;
                    const formMetadataBasicInfo = omit(response.data, 'content') as MetadataDto;

                    useFormSchemaComposition.setFormMetadataBasicInfo(formMetadataBasicInfo);
                    useFormSchemaComposition.setFormSchema(formSchema);

                    resolve(formSchema);
                });
            } else {
                resolve(props.schema);
            }
        });
    }

    /** 获取表单元数据 */
    function queryMetadata(): Promise<FormMetadaDataDom> {
        const metadataPath: string = inject<string>(MetadataPathToken, '');
        if (!metadataPath) {
            return fetchLocalSchema();
        }

        // 获取url中的元数据路径，查询元数据。若url中没有路径，则采用外部传入的mock数据
        return new Promise((resolve, reject) => {
            const url = '/api/dev/main/v1.0/metadatas/load?metadataFullPath=' + metadataPath;

            axios.get(url).then((response) => {

                const formSchema = JSON.parse(response.data.content).Contents;
                const formMetadataBasicInfo = omit(response.data, 'content') as MetadataDto;

                useFormSchemaComposition.setFormMetadataBasicInfo(formMetadataBasicInfo);
                useFormSchemaComposition.setFormSchema(formSchema);

                resolve(formSchema);
            });
        });

    }
    function saveFormMetadata() {
        const formMetadataBasicInfo = useFormSchemaComposition.getFormMetadataBasicInfo();
        const formSchema = useFormSchemaComposition.getFormSchema();
        const metadataContent = Object.assign({
            code: null,
            name: null,
            Id: formMetadataBasicInfo.id,
            Contents: JSON.stringify(formSchema)
        });
        const newDto = {
            ID: formMetadataBasicInfo.id,
            NameSpace: formMetadataBasicInfo.nameSpace,
            Code: formMetadataBasicInfo.code,
            Name: formMetadataBasicInfo.name,
            FileName: formMetadataBasicInfo.fileName,
            RelativePath: formMetadataBasicInfo.relativePath,
            Content: formMetadataBasicInfo.content,
            Type: formMetadataBasicInfo.type,
            BizobjectID: formMetadataBasicInfo.bizobjectID,
            ExtendProperty: formMetadataBasicInfo.extendProperty,
            NameLanguage: formMetadataBasicInfo.nameLanguage ? formMetadataBasicInfo.nameLanguage : null,
            Properties: formMetadataBasicInfo.properties,
            Extendable: formMetadataBasicInfo.extendable,
            content: JSON.stringify(metadataContent)
        };

        return new MetadataService().saveMetadata(newDto);
    }
    /**
     * 获取拖拽控制规则：合并公共规则和模板的特定规则
     */
    function queryFormTemplateRule(formModule: FormMetaDataModule): Promise<void> {
        if (!formModule) {
            return Promise.resolve();
        }
        const { templateId, templateRule } = formModule;
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };

        return new Promise((resolve, reject) => {
            const rulesRequests = [axios.get(`assets/template-rules/common.json`).then(response => response).catch(error => {
                notifyService.error('获取表单公共控制规则失败。');
                return;
            })];
            if (templateId && templateRule) {
                rulesRequests.push(axios.get(`assets/template-rules/${templateId}.json`).then(response => response).catch(error => {
                    notifyService.error(`获取模板[${templateId}]的控制规则失败。`);
                    return;
                }));
            }
            axios.all(rulesRequests).then(axios.spread((commonRuleResult, templateRuleResult) => {
                if (commonRuleResult) {
                    if (templateRuleResult) {
                        function customizer(objValue, srcValue) {
                            if (Array.isArray(objValue) && Array.isArray(srcValue)) {
                                return objValue.concat(srcValue);;
                            }
                        }
                        mergeWith(commonRuleResult.data, templateRuleResult.data, customizer);
                    }
                    useFormSchemaComposition.setFormTemplateRule(commonRuleResult.data);
                }


                resolve();
            }), () => {
                resolve();
            });
        });


    }

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
            const formMetadataBasicInfo = useFormSchemaComposition.getFormMetadataBasicInfo();
            const url = wsType + `//${location.host}/api/dev/main/v1.0/lcm-log/ws?token=${formMetadataBasicInfo.bizobjectID}`;
            const publishStatusSocket = new WebSocket(url);

            publishStatusSocket.onopen = (() => {
                const formMetadataBasicInfoUrl = useFormSchemaComposition.getFormMetadataBasicInfo().relativePath + '/' + formMetadataBasicInfo.fileName;
                const metadataPathList = formMetadataBasicInfo.relativePath.split('/').filter(pathItem => pathItem);
                const boPath = metadataPathList[0] + '/' + metadataPathList[1] + '/' + metadataPathList[2];
                const api = `/api/dev/main/v1.0/repo-packages/publish?id=${formMetadataBasicInfo.bizobjectID}&path=${boPath}`;
                const requestHeader = {
                    "content-type": "application/json"
                };
                axios.post(api, { webParam: { runFormMetadataId: formMetadataBasicInfo.id, runFormMetadataPath: formMetadataBasicInfoUrl } }, { headers: requestHeader }).then((response) => {

                });
            });
            publishStatusSocket.onerror = ((error: any) => {
                let errMessage = '解析异常，请重试';
                if (typeof (error.error) === 'string') {
                    errMessage = error.error;
                }
                resolve({ result: false, error: errMessage });
            });
            publishStatusSocket.onmessage = ((event) => {
                // console.log(event);
                const progressInfoStr = event.data.match(/\{(.*)\}/)[0];
                const progressInfo = JSON.parse(progressInfoStr);

                if (progressInfo.process === 100) {
                    publishStatusSocket.close();
                    resolve({ result: true });
                } else {
                    if (progressInfo.status === 1) {
                        publishStatusSocket.close();
                        resolve({ result: false, error: progressInfo.errorMsg });
                    }
                }
            });

        });
    }

    function deployFrontFile(metadataId, path) {
        const api = '/api/dev/main/v1.0/frontend-project/runvueform';
        const requestHeader = {
            "content-type": "application/json"
        };
        const sendData = {
            metadataId,
            path
        };
        return axios.post(api, sendData, { headers: requestHeader });
    }

    /**
    * 运行表单
    */
    function runForm(loadingService, messageBoxService, designerContext: UseDesignerContext, metadataPath: string) {
        const loadingInstance = loadingService?.show({ message: '解析中，请稍候...' });
        const metadataId = useFormSchemaComposition.getFormMetadataBasicInfo()?.id;
        const relativePath = useFormSchemaComposition.getFormMetadataBasicInfo()?.relativePath;
        const formCode = useFormSchemaComposition.getFormMetadataBasicInfo()?.code;

        publishFormMetadata().then((publishInfo) => {
            if (publishInfo.result) {
                loadingInstance.value.close();
                let previewUrl;
                if (designerContext.designerMode === DesignerMode.Mobile) {
                    const component = useFormSchemaComposition.getComponents()[0];
                    const uri = component?.route?.uri;
                    previewUrl = `${window.location.origin}/platform/common/web/mobile-renderer/index.html#/${formCode}/${uri}?metadataPath=${metadataPath}&projectPath=${relativePath}&baseMetadataId=${metadataId}`;
                } else {
                    previewUrl = `${window.location.origin}/platform/common/web/renderer/index.html#/preview?metadataPath=${metadataPath}&projectPath=${relativePath}&baseMetadataId=${metadataId}`;
                }
                const windowProxy = window.open(previewUrl);
                if (!windowProxy) {
                    messageBoxService.error('预览失败，请调整浏览器安全设置后重试！');
                }
            } else {
                loadingInstance.value.close();
                messageBoxService.error(publishInfo.error || '表单解析失败');
            }
        });

    }

    /**
     * 复制部署路径
     */
    async function publishMenu(messageBoxService: any, notifyService: any) {
        const metadataId = useFormSchemaComposition.getFormMetadataBasicInfo()?.id;
        const publishUrl = `/platform/common/web/renderer/index.html#/?baseMetadataId=${metadataId}`;

        const textarea = document.createElement("textarea");
        textarea.value = publishUrl;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            const success = document.execCommand("copy");
            if (success) {
                notifyService.success({ message: '表单部署路径已复制到剪贴板，请前往框架【菜单】页面发布菜单。' });
            } else {
                messageBoxService.warning(`复制失败，请手动复制以下路径: ${publishUrl}`);
            }
        } catch (err) {
            messageBoxService.warning(`复制失败，请手动复制以下路径: ${publishUrl}`);
        }
        document.body.removeChild(textarea);
    }

    return { queryMetadata, saveFormMetadata, queryFormTemplateRule, publishFormMetadata, deployFrontFile, runForm, publishMenu };

}

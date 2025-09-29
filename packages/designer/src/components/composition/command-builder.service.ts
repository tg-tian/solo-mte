import { ref } from 'vue';
import { FNotifyService } from "@farris/ui-vue";
import { WebCommand } from '../components/view-model-designer/method-manager/entity/web-command';
import { MetadataDto, UseFormSchema } from '../types';
import axios from 'axios';
import { UseCommandBuilderService, WebComponentMetadata } from '../types/command';
import { MetadataService } from './metadata.service';


/**
 * 低代码新增构件、新增构件方法的服务
 */
export function useCommandBuilderService(formSchemaService: UseFormSchema): UseCommandBuilderService {
    const metadataService = new MetadataService();
    const notifyService: any = new FNotifyService();
    /** 构件元数据构造数据 */
    let buildInfo: any;
    /** ts代码文件路径 */
    let tsFilePathName: string;
    /** 设计器与代码视图的事件通讯 */
    const eventBetweenDesignerAndCodeView = ref<{ eventName: string, eventValue: any }>({ eventName: '', eventValue: null });

    let hasWebCmp = false;
    let hasWebCmd = false;
    /**
       * 校验当前表单是否已有web构件和命令构件 private
       */
    function checkHasController(targetWebCmd?: { controllerCode: string, controllerName: string }): Promise<any> {
        const formInfo = formSchemaService.getFormMetadataBasicInfo();
        const suffix = '_frm_Controller';
        // 默认构件命令为'表单编号_frm_Controller'
        buildInfo = {
            code: formInfo.code + suffix,
            name: formInfo.name + suffix,
            namespace: formInfo.nameSpace,
            bizObjId: formInfo.bizobjectID,
            relativePath: formInfo.relativePath,
            extendProperty: { IsCommon: false, FormCode: formInfo.code }
        };
        if (targetWebCmd && targetWebCmd.controllerCode && targetWebCmd.controllerCode.includes(formInfo.code)) {
            buildInfo.code = targetWebCmd.controllerCode;
            buildInfo.name = targetWebCmd.controllerName;
        }

        const webCmpFileName = buildInfo.code + '.webcmp';
        const webCmdFileName = buildInfo.code + '.webcmd';
        tsFilePathName = '/' + buildInfo.relativePath + '/' + buildInfo.code + '.ts';
        return metadataService.validateRepeatName(buildInfo.relativePath, webCmpFileName).
            then((notExsited) => {
                hasWebCmp = !notExsited;
                return metadataService.validateRepeatName(buildInfo.relativePath, webCmdFileName).then((notExsited) => {
                    hasWebCmd = !notExsited;
                    if (hasWebCmd) {
                        // 查询命令构件信息---用于获取命令构件id
                        return metadataService.loadMetadata(webCmdFileName, buildInfo.relativePath);
                    } else {
                        return new Promise((resolve, reject) => {
                            // 模拟异步请求
                            resolve(null);
                        });
                    }
                }).then((data) => {
                    if (hasWebCmd && data) {
                        buildInfo.webCmdId = data.id;
                    }
                    return new Promise((resolve, reject) => {
                        // 模拟异步请求
                        resolve(hasWebCmp && hasWebCmd);
                    });
                });

            }).catch(error => {
                console.error('校验relativePath出现异常', error);
            });
    }

    /**
     * 创建命令构件 private
     */
    function createWebCommand(callback: (param: any) => void, param: any) {
        const fileName = buildInfo.code + '.webcmd';
        const metadatadto = {
            id: '',
            nameSpace: buildInfo.namespace,
            code: buildInfo.code,
            name: buildInfo.name,
            fileName: fileName,
            type: 'WebCommand',
            bizobjectID: buildInfo.bizObjId,
            relativePath: buildInfo.relativePath,
            extendProperty: JSON.stringify(buildInfo.extendProperty),
            content: '',
            extendable: false,
            nameLanguage: {}
        } as MetadataDto;

        metadataService.initializeMetadataEntity(metadatadto).then((data => {
            data.fileName = metadatadto.fileName;
            buildInfo.webCmdId = data.id;
            return metadataService.createMetadata(data);
        })
        ).then(result => {
            if (result['ok']) {
                callback(param);
            } else {
                const msg = '命令构件创建失败';
                notifyService.error(msg);
            }
        });
    }
    /**
     * 创建构件：先创建web构件，再创建命令构件 private
     */
    function createWebMetadata(callback: (param: any) => void, param: any) {
        const fileName = buildInfo.code + '.webcmp';

        const metadatadto = {
            id: '',
            nameSpace: buildInfo.namespace,
            code: buildInfo.code,
            name: buildInfo.name,
            fileName: fileName,
            type: 'WebComponent',
            bizobjectID: buildInfo.bizObjId,
            relativePath: buildInfo.relativePath,
            extendProperty: JSON.stringify(buildInfo.extendProperty),
            content: '',
            extendable: false,
            nameLanguage: {}
        } as MetadataDto;

        // 已存在web构件， 只创建命令构件
        if (hasWebCmp) {
            createWebCommand(callback, param);
            return;
        }
        // 不存在web构件，先创建web构件
        metadataService.initializeMetadataEntity(metadatadto).then((data) => {
            data.fileName = metadatadto.fileName;
            const path = buildInfo.relativePath + '/';
            const tsFileName = buildInfo.code + '.ts';
            const sourcePath = path + tsFileName;
            const webComponent = JSON.parse(data.content) as WebComponentMetadata;
            webComponent.Source = sourcePath.toString();
            data.content = JSON.stringify(webComponent);
            return metadataService.createMetadata(data);
        }).then(result => {
            if (result['ok']) {
                const url = '/api/dev/main/v1.0/tsfile/create?path=' + tsFilePathName+'&formType=Vue';
                return axios.post(url, {}).then((res) => res.data);
            } else {
                const msg = 'Web构件创建失败';
                notifyService.error({ message: msg, position: 'top-center' });
                return new Promise((resolve, reject) => {
                    // 模拟异步请求
                    reject(msg);
                });;
            }
        }).then(data => {
            // web构件创建成功，若没有命令构件，则创建命令构件，若已有命令构件，则直接触发打开代码视图
            if (!hasWebCmd) {
                createWebCommand(callback, param);
            } else {
                callback(param);
            }
        });
    }


    /**
     * 添加自定义方法（ts方法） function 
     */
    function emitAddTsMethodEvent(param: { tsFilePathName: string, methodCode: string, methodName: string }) {
        eventBetweenDesignerAndCodeView.value = { eventName: 'openCodeViewWithNewMethod', eventValue: param };
    }
    /**
     * 添加自定义方法（ts方法）
     * @param methodCode 方法编号
     * @param methodName 方法名称
     */
    function addControllerMethod(methodCode: string, methodName: string) {
        checkHasController().then((result) => {
            // 若不存在构件，先创建构件
            if (!result) {
                createWebMetadata(emitAddTsMethodEvent, { tsFilePathName: tsFilePathName, methodCode, methodName });
            } else {
                emitAddTsMethodEvent({ tsFilePathName: tsFilePathName, methodCode, methodName });

            }
        });
    }

    /**
     * 添加命令构件方法（webcmd）private
     */
    function emitAddWebCommandMethod(param: { tsFilePathName: string, command: WebCommand }) {
        eventBetweenDesignerAndCodeView.value = { eventName: 'addNewMethodToWebCmd', eventValue: param };
    }
    /**
     * 添加命令构件方法（webcmd）
     * @param command 参照命令
     * @param targetWebCmd 目标控制器编号、名称
     */
    function addWebCommandMethod(command: WebCommand, targetWebCmd?: { controllerCode: string, controllerName: string }) {
        checkHasController(targetWebCmd).then((result) => {
            // 若不存在构件，先创建构件
            if (!result) {
                createWebMetadata(emitAddWebCommandMethod, { tsFilePathName: tsFilePathName, command });
            } else {
                emitAddWebCommandMethod({ tsFilePathName: tsFilePathName, command });
            }
        });
    }
    function getBuildInfo() {
        return buildInfo;
    }

    function jumpToCodeView(param: any) {
        eventBetweenDesignerAndCodeView.value = { eventName: 'jumpToCodeView', eventValue: param }; 
    }

    return { eventBetweenDesignerAndCodeView, addControllerMethod, addWebCommandMethod, getBuildInfo, jumpToCodeView };
}

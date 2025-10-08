import { ref } from 'vue';
import { FNotifyService } from "@farris/ui-vue";
import { WebCommand } from '../components/view-model-designer/method-manager/entity/web-command';
import { MetadataDto, UseFormSchema } from '../types';
import axios from 'axios';
import { UseCommandBuilderService, WebComponentMetadata } from '../types/command';
import { MetadataService } from './metadata.service';


/**
 * 运行时定制新增构件、新增构件方法的服务
 */
export function useRtcCommandBuilderService(formSchemaService: UseFormSchema): UseCommandBuilderService {
    const metadataService = new MetadataService();
    const notifyService: any = new FNotifyService();
    /** 构件元数据构造数据 */
    let buildInfo: any = {};
    /** ts代码文件路径 */
    let tsFilePathName: string;
    /** 设计器与代码视图的事件通讯 */
    const eventBetweenDesignerAndCodeView = ref<{ eventName: string, eventValue: any }>({ eventName: '', eventValue: null });
    /** 表单基础信息 */
    let formBasicInfo;
    /** 构件元数据的后缀 */
    const metadataSuffix = '_ext_frm_Controller';

    function initBuildInfo(targetWebCmd?: { controllerCode: string, controllerName: string }) {
        formBasicInfo = formSchemaService.getFormMetadataBasicInfo();
        // 默认构件命令为'表单编号_ext_frm_Controller'
        buildInfo = {
            code: formBasicInfo.rtcCode + metadataSuffix,
            name: formBasicInfo.rtcName + metadataSuffix,
            extendProperty: { IsCommon: false, FormCode: formBasicInfo.rtcCode }
        };
        if (targetWebCmd && targetWebCmd.controllerCode && targetWebCmd.controllerCode.includes(formBasicInfo.rtcCode)) {
            buildInfo.code = targetWebCmd.controllerCode;
            buildInfo.name = targetWebCmd.controllerName;
        }
        tsFilePathName = '/' + formBasicInfo.relativePath + '/' + buildInfo.code + '.ts';

    }

    /**
     * 校验当前表单是否已有web构件和命令构件
     */
    function checkHasController(): Promise<any> {
        return new Promise((resolve, reject) => {
            metadataService.queryRelatedComponentMetadata(formBasicInfo.rtcId).then((data: any) => {
                const webCmp = data.find(metadata => metadata.fileName === `${formBasicInfo.rtcCode}${metadataSuffix}.webcmp`);
                const webCmd = data.find(metadata => metadata.fileName === `${formBasicInfo.rtcCode}${metadataSuffix}.webcmd`);
                if (webCmd) {
                    buildInfo.webCmdId = webCmd.id;
                }
                if (webCmp) {
                    buildInfo.webCmpId = webCmp.id;
                }
                if (webCmd && webCmp) {
                    resolve(true);
                } else {
                    resolve(false);
                }

            }).catch(error => {
                console.error('查询构件失败', error);
            });
        });
    }

    /**
     * 创建命令构件
     */
    function createWebCommand(callback: (param: any) => void, param: any) {
        const fileName = buildInfo.code + '.webcmd';
        const metadatadto = {
            id: '',
            nameSpace: formBasicInfo.nameSpace,
            code: buildInfo.code,
            name: buildInfo.name,
            fileName: fileName,
            type: 'WebCommand',
            bizobjectID: formBasicInfo.bizobjectID,
            relativePath: '',
            extendProperty: JSON.stringify(buildInfo.extendProperty),
            content: '',
            extendable: false,
            nameLanguage: formBasicInfo.nameLanguage
        } as MetadataDto;

        metadataService.initializeRtcMetadataEntity(metadatadto, formBasicInfo.rtcId).then((data => {
            data.fileName = metadatadto.fileName;
            buildInfo.webCmdId = data.id;
            return metadataService.createRtcMetadata(data);
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
     * 创建构件：先创建web构件，再创建命令构件
     */
    function createWebMetadata(callback: (param: any) => void, param: any) {

        // 已存在web构件， 只创建命令构件
        if (buildInfo.webCmpId) {
            createWebCommand(callback, param);
            return;
        }
        const fileName = buildInfo.code + '.webcmp';
        const metadatadto = {
            id: '',
            nameSpace: formBasicInfo.nameSpace,
            code: buildInfo.code,
            name: buildInfo.name,
            fileName: fileName,
            type: 'WebComponent',
            bizobjectID: formBasicInfo.bizobjectID,
            relativePath: '',
            extendProperty: JSON.stringify(buildInfo.extendProperty),
            content: '',
            extendable: false,
            nameLanguage: formBasicInfo.nameLanguage
        } as MetadataDto;
        // 不存在web构件，先创建web构件
        metadataService.initializeRtcMetadataEntity(metadatadto, formBasicInfo.rtcId).then((data) => {
            data.fileName = metadatadto.fileName;
            buildInfo.webCmpId = data.id;
            return metadataService.createRtcMetadata(data);
        }).then(result => {
            if (result['ok']) {
                // web构件创建成功，若没有命令构件，则创建命令构件，若已有命令构件，则直接触发打开代码视图
                if (!buildInfo.webCmdId) {
                    createWebCommand(callback, param);
                } else {
                    callback(param);
                }
            } else {
                const msg = 'Web构件创建失败';
                notifyService.error({ message: msg, position: 'top-center' });
            }

        });
    }


    /**
     * 添加自定义方法（ts方法） function 
     */
    function emitAddTsMethodEvent(param: {
        tsFilePathName: string, methodCode: string, methodName: string, [prop: string]: string
    }) {
        if (buildInfo.webCmdId) {
            param.webCommandId = buildInfo.webCmdId;
        }
        if (buildInfo.webCmpId) {
            param.webComponentId = buildInfo.webCmpId;
        }
        eventBetweenDesignerAndCodeView.value = {
            eventName: 'openCodeViewWithNewMethod',
            eventValue: param
        };
    }
    /**
     * 添加自定义方法（ts方法）
     * @param methodCode 方法编号
     * @param methodName 方法名称
     */
    function addControllerMethod(methodCode: string, methodName: string) {
        initBuildInfo();
        checkHasController().then((result) => {
            // 若不存在构件，先创建构件
            if (!result) {
                createWebMetadata(emitAddTsMethodEvent, { tsFilePathName: tsFilePathName, methodCode, methodName });
            } else {
                emitAddTsMethodEvent({
                    tsFilePathName: tsFilePathName,
                    methodCode,
                    methodName
                });

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
        // checkHasController(targetWebCmd).then((result) => {
        //     // 若不存在构件，先创建构件
        //     if (!result) {
        //         createWebMetadata(emitAddWebCommandMethod, { tsFilePathName: tsFilePathName, command });
        //     } else {
        //         emitAddWebCommandMethod({ tsFilePathName: tsFilePathName, command });
        //     }
        // });
    }

    function getBuildInfo() {
        return buildInfo;
    }

    function jumpToCodeView(param: any) {
        eventBetweenDesignerAndCodeView.value = { eventName: 'jumpToCodeView', eventValue: param };
    }
    return { eventBetweenDesignerAndCodeView, addControllerMethod, addWebCommandMethod, getBuildInfo, jumpToCodeView };
}


import axios from "axios";
import { checkCode, checkName } from "../utils/valid";
import { FieldOption } from "../type/fields-getter";
import { MetadataService } from "../../../../composition/metadata.service";
import { NavDataUtilService } from "./nav-data-util.service";
import { fieldGetterController } from "./field-getter";
import { DesignerMode } from "../../../../../components/types/designer-context";
import { useDesignerContext } from "../../../../../components/composition/designer-context/use-designer-context";
import { MetadataDto as FormMetadataDto } from "../../../../../components/types/metadata";
import { MetadataDto } from "../entity/metadata-generator";

/** 新建前端构件的结果 */
export interface CmpBuildResult {
  /** ts文件路径，用于在代码视图中直接打开新构件 */
  tsFilePath: string;
  /** 是否新增了文件，如果是则需要刷新导航树 */
  hasNewFile: boolean;
  /** 是否存在错误，默认不存在 */
  hasError?: boolean;
  /** 错误提示信息 */
  errorTip?: string;
  /** web构件id,用于运行时定制场景 */
  webComponentId?: string;
  /** 命令构件id,用于运行时定制场景 */
  webCommandId?: string;
}
/** 构件元数据基本信息 */
interface CmpBuildInfo {
  code: string;
  name: string;
  namespace: string;
  bizObjId: string;
  relativePath: string;
  extendProperty: any;
  tsFilePathName: string;
}

/** 用于新增前端控制器构件 */
export class FrmCmpBuilder {
  metadataService: MetadataService;
  navDataUtilService: NavDataUtilService;
  fieldGetter;
  private designerMode: DesignerMode;
  constructor(private formBasicInfo: FormMetadataDto) {
    this.metadataService = new MetadataService();
    this.navDataUtilService = new NavDataUtilService();
    this.fieldGetter = fieldGetterController();
    this.designerMode = useDesignerContext().designerMode;
  }
  /**
   * 弹框新增一个前端控制器构件
   * @param frmPath 表单元数据地址
   * @returns 新建结果，为空则表示用户点击了取消
   */
  async addNewCmp(frmPath: string): Promise<CmpBuildResult> {
    const fields: FieldOption[] = [{
      code: 'code',
      name: '构件编号',
      placeholder: '可选，默认为“Controller”，需遵守js变量名规则',
      validate: (value: string) => {
        if (!value) {
          return '';
        }
        const error = checkCode(value);
        return error ? '编号' + error : '';
      }
    }, {
      code: 'name',
      name: '构件名称',
      placeholder: '可选，默认与构件编号相同',
      validate: (value: string) => {
        if (!value) {
          return '';
        }
        const error = checkName(value);
        return error ? '名称' + error : '';
      }
    }];
    const fieldsMap = await this.fieldGetter.getFields("新增前端构件", fields, 550, 220).catch(() => null);
    if (fieldsMap) {
      const code: string = (fieldsMap.code || 'Controller').trim();
      const name: string = (fieldsMap.name || code).trim();
      return this.designerMode === DesignerMode.PC_RTC ? this.doAddRtcNewCmp(code, name) : this.doAddNewCmp(code, name, frmPath);
    }
    return null;
  }

  /**
   * 直接新增一个前端控制器构件
   * @remarks 如果已经存在部分文件则进行补全
   * @param code 构件编号
   * @param name 构件名称
   * @param frmPath 表单元数据路径
   */
  async doAddNewCmp(code: string, name: string, frmPath: string): Promise<CmpBuildResult> {
    // 获取表单元数据的编号和名称
    const frmMeta = await this.navDataUtilService.loadMetadata(frmPath).then((data) => data).catch(() => null);
    if (!frmMeta) {
      return {
        hasError: true,
        errorTip: '无法获取到对应的表单元数据，请刷新后重试',
        tsFilePath: '', hasNewFile: false
      };
    }
    // 生成新的构件的基本信息
    const buildInfo: CmpBuildInfo = {
      code: frmMeta.code + '_frm_' + code,
      name: (frmMeta.name || frmMeta.code) + '_frm_' + name,
      namespace: frmMeta.nameSpace || '',
      bizObjId: frmMeta.bizobjectID || '',
      relativePath: frmMeta.relativePath,
      extendProperty: { IsCommon: false, FormCode: frmMeta.code },
      tsFilePathName: ''
    };
    buildInfo.tsFilePathName = '/' + buildInfo.relativePath + '/' + buildInfo.code + '.ts';
    const webCmpFileName = buildInfo.code + '.webcmp';
    const webCmdFileName = buildInfo.code + '.webcmd';
    // 判断构件文件是否已经存在
    const notHasWebCmp$ = this.metadataService.validateRepeatName(frmMeta.relativePath, webCmpFileName)
      .then(data => data)
      .catch(() => undefined);
    const notHasWebCmd$ = this.metadataService.validateRepeatName(frmMeta.relativePath, webCmdFileName)
      .then(data => data)
      .catch(() => undefined);
    const [notHasWebCmp, notHasWebCmd] = await Promise.all([notHasWebCmp$, notHasWebCmd$]);
    if (notHasWebCmp === undefined || notHasWebCmd === undefined) {
      return {
        hasError: true,
        errorTip: '获取文件状态信息失败，请刷新后重试',
        tsFilePath: '', hasNewFile: false
      };
    }
    if (!notHasWebCmp && !notHasWebCmd) {
      return { tsFilePath: buildInfo.tsFilePathName, hasNewFile: false };
    }
    const createWebCmpError = notHasWebCmp && (await this.createWebCmp(buildInfo));
    if (createWebCmpError) {
      return {
        hasError: true,
        errorTip: createWebCmpError,
        tsFilePath: '', hasNewFile: true
      };
    }
    const createWebCmdError = notHasWebCmd && (await this.createWebCmd(buildInfo));
    if (createWebCmdError) {
      return {
        hasError: true,
        errorTip: createWebCmdError,
        tsFilePath: '', hasNewFile: true
      };
    }
    return { tsFilePath: buildInfo.tsFilePathName, hasNewFile: true };
  }

  /**
   * 新建一个前端服务构件
   * @param buildInfo 构件基本信息
   * @returns 错误信息，为空则表示创建成功
   */
  async createWebCmp(buildInfo: CmpBuildInfo): Promise<string> {
    const fileName = buildInfo.code + '.webcmp';
    const metadataDto = new MetadataDto(
      '', buildInfo.namespace, buildInfo.code, buildInfo.name, fileName, 'WebComponent',
      buildInfo.bizObjId, buildInfo.relativePath, JSON.stringify(buildInfo.extendProperty), '', false
    );
    const initedDto = await this.metadataService.initializeMetadataEntity(metadataDto).then((data) => data).catch(() => null);
    if (!initedDto) {
      return '构件信息初始化失败，请刷新后重试';
    }
    initedDto.fileName = metadataDto.fileName;
    const webComponent = JSON.parse(initedDto.content);
    webComponent.Source = buildInfo.relativePath + '/' + buildInfo.code + '.ts';
    initedDto.content = JSON.stringify(webComponent);
    // 发送请求，创建元数据文件
    const createResult = await this.metadataService.createMetadata(initedDto).then((data) => data).catch(() => null);
    if (!createResult || !createResult.ok) {
      return '构件元数据文件创建失败，请刷新后重试';
    }
    // 创建服务构件附带的ts文件
    const tsUrl = '/api/dev/main/v1.0/tsfile/create?path=' + buildInfo.tsFilePathName + '&formType=Vue';

    try {
      await axios.post(tsUrl, {});
      return '';
    } catch (error) {
      console.error(error);
      return 'ts文件创建失败，请刷新后重试';
    }
  }

  /**
   * 新建一个前端命令构件
   * @param buildInfo 构件基本信息
   * @returns 错误信息，为空则表示创建成功
   */
  async createWebCmd(buildInfo: CmpBuildInfo): Promise<string> {
    const fileName = buildInfo.code + '.webcmd';
    const metadataDto = new MetadataDto(
      '', buildInfo.namespace, buildInfo.code, buildInfo.name, fileName, 'WebCommand',
      buildInfo.bizObjId, buildInfo.relativePath, JSON.stringify(buildInfo.extendProperty), '', false
    );
    const initedDto = await this.metadataService.initializeMetadataEntity(metadataDto).then((data) => data).catch(() => null);
    if (!initedDto) {
      return '构件信息初始化失败，请刷新后重试';
    }
    initedDto.fileName = metadataDto.fileName;
    const createResult = await this.metadataService.createMetadata(initedDto).then((data) => data).catch(() => null);
    if (!createResult || !createResult.ok) {
      return '构件元数据文件创建失败，请刷新后重试';
    }
    return '';
  }

  /**
   * 运行时定制：新增一个前端控制器构件
   * @remarks 如果已经存在部分文件则进行补全
   * @param code 构件编号
   * @param name 构件名称
   * @param frmPath 表单元数据路径
   */
  async doAddRtcNewCmp(code: string, name: string): Promise<CmpBuildResult> {
    // 生成新的构件的基本信息
    const { rtcCode: rtcFormCode, rtcName: rtcFormName, relativePath, nameSpace, bizobjectID } = this.formBasicInfo;
    const suffix = '_ext_frm_';
    const buildInfo: CmpBuildInfo = {
      code: rtcFormCode + suffix + code,
      name: (rtcFormName || rtcFormCode) + suffix + name,
      namespace: nameSpace || '',
      bizObjId: bizobjectID || '',
      relativePath,
      extendProperty: { IsCommon: false, FormCode: rtcFormCode },
      tsFilePathName: ''
    };
    buildInfo.tsFilePathName = '/' + buildInfo.relativePath + '/' + buildInfo.code + '.ts';
    const webCmpFileName = buildInfo.code + '.webcmp';
    const webCmdFileName = buildInfo.code + '.webcmd';

    const componentData = await this.metadataService.queryRelatedComponentMetadata(this.formBasicInfo.rtcId);

    const webCmp = componentData?.find(metadata => metadata.fileName === webCmpFileName);
    const webCmd = componentData?.find(metadata => metadata.fileName === webCmdFileName);

    let webComponentId = webCmp ? webCmp.id : '';
    let webCommandId = webCmd ? webCmd.id : '';
    let hasNewFile = false;

    // 创建web构件
    if (!webCmp) {
      const result: any = await this.createRtcWebCmp(buildInfo, webCmpFileName);
      if (result?.error) {
        return {
          hasError: true,
          errorTip: result.error,
          tsFilePath: '',
          hasNewFile: true
        };
      } else {
        webComponentId = result.metadataId;
        hasNewFile = true;
      }
    }
    // 创建命令构件
    if (!webCmd) {
      const result: any = await this.createRtcWebCmd(buildInfo, webCmdFileName);
      if (result?.error) {
        return {
          hasError: true,
          errorTip: result.error,
          tsFilePath: '',
          hasNewFile: true
        };
      } else {
        webCommandId = result.metadataId;
        hasNewFile = true;
      }
    }

    return {
      tsFilePath: buildInfo.tsFilePathName,
      hasNewFile,
      webCommandId,
      webComponentId
    };
  }
  /**
   * 运行时定制：新增WebComponent构件
   */
  async createRtcWebCmp(buildInfo: any, fileName: string) {
    const metadatadto = new MetadataDto(
      '', buildInfo.namespace, buildInfo.code, buildInfo.name, fileName, 'WebComponent',
      buildInfo.bizObjId, '', JSON.stringify(buildInfo.extendProperty), '', false, this.formBasicInfo.nameLanguage
    );
    const errorMessage = '构件元数据文件创建失败，请刷新后重试';
    let metadataId = '';

    return this.metadataService.initializeRtcMetadataEntity(metadatadto, this.formBasicInfo.rtcId || '').then((data) => {
      data.fileName = metadatadto.fileName;
      metadataId = data.id;
      return this.metadataService.createRtcMetadata(data);
    }).then(result => {
      if (!result || !result.ok) {
        return { error: errorMessage };
      } else {
        return { metadataId };
      }
    }).catch(error => {
      return { error: error?.response?.data?.Message || errorMessage };
    });

  }
  /**
   * 运行时定制：新增WebCommand构件
   */
  async createRtcWebCmd(buildInfo: any, fileName: string) {
    const metadatadto = new MetadataDto(
      '', buildInfo.namespace, buildInfo.code, buildInfo.name, fileName, 'WebCommand',
      buildInfo.bizObjId, '', JSON.stringify(buildInfo.extendProperty), '', false, this.formBasicInfo.nameLanguage
    );
    const errorMessage = '构件元数据文件创建失败，请刷新后重试';

    let metadataId = '';
    return this.metadataService.initializeRtcMetadataEntity(metadatadto, this.formBasicInfo.rtcId || '').then((data) => {
      data.fileName = metadatadto.fileName;
      metadataId = data.id;
      return this.metadataService.createRtcMetadata(data);
    }).then(result => {
      if (!result || !result.ok) {
        return { error: errorMessage };
      } else {
        return { metadataId };
      }
    }).catch(error => {
      return { error: error?.response?.data?.Message || errorMessage };
    });

  }
}

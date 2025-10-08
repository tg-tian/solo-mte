import { cloneDeep } from 'lodash-es';
import { WebComponentMetadata } from '../class/web-component';
import { WebCommand, WebCommandMetadata } from '../class/web-command';
import { WebcmpValidateUtil } from '../utils/webcmp.validate.util';
import { IClass } from '../../type/classes.interface';
import { WebcmdValidateUtil } from '../utils/webcmd.validate.util';
import { MethodReferCommandItem } from '../class/method-refer';
import { ResolvedPath } from '../../type/resolved-path';
import { FileService } from '../class/file.service';
import { WebcmdMapperService } from './webcmd-mapper.service';
import { MetadataService } from '../class/metadata.service';
import { WebcmpMapperService } from './webcmp-mapper.service';
/**
 * 数据源
 * @remarks 负责向后端获取并组织数据
 */

export class ControllerDataSource {
  private cmpLocaleData = {
    empty: '禁止为空',
    cmpCode: '构件编号',
    cmpName: '构件名称',
    methodCode: '方法编号',
    methodCodeN: '（第param个）方法的编号',
    methodNameN: '（第param个）方法的名称',
    methodParam: '方法[param]的参数编号',
    methodParamName: '方法[param]的参数名称',
    methodListCode: '方法[param]的编排项的编号',
    methodListName: '方法[param]的编排项的名称',
    methodListParamcode: '方法[param]的编排项[param2]的参数编号',
    methodListParamName: '方法[param]的编排项[param2]的参数名称',
    repeatInfo: '类名（param）重复，请修改后再保存',
    repeatInfo2: '方法名（param）重复，请修改后再保存',
  };

  /** Web构件元数据 */
  public webcmp: WebComponentMetadata | null = null;  // 尚未加载或加载中为undefined，加载失败为null
  /** 命令构件元数据 */
  public webcmd: WebCommandMetadata | null = null;
  /** 是否存在关联的ts文件 */
  public hasTsFile: boolean = false;

  /** Web构件元数据传输对象 */
  public webcmpDto: any;
  /** 命令构件元数据传输对象 */
  public webcmdDto: any;

  private path: ResolvedPath | null = null;

  /**
   * 服务构件元数据是否只读
   * @remarks 当构件关联了ts代码文件时为只读状态，否则非只读状态
   */
  get webcmpReadonly(): boolean {
    return !!(this.webcmp && this.hasTsFile);
  }

  private _ready: boolean;
  /** 元数据是否加载完毕 */
  get ready(): boolean {
    return this._ready;
  }

  private _fileNotExist: boolean = false;
  /** 元数据获取失败，疑似文件已被删除 */
  get fileNotExist(): boolean {
    return this._fileNotExist;
  }

  /** 是否完整构件 */
  get isCompleteCmp(): boolean {
    return !!(this.webcmd && this.webcmp);
  }
  /** 是否仅控制器构件 */
  get isControllerCmp(): boolean {
    return !!(this.webcmd && !this.webcmp);
  }
  /** 是否仅服务构件 */
  get isServiceCmp(): boolean {
    return !!(!this.webcmd && this.webcmp);
  }
  /**
   * 是否缺少ts文件
   * @remarks 如果服务构件没有ts文件，则当用户点击“查看代码”时应该询问用户是否自动生成ts文件
   */
  get notHaveTs(): boolean {
    return !!(this.webcmp && !this.hasTsFile);
  }
  private metadataService;
  private webcmdMapperService;
  private webcmpMapperService;
  private fileService;
  constructor() {

    this._ready = false;
    this.metadataService = new MetadataService(),
      this.fileService = new FileService();
    this.webcmdMapperService = new WebcmdMapperService();
    this.webcmpMapperService = new WebcmpMapperService();
  }

  /**
   * 获取解析后的路径信息
   * @returns 路径信息
   */
  public getResolvedPath(): ResolvedPath | null {
    return cloneDeep(this.path);
  }

  /**
   * 初始化数据源
   * @todo 加载元数据文件时同时加载三个文件
   * @param fullPath - 构件元数据、命令元数据或ts文件的路径
   */
  public initDataSource(fullPath: string): Promise<any> {
    this._ready = false;
    this.path = this.resolveMetadataPath(fullPath);
    // 分别尝试加载webcmd、webcmp、ts
    return new Promise((resolve, reject) => {
      this.fileService.isFileExist(this.path?.filePath || '', this.path?.fileNameWithoutSuffix + '.webcmd')
        .then((webcmdExist) => {
          if (webcmdExist) {
            return this.loadWebcmd(this.path?.filePath || '', this.path?.fileNameWithoutSuffix + '.webcmd');
          } else {
            return Promise.resolve(null);
          }
        })
        .then(() => {
          return this.fileService.isFileExist(this.path?.filePath || '', this.path?.fileNameWithoutSuffix + '.webcmp');
        })
        .then((webcmpExist) => {
          if (webcmpExist) {
            return this.loadWebcmp(this.path?.filePath || '', this.path?.fileNameWithoutSuffix + '.webcmp');
          } else {
            return Promise.resolve(null);
          }
        })
        .then(() => {
          return this.fileService.isFileExist(this.path?.filePath || '', this.path?.fileNameWithoutSuffix + '.ts');
        })
        .then((tsExist) => {
          this.hasTsFile = tsExist;
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    }).then(() => {
      if (!this.webcmd) {
        this.webcmd = null;
      }
      if (!this.webcmp) {
        this.webcmp = null;
      }
      this.initMetadata();
      this._ready = true;
      this._fileNotExist = !this.webcmd && !this.webcmp;
    });
  }
  tSFileExist() {
    return this.hasTsFile;
  }
  /**
   * 初始化构件元数据
   * @remarks
   * 当元数据获取完成后执行，初始化一些自定义字段
   */
  private initMetadata(): void {
    // 初始化所有命令的isCodeMethod字段（对于同一个ts方法，只有一个命令作为其代码方法）
    if (this.webcmd && this.webcmp && this.hasTsFile) {
      const cmpMap = new Map<string, WebCommand[]>();
      for (const command of this.webcmd.Commands) {
        if (command.isSimpleMethod(this.webcmp)) {
          const methodCode = (command.Items[0] as MethodReferCommandItem).MethodCode;
          const cmdArr = cmpMap.get(methodCode) || [];
          cmdArr.push(command);
          cmpMap.set(methodCode, cmdArr);
        }
      }
      // 如果存在多个命令，则选择编号相同的作为“代码方法”命令
      for (const entry of cmpMap.entries()) {
        const cmds = entry[1];
        if (cmds.length === 1) {
          cmds[0].isCodeMethod = true;
        } else if (cmds.length > 1) {
          const sameCodeCmd = cmds.find(cmd => cmd.Code === entry[0]);
          if (sameCodeCmd) {
            sameCodeCmd.isCodeMethod = true;  // 选取与ts方法拥有相同编号的命令作为代码方法
          } else {
            cmds[0].isCodeMethod = true;  // 否则选取第一个为代码方法
          }
        }
      }
    }
  }

  /**
   * 解析外部传入的路径字符串
   * @param fullPath - 路径
   * @returns 解析结果
   */
  public resolveMetadataPath(fullPath: string): ResolvedPath {
    const NoPathErrorTip = "找不到构件元数据路径";
    const WrongPathErrorTip = "构件元数据路径格式错误";
    if (!fullPath) {
      throw new Error(NoPathErrorTip);
    }
    const lastBarIdx = fullPath.lastIndexOf('/');
    if (lastBarIdx < 0) {
      throw new Error(WrongPathErrorTip);
    }
    const fileName = fullPath.substring(lastBarIdx + 1);
    // fullPath
    const filePath = fullPath.substring(fullPath.startsWith('/') ? 1 : 0, lastBarIdx);
    const lastDotIdx = fileName.lastIndexOf('.');
    if (lastDotIdx < 0) {
      throw new Error(WrongPathErrorTip);
    }
    const suffix = fileName.substring(lastDotIdx + 1);
    const fileNameWithoutSuffix = fileName.substring(0, lastDotIdx);
    if (suffix !== 'webcmd' && suffix !== 'webcmp' && suffix !== 'ts' || !fileNameWithoutSuffix) {
      throw new Error(WrongPathErrorTip);
    }
    return {
      filePath,
      fileName,
      fileNameWithoutSuffix,
      suffix
    };
  }

  /** 加载命令构件元数据 */
  private loadWebcmd(path: string, name: string): Promise<null> {
    return new Promise((resolve, reject) => {
      this.metadataService.loadMetadata(path, name)
        .then((dto) => {
          this.webcmdDto = dto;
          const metadataJObject = JSON.parse(dto.content);
          this.webcmd = new WebCommandMetadata();
          this.webcmd.input(metadataJObject);
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
  /** 加载Web构件元数据 */
  private loadWebcmp(path: string, name: string): Promise<null> {
    return new Promise((resolve, reject) => {
      this.metadataService.loadMetadata(path, name)
        .then((dto: any) => {
          this.webcmpDto = dto;
          const metadataJObject = JSON.parse(dto.content);
          this.webcmp = new WebComponentMetadata();
          this.webcmp.input(metadataJObject);
          this.webcmp.relativePath = dto.relativePath;
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * 保存Web构件元数据
   * @returns 错误信息
   */
  public saveWebcmp(): Promise<string> {
    if (!this.webcmp) {
      return new Promise((resolve, reject) => {
        resolve('');
      });
    }
    const errors = WebcmpValidateUtil.validate(this.webcmp, this.cmpLocaleData);
    if (errors.length > 0) {
      return new Promise((resolve, reject) => {
        resolve(errors[0].toString());
      });
    }
    return this.metadataService.saveWebcmp(this.webcmp, this.webcmpDto);
  }

  /**
   * 保存命令构件元数据
   * @returns 错误信息
   */
  public saveWebcmd(): Promise<string> {
    if (!this.webcmd) {
      return new Promise((resolve, reject) => {
        resolve('');
      });
    }
    const errors = WebcmdValidateUtil.validate(this.webcmd, this.cmpLocaleData);
    if (errors.length > 0) {
      return new Promise((resolve, reject) => {
        resolve(errors[0].toString());
      });
    }
    return this.metadataService.saveWebcmd(this.webcmd, this.webcmdDto);
  }

  /**
   * 进行元数据合法性校验
   * @returns 错误提示信息
   */
  private validateAll(): string {
    // 如果存在webcmd元数据，先检查其合法性，如果不合法则不执行保存
    if (this.webcmd) {
      WebcmdValidateUtil.setDefaultValue(this.webcmd);
      const webcmdFormatErrors = WebcmdValidateUtil.validate(this.webcmd, this.cmpLocaleData);
      if (webcmdFormatErrors.length > 0) {
        return `${'请确保元数据格式正确'}（${webcmdFormatErrors[0].toString()}）`;
      }
    }
    this.webcmp && WebcmpValidateUtil.setDefaultValue(this.webcmp);
    // 如果存在webcmp而不存在ts，则需要对webcmp的合法性进行检查
    if (this.webcmp && !this.hasTsFile) {
      const webcmpErrors = WebcmpValidateUtil.validate(this.webcmp, this.cmpLocaleData);
      if (webcmpErrors.length > 0) {
        return `${'请确保元数据格式正确'}（${webcmpErrors[0].toString()}）`;
      }
    }
    return '';
  }

  /**
   * 根据ts文件重新生成并发布所有元数据
   * @param tscode ts代码
   * @param classes ts代码解析结果
   * @returns 错误信息
   */
  public saveTsAndRepublishAll(tscode?: string, classes?: IClass[]): Promise<string> {
    // 考虑元数据文件可能被用户手动删除
    if (this.fileNotExist) {
      return new Promise((resolve, reject) => {
        resolve('保存失败，元数据文件可能已经被删除');
      });
    }
    const classInfoErrorTip = WebcmpValidateUtil.validateClassStructure(classes || [], this.cmpLocaleData);
    if (classInfoErrorTip) {
      return new Promise((resolve, reject) => {
        resolve(classInfoErrorTip);
      });
    }
    const errorTip = this.validateAll();
    if (errorTip) {
      return new Promise((resolve, reject) => {
        resolve(errorTip);
      });
    }
    // 锁定webcmp和webcmd，防止保存过程中被用户修改
    const fixedWebcmd = cloneDeep(this.webcmd) as WebCommandMetadata;
    const fixedWebcmp = cloneDeep(this.webcmp) as WebComponentMetadata;
    // 如果存在ts，则依次生成新的webcmp和webcmd
    let newWebcmp = fixedWebcmp;
    let newWebcmd = fixedWebcmd;
    let newWebcmpDto = this.webcmpDto;
    if (this.hasTsFile) {
      // 存在ts则一定存在webcmp，生成新的webcmp
      const mapWebcmpResult = this.webcmpMapperService.mapTsCode2Webcmp(classes, fixedWebcmp);
      if (typeof mapWebcmpResult === 'string') {
        return new Promise((resolve, reject) => {
          resolve(mapWebcmpResult);
        });
      }
      newWebcmp = mapWebcmpResult as WebComponentMetadata;
      newWebcmpDto = this.webcmpMapperService.generateUpdatedWebcmpDto(tscode, this.webcmpDto);
      // 如果存在webcmd，生成新的webcmd
      if (this.webcmd) {
        newWebcmd = this.webcmdMapperService.mapWebcmp2Webcmd(newWebcmp, fixedWebcmd, this.webcmpDto);
      }
    }
    // 依次保存ts、webcmp、webcmd
    return new Promise((resolve, reject) => {
      const saveTsFilePromise = this.hasTsFile ? this.fileService.saveFile(this.path?.filePath + '/' + this.path?.fileNameWithoutSuffix + '.ts',tscode || '') : Promise.resolve(true);

      saveTsFilePromise
        .then((success) => {
          if (!success) {
            reject("保存ts文件失败，请检查登录是否过期");
          }
          if (this.webcmp) {
            return this.metadataService.saveWebcmp(newWebcmp, newWebcmpDto);
          }
          return Promise.resolve(null);
        })
        .then((saveWebcmpError) => {
          if (saveWebcmpError) {
            reject(saveWebcmpError);
          }
          if (this.webcmd) {
            return this.metadataService.saveWebcmd(newWebcmd, this.webcmdDto);
          }
          return Promise.resolve('');
        })
        .then((saveWebcmdError) => {
          if (saveWebcmdError) {
            reject(saveWebcmdError);
          }
          this.webcmp = newWebcmp;
          this.webcmpDto = newWebcmpDto;
          this.webcmd = newWebcmd;

          resolve('');
        })
        .catch((err) => {
          if (typeof err === 'string') {
            reject(err);
          } else {
            reject("保存操作执行失败");
          }
        });
    });
  }

  /**
   * 更改元数据对象的引用以触发变更检测
   */
  public triggerChangeDetection(): void {
    if (this.webcmd) {
      this.webcmd = this.webcmd.shallowCopy();
    }
    if (this.webcmp) {
      this.webcmp = this.webcmp.shallowCopy();
    }
  }
}

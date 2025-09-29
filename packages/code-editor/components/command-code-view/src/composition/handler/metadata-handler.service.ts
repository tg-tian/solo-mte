import { IdService } from "../class/id.service";
import { MetadataService } from "../class/metadata.service";
import { WebComponentMetadata } from "../class/web-component";
import { WebCommandMetadata } from '../class/web-command';

export class MetadataHandlerService {
  localeData: any = {};
  idService: IdService;
  metadataService: MetadataService;

  constructor() {
    this.idService = new IdService();
    this.metadataService = new MetadataService();
  }

  /**
   * 生成一个32位的UUID
   * @returns 32位标识字符串
   */
  public uuid(): string {
    return this.idService.generate();
  }

  /**
   * 加载元数据
   * @remarks 需要先验证元数据是否存在，如果路径无效则后端返回500错误
   * @param path - 路径
   * @param name - 名称
   * @returns 元数据传输对象
   */
  public loadMetadata(path: string, name: string): Promise<any> {
    return this.metadataService.loadMetadata(name, path);
  }

  /**
   * 保存Web构件元数据
   * @remarks 该方法具有副作用：将按照Web构件元数据更新形参中的传输对象
   * @param cmp - Web构件元数据
   * @param dto - 元数据传输对象
   * @returns 错误信息
   */
  public saveWebcmp(cmp: WebComponentMetadata, dto: any): Promise<string> {
    const contentString = JSON.stringify(
      cmp.output()
    );
    dto.content = contentString;
    dto.code = cmp.Code;  // 在旧版实现中，Web构件的编号是允许修改的
    !!cmp.name && (dto.name = cmp.name);
    return new Promise((resolve, reject) => {
      this.saveMetadata(dto)
        .then((ok) => {
          if (ok) {
            resolve('');
          } else {
            resolve('Web构件元数据保存失败');
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * 保存命令构件元数据
   * @remarks 该方法具有副作用：将按照命令构件元数据更新形参中的传输对象
   * @param cmd - 命令构件元数据
   * @param dto - 元数据传输对象
   * @returns 错误信息
   */
  public saveWebcmd(cmd: WebCommandMetadata, dto: any): Promise<string> {
    const contentString = JSON.stringify(
      cmd.output()
    );
    dto.content = contentString;
    dto.code = cmd.Code;  // 在旧版实现中，命令构件的编号是不可修改的
    !!cmd.Name && (dto.name = cmd.Name);
    return new Promise((resolve, reject) => {
      this.saveMetadata(dto)
        .then((ok) => {
          if (ok) {
            resolve('');
          } else {
            resolve('命令构件元数据保存失败');
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * 保存元数据
   * @param dto - 元数据传输对象
   * @returns 是否成功
   */
  private saveMetadata(dto: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.metadataService.saveMetadata(dto)
        .then(() => {
          resolve(true);
        })
        .catch(() => {
          resolve(false);
        });
    });
  }

}

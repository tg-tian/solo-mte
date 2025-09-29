import { MetadataDto } from "src/components/types";
import { MetadataType } from "../type/metadata";
import { MetadataService } from "../../../../composition/metadata.service";
import axios from "axios";

const SERVER_IP: string = '';
const API_METADATAS = "/api/dev/main/v1.0/metadatas";


export class NavDataUtilService {
  private metadataService;
  constructor() {
    this.metadataService = new MetadataService();
  }

  public getProjectPathFromFrmPath(frmPath: string): string {
    if (!frmPath) {
      return '';
    }
    frmPath = frmPath.replace(/\\/g, '/');
    const lastIdx = this.lastIndexOf(frmPath, '/', 3);
    return lastIdx > 0 ? frmPath.substring(0, lastIdx) : '';
  }

  /**
   * 找到倒数第n个子串
   * @param str 待搜索串
   * @param char 子串
   * @param index 倒数第几个
   */
  public lastIndexOf(str: string, searchString: string, index: number): number {
    if (!str || !searchString || index < 1) {
      return -1;
    }
    let position = str.length - 1;
    let idx = -1;
    for (; index > 0; index--) {
      idx = str.lastIndexOf(searchString, position);
      if (idx >= 0) {
        position = idx - 1;
      } else {
        return -1;
      }
    }
    return idx;
  }

  /**
   * 获取项目下的元数据描述集合
   * @param path 项目路径
   */
  public getProjectMetas(path: string): Promise<MetadataDto[]> {
    if (!path) {
      return new Promise((resolve, reject) => {
        resolve([]);
      });
    }
    let url = SERVER_IP + API_METADATAS + "/filter";
    url += `?path=${path}`;
    return axios.get(url).then(res => res.data);
  }

  /**
   * 获取元数据
   * @param path 元数据路径
   * @returns 元数据
   */
  public loadMetadata(path: string): Promise<MetadataDto> {
    const uri = path.replace(/\\/g, '/');
    const fileName = uri.substring(uri.lastIndexOf('/') + 1);
    const filePath = uri.substring(uri.startsWith('/') ? 1 : 0, uri.lastIndexOf('/'));
    return this.metadataService.loadMetadata(fileName, filePath);
  }

  /**
   * 通过文件名称匹配元数据
   * @param path 元数据路径
   * @returns 元数据描述
   */
  public findMetaByFilename(path: string, metas: MetadataDto[]): MetadataDto | null {
    path = path.replace(/\\/g, '/');
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    for (const meta of metas) {
      if (meta.fileName === fileName) {
        return meta;
      }
    }
    return null;
  }

  /**
   * 根据表单编号和元数据类型过滤元数据
   * @param metaArr 元数据数组
   * @param frmCode 表单编号
   * @param type 元数据类型
   */
  public filterMetadataByFrmCodeAndType(metaArr: MetadataDto[], frmCode: string, type: MetadataType, needFilter = true): MetadataDto[] {
    const result: MetadataDto[] = [];
    for (const meta of metaArr) {
      if (meta.type === type) {
        if (needFilter) {
          const extendProperty = meta.extendProperty && JSON.parse(meta.extendProperty);
          if (extendProperty && extendProperty['FormCode']) {
            // 优先通过扩展属性判断
            if (extendProperty['FormCode'] === frmCode) {
              result.push(meta);
            }
          } else {
            // 如果不存在相关属性则通过编号前缀判断
            if (meta.code.startsWith(`${frmCode}_frm_`)) {
              result.push(meta);
            }
          }
        } else {
          result.push(meta);
        }
      }
    }
    return result;
  }

  /**
   * 获取去除表单编号前缀的元数据名称
   * @param meta 元数据（命令构件、Web构件等）
   * @param frmCode 表单编号
   * @returns 去除表单编号前缀的元数据名称
   */
  public getMetadataNameWithoutFrmCode(meta: MetadataDto, frmCode: string): string {
    const prefixToDelete = `${frmCode}_frm_`;
    return meta.name && meta.name.startsWith(prefixToDelete) ? meta.name.substring(prefixToDelete.length) : meta.name;
  }

  /**
   * 获取元数据的路径
   * @param meta 元数据信息
   * @param projectBasePath 项目基础路径
   * @returns 元数据的路径
   */
  public getRelativePath(meta: MetadataDto, projectBasePath: string, formRelativePath: string): string {
    let absolutePath = meta.relativePath || formRelativePath;
    if (!absolutePath.startsWith('/')) {
      absolutePath = `/${absolutePath}`;
    }
    const pathArr = absolutePath.split(projectBasePath).filter((str: string) => !!str);
    if (pathArr.length > 0) {
      return projectBasePath + pathArr.pop() + "/" + meta.fileName;
    } else {
      return absolutePath + "/" + meta.fileName;
    }
  }

}

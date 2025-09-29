
import axios from 'axios';
import { MetadataService } from './metadata.service';


const API_TS_FILE = '/api/dev/main/v1.0/tsfile';
const API_ROOT_PATH = '/api/dev/main/v1.0/project/rootpath';

export class FileService {
  private metadataService;
  constructor() {
    this.metadataService = new MetadataService();
  }

  /**
   * 文件是否存在
   * @param path 文件路径
   * @returns 是否存在
   */
  public isFileExist(path: string, name: string = ''): Promise<boolean> {
    if (!path) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    let fileName = name;
    let filePath = path;
    if (!name) {
      const lastBarIdx = path.lastIndexOf('/');
      if (lastBarIdx < 0) {
        return new Promise((resolve, reject) => {
          resolve(false);
        });
      }
      fileName = path.substring(lastBarIdx + 1);
      filePath = path.substring(path.startsWith('/') ? 1 : 0, lastBarIdx);
    }
    return this.metadataService.validateRepeatName(filePath, fileName);
  }

  /**
   * 获取文件内容
   * @param path 文件路径
   * @returns 文件内容
   */
  public getFile(path: string): Promise<string> {
    const url = API_TS_FILE + '/get?path=' + path;
    return axios.get(url).then(res => {
      return res.data ? res.data.content : '';
    });
  }

  /**
   * 保存文件
   * @param path 文件路径
   * @param content 文件内容
   * @returns 是否成功
   */
  public saveFile(path: string, content: string): Promise<boolean> {
    const url = API_TS_FILE + '/save?path=' + path;
    return axios.post(url, { content }).then(res => {
      return true;
    }).catch(error => {
      return false;
    });
  }

  /**
   * 获取项目根目录路径
   * @returns 项目根路径，失败则返回null
   */
  public getRootPath(): Promise<string> {
    const url = API_ROOT_PATH;
    return axios.get(url, { responseType: 'text' }).then(res => {
      return res.data;
    }).catch(error => {
      return '';
    });
  }

  /**
   * 保存ts文件
   * @param content - 文件内容
   * @param fullPath - 路径
   * @returns 是否成功
   */
  saveTsFile(content: string, fullPath: string): Promise<boolean> {
    const url = API_TS_FILE + '/save?path=' + fullPath;
    return axios.post(url, { content })
      .then(() => {
        return Promise.resolve(true);
      })
      .catch(() => {
        return Promise.resolve(false);
      });
  }
  /**
 * 新建ts文件
 * @remarks 如果不指定文件内容，新建ts文件的内容不会是空的，后端会设置默认的内容
 * @param content - 文件内容
 * @param fullPath - 路径
 * @returns 是否成功
 */
  createTsFile(content: string, fullPath: string): Promise<boolean> {
    const url = API_TS_FILE + '/create?path=' + fullPath+'&formType=Vue';
    return axios.post(url, {})
      .then(() => {
        if (typeof content === 'string') {
          return this.saveTsFile(content, fullPath);
        }
        return Promise.resolve(true);
      })
      .catch(() => {
        return Promise.resolve(false);
      });
  }
}

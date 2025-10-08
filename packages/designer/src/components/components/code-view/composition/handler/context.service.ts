
import { FileItem } from "../type/file-item";
import { RelevantFileService } from "./relevant-file.service";
import { ref } from 'vue';

/**
 * 代码编辑器上下文服务
 * @remarks 保存了主要的状态数据，供组件之间交互同步
 */

export class ContextService {

  /**
   * 入口文件路径，由外层组件传递进来
   * @remarks
   * 该路径是整个代码视图的起点，一旦该路径变动，整个代码视图都要刷新
   * 分三种情况：
   * 1. 为空，则表示尚未初始化
   * 2. 为“/”，则表示是整个代码视图
   * 3. 为具体的一个文件路径，则表示是某个元数据关联的代码视图
   */
  public entryFilePath = ref('');

  /**
   * 设置入口文件路径
   * @param path 入口文件路径
   */
  public setEntryFilePath(path: string) {
    // 通知入口文件变更
    this.entryFilePath.value = path;
  }

  /** 已经被打开的文件条目集合 */
  fileItems: FileItem[] = [];

  private _currentFilePath: string = '';
  private relSrv: RelevantFileService;
  constructor() {
    this.relSrv = new RelevantFileService();
  }

  /** 当前正在显示的文件路径 */
  get currentFilePath(): string {
    return this._currentFilePath;
  }
  set currentFilePath(path: string) {
    if (!!path && this.isFileExist(path)) {
      this._currentFilePath = path;
    } else {
      this._currentFilePath = '';
    }
  }

  /** 当前正在显示的文件条目 */
  get currentFileItem(): FileItem | undefined {
    return this.fileItems.find(item => item.curPath === this._currentFilePath);
  }

  /**
   * 根据文件路径获取已经被打开的文件条目
   * @param path 文件路径
   * @returns 文件条目
   */
  public getFileItemByPath(path: string): FileItem | undefined {
    return this.fileItems.find(item => item.relPaths.includes(path));
  }

  /**
   * 判断文件是否已经打开
   * @remarks 文件的关联文件被打开也算这个文件被打开
   * @param path 文件路径
   * @returns 是否已经打开
   */
  public isFileExist(path: string): boolean {
    return this.fileItems.findIndex(item => item.relPaths.includes(path)) >= 0;
  }

  /**
   * 新增文件条目
   * @param path 文件路径
   * @returns 文件条目，如果文件已存在则返回null
   */
  public addFile(path: string): FileItem | null {
    if (!path || this.isFileExist(path)) {
      return null;
    }
    // 注意，关联文件服务返回的关联文件路径数组中的第一个文件为“主文件”
    const relPaths = this.relSrv.getRelevantFilePaths(path);
    const mainPath = relPaths ? relPaths[0] : '';
    const curPath = path;
    const newFileItem = new FileItem(mainPath, this.relSrv.getRelevantFilePaths(path) || [], curPath);
    this.fileItems.push(newFileItem);
    return newFileItem;
  }

  /**
   * 新增并显示文件条目
   * @param path 文件路径
   * @returns 文件条目，如果文件已存在则返回null
   */
  public openFile(path: string): FileItem | null {
    const item = this.addFile(path);
    if (item) {
      this._currentFilePath = path;
      return item;
    }
    return null;
  }

  /**
   * 移除文件条目
   * @param path 文件路径
   * @returns 是否成功
   */
  public removeFile(path: string): boolean {
    const idx = this.fileItems.findIndex(item => item.relPaths.includes(path));
    if (idx >= 0) {
      this.fileItems.splice(idx, 1);
      if (this.fileItems.length === 0) {
        this._currentFilePath = '';
      }
      return true;
    }
    return false;
  }

  /** 是否存在尚未保存的文件 */
  public hasDirtyFile(): boolean {
    for (const item of this.fileItems) {
      if (item.isDirty) {
        return true;
      }
    }
    return false;
  }

}

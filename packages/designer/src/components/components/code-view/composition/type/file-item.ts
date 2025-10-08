/**
 * 文件条目
 * @remarks
 * 描述了一个通过导航树打开的代码文件或者元数据文件（组）
 * 关于关联文件：
 * 关联文件是一组在业务上密切相关的文件，它们一般同时存在，可以通过路径来判断两个文件是否相关
 * 比如：.ts .webcmp .webcmd 就是一组关联文件
 * 一组关联文件共用一个标签页，依次双击打开一组关联文件中的每个文件，只会打开一个标签页
 * mainPath - 主文件：一组关联文件中最主要的文件，框架将会以主文件的路径作为参数打开一个标签页
 * curPath - 当前展示的文件：在导航树中双击一个关联文件，虽然不打开一个新的页签，但是应该在当前已打开的这个页签中进行切换操作
 * relPaths - 关联文件路径集合：该数组记录了这个关联文件组中所有文件的路径
 */
export class FileItem {

  /**
   * 主文件路径
   * @remarks 该字段禁止为空
   */
  mainPath: string;

  /**
   * 当前展示的文件路径
   * @remarks 如果不存在关联文件则该字段与mainPath相等
   */
  curPath: string;

  /**
   * 关联文件的路径集合
   * @remarks 该数组中包含mainPath，所以用该数组判断文件是否打开即可
   */
  relPaths: string[];

  /** 代码文件是否变更 */
  isCodeFileDirty: boolean;
  /** 代码文件关联的设计器的元数据文件是否变更 */
  isDesignerFileDirty: boolean;

  /** 变更是否未保存 */
  get isDirty(): boolean {
    return this.isCodeFileDirty || this.isDesignerFileDirty;
  }

  /** 标题，一般是路径中的文件名 */
  title: string;

  /** 文件图标类，一般根据文件后缀自动生成 */
  icon: string;

  constructor(mainPath: string, relPaths?: string[], curPath?: string, isCodeFileDirty?: boolean, title?: string, icon?: string) {
    this.mainPath = mainPath;
    this.relPaths = relPaths ? relPaths : [];
    this.curPath = curPath || mainPath;
    this.isCodeFileDirty = isCodeFileDirty ? true : false;
    this.isDesignerFileDirty = false;
    this.title = title ? title : FileItem.getTitleFromPath(this.curPath);
    this.icon = icon ? icon : FileItem.getIconFromPath(this.curPath);
  }

  /**
   * 根据文件路径获取文件名
   * @param path 文件路径
   * @returns 文件名
   */
  public static getTitleFromPath(path: string): string {
    if (!path || typeof path !== 'string') {
      return "new file";
    }
    // 截取路径中的文件名
    const idx = path.lastIndexOf('/');  // @todo 关于路径分隔符
    if (idx < 0 || idx + 1 === path.length) {
      return path;
    }
    return path.substring(idx + 1);
  }

  /**
   * 根据文件路径获取文件图标类
   * @param path 文件路径
   * @returns 文件图标类
   */
  public static getIconFromPath(path: string): string {
    if (!path || typeof path !== 'string') {
      return "";
    }
    return "";  // @todo 根据文件后缀生成对应的图标类
  }

}

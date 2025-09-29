/**
 * 中央编辑器区域组件接口
 */
export interface EditorHandler {

  /**
   * 新建并打开文件，如果文件已存在则仅打开文件
   * @param path 文件路径
   * @param param 额外的查询参数，“id”已经被占用
   * @returns 是否成功（如果未配置打开方式则会导致失败）
   */
  open(path: string, param?: { [key: string]: string }): boolean;

  /**
   * 打开已有文件
   * @param path 文件路径
   * @returns 是否存在
   */
  show(path: string): boolean;

  /**
   * 关闭文件
   * @param path 文件路径
   */
  close(path: string): void;

}

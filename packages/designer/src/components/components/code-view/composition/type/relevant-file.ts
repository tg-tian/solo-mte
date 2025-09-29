/**
 * 关联文件组
 * @remarks 记录了一组关联的文件，请查看readme文档
 */
export interface RelevantFileGroup {

  /**
   * 关联文件的后缀集合
   * @remarks
   * 需要带着“.”
   * 该数组中的第一个后缀为该关联文件组中的“主文件”
   * 当用户双击导航树中的一个文件条目，如果该文件条目存在关联文件，则框架以该关联文件组的主文件的url打开一个标签页
   */
  suffixes: string[];

  /** 通过一个文件的路径获取其它关联文件的路径 */
  getRelevantFilePath?(path: string, suffix: string): string;

}

/**
 * 根据文件路径获取其关联文件的路径（缺省时的选择，仅替换文件后缀）
 * @param path 文件路径
 * @param suffix 关联文件后缀
 * @returns 关联文件路径
 */
export const getRelevantFilePath = (path: string, suffix: string): string => {
  if (!path || !suffix) {
    return null;
  }
  // 注意，此处采用第一个“.”符号，获取最长的文件后缀名
  const lastDotIdx = path.indexOf('.');
  if (lastDotIdx > 0) {
    return path.substring(0, lastDotIdx) + suffix;
  }
  return null;
};

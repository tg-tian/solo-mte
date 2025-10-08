import { RelevantFileGroup, getRelevantFilePath } from "../type/relevant-file";
/**
 * 关联文件配置
 * @remarks
 * 注意：
 * 1. 上方配置优先级高于下方，通过配置顺序实现贪婪匹配
 * 2. 此处的文件后缀需要带着前面的“.”符号
 */
const RELEVANT_FILE: RelevantFileGroup[] = [
  { suffixes: [".ts", ".webcmp", ".webcmd"] }
];
export class RelevantFileService {
  /**
   * 获取该文件的关联文件配置
   * @param path 文件路径
   * @returns 关联文件配置
   */
  private getRelevantFileGroup(path: string): RelevantFileGroup | null {
    if (!path) {
      return null;
    }
    // 从上至下依次遍历关联文件配置，如果存在与本文件相同的后缀，则找到关联文件组
    for (const fileGroup of RELEVANT_FILE) {
      for (const suffix of fileGroup.suffixes) {
        if (path.endsWith(suffix)) {
          fileGroup.getRelevantFilePath = fileGroup.getRelevantFilePath ? fileGroup.getRelevantFilePath : getRelevantFilePath;
          return fileGroup;
        }
      }
    }
    return null;
  }

  /**
   * 获取该文件的关联文件的路径集合（返回值包含入参）
   * @param path 文件路径
   * @returns 关联文件路径集合
   */
  public getRelevantFilePaths(path: string): string[] | null {
    const groupConfig = this.getRelevantFileGroup(path);
    if (!groupConfig) {
      return [path];
    }
    const relPaths = [] as any;
    for (const suffix of groupConfig.suffixes) {
      if (!path.endsWith(suffix)) {
        relPaths.push(
          groupConfig.getRelevantFilePath ? groupConfig.getRelevantFilePath(path, suffix) : ''
        );
      } else {
        relPaths.push(path);
      }
    }
    return relPaths;
  }

}

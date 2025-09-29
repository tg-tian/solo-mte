/**
 * 解析后的元数据路径信息
 */
export interface ResolvedPath {
  /** 文件路径 */
  filePath: string,
  /** 文件名称 */
  fileName: string,
  /** 不带后缀的文件名称 */
  fileNameWithoutSuffix: string,
  /** 文件后缀 */
  suffix: 'webcmd' | 'webcmp' | 'ts'
}

/**
 * 输入输出转换接口
 */
export interface MetadataConverter {

  /**
   * 通过元数据传输对象中的内容字符串初始化自身
   * @param metadata - 元数据传输对象
   */
  input: (metadata :any) => void;

  /**
   * 生成元数据传输对象中的内容字符串
   * @returns 元数据的Json Object
   */
  output: () => any;

  /**
   * 对自身进行浅拷贝
   * @remarks 换一个壳以便检测到变更
   */
   shallowCopy?: () => any;
}

/**
 * 代码编辑器初始化配置
 */
export interface MonacoCodeEditorConfig {

  /**
   * monaco资源文件路径
   * @remarks
   * 默认为：/assets/monaco-editor
   * 注：需要带上外层文件夹的名称（与上一个版本的代码编辑器不同）
   */
  baseUrl?: string;

  /**
   * ts代码编辑器相关配置
   */
  tsConfig?: {

    /**
     * 第三方npm包的.d.ts文件所在的文件夹的地址
     * @remarks
     * 默认为：/platform/dev/common/web/intellisense
     * 注：一般情况下不需要修改
     */
    libsUrl?: string;

    /**
     * dts映射文件的名称
     * @remarks
     * 默认为：dts.map.manifest.json
     * 注：一般情况下不需要修改
     */
    dtsMapManifestFileName?: string;

    /**
     * 第三方npm包名到.d.ts文件名的映射
     * @remarks
     * 例如："@farris/ui-footer": "ui-footer"
     * 注：不需要加上“.d.ts”后缀（本字段的优先级高于从dts映射文件中读取的值）
     */
    libsMap?: { [key: string]: string };
  }

}

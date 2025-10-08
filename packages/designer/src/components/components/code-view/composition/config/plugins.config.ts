
/**
 * 文件打开方式
 * @remarks 由文件后缀名到插件名称的映射
 */
export interface IOpenWithConfig {
  [key: string]: string;
}
/**
 * 代码视图全局配置
 */
export interface IdeCodeViewConfig {

  /** 文件后缀名到打开该文件所需的插件地址的映射 */
  fileSuffix2PluginsUrlMap?: IOpenWithConfig;

}

/**
 * 默认的打开方式配置，由文件后缀名到插件名称的映射
 * @remarks 不建议使用该参数（与外部框架的实现耦合），应该始终由外层组件传入自定义的打开方式配置
 */
export const DEFAULT_PLUGINS_URL_MAP = {
  ".ts": "/platform/dev/main/web/webide/plugins-new/code-editor-vue"
};

import { FileService } from "../class/file.service";
import { OpenWithConfig } from "../../type/open-with";
import { OPENWITH_CONFIG_PROVIDERS } from "./providers";

export class OpenWithService {

  private configs: OpenWithConfig[];
  private fileService: FileService;
  constructor() {
    this.fileService = new FileService();
    this.configs = [] as any;
    for (const provideConfig of OPENWITH_CONFIG_PROVIDERS) {
      this.configs.push(provideConfig as OpenWithConfig);
    }
  }

  /**
   * 从url中获取查询参数
   * @param key 键值
   * @returns 参数值
   */
  public getParam(key: string): string {
    const params = new URLSearchParams(window.location.search);
    return decodeURI(params.get(key) || "");
  }

  /**
   * 获取文件打开方式配置
   * @param path 文件路径
   * @returns 打开方式配置
   */
  public getOpenWithConfig(path: string): OpenWithConfig {
    let result;
    // 根据文件后缀匹配打开方式
    for (const config of this.configs) {
      if (typeof config.suffix === 'string') {
        if (path.endsWith(config.suffix)) {
          result = config;
          break;
        }
      } else if (config.suffix && Array.isArray(config.suffix)) {
        for (const item of config.suffix) {
          if (path.endsWith(item)) {
            result = config; break;
          }
        }
      }
    }
    // 填充默认配置
    if (!result) {
      result = this.getDefaultOpenWithConfig(path);
    }
    this.setDefaultConfig(result);
    return result;
  }

  /**
   * 获取默认配置
   * @param path 文件路径
   * @returns 默认配置
   */
  private getDefaultOpenWithConfig(path: string): OpenWithConfig {
    return {
      suffix: this.getFileNameSuffix(path),
      needCodeEditor: true
    };
  }

  /**
   * 获取文件后缀
   * @param path 文件路径
   * @returns 文件后缀
   */
  private getFileNameSuffix(path: string): string {
    const idx = path.indexOf('.');  // 采用最长的后缀
    return idx >= 0 ? path.substring(idx) : "";
  }

  /**
   * 填充默认配置
   * @param config 打开方式配置
   */
  private setDefaultConfig(config: OpenWithConfig): void {
    // 是否显示代码编辑器
    if (config.needCodeEditor !== false) {
      config.needCodeEditor = true;
    }
    // 代码文件获取方法
    if (config.needCodeEditor && !config.getFile) {
      config.getFile = (path: string) => {
        return this.fileService.getFile(path);
      };
    }
    // 代码文件保存方法
    if (config.needCodeEditor && !config.saveFile) {
      config.saveFile = (path: string, content: string) => {
        return this.fileService.saveFile(path, content);
      };
    }
  }

}

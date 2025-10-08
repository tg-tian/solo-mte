import { Ref } from "vue";
import { CommandCodeViewController } from "../composition/controller/command-code-view";
import { IClass } from "./classes.interface";

/**
 * 代码分析结果
 * @remarks 由代码编辑器分析得出，辅助设计器组件完成保存操作
 */
export interface CodeAnalysisResult {
  /** 代码文件内容 */
  content: string;
  /** 如果代码具有类结构，则给出类的描述信息 */
  classes?: IClass[];
  /** 是否包含严重的语法错误 */
  hasFatalError?: boolean;
}

/**
 * 保存结果反馈
 * @remarks
 * 1. 如果为空，则表示保存成功
 * 2. 如果非空，则为失败提示
 */
export type SaveResultNotify = string;

/**
 * 文件打开方式配置
 */
export interface OpenWithConfig {

  /**
   * 文件后缀名
   * @remarks
   * 根据文件后缀名匹配打开方式的配置对象
   * 例如：".viewmodel.ts" ".ts" ".java"
   */
  suffix: string | string[];

  /**
   * 是否需要代码编辑器
   * @remarks 默认为true，如果设置为false则不显示代码编辑器
   */
  needCodeEditor?: boolean;

  /**
   * 获取代码文件，作为代码编辑器的初始内容
   * @remarks 如果为空，则执行默认的获取文件方法
   * @param path 文件路径
   * @returns 文件内容
   */
  getFile?(path: string): Promise<string>;

  /**
   * 保存代码文件
   * @remarks 如果为空，则执行默认的保存文件方法
   * @param path 文件路径
   * @param content 文件内容
   * @returns 是否成功
   */
  saveFile?(path: string, content: string): Promise<boolean>;

  /**
   * 获取代码文件路径
   * @remarks 作为代码编辑器中文件的路径，重点是文件后缀
   * （如果通过.webcmd文件打开，此处应返回.ts结尾的路径，否则无法正常使用typescript的智能感知、语法检查等功能）
   */
  getCodeFilePath?(path: string, controller: CommandCodeViewController): Promise<string>;

  /**
   * 对文件路径进行修正
   * @remarks
   * 允许直接修改文件路径（url上的id），进行一些转换以适配其它程序
   * 如果本方法非空，则将使用本方法的返回值作为文件路径
   * @param path 文件路径
   */
  correctPath?(path: string): string;

  /**
   * 设计器动态组件地址
   * @remarks
   * 如果不为空，则加载对应的设计器组件
   * 该地址指向一个被SystemJs打包为模块的动态组件，是一个js文件，该文件为一个NG模块====后续更改
   * 请给这个模块配置“bootstrap”属性，值即为你想要加载的设计器组件
   */
  designerComponentUrl?: string;

  /**
   * 初始化设计器组件
   * @remarks
   * 通过该回调函数，需要完成以下配置：
   * 1. 将当前文件地址传递给设计器组件
   * 2. 将设计器组件上的切换按钮点击事件绑定到控制器上
   * 3. 将设计器组件上的面包屑导航切换事件绑定到设计器上
   * @param designerComponent 设计器组件
   * @param controller 控制器
   */
  initDesignerComponent?(designerComponent: Ref<any>, controller: CommandCodeViewController): void;

  /**
   * 触发设计器组件的保存行为
   * @remarks 在saveFile执行完成后执行
   * @param designerComponent 设计器组件
   * @param result 代码分析结果
   * @param controller 控制器
   * @param editorSaveSuccess saveFile执行是否成功，如果未启用代码编辑器则默认为true
   */
  save?(designerComponent: Ref<any>, result: CodeAnalysisResult, controller: CommandCodeViewController, editorSaveSuccess: boolean): Promise<SaveResultNotify>;

  /**
   * 切换关联文件
   * @remarks
   * 当一个标签页对应多个文件时，用户切换文件，编辑页面应该做出正确的反应
   * 如果该打开方式对应一个关联文件组，则应该编辑此回调函数，根据关联文件的地址，可以进行设计器/代码编辑器的切换，也可以直接操控动态组件实例
   * @param path 关联文件路径
   * @param designerComponent 设计器组件
   * @param controller 控制器
   */
  switchRelevantFile?(path: string, designerComponent: Ref<any>, controller: CommandCodeViewController): void;

  /**
   * 在编辑面板初始化之前调用
   * @remarks 可以通过this对配置进行修改，比如：判断代码文件是否存在，如果不存在则将needCodeEditor置为false
   * @param controller 控制器
   */
  beforeInit?(controller: CommandCodeViewController): Promise<void>;

  /**
   * 在编辑面板初始化之后调用
   * @remarks 代码编辑器、动态设计器的初始化均已完毕，可以通过控制器对其进行操控
   * @param controller 控制器
   */
  afterInit?(controller: CommandCodeViewController): Promise<void>;

  /**
   * 外层通知的处理函数
   */
  outerNotificationHandlers?: {
    [eventName: string]: (controller: CommandCodeViewController, eventPayload?: any) => Promise<any>
  };
  /**
   * 自定义的全局CSS样式
   * @reamarks 如果非空，将新增一个<style>标签
   */
  customGlobalCssStyle?: string;
}

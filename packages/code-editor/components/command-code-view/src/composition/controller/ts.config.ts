import { Ref, watch } from "vue";
import { CodeAnalysisResult, IClass, IMethod } from "../../../../code-editor/src/composition/editor-core/libs/interfaces/declaration";
import { OpenWithConfig, SaveResultNotify } from "../../type/open-with";
import { FileService } from "../class/file.service";
import { EventEmitter } from "../../../../code-editor/src/composition/editor-core/libs/events";
import { CommandCodeViewController } from "./command-code-view";
import { ProcessEditController } from "./process-edit";

/**
 * 根据webcmp或webcmd的文件路径获取ts文件路径
 * @remarks 仅需要替换文件后缀名
 * @param path 文件路径
 * @returns ts文件路径
 */
function getTsFilePath(path: string): string {
  const idx = path.lastIndexOf('.');
  if (idx > 0) {
    return path.substring(0, idx) + '.ts';
  }
  return path;
}

/** 新增方法的编号前缀 */
export const NEW_METHOD_CODE_PREFIX = 'method';
/** 新增方法的名称前缀 */
export const NEW_METHOD_NAME_PREFIX = '方法';

/** 前端构件设计器组件 */
interface CmpEditorComponent {

  /** 切换按钮点击事件 */
  //  switchMode: EventEmitter;

  /** 跳转到ts并定位代码 */
  jumpToCode: Ref<any>;

  /** 初始化构件设计器 */
  init(fullPath: string): void;

  /** 保存 */
  save(tscode?: string, classes?: any[]): Promise<SaveResultNotify>;

  /** 切换当前编辑内容 */
  setDisplayMode(type: 'webcmp' | 'webcmd'): void;

  /** 注册设计器元数据文件变更事件 */
  onFileChanged(handler: (changed: boolean) => void): void;

  /** 是否显示保存按钮 */
  showSaveButton: boolean;

  /** 保存按钮被点击事件 */
  // saveRequest: EventEmitter;

  // /** 添加webcmd编排方法事件 */
  handleAddNewCmdMethod(eventPayload: any): Promise<any>;
}


/**
 * 触发新增构件编排方法（webcmd方法）
 */
async function handleAddNewCmdMethod(controller: CommandCodeViewController, eventPayload: any): Promise<any> {

  const cmpEditor = controller.designerComponent?.value.instance as CmpEditorComponent;
  if (cmpEditor) {
    return new Promise((resolve, reject) => {
      cmpEditor.handleAddNewCmdMethod(eventPayload).then(result => {
        resolve(result);
      }), error => {
        reject(null);
      };
    });

  }
}


/**
 * 生成一个新方法的序列号
 * @param _class 类结构信息
 * @return 序号字符串（如果前缀本身就不重复，则返回空字符串）
 */
function getNewMethodNumber(_class: IClass, codePrefix: string): string {
  const isRepeat = (_class?.methods || []).findIndex(method => method.code === codePrefix) >= 0;
  if (!isRepeat && NEW_METHOD_CODE_PREFIX !== codePrefix) {
    return "";
  }
  let counter = 2;
  if (NEW_METHOD_CODE_PREFIX === codePrefix) {
    counter = 1;
  }
  while (true) {
    const newCode = codePrefix + counter;
    const repeatMethod = (_class?.methods || []).find(method => method.code === newCode);
    if (!repeatMethod) {
      return counter + "";
    }
    ++counter;
  }
}
/**
 * 处理新增前端ts代码方法片段通知
 */
async function handleAddNewMethod(controller: CommandCodeViewController, eventPayload: any): Promise<any> {
  if (!controller.hasCodeEditor) {
    return null;
  }
  const{codeEditor }= controller.editorPanel;
  const codeAnalysisResult = await codeEditor.value.resolve(controller.path, true);
  const classes = codeAnalysisResult.classes || [];
  let targetClass: IClass | null = null;
  // 找到第一个导出的类
  for (const _class of classes) {
    if (_class.exported) {
      targetClass = _class;
      break;
    }
  }
  if (!targetClass) {
    return null;
  }
  const methodCodePrefix: string = eventPayload && eventPayload.methodCode || NEW_METHOD_CODE_PREFIX;
  const methodNamePrefix: string = eventPayload && eventPayload.methodName || NEW_METHOD_NAME_PREFIX;
  const methodNumber = getNewMethodNumber(targetClass, methodCodePrefix);
  const methodCode = methodCodePrefix + methodNumber;
  const methodName = methodNamePrefix + methodNumber;
  const method: IMethod = {
    code: methodCode,
    accessibility: 'public',
    kind: 'method',
    name: methodName,
    type: 'any',
    returns: '',
    description: '',
    params: []
  };
  await codeEditor.value.addMethod(controller.path, method, targetClass.code);
  // 由于自动的代码结构变更检测具有防抖时延，通过resolve方法手动触发类结构更新
  await codeEditor.value.resolve(controller.path, true);
  await codeEditor.value.position(controller.path, targetClass.code, methodCode);
  return { methodCode, methodName };
}
/**
 * 前端构件设计器
 */
export class TSConfig implements OpenWithConfig {

  needCodeEditor = true;

  suffix = [".ts", ".webcmp", ".webcmd"];

  designerComponentUrl = "./designers/controller-cmp-designer.js";

  customGlobalCssStyle = "html, body { overflow: hidden; }";

  toolButtons = [] as any;
  private fileSrv: FileService;
  constructor() {
    this.fileSrv = new FileService();
    this.toolButtons = [{
      label: "通过VSCode打开",
      title: "通过VSCode打开",
      handleClick: (controller: CommandCodeViewController) => {
        this.handleOpenWithVSCode(controller);
      }
    }];
  }

  getFile(path: string): Promise<string> {
    const tsFilePath = getTsFilePath(path);
    return this.fileSrv.getFile(tsFilePath);
  }

  saveFile(path: string, content: string): Promise<boolean> {
    // 保存代码文件的任务也由构件设计器执行
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  initDesignerComponent(designerComponent: Ref<any>, controller: CommandCodeViewController) {
    // const processController=new ProcessEditController();
    designerComponent.value.init(controller.path);
    // const cmpEditor = componentRef.value as CmpEditorComponent;
    // if (!cmpEditor) {
    //   return;
    // }
    // // 进行构件初始化
    // cmpEditor.init(controller.path);
    // // 在代码视图外打开构件设计器，需要让设计器显示自己的保存按钮
    // // if (!controller.fromCodeView) {
    // //   cmpEditor.showSaveButton = true;
    // //   cmpEditor.saveRequest.subscribe(() => {
    // //     controller.throttledDirectlySave && controller.throttledDirectlySave();
    // //   });
    // // }
    // // // 绑定切换按钮点击事件
    // // const switchModeEmitter = cmpEditor.switchMode;
    // // if (!!switchModeEmitter) {
    // //   switchModeEmitter.subscribe(() => {
    // //     controller.switchMode();
    // //   });
    // // }
    // // 注册文件变更事件回调函数
    // cmpEditor.onFileChanged && cmpEditor.onFileChanged(controller.emitDesignerChanged);
    // // 绑定ts跳转定位事件
    // const jumpToCodeEmitter = cmpEditor.jumpToCode;
    // if (jumpToCodeEmitter) {
    //   watch(jumpToCodeEmitter, (methodCode: string) => {
    //     controller.switchMode(true);
    //     const {codeEditor} = controller.editorPanel;
    //     if (!codeEditor) {
    //       return;
    //     }
    //     // 获取导出的类的类名
    //     let className = null;
    //     // ========================================此方法是异步
    //     codeEditor.resolve(controller.path).then((codeRes) => {
    //       for (const _class of codeRes.classes) {
    //         if (_class && _class.exported) {
    //           className = _class.code;
    //           break;
    //         }
    //       }
    //       if (!className || !methodCode) {
    //         return;
    //       }
    //       setTimeout(() => {
    //         codeEditor.position(controller.path, className, methodCode);
    //       }, 15);
    //     });
    //   });
    // }
  }

  switchRelevantFile(path: string, designerComponent: Ref<any>, controller: CommandCodeViewController) {
    if (path.endsWith(".ts")) {
      controller.switchMode(true);
    } else {
      const cmpEditor = designerComponent.value as CmpEditorComponent;
      // 判断应该显示webcmp还是webcmd
      if (path.endsWith(".webcmp")) {
        cmpEditor.setDisplayMode('webcmp');
      } else if (path.endsWith(".webcmd")) {
        cmpEditor.setDisplayMode('webcmd');
      }
      controller.switchMode(false);
    }
  }

  save(designerComponent: Ref<any>, result: CodeAnalysisResult, controller: CommandCodeViewController, editorSaveSuccess: boolean): Promise<SaveResultNotify> {
    if (result && result.hasFatalError) {
      return new Promise((resolve, reject) => {
        // 你可以在这里执行异步操作，比如保存文件
        // 这里的例子中直接返回一个成功的 Promise
        resolve("代码中包含不可忽视的语法错误，请修改后再保存");
      });
    }
    const cmpEditor = designerComponent.value as CmpEditorComponent;
    return cmpEditor.save(result.content, result.classes);
  }

  beforeInit(controller: CommandCodeViewController): Promise<void> {
    // 如果代码文件不存在，则不显示代码编辑器，只显示构件设计器
    const {path} = controller;
    const tsFilePath = getTsFilePath(path);
    return new Promise((resolve, reject) => {
      this.fileSrv.isFileExist(tsFilePath).then((exist: boolean) => {
        if (!exist) {
          this.needCodeEditor = false;
          controller.editorPanel.hasCodeEditor = false;
        }
        resolve();
      })
        .catch(error => {
          // 处理错误情况
          reject(error);
        });
    });
  }

  /** 通过本地的VSCode打开代码文件 */
  async handleOpenWithVSCode(controller: CommandCodeViewController): Promise<void> {
    // 判断是否为本地环境，不支持打开远程环境上的文件
    const hostname = window.top && window.top.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      controller.requestNotifyMessage({
        type: 'info',
        msg: '仅支持打开本地环境上的文件',
        timeout: 3500,
        showClose: true
      });
      return;
    }
    // 获取文件路径并触发链接
    const filePath = controller.path;
    const rootPath = await this.fileSrv.getRootPath();
    if (!rootPath || !filePath) {
      return;
    }
    const path = rootPath + filePath;
    const encodedPath = encodeURIComponent(path);
    const vscodePath = `vscode://file/${encodedPath}`;
    const a = document.createElement("a");
    a.target = "_blank";
    a.href = vscodePath;
    a.click();
  }

  outerNotificationHandlers = {
    "AddNewMethod": handleAddNewMethod,
    "AddNewCmdMethod": handleAddNewCmdMethod
  };


  async getCodeFilePath(path: string): Promise<string> {
    return getTsFilePath(path);
  }

  correctPath(path: string): string {
    return getTsFilePath(path);
  }

}


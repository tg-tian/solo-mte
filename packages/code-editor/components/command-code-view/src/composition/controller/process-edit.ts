import { ControllerDataSource } from "../handler/controller-data-source";
import { MetadataGenerator } from "../handler/metadata-generator.service";

/**
 * 流程编排 控制器
 * @remarks 记录页面的状态信息并提供一些事件响应方法
 */
export class ProcessEditController {

  /** 控制器数据源 */
  public datasource: ControllerDataSource;

  /** 入口文件路径 */
  private fullPath: string = '';

  /** 是否显示“控制器构件”，如果为否则显示“服务构件” */
  private _showControllerCmp: boolean = true;

  /** 文件修改状态变更回调函数，由外层框架传入 */
  public fileChangedHandler(changed: boolean) {

  };

  get showControllerCmp(): boolean {
    if (!this.datasource.ready) {
      return false;
    }
    if (this.datasource.isControllerCmp) {
      return true;
    }
    if (this.datasource.isServiceCmp) {
      return false;
    }
    return this._showControllerCmp;
  }

  set showControllerCmp(mode: boolean) {
    this._showControllerCmp = mode;
  }
  private metadataGenerator;
  constructor() {
    this.datasource = new ControllerDataSource();
    this.metadataGenerator = new MetadataGenerator();
  }
  public getDataSource() {
    return this.datasource;
  }
  /**
   * 初始化前端控制器构件编辑器
   * @param fullPath 文件路径
   */
  public init(fullPath: string): void {
    this.fullPath = fullPath;
    this.datasource.initDataSource(this.fullPath);
    this.listenFileChanged();
  }

  /**
   * 监听文件修改事件
   * @todo
   * 当前的修改状态同步机制仅能反应数据是否被修改过，不能判断用户是否又将数据改回去了
   * 要实现对数据是否真的有变化的判断，有以下两种方式：
   * 1. 每次检测到用户的编辑行为，都全量地比对新旧元数据，判断是否有差别
   * 2. 各个编辑组件向控制器通知用户编辑行为时，同时告诉控制器用户编辑的是哪个部分的哪个数据，控制器只对该部分数据进行比对，同时记录有几处修改
   */
  private listenFileChanged(): void {
    // this.pushCenter.subscribe(PushEventType.RequestFileChangedDetect, (target?: ChangeCompareItem) => {
    //   // 当前仅在检测到用户编辑行为时将是否修改置为真，待后续增加新旧元数据比对服务
    //   let changed = true;
    //   if (!!target) {
    //     changed = this.changeCompareService.compare(target);
    //   }
    //   changed && this.fileChangedHandler && this.fileChangedHandler(true);
    // });
  }

  /**
   * 补加命令构件
   */
  public addWebcmd(): void {
    if (this.datasource.isCompleteCmp || this.datasource.isControllerCmp) {
      return;
    }
    this.metadataGenerator.addWebcmd(
      this.datasource.webcmpDto,
      this.datasource.getResolvedPath()?.fileNameWithoutSuffix
    ).subscribe((error: string) => {
      if (error) {
        alert(error);
      } else {
        this.datasource.initDataSource(this.fullPath);
      }
    });
  }

  /**
   * 补加Web构件以及Ts文件
   */
  public addWebcmp(): void {
    if (this.datasource.isCompleteCmp || this.datasource.isServiceCmp) {
      return;
    }
    this.metadataGenerator.addWebcmp(
      this.datasource.webcmdDto,
      this.datasource.getResolvedPath()?.fileNameWithoutSuffix
    ).subscribe((error: string) => {
      if (error) {
        alert(error);
      } else {
        this.datasource.initDataSource(this.fullPath);
      }
    });
  }

}

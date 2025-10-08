import { Ref } from "vue";

/**
 * 编辑面板组件的对外接口
 * @remarks 封装切换设计器/编辑器等方法，在初始化时传递给控制器
 */
export interface EditorPanel {

  /** 页面初始化中，播放加载动画 */
  loading: boolean;

  /** 是否显示代码编辑器，否则显示设计器组件 */
  showCodeEditor: boolean;

  /** 是否有代码编辑器 */
  hasCodeEditor: boolean;

  /** 是否有设计器组件 */
  hasDesignerComponent: boolean;
  /** 正在加载设计器组件，禁用切换功能 */
  loadingDesignerComponent: boolean;

  /** 设计器容器引用，用于加载设计器组件 */
  designerContainer: Ref<any>;

  /** Monaco代码编辑器组件 */
  codeEditor: Ref<any>;

  /**
   * 切换代码编辑器/设计器
   * @param showEditor 显示代码编辑器，否则显示设计器
   */
  switchMode(showEditor?: boolean): void;

  /**
   * 触发变更检查
   * @remarks 通过事件总线通信导致数据修改，需要手动进行变更检测
   */
  detectChanges(): void;

}

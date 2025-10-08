// import { CommonFileNavTreeDataService } from "../nav-data/common-file";
// import { ToolbarConfigService } from "../nav-data/tool-bar";
// import { NavTreeNodeIconService } from "../nav-data/node-icon";

// /**
//  * 导航面板配置
//  * @remarks
//  * 由外部传入，定义了左侧导航面板是如何组织的
//  * 让使用者既可以配置导航面板的视图结构，又可以配置导航树的数据服务
//  */
// export interface NavPanelConfig {

//   /**
//    * 导航面板的id
//    * @remarks 作为导航面板组件的id，需要保证全局唯一
//    */
//   id: string;

//   /**
//    * 导航面板的标题
//    * @remarks 显示标题栏时必填
//    */
//   title?: string;

//   /**
//    * 是否隐藏标题栏
//    * @remarks
//    * 默认显示，如果标题栏隐藏则该面板永远展开，无法收折
//    * （如果隐藏标题栏，则位于其上的按钮工具栏也将被隐藏）
//    */
//   hideTitleBar?: boolean;

//   /**
//    * 仅当隐藏标题栏的情况下，主体内容的上边距
//    * @remarks
//    * 如果隐藏标题栏，则其下的导航树组件应该有一个上边距，否则不美观，单位：px，默认：8
//    */
//   marginTopWhenHideTitleBar?: number;

//   /**
//    * 导航树数据服务
//    * @remarks
//    * 为该面板下的导航树组件提供节点数据
//    * 默认情况下，双击导航树节点会打开一个新的标签页，你也可以阻止该默认行为，实现其它的自定义交互逻辑
//    */
//   navTreeDataService?: CommonFileNavTreeDataService;

//   /**
//    * 导航树节点图标类生成服务
//    * @remarks
//    * 为导航树节点设置图标的css类
//    * 1. 当服务非空时，优先使用该服务指定节点图标的css类
//    * 2. 当服务为空时，如果navTreeDataService返回的树节点中的icon、expandedIcon、collapsedIcon字段均非空，则直接使用这三个字段的值
//    * 3. 如果服务为空，且节点中的图标相关字段也为空，则将使用默认的图标服务根据文件后缀名匹配图标
//    */
//   navTreeNodeIconService?: NavTreeNodeIconService;

//   /**
//    * 导航面板工具栏配置
//    * @remarks 配置标题栏右侧的图标按钮组，如果隐藏标题栏则不显示
//    */
//   toolbarConfigService?: ToolbarConfigService;

//   /**
//    * 是否主要导航树
//    * @remarks
//    * 主要导航树会随着当前页签的变化而切换自己的当前选中节点
//    * 默认所有导航树都是主要导航树
//    */
//   isMainNavTree?: boolean;

//   /**
//    * 数据为空时的占位消息
//    * @remarks 导航树数据为空时显示，默认为：暂无数据
//    */
//   emptyMessage?: string;

//   /**
//    * 导航树搜索栏配置
//    * @remarks 支持对导航树节点数据进行搜索过滤
//    */
//   searchBarConfig?: NavTreeSearchBarConfig;

//   /**
//    * 是否禁用搜索服务
//    * @remarks
//    * 如果导航树的节点较多且刷新频繁，当永远不启用搜索栏时应当禁用搜索服务以提高性能
//    * 默认不会禁用搜索服务（推荐在永远不会显示搜索栏时设置本字段为true）
//    */
//   disableSearchService?: boolean;

//   /** 是否启用虚拟列表，默认不启用 */
//   virtualized?: boolean;

//   /**
//    * 主体内容模板
//    * @remarks
//    * 默认使用导航树组件作为导航面板的主体内容，如果设置此字段，将替换默认的导航树组件
//    * 此种模式下，用户需要自行实现相关的交互逻辑（导航面板不再提供任何默认实现）
//    * 可以通过代码视图组件上的getEditorController方法获取代码视图控制器实例，并以之实现对代码视图中各个部件的控制
//    */
//    templateRef?: TemplateRef<any>;

//    /**
//     * 主体内容模板的上下文
//     * @remarks 参考TemplateRef的context参数
//     */
//    templateRefContext?: any;

// }

/**
 * 导航树搜索栏配置
 * @remarks 支持对导航树节点数据进行搜索过滤
 */
export interface NavTreeSearchBarConfig {

  /**
   * 是否启用搜索栏
   * @remarks 默认不启用
   */
  enable: boolean;

  /**
   * 搜索框为空时的占位文本
   * @remarks 默认为“搜索”
   */
  placeholder?: string;

  /**
   * 是否显示“全部收折/展开”按钮
   * @remarks 默认显示该按钮，启用分层加载时应该隐藏该按钮
   */
  showToggleButton?: boolean;

  /**
   * 搜索结果为空时的提示信息
   * @remarks 默认为“搜索结果为空”
   */
  emptySearchResultTip?: string;

}

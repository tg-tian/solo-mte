
/**
 * 一般文件导航树节点数据
 */
export interface NavTreeData {

  /** 节点的唯一标识，将与NavTreeNode中的id相同，无需传入 */
  id?: string;

  /** 用于展示的节点名称 */
  name: string;

  /** 节点路径，是判别文件打开方式的最重要依据 */
  path: string;

  /** 节点是否可被双击打开，默认不能打开 */
  canOpen?: boolean;

  /**
   * 节点图标的附加信息
   * @remarks 可以传入一个类型标识字符串，帮助图标服务判断该节点应该采用哪一个图标
   */
  icon?: string;

  /** 对应的元数据描述 MetadataDto*/
  metadataDto?: any;

  /** 节点的附加信息 */
  appendInfo?: any;

  /** 元数据是否只读 */
  metadataReadonly: boolean;

  /** webCommand元数据id */
  webCommandId?: string;

  /** webCommand元数据id */
  webComponentId?: string;
}

/**
 * 一般文件导航树节点
 * @remarks 提供给导航树组件的节点数据
 */
export interface NavTreeNode {

  /**
   * 节点的唯一标识，不可为空
   * @remarks
   * 由大小写英文字母、数字、中划线、下划线组成
   * 其它字符将被自动过滤掉，请确保id的唯一性
   * 希望id是尽量不变的，对于同一条数据，刷新后其id应该保持不变（否则选中状态将失效）
   */
  id: string;

  /** 节点关联的数据 */
  data: NavTreeData;

  /** 子节点 */
  children?: NavTreeNode[];

  /** 是否为叶子节点，默认为非叶子节点，主要用于分层加载时 */
  leaf?: boolean;

  /** 是否展开，默认不展开 */
  expanded?: boolean;

  /** 是否允许选中，默认允许 */
  selectable?: boolean;

  /** 节点展开图标 */
  expandedIcon?: string;
  /** 节点收折图标 */
  collapsedIcon?: string;
  /** 节点叶子图标 */
  icon?: string;

  /** 本节点的父节点（运行时自动生成，传入无效） */
  parent?: NavTreeNode;
}


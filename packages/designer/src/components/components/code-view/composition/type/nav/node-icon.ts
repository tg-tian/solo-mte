import { NavTreeNode } from "../interface/tree";

/**
 * 导航树节点图标类生成服务
 */
export abstract class NavTreeNodeIconService {

  /**
   * 设置导航树节点的图标（css类）
   * @remarks
   * 每次都重新为整棵树设置图标
   * 如果需要为导航树使用自定义的图标，你需要在本方法设置节点（NavTreeNode）中的如下字段：
   * 1. icon - 作为叶子节点时的图标
   * 2. expandedIcon - 作为非叶子节点，展开状态下的图标
   * 3. collapsedIcon - 作为非叶子节点，收折状态下的图标
   * 一般情况下，三个字段的值应该是一致的，除非节点展开和收折状态需要使用不同的图标
   * @param nodes 导航树的根节点数组
   */
  abstract setIconProp(nodes: NavTreeNode[]): void;

}

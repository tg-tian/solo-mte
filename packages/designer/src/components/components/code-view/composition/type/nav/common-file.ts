import { EditorController } from "../../handler/editor.controller";
import { escapeTextForBrowser } from "../../utils/escape";
import { getValidId } from "../../utils/valid";
import { NavTreeNode } from "../tree";
const NODE_CONTENT_FIELD = 'CodeViewNav--ContentInnerHTML';
/**
 * 通用文件导航树 - 数据服务基类
 */
export class CommonFileNavTreeDataService {
  constructor() { }

  /**
   * 刷新导航树数据
   * @remarks 子类可以通过调用本方法实现导航树刷新（afterPropertySet被调用后本属性可用）
   */
  protected refreshNavTreeCallback?: () => void;

  /**
   * 代码视图控制器实例
   * @remarks
   * 提供导航树服务对标签页以及其它部件的控制能力（afterPropertySet被调用后本属性可用）
   * afterPropertySet、getChildren、handleDblClick被调用时，该属性保证非空
   * 编写预置模板时该属性无效（preset-panel，直接通过依赖注入获取控制器实例即可）
   */
  protected editorController?: EditorController;

  /**
   * 属性设置完成后回调
   * @remarks
   * 当editorController、refreshNavTreeCallback属性设置完成后本方法被调用
   * 如果需要在服务初始化时通过控制器的事件总线订阅一些消息，你需要覆盖本方法（本方法被调用之前，控制器实例可能为空）
   */
  afterPropertySet(): void { }

  /**
   * 是否启用分层加载
   * @remarks 如果不启用分层加载，则认为一次加载完所有节点
   */
  enableLayeredLoading(): boolean {
    return false;
  }

  /**
   * 获取导航树的节点数据
   * @param rootPath 该导航树的根节点路径，例如：如果该导航树是表单元数据导航树，则该路径为表单元数据的路径
   * @param curPath 当前正要展开的节点的路径，启用分层加载时将会传递此参数
   */
  getChildren(rootPath?: string, curPath?: string): Promise<NavTreeNode[]> {
    return Promise.resolve([]);
  }

  /**
   * 树节点双击事件处理回调
   * @remarks
   * 如果返回true则将打开节点的path对应的页签，如果返回false则不再进行其它处理
   * 默认将打开/切换页签，覆盖本方法以实现自定义双击事件
   * @param node 树节点
   * @returns 是否继续执行打开文件操作
   */
  handleDblClick(node: NavTreeNode): boolean {
    return true;
  }
  public async getChildrenWithValidId(rootPath = ''): Promise<NavTreeNode[]> {
    return this.getChildren(rootPath).then((data) => {
      const nodes = data;
      for (const node of nodes) {
        this.traverseTree(node, (n) => {
          n.id = getValidId(n.id);
          if (!n.data) {
            return;
          }
          n.data.id = n.id;
          const name = n.data && n.data.name || '';
          n.data[NODE_CONTENT_FIELD] = escapeTextForBrowser(name);
        });
      }
      return nodes;
    });
  }

  /**
   * 递归遍历树
   * @param node 树节点
   * @param handleNode 处理每一个树节点
   */
  private traverseTree(
    node: NavTreeNode,
    handleNode: (node: NavTreeNode) => void
  ): void {
    if (!node) {
      return;
    }
    handleNode(node);
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.traverseTree(child, handleNode);
      }
    }
  }
}

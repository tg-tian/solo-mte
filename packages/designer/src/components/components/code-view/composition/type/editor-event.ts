/**
 * 事件类别
 * @remarks 用于订阅或发起事件
 */
export enum EditorEventType {

  /**
   * 打开文件
   * @remarks
   * 当用户双击导航树中的文件条目时，应该在右侧中心面板处打开一个编辑页面
   * 通过该事件通知控制器打开新的标签页，需传递一个文件路径
   */
  OpenFile = "OpenFile",

  /**
   * 关闭文件
   * @remarks
   * 当用户关闭文件时，对应的标签页被销毁，需要提前释放订阅事件等资源
   * 该事件由代码视图发出，由代码编辑页接收事件并自行释放资源
   * 参数：string - 即将关闭文件的路径
   */
  CloseFile = "CloseFile",

  /**
   * 代码文件修改状态变更
   * @remarks
   * 代码内容变更时，应该更新标签页状态（是否未保存）
   * 参数：{ path: string; changed: boolean; }
   */
  FileChanged = "FileChanged",
  /**
   * 设计器文件修改状态变更
   * @remarks
   * 设计器元数据内容变更时，也应该更新标签页状态（是否未保存）
   * 参数：{ path: string; changed: boolean; }
   */
  DesignerFileChanged = "DesignerFileChanged",

  /**
   * 代码大纲变化
   * @remarks
   * 由代码编辑页面发送，代码视图接收到该事件后进行类导航数据的更新
   * 参数：{ path: string; classes?: IClass[]; }
   */
  CodeOutlineChanged = "CodeOutlineChanged",

  /**
   * 代码大纲定位请求
   * @remarks
   * 由代码视图发送，代码编辑页接收后切换到代码编辑器并定位光标位置
   */
  CodeOutlineLocateRequest = "CodeOutlineLocateRequest",

  /**
   * 标签页切换文件
   * @remarks
   * 当用户通过页签切换当前标签页时，需要通过该事件通知左侧导航树也切换当前选中节点
   */
  TabSelected = "TabSelected",

  /**
   * 切换关联文件
   * @remarks
   * 当打开一个关联文件组时，其对应的多个文件共用一个标签页（编辑页面）
   * 这个编辑页面中可能同时包含代码编辑器和设计器，而设计器也可能包含多个状态
   * 比如：
   * .ts .webcmp .webcmd是一组关联文件，共用一个编辑页面
   * 其中，ts文件对应代码编辑器，webcmp和webcmd文件则分别对应了构件设计器的两个状态
   * 当用户双击这三个文件中的任一一个时，编辑页面应该切换到对应的状态
   * 通过该事件通知编辑页面，并传递一个文件路径参数以表明用户到底希望编辑页面显示什么状态
   */
  SwitchRelevantFile = "SwitchRelevantFile",

  /**
   * 由代码视图组件代替编辑页面发送保存结果反馈等提示消息
   * @remarks
   * 参数是一个NotifyOptions对象
   */
  NotifyMessage = "NotifyMessage",

  /**
   * 外层框架通知事件队列更新
   * @remarks
   * 通知特定的标签页，其外层通知队列有更新
   * 无负载
   */
  NotificationQueueUpdated = "NotificationQueueUpdated"

};

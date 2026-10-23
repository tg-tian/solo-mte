设计器配置样例投放说明
======================

本目录提供首次投放用的空配置样例：

  designer-config.json    平台自有配置（属性黑名单 + 自定义组件登记）

投放位置
--------

配置文件（压缩包里的两份 JSON 都放这一层，一次拷完）：

  <web>/platform/common/web/renderer/
      ├─ designer-config.json           平台自有配置（属性黑名单 + 自定义组件登记）
      └─ third-party-components.json    第三方组件加载清单
                                        （位置不可改，@farris/ui-vue 按固定路径读取）

自定义组件包（*.system.js）：

  <web>/platform/common/web/renderer/third-party-components/

注：管理页登记自定义组件时生成的 url 指向组件包目录，
请确保「登记的组件包文件名」与「实际拷贝进去的文件名」一致。

首次投放空配置后，设计器行为与现有版本一致（展示全部属性、工具箱无自定义分组）。


!! 重要：third-party-components.json 请勿用空文件覆盖 !!
------------------------------------------------------

该文件是 @farris/ui-vue 约定的第三方组件加载清单，设计时与运行时共用，
**系统盘上通常已存在其他组件（例如富文本编辑器 rich-text-editor）的既有数据**。
用空数组覆盖会直接导致这些既有组件在运行时加载失败。

本目录因此**不提供**该文件的样例。

该文件由 IDE「自定义组件」页签生成：生成时会先读取现有文件内容，
保留其中不由本页签管理的既有条目，再追加已启用的自定义组件；
解压覆盖时请保留该合并结果，不要手工清空。


字段说明
--------

designer-config.json
  hiddenProperties   属性黑名单：控件类型 -> 需要隐藏的属性路径数组
                     路径规则：分类父ID + 属性父ID + 属性ID；
                     「外观」分类下的 class/style 补 appearance. 前缀
  customComponents   自定义组件登记，每项包含：
                     id / name / type / module / url / enabled

third-party-components.json
  由 customComponents 派生，仅包含 enabled 为真的项，格式为 [{ url, module }]；
  同时**原样保留**文件中已有的、非本页签管理的条目（含 key 等额外字段）。
  请勿手工编辑，统一由「自定义组件」页签生成后覆盖。

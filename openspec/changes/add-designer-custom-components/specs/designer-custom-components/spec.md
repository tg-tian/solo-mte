## ADDED Requirements

### Requirement: 自定义组件配置清单

系统 SHALL 以 `designer-config.json` 的 `customComponents` 作为自定义组件的配置真相，并派生出加载清单。

#### Scenario: 派生加载清单

- **WHEN** 配置被保存
- **THEN** 派生的 `third-party-components.json` 仅包含 `enabled` 为真的记录，且每项格式为 `{ url, module }`（`@farris/ui-vue` 约定的格式）

#### Scenario: 清单字段

- **WHEN** 记录被写入 `designer-config.json`
- **THEN** 每条记录包含：标识、名称、控件类型、模块名、组件包地址、启用状态；分类与图标不由用户配置

### Requirement: 设计器加载自定义组件

设计器 SHALL 在启动时按加载清单注册自定义组件。

#### Scenario: 加载成功

- **WHEN** 设计器启动
- **THEN** 设计器读取 `third-party-components.json`，通过 `@farris/ui-vue` 提供的第三方组件加载能力按 `url` 动态加载模块，并注册其 `module` 导出；注册后的组件可被拖入画布且参与运行时渲染

#### Scenario: 加载失败

- **WHEN** 某个自定义组件加载失败（地址不可达、模块名不存在或注册抛错）
- **THEN** 系统提示该组件加载失败，其余组件与内置功能不受影响，设计器不因此白屏

#### Scenario: 清单为空或不存在

- **WHEN** `third-party-components.json` 不存在或为空数组
- **THEN** 设计器仅注册内置控件，不展示自定义分组

#### Scenario: 组件包地址与投放位置一致

- **WHEN** 解析加载清单中的 `url`
- **THEN** 该地址指向组件包的实际投放位置（app-center 登记生成的是 `/platform/common/web/renderer/third-party-components/<组件包文件>`）；投放位置与清单不一致时以清单为准排查

#### Scenario: 未配置 basePath 时地址仍可用

- **WHEN** 宿主未提供 `basePath`（未注入配置，值为空或为 `undefined`）
- **THEN** 加载清单地址仍为可用的绝对路径（不得出现 `undefined/platform/...` 之类的拼接结果），自定义组件仍能被加载

### Requirement: 工具箱展示自定义组件

设计器 SHALL 在工具箱末尾以固定分组展示已启用的自定义组件。

#### Scenario: 展示自定义分组

- **WHEN** 至少有一个自定义组件注册成功
- **THEN** 工具箱在现有内置分组之后展示一个名为「自定义」的分组，组内按登记顺序列出已注册的自定义组件

#### Scenario: 分组与图标固定

- **WHEN** 渲染自定义组件的工具箱条目
- **THEN** 分组名称固定为「自定义」，每个条目的图标固定为 `fd_pc-kuozhankaifa`，条目标题取登记的「名称」

#### Scenario: 无可用组件

- **WHEN** 没有任何已启用且注册成功的自定义组件
- **THEN** 工具箱不展示「自定义」分组

#### Scenario: 顺序由登记顺序决定

- **WHEN** 自定义组件在配置中的顺序发生变化
- **THEN** 工具箱中的展示顺序与之保持一致，不依赖额外的排序配置

### Requirement: 工具箱合并时机

自定义分组 SHALL 在设计器打开后即呈现，不依赖用户手动刷新。

#### Scenario: 打开设计器即可见

- **WHEN** 设计器打开且存在已启用并注册成功的自定义组件
- **THEN** 工具箱中直接可见「自定义」分组，无需用户额外操作或刷新页面

#### Scenario: 配置读取较慢或失败

- **WHEN** 配置读取尚未完成或读取失败
- **THEN** 设计器不出现无工具箱的状态，最终以「内置分组 + 已成功加载的自定义分组」呈现

### Requirement: 自定义组件拖拽落地

自定义组件 SHALL 按容器类别处理拖拽落地，不触发字段或数据集合绑定流程。

#### Scenario: 拖入画布

- **WHEN** 用户把自定义组件从工具箱拖到画布
- **THEN** 按容器类别处理，直接创建控件实例，不弹出字段绑定或表格绑定对话框

### Requirement: 自定义组件包契约

自定义组件包 SHALL 为 SystemJS 格式模块，且其导出对象 SHALL 同时提供运行时注册与设计时注册能力。

#### Scenario: 符合契约的组件包

- **WHEN** 组件包导出对象同时提供运行时注册与设计时注册方法
- **THEN** 设计器与运行时渲染器均可加载该组件，其属性可被属性可见性黑名单命中

#### Scenario: 缺少设计时注册能力

- **WHEN** 组件包仅提供运行时注册能力
- **THEN** 设计器加载不产生致命错误，但该组件不出现在工具箱中

#### Scenario: 属性路径遵循统一规则

- **WHEN** 组件包在设计时注册中声明属性
- **THEN** 其属性路径遵循与内置控件一致的拼接规则，否则属性可见性配置对其无效

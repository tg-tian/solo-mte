## ADDED Requirements

### Requirement: 组件配置页签入口

app-center 顶部导航 SHALL 新增一项「组件配置」，点击后展示配置页面。

#### Scenario: 打开页签

- **WHEN** 用户打开 app-center 页面并点击顶部导航中的「组件配置」
- **THEN** 主内容区展示「组件配置」页面，包含「自定义组件」（默认选中、排在前）与「组件属性可见性」两个页签，且该导航项处于选中态

### Requirement: 读取系统盘配置作为初值

页面 SHALL 在进入时读取系统盘上的现有配置作为初值。

#### Scenario: 配置存在

- **WHEN** 用户进入「组件配置」页签
- **THEN** 系统以 GET 请求读取 `<basePath>/platform/common/web/renderer/designer-config.json`，并用其中的 `hiddenProperties` 与 `customComponents` 初始化两个配置区

#### Scenario: 配置不存在

- **WHEN** 该配置文件不存在（返回 404）
- **THEN** 系统以空黑名单与空自定义组件列表作为初值，并在页面上提示「尚未生成配置，首次保存后将产出配置包」

### Requirement: 配置内置组件属性可见性

页面 SHALL 以「显示/隐藏」勾选的方式，按控件配置内置组件的属性可见性。

注：本能力依赖「控件属性清单」，该清单由随应用部署的静态清单提供（源码静态扫描产出，见 `design.md`「属性清单静态化（选定方案）」）。

#### Scenario: 展示控件与属性清单

- **WHEN** 用户进入「组件属性可见性」页签
- **THEN** 系统展示设计器工具箱中的全部内置控件，选中某控件后展示其属性清单，每个属性对应一个「显示」勾选（默认勾选）

#### Scenario: 取消勾选写入黑名单

- **WHEN** 用户取消某属性的「显示」勾选
- **THEN** 该属性的属性路径被加入 `hiddenProperties[控件类型]` 黑名单；重新勾选则从黑名单中移除

#### Scenario: 属性清单获取失败

- **WHEN** 某控件在静态清单中不存在（未安装或未启用）
- **THEN** 系统提示该控件属性清单不可用，且不为该控件提供编辑入口，不得以空清单伪装成功

### Requirement: 属性标识使用运行时真实属性路径

页面展示与保存的属性标识 SHALL 与设计器过滤时使用的属性路径完全一致。

#### Scenario: 生成属性路径

- **WHEN** 页面渲染某控件的属性清单
- **THEN** 每条属性的标识使用静态清单给出的属性路径（与设计器过滤规则一致：`分组.parentPropertyID + 属性.parentPropertyID + propertyID` 拼接；「外观」分组下的 `class`/`style` 特例补 `appearance.` 前缀）

### Requirement: 登记自定义组件

页面 SHALL 允许用户以手工填写「名称 / 类型 / 模块名」三项的方式登记自定义组件。

#### Scenario: 新增登记记录

- **WHEN** 用户点击「新增」，填写名称、类型、模块名三项后确认
- **THEN** 系统在 `customComponents` 中新增一条记录：标识自动生成，`name`/`type`/`module` 取用户输入，`url` 按约定规则生成，`enabled` 默认为启用，且记录顺序即登记顺序

#### Scenario: 类型重复

- **WHEN** 用户填写的「类型」与已登记记录重复
- **THEN** 系统提示类型重复并阻止新增

#### Scenario: 必填校验

- **WHEN** 用户未填写名称、类型或模块名中的任意一项即确认
- **THEN** 系统提示该字段必填并阻止新增

#### Scenario: 组件包文件名的默认推导

- **WHEN** 用户未填写「组件包文件」而直接确认
- **THEN** 该记录的 `url` 按「类型 + `.system.js`」拼出并指向组件包投放目录；填写了文件名则以用户填写的文件名为准

#### Scenario: 登记表单使用 Farris 输入控件

- **WHEN** 用户展开登记表单并输入各字段
- **THEN** 表单使用 Farris 输入控件（`FInputGroup`）承载名称 / 类型 / 模块名 / 组件包文件，「确定 / 取消」使用 `FButton`，字段宽度固定（500px），不出现原生表单控件

### Requirement: 启用与停用自定义组件

页面 SHALL 提供每个自定义组件的启用开关。

#### Scenario: 切换启用状态

- **WHEN** 用户切换某自定义组件的启用开关
- **THEN** `customComponents` 中该记录的 `enabled` 随之变更，且仅已启用的记录会出现在生成的 `third-party-components.json` 中

### Requirement: 为自定义组件配置属性可见性（本期不支持）

本期 SHALL NOT 在「组件属性可见性」页签中列出自定义组件。

注：属性清单由静态扫描 `@farris/ui-vue` 源码产出、只覆盖内置控件；自定义组件的属性配置由组件包在运行时向设计器注册（`propertyConfigSchemaMapForDesigner`），管理页拿不到，故本期不提供该能力。备选方案（手工录入路径 / 组件包随包提供清单 / 设计器运行时导出）的评估与结论见 `design.md`「属性清单静态化」取舍与 `tasks.md` 11.7。

#### Scenario: 页签只列出内置控件

- **WHEN** 用户进入「组件属性可见性」页签
- **THEN** 控件列表只包含静态清单中的内置控件，不含任何自定义组件；页签说明中给出「自定义组件的属性可见性暂不支持配置」的提示

#### Scenario: 既有黑名单条目不受影响

- **WHEN** `designer-config.json` 的 `hiddenProperties` 中已存在以自定义组件类型为 key 的条目（如人工添加）
- **THEN** 保存时原样保留（页面不展示也不修改该条目），投放后设计器侧仍按该黑名单过滤

### Requirement: 导出配置包

页面 SHALL 在保存时于前端生成配置压缩包并触发下载。

#### Scenario: 保存产出压缩包

- **WHEN** 用户点击「保存」
- **THEN** 系统在浏览器端生成 `designer-config.zip` 并触发下载，包内包含 `designer-config.json`（`hiddenProperties` 与 `customComponents`）与由已启用记录派生的 `third-party-components.json`

#### Scenario: 提示投放路径

- **WHEN** 配置包下载完成
- **THEN** 页面提示解压后将文件覆盖到 `<inBuilder>/web/platform/common/web/renderer/` 目录，并提示需重启或刷新设计器页面生效

#### Scenario: 包内不含组件包本体

- **WHEN** 生成配置压缩包
- **THEN** 包内不包含 `*.system.js` 组件包本体；自定义组件包由人工单独拷贝到同一目录

### Requirement: 保留既有的第三方组件条目

生成 `third-party-components.json` 时 SHALL 原样保留其中不由本页签管理的既有条目。

#### Scenario: 系统盘已存在其他组件

- **WHEN** 系统盘的 `third-party-components.json` 中已存在其他组件的条目（例如富文本编辑器）
- **THEN** 生成的新清单原样保留这些条目及其附加字段，并在其后追加已启用的自定义组件

#### Scenario: 停用或删除自定义组件

- **WHEN** 某自定义组件被停用或从登记中删除
- **THEN** 仅该组件的条目从生成结果中移除，既有条目不受影响

#### Scenario: 无法读取既有清单

- **WHEN** 生成时无法读取现有的 `third-party-components.json`
- **THEN** 页面给出明确告警，提示覆盖前需与现有文件核对合并，不得静默产出可能缺少既有条目的文件

#### Scenario: 首次投放样例不清空既有数据

- **WHEN** 提供首次投放用的样例文件
- **THEN** 不提供 `third-party-components.json` 的空样例，避免人工投放时清空既有数据

### Requirement: 保存动作不依赖后端接口

保存动作 SHALL 在无后端接口可用时仍能完整完成。

#### Scenario: 后端接口不可用

- **WHEN** 后端配置接口未部署或不可调用
- **THEN** 用户点击「保存」仍能通过导出配置压缩包完成配置产出，不出现保存失败

#### Scenario: 预留后端接口调用点

- **WHEN** 后续后端提供配置保存接口
- **THEN** 系统可仅替换保存出口为接口调用，页面交互与配置结构保持不变

### Requirement: 登记列表的展示与操作

页面 SHALL 以数据表格展示已登记的自定义组件，且只提供与登记模型相匹配的操作。

#### Scenario: 列表内容

- **WHEN** 用户查看「自定义组件」配置区
- **THEN** 表格按登记顺序展示每条记录的 名称 / 类型 / 模块名 / 组件包地址 / 启用 五列，左侧行号列表头为「行号」；表格无数据时展示空态提示

#### Scenario: 不支持就地修改

- **WHEN** 用户希望修改某条已登记记录
- **THEN** 页面不提供就地编辑入口（「类型」是设计器注册表与属性配置的 key，组件包地址由其派生），操作列只提供「删除」，需要变更时删除后重新登记

#### Scenario: 启用状态在列表内切换

- **WHEN** 用户切换某行的「启用」勾选
- **THEN** 该记录的 `enabled` 随之变更并立即刷新表格数据源；仅启用记录会进入生成的加载清单

### Requirement: 面板入口与投放提示

自定义组件配置区 SHALL 在面板内集中给出登记入口与投放要求。

#### Scenario: 登记入口位置

- **WHEN** 用户查看「自定义组件」面板
- **THEN** 「新增自定义组件」按钮位于面板右上角，点击后在同一面板内展开登记表单

#### Scenario: 投放与打包提示

- **WHEN** 用户查看自定义组件配置区的说明
- **THEN** 页面说明两件事：① 勾选「启用」后该组件才会被设计器加载，未启用的只是登记在案、设计器不会加载；② 组件包需手工拷贝到 `/platform/common/web/renderer/third-party-components/` 目录，并打包为 SystemJS 格式（rollup `format: 'system'`），同时把 `vue`、`@farris/ui-vue` 作为外部依赖，否则设计器加载不到或出现两份 Vue 实例

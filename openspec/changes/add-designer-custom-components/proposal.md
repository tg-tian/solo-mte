## Why

低代码平台的表单设计器（`packages/designer`）当前有两处硬约束：工具箱是编译期静态 JSON（`packages/designer/src/components/types/toolbox/pc-toolbox.json`），无法在运行期扩展；右侧属性面板固定展示 `@farris/ui-vue` 注册的全部属性，无法按平台需要裁剪。这使得平台无法屏蔽对业务用户无意义的属性，也无法引入第三方开发的自定义组件。本变更在不修改 `@farris/ui-vue`、不修改 app-builder 与运行时渲染器的前提下，补齐「属性可见性配置」与「自定义组件登记」两项能力。

## What Changes

- 在 app-center 顶部导航新增页签「组件配置」，内含两个页签：
  - **内置组件属性可见性**：按工具箱控件列出属性，勾选要隐藏的属性
  - **自定义组件**：登记（手工填写 名称 / 类型 / 模块名）、启用/停用、导出加载清单（属性可见性配置本期不支持自定义组件，见 `tasks.md` 11.7）
- 设计器启动时读取 `designer-config.json`，据 `hiddenProperties`（**黑名单**）过滤右侧属性面板；内置与自定义控件共用同一份黑名单，以控件类型为 key
- 设计器启动时加载 `third-party-components.json`（沿用 `@farris/ui-vue` 原生 `loadThirdComponents`），并在**首次渲染前**把自定义组件追加到工具箱末尾固定的【自定义】分组
- 自定义组件在工具箱中：分组固定为「自定义」、图标固定 `fd_pc-kuozhankaifa`、顺序即登记顺序（不做排序）、拖拽落点按 `container` 处理（不弹字段/表格绑定）
- 设计器新增「导出属性元数据」入口，供管理页获取各控件在运行时的真实属性清单（含属性路径）
- 「保存」动作产出 `designer-config.zip`（含 `designer-config.json` 与生成的 `third-party-components.json`），由人工解压覆盖到系统盘
  - 生成 `third-party-components.json` 时**原样保留系统盘中既有的、不由本页签管理的条目**（当前环境已有一条富文本编辑器 `rich-text-editor` 数据），仅增删本页签登记的自定义组件；不得清空或改写既有数据
  - 首次投放样例**不提供** `third-party-components.json` 的空文件，避免人工投放时清空既有数据
- 预留后端接口 `PUT /api/.../designer-config`，第二期将「导出压缩包」替换为直接上传（**本期不实现**）

## Capabilities

### New Capabilities

- `designer-config-management`: app-center「组件配置」页签的管理能力——读取系统盘现有配置作为初值、编辑内置组件属性可见性、登记/启停自定义组件、导出可人工投放的配置包（自定义组件的属性可见性本期不支持）
- `designer-property-visibility`: 设计器按黑名单配置过滤右侧属性面板的能力，覆盖内置控件与自定义组件
- `designer-custom-components`: 自定义组件的配置清单格式、设计器加载与注册、工具箱展示与拖拽落地行为

### Modified Capabilities

无（现有 `openspec/specs/` 下的 `app-builder-preview`、`app-center-publish`、`app-delete`、`standard-publish` 均不涉及本次行为变更）

## Impact

- **packages/designer**
  - `src/components/composition/designer-context/use-pc-designer-context.ts`：新增 `getPropertyFilterRule` + `filterPropertyEntity`（黑名单过滤，仅 PC 模式；不影响 PC_RTC 既有的 `assets/rtc/property-rule.json`）
  - 启动流程（`src/main.ts` / 应用装配处）：读取 `designer-config.json`、加载第三方组件、挂载前合并工具箱
  - 新增属性元数据导出入口（URL 参数分支 + `postMessage`）
- **packages/ide/apps/platform/development-platform/ide/app-center**
  - `src/app.tsx`：`ViewKey` 与 `navData` 新增一项
  - 新增页签页面、配置读写 api、配置包导出逻辑
  - 新增前端 zip 打包依赖（如 `jszip`）
- **服务端磁盘**（`<inBuilder>/web/platform/common/web/renderer/`）
  - `designer-config.json`：平台自有配置（属性黑名单 + 自定义组件登记）
  - `third-party-components.json`：**生成物**，仅含 `enabled` 的自定义组件 `{url, module}`
  - 自定义组件包 `*.system.js`：由组件作者提供、人工拷贝
- **不改动**：`@farris/ui-vue`、app-builder、运行时表单渲染器（继续走 ui-vue 原生 `loadThirdComponents` 通路）
- **人工环节**：组件包手工拷入系统盘目录；配置包手工解压覆盖
- **风险**：设计器启动新增一次配置读取与组件动态加载，需保证失败时降级为内置行为，不可白屏

## 交付状态（联调验证后）

**功能2（自定义组件）：已实现并通过联调验证，可独立上线。**

- 设计器侧：启动时读取 `designer-config.json` 与 `third-party-components.json`，按 `enabled` 加载第三方组件；工具箱末尾出现固定「自定义」分组（图标 `kuozhankaifa`，渲染为 `fd_pc-kuozhankaifa`；条目按 `container` 落地，不弹字段/表格绑定对话框）。
- 管理页侧：登记（名称 / 类型 / 模块名，可选填组件包文件名）、启用开关、删除、保存并导出配置包；列表用 Farris 数据表格展示（名称 / 类型 / 模块名 / 组件包 / 启用 + 操作列），操作列只保留「删除」——「类型」是设计器注册表与属性配置的 key、组件包地址由其派生，因此不支持就地修改，需要变更时删除后重新登记。
- 联调补充处理：设计器产物内 `@farris/ui-vue` 的第三方组件清单地址在未配置 `basePath` 时会拼出 `undefined/platform/...`，已在产物中打补丁兜底为空串（见 `design.md`「联调验证与实现补充」）。

**功能1（属性可见性）：已具备交付条件**（属性过滤 + 属性清单均已实现）：

- 属性**过滤**能力（黑名单 → `filterPropertyEntity`，仅 PC 模式、不影响 PC_RTC）已实现并接入属性面板。
- 「控件属性清单」的数据来源已定为**源码静态扫描**：`app-center/scan-control-property-meta.mjs` 用 TypeScript AST 解析 `@farris/ui-vue` 组件源码（不执行组件代码），产出 `control-property-meta.json` 随 IDE 应用部署；管理页**只读该文件**（读取失败时提示路径，要求确认部署后刷新）。当前产出：23 个类型（22 个工具箱类型 + `data-grid-column`）、449 条属性、102 个分类、0 告警。
- 不再走「设计器运行时导出」的原因：属性配置的计算依赖 `designerHostService`（内部还用 `schemaService`、`viewModelId`），且工具箱 22 个控件类型的静态属性配置实测**全部为空对象**，运行时导出恒为 `{ controls: [] }`；相关实现（工具栏「导出属性清单」按钮 / `property-meta-export.service.ts` / `?exportPropertyMeta` 通道）已删除。
- 已知取舍（详见 `design.md`「属性清单静态化（选定方案）」）：静态清单是运行时面板的**超集**（条件显隐属性也会列出，仅可用于黑名单）；容器类控件面板偏薄；组件升级后需重跑脚本（本期明确不考虑）。
- 端到端联调（页面勾选 → 保存覆盖 → 设计器隐藏属性 + PC_RTC 回归）待执行，见 `tasks.md` 11.5。

## 验证记录（2026-10）

| 验证项 | 结论 | 依据 |
| --- | --- | --- |
| 工具箱展示自定义分组 | 通过 | 投放 `qr-scanner.system.js` 并在管理页登记启用后，工具箱末尾出现「自定义」分组，条目名称取登记名称 |
| 拖拽落地不弹绑定对话框 | 通过 | 拖入画布直接创建控件实例（按 `container` 处理） |
| 设计时与运行时渲染自定义组件 | 通过 | 画布与运行态均能渲染该组件；组件包内 `registerDesigner` / `register` 两条注册通路均生效 |
| 管理页登记 / 启停 / 删除 | 通过 | 「组件配置 → 自定义组件」页签完整走通，登记结果可被设计器读取 |
| 配置包导出与投放 | 通过 | 保存产出 `designer-config.zip`（含 `designer-config.json` 与派生的 `third-party-components.json`），覆盖到 `renderer/` 后刷新设计器生效 |
| 属性清单静态扫描 | 通过 | 扫描 ui-vue 现源码：23/23 类型解析成功、449 条属性、102 个分类、0 告警，无空分类名；产物结构与页面 `PropertyMetaControl` 一致。联调反馈 lookup 不全后已补齐「返回式分类 / 普通函数调用 / 解构赋值」三类写法（lookup 15→61 条属性） |
| 属性可见性端到端（功能1） | 待验证 | 属性过滤与静态清单均已实现，联调项见 `tasks.md` 11.5 |

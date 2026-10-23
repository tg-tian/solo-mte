## Context

### 现状（已核实的证据）

**应用拓扑**：app-center 是独立打包页面，由 app-builder 通过 `window.open` 打开（`packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`）。表单设计器是另一个独立页面，由 app-builder 以 iframe 打开（`.../app-builder/src/components/pages/pages.component.tsx` 中的 `designerMap`，形如 `/platform/common/web/farris-designer/index.html`）。三者同源，浏览器侧**没有文件系统能力**（业务 web 代码中 `node:fs` / `ipcRenderer` 零命中）。

**工具箱是静态的**：`packages/designer/src/components/composition/designer-context/use-pc-designer-context.ts` 以 `import ToolboxItems from '../../types/toolbox/pc-toolbox.json'` 静态引入，交给 `@farris/ui-vue` 的 `FDesignerToolbox` 渲染。`FDesignerToolbox` 的实现（`ui-vue/components/designer-toolbox/src/toolbox.component.tsx`）中 `controlCategoryList = ref(props.toolboxItems)` 只读一次，且 `watch` 只监听 `dragula`——**不响应渲染后的条目变更**。工具箱条目图标类名硬编码为 `` `fd_pc-${toolboxItem.icon || toolboxItem.type}` ``。

**拖拽落点按 category 分流**：drop 时读取 `data-category`，`input` 触发字段绑定弹窗、`dataCollection` 触发绑定选择、`container` 直接创建（ui-vue 的 `designer-canvas` 落点处理）。

**属性面板有现成的过滤钩子**：`@farris/ui-vue` 的 `FPropertyPanel` 会调用注入的 `designerContext.filterPropertyEntity(propertyConfig, propertyData)`；`designerContext.getPropertyFilterRule()` 在设计器挂载时被调用。目前**只有 PC_RTC 上下文实现了这两个钩子**（`packages/designer/src/components/composition/designer-context/use-pc-rtc-designer-context.ts`），它读取静态白名单 `packages/designer/public/assets/rtc/property-rule.json` 并按属性路径过滤。`use-pc-designer-context.ts`（PC 模式）未实现。

**属性路径拼接规则**（PC_RTC 实现中）：`分组.parentPropertyID + 属性.parentPropertyID + propertyID`；「外观」分组下的 `class` / `style` 特例补 `appearance.` 前缀；分组内属性被清空则自动隐藏分组（`checkIsHideCategory`）。

**ui-vue 已有第三方组件通路**：`@farris/ui-vue` 的 `useThirdComponent()` 提供 `loadThirdComponents()`，读取 `<basePath>/platform/common/web/renderer/third-party-components.json`（格式 `[{ url, module }]`），对每项执行 `window.System.import(url)` 并写入 `window.F_THIRD_COMPONENTS[module]`；ui-vue 的注册流程随后遍历该全局对象，对每个第三方组件调用 `registerDesigner(map, propsConverter, propConfigConverter)`（**不传 registerContext**）与 `register(...)`。solo-mte 实际依赖的 `@farris/ui-vue@1.6.5-beta.6` 产物中该机制完整存在（已核对）。但**当前 `packages/designer/src/main.ts` 并未调用 `loadThirdComponents()`**，因此该通路处于未启用状态。

**图标可用性**：`fd_pc-kuozhankaifa` 在 designer 随包发布的 `packages/designer/public/assets/icon/iconfont.css` 中存在（`content: '\e04a'`），可作为自定义组件的默认图标直接使用。

## Goals / Non-Goals

**Goals:**

- 让平台能按控件裁剪右侧属性面板的可见属性（全局统一一份配置，内置与自定义控件共用）
- 让平台能登记并加载第三方开发的自定义组件，在设计器工具箱末尾以固定分组展示、可拖入画布、可参与运行时渲染
- 在不修改 `@farris/ui-vue`、不修改 app-builder 与运行时渲染器的前提下完成上述能力
- 第一期仅依赖前端即可闭环：读配置走静态 GET，写配置走「导出压缩包 + 人工投放」

**Non-Goals:**

- 不实现后端配置上传接口（仅预留调用点）
- 不实现自定义组件的图标自定义（固定 `fd_pc-kuozhankaifa`）
- 不实现工具箱排序功能（顺序即登记顺序；后续可在管理页补排序）
- 不实现「按应用/场景」或「按表单模板」的细粒度属性可见性（全局统一一份）
- 不改变 PC_RTC（运行时定制）模式既有的属性白名单逻辑
- 不提供自定义组件的自动化安装（组件包由人工拷贝到系统盘目录）

## Decisions

### 1. 属性可见性用「黑名单」，并按控件类型索引

配置结构为 `{ hiddenProperties: { "<控件类型>": ["要隐藏的属性路径", ...] } }`。

**命名**：字段名取 `hiddenProperties` 而非 `propertyVisibility`——后者字面像「可见性开关」，与「记录要隐藏的属性」这一实际语义相反，容易误读。

**理由**：白名单（列出要显示的）在 ui-vue 升级、控件新增属性后会「静默消失」，运维成本高；黑名单默认可见，新增属性自动出现。过滤实现只需把现有 `allowedPropertyIds.includes(path)` 取反。

**内置与自定义共用一份**：`filterPropertyEntity` 只认 `propertyData.type`，按类型查表即可，无需区分来源；自定义组件的属性配置同样由 `propertyConfigSchemaMapForDesigner` 提供，与内置同源。

**备选**：为自定义组件单列一份配置——放弃，因为自定义组件的属性同样是「某控件类型的属性集」，拆分反而引入来源判断。

### 2. 复用 ui-vue 的第三方组件通路，不自造加载器

设计器启动时启用 `loadThirdComponents()`，让 `@farris/ui-vue` 自行完成 `System.import` + 全局挂载 + 注册。

**理由**：这条通路同时被**运行时渲染器**使用（inBuilder 侧 `renderer` 也调用 `loadThirdComponents`）。若自造加载器只挂设计器，「用了自定义组件的表单在运行时渲染不出来」。复用同一份 `third-party-components.json` 可让设计时与运行时一致。

**备选**：自建富清单加载器并跳过 ui-vue——放弃，会让运行时渲染器读不到组件。

### 3. 「配置真相」与「加载清单」分离

- `designer-config.json`：平台自有配置（`hiddenProperties` + `customComponents` 富信息）
- `third-party-components.json`：**生成物**，仅含 `enabled` 记录的 `{ url, module }`；同时**原样保留其中不由本页签管理的既有条目**

**理由**：ui-vue 只认后者的固定路径与格式；而「停用组件」这一诉求等价于「从该列表移除」。将富信息与加载清单分离，既满足 ui-vue 契约，又保留管理页所需的元信息，且不污染同时被运行时渲染器读取的文件。

**既有数据保护（硬约束）**：当前部署环境（`E:\igix_server\...\web\platform\common\web\renderer\third-party-components.json`）中已存在一条富文本编辑器数据，且带有额外的 `key` 字段：

```json
[{ "key": "rich-text-editor", "module": "FHtmlEditor", "url": ".../ui-editor-vue3.system.js?v=20260128" }]
```

因此生成清单时按「`module` 或 `url` 是否命中本页签登记项」区分归属：未命中的条目**连同额外字段原样保留**并置于结果前部，命中的条目按启用状态增删。读取现有清单失败时不静默产出，页面与会话均给出告警；首次投放样例**不提供**该文件的空样例，避免人工投放时清空。

### 4. 保存动作走「前端导出压缩包」，预留后端接口

前端序列化两个 JSON 并打包下载，人工解压覆盖到 `<inBuilder>/web/platform/common/web/renderer/`。

**理由**：浏览器无法写服务端文件；后端接口第一期不具备。把保存收敛为**单一出口**，第二期把「打包下载」替换为 `PUT /api/.../designer-config` 即可，交互与数据结构不变。

**备选**：第一期直接用 `localfs`（`packages/ide/localfs-server.mjs`）——放弃，那是本机开发用途，无法用于部署环境。

### 5. 属性清单由设计器导出，而非管理页自行推导

设计器新增导出入口（URL 参数分支 + `postMessage`），在控件注册完成后回传属性简化树。

**理由**：属性配置对象只能在设计器运行时拿到，且 `propertyConfigSchemaMapForDesigner` 若不经过注册流程则为空。更关键的是，导出时使用 **designer 自己的路径拼接规则**生成 `path`，可保证管理页写出的黑名单 key 与过滤端**必然一致**，避免路径拼错导致的静默失效。

**实现方式**：ui-vue **未公开**属性配置的归一化入口（`getPropertyConfigBySchema` / `getPropertyConfigByType` 只存在于包内，未从任何公开入口导出——已核对 `types/dynamic-resolver/index.d.ts` 与 `components/dynamic-resolver/index.esm.js` 的导出名单）。因此导出实现以**公开导出的 `propertyConfigSchemaMapForDesigner`** 为数据源，用结构容错的遍历器派生简化树（兼容 `categories` 为对象或数组、兼容级联子属性）。属性配置中的函数值天然不会被采集。

**备选**：管理页 `import { propertyConfigSchemaMapForDesigner } from '@farris/ui-vue'`——放弃，该符号虽从包根导出，但 app-center 中无人触发注册，拿到的是空 map。构建期 dump JSON 亦可，但需在 Node 环境跑通注册流程，较脆。

**修订（联调期，最终方案）**：改为**源码静态扫描**——在 app-center 侧新增 `scan-control-property-meta.mjs`，用 TypeScript AST 解析 `@farris/ui-vue` 各控件的 `*.property-config.{ts,tsx,json}`（沿 `extends` 链合并基类、解析 hook 工厂函数与 `super` 调用），按与过滤端**同一套路径规则**产出 `control-property-meta.json`，随 IDE 应用部署、由管理页自动 fetch。相比 A7 原设想（Node 里实例化各属性配置类），该方案**不执行任何组件代码**，规避了 `designerHostService` 依赖与模块循环引用；代价是清单为运行时面板的「超集」（条件显隐属性也会列出），且组件升级后需重跑脚本（本期明确不考虑）。详见「属性清单静态化（选定方案）」。


### 6. 自定义组件的分类、图标、顺序全部固定

- 工具箱分组：固定新增 `{ type: 'custom', name: '自定义' }`，追加在内置分组之后
- 条目图标：固定 `kuozhankaifa`（渲染为 `fd_pc-kuozhankaifa`，已确认存在于随包 iconfont）
- 显示顺序：数组顺序，不做排序配置
- 条目 `category`：固定为 `container`

**理由**：用户无需理解这些平台内部约定。`category` 固定为 `container` 是为了绕开 drop 分流的绑定弹窗（`input` / `dataCollection` 会弹窗），自定义组件第一期不做字段绑定。

**注意**：工具箱条目的 `category`（拖拽分流字段）与工具箱的分组（group）是两个不同概念，前者固定为 `container`。

### 7. 管理页登记只填「名称 / 类型 / 模块名」

`url` 由约定规则生成（`/platform/common/web/renderer/<文件名>`），`id` 自动生成，`enabled` 默认启用。

**理由**：`type` 与 `module` 由组件包作者决定、用户无从推断，因此必须作为显式输入；其余字段可推导。

**修订（联调期）**：曾尝试「从组件包产物解析导出成员名自动带出模块名」（拉取 `*.system.js` 文本，按 `exports("Name", …)` / `exports({ … })` 解析候选，单个直接填入、多个点选）。实测示例组件包导出 4 个成员（`QrScannerComponent` / `FQrScanner` / `FQrScannerDesigner` / `CONTROL_TYPE`），**推导结果不唯一**，且无法可靠判定哪个才是「模块名」，为避免登记出静默不生效的模块名，**已放弃该方案，恢复手工填写**（相关解析工具与候选交互已删除）。

### 8. 不修改 `@farris/ui-vue`，只依赖其公开扩展点

本变更的实现全部落在 `packages/designer` 与 app-center，ui-vue 源码零改动。所依赖的均为 ui-vue 已公开的契约（已核对 `@farris/ui-vue@1.6.5-beta.6` 的类型声明）：

- `designerContext.filterPropertyEntity` / `getPropertyFilterRule`：设计器上下文契约字段，且**调用点已存在**（`packages/designer/src/components/designer.component.tsx` 中「加载控件属性过滤规则」处），因此只需在 PC context 内实现，无需新增调用
- `propertyConfigSchemaMapForDesigner`：从包根导出（属性配置的原始注册表，属性元数据导出以此为准）
- `useThirdComponent()`：从包根导出；`window.F_THIRD_COMPONENTS` 的消费由 ui-vue 内部自动完成
- `FDesignerToolbox`：仅通过 `toolboxItems` prop 驱动，传入合并后的数据即可

**理由**：ui-vue 是外部依赖包、源码不在本仓库，改动它意味着要维护 fork、重新发版，并同步影响运行时渲染器，代价远高于在设计器侧实现。

**代价**：与 ui-vue 内部实现（属性路径拼接规则、`FDesignerToolbox` 的 prop 语义与响应性）保持隐式耦合，升级 ui-vue 时需回归验证。

## Risks / Trade-offs

- **工具箱数据源是「一次性快照」** → 本仓库 PC context 中 `toolboxItems` 是**普通数组**（`designer-context.ts` 声明为 `any[]`），`form-designer.component.tsx` 直接把它传给 `FDesignerToolbox`，而 ui-vue 内部 `ref(props.toolboxItems)` 会把该数组包成新的 Ref 且不监听其变化。→ 自定义分组**必须在工具箱首次渲染前**完成追加（本变更在 `main.ts` 中于 `mount()` 之前 `await` 完成合并）；配置读取失败必须降级为「内置分组」，不得白屏或无工具箱。
- **属性路径拼错导致静默失效** → 属性清单统一由设计器导出（决策 5），管理页不做任何路径推导；`path` 与过滤端使用同一套拼接逻辑。
- **属性配置含函数，无法直接序列化** → 导出时派生纯数据子集（控件的 `type`、分组的 id/name、属性的 id/title/path），不回传函数。
- **自定义组件的属性树依赖组件包已加载** → 未安装/未启用/加载失败的组件在管理页中不可配置属性可见性，需明确提示，避免用户误以为已配置生效。
- **全局黑名单只能基于「默认实例」取属性并集** → 属性配置可能依赖 `propertyData`（如表格列、按钮的 `enableType` 会条件性显隐属性），部分仅在特殊配置下出现的属性在管理页可能勾不到。第一期接受该限制。
- **组件包与 ui-vue 版本强耦合** → 组件包需以 SystemJS 格式、对着同一版 `@farris/ui-vue` 构建，且 `registerDesigner` 只收到 3 个参数（无 `registerContext`），属性配置需组件包自行写入 `propertyConfigSchemaMapForDesigner`。该契约需形成组件包开发规范并告知组件作者。
- **人工投放易错** → 压缩包内附 `README.txt` 写明覆盖路径；管理页在下载后提示目标目录与生效方式（刷新设计器页面）。生成清单时保留既有条目，避免覆盖导致既有组件失效。
- **设计器此前从不加载第三方组件** → 本变更让设计器开始调用 `loadThirdComponents()`，因此系统盘中既有的组件（如富文本编辑器 `FHtmlEditor`）将首次参与**设计时**注册。既有**数据**不受影响，但属于运行行为变化，需在设计器回归验证时一并确认；若确认有副作用，可在 `main.ts` 的加载处按模块名过滤，只加载本页签管理的组件（代价是设计时与运行时的组件集合不再一致）。
- **单个组件加载失败会影响同批次** → ui-vue 的 `loadThirdComponents` 内部使用 `Promise.all`，任一模块 import 或注册失败会中断该批次。已在外层捕获并提示，保证不影响设计器启动与内置功能，但失败批次中的其他组件可能不会注册。
- **新增启动期网络请求** → 配置读取失败必须静默降级，不阻断设计器启动。

## Migration Plan

> 分期交付：**功能2（自定义组件）**可独立上线；**功能1（属性可见性）**待属性清单数据源确定后补。

1. 部署新的 designer 产物（含属性过滤 + 第三方组件加载）
2. 在 `<inBuilder>/web/platform/common/web/renderer/` 下投放 `designer-config.json` 与 `third-party-components.json`（首次可先投放空配置，行为等同现状）
3. 人工将压缩包内的 `designer-config.json` 与 `third-party-components.json` 都覆盖到 `<web>/platform/common/web/renderer/`（两份 JSON 同层，**一次拷完**）；自定义组件包 `*.system.js` 另行拷贝到 `<web>/platform/common/web/renderer/third-party-components/`
4. 刷新设计器页面验证：工具箱出现「自定义」分组且可拖拽
5. 属性可见性上线前，需先具备「属性清单」数据来源（见「未决（阻塞）」），届时验证：属性面板按黑名单过滤

**回滚**：删除或置空上述配置文件（或恢复旧的 `third-party-components.json`），设计器即回到「展示全部属性 + 无自定义分组」的内置行为；前端页签可保留但不再产生配置包。

## Open Questions

- 组件包除 `*.system.js` 外是否需随包提供描述文件（`type` / `module` / `name`）以进一步减少人工输入？第一期按「管理页手工填写三项」实施，若组件作者提供描述文件则后续可自动带出。
- 配置生效是否需要设计器侧主动提示（如检测到配置版本变化后提示刷新），还是仅靠人工刷新页面？第一期按人工刷新处理。

### 未决（阻塞）：属性可见性配置的「属性清单」数据来源

**问题**：管理页要让人勾选属性，必须先拿到「控件类型 → 属性清单」。经源码分析与实测，这份清单**无法在设计器运行时之外获得**（证据见「实现期调整」第 4、5 条）。

**已评估的方案与各自不理想之处**：

| 方案 | 做法 | 为什么不理想 |
| --- | --- | --- |
| A（原设想） | ui-vue 提供公开 API，管理页直接调用 | **不成立**：属性配置类的构造依赖 `designerHostService`（内部还用 schemaService / viewModelId），且不存在「控件类型 → 属性配置类」的中心注册表 |
| A2 | ui-vue 增加 `propertyConfigFactoryMap`，各组件在 `registerDesigner` 注册自己的属性类；新增 `getControlPropertyMeta(type, designerHostService)` | 需改约 22 个组件的 `designer.ts` 各 1 行；仍需设计器上下文；ui-vue 与平台耦合加深 |
| A3 | ui-vue 在属性面板每个属性上加「隐藏」动作，配置随用随存 | 改变产品形态：从「管理页先看全量再勾选」变为「设计时顺手隐藏」；仍需 ui-vue 改面板 UI |
| A4 | 管理页纯手工录入「控件类型 + 属性路径」 | 全人工；路径拼错即静默失效，不可持续 |
| A6 | ui-vue 让 `FPropertyPanel` 暴露已解析出的属性配置；设计器在离屏容器里逐个创建控件、读回后删除 | 需在画布上反复创建/删除 22 个控件，慢，且有残留与副作用（变更集、视图模型）风险 |
| A7 | **构建期生成**：ui-vue 侧脚本直接实例化各控件的属性配置类（Node 环境 + 最小 hostService 桩），产出静态 `control-property-meta.json` 随包发布，管理页直接 fetch | 属性清单本质是静态元数据，构建期固化最干净、运行时零依赖；代价是 ui-vue 需维护生成脚本 + 一份显式的「类型 → 属性类」映射，并容忍缺少真实元数据时的降级 |

**结论（已决策）**：采用 **A7 的变体——源码静态扫描**（不再实例化属性配置类）：

- 扫描脚本：`apps/platform/development-platform/ide/app-center/scan-control-property-meta.mjs`（`npm run scan:property-meta`），AST 解析 ui-vue 源码产出 `control-property-meta.json`；
- 产物落地：`apps/platform/development-platform/ide/`（app-center 同源目录，dev 由 Vite 直接服务、部署后即 `/apps/platform/development-platform/ide/control-property-meta.json`）；
- 管理页**只读该静态文件**：进入页签自动读取；读不到时提示清单路径，由使用者确认投放后刷新页面（不设本地缓存、不提供手工导入入口）。

细节、取舍与验证见「属性清单静态化（选定方案）」。

**A7 可行性 spike 结果（已实测）**：尝试用 ui-vue 自带的 jest（`jest.config.js` 已配 babel 处理 TS/TSX、jsdom、`@farris/ui-vue/components/*` 别名）加载典型控件的属性配置类，**在导入阶段即失败，且既有 spec 同样失败**（`Tests: 0 total`）：

```
TypeError: Cannot read properties of undefined (reading 'InputBaseProperty')
  at Object.get [as InputBaseProperty] (components/property-panel/index.ts:34:31)
  at combo-list/src/property-config/combo-list.property-config.ts:6:40
  ... components/index.ts:21 → button → dynamic-view/maps → dynamic-form → property-panel → modal.property-config
```

即 `components/index.ts` 与 `property-panel/index.ts` 之间存在**循环依赖**——TS 的 `export { X } from` 编译为 getter，在模块部分初始化时被访问即抛错。**ui-vue 的测试基线当前是红的**，因此 A7 的前置成本不是「写一个快照测试」，而是「先修这条循环依赖」。改走 Node 侧独立打包（Vite/esbuild bundle + happy-dom 运行）可绕开 jest，但循环依赖的运行时语义未必能自动规避，需另行验证。

**影响（已更新）**：属性可见性（功能1）**已具备交付条件**——设计器侧属性**过滤**（黑名单 → `filterPropertyEntity`）与管理页侧的**静态属性清单**（见下「属性清单静态化（选定方案）」）均已实现，待按 `tasks.md` 任务组 11 做一次端到端联调验证；「自定义组件」（功能2）不受影响。

## 实现期调整（apply 阶段）

以下为实现过程中根据实际约束对方案做的调整：

1. **zip 打包不引入依赖**。本工程执行 `pnpm install` 会因虚拟存储目录配置冲突失败，无法新增 `jszip`。改为在 app-center 内自实现极简 zip 写入器（`src/utils/zip.ts`，仅 stored 方式、不压缩）。配置包内只有少量小体积 JSON，无压缩带来的体积可忽略。
2. **属性元数据导出依赖设计器真实渲染**。`registerDesignerComponents` / `loadDesignerRegister` 虽在 `@farris/ui-vue` 的 `.d.ts` 中声明，但**产物未导出**，无法无头触发注册；控件注册实际由画布组件在渲染时完成。因此属性清单必须由「打开了某个表单的设计器运行实例」产出。相应地：
   - 设计器侧在工具栏新增「导出属性清单」按钮（运行时定制模式不展示），点击后等待注册完成（最长 5s）并下载 `designer-property-meta.json`；未就绪时提示重试而不是产出空文件；
   - 管理页以「导入属性清单」为主路径，导入后**缓存到 localStorage**；
   - 设计器侧仍保留 `?exportPropertyMeta=1` + `postMessage` 回传通道作为备用（当前无调用方）。
   - **实测修正**：最初设计的「管理页隐藏 iframe 打开设计器导出模式」不可用——设计器页面在**没有表单元数据上下文**时自身会报错（`useExternalComponent` / `getModuleVariables` 读取 undefined schema），且导出能力也要等新版设计器部署后才存在。故改为人工「设计器导出 → 本页导入」。
3. **属性简化树的派生方式**。ui-vue 未公开属性配置的归一化 API，改为遍历公开导出的 `propertyConfigSchemaMapForDesigner`，用结构容错的遍历器（兼容 `categories` 为对象或数组、兼容级联子属性）派生；未输出的属性在管理页表现为「清单缺失」，可被使用者察觉而不会静默生效。

4. **属性清单导出实现已移除（原遍历方案被实测否决）**。用真实 `@farris/ui-vue@1.6.5-beta.6` + `pc-toolbox.json` 实测：工具箱 22 个控件类型的静态属性配置**全部为空对象**，遍历派生结果恒为 `{ controls: [] }`（0 个控件）。原因见下节「属性清单可行性结论」。因此已删除设计器侧「导出属性清单」按钮、`property-meta-export.service.ts` 与 `?exportPropertyMeta` 通道；管理页暂只保留「导入属性清单」入口，属性可见性区块的自动数据源待方案确定后补齐。

5. **属性清单可行性结论（阻塞项）**。属性面板属性的产生链路为：
   `FPropertyPanel` → `getPropertyConfigBySchema`（静态配置为空时）→ `designerItem.getPropConfig()` → `designerRules.getPropsConfig()` → `new XxxProperty(componentId, designerHostService).getPropertyConfig(schema, componentInstance)`。
   其中 `XxxProperty`（如 `InputGroupProperty extends InputBaseProperty`）构造依赖 `designerHostService`，内部还用到 `this.schemaService`、`this.viewModelId`。由此得出三条硬依赖：
   - 不存在「控件类型 → 属性配置类」的中心注册表（`designerRules` 由各设计时组件在自己的 setup 中创建，无法按类型反查）；
   - 属性配置类需要 `designerHostService`（设计器运行时才有）；
   - 部分控件还需 `componentInstance`。

   因此「由 ui-vue 提供 API，让 app-center 在无设计器上下文时自动获取属性清单」**不成立**，需要改为由设计器运行时参与产出。

## 联调验证与实现补充（2026-10）

### 验证结论

联调已完成（结论见 `proposal.md`「验证记录」）：投放组件包并在管理页登记启用后，设计器工具箱出现「自定义」分组、可拖入画布、设计时与运行时均可渲染；管理页的登记 / 启停 / 删除 / 导出配置包流程走通。

### 实现事实（以现有代码为准）

**管理页（app-center「组件配置」页签，内含「自定义组件」「组件属性可见性」两个页签）**

- 列表用 `FDataGrid`：`data` 只作初始值，增删改一律 `gridRef.updateDataSource()`，且**必须传克隆行**——网格会往行对象写内部字段（`__fv_data_index__`、`__fv_checked__` 等），直传 `designer-config.json` 里的对象会把这些字段带进保存结果。启用勾选、删除都按 `type` 回找配置里的原对象。
- 操作列**自声明**（`field: '__command__'` + `columnTemplate` 自绘「删除」）。原因：`FDataGrid` 默认操作列由 `commandOption` 触发，其表头取 `t('datagrid.commandColumn.title')`；行号列表头同理取 `t('datagrid.lineNumberTitle')`。本工程 app-center 入口是 `app.use(Locale, { uri: '' })`、**未加载 ui-vue 的语言资源**，这两处会落成英文（`Operation` / `NO.`）。因此行号列显式给中文标题（`rowNumber={{ enable: true, heading: '行号' }}`），操作列改为自声明列并写 `title: '操作'`。
- 自适应列宽：`columnOption={{ fitColumns: true, fitMode: 'expand' }}`。
- 登记表单用 `FInputGroup`（`modelValue` + `onUpdate:modelValue`，与仓库内既有用法一致），确定/取消用 `FButton`。**`FButton` 不读 `text` 属性**（只作为 attr 透传），文案必须写成默认插槽子节点。
- 「类型」是设计器注册表与属性配置的 key、组件包地址由其派生，因此登记项**不提供就地修改**，操作列只保留「删除」，改类型需删除后重新登记。

**设计器（packages/designer）**

- 启动期分别读取 `designer-config.json`（黑名单 + 登记）与 `third-party-components.json`（加载清单），任一失败各自降级、不阻断启动；「自定义」工具箱分组必须在 `mount()` 之前完成合并。
- **产物补丁（重建设计器产物后需重新确认）**：`@farris/ui-vue` 的 `useThirdComponent()` 以 `useFarrisConfig().value.basePath` 拼加载清单地址；本工程未安装 ui-vue 默认插件、`basePath` 为 `undefined` 时会拼出 `undefined/platform/common/web/renderer/third-party-components.json?v=...`，导致自定义组件加载不到。已在设计器产物 `dist/assets/ui-vue.js` 中把该处解构补成 `const { basePath = '' } = useFarrisConfig().value`（`packages/designer/dist` 是构建产物，重新构建会覆盖，需同步确认）。根治方式是宿主侧 `app.use(UiVue, { basePath: '' })`，或由组件包/宿主显式传绝对清单地址。

## 属性清单静态化（选定方案）

### 方案

用**源码静态扫描**产出「控件类型 → 属性清单」，作为属性可见性的可选项来源（替代「设计器运行时导出」与「人工逐条录入」）：

| 环节 | 落点 |
| --- | --- |
| 扫描脚本 | `packages/ide/apps/platform/development-platform/ide/app-center/scan-control-property-meta.mjs`（`npm run scan:property-meta`；支持 `--debug <类型>`、`--ui-vue`、`--toolbox`、`--out`） |
| 扫描输入 | `@farris/ui-vue` 组件源码（`components/*/src/property-config/*`、`components/property-panel/src/composition/entity/*`、`data-view/designer/property-config/*`）+ `packages/designer/src/components/types/toolbox/pc-toolbox.json`（决定扫哪些类型） |
| 产物 | `apps/platform/development-platform/ide/control-property-meta.json`（部署后即 `/apps/platform/development-platform/ide/control-property-meta.json`，与 app-center 同源，dev 下由 Vite 直接服务、不经 `/platform/**` 代理）；该文件既非 Vite 入口也不在 `public/` 下，故由 `vite.config.build.ts` 的 `copy-app-runtime-files` 插件在 `closeBundle` 时拷到 `dist/apps/platform/development-platform/ide/` | |
| 读取 | `services/designer-property-meta.service.ts#fetchStaticPropertyMeta()`：进入页签时自动 fetch（带 `?v=` 防缓存）；解析失败/404 时清空清单并提示清单路径。**单一来源**：无 localStorage 缓存、无手工导入入口 |

### 解析要点（保证 path 与过滤端一致）

- `.json` 形态的属性配置直读；`.ts/.tsx` 走 TypeScript AST，**不执行组件代码**（规避 `designerHostService` 依赖与 `property-panel` 循环引用）。
- 沿 `extends` 链合并基类的分类/属性（子类同名覆盖），并解析实际代码里的写法：`categories['x'] = this.getXxx(...)`、`categories = { basic, appearance }` 简写、方法内 `const yyy = {...}` 再 `return yyy`、`const self = this; self.getXxx()`、`this['getXxxProperties']()`、`super.getBasicPropConfig()`、`useColumnOption().getColumnOptionProperties()` 这类 hook 工厂，以及 `getComponentConfig(propertyData, info, properties)` 第 3 个入参（组件自有编辑器属性）。
- 兼容两种分类定义风格：**赋值式**（`this.propertyConfig.categories['x'] = …`，多数内置控件）与**返回式**（`getPropertyConfig` 直接 `return { type, categories: { … } }`，如 lookup）。返回式一旦命中即视为该控件的**权威分类表**（清掉赋值式收集结果）——因为子类重写了 `getPropertyConfig` 后，基类那份赋值代码在运行时根本不会执行，否则会出现「编辑器」分类重复。
- 取值还会跟进：直接调用普通函数（模块级 `function` / `const` 箭头函数，如 lookup 的 `getPageConfig()` → `getLookupPaginationProperties()`）与解构赋值（`const { dataSourceEditor, idFieldEditor } = getLookupEditorCommonProperties(...)`）。
- 属性路径按过滤端同一套规则生成：`分类.parentPropertyID + 属性.parentPropertyID + 属性ID`；「外观」分类下未声明父级的 class/style 补 `appearance.`；级联子属性以父属性路径为前缀展开。
- 跳过源码里显式 `visible: false` 的属性（这些在真实面板中不出现）。

### 取舍

- **清单是运行时面板的「超集」**：条件显隐（`visible: propertyData.xxx`）的属性也会列出；对黑名单语义无害。
- **容器类控件（tabs / fieldset / content-container 等）面板偏薄**：这类面板大量依赖运行时 schema，静态扫描只能拿到字面量部分。
- **组件升级需重跑脚本**：产物带 `generatedAt` / `source` 字段便于识别陈旧；本期明确不考虑组件更新。
- **只能用于黑名单，不能当白名单**：清单缺项 → 该属性无法被配置（黑名单语义下只是少一个可关闭项）；若将来改为白名单语义，必须先补全清单。
- **单一来源**：管理页只读该静态文件，不提供本地缓存与手工录入入口——清单变更需重新投放（或重跑扫描脚本并重新部署）。
- **不覆盖自定义组件（本期决策：不支持配置）**：清单由扫描 `@farris/ui-vue` 源码产出，只含内置控件；自定义组件的属性配置由组件包在运行时向设计器注册（`propertyConfigSchemaMapForDesigner`），管理页拿不到，故「组件属性可见性」页签只列内置控件，并在说明中提示「自定义组件的属性可见性暂不支持配置」。备选方案（管理页手工录入路径 / 组件包随包提供属性清单并合并 / 设计器运行时导出）已评估但不在本期范围，见 `tasks.md` 11.7。

### 验证（生成时实测）

对 `@farris/ui-vue` 现源码：**23 个类型全部解析成功**（22 个工具箱类型 + 附加的 `data-grid-column`），**449 条属性 / 102 个分类**、0 条告警；无空分类名，除 `response-layout` 的 `layout` 外无空标题（页面以属性 id 兜底展示）。样例 `input-group` 得到 `appearance.class`、`editor.readonly`、`editor.type`、`formatValidation.type`、`binding` 等路径；`lookup` 得到 `basic(7) / appearance(4) / behavior(1) / lookup(21，编辑器) / pager(3，分页) / dialog(9) / treeConfig(9) / navigatiorConfig(4) / searchConfig(3)`。

> 顺带发现（既有问题，非本变更引入）：RTC 白名单 `packages/designer/public/assets/rtc/property-rule.json` 里 `input-group` 写的是扁平 `readonly` / `required` / `placeholder`，而按运行时规则其真实路径是 `editor.*`，这些条目匹配不到——该白名单在 RTC 下会把这些属性隐藏。本变更不处理，另行评估。

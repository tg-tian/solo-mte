> **交付状态（联调验证后）**
>
> - **功能2（自定义组件）：已完成并通过联调验证**，可独立上线 —— 任务组 3～7；验证项见任务组 8 的 8.3～8.5、8.7、8.8 与 `proposal.md`「验证记录」。
> - **功能1（属性可见性）：已具备交付条件，待端到端联调验证**。属性**过滤**能力（任务组 1）已实现；「控件属性清单」的数据来源已定并落地——改为**源码静态扫描**产出 `control-property-meta.json`、随 IDE 应用部署、管理页自动读取（任务组 11；方案见 `design.md`「属性清单静态化（选定方案）」）。任务组 2 的原「设计器运行时导出」方案已废弃并删除实现。
> - 联调期补充交付见任务组 10；决策结论见任务组 9。

## 1. 设计器 · 属性可见性过滤

- [x] 1.1 在 `packages/designer/src/components/composition/designer-context/use-pc-designer-context.ts` 新增配置读取与缓存：GET `<basePath>/platform/common/web/renderer/designer-config.json`，请求失败/解析失败时降级为空黑名单且不抛错
- [x] 1.2 在同文件实现 `getPropertyFilterRule()`，在设计器挂载时触发一次配置读取
- [x] 1.3 在同文件实现 `filterPropertyEntity(propertyConfig, propertyData)`：按属性路径黑名单过滤属性、隐藏被清空的分组；路径拼接规则（`分组.parentPropertyID + 属性.parentPropertyID + propertyID`，外观分组 `class`/`style` 补 `appearance.`）与 `use-pc-rtc-designer-context.ts` 保持一致
- [x] 1.4 确认两个钩子经 `UseDesignerContext` 返回并在 PC 模式下被 `FPropertyPanel` 调用生效
- [x] 1.5 确认 PC_RTC 模式仍走既有 `assets/rtc/property-rule.json` 白名单，本配置不影响该模式

## 2. 设计器 · 属性元数据导出（已回滚，待数据源方案确定后重做）

> **方案已废弃**：原「设计器运行时导出属性清单」经实测否决（遍历静态属性配置恒为空，见 `design.md`「实现期调整」第 4、5 条），相关实现（工具栏按钮 / `property-meta-export.service.ts` / `?exportPropertyMeta` 通道）已删除。属性清单改由**源码静态扫描**产出，见任务组 11。

- [x] 2.1 下线原方案实现：删除设计器侧「导出属性清单」按钮、`property-meta-export.service.ts` 与 `?exportPropertyMeta` 通道，避免留下无法工作的入口
- [x] 2.2 属性清单的形态（控件类型 → 分组（标识、名称）→ 属性（标识、标题、路径），路径用统一拼接规则）在静态扫描方案中沿用（任务组 11）

## 3. 设计器 · 自定义组件加载与工具箱合并

- [x] 3.1 在设计器启动流程中调用 `@farris/ui-vue` 的 `loadThirdComponents()`；加载失败时提示且不阻断启动
- [x] 3.2 读取 `designer-config.json` 的 `customComponents` 并筛选 `enabled` 为真的记录
- [x] 3.3 向 `designerContext.toolboxItems.value` 追加 `{ type: 'custom', name: '自定义', items: [...] }`，并保证在设计器渲染工具箱前完成合并
- [x] 3.4 自定义条目字段固定：`icon: 'kuozhankaifa'`、`category: 'container'`、`name` 取登记名称、`type` 取登记类型
- [x] 3.5 无已启用且注册成功的自定义组件时不追加「自定义」分组
- [x] 3.6 校验合并时机：设计器打开后自定义分组即可见，不依赖渲染后刷新，且不出现空工具箱或漏项

## 4. app-center · 页签与页面骨架

- [x] 4.1 在 `packages/ide/apps/platform/development-platform/ide/app-center/src/app.tsx` 的 `ViewKey` 与 `navData` 中新增「自定义组件」项
- [x] 4.2 新增页签页面组件，包含「内置组件属性可见性」与「自定义组件」两个配置区，并接入 `currentView` 渲染分支
- [x] 4.3 定义配置数据结构类型：`hiddenProperties`（控件类型 → 隐藏属性路径数组）与 `customComponents`（标识/名称/类型/模块名/组件包地址/启用状态）

## 5. app-center · 配置读取与编辑

- [x] 5.1 新增 api 模块读取 `designer-config.json` 作为初值；404 时以空初值初始化并提示「尚未生成配置」
- [x] 5.2 属性清单由随应用部署的静态文件提供，管理页读取后直接使用（原「手工导入 + localStorage 缓存」入口在联调后按简化要求移除，见 11.3）
- [x] 5.3 实现「内置组件属性可见性」区：控件列表 + 属性勾选，默认全部勾选，取消勾选即写入黑名单，重新勾选即移除
- [x] 5.4 某控件属性清单不可用时给出提示并禁用其编辑入口，不得以空清单伪装成功
- [x] 5.5 实现「自定义组件」区：列表展示、新增表单（名称/类型/模块名，含必填校验与类型重复校验）、启用开关
- [x] 5.6（已按 11.7 调整）自定义组件本期不支持配置属性可见性：「组件属性可见性」页签只列内置控件并在说明中提示；原「组件未安装或未启用」提示与自定义组件条目一并移除

## 6. app-center · 配置包导出

- [x] 6.1 为 app-center 提供 zip 打包能力（本工程 `pnpm install` 因虚拟存储目录配置冲突不可用，改为自实现 stored 方式的极简 zip 写入器 `src/utils/zip.ts`，不引入依赖）
- [x] 6.2 实现保存：序列化 `designer-config.json`，并派生 `third-party-components.json`（仅含启用记录的 `{ url, module }`；**同时原样保留文件中已有的、非本页签管理的既有条目**，避免覆盖时丢失如富文本编辑器等既有数据）
- [x] 6.3 打包为 `designer-config.zip` 触发浏览器下载，包内附 `README.txt` 说明覆盖路径
- [x] 6.4 下载完成后提示解压覆盖到 `<inBuilder>/web/platform/common/web/renderer/` 并刷新设计器页面生效
- [x] 6.5 将保存动作封装为单一出口函数，便于后续替换为后端接口调用（预留 `PUT /api/.../designer-config`）

## 7. 配置样例与组件包规范

- [x] 7.1 提供空 `designer-config.json` 样例与投放说明（`third-party-components.json` **不发空样例** —— 系统盘已有既有条目，空文件会覆盖导致既有组件失效）
- [x] 7.2 编写自定义组件包开发契约说明：SystemJS 模块、需同时提供 `register` 与 `registerDesigner`、属性路径遵循统一拼接规则、条目按 `container` 处理

## 8. 验证

> 功能2 的验证项（8.3～8.5、8.7、8.8）已随联调完成，结论汇总见 `proposal.md`「验证记录」；功能1 的验证项（8.1、8.2、8.6）待其数据源方案确定后执行。

- [ ] 8.1 配置黑名单后，选中控件时右侧属性面板按预期隐藏属性与空分组
- [ ] 8.2 配置文件缺失、请求失败或格式损坏时，设计器正常降级为展示全部属性且不白屏
- [x] 8.3 投放自定义组件包后，工具箱末尾出现「自定义」分组，条目图标与名称正确，可拖入画布且不弹出绑定对话框
- [x] 8.4 未启用的自定义组件不出现在工具箱，也不出现在导出的 `third-party-components.json` 中
- [x] 8.5 组件包缺失或加载失败时，其余组件与内置功能不受影响
- [ ] 8.6 PC_RTC 模式属性面板行为回归通过
- [x] 8.7 既有数据回归：用系统盘现有的 `third-party-components.json`（含 rich-text-editor 与 `key` 字段）走一遍保存，校验生成结果完整保留该条目，且停用/删除自定义组件不影响它
- [x] 8.8 设计器新增加载第三方组件后，确认既有组件（`FHtmlEditor`）参与设计时注册未产生副作用

## 9. 阻塞项（已决策）

- [x] 9.1 确定「控件属性清单」的数据来源：选定 **A7 变体——源码静态扫描**（不执行组件代码，规避 `designerHostService` 依赖与 `property-panel` 循环引用），评估过程与结论见 `design.md`「未决（阻塞）」及「属性清单静态化（选定方案）」
- [x] 9.2 按选定方案实现清单获取：扫描脚本 + 静态产物 + 管理页自动读取（任务组 11），原任务组 2 的运行时导出能力不再恢复
- [ ] 9.3 数据源就绪后，验证依赖清单的交互：任务 5.3 / 5.4 / 5.6 与 8.1（落到 11.5 一次性联调）
- [x] 9.4 范围决策结论：功能1 本期**交付**，无需按「不交付」处理（不下线属性可见性区块）

## 10. 联调期补充交付（实现调整）

- [x] 10.1 管理页「自定义组件」列表改用 Farris 数据表格：列为 名称 / 类型 / 模块名 / 组件包 / 启用，行号列表头固定「行号」，开启自适应列宽（`columnOption={{ fitColumns: true, fitMode: 'expand' }}`）
- [x] 10.2 表格数据变更统一走 `gridRef.updateDataSource()`，并传入克隆行——网格会往行对象写内部字段（`__fv_*`），直传配置对象会把这些字段带进保存结果；启用勾选按 `type` 回写配置
- [x] 10.3 操作列改为自声明列（`columnTemplate` 自绘「删除」）：默认操作列表头走 i18n，本工程未加载 ui-vue 语言资源时会显示为 `Operation`，自声明列可固定中文表头；登记项不支持就地修改，「查看」按钮已移除
- [x] 10.4 登记表单改用 Farris 控件（`FInputGroup` 承载四个字段、`FButton` 承载确定/取消），字段宽度固定 500px；「新增自定义组件」入口移到面板右上角
- [x] 10.5 文案对齐：① 勾选「启用」后该组件才会被设计器加载；② 组件包需拷贝到 `/platform/common/web/renderer/third-party-components/` 并打包为 SystemJS 格式（rollup `format: 'system'`），同时把 `vue`、`@farris/ui-vue` 作为外部依赖
- [x] 10.6 设计器产物中为第三方组件清单地址补 `basePath` 兜底：未配置时不再拼出 `undefined/platform/...`，自定义组件可正常加载
- [x] 10.7 记录「模块名从组件包自动识别」方案已放弃：组件包导出成员不唯一（示例包有 4 个导出），恢复手工填写（见 `design.md` 决策 7 修订）
- [x] 10.8 修复 app-center 未加载 Farris 语言资源：入口由 `app.use(Locale, { uri: '', locale: 'zh-CHS' })` 改为 `app.use(FarrisUI)`（ui-vue 默认插件内部会带 `localResources: { 'zh-CHS': 内置中文资源 }`）。原因是 Locale 插件只在 `config.uri` 非空时才请求语言文件，`uri: ''` 且未传 `localResources` 时语言包为空，组件内的 key（如 `datagrid.emptyMessage`）会原样显示。注意：默认插件的 options 是整体替换而非合并，因此**不能**只传 `{ locale: 'zh-CHS' }`，否则会丢掉内置资源
- [x] 10.9 管理页布局拆分：属性可见性与自定义组件改用 `FTabs` + `FTabPage` 两个页签（此前两块纵向排列，属性区一长就把自定义组件顶出屏幕）；「自定义组件」页签内的表格改为切到该页签才渲染（隐藏状态下渲染会按 0 宽度算列宽），切换时重推一次数据源
- [x] 10.10 命名与页签顺序定稿：页头标题改为「组件配置」并加一行副标题，顶部导航文案同步；两个页签定名「自定义组件」「组件属性可见性」，且「自定义组件」在前（默认停留），组件属性可见性在后

## 11. 属性清单静态化（属性可见性的数据来源）

- [x] 11.1 新增扫描脚本 `app-center/scan-control-property-meta.mjs`：TypeScript AST 解析 ui-vue 控件属性配置（继承链合并、hook 工厂、`super` 调用、`getComponentConfig` 入参、`this['getXxx']`），按过滤端同一套规则生成属性路径，并跳过源码中显式 `visible: false` 的属性
- [x] 11.2 产出 `control-property-meta.json` 到 `apps/platform/development-platform/ide/`（与 app-center 同源，dev 下 Vite 直接按磁盘提供），并加 `npm run scan:property-meta` 入口（支持 `--debug <类型>` 等参数）；构建侧在 `vite.config.build.ts` 新增 `copy-app-runtime-files` 插件，把该文件拷到 `dist/apps/platform/development-platform/ide/`（该文件既非 Vite 入口也不在 `public/` 下，不拷就不会进产物），部署时随 dist 一起上线、无需单独手工拷贝
- [x] 11.3 管理页改为**只读静态清单**：进入页签自动 fetch（带 `?v=` 防缓存）；读取失败时清空清单并提示清单路径（不再写/读 localStorage 缓存，也不提供「导入属性清单」「清空缓存」入口）
- [x] 11.4 页面适配清单形态：分类标题显示条数、属性标题缺失时以属性 id 兜底、内置/自定义列表显示数量、空态文案改为「请确认清单已随应用部署，然后刷新页面重试」
- [ ] 11.5 端到端联调：投放 `control-property-meta.json` → 页面读出 23 个内置类型 → 取消勾选若干属性 → 保存并覆盖配置 → 设计器属性面板按黑名单隐藏（含「PC_RTC 模式不受影响」回归，即 8.1 / 8.6）
- [x] 11.7 决策：**本期不支持自定义组件的属性可见性配置**（联调反馈后确认）。原因：静态清单只覆盖内置控件（扫描 `@farris/ui-vue` 源码），自定义组件的属性配置由组件包在运行时向设计器注册（`propertyConfigSchemaMapForDesigner`），管理页拿不到。已评估备选：① 管理页手工录入属性路径（路径易错）；② 组件包随包提供 `<type>.property-meta.json` 并由页面合并（可行，待需要时再做）；③ 恢复「设计器运行时导出」（成本最高）。随之调整：「组件属性可见性」页签只列内置控件，说明中提示自定义组件暂不支持；`hiddenProperties` 中已有的自定义组件条目保存时原样保留
- [x] 11.6 扫描脚本补齐取值能力（联调反馈「lookup 提取不全、分页配置缺失」）：① 支持 `getPropertyConfig` 直接 `return { type, categories: {...} }` 的新写法，且以该返回值为该控件的权威分类表（子类重写后基类的赋值式代码运行时并不执行，避免重复分类）；② 支持直接调用普通函数（模块级 function / const 箭头函数，如 `getPageConfig()` → `getLookupPaginationProperties()`）；③ 支持解构赋值（`const { dataSourceEditor } = getLookupEditorCommonProperties(...)`）。结果：lookup 由 15 条属性 / 4 个分类提升到 61 条 / 9 个分类（新增分页、帮助窗口、树形数据配置、导航栏、搜索等），全量属性 397 → 449 条，告警 0

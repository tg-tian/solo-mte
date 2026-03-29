本次改造学习记录（domain 应用）

1. 已按要求先清空 domain 目录旧实现文件，再以 device-list 同类结构重建为 Vue 应用。
2. 新结构为：index.html + src/main.ts + src/views + src/store + src/api + src/types + src/utils + src/assets。
3. main.ts 采用 createApp + ElementPlus + Pinia + pinia-plugin-persistedstate，与 device-list 初始化模式一致。
4. 领域数据改为 store 统一管理，api 层负责获取并归一化，视图层只做展示与交互。
5. 为保证原页面可正常运转，保留了以下核心行为：
   - 领域列表展示；
   - 状态筛选与名称筛选；
   - 点击“领域建模”与“场景设计”后通过 window.top.postMessage 打开目标地址。
6. 数据读取保持“远端优先 + 本地兜底”，本地仍复用 src/assets/domains.json，确保后端不可用时页面正常展示原有领域信息。
7. 本次 UI 修正的关键不是单纯换组件，而是恢复原有视觉体系依赖：
   - 在 domain/index.html 恢复 /assets/farris-all.css 与 /assets/icon/iconfont.css；
   - 根节点恢复 class="solo-admin"，让全局管理后台样式生效。
8. 领域页面视觉已按场景页面风格对齐，核心样式策略：
   - 卡片使用 card-background.png、同款圆角与阴影层级；
   - 状态标签使用与场景页一致的 testing/published/editing 三态颜色；
   - 卡片底部操作按钮默认隐藏，hover 后显示，保持交互一致性。
9. 结构上保持“新架构 + 旧视觉”的组合思路：
   - 架构继续使用 Vue + ElementPlus + Pinia 的模块化组织；
   - 视觉语义复用原 Farris class 体系（f-page、f-template-card-row、f-icon 等）。
10. 对后续改造的经验：
   - UI 迁移优先保留设计系统入口（全局 css、iconfont、容器 class）；
   - 再做组件层替换，否则容易出现“功能正常但风格丢失”的问题。

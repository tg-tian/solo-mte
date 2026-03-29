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

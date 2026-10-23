# 场景平台部署脚本说明

## 业务背景

这是一套用于部署「场景低代码开发平台（SOLO）」的自动化脚本。一个 IDE 实例可服务多个用户：浏览器读取运行环境返回的 `userInfo.userId`，再查询该用户可见的场景、区域和设备。

一个场景的数据分散在三个地方：

- **MySQL 数据库**：存储场景的基础表结构和业务数据
- **后端服务**（端口 8080）：管理场景数据，为前端提供 API 接口
- **用户资源关联**：`user_resource_rel(user_id, resource_type, resource_id)` 决定当前用户可见的数据；IDE 不再读取共享 `.config` 文件

初始化包导入后，场景、领域、模型、模板和构件仍是共享资源，通过关联表确定用户可见性。不同用户导入同一资源时增加关联；更新或删除共享资源仍会影响其他关联用户。

## 多用户初始化

```bash
bash scripts/sp-initialize.sh /root/industrial.zip user1
bash scripts/sp-initialize.sh /root/agricultural.zip user2
```

目标用户依次取：第二个参数、`SOLO_USER_ID` 环境变量、包内 `scene.json.userId`、`manifest.json.userId`。均缺失时拒绝导入。这里不校验用户密码。

IDE 从同源 `/api/runtime/sys/v1.0/userinfos/data` 读取 `userInfo.userId`，查询 `/workbench/all-scenes?userId=...`。有多个场景时可在顶部切换，选择记录按用户保存在浏览器会话中；URL 中的 `sceneId` 也必须位于当前用户可见列表内。没有可见场景时显示空状态，接口失败时显示错误，不回退共享配置。

## 服务部署顺序与设备过滤

1. 先部署已支持用户过滤的元建模后端；两套数据库都需要 `user_resource_rel`。
2. 更新设备接入平台。它沿用当前设备库地址（数据库配置或 `MAPPER_LOADER_URL`），向该后端查询当前用户的模型，HTTP 请求和 `/ws` 连接必须携带 `userId`。该地址应指向当前 IDE 初始化数据所在的后端。
3. 更新 IDE 前端，保留同源 `/api`、`/workbench`、`/devices`、`/deviceShadows`、`/discoverDevices`、`/providers`、`/system`、`/ws` 的转发；代理需要保留查询参数。
4. 为目标用户执行上述初始化命令，刷新 IDE。

物理设备采集、Mapper 加载与影子存储继续共用，不添加设备所属用户字段。设备可见性由其 `metaModel.modelId` 是否在用户可见模型中决定：共享模型的用户会看到同一批设备，无匹配元模型的设备不会返回。设备新增、修改、删除和命令接口同时检查该范围；请求体不能自行改变设备模型以绕过过滤。

WS 每 30 秒刷新可见模型；刷新失败关闭连接，关联撤销最多延迟 30 秒停止推送。关联变更后刷新页面会同时重新加载列表。供应商和设备库连接配置仍是平台级共享设置。

前后端按约定信任传入的 `userId`，本改造不提供登录或身份鉴权。

---

## 五个脚本分别做什么

### sp-install.sh — 环境初始化

这是整个流程的第一步，负责搭建运行环境。

拉取镜像并通过 `docker-compose up -d` 更新服务，等待 MySQL 和后端就绪。保留数据卷及已有用户数据。

**为什么需要这一步**：因为场景中有些数据是通过 SQL 文件导入数据库的，有些是通过后端 API 导入的，这两者都需要对应的服务已经在运行。

**注意**：每个用户导入场景时无需重装环境。

---

### sp-import.sh — 数据导入

环境就绪之后，这一步负责把场景数据导入到系统中。

在独立临时目录中解压场景包，仅在空数据库时导入基础 SQL；补建 `user_resource_rel` 后，把压缩包及目标 `userId` 提交到 `/scenes/import`。临时目录在退出时清理，多用户导入不会互相清理工作目录。

**这一步完成后**：后端已保存资源并建立目标用户关联，刷新 IDE 即可读取。

---

### sp-deploy.sh — 配置部署

该命令保留为兼容入口，转调 `sp-import.sh <scene.zip> [userId]`。它会导入数据并建立关联，不再复制 `scene.config`、覆盖公共 Web 文件或重启 IDE。已导入的场景无需重复部署配置。

---

### sp-templates.sh — 自定义模板部署

这是旧的全局静态模板部署工具，会把场景包中的 `templates.json` 转成共享文件。多用户初始化不再自动调用它，避免把某个用户的定制模板发布到所有用户的静态索引。模板数据由导入接口保存在后端并关联用户。

它会筛选页面级模板和控件级模板：页面级模板写入 `farris-vue-form-templates`，控件级模板合并到 `farris-designer/assets/widget-templates.json`。

**这一步完成后**：表单向导能看到自定义页面模板，设计器模板面板能看到自定义控件片段。

---

### sp-initialize.sh — 场景初始化

这个脚本把场景初始化需要的步骤串联起来，按顺序自动执行。

只执行用户范围的数据导入与关联，不调用全局模板部署或复制共享场景文件。传入场景包和目标用户即可。

---

## 脚本之间的关系

首次部署环境时运行 `sp-install.sh`；之后每个用户只需运行 `sp-initialize.sh <scene.zip> [userId]`，实际由 `sp-import.sh` 调用后端导入。IDE 按登录用户查询后端，无需部署用户专属 IDE 实例。

`sp-templates.sh` 只管理旧的共享静态模板，不属于用户数据隔离流程。外部公共模板库也继续按原有规则展示，不代表用户私有资源。

---

## 使用方式

### 一键部署（最常见）

```bash
./sp-initialize.sh <场景压缩包路径> <userId>
```

例如：

```bash
./sp-initialize.sh /root/LCTechPark.zip admin
```

如果不传参数，脚本会交互式提示输入。

### 分步执行

```bash
# 仅首次搭建或更新公共服务时执行，保留数据卷
./sp-install.sh

# 给指定用户导入场景
./sp-import.sh /root/LCTechPark.zip admin
```

## 注意事项

- 历史资源不会自动关联给 admin；需要导入资源包或调用元建模后端 `/user-resources` 建立关联。
- 导入已有资源仍沿用后端原有覆盖/更新行为，不是给每个用户复制一份数据。
- 所有脚本在后端服务器执行，继续使用现有数据库连接信息。
- 包中需有根目录 `scene.json`；只有初始化空数据库时才需要基础 SQL。

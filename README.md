## SOLO项目集成代码仓

本代码仓供项目各单位提交用于集成的代码、制品。

SOLO运行基座（目前是[inBuilder社区版](https://ibc.inspures.com/inbuilder/community/download/index.html)）不在本代码仓中，需要各单位各自下载安装部署，并针对本单位的工作内容先行集成、测试。在本地集成调试成功后，再上传本仓更新。

项目集成组将获取本仓代码等各种制品，在集成服务器（IP稍后公布）上进行集成，并形成基线。如集成中出现新的问题，需要各单位进一步调试并修正代码、重新上传，等待后续集成。

集成服务器上的内容，将定期发布到正式演示服务器（IP也稍后公布）上。



## 开发环境配置

### 1、inBuilder社区版安装

inBuilder下载地址：[inBuilder下载页](https://ibc.inspures.com/inbuilder/community/download/index.html)。安装包大约1.8GB。

请查看在线[安装文档](https://ibc.inspures.com/inbuilder/community/docs/#/doc/md/iGIX%2Fcommunity_2210%2Fquickstart%2Fbuilding-development-environment%2Fenvironmentinit.md)。需注册inBuilder社区账号。

注：inBuilder社区版目前仅作为运行基础设施。后续项目组将进一步精简和集成基座功能。

如以前安装过老版本的inBuilder，请删除后重新安装。

### 2、开发环境配置

开发所需的基础环境如下。

| 组件                  | 版本      | 用途                     | 安装检查命令               |
| ------------------- | ------- | ---------------------- | -------------------- |
| **Node.js**         | 22.17.0 | 构建前端项目                 | `node -v`            |
| **npm / yarn**      | 10.9.2  | 安装依赖与打包                | `npm -v` / `yarn -v` |
| **Maven** *(仅后端需要)* | 3.6.3   | 编译 Java Spring Boot 项目 | `mvn -v`             |

### 3、打开运行框架基座项目

package/workbench是元工具环境中元级定义能力模块。
package/ide是元工具环境中低代码开发能力基座模块，可作为场景平台的实现基座。
它们都是完整的vite前端项目，可用开发环境打开，使用npm install获取依赖。

package下其他目录的作用将另行说明。项目也可在package下用pnpm过滤相应模块启动，相关说明后续更新。

### 4、运行框架基座

在开发环境命令行下到workbench或者ide下使用npm run dev可分别启动元级定义能力模块或低代码开发能力基座模块。
workbench正常启动后访问Local:   http://localhost:5173/ 即可查看网页界面。
ide正常启动后有两个应用地址：
- 应用中心（相当于场景平台的首页）访问 http://localhost:5173/apps/platform/development-platform/ide/app-center/index.html
- 应用构造工具（相当于场景平台中开发单个应用时的开发环境）访问 http://localhost:5173/apps/platform/development-platform/ide/app-builder/index.html

如果启动时出现依赖包缺失，则手工npm install缺失的包应能修复。

## 如何在基座上开发新的功能

（待补充）



## 部署方式

（待补充）

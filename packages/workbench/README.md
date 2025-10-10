# 运行环境配置指南

本项目将实现场景计算元工具平台，以UBML项目社区发型版inBuilder社区版为基础运行环境，在运行项目之前需要注意以下前置工作。

## 配置本地代理服务

在开发模式下，可以通过配置代理服务，实现与inBuilder社区版集成调试，配置方式如下。

编辑`vite.config.dev.ts`配置文件，在配置文件中增加`proxy`配置节点，如下所示。

```typescript
        server: {
            proxy: {
                "/api": {
                    target: "http://localhost:5200",
                    changeOrigin: true,
                    secure: false
                },
                "/platform": {
                    target: "http://localhost:5200",
                    changeOrigin: true,
                    secure: false
                },
                "/runtime": {
                    target: "http://localhost:5200",
                    changeOrigin: true,
                    secure: false
                }
            }
        }
```
其中，`proxy`配置对象的`key`为代理restful风格api的路径，`target`属性指向inBuilder在本地运行的端口号。

## 项目源代码目录

在本项目中，`src`目录放置基础运行代码，`apps`目录方案功能模块前端代码。

其中，`apps`下的文件目录结构与运行部署目录结构一致，分四级目录，每级目录具有特定含义。

* 第一级目录：代表顶层关键应用
* 第二集目录：代码功能模块
* 第三级目录：代表应用分组
* 第四级目录：代码具体功能

独立的功能模块可以按此结构组织源代码。

## 配置打包应用页面

应用页面采用rollup进行打包，对于独立应用模块需要配置独立打包入口，配置方式如下：

编辑`vite.config.dev.ts`和`vite.config.build.ts`配置文件，在配置文件中增加`rollup`配置节，如下所示：

```typescript
    build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                    domain: resolve(__dirname, 'apps/platform/domain-platform/customize/domain/index.html'),
                    appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
                    appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html')
                }
            }
        }
```

其中，`input`节点的`key`为应用编号，值为独立应用模块入口页面路径。

## build应用程序

可以参考`package.json`文件中的脚本命令，build本项目。

在调试模式下，可以执行以下命令，试试预览调试运行效果，命令如下：
```shell
    pnpm --filter ui-vue run dev
```
## 部署应用程序

可以执行以下命令build release交付物，参考命令如下：
```shell
    pnpm --filter ui-vue run build:system
```
此命令将独立应用模块输出为systemJS格式模块。

也可以执行以下命令：
```shell
    pnpm --filter ui-vue run build
```
该命令采用Vite标准模块组织代码。

将编译后的交付物部署在inBuilder社区版`web\apps`目录下。

## 配置功能入口

本项目提供了功能入口配置文件，可以在以下配置文件中追加功能入口。

配置文件位置：`packages/workbench/public/assets/solo-functions.json`
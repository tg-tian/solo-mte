# Farris Flow Designer

## 开发环境要求

项目需要使用Node.js v20.19.x，请执行以下命令检查Node.js版本。

```shell
node -v
```

项目需要使用pnpm v10.x，请执行以下命令检查pnpm版本。

```shell
pnpm -v
```

如果未得到`pnpm`版本信息，请参考[安装 pnpm](https://pnpm.io/installation)。

## 项目结构

```
packages
├── flow-devkit      // 定义了扩展流程和流程内自定义节点的标准，并提供了一些公共接口和组件
├── flow-designer    // 流程编排设计器
└── flow-content
   ├── workflow      // 工作流的扩展内容
   ├── chatflow      // 对话流的扩展内容
   └── ......        // 其它流程的扩展内容
```

## 如何扩展一个流程

以工作流（workflow）为例。

在获取项目源代码后，首先安装依赖组件。

```shell
pnpm install
```

打开工作流的流程编排设计器。

```shell
pnpm --filter workflow run dev
```

在`/packages/flow-content/workflow/lib`目录下，编写工作流的扩展内容。

## 如何扩展流程节点

运行以下命令，创建一个用于编写流程扩展内容的项目。

```shell
npm create @farris/vueflow
```


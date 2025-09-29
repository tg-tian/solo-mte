<p align="center">
  <a href="#" target="_blank" rel="noopener noreferrer">
    <img alt="Farris UI Logo" src="../../farris_design.jpg"  style="max-width:50%;">
  </a>
</p>

<h1 align="center">Farris UI Vue</h1>

<p align="center">Farris UI Vue 是一套基于 Farris Design 的前端组件库。</p>

## 1. 编写组件
    在components目录下，以组件名创建源代码目录，参考[贡献指南(https://gitee.com/ubml/farris-vue/blob/master/style-guide/vue_component_style_guide.md)](https://gitee.com/ubml/farris-vue/blob/master/style-guide/vue_component_style_guide.md)实现组件。

## 2. 提供示例页面
    开发者在ui-vue/demo目录按照{组件名}/{组件特性}.vue实现示例页面。

## 3. 注册示例页面路由
    在`ui-vue/src/app.vue`组件，编辑`routes`对象，添加路由信息，例如：
```typescript
import DataGridBasic from '../demos/data-grid/basic.vue';

const routes: Record<string, any> = {
    '/data-grid/basic': DataGridBasic,
};
```

## 4. 运行示例页面
    开发者执行`npx vite dev --open #{示例页面路由}`在浏览器打开示例页面，例如：
```
npx vite dev --open #data-grid/basic
```
## 5. 编写组件说明文档
    开发者在`ui-vue/docs/components`目录下，已markdown格式编写说明文档，以`{示例页面路径}`方式引用示例页面，例如：


\# Data Grid 表格

Data Grid 是展示数据的表格组件，提供分页展示数据，再单元格中编辑数据的功能。

\## 基本用法

:::vdemo

\```vue

{demos/data-grid/basic.vue}

\```

:::


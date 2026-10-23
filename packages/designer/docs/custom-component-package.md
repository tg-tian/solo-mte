# 自定义组件包开发契约

面向第三方组件开发者。遵循本契约的组件包可被低代码平台表单设计器加载，
出现在工具箱「自定义」分组中，并参与运行时表单渲染。

## 一、交付物

一个组件包由**两个文件**组成，均由人工拷贝到系统盘的
`<web>/platform/common/web/renderer/third-party-components/` 目录：

| 文件 | 说明 |
| --- | --- |
| `<组件名>.system.js` | 组件包本体，SystemJS 格式 |
| 登记信息 | 通过 IDE「自定义组件」页签登记（名称、类型、模块名），无需单独文件 |

> 平台不提供自动化安装，组件包由人工投放；配置（属性黑名单、登记清单）由
> 「自定义组件」页签生成压缩包后一并覆盖。

## 二、构建要求

1. **模块格式必须是 SystemJS**（`format: 'system'`），因为设计器与运行时渲染器
   都通过 `System.import(url)` 加载组件包。
2. **必须与宿主同一版本的 `@farris/ui-vue` 构建**，并将 `vue`、`@farris/ui-vue`
   等作为 external 外置，避免重复实例化导致注册表错乱。

## 三、模块导出契约

组件包的导出对象必须**同时**提供运行时注册与设计时注册两个方法：

```js
// custom-ocr-field.system.js（示意）
const CustomOcrField = {
    name: 'FCustomOcrField',

    /** 运行时注册：注册到运行时组件表，供表单渲染使用 */
    register(componentMap, propsConverter, propertyConfigConverter, resolverMap) {
        componentMap['custom-ocr-field'] = CustomOcrField;
        // ...
    },

    /** 设计时注册：注册到设计时组件表与属性配置表，供画布渲染与属性面板使用 */
    registerDesigner(componentMap, propsConverter, propertyConfigConverter) {
        componentMap['custom-ocr-field'] = CustomOcrFieldDesigner;
        propertyConfigSchemaMapForDesigner['custom-ocr-field'] = {
            title: 'custom-ocr-field',
            categories: {
                basic: {
                    title: '基本信息',
                    properties: {
                        id: { title: '标识', type: 'string', readonly: true },
                        readonly: { title: '只读', type: 'boolean' }
                    }
                }
            }
        };
    }
};

export { CustomOcrField };
```

要点：

- 导出对象的**属性名必须与「自定义组件」页签登记的「模块名」一致**；
  加载时按该属性名从模块中取出组件对象。
- `registerDesigner` 只接收 3 个参数（`componentMap`、`propsConverter`、
  `propertyConfigConverter`），**不接收 registerContext**；属性配置需由组件包
  自行写入 `propertyConfigSchemaMapForDesigner`（可从 `@farris/ui-vue` 导入）。
- 仅提供 `register` 而不提供 `registerDesigner` 时，设计器不会报致命错误，
  但该组件**不会出现在工具箱中**。

## 四、属性路径规则

属性面板的可见性配置以**属性路径**为键，组件包声明属性时必须遵循与内置控件一致的规则：

```
属性路径 = 分类.parentPropertyID + '.' + 属性.parentPropertyID + '.' + 属性ID
（无父级时省略该段）
```

- 「外观」分类下的 `class`、`style` 两个属性，在无父属性时补 `appearance.` 前缀，
  即路径为 `appearance.class` / `appearance.style`。
- 级联（cascade）子属性以父属性路径为前缀，例如 `dialog.title`。

路径不一致会导致「属性可见性配置对该属性无效」，且**不会报错**，请务必对齐。

## 五、工具箱与拖拽行为

- 组件包注册成功后，工具箱末端会出现名为**「自定义」**的固定分组，
  组内按登记顺序列出已启用的自定义组件。
- 条目图标固定为 `fd_pc-kuozhankaifa`，分组与图标均**不由组件作者配置**。
- 条目按**容器（container）**类别处理：拖入画布后直接创建控件实例，
  **不会弹出字段绑定或表格绑定对话框**。因此第一期自定义组件不做字段绑定。

## 六、加载失败的表现

- 组件包地址不可达、模块名不存在或注册抛错时，设计器提示加载失败，
  其余组件与内置功能不受影响，且**不会白屏**。
- 组件包未投放但已在登记清单中启用时，工具箱会出现无法使用的条目；
  请确保登记与投放一致。

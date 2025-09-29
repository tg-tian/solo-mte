# 组件的属性与属性面板结合

## 可以获取的服务有哪些
1. 服务的定义，在路径：packages/designer/src/composition下
2. 注入位置：designer.component.tsx和form-designer/form-designer.component.tsx下，注意两个位置的注入服务不要重复。
3. 可以通过在上述位置inject注入更多的服务
4. 在DesignerCanvas中可以获取的服务，构造位置：packages/ui-vue/components/designer-canvas/designer-canvas.component.tsx
```
provide<DesignHostService>('design-host-service',....)
```

通过更改DesignHostService类型，追加新属性，丰富服务

## 组件设计时属性的基础类
1. 在路径：packages/ui-vue/common/property/base-property.ts
2. 上述BaseControlProperty类，被具体组件的属性类所继承，可以在此位置定义通用的方法、属性

## 组件如何获取复杂服务
以data-grid为例，在路径：packages/ui-vue/components/data-grid
1. designer/data-grid.design.component.tsx
```
 const designerHostService=inject('designer-host-service');
 // 构造属性配置方法
 componentInstance.value['getPropertyConfig'] = (componentId:string) => {
       const dataGridProp = new DataGridProperty(componentId,designerHostService);
       return dataGridProp.getPropertyConfig(componentInstance.value.schema);
 }   

```
- 传递服务、组件ID参数，初始化DataGridProperty
- 在类内部可以取到继承BaseControlProperty自的方法、属性，比如获取viewModelId、formSchemaUtils等。

2. property-config/data-grid.property-config.ts
 - 这个文件处理组件的设计时属性，构造基本信息、外观、事件。
```
export class DataGridProperty extends BaseControlProperty {
      getPropertyConfig(propertyData: any) {
        // 基本信息
        this.getBasicPropConfig(propertyData);
        // 外观
        this.getAppearanceProperties(propertyData);
        // 事件
        this.getEventPropConfig(propertyData);
        return this.propertyConfig;
    }
}

```
3. 注意改造data-grid.props.ts
```
export const propsResolver = createPropsResolver<DataGridProps>(dataGridProps, dataGridSchema, schemaMapper, schemaResolver, DataGridProperty);

```
更改为
```
export const propsResolver = createPropsResolver<DataGridProps>(dataGridProps, dataGridSchema, schemaMapper, schemaResolver);
```



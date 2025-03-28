/**
 * 将现有表单元数据转换成vue设计器要求的结构
 */
export class FormMetadataConverter {

    private componentTypeMapper: Record<string, string> = {
        Tab: 'tabs',
        ToolBar: 'response-toolbar',
        QueryScheme: 'query-solution',
        Form: 'content-container',
        Header:'page-header'
    };

    private formGroupMapper: Record<string, string> = {
        EnumField: 'combo-list',
        LookupEdit: 'input-group',
        TextBox: 'input-group',
        NumericBox: 'number-spinner',
        DateBox: 'date-picker',
        SwitchField: 'switch',
        RadioGroup: 'radio-group',
        CheckBox: 'checkbox'
    };

    public convertDesignerMetadata(formSchema: any) {
        this.convertEntity(formSchema);
        this.convertComponents(formSchema.module.components);
    }

    /**
     * 转换控件类型
     * @param component
     * @returns
     */
    private convertComponentType(component: any) {
        const originalComponentType = component.type;

        // 输入类控件
        if (this.formGroupMapper[originalComponentType]) {
            component.type = 'form-group';
            component.label = component.title;
            component.editor = {
                type: this.formGroupMapper[originalComponentType]
            };
            return;
        }
        // 类型转换
        if (this.componentTypeMapper[originalComponentType]) {
            component.type = this.componentTypeMapper[component.type];
            return;
        }
        // 统一处理：将camel-case 转为kebab-case
        component.type = component.type.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * 转换子组件的componentType值
     */
    private convertChildComponentType(component: any) {
        if (component && component.type === 'component' && component.componentType) {
            component.componentType = component.componentType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        }
    }

    private convertComponents(components: any[]) {
        components.forEach((component: any) => {
            this.convertComponentType(component);
            this.convertChildComponentType(component);
            if (component.contents && component.contents.length) {
                this.convertComponents(component.contents);
            }
        });
    }

    /**
     * 转换实体节点
     */
    private convertEntity(domMetadata: any) {
        domMetadata.module.entity = domMetadata.module.schemas;
    }

}

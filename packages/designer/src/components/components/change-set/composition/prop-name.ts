export class SchemaPropName {
    static propNameMap = {
        $type: '类型',
        id: 'ID',
        originalId: '原始ID',
        code: '编号',
        name: '名称',
        label: '标签',
        bindingField: '绑定字段',
        defaultValue: '默认值',
        require: '必填',
        readonly: '只读',
        type: '类型属性',
        length: '长度',
        precision: '精度',
        editor: '编辑器属性',
        format: '格式',
        valueType: '值类型',
        enumValues: '枚举项',
        dataSource: '帮助数据源',
        textField: '文本字段',
        valueField: '值字段',
        displayType: '显示类型',
        helpId: '帮助元数据ID',
        mapFields: '帮助映射',
        path: '路径',
        editable: '允许编辑',
        multiLanguage: '多语',
        displayName: '展示名称'
    };

    static getName(propCode: string) {
        return this.propNameMap[propCode] || propCode;
    }

    /**
     * 联动属性
     * @param isEntity 是否为表节点
     * @param propPath 手动变更的属性path
     */
    static getRelatedProps(isEntity = false, propPath: string, changeIds: any[]): string[] {
        let relatedProps: any[] = [];
        if (isEntity) {
            relatedProps = [
                ['code', 'label', 'type.name'],
                ['name', 'type.displayName']
            ];
        } else {
            relatedProps = [
                ['code', 'label', 'bindingPath', 'bindingField', 'path'],
                ['type', 'editor', 'multiLanguage'],
                ['type.$type', 'type.name', 'type.displayName']
            ];
        }

        for (const related of relatedProps) {
            const index = related.findIndex(r => r === propPath);
            if (index > -1) {
                return related.filter(r => r !== propPath && changeIds.includes(r));
            }
        }
        return [];
    }
}




/**
 * 运行时定制：帮助控件对比服务
 */
class LookupDiffService {

    private lookupConfigs = new Map();

    public getLookupConfigs() {
        return this.lookupConfigs;
    }

    public findLookupConfigs(components: any[]) {
        if (components && components.length) {
            components.forEach(component => {
                if ((component.type === 'query-solution' || component.type === 'filter-bar') && component.fields) {
                    this.findLookupConfigInFilter(component.fields);
                }
                if (component?.editor?.type === 'lookup') {
                    this.findLookupConfigInCard(component.editor);
                }
                if (component.type === 'data-grid' && component.columns) {
                    this.findLookupConfigInGrid(component.columns);
                }
                this.findLookupConfigs(component['contents']);
            });

        }
    }

    /**
     * 提取列表中的帮助
     */
    private findLookupConfigInGrid(columns: any[]) {
        columns.forEach(column => {
            if (column.editor?.type === 'lookup') {
                this.findLookupConfigInCard(column.editor);
            }
        });
    }

    /**
     * 提取卡片中的帮助
     */
    private findLookupConfigInCard(componentEditor: any) {
        const lookupId = componentEditor['helpId'];
        if (componentEditor.dataSource?.uri) {
            const uri = componentEditor.dataSource.uri.replace('.', '/');
            if (!this.lookupConfigs.has(uri)) {
                this.lookupConfigs.set(uri, { uri, lookupId });
            }
        }
    }

    /**
     * 提取筛选条和筛选方案中的帮助配置
     */
    private findLookupConfigInFilter(fieldConfigs: any[]) {
        let uri: string, lookupId: string, conditions: any;
        fieldConfigs.forEach(field => {
            const { controlType } = field;
            if (controlType && ['lookup', 'combo-lookup'].includes(controlType) && field.editor) {
                uri = field.editor.uri.replace('.', '/');
                lookupId = field.editor.helpId;
                if (!this.lookupConfigs.has(uri)) {
                    this.lookupConfigs.set(uri, { uri, lookupId });
                }
            }
        });
    }
}

/**
 * 运行时定制：控件元数据差异对比服务
 */
export class RuntimeComponentDiffService {

    public getLookupConfigsChanges(previous: any[], current: any[]): any {

        const currentLookupDiff = new LookupDiffService();
        currentLookupDiff.findLookupConfigs(current);
        const currentLookupConfigs = currentLookupDiff.getLookupConfigs();

        const previousLookupDiff = new LookupDiffService();
        previousLookupDiff.findLookupConfigs(previous);
        const previousLookupConfigs = previousLookupDiff.getLookupConfigs();

        const newLookupConfigs: any = [];
        currentLookupConfigs.forEach((value, key) => {
            if (!previousLookupConfigs.has(key)) {
                newLookupConfigs.push(value);
            }
        });
        const deletedLookupConfigs: any = [];
        previousLookupConfigs.forEach((value, key) => {
            if (!currentLookupConfigs.has(key)) {
                deletedLookupConfigs.push(value['uri']);
            }
        });
        const modifiedLookupConfigs = this.findModifiedLookup(currentLookupConfigs, previousLookupConfigs);
        return {
            newLookupConfigs: newLookupConfigs,
            deletedLookupConfigs: deletedLookupConfigs,
            modifiedLookupConfigs: modifiedLookupConfigs
        };
    }

    private findModifiedLookup(current: Map<string, any>, previous: Map<string, any>): any[] {
        const modifiedLookupConfigs: any = [];
        let currentFilter: string, previousFilter: string;
        current.forEach((value, key, map) => {
            if (previous.has(key)) {
                currentFilter = value['conditions'];
                previousFilter = previous.get(key)['conditions'];
                if (currentFilter !== previousFilter || value['lookupId'] !== previous.get(key)['lookupId']) {
                    modifiedLookupConfigs.push(value);
                }
            }
        });
        return modifiedLookupConfigs;
    }
}

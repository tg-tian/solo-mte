export class ParamConfig {
    name = '';;

    shownName = '';;

    type = '';;

    value = '';; // 表达式or值

    description = '';; // 说明

    /** 参数是否在构件中被移除 */
    isDisused = false;

    /** 参数的类型，用于参数编辑器 */
    controlSource: any;

    defaultValue: any;

    EditorType?: string | null;

    constructor(paramJson?: any) {
        if (paramJson) {
            this.parse(paramJson);
        }
    }

    parse(paramJson: any) {
        this.name = paramJson.name;
        this.shownName = paramJson.shownName;
        this.value = paramJson.value;
        this.description = paramJson.description;
        this.controlSource = paramJson.controlSource;
        this.defaultValue = paramJson.defaultValue;

    }

    /**
     * 获取保存到DOM结构中的数据
     */
    toJson(): any {
        const param: any = {
            name: this.name,
            shownName: this.shownName,
            value: this.value
        };
        if (this.defaultValue !== undefined) {
            param.defaultValue = this.defaultValue;
        }
        // 参数里增加类型，这样获取参数时能带type属性
        if (this.type && this.type !== 'string') {
            param.type = this.type;
        }
        return param;
    }
}

import { FNotifyService } from "@farris/ui-vue";
import { FormVariable } from "../../../../types";
import { useArrayAndObjectEditor } from "./use-array-and-object-editor";

export function useVariableDefaultValue() {
    const notifyService: FNotifyService = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };
    const { showArrayAndObjectEditor } = useArrayAndObjectEditor();

    /**
     * 将字符串类型的默认值转换为对象类型，用于DOM存储。
     * @param variable 
     * @returns 
     */
    function resolveDefaultValueInViewModel(variable: FormVariable): any {
        if (variable.value === undefined || variable.value === null || variable.value === '') {
            return;
        }
        const isObjectOrArray = variable.type === 'Object' || variable.type === 'Array';
        if (isObjectOrArray) {
            try {
                return JSON.parse(variable.value);

            } catch (error) {
                console.error(error);
                notifyService.error('解析默认值失败');
                return;
            }
        }

        // 若默认值中有单引号，会引起编译错误。这里强制替换掉默认值中的单引号
        if (typeof (variable.value) === 'string') {
            return variable.value.trim().replace(/'/g, '');
        }

        return variable.value;
    }


    /**
     * 将对象类型的默认值转换为字符串类型，用于编辑器展示。
     * @param variable 
     * @returns 
     */
    function resolveDefaultValueInEditor(variable: FormVariable): any {
        if (!variable || !variable.value) {
            return variable.value;
        }

        const isObjectOrArray = variable.type === 'Object' || variable.type === 'Array';
        if (isObjectOrArray) {
            try {
                return JSON.stringify(variable.value, null, 4);
            } catch (error) {
                console.error(error);
                notifyService.error('解析默认值失败');
                return;
            }
        }

        return variable.value;
    }

    /**
     * 清空变量的默认值
     * @param cell 
     */
    function clearDefaultValueWhenModifyType(cell: any) {
        // 1、修改类型列后，需要清空默认值
        const { field } = cell.column;
        const needClearDefaultValue = field === 'type' && cell.newValue && cell.newValue !== cell.oldValue;
        if (!needClearDefaultValue) {
            return;
        }

        // 2、清空默认值
        cell.row.data.value.updateData({
            value: undefined
        });
        notifyService.warning('修改变量类型后，自动清除默认值');

    }

    function checkObjectValid(defaultValue: any): boolean {
        try {
            const object = JSON.parse(defaultValue);
            const isNotObject = !object || typeof (object) !== 'object' || Array.isArray(object);
            if (isNotObject) {
                notifyService.error('默认值不是对象格式，请检查。');
                return false;
            }
        } catch (error) {
            console.error(error);
            notifyService.error('默认值不是对象格式，请检查。');
            return false;
        }
        return true;
    }

    function checkArrayValid(defaultValue: any): boolean {
        try {
            const array = JSON.parse(defaultValue);
            const isNotArray = !array || typeof (array) !== 'object' || !Array.isArray(array);
            if (isNotArray) {
                notifyService.error('默认值不是数组格式，请检查。');
                return false;
            }
        } catch (error) {
            console.error(error);
            notifyService.error('默认值不是数组格式，请检查。');
            return false;
        }
        return true;
    }

    /**
     * 校验默认值格式是否正确
     */
    function checkDefaultValueValid(variableType: string, defaultValue: any): boolean {
        if (!defaultValue) {
            return true;
        }
        switch (variableType) {
            case 'Object': {
                return checkObjectValid(defaultValue);
            }
            case 'Array': {
                return checkArrayValid(defaultValue);
            }
            default: {
                return true;
            }
        }
    }

    /**
     * 打开默认值编辑器
     */
    function showDefaultValueEditor(variable: FormVariable, cell: any) {
        const currentValue = variable.value;
        // 1、确认框的回调函数
        const confirmHandler = (value: any): boolean => {
            const checkPassed = checkDefaultValueValid(variable.type, value);
            if (!checkPassed) {
                return false;
            }

            cell.row.data.value.updateData({
                value: value
            });
            return true;
        };
        // 2、显示数组和对象的编辑器
        showArrayAndObjectEditor(currentValue, confirmHandler);
    }

    return {
        resolveDefaultValueInViewModel,
        resolveDefaultValueInEditor,
        clearDefaultValueWhenModifyType,
        showDefaultValueEditor
    };

}

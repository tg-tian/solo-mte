import type {
    DeviceParameter,
    DeviceParameterType,
    Parameter,
    TypeRefer,
    InputHelp,
    EnumInputHelp,
} from '@farris/flow-devkit/types';
import { BasicTypeRefer } from '@farris/flow-devkit/types';

export class DeviceUtils {

    public static convertDeviceParameterType2TypeRefer(deviceParamType: DeviceParameterType): TypeRefer {
        switch (deviceParamType) {
            case 'string': return BasicTypeRefer.StringType;
            case 'number': return BasicTypeRefer.NumberType;
            case 'boolean': return BasicTypeRefer.BooleanType;
            case 'enum': return BasicTypeRefer.StringType;
            case 'object': return BasicTypeRefer.ObjectType;
            case 'array': return BasicTypeRefer.ArrayType;
            default: return BasicTypeRefer.StringType;
        }
    }

    private static getInputHelp(deviceParameter: DeviceParameter): InputHelp | undefined {
        const enumValues = deviceParameter?.enumValues || [];
        if (!Array.isArray(enumValues) || !enumValues.length) {
            return undefined;
        }
        const inputHelp: EnumInputHelp = {
            kind: 'enum',
            items: enumValues.map((item) => ({
                key: item,
                value: item,
            })),
        }
        return inputHelp;
    }

    public static convertDeviceParameter2Parameter(paramCode: string, deviceParameter: DeviceParameter): Parameter {
        return {
            id: paramCode,
            code: paramCode,
            type: this.convertDeviceParameterType2TypeRefer(deviceParameter.type),
            inputHelp: this.getInputHelp(deviceParameter),
        };
    }
}

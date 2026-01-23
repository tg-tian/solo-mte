import {
    InputHelpKind,
    BasicTypeRefer,
    type InputHelp,
    type EnumInputHelp,
    type TypeRefer,
    type EnumItem,
} from '@farris/flow-devkit/types';
import { ParameterUtils } from './parameter';

export class InputHelpUtils {

    public static createEnumInputHelp(items: EnumItem[] = []): EnumInputHelp {
        return {
            kind: InputHelpKind.enum,
            items,
        };
    }

    public static getInputHelp(newType: TypeRefer): InputHelp | undefined {
        if (!newType) {
            return undefined;
        }
        if (ParameterUtils.isSame(newType, BasicTypeRefer.StringType)) {
            return this.createEnumInputHelp();
        }
        return undefined;
    }
}

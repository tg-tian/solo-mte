import type { TypeRefer, DebugParamTypeInfo } from '@farris/flow-devkit/types';
import { useTypeDetails } from '@farris/flow-devkit/composition';

export class DebugParameterUtils {

    public static getDebugParamTypeInfo(type?: TypeRefer): DebugParamTypeInfo {
        const defaultResult: DebugParamTypeInfo = { type: 'object', multiple: false };
        if (!type) {
            return defaultResult;
        }
        const { isListType } = useTypeDetails();
        if (isListType(type)) {
            const listItemType = type.genericTypes?.[0];
            if (listItemType && listItemType.typeId === 'fileID' && listItemType.source === 'default') {
                return { type: 'fileID', multiple: true };
            } else {
                return { type: 'array', multiple: false };
            }
        }
        if (type.source !== 'default') {
            return defaultResult;
        }
        const typeId = type.typeId || 'string';
        switch (typeId) {
            case 'string':
                return { type: 'string', multiple: false };
            case 'number':
            case 'int':
                return { type: 'number', multiple: false };
            case 'boolean':
                return { type: 'boolean', multiple: false };
            case 'fileID':
                return { type: 'fileID', multiple: false };
            case 'any':
                return { type: 'object', multiple: false };
            case 'array':
                return { type: 'array', multiple: false };
            default:
                return defaultResult;
        }
    }
}

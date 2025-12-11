import { BasicTypeRefer, type BasicTypeReferID, type TypeRefer } from '@farris/flow-devkit/types';
import { ParameterUtils } from '@farris/flow-devkit/utils';

const NOT_BASIC_TYPE = '_not_basic_type_';

export function useData() {

    function getOptions() {
        const options: {
            label: string;
            value: string;
        }[] = [];
        Object.keys(BasicTypeRefer).forEach((typeId) => {
            const typeRefer = BasicTypeRefer[typeId as BasicTypeReferID];
            options.push({
                label: typeRefer.typeName || '',
                value: typeId,
            });
        });
        return options;
    }

    function getOptionItemId(typeRefer?: TypeRefer): string {
        if (!typeRefer) {
            return '';
        }
        return ParameterUtils.getBasicTypeReferID(typeRefer) || NOT_BASIC_TYPE;
    }

    return {
        getOptions,
        getOptionItemId,
    };
}

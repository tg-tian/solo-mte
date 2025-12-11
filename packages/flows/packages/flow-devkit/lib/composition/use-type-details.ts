import { reactive } from 'vue';
import type { Type, TypeRefer } from '@farris/flow-devkit/types';
import { BasicTypeRefer } from '@farris/flow-devkit/types';
import { TypeQueryApi } from '@farris/flow-devkit/api';
import { ParameterUtils } from '@farris/flow-devkit/utils';

const fullTypeID2Type = reactive(new Map<string, Type>());

export function useTypeDetails() {

    function getFullTypeID(typeRefer: TypeRefer): string {
        if (!typeRefer) {
            return '';
        }
        return `${typeRefer.source} / ${typeRefer.typeId}`;
    }

    function getType(typeRefer: TypeRefer): Type | undefined {
        return fullTypeID2Type.get(getFullTypeID(typeRefer));
    }

    function isTypeRefer(value: any): value is TypeRefer {
        return (
            !!value &&
            typeof value === 'object' &&
            typeof value.source === 'string' &&
            !!value.source &&
            typeof value.typeId === 'string' &&
            !!value.typeId
        );
    }

    function flatTypeRefer(typeRefer: TypeRefer): TypeRefer[] {
        if (!typeRefer || !isTypeRefer(typeRefer)) {
            return [];
        }
        const refs: TypeRefer[] = [{
            source: typeRefer.source,
            typeId: typeRefer.typeId,
        }];
        if (!typeRefer.genericTypes || !typeRefer.genericTypes.length) {
            return refs;
        }
        typeRefer.genericTypes.forEach((genericType) => {
            const subTypeRefers = flatTypeRefer(genericType);
            refs.push(...subTypeRefers);
        });
        return refs;
    }

    function flatTypeRefers(typeRefers: TypeRefer[]): TypeRefer[] {
        const visitedIdSet = new Set<string>();
        const allRefs: TypeRefer[] = [];
        typeRefers.forEach(ref => {
            const refs = flatTypeRefer(ref);
            refs.forEach((item) => {
                const fullID = getFullTypeID(item);
                if (!visitedIdSet.has(fullID)) {
                    visitedIdSet.add(fullID);
                    allRefs.push(item);
                }
            });
        });
        return allRefs;
    }

    function findNestedTypeRefers(types: Type[]): TypeRefer[] {
        const nestedTypeRefers: TypeRefer[] = [];
        types.forEach((type) => {
            const fields = type.fields || [];
            fields.forEach((field) => {
                if (field && field.type) {
                    nestedTypeRefers.push(field.type);
                }
            });
        });
        return nestedTypeRefers;
    }

    async function loadType(typeRefers: TypeRefer | TypeRefer[]): Promise<void> {
        if (!typeRefers) {
            return;
        }
        const allRefs: TypeRefer[] = flatTypeRefers(
            Array.isArray(typeRefers) ? typeRefers : [typeRefers]
        );
        const refs = allRefs.filter((ref) => {
            return !fullTypeID2Type.has(getFullTypeID(ref));
        });
        if (!refs.length) {
            return;
        }
        const queryResult = await TypeQueryApi.getTypes(refs).catch(() => null);
        const types = queryResult?.data || [];
        const nestedTypeRefers = findNestedTypeRefers(types);
        types.forEach((type) => {
            const fullTypeID = getFullTypeID(type);
            if (!fullTypeID2Type.has(fullTypeID)) {
                fullTypeID2Type.set(fullTypeID, type);
            }
        });
        await loadType(nestedTypeRefers);
    }

    function isBasicType(typeRefer: TypeRefer): boolean {
        const basicTypeId = ParameterUtils.getBasicTypeReferID(typeRefer);
        return !!basicTypeId;
    }

    function isArray(typeRefer?: TypeRefer): boolean {
        return !!typeRefer && typeRefer.source === 'default' && typeRefer.typeId === 'list';
    }

    function isCollection(typeRefer?: TypeRefer): boolean {
        return !!typeRefer && typeRefer.source === 'default' && typeRefer.typeId === 'java.util.Collection';
    }

    function isIterable(typeRefer?: TypeRefer): boolean {
        return !!typeRefer && typeRefer.source === 'default' && typeRefer.typeId === 'java.lang.Iterable';
    }

    function isListType(typeRefer?: TypeRefer): boolean {
        return isArray(typeRefer) || isCollection(typeRefer) || isIterable(typeRefer);
    }

    function getListItemType(typeRefer?: TypeRefer): Type | undefined {
        const itemTypeRefer = typeRefer?.genericTypes?.[0];
        if (!itemTypeRefer) {
            return undefined;
        }
        return fullTypeID2Type.get(getFullTypeID(itemTypeRefer));
    }

    function getListItemTypeRefer(typeRefer?: TypeRefer): TypeRefer | undefined {
        return typeRefer?.genericTypes?.[0] ?? undefined;
    }

    function _getTypeCode(typeRefer?: TypeRefer): string {
        if (!typeRefer) {
            return '';
        }
        const basicTypeId = ParameterUtils.getBasicTypeReferID(typeRefer);
        if (basicTypeId) {
            const basicType = BasicTypeRefer[basicTypeId];
            return basicType.typeCode || '';
        }
        const fullTypeID = getFullTypeID(typeRefer);
        const type = fullTypeID2Type.get(fullTypeID);
        if (type) {
            return type.code || '';
        }
        return typeRefer.typeCode || typeRefer.typeId || '';
    }

    function _getTypeName(typeRefer?: TypeRefer): string {
        if (!typeRefer) {
            return '';
        }
        const basicTypeId = ParameterUtils.getBasicTypeReferID(typeRefer);
        if (basicTypeId) {
            const basicType = BasicTypeRefer[basicTypeId];
            return basicType.typeName || basicType.typeCode || '';
        }
        const fullTypeID = getFullTypeID(typeRefer);
        const type = fullTypeID2Type.get(fullTypeID);
        if (type) {
            return type.name || type.code || '';
        }
        return typeRefer.typeName || typeRefer.typeCode || '';
    }

    function getTypeCode(typeRefer?: TypeRefer): string {
        if (isListType(typeRefer)) {
            let listTypeText = '';
            if (isCollection(typeRefer)) {
                listTypeText = 'Collection';
            } else if (isIterable(typeRefer)) {
                listTypeText = 'Iterable';
            } else {
                listTypeText = 'Array';
            }
            const itemTypeRefer = typeRefer!.genericTypes?.[0];
            if (!itemTypeRefer) {
                return listTypeText;
            }
            const itemTypeCode = isListType(itemTypeRefer) ? getTypeCode(itemTypeRefer) : _getTypeCode(itemTypeRefer);
            return `${listTypeText}<${itemTypeCode}>`;
        }
        return _getTypeCode(typeRefer);
    }

    function getTypeName(typeRefer?: TypeRefer): string {
        if (isListType(typeRefer)) {
            let listTypeText = '';
            if (isCollection(typeRefer)) {
                listTypeText = 'Collection';
            } else if (isIterable(typeRefer)) {
                listTypeText = 'Iterable';
            } else {
                listTypeText = 'Array';
            }
            const itemTypeRefer = typeRefer!.genericTypes?.[0];
            if (!itemTypeRefer) {
                return listTypeText;
            }
            const itemTypeName = isListType(itemTypeRefer) ? getTypeName(itemTypeRefer) : _getTypeName(itemTypeRefer);
            return `${listTypeText}<${itemTypeName}>`;
        }
        return _getTypeName(typeRefer);
    }

    function hasNestedFieldPath(typeRefer?: TypeRefer, fields?: string[]): boolean {
        if (!fields || !fields.length) {
            return true;
        }
        if (!typeRefer) {
            return false;
        }
        const currentType = isListType(typeRefer)
            ? getListItemType(typeRefer)
            : fullTypeID2Type.get(getFullTypeID(typeRefer));
        if (!currentType) {
            return false;
        }
        const currentFieldName = fields[0];
        const remainingFields = fields.slice(1);
        const matchedField = currentType.fields?.find(
            (field) => field.code === currentFieldName
        );
        if (!matchedField) {
            return false;
        }
        return remainingFields.length > 0
            ? hasNestedFieldPath(matchedField.type, remainingFields)
            : true;
    }

    return {
        fullTypeID2Type,
        getFullTypeID,
        getType,
        loadType,
        isTypeRefer,
        getTypeCode,
        getTypeName,
        isBasicType,
        isArray,
        isCollection,
        isIterable,
        isListType,
        getListItemType,
        getListItemTypeRefer,
        hasNestedFieldPath,
    };
}

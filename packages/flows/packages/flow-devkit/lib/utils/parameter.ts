import type { TypeRefer, BasicTypeReferID } from '@farris/flow-devkit/types';
import { BasicTypeRefer } from '@farris/flow-devkit/types';

export class ParameterUtils {

    public static getTypeReferIds(typeRefer: TypeRefer): string[] {
        if (!typeRefer) {
            return [];
        }
        const ids: string[] = [typeRefer.source, typeRefer.typeId];
        const genericTypes = typeRefer.genericTypes || [];
        for (const type of genericTypes) {
            ids.push(type.source, type.typeId);
        }
        return ids;
    }

    public static isSame(typeA: TypeRefer, typeB: TypeRefer): boolean {
        if (!typeA || !typeB) {
            return false;
        }
        const aIds = this.getTypeReferIds(typeA);
        const bIds = this.getTypeReferIds(typeB);
        if (aIds.length !== bIds.length) {
            return false;
        }
        for (let i = 0; i < aIds.length; i++) {
            if (aIds[i] !== bIds[i]) {
                return false;
            }
        }
        return true;
    }

    public static getBasicTypeReferID(typeRefer: TypeRefer): BasicTypeReferID | undefined {
        if (!typeRefer) {
            return undefined;
        }
        const itemIds = Object.keys(BasicTypeRefer);
        for (const itemId of itemIds) {
            const basicType = BasicTypeRefer[itemId as BasicTypeReferID];
            if (this.isSame(basicType, typeRefer)) {
                return itemId as BasicTypeReferID;
            }
        }
        return undefined;
    }

    /** 是否数组类型 */
    public static isArray(typeRefer?: TypeRefer): boolean {
        return !!typeRefer && typeRefer.source === 'default' && typeRefer.typeId === 'list';
    }

    /** 是否空类型 */
    public static isVoid(typeRefer?: TypeRefer): boolean {
        return !!typeRefer && typeRefer.source === 'default' && typeRefer.typeId === 'void';
    }
}

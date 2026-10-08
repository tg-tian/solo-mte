import type { JsonSchema, JsonSchemaType, TypeRefer } from '@farris/flow-devkit/types';
import { JsonSchemaBasicType, BasicTypeRefer } from '@farris/flow-devkit/types';
import { uuid } from './uuid';
import { ParameterUtils } from './parameter';

export class JsonSchemaUtils {

    public static transSchemaType2SelectorValue(schema: JsonSchema): string {
        const type = schema.type;
        if (type !== JsonSchemaBasicType.Array) {
            return type;
        }
        const arrayItemType = schema.items?.type;
        if (!arrayItemType) {
            return JsonSchemaBasicType.Array;
        }
        return `${JsonSchemaBasicType.Array}-${arrayItemType}`;
    }

    public static updateSchemaTypeBySelectorValue(schema: JsonSchema, selectorValue: string): void {
        if (!selectorValue) {
            return;
        }
        const oldProperties = this.getObjectProperties(schema) || [];
        if (selectorValue === JsonSchemaBasicType.Object) {
            schema.type = JsonSchemaBasicType.Object;
            schema.items = undefined;
            schema.properties = oldProperties;
            return;
        }
        if (selectorValue.startsWith(JsonSchemaBasicType.Array)) {
            schema.type = JsonSchemaBasicType.Array;
            schema.properties = undefined;
            const arrayItemType = selectorValue.split('-')[1] as JsonSchemaType;
            schema.items = this.createJsonSchemaByType(arrayItemType);
            if (arrayItemType === JsonSchemaBasicType.Object) {
                schema.items.properties = oldProperties;
            }
            return;
        }
        schema.type = selectorValue as JsonSchemaType;
        schema.items = undefined;
        schema.properties = undefined;
        return;
    }

    private static _createJsonSchemaByType(type: JsonSchemaType): JsonSchema {
        const schema: JsonSchema = {
            id: uuid(),
            code: '',
            name: '',
            description: '',
            type,
        };
        if (type === JsonSchemaBasicType.Object) {
            schema.properties = [];
        }
        return schema;
    }

    public static createJsonSchemaByType(type: JsonSchemaType, arrayItemType: JsonSchemaType = 'string'): JsonSchema {
        const schema = this._createJsonSchemaByType(type);
        if (type === JsonSchemaBasicType.Array && arrayItemType) {
            schema.items = this._createJsonSchemaByType(arrayItemType);
        }
        return schema;
    }

    public static canEditJsonSchema(type: TypeRefer): boolean {
        return ParameterUtils.isSame(type, BasicTypeRefer.ObjectType) || ParameterUtils.isSame(type, BasicTypeRefer.ObjectArrayType);
    }

    public static mayHasJsonSchema(type?: TypeRefer): boolean {
        if (!type) {
            return false;
        }
        if (ParameterUtils.isArray(type)) {
            return this.mayHasJsonSchema(type.genericTypes?.[0]);
        }
        if (ParameterUtils.isSame(type, BasicTypeRefer.ObjectType)) {
            return true;
        }
        return false;
    }

    public static canAddSubLevel(schema: JsonSchema): boolean {
        if (!schema) {
            return false;
        }
        return schema.type === JsonSchemaBasicType.Object || (
            schema.type === JsonSchemaBasicType.Array && schema.items?.type === JsonSchemaBasicType.Object
        );
    }

    public static getObjectProperties(schema?: JsonSchema): JsonSchema[] | undefined {
        if (!schema) {
            return undefined;
        }
        if (schema.type === JsonSchemaBasicType.Object) {
            return schema.properties;
        }
        if (schema.type === JsonSchemaBasicType.Array) {
            return this.getObjectProperties(schema.items);
        }
        return undefined;
    }

    public static getTypeRefer(schema?: JsonSchema): TypeRefer | undefined {
        if (!schema || !schema.type) {
            return undefined;
        }
        switch (schema.type) {
            case JsonSchemaBasicType.String: return BasicTypeRefer.StringType;
            case JsonSchemaBasicType.Integer: return BasicTypeRefer.IntegerType;
            case JsonSchemaBasicType.Number: return BasicTypeRefer.NumberType;
            case JsonSchemaBasicType.Boolean: return BasicTypeRefer.BooleanType;
            case JsonSchemaBasicType.Object: return BasicTypeRefer.ObjectType;
            case JsonSchemaBasicType.Array: {
                const itemTypeRefer = this.getTypeRefer(schema.items) ?? BasicTypeRefer.StringType;
                const typeRefer: TypeRefer = {
                    source: "default",
                    typeId: "list",
                    typeCode: `Array<${itemTypeRefer.typeCode}>`,
                    typeName: `Array<${itemTypeRefer.typeName}>`,
                    genericTypes: [itemTypeRefer],
                };
                return typeRefer;
            }
        }
        return undefined;
    }

    public static wrapSchemaWithArray(schema: JsonSchema, count: number): JsonSchema {
        let wrappedSchema = schema;
        while (count > 0) {
            --count;
            wrappedSchema = {
                id: uuid(),
                type: JsonSchemaBasicType.Array,
                code: '',
                items: wrappedSchema,
            };
        }
        return wrappedSchema;
    }

    public static getFieldJsonSchema(schema?: JsonSchema, fieldIds?: string[], arrayDepth = 0): JsonSchema | undefined {
        if (!schema) {
            return undefined;
        }
        if (!fieldIds || !fieldIds.length) {
            return this.wrapSchemaWithArray(schema, arrayDepth);
        }
        if (schema.type === JsonSchemaBasicType.Array) {
            return this.getFieldJsonSchema(schema.items, fieldIds, arrayDepth + 1);
        }
        if (schema.type === JsonSchemaBasicType.Object) {
            const currentFieldId = fieldIds[0];
            const remainingFieldIds = fieldIds.slice(1);
            const matchedField = schema.properties?.find(
                property => property.id === currentFieldId && currentFieldId
            );
            if (!matchedField) {
                return undefined;
            }
            return this.getFieldJsonSchema(matchedField, remainingFieldIds, arrayDepth);
        }
        return undefined;
    }

    public static getCodePathByIdPath(schema: JsonSchema, fieldIds: string[]): string[] {
        if (!schema || !fieldIds || !fieldIds.length) {
            return [];
        }
        const fieldCodes: string[] = [];
        let currentSchema: JsonSchema | undefined = schema;
        while (fieldCodes.length < fieldIds.length) {
            const properties = this.getObjectProperties(currentSchema);
            const fieldId = fieldIds[fieldCodes.length];
            currentSchema = properties?.find(property => property.id === fieldId && fieldId);
            if (!currentSchema) {
                break;
            }
            fieldCodes.push(currentSchema.code);
        }
        return fieldCodes.length !== fieldIds.length ? [] : fieldCodes;
    }

    public static getIdPathByCodePath(schema: JsonSchema, fieldCodes: string[]): string[] {
        if (!schema || !fieldCodes || !fieldCodes.length) {
            return [];
        }
        const fieldIds: string[] = [];
        let currentSchema: JsonSchema | undefined = schema;
        while (fieldIds.length < fieldCodes.length) {
            const properties = this.getObjectProperties(currentSchema);
            const fieldCode = fieldCodes[fieldIds.length];
            currentSchema = properties?.find(property => property.code === fieldCode && fieldCode);
            if (!currentSchema || !currentSchema.id) {
                break;
            }
            fieldIds.push(currentSchema.id);
        }
        return fieldIds.length !== fieldCodes.length ? [] : fieldIds;
    }

    public static getParentObjectSchema(rootSchema?: JsonSchema, targetSchema?: JsonSchema): JsonSchema | undefined {
        if (!rootSchema || !targetSchema) {
            return undefined;
        }
        const schemas2Scan: JsonSchema[] = [rootSchema];
        while (schemas2Scan.length) {
            const currentSchema = schemas2Scan.pop();
            if (!currentSchema) {
                continue;
            }
            if (
                currentSchema.type === JsonSchemaBasicType.Array &&
                currentSchema.items &&
                currentSchema.items.type === JsonSchemaBasicType.Object
            ) {
                schemas2Scan.push(currentSchema.items);
                continue;
            }
            if (currentSchema.type === JsonSchemaBasicType.Object) {
                const properties = currentSchema.properties || [];
                const bingo = !!properties?.find(property => property === targetSchema);
                if (bingo) {
                    return currentSchema;
                }
                schemas2Scan.push(...properties);
            }
        }
        return undefined;
    }
}

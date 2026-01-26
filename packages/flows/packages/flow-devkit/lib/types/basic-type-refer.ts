import type { TypeRefer } from './type';

const BasicTypeReferID = {
    StringType: 'StringType',
    IntegerType: 'IntegerType',
    BooleanType: 'BooleanType',
    NumberType: 'NumberType',
    ObjectType: 'ObjectType',
    FileType: 'FileType',
    StringArrayType: 'StringArrayType',
    IntegerArrayType: 'IntegerArrayType',
    BooleanArrayType: 'BooleanArrayType',
    NumberArrayType: 'NumberArrayType',
    ObjectArrayType: 'ObjectArrayType',
    FileArrayType: 'FileArrayType',
    ArrayType: 'ArrayType',
} as const;

export type BasicTypeReferID = keyof typeof BasicTypeReferID;

export const BasicTypeRefer: Record<BasicTypeReferID, TypeRefer> = {
    [BasicTypeReferID.StringType]: {
        source: 'default',
        typeId: 'string',
        typeCode: 'String',
        typeName: 'String',
    },
    [BasicTypeReferID.IntegerType]: {
        source: 'default',
        typeId: 'int',
        typeCode: 'Integer',
        typeName: 'Integer',
    },
    [BasicTypeReferID.BooleanType]: {
        source: 'default',
        typeId: 'boolean',
        typeCode: 'Boolean',
        typeName: 'Boolean',
    },
    [BasicTypeReferID.NumberType]: {
        source: 'default',
        typeId: 'number',
        typeCode: 'Number',
        typeName: 'Number',
    },
    [BasicTypeReferID.ObjectType]: {
        source: 'default',
        typeId: 'any',
        typeCode: 'Object',
        typeName: 'Object',
    },
    [BasicTypeReferID.FileType]: {
        source: 'default',
        typeId: 'fileID',
        typeCode: 'File',
        typeName: 'File',
    },
    [BasicTypeReferID.StringArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array<String>',
        typeName: 'Array<String>',
        genericTypes: [{
            source: 'default',
            typeId: 'string',
            typeCode: 'String',
            typeName: 'String',
        }]
    },
    [BasicTypeReferID.IntegerArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array<Integer>',
        typeName: 'Array<Integer>',
        genericTypes: [{
            source: 'default',
            typeId: 'int',
            typeCode: 'Integer',
            typeName: 'Integer',
        }]
    },
    [BasicTypeReferID.BooleanArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array<Boolean>',
        typeName: 'Array<Boolean>',
        genericTypes: [{
            source: 'default',
            typeId: 'boolean',
            typeCode: 'Boolean',
            typeName: 'Boolean',
        }]
    },
    [BasicTypeReferID.NumberArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array<Number>',
        typeName: 'Array<Number>',
        genericTypes: [{
            source: 'default',
            typeId: 'number',
            typeCode: 'Number',
            typeName: 'Number',
        }]
    },
    [BasicTypeReferID.ObjectArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array<Object>',
        typeName: 'Array<Object>',
        genericTypes: [{
            source: 'default',
            typeId: 'any',
            typeCode: 'Object',
            typeName: 'Object',
        }]
    },
    [BasicTypeReferID.FileArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array<File>',
        typeName: 'Array<File>',
        genericTypes: [{
            source: 'default',
            typeId: 'fileID',
            typeCode: 'File',
            typeName: 'File',
        }]
    },
    [BasicTypeReferID.ArrayType]: {
        source: 'default',
        typeId: 'list',
        typeCode: 'Array',
        typeName: 'Array',
        genericTypes: []
    }
};

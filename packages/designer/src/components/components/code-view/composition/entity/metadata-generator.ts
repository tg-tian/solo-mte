export class MetadataDto {
    id: string;
    nameSpace: string;
    code: string;
    name: string;
    fileName: string;
    type: string;
    bizobjectID: string;
    relativePath: string;
    extendProperty: string;
    content: string;
    extendable: boolean;
    nameLanguage:Record<string, any>;
    constructor(id: string, nameSpace: string, code: string, name: string, fileName: string, type: string, bizobjectID: string, relativePath: string, extendProperty: string, content: string, extendable: boolean, nameLanguage= {}) {
        this.id = id;
        this.nameSpace = nameSpace;
        this.code = code;
        this.name = name;
        this.fileName = fileName;
        this.type = type;
        this.bizobjectID = bizobjectID;
        this.relativePath = relativePath;
        this.extendProperty = extendProperty;
        this.content = content;
        this.extendable = extendable;
        this.nameLanguage = nameLanguage;

    }
}

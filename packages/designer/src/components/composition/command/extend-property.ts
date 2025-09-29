export class ExtendProperty {
    FormCode: string = '';
    IsCommon: boolean = false;
}

export class ExtendsConvert {
    InitFromJobject(jsonObj: object): ExtendProperty|null {
        if (jsonObj) {
            const extendProperty = new ExtendProperty();
            extendProperty.FormCode = jsonObj["FormCode"];
            extendProperty.IsCommon = jsonObj["IsCommon"];
            return extendProperty;
        }
        return null;
    }

    ConvertJObject(obj: ExtendProperty): object {
        const extendProperty: ExtendProperty = obj as ExtendProperty;
        const jobj = new Object();
        jobj["FormCode"] = extendProperty.FormCode;
        jobj["IsCommon"] = extendProperty.IsCommon;
        return jobj;
    }
}

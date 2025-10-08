import { IClass, IMethod, IParam } from "./interfaces/declaration";
import { IClassDeclaration, IMethodDeclaration, IParamDeclaration } from "./interfaces/declaration";

export function SimplifyParam(param: IParamDeclaration): IParam {
    return {
        code: param.code.value,
        type: param.type,
        description: param.description
    };
}

export function SimplifyMethod(method: IMethodDeclaration): IMethod {
    return {
        code: method.code.value,
        name: method.name,
        type: method.type && method.type.value || "",
        description: method.description,
        returns: method.returns,
        params: method.params.map(param => SimplifyParam(param)),
        kind: method.kind,
        accessibility: method.accessibility
    };
}

export function SimplifyClass(_class: IClassDeclaration): IClass {
    return {
        code: _class.code.value,
        name: _class.name,
        description: _class.description,
        methods: _class.methods.map(method => SimplifyMethod(method)),
        exported: _class.exported
    };
}

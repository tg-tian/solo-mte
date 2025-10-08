import { DesignElementLocaleHandler } from '../../utils/locale';
import { IMarker, IClassDeclaration, IMethodDeclaration, IParamDeclaration } from '../libs/interfaces/declaration';

function ValidateParam(param: IParamDeclaration): IMarker[] {
   
    const warning: IMarker[] = [];
    if (!param.description) {
        const msg = DesignElementLocaleHandler.getValue('codeEditor').note;
        warning.push({
            start: param.location.start,
            end: param.location.end,
            message: msg || "参数缺少注释"
        });
    }
    return warning;
}

function ValidateMethod(method: IMethodDeclaration): IMarker[] {
    if (method && method.kind && method.kind !== "method") {
        return [];  // 只对普通方法要求注释，构造函数、get方法、set方法不需要注释
    }
    if (!method.name && method.accessibility !== 'private' && method.accessibility !== 'protected') {
        const msg = DesignElementLocaleHandler.getValue('codeEditor').note2;
        return [{
            start: method.location.start,
            end: method.location.end,
            message: msg || "方法缺少注释"
        }];
    }
    const warning: IMarker[] = [];
    if (method.accessibility !== 'private' && method.accessibility !== 'protected') {
        method.params.forEach(param => warning.push(...ValidateParam(param)));
    }
    return warning;
}

export function ValidateClass(_class: IClassDeclaration): IMarker[] {
    // 类是否有警告
    const warning: IMarker[] = [];
    _class.methods.forEach(method => warning.push(...ValidateMethod(method)));
    return warning;
}

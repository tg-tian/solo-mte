import { IClass } from "../../type/classes.interface";
import { FormatError } from "../class/validator";
import { WebComponentMetadata } from "../class/web-component";
import { ValidateUtil } from "./validate.util";

/**
 * 服务构件元数据校验工具
 */
export class WebcmpValidateUtil {

  /** 设置默认值 */
  public static setDefaultValue(webcmp: WebComponentMetadata): void {
    // 服务构件 - 基本信息，包括：名称
    !webcmp.name && (webcmp.name = webcmp.Code);
    // 服务方法 - 基本信息，包括：名称
    for (const method of webcmp.Operations) {
      !method.Name && (method.Name = method.Code);
      for (const param of method.Parameters) {
        // 服务方法 - 参数，包括：参数类型
        !param.ParameterType && (param.ParameterType = 'any');
      }
    }
  }

  public static validate(webcmp: WebComponentMetadata, localeData: any): FormatError[] {
    const errors: FormatError[] = [];
    // 检查构件基本信息
    ValidateUtil.checkCodeAndCollectError(localeData.cmpCode || "构件编号", errors, webcmp, 'Code');
    ValidateUtil.checkNameAndCollectError(localeData.cmpName || "构件名称", errors, webcmp, 'name');
    ValidateUtil.doDuplicateDetectionAndCollectError(localeData.methodCode || "方法编号", errors, webcmp.Operations, 'Code');
    // 检查每一个服务方法
    for (let i = 0; i < webcmp.Operations.length; ++i) {
      const operation = webcmp.Operations[i];
      ValidateUtil.checkCodeAndCollectError(localeData.methodCodeN.replace('param', i + 1) || `（第${i + 1}个）方法的编号`, errors, operation);
      ValidateUtil.checkNameAndCollectError(localeData.methodNameN.replace('param', i + 1) || `（第${i + 1}个）方法的名称`, errors, operation);
      // 检查方法的参数
      ValidateUtil.doDuplicateDetectionAndCollectError(localeData.methodParam.replace('param', operation.Code) || `方法[${operation.Code}]的参数编号`, errors, operation.Parameters, 'Code');
      for (const param of operation.Parameters) {
        ValidateUtil.checkCodeAndCollectError(localeData.methodParam.replace('param', operation.Code) || `方法[${operation.Code}]的参数编号`, errors, param);
        ValidateUtil.checkNameAndCollectError(localeData.methodParamName.replace('param', operation.Code) || `方法[${operation.Code}]的参数名称`, errors, param);
      }
    }
    return errors;
  }

  /** 检查类结构信息中是否有重名的情况，如果有则无法继续保存 */
  public static validateClassStructure(classes: IClass[], localeData: any): string {
    const classCodeSet = new Set<string>();
    const methodCodeSet = new Set<string>();
    for (const classItem of classes) {
      if (classCodeSet.has(classItem.code)) {
        return localeData.repeatInfo.replace('param', classItem.code) || `类名（${classItem.code}）重复，请修改后再保存`;
      }
      classCodeSet.add(classItem.code);
      methodCodeSet.clear();
      if (classItem.methods) {
        for (const method of classItem.methods) {
          if (methodCodeSet.has(method.code)) {
            return localeData.repeatInfo2.replace('param', method.code) || `方法名（${method.code}）重复，请修改后再保存`;
          }
          methodCodeSet.add(method.code);
        }
      }
    }
    return '';
  }

}

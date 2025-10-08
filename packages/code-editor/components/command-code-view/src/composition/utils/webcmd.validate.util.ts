import { BranchCommandItem } from "../class/branch";
import { BranchCollectionCommandItem } from "../class/branch-collection";
import { MethodReferCommandItem } from "../class/method-refer";
import { FormatError } from "../class/validator";
import { WebCommand, WebCommandMetadata } from "../class/web-command";
import { ValidateUtil } from "./validate.util";

/**
 * 命令构件元数据校验工具
 */
export class WebcmdValidateUtil {

  /** 设置默认值 */
  public static setDefaultValue(webcmd: WebCommandMetadata): void {
    // 命令构件 - 基本信息，包含：名称
    !webcmd.Name && (webcmd.Name = webcmd.Code);
    // 命令项 - 基本信息，包含：名称
    for (const command of webcmd.Commands) {
      !command.Name && (command.Name = command.Code);
      // 命令项 - 参数，包含：参数类型、编辑器类型
      for (const param of command.Parameters) {
        !param.ParameterType && (param.ParameterType = 'any');
        !param.EditorType && (param.EditorType = '');
      }
    }
  }

  public static validate(webcmd: WebCommandMetadata, localeData: any): FormatError[] {
    const errors: FormatError[] = [];
    // 检查构件基本信息
    ValidateUtil.checkCodeAndCollectError(localeData.cmpCode || "构件编号", errors, webcmd);
    ValidateUtil.checkNameAndCollectError(localeData.cmpName || "构件名称", errors, webcmd);
    ValidateUtil.doDuplicateDetectionAndCollectError(localeData.methodCode || "方法编号", errors, webcmd.Commands, 'Code');
    // 检查每一个命令
    for (let i = 0; i < webcmd.Commands.length; ++i) {
      const command = webcmd.Commands[i];
      ValidateUtil.checkCodeAndCollectError(localeData.methodCodeN.replace('param', i + 1) || `（第${i + 1}个）方法的编号`, errors, command);
      ValidateUtil.checkNameAndCollectError(localeData.methodNameN.replace('param', i + 1) || `（第${i + 1}个）方法的名称`, errors, command);
      // 检查命令的参数
      ValidateUtil.doDuplicateDetectionAndCollectError(localeData.methodParam.replace('param', command.Code) || `方法[${command.Code}]的参数编号`, errors, command.Parameters, 'Code');
      for (const param of command.Parameters) {
        ValidateUtil.checkCodeAndCollectError(localeData.methodParam.replace('param', command.Code) || `方法[${command.Code}]的参数编号`, errors, param);
        ValidateUtil.checkNameAndCollectError(localeData.methodParamName.replace('param', command.Code) || `方法[${command.Code}]的参数名称`, errors, param);
      }
      WebcmdValidateUtil.checkCommandItemAndCollectError(command, errors, localeData);
    }
    return errors;
  }

  private static checkCommandItemAndCollectError(command: WebCommand, errors: FormatError[], localeData: any): void {
    // 采用迭代的方式遍历并检查每一个命令编排项
    const branchStack = [command.Items];  // 压入编排树的主干
    while (branchStack.length > 0) {
      const branch = branchStack.pop();
      if (branch) {
        ValidateUtil.doDuplicateDetectionAndCollectError(localeData.methodListCode.replace('param', command.Code) || `方法[${command.Code}]的编排项的编号`, errors, branch, 'Code');
        for (const commandItem of branch) {
          ValidateUtil.checkCodeAndCollectError(localeData.methodListCode.replace('param', command.Code) || `方法[${command.Code}]的编排项的编号`, errors, commandItem);
          ValidateUtil.checkNameAndCollectError(localeData.methodListName.replace('param', command.Code) || `方法[${command.Code}]的编排项的名称`, errors, commandItem);
          if (commandItem instanceof BranchCollectionCommandItem) {
            // 将分支集合中的分支压入栈
            for (const newBranch of commandItem.Items) {
              branchStack.push((newBranch as BranchCommandItem).Items);  // 分支集合中只包含分支
            }
          } else if (commandItem instanceof MethodReferCommandItem) {
            // 如果编排项是操作类型的，还需要检查其形参列表
            const methodListParamcode = localeData.methodListParamcode.replace('param', command.Code).replace('param2', commandItem.Code);
            const methodListParamName = localeData.methodListParamName.replace('param', command.Code).replace('param2', commandItem.Code);
            ValidateUtil.doDuplicateDetectionAndCollectError(methodListParamcode || `方法[${command.Code}]的编排项[${commandItem.Code}]的参数编号`, errors, commandItem.ParamConfigs, 'ParamCode');
            for (const paramConfig of commandItem.ParamConfigs) {
              ValidateUtil.checkCodeAndCollectError(methodListParamcode || `方法[${command.Code}]的编排项[${commandItem.Code}]的参数编号`, errors, paramConfig, 'ParamCode');
              ValidateUtil.checkNameAndCollectError(methodListParamName || `方法[${command.Code}]的编排项[${commandItem.Code}]的参数名称`, errors, paramConfig, 'ParamName');
            }
          }
        }
      }
    }
  }

}

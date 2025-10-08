
import { MetadataConverter } from "../../type/metadata-converter";
import { CommandItem } from "./command-item";


/**
 * 操作参数配置
 */
export class MethodReferParamConfig implements MetadataConverter {
  ParamCode: string='';
  ParamName: string='';
  ParamExpress: string='';

  input(metadata :any): void {
    if (!metadata) {
      return;
    }
    this.ParamCode = metadata.ParamCode;
    this.ParamName = metadata.ParamName;
    this.ParamExpress = metadata.ParamExpress;
  }

  output(): any {
    return {
      ParamCode: this.ParamCode,
      ParamName: this.ParamName,
      ParamExpress: this.ParamExpress
    };
  }
}

/**
 * 匹配错误类型
 */
export enum MatchErrorType {
  None = 0,
  MethodNotFound = 1,
  ParameterMismatch = 2
}
/**
 * 命令编排项 - 操作
 */
export class MethodReferCommandItem extends CommandItem {
  ComponentId: string='';
  ComponentCode: string='';
  ComponentName: string='';
  ComponentPath: string='';
  MethodId: string='';
  MethodCode: string='';
  MethodName: string='';
  IsReplaced: boolean=false;
  IsBeforeExpansion: boolean=false;
  IsAfterExpansion: boolean=false;
  ParamConfigs: MethodReferParamConfig[]=[];
  matchError: MatchErrorType=MatchErrorType.None;

  input(metadata :any): void {
    if (!metadata) {
      return;
    }
    this._input(metadata);
    this.ComponentId = metadata.ComponentId;
    this.ComponentCode = metadata.ComponentCode;
    this.ComponentName = metadata.ComponentName;
    this.ComponentPath = metadata.ComponentPath;
    this.MethodId = metadata.MethodId;
    this.MethodCode = metadata.MethodCode;
    this.MethodName = metadata.MethodName;
    this.IsReplaced = metadata.IsReplaced;
    this.IsBeforeExpansion = metadata.IsBeforeExpansion;
    this.IsAfterExpansion = metadata.IsAfterExpansion;
    this.ParamConfigs = [];
    this.matchError = MatchErrorType.None;
    if (metadata.ParamConfigs && Array.isArray(metadata.ParamConfigs)) {
      for (const param of metadata.ParamConfigs) {
        const newParamMeta = new MethodReferParamConfig();
        newParamMeta.input(param);
        this.ParamConfigs.push(newParamMeta);
      }
    }
  }

  output(): any {
    const content = this._output();
    content.ComponentId = this.ComponentId;
    content.ComponentCode = this.ComponentCode;
    content.ComponentName = this.ComponentName;
    content.ComponentPath = this.ComponentPath;
    content.MethodId = this.MethodId;
    content.MethodCode = this.MethodCode;
    content.MethodName = this.MethodName;
    content.IsReplaced = this.IsReplaced;
    content.IsBeforeExpansion = this.IsBeforeExpansion;
    content.IsAfterExpansion = this.IsAfterExpansion;
    content.ParamConfigs = [];
    for (const param of this.ParamConfigs) {
      content.ParamConfigs.push(
        param.output()
      );
    }
    const result = {
      Type: this.itemType,
      Content: content
    };
    for (const key in content) {
      result[key] = content[key];
    }
    return result;
  }
}


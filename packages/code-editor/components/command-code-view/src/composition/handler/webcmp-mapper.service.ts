import { cloneDeep } from "lodash-es";
import { IClass } from "../../type/classes.interface";
import { WebComponentMetadata, WebComponentOperation, WebComponentOperationParameter } from "../class/web-component";
import {MetadataHandlerService} from './metadata-handler.service';

export class WebcmpMapperService {
  private metadataService;
  constructor() {
    this.metadataService = new MetadataHandlerService();
  }

  /**
   * 通过方法编号取得服务方法元数据，目的是为了保持id在重新生成后不变
   * @remarks 由于类结构是通过babel从ts代码中解析的，所以假定方法编号不会重复
   */
  private findOperationByCode(code: string, webcmp: WebComponentMetadata): WebComponentOperation | null {
    if (!code || !webcmp) {
      return null;
    }
    return webcmp.Operations.find(opt => opt.Code === code) || null;
  }

  /**
   * 将ts代码映射为webcmp元数据
   * @param classes - ts代码解析结果
   * @param oldWebcmp - 旧的服务构件，用于提供无法从ts代码中获取的信息
   * @returns 新的服务构件或错误信息
   */
  public mapTsCode2Webcmp(classes: IClass[], oldWebcmp: WebComponentMetadata): WebComponentMetadata | string {
    // 遍历每一个声明，提取导出类声明
    const classDeclarationArr: IClass[] = [];
    for (const classDeclaration of classes) {
      if (classDeclaration.exported) {
        classDeclarationArr.push(classDeclaration);
      }
    }
    // 检查是否有错误，返回错误信息
    if (classDeclarationArr.length > 1) {
      return "最多只允许导出一个类，请检查ts代码";
    }
    if (classDeclarationArr.length === 0) {
      return "必须导出一个类，请检查ts代码";
    }
    const classDeclaration = classDeclarationArr[0];
    const operations = new Array<WebComponentOperation>();
    // 遍历导出类声明中的每一个方法
    if (classDeclaration && classDeclaration.methods) {
      for (const methodDeclaration of classDeclaration.methods) {
        if (methodDeclaration.accessibility === 'private' || methodDeclaration.accessibility === 'protected') {
          continue;
        }
        if (methodDeclaration.kind !== 'method') {
          continue;
        }
        // 将公有方法转化为Web构件操作元数据
        const operation = new WebComponentOperation();
        const oldOperation = this.findOperationByCode(methodDeclaration.code, oldWebcmp);
        operation.Parameters = new Array<WebComponentOperationParameter>();
        operation.Id = oldOperation && oldOperation.Id || this.metadataService.uuid();
        operation.Code = methodDeclaration.code;
        operation.Name = methodDeclaration.name || methodDeclaration.code;
        operation.Description = methodDeclaration.description || '';
        // 将方法的形参列表转化为元数据
        if (methodDeclaration.params) {
          for (const paramDeclaration of methodDeclaration.params) {
            const param = new WebComponentOperationParameter();
            param.Id = this.metadataService.uuid();
            param.Code = paramDeclaration.code;
            // 通过参数注解只能提取出一个字符串，用作参数的中文名称，参数的说明需要用户通过构件设计器手动输入
            param.Name = paramDeclaration.description || paramDeclaration.code;
            param.ParameterType = paramDeclaration.type || 'any';
            // 通过code字段找到旧的参数描述
            let oldDescription = '';
            if (oldOperation) {
              const oldParam = oldOperation.Parameters.find(p => p.Code === paramDeclaration.code);
              oldParam && (oldDescription = oldParam.Description || '');
            }
            param.Description = oldDescription;
            param.IsRetVal = false;
            param.ParentId = operation.Id;
            operation.Parameters.push(param);
          }
        }
        // 将方法的返回值转化为元数据
        if (methodDeclaration.type) {
          const ret = new WebComponentOperationParameter();
          const RETURN_VALUE_CODE = "returnValue";
          ret.Id = this.metadataService.uuid();
          ret.Code = RETURN_VALUE_CODE;
          ret.Name = RETURN_VALUE_CODE;
          ret.ParameterType = methodDeclaration.type || 'any';
          ret.Description = methodDeclaration.returns || '';
          ret.IsRetVal = true;
          ret.ParentId = operation.Id;
          operation.Parameters.push(ret);
        }
        operations.push(operation);
      }
    }
    const webCmpMetadata = new WebComponentMetadata();
    webCmpMetadata.ClassName = classDeclaration.code;
    webCmpMetadata.Operations = operations;
    webCmpMetadata.name = classDeclaration.name || oldWebcmp.name;
    webCmpMetadata.Description = classDeclaration.description || oldWebcmp.Description;
    // 为新的webcmp元数据附加其它信息
    return this.completeNewWebcmp(oldWebcmp, webCmpMetadata);
  }

  /**
   * 生成一个被补全的新的Web构件
   * @remarks 通过ts代码中解析出来的构件元数据只包含类、方法、方法参数等能够从ts代码中提取出来的信息，缺少构件编号、源码路径、表单路径等字段
   * @param oldWebcmp - 旧的Web构件
   * @param newWebcmp - 新的Web构件
   * @returns 完整的Web构件
   */
  private completeNewWebcmp(oldWebcmp: WebComponentMetadata, newWebcmp: WebComponentMetadata): WebComponentMetadata {
    // 由于新构件中的字段较少，所以反向操作，复制一份旧数据并将新字段更新上去
    const completeWebcmp = cloneDeep(oldWebcmp) as WebComponentMetadata;
    completeWebcmp.ClassName = newWebcmp.ClassName;
    completeWebcmp.Operations = newWebcmp.Operations;
    completeWebcmp.name = newWebcmp.name;
    completeWebcmp.Description = newWebcmp.Description;
    return completeWebcmp;
  }

  /**
   * 生成一个新的Web构件元数据传输对象
   * @remarks 更新dto的扩展字段
   * @param tsCode - ts代码
   * @param oldDto - 旧的Web构件元数据传输对象
   * @returns 新的Web构件元数据传输对象
   */
  public generateUpdatedWebcmpDto(tsCode: string, oldDto: any): any {
    const newDto = cloneDeep(oldDto) as any;
    const extendProperty = newDto.extendProperty || "{}";
    const parsedExtendProperty = JSON.parse(extendProperty);
    parsedExtendProperty["sourceCode"] = tsCode;
    newDto.extendProperty = JSON.stringify(parsedExtendProperty);
    return newDto;
  }

}

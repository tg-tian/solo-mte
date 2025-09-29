import { MetadataConverter } from "../../type/metadata-converter";

/**
 * Web构件方法参数
 */
export class WebComponentOperationParameter implements MetadataConverter {
  Id: string='';
  Code: string='';  // 参数编号，同ts文件中参数名
  Name: string='';  // 参数名称，默认与编号相同，可以在编辑器中修改，但是发布到构件后会被覆盖
  Description: string='';    // 参数描述，发布到构件后会被覆盖
  ParameterType: string='';  // 参数类型
  IsRetVal: boolean=false;      // 是否返回值
  ParentId: string='';

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this.Id = metadata.Id;
    this.Code = metadata.Code;
    this.Name = metadata.Name;
    this.Description = metadata.Description;
    this.ParameterType = metadata.ParameterType;
    this.IsRetVal = metadata.IsRetVal;
  }

  output(): any {
    return {
      Id: this.Id,
      Code: this.Code,
      Name: this.Name,
      Description: this.Description,
      ParameterType: this.ParameterType,
      IsRetVal: this.IsRetVal,
      ParentId: this.ParentId
    };
  }

  public equal(item: WebComponentOperationParameter): boolean {
    // 不比对名称字段
    return this.Id === item.Id
      && this.Code === item.Code
      && this.Description === item.Description
      && this.ParameterType === item.ParameterType
      && this.IsRetVal === item.IsRetVal;
  }
}
/**
 * Web构件方法
 */
export class WebComponentOperation implements MetadataConverter {
  Id: string='';
  Code: string='';         // 方法编号，同ts文件中方法名
  Name: string='';         // 方法名称，默认与编号相同，可以在编辑器中修改，但是发布到构件后会被覆盖
  Description: string='';  // 方法描述，发布到构件后会被覆盖
  Parameters: WebComponentOperationParameter[]=[];  // 方法参数

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this.Id = metadata.Id;
    this.Code = metadata.Code;
    this.Name = metadata.Name;
    this.Description = metadata.Description;
    this.Parameters = [];
    if (metadata.Parameters && Array.isArray(metadata.Parameters)) {
      for (const param of metadata.Parameters) {
        const newParamMeta = new WebComponentOperationParameter();
        newParamMeta.ParentId = metadata.Id;
        newParamMeta.input(param);
        this.Parameters.push(newParamMeta);
      }
    }
  }

  output(): any {
    const result = {
      Id: this.Id,
      Code: this.Code,
      Name: this.Name,
      Description: this.Description,
      Parameters: [] as any
    };
    for (const param of this.Parameters) {
      result.Parameters.push(
        param.output()
      );
    }
    return result;
  }
}

/**
 * Web构件元数据
 */
export class WebComponentMetadata implements MetadataConverter {
  Id: string = '';
  Code: string = '';         // 构件编号
  name: string = '';         // 构件名称，历史版本一直为null，计划在新版本填充实际的构件名称
  Description: string = '';  // 构件描述
  Source: string = '';       // ts文件位置
  Operations: WebComponentOperation[] = [];  // 方法列表
  IsCommon: boolean = true;
  ClassName: string = '';    // ts文件中服务类名
  FormCode: string = '';     // 所属表单元数据编号
  // 以下为附加字段
  relativePath?: string;  // 构件的相对路径

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this.Id = metadata.Id;
    this.Code = metadata.Code;
    this.name = metadata.name;
    this.Description = metadata.Description;
    this.Source = metadata.Source;
    this.Operations = [];
    this.IsCommon = metadata.IsCommon;
    this.ClassName = metadata.ClassName;
    this.FormCode = metadata.FormCode;
    if (metadata.Operations && Array.isArray(metadata.Operations)) {
      for (const opt of metadata.Operations) {
        const newOptMeta = new WebComponentOperation();
        newOptMeta.input(opt);
        this.Operations.push(newOptMeta);
      }
    }
  }

  output(): any {
    const result = {
      Id: this.Id,
      Code: this.Code,
      name: this.name,
      Description: this.Description,
      Source: this.Source,
      Operations: [] as any,
      IsCommon: this.IsCommon,
      ClassName: this.ClassName,
      FormCode: this.FormCode
    };
    for (const opt of this.Operations) {
      result.Operations.push(
        opt.output()
      );
    }
    return result;
  }

  shallowCopy(): any {
    return Object.assign(new WebComponentMetadata(), this);
  }
}


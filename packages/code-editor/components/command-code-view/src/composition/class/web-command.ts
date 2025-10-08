import { MetadataConverter } from "../../type/metadata-converter";
import { BranchCommandItem } from "./branch";
import { BranchCollectionCommandItem } from "./branch-collection";
import { CommandItem, CommandItemType } from "./command-item";
import { MethodReferCommandItem } from "./method-refer";
import { WebComponentMetadata } from "./web-component";

/**
 * 命令参数
 */
export class CommandParameter implements MetadataConverter {
  Id: string = '';
  Code: string = '';
  Name: string = '';
  Description: string = '';
  ParameterType: string = '';
  IsRetVal: boolean = false;
  EditorType: string = '';
  ParentId: string = '';
  // 影响服务器端反编译
  controlSource=null;

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
    this.EditorType = metadata.EditorType;
    this.controlSource = metadata.controlSource;
  }

  output(): any {
    return {
      Id: this.Id,
      Code: this.Code,
      Name: this.Name,
      Description: this.Description,
      ParameterType: this.ParameterType,
      IsRetVal: this.IsRetVal,
      EditorType: this.EditorType,
      ParentId: this.ParentId,
      controlSource: this.controlSource
    };
  }

  public equal(item: CommandParameter): boolean {
    // 不比对名称字段
    return this.Id === item.Id
      && this.Code === item.Code
      && this.Description === item.Description
      && this.ParameterType === item.ParameterType
      && this.IsRetVal === item.IsRetVal
      && this.EditorType === item.EditorType
      && this.controlSource === item.controlSource;
  }
}
/**
 * 命令
 */
export class WebCommand implements MetadataConverter {
  Id: string = '';
  Code: string = '';
  Name: string = '';
  Description: string = '';
  Parameters: CommandParameter[] = [];
  Items: CommandItem[] = [];

  /**
   * 是否代码方法
   * @remarks
   * “代码方法”或者叫“简单方法”，指的是只包含一个命令编排项的命令，且该命令编排项是本命令构件关联的ts代码中的方法
   * “代码方法”不可编辑，信息完全由ts代码中提取而得，可以通过点击按钮直接跳转并定位到ts方法
   */
  isCodeMethod: boolean;

  constructor() {
    this.isCodeMethod = false;
  }

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this.Id = metadata.Id;
    this.Code = metadata.Code;
    this.Name = metadata.Name;
    this.Description = metadata.Description;
    this.Parameters = [];
    this.Items = [];
    if (metadata.Parameters && Array.isArray(metadata.Parameters)) {
      for (const param of metadata.Parameters) {
        const newParamMeta = new CommandParameter();
        newParamMeta.ParentId = metadata.Id;
        newParamMeta.input(param);
        this.Parameters.push(newParamMeta);
      }
    }
    // 主干中只包含操作和分支集合
    if (metadata.Items && Array.isArray(metadata.Items)) {
      for (const item of metadata.Items) {
        let newItemMeta: CommandItem | null = null;
        switch (item.itemType) {
          case CommandItemType.MethodRefer:
            newItemMeta = new MethodReferCommandItem();
            break;
          case CommandItemType.BranchCollection:
            newItemMeta = new BranchCollectionCommandItem();
            break;
        }
        if (newItemMeta) {
          newItemMeta.input(item);
          newItemMeta.parent = this;
          this.Items.push(newItemMeta);
        }
      }
    }
  }

  output(): any {
    const result = {
      Id: this.Id,
      Code: this.Code,
      Name: this.Name,
      Description: this.Description,
      Parameters: [] as any,
      Items: [] as any
    };
    for (const param of this.Parameters) {
      result.Parameters.push(
        param.output()
      );
    }
    for (const item of this.Items) {
      result.Items.push(
        item.output()
      );
    }
    return result;
  }

  /**
   * 判断该命令是否是一个简单方法（代码方法）
   * @param webcmp - 专属的服务构件
   * @returns 是否简单方法
   */
  public isSimpleMethod(webcmp: WebComponentMetadata): boolean {
    if (this.Items.length === 1) {
      const item = this.Items[0];
      if (item instanceof MethodReferCommandItem && item.ComponentId === webcmp.Id) {
        return true;
      }
    }
    return false;
  }

  /**
   * 根据命令编排项Id查找命令编排项
   * @param id - 命令编排项Id
   * @returns 命令编排项
   */
  getCommandItemById(id: string): CommandItem | null {
    return this.findCommandItem(this.Items, id);
  }
  private findCommandItem(items: CommandItem[], id: string): CommandItem | null {
    if (!items || items.length === 0) {
      return null;
    }
    for (const item of items) {
      if (item.Id === id) {
        return item;
      }
    }
    for (const item of items) {
      if (item instanceof BranchCollectionCommandItem || item instanceof BranchCommandItem) {
        const result = this.findCommandItem(item.Items, id);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }
}
/**
 * 命令构件扩展参数
 */
export class WebCommandExtends implements MetadataConverter {
  FormCode: string = '';
  IsCommon: boolean = false;

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this.FormCode = metadata.FormCode;
    this.IsCommon = metadata.IsCommon;
  }

  output(): any {
    return {
      FormCode: this.FormCode,
      IsCommon: this.IsCommon
    };
  }
}

/**
 * 命令构件元数据
 */
export class WebCommandMetadata implements MetadataConverter {
  Id: string = '';
  Code: string = '';
  Name: string = '';
  Description: string = '';
  Extends: WebCommandExtends | null = null;
  Commands: WebCommand[] = [];

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this.Id = metadata.Id;
    this.Code = metadata.Code;
    this.Name = metadata.Name;
    this.Description = metadata.Description;
    const webCommandExtends = new WebCommandExtends();
    webCommandExtends.input(metadata.Extends);
    this.Extends = webCommandExtends;
    this.Commands = [];
    if (metadata.Commands && Array.isArray(metadata.Commands)) {
      for (const command of metadata.Commands) {
        const newCommandMeta = new WebCommand();
        newCommandMeta.input(command);
        this.Commands.push(newCommandMeta);
      }
    }
  }

  output(): any {
    const result = {
      Id: this.Id,
      Code: this.Code,
      Name: this.Name,
      Description: this.Description,
      Extends: this.Extends && this.Extends.output(),
      Commands: [] as any
    };
    for (const command of this.Commands) {
      result.Commands.push(
        command.output()
      );
    }
    return result;
  }

  shallowCopy(): any {
    return Object.assign(new WebCommandMetadata(), this);
  }

  /**
   * 根据命令Id查找命令
   * @param id - 命令Id
   * @returns 命令
   */
  getCommandById(id: string): WebCommand | null {
    return this.Commands.find(cmd => cmd.Id === id) || null;
  }
}


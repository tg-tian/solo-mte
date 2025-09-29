import { BranchCommandItem } from "./branch";
import { BranchCollectionCommandItem } from "./branch-collection";
import { MetadataConverter } from "./metadata-converter";
import { WebCommand } from "./web-command";

/**
 * 命令编排项类型
 */
export enum CommandItemType {
  MethodRefer = 0,
  Branch = 1,
  BranchCollection = 2
}
/**
 * 命令编排项
 */
export abstract class CommandItem implements MetadataConverter {
  Id: string='';
  Code: string='';
  Name: string='';
  itemId: string='';
  itemType: CommandItemType;
  itemName: string='';

  parent: WebCommand | BranchCollectionCommandItem | BranchCommandItem;

  abstract input(metadata :any): void;
  abstract output(): any;

  protected _input(metadata :any): void {
    if (!metadata) {
      return;
    }
    this.Id = metadata.Id;
    this.Code = metadata.Code;
    this.Name = metadata.Name;
    this.itemId = metadata.itemId;
    this.itemType = metadata.itemType;
    this.itemName = metadata.itemName;
  }

  protected _output(): any {
    return {
      Id: this.Id,
      Code: this.Code,
      Name: this.Name,
      itemId: this.itemId,
      itemType: this.itemType,
      itemName: this.itemName
    };
  }

  public canMoveUp(): boolean {
    const items = this.parent.Items;
    return items.length > 0 && items[0] !== this;
  }

  public canMoveDown(): boolean {
    const items = this.parent.Items;
    return items.length > 0 && items[items.length - 1] !== this;
  }
}



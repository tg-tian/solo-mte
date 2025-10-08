import { CommandItem, CommandItemType } from './command-item';
import { MethodReferCommandItem } from './method-refer';
import { BranchCollectionCommandItem } from './branch-collection';

/**
 * 分支类型
 */
export enum ConditionType {
  IF = 0,
  ELSEIF = 1,
  ELSE = 2
}

/**
 * 命令编排项 - 分支
 */
export class BranchCommandItem extends CommandItem {
  ConditionType: ConditionType=ConditionType.IF;
  Express: string='';
  Items: CommandItem[]=[];

  input(metadata :any): void {
    if (!metadata) {
      return;
    }
    this._input(metadata);
    this.ConditionType = metadata.ConditionType;
    this.Express = metadata.Express;
    // 分支中只包含操作和分支集合
    this.Items = [];
    if (metadata.Items && Array.isArray(metadata.Items)) {
      for (const item of metadata.Items) {
        let newItemMeta: CommandItem|null = null;
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
    const content = this._output();
    content.ConditionType = this.ConditionType;
    content.Express = this.Express;
    content.Items = [];
    for (const item of this.Items) {
      content.Items.push(
        item.output()
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

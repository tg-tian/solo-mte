import { CommandItem, CommandItemType } from "./command-item";
import { BranchCommandItem } from './branch';

/**
 * 命令编排项 - 分支集合
 */
export class BranchCollectionCommandItem extends CommandItem {
  Items: CommandItem[] = [];

  input(metadata: any): void {
    if (!metadata) {
      return;
    }
    this._input(metadata);
    // 分支集合中只包含分支
    this.Items = [];
    if (metadata.Items && Array.isArray(metadata.Items)) {
      for (const item of metadata.Items) {
        if (item.itemType === CommandItemType.Branch) {
          const newItemMeta = new BranchCommandItem();
          newItemMeta.input(item);
          newItemMeta.parent = this;
          this.Items.push(newItemMeta);
        }
      }
    }
  }

  output(): any {
    const content = this._output();
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

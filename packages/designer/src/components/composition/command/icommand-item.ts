import { CommandItemType } from "./command-item-type";
import { CmpMethodRefering } from "./command-method-refering";
import { BranchCommandItemConvertor, BranchCommandItem } from "./branch-command-item";
import { BranchCollectionCommandItemConvertor, BranchCollectionCommandItem } from "./branch-collection-command-item";

export interface ICommandItem
{
     GetItemType():CommandItemType;

     GetItemCode():string;

     GetItemName():string;

     GetItemId():string;
}

export class CommandItemConvertor {
    ConvertJObject(obj: ICommandItem): object {
        const commandItem = obj as ICommandItem;
        const itemType = commandItem.GetItemType();
        const jobj = new Object();
        jobj["Type"] = itemType;
        if (itemType === CommandItemType.MethodRefer) {
            jobj["Content"] = commandItem;
        }
        else if (itemType === CommandItemType.Branch) {
           const  branchConvertor=new BranchCommandItemConvertor();
           jobj["Content"] = branchConvertor.ConvertJObject(commandItem as BranchCommandItem);
        }
        else if (itemType === CommandItemType.BranchCollection) {
            const  branchCollectionConvertor=new BranchCollectionCommandItemConvertor();
            jobj["Content"] = branchCollectionConvertor.ConvertJObject(commandItem as BranchCollectionCommandItem);
        }
        return jobj;
    }

    InitFromJobject(jsonObj: object): ICommandItem|null {
        const itemType=jsonObj["Type"] as CommandItemType;
        const content:ICommandItem=jsonObj["Content"]; 
        if (itemType === CommandItemType.MethodRefer) {
            return Object.assign(new CmpMethodRefering(),content as CmpMethodRefering);;
        }
        else if (itemType === CommandItemType.Branch) {
            const  branchConvertor=new BranchCommandItemConvertor();
            return branchConvertor.InitFromJobject(jsonObj["Content"]);
        }
        else if (itemType === CommandItemType.BranchCollection) {
            const  branchCollectionConvertor=new BranchCollectionCommandItemConvertor();
            return branchCollectionConvertor.InitFromJobject(jsonObj["Content"]);
        }
        return null;
    }
}

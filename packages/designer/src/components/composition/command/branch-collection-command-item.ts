import { ICommandItem } from "./icommand-item";
import { CommandItemType } from "./command-item-type";
import { BranchCommandItem, BranchCommandItemConvertor } from "./branch-command-item";

export class BranchCollectionCommandItem implements ICommandItem {
    Id: string='';
    Code:string='';
    Name: string='';
    Items: Array<BranchCommandItem>=[];
    GetItemId(): string {
        return this.Id;
    }
    GetItemCode(): string {
        return this.Code;
    }
    GetItemName(): string {
        return this.Name;
    }
    GetItemType(): CommandItemType {
        return CommandItemType.BranchCollection;
    }
}

export class BranchCollectionCommandItemConvertor {
    ConvertJObject(obj: BranchCollectionCommandItem): object {
        const branchCollection = obj as BranchCollectionCommandItem;
        const jobj = new Object();
        jobj["Id"] = branchCollection.Id;
        jobj["Code"] = branchCollection.Code;
        jobj["Name"] = branchCollection.Name;
        if (branchCollection.Items != null) {
            const itemArray = [] as any;
            const itemConvertor = new BranchCommandItemConvertor();
            branchCollection.Items.forEach(element => {
                itemArray.push(itemConvertor.ConvertJObject(element));
            });
            jobj["Items"]=itemArray;
        }
        return jobj;
    }

    InitFromJobject(jsonObj: object): BranchCollectionCommandItem {
        const branchCollectionItem = new BranchCollectionCommandItem();
        branchCollectionItem.Id = jsonObj["Id"];
        branchCollectionItem.Code = jsonObj["Code"];
        branchCollectionItem.Name = jsonObj["Name"];
        if (jsonObj["Items"] != null) {
            branchCollectionItem.Items=new Array<BranchCommandItem>();
            const itemConvertor = new BranchCommandItemConvertor();
            jsonObj["Items"].forEach(element => {
                branchCollectionItem.Items.push(itemConvertor.InitFromJobject(element));
            });
        }
        return branchCollectionItem;
    }
}

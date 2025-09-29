import { CommandItemType } from "./command-item-type";
import { ICommandItem, CommandItemConvertor } from "./icommand-item";
import { ConditionType } from "./condition-type";

export class BranchCommandItem implements ICommandItem {
    Id: string = '';
    Code: string = '';
    Name: string = '';
    ConditionType: ConditionType = ConditionType.IF;
    Express: string = '';
    Items: Array<ICommandItem> = [];

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
        return CommandItemType.Branch;
    }
}

export class BranchCommandItemConvertor {
    ConvertJObject(obj: BranchCommandItem): object {
        const branchItem = obj as BranchCommandItem;
        const jobj = new Object();
        jobj["Id"] = branchItem.Id;
        jobj["Code"] = branchItem.Code;
        jobj["Name"] = branchItem.Name;
        jobj["ConditionType"] = branchItem.ConditionType;
        jobj["Express"] = branchItem.Express;
        if (branchItem.Items != null) {
            const itemArray = [] as any;
            const itemConvertor = new CommandItemConvertor();
            branchItem.Items.forEach(element => {
                itemArray.push(itemConvertor.ConvertJObject(element));
            });
            jobj["Items"] = itemArray;
        }
        return jobj;
    }

    InitFromJobject(jsonObj: object): BranchCommandItem {
        const branchItem = new BranchCommandItem();
        branchItem.Id = jsonObj["Id"];
        branchItem.Code = jsonObj["Code"];
        branchItem.Name = jsonObj["Name"];
        branchItem.ConditionType = jsonObj["ConditionType"];
        branchItem.Express = jsonObj["Express"];
        if (jsonObj["Items"] != null) {
            branchItem.Items = new Array<ICommandItem>();
            const itemConvertor = new CommandItemConvertor();
            jsonObj["Items"].forEach(element => {
                const initFormJobject=itemConvertor.InitFromJobject(element);
                if(initFormJobject){
                    branchItem.Items.push(initFormJobject);
                }
            });
        }
        return branchItem;
    }
}

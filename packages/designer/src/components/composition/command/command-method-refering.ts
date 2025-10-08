import { CmpMethodParamConfig } from "./command-method-param-config";
import { ICommandItem } from "./icommand-item";
import { CommandItemType } from "./command-item-type";

export class CmpMethodRefering implements ICommandItem {
    
    Id:string='';
    Code:string='';
    Name:string='';
    ComponentId: string='';
    ComponentCode: string='';
    ComponentName: string='';
    ComponentPath: string='';
    MethodId: string='';
    MethodCode: string='';
    MethodName: string='';
    IsReplaced:boolean=false;
    IsBeforeExpansion:boolean=false;
    IsAfterExpansion:boolean=false;
    ParamConfigs: Array<CmpMethodParamConfig>=[];

    GetItemType(): CommandItemType {
        return CommandItemType.MethodRefer;
    }
    GetItemCode(): string {
        return this.Code;
    }
    GetItemName(): string {
        return this.Name;
    }
    GetItemId(): string {
        return this.Id;
    }
}

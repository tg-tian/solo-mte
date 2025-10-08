import { ICommandItem, CommandItemConvertor } from "./icommand-item"; 
import { CmdParameter } from "./command-parameter";

export class FormCommand{
    Id:string='';
    Code:string='';
    Name:string='';
    Description:string='';
    Parameters:Array<CmdParameter>=[];
    SourceCode:string='';
    Items: Array<ICommandItem>=[];
}

export class CommandConvertor
{
    ConvertJObject(obj : FormCommand): object {
        
        const cmpOp = obj as FormCommand;
        const jobj=new Object();
        jobj["Id"]=cmpOp.Id;
        jobj["Code"]=cmpOp.Code;
        jobj["Name"]=cmpOp.Name;
        jobj["Description"]=cmpOp.Description;
        jobj["SourceCode"]=cmpOp.SourceCode;
        jobj["Parameters"]=cmpOp.Parameters;
        const items=[] as any;
        if(cmpOp.Items!=null)
        {
            const itemConvertor = new CommandItemConvertor();
            cmpOp.Items.forEach(element => {
                items.push(itemConvertor.ConvertJObject(element));
            }); 
        }
        jobj["Items"]=items;
        return jobj;
    }    
    
    InitFromJobject(jsonObj: object): FormCommand {
        const cmpOp = new FormCommand();
        cmpOp.Id = jsonObj["Id"];
        cmpOp.Code = jsonObj["Code"];
        cmpOp.Name = jsonObj["Name"];
        cmpOp.Description = jsonObj["Description"];
        cmpOp.SourceCode = jsonObj["SourceCode"];
        cmpOp.Parameters=jsonObj["Parameters"];
        cmpOp.Items=new Array<ICommandItem>();
        if(jsonObj["Items"]!=null)
        {
            const itemConvertor = new CommandItemConvertor();
            jsonObj["Items"].forEach(element => {
                const initFormJobject=itemConvertor.InitFromJobject(element);
                if(initFormJobject){
                    cmpOp.Items.push();
                }
            });
        }
        return cmpOp;
    }
}

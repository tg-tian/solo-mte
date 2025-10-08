import { FormCommand, CommandConvertor } from "./command";
import { ExtendProperty, ExtendsConvert } from "./extend-property";

export class CommandMetadata {
    Id: string='';
    Code: string='';
    Name: string='';
    Description: string='';
    Extends:ExtendProperty|null=null;
    Commands: Array<FormCommand>=[];
}

export class CommandMetadataConvertor {
    ConvertJObject(obj: CommandMetadata): object {
        const metadata: CommandMetadata = obj as CommandMetadata;
        const jobj = new Object();
        jobj["Id"] = metadata.Id;
        jobj["Code"] = metadata.Code;
        jobj["Name"] = metadata.Name;
        jobj["Description"] = metadata.Description;
        if (metadata.Commands != null) {
            const CommandsJArry = jobj["Commands"] || [];
            const convertor = new CommandConvertor();
            metadata.Commands.forEach(command => {
                CommandsJArry.push(convertor.ConvertJObject(command));
            });
        }
        if(metadata.Extends!=null){
            const convertor = new ExtendsConvert();
            jobj["Extends"] =convertor.ConvertJObject(metadata.Extends);
        }
        return jobj;
    }

    InitFromJobject(jsonObj: object): CommandMetadata {
        const metadata = new CommandMetadata();
        metadata.Id = jsonObj["Id"];
        metadata.Code = jsonObj["Code"];
        metadata.Name = jsonObj["Name"];
        metadata.Description = jsonObj["Description"];
        const CommandsJArry = jsonObj["Commands"];
        if (CommandsJArry != null) {
            metadata.Commands = new Array<FormCommand>();
            CommandsJArry.forEach(element => {
                const cmpOpSerializer = new CommandConvertor();
                metadata.Commands.push(cmpOpSerializer.InitFromJobject(element) as FormCommand);
            });
        }
        const convertor = new ExtendsConvert();
        metadata.Extends=convertor.InitFromJobject(jsonObj["Extends"]);
        return metadata;
    }
}

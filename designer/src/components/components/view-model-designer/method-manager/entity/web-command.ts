/** 摘录于 @gsp-cmp/webcommand */
export enum ConditionType {
    IF = 0,
    ELSEIF = 1,
    ELSE = 2
}

export enum CommandItemType {
    MethodRefer = 0,
    Branch = 1,
    BranchCollection = 2
}

export interface CmdParameter {
    Id: string;

    Code: string;

    Name: string;

    Description: string;

    ParameterType: string;

    IsRetVal: boolean;

    EditorType?: string;

    controlSource?: string;

    defaultValue?: any;
}

export interface ICommandItem {

    itemType: CommandItemType;

    itemCode: string;

    itemName: string;

    itemId: string;
}

export interface WebCommand {
    Id: string;

    Code: string;

    Name: string;

    Description: string;

    Parameters: Array<CmdParameter>;

    SourceCode: string;

    Items: Array<ICommandItem>;
}

export interface ExtendProperty {
    FormCode: string;

    IsCommon: boolean;
}

export interface WebCommandMetadata {
    Id: string;

    Code: string;

    Name: string;

    Description: string;

    Extends: ExtendProperty;

    Commands: Array<WebCommand>;
}

export interface CmpMethodParamConfig {

    ParamCode: string;

    ParamName: string;

    ParamExpress: string;
}

export interface CmpMethodRefering {
    Id: string;

    Code: string;

    Name: string;

    ComponentId: string;

    ComponentCode: string;

    ComponentName: string;

    ComponentPath: string;

    MethodId: string;

    MethodCode: string;

    MethodName: string;

    IsReplaced: boolean;

    IsBeforeExpansion: boolean;

    IsAfterExpansion: boolean;

    ParamConfigs: Array<CmpMethodParamConfig>;

    itemType: CommandItemType;

    itemId: string;

    itemCode: string;

    itemName: string;
}

export interface BranchCommandItem extends ICommandItem {
    Id: string;

    Code: string;

    Name: string;

    ConditionType: ConditionType;

    Express: string;

    Items: Array<ICommandItem>;

    itemType: CommandItemType;

    itemId: string;

    itemCode: string;

    itemName: string;
}

export interface BranchCollectionCommandItem extends ICommandItem {
    Id: string;

    Code: string;

    Name: string;

    Items: Array<BranchCommandItem>;

    itemType: CommandItemType;

    itemId: string;

    itemCode: string;

    itemName: string;
}

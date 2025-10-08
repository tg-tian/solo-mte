 

/** 构件操作参数 */
export declare class Parameter {
    Id: string;

    Code: string;

    Name: string;

    Description: string;

    ParameterType: string;

    IsRetVal: boolean;
}

/** 构件操作 */
export declare class Operation {
    Id: string;

    Code: string;

    Name: string;

    Description: string;

    Parameters: Array<Parameter>;
}

/**
 * Web构件元数据
 */
export declare class WebComponentMetadata {
    Id: string;

    Code: string;

    Description: string;

    Source: string;

    Operations: Array<Operation>;

    IsCommon: boolean;

    ClassName: string;

    FormCode: string;

    PackageName: string;

    PackageVersion: string;

    Version: number;
}

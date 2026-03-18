export interface PropertyDefinition {
    type: "string" | "number" | "boolean" | "enum" | "object" | "array";
    unit?: string;
    readOnly?: boolean;
    min?: number;
    max?: number;
    enumValues?: string[];
    description?: string;
}

export enum ComponentType {
    Node = 'node',
    Edge = 'edge'
}

export enum PurposeType {
    BusinessFlow = 'businessFlow',
    InterfaceFlow = 'interfaceFlow',
    DeviceLogic = 'deviceLogic'
}

export interface Constraint {
    quantity: number;
    type: string;
}

export interface InputParam {
    name: string;
    type: string;
}

export interface Component {
    id?: number;
    code: string;
    name: string;
    description: string;
    type: string;
    purpose: PurposeType;
    createTime?: string;
    updateTime?: string;
    inputs?: InputParam[];
    outputs?: Array<{ type: string }>;
    outputType?: string;
    properties?: Record<string, PropertyDefinition>;
    inputConstraint?: Constraint;
    outputConstraint?: Constraint;
    startConstraint?: Constraint;
    endConstraint?: Constraint;
}

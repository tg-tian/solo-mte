/**
 * 流程分类的注册信息
 */
export interface FlowKindInfo {
    /** 流程分类的类型，对应流程编排元数据中的`kind`字段 */
    id: string;
    code: string;
    name: string;
    note: string;
    orderIndex: number;
    /** 图标地址 */
    iconUrl: string;
    /** 所属的扩展脚本地址 */
    jsUrl: string;
}

/** 代码内容：支持 Monaco Editor 与 diff 展示 */
export interface CodingCode {
    /** 当前/修改后代码（Monaco modified model） */
    value: string;
    /** 原始代码（Monaco original model，存在时展示 diff） */
    originalValue?: string;
    /** 语言标识，如 typescript、javascript */
    language?: string;
    /** 新增行数，用于标题展示 */
    addedLines: number;
    /** 删除行数，用于标题展示 */
    deletedLines: number;
}
/** 编码消息类型内容 */
export interface MessageContentCoding {
    type: 'Coding';
    /** 与网关 `body.type` 对账，演示用 `agent/code-change` */
    standardType?: 'agent/code-change' | 'agent/coding' | string;
    message: string;
    fileIcon: string;
    fileName: string;
    code: CodingCode;
}

/**
 * 标准产品发布进度消息(来自进度 WebSocket)。
 * 与标准产品 web-ide2022 publish.component.ts 的 progressInfo 结构一致。
 */
export interface PublishProgress {
    /** 完成百分比 0-100;process === 100 表示发布成功 */
    process: number;
    /** 当前阶段:0=正在生成代码 1=正在进行后端编译 2=正在进行前端编译 3=正在打包应用 4=正在部署应用 */
    stage: number;
    /** 状态:0=进行中 1=失败 */
    status: number;
    /** 失败时的错误信息 */
    errorMsg?: string;
    /** 部署后是否重启了运行时服务(后端单向通知,前端不消费) */
    reStart?: number;
}

/** 发布结果,返回给调用方 */
export interface PublishResult {
    result: boolean;
    error?: string;
}

/** 发布阶段文案(与标准产品面板一致,按图标区分进行/完成状态,文案不带"正在"前缀) */
export const PUBLISH_STAGES: string[] = [
    '生成代码',
    '后端编译',
    '前端编译',
    '打包应用',
    '部署应用',
];

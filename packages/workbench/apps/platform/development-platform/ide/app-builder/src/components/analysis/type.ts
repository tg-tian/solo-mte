export interface AyalysisTask {
    /** 任务ID */
    id: string;
    /** 任务名称 */
    name: string;
    /** 提交时间 */
    creationTime: Date;
    /** 完成时间 */
    completedTime: Date;
    /** 关联应用 */
    targetApp: string;
    /** 版本标志 */
    version: string;
    /** 分析选项 */
    options: string[]
    /** 分析状态 */
    status: number;
    /** 备注 */
    description: string;
}

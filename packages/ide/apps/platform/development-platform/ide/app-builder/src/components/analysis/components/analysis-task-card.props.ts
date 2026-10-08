import { ExtractPropTypes } from "vue";

export const analysisTaskCardProps = {
    /** 默认任务名称 */
    defaultTaskName: {
        type: String,
        default: ''
    }
};

export type AnalysisTaskCardProps = ExtractPropTypes<typeof analysisTaskCardProps>;

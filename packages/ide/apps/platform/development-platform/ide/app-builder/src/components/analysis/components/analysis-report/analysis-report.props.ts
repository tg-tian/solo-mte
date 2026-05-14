import { ExtractPropTypes } from "vue";

export const analysisReportProps = {
    /** 报告ID，可选 */
    reportId: {
        type: String,
        default: null
    },
    /** 任务ID，可选 */
    taskId: {
        type: String,
        default: null
    },
    /** 是否全屏模式 */
    fullscreen: {
        type: Boolean,
        default: false
    }
};

export type AnalysisReportProps = ExtractPropTypes<typeof analysisReportProps>;

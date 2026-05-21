import { ExtractPropTypes } from "vue";

export const analysisProps = {
    /** 当前应用名称，用于过滤任务列表和新建任务默认名称 */
    appName: {
        type: String,
        default: ''
    }
};

export type AnalysisProps = ExtractPropTypes<typeof analysisProps>;

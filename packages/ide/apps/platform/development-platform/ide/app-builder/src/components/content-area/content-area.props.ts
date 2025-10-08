import { ExtractPropTypes } from "vue";

export const contentAreaProps = {
    residentFunctions: { type: Array<any>, default: [] },
    showHeader: { type: Boolean, default: true }
};

export type ContentAreaProps = ExtractPropTypes<typeof contentAreaProps>;

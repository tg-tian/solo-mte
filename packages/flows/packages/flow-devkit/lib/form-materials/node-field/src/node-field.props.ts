import type { ExtractPropTypes } from 'vue';

export const nodeFieldProps = {
    name: { type: String },
    labelClass: { type: String, default: '' },
    contentClass: { type: String, default: '' },
};

export type NodeFieldProps = ExtractPropTypes<typeof nodeFieldProps>;

import type { ExtractPropTypes } from "vue";

export const functionBoardProps = {
    modelValue: {
        type: Boolean,
        required: true as const,
    },
};

export type FunctionBoardProps = ExtractPropTypes<typeof functionBoardProps>;

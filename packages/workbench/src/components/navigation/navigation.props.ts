import { ExtractPropTypes } from "vue";

export const navigationProps = {
    title: { type: String, default: 'Farris Admin' }
} as Record<string, any>;

export type NavigationProps = ExtractPropTypes<typeof navigationProps>;

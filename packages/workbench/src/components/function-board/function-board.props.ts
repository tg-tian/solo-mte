import { ExtractPropTypes } from "vue";

export const functionBoardProps = {
    /** 功能组集合 */
    functionItems: { type: Array, default: [] },
    /** 菜单项集合 */
    menuItems: { type: Array, default: [] }
} as Record<string, any>;

export type FunctionBoardProps = ExtractPropTypes<typeof functionBoardProps>;

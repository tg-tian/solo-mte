import { ExtractPropTypes } from "vue";

export const templateBoxProps = {
    /** 拖拽框架 */
    dragula: { type: Object }
} as Record<string, any>;

export type TemplateBoxProps = ExtractPropTypes<typeof templateBoxProps>;

export const templateModalProps = {

} as Record<string, any>;

export type TemplateModalProps = ExtractPropTypes<typeof templateModalProps>;

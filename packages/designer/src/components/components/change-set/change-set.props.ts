import { ExtractPropTypes, PropType } from "vue";
import { FormSchema } from "../../../components/types";

export const changeSetProps = {
    currentFormSchema: { type: Object as PropType<FormSchema> },
    targetFormSchema: { type: Object as PropType<FormSchema> },
    designerService: { type: Object }
} as Record<string, any>;

export type ChangeSetProps = ExtractPropTypes<typeof changeSetProps>;

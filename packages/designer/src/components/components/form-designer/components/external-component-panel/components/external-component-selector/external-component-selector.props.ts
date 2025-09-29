import { ExtractPropTypes, PropType } from "vue";
import { ExternalComponentType } from "../../composition/types";
import { UseFormSchema } from "../../../../../../../components/types";

export const externalComponentSelectorProps = {
    id: { type: String, default: '' },
    modelValue: { type: Object },
    formSchemaUtils: { type: Object as PropType<UseFormSchema>, default: {} },
    externalComponentType: { type: String as PropType<ExternalComponentType>, default: 'Independence' },
};

export type ExternalComponentSelectorProps = ExtractPropTypes<typeof externalComponentSelectorProps>;

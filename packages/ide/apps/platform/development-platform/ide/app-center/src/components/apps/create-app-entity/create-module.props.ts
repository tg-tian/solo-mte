import { ExtractPropTypes } from "vue";

export const createModuleProps = {
    appDomainId: { type: String, default: '' },
    appDomainName: { type: String, default: '' }
};

export type CreateModuleProps = ExtractPropTypes<typeof createModuleProps>;

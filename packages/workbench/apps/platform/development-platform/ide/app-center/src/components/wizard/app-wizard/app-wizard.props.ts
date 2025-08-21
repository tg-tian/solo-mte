import { ExtractPropTypes } from "vue";

export const appWizardProps = {

    appDomain: { type: Object, default: {} },

    appModule: { type: Object, default: {} }
};

export type AppWizardProps = ExtractPropTypes<typeof appWizardProps>;


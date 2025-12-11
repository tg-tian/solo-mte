import { type InjectionKey, inject } from 'vue';

export interface VerifyDetailsPanel {
    show(): void;
    hide(): void;
}

export const VERIFY_DETAILS_PANEL_KEY: InjectionKey<VerifyDetailsPanel> = Symbol('VerifyDetailsPanel');

export function useVerifyDetailsPanel() {
    return inject(VERIFY_DETAILS_PANEL_KEY)!;
}

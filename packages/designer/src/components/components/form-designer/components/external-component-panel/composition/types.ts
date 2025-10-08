import { SchemaItem } from "@farris/ui-vue";
import { Ref, ComputedRef } from "vue";

export type ExternalComponentType = 'Implant' | 'Independence' | 'Lookup';

export interface ExternalComponentSchema {
    id: string,
    name: string;
    type: string;
    [key: string]: any;
}

export interface UseExternalComponent {
    getComponents(): Ref<ExternalComponentSchema[]>;
    addComponent: (component: SchemaItem, componentType: ExternalComponentType) => void;
    deleteComponent: (hiddenComponentSchema: ExternalComponentSchema) => void;
    selectExternalComponent: (externalComponentSchema?: ExternalComponentSchema) => void;
    clearExternalComponentSelection: () => void;
    isSelected: ComputedRef<(externalComponentSchema: ExternalComponentSchema) => boolean>;
}

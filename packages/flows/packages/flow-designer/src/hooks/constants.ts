import type { InjectionKey, Ref } from 'vue';
import type { FlowRegistry, FlowMetadata } from '@farris/flow-devkit';
import type { FlowDesignerProps } from '@flow-designer/components/flow-designer';

export const FLOW_REGISTRY_KEY: InjectionKey<Ref<FlowRegistry | undefined>> = Symbol('FlowRegistry');
export const FLOW_METADATA_KEY: InjectionKey<FlowMetadata> = Symbol('FlowMetadata');
export const FLOW_DESIGNER_PROPS_KEY: InjectionKey<FlowDesignerProps> = Symbol('FlowDesignerProps');

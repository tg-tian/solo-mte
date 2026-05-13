import { VNode } from 'vue';
import { SlotConfig } from '../../conversation';

export type SlotConfigRenderer = (slot: SlotConfig, index: number, onValueChange: any) => VNode;
export declare function renderSlotConfig(slot: SlotConfig, index: number, onValueChange: any): VNode<import('vue').RendererNode, import('vue').RendererElement, {
    [key: string]: any;
}>;

import { VNode } from 'vue';

export interface ChatHistoryItem {
    id: string;
    title: string;
    icon?: string | VNode;
    timestamp: number;
}

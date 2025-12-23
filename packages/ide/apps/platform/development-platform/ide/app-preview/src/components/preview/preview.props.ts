import { PropType } from 'vue';

export interface MenuItem {
    id: string;
    name: string;
    url: string;
    icon?: string;
}

export interface PreviewProps {
    menuItems?: MenuItem[];
}

export const previewProps = {
    menuItems: {
        type: Array as PropType<MenuItem[]>,
        default: () => []
    }
};

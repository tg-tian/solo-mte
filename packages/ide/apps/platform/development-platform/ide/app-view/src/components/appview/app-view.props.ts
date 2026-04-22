import { PropType } from 'vue';

export interface MenuItem {
    id: string;
    name: string;
    url: string;
    icon?: string;
}

export interface AppViewProps {
    menuItems?: MenuItem[];
}

export const appViewProps = {
    menuItems: {
        type: Array as PropType<MenuItem[]>,
        default: () => []
    }
};

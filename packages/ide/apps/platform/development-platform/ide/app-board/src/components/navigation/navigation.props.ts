import type { ExtractPropTypes, PropType } from 'vue';

/** 与 app-builder 侧 MenuGroup 对齐的最小结构，供纵向导航列表展示 */
export interface MenuGroup {
  id: string;
  code?: string;
  name: string;
  icon: string;
  items?: unknown[];
}

export const navigationProps = {
  title: { type: String, default: '' },
  menuData: {
    type: Array as PropType<MenuGroup[]>,
    default: () => [] as MenuGroup[],
  },
} as const;

export type NavigationProps = ExtractPropTypes<typeof navigationProps>;

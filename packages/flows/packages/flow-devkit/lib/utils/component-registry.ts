import { registerComponent } from '@farris/ui-vue';
import type { WithComponentRegister } from '@farris/flow-devkit/types';

/**
 * 将组件注册为FarrisVue组件
 * @description 注册后即可配置为属性面板的编辑器
 * @param componentRegistries 待注册的组件
 */
export function registerCustomComponents(componentRegistries: WithComponentRegister<any>[]): void {
    componentRegistries?.forEach((component) => {
        registerComponent(component);
    });
}

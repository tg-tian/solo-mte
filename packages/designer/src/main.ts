import { createApp } from 'vue';
import './style.css';
import { Locale } from '@farris/ui-vue';
import App from './app.vue';
import Designer from './components/index';

import Providers from './app-providers';
import { getEnabledCustomComponents, loadDesignerConfig } from './components/composition/designer-config.service';
import { loadCustomComponents } from './components/composition/custom-component-loader';
import { mergeCustomComponentsIntoToolbox } from './components/composition/designer-context/use-pc-designer-context';

/**
 * 设计器启动前的定制初始化：
 * 1. 读取 designer-config.json（属性黑名单 + 自定义组件登记），失败时降级为空配置
 * 2. 加载自定义组件（依赖宿主 @farris/ui-vue 的第三方组件能力，详见 custom-component-loader）
 * 3. 把已启用的自定义组件追加到工具箱「自定义」分组
 *
 * 工具箱组件只在首次渲染时读取一次数据，因此以上步骤必须在挂载前完成。
 *
 * 排障：设计器产物开启了 drop_console，console 会被剥离；
 * 请在控制台查看 `window.__DESIGNER_CUSTOM_DIAG__` 获取各层加载状态。
 */
async function initializeDesignerCustomizations(): Promise<void> {
    await loadDesignerConfig();

    await loadCustomComponents();

    mergeCustomComponentsIntoToolbox(getEnabledCustomComponents());
}

initializeDesignerCustomizations().finally(() => {
    createApp(App).use(Locale, { uri: '/platform/common/web/@farris/i18n/designer', locale: 'zh-CHS' }).use(Designer).use(Providers).mount('#app');
});

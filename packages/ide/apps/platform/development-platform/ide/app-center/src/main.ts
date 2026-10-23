import { getCurrentUserId } from '../../../../../../src/utils/current-user';
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import FarrisUI, {
    F_MODAL_SERVICE_TOKEN,
    FModalService,
    F_NOTIFY_SERVICE_TOKEN,
    FNotifyService,
    FLoadingService
} from '@farris/ui-vue';
import FAAppCenter from './app';
// 导入 app-center 的样式
import './style.css';

getCurrentUserId().then((userId) => {
  const app = createApp(FAAppCenter);
  const pinia = createPinia();
  pinia.use(createPersistedState({ key: (key) => `ide:${encodeURIComponent(userId)}:${key}` }));
  app.use(pinia);
  app.use(ElementPlus);

  /**
   * 安装 ui-vue 默认插件：注册 Farris 组件，并加载**随包内置**的中文语言资源。
   *
   * 为什么不能只用 `app.use(Locale, { uri: '', locale: 'zh-CHS' })`：
   * Locale 插件在 `uri` 为空时**不会加载任何资源文件**（`loadLocaleResources` 里只有
   * `if (config.uri) { … }` 一段），此时若同时没传 `localResources`，语言包就是空的，
   * 组件里的多语言 key 会原样显示（如 `datagrid.emptyMessage`）。
   * 默认插件（default export）的 install 内部执行的是
   * `app.use(Locale, { locale: 'zh-CHS', localResources: { 'zh-CHS': 内置中文资源 } })`，
   * 所以用它即可拿到完整中文文案。
   */
  app.use(FarrisUI as any);

  /**
   * 应用自身的服务实例。
   * 放在 Farris 插件之后 provide：同一 token 以最后一次 provide 为准，确保本应用注入的是自己的实例。
   */
  app.provide(F_MODAL_SERVICE_TOKEN, new FModalService(app));
  app.provide(F_NOTIFY_SERVICE_TOKEN, new FNotifyService());
  app.provide('FLoadingService', FLoadingService);

  app.mount('#app');
}).catch((error) => {
  const root = document.getElementById('app');
  if (root) root.textContent = error.message;
});

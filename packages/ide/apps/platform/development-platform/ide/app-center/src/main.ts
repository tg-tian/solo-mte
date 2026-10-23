import { getCurrentUserId } from '../../../../../../src/utils/current-user';
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import { Locale, F_MODAL_SERVICE_TOKEN, FModalService, F_NOTIFY_SERVICE_TOKEN, FNotifyService, FLoadingService } from '@farris/ui-vue';
import FAAppCenter from './app';
// 导入 app-center 的样式
import './style.css';

getCurrentUserId().then((userId) => {
  const app = createApp(FAAppCenter);
  const pinia = createPinia();
  pinia.use(createPersistedState({ key: (key) => `ide:${encodeURIComponent(userId)}:${key}` }));
  app.use(pinia);
  app.use(ElementPlus);
  app.provide(F_MODAL_SERVICE_TOKEN, new FModalService(app));
  app.provide(F_NOTIFY_SERVICE_TOKEN, new FNotifyService());
  app.provide('FLoadingService', FLoadingService);
  // app.mount('#app');
  app.use(Locale as any, { uri: '', locale: 'zh-CHS' }).mount('#app');
}).catch((error) => {
  const root = document.getElementById('app');
  if (root) root.textContent = error.message;
});

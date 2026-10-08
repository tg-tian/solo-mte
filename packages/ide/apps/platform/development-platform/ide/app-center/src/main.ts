import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import persistedstate from 'pinia-plugin-persistedstate';
import { Locale, F_MODAL_SERVICE_TOKEN, FModalService, F_NOTIFY_SERVICE_TOKEN, FNotifyService, FLoadingService } from '@farris/ui-vue';
import FAAppCenter from './app';
// 导入 app-center 的样式
import './style.css';

const app = createApp(FAAppCenter);
const pinia = createPinia();
pinia.use(persistedstate);
app.use(pinia);
app.use(ElementPlus);
app.provide(F_MODAL_SERVICE_TOKEN, new FModalService(app));
app.provide(F_NOTIFY_SERVICE_TOKEN, new FNotifyService());
app.provide('FLoadingService', FLoadingService);
// app.mount('#app');
app.use(Locale as any, { uri: '', locale: 'zh-CHS' }).mount('#app');

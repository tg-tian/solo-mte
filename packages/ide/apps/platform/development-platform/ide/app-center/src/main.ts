import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import persistedstate from 'pinia-plugin-persistedstate';
//import { Locale } from '@farris/ui-vue';
import FAAppCenter from './app';
// 导入 app-center 的样式
import './style.css';

const app = createApp(FAAppCenter);
const pinia = createPinia();
pinia.use(persistedstate);
app.use(pinia);
app.use(ElementPlus);
app.mount('#app');
//app.use(Locale, { uri: '', locale: 'zh-CHS' }).mount('#app');

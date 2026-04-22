import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import FAAppView from './app.vue';
// 导入样式
import './style.sass';

const app = createApp(FAAppView);

app.use(Locale as any, { uri: '', locale: 'zh-CHS' }).mount('#app');

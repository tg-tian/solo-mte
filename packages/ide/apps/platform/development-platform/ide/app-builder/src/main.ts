import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import Farris from '@farris/ui-vue';
import FAAppCenter from './app.vue';
// 导入 app-builder 的样式
import '../style.sass';

const app = createApp(FAAppCenter);

app.use(Farris as any).use(Locale as any, { uri: '', locale: 'zh-CHS' }).mount('#app');

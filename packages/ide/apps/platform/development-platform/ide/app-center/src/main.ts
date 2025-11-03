import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import FAAppCenter from './app';
// 导入 app-center 的样式
import './style.css';

const app = createApp(FAAppCenter);

app.use(Locale, { uri: '', locale: 'zh-CHS' }).mount('#app');

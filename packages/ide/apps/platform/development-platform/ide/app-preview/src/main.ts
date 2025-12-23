import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import FAAppPreview from './app.vue';
// 导入样式
import './style.sass';

const app = createApp(FAAppPreview);

app.use(Locale, { uri: '', locale: 'zh-CHS' }).mount('#app');

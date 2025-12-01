import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import FADomain from './app';

const app = createApp(FADomain);

app.use(Locale, { uri: '', locale: 'zh-CHS' }).mount('#app');

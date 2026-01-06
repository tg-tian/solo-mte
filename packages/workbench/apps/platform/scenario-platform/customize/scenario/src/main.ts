import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import FAScenario from './app';

const app = createApp(FAScenario);

app.use(Locale, { uri: '', locale: 'zh-CHS' }).mount('#app');

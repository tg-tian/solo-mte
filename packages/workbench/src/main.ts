import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import App from './app.vue';

const app = createApp(App);

app.use(Locale, { uri: '', locale: 'zh-CHS' }).mount('#app');
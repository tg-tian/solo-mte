import { createApp } from 'vue';
import './style.css';
import { Locale } from '@farris/ui-vue';
import App from './app.vue';
import Designer from './components/index';

import Providers from './app-providers';
createApp(App).use(Locale, { uri: '/platform/common/web/@farris/i18n/designer', locale: 'zh-CHS' }).use(Designer).use(Providers).mount('#app');

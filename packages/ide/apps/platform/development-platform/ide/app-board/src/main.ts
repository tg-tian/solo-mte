import { createApp } from 'vue';
import { Locale } from '@farris/ui-vue';
import Farris from '@farris/ui-vue';
import WorkbenchApp from './app.vue';
import './style.scss';

const app = createApp(WorkbenchApp);

window['gsp'] = window['gsp'] || {};
window['gsp']['workspace'] = window['gsp']['workspace'] || {};
window['gspframeworkService'] = window['gspframeworkService'] || {};
window['gspframeworkService']['rtf'] = window['gspframeworkService']['rtf'] || {};
window['gspframeworkService']['rtf']['language'] = window['gspframeworkService']['rtf']['language'] || {
  getLanguageCode: () => 'zh-CHS'
};

app.use(Farris as any).use(Locale as any, { uri: '', locale: 'zh-CHS' }).mount('#app');

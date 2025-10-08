import { createApp } from 'vue';

import CommandCodeEditor from '../components';
// import router from './router/index';
import './style.css';
import App from './app.vue';
import Providers from './app-providers';

createApp(App).use(CommandCodeEditor).use(Providers).mount('#app');

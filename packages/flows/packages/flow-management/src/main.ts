import { createApp } from 'vue';
import App from './App.vue';

import './assets/index';
import Farris from '@farris/ui-vue';

const app = createApp(App);

app.use(Farris).mount('#app');

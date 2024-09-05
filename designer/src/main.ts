import { createApp } from 'vue';
import './style.css';
import App from './app.vue';
import Designer from './components/index';

createApp(App).use(Designer).mount('#app');

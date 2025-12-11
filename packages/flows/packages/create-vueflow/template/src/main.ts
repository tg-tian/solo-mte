import { createApp } from 'vue';
import App from './App.vue';
import Farris from '@farris/ui-vue';

import './style.scss';
import '@farris/ui-vue/index.css';

const app = createApp(App);

app.config.warnHandler = (msg, _instance, trace) => {
    const isTargetWarning = msg.includes('Extraneous non-props attributes');

    if (!isTargetWarning) {
        console.warn(`[Vue warn]: ${msg}\n${trace}`);
    }
};

app.use(Farris).mount('#app');

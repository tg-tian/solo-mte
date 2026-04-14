import { createApp } from 'vue';
import App from './App.vue';
import Farris from '@farris/ui-vue';

import './style.scss';
import '@farris/ui-vue/index.css';

const app = createApp(App);

app.config.warnHandler = (msg, _instance, trace) => {
    // 匹配警告特征：包含"Extraneous non-props attributes"
    const isTargetWarning = msg.includes('Extraneous non-props attributes');

    // 如果是目标警告则忽略，否则按默认方式输出
    if (!isTargetWarning) {
        console.warn(`[Vue warn]: ${msg}\n${trace}`);
    }
};

app.use(Farris).mount('#app');

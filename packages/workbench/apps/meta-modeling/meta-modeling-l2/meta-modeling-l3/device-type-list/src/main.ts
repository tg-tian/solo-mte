import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import DeviceTypeList from '../../meta-modeling-app/src/views/meta/DeviceTypeList/index.vue';
import '../../meta-modeling-app/src/assets/style.css';

const app = createApp(DeviceTypeList);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(ElementPlus);

app.mount('#app');

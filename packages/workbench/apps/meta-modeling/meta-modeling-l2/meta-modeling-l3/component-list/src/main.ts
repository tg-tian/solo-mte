import { getCurrentUserId } from '../../../../../../src/utils/current-user';
import { createApp } from 'vue';
import ElementPlus, { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import router from './router';
import App from './App.vue';

getCurrentUserId().then((userId) => {
  const app = createApp(App);
  const pinia = createPinia();
  pinia.use(createPersistedState({
    key: (storeKey) => `workbench:${encodeURIComponent(userId)}:${storeKey}`
  }));

  app.use(pinia);
  app.use(router);
  app.use(ElementPlus);

  app.mount('#app');
}).catch((error) => {
  ElMessage.error(error.message);
});

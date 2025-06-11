import App from './App.vue';
import './style.css';
import { queryConfig } from '@/lib/vue-query';
import { VueQueryPlugin } from '@tanstack/vue-query';

const app = createApp(App);

app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: queryConfig,
  },
});
app.mount('#app');

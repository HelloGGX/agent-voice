import App from "./App.vue";
import { createPinia } from "pinia";
import "./style.css";
import { queryConfig } from "@/lib/vue-query";
import { VueQueryPlugin } from "@tanstack/vue-query";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: queryConfig,
  },
});
app.mount("#app");

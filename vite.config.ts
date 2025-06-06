import { ConfigEnv, defineConfig, UserConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "unplugin-auto-import/vite";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;
const pathSrc = path.resolve(__dirname, "src");
interface ProxyConfig {
  [key: string]: {
    target: string
    changeOrigin: boolean
    secure: boolean
    rewrite?: (path: string) => string
  }
}
// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  const proxyObj: ProxyConfig = {}
  const env = loadEnv(mode, process.cwd())
  if (mode === 'development' && env.VITE_APP_BASE_API_DEV && env.VITE_APP_BASE_URL_DEV) {
    // 将特定路径的请求代理到开发环境的服务器地址
    proxyObj[env.VITE_APP_BASE_API_DEV] = {
      target: env.VITE_APP_BASE_URL_DEV,
      secure: false,
      changeOrigin: true,
    }
  }
  return defineConfig({
    plugins: [
      vue(),
      tailwindcss(),
      AutoImport({
        imports: ["vue", "vue-router", "pinia"],
        dts: path.resolve(pathSrc, "auto-imports.d.ts"),
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
      proxy: {
        ...proxyObj,
      },
    },
  });
};


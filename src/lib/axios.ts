import Axios, { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'vue-sonner';

export const HTTP_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export interface ResponseBody<T = any> {
  code: number | string;
  data?: T;
  msg: string;
}

const handleHttpCode = (error: AxiosError<{ code: string; msg: string }>) => {
  // const token = useAuthorization();
  if (error.response) {
    const { data, status, statusText } = error.response as AxiosResponse<ResponseBody>;
    if (status === 401) {
      toast.error('401', {
        description: data?.msg || statusText,
        duration: 5000,
      });
      /**
       * 这里处理清空用户信息和token的逻辑
       */
      // token.value = null;
    } else if (status === 417) {
      toast.error('417', {
        description: data?.msg || '密码过期，请重置修改密码',
        duration: 5000,
      });
    } else if (status === 400) {
      toast.error('400', {
        description: data?.msg || statusText,
        duration: 5000,
      });
    } else if (status === 403) {
      toast.error('403', {
        description: data?.msg || statusText,
        duration: 5000,
      });
    } else if (status === 500) {
      toast.error('500', {
        description: data?.msg || statusText,
        duration: 5000,
      });
    } else {
      toast.error(`${data?.code || '服务错误'}`, {
        description: data?.msg || statusText,
        duration: 5000,
      });
    }
  }
  return Promise.reject(error);
};

export const axios = Axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API_DEV ?? '/',
  timeout: 120000,
});

// 请求拦截
axios.interceptors.request.use((config) => {
  if (config && config.headers) {
    config.headers.Accept = 'application/json';
  }

  return config;
});

// 响应拦截
axios.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return handleHttpCode(error);
  },
);

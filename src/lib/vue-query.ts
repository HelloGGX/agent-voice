import type { DefaultOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/vue-query';
import type { AxiosError } from 'axios';

import { QueryClient } from '@tanstack/vue-query';

export const queryConfig: DefaultOptions = {
  queries: {
    /**
     * 表示在进行查询时，优先使用本地缓存的数据，如果本地没有数据，再尝试从网络获取。
     * 这有助于提高应用的响应速度和用户体验，尤其是在网络不稳定的情况下
     */
    networkMode: 'offlineFirst',
    retry: false,
  },
  mutations: {
    networkMode: 'offlineFirst',
    retry: false,
  },
};
export type PromiseValue<PromiseType, Otherwise = PromiseType> =
  PromiseType extends Promise<infer Value>
    ? { 0: PromiseValue<Value>; 1: Value }[PromiseType extends Promise<unknown> ? 0 : 1]
    : Otherwise;

export const queryClient = new QueryClient({ defaultOptions: queryConfig });

export type ExtractFnReturnType<FnType extends (...args: any) => any> = PromiseValue<
  ReturnType<FnType>
>;

export type QueryConfig<QueryFnType extends (...args: any) => any> = Omit<
  UseQueryOptions<ExtractFnReturnType<QueryFnType>>,
  'queryKey' | 'queryFn'
>;

export type MutationConfig<MutationFnType extends (...args: any) => any> = UseMutationOptions<
  ExtractFnReturnType<MutationFnType>,
  AxiosError,
  Parameters<MutationFnType>[0],
  unknown
>;

import { axios } from "@/lib/axios";

export const getAIChatApi = (data: any) => {
  return axios.post("/v1/push", data);
};
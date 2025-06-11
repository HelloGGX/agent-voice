<script setup lang="ts">
// 新增图标引入
import { Clock, Plane, Globe } from "lucide-vue-next";

const props = defineProps<{
  data: any[];
}>();


const multJourney = computed(() => props.data.length > 1)

// 工具函数
const formatTime = (timeStr: string) =>
  timeStr.replace(/(\d{2})(\d{2})/, "$1:$2");
const formatDate = (dateStr: string) =>
  dateStr.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

// 时间格式化工具函数
// const formatTime = (timeStr: string) => {
//   return `${timeStr?.slice(0, 2)}:${timeStr?.slice(2)}`;
// };

// const formatDate = (dateStr: string) => {
//   const year = dateStr.slice(0, 4);
//   const month = dateStr.slice(4, 6);
//   const day = dateStr.slice(6, 8);
//   return `${year}-${month}-${day}`;
// };

// 计算转机时间
const calculateTransferTime = (journeys: any[], index: number) => {
  if (index === 0) return "";
  const prevArrival = journeys[index - 1].arrTime;
  const currentDeparture = journeys[index].depTime;
  return `转机 ${timeDiff(prevArrival, currentDeparture)}`;
};

// 时间差计算
const timeDiff = (start: string, end: string) => {
  const startMinutes =
    parseInt(start.slice(0, 2)) * 60 + parseInt(start.slice(2));
  const endMinutes = parseInt(end.slice(0, 2)) * 60 + parseInt(end.slice(2));
  const diff = endMinutes - startMinutes;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
};

// 单段飞行时长
const calculateDuration = (dep: string, arr: string) => {
  const diff = timeDiff(dep, arr);
  return `${diff}`;
};

// 总行程时长
const calculateTotalDuration = (journeys: any[]) => {
  const firstDep = journeys[0].depTime;
  const lastArr = journeys[journeys.length - 1].arrTime;
  return `${timeDiff(firstDep, lastArr)} ${ journeys.length >  1 ? '(含转机)' : '' }`;
};
</script>

<template>
  <!-- 行程时间线容器 -->
  <div class="space-y-8 relative">
    <!-- 时间线装饰线 -->
    <div v-if="multJourney" class="absolute left-8 top-6 bottom-6 w-px bg-gray-200/80"></div>

    <!-- 单个行程项循环 -->
    <div v-for="(journey, index) in data" :key="index" class="flex gap-6">
      <!-- 时间线节点 -->
      <div v-if="multJourney" class="relative z-10">
        <div
          class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"
        >
          <span class="text-blue-600 font-semibold">{{ index + 1 }}</span>
        </div>
        <div class="text-center mt-2 text-sm text-gray-500">
          <Clock class="w-4 h-4 inline-block mr-1" />
          {{ calculateTransferTime(data, index) }}
        </div>
      </div>

      <!-- 行程卡片 -->
      <div class="flex-1 pb-8">
        <div
          :class="multJourney ? 'p-6 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow' : ''"
        >
          <!-- 航班头信息 -->
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold">
                航班号：{{ journey.airlineCode }}{{ journey.fltNo }}
              </h3>
              <p class="text-sm text-gray-500">
                计划日期：{{ formatDate(journey.flightDate) }}
              </p>
            </div>
            <!-- 状态徽章 -->
            <div
              class="StatusBadge rounded-lg px-1"
              :class="{
                'bg-green-100 text-green-800': journey.checkIn,
                'bg-gray-100 text-gray-600': !journey.checkIn,
              }"
            >
              {{ journey.checkIn ? "已值机 ✓" : "未值机" }}
            </div>
          </div>

          <!-- 航班时空信息 -->
          <div class="flex items-center justify-between">
            <!-- 出发信息 -->
            <div class="col-span-4">
              <div class="AirportInfo">
                <div class="text-xl font-bold">{{ journey.depAptCode }}</div>
                <div class="text-sm text-gray-500">
                  {{ journey.depAptNameLanguage?.zh }}
                </div>
                <div class="mt-1 text-gray-700">
                  {{ formatTime(journey.depTime) }}
                  <span class="ml-2 text-xs text-gray-400">起飞</span>
                </div>
              </div>
            </div>

            <!-- 中间箭头 -->
            <div class="flex justify-center flex-1">
              <div class="relative w-full">
                <div class="h-px bg-gray-200 absolute top-4 left-[8%] w-[84%]"></div>
                <Plane
                  class="w-8 h-8 absolute left-1/2 -translate-x-1/2 text-blue-500 bg-white p-0.5"
                />
              </div>
            </div>

            <!-- 到达信息 -->
            <div class="col-span-4">
              <div class="AirportInfo">
                <div class="text-xl font-bold">{{ journey.arrAptCode }}</div>
                <div class="text-sm text-gray-500">
                  {{ journey.arrAptNameLanguage?.zh }}
                </div>
                <div class="mt-1 text-gray-700">
                  {{ formatTime(journey.arrTime) }}
                  <span class="ml-2 text-xs text-gray-400">到达</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 扩展信息 -->
          <div class="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div class="InfoItem">
              <span class="text-gray-500">舱位：</span>
              <span class="font-medium">{{ journey.cabin }}舱</span>
            </div>
            <div class="InfoItem">
              <span class="text-gray-500">座位：</span>
              <span class="font-medium">{{ journey.seatNo || "未选座" }}</span>
            </div>
            <!-- <div class="InfoItem">
              <span class="text-gray-500">行李额</span>
              <span class="font-medium">23kg x 2</span>
            </div> -->
            <div class="InfoItem">
              <span class="text-gray-500">飞行时长：</span>
              <span class="font-medium">{{ calculateDuration(journey.depTime, journey.arrTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 总行程时间 -->
  <div class="mt-6 pt-4 border-t flex justify-between items-center">
    <div class="flex items-center gap-2 text-gray-600">
      <Globe class="w-5 h-5" />
      <span>总行程时间</span>
    </div>
    <span class="font-semibold">
      {{ calculateTotalDuration(data) }}
    </span>
  </div>
</template>

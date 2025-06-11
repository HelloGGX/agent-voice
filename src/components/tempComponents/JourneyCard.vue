<script setup lang="ts">
import { Clock, Plane, Globe } from 'lucide-vue-next';

/**
 * 行程数据结构
 */
export interface Journey {
  airlineCode: string;
  fltNo: string;
  flightDate: string;
  checkIn: boolean;
  depAptCode: string;
  depAptNameLanguage?: { zh: string };
  depTime: string;
  arrAptCode: string;
  arrAptNameLanguage?: { zh: string };
  arrTime: string;
  cabin: string;
  seatNo?: string;
}

/**
 * @prop data 行程数组，替换 mock 数据时请保证结构一致
 */
const props = defineProps<{
  data: Journey[];
}>();

const { data } = toRefs(props);
const multJourney = computed(() => data.value.length > 1);

/**
 * 时间字符串转 00:00 格式
 */
const formatTime = (timeStr: string) => timeStr.replace(/(\d{2})(\d{2})/, '$1:$2');
/**
 * 日期字符串转 2024-01-01 格式
 */
const formatDate = (dateStr: string) => dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

/**
 * 计算转机时间
 */
const calculateTransferTime = (journeys: Journey[], index: number) => {
  if (index === 0) return '';
  const prevArrival = journeys[index - 1].arrTime;
  const currentDeparture = journeys[index].depTime;
  return `转机 ${timeDiff(prevArrival, currentDeparture)}`;
};

/**
 * 计算时间差
 */
const timeDiff = (start: string, end: string) => {
  const startMinutes = parseInt(start.slice(0, 2)) * 60 + parseInt(start.slice(2));
  const endMinutes = parseInt(end.slice(0, 2)) * 60 + parseInt(end.slice(2));
  const diff = endMinutes - startMinutes;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
};

/**
 * 单段飞行时长
 */
const calculateDuration = (dep: string, arr: string) => {
  const diff = timeDiff(dep, arr);
  return `${diff}`;
};

/**
 * 总行程时长
 */
const calculateTotalDuration = (journeys: Journey[]) => {
  const firstDep = journeys[0].depTime;
  const lastArr = journeys[journeys.length - 1].arrTime;
  return `${timeDiff(firstDep, lastArr)} ${journeys.length > 1 ? '(含转机)' : ''}`;
};
</script>

<template>
  <!-- 行程时间线容器 -->
  <section class="space-y-8 relative" aria-label="航班行程列表" role="list">
    <!-- 时间线装饰线 -->
    <div v-if="multJourney" class="absolute left-8 top-6 bottom-6 w-px bg-gray-200/80"></div>

    <!-- 单个行程项循环 -->
    <article
      v-for="(journey, index) in data"
      :key="index"
      class="flex gap-6"
      role="listitem"
      :aria-label="`第${index + 1}段航程`"
    >
      <!-- 时间线节点 -->
      <div v-if="multJourney" class="relative z-10">
        <div
          class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
          tabindex="0"
          aria-label="航段序号 {{ index + 1 }}"
        >
          <span class="text-blue-600 font-semibold">{{ index + 1 }}</span>
        </div>
        <div class="text-center mt-2 text-sm text-gray-600">
          <Clock class="w-4 h-4 inline-block mr-1" aria-label="转机时间图标" />
          <span aria-live="polite">{{ calculateTransferTime(data, index) }}</span>
        </div>
      </div>

      <!-- 行程卡片 -->
      <div class="flex-1 pb-8">
        <div
          :class="
            multJourney
              ? 'p-6 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow'
              : ''
          "
        >
          <!-- 航班头信息 -->
          <header class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-lg font-semibold">
                航班号：{{ journey.airlineCode }}{{ journey.fltNo }}
              </h2>
              <p class="text-sm text-gray-700">计划日期：{{ formatDate(journey.flightDate) }}</p>
            </div>
            <!-- 状态徽章 -->
            <div
              class="StatusBadge rounded-lg px-1"
              :class="{
                'bg-green-100 text-green-800': journey.checkIn,
                'bg-gray-100 text-gray-700': !journey.checkIn,
              }"
              :aria-label="journey.checkIn ? '已值机' : '未值机'"
            >
              {{ journey.checkIn ? '已值机 ✓' : '未值机' }}
            </div>
          </header>

          <!-- 航班时空信息 -->
          <div class="flex items-center justify-between">
            <!-- 出发信息 -->
            <div class="col-span-4">
              <div class="AirportInfo">
                <div class="text-xl font-bold">{{ journey.depAptCode }}</div>
                <div class="text-sm text-gray-700">
                  {{ journey.depAptNameLanguage?.zh }}
                </div>
                <div class="mt-1 text-gray-900">
                  {{ formatTime(journey.depTime) }}
                  <span class="ml-2 text-xs text-gray-700">起飞</span>
                </div>
              </div>
            </div>

            <!-- 中间箭头 -->
            <div class="flex justify-center flex-1">
              <div class="relative w-full">
                <div class="h-px bg-gray-200 absolute top-4 left-[8%] w-[84%]"></div>
                <Plane
                  class="w-8 h-8 absolute left-1/2 -translate-x-1/2 text-blue-500 bg-white p-0.5"
                  aria-label="航班方向"
                  tabindex="0"
                />
              </div>
            </div>

            <!-- 到达信息 -->
            <div class="col-span-4">
              <div class="AirportInfo">
                <div class="text-xl font-bold">{{ journey.arrAptCode }}</div>
                <div class="text-sm text-gray-700">
                  {{ journey.arrAptNameLanguage?.zh }}
                </div>
                <div class="mt-1 text-gray-900">
                  {{ formatTime(journey.arrTime) }}
                  <span class="ml-2 text-xs text-gray-700">到达</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 扩展信息 -->
          <div class="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div class="InfoItem">
              <span class="text-gray-700">舱位：</span>
              <span class="font-medium">{{ journey.cabin }}舱</span>
            </div>
            <div class="InfoItem">
              <span class="text-gray-700">座位：</span>
              <span class="font-medium">{{ journey.seatNo || '未选座' }}</span>
            </div>
            <div class="InfoItem">
              <span class="text-gray-700">飞行时长：</span>
              <span class="font-medium">{{
                calculateDuration(journey.depTime, journey.arrTime)
              }}</span>
            </div>
            <!-- slot 扩展点 -->
            <slot name="extra" :journey="journey" :index="index"></slot>
          </div>
        </div>
      </div>
    </article>
  </section>

  <!-- 总行程时间 -->
  <footer class="mt-6 pt-4 border-t flex justify-between items-center" aria-label="总行程时间">
    <div class="flex items-center gap-2 text-gray-700">
      <Globe class="w-5 h-5" aria-label="总行程图标" />
      <span>总行程时间</span>
    </div>
    <span class="font-semibold">
      {{ calculateTotalDuration(data) }}
    </span>
  </footer>
</template>

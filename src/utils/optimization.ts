/**
 * 创建一个节流函数，该函数在指定延迟后执行原始函数。
 * 如果在延迟期间再次调用，则忽略调用。
 * @param func - 要节流的函数。
 * @param delay - 延迟时间（毫秒）。
 * @returns 节流后的函数。
 */
export const throttle = <T extends (...args: any[]) => void>(func: T, delay: number): T => {
  let lastTime = 0;

  return function (...args: Parameters<T>): ReturnType<T> | void {
    const now = Date.now();
    if (now - lastTime >= delay) {
      const result = func(...args);
      lastTime = now;
      return result;
    }
  } as T;
};

/**
 * 创建一个防抖函数，该函数在指定延迟后执行原始函数。
 * 如果在延迟期间再次调用，则重置计时器。
 *
 * @param func - 要防抖的函数
 * @param wait - 延迟时间（毫秒）
 * @param immediate - 是否在首次调用时立即执行（默认false）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let timeout: ReturnType<typeof setTimeout> | null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    // 清除现有计时器
    if (timeout) clearTimeout(timeout);

    // 设置新计时器
    timeout = setTimeout(later, wait);

    // 立即执行
    if (callNow) return func.apply(context, args);
  };
}

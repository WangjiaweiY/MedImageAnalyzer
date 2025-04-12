/**
 * 节流函数 - 限制函数在一定时间内只能执行一次
 * @param {Function} fn 要执行的函数
 * @param {Number} delay 延迟时间（毫秒）
 * @returns {Function} 返回节流处理后的函数
 */
export function throttle(fn, delay) {
  let lastCall = 0;
  
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn.apply(this, args);
  };
} 
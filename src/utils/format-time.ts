const pad = (n: number) => String(n).padStart(2, '0');

/** HH:MM（24 小時制，裝置時區）。 */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 列表上的修改時間：今天顯示時間，今年顯示月日，更早顯示年月日。 */
export function formatUpdatedAt(ms: number, now: number): string {
  const d = new Date(ms);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return formatClock(ms);
  const monthDay = `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.getFullYear() === today.getFullYear() ? monthDay : `${d.getFullYear()}年${monthDay}`;
}

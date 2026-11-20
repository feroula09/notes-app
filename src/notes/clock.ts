/** 時鐘轉接層：回傳 epoch 毫秒。APP 內用系統時間，測試可手動設定。 */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

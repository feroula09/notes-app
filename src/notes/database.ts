export type SqlValue = string | number | null;

/** 筆記庫底下的資料庫轉接層：APP 內接 expo-sqlite，測試接 better-sqlite3。 */
export interface Database {
  /** 執行一段可含多個敘述、不帶參數的 SQL。 */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
}

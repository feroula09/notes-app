/** 附圖檔案的轉接層：APP 內存在 APP 私有資料夾，測試接記憶體中的假檔案系統。 */
export interface ImageFiles {
  /** 把來源圖片複製一份並壓縮（長邊最多 2000 像素），存成 fileName。 */
  save(sourceUri: string, fileName: string): Promise<void>;
  delete(fileName: string): Promise<void>;
  /** 可以直接拿來顯示的 URI。 */
  uri(fileName: string): string;
}

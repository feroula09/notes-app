// jest-expo 的 ExpoUI mock 沒有 getMaterialColors；測試不檢查顏色，每個色彩角色都回傳同一個顏色即可。
globalThis.expo.modules.ExpoUI.getMaterialColors = () =>
  new Proxy({}, { get: () => '#6750A4FF' });

jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

---
name: 筆記
description: 照 Material 3 慣例做、像系統內建 APP 一樣安靜的個人筆記工具（Android）。
colors:
  primary: "#6750A4"
  primaryContainer: "#EADDFF"
  onPrimaryContainer: "#4F378B"
  surface: "#FEF7FF"
  surfaceContainer: "#F3EDF7"
  surfaceContainerHigh: "#ECE6F0"
  onSurface: "#1D1B20"
  onSurfaceVariant: "#49454F"
  outlineVariant: "#CAC4D0"
  primary-dark: "#D0BCFF"
  primaryContainer-dark: "#4F378B"
  onPrimaryContainer-dark: "#EADDFF"
  surface-dark: "#141218"
  surfaceContainer-dark: "#211F26"
  surfaceContainerHigh-dark: "#2B2930"
  onSurface-dark: "#E6E0E9"
  onSurfaceVariant-dark: "#CAC4D0"
  outlineVariant-dark: "#49454F"
typography:
  titleLarge:
    fontFamily: "system-ui, Roboto, 'Noto Sans TC', sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: "28px"
  titleMedium:
    fontFamily: "system-ui, Roboto, 'Noto Sans TC', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  bodyLarge:
    fontFamily: "system-ui, Roboto, 'Noto Sans TC', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  bodyMedium:
    fontFamily: "system-ui, Roboto, 'Noto Sans TC', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  bodySmall:
    fontFamily: "system-ui, Roboto, 'Noto Sans TC', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
rounded:
  large: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "32px"
components:
  top-app-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    height: "64px"
  search-bar:
    backgroundColor: "{colors.surfaceContainerHigh}"
    textColor: "{colors.onSurfaceVariant}"
    typography: "{typography.bodyLarge}"
    height: "56px"
    padding: "8px 16px"
  top-app-bar-scrolled:
    backgroundColor: "{colors.surfaceContainer}"
    textColor: "{colors.onSurface}"
  note-list-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.titleMedium}"
    padding: "12px 16px"
    height: "56px"
  note-list-divider:
    backgroundColor: "{colors.outlineVariant}"
    height: "1px"
  fab:
    backgroundColor: "{colors.primaryContainer}"
    textColor: "{colors.onPrimaryContainer}"
    rounded: "{rounded.large}"
    size: "56px"
  editor-body:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.bodyLarge}"
    padding: "8px 16px 16px"
  save-status-toolbar:
    textColor: "{colors.onSurfaceVariant}"
    typography: "{typography.bodySmall}"
    padding: "0 16px"
    height: "48px"
  empty-state:
    textColor: "{colors.onSurfaceVariant}"
    typography: "{typography.bodyLarge}"
    padding: "0 32px"
---

# Design System: 筆記

## Overview

**Creative North Star: "系統內建的筆記本"**

這套系統是把 Material 3 照規矩做好，不額外加風格。打開 APP 看到的應該像 Android 本來就附的工具，跟 Google Keep、Files、Android「設定」放在一起不會顯得突兀：一張安靜的全寬清單、一個 FAB、一條上方列。沒有品牌色塊、沒有自創元件，也沒有任何裝飾層。介面的個性來自使用者的桌布（Material You 動態配色），APP 本身不帶顏色主張。

密度跟 M3 清單一樣：一列一則筆記，標題一行、預覽兩行、時間靠右，列與列之間用內縮的分隔線。編輯頁只有返回鍵和一整片輸入區，「已儲存・HH:MM」貼在鍵盤上方，提醒使用者不用自己存檔。所有元件都是 Jetpack Compose 原生元件（透過 `@expo/ui/jetpack-compose`）或照 M3 規格排的 React Native 文字，轉場用 Android 系統的預設動畫。

明確拒絕：卡片瀑布流、品牌色塊、自創元件、底部導覽列、側邊抽屜。

**Key Characteristics:**
- 顏色只用 Material You 色彩角色，執行期由 `useMaterialColors()` 提供；Android 12 以上跟著桌布變，以下用 M3 baseline 紫色系。
- 深色模式跟著系統切換，兩種模式都在實機驗證過。
- 系統字體、M3 字級、單位 sp，跟著系統字體大小縮放（實機測過 130%）。
- 用色調變化表現層次，不用陰影；唯一的陰影是 Compose FAB 的預設 elevation。
- 圖示一律用 Material Symbols（`@expo/material-symbols/*.xml`）。
- 轉場、預測返回、ripple 都交給系統處理，不自己做。

## Colors

整套配色就是 Material You 的色彩角色，下面的 hex 是 M3 baseline 靜態配色（Android 12 以下的備援，也是 splash 用的固定色）；在 Android 12 以上，實際顏色由桌布產生，截圖裡看到的偏藍灰色就是這樣來的。

### Primary
- **Baseline 紫（Primary）**：只用在輸入游標（`cursorColor`）和選取反白（`primary` 加 40% 不透明度，`'66'`）。畫面上幾乎看不到它，這是刻意的。
- **淡紫容器（Primary Container）** 與 **深紫容器文字（On Primary Container）**：FAB 的底色和圖示色，是 Compose `FloatingActionButton` 的預設配色，程式沒有覆寫。全畫面只有 FAB 帶有明顯的色彩。

### Neutral
- **Surface**：所有畫面的底色，也是列表項目、編輯區、上方列靜止時的底色。`_layout.tsx` 用 `SystemUI.setBackgroundColorAsync(colors.surface)` 把視窗底色也設成它，轉場和鍵盤動畫時不會露出白底；`root-stack.tsx` 的 `contentStyle` 也用它。
- **Surface Container**：清單捲動後上方列換成這個顏色，用色調表示「內容在上方列底下」。
- **Surface Container High**：列表頁搜尋列本身的底色，是 Compose `DockedSearchBar` 的預設值，程式沒有另外指定。
- **On Surface**：筆記標題、編輯內文。也是列表 ripple 的顏色（`onSurface` 加 10% 不透明度，`'1a'`，等於 M3 pressed state layer）。
- **On Surface Variant**：次要文字，包含預覽、時間、「已儲存・HH:MM」、空狀態說明文字與圖示、輸入框 placeholder。
- **Outline Variant**：列表項目之間的分隔線。

### Named Rules
**The Role-Not-Hex Rule.** 畫面程式碼只能透過 `useMaterialColors()` 取用色彩角色，不可以寫死 hex。唯一的例外是 `app.json` 的 splash 設定（`#FEF7FF`／`#141218`）和 splash 圖示（`#49454F`／`#CAC4D0`），因為 splash 在 JS 執行前就要畫出來，只能用 baseline 的 surface 和 onSurfaceVariant 固定色。

**The Wallpaper Owns Color Rule.** APP 不定義自己的品牌色。需要強調時用 M3 既有角色（`primaryContainer` 給主要動作、`primary` 給游標），不要另外加顏色。

## Typography

**Display Font:** 不使用
**Body Font:** 系統字體（拉丁字母是 Roboto，中文由系統的 CJK 字體顯示；不設 `fontFamily`）

**Character:** 完全交給系統字體，跟其他系統 APP 一樣。字級照 M3 的角色命名，Android 上 `fontSize` 就是 sp，會跟著系統字體大小縮放。frontmatter 為了工具相容寫成 px，在 Android 上請一律讀作 sp（字級）和 dp（間距）。

### Hierarchy
- **titleLarge**（400，22/28）：目前沒有畫面使用。列表頁原本的上方列標題「筆記」已經被搜尋列（#4）取代。
- **titleMedium**（600，16/24）：列表項目的筆記標題，只顯示一行。
- **bodyLarge**（400，16/24）：編輯頁內文、空狀態說明文字。
- **bodyMedium**（400，14/20）：列表項目的內文預覽，最多兩行，超過用「…」截斷。
- **bodySmall**（400，12/16）：列表項目的修改時間（靠右）、編輯頁的「已儲存・HH:MM」。

除了 titleLarge 由 Compose 提供，其他四個角色定義在 `src/theme/typography.ts`，React Native 文字一律從那裡取用。

### Named Rules
**The CJK Weight Rule.** `titleMedium` 用 600，不是 M3 規格的 500。這是刻意的偏離：Samsung 等機型的中文系統字體沒有 Medium，500 會讓中文退回一般粗細、數字和英文卻是 Medium，同一行粗細不一致。新增其他 500 字重的角色時，也要套用同樣的處理。

**The No-Tracking Rule.** 不加 M3 的 `letterSpacing`。那是為拉丁字母設計的，加在中文上會把字拆散。這同樣是刻意偏離 M3 規格。

## Layout

全寬單欄、直向（`orientation: portrait`），畫面延伸到邊緣並用 `useSafeAreaInsets()` 處理 insets。

- **左右邊距 16dp**：列表項目、分隔線兩端、編輯內文、「已儲存」工具列都對齊同一條 16dp 線。
- **列表項目**：上下 12dp、左右 16dp，最小高度 56dp。標題和時間在同一行、對齊基線，中間至少 16dp；預覽在標題下方 4dp。
- **搜尋列**：左右 16dp、上 8dp（再加上 `insets.top`）、下 8dp；右邊和 ⋮ 的位置（48×48dp）之間 4dp。
- **FAB**：距離右邊和底部各 16dp（再加上系統 inset）。清單底部預留 `insets.bottom + 88` 的空間（56dp FAB + 上下各 16dp），讓最後一則筆記可以捲到 FAB 上方。
- **編輯頁**：輸入區佔滿上方列和工具列之間的空間，上 8dp、下 16dp。工具列最小高度 48dp，內容靠右。工具列下方的空間取 `max(鍵盤高度, insets.bottom)`，透過 `react-native-keyboard-controller` 逐格跟著鍵盤移動。
- **空狀態**：垂直置中，左右 32dp，圖示和文字之間 16dp。
- **觸控目標**至少 48×48dp（IconButton、FAB、列表項目都符合）。

間距只用 4、8、12、16、32 這幾個值。

## Elevation & Depth

用色調表現層次，不用陰影。上方列靜止時和畫面同為 `surface`，清單一捲動（`contentOffset.y > 0`）就換成 `surfaceContainer`，這是 M3 上方列的捲動行為；分隔線用 `outlineVariant`，不用陰影或卡片來區分項目。唯一的陰影是 Compose `FloatingActionButton` 內建的 elevation，程式沒有調整。

### Shadow Vocabulary
- **FAB 預設 elevation**（M3 level 3，6dp）：只出現在 FAB，由 Compose 繪製。

### Named Rules
**The Tonal Scroll Rule.** 表示「有東西在下面」時改變容器色調（`surface` → `surfaceContainer`），不要加陰影。之後的搜尋列、多選模式上方列也照這個方式做。

## Shapes

形狀幾乎都是方形、貼邊：清單項目和上方列都是全寬、無圓角、無邊框。分隔線兩端各內縮 16dp，不貼到螢幕邊緣。唯一的圓角是 FAB 的 M3 large 圓角（16dp），由 Compose 預設提供。

## Components

所有元件都是 Compose 原生元件或照 M3 規格排的 React Native 文字。目前只做了已經能用的部分；置頂（#5）、回收桶與選單（#6、#13）、附圖（#7）之後會在這套系統上擴充。

### Buttons
- **FAB（新增筆記）**：Compose `FloatingActionButton`，56dp、16dp 圓角，`primaryContainer` 底色配 `onPrimaryContainer` 的 Material Symbols `add` 圖示，`contentDescription="新增筆記"`。按下後直接建立筆記並進入編輯頁。全 APP 只有這一個主要動作。
- **IconButton（返回）**：Compose `IconButton` 加 Material Symbols `arrow_back`，`contentDescription="返回"`，放在上方列的 NavigationIcon 位置。

### Navigation
- **搜尋列（列表頁）**：Compose `DockedSearchBar`，常駐在列表上方，取代原本的「筆記」上方列。左邊是 Material Symbols `search` 圖示，placeholder「搜尋筆記」，邊打字邊篩選（`onQueryChange`）。右邊保留 48×48dp 給 ⋮ 選單（回收桶、設定），#6、#13 有功能時再放按鈕。清單捲動後，搜尋列後面的底色從 `surface` 換成 `surfaceContainer`。搜尋沒有結果時的空狀態見下方「空狀態」。
- **上方列（Small TopAppBar，編輯頁）**：Compose `TopAppBar`，64dp 高，沒有標題，只有返回鍵。
- **轉場**：native stack 的 `animation: 'default'`，也就是 Android 系統的畫面轉場，返回手勢會預覽上一頁（`predictiveBackGestureEnabled: true`）。系統關閉動畫時（`useReducedMotion()`）改用 `'none'` 直接切換。列表項目展開成編輯頁的 container transform 是原本規劃的招牌轉場，但 Reanimated 的 shared element transition 在實機上整個畫面空白，所以延到 #17。

### 筆記列表項目
- **結構**：第一行是標題（titleMedium、`onSurface`、一行）和修改時間（bodySmall、`onSurfaceVariant`、靠右）；下面是預覽（bodyMedium、`onSurfaceVariant`、最多兩行）。沒有內文時不顯示預覽，項目高度縮成一行。
- **時間格式**：今天顯示 `HH:MM`，今年其他天顯示「11月20日」，更早顯示含年份的日期。
- **按下**：Android 原生 ripple，`onSurface` 10%。
- **分隔線**：1dp、`outlineVariant`、左右內縮 16dp。

### Inputs / Fields
- **編輯內文**：React Native `TextInput`（multiline），沒有邊框也沒有底色，就是一整片 `surface`。文字 bodyLarge、`onSurface`；placeholder「筆記」用 `onSurfaceVariant`；游標用 `primary`，選取反白是 `primary` 40%。空白筆記進入時自動聚焦。

### 「已儲存」工具列
- 固定在鍵盤上方、跟著鍵盤移動，內容靠右：「已儲存・HH:MM」（bodySmall、`onSurfaceVariant`）。沒有「儲存」按鈕，打字停 500ms 後自動儲存。之後的拍照、從相簿選圖按鈕會加在這條工具列的左側。

### 空狀態
- 垂直置中：Material Symbols `note_stack` 圖示（48dp、`onSurfaceVariant`），下方是 bodyLarge 的說明文字「還沒有筆記。按右下角的「＋」開始寫。」，同樣用 `onSurfaceVariant`。
- 搜尋沒有結果：同樣的版面，圖示換成 `search_off`，說明文字是「找不到含有『…』的筆記」（…是去掉前後空白的搜尋字串）。

### 啟動畫面
- `expo-splash-screen`：淺色底 `#FEF7FF` 配 `#49454F` 的 `note_stack` 圖示，深色底 `#141218` 配 `#CAC4D0` 的圖示，`imageWidth: 76`。這個圖示是暫用的，正式 logo 和 launcher icon 由 #18 處理。splash 底色是固定的 baseline surface，進到 APP 後換成動態配色的 surface，交接時會有輕微的色調和亮度落差；這是已知、可接受的偏差。

## Do's and Don'ts

### Do:
- **Do** 所有顏色都透過 `useMaterialColors()` 的色彩角色取用；只有 `app.json` 的 splash 用 baseline 固定色。
- **Do** React Native 文字從 `src/theme/typography.ts` 取字級；Compose 元件用 Compose 內建的字級名稱。
- **Do** 優先用 `@expo/ui/jetpack-compose` 的原生元件（TopAppBar、DockedSearchBar、FloatingActionButton、IconButton、Icon），沒有對應元件時才用 React Native 照 M3 規格排版。
- **Do** 圖示一律用 `@expo/material-symbols/*.xml`，一般 24dp，空狀態插圖 48dp。
- **Do** 左右邊距一律 16dp，觸控目標至少 48×48dp。
- **Do** 用色調變化表示層次（上方列捲動時 `surface` → `surfaceContainer`）。
- **Do** 轉場交給 Android 系統（`animation: 'default'`），系統關閉動畫時用 `'none'`。
- **Do** 每個新畫面都在淺色、深色和 130% 字體大小下實機檢查。

### Don't:
- **Don't** 在畫面程式碼裡寫死 hex，也不要加 M3 色彩角色以外的品牌色。
- **Don't** 把列表做成卡片瀑布流；筆記列表是全寬清單加內縮分隔線。
- **Don't** 加底部導覽列或側邊抽屜。
- **Don't** 自創元件或 M3 motion 規格以外的轉場；列表到編輯頁的 container transform（#17）屬於 M3 規格，做好後取代目前的系統轉場。
- **Don't** 在中文文字上加 `letterSpacing`。
- **Don't** 在中文標題用 500 字重（Samsung 的中文字體沒有 Medium），改用 600。
- **Don't** 用陰影區分列表項目或上方列；陰影只有 FAB 預設的那一層。

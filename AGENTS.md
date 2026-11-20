# AGENTS.md — 3D 經脈穴位互動圖譜

> 本文件供 VSCode / Codex 在本專案中持續使用。開始任何開發前先閱讀；除非使用者修改需求，請以此為共同規格。最後更新：2026-11-20。

## 1. 專案背景與目標

使用者希望以瀏覽器建立一套可旋轉、縮放、透明顯示的 **3D 人體經脈及穴位學習工具**。主要目的是探索經脈、穴位與人體外觀／解剖結構的空間關係，並非臨床診斷、針灸定位或治療指導。使用者熟悉 VSCode、Git、Codex、Node.js，**偏好純 JavaScript，不使用 TypeScript**。

### 第一版預期功能

1. 網頁載入全身人體 3D 模型，滑鼠拖曳旋轉、滾輪縮放、可平移、回正。
2. 人體皮膚可調透明度（例如 0%～100%）、可隱藏；未來可切換骨骼、肌肉、血管等模型層（前提是來源模型確實提供）。
3. 依 14 條主經脈（十二正經、任脈、督脈）選擇顯示經脈路線和穴位。
4. 支援 361 個 WHO 標準經穴的索引、中文名稱、國際代碼、拼音、所屬經脈及定位文字（依可合法使用的資料來源整理）。
5. 可在 3D 人體上顯示、點選穴位，右側呈現資訊；支援依穴名、代碼、拼音搜尋。
6. 能選擇顯示左側、右側、雙側及中線穴位；可切換標籤、穴位點與經脈線的可見性。
7. 優先流暢、清楚、可靠，不追求華麗或極致動畫；桌機優先，手機基本可操作。

### 不在初期範圍

- 不做帳號、後端資料庫、雲端同步或 AI 診斷。
- 不自行實作複雜的人體建模引擎；優先採用授權清楚的現成 GLB/glTF。
- 不宣稱已取得臨床級精確穴位 3D 座標；不可把示意座標標成 WHO 標準座標。
- 不將傳統經脈描述直接等同於已證實的解剖管道。

## 2. 技術選型及硬性規範

- 前端：**HTML5 + CSS3 + Vanilla JavaScript (ES Modules)**。
- 3D：**Three.js**；使用 `OrbitControls`、`GLTFLoader`，必要時依模型使用 `DRACOLoader` 或 `MeshoptDecoder`。
- 開發伺服器：可用 **Vite（JavaScript 配置）**，僅作建置/本地開發，不引入 React/Vue/Angular/TypeScript。
- 資料：**JSON**，可靜態部署，無需後端。資料結構與 3D 模型分離。
- JS 模組職責清楚，避免過度抽象、單一巨型 JS 檔，以及不必要的跨模組相互調用。
- 使用者介面預設**繁體中文**，可保留英文/拼音欄位供日後國際化。
- 桌面 Chrome/Edge 為主要目標；避免 WebGL 資源洩漏，切換模型/標記時釋放 geometry/material/texture 等資源。
- 有外部套件與模型時，盡量固定版本並可本地部署，避免關鍵功能仰賴不穩定的第三方遠端服務。

## 3. 建議 UI

- **左側**：經脈清單、顯示/隱藏開關、穴位搜尋、左右側過濾。
- **中央**：3D 人體視窗，旋轉、平移、縮放、回正、正面/背面視角。
- **右側**：所選穴位的代碼、名稱、經脈、定位說明、資料來源、可信度／座標狀態。
- **頂部/工具列**：人體透明度、皮膚顯示、經脈線/點/標籤切換、將來的骨骼/肌肉/血管層。
- 人體半透明時，穴位和經脈應易於辨識；處理深度遮擋、渲染順序與透明混合，不要只設定 `opacity` 就以為已完成。
- 穴位點擊使用 Three.js Raycaster，並提供被選取的高亮狀態。

## 4. 經脈與穴位資料規劃

### 4.1 14 經及標準穴位數

| 代碼 | 經脈 | 穴位數 |
| --- | --- | ---: |
| LU | 手太陰肺經 | 11 |
| LI | 手陽明大腸經 | 20 |
| ST | 足陽明胃經 | 45 |
| SP | 足太陰脾經 | 21 |
| HT | 手少陰心經 | 9 |
| SI | 手太陽小腸經 | 19 |
| BL | 足太陽膀胱經 | 67 |
| KI | 足少陰腎經 | 27 |
| PC | 手厥陰心包經 | 9 |
| TE | 手少陽三焦經 | 23 |
| GB | 足少陽膽經 | 44 |
| LR | 足厥陰肝經 | 14 |
| GV | 督脈 | 28 |
| CV | 任脈 | 24 |
| **合計** | **標準經穴編號** | **361** |

註：361 是「標準經穴名稱／編號」的數量，**不是左右兩側展開後的 3D 標記總數**。十二正經多數穴位需依左右側展開；任督以中線為主。不要把雙側點算成新的穴位 ID。國際資料可能使用 `DU`/`REN`、`SJ`/`TB` 等別名，內部請選一套正規代碼並設對應表。

### 4.2 分層保存，嚴禁混用

**A. 標準經穴資訊**（與 3D 模型無關）：

```json
{
  "id": "LI4",
  "name_zh_tw": "合谷",
  "pinyin": "Hegu",
  "meridian": "LI",
  "location_text": "依具授權來源整理的定位說明",
  "source": "來源及版本",
  "review_status": "unverified"
}
```

**B. 綁定模型的 3D 座標**（可更換不同模型）：

```json
{
  "model_id": "human-v1",
  "point_id": "LI4",
  "side": "left",
  "position": [0.12, 0.95, 0.06],
  "coordinate_space": "model-local",
  "placement_status": "illustrative",
  "placement_source": "manual"
}
```

上面的座標**僅為資料格式示意**，不能直接作為真實穴位位置。建議把模型 id、模型版本或檔案 hash 與座標一起保存；不同模型、姿勢、比例不可盲目共用 XYZ。新增 `unplaced`、`illustrative`、`landmark_reviewed` 等狀態，明示定位準確程度。

**C. 經脈路線**：另外存每一經脈的左右側/中線路徑和控制點，與穴位座標分開，避免只按照穴位編號作直線連接造成錯誤跨面、穿體或奇怪的路徑。

### 4.3 貼合模型與編輯

- 首先建立 `model-local` 的座標規範及方向（哪邊是前、左、右、Y-up），確認模型單位及姿勢。
- 可用 raycast、最近三角面投影、法線位移或其他可靠的表面貼合演算法，避免穴位浮空或穿模。
- 不應直接將相同 XYZ 指派到不同人體模型後假設準確。
- 將來應提供 **管理／校對模式**：點擊模型放置穴位、拖曳微調、經脈線編輯、JSON 匯入／匯出；建議先做簡易工具，再擴展成完整編輯器。
- 人體左右不一定完美對稱；鏡射只能作為初始估計，需保留獨立微調能力。

## 5. 已查到的參考資料與程式（Codex 可直接開啟）

> 這些是**研究參考**，不是已驗證可直接混合使用的正式資產。使用前檢查最新原始碼、授權及模型/資料的個別條件。**不要整包複製來源專案後忽略版權。**

### A. WHO 標準定位（內容上的主要基準）

- 《WHO Standard Acupuncture Point Locations in the Western Pacific Region》（2008）
- 官方 PDF：https://iris.who.int/bitstream/handle/10665/353407/9789290613831-eng.pdf
- WHO 官方目錄：https://library.wpro.who.int/bib/11227
- 用途：對照 361 標準經穴的代碼、名稱及人體表面定位方法；**不提供可直接使用的 GLB/XYZ 座標**。
- 著作權提醒：可作標準核對，不應在未確認授權下大量逐字轉載 WHO 的定位說明或圖片。

### B. Acupoints 3D — 純網頁 361 點示例

- https://github.com/newearthmartin/acupoints3D
- 示範：https://queued-tassel-p3db.here.now/
- README 說明：14 經、361 點、`data.js` 有名稱與近似 3D 座標；渲染時將點貼近人體網格；有旋轉、點選、經脈線顯示。
- **重要：作者明說座標是教育用近似位置，不是根據解剖標誌定位。**
- README 提及人體基礎網格來自 Mesh2Motion，為 CC0；**不代表專案所有原始碼與 `data.js` 都自動是 CC0**。若要複用程式／資料，需先確認授權。

### C. 立體明堂（tcm-acupoints）— 介面及表面吸附參考

- https://github.com/spacejohnlf/tcm-acupoints
- 使用 React + TypeScript + Vite + Three.js（**只參考方法，不照搬技術棧**）。
- 功能：14 經、搜尋、穴位點擊、表面吸附、GLB、左右穴位處理。
- 程式碼標示 MIT；模型另有 **CC BY-SA 4.0** 規定，需依 `ATTRIBUTION.md` 保留署名與相同授權要求。座標亦屬示意資料。

### D. Open Anatomy 3D — 可考慮作主要人體模型

- https://github.com/MervinR07/open-anatomy-3d
- 範例：https://mervinr07.github.io/open-anatomy-3d/
- 提供男女 GLB，具有皮膚、骨骼、肌肉、器官、血管及神經等分層網格。**可用原生 Three.js 載入模型，無須使用其 React viewer**。
- 模型採 `EXT_meshopt_compression`，`GLTFLoader` **必須配置 `MeshoptDecoder`**。
- 模型和結構目錄：CC BY 4.0（參見 `LICENSE-MODELS.md`），可商用但須正確署名、附授權及修改註記；原專案也有其他軟體授權，請逐項核對。
- 模型只供教育與視覺化，並非醫療診斷用途。

### E. 經絡製圖室（Meridian Studio）— **特別值得研究的原生 JS 編輯器**

- https://github.com/eb-barry/acupuncture-3d-authoring
- Three.js + Vite + **Vanilla JavaScript**，與本專案偏好高度一致。
- 具有 361 穴位目錄、GLB 載入、貼膚標記/曲線、拖曳控制點、左右配對、Undo/Redo、JSON 匯出/匯入。
- 很值得優先研究其 `surface projection`、貼膚路徑、編輯資料格式設計。
- 使用前檢查 `THIRD_PARTY_NOTICES.md` 和相關資產授權；**不要預設此庫整體可任意複製**。

### F. 可補充的公開資料

- TARA Ontology curated acupoints CSV：
  https://github.com/SciCrunch/TARA-Ontology-Repository/tree/master/curated-data
- 其 `acupoints.csv` 描述包含穴位代碼、中文名、拼音及定位等欄位；**需確認相關文字來源與資料授權，勿因 CSV 可公開讀取便認定可商業轉載**。

## 6. 建議專案目錄

```text
meridian-viewer/
├── AGENTS.md
├── README.md
├── package.json
├── index.html
├── public/
│   └── models/
│       └── human.glb
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── viewer/
│   │   ├── scene.js         # scene/camera/renderer/resize/controls
│   │   ├── body-model.js    # GLB、模型切換與透明度
│   │   ├── acupoint-layer.js# 標記與點擊
│   │   └── meridian-layer.js# 經脈路線
│   ├── data/
│   │   ├── loader.js
│   │   └── validators.js
│   └── ui/
│       ├── panels.js
│       └── interactions.js
├── data/
│   ├── meridians.json
│   ├── acupoints.json
│   ├── model_positions.json
│   └── meridian_paths.json
└── docs/
    ├── DATA_SOURCES.md    # 各資料欄位來源、版本、授權
    ├── ATTRIBUTION.md     # 模型與第三方資產署名
    └── HANDOFF.md         # 當前進度、決策、已知問題、下一步
```

允許依實際情況小幅調整目錄；變更時記錄原因，保持資料層、渲染層、UI 層解耦。`data/` 可能要移至 `public/data/` 才能由 Vite 以 `fetch()` 載入；**採哪種方式請在實作時固定一致，不要留下路徑錯誤**。

## 7. 階段式開發與驗收標準

### Phase 1 — 最小可運作人體 3D 檢視器（先做）

- 初始化 Vite + Vanilla JS + Three.js，載入授權合適的人體 GLB。
- 旋轉／縮放／平移／回正、正背面視角、透明度滑桿。
- 載入失敗時可清楚顯示錯誤；調整視窗大小正常；無大量 console errors。
- 完成後需能 `npm install && npm run dev`、`npm run build`。

### Phase 2 — 先做一條經脈（建議手太陰肺經 LU，11 點）

- 建立資料載入及 schema，顯示 LU1～LU11 的**示意位置**；不確定者標示待校對。
- 點選/搜尋/高亮/右側資訊；可開關穴位與標籤。
- 建立左／右側表示方式，座標依本模型處理。
- 增加一條示意路線，避免穿模。

### Phase 3 — 14 經脈與 361 點資料目錄

- 補齊全部標準經穴索引及中文名稱、拼音、代碼與所屬經脈。
- 文字欄位標明來源與核對狀態；不可憑空填入精確解剖位置。
- **目錄完整 ≠ 所有穴位 3D 座標已完成**。沒有有效座標者不應偷偷放到 `[0,0,0]`；應顯示「尚未定位」。
- 增加經脈過濾、雙側顯示、搜尋、標籤／路線開關。

### Phase 4 — 定位編輯、資料品質與解剖層

- 管理模式：表面點選定位、調整穴位、路線控制點、JSON 匯入/匯出、校驗。
-逐經脈校對與記錄校對狀態，支援模型版本與資料遷移。
- 在模型有對應 mesh 的前提下，顯示骨骼、肌肉、血管等解剖層作學習對照。
- 最後再處理手機體驗、效能優化與部署。

## 8. Codex 工作方式（重要）

1. **先讀此 `AGENTS.md`，再看 `docs/HANDOFF.md`**（如有），確認目前做到哪個 Phase。
2. 不必一開始把 361 個座標全部造出來，**優先交付可執行、可檢驗的最小版本**。
3. 每次工作先說明預計修改哪些檔案及目標，修改後要實際執行 `npm run build`，可行時執行測試；報告失敗原因。
4. 寫入專案的外部資產或文字前，查證原始授權，記錄 URL、作者、版本／存取日期、許可要求；若授權不明，僅參考設計，不直接複製。
5. 所有示意資料應標示 `illustrative`；禁止將近似 3D 座標宣稱為 WHO 官方座標或醫療級定位。
6. 不未經同意引入 React、TypeScript、重量級後端或與此專案無關的功能。
7. 渲染層不要直接硬編 361 個穴位資料；應由 JSON／loader 載入。選擇人體模型後，該模型座標與經脈路線獨立保存。
8. 遇到技術選擇時，優先考慮**易讀、易改、模組獨立、易交接**；避免為了抽象而抽象。
9. 每完成一個 Phase，更新 `docs/HANDOFF.md`（完成項目、已知問題、下一步、啟動指令），方便跨電腦透過 Git 接續開發。
10. 用繁體中文與使用者溝通；關鍵技術名稱與檔案名稱保留英文。

## 9. 醫療及資料使用聲明

本系統定位為教育／人體空間視覺化工具。經脈是傳統醫學的理論路線，不能直接宣稱為現代解剖學已證實的獨立實體。穴位位置、臨床功效或治療方法不應由程式自動推斷。無法核實的內容應註記來源與可信度，不要假裝已經過醫療專業人士審核。

## 10. Codex 的第一個任務（開新專案後）

請先依本文件完成 **Phase 1**：建立原生 JS + Three.js 3D 人體檢視器，優先評估 Open Anatomy 3D 的 GLB 作為主要模型，確認 Meshopt 解碼和 CC BY 4.0 署名；完成旋轉、縮放、透明度滑桿及基本介面。不要急著自行捏造穴位座標。完成後報告執行方式、實作結果、外部模型授權與下一階段建議，並建立 `docs/HANDOFF.md`。

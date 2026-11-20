# 模型來源與授權

## 部分穴位示意座標

- 來源為 [JIC tcm-3d 的體表示意資料](https://github.com/JICio/tcm-3d/blob/e8b9ad1c17e67a25e94406100e3fb5c296c24f7a/app/meridian-surface.json)，© 2026 ashemag、JIC contributors。參考座標屬上游應用資料，底層皮膚同樣衍生自 BodyParts3D（DBCLS，CC BY 4.0）。
- 本專案僅取逐側參考座標與法線，以目前模型的皮膚三角面重新定位，並另調整四個穴位。上游的授權與版權通知隨網站發布。 [上游授權](https://github.com/JICio/tcm-3d/blob/e8b9ad1c17e67a25e94406100e3fb5c296c24f7a/LICENSE) · [本機副本](../public/jic-coordinate-license.txt)

## 人體模型

- 使用 MervinR07 的 [Open Anatomy 3D](https://github.com/MervinR07/open-anatomy-3d) 男性模型。檔案來自 [open-anatomy-3d 0.1.0](https://www.npmjs.com/package/open-anatomy-3d/v/0.1.0) 的 `models/anatomy-male.glb`，查閱日期為 2026-11-20。
- 上游男性模型改編自 [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/)，© The Database Center for Life Science，採 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。上游整併結構、簡化網格、轉換座標與單位，並使用 Meshopt 壓縮。
- 本專案隨建置輸出原始 GLB。檢視器執行時調整皮膚材質顏色及透明度，並隱藏其他系統。
- 依 [上游模型授權](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/LICENSE-MODELS.md) 提供署名、授權連結和修改說明。更多原始資料及處理細節見 [上游署名文件](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/ATTRIBUTION.md)。

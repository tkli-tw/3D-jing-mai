# 經脈資料來源

- 穴名、拼音與代碼參考 WHO [針灸命名提案](https://apps.who.int/iris/bitstream/handle/10665/40001/9241544171_eng.pdf) 及世界針灸學會聯合會刊載的[《經穴部位》第 3.1 節](https://www.wfas.org.cn/a47122.html)。
- 肺經定位文字依上述《經穴部位》整理。心包經與心經的繁體中文摘要參考 [WHO 西太平洋區穴位定位標準](https://iris.who.int/bitstream/handle/10665/353407/9789290613831-eng.pdf)。摘要省略量測細節，標記為 `unverified`，查閱日期為 2026-11-20。
- `data/model_positions.json` 保存 29 個穴名對應的 58 個標記。依胸、上臂、肘、腕與手部的模型外形選擇示意位置，再由 +Z 朝皮膚投射。左右側各自與網格求交，深度依模型兩側表面獨立計算。
- `data/meridian_paths.json` 保存六條體表折線，可依經脈代碼和側別識別。彎折處依需要加設引導點，平面投影取樣間距最多約 3～4 mm，貼面後沿 +Z 外移約 1.8 mm。逐段取樣確認線段在皮膚前表面外。
- 座標與路線標記為 `illustrative`，綁定 `open-anatomy-3d:0.1.0:male`。模型來源與授權見 [ATTRIBUTION.md](ATTRIBUTION.md)。

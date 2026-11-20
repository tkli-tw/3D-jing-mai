# 3D 人體經脈圖譜

使用左鍵拖曳旋轉人體、右鍵拖曳平移、滾輪縮放，或使用檢視設定切換正面、背面、回正與皮膚透明度。可單獨或同時顯示肺經（LU）、心包經（PC）與心經（HT），並依穴名、代碼或拼音搜尋，或在模型上點選雙側示意標記。

建議使用 Node.js 22.12+ 或 24 LTS，瀏覽器需支援 WebGL 2。

```sh
npm install
npm run dev
```

開啟終端機顯示的本機網址。`npm run build` 會將可部署的網站和模型寫入 `dist/`，可用 `npm run preview` 預覽。

參閱 [模型署名](docs/ATTRIBUTION.md) 與 [開發交接](docs/HANDOFF.md)。

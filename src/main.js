import './styles.css';
import { Vector3 } from 'three';
import { createScene } from './viewer/scene.js';
import { loadBodyModel } from './viewer/body-model.js';
import { loadMeridians } from './data/loader.js';
import { createPointCorrections } from './data/point-corrections.js';
import { createAcupointLayer } from './viewer/acupoint-layer.js';
import { createMeridianLayer } from './viewer/meridian-layer.js';
import { setupMeridianPanel } from './ui/meridian-panel.js';

const status = document.querySelector('#status');
const settings = document.querySelector('#settings');
const skinVisible = document.querySelector('#skin-visible');
const transparency = document.querySelector('#transparency');
const percentage = document.querySelector('#percentage');

async function start() {
  let viewer;
  try {
    viewer = createScene(document.querySelector('#stage'));
  } catch (error) {
    status.textContent = '無法啟動 3D 檢視器。請確認瀏覽器支援 WebGL 2 並已啟用圖形加速。';
    console.error(error);
    return;
  }

  try {
    const body = await loadBodyModel();
    viewer.showModel(body.model, body.bounds, body.skin);

    function updateSkin() {
      percentage.value = `${transparency.value}%`;
      body.setSkin({ visible: skinVisible.checked, transparency: transparency.valueAsNumber / 100 });
      viewer.render();
    }

    skinVisible.addEventListener('change', updateSkin);
    transparency.addEventListener('input', updateSkin);
    for (const button of settings.querySelectorAll('[data-view]')) {
      button.addEventListener('click', () => viewer.setView(button.dataset.view));
    }
    updateSkin();
    settings.disabled = false;
    status.hidden = true;

    try {
      const channels = loadMeridians(body.id);
      const corrections = createPointCorrections(body.id, channels);
      const layers = channels.filter(({ placements, paths }) => placements.length || paths.length)
        .map(({ meridian, placements, paths }) => {
          const points = createAcupointLayer(placements, meridian.color);
          const path = createMeridianLayer(paths, meridian.color);
          path.group.userData.meridianId = meridian.id;
          body.model.add(points.group, path.group);
          return { id: meridian.id, points, path };
        });
      const panel = setupMeridianPanel(channels, (state) => {
        for (const { id, points, path } of layers) {
          const visible = state.activeChannels.has(id);
          const channelColor = state.channelColors.get(id);
          points.group.visible = visible;
          points.update({ ...state, channelColor, channelSelected: state.selectedChannel === id });
          path.update({ side: state.side, showPath: visible && state.showPath, lineColor: channelColor });
        }
        viewer.render();
      }, {
        corrections,
        focusPoint(position) {
          viewer.focusPoint(body.model.localToWorld(new Vector3().fromArray(position)));
        },
        nudge(position, x, y) {
          const worldPoint = body.model.localToWorld(new Vector3().fromArray(position));
          const next = viewer.nudgeOnSkin(worldPoint, x, y);
          return next && body.model.worldToLocal(next).toArray();
        },
      });
      viewer.enablePicking({
        getTargets: () => layers.flatMap(({ points }) => points.group.visible ? points.getTargets() : []),
        getOccluder: () => body.skin.visible && transparency.valueAsNumber === 0 ? body.skin : null,
        onPick: panel.select,
        getLineTargets: () => layers.flatMap(({ path }) => path.getTargets()),
        onHover: (line) => panel.highlight(line.parent.userData.meridianId),
        onLinePick: (line) => panel.selectChannel(line.parent.userData.meridianId),
        onSurfacePick: (getPoint) => panel.handleSurfacePick(() => {
          const point = getPoint();
          return point && body.model.worldToLocal(point).toArray();
        }),
      });
    } catch (error) {
      document.querySelector('#meridian-error').hidden = false;
      console.error(error);
    }
  } catch (error) {
    status.textContent = '人體模型載入失敗。請重新整理頁面重試。';
    console.error(error);
  }
}

start();

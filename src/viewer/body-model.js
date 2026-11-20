import { Box3, Color, FrontSide } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import maleModelUrl from 'open-anatomy-3d/models/anatomy-male.glb?url';

export async function loadBodyModel() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const { scene: model } = await loader.loadAsync(maleModelUrl);
  const skin = model.children.find((child) => child.name === 'skin');
  const materials = new Set();

  for (const layer of model.children) layer.visible = layer === skin;
  skin?.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) materials.add(material);
  });

  if (!materials.size) throw new Error('模型缺少皮膚網格。');
  const bounds = new Box3().setFromObject(skin);
  if (bounds.isEmpty()) throw new Error('模型的皮膚網格沒有可顯示的範圍。');

  for (const material of materials) {
    material.color.copy(new Color('#b6cdc6'));
    material.side = FrontSide;
  }

  function setSkin({ visible, transparency }) {
    skin.visible = visible && transparency < 1;
    for (const material of materials) {
      const transparent = transparency > 0;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.opacity = 1 - transparency;
      material.depthWrite = !transparent;
    }
  }

  return { id: 'open-anatomy-3d:0.1.0:male', model, bounds, skin, setSkin };
}

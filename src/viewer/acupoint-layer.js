import { CanvasTexture, Group, Mesh, MeshBasicMaterial, SphereGeometry, Sprite, SpriteMaterial } from 'three';
import { matchesSide } from '../data/sides.js';

function createLabel(id) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#10252c';
  context.beginPath();
  context.roundRect(4, 4, 120, 56, 13);
  context.fill();
  context.fillStyle = '#d5fff5';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 40px system-ui';
  context.fillText(id, 64, 33);
  return new CanvasTexture(canvas);
}

export function createAcupointLayer(placements, color) {
  const group = new Group();
  const geometry = new SphereGeometry(0.0055, 12, 8);
  const normalMaterial = new MeshBasicMaterial({ color });
  const selectedMaterial = new MeshBasicMaterial({ color: '#fff5e2' });
  const labelMaterials = new Map();

  const markers = placements.map(({ point_id: id, position, side }) => {
    const mesh = new Mesh(geometry, normalMaterial);
    mesh.position.fromArray(position);
    mesh.userData = { id, side };
    group.add(mesh);
    return { mesh, label: null, id, side, position };
  });

  function addLabel({ id, side, mesh }) {
    if (!labelMaterials.has(id)) {
      labelMaterials.set(id, new SpriteMaterial({ map: createLabel(id), depthWrite: false }));
    }
    const label = new Sprite(labelMaterials.get(id));
    label.position.copy(mesh.position);
    const outward = side === 'right' ? -1 : 1;
    const offset = id === 'LU8' ? 0.087 : 0.044;
    label.position.x += outward * offset;
    label.position.z += 0.003;
    label.renderOrder = 2;
    group.add(label);
    return label;
  }

  function update({ side, showPoints, showLabels, selection, channelColor, channelSelected }) {
    normalMaterial.color.set(channelColor);
    for (const marker of markers) {
      const [x, y, z] = marker.position;
      const current = marker.mesh.position;
      if (current.x !== x || current.y !== y || current.z !== z) {
        marker.label?.position.sub(current);
        current.set(x, y, z);
        marker.label?.position.add(current);
      }
      const sideVisible = matchesSide(side, marker.side);
      const selected = selection?.id === marker.id && (!selection.side || selection.side === marker.side);
      marker.mesh.visible = sideVisible && showPoints;
      marker.mesh.material = selected ? selectedMaterial : normalMaterial;
      marker.mesh.scale.setScalar(selected ? 1.5 : channelSelected ? 1.18 : 1);
      const labelVisible = group.visible && sideVisible && showLabels;
      if (labelVisible && !marker.label) marker.label = addLabel(marker);
      if (marker.label) {
        marker.label.visible = labelVisible;
        marker.label.scale.set(selected ? 0.074 : 0.062, selected ? 0.037 : 0.031, 1);
      }
    }
  }

  return { group, update, getTargets: () => markers.map(({ mesh }) => mesh).filter((mesh) => mesh.visible) };
}

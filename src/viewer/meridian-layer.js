import { BufferGeometry, Group, Line, LineBasicMaterial, Vector3 } from 'three';

export function createMeridianLayer(paths, color) {
  const group = new Group();
  const material = new LineBasicMaterial({ color });
  for (const { side, vertices } of paths) {
    const geometry = new BufferGeometry().setFromPoints(vertices.map((vertex) => new Vector3(...vertex)));
    const line = new Line(geometry, material);
    line.userData.side = side;
    group.add(line);
  }

  function update({ side, showPath, lineColor }) {
    group.visible = showPath;
    material.color.set(lineColor);
    for (const line of group.children) line.visible = side === 'both' || side === line.userData.side;
  }

  return { group, update, getTargets: () => group.visible ? group.children.filter((line) => line.visible) : [] };
}

import meridians from '../../data/meridians.json';
import catalog from '../../data/acupoints.json';
import placements from '../../data/model_positions.json';
import routes from '../../data/meridian_paths.json';

export function loadMeridians(modelId) {
  const pointsById = new Map(catalog.points.map((point) => [point.id, point]));
  const sides = ['left', 'right'];
  const isVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

  if (pointsById.size !== catalog.points.length ||
      [placements, routes].some((data) => data.model_id !== modelId ||
        data.coordinate_space !== 'model-local' || data.placement_status !== 'illustrative')) {
    throw new Error('經脈資料與模型版本不相符。');
  }

  const markerKeys = new Set();
  for (const point of placements.points) {
    const key = `${point.point_id}:${point.side}`;
    if (markerKeys.has(key) || !pointsById.has(point.point_id) ||
        !sides.includes(point.side) || !isVector(point.position)) {
      throw new Error('穴位座標格式錯誤。');
    }
    markerKeys.add(key);
  }

  if (markerKeys.size !== catalog.points.length * sides.length ||
      routes.paths.length !== meridians.length * sides.length) {
    throw new Error('經脈的左右側資料不完整。');
  }

  const channels = meridians.map((meridian) => {
    const points = catalog.points.filter((point) => point.meridian === meridian.id);
    const paths = routes.paths.filter((path) => path.meridian === meridian.id);
    const source = catalog.sources[meridian.id];
    if (points.length !== meridian.point_count || paths.length !== sides.length || !source ||
        !sides.every((side) => paths.some((path) => path.side === side &&
          path.vertices.length >= 2 && path.vertices.every(isVector)))) {
      throw new Error(`${meridian.id} 的穴位或路線資料不完整。`);
    }
    return {
      meridian, points, paths, source,
      placements: placements.points.filter((point) => pointsById.get(point.point_id).meridian === meridian.id),
    };
  });
  if (channels.reduce((sum, channel) => sum + channel.points.length, 0) !== catalog.points.length) {
    throw new Error('有穴位缺少所屬經脈。');
  }
  return channels;
}

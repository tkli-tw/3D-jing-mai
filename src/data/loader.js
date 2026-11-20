import meridians from '../../data/meridians.json';
import catalog from '../../data/acupoints.json';
import placements from '../../data/model_positions.json';
import routes from '../../data/meridian_paths.json';

export function loadMeridians(modelId) {
  const pointsById = new Map(catalog.points.map((point) => [point.id, point]));
  const channelsById = new Map(meridians.map((meridian) => [meridian.id, meridian]));
  const isVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  const validSide = (meridian, side) => meridian?.sides === 'midline' ? side === 'midline' :
    meridian?.sides === 'bilateral' && (side === 'left' || side === 'right');

  if (meridians.length !== 14 || channelsById.size !== 14 || catalog.points.length !== 361 ||
      pointsById.size !== catalog.points.length ||
      [placements, routes].some((data) => data.model_id !== modelId ||
        data.coordinate_space !== 'model-local' || data.placement_status !== 'illustrative')) {
    throw new Error('經脈資料與模型版本不相符。');
  }

  const markerKeys = new Set();
  for (const point of placements.points) {
    const key = `${point.point_id}:${point.side}`;
    const entry = pointsById.get(point.point_id);
    if (markerKeys.has(key) || !validSide(channelsById.get(entry?.meridian), point.side) ||
        !isVector(point.position) || point.position.every((component) => component === 0)) {
      throw new Error('穴位座標格式錯誤。');
    }
    markerKeys.add(key);
  }

  const pathKeys = new Set();
  for (const path of routes.paths) {
    const key = `${path.meridian}:${path.side}:${path.segment ?? ''}`;
    if (pathKeys.has(key) || !validSide(channelsById.get(path.meridian), path.side) ||
        path.vertices.length < 2 || !path.vertices.every(isVector)) {
      throw new Error('經脈路線座標格式錯誤。');
    }
    pathKeys.add(key);
  }

  const channels = meridians.map((meridian) => {
    const points = catalog.points.filter((point) => point.meridian === meridian.id)
      .sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)));
    const paths = routes.paths.filter((path) => path.meridian === meridian.id);
    if (points.length !== meridian.point_count || points.some((point, index) =>
      point.id !== `${meridian.id}${index + 1}` || !point.name_zh_tw || !point.pinyin || !point.location_text?.trim())) {
      throw new Error(`${meridian.id} 的穴位目錄不完整。`);
    }
    return {
      meridian, points, paths,
      indexSource: catalog.index_source,
      locationSource: catalog.sources[meridian.id] ?? catalog.location_standard,
      unavailable: placements.unavailable ?? {},
      placements: placements.points.filter((point) => pointsById.get(point.point_id).meridian === meridian.id),
    };
  });
  if (channels.reduce((sum, channel) => sum + channel.points.length, 0) !== catalog.points.length) {
    throw new Error('有穴位缺少所屬經脈。');
  }
  return channels;
}

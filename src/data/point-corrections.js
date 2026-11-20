export function createPointCorrections(modelId, channels) {
  const storageKey = `jing-mai:point-corrections:${modelId}`;
  const originals = new Map();
  for (const { placements } of channels) {
    for (const placement of placements) {
      const key = `${placement.point_id}:${placement.side}`;
      originals.set(key, { placement, position: [...placement.position] });
    }
  }
  const corrections = new Map();

  function valid(record) {
    return Array.isArray(record?.position) && record.position.length === 3 &&
      record.position.every(Number.isFinite) && typeof record.note === 'string';
  }

  function apply(key, record) {
    const { placement, position } = originals.get(key);
    placement.position.splice(0, 3, ...(record?.position ?? position));
    if (record) corrections.set(key, record);
    else corrections.delete(key);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved?.model_id === modelId && Array.isArray(saved.points)) {
      for (const record of saved.points) {
        const key = `${record?.point_id}:${record?.side}`;
        if (originals.has(key) && valid(record)) apply(key, record);
      }
    }
  } catch {
    // The built-in coordinates remain usable if storage is blocked or corrupt.
  }

  function data() {
    return {
      model_id: modelId,
      coordinate_space: 'model-local',
      placement_status: 'illustrative',
      points: [...corrections.values()],
    };
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data()));
      return true;
    } catch {
      return false;
    }
  }

  return {
    get: (id, side) => corrections.get(`${id}:${side}`),
    save(id, side, position, note) {
      const key = `${id}:${side}`;
      if (!originals.has(key) || !valid({ position, note })) return false;
      apply(key, { point_id: id, side, position: [...position], note });
      return persist();
    },
    reset(id, side) {
      const key = `${id}:${side}`;
      if (!originals.has(key)) return false;
      apply(key);
      return persist();
    },
    exportData: data,
  };
}

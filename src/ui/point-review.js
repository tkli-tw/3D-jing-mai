const get = (id) => document.getElementById(id);

export function setupPointReview({ corrections, getTarget, onChange, nudge }) {
  const toggle = get('review-enabled');
  const controls = get('review-controls');
  const note = get('review-note');
  const status = get('review-status');
  const reset = get('review-reset');
  const exportButton = get('review-export');
  let activeKey;

  function refresh() {
    const target = getTarget();
    const key = target && `${target.id}:${target.side}`;
    get('review-toggle').hidden = !target;
    controls.hidden = !target || !toggle.checked;
    const record = target && corrections.get(target.id, target.side);
    if (key !== activeKey) {
      note.value = record?.note ?? '';
      status.textContent = record ? '此側有本機校對紀錄。' : '';
      activeKey = key;
    }
    reset.disabled = !record;
    exportButton.disabled = !corrections.exportData().points.length;
  }

  function save(target, position, message, checkSide = true) {
    if (!position) {
      status.textContent = '找不到附近的皮膚表面，可調整視角再試。';
      return;
    }
    const x = position[0];
    if (checkSide && ((target.side === 'left' && x < -0.004) || (target.side === 'right' && x > 0.004) ||
        (target.side === 'midline' && Math.abs(x) > 0.009))) {
      status.textContent = '這個位置與目前側別不符。';
      return;
    }
    const stored = corrections.save(target.id, target.side, position, note.value.trim());
    onChange();
    refresh();
    status.textContent = stored ? message : '已套用於本次頁面。瀏覽器無法儲存，可先匯出 JSON。';
  }

  function handleSurfacePick(getPosition) {
    const target = getTarget();
    if (!toggle.checked || !target) return false;
    save(target, getPosition(), '位置已儲存至這個瀏覽器。');
    return true;
  }

  toggle.addEventListener('change', refresh);
  for (const button of controls.querySelectorAll('[data-nudge]')) {
    button.addEventListener('click', () => {
      const target = getTarget();
      if (!target) return;
      const [x, y] = button.dataset.nudge.split(',').map(Number);
      save(target, nudge(target.position, x, y), '微調已儲存至這個瀏覽器。');
    });
  }
  get('review-save').addEventListener('click', () => {
    const target = getTarget();
    if (target) save(target, [...target.position], '備註已儲存至這個瀏覽器。', false);
  });
  reset.addEventListener('click', () => {
    const target = getTarget();
    if (!target) return;
    const stored = corrections.reset(target.id, target.side);
    note.value = '';
    onChange();
    refresh();
    status.textContent = stored ? '已還原此穴位的原始位置。' : '本頁已還原。瀏覽器無法儲存這次變更。';
  });
  exportButton.addEventListener('click', () => {
    const data = corrections.exportData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `jing-mai-${data.model_id.replaceAll(':', '-')}-corrections.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  return { refresh, handleSurfacePick };
}

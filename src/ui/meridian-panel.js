import { matchesSide } from '../data/sides.js';
import { setupPointReview } from './point-review.js';
import { setupPointDetails } from './point-details.js';
import { indexPoint, parsePointQuery, scorePoint } from '../data/point-search.js';

const get = (id) => document.getElementById(id);
const sideLabels = { left: '左側', right: '右側', both: '雙側', all: '雙側', midline: '中線' };
const defaultChannels = new Set(['LU', 'HT', 'PC']);
const neutralColor = '#748288';
const hoverColor = '#80bfc6';
const selectedColor = '#ffd478';

function swatch(color) {
  const dot = document.createElement('span');
  dot.className = 'channel-swatch';
  dot.style.setProperty('--channel-color', color);
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

export function setupMeridianPanel(channels, onChange, { focusPoint, corrections, nudge }) {
  const search = get('point-search');
  const list = get('point-results');
  const side = get('point-side');
  const lineColor = get('line-color');
  const allChannels = get('all-channels');
  const showPath = get('show-path');
  const showPoints = get('show-points');
  const showLabels = get('show-labels');
  const focusSide = get('focus-side');
  const buttons = new Map();
  const channelOptions = new Map();
  let selection;
  let hoveredChannel;
  let selectedChannel;
  let previousQuery;
  const review = setupPointReview({
    corrections, getTarget, nudge,
    onChange() {
      const target = getTarget();
      if (!matchesSide(side.value, target.side)) side.value = target.side;
      select(target);
    },
  });
  const details = setupPointDetails((id) => {
    if (id !== 'tab-review') review.deactivate();
  });

  function getTarget() {
    if (!selection) return;
    const chosenSide = focusSide.value;
    const position = buttons.get(selection.id).positions.get(chosenSide);
    if (position) return { id: selection.id, side: chosenSide, position };
  }

  function compatibleSide(meridian) {
    return meridian.sides === 'midline' ? matchesSide(side.value, 'midline') : side.value !== 'midline';
  }

  function update() {
    const query = parsePointQuery(search.value);
    if (previousQuery !== search.value) {
      const entries = [...buttons.values()];
      for (const entry of entries) entry.score = scorePoint(entry.searchIndex, query);
      entries.sort((a, b) => b.score - a.score);
      list.append(...entries.map(({ item }) => item));
      previousQuery = search.value;
    }
    const activeChannels = new Set(
      [...channelOptions].filter(([, { checkbox }]) => checkbox.checked).map(([id]) => id),
    );
    allChannels.checked = activeChannels.size === channelOptions.size;
    allChannels.indeterminate = activeChannels.size > 0 && !allChannels.checked;
    if (!activeChannels.has(hoveredChannel)) hoveredChannel = undefined;
    if (!activeChannels.has(selectedChannel)) selectedChannel = undefined;
    const channelColors = new Map();
    for (const [id, { checkbox, button, dot, color }] of channelOptions) {
      const baseColor = lineColor.value === 'focus' ? neutralColor : color;
      const currentColor = id === selectedChannel ? selectedColor : id === hoveredChannel ? hoverColor : baseColor;
      channelColors.set(id, currentColor);
      button.disabled = !checkbox.checked;
      button.setAttribute('aria-pressed', String(id === selectedChannel));
      dot.style.setProperty('--channel-color', currentColor);
    }
    const selectedMeridian = selection && buttons.get(selection.id).meridian;
    if (selectedMeridian && (!activeChannels.has(selectedMeridian.id) || !compatibleSide(selectedMeridian))) {
      selection = undefined;
      get('details-empty').hidden = false;
      get('point-details').hidden = true;
      review.deactivate();
    }
    let matches = 0;
    for (const [id, { item, button, dot, score, meridian }] of buttons) {
      item.hidden = !compatibleSide(meridian) || (query.full ? score < 0 : !activeChannels.has(meridian.id));
      if (!item.hidden) matches++;
      button.setAttribute('aria-pressed', String(selection?.id === id));
      dot.style.setProperty('--channel-color', channelColors.get(meridian.id));
    }
    get('point-empty').hidden = matches > 0;
    review.refresh();
    onChange({
      activeChannels,
      channelColors,
      selectedChannel,
      side: side.value,
      showPath: showPath.checked,
      showPoints: showPoints.checked,
      showLabels: showLabels.checked,
      selection,
    });
  }

  function highlight(channelId) {
    if (!channelOptions.get(channelId)?.checkbox.checked || hoveredChannel === channelId) return;
    hoveredChannel = channelId;
    update();
  }

  function selectChannel(channelId) {
    if (!channelOptions.get(channelId)?.checkbox.checked) return;
    selectedChannel = channelId;
    hoveredChannel = undefined;
    update();
  }

  function select({ id, side: pickedSide }) {
    const entry = buttons.get(id);
    if (!entry) return;
    const { point, meridian, source, positions, unavailableReason } = entry;
    const displaySide = meridian.sides === 'midline' ? 'midline' : pickedSide ?? side.value;
    selection = { id, side: pickedSide };
    get('details-empty').hidden = true;
    get('point-details').hidden = false;
    get('detail-name').textContent = `${id} · ${point.name_zh_tw}`;
    get('detail-meta').textContent = `${point.pinyin} · ${meridian.name_zh_tw} · ${sideLabels[displaySide]}`;
    get('detail-location').textContent = point.location_text ?? '定位說明待整理。';
    get('detail-placement').textContent = [...positions.keys()].some((placedSide) => matchesSide(displaySide, placedSide))
      ? '模型位置為示意，待校對。' : unavailableReason ?? '尚未在目前的 3D 模型定位。';
    get('point-focus').hidden = positions.size === 0;
    focusSide.hidden = positions.size < 2;
    focusSide.replaceChildren(...['left', 'right', 'midline']
      .filter((placedSide) => positions.has(placedSide))
      .map((placedSide) => new Option(sideLabels[placedSide], placedSide)));
    if (positions.has(displaySide)) focusSide.value = displaySide;
    get('detail-source').href = source.url;
    get('detail-source').textContent = source.title;
    details.showEvidence(id);
    update();
  }

  for (const { meridian, points, indexSource, locationSource, placements, paths, unavailable } of channels) {
    const row = document.createElement('div');
    row.className = 'toggle channel-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = defaultChannels.has(meridian.id);
    checkbox.value = meridian.id;
    checkbox.setAttribute('aria-label', `顯示${meridian.name_zh_tw}`);
    checkbox.addEventListener('change', update);
    const dot = swatch(meridian.color);
    const button = document.createElement('button');
    button.type = 'button';
    button.append(dot, meridian.name_zh_tw);
    if (!placements.length) {
      const badge = document.createElement('span');
      badge.className = 'catalog-only';
      badge.textContent = paths.length ? '示意線' : '目錄';
      button.append(badge);
    }
    button.addEventListener('click', () => selectChannel(meridian.id));
    row.append(checkbox, button);
    row.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') highlight(meridian.id);
    });
    button.addEventListener('focus', () => highlight(meridian.id));
    get('channel-options').append(row);
    channelOptions.set(meridian.id, { checkbox, button, dot, color: meridian.color });

    for (const point of points) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const dot = swatch(meridian.color);
      button.append(dot, `${point.id} · ${point.name_zh_tw}`);
      button.addEventListener('click', () => {
        channelOptions.get(meridian.id).checkbox.checked = true;
        select({ id: point.id });
      });
      item.append(button);
      list.append(item);
      const searchIndex = indexPoint(point, meridian);
      const positions = new Map(placements.filter(({ point_id }) => point_id === point.id)
        .map(({ side, position }) => [side, position]));
      const source = point.location_text ? locationSource ?? indexSource : indexSource;
      buttons.set(point.id, { item, button, dot, point, meridian, source, positions, searchIndex,
        unavailableReason: unavailable[point.id] });
    }
  }
  search.addEventListener('input', update);
  focusSide.addEventListener('change', review.refresh);
  get('focus-point').addEventListener('click', () => {
    if (!selection) return;
    const focus = focusSide.value;
    const position = buttons.get(selection.id).positions.get(focus);
    if (!position) return;
    if (!matchesSide(side.value, focus)) side.value = focus;
    select({ id: selection.id, side: focus });
    focusPoint(position);
  });
  allChannels.addEventListener('change', () => {
    for (const { checkbox } of channelOptions.values()) checkbox.checked = allChannels.checked;
    update();
  });
  lineColor.addEventListener('change', update);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      list.querySelector('li:not([hidden]) button')?.click();
    }
  });
  side.addEventListener('change', () => {
    if (selection && compatibleSide(buttons.get(selection.id).meridian)) {
      const pickedSide = matchesSide(side.value, selection.side) ? selection.side : undefined;
      select({ id: selection.id, side: pickedSide });
    } else {
      update();
    }
  });
  for (const checkbox of [showPath, showPoints, showLabels]) checkbox.addEventListener('change', update);
  get('meridian-settings').disabled = false;
  get('point-settings').disabled = false;
  update();
  return { select, highlight, selectChannel, handleSurfacePick: review.handleSurfacePick };
}

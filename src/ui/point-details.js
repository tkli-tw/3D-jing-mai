import evidence from '../../data/acupoint-evidence.json';
import traditional from '../../data/acupoint-traditional.json';

function appendText(parent, text, tag = 'p') {
  const element = document.createElement(tag);
  element.textContent = text;
  parent.append(element);
}

function appendSource(parent, source) {
  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = source.title;
  parent.append(link);
}

export function setupPointDetails(onTabChange) {
  const tabs = [...document.querySelectorAll('.detail-tabs [role="tab"]')];
  const content = document.querySelector('#detail-evidence');
  const traditionalContent = document.querySelector('#detail-traditional');

  function activate(tab) {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    }
    onTabChange(tab.id);
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      const next = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    });
  }

  function showEvidence(id) {
    traditionalContent.replaceChildren();
    const usage = traditional.points[id];
    if (usage) {
      appendText(traditionalContent, usage.summary ?? `文獻列載的傳統作用包括${usage.actions.join('、')}。`);
      appendSource(traditionalContent, traditional.sources[usage.source]);
      if (usage.topics?.length) {
        appendText(traditionalContent, `文獻索引詞：${usage.topics.join('、')}。`);
        const topicsSource = traditional.sources[usage.topics_source];
        if (topicsSource !== traditional.sources[usage.source]) appendSource(traditionalContent, topicsSource);
      }
      const source = traditional.sources[usage.topics_source ?? usage.source];
      if (source.license_url) appendSource(traditionalContent, { title: source.license, url: source.license_url });
    } else {
      appendText(traditionalContent, '目前尚未收錄此穴位的傳統用途。');
    }

    const entry = evidence[id];
    content.replaceChildren();
    if (!entry) {
      appendText(content, '目前尚未收錄此穴位的研究摘要。');
      return;
    }

    appendText(content, entry.topic, 'h4');
    for (const value of [entry.type, entry.method, entry.finding, entry.limits]) {
      appendText(content, value);
    }
    appendSource(content, entry.source);
  }

  return { showEvidence };
}

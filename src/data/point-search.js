import traditional from '../../data/acupoint-traditional.json';
import evidence from '../../data/acupoint-evidence.json';

const simplified = '经脉肠肾胆关门阴阳冲泽渊际风头颈脏觉复温听咸呕恶泻烦晕气发视节劳后归脑侧动过处离郁热车灵养虚隐谿内涌俞窍络云阴脐肿';
const traditionalForms = '經脈腸腎膽關門陰陽衝澤淵際風頭頸臟覺復溫聽鹹嘔惡瀉煩暈氣發視節勞後歸腦側動過處離鬱熱車靈養虛隱溪內湧俞竅絡雲陰臍腫';
const forms = new Map([...simplified].map((character, index) => [character, traditionalForms[index]]));
const aliases = { sj: 'te', tb: 'te', tw: 'te', du: 'gv', ren: 'cv', kd: 'ki', k: 'ki' };
const synonyms = [
  ['睡不好', '失眠', '睡眠不佳', '安神'],
  ['想吐', '反胃', '噁心', '嘔吐'],
  ['胃不舒服', '胃部不適', '胃痛', '和胃'],
  ['拉肚子', '腹瀉'],
  ['月經痛', '經痛', '痛經'],
  ['脖子痛', '頸痛', '肩頸痠痛', '頸部僵硬'],
];
const organNames = {
  LU: ['肺臟', 'lungs', 'lung'], LI: ['大腸', 'large intestine', 'colon'], ST: ['胃部', 'stomach'],
  SP: ['脾臟', 'spleen'], HT: ['心臟', 'heart'], SI: ['小腸', 'small intestine'],
  BL: ['膀胱', 'bladder'], KI: ['腎臟', 'kidney'], PC: ['心包膜', 'pericardium'],
  TE: ['三焦', '三焦經', 'sanjiao'], GB: ['膽囊', 'gallbladder'], LR: ['肝臟', 'liver'],
  GV: ['督脈', 'governor vessel'], CV: ['任脈', 'conception vessel'],
};

function normalize(text) {
  return text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/\p{Script=Han}/gu, (character) => forms.get(character) ?? character);
}

function normalizeCode(token) {
  return token.replace(/^(sj|tb|tw|du|ren|kd|k)(?=\d)/, (alias) => aliases[alias]);
}

export function parsePointQuery(text) {
  const full = normalizeCode(normalize(text));
  const words = text.normalize('NFKC').trim().split(/[\s,，、]+/u).map(normalize).filter(Boolean).map(normalizeCode);
  return { full, words };
}

export function indexPoint(point, meridian) {
  const usage = traditional.points[point.id];
  const study = evidence[point.id];
  return {
    names: [point.id, point.name_zh_tw, point.pinyin, ...(point.aliases ?? [])].map(normalize),
    groups: [meridian.id, meridian.name_zh_tw, ...(organNames[meridian.id] ?? [])].map(normalize),
    text: [point.location_text, usage?.summary, ...(usage?.actions ?? []), ...(usage?.topics ?? []),
      study?.topic, study?.method].filter(Boolean).map(normalize),
  };
}

function oneEdit(a, b) {
  if (a.length > b.length) return oneEdit(b, a);
  if (b.length - a.length > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + (a.length === b.length ? 1 : 0)) === b.slice(i + 1);
}

export function scorePoint(index, { full, words }) {
  if (!full) return 0;
  if (index.names.includes(full)) return 100;
  if (index.names.some((name) => name.startsWith(full))) return 80;

  function tokenScore(token) {
    if (index.names.some((name) => name.includes(token))) return 65;
    if (index.groups.some((group) => group.includes(token))) return 50;
    if (index.text.some((value) => value.includes(token))) return 35;
    const related = synonyms.find((group) => group.includes(token));
    if (related?.some((term) => index.text.some((value) => value.includes(term)))) return 25;
    return 0;
  }
  const direct = tokenScore(full);
  if (direct) return direct;
  const scores = words.map(tokenScore);
  if (scores.length > 1 && scores.every(Boolean)) return Math.min(...scores);
  if (/^[a-z]{4,}$/.test(full) && index.names.some((name) => /^[a-z]+$/.test(name) && oneEdit(full, name))) return 15;
  return -1;
}

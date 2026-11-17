const DICT = {
  ru: {
    title: 'Одно касание', title1: 'ОДНО', title2: 'КАСАНИЕ', tag: 'Один выстрел. Все точки.',
    levelN: 'Уровень {n}', levels: 'Уровни', sound: 'Звук', music: 'Музыка', back: 'Назад',
    fire: 'Пуск', hint: 'Подсказка', hintFree: 'Подсказка · {n}',
    bounces: 'Отскоков: {n}', attempt: 'Попытка {n}',
    aim: 'Веди пальцем, чтобы прицелиться', flying: 'Летит…',
    missed: 'Собрано {n} из {m}. Ещё раз!', allDone: 'Все точки собраны',
    winTitle: 'Чисто!', winInfo: 'Попыток: {n}', next: 'Дальше', toLevels: 'К уровням', retry: 'Ещё раз', toMenu: 'В меню',
    noReward: 'Награда не получена', hintOn: 'Пунктир — верный путь. Жми «Пуск»',
    newPortal: 'Новое: порталы переносят луч', newGlass: 'Новое: стекло бьётся с одного удара',
    newZone: 'Новая зона: {name}', previewOff: 'Дальше прицел без подсказки отскоков',
    'zone.0': 'Неон', 'zone.1': 'Океан', 'zone.2': 'Закат', 'zone.3': 'Космос',
    daily: 'Уровень дня', dailyNew: 'новый уровень ждёт', dailyKeep: 'не прерви серию: {n}', dailyDoneSub: 'пройден · серия {n}',
    dailyDone: 'Уровень дня пройден', dailyReward: '+1 бесплатная подсказка', dailyAgain: 'Новый будет завтра', streak: 'Серия: {n}',
    stars: '★ {n}', progress: '{n} из {m}',
  },
  en: {
    title: 'One Touch', title1: 'ONE', title2: 'TOUCH', tag: 'One shot. Every dot.',
    levelN: 'Level {n}', levels: 'Levels', sound: 'Sound', music: 'Music', back: 'Back',
    fire: 'Fire', hint: 'Hint', hintFree: 'Hint · {n}',
    bounces: 'Bounces: {n}', attempt: 'Try {n}',
    aim: 'Drag to aim', flying: 'Flying…',
    missed: 'Got {n} of {m}. Again!', allDone: 'All dots collected',
    winTitle: 'Clean!', winInfo: 'Tries: {n}', next: 'Next', toLevels: 'Levels', retry: 'Retry', toMenu: 'Menu',
    noReward: 'Reward not received', hintOn: 'The dashed line is the way. Press Fire',
    newPortal: 'New: portals carry the beam', newGlass: 'New: glass breaks after one hit',
    newZone: 'New zone: {name}', previewOff: 'From now on the aim shows no bounces',
    'zone.0': 'Neon', 'zone.1': 'Ocean', 'zone.2': 'Sunset', 'zone.3': 'Space',
    daily: 'Daily level', dailyNew: 'a new level awaits', dailyKeep: 'keep your streak: {n}', dailyDoneSub: 'done · streak {n}',
    dailyDone: 'Daily level complete', dailyReward: '+1 free hint', dailyAgain: 'A new one arrives tomorrow', streak: 'Streak: {n}',
    stars: '★ {n}', progress: '{n} of {m}',
  },
};

const RU_LIKE = ['ru', 'be', 'kk', 'uk', 'uz', 'ky', 'tg', 'hy', 'az'];
let lang = 'ru';

export function setLang(code) {
  const c = String(code || 'ru').toLowerCase().slice(0, 2);
  lang = RU_LIKE.includes(c) ? 'ru' : 'en';
  document.documentElement.lang = lang;
  return lang;
}

export function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) || DICT.ru[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

export function applyStatic(root) {
  (root || document).querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  (root || document).querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.title = t('title');
}

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
    dailyDone: 'Уровень дня пройден', dailyReward: '+1 подсказка и +50 монет', dailyAgain: 'Новый будет завтра', streak: 'Серия: {n}',
    stars: '★ {n}', progress: '{n} из {m}',
    bonus: 'Бонус-раунд', bonusBanner: 'БОНУС-РАУНД', bonusWhyStreak: '3 идеальных уровня подряд!', bonusWhyMilestone: 'Пройдено уровней: {n}!',
    toBonus: 'Бонус-раунд →', charges: 'Заряды: {n}', collected: 'Собрано монет: {n}', bonusAim: 'Собери как можно больше монет. Заряда три',
    extraTitle: 'Ещё заряд?', extraInfo: 'На поле осталось монет: {n}', extraAd: '▶ +1 заряд', take: 'Забрать {n}',
    bonusEnd: 'Бонус собран', bonusInfo: 'монет за раунд', perfectProg: 'идеально подряд: {n}/3',
    shop: 'Магазин', tabCannon: 'Пушка', tabBall: 'Заряд', tabDot: 'Точки',
    buy: 'Купить', equip: 'Надеть', equipped: 'Надето', owned: 'Есть', top: 'ТОП',
    watchAd: '▶ Смотреть рекламу {n}/{m}', notEnough: 'Не хватает монет: {n}',
    coinsAd: '+{n} монет за рекламу', coinsAdLeft: 'ещё {n} сегодня', coinsAdNone: 'На сегодня всё, приходи завтра',
    earned: 'Монеты: +{n}', double: '▶ ×2 монеты за рекламу', doubled: 'Монеты удвоены: +{n}',
    'skin.classic': 'Классика', 'skin.turret': 'Турель', 'skin.tri': 'Истребитель', 'skin.eye': 'Глаз', 'skin.hex': 'Гекса',
    'skin.crystal': 'Кристалл', 'skin.plasma': 'Плазма', 'skin.crown': 'Корона',
    'skin.fire': 'Огонь', 'skin.ice': 'Лёд', 'skin.toxic': 'Токсин', 'skin.gold': 'Золото', 'skin.rainbow': 'Радуга', 'skin.lightning': 'Молния',
    'skin.star': 'Звезда', 'skin.heart': 'Сердце', 'skin.gem': 'Самоцвет', 'skin.coin': 'Монета', 'skin.planet': 'Планета',
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
    dailyDone: 'Daily level complete', dailyReward: '+1 hint and +50 coins', dailyAgain: 'A new one arrives tomorrow', streak: 'Streak: {n}',
    stars: '★ {n}', progress: '{n} of {m}',
    bonus: 'Bonus round', bonusBanner: 'BONUS ROUND', bonusWhyStreak: '3 perfect levels in a row!', bonusWhyMilestone: 'Levels cleared: {n}!',
    toBonus: 'Bonus round →', charges: 'Shots: {n}', collected: 'Coins collected: {n}', bonusAim: 'Grab as many coins as you can. Three shots',
    extraTitle: 'One more shot?', extraInfo: 'Coins left on the field: {n}', extraAd: '▶ +1 shot', take: 'Take {n}',
    bonusEnd: 'Bonus collected', bonusInfo: 'coins this round', perfectProg: 'perfect in a row: {n}/3',
    shop: 'Shop', tabCannon: 'Cannon', tabBall: 'Charge', tabDot: 'Dots',
    buy: 'Buy', equip: 'Equip', equipped: 'Equipped', owned: 'Owned', top: 'TOP',
    watchAd: '▶ Watch ad {n}/{m}', notEnough: 'Need {n} more coins',
    coinsAd: '+{n} coins for an ad', coinsAdLeft: '{n} left today', coinsAdNone: 'That is all for today, come back tomorrow',
    earned: '+{n} coins', double: '▶ ×2 coins for an ad', doubled: 'Doubled: +{n} coins',
    'skin.classic': 'Classic', 'skin.turret': 'Turret', 'skin.tri': 'Fighter', 'skin.eye': 'Eye', 'skin.hex': 'Hexa',
    'skin.crystal': 'Crystal', 'skin.plasma': 'Plasma', 'skin.crown': 'Crown',
    'skin.fire': 'Fire', 'skin.ice': 'Ice', 'skin.toxic': 'Toxic', 'skin.gold': 'Gold', 'skin.rainbow': 'Rainbow', 'skin.lightning': 'Lightning',
    'skin.star': 'Star', 'skin.heart': 'Heart', 'skin.gem': 'Gem', 'skin.coin': 'Coin', 'skin.planet': 'Planet',
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

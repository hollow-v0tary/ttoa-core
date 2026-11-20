/* Uses the existing player archive as the default; Firestore only stores deltas. */
export const CORE = [
  ['checks','2d20','Сумма двух d20 + модификаторы против сложности.'],
  ['character','Создание','Шесть атрибутов, здоровье, скорость и навыки.'],
  ['movement','Передвижение','Маршруты, территории и открытия на карте Таоса.'],
  ['combat','Раунд','Инициатива, тактические действия и реакции.'],
  ['magic','Заклинания','Пять Кругов магии, источники и Мана.'],
  ['states','Эффекты','Метки, Кровотечение, Яд, Уязвимость и Усталость.'],
  ['gear','Предметы','Инвентарь, оружие, броня, реликты и расходники.'],
  ['progression','Уровни 1–10','Базовый класс 1–3, Путь 4–6, Перелом 7, Истинный класс 8–10.']
];
export const getEntries = () => [
  ...CORE.map(([id,title,description])=>({id:`core-${id}`,group:'Модули правил',type:'core',rawId:id,title,description,imageUrl:`./assets/core/${id}.webp`,page:`core-${id}.html`})),
  ...((window.THAOS_RACES)||[]).map(r=>({id:`race-${r.id}`,group:'Расы',type:'race',rawId:r.id,title:r.name,description:r.desc,imageUrl:`./assets/races/art/${r.id}.webp`,meta:{passive:r.passive,effect:r.effect}})),
  ...((window.THAOS_CLASSES)||[]).map(c=>({id:`class-${c.id}`,group:'Классы',type:'class',rawId:c.id,title:c.name,description:c.desc,imageUrl:`./assets/classes/art/${c.id}.webp`,meta:{role:c.role,resource:c.resource}})),
  ...((window.THAOS_WORLD?.zones)||[]).map(z=>({id:`world-${z.id}`,group:'Мир Таоса',type:'world',rawId:z.id,title:z.name,description:z.short,imageUrl:'',meta:{type:z.type,danger:z.danger,card:z.card,history:(window.THAOS_WORLD_HISTORY||{})[z.id]||'',legend:window.THAOS_WORLD?.lore?.[z.id]?.legend||'',myth:window.THAOS_WORLD?.lore?.[z.id]?.myth||'',pact:window.THAOS_WORLD?.kingdomDetails?.[z.id]?.pact||'',motto:(window.THAOS_WORLD_MOTTO||{})[z.id]||'',holidays:window.THAOS_WORLD?.lore?.[z.id]?.holidays?.join('\n')||''}})),
  {id:'section-races',group:'Фоны разделов',type:'section',rawId:'races',title:'Расы — фон каталога',description:'',imageUrl:'./assets/races-backdrop.webp'},
  {id:'section-classes',group:'Фоны разделов',type:'section',rawId:'classes',title:'Классы — фон каталога',description:'',imageUrl:'./assets/classes-backdrop.webp'}
];
export const textSelector='.rule-chapter h2, .rule-chapter h3, .rule-chapter p, .rule-chapter li';
export const imageIsAllowed = value => {
  if (!value || typeof value!=='string' || value.length>2048) return false;
  return /^\.\/assets\/[a-zA-Z0-9/_.-]+$/.test(value) || /^https:\/\/firebasestorage\.googleapis\.com\//.test(value);
};

import { firebaseIsConfigured } from './firebase-config.js';
import { getFirebaseClient } from './firebase-client.js';

/* Player UI is deliberately separate from the public THAOS archive.
   Firestore remains the source of truth; no GM/admin authority is granted here. */
const $ = id => document.getElementById(id);
const main = $('playerContent');
const defaults = () => ({name:'',bio:'',raceId:'',classId:'',level:1,attributes:{Сила:1,Ловкость:1,Телосложение:1,Интеллект:1,Мудрость:1,Харизма:1},attrBase:{Сила:1,Ловкость:1,Телосложение:1,Интеллект:1,Мудрость:1,Харизма:1},attrBoosts:{},baseSkills:[],pathIndex:-1,pathSkills:[],kitId:'',raceChoice:'Огонь',health:0,healthMax:0,mana:0,manaMax:0,speed:5,defense:22,artData:'',inventory:[],equipped:[]});
const state={client:null,user:null,characters:[],selectedId:null,settings:{activeCharacterId:null,partyId:null,pendingPartyId:null},party:null,roster:[],requests:[],request:null,announcements:[],newsletter:false,editor:false,draft:null,step:0,skillFocus:null,mapSelected:null,mapNoteDraft:null,groupArt:'',groupDraftName:'',groupDraftDescription:'',partyJoinCode:'',busy:false,unsubs:[],partyUnsubs:[],noticeTimer:null};
const CL=window.THAOS_CLASSES||[],RA=window.THAOS_RACES||[],Z=window.THAOS_WORLD?.zones||[];
const BR=window.THAOS_BALANCE;
const BK=window.THAOS_BUILDER_ENGINE;
const choiceSkills=cl=>BR?.selectableBaseSkills(cl)||cl?.skills||[];
const innateSkill=cl=>BR?.getFreeSkill(cl?.id)||null;
const getClass=id=>CL.find(c=>c.id===id),getRace=id=>RA.find(r=>r.id===id),getZone=id=>Z.find(z=>z.id===id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeArt=x=>typeof x==='string' && /^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(x) && x.length<170000 ? x : '';
const fdate=x=>{if(!x)return '—';const d=x.toDate?x.toDate():new Date(x);return Number.isNaN(+d)?'—':d.toLocaleDateString('ru-RU')};
const short=x=>x?.length>22?x.slice(0,21)+'…':x;
const isLeader=()=>Boolean(state.party&&state.party.leaderId===state.user?.uid);
const activeChar=()=>state.characters.find(x=>x.id===state.settings.activeCharacterId)||state.characters[0]||null;
function notice(text,kind='success'){const el=$('playerNotice');el.textContent=text;el.dataset.kind=kind;el.hidden=!text;if(text){clearTimeout(state.noticeTimer);state.noticeTimer=setTimeout(()=>el.hidden=true,7500)}}
function toast(msg){const e=$('playerToast');e.textContent=msg;e.classList.add('is-visible');setTimeout(()=>e.classList.remove('is-visible'),3400)}
function report(error,context='Операция'){console.error('THAOS Player:',context,error);notice(`${context}: ${error?.code==='permission-denied'?'нет доступа. Опубликуй новые firestore.rules из архива.':error?.message||'Неизвестная ошибка'}`,'error')}
function toggleBusy(v){state.busy=v;document.querySelectorAll('[data-action="save-character"],[data-action="create-party"],[data-action="join-party"]').forEach(e=>e.disabled=v)}
const card=(title,body,cls='')=>`<article class="player-card ${cls}">${title?`<h2>${esc(title)}</h2>`:''}${body}</article>`;
const btn=(label,action,cls='',extra='')=>`<button class="player-button ${cls}" type="button" data-action="${action}" ${extra}>${label}</button>`;
const inp=(name,label,value='',type='text',extra='')=>`<div class="player-field"><label for="field-${name}">${esc(label)}</label><input class="player-input" id="field-${name}" data-field="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
function view(){if(document.body.dataset.builderDemo==='true')return 'characters';const k=(location.hash||'#characters').slice(1),known=['characters','group','map','tools','dashboard'];return known.includes(k)?k:'characters'}
function updateNav(){const tab=view(),titles={characters:['Персонажи','Создавайте, развивайте и сохраняйте героев своей истории.'],group:['Группа','Объединяйтесь с другими игроками и отслеживайте состояние отряда.'],map:['Карта отряда','Исследуйте Таос и сохраняйте местоположение группы.'],tools:['Инструменты','Торговля, кузница и сундуки активируются Мастером во время игры.'],dashboard:['Панель','Ваши персонажи, группа, уведомления и настройки обновлений.']};$('playerSectionTitle').textContent=document.body.dataset.builderDemo==='true'?'Конструктор персонажа V2':titles[tab][0];$('playerSectionSubtitle').textContent=document.body.dataset.builderDemo==='true'?'Семь шагов создания персонажа — без входа и без сохранения в облако.':titles[tab][1];$('playerBreadcrumb').textContent='СИСТЕМА / ИГРОК / '+titles[tab][0].toUpperCase();document.querySelectorAll('[data-tab]').forEach(x=>{const a=x.dataset.tab===tab;x.classList.toggle('is-active',a);x.setAttribute('aria-current',a?'page':'false')});}
function render(){updateNav();if(!state.user)return;const page=view();main.hidden=false;main.className='player-content-enter';main.innerHTML=({characters:renderCharacters,group:renderGroup,map:renderMap,tools:renderTools,dashboard:renderDashboard}[page])();if(state.editor&&page==='characters')main.querySelector('[data-autofocus]')?.focus({preventScroll:true});}
function pathInfo(c,index){return window.THAOS_PATH_CONTENT?.[c.id]?.[index]||null}
function skillsAt(level){return BK.skillCount(level)}
function pathAt(level){return BK.pathCount(level)}
function attrUsed(attrs){return Object.values(attrs).reduce((s,n)=>s+(n*(n-1)/2),0)}
function artOrPlaceholder(x,cls=''){return safeArt(x)?`<img class="${cls}" src="${safeArt(x)}" alt="Арт персонажа">`:`<div class="${cls} player-artdrop" aria-hidden="true">✦<br>THAOS</div>`}
function renderCharacters(){if(state.editor&&state.draft)return renderEditor();if(state.selectedId){const c=state.characters.find(x=>x.id===state.selectedId);if(c)return renderCharacterDetail(c)}
 const files=state.characters.slice(0,8),slots=Array.from({length:8},(_,i)=>{const c=files[i];return c?`<button type="button" class="player-slot" data-action="open-character" data-id="${esc(c.id)}">${safeArt(c.artData)?`<img class="player-slot__portrait" src="${safeArt(c.artData)}" alt="">`:`<span class="player-slot__diamond"><span>◈</span></span>`}<span class="player-slot__name">${esc(c.name)}</span><span class="player-slot__sub">${esc(getClass(c.classId)?.name||'Класс')} · ур. ${c.level||1}</span></button>`:`<button type="button" class="player-slot player-slot--empty" data-action="new-character"><span class="player-slot__diamond"><span>+</span></span><span class="player-slot__sub">${i===files.length?'Создать персонажа':'Свободный слот'}</span></button>`}).join('');return `<div class="player-section-title"><div><span class="player-kicker">CHARACTER LIBRARY</span><h2>Мои персонажи <span class="player-pill">${state.characters.length} / 8</span></h2></div>${btn('+ Создать','new-character','player-button--primary',state.characters.length>=8?'disabled':'')}</div><div class="player-gallery">${slots}</div>${card('Система развития',`<p>Выберите один из восьми слотов, создайте героя и распределите стартовые навыки. На 4 уровне открывается Путь, на 7 — Перелом. Созданного персонажа можно улучшать и пересобирать, а данные сохраняются в Firestore.</p><a class="player-button" href="./core-progression.html">Открыть правила прогрессии ↗</a>`,'player-card--glow')}`}
function renderCharacterDetail(c){const cl=getClass(c.classId),race=getRace(c.raceId);const attrs=Object.entries(c.attributes||{}).map(([n,v])=>`<span class="player-pill">${esc(n)} ${v}</span>`).join(' ');
 return `<div class="player-row player-row--between player-row--wrap" style="margin-bottom:20px"><button class="player-button" data-action="back-characters">← Мои персонажи</button><div class="player-row player-row--wrap">${btn('Активный','activate-character','',`data-id="${esc(c.id)}" ${activeChar()?.id===c.id?'disabled':''}`)}${btn('Пересобрать','edit-character','',`data-id="${esc(c.id)}"`)}${btn('Улучшить','level-up','player-button--gold',`data-id="${esc(c.id)}"`)}${btn('Скачать лист','export-sheet','player-button--primary',`data-id="${esc(c.id)}"`)}</div></div>
 <div class="player-grid"><article class="player-card player-card--glow"><div class="player-portrait-layout">${artOrPlaceholder(c.artData,'player-portrait-large')}<div><span class="player-kicker">CHARACTER FILE // ${esc(c.id.slice(0,8).toUpperCase())}</span><h2 class="player-character-title">${esc(c.name)}</h2><p class="player-tagline">${esc(race?.name)} · ${esc(cl?.name)} · ${c.level} уровень</p>${c.level>=4?`<p>${esc(cl?.paths?.[c.pathIndex]||'Путь не выбран')}</p>`:''}<div class="player-row player-row--wrap">${attrs}</div><div class="player-rule"></div><p class="player-bio">${esc(c.bio||'История персонажа ещё не написана.')}</p></div></div></article>
 <article class="player-card"><div class="player-section-title"><h2>Характеристики</h2><span class="player-pill player-pill--green">${state.settings.activeCharacterId===c.id?'Активный':'Архив'}</span></div><div class="player-metrics">${metric('Здоровье',`${c.health||0}/${c.healthMax||0}`)}${metric('Мана',`${c.mana??5}/${c.manaMax??5}`)}${metric('Скорость',`${c.speed||'—'} м`)}${metric('Защита',c.defense||'—')}</div><div class="player-rule"></div><h3>Навыки</h3><p><b>Базовая способность:</b> ${esc(innateSkill(cl)||'Нет')}</p><p><b>Выбранные навыки:</b> ${esc((c.baseSkills||[]).join(', ')||'Не выбраны')}</p><p><b>Путь:</b> ${esc((c.pathSkills||[]).join(', ')||'Ещё закрыт')}</p>${c.level>=7?'<span class="player-pill player-pill--gold">VII · Перелом</span>':''}<div class="player-rule"></div><p class="player-small">${c.schemaVersion===2?'Характеристики рассчитаны по тестовому ядру Core Math 1.2; условные эффекты не включены.':'Старый лист V1: откройте «Пересобрать», чтобы перейти на расчётную модель V2.'}</p><p><strong>Стартовый комплект:</strong> ${esc((c.progression?.levelHistory||[]).find(x=>x.type==='starterKit')?.kitId?kitName((c.progression?.levelHistory||[]).find(x=>x.type==='starterKit').kitId):'Не указан')}</p>${c.level>=7&&!c.progression?.breakthroughCompleted?'<p class="player-small">Перелом ожидает выбора Мастера.</p>':''}</article></div>
 <div class="player-row player-row--wrap" style="margin-top:20px">${btn('Скачать HTML-лист','download-html','',`data-id="${esc(c.id)}"`)}${btn('Скачать JSON','download-json','',`data-id="${esc(c.id)}"`)}${btn('Удалить персонажа','delete-character','player-button--danger',`data-id="${esc(c.id)}"`)}</div>`}
function metric(label,value){return `<div class="player-metric"><small>${esc(label)}</small><b>${esc(value)}</b></div>`}
// Character Builder V2 — seven authored steps. Character data is local until save.
const BSTEP=['Облик','Уровень','Раса','Класс','Навыки','Атрибуты','Подтверждение'];
const BSTATUSES={source:'Исходное описание','balance-v1':'Тестовая механика','new_candidate':'Тестовая механика','needs-numbers':'Нужна механика'};
const BART_RACE = id => `./assets/races/art/${encodeURIComponent(id)}.webp`;
const BART_CLASS = id => `./assets/classes/art/${encodeURIComponent(id)}.webp`;
function kitName(id){return BK.kit(id)?.label||'Комплект не выбран'}
function kitFor(c){return BK.kit(c.kitId)}
function editorStats(c){return BK.calc(c)}
function syncAttrs(c){c.attributes=BK.calculateAttrs(c.attrBase,c.attrBoosts)}
function needsAttributeIncrease(c,level){return c.level>=level}
function editorNav(){const c=state.draft;return `<nav class="b2-steps" aria-label="Этапы создания">${BSTEP.map((name,i)=>`<button type="button" class="b2-step ${i===state.step?'is-active':''} ${i<state.step?'is-visited':''}" data-action="edit-step" data-step="${i}" aria-current="${i===state.step?'step':'false'}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(name)}</span></button>`).join('')}</nav>`}
function viewOrb(level){const earth=level<=5;return `<div class="b2-level-stage"><div class="b2-orbits"><button type="button" data-action="level-orbit" data-orbit="earth" class="b2-orb b2-earth ${earth?'is-current':''}" aria-label="Земля, уровни 1–5"><span class="b2-orb-ring"></span><span class="b2-orb-body"></span><span class="b2-orb-label">ЗЕМЛЯ</span><small>УРОВНИ 01—05</small></button><button type="button" data-action="level-orbit" data-orbit="moon" class="b2-orb b2-moon ${!earth?'is-current':''}" aria-label="Луна, уровни 6–10"><span class="b2-orb-ring"></span><span class="b2-orb-body"></span><span class="b2-orb-label">ЛУНА</span><small>УРОВНИ 06—10</small></button></div><div class="b2-level-selection"><span class="player-kicker">ЭТАП РАЗВИТИЯ</span><div class="b2-level-number">${String(level).padStart(2,'0')}</div><div class="b2-level-chooser"><button type="button" data-action="level-minus" ${level<=1?'disabled':''} aria-label="Уменьшить уровень">−</button><input id="b2-level-range" aria-label="Уровень персонажа" type="range" min="1" max="10" value="${level}" data-field="level"><button type="button" data-action="level-plus" ${level>=10?'disabled':''} aria-label="Повысить уровень">+</button></div><div class="b2-level-dots">${Array.from({length:10},(_,i)=>`<button type="button" data-action="level-direct" data-level="${i+1}" aria-label="${i+1} уровень" class="${level===i+1?'is-current':''}">${i+1}</button>`).join('')}</div><p>${level<=3?'Базовый класс: открываются стартовые навыки.':level<7?'Путь: специализация и два навыка Пути.':'Перелом: выбор Истинного класса остаётся мастерским контентом, пока не опубликованы его механики.'}</p><small>Прокрути колёсико над кругами или выбери число. Уровень влияет на HP, ману, Защиту, атрибуты и доступные навыки.</small></div></div>`}
function raceCards(c){const race=getRace(c.raceId);return `<div class="b2-choice-layout"><section><div class="b2-choice-grid">${RA.map(x=>`<button type="button" data-action="pick-race" data-id="${esc(x.id)}" class="b2-art-card ${c.raceId===x.id?'is-chosen':''}"><img loading="lazy" src="${BART_RACE(x.id)}" alt=""><span class="b2-art-caption">${esc(x.name)}</span>${c.raceId===x.id?'<span class="b2-picked">ВЫБРАНО</span>':''}</button>`).join('')}</div><p class="b2-hint">Пепельник зарезервирован как будущая 13-я раса, но пока не доступен для создания.</p></section><aside class="b2-choice-info">${race?`<img class="b2-detail-art" src="${BART_RACE(race.id)}" alt=""><div class="player-kicker">РАСОВАЯ ОСОБЕННОСТЬ</div><h2>${esc(race.name)}</h2><h3>${esc(race.passive||'Особенность')}</h3><p>${esc(race.effect||race.desc||'Расовое описание в справочнике THAOS.')}</p><p><strong>Скорость:</strong> 5 ${BK.race(race.id)?.speedModifier>0?'+':''}${BK.race(race.id)?.speedModifier||0} м до экипировки.</p>${race.id==='dragonborn'?`<label class="b2-field">Драконья кровь — выбрать сопротивление<select class="player-select" data-field="raceChoice">${['Огонь','Холод','Молния'].map(e=>`<option value="${e}" ${c.raceChoice===e?'selected':''}>${e}</option>`).join('')}</select></label>`:''}`:`<div class="b2-empty-selection">Выберите расу, чтобы увидеть её особенности и поправку к Скорости.</div>`}</aside></div>`}
function classCards(c){const cl=getClass(c.classId);const classStats=BK.C(c.classId);return `<div class="b2-choice-layout"><section><div class="b2-choice-grid">${CL.map(x=>`<button type="button" data-action="pick-class" data-id="${esc(x.id)}" class="b2-art-card ${c.classId===x.id?'is-chosen':''}"><img loading="lazy" src="${BART_CLASS(x.id)}" alt=""><span class="b2-art-caption">${esc(x.name)}</span>${c.classId===x.id?'<span class="b2-picked">ВЫБРАНО</span>':''}</button>`).join('')}</div><p class="b2-hint">«Пожиратель душ» запланирован как 14-й основной класс. Его механика пока в разработке, поэтому выбор недоступен.</p></section><aside class="b2-choice-info">${cl?`<img class="b2-detail-art" src="${BART_CLASS(cl.id)}" alt=""><div class="player-kicker">БАЗОВЫЙ КЛАСС</div><h2>${esc(cl.name)}</h2><p>${esc(cl.desc)}</p><p><strong>Боевая роль:</strong> ${esc(cl.combatRole||cl.role)}</p><p><strong>Стартовая мана:</strong> ${classStats?.manaStart??5} · <strong>прирост:</strong> +${classStats?.manaPerLevel??1}/уровень</p><p><strong>Ресурс:</strong> ${esc(cl.resource||'—')}</p><p><strong>Стандартных наборов:</strong> 2</p>`:`<div class="b2-empty-selection">Выберите класс. От него зависят запас маны, способности и доступные стартовые комплекты.</div>`}</aside></div>`}
function renderSkillChoice(type,c,cl){
  const base=type==='base';
  const path=window.THAOS_PATH_CONTENT?.[cl.id]?.[c.pathIndex];
  const options=base?choiceSkills(cl):(path?.skills||[]);
  const selected=base?c.baseSkills:c.pathSkills;
  const limit=base?BK.skillCount(c.level):BK.pathCount(c.level);
  const focus=state.skillFocus?.type===type?state.skillFocus:null;
  const focusIndex=focus?options.indexOf(focus.name):-1;
  const skillData=base&&focus?BR?.getSkill(cl.id,focus.name):null;
  return `<section class="b2-skill-region"><div class="b2-stage-head"><div><div class="player-kicker">${base?'1—3 / БАЗОВЫЕ НАВЫКИ':'4—6 / НАВЫКИ ПУТИ'}</div><h3>${base?'Навыки класса':cl.paths[c.pathIndex]}</h3></div><span class="player-pill">${selected.length} / ${limit}</span></div>${base&&BK.autoSkills(cl.id).length?`<div class="b2-auto-skill"><b>Автоматически с 1-го уровня:</b> ${BK.autoSkills(cl.id).map(x=>esc(x)).join(', ')}. Не занимает слот навыка.</div>`:''}<div class="b2-skills-layout"><div class="b2-skills-list">${options.map((name,i)=>{const on=selected.includes(name),view=focus?.name===name;return `<button type="button" data-action="${base?'preview-base':'preview-path'}" data-skill="${i}" class="b2-skill-tile ${view?'is-viewed':''} ${on?'is-kept':''}" aria-pressed="${on}"><span class="b2-skill-icon">${String(i+1).padStart(2,'0')}</span><span>${esc(name)}</span>${on?'<b class="b2-gold-tag">ВЫБРАНО</b>':''}</button>`}).join('')}</div><div class="b2-skill-info">${focus&&focusIndex>=0?`<div class="player-kicker">${selected.includes(focus.name)?'ЗАКРЕПЛЕНО':'ПРОСМОТР'}</div><h3>${esc(focus.name)}</h3>${base?`<p><b>Описание:</b> ${esc(skillData?.text||'См. досье класса.')}</p><p><b>Механика:</b> ${esc(skillData?.mechanics||'Механика пока не определена.')}</p><p><b>Ограничение:</b> ${esc(skillData?.limits||'Не определено')}</p><p class="b2-small-status">${esc(BSTATUSES[skillData?.status]||'Описание из Core')}</p>`:`<p><b>Стиль Пути:</b> ${esc(path?.gameplay||path?.summary||'')}</p><p><b>Механика:</b> индивидуальный численный эффект навыка Пути ещё не опубликован. Он не включается в автоматический расчёт характеристик.</p>`}<button type="button" class="player-button ${selected.includes(focus.name)?'player-button--gold':'player-button--primary'}" data-action="${base?'toggle-base':'toggle-path'}" data-skill="${focusIndex}" ${!selected.includes(focus.name)&&selected.length>=limit?'disabled':''}>${selected.includes(focus.name)?'Убрать закрепление':'Закрепить навык'}</button>`:`<div class="b2-empty-selection">Выберите навык слева. <strong>Синее</strong> выделение означает просмотр, <strong>золотое</strong> — окончательный выбор.</div>`}</div></div></section>`;
}
function renderSkillStage(c,cl){if(!cl)return `<div class="b2-empty-selection">Сначала выберите класс персонажа.</div>`;
 let content=renderSkillChoice('base',c,cl);
 if(c.level>=4){
   content+=`<section class="b2-skill-region"><div class="b2-stage-head"><div><div class="player-kicker">УРОВЕНЬ 04 / ПУТЬ</div><h3>Выбор специализации</h3></div><span class="player-pill">${c.pathIndex>=0?'Путь выбран':'Не выбран'}</span></div><div class="b2-paths-grid">${cl.paths.map((n,i)=>`<button type="button" data-action="choose-path" data-path="${i}" class="b2-path ${c.pathIndex===i?'is-chosen':''}" ${i===4&&c.pathIndex!==4?'disabled title="Открывает Мастер"':''}>${i===4&&c.pathIndex!==4?'Скрытый Путь · ???':esc(n)}</button>`).join('')}</div>${c.pathIndex>=0?`<p>${esc(pathInfo(cl,c.pathIndex)?.summary||'')}</p><p class="b2-hint">Пассивная особенность Пути открывается автоматически на 4-м уровне; отдельные точные эффекты будут добавлены после публикации.</p>`:''}</section>`;
   if(c.pathIndex>=0)content+=renderSkillChoice('path',c,cl);
 }
 if(c.level>=7){content+=`<section class="b2-skill-region b2-true-class"><div class="player-kicker">УРОВЕНЬ 07 / ПЕРЕЛОМ</div><h3>Истинный класс и общая пассивная способность Пути</h3><p>На 7-м уровне открываются общий пассивный навык Пути и Истинный класс. На 8-м и 9-м выбираются его способности, а на 10-м открывается завершающая способность.</p><p>Индивидуальные ветви и механика Истинных классов ещё не полностью представлены в текущих данных THAOS. Вы можете сохранить персонажа как <strong>незавершённый черновик</strong>, но редактор не будет придумывать эти способности и считать их активными.</p></section>`}
 return content;
}
function renderAttributesV2(c){const attrs=c.attrBase||BK.initBaseAttrs(c.attributes),spent=BK.pointCost(attrs),left=8-spent;
 return `<section class="b2-skill-region"><div class="b2-stage-head"><div><div class="player-kicker">СТАРТОВЫЕ АТРИБУТЫ</div><h3>Распределение очков</h3></div><span class="player-pill ${left===0?'player-pill--green':''}">Осталось ${left} / 8</span></div><p>Каждый атрибут начинается с 1. Повышение 1→2 стоит 1 очко, 2→3 — 2, 3→4 — 3.</p><div class="b2-attr-grid">${BK.ATTRS.map(name=>{const v=attrs[name]||1;return `<div class="b2-attr"><span>${name}</span><div><button type="button" data-action="attr-down" data-attr="${esc(name)}" ${v<=1?'disabled':''}>−</button><strong>${v}</strong><button type="button" data-action="attr-up" data-attr="${esc(name)}" ${v>=4||left<v?'disabled':''}>+</button></div></div>`}).join('')}</div>${[5,7,9].filter(l=>needsAttributeIncrease(c,l)).map(l=>`<label class="b2-field">Повышение атрибута на ${l}-м уровне<select class="player-select" data-boost-level="${l}"><option value="">Выберите атрибут</option>${BK.ATTRS.map(a=>`<option value="${a}" ${c.attrBoosts?.[l]===a?'selected':''} ${BK.calculateAttrs(c.attrBase,c.attrBoosts)[a]>=6&&c.attrBoosts?.[l]!==a?'disabled':''}>${a}</option>`).join('')}</select></label>`).join('')}</section>`}
function renderGearV2(c){const cl=BK.C(c.classId);if(!cl)return `<section class="b2-skill-region"><h3>Снаряжение</h3><p>Сначала выберите класс.</p></section>`;
 const kit=kitFor(c),st=editorStats(c),gear=st.gear;
 const options=(cl.kits||[]).map(id=>BK.kit(id)).filter(Boolean);
 return `<section class="b2-skill-region"><div class="b2-stage-head"><div><div class="player-kicker">СТАРТОВОЕ СНАРЯЖЕНИЕ</div><h3>Выберите комплект</h3></div><span class="player-pill">${gear.occupied}/${gear.capacity} слотов</span></div><div class="b2-kits">${options.map(x=>`<button type="button" class="b2-kit ${c.kitId===x.id?'is-selected':''}" data-action="choose-kit" data-id="${esc(x.id)}"><b>${esc(x.label)}</b><span>${esc(x.description)}</span>${c.kitId===x.id?'<small>ВЫБРАН</small>':''}</button>`).join('')}</div>${kit?`<div class="b2-gear-columns"><div><h4>Экипировано (${gear.hands}/2 рук)</h4>${(c.equipped||[]).map((id,i)=>`<div class="b2-gear-item"><span>${esc(BK.item(id)?.name||id)}</span><button type="button" data-action="unequip-item" data-index="${i}" title="Снять предмет">Снять</button></div>`).join('')||'<p>Ничего</p>'}</div><div><h4>Инвентарь</h4>${(c.inventory||[]).map((id,i)=>{const x=BK.item(id);return `<div class="b2-gear-item"><span>${esc(x?.name||id)}</span>${x?.slot!=='inventory'?`<button type="button" data-action="equip-item" data-index="${i}">Надеть</button>`:''}</div>`}).join('')}</div></div><p class="b2-hint">Предметы можно снимать и надевать в пределах выбранного комплекта. Для другого стартового оружия выберите альтернативный комплект; бесплатная покупка любых предметов не предусмотрена.</p>`:'<p>Выберите один из двух комплектов.</p>'}${gear.errors.length?`<p class="b2-error">${gear.errors.map(esc).join(' · ')}</p>`:''}</section>`}
function renderPreviewV2(c){const r=getRace(c.raceId),cl=getClass(c.classId),st=editorStats(c),issues=BK.issues(c);let warn='';if(c.level>=7)warn='<p class="b2-warning">Уровни 7–10: Истинный класс и его навыки требуют подтверждения Мастера. Сохранение не делает персонажа полностью завершённым.</p>';
 return `<div class="b2-review"><div class="player-card player-card--glow"><div class="player-portrait-layout">${artOrPlaceholder(c.artData,'player-portrait-large')}<div><div class="player-kicker">FINAL PREVIEW / THAOS</div><h2 class="player-character-title">${esc(c.name||'Без имени')}</h2><p>${esc(r?.name||'—')} · ${esc(cl?.name||'—')} · ${c.level} уровень</p><p>${esc(cl?.paths?.[c.pathIndex]||'Путь пока не открыт')}</p><p><b>Комплект:</b> ${esc(kitName(c.kitId))}</p><p><b>Базовые навыки:</b> ${esc((c.baseSkills||[]).join(', ')||'—')}</p><p><b>Навыки Пути:</b> ${esc((c.pathSkills||[]).join(', ')||'—')}</p>${BK.autoSkills(c.classId).length?`<p><b>Автоматически:</b> ${BK.autoSkills(c.classId).map(esc).join(', ')}</p>`:''}</div></div><div class="b2-attr-summary">${Object.entries(c.attributes||{}).map(([k,v])=>`<span>${esc(k)}: <b>${v}</b></span>`).join('')}</div></div><div class="player-card"><h2>Параметры персонажа</h2><div class="player-metrics">${metric('HP',st.healthMax)}${metric('Мана',st.manaMax)}${metric('Защита',st.defense)}${metric('Скорость',st.speed+' м')}${metric('Инициатива',st.initiative)}${metric('Урон оружия',st.weaponDamage||'—')}</div><p class="b2-hint">Числа рассчитаны по тестовому математическому ядру 1.2. Условные усиления навыков Путей не подставляются без описанной механики.</p>${issues.length?`<div class="b2-error"><b>Что нужно завершить:</b><ul>${issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'<div class="b2-success">Основные поля заполнены и проверены.</div>'}${warn}</div></div>`;
}
function renderEditor(){
 const c=state.draft,cl=getClass(c.classId),r=getRace(c.raceId),st=editorStats(c);
 let body='';
 if(state.step===0)body=`<div class="player-grid player-grid--equal"><div class="player-stack">${inp('name','Имя персонажа',c.name,'text','maxlength="40" placeholder="Имя героя"')}<div class="player-field"><label for="b2-bio">История / цель</label><textarea class="player-input b2-textarea" id="b2-bio" data-field="bio" maxlength="400" rows="6" placeholder="Кто ваш герой, что он ищет в Таосе?">${esc(c.bio||'')}</textarea></div><label class="b2-upload">Загрузить портрет (PNG / JPEG / WebP, до 8 МБ)<input type="file" accept="image/png,image/jpeg,image/webp" data-upload="character"></label><p class="b2-hint">Изображение уменьшается и хранится вместе с листом персонажа в Firestore; Firebase Storage не требуется.</p>${c.artData?btn('Убрать портрет','remove-art'):''}</div><div class="b2-hero-portrait">${artOrPlaceholder(c.artData,'player-portrait-large')}</div></div>`;
 if(state.step===1)body=viewOrb(c.level);
 if(state.step===2)body=raceCards(c);
 if(state.step===3)body=classCards(c);
 if(state.step===4)body=renderSkillStage(c,cl);
 if(state.step===5)body=`<div class="b2-atts-equipment">${renderAttributesV2(c)}${renderGearV2(c)}</div><div class="b2-quick-stats">${metric('HP',st.healthMax)}${metric('Мана',st.manaMax)}${metric('Защита',st.defense)}${metric('Скорость',st.speed+' м')}</div>`;
 if(state.step===6)body=renderPreviewV2(c);
 return `<div class="player-row player-row--between player-row--wrap b2-intro"><span class="player-kicker">CHARACTER BUILDER V2 // ${state.selectedId?'РЕДАКТИРОВАНИЕ':'НОВЫЙ ГЕРОЙ'}</span>${btn('Отменить','cancel-editor')}</div>${editorNav()}<div class="b2-stage b2-enter-${state.step}">${body}</div><div class="b2-navigation">${btn('← Назад','prev-step','',state.step===0?'disabled':'')}<div class="b2-mini-stats">${st.healthMax} HP · ${st.manaMax} MP · ${st.defense} Защита · ${st.speed} м</div>${state.step===6?btn('Сохранить персонажа?','save-character','player-button--primary',BK.issues(c).length?'disabled title="Завершите обязательные поля"':''):btn('Продолжить →','next-step','player-button--primary')}</div>`;
}

function renderGroup(){const party=state.party,pending=state.settings.pendingPartyId;
 if(!party){if(pending)return card('Заявка отправлена',`<span class="player-pill player-pill--gold">${state.request?.status==='approved'?'Одобрена':state.request?.status==='rejected'?'Отклонена':'Ожидание ответа'}</span><p>Вы запросили вступление в группу <b>${esc(pending)}</b>. Лидер увидит заявку и сможет принять её. Статус обновляется автоматически.</p>${btn('Отменить заявку','cancel-join','player-button--danger')}`);
 return `<div class="player-grid"><article class="player-card player-card--glow"><span class="player-kicker">PARTY CREATOR</span><h2>Создать группу</h2><p>Станьте лидером, задайте название, описание и герб. Другие игроки смогут присоединиться по ID после вашего подтверждения.</p><div class="player-stack">${inp('groupName','Название группы',state.groupDraftName,'text','maxlength="50" placeholder="Серебряные волки"')}<div class="player-field"><label>Описание группы</label><textarea class="player-textarea" id="groupDescription" maxlength="500" placeholder="Кто вы и чем занимаетесь?">${esc(state.groupDraftDescription)}</textarea></div><label class="player-artdrop" for="groupArtInput"><span>◇</span><b>Загрузить эмблему группы</b><span class="player-image-hint">PNG / JPG / WebP; уменьшенный арт</span><input type="file" id="groupArtInput" accept="image/png,image/jpeg,image/webp" data-upload="group"></label>${state.groupArt?`<img class="player-avatar" src="${safeArt(state.groupArt)}" alt="Эмблема">`:''}${btn('Создать группу','create-party','player-button--primary')}</div></article>
 <article class="player-card"><span class="player-kicker">PARTY INVITATION</span><h2>Вступить в группу</h2><p>Попросите у лидера ID группы. После отправки заявки лидер должен подтвердить ваше вступление.</p>${inp('partyCode','ID группы',state.partyJoinCode,'text','maxlength="20" placeholder="TH-XXXXXX"')}<div style="margin-top:17px">${btn('Отправить заявку','join-party','player-button--primary')}</div><div class="player-rule"></div><p class="player-small">Один аккаунт может состоять в одной активной группе в рамках Player V1. Знание ID не даёт прав управления группой.</p></article></div>`;}
 const leader=isLeader(),current=activeChar(),loc=getZone(party.regionId);const roster=state.roster;const rank=roster.length?Math.max(1,Math.round(roster.reduce((a,b)=>a+(b.level||1),0)/roster.length)):1;
 return `<div class="player-card player-card--glow"><div class="player-row player-row--between player-row--wrap">${safeArt(party.emblemData)?`<img class="player-avatar" src="${safeArt(party.emblemData)}" alt="Эмблема группы">`:''}<div style="flex:1;min-width:200px"><span class="player-kicker">${leader?'PARTY LEADER':'PARTY MEMBER'}</span><h2 style="margin:0 0 9px">${esc(party.name)}</h2><p>${esc(party.description||'Описание группы ещё не добавлено.')}</p><span class="player-pill player-pill--gold">Ранг ${rank}</span> <span class="player-pill">Участников ${party.memberIds?.length||1} / 6</span></div><div class="player-stack" style="min-width:160px"><span class="player-label">ID ГРУППЫ</span><b style="font-size:20px;letter-spacing:.09em">${esc(party.id)}</b>${btn('Скопировать ID','copy-party')}</div></div><div class="player-rule"></div><div class="player-row player-row--between player-row--wrap"><p style="margin:0">Текущий регион: <b>${esc(loc?.name||'Не выбран')}</b></p>${leader?`<span class="player-pill player-pill--green">Можно менять местоположение через карту</span>`:btn('Покинуть группу','leave-party','player-button--danger')}</div></div>
 <div class="player-grid" style="margin-top:20px"><article class="player-card"><div class="player-section-title"><h2>Участники</h2>${btn('Обновить состояние','sync-roster')}</div>${(party.memberIds||[]).map(uid=>{const r=roster.find(x=>x.uid===uid),known=r?.characterName||'Игрок ещё не выбрал персонажа',isMe=uid===state.user.uid;const h=Math.max(0,Math.min(100,(r?.healthMax?100*r.health/r.healthMax:0))),m=Math.max(0,Math.min(100,(r?.manaMax?100*r.mana/r.manaMax:0)));return `<div class="player-roster-row" style="margin-bottom:10px"><div class="player-row player-row--between"><b>${esc(known)} ${isMe?'· Вы':''}</b><span class="player-pill">${esc(r?.className||'—')} · ур. ${r?.level||'—'}</span></div><div class="player-row player-row--between"><span class="player-small">Здоровье ${r?.health??'—'} / ${r?.healthMax??'—'}</span><span class="player-small">${Math.round(h)}%</span></div><div class="player-healthbar"><i style="width:${h}%"></i></div><div class="player-row player-row--between"><span class="player-small">Мана ${r?.mana??'—'} / ${r?.manaMax??'—'}</span></div><div class="player-healthbar player-healthbar--mana"><i style="width:${m}%"></i></div></div>`}).join('')}${current?`<p class="player-small">Выбранный герой: ${esc(current.name)}. Характеристики обновятся при сохранении персонажа.</p>`:''}</article>
 <article class="player-card"><h2>Управление группой</h2>${leader?`<p>Лидер может одобрять заявки и менять описание группы.</p><div class="player-stack">${inp('groupEditName','Название',party.name,'text','maxlength="50"')}<div class="player-field"><label>Описание</label><textarea class="player-textarea" id="groupEditDescription" maxlength="500">${esc(party.description||'')}</textarea></div>${btn('Сохранить изменения','edit-party','player-button--primary')}</div><div class="player-rule"></div><h3>Заявки игроков</h3>${state.requests.filter(x=>x.status==='pending').length?state.requests.filter(x=>x.status==='pending').map(x=>`<div class="player-roster-row" style="margin-top:10px"><div class="player-row player-row--between player-row--wrap"><b>${esc(x.displayName||'Путник')}</b><span class="player-small">${esc(x.uid.slice(0,10))}…</span></div><div class="player-row">${btn('Принять','approve-request','player-button--primary',`data-id="${esc(x.uid)}"`)}${btn('Отклонить','reject-request','player-button--danger',`data-id="${esc(x.uid)}"`)}</div></div>`).join(''):'<p class="player-muted">Новых заявок нет.</p>'}`:`<p>Вы состоите в группе. Лидер принимает заявки новых игроков и отмечает расположение отряда на карте.</p><p class="player-small">Для изменения собственного здоровья или маны перейдите в редактор активного персонажа.</p>`}</article></div>`}
function renderMap(){const party=state.party,leader=isLeader(),chosen=getZone(state.mapSelected)||getZone(party?.regionId)||Z[0];const plotted=Z.filter(z=>Number.isInteger(z.mapNumber));return `<div class="player-grid"><article class="player-card"><div class="player-section-title"><div><span class="player-kicker">TAOS // ATLAS</span><h2>Путешествие группы</h2></div><span class="player-pill">${plotted.length} точек</span></div><div class="player-map-frame"><div class="player-map-stage"><img src="./assets/world/taos-map.svg" alt="Карта мира Таос">${plotted.map(z=>`<button class="player-map-pin ${chosen?.id===z.id?'is-active':''}" type="button" data-action="select-zone" data-zone="${esc(z.id)}" style="--x:${z.pos[0]}%;--y:${z.pos[1]}%" title="${esc(z.name)}" aria-label="${esc(z.name)}"></button>`).join('')}${getZone(party?.regionId)?`<div class="player-map-current" style="--x:${getZone(party.regionId).pos[0]}%;--y:${getZone(party.regionId).pos[1]}%"></div>`:''}</div></div><div class="player-map-caption">Золотой маркер — последнее сохранённое местоположение группы. Круги — кликабельные регионы.</div></article>
 <article class="player-card"><span class="player-kicker">LOCATION // ${chosen?.mapNumber||'—'}</span><h2>${esc(chosen?.name||'Не выбрана')}</h2><p>${esc(chosen?.short||'Укажите область на карте.')}</p><div class="player-rule"></div><p><b>Опасность:</b> ${esc(chosen?.danger||'—')}<br><b>Текущая точка группы:</b> ${esc(getZone(party?.regionId)?.name||'Не назначена')}</p>${party&&leader?`<div class="player-field" style="margin-bottom:15px"><label>Заметка о маршруте</label><textarea class="player-textarea" id="partyMapNote" maxlength="350" placeholder="Где вы остановились?">${esc(state.mapNoteDraft??party.note??'')}</textarea></div>${btn('Сохранить позицию отряда','save-location','player-button--primary',chosen?`data-zone="${esc(chosen.id)}"`:'disabled')}`:party?'<p class="player-muted">Местоположение может изменять только лидер группы.</p>':'<p class="player-muted">Создайте группу или вступите в неё, чтобы сохранять местоположение.</p>'}<div class="player-rule"></div><a class="player-button" href="./world.html">Открыть полный атлас ↗</a><p class="player-small">Лорные и скрытые отметки ГМа появятся в следующем этапе. Здесь сохраняется только открытая точка группы.</p></article></div>`}
function renderTools(){const tools=[{symbol:'♜',title:'Онлайн-торговля',subtitle:'Покупка и продажа',text:'Мастер сможет открыть магазин, задать ассортимент и цены. Покупка будет изменять инвентарь после проверки.'},{symbol:'⚒',title:'Улучшение снаряжения',subtitle:'Кузница и модификации',text:'Предмет, материалы, редкость, стоимость и результат улучшения будут фиксироваться в истории персонажа.'},{symbol:'◇',title:'Сундуки',subtitle:'Добыча и редкие находки',text:'Мастер выдаст доступ к сундуку, а система проведёт открытие по утверждённой таблице наград.'}];return `<div class="player-grid--triple player-grid">${tools.map(t=>`<article class="player-card player-tool"><div><div class="player-tool__icon">${t.symbol}</div><span class="player-kicker">TOOLS // GM CONTROLLED</span><h2>${t.title}</h2><p>${t.text}</p></div><div class="player-stack"><span class="player-tool__status">Доступен после разрешения Мастера</span>${btn(t.subtitle,'locked-tool','', 'disabled')}</div></article>`).join('')}</div>${card('Как это будет работать',`<p>Эти три инструмента намеренно пока не совершают реальные операции с деньгами и предметами. Для запуска потребуются каталог, проверка ресурсов, журнал транзакций и подтверждение Мастера на серверной стороне. Интерфейс здесь уже подготовлен.</p><a class="player-button" href="./core-gear.html">Изучить правила предметов ↗</a>`)}`}
function renderDashboard(){const c=activeChar(),party=state.party;const name=state.user?.displayName||state.user?.email?.split('@')[0]||'Странник';return `<div class="player-grid"><article class="player-card player-card--glow"><span class="player-kicker">WELCOME BACK // ${esc(name)}</span><h2>Ваш путь продолжается</h2>${c?`<div class="player-row" style="margin:22px 0">${safeArt(c.artData)?`<img class="player-avatar" src="${safeArt(c.artData)}" alt="">`:''}<div><h3 style="margin:0 0 8px">${esc(c.name)}</h3><p style="margin:0">${esc(getClass(c.classId)?.name||'Класс')} · уровень ${c.level}</p></div></div><div class="player-metrics">${metric('Здоровье',`${c.health||0}/${c.healthMax||0}`)}${metric('Мана',`${c.mana??5}/${c.manaMax??5}`)}${metric('Скорость',c.speed||'—')}${metric('Защита',c.defense||'—')}</div>`:'<p>Пока нет активного персонажа. Создайте героя, выберите навыки и начните свою историю.</p>'}<div class="player-row player-row--wrap" style="margin-top:20px"><a class="player-button player-button--primary" href="#characters">${c?'Мои персонажи':'Создать персонажа'} →</a><a class="player-button" href="#group">Открыть группу</a></div></article>
 <article class="player-card"><span class="player-kicker">PARTY // STATUS</span><h2>${esc(party?.name||'Отряд не сформирован')}</h2><p>${party?`Участников: ${party.memberIds?.length||0}.<br>Последняя точка: ${esc(getZone(party.regionId)?.name||'Не указана')}.`:'Создайте группу или отправьте заявку на вступление по её идентификатору.'}</p><div class="player-row player-row--wrap"><a class="player-button" href="#group">Группа →</a><a class="player-button" href="#map">Карта →</a></div><div class="player-rule"></div><h3>Последняя информация</h3><p class="player-small">Системные новости и анонсы появятся здесь после публикации в Firestore.</p></article></div>
 <div class="player-grid" style="margin-top:20px"><article class="player-card"><span class="player-kicker">SYSTEM FEED</span><h2>Новости THAOS</h2>${state.announcements.length?state.announcements.map(x=>`<article class="player-news-item"><span class="player-small">${esc(fdate(x.publishedAt))}</span><h3>${esc(x.title)}</h3><p>${esc(x.body||'')}</p></article>`).join(''):'<p>Пока нет опубликованных объявлений. Когда появятся обновления, они отобразятся здесь автоматически.</p>'}</article>
 <article class="player-card"><span class="player-kicker">UPDATE SUBSCRIPTION</span><h2>Обновления проекта</h2><p>Можно добровольно сохранить согласие получать новости THAOS на адрес аккаунта. Пока письма не рассылаются: для отправки потребуется отдельный сервис с защищённым серверным ключом. Новости в панели доступны независимо от подписки.</p><label class="player-checkline"><input type="checkbox" id="newsletterOptIn" ${state.newsletter?'checked':''}><span>Я хочу получать анонсы обновлений THAOS по электронной почте.</span></label><div style="margin-top:18px">${btn('Сохранить настройку','save-newsletter','player-button--primary')}</div><p class="player-small">Настройку можно отключить в любое время. Адрес: ${esc(state.user?.email||'—')}. Для настоящей рассылки потребуется также сервис доставки писем и политика конфиденциальности.</p></article></div>`}
function charFromDoc(id,data){return {...defaults(),...data,id,attributes:{...defaults().attributes,...data.attributes}}}
function resetUnsubs(items){items.splice(0).forEach(fn=>{try{fn()}catch{}})}
function updatePartyWatch(){const {client,user}=state;if(!client||!user)return;resetUnsubs(state.partyUnsubs);state.party=null;state.roster=[];state.requests=[];state.request=null;const F=client.firestoreSdk,db=client.db;
 const pending=state.settings.pendingPartyId,groupId=state.settings.partyId;
 if(groupId){state.partyUnsubs.push(F.onSnapshot(F.doc(db,'parties',groupId),snap=>{if(!snap.exists()){state.party=null;render();notice('Группа не найдена. Проверьте разрешения или свяжитесь с лидером.','warning');return;}const newParty={id:snap.id,...snap.data()};const oldKey=state.party?.id+':'+state.party?.leaderId;state.party=newParty;if(oldKey!==newParty.id+':'+newParty.leaderId){attachPartySubcollections(newParty.id)}render();if(activeChar())syncRoster(false).catch(()=>{});},err=>{state.party=null;render();report(err,'Открытие группы')}));}
 if(pending&&!groupId){state.partyUnsubs.push(F.onSnapshot(F.doc(db,'parties',pending,'requests',user.uid),async snap=>{state.request=snap.exists()?snap.data():null;if(state.request?.status==='approved'){try{await F.setDoc(F.doc(db,'users',user.uid,'settings','playerState'),{partyId:pending,pendingPartyId:null},{merge:true})}catch(e){report(e,'Принятие группы')}}else render();},err=>report(err,'Проверка заявки')));}
}
function attachPartySubcollections(id){const F=state.client.firestoreSdk,db=state.client.db;while(state.partyUnsubs.length>1){const fn=state.partyUnsubs.pop();try{fn()}catch{}}
 state.partyUnsubs.push(F.onSnapshot(F.collection(db,'parties',id,'roster'),snap=>{state.roster=snap.docs.map(x=>({uid:x.id,...x.data()}));if(['group','dashboard'].includes(view()))render()},err=>report(err,'Список участников')));
 if(isLeader())state.partyUnsubs.push(F.onSnapshot(F.collection(db,'parties',id,'requests'),snap=>{state.requests=snap.docs.map(x=>({uid:x.id,...x.data()}));if(view()==='group')render()},err=>report(err,'Заявки группы')));
}
async function syncRoster(alert=true){const {client,user,party}=state;if(!client||!user||!party||!party.memberIds?.includes(user.uid))return;const c=activeChar(),F=client.firestoreSdk;const roster={uid:user.uid,characterId:c?.id||'',characterName:c?.name||user.displayName||'Без персонажа',className:getClass(c?.classId)?.name||'',level:c?.level||1,health:c?.health||0,healthMax:c?.healthMax||0,mana:c?.mana??5,manaMax:c?.manaMax??5,status:'В строю',updatedAt:F.serverTimestamp()};await F.setDoc(F.doc(client.db,'parties',party.id,'roster',user.uid),roster);if(alert)toast('Статус группы обновлён')}
async function boot(){if(document.body.dataset.builderDemo==='true'){state.user={uid:'demo',displayName:'Демо без Firebase'};$('playerRailStatus').textContent='Локальный деморежим';$('playerIdentity').textContent='ДЕМО';$('playerAuthGate').hidden=true;main.hidden=false;state.editor=true;state.draft=freshDraft();state.step=0;render();return;}if(!firebaseIsConfigured){$('playerRailStatus').textContent='Нужна настройка Firebase';notice('Firebase не настроен. Проверь js/firebase-config.js','warning');return}
 try{state.client=await getFirebaseClient();const {auth,authSdk}=state.client;authSdk.onAuthStateChanged(auth,async user=>{resetUnsubs(state.unsubs);resetUnsubs(state.partyUnsubs);state.user=user;state.party=null;state.roster=[];state.characters=[];state.settings={activeCharacterId:null,partyId:null,pendingPartyId:null};if(!user){$('playerRailStatus').textContent='Нужен вход';$('playerIdentity').textContent='Гость';$('playerAuthGate').hidden=false;main.hidden=true;updateNav();return;}$('playerAuthGate').hidden=true;$('playerIdentity').textContent=user.displayName||user.email||'Игрок';$('playerRailStatus').textContent='Соединение с THAOS';subscribeUser();render()});}catch(e){$('playerRailStatus').textContent='Нет соединения';report(e,'Подключение Firebase')}}
function subscribeUser(){const {client,user}=state,F=client.firestoreSdk,db=client.db;
 state.unsubs.push(F.onSnapshot(F.collection(db,'users',user.uid,'characters'),snap=>{state.characters=snap.docs.map(d=>charFromDoc(d.id,d.data())).sort((a,b)=>{const at=a.createdAt?.seconds||0,bt=b.createdAt?.seconds||0;return bt-at});$('playerRailStatus').textContent='Синхронизация включена';render();},e=>report(e,'Загрузка персонажей')));
 state.unsubs.push(F.onSnapshot(F.doc(db,'users',user.uid,'settings','playerState'),snap=>{const prev=JSON.stringify([state.settings.partyId,state.settings.pendingPartyId]);state.settings={activeCharacterId:null,partyId:null,pendingPartyId:null,...(snap.exists()?snap.data():{})};if(prev!==JSON.stringify([state.settings.partyId,state.settings.pendingPartyId]))updatePartyWatch();render()},e=>report(e,'Настройки игрока')));
 state.unsubs.push(F.onSnapshot(F.doc(db,'users',user.uid,'settings','notifications'),snap=>{state.newsletter=Boolean(snap.exists()&&snap.data().emailOptIn);if(view()==='dashboard')render()},e=>report(e,'Настройки обновлений')));
 const announcements=F.query(F.collection(db,'announcements'),F.where('published','==',true),F.limit(10));state.unsubs.push(F.onSnapshot(announcements,snap=>{state.announcements=snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(b.publishedAt?.seconds||0)-(a.publishedAt?.seconds||0));if(view()==='dashboard')render()},e=>{console.warn('Announcements unavailable:',e.code)}));
}
function freshDraft(existing=null){
  const c=existing?charFromDoc(existing.id,existing):defaults();
  const granted=BR?.getFreeSkill(c.classId);
  if(granted)c.baseSkills=(c.baseSkills||[]).filter(n=>n!==granted);
  const history=existing?.progression?.levelHistory||[];
  c.attrBoosts=Object.fromEntries(history.filter(x=>x.type==='attribute'&&[5,7,9].includes(x.level)).map(x=>[String(x.level),x.attribute]));
  const attrs={...defaults().attributes,...(existing?.attributes||{})};
  for(const a of Object.values(c.attrBoosts))if(BK.ATTRS.includes(a))attrs[a]=Math.max(1,(attrs[a]||1)-1);
  c.attrBase=BK.initBaseAttrs(attrs);
  c.attributes=BK.calculateAttrs(c.attrBase,c.attrBoosts);
  c.kitId=history.find(x=>x.type==='starterKit')?.kitId||'';
  c.raceChoice=history.find(x=>x.type==='raceChoice')?.choice||'Огонь';
  if(existing&&!c.kitId){
    const options=BK.C(c.classId)?.kits||[];
    c.kitId=options.find(id=>{
      const x=BK.kit(id);return JSON.stringify(x?.equipped||[])===JSON.stringify(c.equipped||[])&&JSON.stringify(x?.inventory||[])===JSON.stringify(c.inventory||[]);
    })||'';
  }
  c._preapprovedHidden=!!(existing&&existing.pathIndex===4);
  c._legacyItems=!!(existing && (!c.kitId || (c.equipped||[]).some(x=>typeof x!=='string') || (c.inventory||[]).some(x=>typeof x!=='string')));
  c._isNew=!existing;
  c.createdAt=undefined;c.updatedAt=undefined;
  return c;
}
function beginEditor(character=null,step=0){
  state.editor=true;state.draft=freshDraft(character);state.step=step;state.skillFocus=null;
  state.selectedId=character?.id||null;location.hash='#characters';render();window.scrollTo({top:0,behavior:'smooth'});
  if(state.draft._legacyItems)notice('Старое снаряжение сохранено. Выбор комплекта V2 заменит его; перед переходом можно скачать прежний JSON-лист.','warning');
}
function previewSkill(type,index){
  const c=state.draft,cl=getClass(c.classId);if(!cl)return;
  const options=type==='base'?choiceSkills(cl):(pathInfo(cl,c.pathIndex)?.skills||[]);
  const name=options[index];if(!name)return;state.skillFocus={type,name};render();
}
function chooseSkill(type,index){
  const c=state.draft,cl=getClass(c.classId);if(!cl)return;
  const arr=type==='base'?c.baseSkills:c.pathSkills;
  const options=type==='base'?choiceSkills(cl):pathInfo(cl,c.pathIndex)?.skills||[];
  const limit=type==='base'?skillsAt(c.level):pathAt(c.level),name=options[index];if(!name)return;
  state.skillFocus={type,name};
  if(arr.includes(name))arr.splice(arr.indexOf(name),1);
  else if(arr.length<limit)arr.push(name);
  render();
}
function selectPath(index){
  const c=state.draft,cl=getClass(c.classId);
  if(!cl||c.level<4||index<0||index>=cl.paths.length||(index===4&&c.pathIndex!==4))return;
  if(c.pathIndex!==index)c.pathSkills=[];c.pathIndex=index;state.skillFocus=null;render();
}
function changeLevel(value){
  const c=state.draft;
  c.level=Math.max(1,Math.min(10,Math.trunc(Number(value)||1)));
  c.baseSkills=c.baseSkills.slice(0,skillsAt(c.level));
  if(c.level<4){c.pathIndex=-1;c.pathSkills=[]}
  else c.pathSkills=c.pathSkills.slice(0,pathAt(c.level));
  for(const l of [5,7,9])if(c.level<l)delete c.attrBoosts[String(l)];
  syncAttrs(c);state.skillFocus=null;render();
}
function goEditorStep(next){
  const step=Math.max(0,Math.min(6,next));
  if(state.step===2&&step===3){
    const stage=main.querySelector('.b2-stage');
    if(stage){stage.classList.add('b2-leaving-race');setTimeout(()=>{state.step=step;render();},190);return;}
  }
  state.step=step;render();
}
function validateDraft(){
  const c=state.draft;
  const issues=BK.issues(c);
  if(issues.length)return issues[0];
  if(safeArt(c.artData)!==c.artData)return 'Арт слишком большой или имеет неподдерживаемый формат.';
  return '';
}
function equipmentSlots(c){
  const slots={mainHand:'',offHand:'',armor:'',accessory1:'',accessory2:'',special:''};
  for(const id of c.equipped||[]){
    const item=BK.item(id);if(!item)continue;
    if(item.slot==='body')slots.armor=id;
    else if(item.slot==='hands'){
      if(item.hands===2){slots.mainHand=id;slots.offHand=id;}
      else if(item.hands===1){if(!slots.mainHand)slots.mainHand=id;else slots.offHand=id;}
    }else if(!slots.accessory1)slots.accessory1=id;
    else if(!slots.accessory2)slots.accessory2=id;
    else slots.special=id;
  }
  return slots;
}
async function saveCharacter(){
  const err=validateDraft();if(err){notice(err,'warning');return}
  const c=state.draft;syncAttrs(c);
  const st=editorStats(c),maxHP=st.healthMax,maxMP=st.manaMax;
  const initial=c._isNew;
  const hp=initial?maxHP:Math.min(Math.max(0,Number(c.health)||0),maxHP);
  const mp=initial?maxMP:Math.min(Math.max(0,Number(c.mana)||0),maxMP);
  const history=[{type:'starterKit',kitId:c.kitId},...Object.entries(c.attrBoosts||{}).filter(([level])=>c.level>=Number(level)).map(([level,attribute])=>({type:'attribute',level:Number(level),attribute}))];
  if(c.raceId==='dragonborn')history.push({type:'raceChoice',choice:c.raceChoice||'Огонь'});
  const progression={pathId:c.pathIndex>=0?`${c.classId}-${c.pathIndex}`:'',breakthroughCompleted:!!(c.progression?.breakthroughCompleted&&c.progression?.trueClassId),trueClassId:c.progression?.trueClassId||'',trueClassSkills:Array.isArray(c.progression?.trueClassSkills)?c.progression.trueClassSkills:[],levelHistory:history};
  if(c.level<7){progression.breakthroughCompleted=false;progression.trueClassId='';progression.trueClassSkills=[];}
  const payload={schemaVersion:2,rulesetVersion:'core-math-1.2',name:c.name.trim(),bio:(c.bio||'').trim().slice(0,400),raceId:c.raceId,classId:c.classId,level:c.level,
    attributes:{...c.attributes},baseSkills:[...c.baseSkills],pathIndex:c.pathIndex,pathSkills:[...c.pathSkills],
    health:hp,healthMax:maxHP,mana:mp,manaMax:maxMP,speed:st.speed,defense:st.defense,artData:c.artData||'',
    inventory:[...c.inventory],equipped:[...c.equipped],
    appearance:{goal:(c.bio||'').slice(0,400),notes:'',portraitAssetPath:''},progression,
    derivedStats:{mode:'partial',formulaVersion:'core-math-1.2',carryWeight:0,carryCapacity:st.gear.capacity,initiative:st.initiative},
    wallet:{coins:Math.max(0,Math.trunc(Number(c.wallet?.coins)||0)),other:c.wallet?.other||{}},equipmentSlots:equipmentSlots(c)
  };
  if(document.body.dataset.builderDemo==='true'){
    const id=state.selectedId||'DEMO-'+Date.now();const doc={...payload,id,ownerId:'demo'};
    state.characters=[doc,...state.characters.filter(x=>x.id!==id)];state.draft=null;state.editor=false;state.selectedId=id;
    downloadFile(`THAOS-${id}.json`,JSON.stringify(doc,null,2),'application/json;charset=utf-8');render();toast('Демо-персонаж сохранён в JSON. В Firebase ничего не отправлено.');return;
  }
  if(!state.client||!state.user){notice('Войдите в THAOS, чтобы сохранить персонажа.','warning');return}
  const F=state.client.firestoreSdk,db=state.client.db,uid=state.user.uid;
  const id=state.selectedId||F.doc(F.collection(db,'users',uid,'characters')).id;
  payload.ownerId=uid;payload.updatedAt=F.serverTimestamp();if(!state.selectedId)payload.createdAt=F.serverTimestamp();
  toggleBusy(true);
  try{
    await F.setDoc(F.doc(db,'users',uid,'characters',id),payload,{merge:true});
    if(!state.settings.activeCharacterId)await F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{activeCharacterId:id},{merge:true});
    state.editor=false;state.draft=null;state.selectedId=id;render();toast('Персонаж V2 сохранён в Firestore');
    if(state.party)await syncRoster(false);
  }catch(e){report(e,'Сохранение персонажа V2')}finally{toggleBusy(false)}
}
function clickAction(e){const hit=e.target.closest('[data-action]');if(!hit||hit.disabled)return;const action=hit.dataset.action;const id=hit.dataset.id;const F=state.client?.firestoreSdk;const db=state.client?.db;const uid=state.user?.uid;if(!uid)return;
 switch(action){
 case 'new-character':if(state.characters.length>=8){notice('В этой версии доступно 8 персонажей.','warning');return}beginEditor();break;
 case 'open-character':state.selectedId=id;state.editor=false;render();break;
 case 'back-characters':state.selectedId=null;state.editor=false;render();break;
 case 'edit-character':beginEditor(state.characters.find(x=>x.id===id));break;
 case 'level-up':beginEditor(state.characters.find(x=>x.id===id),1);toast('Повысьте уровень и выберите новые навыки');break;
 case 'cancel-editor':state.editor=false;state.draft=null;render();break;
 case 'edit-step':goEditorStep(Number(hit.dataset.step));break;
 case 'prev-step':goEditorStep(state.step-1);break;
 case 'next-step':if(state.step===0&&!state.draft.name.trim()){notice('Сначала укажите имя персонажа.','warning');return}goEditorStep(state.step+1);break;
 case 'preview-base':previewSkill('base',Number(hit.dataset.skill));break;
 case 'preview-path':previewSkill('path',Number(hit.dataset.skill));break;
 case 'toggle-base':chooseSkill('base',Number(hit.dataset.skill));break;
 case 'toggle-path':chooseSkill('path',Number(hit.dataset.skill));break;
 case 'choose-path':selectPath(Number(hit.dataset.path));break;
 case 'attr-up':case 'attr-down':{const key=hit.dataset.attr,a=state.draft.attrBase,delta=action==='attr-up'?1:-1,next=a[key]+delta;if(next<1||next>4)return;if(delta>0&&BK.pointCost(a)+a[key]>8)return;a[key]=next;syncAttrs(state.draft);render();break}

 case 'level-minus':changeLevel(state.draft.level-1);break;
 case 'level-plus':changeLevel(state.draft.level+1);break;
 case 'level-direct':changeLevel(Number(hit.dataset.level));break;
 case 'level-orbit':changeLevel(hit.dataset.orbit==='earth'?Math.min(5,state.draft.level):Math.max(6,state.draft.level));break;
 case 'pick-race':{
   if(!getRace(id))return;
   state.draft.raceId=id;state.draft.raceChoice='Огонь';render();break;
 }
 case 'pick-class':{
   const cl=getClass(id);if(!cl)return;
   if(state.draft.classId!==id){state.draft.classId=id;state.draft.baseSkills=[];state.draft.pathIndex=-1;state.draft.pathSkills=[];state.draft.kitId=BK.starterKit(id);const kit=BK.makeGear(state.draft.kitId);state.draft.equipped=kit.equipped;state.draft.inventory=kit.inventory;state.skillFocus=null;}
   render();break;
 }
 case 'choose-kit':{
   const chosen=BK.kit(id);if(!chosen||chosen.classId!==state.draft.classId)return;
   if(state.draft._legacyItems&&!confirm('Комплект заменит прежнее снаряжение персонажа. Сначала сохраните JSON-копию старого листа. Продолжить?'))return;
   state.draft.kitId=id;const gear=BK.makeGear(id);state.draft.equipped=gear.equipped;state.draft.inventory=gear.inventory;state.draft._legacyItems=false;render();break;
 }
 case 'unequip-item':{
   const c=state.draft,i=Number(hit.dataset.index);if(!Number.isInteger(i)||i<0||i>=c.equipped.length)return;
   const value=c.equipped.splice(i,1)[0];c.inventory.push(value);render();break;
 }
 case 'equip-item':{
   const c=state.draft,i=Number(hit.dataset.index);if(!Number.isInteger(i)||i<0||i>=c.inventory.length)return;
   const value=c.inventory.splice(i,1)[0];c.equipped.push(value);
   if(BK.checkGear(c.equipped,c.inventory).errors.length){c.equipped.pop();c.inventory.splice(i,0,value);notice('Нельзя надеть предмет: заняты руки, слот или превышен лимит.','warning');}
   render();break;
 }
 case 'remove-art':state.draft.artData='';render();break;
 case 'save-character':saveCharacter();break;
 case 'activate-character':F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{activeCharacterId:id},{merge:true}).then(()=>{toast('Активный персонаж изменён');if(state.party)syncRoster().catch(()=>{})}).catch(e=>report(e,'Выбор персонажа'));break;
 case 'delete-character':{const c=state.characters.find(x=>x.id===id);if(!c||!confirm(`Удалить персонажа «${c.name}»? Действие необратимо.`))return;F.deleteDoc(F.doc(db,'users',uid,'characters',id)).then(async()=>{if(state.settings.activeCharacterId===id)await F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{activeCharacterId:null},{merge:true});state.selectedId=null;render();toast('Персонаж удалён')}).catch(e=>report(e,'Удаление персонажа'));break}
 case 'export-sheet':case 'download-json':case 'download-html':{const c=state.characters.find(x=>x.id===id);if(c)exportCharacter(c,action);break}
 case 'create-party':createParty();break;
 case 'join-party':joinParty();break;
 case 'cancel-join':cancelJoin();break;
 case 'copy-party':navigator.clipboard?.writeText(state.party.id).then(()=>toast('ID группы скопирован')).catch(()=>prompt('Скопируйте ID:',state.party.id))||prompt('Скопируйте ID:',state.party.id);break;
 case 'approve-request':respondRequest(id,true);break;
 case 'reject-request':respondRequest(id,false);break;
 case 'edit-party':editParty();break;
 case 'leave-party':leaveParty();break;
 case 'sync-roster':syncRoster().catch(e=>report(e,'Состояние группы'));break;
 case 'select-zone':state.mapSelected=hit.dataset.zone;render();break;
 case 'save-location':saveLocation();break;
 case 'save-newsletter':saveNewsletter();break;
 default:break;
 }
}
function genCode(){const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return 'TH-'+Array.from(bytes,b=>alphabet[b%alphabet.length]).join('')}
async function createParty(){if(state.settings.partyId||state.settings.pendingPartyId)return;const name=$('field-groupName')?.value.trim(),description=$('groupDescription')?.value.trim()||'';if(!name||name.length<3||name.length>50){notice('Введите название от 3 до 50 символов.','warning');return}const {db,firestoreSdk:F}=state.client,uid=state.user.uid,id=genCode();toggleBusy(true);try{await F.setDoc(F.doc(db,'parties',id),{leaderId:uid,name,description:description.slice(0,500),emblemData:state.groupArt||'',memberIds:[uid],regionId:'',note:'',createdAt:F.serverTimestamp(),updatedAt:F.serverTimestamp()});await F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{partyId:id,pendingPartyId:null},{merge:true});toast('Группа создана');state.groupArt='';state.groupDraftName='';state.groupDraftDescription=''}catch(e){report(e,'Создание группы')}finally{toggleBusy(false)}}
async function joinParty(){const code=$('field-partyCode')?.value.trim().toUpperCase();if(!/^TH-[A-Z2-9]{6}$/.test(code||'')){notice('Введите ID формата TH-XXXXXX.','warning');return}const {db,firestoreSdk:F}=state.client,uid=state.user.uid;toggleBusy(true);try{await F.setDoc(F.doc(db,'parties',code,'requests',uid),{uid,displayName:(state.user.displayName||'Путник').slice(0,32),status:'pending',createdAt:F.serverTimestamp()});await F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{pendingPartyId:code,partyId:null},{merge:true});toast('Заявка отправлена лидеру');state.partyJoinCode=''}catch(e){report(e,'Заявка на вступление (проверь ID группы)')}finally{toggleBusy(false)}}
async function cancelJoin(){if(!state.settings.pendingPartyId)return;const {db,firestoreSdk:F}=state.client,uid=state.user.uid,id=state.settings.pendingPartyId;try{await F.deleteDoc(F.doc(db,'parties',id,'requests',uid));await F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{pendingPartyId:null},{merge:true});toast('Заявка отменена')}catch(e){report(e,'Отмена заявки')}}
async function respondRequest(uid,approved){if(!isLeader())return;const {db,firestoreSdk:F}=state.client,id=state.party.id,r=state.requests.find(x=>x.uid===uid);if(!r||r.status!=='pending')return;if(approved&&(state.party.memberIds||[]).length>=6){notice('В первой версии группа рассчитана максимум на 6 участников.','warning');return}try{if(approved)await F.updateDoc(F.doc(db,'parties',id),{memberIds:F.arrayUnion(uid),updatedAt:F.serverTimestamp()});await F.updateDoc(F.doc(db,'parties',id,'requests',uid),{status:approved?'approved':'rejected',respondedAt:F.serverTimestamp()});toast(approved?'Игрок принят в группу':'Заявка отклонена')}catch(e){report(e,'Ответ на заявку')}}
async function editParty(){if(!isLeader())return;const name=$('field-groupEditName')?.value.trim(),description=$('groupEditDescription')?.value.trim()||'';if(!name||name.length<3||name.length>50){notice('Название должно содержать от 3 до 50 символов.','warning');return}const {db,firestoreSdk:F}=state.client;try{await F.updateDoc(F.doc(db,'parties',state.party.id),{name,description:description.slice(0,500),updatedAt:F.serverTimestamp()});toast('Описание группы обновлено')}catch(e){report(e,'Редактирование группы')}}
async function leaveParty(){if(!state.party||isLeader())return;if(!confirm('Покинуть группу? Ваше состояние больше не будет видно отряду.'))return;const {db,firestoreSdk:F}=state.client,uid=state.user.uid,id=state.party.id;try{await F.deleteDoc(F.doc(db,'parties',id,'roster',uid));await F.updateDoc(F.doc(db,'parties',id),{memberIds:F.arrayRemove(uid),updatedAt:F.serverTimestamp()});await F.setDoc(F.doc(db,'users',uid,'settings','playerState'),{partyId:null},{merge:true});toast('Вы покинули группу')}catch(e){report(e,'Выход из группы')}}
async function saveLocation(){if(!isLeader())return;const id=state.mapSelected||state.party.regionId;if(!getZone(id)){notice('Сначала выберите точку на карте.','warning');return}const {db,firestoreSdk:F}=state.client;try{await F.updateDoc(F.doc(db,'parties',state.party.id),{regionId:id,note:($('partyMapNote')?.value||'').slice(0,350),updatedAt:F.serverTimestamp()});toast('Местоположение сохранено');state.mapNoteDraft=null}catch(e){report(e,'Сохранение маршрута')}}
async function saveNewsletter(){const checked=Boolean($('newsletterOptIn')?.checked),{db,firestoreSdk:F}=state.client;try{await F.setDoc(F.doc(db,'users',state.user.uid,'settings','notifications'),{emailOptIn:checked,email:state.user.email||'',consentVersion:'v1',updatedAt:F.serverTimestamp()});toast(checked?'Согласие на будущие письма сохранено. Рассылка пока не подключена.':'Подписка отключена')}catch(e){report(e,'Настройка уведомлений')}}
function downloadFile(name,content,mime){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function sheetHtml(c){const cl=getClass(c.classId),r=getRace(c.raceId),style=`body{font-family:Georgia,serif;background:#eae6d9;color:#202933;padding:30px;max-width:800px;margin:auto}main{background:#fffdf6;border:1px solid #9c9275;padding:30px}h1{font-size:44px;color:#244538;margin:15px 0}h2{border-bottom:1px solid #afbaa9;padding-bottom:9px;color:#244538}.hero{display:flex;gap:20px}.hero img{width:155px;max-height:220px;object-fit:cover}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stats div{border:1px solid #c9d2ca;padding:12px}.sub{font-size:12px;letter-spacing:.2em;color:#6c927e}p,li{line-height:1.6}.footer{font-size:11px;margin-top:40px;color:#68716f}@media print{body{background:white;padding:0}main{border:0;padding:0}}`;
 const attr=Object.entries(c.attributes||{}).map(([n,v])=>`<div><small>${esc(n)}</small><br><strong>${v}</strong></div>`).join('');return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(c.name)} — THAOS</title><style>${style}</style></head><body><main><div class="sub">THAOS / CHRONICLES OF GODS / CHARACTER RECORD</div><h1>${esc(c.name)}</h1><div class="hero">${safeArt(c.artData)?`<img src="${safeArt(c.artData)}" alt="Портрет">`:''}<div><p><b>Класс:</b> ${esc(cl?.name||'—')}</p><p><b>Раса:</b> ${esc(r?.name||'—')}</p><p><b>Уровень:</b> ${c.level}</p><p><b>Путь:</b> ${esc(cl?.paths?.[c.pathIndex]||'—')}</p><p><b>Здоровье:</b> ${c.health??0} / ${c.healthMax??0}</p><p><b>Мана:</b> ${c.mana??5} / ${c.manaMax??5}</p><p><b>Скорость:</b> ${c.speed||0} м &nbsp; <b>Защита:</b> ${c.defense||0}</p></div></div><h2>Атрибуты</h2><div class="stats">${attr}</div><h2>Способности</h2><p><b>Базовый класс:</b> ${esc((c.baseSkills||[]).join(', ')||'—')}</p><p><b>Путь:</b> ${esc((c.pathSkills||[]).join(', ')||'—')}</p><h2>История</h2><p>${esc(c.bio||'Нет описания.')}</p><div class="footer">THAOS · Персональный лист · ${new Date().toLocaleDateString('ru-RU')}</div></main></body></html>`}
function exportCharacter(c,action){if(action==='download-json'){const copy={...c};delete copy.createdAt;delete copy.updatedAt;downloadFile(`THAOS-${c.id}.json`,JSON.stringify(copy,null,2),'application/json;charset=utf-8');toast('JSON сохранён');return}if(action==='download-html'){downloadFile(`THAOS-${c.name.replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,32)}.html`,sheetHtml(c),'text/html;charset=utf-8');toast('Красивый HTML-лист скачан');return}const print=$('playerPrintSheet');const template=new DOMParser().parseFromString(sheetHtml(c),'text/html');print.innerHTML=template.body.innerHTML;print.querySelector('main')?.classList.add('print-page');print.style.display='block';const h=print.querySelector('h1');if(h)h.classList.add('print-name');const el=print.querySelector('.hero');if(el)el.classList.add('print-lead');print.querySelector('.stats')?.classList.add('print-metrics');window.print();setTimeout(()=>{print.style.display='';print.innerHTML=''},1500)}
async function compressImage(file,preset='character'){if(!file.type.startsWith('image/')||file.type==='image/svg+xml')throw Error('Выберите PNG, JPEG или WebP. SVG не поддерживается.');if(file.size>8*1024*1024)throw Error('Файл больше 8 МБ.');const maxSize=preset==='character'?[620,820]:[380,380],target=preset==='character'?115000:85000;const bitmap=await createImageBitmap(file);const scale=Math.min(1,maxSize[0]/bitmap.width,maxSize[1]/bitmap.height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();let data='';for(const q of [.78,.65,.52,.39]){data=canvas.toDataURL('image/webp',q);if(data.length<target)break}if(data.length>=target)throw Error('Изображение не удалось достаточно уменьшить. Попробуйте другое.');return data}
main.addEventListener('click',clickAction);
main.addEventListener('change',e=>{const el=e.target;if(el.dataset.field&&state.draft){const field=el.dataset.field,value=el.value;if(field==='level'){changeLevel(value);return}
if(field==='raceChoice'){state.draft.raceChoice=value;return}if(field==='classId'&&state.draft.classId!==value){state.draft.classId=value;state.draft.baseSkills=[];state.skillFocus=null;state.draft.pathIndex=-1;state.draft.pathSkills=[];render();return}if(field==='raceId'){state.draft.raceId=value;render();return}if(['health','healthMax','mana','manaMax','speed','defense'].includes(field))state.draft[field]=Math.max(0,Number(value)||0);else if(field in state.draft)state.draft[field]=value;}
 if(el.dataset.boostLevel&&state.draft){state.draft.attrBoosts[String(el.dataset.boostLevel)]=el.value;syncAttrs(state.draft);render();return;}
 if(el.dataset.upload){const file=el.files?.[0];if(!file)return;compressImage(file,el.dataset.upload).then(data=>{if(el.dataset.upload==='character'&&state.draft){state.draft.artData=data;render();toast('Арт оптимизирован и добавлен')}else if(el.dataset.upload==='group'){state.groupArt=data;render();toast('Эмблема готова')}}).catch(err=>notice(err.message,'error'));}
});
main.addEventListener('input',e=>{const el=e.target;
 if(el.id==='field-groupName')state.groupDraftName=el.value;
 if(el.id==='groupDescription')state.groupDraftDescription=el.value;
 if(el.id==='field-partyCode')state.partyJoinCode=el.value;
 if(el.id==='partyMapNote')state.mapNoteDraft=el.value;
 if(!state.draft||!el.dataset.field)return;
 const field=el.dataset.field;if(field==='name'||field==='bio')state.draft[field]=el.value;
});
main.addEventListener('wheel',e=>{if(!state.draft||state.step!==1||!e.target.closest('.b2-orbits'))return;e.preventDefault();changeLevel(state.draft.level+(e.deltaY>0?1:-1));},{passive:false});
window.addEventListener('hashchange',()=>{state.mapSelected=null;window.scrollTo({top:0,behavior:'smooth'});render()});
boot();

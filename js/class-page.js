(() => {
  const classes = window.THAOS_CLASSES || [];
  const id = new URLSearchParams(location.search).get('id') || classes[0]?.id;
  const c = classes.find(x => x.id === id) || classes[0];
  if (!c) return;

  const currentIndex = classes.findIndex(x => x.id === c.id);
  const prevClass = classes[(currentIndex - 1 + classes.length) % classes.length];
  const nextClass = classes[(currentIndex + 1) % classes.length];

  const $ = s => document.querySelector(s);
  document.title = `${c.name} — THAOS`;
  document.documentElement.style.setProperty('--page-accent', c.accent);
  document.documentElement.style.setProperty('--page-accent2', c.accent2 || c.accent);
  $('#className').textContent = c.name;
  $('#classRole').textContent = c.role;
  $('#classDesc').textContent = c.desc;
  $('#classPrimary').textContent = c.primary;
  $('#classSecondary').textContent = c.secondary;
  $('#classResource').textContent = c.resource;
  $('#classCombatRole').textContent = c.combatRole || c.role;
  const heroSigil = $('#classHeroSigil');
  const heroIcon = document.createElement('img');
  heroIcon.className = 'class-art-placeholder__icon';
  heroIcon.alt = '';
  heroIcon.src = `./assets/classes/icons/${c.icon || c.id}.svg`;
  heroIcon.addEventListener('error', () => {
    heroSigil.innerHTML = window.thaosClassIcon ? window.thaosClassIcon(c.id) : c.short;
  }, {once:true});
  heroSigil.innerHTML = '';
  heroSigil.appendChild(heroIcon);

  // Previous / next class controls. Keeps navigation inside the dossier and wraps around.
  const prevBtn = $('#prevClass');
  const nextBtn = $('#nextClass');
  $('#prevClassName').textContent = prevClass.name;
  $('#nextClassName').textContent = nextClass.name;
  $('#currentClassIndex').textContent = `${String(currentIndex + 1).padStart(2,'0')} из ${classes.length}`;
  $('#currentClassName').textContent = c.name;
  // Use the same SVG class emblems as the class selection panel.
  function dossierSvgIcon(cls){
    const icon = (cls.icon || cls.id).replace(/[^a-z0-9-]/gi, '');
    return `<span class="dossier-class-svg" style="--dossier-mask:url('./assets/classes/icons/${icon}.svg')"></span>`;
  }
  $('#prevClassIcon').innerHTML = dossierSvgIcon(prevClass);
  $('#nextClassIcon').innerHTML = dossierSvgIcon(nextClass);
  prevBtn.style.setProperty('--switch-accent', prevClass.accent);
  nextBtn.style.setProperty('--switch-accent', nextClass.accent);

  // Переключение классов без экранных переходов и задержек.
  function switchClass(target) {
    location.assign(`./class.html?id=${encodeURIComponent(target.id)}`);
  }
  prevBtn.addEventListener('click', () => switchClass(prevClass));
  nextBtn.addEventListener('click', () => switchClass(nextClass));

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (event.key === 'ArrowLeft') switchClass(prevClass);
    if (event.key === 'ArrowRight') switchClass(nextClass);
  });

  const knownSkillText = window.THAOS_BALANCE?.baseSkillText || {};

  const knownPathSkills = {
    druid: {
      'Хищник':['Кровавый Коготь','Теневой Рывок','Звериная Ярость','Разрыв'],
      'Страж Рощи':['Каменная Кожа','Провокация Рощи','Шипастый Контрудар','Корневой Бастион'],
      'Узник Подземелий':['Тюремные Шипы','Угнетающая Аура','Слом Воли','Цепи Подземелья'],
      'Хранитель Жизни':['Поток Жизни','Лиственная Завеса','Круг Восстановления','Очищение Рощи'],
      'Порченый':['Гниющие Корни','Иссохший Ландшафт','Волны Разложения','Цветение Гнили']
    }
  };

  // Optional class artwork: WebP -> JPG -> PNG.
  const art = $('#classArt');
  const candidates = [`./assets/classes/art/${c.id}.webp`, `./assets/classes/art/${c.id}.jpg`, `./assets/classes/art/${c.id}.png`];
  let artIndex = 0;
  const tryArt = () => { if (artIndex < candidates.length) art.src = candidates[artIndex++]; };
  art.addEventListener('load', () => { art.hidden = false; $('#classArtWrap').classList.add('has-art'); });
  art.addEventListener('error', tryArt);
  tryArt();

  // Base abilities: click a name to reveal its Core rule directly under the row.
  const chips = $('#baseSkillChips');
  const peek = $('#classSkillPeek');
  let openSkillIndex = -1;
  (c.skills || []).forEach((name, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'class-skill-chip';
    button.textContent = name;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'classSkillPeek');
    button.addEventListener('click', () => {
      const willOpen = openSkillIndex !== index;
      openSkillIndex = willOpen ? index : -1;
      [...chips.children].forEach((chip, i) => {
        chip.classList.toggle('is-active', willOpen && i === index);
        chip.setAttribute('aria-expanded', String(willOpen && i === index));
      });
      if (willOpen) {
        $('#peekSkillName').textContent = name;
        $('#peekSkillDescription').textContent = knownSkillText[c.id]?.[name] || 'Механика не определена.';
      }
      peek.classList.toggle('is-open', willOpen);
    });
    chips.appendChild(button);
  });

  const skillMode = $('#classSkillMode');
  const openButton = $('#openClassSkills');
  openButton.addEventListener('click', () => {
    const opening = !skillMode.classList.contains('is-open');
    skillMode.classList.toggle('is-open', opening);
    skillMode.setAttribute('aria-hidden', opening ? 'false' : 'true');
    openButton.classList.toggle('is-open', opening);
    openButton.querySelector('b').textContent = opening ? 'Скрыть расширенную версию ↑' : 'Открыть расширенную версию →';
    if (opening) setTimeout(() => skillMode.scrollIntoView({behavior:'smooth', block:'start'}), 140);
  });

  const inspector = $('#classSkillInspector');
  function showInspector({stage, kind, name, description, extra=''}) {
    inspector.classList.remove('is-updating');
    void inspector.offsetWidth;
    inspector.classList.add('is-updating');
    const mechanic = window.THAOS_BALANCE?.getSkill(c.id,name);
    const mechanicalText = mechanic ? mechanic.mechanics : (description || 'Точные числовые правила ещё не определены.');
    const status = mechanic?.status === 'balance-v1' ? 'Тестовая баланс-редакция' : (mechanic?.status === 'needs-numbers' ? 'Требует числового уточнения' : 'Механика из Core');
    inspector.innerHTML = `
      <span>${kind}</span>
      <h2>${name}</h2>
      <p><strong>Описание:</strong> ${description || 'Навык Пути.'}</p>
      <p><strong>Механика:</strong> ${mechanicalText}</p>
      <div class="class-skill-inspector__meta"><b>${status}</b></div>
      <div class="class-skill-inspector__meta"><b>${stage}</b><small>${extra || 'навык класса'}</small></div>`;
  }

  const baseNodes = $('#baseSkillNodes');
  (c.skills || []).forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'class-skill-node';
    b.innerHTML = `<span class="class-skill-node__ring"><b>${String(i+1).padStart(2,'0')}</b></span><small>${name}</small>`;
    b.addEventListener('click', () => {
      document.querySelectorAll('.class-skill-node').forEach(x=>x.classList.remove('is-active'));
      b.classList.add('is-active');
      showInspector({stage:'LVL 1–3',kind:'БАЗОВЫЙ НАВЫК',name,description:knownSkillText[c.id]?.[name],extra:'выбрать 3 из 5'});
    });
    baseNodes.appendChild(b);
  });

  const switcher = $('#pathSwitcher');
  const pathNodes = $('#pathSkillNodes');
  const paths = c.paths || [];
  const visiblePaths = paths.slice(0,4);
  const hiddenPath = paths[4];
  const pathContents = window.THAOS_PATH_CONTENT?.[c.id] || [];

  function selectPath(index, hidden=false){
    [...switcher.children].forEach((btn, i) => {
      btn.classList.toggle('is-active', i === index);
      btn.setAttribute('aria-pressed', String(i === index));
    });
    const actualPathName = paths[index] || 'Путь';
    const pathName = hidden ? 'Неизвестный Путь' : actualPathName;
    const meta = pathContents[index] || {};
    $('#pathStageLabel').textContent = pathName;
    $('#pathProfileTag').textContent = hidden ? 'СКРЫТАЯ СПЕЦИАЛИЗАЦИЯ' : 'СТИЛЬ ПУТИ · LVL 4–6';
    $('#pathProfileName').textContent = pathName;
    $('#activePathNote').textContent = hidden
      ? (meta.secret || 'Путь скрыт. Способ открытия определяются историей и Мастером.')
      : (meta.summary || `Путь «${pathName}» открывает собственный стиль игры.`);
    $('#pathProfileGameplay').textContent = hidden ? 'Способности станут известны после открытия Пути.' : (meta.gameplay || 'Выберите две способности, чтобы сформировать свой боевой стиль.');
    $('#pathProfileFootnote').textContent = hidden ? 'Условия открытия неизвестны' : 'Выбрать 2 из 4 навыков на уровнях 4–6';
    const profile = $('#classPathProfile');
    profile.classList.remove('is-swapping');
    void profile.offsetWidth;
    profile.classList.add('is-swapping');
    pathNodes.innerHTML = '';
    const names = meta.skills || knownPathSkills[c.id]?.[actualPathName] || [];
    for(let i=0;i<4;i++){
      const name = hidden ? 'Неизвестный навык' : (names[i] || `Навык Пути ${String(i+1).padStart(2,'0')}`);
      const node = document.createElement('button');
      node.type='button'; node.className='class-skill-node class-skill-node--path';
      node.innerHTML=`<span class="class-skill-node__ring"><b>${String(i+1).padStart(2,'0')}</b></span><small>${name}</small>`;
      node.addEventListener('click',()=>{
        document.querySelectorAll('.class-skill-node').forEach(x=>x.classList.remove('is-active'));
        node.classList.add('is-active');
        showInspector({stage:'LVL 4–6',kind:hidden?'СКРЫТЫЙ ПУТЬ':pathName.toUpperCase(),name,description:hidden ? 'Способности этого Пути открываются во время кампании.' : `Навык Пути «${pathName}». ${meta.gameplay || 'Сведения о точной механике появятся в Core.'} Точные числа и условия определяются правилами навыка.`,extra:hidden?'требуется открытие':'выбрать 2 из 4'});
      });
      pathNodes.appendChild(node);
    }
  }

  visiblePaths.forEach((name,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='path-tab';
    b.innerHTML=`<strong>${String(i+1).padStart(2,'0')}</strong><span>${name}</span>`;
    b.addEventListener('click',()=>selectPath(i,false));
    switcher.appendChild(b);
  });
  const secret=document.createElement('button'); secret.type='button'; secret.className='path-tab path-tab--secret';
  secret.innerHTML='<strong>?</strong><span>Скрытый Путь</span>';
  secret.addEventListener('click',()=>selectPath(4,true)); switcher.appendChild(secret);
  if (visiblePaths.length) selectPath(0,false);

  $('#breakthroughNode').addEventListener('click',()=>{
    document.querySelectorAll('.class-skill-node').forEach(x=>x.classList.remove('is-active'));
    $('#breakthroughNode').classList.add('is-active');
    showInspector({stage:'LVL 7',kind:'ПЕРЕЛОМ',name:'Перелом',description:'На 7 уровне персонаж проходит Перелом выбранного основного класса. Дальше открывается Истинный класс и следующий этап прогрессии.',extra:'граница следующего этапа'});
  });
})();

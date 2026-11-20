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

  const knownSkillText = {
    warrior: {
      'Укреплённая стойка':'Малое действие. До начала следующего хода получаете +2 Защиты и +2 к сопротивлению принудительному перемещению.',
      'Усердная тренировка':'Пассив. В начале боя получаете временные HP, равные уровню + Выносливость.',
      'Здоровое тело':'Пассив. Увеличивает максимальный запас HP и даёт +1 к сопротивлению Яду, болезням и физическому истощению.',
      'Точный удар':'Основное действие. Совершите атаку с +2 к попаданию. Не чаще одного раза за раунд.',
      'Быстрый манёвр':'Движение. Переместитесь дополнительно на 2 м; первый противник, чью зону вы покидаете, не может использовать реакцию на это движение.'
    },
    monk: {
      'Духовное просветление':'Пассив. В начале своего хода, если у вас нет Усталости, восстановите 1 Ци до максимума.',
      'Оглушающий удар':'Основное действие. После попадания можно потратить Ци и попытаться наложить Оглушение.',
      'Отталкивающий удар':'Основное действие. После попадания переместите цель на 2 м; столкновение с препятствием может дать дополнительный эффект.',
      'Магический удар':'Основное действие. Атака считается магической и может наносить физический или магический тип урона.',
      'Лёгкий шаг':'Пассив. Первый 1 м сложной местности каждый ход не требует дополнительного движения; навыки с перемещением получают +1 м.'
    },
    bard: {
      'Летописец':'Пассив. После успешного действия союзника запомните его как Мотив; один раз за сцену дайте +1 к похожей проверке.',
      'Волшебные слова':'Малое действие. Союзник получает небольшой бонус к следующей проверке, противник — штраф к следующей.',
      'Осторожность':'Реакция. Когда союзник рядом становится целью атаки, дайте ему +2 Защиты против этой атаки.',
      'Болтливый шарлатан':'Пассив. Получаете +2 к проверкам обмана, отвлечения и импровизированных социальных манёвров.',
      'Подхватить мотив':'Реакция, 1/раунд. Когда союзник накладывает состояние на врага, можете активировать Связку, не расходуя состояние.'
    },
    ranger: {
      'Нет интереса':'Пассив. Если враг не атаковал вас с начала прошлого хода, первая атака по нему получает небольшой бонус.',
      'Расширенная охота':'Пассив. По следам определяете направление, примерное количество и состояние добычи.',
      'Повышенная аккуратность':'Малое действие. Следующая дальняя атака до конца хода получает +2 к попаданию.',
      'Красочные метки':'Малое действие. Наложите Охотничью Метку; навыки Рейнджера получают дополнительные эффекты против отмеченной цели.',
      'Холодный расчёт':'Основное действие. Атака по отмеченной цели усиливается, если до неё вы не перемещались.'
    },
    archer: {
      'Твёрдая рука':'Пассив. Если до атаки вы не двигались, получите +1 к попаданию.',
      'Навскидку':'Малое действие, 1/раунд. Совершите быструю дальнюю атаку с уменьшенным уроном.',
      'Сквозной выстрел':'Основное действие. Выстрел проходит через первую цель и может задеть вторую непосредственно за ней.',
      'Контроль дистанции':'Реакция. Когда враг приближается, переместитесь на 2 м и сохраните наведение, если он остаётся в линии огня.',
      'Тяжёлая тетива':'Основное действие. Если вы не двигались, совершите усиленный выстрел; после него Speed до конца хода становится 0.'
    },
    mage: {
      'Магический резерв':'Пассив. Увеличивает максимальный запас Маны.',
      'Свободные заклинания':'Малое действие, 1/раунд. Измените тип урона следующего заклинания на доступный вам магический тип.',
      'Испорченная мана':'Пассив. Можете усилить заклинание ценой Усталости 1.',
      'Длинные заклинания':'Пассив. Если вы не двигались в этом ходу, заклинания с дистанцией получают увеличенную дальность.',
      'Свободные грузы':'Пассив. Простые магические манипуляции предметами не требуют отдельного боевого заклинания.'
    },
    wizard: {
      'Грамотность':'Пассив. Быстрее расшифровываете руны, магические записи и неизвестные формулы.',
      'Предосторожный':'Реакция. При обнаружении магического эффекта получаете бонус к сопротивлению его первому воздействию.',
      'Магический фокус':'Малое действие. Выберите заклинание: следующее его применение получает +2 к проверке.',
      'Роскошный резерв':'Пассив. Увеличивает запас подготовленных заклинаний или Маны.',
      'Чернильная память':'Пассив. После изучения магической формулы можете восстановить её основные свойства без повторной проверки.'
    },
    warlock: {
      'Трансцендентность':'Пассив. Первый раз за бой при получении магического состояния можете ослабить его эффект.',
      'Кровавые весы':'Малое действие. Потеряйте часть HP, чтобы усилить следующую магическую атаку.',
      'Сам себе проклятье':'Малое действие. Добровольно получите Проклятие 1 ради бонуса к следующему магическому эффекту.',
      'Благо умершего':'Реакция, 1/раунд. Когда рядом погибает существо, получите временный бонус или восстановите часть ресурса.',
      'Ритуальные услуги':'Вне боя. Позволяет проводить договоры, призывы, печати и длительные ритуалы.'
    },
    priest: {
      'Божья кара':'Основное действие. Магическая атака усиливается против цели, которая нанесла урон союзнику после вашего предыдущего хода.',
      'Два реликта':'Пассив. Можете поддерживать два подготовленных религиозных реликта одновременно.',
      'Первая Заповедь':'Реакция. Когда союзник получает состояние, дайте ему бонус к сопротивлению или сократите длительность эффекта.',
      'Покров веры':'Малое действие. Союзник получает временную Защиту до начала вашего следующего хода.',
      'Благословение оружия':'Основное действие. На несколько раундов оружие союзника считается магическим и усиливается против выбранного типа существ.'
    },
    druid: {
      'Дикий Облик':'Основное действие. Примите природную форму, меняющую доступные движения и физические свойства.',
      'Терновые Корни':'Основное действие. Создайте участок корней: враги внутри Замедляются и могут быть удержаны.',
      'Прикосновение Жизни':'Основное действие. Восстановите HP себе или существу рядом.',
      'Гнев Природы':'Основное действие. Природная магическая атака; тип эффекта зависит от окружения или выбранной формы.',
      'Шёпот Рощи':'Пассив / вне боя. Получаете информацию от растений, животных и природных следов.'
    },
    summoner: {
      'Призыв Слуги':'Основное действие. Призовите базового Слугу; число одновременно активных существ ограничено классом.',
      'Командный Импульс':'Малое действие. Один призванный союзник немедленно выполняет простое движение или подготовленное действие.',
      'Жертвенная Связь':'Реакция. Перераспределите часть входящего урона между участниками Уз.',
      'Укрепление Уз':'Малое действие. Призванное существо получает временную Защиту или сопротивление состоянию.',
      'Обратная Связь':'Пассив. Когда призванное существо погибает или исчезает, хозяин получает небольшой временный эффект вместо полной потери темпа.'
    },
    mechanist: {
      'Развёртывание Устройства':'Основное действие. Разместите подготовленное устройство в соседней свободной клетке.',
      'Перезарядка':'Малое действие. Восстановите Заряд выбранному устройству или подготовьте его к следующему применению.',
      'Экстренный Ремонт':'Основное действие. Восстановите прочность устройства или временно верните сломанное устройство в работу.',
      'Перегрузка Системы':'Малое действие. Усильте следующее срабатывание устройства ценой дополнительного Заряда или повреждения.',
      'Разбор':'Вне боя / Основное действие в бою. Разберите механизм или быстро отключите простое устройство рядом.'
    },
    rogue: {
      'Удар из тени':'Основное действие, 1/раунд. Если цель имеет Метку, Ослеплена или ещё не ходила в этом раунде, атака получает дополнительный урон.',
      'Слабое место':'Малое действие. Наложите Метку 1 на видимую цель. Максимум 6 Меток.',
      'Перекат':'Реакция. Получите +3 Защиты против объявленной атаки; если она промахнулась, переместитесь на 2 м. Усталость 1.',
      'Дымовая завеса':'Основное действие, 1/короткий отдых. Ближайшие враги получают Слепоту после проверки сопротивления.',
      'Ловкие пальцы':'Пассив. Замки, ловушки, карманы и быстрые взаимодействия с предметами; часть таких действий в бою выполняется Малым действием.'
    }
  };

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
        $('#peekSkillDescription').textContent = knownSkillText[c.id]?.[name] || 'Описание способности подготавливается для полного справочника Core.';
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
    inspector.innerHTML = `
      <span>${kind}</span>
      <h2>${name}</h2>
      <p>${description || 'Навык уже входит в структуру класса. Полное механическое описание будет подставлено после окончательной нормализации Core.'}</p>
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

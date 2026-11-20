(() => {
  const root = document.querySelector('#raceAccordion');
  const races = window.THAOS_RACES || [];
  if (!root || !races.length) return;

  const artCandidates = id => [
    `./assets/races/art/${id}.webp`,
    `./assets/races/art/${id}.png`,
    `./assets/races/art/${id}.jpg`,
    `./assets/races/art/${id}.jpeg`
  ];

  const loadFirstArt = (id, onLoad) => {
    const candidates = artCandidates(id);
    let index = 0;
    const probe = new Image();
    const next = () => {
      if (index >= candidates.length) return;
      const src = candidates[index++];
      probe.onload = () => onLoad(src);
      probe.onerror = next;
      probe.src = src;
    };
    next();
  };

  root.innerHTML = races.map((r, i) => `
    <a class="race-panel reveal" href="./race.html?id=${r.id}" data-id="${r.id}" style="--accent:${r.accent};--accent2:${r.accent2}">
      <div class="race-panel__art" aria-hidden="true">
        <img class="race-panel__image" alt="" decoding="async" loading="lazy">
        <div class="race-panel__art-slot"><i></i><small>ART SLOT</small></div>
      </div>
      <div class="race-panel__shade"></div>
      <div class="race-panel__number">${String(i+1).padStart(2,'0')}</div>
      <div class="race-panel__body">
        <span>${r.tag}</span>
        <h2>${r.name}</h2>
        <p>${r.desc}</p>
        <div class="race-panel__passive">
          <small>Расовая особенность</small>
          <b>${r.passive}</b>
          <em>${r.effect}</em>
        </div>
        <strong>Открыть досье →</strong>
      </div>
    </a>`).join('');

  const panels = [...root.querySelectorAll('.race-panel')];
  let activeIndex = 0;
  let touchedIndex = -1;
  const activate = index => {
    activeIndex = (index + panels.length) % panels.length;
    panels.forEach((panel, i) => panel.classList.toggle('is-current', i === activeIndex));
  };

  panels.forEach((panel, index) => {
    const id = panel.dataset.id;
    loadFirstArt(id, src => {
      const img = panel.querySelector('.race-panel__image');
      if (img) img.src = src;
      panel.style.setProperty('--race-art', `url("${src}")`);
      panel.classList.add('has-art');
    });
    panel.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      activate(index);
      const accent = getComputedStyle(panel).getPropertyValue('--accent').trim();
      const accent2 = getComputedStyle(panel).getPropertyValue('--accent2').trim();
      if (accent) document.documentElement.style.setProperty('--page-accent', accent);
      if (accent2) document.documentElement.style.setProperty('--page-accent2', accent2);
    });
    panel.addEventListener('focus', () => activate(index));
    panel.addEventListener('click', event => {
      if (!matchMedia('(hover: none)').matches) return;
      if (touchedIndex !== index) {
        event.preventDefault();
        activate(index);
        touchedIndex = index;
        panel.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'smooth'});
      }
    });
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    activate(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    panels[activeIndex].focus({preventScroll:false});
  });
  activate(0);
})();

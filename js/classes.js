(() => {
  const root = document.querySelector('#classAccordion');
  const classes = window.THAOS_CLASSES || [];
  if (!root || !classes.length) return;

  // DOM filters tint the original external SVG exactly to each class color.
  // No hard-coded SVG markup or recolored copies are needed.
  const svgNs = 'http://www.w3.org/2000/svg';
  const filterSprite = document.createElementNS(svgNs, 'svg');
  filterSprite.setAttribute('xmlns', svgNs);
  filterSprite.setAttribute('aria-hidden', 'true');
  filterSprite.setAttribute('class', 'thaos-icon-tint-sprite');
  filterSprite.innerHTML = `<defs>${classes.map(c => `
    <filter id="thaos-class-tint-${c.id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feFlood flood-color="${c.accent}" result="tint"/>
      <feComposite in="tint" in2="SourceAlpha" operator="in"/>
    </filter>`).join('')}</defs>`;
  root.before(filterSprite);

  root.innerHTML = classes.map((c, i) => `
    <a class="class-panel reveal" href="./class.html?id=${encodeURIComponent(c.id)}" data-id="${c.id}" style="--accent:${c.accent};--accent2:${c.accent2}">
      <div class="class-panel__wash"></div>
      <div class="class-panel__number">${String(i + 1).padStart(2,'0')}</div>
      <div class="class-panel__sigil" data-class-sigil="${c.id}" aria-hidden="true">
        <img class="class-panel__icon-file" src="./assets/classes/icons/${c.icon || c.id}.svg" alt="" loading="eager" decoding="async" style="--icon-tint:url('#thaos-class-tint-${c.id}')">
        <span class="class-panel__icon-fallback" aria-hidden="true">${c.short || ''}</span>
      </div>
      <div class="class-panel__body">
        <span>${c.role}</span>
        <h2>${c.name}</h2>
        <p>${c.desc}</p>
        <div class="class-panel__meta">
          <b>${c.primary}</b><small>основной атрибут</small>
          <b>${c.resource}</b><small>ресурс</small>
        </div>
        <em>Открыть досье →</em>
      </div>
    </a>`).join('');

  const panels = [...root.querySelectorAll('.class-panel')];
  let activeIndex = 0;
  let touchedIndex = -1;
  const activate = index => {
    activeIndex = (index + panels.length) % panels.length;
    panels.forEach((panel, i) => panel.classList.toggle('is-current', i === activeIndex));
  };

  panels.forEach((panel, index) => {
    const sigil = panel.querySelector('[data-class-sigil]');
    const fallback = sigil?.querySelector('.class-panel__icon-fallback');
    const iconImage = sigil?.querySelector('.class-panel__icon-file');
    if (fallback && window.thaosClassIcon) fallback.innerHTML = window.thaosClassIcon(sigil.dataset.classSigil);
    if (iconImage) iconImage.addEventListener('error', () => {
      iconImage.style.display = 'none';
      if (fallback) fallback.style.display = 'grid';
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

(() => {
  const races = window.THAOS_RACES || [];
  const id = new URLSearchParams(location.search).get('id') || 'human';
  const r = races.find(x=>x.id===id) || races[0];
  if (!r) return;

  const currentIndex = races.findIndex(x => x.id === r.id);
  const prevRace = races[(currentIndex - 1 + races.length) % races.length];
  const nextRace = races[(currentIndex + 1) % races.length];

  document.documentElement.style.setProperty('--page-accent', r.accent);
  document.documentElement.style.setProperty('--page-accent2', r.accent2);
  document.title = `${r.name} — THAOS`;

  const set=(id,v)=>{const el=document.getElementById(id); if(el) el.textContent=v};
  set('raceName',r.name);
  set('raceTag',r.tag);
  set('raceDesc',r.desc);
  set('racePassive',r.passive);
  set('raceEffect',r.effect);
  set('raceArtSlotName', `${r.name.toUpperCase()} // RACE ART`);
  set('raceArtSlotFile', 'Иллюстрация будет добавлена позже');

  // Previous / next race controls.
  set('prevRaceName', prevRace.name);
  set('nextRaceName', nextRace.name);
  set('prevRaceBadge', String(((currentIndex - 1 + races.length) % races.length) + 1).padStart(2,'0'));
  set('nextRaceBadge', String(((currentIndex + 1) % races.length) + 1).padStart(2,'0'));
  set('currentRaceIndex', `${String(currentIndex + 1).padStart(2,'0')} / ${String(races.length).padStart(2,'0')}`);
  set('currentRaceName', r.name);
  const prevBtn = document.getElementById('prevRace');
  const nextBtn = document.getElementById('nextRace');
  prevBtn.style.setProperty('--switch-accent', prevRace.accent);
  nextBtn.style.setProperty('--switch-accent', nextRace.accent);

  // Переключение рас без экранных переходов и задержек.
  function switchRace(target) {
    location.assign(`./race.html?id=${encodeURIComponent(target.id)}`);
  }
  prevBtn.addEventListener('click', () => switchRace(prevRace));
  nextBtn.addEventListener('click', () => switchRace(nextRace));

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (event.key === 'ArrowLeft') switchRace(prevRace);
    if (event.key === 'ArrowRight') switchRace(nextRace);
  });

  const art = document.getElementById('raceArt');
  const wrap = document.getElementById('raceArtWrap');
  if (!art || !wrap) return;

  const candidates = [
    `./assets/races/art/${r.id}.webp`,
    `./assets/races/art/${r.id}.png`,
    `./assets/races/art/${r.id}.jpg`,
    `./assets/races/art/${r.id}.jpeg`
  ];
  let index = 0;

  const tryNext = () => {
    if (index >= candidates.length) {
      art.hidden = true;
      wrap.classList.remove('has-art');
      return;
    }
    art.src = candidates[index++];
  };

  art.addEventListener('load', () => {
    art.hidden = false;
    wrap.style.setProperty('--race-art', `url("${art.src}")`);
    wrap.classList.add('has-art');
  });
  art.addEventListener('error', tryNext);
  art.alt = `${r.name} — арт расы THAOS`;
  tryNext();
})();

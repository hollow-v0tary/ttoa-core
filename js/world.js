(() => {
  const zones = window.THAOS_WORLD?.zones || [];
  const map = document.getElementById('atlasMap');
  const root = document.getElementById('atlasHotspots');
  const card = document.getElementById('zoneCard');
  if (!map || !root || !card) return;
  const $ = id => document.getElementById(id);
  const statusFor = z => z.type.includes('Королевство') || z.type.includes('Конфедерация') ? 'Держава Пакта' : z.type.includes('Край') ? 'Граница мира' : z.type.includes('Точка') ? 'Локальная точка' : 'Исследуемая зона';
  const plotted = zones.filter(z => Number.isInteger(z.mapNumber)).sort((a,b)=>a.mapNumber-b.mapNumber);
  const byId = Object.fromEntries(plotted.map(z => [z.id,z]));
  let activeId = 'forgotten';

  // Percentage coordinates are relative to the SVG itself, not the surrounding browser div.
  // The SVG and marker overlay occupy the identical 4000x4200 proportional canvas.
  for (const z of plotted) {
    const button=document.createElement('button');
    button.type='button';
    button.className='atlas-hotspot';
    button.dataset.id=z.id;
    button.style.left=`${z.pos[0]}%`;
    button.style.top=`${z.pos[1]}%`;
    button.title=`${String(z.mapNumber).padStart(2,'0')} — ${z.name}`;
    button.setAttribute('aria-label',z.name);
    button.innerHTML=`<i aria-hidden="true"></i><span>${z.name}</span>`;
    button.addEventListener('click',()=>renderCard(z));
    button.addEventListener('pointerenter',()=>{
      document.documentElement.style.setProperty('--page-accent',z.accent||'#8ecbff');
    });
    root.appendChild(button);
  }

  function renderCard(z) {
    if (!z) return;
    $('zoneType').textContent = z.type;
    $('zoneName').textContent = z.name;
    $('zoneDanger').textContent = z.danger;
    $('zoneStatus').textContent = statusFor(z);
    $('zoneShort').textContent = z.short;
    $('zoneCardMeta').textContent = z.card;
    $('zoneOpen').href = `./region.html?id=${encodeURIComponent(z.id)}`;
    document.documentElement.style.setProperty('--page-accent',z.accent||'#8ecbff');
    document.documentElement.style.setProperty('--page-accent2',z.accent||'#36566f');
    const art=$('zoneCardArt');
    if (art) {
      art.style.setProperty('--zone-x',`${z.pos[0]}%`);
      art.style.setProperty('--zone-y',`${z.pos[1]}%`);
      art.classList.remove('is-switching');
      void art.offsetWidth;
      art.classList.add('is-switching');
    }
    for (const btn of root.querySelectorAll('.atlas-hotspot')) {
      const on = btn.dataset.id===z.id;
      btn.classList.toggle('is-active',on);
      btn.setAttribute('aria-pressed',String(on));
    }
    activeId=z.id;
  }
  renderCard(byId[activeId]||plotted[0]);
})();

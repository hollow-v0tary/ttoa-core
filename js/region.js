(() => {
 const data=window.THAOS_WORLD||{};
 const id=new URLSearchParams(location.search).get('id')||'ermest';
 const zone=(data.zones||[]).find(z=>z.id===id) || (data.zones||[])[0];
 const lore=(data.lore||{})[id];
 const details=(data.kingdomDetails||{})[id];
 const $=s=>document.querySelector(s);
 if(!zone) return;
 document.title=`${zone.name} — THAOS`;
 document.documentElement.style.setProperty('--page-accent', zone.accent||'#baff28');
 $('#regionType').textContent=zone.type||'REGION'; $('#regionName').textContent=zone.name; $('#regionShort').textContent=lore?.overview||zone.short||'';
 $('#regionMotto').textContent=(window.THAOS_WORLD_MOTTO||{})[id]||'Территория Таоса';
 $('#regionArtName').textContent=zone.name;
 $('#regionHistory').textContent=(window.THAOS_WORLD_HISTORY||{})[id]||zone.short||'История региона будет добавлена после финализации карты.';
 $('#regionLegend').textContent=lore?.legend||'Легенда региона будет добавлена позже.';
 $('#regionMyth').textContent=lore?.myth||'У этой территории нет отдельной государственной версии мифа о сотворении.';
 $('#regionPact').textContent=details?.pact||'Регион не является отдельной стороной Пакта Пяти Корон.';
 const quick=$('#regionQuick');
 const q=[['Опасность',zone.danger||'—'],['Центр',zone.card||'—'],['Статус',details?.current||zone.type||'—']];
 q.forEach(([a,b])=>{const d=document.createElement('div');d.innerHTML=`<span>${a}</span><b>${b}</b>`;quick.appendChild(d)});
 const facts=$('#regionFacts');
 const rows=details ? [['Правление',details.government],['Высший орган',details.authority],['Основатель',details.founder],['Экономика',details.economy],['Вера',details.faith],['Конфликт',details.conflict],['Сейчас',details.current]] : [['Тип',zone.type],['Опасность',zone.danger],['Описание',zone.short]];
 rows.filter(x=>x[1]).forEach(([k,v])=>{const d=document.createElement('div');d.innerHTML=`<b>${k}</b><p>${v}</p>`;facts.appendChild(d)});
 const hol=$('#regionHolidays'); (lore?.holidays||[]).forEach((h,i)=>{const d=document.createElement('div');d.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><p>${h}</p>`;hol.appendChild(d)}); if(!hol.children.length) hol.innerHTML='<p>Праздники для этой территории не определены.</p>';
 // Optional kingdom art files; no broken icon if absent.
 const img=$('#regionArt'); const files=[
  `./assets/world/regions/${id}.webp`,
  `./assets/world/regions/${id}.jpg`,
  `./assets/world/regions/${id}.png`,
  `./assets/world/kingdoms/${id}.webp`,
  `./assets/world/kingdoms/${id}.jpg`,
  `./assets/world/kingdoms/${id}.png`
]; let i=0;
 function next(){if(i>=files.length)return;img.src=files[i++]} img.onload=()=>{img.hidden=false;$('#regionArtWrap').classList.add('has-art')}; img.onerror=next; next();
})();
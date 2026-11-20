/* Public THAOS content layer: static HTML/JS stays the authoritative fallback. */
import { getFirebaseClient } from './firebase-client.js';
import { imageIsAllowed, textSelector } from './cms-manifest.js';

const setText = (root,selector,value) => {
  if (typeof value!=='string') return;
  const node=root?.querySelector(selector);
  if (node) node.textContent=value;
};
const setId = (id,value) => {const node=document.getElementById(id); if(node && typeof value==='string')node.textContent=value;};
const art = (el,value,name='--cms-item-art') => {if (el && imageIsAllowed(value)) el.style.setProperty(name,`url("${value}")`);};
const setImage = (el,url) => {
  if (!el || !imageIsAllowed(url)) return;
  el.onerror=null; el.hidden=false; el.src=url;
};
const docs=()=>getFirebaseClient().then(({db,firestoreSdk})=>firestoreSdk.getDocs(firestoreSdk.collection(db,'siteContent'))).then(s=>new Map(s.docs.map(d=>[d.id,d.data()])));
function applyBlocks(doc) {
  if(!doc?.blocks || !document.querySelector('.rule-chapter'))return;
  document.querySelectorAll(textSelector).forEach((el,i)=>{
    const value=doc.blocks[`b${i}`];
    if(typeof value==='string' && value.trim()) el.textContent=value;
  });
}
function run(items) {
  const raceId=new URLSearchParams(location.search).get('id');
  if(document.querySelector('#coreModuleGrid')){
    for(const card of document.querySelectorAll('[data-core-id]')){
      const d=items.get(`core-${card.dataset.coreId}`);if(!d)continue;
      setText(card,'.rule-module__body h2',d.title);setText(card,'.rule-module__body p',d.description);
      art(card,d.imageUrl,'--module-art');setImage(card.querySelector('.rule-module__art'),d.imageUrl);
    }
  }
  if(document.querySelector('.rule-book[data-rule-module]')){
    const m=document.querySelector('.rule-book');const d=items.get('core-'+m.dataset.ruleModule);
    if(d){setText(m,'.rule-hero h1',d.title);setText(m,'.rule-hero__copy p',d.description);art(m,d.imageUrl,'--rule-art');setImage(m.querySelector('.rule-hero__art'),d.imageUrl);applyBlocks(d);}
  }
  if(document.querySelector('.race-accordion')){
    for(const panel of document.querySelectorAll('.race-panel[data-id]')){
      const d=items.get(`race-${panel.dataset.id}`);if(!d)continue;
      setText(panel,'.race-panel__body h2',d.title);setText(panel,'.race-panel__body p',d.description);
      setText(panel,'.race-panel__passive b',d.meta?.passive);setText(panel,'.race-panel__passive em',d.meta?.effect);
      if(imageIsAllowed(d.imageUrl)){
        setImage(panel.querySelector('.race-panel__image'),d.imageUrl);
        panel.classList.add('has-art','has-cms-art');art(panel,d.imageUrl,'--race-art');
      }
    }
  }
  if(document.querySelector('.class-accordion')){
    for(const panel of document.querySelectorAll('.class-panel[data-id]')){
      const d=items.get(`class-${panel.dataset.id}`);if(!d)continue;
      setText(panel,'.class-panel__body h2',d.title);setText(panel,'.class-panel__body p',d.description);
      setText(panel,'.class-panel__body > span',d.meta?.role);
      if(imageIsAllowed(d.imageUrl))art(panel,d.imageUrl);
    }
  }
  if(document.querySelector('.race-select'))art(document.body,items.get('section-races')?.imageUrl,'--section-art');
  if(document.querySelector('.class-select'))art(document.body,items.get('section-classes')?.imageUrl,'--section-art');
  if(document.getElementById('raceName')){
    const d=items.get(`race-${raceId||'human'}`);
    if(d){setId('raceName',d.title);setId('raceDesc',d.description);setId('racePassive',d.meta?.passive);setId('raceEffect',d.meta?.effect);setImage(document.getElementById('raceArt'),d.imageUrl);}
  }
  if(document.getElementById('className')){
    const d=items.get(`class-${raceId||(window.THAOS_CLASSES||[])[0]?.id}`);
    if(d){setId('className',d.title);setId('classDesc',d.description);setId('classRole',d.meta?.role);setId('classResource',d.meta?.resource);setImage(document.getElementById('classArt'),d.imageUrl);document.getElementById('classArtWrap')?.classList.add('has-art');}
  }
  const worldItems=[...(window.THAOS_WORLD?.zones||[])];
  for(const z of worldItems){
    const d=items.get('world-'+z.id);if(!d)continue;
    if(typeof d.title==='string')z.name=d.title;
    if(typeof d.description==='string')z.short=d.description;
    for(const key of ['type','danger','card'])if(typeof d.meta?.[key]==='string')z[key]=d.meta[key];
    if(d.meta?.legend || d.meta?.myth || d.meta?.holidays){
      const lore=window.THAOS_WORLD?.lore?.[z.id];if(lore){if(d.meta.legend)lore.legend=d.meta.legend;if(d.meta.myth)lore.myth=d.meta.myth;if(d.meta.holidays)lore.holidays=d.meta.holidays.split('\n').filter(Boolean);}
    }
    if(d.meta?.history)(window.THAOS_WORLD_HISTORY||{})[z.id]=d.meta.history;
    if(d.meta?.motto)(window.THAOS_WORLD_MOTTO||{})[z.id]=d.meta.motto;
    if(d.meta?.pact && window.THAOS_WORLD?.kingdomDetails?.[z.id])window.THAOS_WORLD.kingdomDetails[z.id].pact=d.meta.pact;
  }
  if(document.getElementById('regionName')){
    const id=raceId||'ermest';const d=items.get(`world-${id}`);
    if(d){setId('regionName',d.title);setId('regionShort',d.description);setId('regionType',d.meta?.type);setId('regionHistory',d.meta?.history);setId('regionLegend',d.meta?.legend);setId('regionMyth',d.meta?.myth);setId('regionPact',d.meta?.pact);setId('regionMotto',d.meta?.motto);setImage(document.getElementById('regionArt'),d.imageUrl);document.getElementById('regionArtWrap')?.classList.toggle('has-art',imageIsAllowed(d.imageUrl));}
  }
  if(document.getElementById('atlasHotspots')){
    document.querySelectorAll('.atlas-hotspot').forEach(el=>{
      const d=items.get(`world-${el.dataset.id}`);if(!d)return;
      el.querySelector('span')?.replaceChildren(document.createTextNode(d.title||''));el.title=d.title||el.title;
    });
    // Atlas card renderer reads the existing zone objects, updated above. Refresh chosen zone.
    document.querySelector('.atlas-hotspot.is-active')?.click();
  }
}
docs().then(run).catch(error=>{if(location.hostname==='localhost')console.info('THAOS CMS: offline/static fallback',error.message)});

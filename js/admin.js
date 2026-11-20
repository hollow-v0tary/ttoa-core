import { getFirebaseClient } from './firebase-client.js';
import { getEntries, textSelector, imageIsAllowed } from './cms-manifest.js';

const $=id=>document.getElementById(id);
const entries=getEntries();
const byId=new Map(entries.map(e=>[e.id,e]));
const metaLabels={passive:'Название расовой особенности',effect:'Эффект расовой особенности',role:'Роль класса',resource:'Ресурс класса',type:'Тип территории',danger:'Уровень опасности',card:'Столица / ориентир',history:'История региона',legend:'Легенда',myth:'Миф',pact:'Пакт',motto:'Девиз региона',holidays:'Праздники (один на строку)'};
let client=null,user=null,admin=false,active=null,stored={},defaults=[],uploading=false;
const note=(message,isError=false,ok=false)=>{const el=$('adminAlert');el.textContent=message;el.className='admin-alert'+(isError?' is-error':ok?' is-ok':'')};
const make=(tag,attrs={},content)=>{const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){
  if(k==='className')el.className=v;else if(k==='htmlFor')el.htmlFor=v;else el.setAttribute(k,v);
}if(content!==undefined)el.textContent=content;return el};
const inputFor=(key,label,value,multiline=false,maxlen=4000)=>{
  const parent=make('div',{className:'admin-field'}),l=make('label',{htmlFor:`adminMeta-${key}`},label);
  const input=make(multiline?'textarea':'input',{id:`adminMeta-${key}`, 'data-meta-key':key,'maxlength':String(maxlen)});
  if(multiline)input.rows=4;input.value=value||'';parent.append(l,input);return parent;
};
const previewFor=e=>e.type==='core'?`./${e.page}`:e.type==='race'?`./race.html?id=${encodeURIComponent(e.rawId)}`:e.type==='class'?`./class.html?id=${encodeURIComponent(e.rawId)}`:e.type==='world'?`./region.html?id=${encodeURIComponent(e.rawId)}`:e.rawId==='races'?'./races.html':'./classes.html';

async function readEntry(id){
  active=byId.get(id);if(!active)return;
  note('Загружаю текущую публикацию…');
  try {
    const {firestoreSdk:dbsdk,db}=client;
    const snap=await dbsdk.getDoc(dbsdk.doc(db,'siteContent',id));
    if(active?.id!==id)return;
    stored=snap.exists()?snap.data():{};
    $('contentTitle').value=stored.title??active.title;
    $('contentDescription').value=stored.description??active.description;
    $('adminImageUrl').value=stored.imageUrl??active.imageUrl;
    updatePreview();
    const metaRoot=$('adminMetadata');metaRoot.replaceChildren();
    for(const [key,value] of Object.entries(active.meta||{})){
      const multiline=['effect','history','legend','myth','pact','holidays'].includes(key);
      metaRoot.append(inputFor(key,metaLabels[key]||key,stored.meta?.[key]??value,multiline,key==='holidays'?4000:2000));
    }
    $('adminPreview').href=previewFor(active);
    $('adminChapters').hidden=active.type!=='core';$('adminChapterList').replaceChildren();defaults=[];
    if(active.type==='core')await loadChapters(id);
    note(snap.exists()?'Загружена сохранённая версия. Изменения появятся на сайте после публикации.':'В Firebase ещё нет изменений для этой записи. Показывается исходное содержимое.');
  } catch(err){note(`Ошибка загрузки: ${err.message}`,true)}
}
async function loadChapters(id){
  try{
    const result=await fetch(`./${active.page}`,{cache:'no-store'});
    if(!result.ok)throw Error('HTTP '+result.status);
    const documentCopy=new DOMParser().parseFromString(await result.text(),'text/html');
    const els=[...documentCopy.querySelectorAll(textSelector)];
    const target=$('adminChapterList');
    defaults=els.map(el=>el.textContent.trim());
    for(const [i,txt] of defaults.entries()){
      const wrap=make('div',{className:'admin-chapter-field'});
      const label=make('label',{htmlFor:`block-${i}`},`${i+1}. ${els[i].tagName.toLowerCase()} · ${txt.slice(0,84)}`);
      const field=make('textarea',{id:`block-${i}`,'data-block-index':String(i),'maxlength':'6000'});field.value=stored.blocks?.[`b${i}`]??txt;field.rows=txt.length>250?5:3;
      wrap.append(label,field);target.append(wrap);
    }
    if(active?.id!==id)target.replaceChildren();
  }catch(error){note(`Не удалось открыть тексты глав: ${error.message}`,true)}
}
function updatePreview(){
  const url=$('adminImageUrl').value.trim();
  const img=$('adminImagePreview');
  img.hidden=!imageIsAllowed(url);
  if(!img.hidden)img.src=url;
}
function setGateMessage(t){$('adminStatus').textContent=t}
async function authenticate(){
  try{
    client=await getFirebaseClient();
    client.authSdk.onAuthStateChanged(client.auth,async current=>{
      user=current;
      if(!current){setGateMessage('Для доступа к панели сначала войдите в аккаунт THAOS.');$('adminEditor').hidden=true;$('adminGate').hidden=false;return;}
      $('adminUid').hidden=false;$('adminUid').textContent=`UID вашего аккаунта: ${current.uid}`;
      try{
        const snap=await client.firestoreSdk.getDoc(client.firestoreSdk.doc(client.db,'siteAdmins',current.uid));
        admin=snap.exists()&&snap.data()?.enabled===true;
        if(!admin){setGateMessage('Аккаунт зарегистрирован, но права Редактора ещё не назначены. Назначьте их в Firebase Console по инструкции ADMIN_SETUP.md.');$('adminEditor').hidden=true;$('adminGate').hidden=false;return;}
        $('adminGate').hidden=true;$('adminEditor').hidden=false;
        if(!$('adminEntry').value && entries.length) $('adminEntry').value=entries[0].id;
        await readEntry($('adminEntry').value);
      }catch(error){setGateMessage('Не удалось проверить права Редактора. Проверьте правила Firestore: '+error.message);$('adminGate').hidden=false;$('adminEditor').hidden=true;}
    });
  }catch(error){setGateMessage('Firebase недоступен: '+error.message)}
}
function fillDropdown(){
  let last='',group=null;
  for(const entry of entries){
    if(last!==entry.group){last=entry.group;group=make('optgroup',{label:last});$('adminEntry').append(group)}
    group.append(make('option',{value:entry.id},entry.title));
  }
  $('adminEntry').addEventListener('change',()=>readEntry($('adminEntry').value));
}
function savePayload(){
  const e=active;if(!e)throw Error('Не выбрана запись');
  const out={updatedAt:client.firestoreSdk.serverTimestamp()};
  for(const [formKey,key,original,max] of [
    ['contentTitle','title',e.title,150],['contentDescription','description',e.description,4000],['adminImageUrl','imageUrl',e.imageUrl,2048]]){
    const value=$(formKey).value.trim();
    if(value.length>max)throw Error(`${key}: превышена максимальная длина`);
    if(key==='imageUrl' && value && !imageIsAllowed(value))throw Error('Адрес изображения должен быть внутри ./assets/ или получен из Firebase Storage.');
    if(value && value!==String(original||''))out[key]=value;
  }
  const meta={};
  for(const node of document.querySelectorAll('[data-meta-key]')){
    const key=node.dataset.metaKey;
    if(node.value.trim() && node.value.trim()!==String(e.meta?.[key]||''))meta[key]=node.value.trim();
  }
  if(Object.keys(meta).length)out.meta=meta;
  if(e.type==='core'){
    const blocks={};
    for(const node of document.querySelectorAll('[data-block-index]')){
      const i=+node.dataset.blockIndex;
      if(node.value.trim() && node.value.trim()!==defaults[i])blocks[`b${i}`]=node.value.trim();
    }
    if(Object.keys(blocks).length)out.blocks=blocks;
  }
  return out;
}
async function save(){
  if(!admin||!user||!active)return;
  if(uploading){note('Дождитесь завершения загрузки изображения.',true);return;}
  const button=$('adminSave');button.disabled=true;
  try {
    const payload=savePayload();
    await client.firestoreSdk.setDoc(client.firestoreSdk.doc(client.db,'siteContent',active.id),payload);
    note('Изменения опубликованы. Обновите соответствующую страницу сайта.',false,true);
    // readEntry() would replace the success message; retain it here for clarity.
    stored=payload;
  }catch(error){note('Публикация не удалась: '+error.message,true)}finally{button.disabled=false}
}
async function reset(){
  if(!admin||!active||!confirm(`Сбросить публикацию для «${active.title}»? Все изменения этой записи будут удалены.`))return;
  try{await client.firestoreSdk.deleteDoc(client.firestoreSdk.doc(client.db,'siteContent',active.id));await readEntry(active.id);note('Возвращены исходные тексты и арт из файлов сайта.',false,true)}catch(error){note('Не удалось сбросить: '+error.message,true)}
}
async function optimizeImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Поддерживаются только JPEG, PNG и WebP.');
  if(file.size>15*1024*1024)throw Error('Исходный файл не должен превышать 15 МБ.');
  const bmp=await createImageBitmap(file);
  if(bmp.width>6000||bmp.height>6000)throw Error('Изображение слишком большое (максимум 6000 пикселей по стороне).');
  const scale=Math.min(1,1680/bmp.width,1050/bmp.height);const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));
  canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
  if(!blob)throw Error('Браузер не смог подготовить WebP.');
  if(blob.size>5*1024*1024)throw Error('Изображение после оптимизации превышает 5 МБ.');
  return blob;
}
async function uploadImage(file){
  if(!user||!admin||!active||!file)return;
  uploading=true;$('adminSave').disabled=true;const progress=$('adminUploadProgress');progress.hidden=false;progress.value=0;
  try{
    const blob=await optimizeImage(file);
    const storageSdk=await import('https://www.gstatic.com/firebasejs/13.3.0/firebase-storage.js');
    const storage=storageSdk.getStorage(client.app);
    const path=`site-assets/${user.uid}/${active.id}-${Date.now()}.webp`;
    const task=storageSdk.uploadBytesResumable(storageSdk.ref(storage,path),blob,{contentType:'image/webp'});
    const ref=await new Promise((resolve,reject)=>task.on('state_changed',s=>progress.value=Math.round((s.bytesTransferred/s.totalBytes)*100),reject,()=>resolve(task.snapshot.ref)));
    const url=await storageSdk.getDownloadURL(ref);
    $('adminImageUrl').value=url;updatePreview();note('Изображение загружено. Нажмите «Опубликовать изменения», чтобы использовать его на сайте.',false,true);
  }catch(error){note('Загрузка изображения не удалась: '+error.message,true)}finally{uploading=false;$('adminSave').disabled=false}
}
fillDropdown();$('adminSave').addEventListener('click',save);$('adminReset').addEventListener('click',reset);
$('adminImageUrl').addEventListener('input',updatePreview);
$('adminImageUpload').addEventListener('change',async e=>{await uploadImage(e.target.files?.[0]);e.target.value=''});
authenticate();

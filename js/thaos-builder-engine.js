/* THAOS Character Builder V2 — numeric candidate, pure calculation/validation layer.
   No Firestore dependencies; usable in a standalone demo and in the Player cabinet.
   Unresolved Path/True Class effects are NOT invented or applied. */
(function (global) {
  'use strict';
  const data = global.THAOS_BUILDER_DATA || {};
  const math = global.THAOS_MATH12 || {};
  const CL = () => global.THAOS_CLASSES || [];
  const RA = () => global.THAOS_RACES || [];
  const ATTRS = ['Сила','Ловкость','Телосложение','Интеллект','Мудрость','Харизма'];
  const C = id => (data.classes || {})[id];
  const race = id => (data.races || {})[id];
  const item = id => (data.items || {})[id];
  const kit = id => (data.kits || {})[id];
  const num = (x, defaultValue = 0) => Number.isFinite(Number(x)) ? Number(x) : defaultValue;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const levelTier = level => Math.floor((clamp(num(level,1),1,10)-1)/3);
  const pointCost = attr => ATTRS.reduce((a,k)=>a+(num(attr?.[k],1)*(num(attr?.[k],1)-1))/2,0);
  function starterKit(classId) {return (C(classId)?.kits||[])[0]||'';}
  function autoSkills(classId) {return C(classId)?.automaticSkills || [];}
  function skillCount(level){return Math.min(3,Math.max(1,clamp(num(level,1),1,10)));}
  function pathCount(level){return level<4?0:level<6?1:2;}
  function initBaseAttrs(attrs){return Object.fromEntries(ATTRS.map(k=>[k,clamp(Math.trunc(num(attrs?.[k],1)),1,4)]));}
  function calculateAttrs(base,boosts={}){
    const result={...initBaseAttrs(base)};
    for (const lvl of ['5','7','9']) if(boosts[lvl]&&num(lvl)>0&&ATTRS.includes(boosts[lvl])) result[boosts[lvl]]++;
    return result;
  }
  function makeGear(kitId) {
    const x = kit(kitId);
    return {equipped:[...(x?.equipped||[])],inventory:[...(x?.inventory||[])]};
  }
  function checkGear(equipped=[], inventory=[]) {
    const errors = [], slots = new Map(), handItems=[];
    for(const id of equipped){
      const x=item(id); if(!x){errors.push('Неизвестный предмет: '+id);continue;}
      if(x.slot==='inventory'){errors.push(x.name+' нельзя экипировать');continue;}
      if(x.slot==='hands'){handItems.push(x);continue;}
      const slot=x.slot||'special';
      if(slots.has(slot))errors.push('Одновременно экипированы два предмета в слот '+slot);
      slots.set(slot,id);
    }
    const hands=handItems.reduce((sum,x)=>sum+num(x.hands),0);
    if(hands>2)errors.push('Снаряжению требуется '+hands+' руки, а доступно две');
    const capacity=10;
    const occupied=inventory.reduce((sum,id)=>sum+Math.max(1,num(item(id)?.inventorySlots,1)),0);
    if(occupied>capacity)errors.push('Переполнен инвентарь: '+occupied+'/'+capacity+' слотов');
    if(equipped.length>20||inventory.length>20)errors.push('Достигнут предел списка предметов');
    return {errors,hands,occupied,capacity,slots};
  }
  function calc(c){
    const level=clamp(Math.trunc(num(c.level,1)),1,10),t=levelTier(level);
    const classDef=C(c.classId)||{manaStart:5,manaPerLevel:1},r=race(c.raceId)||{speedModifier:0};
    const equipped = c.equipped || [], inventory = c.inventory || [];
    const defenseTypes = {}, details=[];
    let hp=18+3*(level-1),mana=num(classDef.manaStart,5)+num(classDef.manaPerLevel,1)*(level-1);
    let speed=5+num(r.speedModifier),weaponId='',baseDamage=0;
    const appliedItemIds=new Set();
    for(const id of equipped){
      const x=item(id);if(!x)continue;
      if(appliedItemIds.has(id))continue;
      appliedItemIds.add(id);
      hp += num(x.hp);mana+=num(x.mana);speed+=num(x.speed);
      if(x.defense){
        const type=x.defenseType||(x.kind==='armor'?'armor':x.kind==='shield'?'shield':'ward');
        defenseTypes[type]=Math.max(num(defenseTypes[type]),num(x.defense));
      }
      if(x.kind==='weapon' && num(x.damage)>baseDamage){baseDamage=num(x.damage);weaponId=id;}
      if(x.hp||x.mana||x.speed||x.defense)details.push(x.name);
    }
    // Only unconditional, explicitly encoded passive modifiers may be applied.
    if(c.classId==='warrior'&&(c.baseSkills||[]).includes('Здоровое тело')){
      const bonus=2+t;hp+=bonus;details.push('Здоровое тело: +'+bonus+' HP');
    }
    const def=22+t+Object.values(defenseTypes).reduce((a,v)=>a+v,0);
    const speedFinal=clamp(speed,3,8);
    const attributes=c.attributes||calculateAttrs(c.attrBase,c.attrBoosts);
    const initiative=speedFinal+num(attributes.Ловкость,1);
    const gear=checkGear(equipped,inventory);
    return {level,tier:t,healthMax:Math.max(1,hp),manaMax:Math.max(0,mana),defense:def,speed:speedFinal,initiative,weaponDamage:baseDamage?baseDamage+2*t:0,weaponId,gear,defenseTypes,details,attrCost:pointCost(c.attrBase||attributes),formulaVersion:'core-math-1.2',mode:'partial'};
  }
  function issues(c){
    const errors=[];
    if(!String(c.name||'').trim())errors.push('Укажите имя персонажа');
    if(!RA().some(r=>r.id===c.raceId))errors.push('Выберите доступную расу');
    if(!CL().some(cl=>cl.id===c.classId))errors.push('Выберите доступный класс');
    if(c.level<1||c.level>10)errors.push('Уровень должен быть от 1 до 10');
    const base=initBaseAttrs(c.attrBase||c.attributes);
    if(pointCost(base)!==8)errors.push('Распределите ровно 8 очков атрибутов');
    if(ATTRS.some(k=>num(base[k])>4||num(base[k])<1))errors.push('Стартовые атрибуты должны быть от 1 до 4');
    for(const level of [5,7,9])if(c.level>=level&&!ATTRS.includes(c.attrBoosts?.[String(level)]))errors.push('Выберите повышение атрибута для уровня '+level);
    if(Object.values(c.attributes||{}).some(v=>num(v)>6))errors.push('Атрибут не может превышать 6');
    const cls=C(c.classId);
    const baseOptions=cls?.selectableSkills||[];
    const chosen=c.baseSkills||[];
    if(chosen.length!==skillCount(c.level))errors.push('Выберите '+skillCount(c.level)+' базовых навыка');
    if(new Set(chosen).size!==chosen.length||chosen.some(s=>!baseOptions.includes(s)))errors.push('Недопустимый или повторный базовый навык');
    if(c.level>=4){
      if(!Number.isInteger(c.pathIndex)||c.pathIndex<0||c.pathIndex>3&&!(c.pathIndex===4&&c._preapprovedHidden))errors.push('Выберите открытый Путь; скрытые открывает Мастер');
      const cl=CL().find(x=>x.id===c.classId);
      const path=global.THAOS_PATH_CONTENT?.[c.classId]?.[c.pathIndex];
      if(!cl?.paths?.[c.pathIndex])errors.push('Неизвестный Путь');
      const options=path?.skills||[];
      if((c.pathSkills||[]).length!==pathCount(c.level)||c.pathSkills.some(s=>!options.includes(s)))errors.push('Выберите '+pathCount(c.level)+' навыка Пути');
      if(new Set(c.pathSkills||[]).size!==(c.pathSkills||[]).length)errors.push('Нельзя повторно выбрать навык Пути');
    }
    if(!kit(c.kitId)||kit(c.kitId)?.classId!==c.classId)errors.push('Выберите стартовый комплект своего класса');
    errors.push(...checkGear(c.equipped,c.inventory).errors);
    return errors;
  }
  global.THAOS_BUILDER_ENGINE={data,math,ATTRS,C,race,item,kit,levelTier,pointCost,calculateAttrs,initBaseAttrs,starterKit,autoSkills,skillCount,pathCount,makeGear,checkGear,calc,issues};
  if(typeof module!=='undefined'&&module.exports)module.exports=global.THAOS_BUILDER_ENGINE;
})(typeof window!=='undefined'?window:globalThis);

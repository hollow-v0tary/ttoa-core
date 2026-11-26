// Run: node tests/check_builder_v2.js
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const env={window:{},globalThis:{},console};env.window.window=env.window;vm.createContext(env);
for(const fn of ['js/class-data.js','js/race-data.js','js/path-descriptions.js','js/thaos-builder-data.js','js/thaos-builder-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,fn),'utf8'),env);
const B=env.window.THAOS_BUILDER_ENGINE, classes=env.window.THAOS_CLASSES, races=env.window.THAOS_RACES;
let runs=0,broken=[];
const base={Сила:3,Ловкость:3,Телосложение:2,Интеллект:2,Мудрость:1,Харизма:1};
function assert(value,message){runs++;if(!value)broken.push(message)}
assert(classes.length===13,'13 active classes');assert(races.length===12,'12 active races');
assert(Object.keys(B.data.kits).length===26,'26 starter kits');assert(Object.keys(B.data.items).length===44,'44 equipment items');
for(const cl of classes){
  const def=B.C(cl.id);assert(!!def,'class '+cl.id+' in core math');
  for(const kitId of def.kits){
    const gear=B.makeGear(kitId),g=B.checkGear(gear.equipped,gear.inventory);
    assert(g.errors.length===0,`${cl.id}/${kitId} equipment: ${g.errors.join(' / ')}`);
    for(const rc of races){
      for(const level of [1,4,7,10]){
        const boosts=Object.fromEntries([5,7,9].filter(l=>level>=l).map(l=>[l, l===9?'Телосложение':'Сила']));
        const attrs=B.calculateAttrs(base,boosts);
        const obj={name:'THAOS Test',classId:cl.id,raceId:rc.id,level,attrBase:base,attrBoosts:boosts,attributes:attrs,
          baseSkills:def.selectableSkills.slice(0,B.skillCount(level)),pathIndex:level<4?-1:0,
          pathSkills:level<4?[]:env.window.THAOS_PATH_CONTENT[cl.id][0].skills.slice(0,B.pathCount(level)),kitId,...gear};
        const result=B.calc(obj),issues=B.issues(obj);
        assert(issues.length===0,`${cl.id}/${kitId}/${rc.id}/${level}: ${issues.join('|')}`);
        assert(result.healthMax>=18&&result.manaMax>=5&&result.defense>=22,'stats domain '+cl.id);
        assert(result.speed>=3&&result.speed<=8,'speed clamp '+cl.id);
        assert(result.gear.errors.length===0,'gear valid');
      }
    }
  }
}
const blocked={name:'test',classId:'summoner',raceId:'human',level:1,attrBase:base,attrBoosts:{},attributes:base,baseSkills:['Призыв Слуги'],pathIndex:-1,pathSkills:[],kitId:'summoner_bond',...B.makeGear('summoner_bond')};
assert(B.issues(blocked).length>0,'innate must not consume skill slot');
const twohand={equipped:['greatsword','shield'],inventory:[]};assert(B.checkGear(twohand.equipped,twohand.inventory).errors.length>0,'no 3 hands');
assert(B.calc({...blocked,baseSkills:['Командный Импульс']}).manaMax===9,'summoner mana from kit');
assert(B.pointCost(base)===8,'point budget =8');
assert(B.C('soul_devourer')===undefined,'draft class not in available builder data');
console.log(`THAOS Character Builder V2: ${runs} checks, ${broken.length} errors`);
for(const msg of broken.slice(0,30))console.log('FAIL:',msg);
if(broken.length)process.exit(1);

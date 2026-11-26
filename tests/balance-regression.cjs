const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.resolve(__dirname,'..');const window={};const ctx={window};
for(const file of ['js/class-data.js','js/balance-rules.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const B=window.THAOS_BALANCE,CL=window.THAOS_CLASSES;
assert.equal(CL.length,13);
assert.equal(CL.reduce((sum,c)=>sum+c.skills.length,0),65);
assert.equal(Object.values(B.catalog).reduce((sum,skills)=>sum+Object.keys(skills).length,0),65);
for(const c of CL){for(const skill of c.skills){const meta=B.getSkill(c.id,skill);assert.ok(meta?.mechanics?.length>20,`${c.id}/${skill}`);assert.ok(meta.limits);}}
for(const id of ['summoner','mechanist']){
 const cl=CL.find(c=>c.id===id);assert.equal(B.selectableBaseSkills(cl).length,4);
 assert.ok(cl.skills.includes(B.getFreeSkill(id)));
}
assert.equal(B.defenseTotal(28,[{type:'активная защита',value:2},{type:'активная защита',value:2},{type:'врождённая',value:1}]),31);
assert.equal(B.defenseTotal(28,[{type:'активная защита',value:2},{type:'активная защита',value:3},{type:'врождённая',value:1}]),32);
assert.equal(B.limits.quickShotDamage(6),3);assert.equal(B.limits.quickShotDamage(1),1);
assert.equal(B.canIssueCommand({commandLimit:2,commandsUsed:1,damagingUsed:1,isDamage:true}),false);
assert.equal(B.canIssueCommand({commandLimit:2,commandsUsed:1,damagingUsed:1,isDamage:false}),true);
assert.match(B.getSkill('rogue','Слабое место').mechanics,/1 наложения на одну цель за раунд/);
assert.match(B.getSkill('monk','Оглушающий удар').mechanics,/2 Ци/);
const player=fs.readFileSync(path.join(root,'js/player-app.js'),'utf8');
assert.match(player,/BR\?\.selectableBaseSkills/);
assert.match(player,/preview-base/);
assert.match(player,/Сохранить персонажа\?/);
const dossier=fs.readFileSync(path.join(root,'js/class-page.js'),'utf8');
assert.match(dossier,/THAOS_BALANCE\?\.getSkill/);
assert.ok(!dossier.includes('const knownSkillText = {'));
console.log('OK 13 классов, 65 навыков, typed defense, free abilities, action limits, preview and saved mechanics.');

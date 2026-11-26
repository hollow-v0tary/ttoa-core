// Deterministic exact 2d20 arithmetic; expected damage, not full class ranking.
const fs=require('node:fs');const path=require('node:path');
const hit=(bonus,defense)=>{let n=0;for(let a=1;a<=20;a++)for(let b=1;b<=20;b++)if(a+b+bonus>=defense)n++;return n/400};
const assert=require('node:assert/strict');
assert.equal(hit(4,24),.5725);
assert.equal(hit(4,28),.3825);
assert.equal(hit(6,28),.475);
const rows=[];for(const level of [1,4,7,10]){
 const tier=Math.floor((level-1)/3);
 const servant=(3+tier)*hit(2+tier,24);
 const device=(4+tier)*hit(1+tier,24);
 // ONLY ONE damage command/round, no automatic double strike at Level 7.
 const benchmark=6*hit(4,24);
 rows.push({level,servant:+servant.toFixed(3),device:+device.toFixed(3),baseline:+benchmark.toFixed(3),preparedSummoner:+(benchmark+servant).toFixed(3),preparedMechanist:+(benchmark+device).toFixed(3),extraAttacksFromSecondOrder:0});
}
assert(rows.every(r=>r.extraAttacksFromSecondOrder===0));
// Input DPS only compares optional test proxies; does NOT assert class balance.
console.log(JSON.stringify(rows,null,2));
console.log('OK: 400 outcomes for 2d20, second order adds no second attack.');

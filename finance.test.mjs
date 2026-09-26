import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSale,validateExpense,decide,totals,notification,parseExpenseCommand} from '../src/lib/rules.mjs';
const sale=(reference,actor,project,amount,split)=>({reference,kind:'sale',actor,proposal:validateSale({reference,customer:'Test customer',description:'Delivered service',project,amount,split},actor),decision:null});
const expense=(reference,amount,allocation)=>({reference,kind:'expense',actor:'kevin',proposal:validateExpense({reference,amount,allocation,category:'Materials',description:'Paid expense'},'kevin'),decision:allocation==='Company overhead'?{allocation}:null});
const approve=(t,input)=>{t.decision=decide(t,input,'svetlana');};
function test1(){return [sale('S01','richard','A',1000,[50,30,20]),sale('S02','anastasia','B',2000,[0,50,50]),expense('E01',120,'A'),expense('E02',80,'B'),expense('E03',100,'Company overhead')];}
function approve1(r){approve(r[0],{split:[50,30,20]});approve(r[1],{split:[20,40,40]});approve(r[2],{allocation:'A'});approve(r[3],{allocation:'A'});}
test('Test 1 before decisions: expenses reduce company; pending sales earn zero',()=>{
 const r=test1(),t=totals(r);assert.equal(t.income,0);assert.equal(t.commission,0);assert.equal(t.projects.A.result,0);assert.equal(t.projects.B.result,0);assert.equal(t.result,-30000);assert.equal(t.overhead,10000);assert.equal(t.awaiting,20000);
});
test('Test 1 approved results and unchanged original proposals',()=>{
 const r=test1();approve1(r);const t=totals(r);
 assert.equal(t.projects.A.result,70000);assert.equal(t.projects.B.result,180000);assert.equal(t.result,240000);assert.deepEqual(t.earned,[9000,11000,10000]);
 assert.equal(t.income,300000);assert.equal(t.commission,30000);assert.equal(t.projects.A.expenses,20000);assert.equal(t.awaiting,0);
 assert.deepEqual(r[1].proposal.split,[0,50,50]);assert.equal(r[3].proposal.allocation,'B');
});
test('Test 2 cumulative totals, pending exclusions and reconciliation',()=>{
 const r=test1();approve1(r);r.push(sale('S03','jean_claude','A',1500,[40,40,20]),sale('S04','richard','B',800,[25,25,50]),sale('S05','richard','B',600,[100,0,0]),expense('E04',250,'B'),expense('E05',90,'A'),expense('E06',60,'Company overhead'),expense('E07',140,'A'));
 approve(r[5],{split:[20,30,50]});approve(r[6],{split:[25,25,50]});approve(r[8],{allocation:'B'});approve(r[9],{allocation:'B'});
 const t=totals(r);assert.deepEqual(t.projects.A,{income:250000,commission:25000,expenses:20000,result:205000});assert.deepEqual(t.projects.B,{income:280000,commission:28000,expenses:34000,result:218000});assert.equal(t.result,393000);assert.equal(t.overhead,16000);assert.equal(t.awaiting,14000);assert.deepEqual(t.earned,[14000,17500,21500]);assert.equal(t.projects.A.result+t.projects.B.result-t.overhead-t.awaiting,t.result);
 assert.equal(r[7].decision,null);assert.equal(r[11].decision,null);assert.match(notification(r[5],'approved'),/changed/);assert.match(notification(r[5],'approved'),/€150.00/);assert.match(notification(r[5],'approved'),/€75.00/);assert.match(notification(r[9],'approved'),/Proposed: A\nApproved: B/);
});
test('denied actions leave records and control totals unchanged; approval is idempotent',()=>{
 const r=test1();approve1(r);const before=JSON.stringify(r),t=totals(r);
 assert.throws(()=>decide(r[0],{split:[100,0,0]},'richard'));
 assert.throws(()=>validateSale(r[0].proposal,'kevin'));
 assert.throws(()=>validateSale({...r[0].proposal,split:[60,30,20]},'richard'));
 for(const amount of [0,'',undefined])assert.throws(()=>validateExpense({...r[2].proposal,amount},'kevin'));
 for(const actor of ['richard','anastasia','jean_claude','svetlana'])assert.throws(()=>validateExpense(r[2].proposal,actor));
 approve(r[0],{split:[100,0,0]});approve(r[2],{allocation:'B'});assert.equal(JSON.stringify(r),before);assert.deepEqual(totals(r),t);
});
test('arbitrary future values drive results, no assignment constants',()=>{
 const r=[sale('NEW-77','anastasia','B','37.91',[17.25,12.75,70]),expense('NEW-78','2.73','A')];approve(r[0],{split:[17.25,12.75,70]});
 assert.equal(totals(r).result,3791-379-273);assert.equal(totals(r).projects.A.result,0);approve(r[1],{allocation:'A'});assert.equal(totals(r).result,3791-379-273);assert.equal(totals(r).projects.A.result,-273);
});
test('Telegram expense parser shares website validation and notification payload',()=>{
 const p=parseExpenseCommand('/expense | E99 | Taxi | 80 | Travel | B');assert.deepEqual(validateExpense(p,'kevin'),{reference:'E99',description:'Taxi',amount:80,category:'Travel',allocation:'B'});
 const t=expense('E99',80,'B');assert.match(notification(t,'submitted'),/Awaiting allocation/);assert.match(notification(t,'submitted'),/€80.00/);
});

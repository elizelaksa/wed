import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSale, commission, parseSaleCommand, requireRole } from '../src/lib/rules.mjs';
const sale = {reference:'PRACTICE1', customer:'Practice customer', description:'Practice service', project:'A', amount:'123.45', split:['50','30','20']};
test('sale validation uses dynamic input and rejects invalid amounts and shares',()=>{
  assert.equal(validateSale(sale,'richard').amount,123.45);
  for (const amount of ['', '0', '-1', 'NaN', '1.001']) assert.throws(()=>validateSale({...sale,amount},'richard'));
  assert.throws(()=>validateSale({...sale,split:[60,30,20]},'richard'));
  assert.throws(()=>validateSale({...sale,customer:''},'richard'));
});
test('processing layer denies incompatible roles',()=>{
  for(const actor of ['kevin','svetlana','unknown']) assert.throws(()=>validateSale(sale,actor));
  assert.throws(()=>requireRole('richard','manager'));
});
test('commission pool rounds to cents and conserves cents with tie priority',()=>{
  assert.deepEqual(commission(100000,[50,30,20]),{pool:10000,earned:[5000,3000,2000]});
  assert.deepEqual(commission(10,[50,50,0]),{pool:1,earned:[0,1,0]});
  assert.deepEqual(commission(10,[0,50,50]),{pool:1,earned:[0,0,1]});
  for(let amount=1; amount<10000; amount+=17){
    const c=commission(amount,[33.33,33.33,33.34]);
    assert.equal(c.earned.reduce((a,b)=>a+b,0),c.pool);
  }
});
test('Telegram adapter produces the same validation input',()=>{
  const input=parseSaleCommand('/sale | PRACTICE1 | Practice customer | A | Practice service | 123.45 | 50,30,20');
  assert.deepEqual(validateSale(input,'richard'),validateSale(sale,'richard'));
});

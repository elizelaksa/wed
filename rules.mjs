export const employees = [
  { id: 'richard', name: 'Richard “Call Me Dick” Darling', role: 'sales' },
  { id: 'anastasia', name: 'Anastasia Ferrari', role: 'sales' },
  { id: 'jean_claude', name: 'Jean-Claude Bērziņš', role: 'sales' },
  { id: 'kevin', name: 'Kevin von Whatever', role: 'expense' },
  { id: 'svetlana', name: 'Svetlana de Monte Carlo', role: 'manager' },
];
export function employee(id) {
  const found = employees.find(e => e.id === id);
  if (!found) throw new Error('Choose a valid demonstration role.');
  return found;
}
export function requireRole(id, role) {
  if (employee(id).role !== role) throw new Error('This role is not permitted to perform this action.');
}
export function decimalUnits(value, label) {
  const raw = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error(`${label} must be a number with at most two decimal places.`);
  const [whole, fraction = ''] = raw.split('.');
  const units = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(units)) throw new Error(`${label} is too large.`);
  return units;
}
export function splitUnits(values) {
  if (!Array.isArray(values) || values.length !== 3) throw new Error('Provide all three commission percentages.');
  const units = values.map(v => decimalUnits(v, 'Commission percentage'));
  if (units.some(v => v > 10000) || units.reduce((a,b) => a+b, 0) !== 10000)
    throw new Error('Commission percentages must each be 0–100% and total exactly 100%.');
  return units;
}
export function commission(amountCents, percentages) {
  const shares = splitUnits(percentages);
  const pool = Math.floor((amountCents + 5) / 10);
  const earned = shares.map(s => Number((BigInt(pool) * BigInt(s) + 5000n) / 10000n));
  const winner = shares.indexOf(Math.max(...shares));
  earned[winner] += pool - earned.reduce((a,b) => a+b, 0);
  return { pool, earned };
}
function required(value, label, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new Error(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
export function validateSale(input, actor) {
  requireRole(actor, 'sales');
  const reference = required(input.reference, 'Reference', 40).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(reference)) throw new Error('Reference may contain letters, numbers, hyphens and underscores.');
  const amountCents = decimalUnits(input.amount, 'Amount');
  if (amountCents <= 0 || amountCents > 9999999999) throw new Error('Amount must be greater than zero and less than €100,000,000.');
  if (!['A','B'].includes(input.project)) throw new Error('Choose Project A or Project B.');
  const split = splitUnits(input.split).map(v => v / 100);
  return { reference, customer: required(input.customer, 'Customer', 200), description: required(input.description, 'Description'), project: input.project, amount: amountCents / 100, split };
}
export function parseSaleCommand(text) {
  const fields = text.split('|').map(s => s.trim());
  if (fields.length !== 7 || fields[0] !== '/sale')
    throw new Error('Use /sale | reference | customer | A or B | description | amount | Richard%,Anastasia%,Jean-Claude%');
  return { reference:fields[1], customer:fields[2], project:fields[3], description:fields[4], amount:fields[5], split:fields[6].split(',').map(s=>s.trim()) };
}
export const euros = value => new Intl.NumberFormat('en-IE', { style:'currency', currency:'EUR' }).format(value);

export function validateExpense(input, actor) {
 requireRole(actor,'expense');
 const reference=required(input.reference,'Reference',40).toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9_-]*$/.test(reference)) throw new Error('Invalid reference.');
 const cents=decimalUnits(input.amount,'Amount');
 if(cents<=0||cents>9999999999) throw new Error('Amount must be greater than zero and less than €100,000,000.');
 if(!['Materials','Travel','Other'].includes(input.category)) throw new Error('Choose Materials, Travel or Other.');
 if(!['A','B','Company overhead'].includes(input.allocation)) throw new Error('Choose A, B or Company overhead.');
 return {reference,description:required(input.description,'Description'),amount:cents/100,category:input.category,allocation:input.allocation};
}
export function decide(transaction,input,actor) {
 requireRole(actor,'manager');
 if(transaction.decision) return transaction.decision;
 if(transaction.kind==='sale') {
  const split=splitUnits(input.split).map(v=>v/100);
  return {split,...commission(decimalUnits(transaction.proposal.amount,'Amount'),split)};
 }
 if(!['A','B','Company overhead'].includes(input.allocation)) throw new Error('Choose A, B or Company overhead.');
 return {allocation:input.allocation};
}
export function parseExpenseCommand(text) {
 const f=text.split('|').map(s=>s.trim());
 if(f.length!==6||f[0]!=='/expense') throw new Error('Use /expense | reference | description | amount | Materials, Travel or Other | A, B or Company overhead');
 return {reference:f[1],description:f[2],amount:f[3],category:f[4],allocation:f[5]};
}
export function status(t) {return t.kind==='sale'?(t.decision?'Approved':'Pending approval'):(t.decision?'Allocated':'Awaiting allocation');}
export function totals(records) {
 const projects={A:{income:0,commission:0,expenses:0,result:0},B:{income:0,commission:0,expenses:0,result:0}};
 const earned=[0,0,0];let overhead=0,awaiting=0,allExpenses=0;
 for(const t of records) {
  const cents=decimalUnits(t.proposal.amount,'Amount');
  if(t.kind==='sale'&&t.decision) {
   const p=projects[t.proposal.project];p.income+=cents;p.commission+=t.decision.pool;
   t.decision.earned.forEach((v,i)=>earned[i]+=v);
  } else if(t.kind==='expense') {
   allExpenses+=cents;
   if(!t.decision) awaiting+=cents;
   else if(t.decision.allocation==='Company overhead') overhead+=cents;
   else projects[t.decision.allocation].expenses+=cents;
  }
 }
 for(const p of Object.values(projects))p.result=p.income-p.commission-p.expenses;
 return {projects,earned,overhead,awaiting,allExpenses,income:projects.A.income+projects.B.income,commission:earned.reduce((a,b)=>a+b,0),result:projects.A.income+projects.B.income-earned.reduce((a,b)=>a+b,0)-allExpenses};
}
export function notification(t,event) {
 const p=t.proposal,d=t.decision;
 if(event==='submitted')return `${t.kind==='sale'?'Sale':'Expense'} ${t.reference} recorded.\n${euros(p.amount)} · ${t.kind==='sale'?'Project '+p.project:p.allocation}\nStatus: ${status(t)}`;
 if(t.kind==='sale') {
  const changed=p.split.some((v,i)=>v!==d.split[i]);
  return `Sale ${t.reference} approved — commission split ${changed?'changed':'unchanged'}.\nSale ${euros(p.amount)}; total commission ${euros(d.pool/100)}.\n`+['Richard','Anastasia','Jean-Claude'].map((name,i)=>`${name}: ${p.split[i]}% → ${d.split[i]}% (${euros(d.earned[i]/100)})`).join('\n');
 }
 return `Expense ${t.reference} — allocation ${p.allocation===d.allocation?'confirmed unchanged':'changed'}.\n${euros(p.amount)}: ${p.description}\nProposed: ${p.allocation}\nApproved: ${d.allocation}`;
}

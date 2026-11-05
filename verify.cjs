const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=__dirname,context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'cards.js'),'utf8'),context);
const cards=context.window.CARDS;
assert.equal(cards.length,78);
const counts={};
for(const [i,c] of cards.entries()){
  assert.equal(c.id,i);
  assert.equal(c.keywords.length,3);
  assert.equal(c.choices.length,3);
  for(const field of ['name','upright','reversed','companion','affirmation','question','action']) assert.ok(typeof c[field]==='string'&&c[field].trim(),`${i}: ${field}`);
  for(const asset of [c.image,c.thumb]) assert.ok(fs.statSync(path.join(root,asset)).size>1000,asset);
  counts[c.suit]=(counts[c.suit]||0)+1;
}
assert.deepEqual(counts,{'大阿爾克那':22,'權杖':14,'聖杯':14,'寶劍':14,'錢幣':14});
assert.equal(fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('.webp')).length,158);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,resource] of html.matchAll(/(?:src|href)="([^"#][^\"]*)"/g)) if(!/^https?:/.test(resource)) assert.ok(fs.existsSync(path.join(root,resource.split(/[?#]/)[0])),resource);
for(const file of ['app.js','journal-cards.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'));
assert.ok(fs.existsSync(path.join(root,'.nojekyll')));
console.log(JSON.stringify({result:'PASS',cards:cards.length,categories:counts,images:158,entry:'index.html'},null,2));

import{test}from'node:test';import assert from'node:assert/strict';import handler from'../api/game.js';
function response(){return{code:0,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
test('no acepta métodos no previstos',async()=>{const r=response();await handler({method:'DELETE',headers:{}},r);assert.equal(r.code,405)});
test('POST rechaza origen cruzado sin consultar DB',async()=>{const old=process.env.DATABASE_URL;process.env.DATABASE_URL='configured';try{const r=response();await handler({method:'POST',headers:{host:'game.vercel.app',origin:'https://attacker.test','content-type':'application/json'}},r);assert.equal(r.code,403);}finally{if(old)process.env.DATABASE_URL=old;else delete process.env.DATABASE_URL;}});

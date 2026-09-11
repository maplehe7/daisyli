'use strict';
const assert=require('node:assert/strict');
const apiPath=require.resolve('../site/idx.js');
const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const record=(n,extra={})=>({Id:guid(n),addre:`${n} Main Street, Irvine, CA`,msText:'Sold',maxPrice:'1000000',isManual:'0',...extra});
const fresh=()=>{delete require.cache[apiPath];return require(apiPath);};
const originalFetch=global.fetch;

async function run(){
  let api=fresh();
  assert.equal(api.representsDaisy({ListAgentDRE:'01986831'}),true);
  assert.equal(api.representsDaisy({CoAgentDRE:'01986831'}),true);
  assert.equal(api.representsDaisy({SaleAgentKey:'01986831'}),true);
  assert.equal(api.representsDaisy({ListAgentDRE:'11111111',agentInfo:{dreNumber:'01986831'}}),false);
  const sold=Array.from({length:22},(_,i)=>record(i+1));
  sold[1].isManual='1';
  const current=[record(1,{OBCol:'1',msText:'Active'}),record(23,{OBCol:'1',msText:'Pending'}),record(24,{OBCol:'2',msText:'Active'})];
  const calls=[];
  global.fetch=async(url,options={})=>{
    calls.push(url);
    const parsed=new URL(url,'https://example.com');
    if(parsed.pathname.endsWith('/property')){
      const id=parsed.searchParams.get('id');
      assert.notEqual(id,guid(24),'Regional recommendations must not enter the portfolio');
      assert.notEqual(id,guid(2),'Keep manually curated sold records even without MLS detail');
      return {ok:true,json:async()=>[id===guid(3)?{ListAgentDRE:'11111111',agentInfo:{dreNumber:'01986831'}}:{SaleAgentKey:'01986831'}]};
    }
    const params=JSON.parse(options.body);
    assert.equal(params.query,'/price_orderBy/desc_order','Do not turn portfolio filtering into a regional search');
    const source=params.pageType==='soldproperties'?sold:current;
    return {ok:true,json:async()=>({listings:source.slice((params.page-1)*20,params.page*20).map(x=>({...x,overall_count:String(params.pageType==='soldproperties'?22:1000)}))})};
  };
  const items=await api.portfolio();
  assert.equal(items.length,22,'Deduplicate the same listing, keep the second page, and exclude an unrelated agent');
  assert.equal(items.find(x=>x.id===guid(1)).status,'Active','Keep the current record when a listing appears in both collections');
  assert.ok(items.some(x=>x.id===guid(22)),'Read every sold page');
  assert.ok(items.some(x=>x.id===guid(23)),'Include current pending listings');
  assert.ok(items.some(x=>x.id===guid(2)),'Keep manual history');
  assert.ok(!items.some(x=>x.id===guid(3)),'Website contact agent does not prove transaction involvement');
  const count=calls.length;
  assert.equal(await api.portfolio(),items);
  assert.equal(calls.length,count,'Changing city/sort should reuse the verified collection');

  api=fresh();
  global.fetch=async()=>({ok:false,status:502,json:async()=>({error:'Unavailable'})});
  await assert.rejects(()=>api.portfolio(),/Unavailable/,'Do not publish a partial collection when a source fails');
  console.log('Portfolio checks passed: transaction identity, buyer/co-agent roles, manual history, pagination, deduplication, regional exclusion, caching, and source failures.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{global.fetch=originalFetch;});

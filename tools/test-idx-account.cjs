'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {runInNewContext}=require('node:vm');

// Exercise the actual account renderer with an isolated DOM/API fixture.
// No real session, browser profile, network request or account mutation is used.
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function render(source,query='',{signedIn=true,total=41,saved=true}={}){
  const calls=[];
  const content={innerHTML:'',insertAdjacentHTML(_position,html){this.innerHTML+=html;}};
  const container={innerHTML:'',isConnected:true,querySelector:()=>content,querySelectorAll:()=>[]};
  const document={body:{append(){}},createElement:()=>({}),querySelectorAll:()=>[],addEventListener(){},getElementById:id=>id==='account-page'?container:null};
  const context={window:{},document,location:new URL('https://example.test/account'+query),URL,URLSearchParams,
    escapeHTML,applyLanguage(){},idxLoading:()=>'',cards:()=>'<article>Saved home</article>',bindIdxImages(){},
    DaisyIDX:{
      async request(action,params){
        calls.push({action,params});
        if(action==='session')return {user:signedIn?{firstName:'Test',lastName:'Visitor',email:'visitor@example.test'}:null,saved:saved?['HOME-1']:[]};
        if(action==='account/searches')return {rows:[{id:1,searchName:'Irvine homes',searchUrl:'results',sendEmail:'0'}],total};
        throw Error('Unexpected request in isolated test: '+action);
      },
      async listings(query,params){calls.push({action:'listings',query,params});return {items:[],total};}
    }
  };
  runInNewContext(source,context);
  await context.window.DaisyAccount.bind();
  return {html:container.innerHTML+content.innerHTML,calls};
}
function pagerURLs(html){
  return [...html.matchAll(/href="([^"]*)"/g)].map(match=>new URL(match[1].replace(/&amp;/g,'&'),'https://example.test')).filter(url=>url.searchParams.has('page'));
}
async function check(source,label){
  for(const tab of ['homes','searches']){
    const first=await render(source,'?tab='+tab);
    assert.equal(pagerURLs(first.html)[0].searchParams.get('page'),'2',label+' next page');
    assert.equal(pagerURLs(first.html)[0].searchParams.get('tab'),tab,label+' tab retained');
    const middle=await render(source,'?tab='+tab+'&page=2');
    assert.deepEqual(pagerURLs(middle.html).map(url=>url.searchParams.get('page')),['1','3'],label+' previous/next');
    const last=await render(source,'?tab='+tab+'&page=3');
    assert.deepEqual(pagerURLs(last.html).map(url=>url.searchParams.get('page')),['2'],label+' last page');
  }
  const profile=await render(source,'?tab=profile');
  assert.ok(profile.html.includes('visitor@example.test'));
  assert.equal(pagerURLs(profile.html).length,0);
  assert.ok(!profile.calls.some(call=>call.action==='listings'||call.action==='account/searches'));
  for(const options of [{total:20},{saved:false},{signedIn:false}]){
    assert.equal(pagerURLs((await render(source,'?tab=homes',options)).html).length,0);
  }
  assert.ok((await render(source,'',{signedIn:false})).html.includes('Sign in'));
  console.log(label+': legitimate tabs, pagination, empty and signed-out controls passed.');

  const payloads=[
    '"><img src=x onerror="globalThis.accountXss=1">',
    '"><svg onload="globalThis.accountXss=1">',
    'homes" autofocus onfocus="globalThis.accountXss=1',
    'homes&tab=profile',
    '%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E',
    'HOMES', '__proto__', 'constructor', 'unknown', ''
  ];
  const queries=payloads.map(tab=>'?'+new URLSearchParams({tab,page:'2'}));
  queries.push('?tab=%22%3E%3Cimg%20src%3Dx%20onerror%3D%22globalThis.accountXss%3D1%22%3E&page=2');
  queries.push('?tab=homes&tab=%22%3E%3Csvg%20onload%3Dalert(1)%3E&page=2');
  for(const query of queries){
    const {html,calls}=await render(source,query);
    assert.ok(!/<(?:img|svg)\b|\bon(?:error|load|focus)\s*=|\bautofocus\b/i.test(html),label+': URL data must not create active markup');
    const urls=pagerURLs(html);
    assert.equal(urls.length,2);
    for(const url of urls){
      assert.equal(url.origin,'https://example.test');
      assert.equal(url.pathname,'/account');
      assert.equal(url.searchParams.get('tab'),'homes');
      assert.deepEqual([...url.searchParams.keys()],['tab','page']);
    }
    assert.ok(html.includes('tab=homes" aria-current="page"'),label+': invalid tabs use saved homes');
    assert.ok(calls.some(call=>call.action==='listings'&&call.params.page===2));
  }
  console.log(label+': '+queries.length+' malicious/unknown query controls passed.');
}
(async()=>{
  for(const file of ['site/idx-account.js','web/idx-account.js'])await check(readFileSync(path.join(__dirname,'..',file),'utf8'),file);
  console.log('Account security regression checks passed.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});

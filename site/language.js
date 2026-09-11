/* Shared browser/server language negotiation. Only English and Simplified Chinese are available. */
(function(root){
  'use strict';
  function supported(tags){
    for(const tag of tags||[]){
      if(typeof tag!=='string')continue;
      const primary=tag.toLowerCase().trim().split('-')[0];
      if(primary==='zh')return 'zh';
      if(primary==='en')return 'en';
    }
    return null;
  }
  function acceptLanguage(header){
    const preferences=String(header||'').split(',').map((entry,index)=>{
      const [tag,...parameters]=entry.trim().split(';');
      const quality=parameters.find(p=>/^\s*q\s*=/i.test(p));
      const q=quality?Number(quality.split('=')[1]):1;
      return {tag,q,index};
    }).filter(p=>p.tag&&Number.isFinite(p.q)&&p.q>0&&p.q<=1).sort((a,b)=>b.q-a.q||a.index-b.index);
    return supported(preferences.map(p=>p.tag));
  }
  function select({explicit,saved,languages=[],headerLanguage}={}){
    if(['en','zh'].includes(explicit))return explicit;
    if(['en','zh'].includes(saved))return saved;
    return supported(languages)||supported([headerLanguage])||'en';
  }
  const api={supported,acceptLanguage,select};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DaisyLanguage=api;
})(typeof window==='undefined'?globalThis:window);

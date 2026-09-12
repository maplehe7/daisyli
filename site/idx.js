/* Listing and account data for the redesigned property pages. */
(function (root) {
  'use strict';
  const origin = 'https://search.daisylibroker.com';
  const cities = {'Irvine':'210','Newport Beach':'327','Lake Forest':'244','Coto de Caza':'111'};
  const types = {home:['home'],condo:['Townhouse'],mobile:['mobile'],multiFamily:['multiFamily'],rental:['rental'],commercial:['commercial'],land:['land'],business:['business'],other:['mobile','multiFamily','rental','commercial','land','business']};
  const statuses = {active:['active'],pending:['pending','back-offers'],sold:['sold'],short:['short-sales'],reo:['foreclosures']};
  const sorts = {price:'price',sqft:'sqFt',lot:'lotSqFt',year:'yearBuilt',stories:'story',updated:'lastModified'};
  const properties=new Map();
  const photoRequests=new Map();
  let allCitiesPromise;
  const numeric = value => Number(String(value ?? '').replace(/[^\d.-]/g,'')) || 0;

  function photoURL(value) {
    const raw=String(value||'').trim();
    if(!raw) return '';
    try {
      const url=new URL(raw,origin);
      if(!['http:','https:'].includes(url.protocol)) return '';
      url.protocol='https:';
      if(/\/DOCUMENT-Pdf\//i.test(url.pathname)||/\.pdf$/i.test(url.pathname)) return '';
      return url.href;
    } catch {return '';}
  }
  function listingPhoto(property) {
    const values=Array.isArray(property.firstImage)?property.firstImage:[property.firstImage];
    return values.map(photoURL).find(Boolean)||'';
  }
  async function photoCandidates(id) {
    const key=String(id).toUpperCase(),previous=photoRequests.get(key);
    if(previous&&previous.until>Date.now())return previous.promise;
    const entry={until:Date.now()+60000};
    entry.promise=property(key,{signal:AbortSignal.timeout(15000)}).then(raw=>{
      const values=Array.isArray(raw.firstImage)?raw.firstImage:[raw.firstImage];
      return [...new Set(values.map(photoURL).filter(Boolean))];
    }).catch(error=>{if(photoRequests.get(key)===entry)photoRequests.delete(key);throw error;});
    if(photoRequests.size>=100)photoRequests.delete(photoRequests.keys().next().value);
    photoRequests.set(key,entry);return entry.promise;
  }

  function filters(input, {requireLocation = true} = {}) {
    const params = input instanceof URLSearchParams ? input : new URLSearchParams(input);
    const get = name => (params.get(name) || '').trim();
    const segments = [];
    const add = (name,value) => {if(value !== '' && value != null) segments.push(encodeURIComponent(String(value))+'_'+name);};
    const min=get('min'), max=get('max');
    if(min && max && numeric(min)>numeric(max)) throw Error('Choose a maximum price greater than or equal to the minimum.');
    const specific = ['zip','address','mls'].filter(name=>get(name));
    if(specific.length>1) throw Error('Use one ZIP, street address, or MLS search at a time.');
    if(get('changed') && get('sold-within')) throw Error('Choose either new/price-changed homes or recently sold homes.');
    const selectedTypes=params.getAll('type').flatMap(value=>types[value]||[]);
    const selectedStatuses=params.getAll('status').flatMap(value=>statuses[value]||[]);
    if(!selectedTypes.length && !get('address') && !get('mls')) throw Error('Choose at least one property type.');
    if(!selectedStatuses.length && !get('changed') && !get('sold-within') && !get('address') && !get('mls')) throw Error('Choose at least one listing status.');
    add('beds',get('beds'));
    add('baths',get('baths'));
    if(get('exact-beds') && get('beds')) add('exactBeds','true');
    if(get('tract')) add('tractCode',get('tract').replace(/-|–/g,'.dashHP.').replace(/ |\//g,'-'));
    if(get('changed') || get('sold-within')) add('days',get('changed')||get('sold-within'));
    if(get('zip')) add('zip',get('zip').replace(/ |\//g,'-'));
    if(get('address')) add('address',get('address').replace(/ |\//g,'-').replace(/#/g,'.unit.'));
    if(get('mls')) add('mlsNumber',get('mls').replace(/ |\//g,'-'));
    if(get('pool')) add('pool',get('pool')==='yes'?'1':'2');
    for(const [ui,native] of [['view','view'],['garage','garage'],['year','yearBuilt'],['sqft','bldgsqft'],['lot','lotsqft'],['stories','stories']]) {
      let value=get(ui);if(value&&['year','lot'].includes(ui)&&/^\d+$/.test(value))value+='p';add(native,value);
    }
    if(get('keyword')) add('keyword',get('keyword').replace(/ |\//g,''));
    if(get('sort')) add('orderBy',sorts[get('sort')]||'price');
    if(get('order')) add('order',get('order')==='asc'?'asc':'desc');
    if(get('virtual-tour')) add('isOnlyVtour','yes');
    if(min || max) add('price',(min||'0')+(max?'-'+max:''));
    if(!get('address') && !get('mls')) {
      add('homeType',selectedTypes.join(','));
      add('homeStatus',get('changed')?'new':get('sold-within')?'sOnly':selectedStatuses.join(','));
    }
    if(get('bounds'))add('rect',get('bounds'));
    if(get('polygon'))add('polygon',get('polygon'));
    if(!specific.length&&!get('bounds')&&!get('polygon')) {
      const names=params.getAll('search-city').concat(params.getAll('city')).filter(Boolean);
      const ids=names.map(city=>cities[city]||(/^\d+$/.test(city)?city:''));
      if(ids.some(id=>!id))throw Error('Choose a city from the list.');
      if(ids.length||requireLocation)add('city',ids.length?[...new Set(ids)].join(','):['210','327','244','111'].join(','));
    }
    if(get('extra'))segments.push(...get('extra').split('/').filter(Boolean));
    return segments.length?'/'+segments.join('/'):'';
  }
  function resultsURL(query='',pageType='results') {
    return origin+'/idx/'+pageType+query;
  }
  function detailURL(property) {
    const address=String(property.addre||property.address||'Property').trim().replace(/,| /g,'-');
    return origin+'/idx/homedetails/'+encodeURIComponent(address)+'/'+encodeURIComponent(property.Id||property.id)+'$detailViewId';
  }
  function propertyURL(property){return '/property/'+encodeURIComponent(property.Id||property.id||property.proId);}
  function normalize(property) {
    const address=String(property.addre||'').split(',');
    const image=listingPhoto(property)||properties.get(String(property.Id).toUpperCase())?.image||'';
    const result={
      id:property.Id,address:address[0].trim(),city:(address[1]||'').trim(),zip:String(property.zip||property.zipCode||'').trim().replace(/-$/,''),
      price:numeric(property.msText==='Sold'?property.soldPrice||property.maxPrice:property.maxPrice||property.currentPrice),
      beds:numeric(property.beds),baths:numeric(property.baths),sqft:numeric(property.sqFt),lot:numeric(property.lotSqft),
      year:numeric(property.yearBuilt),stories:numeric(property.story),status:property.msText||'View status',mls:property.mlsnumber||'',
      image,source:detailURL(property),live:true,
      latitude:numeric(property.latitude),longitude:numeric(property.longitude),virtualTour:photoURL(property.virtualTour),openStart:property.openStart||'',openEnd:property.openEnd||'',openHid:property.openHid||'',
      systemId:String(property.systemId||''),updated:property.lastUpdateDate?.date||'',
      collectionOrder:numeric(property.OBCol),isManual:String(property.isManual)==='1'
    };properties.set(String(result.id).toUpperCase(),result);return result;
  }
  async function request(action,params={}, {signal,method='POST'}={}) {
    const release = root.DaisyHeroVideo?.contentRequest?.();
    try {
    const response=await fetch('/api/idx/'+action+(method==='GET'?'?'+new URLSearchParams(params):''),{method,credentials:'same-origin',signal,headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?JSON.stringify(params):undefined});
    const data=await response.json();if(!response.ok){const error=new Error(data.error||'Please try again.');error.status=response.status;throw error;}return data;
    } finally { release?.(); }
  }
  async function citiesList(){
    if(!allCitiesPromise)allCitiesPromise=request('cities',{}, {method:'GET'}).then(data=>{for(const city of data.cities)cities[city.name]=String(city.value);return data.cities;}).catch(error=>{allCitiesPromise=null;throw error;});
    return allCitiesPromise;
  }
  async function property(id,{signal}={}){const data=await request('property',{id},{signal,method:'GET'});return data[0];}
  async function listings(query='', {page=1,pageType='results',signal,map=false}={}) {
    if(!['results','featuredproperties','soldproperties','newlistings','openhouses','listingalerts','pricechange','soldlistings','savedhomes','featuredoffices'].includes(pageType)) throw Error('Unknown page.');
    if(!Number.isInteger(page)||page<1||page>10) throw Error('Choose a page between 1 and 10.');
    const controller=new AbortController();
    const abort=()=>controller.abort();
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted) controller.abort();
    const timeout=setTimeout(abort,20000);
    try {
      const payload=await request('listings',{query:decodeURIComponent(query),page,pageType,map},{signal:controller.signal});
      if(!Array.isArray(payload.listings))throw Error('Listings unavailable. Please try again.');
      return {items:payload.listings.map(normalize),mapItems:(payload.mapData||[]).map(normalize),total:numeric(payload.listings[0]?.overall_count),page,retrievedAt:new Date(),url:resultsURL(query,pageType)};
    } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
  }
  const portfolioDRE='01986831';
  const portfolioVerification=new Map();
  let portfolioCache;
  function representsDaisy(detail){
    // These are transaction-party fields, not the website's agentInfo contact card.
    return ['ListAgentDRE','CoAgentDRE','SaleAgentKey'].some(key=>String(detail?.[key]||'').trim()===portfolioDRE);
  }
  async function portfolio({signal}={}){
    if(portfolioCache&&portfolioCache.until>Date.now())return portfolioCache.items;
    const query='/price_orderBy/desc_order';
    async function collection(pageType){
      const items=[];
      for(let page=1;page<=10;page++){
        const result=await listings(query,{page,pageType,signal});
        // Apex appends regional recommendations after its assigned featured listings.
        if(pageType==='featuredproperties'){
          items.push(...result.items.filter(item=>item.collectionOrder===1));
          if(result.items.some(item=>item.collectionOrder!==1))return items;
        }else items.push(...result.items);
        if(page*20>=result.total)return items;
      }
      throw Error('Listings unavailable. Please try again.');
    }
    const [sold,current]=await Promise.all([collection('soldproperties'),collection('featuredproperties')]);
    const candidates=[...new Map([...sold,...current].map(item=>[String(item.id).toUpperCase(),item])).values()];
    const accepted=new Set(sold.filter(item=>item.isManual).map(item=>String(item.id).toUpperCase()));
    let next=0;
    await Promise.all(Array.from({length:Math.min(4,candidates.length)},async()=>{
      while(next<candidates.length){
        const item=candidates[next++],key=String(item.id).toUpperCase();
        if(accepted.has(key))continue;
        const cached=portfolioVerification.get(key);
        const matches=cached&&cached.until>Date.now()?cached.matches:representsDaisy(await property(key,{signal}));
        portfolioVerification.set(key,{matches,until:Date.now()+5*60*1000});
        if(matches)accepted.add(key);
      }
    }));
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    const items=candidates.filter(item=>accepted.has(String(item.id).toUpperCase()));
    portfolioCache={items,until:Date.now()+60000};
    return items;
  }
  const api={origin,cities,filters,resultsURL,detailURL,propertyURL,listings,normalize,request,citiesList,property,properties,photoCandidates,portfolio,representsDaisy};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.DaisyIDX=api;
})(typeof window==='undefined'?globalThis:window);

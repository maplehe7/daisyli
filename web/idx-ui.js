'use strict';
const idxControllers=new Set();
function cancelIdxRequests(){for(const controller of idxControllers)controller.abort();idxControllers.clear();}
async function requestIdx(query,options={}){
  const controller=new AbortController();idxControllers.add(controller);
  try{return await DaisyIDX.listings(query,{...options,signal:controller.signal});}
  finally{idxControllers.delete(controller);}
}
function idxLoading(){return '<div class="idx-loading" role="status"><span class="idx-pulse" aria-hidden="true"></span> Loading listings…</div>';}
function idxFailure(){return `<div class="empty-state"><h2>Listings unavailable</h2><button class="button button-outline" data-idx-retry>Try again</button></div>`;}
function idxPager(result,maxPages=10){const pages=Math.min(maxPages,Math.ceil(result.total/20));if(pages<=1)return '';return `<nav class="idx-pagination" aria-label="Search result pages"><button class="button button-outline" data-idx-page="${result.page-1}" ${result.page===1?'disabled':''}>Previous</button><span>Page ${result.page} of ${pages}</span><button class="button button-outline" data-idx-page="${result.page+1}" ${result.page>=pages?'disabled':''}>Next</button></nav>`;}
const idxPhotoQueue=[];
let idxPhotoActive=0;
function queueIdxPhoto(task){
  idxPhotoQueue.push(task);
  function next(){
    while(idxPhotoActive<3&&idxPhotoQueue.length){
      const run=idxPhotoQueue.shift();idxPhotoActive++;
      Promise.resolve().then(run).catch(()=>{}).finally(()=>{idxPhotoActive--;next();});
    }
  }
  next();
}
function bindIdxImages(container){
  container.querySelectorAll('.property-image>a:not(.favorite)').forEach(link=>{
    if(link.dataset.photoBound)return;
    link.dataset.photoBound='true';
    const id=link.getAttribute('href')?.match(/^\/property\/([a-f\d-]{36})$/i)?.[1];
    if(!id)return;
    const original=link.querySelector('img');let repairing=false;
    const recover=()=>{
      if(repairing)return;repairing=true;
      const pending=document.createElement('div');pending.className='photo-unavailable';pending.setAttribute('aria-busy','true');link.replaceChildren(pending);
      queueIdxPhoto(async()=>{
        if(!link.isConnected)return;
        const failed=original?.src;
        try{
          const sources=await DaisyIDX.photoCandidates(id);
          for(const src of sources.filter(src=>src!==failed).slice(0,5)){
            if(!link.isConnected)return;
            const img=new Image();img.alt=original?.alt||DaisyIDX.properties.get(id.toUpperCase())?.address||'';
            img.width=640;img.height=440;img.decoding='async';
            const loaded=new Promise(resolve=>{
              const timer=setTimeout(()=>{img.onload=img.onerror=null;img.removeAttribute('src');resolve(false);},7000);
              img.onload=()=>{clearTimeout(timer);resolve(img.naturalWidth>0);};
              img.onerror=()=>{clearTimeout(timer);resolve(false);};
            });
            img.src=src;if(!await loaded)continue;
            if(!link.isConnected)return;
            link.replaceChildren(img);
            const cached=DaisyIDX.properties.get(id.toUpperCase());if(cached)cached.image=src;
            return;
          }
        }catch{}
        if(link.isConnected){
          const placeholder=document.createElement('div');placeholder.className='photo-unavailable';placeholder.textContent='Photo unavailable';
          link.replaceChildren(placeholder);applyLanguage(placeholder);
        }
      });
    };
    if(original){original.addEventListener('error',recover,{once:true});if(original.complete&&!original.naturalWidth)recover();}
    else recover();
  });
  DaisyAccount.paint();
}
function liveListingLinks(){return `<div class="idx-result-links"><div class="results-view-toggle" aria-label="Listings view"><button type="button" data-results-view="list" aria-pressed="true">List</button><button type="button" data-results-view="map" aria-pressed="false">Map</button></div><a class="text-link" href="/account?tab=searches">Saved searches</a></div>`;}

async function runLiveSearch(form,{page=1,scroll=true}={}){
  const section=document.getElementById('search-results');if(!section)return;
  DaisySearch.clearErrors(form);
  let query;
  try{query=DaisyIDX.filters(new URLSearchParams(new FormData(form)));}
  catch(error){DaisySearch.showError(form,error.message);return;}
  document.getElementById('search-error').textContent='';
  const params=new URLSearchParams(new FormData(form));params.set('page',String(page));params.set('run','1');params.set('lang',siteLanguage);if(form.dataset.editSearch)params.set('editSearch',form.dataset.editSearch);
  history.replaceState({},'', '/search?'+params.toString());
  cancelIdxRequests();DaisyMap.clear();const marker=Symbol();section.idxRequest=marker;
  section.hidden=false;section.setAttribute('aria-busy','true');section.innerHTML=idxLoading();applyLanguage(section);
  if(scroll)section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  try{
    const result=await requestIdx(query,{page,pageType:form.elements.collection.value||'results',map:true});if(!section.isConnected||section.idxRequest!==marker)return;
    const start=result.total?(page-1)*20+1:0,end=(page-1)*20+result.items.length;
    section.innerHTML=`<div class="section-heading"><div><h2>${result.total?`${number(result.total)} homes`:'No matching homes'}</h2><p>${result.total?`Showing ${start}–${end} matching homes.`:'No homes match these filters. Try widening your price or location.'}</p></div><button class="text-link" id="edit-search">Edit search ${arrow}</button></div>${liveListingLinks(query)}${DaisyMap.markup()}<div class="property-grid results-property-grid">${cards(result.items)}</div>${idxPager(result)}`;
    applyLanguage(section);section.querySelector('#edit-search').onclick=()=>form.scrollIntoView({behavior:'smooth'});
    section.querySelectorAll('[data-idx-page]').forEach(button=>button.onclick=()=>runLiveSearch(form,{page:Number(button.dataset.idxPage)}));
    bindIdxImages(section);DaisyMap.bind(section,result,form);
    if(scroll)section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }catch(error){
    if(!section.isConnected||section.idxRequest!==marker)return;
    section.innerHTML=idxFailure(DaisyIDX.resultsURL(query));applyLanguage(section);section.querySelector('[data-idx-retry]').onclick=()=>runLiveSearch(form,{page});
  }finally{if(section.isConnected&&section.idxRequest===marker)section.removeAttribute('aria-busy');}
}

function bindLiveCatalogue(kind){
  labelPortfolioLinks();
  if(kind==='sold'){bindLivePortfolio();return;}
  const pageType=kind==='sold'?'soldproperties':'featuredproperties';
  const section=document.querySelector('.catalogue-section');
  const grid=document.getElementById('catalog-grid'), count=document.getElementById('listing-count');
  let requestId=0;
  const update=async(page=1)=>{
    let query='';const city=document.getElementById('catalog-city').value;
    if(city)query+='/'+DaisyIDX.cities[city]+'_city';
    const sort=document.getElementById('catalog-sort').value;
    query+='/price_orderBy/'+(sort==='price-asc'?'asc':'desc')+'_order';
    cancelIdxRequests();const id=++requestId;
    grid.innerHTML=idxLoading();applyLanguage(grid);grid.setAttribute('aria-busy','true');count.textContent='';
    section.querySelector('.idx-catalog-extra').innerHTML='';
    try{
      const result=await requestIdx(query,{page,pageType});if(!grid.isConnected||id!==requestId)return;
      count.textContent=`${number(result.total)} ${result.total===1?'home':'homes'} · Showing ${result.total?(page-1)*20+1:0}–${(page-1)*20+result.items.length}`;
      grid.innerHTML=result.items.length?cards(result.items):'<div class="empty-state"><h2>No matching homes</h2><p>No homes match these filters right now. Try another location.</p></div>';
      section.querySelector('.idx-catalog-extra').innerHTML=`${idxPager(result)}`;
      section.querySelectorAll('[data-idx-page]').forEach(button=>button.onclick=()=>{update(Number(button.dataset.idxPage));section.scrollIntoView({behavior:'smooth'});});
      bindIdxImages(grid);applyLanguage(section);
    }catch(error){if(grid.isConnected&&id===requestId){count.textContent='Live listings unavailable';grid.innerHTML=idxFailure(DaisyIDX.resultsURL(query,pageType));applyLanguage(section);grid.querySelector('[data-idx-retry]').onclick=()=>update(page);}}
    finally{if(grid.isConnected&&id===requestId)grid.removeAttribute('aria-busy');}
  };
  ['catalog-city','catalog-sort'].forEach(id=>document.getElementById(id).addEventListener('change',()=>update()));
  update();
}

function labelPortfolioLinks(){
  document.querySelectorAll('a[href="/sold"]').forEach(link=>{link.textContent='Portfolio';});
}
labelPortfolioLinks();

// These homes and photos were published in the brokerage's original portfolio.html.
const pastPortfolioHomes=[
  {address:'102 Nest Pine',city:'Irvine',zip:'92602',price:4000000,beds:4,baths:4.5,sqft:4566,image:'102_nestpine.png'},
  {address:'25 Bellflower',city:'Lake Forest',zip:'92630',price:1860000,beds:4,baths:4.5,sqft:2769,image:'25_bellflower.png'},
  {address:'17 Sorrel',city:'Lake Forest',zip:'92630',price:null,beds:5,baths:5.5,sqft:3850,image:'17sorrel.jpg'},
  {address:'133 Iron Horse',city:'Irvine',zip:'92602',price:1578000,beds:4,baths:3,sqft:2709,image:'133_ironhouse.png'}
];
function pastPortfolioCard(home){
  const photo='https://maplehe7.github.io/daisyli/'+home.image;
  return `<article class="property-card">
    <div class="property-image"><img src="${escapeHTML(photo)}" alt="" loading="lazy" width="640" height="440"></div>
    <div class="property-info">
      <div class="property-price">${home.price===null?'Price upon request':money(home.price)}</div>
      <h3>${escapeHTML(home.address)}</h3>
      <p class="property-city">${escapeHTML(home.city)}, CA ${escapeHTML(home.zip)}</p>
      <div class="property-facts"><span>${home.beds} beds</span><span>${home.baths} baths</span><span>${number(home.sqft)} sq ft</span></div>
    </div>
  </article>`;
}

function bindLivePortfolio(){
  const section=document.querySelector('.catalogue-section');
  const grid=document.getElementById('catalog-grid'),count=document.getElementById('listing-count');
  const city=document.getElementById('catalog-city'),sort=document.getElementById('catalog-sort');
  const heading=document.querySelector('main h1');
  heading.textContent='Portfolio';document.title='Portfolio · Daisy Li';
  const notice=document.createElement('div');
  notice.innerHTML='<span role="status"></span> <button type="button" class="text-link" hidden>Try again</button>';
  count.after(notice);
  const status=notice.querySelector('[role="status"]'),retry=notice.querySelector('button');
  let items=[];
  let showingArchive=false;
  const update=()=>{
    const ascending=sort.value==='price-asc';
    const filtered=items.filter(item=>!city.value||item.city.toLowerCase()===city.value.toLowerCase());
    const sorted=filtered.filter(item=>item.price!==null).sort((a,b)=>ascending?a.price-b.price:b.price-a.price);
    sorted.push(...filtered.filter(item=>item.price===null));
    count.textContent=`${number(filtered.length)} ${filtered.length===1?'home':'homes'}`;
    if(!sorted.length)grid.innerHTML='<div class="empty-state"><h2>No matching homes</h2></div>';
    else grid.innerHTML=showingArchive?sorted.map(pastPortfolioCard).join(''):cards(sorted);
    if(!showingArchive)bindIdxImages(grid);
    applyLanguage(section);
  };
  const load=async()=>{
    const controller=new AbortController();idxControllers.add(controller);
    const timeout=setTimeout(()=>controller.abort(),45000);
    if(!showingArchive){
      grid.innerHTML=idxLoading();count.textContent='';applyLanguage(grid);
      city.disabled=sort.disabled=true;
    }
    grid.setAttribute('aria-busy','true');retry.disabled=true;
    try{
      const liveItems=await DaisyIDX.portfolio({signal:controller.signal});
      controller.signal.throwIfAborted();
      items=liveItems;
      showingArchive=false;
    }catch{
      controller.abort();
      items=pastPortfolioHomes;
      showingArchive=true;
    }finally{
      clearTimeout(timeout);idxControllers.delete(controller);
    }
    if(!grid.isConnected)return;
    // An Apex city query can switch the portfolio to a regional search.
    const selectedCity=city.value;
    const locations=[...new Set(items.map(item=>item.city).filter(Boolean))].sort();
    city.replaceChildren(new Option('All locations',''),...locations.map(name=>new Option(name,name)));
    if(locations.includes(selectedCity))city.value=selectedCity;
    status.textContent=showingArchive?'Showing selected past portfolio homes while the live feed is unavailable.':'';
    retry.hidden=!showingArchive;
    retry.disabled=false;
    city.disabled=sort.disabled=false;
    update();
    grid.removeAttribute('aria-busy');
  };
  retry.addEventListener('click',load);
  city.addEventListener('change',()=>update());sort.addEventListener('change',()=>update());load();
}

async function loadLiveHighlights(container,city){
  if(!container)return;
  const query=city?'/home,Townhouse_homeType/active_homeStatus/'+DaisyIDX.cities[city]+'_city':'';
  const pageType=city?'results':'featuredproperties';
  try{
    const result=await requestIdx(query,{pageType});if(!container.isConnected)return;
    container.innerHTML=cards(result.items.slice(0,3));bindIdxImages(container);
    applyLanguage(container);
  }catch{if(container.isConnected){container.innerHTML=idxFailure(DaisyIDX.resultsURL(query,pageType));applyLanguage(container);container.querySelector('[data-idx-retry]').onclick=()=>loadLiveHighlights(container,city);}}
}

async function saveSearchWithIdx(form){
  DaisySearch.clearErrors(form);
  try{const query=DaisyIDX.filters(new URLSearchParams(new FormData(form)));document.getElementById('search-error').textContent='';DaisyAccount.require(async()=>{try{const record=form.dataset.editSearch?await DaisyAccount.getSearch(form.dataset.editSearch):undefined;DaisyAccount.saveSearch({query,pageType:form.elements.collection.value||'results',record});}catch(error){toast(siteLanguage==='zh'?zh(error.message):error.message);}});}
  catch(error){DaisySearch.showError(form,error.message);}
}

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

// Closed transactions from Daisy’s original public sold page and portfolio.
const pastPortfolioHomes=[
  {"address": "48 Panorama", "city": "Coto de Caza", "zip": "92679", "price": 5880000, "beds": 5, "baths": 4.5, "sqft": 5100, "photo": "/assets/property-F2B85D1C-B182-4E8E-BC1A-091890069EC3.jpg", "role": "seller"},
  {"address": "2 Havenhurst Drive", "city": "Coto de Caza", "zip": "92679", "price": 5450000, "beds": 6, "baths": 5.5, "sqft": 6050, "photo": "/assets/property-D2B78D4F-98E6-47DF-9119-F45CD0401611.jpg", "role": "seller"},
  {"address": "5 Winston Drive", "city": "Coto de Caza", "zip": "92679", "price": 5080000, "beds": 5, "baths": 4.5, "sqft": 5684, "photo": "/assets/property-C4DFA291-2B01-4736-9569-0DA3B5DC578D.jpg", "role": "buyer", "listingAgent": "Vicki Meyer", "listingOffice": "Seven Gables Real Estate", "listingContact": "tel:7144694719"},
  {"address": "8 Panorama", "city": "Coto de Caza", "zip": "92679", "price": 4399500, "beds": 6, "baths": 4.5, "sqft": 5000, "photo": "/assets/property-5D02C9E0-EB53-4B41-8938-7DCA801BD01E.jpg", "role": "seller"},
  {"address": "2 Havenhurst Drive", "city": "Coto de Caza", "zip": "92679", "price": 4500000, "beds": 6, "baths": 6, "sqft": 6050, "photo": "/assets/property-A0D1EAB0-30E0-4E4F-85DD-983D04DC1503.jpg"},
  {"address": "102 Nest Pine", "city": "Irvine", "zip": "92602", "price": 4000000, "beds": 4, "baths": 4.5, "sqft": 4566, "photo": "https://maplehe7.github.io/daisyli/102_nestpine.png"},
  {"address": "6105 Gallop Heights Ct.", "city": "San Diego", "zip": "92130", "price": 3900000, "beds": 5, "baths": 4, "sqft": 5288, "photo": "/assets/property-D7D5F697-5FF1-4379-B428-EA11CB25DE5B.jpg"},
  {"address": "35 Cherry Hills Drive", "city": "Coto de Caza", "zip": "92679", "price": 3450000, "beds": 5, "baths": 4.5, "sqft": 4550, "photo": "/assets/property-3FF64405-BEE3-4D8E-9CD1-614E838AAAEE.jpg", "role": "buyer", "listingAgent": "Flo Bullock", "listingOffice": "Bullock Russell RE Services"},
  {"address": "12 Van Gogh Way", "city": "Coto de Caza", "zip": "92679", "price": 3500000, "beds": 6, "baths": 4.5, "sqft": 4841, "photo": "/assets/property-960BF506-1F53-4F5D-A7AA-BC0D291D53E6.jpg", "role": "buyer", "listingAgent": "Meredith Giraudi", "listingOffice": "Grand Avenue Realty & Lending"},
  {"address": "2 Lafayette Lane", "city": "Coto de Caza", "zip": "92679", "price": 2860000, "beds": 5, "baths": 4.5, "sqft": 4000, "photo": "/assets/property-D5AA13B3-2459-4174-958E-491B44A83F5A.jpg", "role": "buyer", "listingAgent": "Flo Bullock", "listingOffice": "Bullock Russell RE Services"},
  {"address": "8 Panorama", "city": "Coto de Caza", "zip": "92679", "price": 2920000, "beds": 6, "baths": 5, "sqft": 5000, "photo": "/assets/property-68609AC4-D8D2-4A4F-B696-2A579DE5AB2E.jpg"},
  {"address": "27631 Manor Hill", "city": "Laguna Niguel", "zip": "92677", "price": 2810000, "beds": 4, "baths": 4.5, "sqft": 3698, "role": "buyer", "listingAgent": "Robert Najafinia", "listingOffice": "Realty One Group West", "listingContact": "tel:9493004388"},
  {"address": "32 Hubbard Way", "city": "Coto de Caza", "zip": "92679", "price": 2778000, "beds": 5, "baths": 4.5, "sqft": 4232, "photo": "/assets/property-51FD6C85-932B-42E1-8DD0-BF8E437A3B05.jpg", "role": "seller"},
  {"address": "28932 Drakes Bay", "city": "Laguna Niguel", "zip": "92677", "price": 2530000, "beds": 4, "baths": 3.5, "sqft": 3940, "role": "buyer", "listingAgent": "Nhu White", "listingOffice": "Frontier Realty Inc"},
  {"address": "19 Hubbard Way", "city": "Coto de Caza", "zip": "92679", "price": 2355000, "beds": 3, "baths": 4.5, "sqft": 4232, "photo": "/assets/property-5A28888D-1240-4A3D-B67F-C0AD184DCC62.jpg", "role": "buyer", "listingAgent": "Jonathan Minerick", "listingOffice": "Homecoin.com"},
  {"address": "17 Pebble", "city": "Coto de Caza", "zip": "92679", "price": 2300000, "beds": 5, "baths": 4.5, "sqft": 3748, "photo": "/assets/property-AC4089F9-3E05-4AB4-B14D-DADE12DD5753.jpg", "role": "buyer", "listingAgent": "Donnie Bowen", "listingOffice": "Re/Max Real Estate Group"},
  {"address": "11 Kennedy Court", "city": "Coto de Caza", "zip": "92679", "price": 2075000, "beds": 5, "baths": 4.5, "sqft": 3543, "photo": "/assets/property-133AD58B-1EE8-4830-85F6-59E9E947F3EF.jpg", "role": "buyer", "listingAgent": "John Russell", "listingOffice": "Pacific Sotheby's Int'l Realty"},
  {"address": "5 Madison Lane", "city": "Coto de Caza", "zip": "92679", "price": 2150000, "beds": 5, "baths": 4.5, "sqft": 3543, "photo": "/assets/property-8AD56A5A-04F5-4117-924D-354571AB9F4A.jpg", "role": "buyer", "listingAgent": "Eliisa Stowell", "listingOffice": "Surterre Properties Inc."},
  {"address": "26 Los Indios", "city": "Irvine", "zip": "92618", "price": 2031000, "beds": 4, "baths": 3, "sqft": 2339, "photo": "/assets/property-9F619D90-EF77-4DE6-A4F9-44CF08B18C29.jpg", "role": "seller"},
  {"address": "25 Bellflower", "city": "Lake Forest", "zip": "92630", "price": 1860000, "beds": 4, "baths": 4.5, "sqft": 2769, "photo": "https://maplehe7.github.io/daisyli/25_bellflower.png"},
  {"address": "10 Torosa", "city": "Lake Forest", "zip": "92630", "price": 1520000, "beds": 4, "baths": 3, "sqft": 2133, "photo": "/assets/property-42721ADE-8C4F-4C05-B2BA-616A20C084BD.jpg", "role": "seller"},
  {"address": "133 Iron Horse", "city": "Irvine", "zip": "92602", "price": 1580000, "beds": 4, "baths": 3, "sqft": 2709, "photo": "https://maplehe7.github.io/daisyli/133_ironhouse.png"},
  {"address": "20866 Parkside", "city": "Lake Forest", "zip": "92630", "price": 1550000, "beds": 6, "baths": 5, "sqft": 3598, "photo": "/assets/property-F408DB68-0C68-478F-9D3C-EF9C2B4351D9.jpg"},
  {"address": "70 Loganberry", "city": "Irvine", "zip": "92620", "price": 1480000, "beds": 4, "baths": 4, "sqft": 0, "photo": "https://maplehe7.github.io/daisyli/70_loganberry.png"},
  {"address": "292 Pasto Rico", "city": "Rancho Santa Margarita", "zip": "92688", "price": 648000, "beds": 2, "baths": 2, "sqft": 1032, "photo": "/assets/property-ED7220E1-D9D6-4981-B00E-FBB7A20FCB3C.jpg", "role": "buyer", "listingAgent": "Pam Fecher", "listingOffice": "First Team Real Estate"},
  {"address": "17 Sorrel", "city": "Lake Forest", "zip": "92630", "price": null, "beds": 5, "baths": 5.5, "sqft": 3850, "photo": "https://maplehe7.github.io/daisyli/17sorrel.jpg"}
];
const portfolioRoles={
  buyer:['Represented buyer','买方代理'],
  seller:['Represented seller','卖方代理'],
  both:['Represented buyer and seller','买卖双方代理']
};
function pastPortfolioCard(home){
  const chinese=siteLanguage==='zh';
  const role=home.role ? portfolioRoles[home.role][chinese ? 1 : 0] : '';
  const agent=escapeHTML(home.listingAgent);
  const credit=home.listingContact ? `<a href="${escapeHTML(home.listingContact)}">${agent}</a>` : agent;
  return `<article class="property-card portfolio-card${home.photo ? '' : ' portfolio-card--text'}">
    ${home.photo ? `<div class="property-image"><img src="${escapeHTML(home.photo)}" alt="" loading="lazy" width="640" height="440"></div>` : ''}
    <div class="property-info">
      <div class="property-price">${home.price===null?'Price upon request':money(home.price)}</div>
      <h3>${escapeHTML(home.address)}</h3>
      <p class="property-city">${escapeHTML(home.city)}, CA ${escapeHTML(home.zip)}</p>
      <div class="property-facts"><span>${home.beds} beds</span><span>${home.baths} baths</span><span>${number(home.sqft)} sq ft</span></div>
      ${role ? `<p class="portfolio-role">${role}</p>` : ''}
      ${agent ? `<p class="portfolio-credit">${chinese?'挂牌代理':'Listed by'} ${credit} · ${escapeHTML(home.listingOffice)}</p>` : ''}
    </div>
  </article>`;
}

function bindLivePortfolio(){
  const section=document.querySelector('.catalogue-section');
  const grid=document.getElementById('catalog-grid'),count=document.getElementById('listing-count');
  const city=document.getElementById('catalog-city'),sort=document.getElementById('catalog-sort');
  const heading=document.querySelector('main h1');
  heading.textContent='Portfolio';document.title='Portfolio · Daisy Li';
  const locations=[...new Set(pastPortfolioHomes.map(home=>home.city))].sort();
  city.replaceChildren(new Option('All locations',''),...locations.map(name=>new Option(name,name)));

  const update=()=>{
    const ascending=sort.value==='price-asc';
    const filtered=pastPortfolioHomes.filter(home=>!city.value||home.city===city.value);
    const sorted=filtered.filter(home=>home.price!==null)
      .sort((a,b)=>ascending?a.price-b.price:b.price-a.price);
    sorted.push(...filtered.filter(home=>home.price===null));
    count.textContent=`${number(filtered.length)} ${filtered.length===1?'home':'homes'}`;
    grid.innerHTML=sorted.length?sorted.map(pastPortfolioCard).join(''):'<div class="empty-state"><h2>No matching homes</h2></div>';
    applyLanguage(section);
  };

  city.addEventListener('change',update);
  sort.addEventListener('change',update);
  update();
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

'use strict';
document.querySelectorAll('link[rel~="icon"]').forEach(icon => {
  icon.href = '/assets/favicon.png'; icon.type = 'image/png'; icon.setAttribute('sizes', '256x256');
});
// Keep the existing WordPress entry page in sync with the hosted header assets.
const headerBrand = document.querySelector('.site-header .brand');
headerBrand.querySelector('span').textContent = 'Daisy Li, Broker';
headerBrand.querySelector('img').src = '/assets/daisylogo_black.png';
document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.content = '#ffffff');
document.querySelector('#main-nav a[href="/account"]')?.remove();
document.querySelectorAll('a[href="/testimonials"]').forEach(link=>link.setAttribute('href','/#testimonials'));
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const diagonal = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const number = n => new Intl.NumberFormat('en-US').format(n);
const main = document.getElementById('main');
let shown=12;
const places = [
  {slug:'irvine',name:'Irvine',image:'irvine.webp',},
  {slug:'newport-beach',name:'Newport Beach',image:'newport.jpeg',},
  {slug:'lake-forest',name:'Lake Forest',image:'lakeforest.jpg',},
  {slug:'coto-de-caza',name:'Coto de Caza',image:'coto de caza.webp',}
];
const testimonials = [
  {name:'Rsa Y.',quote:'She worked very diligently and detailed with painters, gardeners, house cleaners, stagers to make sure they will create the best presentation to the house.',full:'When we were out of the U.S during the selling process, Daisy spent lots of time and effort to bring up the best look of the house to the market. She’s very experienced and knowledgeable to know how to present the house beautifully and attract more buyers. She worked very diligently and detailed with painters, gardeners, house cleaners, stagers to make sure they will create the best presentation to the house. Our house became the hot home in the market immediately after she put into the market and sold in 2 days with more than $70,000 above listed. The transaction process was very smooth and we closed the escrow in 10 days. We are truly thankful for her hardworking, professionalism and responsibility throughout the whole process. She will be the one I will highly recommend when you consider buying or selling your houses.'},
  {name:'Nicole Z.',quote:'She is very knowledgeable about the area and super responsive and attentive to our needs.',full:'She understands the market very well and are very much aware of the market change. She is very knowledgeable about the area and super responsive and attentive to our needs. Thanks for the team members behind her, we went through repair, staging, termite, escrow process easily from beginning to the end. In order to bring the best presentation to our house on the budget, relying on her experiences as stager before, she helped us make the secondary bedrooms stood out like a model home.'},
  {name:'Ray C.',quote:'Thanks for the patience and hardworking, she took care all the procedures from preparation to the escrow closed while we were not presented.',full:'As a foreign investors, we don’t have any experience with selling house in the U.S. Thanks for the patience and hardworking, she took care all the procedures from preparation to the escrow closed while we were not presented. Due to the outbreak of COVID again in my city, we couldn’t go to the embassy for the notary service. And Daisy worked so diligently under the pressure and difficulty to solve the problem and got the escrow closed on time. Our investment house sold within 3 days with $80,000 over asking. We are very blessed to have Daisy and thank her for everything she has done for us.'}
];
const heroId='D2B78D4F-98E6-47DF-9119-F45CD0401611';
function favoriteButton(p){return `<button class="favorite" data-save-home="${escapeHTML(p.id)}" data-address="${escapeHTML(p.address)}" data-mls="${escapeHTML(p.mls)}" aria-pressed="false" aria-label="Save home ${escapeHTML(p.address)}">${heart}</button>`;}
function propertyCard(p){const href=escapeHTML(DaisyIDX.propertyURL(p));const imageURL=p.live?p.image:'/'+p.image;const native='';return `<article class="property-card"><div class="property-image"><a href="${href}"${native} aria-label="View ${escapeHTML(p.address)}">${p.image?`<img src="${escapeHTML(imageURL)}" alt="${escapeHTML(p.address)}, ${escapeHTML(p.city)}" loading="lazy" width="640" height="440">`:'<div class="photo-unavailable">Photo unavailable</div>'}</a><span class="property-status ${p.status==='Sold'?'status-sold':''}">${escapeHTML(p.status)}</span>${favoriteButton(p)}</div><div class="property-info"><div class="property-price">${money(p.price)}<a href="${href}"${native} class="card-arrow" aria-label="View ${escapeHTML(p.address)}">${diagonal}</a></div><h3><a href="${href}"${native}>${escapeHTML(p.address)}</a></h3><p class="property-city">${escapeHTML(p.city)}, CA ${escapeHTML(p.zip)}</p><div class="property-facts"><span>${p.beds} beds</span><span>${p.baths} baths</span><span>${number(p.sqft)} sq ft</span></div><p class="property-mls">MLS #${escapeHTML(p.mls)} · <a href="${href}"${native}>Full details ↗</a></p></div></article>`;}
function cards(items){return items.map(propertyCard).join('');}
function cta(){return `<section class="contact-band"><div class="wrap contact-band-inner"><div><h2>Work With Daisy</h2><p>List with Daisy today and she’ll get you the best deal on your home!</p></div><a class="button button-light" href="/contact">LET’S CONNECT ${arrow}</a></div></section>`;}
function select(name,label,options,value='',className=''){return `<label class="field ${className}" for="${name}"><span>${label}</span><select id="${name}" name="${name}">${options.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${escapeHTML(v)}" ${String(v)===String(value)?'selected':''}>${escapeHTML(t)}</option>`;}).join('')}</select></label>`;}
function input(name,label,placeholder='',type='text',className=''){return `<label class="field ${className}" for="${name}"><span>${label}</span><input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}"></label>`;}
function checkbox(name,label,value='yes',checked=false){return `<label class="check"><input name="${name}" type="checkbox" value="${value}" ${checked?'checked':''}><span>${label}</span></label>`;}
function cityOptions(){return [['','All four communities'],...places.map(p=>[p.name,p.name])];}
function priceOptions(){return [['','Any price'],...[500000,750000,1000000,1500000,2000000,2500000,3000000,4000000,5000000,7500000,10000000,20000000].map(n=>[n,money(n)])];}
function quickSearch(){return `<form id="quick-search" class="home-search" role="search" action="/search"><label class="home-search-field" for="home-location"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg><input id="home-location" name="keyword" type="search" list="home-city-list" aria-label="Search by Address, City, or ZIP code" placeholder="Address, City, or ZIP code" autocomplete="off"><datalist id="home-city-list">${places.map(place=>`<option value="${escapeHTML(place.name)}"></option>`).join('')}</datalist></label><button class="button home-search-button" type="submit">Search</button></form>`;}
function home(){return `<div class="home-intro"><div class="hero-photo"><img src="/assets/home-film-v4/poster.jpg" alt="" fetchpriority="high" width="1920" height="1080"></div><section class="home-hero wrap" aria-labelledby="home-title"><div class="hero-copy"><h1 id="home-title">Daisy Li</h1><p class="home-credentials"><span>Broker</span><span aria-hidden="true"> | </span><span>DRE #01986831</span></p><p class="home-region">Orange County Real Estate</p></div>${quickSearch()}</section></div>
<section class="section wrap"><div class="section-heading"><div><h2>Featured Properties</h2></div><a class="text-link" href="/featured">Featured Homes ${arrow}</a></div><div class="property-grid" id="home-live-listings">${idxLoading()}</div></section>
<section class="about-intro"><div class="wrap about-grid"><div class="portrait-frame"><img src="/assets/daisy-portrait.jpeg" alt="Daisy Li, Orange County real estate broker" width="500" height="540" loading="lazy"></div><div class="about-copy"><h2>About Daisy</h2><p>${escapeHTML(siteLanguage==='zh'?chineseContent.homeBio:originalContent.homeBio)}</p><a class="text-link" href="/about">LEARN MORE ${arrow}</a></div></div></section>
<section class="section wrap"><div class="section-heading"><div><h2>Neighborhoods</h2></div><a class="text-link" href="/neighborhoods">Neighborhoods ${arrow}</a></div><div class="community-grid">${places.map(communityCard).join('')}</div></section>
${clientStories()}
${DaisyVideos.render()}${cta()}`;}
function communityCard(p){return `<a class="community-card" href="/neighborhoods/${p.slug}"><div><img src="/assets/${encodeURIComponent(p.image)}" alt="${p.name}, California" loading="lazy" width="500" height="560"></div><h3>${p.name} ${diagonal}</h3></a>`;}
function pageIntro(title,description,extra=''){return `<div class="page-intro wrap"><h1>${title}</h1>${description?`<p>${description}</p>`:''}${extra}</div>`;}
function catalogue(kind){const soldPage=kind==='sold';return `${pageIntro(soldPage?'Sold Homes':'Featured Homes','')}<section class="wrap catalogue-section"><div class="listing-toolbar"><div class="catalog-tabs"><a href="/featured" class="${!soldPage?'active':''}">Featured homes</a><a href="/sold" class="${soldPage?'active':''}">Sold homes</a></div><div class="toolbar-filters"><label class="sr-only" for="catalog-city">Filter by city</label><select id="catalog-city"><option value="">All locations</option>${places.map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</select><label class="sr-only" for="catalog-sort">Sort homes</label><select id="catalog-sort"><option value="default">Featured order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select><a class="text-link" href="/account">My Account</a></div></div><div class="results-meta"><span id="listing-count"></span></div><div class="property-grid" id="catalog-grid">${idxLoading()}</div><div class="idx-catalog-extra"></div></section>${cta()}`;}
function searchPageBase(){return `${pageIntro('Home Search','')}<section class="wrap search-layout"><form id="advanced-search"><div class="search-basics"><div class="fields-grid three">${select('search-city','Location',cityOptions())}${select('min','Minimum price',priceOptions())}${select('max','Maximum price',priceOptions())}</div><fieldset class="property-types"><legend>Property type</legend>${checkbox('type','Single family home','home',true)}${checkbox('type','Condo / Townhome','condo',true)}${checkbox('type','Other properties','other')}</fieldset><div class="fields-grid three">${select('beds','Bedrooms',[['','Any'],[1,'1+'],[2,'2+'],[3,'3+'],[4,'4+'],[5,'5+'],[6,'6+']])}${select('baths','Bathrooms',[['','Any'],[1,'1+'],[2,'2+'],[3,'3+'],[4,'4+'],[5,'5+']])}${input('tract','Tract code','Enter tract code')}</div>${checkbox('exact-beds','Use exact bedroom count')}</div><div class="listing-status-section"><div class="check-row">${checkbox('status','For sale','active',true)}${checkbox('status','Pending / backup offers','pending')}${checkbox('status','Sold','sold')}${checkbox('status','Short sales','short',true)}${checkbox('status','Foreclosures / REO','reo',true)}</div><div class="fields-grid two">${select('changed','New or price changed',[['','Any time'],[1,'Today'],[7,'Last week'],[30,'Last month'],[90,'Last 3 months']])}${select('sold-within','Sold within',[['','Any time'],[7,'Last week'],[30,'Last month'],[90,'Last 3 months'],[365,'Last year']])}</div></div><div class="alternative-search"><h3>OR Search by one of the following</h3><p>(Cities will be deselected)</p><div class="fields-grid three">${input('zip','ZIP code','e.g. 92602')}${input('address','Street address','e.g. 2 Havenhurst')}${input('mls','MLS number','Enter MLS number')}</div></div><details class="advanced-details"><summary><span>More</span><span class="plus" aria-hidden="true">+</span></summary><div class="fields-grid three">${select('pool','Pool',[['','No preference'],['yes','Has a pool'],['no','No pool']])}${select('garage','Garage',[['','No preference'],[1,'1+ space'],[2,'2+ spaces'],[3,'3+ spaces']])}${select('year','Year built',[['','Any year'],[2020,'2020 or newer'],[2010,'2010 or newer'],[2000,'2000 or newer'],[1990,'1990 or newer']])}${select('sqft','Living area',[['','Any size'],[1500,'1,500+ sq ft'],[2000,'2,000+ sq ft'],[3000,'3,000+ sq ft'],[4000,'4,000+ sq ft']])}${select('lot','Lot size',[['','Any size'],[5000,'5,000+ sq ft'],[10000,'10,000+ sq ft'],[20000,'20,000+ sq ft'],[43560,'1+ acre']])}${select('stories','Stories',[['','No preference'],[1,'1 story'],[2,'2+ stories']])}${input('keyword','Keyword','e.g. ocean view')}${select('sort','Sort by',[['price','Price'],['sqft','Living area'],['lot','Lot size'],['year','Year built']])}${select('order','Order',[['desc','Highest to lowest'],['asc','Lowest to highest']])}</div>${checkbox('virtual-tour','Only show virtual tours')}</details><p id="search-error" class="search-error" role="alert" tabindex="-1"></p><div class="search-actions"><button class="text-link reset-search" type="reset">Reset filters</button><div><button type="button" class="button button-outline" id="save-search">Save this search</button><button type="submit" class="button">Search homes ${arrow}</button></div></div></form><aside class="search-aside"><div class="search-aside-photo"><img src="/assets/irvine.webp" alt="Irvine neighborhood" loading="lazy"></div><div class="search-aside-copy"><h2>Contact Me</h2><a href="/contact" class="text-link">LET’S CONNECT ${arrow}</a></div><div class="search-aside-contact"><img src="/assets/daisy-portrait.jpeg" alt="Daisy Li"><div><strong>Daisy Li</strong><a href="tel:+19498610160">(949) 861-0160</a></div></div></aside></section><section class="wrap search-results" id="search-results" hidden aria-live="polite"></section><div class="mobile-search-dock" id="mobile-search-dock" hidden><button type="submit" form="advanced-search" class="button">Search homes ${arrow}</button></div>${cta()}`;}
function searchPage(){return DaisySearch.render(searchPageBase());}
function about(){if(siteLanguage==='zh')return `<section class="about-hero wrap"><div class="about-hero-photo"><img src="/assets/daisy-portrait.jpeg" alt="Daisy Li" width="500" height="540"></div><div><h1>关于 Daisy</h1>${chineseContent.biography.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}<a class="button" href="/contact">微信联系 ${arrow}</a></div></section>${cta()}`;return `<section class="about-hero wrap"><div class="about-hero-photo"><img src="/assets/daisy-portrait.jpeg" alt="Daisy Li" width="500" height="540"></div><div><h1>About Me</h1><p>${escapeHTML(originalContent.about[0])}</p><a class="button" href="/contact">Contact Me ${arrow}</a></div></section><section class="story-section wrap original-biography"><div class="story-copy">${originalContent.about.slice(1).map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</div></section><section class="wrap chinese-story" lang="zh"><div>${originalContent.chinese.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</div></section>${cta()}`;}
function communities(slug){const p=places.find(x=>x.slug===slug);if(!p)return `${pageIntro('Neighborhoods','')}<section class="wrap section community-index"><div class="community-grid">${places.map(communityCard).join('')}</div></section>${cta()}`;const properties=[true];const content=(siteLanguage==='zh'?chineseContent:originalContent).communities[p.slug];return `<section class="community-hero"><img src="/assets/${encodeURIComponent(p.image)}" alt="${p.name}" width="1400" height="600"><div class="wrap"><a class="back-link" href="/neighborhoods">All neighborhoods</a><h1>${p.name}</h1></div></section><section class="wrap community-story"><h2>${escapeHTML(content.heading)}</h2><div>${content.paragraphs.map(text=>`<p>${escapeHTML(text).replace(/\n\n/g,'<br><br>')}</p>`).join('')}<a class="button" href="/search?city=${encodeURIComponent(p.name)}">Search ${p.name} homes ${arrow}</a></div></section>${properties.length?`<section class="section wrap"><div class="section-heading"><h2>${p.name} homes</h2><a class="text-link" href="/search?city=${encodeURIComponent(p.name)}">View homes ${arrow}</a></div><div class="property-grid" id="community-live-listings" data-city="${p.name}">${idxLoading()}</div></section>`:''}${cta()}`;}
function clientStories(){return `<section id="testimonials" class="testimonial-feature home-testimonials" aria-labelledby="testimonials-title"><div class="wrap"><h2 id="testimonials-title">Testimonials</h2><div class="home-testimonial-list">${(siteLanguage==='zh'?chineseContent.testimonials:testimonials).map(t=>`<figure class="home-testimonial"><blockquote><p>${escapeHTML(t.full)}</p></blockquote><figcaption>${escapeHTML(t.name)}</figcaption></figure>`).join('')}</div></div></section>`;}
function contact(){return `<section class="contact-page wrap original-contact"><div class="contact-copy"><h1>Contact Me</h1><p class="contact-license">DRE #01986831</p><div class="contact-detail"><span>Phone</span><a href="tel:+19498610160">(949) 861-0160 ${diagonal}</a></div><div class="contact-detail"><span>Email</span><a href="mailto:daisylirealty@gmail.com">daisylirealty@gmail.com ${diagonal}</a></div>${DaisyWeixin.render()}</div><div class="contact-original-photo"><img src="/assets/daisy-portrait.jpeg" alt="Daisy Li" width="500" height="540"></div></section>`;}
function detail(id){return DaisyProperty.render(id);}
function notFound(){return `${pageIntro('Page not found','')}<div class="wrap section"><a class="button" href="/">Back to home ${arrow}</a></div>`;}
function route(){if(/^\/testimonials\/?$/.test(location.pathname))history.replaceState({},'',`/${location.search}#testimonials`);cancelIdxRequests();DaisyMap.clear();DaisyProperty.close();const requestedLanguage=new URLSearchParams(location.search).get('lang');if(['en','zh'].includes(requestedLanguage))siteLanguage=requestedLanguage;const path=location.pathname.replace(/\/$/,'')||'/';history.scrollRestoration=path==='/'?'manual':'auto';const parts=path.split('/');shown=12;document.body.classList.toggle('home-page',path==='/');const renderers={'/':home,'/about':about,'/search':searchPage,'/featured':()=>catalogue('featured'),'/sold':()=>catalogue('sold'),'/contact':contact,'/account':DaisyAccount.render};main.innerHTML=renderers[path]?renderers[path]():parts[1]==='neighborhoods'?communities(parts[2]):parts[1]==='property'?detail(parts[2]):notFound();document.title=(path==='/'?'Orange County Real Estate':(main.querySelector('h1')?.textContent||'Daisy Li'))+' · Daisy Li';document.querySelectorAll('#main-nav a').forEach(a=>{if(a.pathname===path)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});bindPage(path);DaisyAccount.bind();if(parts[1]==='property')DaisyProperty.bind(parts[2]);bindMobileLayout();DaisyVideos.bind();applyLanguage();document.querySelectorAll('a[href$="#testimonials"]').forEach(link=>{if(link.origin===location.origin)link.setAttribute('href',rememberLanguageURL('/#testimonials'));});if(path==='/'&&!location.hash)window.scrollTo({top:0,left:0,behavior:'instant'});if(path==='/'&&location.hash==='#testimonials')requestAnimationFrame(()=>document.getElementById('testimonials')?.scrollIntoView({behavior:'instant'}));if(path==='/')loadLiveHighlights(document.getElementById('home-live-listings'));const communityGrid=document.getElementById('community-live-listings');if(communityGrid)loadLiveHighlights(communityGrid,communityGrid.dataset.city);}
function navigate(href){href=rememberLanguageURL(href);history.pushState({},'',href);route();window.scrollTo(0,0);main.focus({preventScroll:true});closeMenu();}
function closeMenu(){setMobileMenu(false);}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function captureSearch(form){const fd=new FormData(form);return Object.fromEntries([...new Set(fd.keys())].map(key=>[key,fd.getAll(key)]));}
function restoreSearch(form,state){for(const el of form.elements){if(!el.name)continue;const value=Array.isArray(state[el.name])?state[el.name]:state[el.name]?[state[el.name]]:[];if(el.type==='checkbox')el.checked=value.includes(el.value);else if(el.type!=='submit'&&el.type!=='button'&&el.type!=='reset')el.value=value[0]||'';}}
function bindPage(path){
  const homeSearch=document.getElementById('quick-search');
  if(homeSearch){
    let cityRows=places.map(place=>({name:place.name}));
    const loadCities=()=>DaisyIDX.citiesList().then(rows=>{cityRows=rows;if(homeSearch.isConnected)homeSearch.querySelector('datalist').innerHTML=rows.map(row=>`<option value="${escapeHTML(row.name)}"></option>`).join('');}).catch(()=>{});
    homeSearch.addEventListener('focusin',loadCities,{once:true});
    homeSearch.addEventListener('submit',async event=>{
      event.preventDefault();
      const value=homeSearch.elements.keyword.value.trim(),button=homeSearch.querySelector('button');
      button.disabled=true;
      try{
        const aliases={'尔湾':'Irvine','纽波特海滩':'Newport Beach','森林湖':'Lake Forest','科托德卡萨':'Coto de Caza'};
        const locationName=aliases[value]||value;
        // Address and ZIP searches do not need the city directory.
        if(locationName&&!/^\d/.test(locationName))await loadCities();
        if(!homeSearch.isConnected)return;
        const city=cityRows.find(row=>row.name.toLowerCase()===locationName.toLowerCase());
        const params=new URLSearchParams({run:'1'});
        if(city)params.set('city',city.name);
        else if(/^\d{5}(?:-\d{4})?$/.test(value))params.set('zip',value);
        else if(/^\d+\s/.test(value))params.set('address',value);
        else if(/^[a-z]{1,5}\d{6,}$/i.test(value))params.set('mls',value);
        else if(value)params.set('address',value);
        navigate('/search?'+params);
      }finally{button.disabled=false;}
    });
  }
  if(path==='/featured'||path==='/sold')bindLiveCatalogue(path.slice(1));
  DaisySearch.bind();
  DaisyWeixin.bind();
}
function runSearch(form,options={}){return runLiveSearch(form,options);}
document.addEventListener('click',e=>{const link=e.target.closest('a');if(link&&link.origin===location.origin&&!link.hash&&link.target!=='_blank'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&!link.download){e.preventDefault();navigate(link.pathname+link.search);return;}if(e.target.closest('.dialog-close'))e.target.closest('dialog').close();});
document.querySelector('.menu-toggle').addEventListener('click',e=>setMobileMenu(e.currentTarget.getAttribute('aria-expanded')!=='true'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

window.addEventListener('popstate',()=>{route();closeMenu();});
window.addEventListener('pageshow',()=>{if(location.pathname==='/'&&!location.hash)window.scrollTo({top:0,left:0,behavior:'instant'});});

// Freeze the page behind every dialog, including touch scrolling on iOS.
// Observe removals too: navigating away can remove an open dialog without close().
(() => {
  const root=document.documentElement,body=document.body;
  const properties=['position','top','left','width','padding-right'];
  let saved=null;
  function sync(){
    const open=!!document.querySelector('dialog[open]');
    if(open&&!saved){
      const gap=Math.max(0,window.innerWidth-root.clientWidth);
      const padding=parseFloat(getComputedStyle(body).paddingRight)||0;
      saved={x:window.scrollX,y:window.scrollY,url:location.href,
        styles:properties.map(name=>[name,body.style.getPropertyValue(name),body.style.getPropertyPriority(name)])};
      body.style.position='fixed';body.style.top=`-${saved.y}px`;body.style.left=`-${saved.x}px`;
      body.style.width='100%';
      if(gap)body.style.paddingRight=`${padding+gap}px`;
      root.classList.add('dialog-scroll-locked');
    }else if(!open&&saved){
      const previous=saved;saved=null;
      root.classList.remove('dialog-scroll-locked');
      for(const [name,value,priority] of previous.styles){
        if(value)body.style.setProperty(name,value,priority);else body.style.removeProperty(name);
      }
      if(location.href===previous.url)window.scrollTo({left:previous.x,top:previous.y,behavior:'instant'});
    }
  }
  const containsDialog=node=>node.nodeType===1&&(node.matches('dialog')||node.querySelector('dialog'));
  new MutationObserver(records=>{
    if(records.some(record=>record.type==='attributes'?record.target.matches('dialog'):
      [...record.addedNodes,...record.removedNodes].some(containsDialog)))sync();
  }).observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  window.addEventListener('pageshow',sync);
  sync();
})();
route();

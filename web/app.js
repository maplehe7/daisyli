'use strict';
// Older cached mobile.js files can remain in a visitor's browser during rollout.
function scrollToPageStart(){window.scrollTo({top:window.DaisyHomeViewport?.offset?.()||0,left:0,behavior:'instant'});}
document.querySelectorAll('link[rel~="icon"]').forEach(icon => {
  icon.href = 'https://maplehe7.github.io/daisyli/web/assets/favicon.png'; icon.type = 'image/png'; icon.setAttribute('sizes', '256x256');
});
// Keep the existing WordPress entry page in sync with the hosted header assets.
const headerBrand = document.querySelector('.site-header .brand');
headerBrand.querySelector('span').textContent = 'Daisy Li, Broker';
headerBrand.querySelector('img').src = 'https://maplehe7.github.io/daisyli/web/assets/daisylogo_black.png';
document.querySelector('#main-nav a[href="/account"]')?.remove();
if(!document.querySelector('#main-nav .nav-phone')){
  const phoneLink=document.createElement('a');
  phoneLink.className='nav-phone';
  phoneLink.href='tel:+19498610160';
  phoneLink.textContent='(949) 861-0160';
  document.getElementById('main-nav').append(phoneLink);
}
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
function home(){return (DaisyHeroVideo.deferImages || (html=>html))(`<div class="home-intro"><div class="hero-photo"><img src="https://maplehe7.github.io/daisyli/web/assets/home-film-v4/poster-lite.jpg" alt="" fetchpriority="high" width="1920" height="1080"></div><section class="home-hero wrap" aria-labelledby="home-title"><div class="hero-copy"><h1 id="home-title">Daisy Li</h1><p class="home-credentials"><span>Broker</span><span aria-hidden="true"> | </span><span>DRE #01986831</span></p><p class="home-region">Orange County Real Estate</p></div><a class="button home-search-button" href="/search">Search homes ${arrow}</a></section></div>
<section class="section wrap"><div class="section-heading"><div><h2>Featured Properties</h2></div><a class="text-link" href="/featured">Featured Homes ${arrow}</a></div><div class="property-grid" id="home-live-listings">${idxLoading()}</div></section>
<section class="about-intro"><div class="wrap about-grid"><div class="portrait-frame"><img src="https://maplehe7.github.io/daisyli/web/assets/daisy-portrait.jpeg" alt="Daisy Li, Orange County real estate broker" width="500" height="540" loading="lazy"></div><div class="about-copy"><h2>About Daisy</h2><p>${escapeHTML(siteLanguage==='zh'?chineseContent.homeBio:originalContent.homeBio)}</p><a class="text-link" href="/about">LEARN MORE ${arrow}</a></div></div></section>
<section class="section wrap"><div class="section-heading"><div><h2>Neighborhoods</h2></div><a class="text-link" href="/neighborhoods">Neighborhoods ${arrow}</a></div><div class="community-grid">${places.map(communityCard).join('')}</div></section>
${clientStories()}
${DaisyVideos.render()}${cta()}`);}
function communityCard(p){return `<a class="community-card" href="/neighborhoods/${p.slug}"><div><img src="https://maplehe7.github.io/daisyli/web/assets/${encodeURIComponent(p.image)}" alt="${p.name}, California" loading="lazy" width="500" height="560"></div><h3>${p.name} ${diagonal}</h3></a>`;}
function pageIntro(title,description,extra=''){return `<div class="page-intro wrap"><h1>${title}</h1>${description?`<p>${description}</p>`:''}${extra}</div>`;}
function catalogue(kind){const soldPage=kind==='sold';return `${pageIntro(soldPage?'Sold Homes':'Featured Homes','')}<section class="wrap catalogue-section"><div class="listing-toolbar"><div class="catalog-tabs"><a href="/featured" class="${!soldPage?'active':''}">Featured homes</a><a href="/sold" class="${soldPage?'active':''}">Sold homes</a></div><div class="toolbar-filters"><label class="sr-only" for="catalog-city">Filter by city</label><select id="catalog-city"><option value="">All locations</option>${places.map(p=>`<option value="${p.name}">${p.name}</option>`).join('')}</select><label class="sr-only" for="catalog-sort">Sort homes</label><select id="catalog-sort"><option value="default">Featured order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select><a class="text-link" href="/account">My Account</a></div></div><div class="results-meta"><span id="listing-count"></span></div><div class="property-grid" id="catalog-grid">${idxLoading()}</div><div class="idx-catalog-extra"></div></section>${cta()}`;}
const matrixSearchUrl = 'https://matrix.crmls.org/Matrix/public/IDX.aspx?idx=fd6f332a';
function searchPage() {
  const chinese = siteLanguage === 'zh';
  return `<section class="matrix-search-page" aria-labelledby="matrix-search-title">
    <div class="wrap matrix-search">
      <div class="matrix-search-heading">
        <div>
          <h1 id="matrix-search-title">Home Search</h1>
          <p>${chinese ? '用筛选条件缩小范围，例如邮编、价格和房屋类型。' : 'Use Filters to narrow by ZIP code, price, or property type.'}</p>
        </div>
        <a class="button button-outline matrix-search-link" href="${matrixSearchUrl}" target="_blank" rel="noopener">${chinese ? '在新标签页中打开' : 'Open in a new tab'} ${diagonal}</a>
      </div>
      <iframe class="matrix-search-frame" src="${matrixSearchUrl}" title="${chinese ? 'CRMLS 地图房源搜索' : 'CRMLS map property search'}"></iframe>
    </div>
  </section>`;
}
function about(){if(siteLanguage==='zh')return `<section class="about-hero wrap"><div class="about-hero-photo"><img src="https://maplehe7.github.io/daisyli/web/assets/daisy-portrait.jpeg" alt="Daisy Li" width="500" height="540"></div><div><h1>关于 Daisy</h1>${chineseContent.biography.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}<a class="button" href="/contact">微信联系 ${arrow}</a></div></section>${cta()}`;return `<section class="about-hero wrap"><div class="about-hero-photo"><img src="https://maplehe7.github.io/daisyli/web/assets/daisy-portrait.jpeg" alt="Daisy Li" width="500" height="540"></div><div><h1>About Me</h1><p>${escapeHTML(originalContent.about[0])}</p><a class="button" href="/contact">Contact Me ${arrow}</a></div></section><section class="story-section wrap original-biography"><div class="story-copy">${originalContent.about.slice(1).map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</div></section><section class="wrap chinese-story" lang="zh"><div>${originalContent.chinese.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</div></section>${cta()}`;}
function communities(slug){const p=places.find(x=>x.slug===slug);if(!p)return `${pageIntro('Neighborhoods','')}<section class="wrap section community-index"><div class="community-grid">${places.map(communityCard).join('')}</div></section>${cta()}`;const properties=[true];const content=(siteLanguage==='zh'?chineseContent:originalContent).communities[p.slug];return `<section class="community-hero"><img src="https://maplehe7.github.io/daisyli/web/assets/${encodeURIComponent(p.image)}" alt="${p.name}" width="1400" height="600"><div class="wrap"><a class="back-link" href="/neighborhoods">All neighborhoods</a><h1>${p.name}</h1></div></section><section class="wrap community-story"><h2>${escapeHTML(content.heading)}</h2><div>${content.paragraphs.map(text=>`<p>${escapeHTML(text).replace(/\n\n/g,'<br><br>')}</p>`).join('')}<a class="button" href="/search">Search homes ${arrow}</a></div></section>${properties.length?`<section class="section wrap"><div class="section-heading"><h2>${p.name} homes</h2><a class="text-link" href="/search">Search homes ${arrow}</a></div><div class="property-grid" id="community-live-listings" data-city="${p.name}">${idxLoading()}</div></section>`:''}${cta()}`;}
function clientStories(){return `<section id="testimonials" class="testimonial-feature home-testimonials" aria-labelledby="testimonials-title"><div class="wrap"><h2 id="testimonials-title">Testimonials</h2><div class="home-testimonial-list">${(siteLanguage==='zh'?chineseContent.testimonials:testimonials).map(t=>`<figure class="home-testimonial"><blockquote><p>${escapeHTML(t.full)}</p></blockquote><figcaption>${escapeHTML(t.name)}</figcaption></figure>`).join('')}</div></div></section>`;}
function contact(){return `<section class="contact-page wrap original-contact"><div class="contact-copy"><h1>Contact Me</h1><p class="contact-license">DRE #01986831</p><div class="contact-detail"><span>Phone</span><a href="tel:+19498610160">(949) 861-0160 ${diagonal}</a></div><div class="contact-detail"><span>Email</span><a href="mailto:daisylirealty@gmail.com">daisylirealty@gmail.com ${diagonal}</a></div>${DaisyWeixin.render()}</div><div class="contact-original-photo"><img src="https://maplehe7.github.io/daisyli/web/assets/daisy-portrait.jpeg" alt="Daisy Li" width="500" height="540"></div></section>`;}
function detail(id){return DaisyProperty.render(id);}
function notFound(){return `${pageIntro('Page not found','')}<div class="wrap section"><a class="button" href="/">Back to home ${arrow}</a></div>`;}
function route(){window.DaisyHeroVideo?.beginRoute?.();if(/^\/testimonials\/?$/.test(location.pathname))history.replaceState({},'',`/${location.search}#testimonials`);cancelIdxRequests();DaisyMap.clear();DaisyProperty.close();const requestedLanguage=new URLSearchParams(location.search).get('lang');if(['en','zh'].includes(requestedLanguage))siteLanguage=requestedLanguage;const path=location.pathname.replace(/\/$/,'')||'/';history.scrollRestoration=path==='/'?'manual':'auto';const parts=path.split('/');shown=12;document.body.classList.toggle('home-page',path==='/');const renderers={'/':home,'/about':about,'/search':searchPage,'/featured':()=>catalogue('featured'),'/sold':()=>catalogue('sold'),'/contact':contact,'/account':DaisyAccount.render};main.innerHTML=renderers[path]?renderers[path]():parts[1]==='neighborhoods'?communities(parts[2]):parts[1]==='property'?detail(parts[2]):notFound();document.title=(path==='/'?'Orange County Real Estate':(main.querySelector('h1')?.textContent||'Daisy Li'))+' · Daisy Li';document.querySelectorAll('#main-nav a').forEach(a=>{if(a.pathname===path)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});bindPage(path);DaisyAccount.bind();if(parts[1]==='property')DaisyProperty.bind(parts[2]);bindMobileLayout();DaisyVideos.bind();applyLanguage();document.querySelectorAll('a[href$="#testimonials"]').forEach(link=>{if(link.origin===location.origin)link.setAttribute('href',rememberLanguageURL('/#testimonials'));});if(path==='/'&&!location.hash)scrollToPageStart();if(path==='/'&&location.hash==='#testimonials')requestAnimationFrame(()=>document.getElementById('testimonials')?.scrollIntoView({behavior:'instant'}));if(path==='/'){const highlights=document.getElementById('home-live-listings');const load=()=>{if(highlights?.isConnected)loadLiveHighlights(highlights);};if(DaisyHeroVideo.afterBuffered)DaisyHeroVideo.afterBuffered(load);else load();}const communityGrid=document.getElementById('community-live-listings');if(communityGrid)loadLiveHighlights(communityGrid,communityGrid.dataset.city);}
function navigate(href){href=rememberLanguageURL(href);history.pushState({},'',href);route();scrollToPageStart();main.focus({preventScroll:true});closeMenu();}
function closeMenu(){setMobileMenu(false);}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function bindPage(path){
  if(path==='/featured'||path==='/sold')bindLiveCatalogue(path.slice(1));
  DaisyWeixin.bind();
}
function runSearch(form,options={}){return runLiveSearch(form,options);}
document.addEventListener('click',e=>{const link=e.target.closest('a');if(link&&link.origin===location.origin&&!link.hash&&link.target!=='_blank'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&!link.download){e.preventDefault();navigate(link.pathname+link.search);return;}if(e.target.closest('.dialog-close'))e.target.closest('dialog').close();});
document.querySelector('.menu-toggle').addEventListener('click',e=>setMobileMenu(e.currentTarget.getAttribute('aria-expanded')!=='true'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

window.addEventListener('popstate',()=>{route();closeMenu();});
window.addEventListener('pageshow',event=>{if(event.persisted&&location.pathname==='/'&&!location.hash)scrollToPageStart();});

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

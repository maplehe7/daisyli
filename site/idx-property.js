'use strict';
window.DaisyProperty=(()=>{
  let current=null,photoIndex=0,photos=[];
  const gallery=document.createElement('dialog');gallery.id='photo-dialog';document.body.append(gallery);
  const num=value=>Number(String(value??'').replace(/[^\d.-]/g,''))||0;
  const safeURL=value=>{try{const url=new URL(value);return /^https?:$/.test(url.protocol)&&!(/\.pdf(?:$|\?)/i.test(url.href)||url.pathname.includes('DOCUMENT-Pdf'))?url.href:'';}catch{return '';}};
  function render(id){return /^[a-f\d-]{36}$/i.test(id)?`<section class="wrap property-page" id="property-page" data-property-id="${escapeHTML(id)}">${idxLoading()}</section>`:notFound();}
  const fact=(label,value)=>value!==undefined&&value!==null&&value!==''?`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`:'';
  const propertyType=value=>String(value??'')
    .replace(/([a-z0-9])([A-Z])/g,'$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g,'$1 $2')
    .trim();
  const featureAliases={
    'Garage Faces Side':'Side-facing garage','Garage Faces Front':'Front-facing garage','Garage Faces Rear':'Rear-facing garage',
    'Door Multi':'Multiple garage doors','Door Single':'Single garage door',
    'Front Porch Patio':'Front Porch','Custom Coverings':'Custom Window Coverings','Double Pane Windows':'Double-Pane Windows',
    'Fireplace Primary Bedroom':'Primary Bedroom Fireplace','Fireplace Family Room':'Family Room Fireplace','Fireplace Living Room':'Living Room Fireplace',
    'Walk In Pantry':'Walk-in Pantry','Mountains View':'Mountain View'
  };
  function featureName(value){
    const spaced=propertyType(value).replace(/_/g,' ').replace(/\b(\w+)(?:\s+\1\b)+/gi,'$1').replace(/\s+/g,' ').trim();
    return featureAliases[spaced]||spaced;
  }
  const featureCategories=[
    ['Appliances',/stove|oven|dishwasher|refrigerator|freezer|microwave|cooktop|range|disposal|barbecue|water softener|water purifier/i],
    ['Heating & Cooling',/cooling|\bheat(?:ing)?\b|air condition/i],
    ['Parking',/garage|driveway|^door\s*(multi|single)|^paved$|parking|carport/i],
    ['View',/\bview\b/i],
    ['Pool & Spa',/\b(pool|spa)\b/i],
    ['Water & Sewer',/\b(water|sewer|septic)\b/i],
    ['Exterior Features',/exterior|style|roof|patio|porch|balcony|deck|fence|garden|landscap/i],
    ['Interior Features',/floor|fireplace|ceiling|built-in|breakfast|molding|dining|pantry|storage|foyer|bath|loft|suite|cellar|covering|window|drapes|screens|shutters|kitchen|\bbar\b/i]
  ];
  function featureGroups(items){
    const groups=new Map();
    for(const item of Array.isArray(items)?items:[]){
      const raw=String(item??'').trim();if(!raw)continue;
      const colon=raw.indexOf(':');
      const original=colon>0?raw.slice(colon+1).trim():raw;
      if(!original)continue;
      let category=colon>0?featureName(raw.slice(0,colon).trim()):'';
      const match=featureCategories.find(([,pattern])=>pattern.test(propertyType(category||original)));
      category=match?.[0]||category||'Other features';
      const name=featureName(original);
      if(!groups.has(category))groups.set(category,new Map());
      groups.get(category).set(name.toLowerCase(),{name,original});
    }
    const order=['Appliances','Interior Features','Heating & Cooling','Parking','Exterior Features','Pool & Spa','View','Water & Sewer','Other features'];
    return [...groups].sort(([a],[b])=>{
      const rank=value=>{const index=order.indexOf(value);return index<0?order.length:index;};return rank(a)-rank(b);
    });
  }
  function features(items){
    const groups=featureGroups(items);if(!groups.length)return '';
    return '<section class="property-features"><h2>Features</h2><div class="property-feature-groups">'+groups.map(([category,values])=>{
      const entries=[...values.values()];
      for(const {name,original} of entries)if(chineseUI[original]&&!chineseUI[name])chineseUI[name]=chineseUI[original];
      return '<section class="property-feature-group"><h3>'+escapeHTML(category)+'</h3><ul>'+entries.map(({name})=>'<li>'+escapeHTML(name)+'</li>').join('')+'</ul></section>';
    }).join('')+'</div></section>';
  }
  function contactButton(){return '<aside class="property-contact"><a class="button" href="/contact">Contact Me '+arrow+'</a></aside>';}
  function calculatorField(name,label,{value='',unit='$',required=false,step='0.01'}={}){
    return '<label class="field mortgage-field" for="mortgage-'+name+'"><span>'+label+'</span><span class="mortgage-input"><span aria-hidden="true">'+unit+'</span><input id="mortgage-'+name+'" name="'+name+'" type="number" inputmode="decimal" min="0" step="'+step+'" '+(required?'required ':'')+'value="'+escapeHTML(value)+'"></span></label>';
  }
  function calculator(p){return `<details class="property-calculator" open><summary><span>Mortgage calculator</span><span class="calculator-toggle" aria-hidden="true">+</span></summary><form id="mortgage-form" novalidate><div class="mortgage-core-grid">${calculatorField('price','Price',{value:p.price,required:true})}<fieldset class="mortgage-down"><legend>Down payment</legend><div class="mortgage-down-inputs"><label class="mortgage-input"><span aria-hidden="true">$</span><input id="mortgage-down" name="down" aria-label="Down payment" type="number" inputmode="decimal" min="0" step="0.01" value="${Math.round(p.price*.2)}" required></label><label class="mortgage-input mortgage-percent"><input id="mortgage-down-percent" name="downPercent" aria-label="Down payment (%)" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="20" required><span aria-hidden="true">%</span></label></div><input class="mortgage-range" name="downSlider" aria-label="Down payment (%)" type="range" min="0" max="100" step="1" value="20"></fieldset>${calculatorField('rate','Interest rate (%)',{unit:'%',required:true})}${select('term','Loan term',[['30','30 years'],['20','20 years'],['15','15 years']])}</div><details class="mortgage-costs"><summary><span><span>Annual property tax</span> · <span>Annual insurance</span> · <span>Monthly HOA</span></span><span class="calculator-toggle" aria-hidden="true">+</span></summary><div class="mortgage-cost-grid">${calculatorField('tax','Annual property tax',{value:0})}${calculatorField('insurance','Annual insurance',{value:0})}${calculatorField('hoa','Monthly HOA',{value:num(p.raw.HOAFee1)})}</div></details><p class="form-message is-error" role="status"></p><div class="mortgage-bottom"><output id="mortgage-result" aria-live="polite"><small>Estimated payment</small><div><strong>—</strong><span>/ month</span></div></output><button class="button" type="submit">Calculate</button></div></form></details>`;}
  async function bind(id){
    const container=document.getElementById('property-page');if(!container)return;
    const controller=new AbortController();idxControllers.add(controller);
    try{
      const raw=await DaisyIDX.property(id,{signal:controller.signal});if(!container.isConnected)return;
      const previous=DaisyIDX.properties.get(id.toUpperCase());
      const hidden=String(raw.InternetAddressDisplay).toLowerCase()==='false'||String(raw.InternetAddressDisplay)==='0';
      const p={...previous,id,mls:raw.MLS_NUM||previous?.mls||'',address:hidden?'Address available on request':String(raw.addressA||raw.address||previous?.address||'').trim(),city:raw.CityName||previous?.city||'',zip:String(raw.ZIP||previous?.zip||'').trim().replace(/-$/,''),price:num(raw.listprice)||previous?.price||0,beds:num(raw.nBeds),baths:num(raw.nBaths),sqft:num(raw.ImprovedSquareFeet),status:raw.ListingStatus||previous?.status||'',raw};
      current=p;photos=(Array.isArray(raw.firstImage)?raw.firstImage:[raw.firstImage]).map(safeURL).filter(Boolean);photoIndex=0;
      DaisyIDX.properties.set(id.toUpperCase(),p);
      container.innerHTML=`<div class="property-intro"><div class="property-title"><div><h1>${escapeHTML(p.address)}</h1><p>${escapeHTML(p.city)}, CA ${escapeHTML(p.zip)}</p></div><div class="detail-price"><div class="property-price-line"><span>${money(p.price)}</span><span class="detail-status">${escapeHTML(p.status)}</span></div><div class="property-facts"><span>${p.beds} beds</span><span>${p.baths} baths</span><span>${number(p.sqft)} sq ft</span></div></div></div><div class="property-gallery ${photos.length<3?'few-photos':''}">${photos.slice(0,3).map((src,i)=>`<button class="gallery-tile" data-photo="${i}" aria-label="View photo ${i+1}"><img src="${escapeHTML(src)}" alt="${escapeHTML(p.address)} · ${i+1}" ${i?'loading="lazy"':'fetchpriority="high"'}></button>`).join('')}${photos.length?`<button class="button gallery-all" data-photo="0">All photos (${photos.length})</button>`:'<div class="photo-unavailable">Photo unavailable</div>'}</div></div><div class="property-layout"><div class="property-body"><section class="property-overview"><h2>Overview</h2>${(Array.isArray(raw.rem)?raw.rem:[raw.rem]).filter(Boolean).map(text=>`<p data-no-translate>${escapeHTML(text)}</p>`).join('')}${p.virtualTour?`<a class="text-link" href="${escapeHTML(safeURL(p.virtualTour))}" target="_blank" rel="noopener">Virtual tour ${diagonal}</a>`:''}<div id="property-open-house"></div></section><section><h2>Property details</h2><dl class="detail-facts">${fact('MLS number',p.mls)+fact('Property type',propertyType(raw.PropSubType||raw.PropertyType))+fact('Year built',raw.YearBuilt)+fact('Lot size',raw.LotSquareFeet?number(num(raw.LotSquareFeet))+' sq ft':'')+fact('Garage',raw.GarageCars)+fact('Stories',raw.Stories)+fact('HOA',raw.HOAFee1?money(num(raw.HOAFee1)):'')+fact('County',raw.County)+fact('Days on market',raw.daysOnMarket)+fact('Last updated',raw.Modified?.date||raw.Modified||raw.databaseUpdated)}</dl></section>${features(raw.ntFt)}<section id="detail-location" hidden><h2>Location</h2><div class="detail-map" id="property-map"></div></section>${calculator(p)}<section class="listing-credit"><h2>Listing information</h2><p>${escapeHTML([raw.ListAgentFirstName,raw.ListAgentLastName].filter(Boolean).join(' '))}${raw.ListAgentDRE?' · DRE #'+escapeHTML(raw.ListAgentDRE):''}</p><p>${escapeHTML(raw.ListOfficeName||'')}</p><p>${escapeHTML(raw.OriginatingSystemName||raw.systemName||'')} · MLS #${escapeHTML(p.mls)}</p></section></div>${contactButton()}</div>`;
      const credit=container.querySelector('.listing-credit p');const first=String(raw.ListAgentFirstName||'').trim(),last=String(raw.ListAgentLastName||'').trim();if(first&&last.toLowerCase().startsWith(first.toLowerCase()+' '))credit.textContent=last+(raw.ListAgentDRE?' · DRE #'+raw.ListAgentDRE:'');
      document.title=p.address+' · Daisy Li';
      container.querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>openGallery(Number(button.dataset.photo)));
      bindCalculator(container);DaisyAccount.paint();applyLanguage(container);
      if(!p.latitude&&p.mls){try{const result=await DaisyIDX.listings('/'+encodeURIComponent(p.mls)+'_mlsNumber',{signal:controller.signal});const found=result.items.find(item=>item.id.toUpperCase()===id.toUpperCase());if(found)for(const key of ['latitude','longitude','virtualTour','openStart','openEnd'])p[key]=found[key];DaisyIDX.properties.set(id.toUpperCase(),p);}catch{}}
      if(!container.isConnected)return;
      if(p.latitude&&p.longitude){container.querySelector('#detail-location').hidden=false;DaisyMap.property(container.querySelector('#property-map'),p);}
      if(p.openStart){const date=new Date(p.openStart);if(Number.isFinite(date.getTime()))container.querySelector('#property-open-house').innerHTML=`<h3>Open house</h3><p>${escapeHTML(date.toLocaleString(siteLanguage==='zh'?'zh-CN':'en-US'))}${p.openEnd?' – '+escapeHTML(new Date(p.openEnd).toLocaleTimeString(siteLanguage==='zh'?'zh-CN':'en-US',{hour:'numeric',minute:'2-digit'})):''}</p>`;}
      if(p.virtualTour&&!container.querySelector('.property-overview a'))container.querySelector('.property-overview').insertAdjacentHTML('beforeend',`<a class="text-link" target="_blank" rel="noopener" href="${escapeHTML(safeURL(p.virtualTour))}">Virtual tour ${diagonal}</a>`);
      applyLanguage(container);
    }catch(error){if(container.isConnected){container.innerHTML=`<div class="empty-state"><h1>${error.status===404?'Property not found':'Property unavailable'}</h1><button class="button" data-property-retry>Try again</button><a class="text-link" href="/search">Home Search</a></div>`;container.querySelector('[data-property-retry]').onclick=()=>bind(id);applyLanguage(container);}}
    finally{idxControllers.delete(controller);}
  }
  function openGallery(index){
    photoIndex=index;gallery.innerHTML=`<button class="dialog-close" aria-label="Close photos">×</button><div class="gallery-stage"><button class="gallery-prev" aria-label="Previous photo">‹</button><img id="gallery-photo" alt=""><button class="gallery-next" aria-label="Next photo">›</button></div><div class="gallery-bottom"><span id="gallery-count" aria-live="polite"></span><div class="gallery-thumbnails">${photos.map((src,i)=>`<button data-gallery-index="${i}" aria-label="View photo ${i+1}"><img src="${escapeHTML(src)}" alt="" loading="lazy"></button>`).join('')}</div></div>`;
    gallery.querySelector('.gallery-prev').onclick=()=>setPhoto(photoIndex-1);gallery.querySelector('.gallery-next').onclick=()=>setPhoto(photoIndex+1);gallery.querySelectorAll('[data-gallery-index]').forEach(button=>button.onclick=()=>setPhoto(Number(button.dataset.galleryIndex)));
    gallery.onkeydown=event=>{if(event.key==='ArrowLeft'){event.preventDefault();setPhoto(photoIndex-1);}if(event.key==='ArrowRight'){event.preventDefault();setPhoto(photoIndex+1);}};
    let startX=0;gallery.querySelector('.gallery-stage').ontouchstart=event=>startX=event.changedTouches[0].clientX;gallery.querySelector('.gallery-stage').ontouchend=event=>{const delta=event.changedTouches[0].clientX-startX;if(Math.abs(delta)>55)setPhoto(photoIndex+(delta<0?1:-1));};
    gallery.showModal();setPhoto(index);applyLanguage(gallery);
  }
  function setPhoto(index){photoIndex=(index+photos.length)%photos.length;const img=gallery.querySelector('#gallery-photo');img.src=photos[photoIndex];img.alt=current.address+' · '+(photoIndex+1);gallery.querySelector('#gallery-count').textContent=`${photoIndex+1} / ${photos.length}`;gallery.querySelectorAll('[data-gallery-index]').forEach(button=>{button.setAttribute('aria-pressed',String(Number(button.dataset.galleryIndex)===photoIndex));});for(const next of [photoIndex-1,photoIndex+1]){const preload=new Image();preload.src=photos[(next+photos.length)%photos.length];}}
  function bindCalculator(container){
    const form=container.querySelector('#mortgage-form');
    const {price,down,downPercent,downSlider}=form.elements;
    const output=form.querySelector('output'),message=form.querySelector('.form-message');
    let downMode='percent';
    const round=value=>Math.round((value+Number.EPSILON)*100)/100;
    function syncDown(source){
      if(source===down)downMode='amount';
      if(source===downPercent||source===downSlider)downMode='percent';
      if(source===downSlider)downPercent.value=downSlider.value;
      const amount=price.valueAsNumber;
      if(downMode==='percent'){
        down.value=Number.isFinite(amount)&&Number.isFinite(downPercent.valueAsNumber)?round(amount*downPercent.valueAsNumber/100):'';
      }else downPercent.value=amount>0&&Number.isFinite(down.valueAsNumber)?round(down.valueAsNumber/amount*100):'';
      downSlider.value=String(Math.max(0,Math.min(100,downPercent.valueAsNumber||0)));
      down.max=Number.isFinite(amount)?String(amount):'';
    }
    function calculate(){
      down.setCustomValidity('');message.textContent='';
      const exceeds=Number.isFinite(down.valueAsNumber)&&Number.isFinite(price.valueAsNumber)&&down.valueAsNumber>price.valueAsNumber;
      if(exceeds){
        const error='Down payment cannot exceed the price.';
        message.textContent=error;down.setCustomValidity(siteLanguage==='zh'?zh(error):error);
      }
      let payment=null;
      if(form.checkValidity()){
        const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,Number(value)]));
        const loan=values.price-values.down,months=values.term*12,rate=values.rate/1200;
        payment=(rate?loan*rate/-Math.expm1(-months*Math.log1p(rate)):loan/months)+(values.tax+values.insurance)/12+values.hoa;
      }
      output.innerHTML='<small>Estimated payment</small><div><strong>'+(Number.isFinite(payment)?money(payment):'—')+'</strong><span>/ month</span></div>';
      output.dataset.ready=String(Number.isFinite(payment));
      applyLanguage(output);applyLanguage(message);
    }
    form.addEventListener('input',event=>{
      if([price,down,downPercent,downSlider].includes(event.target))syncDown(event.target);
      calculate();
    });
    form.addEventListener('change',calculate);
    form.onsubmit=event=>{
      event.preventDefault();calculate();
      const invalid=form.querySelector(':invalid');
      if(invalid){const disclosure=invalid.closest('.mortgage-costs');if(disclosure)disclosure.open=true;invalid.reportValidity();invalid.focus();return;}
      output.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
    };
    syncDown(downPercent);calculate();
  }
  return {render,bind,close(){if(gallery.open)gallery.close();}};
})();

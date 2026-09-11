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
  function inquiry(p){return `<aside class="property-inquiry"><div class="inquiry-agent"><img src="/assets/daisy-portrait.jpeg" alt="Daisy Li"><div><h2>Daisy Li</h2><a href="tel:+19498610160">(949) 861-0160</a></div></div><form id="property-inquiry-form"><h3>Request information</h3>${DaisyAccount.field('name','Name',{required:true,autocomplete:'name'},'inquiry')}${DaisyAccount.field('email','Email',{required:true,type:'email',autocomplete:'email'},'inquiry')}${DaisyAccount.field('phone','Phone',{type:'tel',autocomplete:'tel'},'inquiry')}<label class="field" for="inquiry-message"><span>Message</span><textarea name="message" id="inquiry-message" rows="4" maxlength="4000" required></textarea></label><label class="check"><input type="checkbox" name="showing"><span>Request a showing</span></label><div id="showing-fields" hidden><label class="field" for="inquiry-date"><span>Preferred date</span><input type="date" id="inquiry-date" name="date" min="${new Date().toLocaleDateString('en-CA')}"></label>${select('response','Response requested',[['Immediately','Immediately'],['In the next week','In the next week']])}</div><p class="form-message" role="status"></p><div class="inquiry-actions"><button type="submit" name="delivery" value="sms" class="button">Send text ${arrow}</button><button type="submit" name="delivery" value="email" class="text-link">Send email</button></div></form></aside>`;}
  function calculator(p){return `<details class="property-calculator"><summary>Mortgage calculator</summary><form id="mortgage-form"><div class="fields-grid two">${DaisyAccount.field('price','Price',{type:'number',value:p.price},'mortgage')}${DaisyAccount.field('down','Down payment',{type:'number',value:Math.round(p.price*.2)},'mortgage')}${DaisyAccount.field('rate','Interest rate (%)',{type:'number',required:true},'mortgage')}${select('term','Loan term',[['30','30 years'],['20','20 years'],['15','15 years']])}${DaisyAccount.field('tax','Annual property tax',{type:'number',value:0},'mortgage')}${DaisyAccount.field('insurance','Annual insurance',{type:'number',value:0},'mortgage')}${DaisyAccount.field('hoa','Monthly HOA',{type:'number',value:num(p.raw.HOAFee1)},'mortgage')}</div><p class="form-message" role="status"></p><button class="button button-outline" type="submit">Calculate</button><output id="mortgage-result" aria-live="polite"></output></form></details>`;}
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
      container.innerHTML=`<div class="property-intro"><div class="property-title"><div><h1>${escapeHTML(p.address)}</h1><p>${escapeHTML(p.city)}, CA ${escapeHTML(p.zip)}</p></div><div class="detail-price"><div class="property-price-line"><span>${money(p.price)}</span><span class="detail-status">${escapeHTML(p.status)}</span></div><div class="property-facts"><span>${p.beds} beds</span><span>${p.baths} baths</span><span>${number(p.sqft)} sq ft</span></div></div></div><div class="property-gallery ${photos.length<3?'few-photos':''}">${photos.slice(0,3).map((src,i)=>`<button class="gallery-tile" data-photo="${i}" aria-label="View photo ${i+1}"><img src="${escapeHTML(src)}" alt="${escapeHTML(p.address)} · ${i+1}" ${i?'loading="lazy"':'fetchpriority="high"'}></button>`).join('')}${photos.length?`<button class="button gallery-all" data-photo="0">All photos (${photos.length})</button>`:'<div class="photo-unavailable">Photo unavailable</div>'}</div></div><div class="property-layout"><div class="property-body"><section class="property-overview"><h2>Overview</h2>${(Array.isArray(raw.rem)?raw.rem:[raw.rem]).filter(Boolean).map(text=>`<p data-no-translate>${escapeHTML(text)}</p>`).join('')}${p.virtualTour?`<a class="text-link" href="${escapeHTML(safeURL(p.virtualTour))}" target="_blank" rel="noopener">Virtual tour ${diagonal}</a>`:''}<div id="property-open-house"></div></section><section><h2>Property details</h2><dl class="detail-facts">${fact('MLS number',p.mls)+fact('Property type',propertyType(raw.PropSubType||raw.PropertyType))+fact('Year built',raw.YearBuilt)+fact('Lot size',raw.LotSquareFeet?number(num(raw.LotSquareFeet))+' sq ft':'')+fact('Garage',raw.GarageCars)+fact('Stories',raw.Stories)+fact('HOA',raw.HOAFee1?money(num(raw.HOAFee1)):'')+fact('County',raw.County)+fact('Days on market',raw.daysOnMarket)+fact('Last updated',raw.Modified?.date||raw.Modified||raw.databaseUpdated)}</dl></section>${Array.isArray(raw.ntFt)&&raw.ntFt.length?`<section><h2>Features</h2><dl class="detail-features">${raw.ntFt.map(item=>{const text=String(item),colon=text.indexOf(':');return colon>0?fact(escapeHTML(text.slice(0,colon)),text.slice(colon+1).trim()):fact('',text);}).join('')}</dl></section>`:''}<section id="detail-location" hidden><h2>Location</h2><div class="detail-map" id="property-map"></div></section>${calculator(p)}<section class="listing-credit"><h2>Listing information</h2><p>${escapeHTML([raw.ListAgentFirstName,raw.ListAgentLastName].filter(Boolean).join(' '))}${raw.ListAgentDRE?' · DRE #'+escapeHTML(raw.ListAgentDRE):''}</p><p>${escapeHTML(raw.ListOfficeName||'')}</p><p>${escapeHTML(raw.OriginatingSystemName||raw.systemName||'')} · MLS #${escapeHTML(p.mls)}</p></section></div>${inquiry(p)}</div>`;
      const credit=container.querySelector('.listing-credit p');const first=String(raw.ListAgentFirstName||'').trim(),last=String(raw.ListAgentLastName||'').trim();if(first&&last.toLowerCase().startsWith(first.toLowerCase()+' '))credit.textContent=last+(raw.ListAgentDRE?' · DRE #'+raw.ListAgentDRE:'');
      document.title=p.address+' · Daisy Li';
      container.querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>openGallery(Number(button.dataset.photo)));
      bindInquiry(container,p);bindCalculator(container);DaisyAccount.paint();applyLanguage(container);
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
  function bindInquiry(container,p){
    const form=container.querySelector('#property-inquiry-form');
    form.elements.showing.onchange=()=>{form.querySelector('#showing-fields').hidden=!form.elements.showing.checked;form.elements.date.required=form.elements.showing.checked;};
    form.onsubmit=event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const data=Object.fromEntries(new FormData(form)),label=text=>siteLanguage==='zh'?zh(text):text;
      const lines=[p.address,[p.city,'CA',p.zip].filter(Boolean).join(' '),`${label('MLS number')}: ${p.mls}`,'',`${label('Name')}: ${data.name}`,`${label('Email')}: ${data.email}`];
      if(data.phone.trim())lines.push(`${label('Phone')}: ${data.phone}`);
      lines.push('',data.message);
      if(form.elements.showing.checked)lines.push('',label('Request a showing'),`${label('Preferred date')}: ${data.date}`,`${label('Response requested')}: ${label(data.response)}`);
      // A local preview URL would not open on the recipient's phone.
      const pageURL=new URL(location.href);pageURL.search='';pageURL.hash='';
      if(!['localhost','127.0.0.1','[::1]'].includes(pageURL.hostname))lines.push('',pageURL.href);
      const body=encodeURIComponent(lines.join('\n'));
      const apple=/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
      const link=document.createElement('a');link.hidden=true;
      link.href=event.submitter?.value==='email'
        ?`mailto:daisylirealty@gmail.com?subject=${encodeURIComponent(label('Request information')+' · '+p.address)}&body=${body}`
        :`sms:+19498610160${apple?'&':'?'}body=${body}`;
      form.append(link);link.click();link.remove();
      // Keep the draft intact: opening a messaging app does not confirm delivery.
    };
  }
  function bindCalculator(container){const form=container.querySelector('#mortgage-form');form.querySelectorAll('[type=number]').forEach(input=>{input.min='0';input.step=input.name==='rate'?'0.01':'1';});form.onsubmit=event=>{event.preventDefault();const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,Number(value)]));const loan=values.price-values.down,months=values.term*12,r=values.rate/1200;const message=form.querySelector('.form-message');if(loan<0){message.textContent='Down payment cannot exceed the price.';applyLanguage(form);return;}message.textContent='';const payment=(r?loan*r/(1-Math.pow(1+r,-months)):loan/months)+(values.tax+values.insurance)/12+values.hoa;form.querySelector('output').innerHTML=`<strong>${money(payment)} <span>/ month</span></strong><small>Estimated payment</small>`;applyLanguage(form);};}
  return {render,bind,close(){if(gallery.open)gallery.close();}};
})();

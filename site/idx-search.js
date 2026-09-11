'use strict';
window.DaisySearch=(()=>{
  const collections=[['results','All homes'],['newlistings','New listings'],['pricechange','Price changes'],['openhouses','Open houses'],['featuredproperties','Featured Homes'],['soldproperties','Sold Homes']];
  const typeNames=[['home','Single family home'],['condo','Condo / Townhome'],['mobile','Manufactured / Mobile home'],['multiFamily','Multi-family'],['rental','Rental'],['commercial','Commercial'],['land','Land'],['business','Business']];
  function refineForm(form){
    form.classList.add('guided-search');
    const basics=form.querySelector('.search-basics'),primary=basics.querySelector('.fields-grid'),more=form.querySelector('.advanced-details>.fields-grid');
    primary.classList.add('search-primary-grid');
    const rooms=form.querySelector('[name=beds]').closest('.fields-grid');
    for(const name of ['beds','baths'])primary.append(form.querySelector(`[name="${name}"]`).closest('.field'));
    more.prepend(form.querySelector('[name=tract]').closest('.field'));
    rooms.remove();
    form.querySelector('.advanced-details').append(form.querySelector('[name=exact-beds]').closest('.check'));
    for(const field of form.querySelectorAll('.listing-status-section .fields-grid>.field'))more.append(field);
    form.querySelector('.listing-status-section .fields-grid').remove();
    for(const name of ['min','max']){const input=form.querySelector(`[name="${name}"]`);input.placeholder='Any price';input.inputMode='numeric';}
    const shortcuts=document.createElement('div');shortcuts.className='city-shortcuts';
    shortcuts.innerHTML=places.map(place=>`<button type="button" data-city-shortcut="${escapeHTML(place.name)}" aria-pressed="false">${escapeHTML(place.name)}</button>`).join('');
    form.querySelector('#selected-cities').before(shortcuts);

    const types=form.querySelector('.property-types');types.classList.add('search-choice-group');
    const other=document.createElement('details');other.className='other-property-types';other.innerHTML='<summary><span>More</span><span class="property-types-toggle" aria-hidden="true"></span></summary><div class="other-property-options"></div>';
    for(const input of types.querySelectorAll('[name=type]'))if(!['home','condo'].includes(input.value))other.lastElementChild.append(input.closest('.check'));
    types.append(other);
    const statusRow=form.querySelector('.listing-status-section .check-row'),statuses=document.createElement('fieldset');
    statuses.className='search-choice-group search-status-options';statuses.innerHTML='<legend>Status</legend>';
    statusRow.before(statuses);statuses.append(statusRow);
    for(const [name,group] of [['type',types],['status',statuses]]){
      group.id='search-'+name+'-group';
      group.querySelector('legend').insertAdjacentHTML('beforeend',` <span class="required-mark" id="search-${name}-required">Required</span>`);
      group.insertAdjacentHTML('beforeend',`<p class="search-field-error" id="search-${name}-error" role="alert"></p>`);
      for(const input of group.querySelectorAll('input'))input.setAttribute('aria-describedby',`search-${name}-required search-${name}-error`);
    }
    for(const [name,parent] of [['city',form.querySelector('.city-picker')],['price',form.querySelector('[name=max]').closest('.field')]]){
      parent.insertAdjacentHTML('beforeend',`<p class="search-field-error" id="search-${name}-error" role="alert"></p>`);
    }
    form.querySelector('#city-input').setAttribute('aria-describedby','search-city-error');
    form.querySelector('[name=max]').setAttribute('aria-describedby','search-price-error');
    const oldLookup=form.querySelector('.alternative-search'),lookup=document.createElement('details');
    lookup.className='alternative-search search-lookup';
    lookup.innerHTML='<summary><span><span>ZIP code</span> / <span>Street address</span> / <span>MLS number</span></span><span class="plus" aria-hidden="true">+</span></summary>';
    oldLookup.querySelector('h3').remove();lookup.append(...oldLookup.childNodes);oldLookup.replaceWith(lookup);
  }
  function updateRequirements(form){
    const direct=!!(form.elements.address.value.trim()||form.elements.mls.value.trim());
    for(const name of ['type','status']){
      const required=!direct&&(name==='type'||!(form.elements.changed.value||form.elements['sold-within'].value));
      form.querySelector(`#search-${name}-required`).hidden=!required;
      form.querySelector(`#search-${name}-group`).dataset.required=String(required);
      for(const input of form.querySelectorAll(`[name="${name}"]`))input.setAttribute('aria-describedby',`${required?'search-'+name+'-required ':''}search-${name}-error`);
    }
  }
  function clearErrors(form){
    form.querySelectorAll('.search-field-error,#search-error').forEach(el=>el.textContent='');
    form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  }
  function showError(form,message,{focus=true}={}){
    clearErrors(form);
    const targets={
      'Choose at least one property type.':['#search-type-error','[name=type]','#search-type-group'],
      'Choose at least one listing status.':['#search-status-error','[name=status]','#search-status-group'],
      'Choose a maximum price greater than or equal to the minimum.':['#search-price-error','[name=max]'],
      'Choose a city from the list.':['#search-city-error','#city-input']
    };
    const [errorSelector,inputSelector,groupSelector]=targets[message]||['#search-error','#search-error'];
    const error=form.querySelector(errorSelector),input=form.querySelector(inputSelector);error.textContent=message;
    if(inputSelector!=='#search-error')input.setAttribute('aria-invalid','true');
    if(groupSelector)form.querySelector(groupSelector).setAttribute('aria-invalid','true');
    for(let parent=input.parentElement;parent&&parent!==form;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
    applyLanguage(error);
    if(focus){input.focus({preventScroll:true});input.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  }
  function render(base){
    const doc=document.createElement('div');doc.innerHTML=base;const form=doc.querySelector('#advanced-search');
    form.querySelector('.search-basics .fields-grid').innerHTML=`<div class="city-picker"><label class="field" for="city-input"><span>Location</span><div class="city-picker-controls"><input type="text" id="city-input" list="city-list" placeholder="Add a city" autocomplete="off"><button type="button" id="add-city">Add</button></div></label><datalist id="city-list"></datalist><div class="selected-cities" id="selected-cities"></div></div>${DaisyAccount.field('min','Minimum price',{type:'number'},'search')}${DaisyAccount.field('max','Maximum price',{type:'number'},'search')}`;
    form.querySelector('.property-types').innerHTML=`<legend>Property type</legend>${typeNames.map(([value,label])=>checkbox('type',label,value,['home','condo'].includes(value))).join('')}`;
    form.querySelector('.listing-status-section .fields-grid').insertAdjacentHTML('afterbegin',select('collection','Listing collection',collections));
    const more=form.querySelector('.advanced-details .fields-grid');
    const change=(name,options)=>more.querySelector(`[name="${name}"]`).innerHTML=options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    change('year',[['','Any year'],['1950m','Older than 1950'],...[1950,1960,1970,1980,1990,2000,2010,2020].map(n=>[n+'p',n+' or newer']),['m12m','Past 12 months']]);
    change('lot',[['','Any size'],['1000m','Less than 1,000 sq ft'],...[1000,4000,6000,8000,10000,12000,15000,20000,40000,80000].map(n=>[n+'p',number(n)+'+ sq ft'])]);
    change('sqft',[['','Any size'],...[500,750,1000,1250,1500,1750,2000,2250,2500,2750,3000,3500,4000,5000,6000,7000,8000,9000,10000].map(n=>[n,number(n)+'+ sq ft'])]);
    change('garage',[['','No preference'],...[1,2,3,4].map(n=>[n,n+'+ spaces'])]);change('stories',[['','No preference'],...[1,2,3,4].map(n=>[n,n===1?'1 story':n+'+ stories'])]);
    more.insertAdjacentHTML('beforeend',select('view','View',[['','No preference'],['1','Yes'],['2','No']]));
    form.querySelector('[name=sort]').insertAdjacentHTML('beforeend','<option value="stories">Stories</option>');
    for(const input of form.querySelectorAll('[type=number]')){input.min='0';input.step='1';}
    form.insertAdjacentHTML('beforeend','<input type="hidden" name="bounds"><input type="hidden" name="polygon"><input type="hidden" name="display" value="list"><input type="hidden" name="extra">');
    const intro=doc.querySelector('.page-intro');intro.classList.add('search-page-intro');
    intro.insertAdjacentHTML('beforeend',`<nav class="search-collections" aria-label="Home searches">${collections.slice(1,4).map(([value,label])=>`<a href="/search?collection=${value}&run=1">${label}</a>`).join('')}<a href="/account">My Account</a></nav>`);
    refineForm(form);
    return doc.innerHTML;
  }
  function parseNative(query){
    const params=new URLSearchParams(),values={};for(const segment of query.split('/').filter(Boolean)){const index=segment.lastIndexOf('_');if(index>0)values[segment.slice(index+1)]=decodeURIComponent(segment.slice(0,index));}
    const mapping={beds:'beds',baths:'baths',exactBeds:'exact-beds',tractCode:'tract',zip:'zip',address:'address',mlsNumber:'mls',view:'view',garage:'garage',yearBuilt:'year',bldgsqft:'sqft',lotsqft:'lot',stories:'stories',keyword:'keyword',order:'order',rect:'bounds',polygon:'polygon',isOnlyVtour:'virtual-tour'};
    for(const [key,name] of Object.entries(mapping))if(values[key])params.set(name,values[key]);
    for(const name of ['zip','mls','address','tract'])if(params.has(name))params.set(name,params.get(name).replace(/-/g,' ').replace(/\.dashHP\./g,'-').replace(/\.unit\./g,'#'));
    if(values.price){const [min,max]=values.price.split('-');params.set('min',min);if(max)params.set('max',max);}
    if(values.pool)params.set('pool',values.pool==='1'?'yes':'no');
    if(values.orderBy)params.set('sort',({price:'price',sqFt:'sqft',lotSqFt:'lot',yearBuilt:'year',story:'stories'})[values.orderBy]||'price');
    if(values.city)values.city.split(',').forEach(value=>params.append('search-city',value));
    for(const value of (values.homeType||'home,Townhouse').split(','))params.append('type',value==='Townhouse'?'condo':value);
    const statuses={active:'active',pending:'pending','back-offers':'pending',sold:'sold','short-sales':'short',foreclosures:'reo'};
    if(values.homeStatus==='new')params.set('changed',values.days||'1');else if(values.homeStatus==='sOnly')params.set('sold-within',values.days||'30');else for(const value of new Set((values.homeStatus||'active').split(',').map(value=>statuses[value]).filter(Boolean)))params.append('status',value);
    const known=new Set([...Object.keys(mapping),'price','pool','orderBy','city','homeType','homeStatus','days','p']);params.set('extra',query.split('/').filter(segment=>segment&&!known.has(segment.slice(segment.lastIndexOf('_')+1))).join('/'));
    return params;
  }
  function bind(){
    const form=document.getElementById('advanced-search');if(!form)return;
    const original=new URLSearchParams(location.search);const params=original.has('native')?parseNative(original.get('native')):new URLSearchParams(original);for(const key of ['collection','display','editSearch'])if(original.has(key))params.set(key,original.get(key));
    let selected=params.getAll('search-city').concat(params.getAll('city')).filter(Boolean);let cityRows=places.map(place=>({name:place.name,value:DaisyIDX.cities[place.name]}));
    const drawCities=()=>{
      form.querySelector('#selected-cities').innerHTML=selected.length?selected.map(value=>{const label=cityRows.find(row=>String(row.value)===value)?.name||value;return `<span class="city-chip"><input type="hidden" name="search-city" value="${escapeHTML(value)}"><span>${escapeHTML(label)}</span><button type="button" data-remove-city="${escapeHTML(value)}" aria-label="Remove ${escapeHTML(label)}">×</button></span>`;}).join(''):'<span class="fine-print">All four communities</span>';
      for(const button of form.querySelectorAll('[data-city-shortcut]')){const row=cityRows.find(row=>row.name===button.dataset.cityShortcut);button.setAttribute('aria-pressed',String(selected.includes(row?.name)||selected.includes(String(row?.value))));}
      updateRequirements(form);applyLanguage(form.querySelector('#selected-cities'));
    };
    const addCity=()=>{const input=form.querySelector('#city-input'),raw=input.value.trim(),row=cityRows.find(row=>row.name.toLowerCase()===raw.toLowerCase());if(!raw)return;if(!row){showError(form,'Choose a city from the list.');return;}if(!selected.includes(String(row.value))&&!selected.includes(row.name))selected.push(String(row.value));input.value='';for(const name of ['zip','address','mls','bounds','polygon'])form.elements[name].value='';clearErrors(form);drawCities();};
    form.querySelector('#add-city').onclick=addCity;form.querySelector('#city-input').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();addCity();}};form.querySelector('#city-input').onchange=addCity;
    form.querySelector('.city-shortcuts').onclick=event=>{const button=event.target.closest('[data-city-shortcut]');if(!button)return;const row=cityRows.find(row=>row.name===button.dataset.cityShortcut);if(!row)return;if(selected.includes(row.name)||selected.includes(String(row.value))){selected=selected.filter(value=>value!==row.name&&value!==String(row.value));clearErrors(form);drawCities();}else{form.querySelector('#city-input').value=row.name;addCity();}};
    form.querySelector('#selected-cities').onclick=event=>{const button=event.target.closest('[data-remove-city]');if(button){selected=selected.filter(value=>value!==button.dataset.removeCity);drawCities();}};
    if(params.has('type')||params.has('status')){form.querySelectorAll('[name=type],[name=status]').forEach(input=>input.checked=params.getAll(input.name).includes(input.value));}
    for(const input of form.elements){if(!input.name||!params.has(input.name)||input.type==='checkbox')continue;if(input.tagName==='SELECT'&&!Array.from(input.options).some(option=>option.value===params.get(input.name))){const option=document.createElement('option');option.value=params.get(input.name);option.textContent=params.get(input.name);input.append(option);}input.value=params.get(input.name);}
    for(const name of ['exact-beds','virtual-tour'])if(params.has(name))form.elements[name].checked=!!params.get(name);
    form.querySelector('.search-lookup').open=['zip','address','mls'].some(name=>form.elements[name].value.trim());
    form.querySelector('.other-property-types').open=!!form.querySelector('.other-property-types input:checked');
    form.querySelector('.advanced-details').open=[...form.querySelectorAll('.advanced-details input,.advanced-details select')].some(input=>input.type==='checkbox'?input.checked:input.tagName==='SELECT'?input.value!==input.options[0]?.value:!!input.value.trim());
    drawCities();DaisyIDX.citiesList().then(rows=>{if(!form.isConnected)return;cityRows=rows;form.querySelector('#city-list').innerHTML=rows.map(row=>`<option value="${escapeHTML(row.name)}"></option>`).join('');drawCities();}).catch(()=>{form.querySelector('#city-list').innerHTML=cityRows.map(row=>`<option value="${escapeHTML(row.name)}"></option>`).join('');});
    form.addEventListener('submit',event=>{event.preventDefault();if(form.querySelector('#city-input').value.trim()){addCity();if(form.querySelector('#city-input').value.trim())return;}runLiveSearch(form);});
    form.addEventListener('reset',()=>{cancelIdxRequests();DaisyMap.clear();const result=document.getElementById('search-results');result.idxRequest=null;result.hidden=true;selected=[];drawCities();clearErrors(form);history.replaceState({},'',rememberLanguageURL('/search'));setTimeout(()=>{for(const name of ['bounds','polygon','extra'])form.elements[name].value='';form.querySelectorAll('details').forEach(details=>details.open=false);updateRequirements(form);},0);});
    form.querySelector('#save-search').onclick=()=>{if(form.querySelector('#city-input').value.trim()){addCity();if(form.querySelector('#city-input').value.trim())return;}saveSearchWithIdx(form);};
    for(const name of ['zip','address','mls'])form.elements[name].addEventListener('input',()=>{if(form.elements[name].value.trim()){selected=[];drawCities();for(const other of ['zip','address','mls','bounds','polygon'].filter(value=>value!==name))form.elements[other].value='';}});
    for(const name of ['changed','sold-within'])form.elements[name].onchange=()=>{if(form.elements[name].value)form.elements[name==='changed'?'sold-within':'changed'].value='';};
    form.addEventListener('input',()=>{clearErrors(form);updateRequirements(form);});
    form.addEventListener('change',()=>updateRequirements(form));
    if(original.get('editSearch'))form.dataset.editSearch=original.get('editSearch');
    if([...original.keys()].some(key=>key!=='lang')&&original.get('run')!=='0')runLiveSearch(form,{page:Math.min(10,Math.max(1,parseInt(original.get('page'))||1)),scroll:original.get('run')==='1'});
  }
  return {render,bind,parseNative,showError,clearErrors};
})();

'use strict';
window.DaisyAccount=(()=>{
  let user=null,saved=new Set(),afterLogin=null;
  const accountChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('daisy-account'):null;
  const searches=new Map();
  const accountDialog=document.createElement('dialog');accountDialog.id='account-dialog';document.body.append(accountDialog);
  const stateReady=DaisyIDX.request('session',{}, {method:'GET'}).then(update).catch(()=>{});
  function update(state,announce=false){user=state.user??user;if(Object.hasOwn(state,'user'))user=state.user;saved=new Set((state.saved||[...saved]).map(id=>String(id).toUpperCase()));paint();if(announce)accountChannel?.postMessage('changed');return state;}
  if(accountChannel)accountChannel.onmessage=()=>DaisyIDX.request('session',{}, {method:'GET'}).then(state=>{update(state);if(location.pathname==='/account')route();}).catch(()=>{});
  function isSaved(id){return saved.has(String(id).toUpperCase());}
  function paint(){
    document.querySelectorAll('[data-save-home]').forEach(button=>{const active=isSaved(button.dataset.saveHome);button.classList.toggle('is-saved',active);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`${active?'Remove saved home':'Save home'} ${button.dataset.address||''}`.trim());const label=button.querySelector('[data-save-label]');if(label)label.textContent=active?'Saved':'Save';});
    if(typeof applyLanguage==='function')applyLanguage();
  }
  function field(name,label,{type='text',required=false,autocomplete='',value=''}={},scope='account'){
    return `<label class="field" for="${scope}-${name}"><span>${label}</span><input id="${scope}-${name}" name="${name}" type="${type}" ${required?'required':''} ${autocomplete?`autocomplete="${autocomplete}"`:''} value="${escapeHTML(value)}"></label>`;
  }
  function authForm(mode='login',scope='account'){
    const signup=mode==='signup',forgot=mode==='forgot';
    return `<form data-account-form="${mode}" class="account-form"><h2>${forgot?'Reset password':signup?'Create account':'Sign in'}</h2>${signup?field('name','Name',{autocomplete:'name',required:true},scope)+field('phone','Phone',{type:'tel',autocomplete:'tel'},scope):''}${field('username','Email',{type:'email',required:true,autocomplete:'username'},scope)}${forgot?'':field('password','Password',{type:'password',required:true,autocomplete:signup?'new-password':'current-password'},scope)}<p class="form-message" role="status"></p><button type="submit" class="button">${forgot?'Reset password':signup?'Create account':'Sign in'}</button><div class="account-form-links">${mode==='login'?'<button type="button" class="text-link" data-auth-mode="signup">Create account</button><button type="button" class="text-link" data-auth-mode="forgot">Forgot password?</button>':'<button type="button" class="text-link" data-auth-mode="login">Sign in</button>'}</div>${forgot?'':socialMarkup()}</form>`;
  }
  function openAuth(callback){afterLogin=callback||null;accountDialog.innerHTML=`<button class="dialog-close" aria-label="Close">×</button>${authForm('login','dialog')}`;applyLanguage(accountDialog);accountDialog.showModal();bindSocial(accountDialog);}
  function socialMarkup(){return '<div class="social-signin"><p>Other log in options</p><div class="social-options"><div class="social-option"><iframe title="Continue with Google" data-social-frame="google" scrolling="no" referrerpolicy="strict-origin-when-cross-origin"></iframe><span>Google</span></div><div class="social-option"><iframe title="Continue with Facebook" data-social-frame="facebook" scrolling="no" referrerpolicy="strict-origin-when-cross-origin"></iframe><span>Facebook</span></div></div></div>';}
  function bindSocial(container){container.querySelectorAll('[data-social-frame]').forEach(async frame=>{if(frame.dataset.initialized)return;frame.dataset.initialized='true';const provider=frame.dataset.socialFrame;try{const {url,attempt}=await DaisyIDX.request('account/social/start',{provider});if(!frame.isConnected)return;let loads=0;frame.onload=async()=>{if(++loads<2)return;try{const result=await DaisyIDX.request('account/social/complete',{provider,attempt});update(result,true);if(accountDialog.open){accountDialog.close();const callback=afterLogin;afterLogin=null;if(callback)await callback();}else route();}catch(error){showError(frame.closest('form'),error);}};frame.src=url;}catch(error){if(frame.isConnected){frame.outerHTML='<button type="button" class="text-link" data-social-retry>Try again</button>';}}});}
  async function requireAccount(callback){await stateReady;try{update(await DaisyIDX.request('session',{}, {method:'GET'}));if(user)return callback();openAuth(callback);}catch(error){toast(siteLanguage==='zh'?zh(error.message):error.message);}}
  function showError(container,error){const el=container.querySelector('.form-message');el.textContent=String(error.message||'Please try again.').replace(/<[^>]*>/g,' ');el.classList.add('is-error');applyLanguage(container);}
  async function submitAuth(form){
    const mode=form.dataset.accountForm,button=form.querySelector('[type=submit]'),fields=Object.fromEntries(new FormData(form));
    const message=form.querySelector('.form-message');message.textContent='';message.classList.remove('is-error');
    if(mode==='signup'&&fields.password.length<4){showError(form,new Error('Use at least 4 characters for your password.'));return;}
    button.disabled=true;
    try{
      const result=await DaisyIDX.request('account/'+mode,fields);
      form.reset();
      if(mode==='forgot'){message.textContent='Password reset email sent.';applyLanguage(form);return;}
      update(result,true);
      if(accountDialog.open){accountDialog.close();const callback=afterLogin;afterLogin=null;if(callback)await callback();}
      else if(location.pathname==='/account')route();
    }catch(error){showError(form,error);}finally{button.disabled=false;}
  }
  async function toggleHome(button){
    const id=button.dataset.saveHome,property=DaisyIDX.properties.get(id.toUpperCase());
    await requireAccount(async()=>{
      button.disabled=true;
      try{const result=await DaisyIDX.request('account/saved-home',{id,mls:button.dataset.mls||property?.mls||'',remove:isSaved(id)});update(result,true);if(location.pathname==='/account')route();}
      catch(error){toast(siteLanguage==='zh'?zh(error.message):error.message);}
      finally{button.disabled=false;}
    });
  }
  const frequencies=[['0','Instant'],['1','Daily'],['2','Every other day'],['7','Weekly'],['30','Every 30 days']];
  function frequency(record){const value=String(record?.emailFreq??record?.frequency??record?.EmailFrequency??'1');return frequencies.find(([id,label])=>id===value||label.toLowerCase()===value.toLowerCase())?.[0]||'1';}
  function saveSearch({query,pageType='results',record}={}){
    requireAccount(()=>{
      const dialog=document.getElementById('save-dialog');
      dialog.innerHTML=`<button class="dialog-close" aria-label="Close saved search dialog">×</button><form id="saved-search-form"><h2>${record?'Edit saved search':'Save search'}</h2>${field('name','Search name',{required:true,value:record?.searchName||record?.name||record?.updatedName||''},'saved-search')}<label class="check"><input type="checkbox" name="receiveEmail" value="yes" ${record&&(String(record.sendEmail)==='1'||record.receiveEmail)?'checked':''}><span>Email alerts</span></label><label class="field" for="saved-search-frequency"><span>Frequency</span><select id="saved-search-frequency" name="frequency">${frequencies.map(([value,label])=>`<option value="${value}" ${frequency(record)===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="form-message" role="status"></p><button class="button" type="submit">Save search</button></form>`;
      const form=dialog.querySelector('form');
      form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{const data=Object.fromEntries(new FormData(form));await DaisyIDX.request('account/save-search',{...data,receiveEmail:data.receiveEmail==='yes',query,pageType,searchId:record?.id});dialog.close();if(location.pathname==='/account')route();else toast(siteLanguage==='zh'?'搜索已保存。':'Search saved.');}catch(error){showError(form,error);}finally{button.disabled=false;}});
      applyLanguage(dialog);dialog.showModal();
    });
  }
  function render(){return `${pageIntro('My Account','')}<section class="wrap account-page" id="account-page">${idxLoading()}</section>`;}
  async function bind(){
    const container=document.getElementById('account-page');if(!container)return;
    await stateReady;if(!container.isConnected)return;
    if(!user){container.innerHTML=`<div class="account-signin">${authForm()}</div>`;applyLanguage(container);bindSocial(container);return;}
    const params=new URLSearchParams(location.search),tab=params.get('tab')||'homes',page=Math.max(1,parseInt(params.get('page'))||1);
    container.innerHTML=`<div class="account-toolbar"><nav class="account-tabs" aria-label="My Account"><a href="/account?tab=homes" ${tab==='homes'?'aria-current="page"':''}>Saved homes</a><a href="/account?tab=searches" ${tab==='searches'?'aria-current="page"':''}>Saved searches</a><a href="/account?tab=profile" ${tab==='profile'?'aria-current="page"':''}>Profile</a></nav><button class="text-link" data-sign-out>Sign out</button></div><div id="account-content">${idxLoading()}</div>`;
    const content=container.querySelector('#account-content');applyLanguage(container);
    try{
      if(tab==='profile')content.innerHTML=`<dl class="account-profile"><div><dt>Name</dt><dd>${escapeHTML([user.firstName,user.lastName].filter(Boolean).join(' '))}</dd></div><div><dt>Email</dt><dd>${escapeHTML(user.email)}</dd></div><div><dt>Phone</dt><dd>${escapeHTML(user.phone||'—')}</dd></div></dl><button class="text-link" data-auth-mode="forgot">Reset password</button>`;
      else if(tab==='searches'){
        const result=await DaisyIDX.request('account/searches',{page});if(!container.isConnected)return;
        const rows=result.rows||[];rows.forEach(row=>searches.set(String(row.id),row));
        content.innerHTML=rows.length?`<div class="saved-search-list">${rows.map(row=>`<article><h2>${escapeHTML(row.searchName||row.name||row.updatedName||'Saved search')}</h2><p>${String(row.sendEmail)==='1'?'Email alerts':'Email alerts off'}${row.EmailFrequency?' · '+escapeHTML(row.EmailFrequency):''}</p><div class="saved-search-actions"><a class="text-link" href="${escapeHTML(searchURL(row))}">View homes</a><button class="text-link" data-edit-search="${escapeHTML(row.id)}">Edit saved search</button><a class="text-link" href="${escapeHTML(searchURL(row,true))}">Edit filters</a><button class="text-link" data-delete-search="${escapeHTML(row.id)}">Delete</button></div></article>`).join('')}</div>`:'<div class="empty-state"><h2>No saved searches</h2><a class="button" href="/search">Home Search</a></div>';
        const total=Number(result.total)||rows.length;if(total>20)content.insertAdjacentHTML('beforeend',accountPager(tab,page,total));
      }else{
        if(!saved.size){content.innerHTML='<div class="empty-state"><h2>No saved homes</h2><a class="button" href="/search">Home Search</a></div>';}
        else{const result=await DaisyIDX.listings('',{pageType:'savedhomes',page:Math.min(10,page)});if(!container.isConnected)return;content.innerHTML=`<div class="property-grid">${cards(result.items)}</div>${accountPager(tab,page,Math.min(200,result.total))}`;bindIdxImages(content);}
      }
      if(tab==='profile')content.insertAdjacentHTML('beforeend','<div class="account-delete"><button class="text-link" data-delete-account>Delete account</button></div>');
      paint();applyLanguage(container);
    }catch(error){if(container.isConnected){content.innerHTML=`<div class="empty-state"><p>${escapeHTML(error.message)}</p><button class="button" data-account-retry>Try again</button></div>`;applyLanguage(content);}}
  }
  function accountPager(tab,page,total){const pages=Math.ceil(total/20);return pages>1?`<nav class="idx-pagination" aria-label="Search result pages">${page>1?`<a class="button button-outline" href="/account?tab=${tab}&page=${page-1}">Previous</a>`:'<span></span>'}<span>Page ${page} of ${pages}</span>${page<pages?`<a class="button button-outline" href="/account?tab=${tab}&page=${page+1}">Next</a>`:'<span></span>'}</nav>`:'';}
  async function getSearch(id){if(searches.has(String(id)))return searches.get(String(id));let page=1;while(page<=50){const result=await DaisyIDX.request('account/searches',{page});for(const row of result.rows||[])searches.set(String(row.id),row);if(searches.has(String(id)))return searches.get(String(id));if(page*20>=Number(result.total)||!(result.rows||[]).length)break;page++;}throw Error('Search not found.');}
  function splitSearch(record){const raw=String(record.searchUrl||record.url||'results').replace(/^https?:\/\/[^/]+\/idx\//,'').replace(/^\/?idx\//,'').replace(/^\//,'');const [pageType,...segments]=raw.split('/');return {pageType,query:segments.length?'/'+segments.join('/'):''};}
  function searchURL(record,edit=false){const {pageType,query}=splitSearch(record);const params=new URLSearchParams({native:query,collection:pageType,run:edit?'0':'1'});if(edit)params.set('editSearch',String(record.id));return '/search?'+params;}
  document.addEventListener('submit',event=>{const form=event.target.closest('[data-account-form]');if(form){event.preventDefault();submitAuth(form);}});
  document.addEventListener('click',async event=>{
    if(event.target.closest('[data-social-retry]')){const form=event.target.closest('form');form.querySelector('.social-signin').outerHTML=socialMarkup();bindSocial(form);applyLanguage(form);return;}
    const save=event.target.closest('[data-save-home]');if(save){event.preventDefault();await toggleHome(save);return;}
    const mode=event.target.closest('[data-auth-mode]');if(mode){const scope=mode.closest('dialog')||document.querySelector('.account-signin');if(scope){scope.innerHTML=(scope.tagName==='DIALOG'?'<button class="dialog-close" aria-label="Close">×</button>':'')+authForm(mode.dataset.authMode,scope.tagName==='DIALOG'?'dialog':'account');applyLanguage(scope);bindSocial(scope);}else{openAuth();accountDialog.querySelector('form').outerHTML=authForm(mode.dataset.authMode,'dialog');applyLanguage(accountDialog);bindSocial(accountDialog);}return;}
    if(event.target.closest('[data-sign-out]')){try{await DaisyIDX.request('account/logout');update({user:null,saved:[]},true);route();}catch(error){toast(siteLanguage==='zh'?zh(error.message):error.message);}}
    if(event.target.closest('[data-account-retry]'))bind();
    if(event.target.closest('[data-delete-account]')){accountDialog.innerHTML='<button class="dialog-close" aria-label="Close">×</button><h2>Delete account?</h2><p class="account-delete-message">This permanently deletes your account, saved homes, and searches.</p><form id="delete-account-form"><label class="check"><input type="checkbox" required><span>Delete my account permanently</span></label><p class="form-message" role="status"></p><button class="button" type="submit">Delete account</button></form>';accountDialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]');button.disabled=true;try{await DaisyIDX.request('account/delete',{confirm:true});update({user:null,saved:[]},true);accountDialog.close();route();}catch(error){showError(form,error);}finally{button.disabled=false;}};applyLanguage(accountDialog);accountDialog.showModal();}
    const edit=event.target.closest('[data-edit-search]');if(edit){const record=searches.get(edit.dataset.editSearch);if(record)saveSearch({...splitSearch(record),record});}
    const remove=event.target.closest('[data-delete-search]');if(remove&&confirm(siteLanguage==='zh'?'删除此保存的搜索？':'Delete this saved search?')){try{await DaisyIDX.request('account/delete-search',{id:remove.dataset.deleteSearch});route();}catch(error){toast(siteLanguage==='zh'?zh(error.message):error.message);}}
  });
  return {render,bind,require:requireAccount,saveSearch,isSaved,paint,field,getSearch,get user(){return user;},searches};
})();

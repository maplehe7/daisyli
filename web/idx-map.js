'use strict';
window.DaisyMap=(()=>{
  const maps=new Set();
  function create(container){const map=L.map(container,{scrollWheelZoom:false,zoomControl:true});map.attributionControl.setPrefix(false);maps.add(map);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);return map;}
  function compact(price){return price>=1000000?'$'+Number((price/1000000).toFixed(2))+'M':price>=1000?'$'+Math.round(price/1000)+'K':money(price);}
  function marker(map,p,{current=false}={}){if(!p.latitude||!p.longitude)return;const point=L.marker([p.latitude,p.longitude],{icon:L.divIcon({className:'price-marker'+(current?' price-marker-current':''),html:`<span>${compact(p.price)}</span>`,iconSize:[75,30],iconAnchor:[37,15]}),title:(current?(siteLanguage==='zh'?'当前房源：':'This home: '):'')+p.address,zIndexOffset:current?1000:0});point.bindPopup(`<a class="map-property" href="${escapeHTML(DaisyIDX.propertyURL(p))}">${p.image?`<img src="${escapeHTML(p.image)}" alt="" loading="lazy">`:''}<strong>${money(p.price)}</strong><span>${escapeHTML(p.address)}</span><small>${p.beds} ${siteLanguage==='zh'?'卧室':'beds'} · ${p.baths} ${siteLanguage==='zh'?'浴室':'baths'}</small></a>`,{maxWidth:240});point.addTo(map);return point;}
  function property(container,p){
    if(!container.isConnected||!window.L)return;
    const map=create(container),subjectId=String(p.id).toUpperCase();
    map.setView([p.latitude,p.longitude],14);const subject=marker(map,p,{current:true});
    const status=document.createElement('p');status.className='map-nearby-status';status.setAttribute('role','status');status.hidden=true;container.after(status);
    let items=[],layers=[],timer,redrawTimer,request,revision=0,loadedBounds;
    const active=()=>container.isConnected&&maps.has(map);
    const showStatus=(message,retry=false)=>{
      status.replaceChildren();status.hidden=!message;
      if(message)status.append(document.createTextNode(message));
      if(retry){const button=document.createElement('button');button.type='button';button.className='text-link';button.textContent='Try again';button.onclick=()=>schedule(true);status.append(button);}
      applyLanguage(status);
    };
    function draw(){
      if(!active()||layers.some(layer=>layer.isPopupOpen()))return;
      layers.forEach(layer=>layer.remove());layers=[];
      const groups=new Map(),view=map.getBounds().pad(.1);
      for(const item of items){
        if(!view.contains([item.latitude,item.longitude]))continue;
        const projected=map.project([item.latitude,item.longitude],map.getZoom()),key=Math.floor(projected.x/85)+','+Math.floor(projected.y/42);
        if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);
      }
      for(const group of groups.values()){
        if(group.length===1){layers.push(marker(map,group[0]));continue;}
        const bounds=L.latLngBounds(group.map(item=>[item.latitude,item.longitude]));
        const cluster=L.marker(bounds.getCenter(),{icon:L.divIcon({className:'cluster-marker',html:`<span>${group.length}</span>`,iconSize:[36,36],iconAnchor:[18,18]}),title:group.length+(siteLanguage==='zh'?'套房源':' homes')});
        cluster.on('click',()=>{
          if(map.getZoom()<17&&(bounds.getNorth()!==bounds.getSouth()||bounds.getEast()!==bounds.getWest()))map.fitBounds(bounds,{padding:[50,50],maxZoom:map.getZoom()+2});
          else cluster.bindPopup(`<div class="map-cluster-homes">${group.map(item=>`<a href="${escapeHTML(DaisyIDX.propertyURL(item))}"><strong>${money(item.price)}</strong><span>${escapeHTML(item.address)}</span></a>`).join('')}</div>`,{maxWidth:240}).openPopup();
        });
        cluster.addTo(map);layers.push(cluster);
      }
    }
    async function load(version){
      if(!active()||version!==revision)return;
      const bounds=map.getBounds().pad(.35),controller=new AbortController();request=controller;idxControllers.add(controller);container.setAttribute('aria-busy','true');
      const params=new URLSearchParams({type:'home',status:'active',bounds:[bounds.getSouth(),bounds.getNorth(),bounds.getWest(),bounds.getEast()].join(',')});params.append('type','condo');
      try{
        const result=await DaisyIDX.listings(DaisyIDX.filters(params),{map:true,signal:controller.signal});
        if(!active()||version!==revision)return;
        const unique=new Map();
        for(const item of [...result.mapItems,...result.items]){
          const id=String(item.id||'').toUpperCase();
          if(!id||id===subjectId||!item.latitude||!item.longitude||!bounds.contains([item.latitude,item.longitude]))continue;
          unique.set(id,item);
        }
        items=[...unique.values()];loadedBounds=bounds;draw();
        showStatus(items.length?'':'No other homes for sale in this area.');
      }catch(error){
        if(active()&&version===revision&&!controller.signal.aborted)showStatus('Could not load nearby homes.',true);
      }finally{idxControllers.delete(controller);if(request===controller){request=null;container.removeAttribute('aria-busy');}}
    }
    function schedule(force=false){
      clearTimeout(timer);revision++;request?.abort();container.removeAttribute('aria-busy');draw();
      if(!force&&loadedBounds?.contains(map.getBounds()))return;
      timer=setTimeout(()=>load(revision),250);
    }
    map.on('moveend',()=>schedule());
    map.on('popupclose',()=>{clearTimeout(redrawTimer);redrawTimer=setTimeout(draw,0);});
    map.on('resize',()=>{for(const layer of [subject,...layers])if(layer.isPopupOpen())layer.getPopup().update();});
    map.on('unload',()=>{revision++;clearTimeout(timer);clearTimeout(redrawTimer);request?.abort();status.remove();});
    load(revision);return map;
  }
  function encodePath(points){let lastLat=0,lastLng=0,result='';const encode=value=>{let n=value<0?~(value<<1):value<<1,out='';while(n>=32){out+=String.fromCharCode((32|(n&31))+63);n>>=5;}return out+String.fromCharCode(n+63);};for(const point of [...points,points[0]]){const lat=Math.round(point.lat*1e5),lng=Math.round(point.lng*1e5);result+=encode(lat-lastLat)+encode(lng-lastLng);lastLat=lat;lastLng=lng;}return result.replace(/\\/g,'rtech');}
  function setFilter(form,name,value){let input=form.elements[name];if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}input.value=value;}
  function bind(container,result,form){
    const view=container.querySelector('#results-map');if(!view||!window.L)return;
    let map,polygon,points=[],drawing=false;
    const buttons=container.querySelectorAll('[data-results-view]');
    const changeView=mode=>{buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.resultsView===mode)));view.hidden=mode!=='map';container.querySelector('.results-property-grid').hidden=mode==='map';setFilter(form,'display',mode);const url=new URL(location.href);url.searchParams.set('display',mode);history.replaceState({},'',url);if(mode==='map'){if(!map)initialize();map.invalidateSize();}};
    const initialize=()=>{
      map=create(view.querySelector('.results-map-canvas'));
      const items=result.mapItems.length?result.mapItems:result.items;const coords=items.filter(p=>p.latitude&&p.longitude).map(p=>[p.latitude,p.longitude]);
      const bounds=form.elements.bounds?.value?.split(',').map(Number);if(bounds?.length===4&&bounds.every(Number.isFinite))map.fitBounds([[bounds[0],bounds[2]],[bounds[1],bounds[3]]]);else if(coords.length)map.fitBounds(coords,{padding:[35,35],maxZoom:15});else map.setView([33.645,-117.78],10);
      let visibleMarkers=[];const drawMarkers=()=>{visibleMarkers.forEach(layer=>layer.remove());visibleMarkers=[];const groups=new Map();for(const p of items){if(!p.latitude||!p.longitude)continue;const point=map.project([p.latitude,p.longitude],map.getZoom()),key=Math.floor(point.x/85)+','+Math.floor(point.y/42);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}for(const group of groups.values()){if(group.length===1){visibleMarkers.push(marker(map,group[0]));continue;}const bounds=L.latLngBounds(group.map(p=>[p.latitude,p.longitude])),label=group.length+(siteLanguage==='zh'?'套房源':' homes'),cluster=L.marker(bounds.getCenter(),{icon:L.divIcon({className:'cluster-marker',html:`<span>${group.length}</span>`,iconSize:[36,36],iconAnchor:[18,18]}),title:label});cluster.on('click',()=>{if(map.getZoom()<17&&bounds.getNorth()!==bounds.getSouth())map.fitBounds(bounds,{padding:[50,50],maxZoom:map.getZoom()+2});else cluster.bindPopup(`<div class="map-cluster-homes">${group.map(p=>`<a href="${escapeHTML(DaisyIDX.propertyURL(p))}"><strong>${money(p.price)}</strong><span>${escapeHTML(p.address)}</span></a>`).join('')}</div>`,{maxWidth:260}).openPopup();});cluster.addTo(map);visibleMarkers.push(cluster);}};drawMarkers();map.on('zoomend',drawMarkers);
      view.querySelector('[data-search-area]').onclick=()=>{const b=map.getBounds();setFilter(form,'bounds',[b.getSouth(),b.getNorth(),b.getWest(),b.getEast()].join(','));setFilter(form,'polygon','');runLiveSearch(form,{scroll:false});};
      const draw=view.querySelector('[data-draw-area]'),finish=view.querySelector('[data-finish-area]');
      draw.onclick=()=>{drawing=!drawing;points=[];if(polygon){polygon.remove();polygon=null;}draw.setAttribute('aria-pressed',String(drawing));finish.hidden=!drawing;finish.disabled=true;view.querySelector('.draw-help').hidden=!drawing;map.getContainer().classList.toggle('is-drawing',drawing);};
      map.on('click',event=>{if(!drawing)return;points.push(event.latlng);if(polygon)polygon.remove();polygon=L.polygon(points,{color:'#203831',fillOpacity:.14}).addTo(map);finish.disabled=points.length<3;});
      finish.onclick=()=>{if(points.length<3)return;setFilter(form,'polygon',encodePath(points));setFilter(form,'bounds','');runLiveSearch(form,{scroll:false});};
      view.querySelector('[data-clear-area]').onclick=()=>{setFilter(form,'polygon','');setFilter(form,'bounds','');runLiveSearch(form,{scroll:false});};
    };
    buttons.forEach(button=>button.onclick=()=>changeView(button.dataset.resultsView));changeView(form.elements.display?.value||'list');
  }
  function markup(){return `<div id="results-map" hidden><div class="map-actions"><button class="button button-outline" type="button" data-search-area>Search this area</button><button class="text-link" type="button" data-draw-area aria-pressed="false">Draw area</button><button class="text-link" type="button" data-finish-area hidden disabled>Finish drawing</button><button class="text-link" type="button" data-clear-area>Clear area</button></div><p class="draw-help" hidden>Tap at least three points on the map.</p><div class="results-map-canvas" aria-label="Property map"></div></div>`;}
  return {property,bind,markup,clear(){for(const map of maps)map.remove();maps.clear();}};
})();

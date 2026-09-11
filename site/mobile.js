'use strict';
const mobileMenuViewport=matchMedia('(max-width:900px)');
const reducedMenuMotion=matchMedia('(prefers-reduced-motion:reduce)');
let menuAnimation;
function setMobileMenu(open){
  const nav=document.getElementById('main-nav'),toggle=document.querySelector('.menu-toggle');
  const mobile=mobileMenuViewport.matches;
  open=mobile&&open;
  const wasOpen=toggle.getAttribute('aria-expanded')==='true';
  const from=nav.getBoundingClientRect().height;
  menuAnimation?.cancel();menuAnimation=null;
  nav.classList.remove('menu-animating');
  if(!open&&nav.contains(document.activeElement))toggle.focus({preventScroll:true});
  nav.classList.toggle('open',open);
  nav.inert=mobile&&!open;
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  applyLanguage(document.querySelector('.site-header'));
  if(!mobile||reducedMenuMotion.matches||wasOpen===open)return;
  const to=nav.getBoundingClientRect().height;
  const style=getComputedStyle(toggle);
  nav.classList.add('menu-animating');
  const animation=nav.animate([{height:`${from}px`},{height:`${to}px`}],{
    duration:parseFloat(style.getPropertyValue('--menu-duration'))||320,
    easing:style.getPropertyValue('--menu-easing').trim()||'ease'
  });
  menuAnimation=animation;
  animation.finished.then(()=>{if(menuAnimation===animation){menuAnimation=null;nav.classList.remove('menu-animating');}}).catch(()=>{});
}
document.getElementById('main-nav').inert=mobileMenuViewport.matches;
mobileMenuViewport.addEventListener('change',()=>setMobileMenu(false));
reducedMenuMotion.addEventListener('change',()=>{menuAnimation?.cancel();menuAnimation=null;document.getElementById('main-nav').classList.remove('menu-animating');});
let mobileSearchObserver;
function positionHomeSearch(){
  const form=document.getElementById('quick-search');
  const strip=document.querySelector('.search-strip');
  if(form&&strip&&form.parentElement!==strip)strip.append(form);
}
function bindMobileLayout(){
  mobileSearchObserver?.disconnect();
  positionHomeSearch();
  const form=document.getElementById('advanced-search'),dock=document.getElementById('mobile-search-dock');
  if(form&&dock){
    const results=document.getElementById('search-results');
    let formVisible=false,resultsVisible=false;
    mobileSearchObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){if(entry.target===form)formVisible=entry.isIntersecting;else resultsVisible=entry.isIntersecting;}
      dock.hidden=!formVisible||resultsVisible;
    },{threshold:0,rootMargin:'-75px 0px -75px 0px'});
    mobileSearchObserver.observe(form);
    if(results)mobileSearchObserver.observe(results);
  }
}
document.addEventListener('click',event=>{
  if(!event.target.closest('.site-header') && document.getElementById('main-nav')?.classList.contains('open'))closeMenu();
});

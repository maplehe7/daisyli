'use strict';
// A small amount of real page content above the opening lets mobile browsers
// composite the film at the top edge instead of exposing the document canvas.
window.DaisyHomeViewport=(() => {
  let previousOffset=0;
  function offset(){
    if(!document.body.classList.contains('home-page'))return 0;
    const main=document.getElementById('main');
    return main?parseFloat(getComputedStyle(main).paddingTop)||0:0;
  }
  function scrollToTop(){window.scrollTo({top:offset(),left:0,behavior:'instant'});}
  function syncSize(){
    if(document.documentElement.classList.contains('dialog-scroll-locked'))return;
    const next=offset();
    if(document.body.classList.contains('home-page')&&next!==previousOffset){
      window.scrollTo({top:Math.max(0,window.scrollY+next-previousOffset),left:window.scrollX,behavior:'instant'});
    }
    previousOffset=next;
  }
  // Native scroll-to-top should return to the same visible opening. Never
  // reposition while a dialog is locked or a visitor is editing a field.
  window.addEventListener('scrollend',()=>{
    const top=offset();
    if(top&&window.scrollY<top&&!document.documentElement.classList.contains('dialog-scroll-locked')&&
      !document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))scrollToTop();
  });
  window.addEventListener('resize',syncSize);
  return {offset,scrollToTop,syncSize,bind(){previousOffset=offset();}};
})();

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
  DaisyHomeViewport.bind();
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

// On the homepage, reveal the navigation when the visitor reverses direction.
(() => {
  const header=document.querySelector('.site-header');
  const nav=document.getElementById('main-nav');
  let previousY=window.scrollY,travel=0,direction=0,frame=0;
  function syncBrowserColor(showFilm){
    const active=showFilm&&DaisyHomeViewport.offset()>0;
    const root=document.documentElement;
    if(root.hasAttribute('data-home-film-edge')!==active)root.toggleAttribute('data-home-film-edge',active);
    const color=active?'#26312f':'#ffffff';
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>{if(meta.content!==color)meta.content=color;});
  }
  function render(reset=false){
    const home=document.body.classList.contains('home-page');
    if(!home){
      syncBrowserColor(false);
      header.classList.remove('home-header-clear','home-header-hidden');
      previousY=window.scrollY;travel=0;direction=0;return;
    }
    // Opening a dialog fixes the body and temporarily changes window.scrollY.
    if(document.documentElement.classList.contains('dialog-scroll-locked'))return;
    if(reset)DaisyHomeViewport.syncSize();
    const y=Math.max(0,Math.min(window.scrollY,document.documentElement.scrollHeight-window.innerHeight)-DaisyHomeViewport.offset());
    const menuOpen=nav.classList.contains('open');
    if(reset){previousY=y;travel=0;direction=0;header.classList.remove('home-header-hidden');}
    header.classList.toggle('home-header-clear',y<=2&&!menuOpen);
    syncBrowserColor(y<=2&&!menuOpen);
    if(y<=2||menuOpen){
      header.classList.remove('home-header-hidden');travel=0;direction=0;
    }else{
      const delta=y-previousY,nextDirection=Math.sign(delta);
      if(nextDirection&&nextDirection!==direction){travel=0;direction=nextDirection;}
      travel+=Math.abs(delta);
      if(travel>=6){header.classList.toggle('home-header-hidden',direction>0);travel=0;}
    }
    previousY=y;
  }
  window.addEventListener('scroll',()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;render();});
  },{passive:true});
  header.addEventListener('focusin',()=>header.classList.remove('home-header-hidden'));
  window.addEventListener('pageshow',()=>render(true));
  window.addEventListener('resize',()=>render(true));
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.target!==nav||
      String(record.oldValue).split(/\s+/).includes('open')!==nav.classList.contains('open')))render(true);
  });
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  observer.observe(nav,{attributes:true,attributeFilter:['class'],attributeOldValue:true});
  render(true);
})();

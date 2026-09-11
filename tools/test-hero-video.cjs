'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(file, {downlink=10, effectiveType='4g', saveData=false, reduced=false, width=1440}={}) {
  const source = fs.readFileSync(file,'utf8').split('window.DaisyHeroVideo = ')[1];
  const video = new EventTarget();
  const classes = new Set();
  let observer;
  Object.assign(video, {
    muted:false, defaultMuted:false, autoplay:true, paused:true, seeking:false,
    currentTime:0, duration:30, dataset:{}, src:'', end:0, loads:[], plays:0,
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
    buffered:{length:1,start:()=>0,end:()=>video.end},
    load(){ this.loads.push(this.src); this.paused=true; },
    pause(){ this.paused=true; },
    play(){ this.plays++; this.paused=false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); },
    removeAttribute(name){ if(name==='src')this.src=''; },
    closest(){ return intro; }
  });
  const intro = {querySelector:()=>video};
  const image = {isConnected:true,dataset:{homeSrc:'/below-fold.jpg'},removeAttribute(){delete this.dataset.homeSrc;}};
  const document = new EventTarget();
  Object.assign(document,{hidden:false,querySelector:selector=>selector==='.home-intro'?intro:video,querySelectorAll:()=>[image]});
  const motion = Object.assign(new EventTarget(),{matches:reduced});
  const connection = Object.assign(new EventTarget(),{downlink,effectiveType,saveData});
  const timers = new Map(); let timerId=0;
  const context = {window:{},document,navigator:{connection},innerWidth:width,AbortController,
    matchMedia:()=>motion,IntersectionObserver:class{constructor(callback){observer=callback;} observe(){} disconnect(){}},
    setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext('window.DaisyHeroVideo = '+source,context);
  const hero = context.window.DaisyHeroVideo;
  hero.bind();
  return {hero,video,image,document,motion,connection,classes,timers,
    event:name=>video.dispatchEvent(new Event(name)),
    stall(){video.dispatchEvent(new Event('waiting'));for(const timer of timers.values())if(timer.ms===1500)timer.fn();},
    buffer(seconds){video.end=video.currentTime+seconds;video.dispatchEvent(new Event('progress'));},
    visible(value){observer([{isIntersecting:value}]);}};
}
async function checks(file) {
  const fast=fixture(file); let released=0;
  fast.hero.afterBuffered(()=>released++);
  assert.match(fast.video.src,/1080-lite\.mp4$/);
  assert.equal(fast.video.autoplay,false);
  fast.buffer(1); await Promise.resolve();
  assert.equal(fast.video.plays,0);assert.equal(fast.image.src,undefined);assert.equal(released,0);
  fast.buffer(3); await Promise.resolve();
  assert.equal(fast.video.plays,1);assert.equal(released,0);assert.equal(fast.image.src,undefined);
  fast.buffer(30);await Promise.resolve();
  assert.equal(released,1);assert.equal(fast.image.src,'/below-fold.jpg');
  fast.visible(false);assert.equal(fast.video.paused,true);
  fast.visible(true);await Promise.resolve();assert.equal(fast.video.paused,false);
  fast.event('waiting');fast.event('playing');assert.match(fast.video.src,/1080-lite\.mp4$/);
  fast.video.currentTime=7;fast.stall();
  assert.match(fast.video.src,/720-lite\.mp4$/);assert.equal(fast.video.paused,true);
  fast.event('loadedmetadata');assert.equal(fast.video.currentTime,7);
  fast.buffer(4);await Promise.resolve();assert.equal(fast.video.paused,false);
  fast.stall();assert.match(fast.video.src,/480-lite\.mp4$/);
  fast.event('loadedmetadata');fast.buffer(6);await Promise.resolve();
  fast.stall();fast.buffer(6);await Promise.resolve();fast.stall();
  assert.equal(fast.video.src,'');assert.equal(fast.classes.has('is-playing'),false);

  const slow=fixture(file,{downlink:.75,effectiveType:'3g'});
  assert.match(slow.video.src,/480-lite\.mp4$/);slow.buffer(3);assert.equal(slow.video.plays,0);
  slow.buffer(6);await Promise.resolve();assert.equal(slow.video.plays,1);
  const capped=fixture(file);capped.video.readyState=4;capped.buffer(2.5);
  await Promise.resolve();assert.equal(capped.video.plays,1);
  const unknown=fixture(file,{downlink:null});
  assert.match(unknown.video.src,/720-lite\.mp4$/);
  assert.match(fixture(file,{width:390}).video.src,/720-lite\.mp4$/);

  for (const option of [{saveData:true},{reduced:true}]) {
    const disabled=fixture(file,option);
    await disabled.hero.afterBuffered(()=>{});
    assert.equal(disabled.video.src,'');assert.equal(disabled.video.plays,0);
    assert.equal(disabled.image.src,'/below-fold.jpg');
  }
  const scrolling=fixture(file);scrolling.visible(false);
  await scrolling.hero.afterBuffered(()=>{});assert.equal(scrolling.image.src,'/below-fold.jpg');
  const timeout=fixture(file);for(const timer of timeout.timers.values())timer.fn();
  await timeout.hero.afterBuffered(()=>{});assert.equal(timeout.image.src,'/below-fold.jpg');
  const removed=fixture(file);removed.hero.bind();
  assert.ok(removed.video.loads.includes('')); // Old media download is cancelled on route replacement.
  const deferred=fast.hero.deferImages('<img src="hero.jpg" fetchpriority="high"><img src="card.jpg" loading="lazy">');
  assert.equal(deferred,'<img src="hero.jpg" fetchpriority="high"><img data-home-src="card.jpg" loading="lazy">');
  console.log(file+': buffered start, media priority, downgrade, scrolling, timeout and preference checks passed');
}
(async()=>{for(const file of ['site/videos.js','web/videos.js'])await checks(file);})().catch(error=>{console.error(error);process.exitCode=1;});

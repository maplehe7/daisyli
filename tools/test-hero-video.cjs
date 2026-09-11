'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(file, {downlink=10, effectiveType='4g', saveData=false, reduced=false, width=1440, failUpgradePlay=false}={}) {
  const source = fs.readFileSync(file,'utf8').split('window.DaisyHeroVideo = ')[1];
  const requests=[],revoked=[],created=[];
  let finishDownload;
  const parent={append(target){target.parentElement=parent;created.push(target);}};
  function makeVideo(upgrade=false) {
  const video = new EventTarget();
  const classes = new Set();
  let time=0;
  Object.defineProperty(video,'currentTime',{get:()=>time,set(value){time=value;if(upgrade)queueMicrotask(()=>video.dispatchEvent(new Event('seeked')));}});
  Object.defineProperty(video,'className',{set(value){for(const name of value.split(' '))classes.add(name);}});
  Object.assign(video, {
    muted:false, defaultMuted:false, autoplay:true, paused:true, seeking:false, playbackRate:1,
    duration:30, dataset:{}, style:{}, src:'', end:0, loads:[], plays:0,readyState:0,parentElement:parent,classes,
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
    buffered:{length:1,start:()=>0,end:()=>video.end},
    load(){ this.loads.push(this.src); this.paused=true;this.end=0;if(upgrade&&this.src){this.readyState=4;this.end=30;queueMicrotask(()=>this.dispatchEvent(new Event('loadeddata')));} },
    pause(){ this.paused=true; },
    play(){ if(upgrade&&failUpgradePlay)return Promise.reject(new Error('Decode failure'));this.plays++; this.paused=false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); },
    requestVideoFrameCallback(callback){queueMicrotask(callback);return 1;},cancelVideoFrameCallback(){},
    setAttribute(){},remove(){this.removed=true;},
    removeAttribute(name){ if(name==='src')this.src=''; },
    closest(){ return intro; }
  });
  return video;
  }
  const video=makeVideo(),classes=video.classes;
  let observer;
  const intro = {querySelector:()=>video};
  const image = {isConnected:true,dataset:{homeSrc:'/below-fold.jpg'},removeAttribute(){delete this.dataset.homeSrc;}};
  const document = new EventTarget();
  Object.assign(document,{hidden:false,createElement:()=>makeVideo(true),querySelector:selector=>selector==='.home-intro'?intro:video,querySelectorAll:()=>[image]});
  const motion = Object.assign(new EventTarget(),{matches:reduced});
  const connection = Object.assign(new EventTarget(),{downlink,effectiveType,saveData});
  const timers = new Map(); let timerId=0;
  const context = {window:{},document,navigator:{connection},innerWidth:width,AbortController,DOMException,
    URL:{createObjectURL:()=> 'blob:full-hd',revokeObjectURL:url=>revoked.push(url)},
    fetch(url,options){requests.push({url,options});return new Promise(resolve=>{finishDownload=resolve;});},
    matchMedia:()=>motion,IntersectionObserver:class{constructor(callback){observer=callback;} observe(){} disconnect(){}},
    setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext('window.DaisyHeroVideo = '+source,context);
  const hero = context.window.DaisyHeroVideo;
  hero.bind();
  return {hero,video,image,document,motion,connection,classes,timers,requests,created,revoked,
    download(ok=true){finishDownload({ok,blob:async()=>({size:8493455})});},
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
  assert.match(slow.video.src,/720-lite\.mp4$/);slow.buffer(1);assert.equal(slow.video.plays,0);
  slow.buffer(3);await Promise.resolve();assert.equal(slow.video.plays,1);
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

  const upgrade=fixture(file,{downlink:1});upgrade.buffer(4);await new Promise(setImmediate);
  assert.equal(upgrade.requests.length,0); // No high-quality competition during the low-quality download.
  upgrade.video.currentTime=14.25;upgrade.buffer(15.75);await new Promise(setImmediate);
  assert.equal(upgrade.requests.length,1);assert.equal(upgrade.video.paused,false);
  assert.match(upgrade.requests[0].url,/1080-lite\.mp4$/);assert.equal(upgrade.requests[0].options.priority,'low');
  upgrade.video.currentTime=18.5;upgrade.download();await new Promise(setImmediate);
  const next=upgrade.created[0];
  assert.equal(next.currentTime,18.5);assert.equal(next.paused,false);
  assert.equal(next.dataset.quality,'1080');assert.equal(next.classes.has('is-playing'),true);
  assert.equal(next.style.transition,'none');
  assert.equal(upgrade.video.removed,true);assert.equal(upgrade.requests.length,1);
  upgrade.hero.bind();assert.deepEqual(upgrade.revoked,['blob:full-hd']);

  const failed=fixture(file,{downlink:1});failed.buffer(30);await new Promise(setImmediate);
  failed.download(false);await new Promise(setImmediate);
  assert.equal(failed.video.paused,false);assert.equal(failed.video.removed,undefined);
  assert.equal(failed.created.length,0);

  const decode=fixture(file,{downlink:1,failUpgradePlay:true});decode.buffer(30);await new Promise(setImmediate);
  decode.video.currentTime=11;decode.download();await new Promise(setImmediate);
  assert.equal(decode.video.paused,false);assert.equal(decode.video.currentTime,11);
  assert.equal(decode.video.removed,undefined);assert.equal(decode.created[0].removed,true);
  assert.deepEqual(decode.revoked,['blob:full-hd']);

  const hidden=fixture(file,{downlink:1});hidden.buffer(30);await new Promise(setImmediate);
  hidden.document.hidden=true;hidden.document.dispatchEvent(new Event('visibilitychange'));
  hidden.download();await new Promise(setImmediate);
  assert.equal(hidden.video.removed,undefined);assert.equal(hidden.created[0].paused,true);
  hidden.video.currentTime=29.9;hidden.document.hidden=false;hidden.document.dispatchEvent(new Event('visibilitychange'));
  await new Promise(setImmediate);
  assert.equal(hidden.created[0].currentTime,29.9);assert.equal(hidden.created[0].paused,false);
  assert.equal(hidden.requests.length,1);

  const abandoned=fixture(file,{downlink:1});abandoned.buffer(30);await new Promise(setImmediate);
  abandoned.hero.bind();assert.equal(abandoned.requests[0].options.signal.aborted,true);
  abandoned.download();await new Promise(setImmediate);assert.equal(abandoned.created.length,0);
  console.log(file+': buffering, priority, same-position HD upgrade, upgrade failures, cleanup and visibility checks passed');
}
(async()=>{for(const file of ['site/videos.js','web/videos.js'])await checks(file);})().catch(error=>{console.error(error);process.exitCode=1;});

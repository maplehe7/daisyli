'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tick = () => new Promise(setImmediate);
const bytes = n => new Uint8Array(n);
const prefix = 192*1024;
function fixture(file,{streaming=true,managed=false,streamError=false,decodeError=false,reduced=false,saveData=false,startOffset=0,effectiveType='4g',cache,cacheDenied=false}={}) {
  const requests=[],created=[],revoked=[],objects=new Map(),timers=new Map();
  const videos=[];
  let now=0,timerId=0,urlId=0,observer;
  const parent={append(v){v.parentElement=parent;created.push(v);}};
  function makeVideo() {
    const v=new EventTarget(),classes=new Set(); let time=0;
    videos.push(v);
    Object.defineProperty(v,'currentTime',{get:()=>time,set(t){time=t;queueMicrotask(()=>v.dispatchEvent(new Event('seeked')));}});
    Object.defineProperty(v,'className',{set(value){value.split(' ').forEach(name=>classes.add(name));}});
    Object.assign(v,{src:'',dataset:{},style:{},paused:true,seeking:false,readyState:0,duration:30,end:0,playbackRate:1,
      parentElement:parent,classes,plays:0,loads:[],pauses:[],buffered:{length:1,start:()=>startOffset,end:()=>v.end},
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
      load(){v.loads.push(v.src);v.paused=true;const object=objects.get(v.src);
        if(object instanceof FakeSource){object.target=v;object.readyState='open';queueMicrotask(()=>object.dispatchEvent(new Event('sourceopen')));}
        else if(object instanceof Blob){v.end=30;v.readyState=4;queueMicrotask(()=>v.dispatchEvent(new Event('loadeddata')));}
      },
      play(){if(decodeError&&v.dataset.complete)return Promise.reject(new Error('decode'));v.paused=false;v.plays++;v.dispatchEvent(new Event('playing'));return Promise.resolve();},
      pause(){v.pauses.push({replacementVisible:created.some(next=>next!==v&&!next.removed&&next.classes.has('is-playing'))});v.paused=true;},remove(){v.removed=true;},removeAttribute(name){if(name==='src')v.src='';},setAttribute(){},
      requestVideoFrameCallback(callback){queueMicrotask(callback);return 1;},cancelVideoFrameCallback(){}});
    return v;
  }
  class FakeSource extends EventTarget {
    static isTypeSupported(){return true;}
    addSourceBuffer(){const buffer=new EventTarget();buffer.updating=false;
      buffer.appendBuffer=chunk=>{if(streamError)throw Error('unsupported append');buffer.updating=true;
        this.target.end=Math.min(30,this.target.end+chunk.length/prefix*6);this.target.readyState=4;
        queueMicrotask(()=>{buffer.updating=false;buffer.dispatchEvent(new Event('updateend'));});};return buffer;}
    endOfStream(){this.readyState='ended';this.target.end=30;}
  }
  const video=makeVideo();let current=video;
  const pageImage={complete:true,loading:'eager',getBoundingClientRect:()=>({top:0,bottom:100})};
  const pageMain={querySelector:()=>null,querySelectorAll:()=>[pageImage]};
  const intro={querySelector:()=>current};
  const image={isConnected:true,dataset:{homeSrc:'/below-fold.jpg'},removeAttribute(){delete this.dataset.homeSrc;}};
  const document=Object.assign(new EventTarget(),{hidden:false,createElement:makeVideo,querySelector:s=>s==='main'?pageMain:current?(s==='.home-intro'?intro:current):null,querySelectorAll:()=>[image]});
  const motion=Object.assign(new EventTarget(),{matches:reduced});
  const connection=Object.assign(new EventTarget(),{saveData,downlink:.1,effectiveType}); // A stale estimate alone must not force lower quality.
  const context={window:streaming?{[managed?'ManagedMediaSource':'MediaSource']:FakeSource}:{},document,navigator:{connection},
    Blob,Response,Uint8Array,AbortController,DOMException,performance:{now:()=>now},
    URL:{createObjectURL(object){const url='blob:retained-'+(++urlId);objects.set(url,object);return url;},revokeObjectURL(url){revoked.push(url);objects.delete(url);}},
    fetch(url,options){let queue=[],pending,ended=false,failure;
      const offset=Number(options.headers?.Range?.match(/bytes=(\d+)-/)?.[1]||0);
      const request={url,options,bytes:offset,total:prefix*5,feed(value){request.bytes+=value.length;queue.push(value);flush();},end(){ended=true;flush();},fail(){failure=Error('network');flush();}};
      function flush(){if(!pending)return;if(failure){pending.reject(failure);pending=null;}else if(queue.length){pending.resolve({value:queue.shift(),done:false});pending=null;}else if(ended){pending.resolve({done:true});pending=null;}}
      options.signal.addEventListener('abort',()=>{failure=new DOMException('cancel','AbortError');flush();},{once:true});
      requests.push(request);
      return Promise.resolve({ok:true,status:options.headers?206:200,headers:{get:()=>String(request.total-offset)},body:{getReader:()=>({read:()=>new Promise((resolve,reject)=>{pending={resolve,reject};flush();})})}});
    },
    matchMedia:()=>motion,IntersectionObserver:class{constructor(callback){observer=callback;}observe(){}disconnect(){}},
    MutationObserver:class{observe(){}disconnect(){}},
    setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);}};
  if(cache||cacheDenied)context.window.caches={async open(){if(cacheDenied)throw Error('storage denied');return {
    async match(key){return cache.get(key)?.clone();},async put(key,response){cache.set(key,response.clone());}
  };}};
  vm.runInNewContext('window.DaisyHeroVideo = '+fs.readFileSync(file,'utf8').split('window.DaisyHeroVideo = ')[1],context);
  const hero=context.window.DaisyHeroVideo;hero.bind();
  return {hero,video,image,pageImage,requests,created,revoked,objects,timers,document,motion,connection,
    time(value){now=value;},visible(value){observer([{isIntersecting:value}]);},
    scroll(value){context.window.scrollY=value;document.dispatchEvent(new Event('scroll'));},
    active(){return videos.findLast(v=>!v.removed&&v.classes.has('is-playing'))||current;},
    navigate(home){hero.beginRoute();videos.forEach(v=>v.removed=true);current=home?makeVideo():null;hero.bind();},
    async pageReady(){now+=500;for(const timer of [...timers.values()])if(timer.ms===250)timer.fn();await tick();},
    async feed(request,size){request.feed(bytes(size));await tick();},
    async end(request,complete=true){if(complete&&request.bytes<request.total){request.feed(bytes(request.total-request.bytes));await tick();}request.end();await tick();},
    loop(target){target.seeking=true;target.currentTime=0;target.dispatchEvent(new Event('waiting'));target.seeking=false;target.dispatchEvent(new Event('seeked'));target.dispatchEvent(new Event('playing'));}};
}
async function slowStart(file,options={}) {
  const f=fixture(file,options); f.time(1200); await f.feed(f.requests[0],prefix);
  assert.equal(f.requests[0].options.signal.aborted,false); // An HD probe keeps its original request alive.
  assert.equal(f.requests.length,2);assert.match(f.requests[1].url,/720-stream/);
  await f.feed(f.requests[1],prefix);return f;
}
async function checks(file) {
  const fast=fixture(file);assert.match(fast.requests[0].url,/1080-stream/);
  assert.equal(fast.requests[0].options.priority,'high');assert.equal(fast.video.src,'');
  fast.time(100);await fast.feed(fast.requests[0],prefix);
  assert.match(fast.video.src,/^blob:/);assert.equal(fast.video.paused,false);assert.equal(fast.video.dataset.quality,'1080');
  assert.equal(fast.image.src,undefined);
  fast.video.currentTime=8.5;await fast.end(fast.requests[0]);
  const hd=fast.active();assert.equal(hd.dataset.complete,'true');assert.equal(hd.currentTime,8.5);
  assert.equal(hd,fast.video);assert.equal(fast.created.length,0);assert.equal(fast.image.src,'/below-fold.jpg');
  const src=hd.src,loads=hd.loads.length;
  for(let i=0;i<5;i++){fast.loop(hd);await tick();}
  assert.equal(fast.requests.length,1);assert.equal(hd.src,src);assert.equal(hd.loads.length,loads);assert.equal(hd.paused,false);
  hd.dispatchEvent(new Event('waiting'));await tick();assert.equal(fast.requests.length,1);assert.equal(hd.src,src);
  fast.visible(false);assert.equal(hd.paused,true);fast.visible(true);await tick();assert.equal(hd.paused,false);
  const streamURL=hd.src,completeURL=[...fast.objects].find(([,object])=>object instanceof Blob)[0];
  fast.navigate(false);assert.ok(fast.revoked.includes(streamURL));assert.ok(!fast.revoked.includes(completeURL));
  fast.navigate(true);await tick();assert.equal(fast.requests.length,1);assert.equal(fast.active().dataset.quality,'1080');

  const shifted=fixture(file,{startOffset:1/12});shifted.time(100);await shifted.feed(shifted.requests[0],prefix);
  assert.equal(shifted.video.currentTime,1/12);assert.equal(shifted.video.paused,false);
  assert.equal(shifted.created.length,0); // Starts before the full download, despite an H.264 timestamp offset.

  const slow=await slowStart(file);
  assert.equal(slow.video.dataset.quality,'720');assert.equal(slow.video.paused,false);
  slow.video.currentTime=12.25;await slow.end(slow.requests[1]);
  const low=slow.active();assert.equal(low.dataset.complete,'true');assert.equal(low.dataset.quality,'720');assert.equal(low.currentTime,12.25);
  assert.equal(slow.requests.length,2);assert.equal(slow.requests[0].options.signal.aborted,false);
  for(let i=0;i<4;i++){slow.loop(low);await tick();}
  assert.equal(slow.requests.length,2);assert.equal(low.paused,false);
  low.currentTime=18.5;await slow.feed(slow.requests[0],prefix);await slow.end(slow.requests[0]);
  const upgraded=slow.active();assert.equal(upgraded.currentTime,18.5);assert.equal(upgraded.dataset.quality,'1080');
  assert.equal(slow.objects.get(upgraded.src).size,5*prefix); // One complete file, without restarting the probe.
  assert.equal(low.removed,true);for(let i=0;i<4;i++){slow.loop(upgraded);await tick();}
  assert.equal(slow.requests.length,2);assert.ok(slow.requests.every(r=>!r.url.includes('480')));
  assert.equal(low.pauses.length,1);assert.equal(low.pauses[0].replacementVisible,true); // Never freeze the visible film to prepare HD.

  const threeG=fixture(file,{effectiveType:'2g'});
  assert.equal(threeG.requests.length,1);assert.match(threeG.requests[0].url,/420-stream/); // Skip HD probing on a known slow connection.
  threeG.time(5000);await threeG.feed(threeG.requests[0],prefix);
  assert.equal(threeG.video.paused,true); // Six buffered seconds are unsafe if the rest cannot arrive in time.
  threeG.time(10000);await threeG.feed(threeG.requests[0],prefix);
  assert.equal(threeG.video.paused,false);assert.equal(threeG.video.dataset.quality,'420');
  assert.equal(threeG.image.src,undefined);assert.ok(![...threeG.timers.values()].some(t=>t.ms===12000));
  threeG.video.currentTime=6;await threeG.end(threeG.requests[0]);
  assert.equal(threeG.active(),threeG.video);assert.equal(threeG.video.pauses.length,0); // Completing the same quality does not change sources.
  assert.equal(threeG.requests.length,2);assert.match(threeG.requests[1].url,/1080-stream/);
  assert.equal(threeG.requests[1].options.priority,'low');
  const cachedSource=threeG.video.src;for(let i=0;i<3;i++){threeG.loop(threeG.video);await tick();}
  assert.equal(threeG.video.src,cachedSource);assert.equal(threeG.requests.length,2);
  threeG.video.currentTime=12;threeG.video.end=12;threeG.video.dispatchEvent(new Event('waiting'));await tick();
  assert.equal(threeG.active().dataset.storage,'file');assert.equal(threeG.active().currentTime,12);
  assert.equal(threeG.requests.length,2); // A browser eviction uses the retained file, not another request.
  await threeG.feed(threeG.requests[1],prefix);await threeG.end(threeG.requests[1]);
  assert.equal(threeG.active().dataset.quality,'1080');assert.equal(threeG.active().currentTime,12);
  assert.equal(threeG.requests.length,2);assert.ok(threeG.requests.every(r=>!r.url.includes('720')));

  const glacial=fixture(file,{effectiveType:'slow-2g'});
  for(let step=1;step<=3;step++) {glacial.time(step*15000);await glacial.feed(glacial.requests[0],prefix);assert.equal(glacial.video.plays,0);}
  glacial.time(60000);await glacial.feed(glacial.requests[0],prefix);
  assert.equal(glacial.video.paused,false); // A connection below the encode bitrate waits for a safe reserve.

  const visitor=fixture(file);visitor.scroll(0);assert.equal(visitor.image.src,undefined);
  visitor.scroll(50);assert.equal(visitor.image.src,'/below-fold.jpg');

  for(const options of [{streaming:false},{managed:true},{streamError:true}]) {
    const fallback=fixture(file,options);fallback.time(100);await fallback.feed(fallback.requests[0],prefix);
    await fallback.end(fallback.requests[0]);assert.equal(fallback.active().dataset.complete,'true');assert.equal(fallback.active().paused,false);
    assert.equal(fallback.active().disableRemotePlayback,true);assert.equal(fallback.requests.length,1);
  }
  const decode=await slowStart(file,{decodeError:true});await decode.end(decode.requests[1]);decode.video.currentTime=11;
  await decode.feed(decode.requests[0],prefix);await decode.end(decode.requests[0]);
  assert.equal(decode.video.paused,false);assert.equal(decode.video.currentTime,11);assert.equal(decode.requests.length,2);
  assert.equal(decode.video.pauses.length,0);

  const failed=await slowStart(file);await failed.end(failed.requests[1]);const retained=failed.active();failed.requests[0].fail();await tick();
  assert.equal(failed.active(),retained);assert.equal(retained.paused,false);failed.loop(retained);await tick();assert.equal(failed.requests.length,2);
  failed.navigate(false);failed.navigate(true);await tick();
  assert.equal(failed.requests.length,3);assert.equal(failed.requests[2].options.headers.Range,`bytes=${prefix}-`);
  await failed.end(failed.requests[2]);assert.equal(failed.active().dataset.quality,'1080');
  assert.equal(failed.objects.get(failed.active().src).size,5*prefix);
  const hidden=await slowStart(file);await hidden.end(hidden.requests[1]);hidden.document.hidden=true;hidden.document.dispatchEvent(new Event('visibilitychange'));
  hidden.active().currentTime=29.9;await hidden.feed(hidden.requests[0],prefix);await hidden.end(hidden.requests[0]);
  assert.equal(hidden.active().paused,true);hidden.document.hidden=false;hidden.document.dispatchEvent(new Event('visibilitychange'));await tick();
  assert.equal(hidden.active().dataset.quality,'1080');assert.equal(hidden.active().currentTime,29.9);assert.equal(hidden.active().paused,false);
  for(const option of [{saveData:true},{reduced:true}]) {const f=fixture(file,option);assert.equal(f.requests.length,0);await f.hero.afterBuffered(()=>{});assert.equal(f.image.src,'/below-fold.jpg');}
  const timed=fixture(file);for(const timer of [...timed.timers.values()])if(timer.ms===1800)timer.fn();await tick();assert.match(timed.requests[1].url,/420-stream/);
  const abandoned=fixture(file);const pending=abandoned.requests[0];abandoned.time(100);await abandoned.feed(pending,prefix);abandoned.navigate(false);
  assert.equal(pending.options.signal.aborted,true);await tick();assert.equal(abandoned.requests.length,1);
  await abandoned.pageReady();const continued=abandoned.requests[1];
  assert.equal(continued.options.headers.Range,`bytes=${prefix}-`);assert.equal(continued.options.priority,'low');await abandoned.end(continued);
  assert.equal(abandoned.created.length,0);abandoned.navigate(true);await tick();
  assert.equal(abandoned.requests.length,2);assert.equal(abandoned.active().dataset.quality,'1080');

  const roaming=fixture(file,{effectiveType:'3g'});await roaming.end(roaming.requests[0]);
  const backgroundHD=roaming.requests[1];await roaming.feed(backgroundHD,prefix);
  roaming.pageImage.complete=false;roaming.navigate(false);assert.equal(backgroundHD.options.signal.aborted,true);
  const apiFinished=roaming.hero.contentRequest();await roaming.pageReady();assert.equal(roaming.requests.length,2);
  roaming.pageImage.complete=true;await roaming.pageReady();assert.equal(roaming.requests.length,2); // Still waiting for the page's data.
  apiFinished();await roaming.pageReady();const resumedHD=roaming.requests[2];
  assert.equal(resumedHD.options.headers.Range,`bytes=${prefix}-`);assert.equal(resumedHD.options.priority,'low');
  await roaming.feed(resumedHD,prefix);
  roaming.navigate(true);await tick();assert.equal(roaming.active().dataset.quality,'420');assert.equal(roaming.requests.length,4);
  assert.equal(roaming.requests[3].options.headers.Range,`bytes=${2*prefix}-`);
  roaming.active().currentTime=15;await roaming.end(roaming.requests[3]);
  assert.equal(roaming.active().dataset.quality,'1080');assert.equal(roaming.active().currentTime,15);

  const cache=new Map(),saved=fixture(file,{effectiveType:'3g',cache});await tick();await saved.end(saved.requests[0]);
  const saving=saved.requests[1];await saved.feed(saving,prefix);saved.navigate(false);await saved.pageReady();await saved.end(saved.requests[2]);
  assert.equal(cache.size,2);assert.ok([...cache.keys()].every(key=>!key.includes('720')));
  const returning=fixture(file,{effectiveType:'3g',cache});await returning.hero.afterBuffered(()=>{});await tick();
  assert.equal(returning.requests.length,0);assert.equal(returning.active().dataset.quality,'1080');assert.equal(returning.active().paused,false);
  const unavailable=fixture(file,{cacheDenied:true});await tick();assert.equal(unavailable.requests.length,1);
  await unavailable.end(unavailable.requests[0]);assert.equal(unavailable.active().dataset.quality,'1080');
  const incompleteCache=new Map(),incomplete=fixture(file,{effectiveType:'3g',cache:incompleteCache});await tick();
  await incomplete.feed(incomplete.requests[0],prefix);await incomplete.end(incomplete.requests[0],false);
  assert.equal(incompleteCache.size,0); // Interrupted/truncated files must never become persistent cache hits.
  assert.equal(fast.hero.deferImages('<img src="hero.jpg" fetchpriority="high"><img src="card.jpg">'),'<img src="hero.jpg" fetchpriority="high"><img data-home-src="card.jpg">');
  console.log(file+': direct 420p-to-HD, content-first Range resume, return during download, disk-cache revisit, buffering, handoff, loops and failure recovery passed');
}
(async()=>{for(const file of ['site/videos.js','web/videos.js'])await checks(file);})().catch(error=>{console.error(error);process.exitCode=1;});

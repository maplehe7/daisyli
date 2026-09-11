'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tick = () => new Promise(setImmediate);
const bytes = n => new Uint8Array(n);
const prefix = 192*1024;
function fixture(file,{streaming=true,managed=false,streamError=false,decodeError=false,reduced=false,saveData=false,startOffset=0}={}) {
  const requests=[],created=[],revoked=[],objects=new Map(),timers=new Map();
  let now=0,timerId=0,urlId=0,observer;
  const parent={append(v){v.parentElement=parent;created.push(v);}};
  function makeVideo() {
    const v=new EventTarget(),classes=new Set(); let time=0;
    Object.defineProperty(v,'currentTime',{get:()=>time,set(t){time=t;queueMicrotask(()=>v.dispatchEvent(new Event('seeked')));}});
    Object.defineProperty(v,'className',{set(value){value.split(' ').forEach(name=>classes.add(name));}});
    Object.assign(v,{src:'',dataset:{},style:{},paused:true,seeking:false,readyState:0,duration:30,end:0,playbackRate:1,
      parentElement:parent,classes,plays:0,loads:[],buffered:{length:1,start:()=>startOffset,end:()=>v.end},
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
      load(){v.loads.push(v.src);v.paused=true;const object=objects.get(v.src);
        if(object instanceof FakeSource){object.target=v;object.readyState='open';queueMicrotask(()=>object.dispatchEvent(new Event('sourceopen')));}
        else if(object instanceof Blob){v.end=30;v.readyState=4;queueMicrotask(()=>v.dispatchEvent(new Event('loadeddata')));}
      },
      play(){if(decodeError&&v.dataset.complete)return Promise.reject(new Error('decode'));v.paused=false;v.plays++;v.dispatchEvent(new Event('playing'));return Promise.resolve();},
      pause(){v.paused=true;},remove(){v.removed=true;},removeAttribute(name){if(name==='src')v.src='';},setAttribute(){},
      requestVideoFrameCallback(callback){queueMicrotask(callback);return 1;},cancelVideoFrameCallback(){}});
    return v;
  }
  class FakeSource extends EventTarget {
    static isTypeSupported(){return true;}
    addSourceBuffer(){const buffer=new EventTarget();buffer.updating=false;
      buffer.appendBuffer=chunk=>{if(streamError)throw Error('unsupported append');buffer.updating=true;
        this.target.end=Math.min(30,this.target.end+chunk.length/prefix*4);this.target.readyState=4;
        queueMicrotask(()=>{buffer.updating=false;buffer.dispatchEvent(new Event('updateend'));});};return buffer;}
    endOfStream(){this.readyState='ended';}
  }
  const video=makeVideo(),intro={querySelector:()=>video};
  const image={isConnected:true,dataset:{homeSrc:'/below-fold.jpg'},removeAttribute(){delete this.dataset.homeSrc;}};
  const document=Object.assign(new EventTarget(),{hidden:false,createElement:makeVideo,querySelector:s=>s==='.home-intro'?intro:video,querySelectorAll:()=>[image]});
  const motion=Object.assign(new EventTarget(),{matches:reduced});
  const connection=Object.assign(new EventTarget(),{saveData,downlink:.1}); // Stale estimates must not force lower quality.
  const context={window:streaming?{[managed?'ManagedMediaSource':'MediaSource']:FakeSource}:{},document,navigator:{connection},
    Blob,Uint8Array,AbortController,DOMException,performance:{now:()=>now},
    URL:{createObjectURL(object){const url='blob:retained-'+(++urlId);objects.set(url,object);return url;},revokeObjectURL(url){revoked.push(url);objects.delete(url);}},
    fetch(url,options){let queue=[],pending,ended=false,failure;
      const request={url,options,feed(value){queue.push(value);flush();},end(){ended=true;flush();},fail(){failure=Error('network');flush();}};
      function flush(){if(!pending)return;if(failure){pending.reject(failure);pending=null;}else if(queue.length){pending.resolve({value:queue.shift(),done:false});pending=null;}else if(ended){pending.resolve({done:true});pending=null;}}
      options.signal.addEventListener('abort',()=>{failure=new DOMException('cancel','AbortError');flush();},{once:true});
      requests.push(request);
      return Promise.resolve({ok:true,status:options.headers?206:200,body:{getReader:()=>({read:()=>new Promise((resolve,reject)=>{pending={resolve,reject};flush();})})}});
    },
    matchMedia:()=>motion,IntersectionObserver:class{constructor(callback){observer=callback;}observe(){}disconnect(){}},
    setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext('window.DaisyHeroVideo = '+fs.readFileSync(file,'utf8').split('window.DaisyHeroVideo = ')[1],context);
  const hero=context.window.DaisyHeroVideo;hero.bind();
  return {hero,video,image,requests,created,revoked,objects,timers,document,motion,connection,
    time(value){now=value;},visible(value){observer([{isIntersecting:value}]);},
    active(){return created.findLast(v=>!v.removed&&v.classes.has('is-playing'))||video;},
    async feed(request,size){request.feed(bytes(size));await tick();},
    async end(request){request.end();await tick();},
    loop(target){target.seeking=true;target.currentTime=0;target.dispatchEvent(new Event('waiting'));target.seeking=false;target.dispatchEvent(new Event('seeked'));target.dispatchEvent(new Event('playing'));}};
}
async function slowStart(file,options={}) {
  const f=fixture(file,options); f.time(1200); await f.feed(f.requests[0],prefix);
  assert.equal(f.requests[0].options.signal.aborted,true);
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
  assert.equal(hd.style.transition,'none');assert.equal(fast.video.removed,true);assert.equal(fast.image.src,'/below-fold.jpg');
  const src=hd.src,loads=hd.loads.length;
  for(let i=0;i<5;i++){fast.loop(hd);await tick();}
  assert.equal(fast.requests.length,1);assert.equal(hd.src,src);assert.equal(hd.loads.length,loads);assert.equal(hd.paused,false);
  hd.dispatchEvent(new Event('waiting'));await tick();assert.equal(fast.requests.length,1);assert.equal(hd.src,src);
  fast.visible(false);assert.equal(hd.paused,true);fast.visible(true);await tick();assert.equal(hd.paused,false);
  const liveURLs=[...fast.objects.keys()];fast.hero.bind();for(const url of liveURLs)assert.ok(fast.revoked.includes(url));

  const shifted=fixture(file,{startOffset:1/12});shifted.time(100);await shifted.feed(shifted.requests[0],prefix);
  assert.equal(shifted.video.currentTime,1/12);assert.equal(shifted.video.paused,false);
  assert.equal(shifted.created.length,0); // Starts before the full download, despite an H.264 timestamp offset.

  const slow=await slowStart(file);
  assert.equal(slow.video.dataset.quality,'720');assert.equal(slow.video.paused,false);
  slow.video.currentTime=12.25;await slow.end(slow.requests[1]);
  const low=slow.active();assert.equal(low.dataset.complete,'true');assert.equal(low.dataset.quality,'720');assert.equal(low.currentTime,12.25);
  assert.equal(slow.requests.length,3);assert.equal(slow.requests[2].options.headers.Range,`bytes=${prefix}-`);
  assert.equal(slow.requests[2].options.priority,'low');
  for(let i=0;i<4;i++){slow.loop(low);await tick();}
  assert.equal(slow.requests.length,3);assert.equal(low.paused,false);
  low.currentTime=18.5;await slow.feed(slow.requests[2],prefix);await slow.end(slow.requests[2]);
  const upgraded=slow.active();assert.equal(upgraded.currentTime,18.5);assert.equal(upgraded.dataset.quality,'1080');
  assert.equal(slow.objects.get(upgraded.src).size,2*prefix); // Retained prefix + Range remainder, no duplicate bytes.
  assert.equal(low.removed,true);for(let i=0;i<4;i++){slow.loop(upgraded);await tick();}
  assert.equal(slow.requests.length,3);assert.ok(slow.requests.every(r=>!r.url.includes('480')));

  for(const options of [{streaming:false},{managed:true},{streamError:true}]) {
    const fallback=fixture(file,options);fallback.time(100);await fallback.feed(fallback.requests[0],prefix);
    await fallback.end(fallback.requests[0]);assert.equal(fallback.active().dataset.complete,'true');assert.equal(fallback.active().paused,false);
    assert.equal(fallback.active().disableRemotePlayback,true);assert.equal(fallback.requests.length,1);
  }
  const decode=fixture(file,{decodeError:true});decode.time(100);await decode.feed(decode.requests[0],prefix);decode.video.currentTime=11;
  await decode.end(decode.requests[0]);assert.equal(decode.video.paused,false);assert.equal(decode.video.currentTime,11);assert.equal(decode.requests.length,1);

  const failed=await slowStart(file);await failed.end(failed.requests[1]);const retained=failed.active();failed.requests[2].fail();await tick();
  assert.equal(failed.active(),retained);assert.equal(retained.paused,false);failed.loop(retained);await tick();assert.equal(failed.requests.length,3);
  const hidden=await slowStart(file);await hidden.end(hidden.requests[1]);hidden.document.hidden=true;hidden.document.dispatchEvent(new Event('visibilitychange'));
  hidden.active().currentTime=29.9;await hidden.feed(hidden.requests[2],prefix);await hidden.end(hidden.requests[2]);
  assert.equal(hidden.active().paused,true);hidden.document.hidden=false;hidden.document.dispatchEvent(new Event('visibilitychange'));await tick();
  assert.equal(hidden.active().dataset.quality,'1080');assert.equal(hidden.active().currentTime,29.9);assert.equal(hidden.active().paused,false);
  for(const option of [{saveData:true},{reduced:true}]) {const f=fixture(file,option);assert.equal(f.requests.length,0);await f.hero.afterBuffered(()=>{});assert.equal(f.image.src,'/below-fold.jpg');}
  const timed=fixture(file);for(const timer of [...timed.timers.values()])if(timer.ms===1800)timer.fn();await tick();assert.match(timed.requests[1].url,/720-stream/);
  const abandoned=fixture(file);const pending=abandoned.requests[0];abandoned.hero.bind();assert.equal(pending.options.signal.aborted,true);await tick();assert.equal(abandoned.created.length,0);
  assert.equal(fast.hero.deferImages('<img src="hero.jpg" fetchpriority="high"><img src="card.jpg">'),'<img src="hero.jpg" fetchpriority="high"><img data-home-src="card.jpg">');
  console.log(file+': measured quality, retained loops, Range continuation, exact HD handoff, stream/Blob fallbacks, visibility and cleanup passed');
}
(async()=>{for(const file of ['site/videos.js','web/videos.js'])await checks(file);})().catch(error=>{console.error(error);process.exitCode=1;});

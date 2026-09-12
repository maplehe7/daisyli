/* Playlist verified against the site's GitHub script and Vimeo oEmbed metadata.
   Labels use the property addresses in the original video titles. */
window.DaisyVideos = (() => {
  const videos = [
    {id:'1072573097',title:'48 Panorama',duration:'3:23',thumbnail:'https://i.vimeocdn.com/video/2001519585-41187c331f330848909c447d3d952fc2f72b6890918cfae907f6285533198425-d_640?region=us'},
    {id:'584055906',title:'102 Nest Pine, Irvine',duration:'3:39',thumbnail:'https://i.vimeocdn.com/video/1208587998-0841844b0620bbd360bd1a11c716b1ab1d746db42dc756c417c16a367455bec6-d_640?region=us'},
    {id:'564693956',title:'25 Bellflower, Lake Forest',duration:'3:54',thumbnail:'https://i.vimeocdn.com/video/1167345754-1ced76f623e53d6d5e0b9b37d75aefad9bc26a5a63847d5fa8c2f0e796b22317-d_640?region=us'},
    {id:'549409748',title:'70 Loganberry, Irvine',duration:'3:16',thumbnail:'https://i.vimeocdn.com/video/1137471915-dadb11dc65b2fd0754eb9dc398ecc684e6a328f7c5127057143b9cd70171a79a-d_640?region=us'},
    {id:'522138099',title:'133 Iron Horse, Irvine',duration:'2:30',thumbnail:'https://i.vimeocdn.com/video/1081327860-0d129553c63021fda9e3042ec9bcbde45d79e3cc271c72b3b0cb279605e35112-d_640?region=us'},
    {id:'1182450083',title:'8 Panorama, Coto de Caza',duration:'3:25',thumbnail:'https://i.vimeocdn.com/video/2145066772-d1b438ba7917dd159f9c95679e0c0fb6d86a63901c3f95fdd336859d51c0b6f3-d_640?region=us'}
  ];
  const dialog = document.getElementById('film-dialog');
  let sdkPromise, playerPromise, player, loadedId, selectedId = videos[0].id;
  let observer, switching = false, revision = 0, standby = null, preloadTimer;

  function render() {
    return `<section id="featured-videos" class="section wrap video-section" aria-labelledby="featured-videos-title"><div class="section-heading"><h2 id="featured-videos-title">Featured Videos</h2></div><div class="video-grid">${videos.map(video => `<button type="button" class="video-card" data-film="${video.id}" aria-label="Play ${video.title}"><span class="video-thumbnail"><img src="${video.thumbnail}" alt="" loading="lazy" decoding="async" width="640" height="360"><span class="video-duration">${video.duration}</span></span><span class="video-title">${video.title}</span></button>`).join('')}</div></section>`;
  }

  function deadline(promise, ms = 15000) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Video request timed out')), ms);
    })]).finally(() => clearTimeout(timer));
  }

  function loadSDK() {
    if (window.Vimeo?.Player) return Promise.resolve();
    if (!sdkPromise) {
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.async = true;
      sdkPromise = deadline(new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Vimeo player unavailable'));
        document.head.append(script);
      })).catch(error => { script.remove(); sdkPromise = null; throw error; });
    }
    return sdkPromise;
  }

  function ensurePlayer(id) {
    if (!playerPromise) {
      playerPromise = (async () => {
        await loadSDK();
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${id}?autoplay=0&autopause=1&playsinline=1&preload=metadata&dnt=1`;
        iframe.title = 'Daisy Li featured property film';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
        iframe.allowFullscreen = true;
        document.getElementById('film-player').append(iframe);
        applyLanguage(dialog);
        player = new Vimeo.Player(iframe);
        // A late play response must never leave audio playing behind a closed dialog.
        pauseHidden(player);
        await deadline(player.ready());
        loadedId = id;
        return player;
      })().catch(error => {
        player?.destroy().catch(() => {});
        player = null; playerPromise = null; loadedId = null;
        throw error;
      });
    }
    return playerPromise;
  }

  function setState(state) {
    dialog.dataset.videoState = state;
    document.getElementById('film-stage').setAttribute('aria-busy', String(state === 'loading'));
    document.getElementById('film-loading').hidden = state !== 'loading';
    document.getElementById('film-error').hidden = state !== 'error';
  }

  function pauseHidden(recordPlayer) {
    recordPlayer.on('play', () => {
      if (!dialog.open || recordPlayer !== player) recordPlayer.pause().catch(() => {});
    });
  }

  async function prepareNext() {
    if (!dialog.open || navigator.connection?.saveData || loadedId !== selectedId) return;
    const next = videos[(videos.findIndex(video => video.id === selectedId) + 1) % videos.length];
    if (standby?.id === next.id || standby?.pending) return;
    const record = standby || {player:null,iframe:null,id:null,pending:null};
    standby = record;
    record.id = next.id;
    record.pending = (async () => {
      if (!record.player) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${next.id}?autoplay=0&autopause=1&playsinline=1&preload=metadata&dnt=1`;
        iframe.title = 'Daisy Li featured property film';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
        iframe.allowFullscreen = true;
        iframe.tabIndex = -1;
        iframe.className = 'video-standby';
        iframe.setAttribute('aria-hidden','true');
        record.iframe = iframe;
        document.getElementById('film-player').append(iframe);
        record.player = new Vimeo.Player(iframe);
        pauseHidden(record.player);
        await deadline(record.player.ready());
      } else {
        await record.player.pause().catch(() => {});
        await deadline(record.player.loadVideo(Number(next.id)));
      }
      await record.player.pause().catch(() => {});
    })().catch(() => {
      record.id = null;
      record.player?.destroy().catch(() => {});
      record.player = null; record.iframe = null;
    }).finally(() => { record.pending = null; });
  }

  function scheduleNext() {
    clearTimeout(preloadTimer);
    // Let current playback start before preparing one adjacent video, never all six.
    preloadTimer = setTimeout(prepareNext, 1200);
  }

  function useStandby() {
    const previous = {player,iframe:document.querySelector('#film-player iframe:not(.video-standby)'),id:loadedId,pending:null};
    const next = standby;
    previous.iframe.tabIndex = -1;
    previous.iframe.classList.add('video-standby');
    previous.iframe.setAttribute('aria-hidden','true');
    next.iframe.removeAttribute('tabindex');
    next.iframe.classList.remove('video-standby');
    next.iframe.removeAttribute('aria-hidden');
    player = next.player; loadedId = next.id;
    playerPromise = Promise.resolve(player);
    standby = previous;
    applyLanguage(dialog);
  }

  function updateSelection() {
    const video = videos.find(item => item.id === selectedId);
    dialog.dataset.videoId = selectedId;
    document.getElementById('film-title').textContent = video.title;
    document.getElementById('film-count').textContent = `${videos.indexOf(video) + 1} / ${videos.length}`;
    document.getElementById('film-poster').src = video.thumbnail;
    document.getElementById('film-source').href = `https://vimeo.com/${video.id}`;
    dialog.querySelectorAll('[data-film]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.film === selectedId));
    });
    applyLanguage(dialog);
  }

  async function switchToSelection() {
    if (switching) return;
    switching = true;
    try {
      // Serialize Vimeo commands and skip intermediate selections during rapid clicks.
      while (dialog.open) {
        const id = selectedId, request = revision;
        try {
          let activePlayer = await ensurePlayer(id);
          if (!dialog.open) break;
          if (request !== revision) continue;
          await activePlayer.pause().catch(() => {});
          if (loadedId !== id && standby?.id === id) {
            await standby.pending;
            if (!dialog.open) break;
            if (request !== revision) continue;
            if (standby?.id === id && standby.player) {
              useStandby(); activePlayer = player;
            }
          }
          if (loadedId !== id) {
            await deadline(activePlayer.loadVideo(Number(id)));
            loadedId = id;
          }
          if (!dialog.open) break;
          if (request !== revision) continue;
          dialog.dataset.loadedVideoId = id;
          setState('ready');
          // If autoplay is blocked, keep Vimeo's native play control available.
          activePlayer.play().catch(() => {});
          scheduleNext();
          break;
        } catch (error) {
          if (!dialog.open) break;
          if (request !== revision) continue;
          // A timed-out load must not resolve into a subsequent retry's player.
          player?.destroy().catch(() => {});
          player = null; playerPromise = null; loadedId = null;
          setState('error');
          break;
        }
      }
    } finally { switching = false; }
  }

  function open(id) {
    if (!videos.some(video => video.id === id)) return;
    selectedId = id;
    clearTimeout(preloadTimer);
    revision++;
    updateSelection();
    setState('loading');
    if (!dialog.open) dialog.showModal();
    switchToSelection();
  }

  function warm() {
    window.DaisyHeroVideo.afterBuffered(() => {
      if (document.getElementById('featured-videos')) ensurePlayer(selectedId).catch(() => {});
    });
  }

  function bind() {
    window.DaisyHeroVideo?.bind();
    observer?.disconnect();
    clearTimeout(preloadTimer);
    if (dialog.open) dialog.close();
    const section = document.getElementById('featured-videos');
    if (!section) return;
    // Prepare one paused player near the gallery, without loading six video embeds.
    if (!navigator.connection?.saveData) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect(); warm();
        }
      }, {rootMargin:'400px'});
      observer.observe(section);
    }
    section.addEventListener('pointerover', warm, {once:true});
    section.addEventListener('focusin', warm, {once:true});
  }

  dialog.innerHTML = `<div class="film-heading"><h2 id="film-title"></h2><button class="dialog-close" type="button" aria-label="Close video">×</button></div><div id="film-stage"><div id="film-player"></div><div class="film-placeholder"><img id="film-poster" alt=""><span id="film-loading" role="status">Loading video…</span><div id="film-error" hidden><p>Video could not load.</p><button type="button" data-video-retry>Try again</button></div></div></div><div class="film-controls"><div class="film-pagination"><button type="button" data-video-step="-1" aria-label="Previous video">←</button><span id="film-count" aria-live="polite"></span><button type="button" data-video-step="1" aria-label="Next video">→</button></div><a id="film-source" target="_blank" rel="noopener">Watch on Vimeo ↗</a></div><div class="film-choices" aria-label="Featured Videos">${videos.map(video => `<button type="button" data-film="${video.id}" aria-label="Play ${video.title}" aria-pressed="false"><img src="${video.thumbnail}" alt="" loading="lazy" width="160" height="90"><span>${video.title}</span></button>`).join('')}</div>`;
  dialog.setAttribute('aria-labelledby','film-title');
  dialog.addEventListener('close', () => {
    revision++;
    clearTimeout(preloadTimer);
    player?.pause().catch(() => {});
    standby?.player?.pause().catch(() => {});
  });
  document.addEventListener('click', event => {
    const film = event.target.closest('[data-film]');
    if (film) open(film.dataset.film);
    const step = event.target.closest('[data-video-step]');
    if (step) {
      const index = videos.findIndex(video => video.id === selectedId);
      open(videos[(index + Number(step.dataset.videoStep) + videos.length) % videos.length].id);
    }
    if (event.target.closest('[data-video-retry]')) open(selectedId);
  });
  return {render, bind};
})();

/* Downloads and completed files outlive the home-page player and its route. */
window.DaisyHeroVideo = (() => {
  const assetRoot = 'https://maplehe7.github.io/daisyli/web/assets/home-film-v4/';
  const variants = ['film-1080-stream.mp4','film-720-stream.mp4','film-420-stream.mp4'];
  const qualityLabels = ['1080','720','420'];
  const filmDuration = 30.042;
  const codec = 'video/mp4; codecs="avc1.640028"';
  const assets = variants.map((name,quality) => ({name,quality,chunks:[],bytes:0,total:0,rate:0,url:null,pending:null,selection:null}));
  let fileCache;
  function retain(asset,blob) {
    asset.url = URL.createObjectURL(blob);
    asset.bytes = asset.total = blob.size;
    asset.chunks = [];
  }
  // Cache only complete files. A denied/quota-limited cache still leaves the
  // current visit's retained Blob available across all client-side routes.
  const cacheReady = window.caches ? window.caches.open('daisy-home-video-v4').then(async cache => {
    fileCache = cache;
    await Promise.all(assets.map(async asset => {
      try {
        const response = await cache.match(assetRoot+asset.name);
        if (!response?.ok) return;
        const blob = await response.blob();
        if (blob.size > 0 && blob.size === Number(response.headers.get('Content-Length')) && blob.type === 'video/mp4') retain(asset,blob);
      } catch { /* Normal fetching remains available when storage cannot be read. */ }
    }));
  }).catch(() => {}) : null;
  let background = false, pageGate = null, stopPageWatch, checkPage, contentRequests = 0;
  function holdForContent() {
    if (!pageGate) {
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      pageGate = {promise,resolve};
    }
    assets.forEach(asset => asset.pause?.());
  }
  function releasePage() {
    const gate = pageGate; pageGate = null; gate?.resolve();
  }
  function beginRoute() {
    stopPageWatch?.(); background = true; holdForContent();
  }
  function contentRequest() {
    contentRequests++;
    if (background) holdForContent();
    return () => { contentRequests--; checkPage?.(); };
  }
  function watchPageContent() {
    const main = document.querySelector('main');
    if (!main) { releasePage(); return; }
    let timer, changed = performance.now();
    const events = new AbortController();
    const poke = () => { changed = performance.now(); check(); };
    const observer = new MutationObserver(poke);
    function check() {
      clearTimeout(timer);
      if (!assets.some(asset => asset.pending)) { releasePage(); stopPageWatch?.(); return; }
      const imagesLoading = [...main.querySelectorAll('img[src],img[srcset]')].some(image => {
        if (image.complete) return false;
        const box = image.getBoundingClientRect();
        // Offscreen lazy images need not be downloaded until the visitor scrolls.
        return image.loading !== 'lazy' || image.currentSrc || (box.top < window.innerHeight && box.bottom > 0);
      });
      const busy = contentRequests > 0 || main.querySelector('.idx-loading,[aria-busy="true"]') || imagesLoading || document.fonts?.status === 'loading';
      if (busy || performance.now()-changed < 400) holdForContent();
      else releasePage();
      timer = setTimeout(check,250);
    }
    stopPageWatch = () => {
      clearTimeout(timer); observer.disconnect(); events.abort(); checkPage = stopPageWatch = null;
    };
    checkPage = poke;
    observer.observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','aria-busy','hidden']});
    for (const event of ['load','error','scroll']) document.addEventListener(event,poke,{capture:true,signal:events.signal});
    check();
  }
  let dispose;
  let ready = Promise.resolve();
  function afterBuffered(callback) { return ready.then(callback); }
  function deferImages(markup) {
    return markup.replace(/<img\b[^>]*>/g, tag => tag.includes('fetchpriority="high"') ? tag : tag.replace(' src="',' data-home-src="'));
  }
  function render() {
    return `<div class="hero-photo hero-film"><img class="hero-film-poster" src="${assetRoot}poster-lite.jpg" alt="" fetchpriority="high" width="1280" height="720"><video class="hero-film-video" muted loop playsinline preload="auto" poster="${assetRoot}poster-lite.jpg" aria-hidden="true" disablepictureinpicture></video></div>`;
  }
  function bind() {
    dispose?.(); dispose = null; ready = Promise.resolve();
    stopPageWatch?.();
    const intro = document.querySelector('.home-intro');
    if (intro && !intro.querySelector('.hero-film-video')) {
      intro.querySelector(':scope > .hero-photo').outerHTML = render();
      intro.querySelector('.hero-photo-caption')?.remove();
    }
    let video = document.querySelector('.hero-film-video');
    if (!video) { background = true; watchPageContent(); return; }
    background = false; releasePage();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const events = new AbortController();
    const on = (target,event,handler) => target.addEventListener(event,handler,{signal:events.signal});
    const urls = new Set();
    let disposed = false, visible = true, blocked = false, started = false;
    let buffering = true, playPending = false, generation = 0, released = false, releaseReady;
    let candidate = null, promoting = false, promotionController, promotionRetry, startingQuality = 2, rebuffers = 0;
    ready = new Promise(resolve => { releaseReady = resolve; });
    const deferredImages = [...document.querySelectorAll('[data-home-src]')];
    configure(video);

    function configure(target) {
      target.muted = true; target.defaultMuted = true; target.autoplay = false;
      target.loop = true; target.playsInline = true; target.preload = 'auto';
      target.disableRemotePlayback = true; target.disablePictureInPicture = true;
    }
    function localURL(value) { const url = URL.createObjectURL(value); urls.add(url); return url; }
    function revoke(url) { if (urls.delete(url)) URL.revokeObjectURL(url); }
    function releaseContent() {
      if (released) return;
      released = true;
      if (!disposed) deferredImages.forEach(image => {
        if (!image.isConnected) return;
        image.src = image.dataset.homeSrc; image.removeAttribute('data-home-src');
      });
      releaseReady();
    }
    function disabled() { return blocked || motion.matches || connection?.saveData; }
    function mediaStep(target,event,action,complete,signal=events.signal) {
      return new Promise((resolve,reject) => {
        const finish = error => {
          clearTimeout(timer); target.removeEventListener(event,done); target.removeEventListener('error',failed);
          signal.removeEventListener('abort',aborted); error ? reject(error) : resolve();
        };
        const done = () => finish();
        const failed = () => finish(new Error('Video preparation failed'));
        const aborted = () => finish(new DOMException('Video preparation cancelled','AbortError'));
        const timer = setTimeout(failed,15000);
        target.addEventListener(event,done,{once:true}); target.addEventListener('error',failed,{once:true});
        signal.addEventListener('abort',aborted,{once:true});
        if (signal.aborted) { aborted(); return; }
        try { action(); if (complete()) done(); } catch(error) { finish(error); }
      });
    }
    function paintedFrame(target,signal) {
      return new Promise((resolve,reject) => {
        let frame, fallbackFrame;
        const finish = error => {
          clearTimeout(timer); signal.removeEventListener('abort',abort);
          if (frame != null) target.cancelVideoFrameCallback?.(frame);
          if (fallbackFrame != null) cancelAnimationFrame(fallbackFrame);
          error ? reject(error) : resolve();
        };
        const abort = () => finish(new DOMException('Video handoff cancelled','AbortError'));
        const timer = setTimeout(() => finish(new Error('Video frame timed out')),15000);
        signal.addEventListener('abort',abort,{once:true});
        if (signal.aborted) { abort(); return; }
        if (target.requestVideoFrameCallback) frame = target.requestVideoFrameCallback(() => finish());
        else fallbackFrame = requestAnimationFrame(() => { fallbackFrame = requestAnimationFrame(() => finish()); });
      });
    }
    function removeVideo(target) {
      const url = target.src;
      target.pause(); target.removeAttribute('src'); target.load(); target.remove();
      // Completed Blob URLs belong to the shared asset, not this route's player.
      if (!assets.some(asset => asset.url === url)) revoke(url);
    }
    async function promote() {
      if (!candidate || candidate.readyState < 2 || promoting || disposed || disabled() || !visible || document.hidden) return;
      clearTimeout(promotionRetry); promotionRetry = null;
      promoting = true;
      const previous = video, next = candidate;
      const stage = new AbortController(); promotionController = stage;
      const cancel = () => stage.abort(); events.signal.addEventListener('abort',cancel,{once:true});
      generation++; playPending = false;
      try {
        // Keep the visible video moving while the hidden HD decoder catches up.
        // Compensate for the measured seek delay instead of freezing the old frame.
        let lead = 0, aligned = false;
        for (let attempt=0; attempt<3; attempt++) {
          const position = ((previous.currentTime || 0)+lead) % next.duration;
          const began = performance.now();
          await mediaStep(next,'seeked',() => { next.currentTime = position; },
            () => !next.seeking && Math.abs(next.currentTime-position) < .05,stage.signal);
          next.playbackRate = previous.playbackRate;
          await Promise.all([next.play(),paintedFrame(next,stage.signal)]);
          let drift = Math.abs(next.currentTime-previous.currentTime);
          drift = Math.min(drift,Math.abs(next.duration-drift));
          if (drift <= .08 || previous.paused) { aligned = true; break; }
          lead = Math.min(.5,(performance.now()-began)/1000);
          next.pause();
        }
        if (stage.signal.aborted || disposed || disabled() || !visible || document.hidden) return;
        if (!aligned) { promotionRetry = setTimeout(promote,250); return; }
        video = next; candidate = null; buffering = false;
        bindMedia(video); video.style.transition = 'none'; video.classList.add('is-playing');
        removeVideo(previous);
      } catch(error) {
        if (!stage.signal.aborted && candidate === next) { candidate = null; removeVideo(next); }
      } finally {
        events.signal.removeEventListener('abort',cancel); promoting = false; promotionController = null;
        if (video === previous) next.pause();
      }
    }
    async function useBlob(asset,force=false) {
      if (disposed || disabled()) return;
      // A complete MediaSource already has every frame for looping. Avoid a
      // redundant source change just to play the same quality from another URL.
      if (!force && video.dataset.complete === 'true' && video.dataset.quality === qualityLabels[asset.quality]) { resume(); return; }
      if (candidate) { promotionController?.abort(); removeVideo(candidate); candidate = null; }
      const next = document.createElement('video'); configure(next);
      next.className = 'hero-film-video'; next.dataset.quality = qualityLabels[asset.quality];
      next.dataset.complete = 'true'; next.dataset.storage = 'file'; next.setAttribute('aria-hidden','true');
      candidate = next; next.src = asset.url; video.parentElement.append(next);
      try {
        await mediaStep(next,'loadeddata',() => next.load(),() => next.readyState >= 2);
        await promote();
      } catch { if (!disposed && candidate === next) { candidate = null; removeVideo(next); } }
    }
    function bufferAhead() {
      for (let i=0; i<video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime+.05 && video.buffered.end(i) > video.currentTime)
          return video.buffered.end(i)-video.currentTime;
      }
      return 0;
    }
    async function resume() {
      if (disabled() || disposed || promoting || !visible || document.hidden) return;
      if (candidate?.readyState >= 2) { promote(); return; }
      if (!video.src || video.seeking || playPending) return;
      // Fragmented H.264 can begin a few frames after zero because of B-frames.
      // Seek to that first buffered frame instead of waiting for nonexistent data.
      if (video.buffered.length && video.currentTime < video.buffered.start(0) && video.buffered.start(0) < .2) {
        video.currentTime = video.buffered.start(0); return;
      }
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : filmDuration;
      const ahead = bufferAhead(), remaining = duration-video.currentTime;
      const complete = video.dataset.complete === 'true' || (ahead > 0 && remaining > 0 && ahead >= remaining-.1);
      const asset = assets[qualityLabels.indexOf(video.dataset.quality)];
      const secondsToFinish = asset?.rate > 0 && asset.total > 0 ? (asset.total-asset.bytes)/(asset.rate*.7) : Infinity;
      // Reserve 30% of measured throughput for variation and require the rest of
      // the file to arrive before playback catches it. Rebuffering builds a larger
      // reserve instead of repeatedly playing three seconds and stopping again.
      if (buffering && !complete && (ahead < (rebuffers ? 8 : 5) || secondsToFinish > Math.max(0,remaining-5))) return;
      buffering = false;
      if (!video.paused) return;
      const request = generation; playPending = true;
      try { await video.play(); }
      catch(error) {
        if (!disposed && request === generation && error.name !== 'AbortError') {
          blocked = true; video.classList.remove('is-playing'); releaseContent();
        }
      } finally { if (request === generation) playPending = false; }
    }
    function bindMedia(target) {
      const mediaOn = (event,handler) => on(target,event,() => { if (video === target) handler(); });
      mediaOn('playing',() => { video.classList.add('is-playing'); });
      // Decoder/loop waits are not evidence of a slow connection. Never replace
      // a downloaded source, or start a lower-quality request, because of waiting.
      mediaOn('waiting',() => {
        if (video.dataset.complete === 'true' && video.dataset.storage === 'stream' && !video.seeking &&
            (video.buffered.length !== 1 || video.buffered.start(0) > .2 || video.buffered.end(0) < filmDuration-.2)) {
          // ManagedMediaSource may discard old frames under memory pressure.
          // Recover from our retained file, without asking the network again.
          const asset = assets[qualityLabels.indexOf(video.dataset.quality)];
          if (asset?.url && !candidate) useBlob(asset,true);
        }
        if (video.dataset.complete !== 'true' && !video.seeking && bufferAhead() < .2 && !promoting) {
          buffering = true; rebuffers++; generation++; playPending = false; video.pause();
        }
      });
      for (const event of ['progress','canplay','canplaythrough','seeked']) mediaOn(event,resume);
    }

    async function openStream(asset) {
      const Source = [window.MediaSource,window.ManagedMediaSource].find(Type => Type?.isTypeSupported?.(codec));
      if (!Source) return null; // Older browsers play the completed Blob instead.
      const media = new Source(), target = video;
      target.dataset.quality = qualityLabels[asset.quality]; target.dataset.storage = 'stream';
      const url = localURL(media);
      try {
        await mediaStep(media,'sourceopen',() => { target.src = url; target.load(); },() => media.readyState === 'open');
        const buffer = media.addSourceBuffer(codec);
        return {
          async append(chunk) {
            if (disposed || video !== target) return;
            await mediaStep(buffer,'updateend',() => buffer.appendBuffer(chunk),() => !buffer.updating);
            resume();
          },
          finish() {
            if (media.readyState === 'open' && !buffer.updating) media.endOfStream();
            if (target.buffered.length === 1 && target.buffered.start(0) <= .2 && target.buffered.end(0) >= filmDuration-.2) {
              target.dataset.complete = 'true'; resume();
            }
          }
        };
      } catch { return null; }
    }
    function download(asset,options={}) {
      if (asset.url) return Promise.resolve(true);
      if (!asset.pending) asset.pending = transferFile(asset,options).finally(() => { asset.pending = null; });
      return asset.pending;
    }
    async function transferFile(asset,{progressive=false,probe=false}={}) {
      let timer, decided = !probe, stream = null, appended = 0, selectQuality;
      asset.selection = probe ? new Promise(resolve => { selectQuality = resolve; }) : null;
      function select(quality) {
        decided = true; clearTimeout(timer);
        if (quality > 0) progressive = false;
        selectQuality?.(quality);
      }
      while (true) {
        while (pageGate) await pageGate.promise;
        const transfer = new AbortController();
        let pausedForContent = false;
        asset.pause = () => { pausedForContent = true; transfer.abort(); };
        const began = performance.now();
        const samples = [{at:began,bytes:asset.bytes}];
        if (probe) timer = setTimeout(() => {
          if (!decided) select(asset.bytes*8/1800/1000 >= 1.2 ? 1 : 2);
        },1800);
        try {
          const offset = asset.bytes;
          const response = await fetch(assetRoot+asset.name,{
            signal:transfer.signal,cache:'force-cache',priority:progressive&&!background?'high':'low',
            ...(offset ? {headers:{Range:`bytes=${offset}-`}} : {})
          });
          if (!response.ok) throw new Error('Video download failed');
          // If a host ignores Range, treat its full response as a fresh file.
          if (offset && response.status !== 206) { asset.chunks = []; asset.bytes = 0; }
          asset.total = asset.bytes+Number(response.headers?.get('Content-Length') || 0);
          const reader = response.body?.getReader();
          if (!reader) {
            clearTimeout(timer); const data = new Uint8Array(await response.arrayBuffer());
            asset.chunks.push(data); asset.bytes += data.byteLength;
          } else {
            while (true) {
              const {done,value} = await reader.read();
              if (done) break;
              asset.chunks.push(value); asset.bytes += value.byteLength;
              const now = performance.now();
              samples.push({at:now,bytes:asset.bytes});
              while (samples.length > 2 && now-samples[1].at > 6000) samples.shift();
              const first = samples[0];
              asset.rate = (asset.bytes-first.bytes)/Math.max(.001,(now-first.at)/1000);
              if (!decided && asset.bytes >= 192*1024) {
                // Measure real delivery, including latency. Screen size and stale
                // navigator.connection estimates must not force a fast phone to 720p.
                const mbps = asset.bytes*8/Math.max(1,now-began)/1000;
                select(mbps >= 4 ? 0 : mbps >= 1.2 ? 1 : 2);
              }
              if (progressive && decided && !disposed) {
                if (appended === 0) stream = await openStream(asset);
                while (appended < asset.chunks.length) {
                  const chunk = asset.chunks[appended++];
                  if (stream) {
                    try { await stream.append(chunk); }
                    catch { stream = null; } // Preserve bytes for the Blob fallback.
                  }
                }
              }
            }
          }
          if (!asset.bytes || (asset.total > 0 && asset.bytes !== asset.total)) throw new Error('Incomplete video download');
          clearTimeout(timer);
          if (!disposed) try { stream?.finish(); } catch { /* The complete file still works as a Blob. */ }
          const blob = new Blob(asset.chunks,{type:'video/mp4'});
          retain(asset,blob);
          if (fileCache) {
            try { await fileCache.put(assetRoot+asset.name,new Response(blob,{headers:{'Content-Type':'video/mp4','Content-Length':String(blob.size)}})); }
            catch { /* Retain the in-memory file if persistent storage is unavailable. */ }
          }
          return true;
        } catch(error) {
          if (!pausedForContent) throw error;
          // Yield the connection to the new page. Resume with Range from retained
          // bytes once its data and images settle; never restart from byte zero.
          progressive = false;
          if (!decided) select(2);
        } finally { clearTimeout(timer); asset.pause = null; }
      }
    }
    async function start() {
      if (started || disposed || disabled()) return;
      started = true;
      try {
        if (cacheReady) await cacheReady;
        if (disposed || disabled()) return;
        const cached = assets.find(asset => asset.url);
        if (cached) {
          releaseContent(); await useBlob(cached);
          if (cached.quality > 0 && !disposed && !disabled() && await download(assets[0])) await useBlob(assets[0]);
          return;
        }
        // Probe with the actual HD request. Once started, it keeps downloading
        // even if a smaller video starts first; navigation only pauses its progress.
        let high = false;
        const slowHint = ['slow-2g','2g'].includes(connection?.effectiveType) ||
          (connection?.effectiveType === '3g' && connection.downlink > 0 && connection.downlink < 1.2);
        const initialTransfer = assets.slice(1).find(asset => asset.pending);
        try {
          if (initialTransfer) startingQuality = initialTransfer.quality;
          else if (!slowHint) {
            const full = download(assets[0],{progressive:true,probe:true});
            startingQuality = await Promise.race([full.then(() => 0),...(assets[0].selection ? [assets[0].selection] : [])]);
            if (startingQuality === 0) high = await full;
          }
        }
        catch(error) { if (disposed) return; startingQuality = 2; }
        if (disposed || disabled()) return;
        if (high) { releaseContent(); await useBlob(assets[0]); return; }
        const initial = assets[startingQuality];
        if (!await download(initial,{progressive:true}) || disposed) return;
        releaseContent(); await useBlob(initial);
        if (disposed || disabled()) return;
        // The initial 420p/720p file now loops locally, leaving the connection
        // free to finish 1080p directly instead of fetching an intermediate file.
        if (await download(assets[0])) await useBlob(assets[0]);
      } catch { releaseContent(); } // Keep a working low-quality loop or the poster.
      finally { if (!disposed && disabled()) started = false; }
    }
    function sync() {
      if (disabled() || document.hidden || !visible) {
        clearTimeout(promotionRetry); promotionController?.abort(); candidate?.pause();
        generation++; playPending = false; video.pause();
        if (disabled()) video.classList.remove('is-playing');
        releaseContent();
      } else { start(); resume(); }
    }
    bindMedia(video);
    on(document,'visibilitychange',sync); on(motion,'change',sync);
    // Load the lower page when the visitor asks to see it. A timer must not start
    // competing image/listing requests in the middle of a Slow 3G video download.
    on(document,'scroll',() => { if (window.scrollY > 40) releaseContent(); });
    if (connection) on(connection,'change',sync);
    const viewport = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); },{threshold:.01});
    viewport.observe(intro);
    dispose = () => {
      disposed = true; generation++; clearTimeout(promotionRetry); events.abort(); viewport.disconnect(); releaseContent();
      if (candidate) removeVideo(candidate);
      video.pause(); video.removeAttribute('src'); video.load();
      for (const url of [...urls]) revoke(url);
    };
    sync();
  }
  return {render,bind,afterBuffered,deferImages,beginRoute,contentRequest};
})();

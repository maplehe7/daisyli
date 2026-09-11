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

/* Download each edit once. Stream from retained bytes, then loop a complete local Blob. */
window.DaisyHeroVideo = (() => {
  const assetRoot = '/assets/home-film-v4/';
  const variants = ['film-1080-stream.mp4','film-720-stream.mp4'];
  const codec = 'video/mp4; codecs="avc1.640028"';
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
    const intro = document.querySelector('.home-intro');
    if (intro && !intro.querySelector('.hero-film-video')) {
      intro.querySelector(':scope > .hero-photo').outerHTML = render();
      intro.querySelector('.hero-photo-caption')?.remove();
    }
    let video = document.querySelector('.hero-film-video');
    if (!video) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const events = new AbortController();
    const on = (target,event,handler) => target.addEventListener(event,handler,{signal:events.signal});
    const assets = variants.map((name,quality) => ({name,quality,chunks:[],bytes:0,url:null}));
    const urls = new Set();
    let disposed = false, visible = true, blocked = false, started = false;
    let buffering = true, playPending = false, generation = 0, released = false, releaseReady;
    let candidate = null, promoting = false, promotionController;
    ready = new Promise(resolve => { releaseReady = resolve; });
    const deferredImages = [...document.querySelectorAll('[data-home-src]')];
    const releaseTimer = setTimeout(releaseContent,12000);
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
      released = true; clearTimeout(releaseTimer);
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
      // Completed Blob URLs belong to their asset and remain alive until navigation.
      if (!assets.some(asset => asset.url === url)) revoke(url);
    }
    async function promote() {
      if (!candidate || candidate.readyState < 2 || promoting || disposed || disabled() || !visible || document.hidden) return;
      promoting = true;
      const previous = video, next = candidate;
      const stage = new AbortController(); promotionController = stage;
      const cancel = () => stage.abort(); events.signal.addEventListener('abort',cancel,{once:true});
      previous.pause(); generation++; playPending = false;
      try {
        const position = (previous.currentTime || 0) % next.duration;
        await mediaStep(next,'seeked',() => { next.currentTime = position; },
          () => !next.seeking && Math.abs(next.currentTime-position) < .05,stage.signal);
        next.playbackRate = previous.playbackRate;
        await Promise.all([next.play(),paintedFrame(next,stage.signal)]);
        if (stage.signal.aborted || disposed || disabled() || !visible || document.hidden) return;
        video = next; candidate = null; buffering = false;
        bindMedia(video); video.style.transition = 'none'; video.classList.add('is-playing');
        removeVideo(previous);
      } catch(error) {
        if (!stage.signal.aborted && candidate === next) { candidate = null; removeVideo(next); }
      } finally {
        events.signal.removeEventListener('abort',cancel); promoting = false; promotionController = null;
        if (video === previous) { next.pause(); if (!disposed) resume(); }
      }
    }
    async function useBlob(asset) {
      if (disposed || disabled()) return;
      if (candidate) { promotionController?.abort(); removeVideo(candidate); candidate = null; }
      const next = document.createElement('video'); configure(next);
      next.className = 'hero-film-video'; next.dataset.quality = asset.quality === 0 ? '1080' : '720';
      next.dataset.complete = 'true'; next.setAttribute('aria-hidden','true');
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
      const ahead = bufferAhead(), remaining = video.duration-video.currentTime;
      const complete = video.dataset.complete === 'true' || (ahead > 0 && remaining > 0 && ahead >= remaining-.1);
      if (buffering && ahead < 3 && !complete) return;
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
        if (video.dataset.complete !== 'true' && !video.seeking && bufferAhead() < .2 && !promoting) {
          buffering = true; generation++; playPending = false; video.pause();
        }
      });
      for (const event of ['progress','canplay','canplaythrough','seeked']) mediaOn(event,resume);
    }

    async function openStream(asset) {
      const Source = [window.MediaSource,window.ManagedMediaSource].find(Type => Type?.isTypeSupported?.(codec));
      if (!Source) return null; // Older browsers play the completed Blob instead.
      const media = new Source(), target = video;
      target.dataset.quality = asset.quality === 0 ? '1080' : '720';
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
          finish() { if (media.readyState === 'open' && !buffer.updating) media.endOfStream(); }
        };
      } catch { return null; }
    }
    async function download(asset,{progressive=false,probe=false}={}) {
      if (asset.url) return true;
      const transfer = new AbortController();
      const cancel = () => transfer.abort(); events.signal.addEventListener('abort',cancel,{once:true});
      let timer, slower = false, decided = !probe, stream = null, appended = 0;
      const began = performance.now();
      if (probe) timer = setTimeout(() => { if (!decided) { slower = true; transfer.abort(); } },1800);
      try {
        const offset = asset.bytes;
        const response = await fetch(assetRoot+asset.name,{
          signal:transfer.signal,cache:'force-cache',priority:progressive?'high':'low',
          ...(offset ? {headers:{Range:`bytes=${offset}-`}} : {})
        });
        if (!response.ok) throw new Error('Video download failed');
        // If a host ignores Range, treat its full response as a fresh file.
        if (offset && response.status !== 206) { asset.chunks = []; asset.bytes = 0; }
        const reader = response.body?.getReader();
        if (!reader) {
          clearTimeout(timer); const data = new Uint8Array(await response.arrayBuffer());
          asset.chunks.push(data); asset.bytes += data.byteLength;
        } else {
          while (true) {
            const {done,value} = await reader.read();
            if (done) break;
            asset.chunks.push(value); asset.bytes += value.byteLength;
            if (!decided && asset.bytes >= 192*1024) {
              decided = true; clearTimeout(timer);
              // Measure real delivery, including latency. Screen size and stale
              // navigator.connection estimates must not force a fast phone to 720p.
              if (asset.bytes*8/Math.max(1,performance.now()-began)/1000 < 4) {
                slower = true; transfer.abort(); return false;
              }
            }
            if (progressive && decided) {
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
        if (disposed || !asset.bytes) return false;
        clearTimeout(timer);
        try { stream?.finish(); } catch { /* The complete file still works as a Blob. */ }
        asset.url = localURL(new Blob(asset.chunks,{type:'video/mp4'}));
        asset.chunks = [];
        return true;
      } catch(error) {
        if (slower) return false;
        throw error;
      } finally { clearTimeout(timer); events.signal.removeEventListener('abort',cancel); }
    }
    async function start() {
      if (started || disposed || disabled()) return;
      started = true;
      try {
        // Probe using the beginning of the actual HD download. Fast delivery keeps
        // that same request; slow delivery retains its prefix for the later upgrade.
        let high = false;
        try { high = await download(assets[0],{progressive:true,probe:true}); }
        catch(error) { if (disposed) return; }
        if (disposed || disabled()) return;
        if (high) { releaseContent(); await useBlob(assets[0]); return; }
        if (!await download(assets[1],{progressive:true}) || disposed) return;
        releaseContent(); await useBlob(assets[1]);
        if (disposed || disabled()) return;
        // The complete low-quality file now loops locally while HD finishes.
        if (await download(assets[0])) await useBlob(assets[0]);
      } catch { releaseContent(); } // Keep a working low-quality loop or the poster.
      finally { if (!disposed && disabled()) started = false; }
    }
    function sync() {
      if (disabled() || document.hidden || !visible) {
        promotionController?.abort(); candidate?.pause();
        generation++; playPending = false; video.pause();
        if (disabled()) video.classList.remove('is-playing');
        releaseContent();
      } else { start(); resume(); }
    }
    bindMedia(video);
    on(document,'visibilitychange',sync); on(motion,'change',sync);
    if (connection) on(connection,'change',sync);
    const viewport = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); },{threshold:.01});
    viewport.observe(intro);
    dispose = () => {
      disposed = true; generation++; events.abort(); viewport.disconnect(); releaseContent();
      if (candidate) removeVideo(candidate);
      video.pause(); video.removeAttribute('src'); video.load();
      for (const url of [...urls]) revoke(url);
      assets.forEach(asset => { asset.chunks = []; });
    };
    sync();
  }
  return {render,bind,afterBuffered,deferImages};
})();

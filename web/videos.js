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
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 20 12 8 19Z"/></svg>';
  const dialog = document.getElementById('film-dialog');
  let sdkPromise, playerPromise, player, loadedId, selectedId = videos[0].id;
  let observer, switching = false, revision = 0, standby = null, preloadTimer;

  function render() {
    return `<section id="featured-videos" class="section wrap video-section" aria-labelledby="featured-videos-title"><div class="section-heading"><h2 id="featured-videos-title">Featured Videos</h2></div><div class="video-grid">${videos.map(video => `<button type="button" class="video-card" data-film="${video.id}" aria-label="Play ${video.title}"><span class="video-thumbnail"><img src="${video.thumbnail}" alt="" loading="lazy" decoding="async" width="640" height="360"><span class="video-play">${playIcon}</span><span class="video-duration">${video.duration}</span></span><span class="video-title">${video.title}</span></button>`).join('')}</div></section>`;
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
    ensurePlayer(selectedId).catch(() => {});
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

/* The five approved clips are already trimmed, joined, and rendered at 2x. */
window.DaisyHeroVideo = (() => {
  const assetRoot = 'https://maplehe7.github.io/daisyli/web/assets/home-film-v1/';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';
  let loader, dispose;

  function render() {
    return `<div class="hero-photo hero-film"><img class="hero-film-poster" src="${assetRoot}poster.jpg" alt="" fetchpriority="high" width="1920" height="1080"><video class="hero-film-video" muted autoplay loop playsinline preload="metadata" poster="${assetRoot}poster.jpg" aria-hidden="true" disablepictureinpicture></video></div><button type="button" class="hero-film-toggle" aria-label="Pause background video">${pauseIcon}</button>`;
  }

  function loadHLS() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (!loader) loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://maplehe7.github.io/daisyli/web/vendor/hls/hls.light.min.js';
      script.onload = () => resolve(window.Hls);
      script.onerror = () => { script.remove(); loader = null; reject(new Error('Video player unavailable')); };
      document.head.append(script);
    });
    return loader;
  }

  function bind() {
    dispose?.();
    dispose = null;
    const intro = document.querySelector('.home-intro');
    if (intro && !intro.querySelector('.hero-film-video')) {
      intro.querySelector(':scope > .hero-photo').outerHTML = render();
      intro.querySelector('.hero-photo-caption')?.remove();
    }
    const video = document.querySelector('.hero-film-video');
    const toggle = document.querySelector('.hero-film-toggle');
    if (!video || !toggle) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const on = (target, event, handler) => target.addEventListener(event, handler, {signal:events.signal});
    let hls, pending, started = false, disposed = false, visible = true, paused = motion.matches;
    let recovery = 0;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = !paused;

    function updateControl() {
      const chinese = typeof siteLanguage !== 'undefined' && siteLanguage === 'zh';
      toggle.innerHTML = paused ? playIcon : pauseIcon;
      toggle.setAttribute('aria-label', paused
        ? (chinese ? '播放背景视频' : 'Play background video')
        : (chinese ? '暂停背景视频' : 'Pause background video'));
      toggle.setAttribute('aria-pressed', String(paused));
    }

    async function prepare() {
      if (started || disposed) return;
      if (pending) return pending;
      pending = (async () => {
        const source = assetRoot + 'index.m3u8';
        const nativeHLS = video.canPlayType('application/vnd.apple.mpegurl');
        const safari = /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Android/i.test(navigator.userAgent);
        if (nativeHLS && safari) {
          video.src = source;
        } else {
          const Hls = await loadHLS();
          if (disposed) return;
          if (!Hls?.isSupported()) {
            if (!nativeHLS) throw new Error('Streaming is unavailable');
            video.src = source; started = true; return;
          }
          hls = new Hls({startLevel:navigator.connection?.saveData ? 0 : 1, maxBufferLength:16, backBufferLength:12, maxMaxBufferLength:24, capLevelToPlayerSize:false});
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal || disposed) return;
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recovery++ === 0) hls.recoverMediaError();
            else {
              hls.destroy(); hls = null; started = false;
              video.classList.remove('is-playing');
              paused = true; updateControl();
            }
          });
          hls.loadSource(source);
          hls.attachMedia(video);
        }
        started = true;
      })().finally(() => { pending = null; });
      return pending;
    }

    async function resume() {
      if (paused || disposed || !visible || document.hidden) return;
      try {
        await prepare();
        if (paused || disposed || !visible || document.hidden) { hls?.stopLoad(); return; }
        hls?.startLoad(-1);
        await video.play();
      } catch {
        if (!disposed && !document.hidden && visible && !paused) { paused = true; updateControl(); }
      }
    }

    function sync() {
      if (paused || document.hidden || !visible) { video.pause(); hls?.stopLoad(); }
      else resume();
    }
    on(toggle, 'click', () => { paused = !paused; video.autoplay = !paused; updateControl(); sync(); });
    on(video, 'playing', () => { video.classList.add('is-playing'); });
    on(video, 'error', () => { video.classList.remove('is-playing'); paused = true; updateControl(); });
    on(document, 'visibilitychange', sync);
    on(motion, 'change', () => { paused = motion.matches; updateControl(); sync(); });
    const viewport = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:0.01});
    viewport.observe(video.closest('.home-intro'));
    updateControl();
    sync();
    dispose = () => {
      disposed = true; events.abort(); viewport.disconnect();
      video.pause(); hls?.destroy(); video.removeAttribute('src'); video.load();
    };
  }
  return {render, bind};
})();

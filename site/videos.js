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

/* The same silent edit, with bandwidth-sized encodes and a buffered start. */
window.DaisyHeroVideo = (() => {
  const assetRoot = '/assets/home-film-v4/';
  const variants = ['film-1080-lite.mp4','film-720-lite.mp4','film-480-lite.mp4'];
  let dispose;
  let ready = Promise.resolve();

  function afterBuffered(callback) { return ready.then(callback); }

  // Native lazy loading may still fetch several screens ahead. Keep those requests
  // out of the hero's initial download, then restore normal lazy loading.
  function deferImages(markup) {
    return markup.replace(/<img\b[^>]*>/g, tag => tag.includes('fetchpriority="high"') ? tag : tag.replace(' src="',' data-home-src="'));
  }

  function render() {
    return `<div class="hero-photo hero-film"><img class="hero-film-poster" src="${assetRoot}poster-lite.jpg" alt="" fetchpriority="high" width="1280" height="720"><video class="hero-film-video" muted loop playsinline preload="auto" poster="${assetRoot}poster-lite.jpg" aria-hidden="true" disablepictureinpicture></video></div>`;
  }

  function bind() {
    dispose?.();
    dispose = null;
    ready = Promise.resolve();
    const intro = document.querySelector('.home-intro');
    if (intro && !intro.querySelector('.hero-film-video')) {
      intro.querySelector(':scope > .hero-photo').outerHTML = render();
      intro.querySelector('.hero-photo-caption')?.remove();
    }
    const video = document.querySelector('.hero-film-video');
    if (!video) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const events = new AbortController();
    const on = (target, event, handler) => target.addEventListener(event, handler, {signal:events.signal});
    const slow = /(^|-)2g$|3g/.test(connection?.effectiveType || '') || (connection?.downlink > 0 && connection.downlink < 2);
    let quality = slow ? 2 : (innerWidth > 900 && connection?.downlink >= 8 ? 0 : 1);
    let started = false, disposed = false, visible = true, blocked = false;
    let buffering = true, playing = false, playPending = false, seekTo = null, lowStalls = 0;
    let generation = 0, released = false, releaseReady, stallTimer;
    ready = new Promise(resolve => { releaseReady = resolve; });
    const deferredImages = [...document.querySelectorAll('[data-home-src]')];
    const releaseTimer = setTimeout(releaseContent, 12000);
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = false;

    function releaseContent() {
      if (released) return;
      released = true;
      clearTimeout(releaseTimer);
      if (!disposed) deferredImages.forEach(image => {
        if (!image.isConnected) return;
        image.src = image.dataset.homeSrc;
        image.removeAttribute('data-home-src');
      });
      releaseReady();
    }

    function disabled() { return blocked || motion.matches || connection?.saveData; }

    function bufferAhead() {
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime + .05 && video.buffered.end(i) > video.currentTime) {
          return video.buffered.end(i) - video.currentTime;
        }
      }
      return 0;
    }

    function prepare() {
      if (started || disposed) return;
      started = true;
      video.src = assetRoot + variants[quality];
      video.dataset.quality = ['1080','720','480'][quality];
      video.load();
    }

    async function resume() {
      if (disabled() || disposed || !visible || document.hidden) return;
      prepare();
      if (seekTo !== null || video.seeking) return;
      const ahead = bufferAhead();
      const remaining = video.duration - video.currentTime;
      const complete = ahead > 0 && remaining > 0 && ahead >= remaining - .1;
      if (complete) releaseContent();
      if (playPending) return;
      // Some browsers cap a paused preload at a few seconds. HAVE_ENOUGH_DATA
      // lets their own throughput estimate start playback and continue fetching.
      const enough = ahead >= (quality === 2 ? 6 : 3) || complete || (ahead > 0 && video.readyState === 4);
      if (buffering && !enough) return;
      buffering = false;
      if (!video.paused) return;
      const request = generation;
      playPending = true;
      try {
        await video.play();
      } catch (error) {
        // Visibility and source switches can cancel play without blocking autoplay.
        if (!disposed && request === generation && error.name !== 'AbortError') {
          blocked = true; video.classList.remove('is-playing'); releaseContent();
        }
      } finally {
        if (request === generation) playPending = false;
      }
    }

    function sync() {
      if (disabled() || document.hidden || !visible) {
        clearTimeout(stallTimer);
        generation++; playPending = false;
        video.pause();
        if (disabled()) video.classList.remove('is-playing');
        releaseContent();
      }
      else resume();
    }
    function downgrade() {
      if (disposed || disabled()) return;
      video.pause();
      video.classList.remove('is-playing');
      buffering = true; playing = false; playPending = false; generation++;
      if (quality < variants.length - 1) {
        seekTo = video.currentTime || 0;
        quality++; started = false;
        prepare();
      } else if (++lowStalls >= 2) {
        // A very weak connection gets a stable poster instead of repeated freezing.
        blocked = true;
        video.removeAttribute('src'); video.load(); releaseContent();
      }
    }
    on(video, 'playing', () => { clearTimeout(stallTimer); playing = true; video.classList.add('is-playing'); });
    on(video, 'waiting', () => {
      clearTimeout(stallTimer);
      // A loop boundary can emit waiting even when the next frame arrives promptly.
      if (playing && visible && !document.hidden) stallTimer = setTimeout(downgrade, 1500);
    });
    on(video, 'error', downgrade);
    on(video, 'loadedmetadata', () => {
      if (seekTo !== null) {
        const time = Math.min(seekTo, Math.max(0,video.duration - .2));
        seekTo = null; video.currentTime = time;
      }
      resume();
    });
    for (const event of ['progress','canplay','canplaythrough','seeked']) on(video,event,resume);
    on(document, 'visibilitychange', sync);
    on(motion, 'change', sync);
    if (connection) on(connection, 'change', sync);
    const viewport = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:0.01});
    viewport.observe(video.closest('.home-intro'));
    sync();
    dispose = () => {
      disposed = true; generation++; clearTimeout(stallTimer); events.abort(); viewport.disconnect(); releaseContent();
      video.pause(); video.removeAttribute('src'); video.load();
    };
  }
  return {render, bind, afterBuffered, deferImages};
})();

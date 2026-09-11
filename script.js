// Keep existing IDX bookmarks and emailed listing links on the redesigned site.
(function () {
  if (location.hostname !== 'search.daisylibroker.com') return;
  var path = location.pathname, destination = null;
  var detail = path.match(/\/idx\/homedetails\/.*?\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})(?:\$|%24|\/|$)/i);
  var collection = path.match(/^\/idx\/(results|featuredproperties|soldproperties|newlistings|openhouses|listingalerts|pricechange|soldlistings|savedhomes|featuredoffices)(\/.*)?$/i);
  if (detail) destination = new URL('/property/' + detail[1], 'https://daisylibroker.com');
  else if (/^\/idx\/advancedsearch\/?$/i.test(path)) destination = new URL('/search', 'https://daisylibroker.com');
  else if (collection) {
    var type = collection[1].toLowerCase(), query = collection[2] || '';
    var target = type === 'savedhomes' ? '/account?tab=homes' : !query || query === '/' ? ({featuredproperties:'/featured',soldproperties:'/sold'}[type] || '/search') : '/search';
    destination = new URL(target, 'https://daisylibroker.com');
    if (target === '/search') {
      destination.searchParams.set('collection', type);
      destination.searchParams.set('run', '1');
      if (query) destination.searchParams.set('native', query);
    }
  } else if (/^\/myaccount(?:\/|$)/i.test(path)) {
    destination = new URL('/account', 'https://daisylibroker.com');
    if (/search/i.test(path + location.search)) destination.searchParams.set('tab', 'searches');
  }
  if (destination) {
    var language = new URLSearchParams(location.search).get('lang');
    if (language === 'en' || language === 'zh') destination.searchParams.set('lang', language);
    location.replace(destination.href);
  }
})();

var videoList = [
  "https://player.vimeo.com/video/1072573097?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/584055906?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/564693956?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/549409748?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/522138099?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/1182450083?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479"

];

// Index to keep track of the current video
var currentIndex = 0;

function changeVideo(direction) {
  if (direction === 'prev') {
    currentIndex = (currentIndex - 1 + videoList.length) % videoList.length;
  } else if (direction === 'next') {
    currentIndex = (currentIndex + 1) % videoList.length;
  }

  // Update the src attribute of the iframe
  document.getElementById('webpage').src = videoList[currentIndex];
}

document.addEventListener('DOMContentLoaded', function () {
  var toggler = document.querySelector('.navbar-toggler');
  var menu = toggler ? document.querySelector(toggler.getAttribute('data-target')) : null;

  if (!toggler || !menu) {
    return;
  }

  toggler.addEventListener('click', function () {
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.collapse) {
      return;
    }

    var isOpen = menu.classList.toggle('show');
    toggler.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
});
